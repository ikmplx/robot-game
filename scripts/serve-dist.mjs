import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist", import.meta.url));
const host = "127.0.0.1";
const port = 4173;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

const entry = await stat(resolve(root, "index.html")).catch(() => null);
if (!entry?.isFile()) {
  console.error("Missing dist/index.html. Run npm ci and npm run build first.");
  process.exit(1);
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  const file = resolve(root, pathname === "/" ? "index.html" : `.${pathname}`);
  const info = file.startsWith(root + sep) && await stat(file).catch(() => null);
  if (!info?.isFile()) {
    response.writeHead(404).end();
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(file)] ?? "application/octet-stream",
    "Content-Length": info.size,
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(file).on("error", () => response.destroy()).pipe(response);
});

server.on("error", (error) => {
  console.error(`Cannot start the server on http://${host}:${port}/ (${error.code}).`);
  process.exitCode = 1;
});
server.listen(port, host, () => console.log(`Open http://${host}:${port}/. Press Ctrl+C to stop.`));
