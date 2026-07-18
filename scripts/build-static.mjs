import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await mkdir(join(dist, "server"), { recursive: true });
await mkdir(join(dist, ".openai"), { recursive: true });

await cp(join(root, "index.html"), join(dist, "index.html"));
await cp(join(root, "styles.css"), join(dist, "styles.css"));
await cp(join(root, "app.js"), join(dist, "app.js"));
await cp(join(root, "assets"), join(dist, "assets"), { recursive: true });
await cp(join(root, ".openai", "hosting.json"), join(dist, ".openai", "hosting.json"));

await writeFile(
  join(dist, "server", "index.js"),
  `export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};
`,
);

console.log("Built static site to dist/");
