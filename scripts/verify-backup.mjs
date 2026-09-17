import { spawn } from "node:child_process";
import { mkdtemp, writeFile, chmod } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import pg from "pg";

// Deliberately restricted to disposable local databases; never overwrites any database.
const sourceUrl = new URL(process.env.TEST_DATABASE_URL ?? "");
if (
  sourceUrl.search ||
  !["localhost", "127.0.0.1", "[::1]"].includes(sourceUrl.hostname) ||
  !sourceUrl.pathname.includes("test")
) {
  throw new Error("Backup rehearsal requires an isolated local test database.");
}
const targetName = `study_restore_test_${randomBytes(6).toString("hex")}`;
const targetUrl = new URL(sourceUrl);
targetUrl.pathname = `/${targetName}`;
const binary = (name) =>
  process.env.PG_BIN_DIR ? join(resolve(process.env.PG_BIN_DIR), name) : name;
const work = await mkdtemp(join(tmpdir(), "study-backup-"));
await chmod(work, 0o700);
const backup = join(work, "database.dump");
const childEnv = {
  ...process.env,
  PGHOST: sourceUrl.hostname.replace(/^\[|\]$/g, ""),
  PGPORT: sourceUrl.port || "5432",
  PGUSER: decodeURIComponent(sourceUrl.username),
  PGPASSWORD: decodeURIComponent(sourceUrl.password),
  PGDATABASE: sourceUrl.pathname.slice(1),
};
async function execute(name, args) {
  await new Promise((resolvePromise, reject) => {
    const process = spawn(binary(name), args, {
      env: childEnv,
      stdio: ["ignore", "ignore", "pipe"],
    });
    // Deliberately omit provider stderr from report: it may contain object values.
    process.stderr.resume();
    process.on("error", () => reject(new Error(`${name} could not start.`)));
    process.on("exit", (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${name} failed (${code}).`)),
    );
  });
}
async function fingerprints(client) {
  const { rows: tables } = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
  );
  const result = {};
  for (const { tablename } of tables) {
    const identifier = '"' + tablename.replaceAll('"', '""') + '"';
    const { rows } = await client.query(
      `SELECT count(*)::integer AS count, md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' ORDER BY md5(to_jsonb(t)::text)), '')) AS digest FROM public.${identifier} t`,
    );
    result[tablename] = rows[0];
  }
  return result;
}
const source = new pg.Client({ connectionString: sourceUrl.href });
const destination = new pg.Client({ connectionString: targetUrl.href });
const start = Date.now();
let created = false;
try {
  await source.connect();
  await source.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const snapshot = (await source.query("SELECT pg_export_snapshot() AS snapshot")).rows[0].snapshot;
  const expected = await fingerprints(source);
  await execute("pg_dump", [
    "--format=custom",
    "--no-owner",
    "--no-acl",
    "--snapshot=" + snapshot,
    "--file=" + backup,
  ]);
  await chmod(backup, 0o600);
  await source.query("COMMIT");
  await source.query(`CREATE DATABASE "${targetName}"`);
  created = true;
  await execute("pg_restore", [
    "--exit-on-error",
    "--no-owner",
    "--no-acl",
    "--dbname=" + targetName,
    backup,
  ]);
  await destination.connect();
  const actual = await fingerprints(destination);
  if (JSON.stringify(expected) !== JSON.stringify(actual))
    throw new Error("Restored table fingerprints differ from the dump snapshot.");
  const evidence = {
    status: "passed",
    at: new Date().toISOString(),
    elapsedMs: Date.now() - start,
    tables: Object.keys(expected).length,
    rows: Object.values(expected).reduce((sum, row) => sum + row.count, 0),
    targetDatabase: targetName,
    comparison: "row counts and canonical JSON digests for every public table",
    scope: "local PostgreSQL only; excludes storage objects and cloud PITR",
  };
  await writeFile(join(work, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n", {
    mode: 0o600,
  });
  console.log(JSON.stringify({ ...evidence, evidencePath: join(work, "evidence.json") }, null, 2));
} finally {
  await destination.end().catch(() => {});
  if (created && process.env.KEEP_RESTORED_TEST_DATABASE !== "true")
    await source.query(`DROP DATABASE "${targetName}"`).catch(() => {});
  await source.end().catch(() => {});
}
