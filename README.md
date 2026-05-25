# RipEye

Package damage detection for CS180 — YOLO detector + severity from damage area % (`none` / `minor` / `severe`).

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Pretrained weights ship in `models/ripeye/best.pt` — clone and run inference without training. To retrain, put the Roboflow YOLO export in `data/` (see [data/README.md](data/README.md)) and open `notebooks/train_damage_detection.ipynb`.

## Layout

| Path | What |
|------|------|
| `models/ripeye/best.pt` | pretrained detector weights |
| `data/` | YOLO dataset + `severity_labels.csv` |
| `ripeye/severity.py` | area % → severity |
| `scripts/` | fetch data, labels, training |
| `notebooks/` | main workflow |
| `shopee delivery clone/` | driver app (separate) |

Model hooks in the driver app: `artifacts/api-server/src/lib/damage-model.ts`.

## Driver app + inference

The driver UI is in `shopee delivery clone/`. RipEye runs as a small Python API; the Express server calls it on photo upload.

**Terminal 1 — inference (from RipEye root):**

```bash
source .venv/bin/activate
pip install -r requirements.txt
uvicorn ripeye.server:app --host 0.0.0.0 --port 8000
```

If you still see tiny false positives, raise `RIPEYE_MINOR_RATIO` before starting the API.

**Terminal 2 — API + app (from `shopee delivery clone/`):**

```bash
pnpm dev:api    # terminal 2
pnpm dev:app    # terminal 3
```

Set in `shopee delivery clone/.env`:

```
DAMAGE_MODEL_ENABLED=true
DAMAGE_MODEL_URL=http://localhost:8000/v1/analyze-package
```

Upload a pickup/delivery photo — the app shows **No damage** / **Minor damage** / **Severe damage** badges from the model.
