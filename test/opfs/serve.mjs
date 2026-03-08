/**
 * Minimal dev server for the OPFS memory test page.
 *
 * Serves the monorepo root with the required Cross-Origin headers so that
 * SharedArrayBuffer (needed by the pthreads build) and OPFS are available.
 *
 * Usage:
 *   node test/opfs/serve.mjs [port]
 *
 * Then open http://localhost:<port>/test/opfs/index.html
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.argv[2]) || 8085;
const ROOT = resolve(fileURLToPath(import.meta.url), "../../.."); // monorepo root

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".cjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".inp": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function getMime(filePath) {
  return (
    MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream"
  );
}

const server = createServer(async (req, res) => {
  // COOP + COEP headers — required for SharedArrayBuffer & OPFS sync access
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  // Allow esm.sh CDN resources
  res.setHeader("Access-Control-Allow-Origin", "*");

  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  // Default to index.html for directory requests
  if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  const filePath = join(ROOT, pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      res.writeHead(301, { Location: pathname + "/" });
      res.end();
      return;
    }

    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": getMime(filePath) });
    res.end(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      res.writeHead(404);
      res.end(`Not found: ${pathname}`);
    } else {
      res.writeHead(500);
      res.end(`Server error: ${err.message}`);
    }
  }
});

server.listen(PORT, () => {
  console.log();
  console.log(`  OPFS Memory Test Server`);
  console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Local:   http://localhost:${PORT}/test/opfs/`);
  console.log();
  console.log(`  Cross-Origin-Opener-Policy:   same-origin`);
  console.log(`  Cross-Origin-Embedder-Policy: require-corp`);
  console.log();
  console.log(`  Serving from: ${ROOT}`);
  console.log(`  Press Ctrl+C to stop`);
  console.log();
});
