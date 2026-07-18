import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await cp(join(root, "index.html"), join(dist, "index.html"));
await cp(join(root, "styles.css"), join(dist, "styles.css"));
await cp(join(root, "app.js"), join(dist, "app.js"));
await cp(join(root, "assets"), join(dist, "assets"), { recursive: true });

console.log("Built static site to dist/");
