from __future__ import annotations

import argparse
import base64
import io
import json
import mimetypes
import os
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
from PIL import Image

try:
    import tensorflow as tf
except ModuleNotFoundError as exc:
    tf = None
    TF_IMPORT_ERROR = exc
else:
    TF_IMPORT_ERROR = None


ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
DEFAULT_MODEL = ROOT / "models" / "package_damage_float16.tflite"
DEFAULT_LABELS = ROOT / "models" / "labels.txt"
FALLBACK_LABELS = ["damaged", "intact"]


class TFLiteClassifier:
    def __init__(self, model_path: Path, labels_path: Path | None = None):
        if tf is None:
            raise RuntimeError(
                "TensorFlow could not be imported. Reinstall the project requirements with "
                "`pip install -r requirements.txt` before running the tester. "
                f"Original error: {TF_IMPORT_ERROR}"
            )

        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found at {model_path}. Put your .tflite file there "
                "or start the app with --model /path/to/model.tflite."
            )

        self.model_path = model_path
        self.labels = self._load_labels(labels_path)
        self.interpreter = tf.lite.Interpreter(model_path=str(model_path))
        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()[0]
        self.output_details = self.interpreter.get_output_details()[0]

        _, self.height, self.width, self.channels = self.input_details["shape"]
        if self.channels != 3:
            raise ValueError(f"Expected an RGB model input, got shape {self.input_details['shape']}.")

    def _load_labels(self, labels_path: Path | None) -> list[str]:
        if labels_path and labels_path.exists():
            labels = [line.strip() for line in labels_path.read_text().splitlines() if line.strip()]
            if labels:
                return labels
        return FALLBACK_LABELS

    def predict(self, image_bytes: bytes) -> dict:
        started = time.perf_counter()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        preview_size = image.size
        tensor = self._prepare_input(image)

        self.interpreter.set_tensor(self.input_details["index"], tensor)
        self.interpreter.invoke()
        raw_output = self.interpreter.get_tensor(self.output_details["index"])[0]
        scores = self._dequantize_output(raw_output)
        scores = self._normalize_scores(scores)
        latency_ms = (time.perf_counter() - started) * 1000

        predictions = [
            {
                "label": self.labels[i] if i < len(self.labels) else f"class_{i}",
                "score": float(score),
            }
            for i, score in enumerate(scores)
        ]
        predictions.sort(key=lambda item: item["score"], reverse=True)

        return {
            "topLabel": predictions[0]["label"],
            "topScore": predictions[0]["score"],
            "predictions": predictions,
            "latencyMs": latency_ms,
            "input": {
                "model": self.model_path.name,
                "sourceWidth": preview_size[0],
                "sourceHeight": preview_size[1],
                "modelWidth": int(self.width),
                "modelHeight": int(self.height),
                "dtype": str(self.input_details["dtype"]),
            },
        }

    def _prepare_input(self, image: Image.Image) -> np.ndarray:
        resized = image.resize((int(self.width), int(self.height)), Image.Resampling.BILINEAR)
        array = np.asarray(resized)
        input_dtype = self.input_details["dtype"]

        if np.issubdtype(input_dtype, np.floating):
            tensor = array.astype(np.float32)
        else:
            scale, zero_point = self.input_details["quantization"]
            if scale and scale > 0:
                tensor = array.astype(np.float32) / scale + zero_point
            else:
                tensor = array
            info = np.iinfo(input_dtype)
            tensor = np.clip(np.rint(tensor), info.min, info.max).astype(input_dtype)

        return np.expand_dims(tensor, axis=0)

    def _dequantize_output(self, output: np.ndarray) -> np.ndarray:
        output = np.asarray(output)
        if np.issubdtype(output.dtype, np.floating):
            return output.astype(np.float32)

        scale, zero_point = self.output_details["quantization"]
        if scale and scale > 0:
            return (output.astype(np.float32) - zero_point) * scale
        return output.astype(np.float32)

    def _normalize_scores(self, scores: np.ndarray) -> np.ndarray:
        scores = scores.astype(np.float32).flatten()
        if scores.size == 0:
            raise ValueError("Model returned an empty output tensor.")

        if np.any(scores < 0) or not np.isclose(float(scores.sum()), 1.0, atol=0.05):
            shifted = scores - np.max(scores)
            exp_scores = np.exp(shifted)
            scores = exp_scores / np.sum(exp_scores)

        return scores


def decode_image_payload(payload: dict) -> bytes:
    image_data = payload.get("image")
    if not image_data:
        raise ValueError("Missing image data.")

    if "," in image_data:
        image_data = image_data.split(",", 1)[1]
    return base64.b64decode(image_data)


def make_handler(classifier: TFLiteClassifier):
    class RipEyeHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            path = urlparse(self.path).path
            if path == "/":
                path = "/index.html"
            self._serve_static(path)

        def do_POST(self):
            path = urlparse(self.path).path
            if path != "/api/predict":
                self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
                return

            try:
                length = int(self.headers.get("Content-Length", "0"))
                payload = json.loads(self.rfile.read(length))
                result = classifier.predict(decode_image_payload(payload))
                self._send_json(result)
            except Exception as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)

        def _serve_static(self, request_path: str):
            requested = (STATIC_DIR / request_path.lstrip("/")).resolve()
            if not requested.is_file() or STATIC_DIR not in requested.parents:
                self.send_error(HTTPStatus.NOT_FOUND, "File not found")
                return

            content_type = mimetypes.guess_type(requested.name)[0] or "application/octet-stream"
            body = requested.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _send_json(self, data: dict, status: HTTPStatus = HTTPStatus.OK):
            body = json.dumps(data).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args):
            return

    return RipEyeHandler


def main():
    parser = argparse.ArgumentParser(description="Run the RipEye local model tester.")
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--labels", type=Path, default=DEFAULT_LABELS)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8000)))
    args = parser.parse_args()

    classifier = TFLiteClassifier(args.model.resolve(), args.labels.resolve())
    server = ThreadingHTTPServer((args.host, args.port), make_handler(classifier))
    print(f"RipEye tester running at http://{args.host}:{args.port}")
    print(f"Model: {classifier.model_path}")
    print(f"Labels: {', '.join(classifier.labels)}")
    server.serve_forever()


if __name__ == "__main__":
    main()
