/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const rawPort = process.env.PORT || 3000;
const isSocket = isNaN(Number(rawPort));
const port = isSocket ? rawPort : Number(rawPort);
const hostname = isSocket ? undefined : "0.0.0.0";

const app = next({ dev, hostname, port: isSocket ? undefined : port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  server.once("error", (err) => {
    console.error("Server listen error:", err);
    process.exit(1);
  });

  if (isSocket) {
    server.listen(port, () => {
      console.log(`> Frontend server ready on socket ${port}`);
    });
  } else {
    server.listen(port, hostname, () => {
      console.log(`> Frontend server ready on http://${hostname}:${port}`);
    });
  }
});
