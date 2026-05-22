# Dataset

YOLO export: `data.yaml`, `train/images`, `train/labels`.

Raw Roboflow exports (no API key needed after first download) live in `data/import/v1` and `data/import/v2`.

## First-time setup (needs Roboflow API key once)

```bash
python scripts/fetch_data.py --no-merge   # download v1 + v2 to data/import/
python scripts/fetch_data.py --merge-only # merge into data/train/
```

After that you can remove `ROBOFLOW_API_KEY` from `.env`.

## Severity labels (generated, not committed)

```bash
python scripts/compute_severity_labels.py data
```

Writes `data/severity_labels.csv` (gitignored). Thresholds in `ripeye/severity.py`.

## Train

Notebook: `notebooks/train_damage_detection.ipynb`

```bash
python scripts/train_detector.py data/data.yaml --model yolov8s.pt
# defaults: max 100 epochs, patience 15 (stops early when val mAP plateaus)
```
