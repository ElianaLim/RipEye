import "./load-env";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env.PORT ?? "3001";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (!process.env.DATABASE_URL) {
  logger.error(
    "DATABASE_URL is not set. Copy .env.example to .env, start Postgres, then run pnpm db:setup.",
  );
  process.exit(1);
}

app.listen(port, () => {
  const damageModelEnabled = process.env.DAMAGE_MODEL_ENABLED === "true";
  logger.info(
    {
      port,
      damageModelEnabled,
      damageModelUrl: damageModelEnabled
        ? process.env.DAMAGE_MODEL_URL?.trim() ?? null
        : null,
    },
    "Server listening",
  );
});
