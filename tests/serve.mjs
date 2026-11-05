// Test server: bundles the React fixture, then serves the repo root so fixture pages can import dist/.
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, join, normalize, resolve, sep } from "node:path";
import { build } from "esbuild";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.env.PORT ?? 4173);

// The compatibility tests run the library on other React versions, each installed in its own folder.
for (const v of ["17", "19"]) {
  if (!existsSync(join(root, `tests/react${v}/node_modules/react`))) {
    console.error(`React ${v} for the tests is not installed. Run: npm run test:install`);
    process.exit(1);
  }
}

const common = {
  bundle: true,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  logLevel: "warning",
};
await Promise.all([
  // The main React fixture uses whatever React the repo develops against (18).
  build({ ...common, entryPoints: [join(root, "tests/fixtures/react-entry.tsx")], outfile: join(root, "tests/.generated/react-fixture.js") }),
  // The same library build against React 17, which lives in its own folder (tests/react17) so it cannot
  // clash with the React the repo develops against. The alias also redirects the imports inside
  // dist/react.js, so the library itself runs on React 17 too.
  build({
    ...common,
    entryPoints: [join(root, "tests/fixtures/react17-entry.tsx")],
    outfile: join(root, "tests/.generated/react17-fixture.js"),
    alias: {
      react: join(root, "tests/react17/node_modules/react"),
      "react-dom": join(root, "tests/react17/node_modules/react-dom"),
    },
  }),
  // And against React 19. The entry is the same as the React 18 one: both use createRoot.
  build({
    ...common,
    entryPoints: [join(root, "tests/fixtures/react-entry.tsx")],
    outfile: join(root, "tests/.generated/react19-fixture.js"),
    alias: {
      react: join(root, "tests/react19/node_modules/react"),
      "react-dom": join(root, "tests/react19/node_modules/react-dom"),
    },
  }),
]);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".map": "application/json",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const file = normalize(join(root, decodeURIComponent(url.pathname)));
    // Stay inside the repo folder.
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT, "127.0.0.1", () => console.log(`test server on http://127.0.0.1:${PORT}`));
