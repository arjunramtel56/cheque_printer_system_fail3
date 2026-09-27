/**
 * Dev-only helper: starts/stops the embedded PostgreSQL instance used for
 * local authentication-flow validation. Not used by production code.
 *
 * Usage:
 *   node scripts/dev-db.mjs start   # initialise (first run) + start on port 5432
 *   node scripts/dev-db.mjs stop
 */
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", ".embedded-pg-data");

const command = process.argv[2] ?? "start";

if (command === "start") {
  const firstRun = !fs.existsSync(path.join(dataDir, "PG_VERSION"));
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port: 5432,
    persistent: false,
    onLog: () => {},
    onError: (msg) => console.error("[pg]", String(msg).slice(0, 200)),
  });

  process.on("SIGINT", async () => {
    await pg.stop();
    process.exit(0);
  });

  if (firstRun) {
    console.log("Initialising PostgreSQL data directory...");
    await pg.initialise();
  }
  await pg.start();
  await pg.createDatabase("reactify_cheque").catch(() => {});
  console.log("PostgreSQL ready on localhost:5432 (db: reactify_cheque)");
  // Keep the process alive so the server keeps running.
  setInterval(() => {}, 60_000);
} else if (command === "stop") {
  console.log("Use Ctrl+C on the running dev-db process, or kill the node PID listening on 5432.");
}
