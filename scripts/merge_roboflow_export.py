#!/usr/bin/env python3
"""Merge Roboflow YOLO exports into data/ (train + valid splits, remaps class ids)."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

import yaml

TARGET_NAMES = ["Damaged", "package"]
DAMAGE_ALIASES = frozenset(
    {
        "damaged",
        "damage",
        "minor damage",
        "minor damage (damaged)",
        "severe damage",
        "severe damage (destroyed)",
        "destroyed",
    }
)
PACKAGE_ALIASES = frozenset({"package", "box", "intact", "parcel"})


def _load_names(data_yaml: Path) -> list[str]:
    meta = yaml.safe_load(data_yaml.read_text())
    names = meta.get("names", [])
    if isinstance(names, dict):
        return [names[k] for k in sorted(names, key=lambda x: int(x))]
    return list(names)


def _target_id(class_name: str) -> int | None:
    n = class_name.strip().lower()
    if n in DAMAGE_ALIASES or "damage" in n or "damaged" in n or "destroyed" in n:
        return 0
    if n in PACKAGE_ALIASES or "package" in n or "box" in n:
        return 1
    return None


def _remap_file(src_label: Path, dst_label: Path, id_map: dict[int, int]) -> None:
    lines_out: list[str] = []
    for line in src_label.read_text().strip().splitlines():
        if not line.strip():
            continue
        parts = line.split()
        old_id = int(parts[0])
        if old_id not in id_map:
            raise ValueError(f"Unmapped class id {old_id} in {src_label}")
        parts[0] = str(id_map[old_id])
        lines_out.append(" ".join(parts))
    dst_label.write_text("\n".join(lines_out) + ("\n" if lines_out else ""))


def _dest_split(split: str) -> str:
    if split == "train":
        return "train"
    return "valid"  # valid, val, test → holdout for YOLO val + severity eval


def merge_export(src_root: Path, dst_root: Path) -> tuple[int, int]:
    data_yaml = src_root / "data.yaml"
    if not data_yaml.exists():
        raise FileNotFoundError(f"Missing {data_yaml}")

    src_names = _load_names(data_yaml)
    id_map: dict[int, int] = {}
    for i, name in enumerate(src_names):
        tid = _target_id(name)
        if tid is None:
            raise ValueError(f"Unknown class {name!r} in {data_yaml} — add alias or rename in Roboflow")
        id_map[i] = tid

    print(f"  classes {src_names} -> ids {id_map} (target {TARGET_NAMES})")

    copied, skipped = 0, 0
    for split in ("train", "valid", "val", "test"):
        img_dir = src_root / split / "images"
        lbl_dir = src_root / split / "labels"
        if not img_dir.exists():
            continue
        dest_split = _dest_split(split)
        img_dst = dst_root / dest_split / "images"
        lbl_dst = dst_root / dest_split / "labels"
        img_dst.mkdir(parents=True, exist_ok=True)
        lbl_dst.mkdir(parents=True, exist_ok=True)

        for img_path in sorted(img_dir.iterdir()):
            if img_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            out_img = img_dst / img_path.name
            lbl_path = lbl_dir / f"{img_path.stem}.txt"
            if not lbl_path.exists():
                print(f"  skip (no label): {img_path.name}")
                continue
            if out_img.exists():
                skipped += 1
                continue
            shutil.copy2(img_path, out_img)
            _remap_file(lbl_path, lbl_dst / lbl_path.name, id_map)
            copied += 1

    return copied, skipped


def main() -> None:
    p = argparse.ArgumentParser(description="Merge Roboflow YOLO exports into data/train/")
    p.add_argument("sources", nargs="+", type=Path, help="Unzipped export folders")
    p.add_argument("--dest", type=Path, default=Path("data"), help="Main dataset root")
    args = p.parse_args()

    dest = args.dest.resolve()
    total_copied = total_skipped = 0
    for src in args.sources:
        src = src.resolve()
        print(f"Merging {src} ...")
        copied, skipped = merge_export(src, dest)
        print(f"  copied {copied}, skipped duplicates {skipped}")
        total_copied += copied
        total_skipped += skipped

    n_train = len(list((dest / "train" / "images").glob("*")))
    n_valid = len(list((dest / "valid" / "images").glob("*")))
    print(f"\nDone. train={n_train}, valid={n_valid}")
if __name__ == "__main__":
    main()
