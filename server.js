const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname);
const port = Number(process.argv[2] || process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

http
  .createServer((request, response) => {
    const urlPath = decodeURIComponent(new URL(request.url, `http://localhost:${port}`).pathname);
    const relativePath = urlPath === "/" ? "index.html" : urlPath.replace(/^[/\\]+/, "");
    const filePath = path.resolve(root, relativePath);

    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      });
      response.end(data);
    });
  })
  .listen(port, () => {
    console.log(`NCSC86 dog tag site: http://localhost:${port}`);
  });
