"""Severity from YOLO box areas."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import csv


@dataclass
class Box:
    class_id: int
    class_name: str
    width: float
    height: float

    @property
    def area(self) -> float:
        return self.width * self.height


@dataclass
class SeverityConfig:
    """Map Roboflow class names (lowercase) to roles."""

    package_names: frozenset[str] = frozenset({"package", "box", "intact"})
    minor_damage_names: frozenset[str] = frozenset(
        {"minor damage (damaged)", "damaged", "minor", "minor damage"}
    )
    severe_damage_names: frozenset[str] = frozenset(
        {"severe damage (destroyed)", "destroyed", "severe", "severe damage"}
    )
    # damage_area / package_area → severity (tune thresholds on validation set)
    # < minor_ratio = none, [minor_ratio, severe_ratio] = minor, > severe_ratio = severe
    minor_ratio: float = 0.05
    severe_ratio: float = 0.20


def _wh_from_label_parts(parts: list[str]) -> tuple[float, float] | None:
    """Parse YOLO bbox (5 tokens) or segmentation polygon (6+ tokens) → w, h."""
    if len(parts) < 5:
        return None
    if len(parts) == 5:
        return float(parts[3]), float(parts[4])
    coords = [float(x) for x in parts[1:]]
    xs, ys = coords[0::2], coords[1::2]
    if not xs or not ys:
        return None
    return max(xs) - min(xs), max(ys) - min(ys)


def parse_yolo_label_file(path: Path, id_to_name: dict[int, str]) -> list[Box]:
    boxes: list[Box] = []
    text = path.read_text().strip()
    if not text:
        return boxes
    for line in text.splitlines():
        parts = line.split()
        wh = _wh_from_label_parts(parts)
        if wh is None:
            continue
        w, h = wh
        cid = int(parts[0])
        name = id_to_name.get(cid, str(cid)).lower()
        boxes.append(Box(cid, name, w, h))
    return boxes


def _role(box: Box, cfg: SeverityConfig) -> str:
    n = box.class_name.lower()
    if n in cfg.severe_damage_names or any(s in n for s in ("destroyed", "severe")):
        return "severe"
    if n in cfg.minor_damage_names or "damage" in n or "damaged" in n:
        return "minor"
    if n in cfg.package_names or "intact" in n or "package" in n or "box" in n:
        return "package"
    return "other"


def compute_damage_ratio(boxes: list[Box], cfg: SeverityConfig) -> tuple[float, bool]:
    """Returns (damage_area_ratio, has_severe_class)."""
    package_areas = [b.area for b in boxes if _role(b, cfg) == "package"]
    minor_areas = [b.area for b in boxes if _role(b, cfg) == "minor"]
    severe_areas = [b.area for b in boxes if _role(b, cfg) == "severe"]
    has_severe = bool(severe_areas)

    package_area = max(package_areas) if package_areas else 1.0
    damage_area = sum(minor_areas) + sum(severe_areas)
    ratio = min(damage_area / package_area, 1.0) if package_area > 0 else 0.0
    return ratio, has_severe


def ratio_to_severity(ratio: float, has_severe: bool, cfg: SeverityConfig) -> str:
    """Image-level label: none | minor | severe (same in training and driver app)."""
    if has_severe or ratio > cfg.severe_ratio:
        return "severe"
    if ratio >= cfg.minor_ratio:
        return "minor"
    return "none"


def severity_for_boxes(
    boxes: list[Box],
    cfg: SeverityConfig | None = None,
) -> dict[str, float | str | bool | int]:
    cfg = cfg or SeverityConfig()
    ratio, has_severe = compute_damage_ratio(boxes, cfg)
    severity = ratio_to_severity(ratio, has_severe, cfg)
    return {
        "damage_area_ratio": round(ratio, 4),
        "severity": severity,
        "num_boxes": len(boxes),
        "has_severe_box": has_severe,
    }


def load_id_to_name(data_yaml: Path) -> dict[int, str]:
    import yaml

    meta = yaml.safe_load(data_yaml.read_text())
    names = meta.get("names", {})
    if isinstance(names, list):
        return {i: n for i, n in enumerate(names)}
    return {int(k): v for k, v in names.items()}


def boxes_from_ultralytics(result, id_to_name: dict[int, str]) -> list[Box]:
    """Parse one Ultralytics Results object into Box list (normalized xywh)."""
    boxes: list[Box] = []
    ultra_boxes = getattr(result, "boxes", None)
    if ultra_boxes is None or len(ultra_boxes) == 0:
        return boxes
    for i in range(len(ultra_boxes)):
        cid = int(ultra_boxes.cls[i].item())
        w, h = ultra_boxes.xywhn[i][2].item(), ultra_boxes.xywhn[i][3].item()
        name = id_to_name.get(cid, str(cid)).lower()
        boxes.append(Box(cid, name, w, h))
    return boxes


def severity_for_prediction(result, id_to_name: dict[int, str], cfg: SeverityConfig | None = None) -> dict:
    """Severity from predicted YOLO boxes (inference / eval)."""
    return severity_for_boxes(boxes_from_ultralytics(result, id_to_name), cfg)


def severity_for_label_file(
    label_path: Path,
    id_to_name: dict[int, str],
    cfg: SeverityConfig | None = None,
) -> dict:
    cfg = cfg or SeverityConfig()
    boxes = parse_yolo_label_file(label_path, id_to_name)
    out = severity_for_boxes(boxes, cfg)
    return {"label_file": str(label_path), **out}


def build_severity_csv(
    dataset_root: Path,
    output_csv: Path,
    cfg: SeverityConfig | None = None,
) -> int:
    """
    Walk a Roboflow YOLOv8 export (contains data.yaml).
    Writes one row per train/valid/test image with GT severity from boxes.
    """
    import yaml

    cfg = cfg or SeverityConfig()
    data_yaml = dataset_root / "data.yaml"
    if not data_yaml.exists():
        raise FileNotFoundError(f"Missing {data_yaml} — download with format yolov8")

    meta = yaml.safe_load(data_yaml.read_text())
    names = meta.get("names", {})
    if isinstance(names, list):
        id_to_name = {i: n for i, n in enumerate(names)}
    else:
        id_to_name = {int(k): v for k, v in names.items()}

    root = Path(meta.get("path", dataset_root))
    splits = []
    for key in ("train", "val", "valid", "test"):
        if key in meta:
            split_name = "train" if key == "train" else "val"
            splits.append((split_name, root / meta[key]))

    rows: list[dict] = []
    seen_labels: set[Path] = set()
    for split, rel in splits:
        labels_dir = Path(str(rel).replace("/images", "/labels").replace("\\images", "\\labels"))
        if not labels_dir.exists():
            labels_dir = dataset_root / split / "labels"
        if not labels_dir.exists():
            continue
        for label_path in sorted(labels_dir.glob("*.txt")):
            resolved = label_path.resolve()
            if resolved in seen_labels:
                continue
            seen_labels.add(resolved)
            row = severity_for_label_file(label_path, id_to_name, cfg)
            row["label_file"] = str(
                label_path.resolve().relative_to(dataset_root.resolve())
            )
            row["split"] = split.replace("valid", "val")
            row["image_stem"] = label_path.stem
            rows.append(row)

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        raise RuntimeError(f"No labels found under {dataset_root}")

    with output_csv.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    return len(rows)
