// Marks the React entry as a client module, so `import { Skeleton } from "autobones/react"`
// works inside Next.js App Router files without adding "use client" yourself.
// (tsup/esbuild drops module-level directives, so we add it after the build.)
import { readFileSync, writeFileSync } from "node:fs";

for (const file of ["react.js", "react.cjs"]) {
  const path = new URL(`../dist/${file}`, import.meta.url);
  const code = readFileSync(path, "utf8");
  if (!code.startsWith('"use client"')) writeFileSync(path, `"use client";${code}`);
}
console.log('added "use client" to dist/react.js and dist/react.cjs');
