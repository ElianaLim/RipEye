"""RipEye inference API for the driver app."""

from __future__ import annotations

import base64
import os
from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[1]


class AnalyzeRequest(BaseModel):
    image: str
    mimeType: str = "image/jpeg"


class AnalyzeResponse(BaseModel):
    damageFlag: str
    damageDetails: str | None
    message: str


_state: dict = {}


def _message(flag: str, details: str | None) -> str:
    if flag == "none":
        return "No visible damage detected."
    if flag == "minor":
        return f"Minor damage: {details}" if details else "Minor damage — review photo."
    return f"Severe damage: {details}" if details else "Severe damage — review photo."


@asynccontextmanager
async def lifespan(app: FastAPI):
    from ultralytics import YOLO

    from ripeye.severity import SeverityConfig, load_id_to_name

    weights = Path(os.environ.get("RIPEYE_WEIGHTS", ROOT / "models/ripeye/best.pt"))
    data_yaml = Path(os.environ.get("RIPEYE_DATA_YAML", ROOT / "data/data.yaml"))
    if not weights.exists():
        raise FileNotFoundError(f"Missing weights: {weights}")
    if not data_yaml.exists():
        raise FileNotFoundError(f"Missing {data_yaml}")

    _state["model"] = YOLO(str(weights))
    _state["id_to_name"] = load_id_to_name(data_yaml)
    _state["cfg"] = SeverityConfig(severe_ratio=float(os.environ.get("RIPEYE_SEVERE_RATIO", "0.30")))
    _state["conf"] = float(os.environ.get("RIPEYE_CONF", "0.15"))
    _state["imgsz"] = int(os.environ.get("RIPEYE_IMGSZ", "640"))
    _state["api_key"] = os.environ.get("DAMAGE_MODEL_API_KEY", "").strip()
    yield
    _state.clear()


app = FastAPI(title="RipEye", lifespan=lifespan)


def _check_auth(authorization: str | None) -> None:
    key = _state.get("api_key", "")
    if not key:
        return
    if authorization != f"Bearer {key}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/v1/analyze-package", response_model=AnalyzeResponse)
def analyze_package(
    req: AnalyzeRequest,
    authorization: str | None = Header(default=None),
) -> AnalyzeResponse:
    from PIL import Image

    from ripeye.severity import severity_for_prediction

    _check_auth(authorization)

    try:
        raw = req.image.strip()
        if raw.startswith("data:"):
            raw = raw.split(",", 1)[1]
        img = Image.open(BytesIO(base64.b64decode(raw))).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}") from exc

    results = _state["model"].predict(
        img,
        imgsz=_state["imgsz"],
        conf=_state["conf"],
        verbose=False,
    )
    pred = severity_for_prediction(results[0], _state["id_to_name"], cfg=_state["cfg"])
    flag = str(pred["severity"])
    ratio = float(pred["damage_area_ratio"])
    details = f"{ratio * 100:.1f}% of package area" if flag != "none" else None

    return AnalyzeResponse(
        damageFlag=flag,
        damageDetails=details,
        message=_message(flag, details),
    )
