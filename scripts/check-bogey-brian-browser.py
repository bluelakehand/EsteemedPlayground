"""Local integration check; no Git, cloud or player-profile access."""
import os
import shutil
import hashlib
import gzip
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import io
import json
from pathlib import Path
import sys
import threading
import time
from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parents[1]
from playwright.sync_api import sync_playwright

ARCADE=ROOT
COMPRESSED='--gzip' in sys.argv
OUT=ROOT/('test-results/bogey-brian-gzip' if COMPRESSED else 'test-results/bogey-brian')
OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
    missing=[]
    compressed=[]
    cache={}
    def log_message(self,*args): pass
    def end_headers(self):
        if self.path.split('?')[0].endswith('.html'):
            self.send_header('Cache-Control','no-cache,max-age=0,must-revalidate')
        super().end_headers()
    def send_head(self):
        path=Path(self.translate_path(self.path))
        if COMPRESSED and '/releases/' in self.path and path.suffix in {'.js','.pck','.wasm'} and path.is_file():
            if str(path) not in self.cache: self.cache[str(path)]=gzip.compress(path.read_bytes(),compresslevel=9,mtime=0)
            data=self.cache[str(path)]
            self.compressed.append(self.path)
            self.send_response(200)
            self.send_header('Content-Type',self.guess_type(str(path)))
            self.send_header('Content-Encoding','gzip')
            self.send_header('Content-Length',str(len(data)))
            self.end_headers()
            return io.BytesIO(data)
        return super().send_head()
    def send_error(self, code, message=None, explain=None):
        if code==404:
            self.missing.append(self.path)
            print('MISSING',self.path,flush=True)
        super().send_error(code,message,explain)

def tap_script():
    return '\nwindow.__audio=[];\nconst nativeConnect=AudioNode.prototype.connect;\nconst nativeDisconnect=AudioNode.prototype.disconnect;\nAudioNode.prototype.connect=function(dest,...args){\n const tap=this.context.__tap;\n return nativeConnect.call(this,tap&&dest===this.context.destination?tap:dest,...args);\n};\nAudioNode.prototype.disconnect=function(...args){\n if(args[0]===this.context.destination&&this.context.__tap)args[0]=this.context.__tap;\n return nativeDisconnect.apply(this,args);\n};\nconst OriginalContext=window.AudioContext;\nwindow.AudioContext=new Proxy(OriginalContext,{construct(Target,args){\n const context=new Target(...args),tap=context.createAnalyser();\n tap.fftSize=2048;\n nativeConnect.call(tap,context.destination);\n context.__tap=tap;\n window.__audio.push(context);\n return context;\n}});\nwindow.__measure=async function(ms=500){\n let peak=0,energy=0,n=0;\n const until=performance.now()+ms;\n do{\n  for(const ctx of window.__audio){\n   const data=new Float32Array(ctx.__tap.fftSize);\n   ctx.__tap.getFloatTimeDomainData(data);\n   for(const v of data){peak=Math.max(peak,Math.abs(v));energy+=v*v;n++;}\n  }\n  await new Promise(r=>setTimeout(r,10));\n }while(performance.now()<until);\n return {peak,rms:Math.sqrt(energy/Math.max(1,n)),states:window.__audio.map(c=>c.state)};\n};\n'

