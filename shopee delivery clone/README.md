# Shopee Delivery Clone

Driver app for Shopee-style deliveries: view orders, capture **pickup** and **delivery** package photos, and (when wired up) run **damage detection** on each photo.

Built as a pnpm monorepo: React driver UI, Express API, PostgreSQL (Drizzle).

## Quick start

From the `shopee delivery clone` folder:

```bash
pnpm install
cp .env.example .env
# Edit .env — set DATABASE_URL (Neon/Supabase URI or local Docker URL)
pnpm db:setup
```

Run **two terminals**:

| Terminal | Command | URL |
|----------|---------|-----|
| 1 — API | `pnpm dev:api` | http://localhost:3001 |
| 2 — App | `pnpm dev:app` | http://localhost:5173 |

Open **http://localhost:5173**. The app proxies `/api` to the API on port **3001**.

After changing API routes, restart `pnpm dev:api` (watch mode rebuilds automatically).

## Driver flow

1. **Deliveries** — pick an order (sample data from seed).
2. **Pickup photo** — take or upload a photo at the seller/hub → status becomes `picked_up`.
3. **Start transit** — move to `in_transit`.
4. **Delivery photo** — photo at the customer → status becomes `delivered`.
5. **X on a photo** — remove and retake (works in any status).

Sample orders use **Philippine peso (PHP)** amounts. Reset test data anytime:

```bash
pnpm db:reset-test   # clears all photos + resets orders to pending
```

## Database setup

PostgreSQL only. Paste a connection string into `.env` as `DATABASE_URL`.

| Option | When to use |
|--------|-------------|
| [Neon](https://neon.tech) or [Supabase](https://supabase.com) | Shared cloud DB for the team |
| Docker `pnpm db:up` | Solo local dev (needs Docker Desktop) |

**Sharing with teammates:** use the same `DATABASE_URL` (never commit `.env`). One person runs `pnpm db:setup` once. For remote browsers to hit your machine, also set `VITE_API_URL` to your LAN/deployed API URL.

### Local Postgres (Docker)

```bash
pnpm db:up      # start
pnpm db:down    # stop
```

Credentials: `shopee` / `shopee` / database `shopee_delivery` (see `docker-compose.yml`).

## Damage detection (RipEye)

Photos run through the RipEye model when inference is running and `.env` has `DAMAGE_MODEL_ENABLED=true`.

**1. Start inference** (from RipEye repo root, sibling of this folder):

```bash
cd ..
source .venv/bin/activate
python scripts/serve_inference.py
```

**2. Enable in this app's `.env`:**

```
DAMAGE_MODEL_ENABLED=true
DAMAGE_MODEL_URL=http://localhost:8000/v1/analyze-package
```

Restart `pnpm dev:api` after editing `.env`.

**3. Test:** upload a pickup or delivery photo — toast + badge show `none` / `minor` / `severe`.

Hook: `artifacts/api-server/src/lib/damage-model.ts` · training: [`../docs/MODEL.md`](../docs/MODEL.md)

If you had an older DB with `suspected`/`confirmed`, run once: `pnpm db:migrate-damage-flags`

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:api` | API with auto-rebuild on code changes |
| `pnpm dev:app` | Driver UI (Vite) |
| `pnpm db:setup` | Apply schema + seed sample driver & orders |
| `pnpm db:push` | Push schema only |
| `pnpm db:seed` | Seed sample data |
| `pnpm db:clear-photos` | Remove all photos; reset orders to `pending` |
| `pnpm db:fix-prices` | Reset sample orders to realistic PHP prices |
| `pnpm db:reset-test` | `clear-photos` + `fix-prices` |
| `pnpm db:up` / `pnpm db:down` | Docker Postgres |
| `pnpm typecheck` | Typecheck workspace |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `DATABASE_URL must be set` | `cp .env.example .env` and set a Postgres URL |
| Empty delivery list | `pnpm db:seed` or `pnpm db:setup` |
| Port 3001 or 5173 in use | Change `PORT` / `VITE_PORT` in `.env` |
| Photo **X** does nothing | Restart `pnpm dev:api` so DELETE routes load |
| Camera not working | Use `localhost` or HTTPS; allow browser camera permission |
| Damage always `none` | Start `python scripts/serve_inference.py` in RipEye root; check `DAMAGE_MODEL_ENABLED=true` |
| `Damage check failed — model unreachable` | Inference not running on port 8000, or restart `pnpm dev:api` |
| Docker daemon error | Start Docker Desktop, then `pnpm db:up` |

## Project layout

```
artifacts/
  driver-app/     React + Vite driver UI
  api-server/     Express API
    src/lib/damage-model.ts   ← plug in RipEye / CV model
lib/
  db/             Drizzle schema, seed, migrations
  api-client-react/   Generated React Query hooks
  api-zod/            Request/response validators
```
