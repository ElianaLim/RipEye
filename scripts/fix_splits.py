#!/usr/bin/env python3
"""Move import valid/test images out of data/train/ into data/valid/."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMG_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def holdout_stems(import_dirs: list[Path]) -> set[str]:
    stems: set[str] = set()
    for src in import_dirs:
        for split in ("valid", "val", "test"):
            img_dir = src / split / "images"
            if not img_dir.exists():
                continue
            for p in img_dir.iterdir():
                if p.suffix.lower() in IMG_EXT:
                    stems.add(p.stem)
    return stems


def move_to_valid(data_root: Path, stems: set[str]) -> int:
    train_img = data_root / "train" / "images"
    train_lbl = data_root / "train" / "labels"
    valid_img = data_root / "valid" / "images"
    valid_lbl = data_root / "valid" / "labels"
    valid_img.mkdir(parents=True, exist_ok=True)
    valid_lbl.mkdir(parents=True, exist_ok=True)

    moved = 0
    for stem in sorted(stems):
        lbl = train_lbl / f"{stem}.txt"
        img = next(train_img.glob(f"{stem}.*"), None)
        if not img or not lbl.exists():
            continue
        out_img = valid_img / img.name
        out_lbl = valid_lbl / lbl.name
        if out_img.exists() or out_lbl.exists():
            continue
        shutil.move(str(img), str(out_img))
        shutil.move(str(lbl), str(out_lbl))
        moved += 1
    return moved


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--data", type=Path, default=ROOT / "data")
    p.add_argument(
        "--import-dirs",
        type=Path,
        nargs="+",
        default=[ROOT / "data" / "import" / "v1", ROOT / "data" / "import" / "v2"],
    )
    args = p.parse_args()

    stems = holdout_stems([d.resolve() for d in args.import_dirs])
    moved = move_to_valid(args.data.resolve(), stems)
    n_train = len(list((args.data / "train" / "images").glob("*")))
    n_valid = len(list((args.data / "valid" / "images").glob("*")))
    print(f"Moved {moved} pairs to valid/ (train={n_train}, valid={n_valid})")


if __name__ == "__main__":
    main()
