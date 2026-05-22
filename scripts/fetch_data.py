#!/usr/bin/env python3
"""Download Roboflow exports and merge into data/train/."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

EXPORTS = [
    ("deteksipaketrusak", "package-kglu1", 2, "v2"),
    ("deteksipaketrusak", "package-kglu1", 1, "v1"),
]


def _api_key() -> str:
    try:
        from dotenv import load_dotenv

        load_dotenv(ROOT / ".env")
    except ImportError:
        pass
    key = os.environ.get("ROBOFLOW_API_KEY", "").strip()
    if not key:
        raise SystemExit("Set ROBOFLOW_API_KEY in .env (see .env.example)")
    return key


def download(import_root: Path) -> list[Path]:
    from roboflow import Roboflow

    rf = Roboflow(api_key=_api_key())
    import_root.mkdir(parents=True, exist_ok=True)
    out: list[Path] = []

    for workspace, project, version, folder in EXPORTS:
        dest = import_root / folder
        if dest.exists():
            shutil.rmtree(dest)

        print(f"{workspace}/{project} v{version} -> {dest}")
        version_obj = rf.workspace(workspace).project(project).version(version)

        prev = Path.cwd()
        os.chdir(ROOT)
        try:
            for stale in ROOT.glob("Package-*"):
                if stale.is_dir():
                    shutil.rmtree(stale)
            ds = version_obj.download("yolov8")
            src = Path(ds.location).resolve()
        finally:
            os.chdir(prev)

        if not (src / "data.yaml").exists():
            raise FileNotFoundError(f"Missing data.yaml in {src}")
        shutil.move(str(src), str(dest))
        n = len(list((dest / "train" / "images").glob("*")))
        print(f"  {n} train images")
        out.append(dest)

    return out


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--import-dir", type=Path, default=ROOT / "data" / "import")
    p.add_argument("--dest", type=Path, default=ROOT / "data")
    p.add_argument("--merge-only", action="store_true")
    p.add_argument("--no-merge", action="store_true")
    args = p.parse_args()

    import_root = args.import_dir.resolve()
    if args.merge_only:
        sources = [import_root / name for _, _, _, name in EXPORTS]
        for s in sources:
            if not (s / "data.yaml").exists():
                raise SystemExit(f"Missing export: {s}")
    else:
        sources = download(import_root)

    if not args.no_merge:
        cmd = [
            sys.executable,
            str(ROOT / "scripts" / "merge_roboflow_export.py"),
            *[str(s) for s in sources],
            "--dest",
            str(args.dest.resolve()),
        ]
        subprocess.run(cmd, check=True, cwd=ROOT)
        subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "compute_severity_labels.py"), str(args.dest)],
            check=True,
            cwd=ROOT,
        )


if __name__ == "__main__":
    main()
