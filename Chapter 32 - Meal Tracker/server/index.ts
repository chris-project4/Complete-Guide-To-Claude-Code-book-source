import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { openDb } from "./db.ts";
import { createApp } from "./app.ts";
import { buildClient } from "./build-client.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "data");
mkdirSync(dataDir, { recursive: true });

// The server compiles the client before serving it (no separate build step).
await buildClient();

const db = openDb(join(dataDir, "app.db"));
const app = createApp(db);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Meal Tracker listening on http://localhost:${port}`);
});
