/**
 * One-time migration: suspected → minor, confirmed → severe on damage_flag enum.
 * Run: pnpm db:migrate-damage-flags
 */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const envPath = resolve(import.meta.dirname, "../../../.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL in .env");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });

async function main() {
  await client.connect();
  const typeCheck = await client.query(
    `SELECT e.enumlabel FROM pg_enum e
     JOIN pg_type t ON e.enumtypid = t.oid
     WHERE t.typname = 'damage_flag' ORDER BY e.enumsortorder`,
  );
  const labels = typeCheck.rows.map((r) => r.enumlabel as string);
  console.log("Current damage_flag values:", labels.join(", "));

  if (labels.includes("minor") && labels.includes("severe")) {
    console.log("Already migrated — nothing to do.");
    await client.end();
    return;
  }

  if (labels.includes("suspected")) {
    await client.query(`ALTER TYPE damage_flag RENAME VALUE 'suspected' TO 'minor'`);
    console.log("Renamed enum value suspected → minor");
  }

  if (labels.includes("confirmed")) {
    await client.query(`ALTER TYPE damage_flag RENAME VALUE 'confirmed' TO 'severe'`);
    console.log("Renamed enum value confirmed → severe");
  }

  console.log("Done.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