PERSISTENCE="""async () => {
 const result=[];
 for(const info of await indexedDB.databases()) {
  const db=await new Promise((resolve,reject)=>{const q=indexedDB.open(info.name);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
  for(const name of db.objectStoreNames) {
   const tx=db.transaction(name,'readonly'),store=tx.objectStore(name);
   const rows=await new Promise((resolve,reject)=>{const data=[];const q=store.openCursor();q.onsuccess=()=>{const c=q.result;if(!c){resolve(data);return}const v=c.value;data.push({database:info.name,key:c.key,text:v.contents?new TextDecoder().decode(v.contents):''});c.continue()};q.onerror=()=>reject(q.error)});
   result.push(...rows);
  }
  db.close();
 }
 return result;
}"""

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ARCADE)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    checks=[]; errors=[]; responses=[]
    def check(name,passed):
        checks.append({'name':name,'passed':bool(passed)})
        print(('PASS ' if passed else 'FAIL ')+name,flush=True)
        if not passed: raise AssertionError(name)
    def ready(page):
        page.wait_for_selector('#game')
        frame=page.frame_locator('#game')
        frame.locator('canvas').wait_for(timeout=90000)
        frame.locator('#status').wait_for(state='detached',timeout=90000)
        return page.frames[1]
    def click(page,x,y):
        box=page.frame_locator('#game').locator('canvas').bounding_box()
        scale=min(box['width']/1600,box['height']/900)
        page.mouse.click(box['x']+(box['width']-1600*scale)/2+x*scale,box['y']+(box['height']-900*scale)/2+y*scale)
        page.wait_for_timeout(400)
    def saved_profile(frame, predicate):
        # Wait for the asynchronous filesystem commit before reopening the browser.
        deadline=time.monotonic()+30
        while time.monotonic()<deadline:
            profiles=[]
            for row in frame.evaluate(PERSISTENCE):
                if str(row['key']).endswith(('profile.a.json','profile.b.json')):
                    wrapper=json.loads(row['text'])
                    profiles.append((wrapper['generation'],json.loads(wrapper['data'])))
            if profiles:
                profile=max(profiles,key=lambda value:value[0])[1]
                if predicate(profile): return profile
            time.sleep(0.2)
        raise AssertionError('Expected player profile was not committed to IndexedDB')
    try:
        with sync_playwright() as pw:
            launch={'executable_path':os.environ.get('BROWSER_PATH','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'),'headless':True,
                'args':['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], 'viewport':{'width':1280,'height':800}}
            if not Path(launch['executable_path']).is_file(): launch.pop('executable_path')
            browser_profile=str(OUT/'isolated-browser-profile')
            context=pw.chromium.launch_persistent_context(browser_profile,**launch)
            context.add_init_script(tap_script())
            page=context.pages[0]
            page.on('pageerror',lambda error: errors.append(str(error)))
            page.on('console',lambda message: errors.append(message.text+' '+str(message.location)) if message.type=='error' and not message.location.get('url','').endswith('/favicon.ico') else None)
            page.on('response',lambda response: responses.append({'url':response.url,'status':response.status}))
            page.goto(base+'/index.html')
            check('Homepage has one working Brian card',page.get_by_role('link',name='Play Bogey Brian').count()==1)
            page.get_by_role('link',name='Play Bogey Brian').click()
            frame=ready(page)
            check('Nested release starts without cross-origin isolation',frame.evaluate('GODOT_THREADS_ENABLED===false && !crossOriginIsolated'))
            check('Pinned engine and Rapier use immutable release URLs',frame.evaluate('document.baseURI.includes("/releases/web-") && GODOT_CONFIG.gdextensionLibs[0]==="godot_rapier.wasm"'))
            page.screenshot(path=str(OUT/'main.png'))
            check('Home badge is above the iframe',page.locator('.arcade-home-link').bounding_box()['y']+page.locator('.arcade-home-link').bounding_box()['height'] <= page.locator('#game').bounding_box()['y'])
            click(page,800,590)
            click(page,750,412)
            sample=frame.evaluate('window.__measure(700)')
            check('Trusted interaction unlocks real audio output',sample['rms']>1e-4)
            page.wait_for_timeout(2500)
            saved=frame.evaluate(PERSISTENCE)
            cfg=next((row['text'] for row in saved if str(row['key']).endswith('audio_settings.cfg')),None)
            check('Settings persist to IndexedDB from the same-origin iframe',cfg is not None and 'Master' in cfg)
            (OUT/'persistence-before.json').write_text(json.dumps(saved,indent=2))
            page.screenshot(path=str(OUT/'settings.png'))
            click(page,800,795)
            click(page,800,430)
            # Fresh and migrated profiles offer the optional tutorial on first Play.
            # This point is empty on the course grid when it was already dismissed.
            click(page,1035,610)
            click(page,320,305)
            click(page,805,820)
            click(page,1125,590)
            page.wait_for_timeout(9000)
            print('RUNTIME ERRORS',errors,flush=True)
            page.screenshot(path=str(OUT/'playing.png'))
            check('Game canvas remains visible after starting the course',page.frame_locator('#game').locator('canvas').is_visible() and page.locator('#load-error').is_hidden())
            frame_top=int(page.locator('#game').bounding_box()['y'])
            strokes_before=Image.open(OUT/'playing.png').convert('RGB').crop((10,frame_top+10,140,frame_top+55))
            dark=sum(max(pixel)<15 for pixel in strokes_before.getdata())
            check('Course actually starts with a visible stroke HUD',dark>strokes_before.width*strokes_before.height*0.5)
            page.keyboard.press('Space')
            page.wait_for_timeout(300)
            page.keyboard.press('Space')
            page.wait_for_timeout(1200)
            page.screenshot(path=str(OUT/'shot.png'))
            strokes_after=Image.open(OUT/'shot.png').convert('RGB').crop((10,frame_top+10,140,frame_top+55))
            check('Keyboard shot changes the stroke counter',sum(max(pixel)>30 for pixel in ImageChops.difference(strokes_before,strokes_after).getdata())>20)
            if COMPRESSED:
                courses=['c1','c2','c3','c4','c5','c7','c8','c9','c10']
                for index,course in enumerate(courses[1:],start=1):
                    page.reload(); frame=ready(page)
                    click(page,800,430)
                    click(page,322.5+(index%3)*475,305+(index//3)*200)
                    click(page,805,820)
                    # Starting a different course explicitly replaces the saved round.
                    click(page,1125,590)
                    page.wait_for_timeout(7500)
                    capture=OUT/(course+'-playing.png')
                    page.screenshot(path=str(capture))
                    corner=Image.open(capture).convert('RGB').crop((10,frame_top+10,140,frame_top+55))
                    check(course+' starts from the optimized release with a stroke HUD',sum(max(pixel)<15 for pixel in corner.getdata())>corner.width*corner.height*0.5)
                check('Wasm and PCK loads work with production gzip encoding',sum(path.endswith('.wasm') for path in Handler.compressed)>=3 and any(path.endswith('.pck') for path in Handler.compressed))
                for difficulty,x in [('hard',797),('impossible',1132)]:
                    page.reload(); frame=ready(page)
                    click(page,800,430)
                    click(page,320,305)
                    click(page,x,225)
                    click(page,805,820)
                    click(page,1125,590)
                    profile=saved_profile(frame,lambda p:p.get('interrupted_round',{}).get('definition',{}).get('difficulty')==difficulty)
                    ids=profile['interrupted_round']['definition']['hole_ids']
                    check(difficulty+' starts with nine matching authored holes',len(ids)==9 and all(hole.endswith('_'+difficulty) for hole in ids))
                    page.screenshot(path=str(OUT/(difficulty+'-playing.png')))
                # Settings exposes the replayable original three-lesson tutorial.
                page.reload(); frame=ready(page)
                click(page,800,590)
                click(page,1420,145)
                click(page,1125,590)
                profile=saved_profile(frame,lambda p:p.get('interrupted_round',{}).get('mode')=='tutorial')
                check('Tutorial starts all three original lessons',profile['interrupted_round']['definition']['hole_ids']==['c1_h1_tut','c1_h2_tut','c1_h3_tut'])
                check('Current profile stores statistics and tutorial preference',profile['schema_version']==7 and isinstance(profile['statistics'],dict) and profile['tutorial_seen'])
                checkpoint=profile['interrupted_round']
                page.screenshot(path=str(OUT/'tutorial-playing.png'))
            page.locator('#fullscreen').click()
            page.wait_for_timeout(500)
            check('Wrapper fullscreen enters from a trusted click',page.evaluate('!!document.fullscreenElement'))
            page.evaluate('document.exitFullscreen()')
            page.set_viewport_size({'width':390,'height':844})
            page.wait_for_timeout(500)
            page.screenshot(path=str(OUT/'mobile.png'))
            check('Mobile-width navigation does not overlap the frame',page.locator('.arcade-home-link').bounding_box()['y']+page.locator('.arcade-home-link').bounding_box()['height'] <= page.locator('#game').bounding_box()['y'])
            check('No runtime HTTP failures',all(row['status']<400 for row in responses))
            check('No JavaScript exceptions',not errors)
            context.close()
            context=pw.chromium.launch_persistent_context(browser_profile,**launch)
            page=context.pages[0]
            page.goto(base+'/games/bogey-brian/index.html')
            frame=ready(page)
            reopened=frame.evaluate(PERSISTENCE)
            cfg_after=next((row['text'] for row in reopened if str(row['key']).endswith('audio_settings.cfg')),None)
            check('Saved settings survive closing and reopening the browser',cfg_after==cfg)
            if COMPRESSED:
                profile=saved_profile(frame,lambda p:p.get('interrupted_round',{}).get('completion_id')==checkpoint['completion_id'])
                check('Saved round survives closing and reopening the browser',profile['interrupted_round']==checkpoint)
                click(page,1285,450)
                page.wait_for_timeout(2500)
                page.screenshot(path=str(OUT/'tutorial-resumed.png'))
                profile=saved_profile(frame,lambda p:p.get('interrupted_round',{}).get('completion_id')==checkpoint['completion_id'])
                check('Continue preserves the saved round identity',profile['interrupted_round']==checkpoint)
            # Change only the immutable asset location, as a normal update does.
            # Keep the player URL and origin fixed, then verify the same saved data.
            manifest=json.loads((ROOT/'games/bogey-brian/build.json').read_text())
            original=ROOT/'games/bogey-brian/play/index.html'
            backup=original.read_bytes()
            next_version='web-'+hashlib.sha256((manifest['version']+'browser-test').encode()).hexdigest()[:20]
            old_release=ROOT/'games/bogey-brian/releases'/manifest['version']
            test_release=ROOT/'games/bogey-brian/releases'/next_version
            test_release.mkdir(exist_ok=True)
            for entry in manifest['files']:
                target=test_release/entry['name']
                if not target.exists():
                    try: os.link(old_release/entry['name'],target)
                    except OSError: shutil.copyfile(old_release/entry['name'],target)
            spec=importlib.util.spec_from_file_location('brian_stage',ROOT/'scripts/stage-bogey-brian.py')
            stage=importlib.util.module_from_spec(spec);spec.loader.exec_module(stage)
            try:
                original.write_text(stage.stable_loader((old_release/'index.html').read_text(),next_version),encoding='utf-8')
                print('UPDATE LOADER',next_version,'in file',next_version in original.read_text(),flush=True)
                page.reload(); frame=ready(page)
                print('UPDATE BASE',frame.evaluate('document.baseURI'),flush=True)
                updated=frame.evaluate(PERSISTENCE)
                updated_cfg=next((row['text'] for row in updated if str(row['key']).endswith('audio_settings.cfg')),None)
                check('Stable loader switches to a different asset version',next_version in frame.evaluate('document.baseURI'))
                check('Saved settings survive changing the asset version',updated_cfg==cfg)
                if COMPRESSED:
                    profile=saved_profile(frame,lambda p:p.get('interrupted_round',{}).get('completion_id')==checkpoint['completion_id'])
                    check('Saved round survives changing the asset version',profile['interrupted_round']==checkpoint)
            finally:
                original.write_bytes(backup)
            page.locator('.arcade-home-link').click()
            check('Home badge returns to arcade',page.url==base+'/index.html')
            for path in ['games/perfect-pocket/','games/portdle/','games/crokinole/Crokinole.html']:
                page.goto(base+'/'+path)
                check(path+' shared home link remains present',page.locator('.arcade-home-link').is_visible())
            context.close()
    finally:
        server.shutdown();server.server_close()
        (OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors,'responses':responses},indent=2))

if __name__=='__main__': run()
