const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const root = __dirname;
const port = Number(process.env.PORT || 8080);
const host = "127.0.0.1";
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".it": "audio/x-impulse-tracker",
  ".mem": "application/octet-stream",
  ".wasm": "application/wasm",
};

const songGenerating = new Set();

function getTodaySeed() {
  const d = new Date();
  return `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
}

function handleSongApi(req, res) {
  const url = new URL(req.url, `http://${host}:${port}`);
  const rawSeed = url.searchParams.get("seed") || getTodaySeed();
  const seed = rawSeed.replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 60) || getTodaySeed();

  const songsDir = path.join(root, "games", "dancing-and-dancing", "songs");
  const itPath = path.join(songsDir, seed + ".it");
  const jsonPath = path.join(songsDir, seed + ".json");

  const sendJson = () => {
    fs.readFile(jsonPath, (err, data) => {
      if (err) { res.writeHead(500); res.end("Manifest missing"); return; }
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(data);
    });
  };

  if (fs.existsSync(jsonPath)) { sendJson(); return; }

  if (songGenerating.has(seed)) {
    const poll = setInterval(() => {
      if (fs.existsSync(jsonPath)) { clearInterval(poll); sendJson(); }
    }, 200);
    setTimeout(() => { clearInterval(poll); if (!res.writableEnded) { res.writeHead(504); res.end("Timeout"); } }, 30000);
    return;
  }

  songGenerating.add(seed);
  fs.mkdirSync(songsDir, { recursive: true });

  const py = spawn("python", [path.join(root, "tools", "autotracker3.py"), seed, itPath]);
  py.stderr.on("data", d => process.stderr.write(d));
  py.on("close", code => {
    songGenerating.delete(seed);
    if (code !== 0 || !fs.existsSync(jsonPath)) {
      res.writeHead(500); res.end("Song generation failed");
    } else {
      sendJson();
    }
  });
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://${host}:${port}`);

    if (url.pathname === "/api/song") { handleSongApi(req, res); return; }

    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    let filePath = path.normalize(path.join(root, requested));

    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.stat(filePath, (statErr, stat) => {
      if (!statErr && stat.isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      res.writeHead(200, {
        "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    });
    });
  })
  .listen(port, host, () => {
    console.log(`Perfect Pocket running at http://${host}:${port}`);
  });
