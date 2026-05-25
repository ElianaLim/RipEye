# Model notes

## Approach

1. **Detect** damage and package boxes (YOLO, Ultralytics).
2. **Severity** from predicted box areas — same rules as ground-truth labels in `ripeye/severity.py`.
3. **App** reads `none` / `minor` / `severe` via `DAMAGE_MODEL_URL` when accuracy is good enough.

Not using whole-image classification. Severity is area-based on boxes.

## Severity rules (current)

| Damage area % | Label    |
| ------------- | -------- |
| <5            | `none`   |
| ≥5 and ≤30    | `minor`  |
| >30           | `severe` |

Tune `minor_ratio` and `severe_ratio` in `SeverityConfig`. Regenerate labels with `scripts/compute_severity_labels.py`.

## Dataset

~2.6k images, classes `Damaged` and `package`. Merged from Roboflow project `deteksipaketrusak/package-kglu1` (v1 + v2). Fetch/merge: `scripts/fetch_data.py`.

## Training

- Notebook: `notebooks/train_damage_detection.ipynb`
- CLI: `scripts/train_detector.py data/data.yaml`
- Training writes to `runs/detect/ripeye/weights/`; the checked-in weights used at runtime are `models/ripeye/best.pt`

Evaluate detection (mAP) and severity (holdout confusion matrix) in the notebook before wiring the driver app.

## Driver app

`shopee delivery clone/` — photo capture UI. Set `DAMAGE_MODEL_ENABLED` and `DAMAGE_MODEL_URL` in that repo's `.env` once inference is deployed.
