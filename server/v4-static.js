const express = require("express");
const path = require("path");
const http = require("http");
const https = require("https");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const API_TARGET = (process.env.API_TARGET || "http://localhost:4003").replace(/\/+$/, "");

const v4Root = path.join(__dirname, "..", "design-prototype-v4");
const target = new URL(API_TARGET);
const targetPort = target.port || (target.protocol === "https:" ? 443 : 80);

// Same-origin proxy for backend paths. Serving the frontend and the API from a
// single port keeps the session cookie first-party and avoids CORS entirely.
function proxyToApi(req, res) {
  const client = target.protocol === "https:" ? https : http;
  const proxyReq = client.request(
    {
      hostname: target.hostname,
      port: targetPort,
      method: req.method,
      path: req.originalUrl,
      headers: Object.assign({}, req.headers, { host: target.host }),
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on("error", (err) => {
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "API proxy error: " + err.message }));
  });
  req.pipe(proxyReq);
}

// Streamed (not parsed) so multipart uploads pass through untouched.
app.use(["/api", "/uploads"], proxyToApi);

app.use(express.static(v4Root));

app.get("*", (req, res) => {
  res.sendFile(path.join(v4Root, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Madarasati V4 frontend running at http://localhost:${PORT}`);
  console.log(`Serving: ${v4Root}`);
  console.log(`Proxying /api and /uploads to: ${API_TARGET}`);
});
