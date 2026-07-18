import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const client = join(dist, "client");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await mkdir(client, { recursive: true });
await mkdir(join(dist, "server"), { recursive: true });
await mkdir(join(dist, ".openai"), { recursive: true });

await cp(join(root, "index.html"), join(client, "index.html"));
await cp(join(root, "styles.css"), join(client, "styles.css"));
await cp(join(root, "app.js"), join(client, "app.js"));
await cp(join(root, "assets"), join(client, "assets"), { recursive: true });
await cp(join(root, ".openai", "hosting.json"), join(dist, ".openai", "hosting.json"));

await writeFile(
  join(dist, "server", "index.js"),
  `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      url.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(url, request));
    }
    return env.ASSETS.fetch(request);
  }
};
`,
);

console.log("Built static site to dist/");
