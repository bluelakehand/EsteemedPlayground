const fs = require("fs");
const http = require("http");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 8080);
const host = "127.0.0.1";
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://${host}:${port}`);
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
