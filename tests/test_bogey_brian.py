import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[1]
def module(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), ROOT / 'scripts' / (name+'.py'))
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded
stage = module('stage-bogey-brian')
deploy = module('deploy-bogey-brian')
HTML = '<head><title>Godot</title></head><img src="index.png"><script src="index.js"></script>\nconst GODOT_CONFIG = {"executable":"index","gdextensionLibs":["godot_rapier.wasm"],"fileSizes":{"index.pck":3,"index.wasm":3}};\nconst GODOT_THREADS_ENABLED = false;'

class BrianBuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.archive = self.root/'build.zip'
        self.manifest = self.root/'build.json'
        self.output = self.root/'game'
        self.files = {name: b'abc' for name in stage.REQUIRED}
        self.files['index.html'] = HTML.encode()
        self.write_build()

    def write_build(self):
        with zipfile.ZipFile(self.archive,'w') as packed:
            for name,data in self.files.items(): packed.writestr(name,data)
        self.value = {'format':1,'version':'web-'+'a'*20,
            'archive':{'path':'games/bogey-brian/builds/bogey-brian-web-'+'a'*20+'.zip',
                'bytes':self.archive.stat().st_size,'sha256':stage.sha256(self.archive.read_bytes())},
            'files':[{'name':name,'bytes':len(data),'sha256':stage.sha256(data)} for name,data in self.files.items()]}
        self.save()

    def save(self): self.manifest.write_text(json.dumps(self.value),encoding='utf-8')

    def test_complete_build_stages_immutable_assets_and_stable_loader(self):
        result=stage.stage(self.archive,self.manifest,self.output)
        self.assertEqual(result['version'],self.value['version'])
        loader=(self.output/'play/index.html').read_text()
        self.assertIn('<base href="/games/bogey-brian/releases/'+self.value['version']+'/">',loader)
        self.assertIn('"gdextensionLibs":["godot_rapier.wasm"]',loader)
        self.assertEqual((self.output/'releases'/self.value['version']/'index.pck').read_bytes(),b'abc')

    def test_archive_checksum_failure_writes_nothing(self):
        self.archive.write_bytes(self.archive.read_bytes()+b'corruption')
        with self.assertRaisesRegex(ValueError,'checksum'): stage.stage(self.archive,self.manifest,self.output)
        self.assertFalse(self.output.exists())

    def test_file_checksum_failure_writes_nothing(self):
        self.value['files'][0]['sha256']='0'*64
        self.save()
        with self.assertRaisesRegex(ValueError,'checksum'): stage.stage(self.archive,self.manifest,self.output)
        self.assertFalse(self.output.exists())

    def test_archive_extra_path_rejected(self):
        with zipfile.ZipFile(self.archive,'a') as packed: packed.writestr('../escape',b'bad')
        self.value['archive'].update(bytes=self.archive.stat().st_size,sha256=stage.sha256(self.archive.read_bytes()))
        self.save()
        with self.assertRaisesRegex(ValueError,'unexpected paths'): stage.stage(self.archive,self.manifest,self.output)
        self.assertFalse(self.output.exists())

    def test_manifest_version_path_and_missing_files_rejected(self):
        self.value['version']='../escape'; self.save()
        with self.assertRaises(ValueError): stage.read_manifest(self.manifest)
        self.write_build()
        self.value['files'].pop(); self.save()
        with self.assertRaises(ValueError): stage.read_manifest(self.manifest)

    def test_manifest_rejects_archive_paths_outside_checkout_builds(self):
        self.value['archive']['path']='../escape.zip'; self.save()
        with self.assertRaisesRegex(ValueError,'identity'): stage.read_manifest(self.manifest)

    def test_manifest_rejects_oversized_git_archives(self):
        self.value['archive']['bytes']=100*1024*1024; self.save()
        with self.assertRaisesRegex(ValueError,'100 MiB'): stage.read_manifest(self.manifest)

    def test_cli_uses_pinned_archive_from_checkout_by_default(self):
        local=self.root/self.value['archive']['path']
        local.parent.mkdir(parents=True)
        local.write_bytes(self.archive.read_bytes())
        with patch.object(stage,'ROOT',self.root),patch('sys.argv',['stage','--manifest',str(self.manifest),'--output',str(self.output)]),contextlib.redirect_stdout(io.StringIO()):
            stage.main()
        self.assertTrue((self.output/'play/index.html').is_file())

    def test_upload_plan_types_compression_and_loader_last(self):
        plan=list(deploy.upload_plan(self.value,self.output))
        wasm=next(row for row in plan if row[1].endswith('index.side.wasm'))
        self.assertEqual(wasm[2],'application/wasm'); self.assertTrue(wasm[4])
        self.assertIn('immutable',wasm[3])
        self.assertEqual(plan[-1][1],'games/bogey-brian/play/index.html')
        self.assertIn('no-cache',plan[-1][3]); self.assertFalse(plan[-1][4])

    def test_second_release_keeps_old_assets_and_stable_save_url(self):
        stage.stage(self.archive,self.manifest,self.output)
        old=self.output/'releases'/self.value['version']/'index.pck'
        self.value['version']='web-'+'b'*20
        self.value['archive']['path']='games/bogey-brian/builds/bogey-brian-'+self.value['version']+'.zip'
        self.save()
        stage.stage(self.archive,self.manifest,self.output)
        self.assertTrue(old.is_file())
        self.assertIn('b'*20,(self.output/'play/index.html').read_text())

    def test_deploy_dry_run_never_invokes_aws(self):
        stage.stage(self.archive,self.manifest,self.output)
        (self.output/'build.json').write_text(self.manifest.read_text())
        with patch('sys.argv',['deploy','--bucket','test','--root',str(self.output),'--dry-run']),patch.object(deploy.subprocess,'run') as command,contextlib.redirect_stdout(io.StringIO()):
            deploy.main()
        command.assert_not_called()

    def test_deploy_rejects_tampered_staged_file(self):
        stage.stage(self.archive,self.manifest,self.output)
        (self.output/'build.json').write_text(self.manifest.read_text())
        (self.output/'releases'/self.value['version']/'index.pck').write_bytes(b'bad')
        with patch('sys.argv',['deploy','--bucket','test','--root',str(self.output)]),patch.object(deploy.subprocess,'run') as command:
            with self.assertRaisesRegex(ValueError,'checksum'): deploy.main()
        command.assert_not_called()

    def test_workflow_protects_artifacts_releases_and_loader_from_delete(self):
        text=(ROOT/'.github/workflows/deploy-s3.yml').read_text()
        for pattern in ['_builds/*','games/bogey-brian/builds/*','games/bogey-brian/releases/*','games/bogey-brian/play/*']:
            self.assertIn('--exclude "'+pattern+'"',text)
        self.assertLess(text.index('Verify pinned'),text.index('Publish immutable'))
        self.assertLess(text.index('Publish immutable'),text.index('Deploy arcade pages'))
        self.assertIn('cancel-in-progress: false',text)
        self.assertNotIn('--print-key',text)
        self.assertNotIn('aws s3 cp "s3://',text)

if __name__=='__main__': unittest.main()
