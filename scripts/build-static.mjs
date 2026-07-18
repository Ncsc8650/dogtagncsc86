import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
await cp(join(root, "config.js"), join(client, "config.js"));
await cp(join(root, "external-browser.js"), join(client, "external-browser.js"));
await cp(join(root, "styles.css"), join(client, "styles.css"));
await cp(join(root, "app.js"), join(client, "app.js"));
await cp(join(root, "assets"), join(client, "assets"), { recursive: true });
await cp(join(root, ".openai", "hosting.json"), join(dist, ".openai", "hosting.json"));

await writeFile(
  join(dist, "server", "index.js"),
  await buildEmbeddedWorker(),
);

console.log("Built static site to dist/");

async function buildEmbeddedWorker() {
  const textFiles = {
    "/index.html": ["index.html", "text/html; charset=utf-8"],
    "/config.js": ["config.js", "text/javascript; charset=utf-8"],
    "/external-browser.js": ["external-browser.js", "text/javascript; charset=utf-8"],
    "/styles.css": ["styles.css", "text/css; charset=utf-8"],
    "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  };

  const binaryFiles = {
    "/assets/images/003.png": ["assets/images/003.png", "image/png"],
    "/assets/images/003-normalized.png": ["assets/images/003-normalized.png", "image/png"],
    "/assets/images/B-normalized.png": ["assets/images/B-normalized.png", "image/png"],
    "/assets/images/131574.jpg": ["assets/images/131574.jpg", "image/jpeg"],
    "/assets/fonts/Kanit-Regular.ttf": ["assets/fonts/Kanit-Regular.ttf", "font/ttf"],
    "/assets/fonts/Kanit-SemiBold.ttf": ["assets/fonts/Kanit-SemiBold.ttf", "font/ttf"],
    "/assets/fonts/Kanit-ExtraBold.ttf": ["assets/fonts/Kanit-ExtraBold.ttf", "font/ttf"],
  };

  const entries = {};

  for (const [route, [file, type]] of Object.entries(textFiles)) {
    entries[route] = {
      type,
      text: await readFile(join(root, file), "utf8"),
    };
  }

  for (const [route, [file, type]] of Object.entries(binaryFiles)) {
    entries[route] = {
      type,
      base64: (await readFile(join(root, file))).toString("base64"),
    };
  }

  return `const FILES = ${JSON.stringify(entries)};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    if (pathname === "/config.js") {
      return new Response(
        "window.NCSC_GOOGLE_SCRIPT_URL = " + JSON.stringify(env.NCSC_GOOGLE_SCRIPT_URL || "") + ";",
        {
          headers: {
            "Content-Type": "text/javascript; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }
    const file = FILES[pathname];

    if (!file) {
      return new Response("Not found", { status: 404 });
    }

    const body = file.text ?? Uint8Array.from(atob(file.base64), (char) => char.charCodeAt(0));
    return new Response(body, {
      headers: {
        "Content-Type": file.type,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  },
};
`;
}
