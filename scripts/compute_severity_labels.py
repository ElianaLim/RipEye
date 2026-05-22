#!/usr/bin/env python3
"""Build severity CSV from YOLO ground-truth boxes (area % rules)."""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ripeye.severity import SeverityConfig, build_severity_csv


def main() -> None:
    p = argparse.ArgumentParser(description="GT box areas → severity labels CSV")
    p.add_argument(
        "dataset_root",
        type=Path,
        help="Folder with data.yaml (Roboflow yolov8 export)",
    )
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Output CSV (default: <dataset>/severity_labels.csv)",
    )
    args = p.parse_args()

    out = args.output or (args.dataset_root / "severity_labels.csv")
    n = build_severity_csv(args.dataset_root.resolve(), out.resolve())
    print(f"Wrote {n} rows → {out}")


if __name__ == "__main__":
    main()
