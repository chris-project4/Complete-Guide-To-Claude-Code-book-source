import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";
import * as esbuild from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const clientDir = join(root, "client");
const publicDir = join(here, "public");

// Compile the client TypeScript (which imports the shared/ types and pure
// functions) into a single browser ES module, and copy the static shell.
// The server owns this step — there is no separate frontend toolchain to run.
export async function buildClient(): Promise<void> {
  mkdirSync(publicDir, { recursive: true });

  await esbuild.build({
    entryPoints: [join(clientDir, "src", "main.ts")],
    bundle: true,
    format: "esm",
    target: "es2022",
    sourcemap: true,
    outfile: join(publicDir, "app.js"),
    logLevel: "warning",
  });

  copyFileSync(join(clientDir, "index.html"), join(publicDir, "index.html"));
  copyFileSync(join(clientDir, "styles.css"), join(publicDir, "styles.css"));
}

// Allow running this file directly: `node --experimental-strip-types server/build-client.ts`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  buildClient()
    .then(() => console.log("client built -> server/public"))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
