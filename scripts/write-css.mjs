// Emits style.css for apps with a strict CSP (use with injectStyles: false).
import { writeFileSync } from "node:fs";
const { STYLES } = await import("../dist/index.js");
writeFileSync(new URL("../style.css", import.meta.url), STYLES.trim() + "\n");
console.log("wrote style.css");
