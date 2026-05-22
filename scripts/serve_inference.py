#!/usr/bin/env python3
"""Start RipEye inference API for the driver app."""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(ROOT / ".env")
    except ImportError:
        pass

    import uvicorn

    host = os.environ.get("RIPEYE_HOST", "0.0.0.0")
    port = int(os.environ.get("RIPEYE_PORT", "8000"))
    uvicorn.run("ripeye.server:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
