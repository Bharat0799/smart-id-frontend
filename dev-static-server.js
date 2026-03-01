const http = require("http");
const fs = require("fs");
const path = require("path");

const port = 5500;
const root = process.cwd();

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent((req.url || "/").split("?")[0]);
    let filePath = path.join(root, pathname === "/" ? "index.html" : pathname);

    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        res.statusCode = 200;
        res.end(data);
      });
    } catch {
      res.statusCode = 500;
      res.end("Server error");
    }
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`Static server running at http://127.0.0.1:${port}`);
  });
