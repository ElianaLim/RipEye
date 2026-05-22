#!/usr/bin/env python3
"""Train YOLO on a Roboflow export."""

from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    p = argparse.ArgumentParser(description="Train RipEye damage detector (YOLO)")
    p.add_argument("data_yaml", type=Path, help="Path to data.yaml from Roboflow download")
    p.add_argument("--model", default="yolov8s.pt", help="Base checkpoint (yolov8n/s/m)")
    p.add_argument("--epochs", type=int, default=100, help="Max epochs (early stop via --patience)")
    p.add_argument("--patience", type=int, default=15, help="Stop if no val improvement for N epochs")
    p.add_argument("--imgsz", type=int, default=640)
    p.add_argument("--batch", type=int, default=16)
    p.add_argument("--project", default="runs/detect", help="Ultralytics output dir")
    p.add_argument("--name", default="ripeye", help="Run name")
    args = p.parse_args()

    data_yaml = args.data_yaml.resolve()
    if not data_yaml.exists():
        raise FileNotFoundError(data_yaml)

    from ultralytics import YOLO

    model = YOLO(args.model)
    model.train(
        data=str(data_yaml),
        epochs=args.epochs,
        patience=args.patience,
        imgsz=args.imgsz,
        batch=args.batch,
        project=args.project,
        name=args.name,
        pretrained=True,
    )
    print(f"Training done. Weights under {args.project}/{args.name}/weights/")


if __name__ == "__main__":
    main()
