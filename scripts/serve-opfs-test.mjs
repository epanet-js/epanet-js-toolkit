import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";

const rootDir = resolve(process.cwd());
const port = Number(process.env.PORT || 8080);

const contentTypes = {
  ".cjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ts": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".xml": "application/xml; charset=utf-8",
};

function setIsolationHeaders(response) {
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Origin-Agent-Cluster", "?1");
  response.setHeader("Cache-Control", "no-store");
}

function resolvePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const relativePath =
    decodedPath === "/" ? "/opfs-memory-test.html" : decodedPath;
  const normalizedPath = normalize(relativePath).replace(/^\.\.(\/|$)+/, "");
  return join(rootDir, normalizedPath);
}

const server = createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  const filePath = resolvePath(request.url || "/");

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const stats = statSync(filePath);
  if (stats.isDirectory()) {
    response.writeHead(403);
    response.end("Directory listing is disabled");
    return;
  }

  setIsolationHeaders(response);
  response.setHeader(
    "Content-Type",
    contentTypes[extname(filePath)] || "application/octet-stream",
  );
  response.setHeader("Content-Length", stats.size);
  response.writeHead(200);
  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`OPFS test server running at http://localhost:${port}`);
  console.log(`Serving ${rootDir} with COOP/COEP headers enabled.`);
});
