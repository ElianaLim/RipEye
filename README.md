# RipEye

Install the required libraries using the provided requirements file:
```bash
pip install -r requirements.txt
```

Run `download.py` in the `data` directory to download the dataset from Roboflow 

## Local model tester

The tester expects the mobile export from the Colab notebook:

- `webapp/models/package_damage_float16.tflite`
- `webapp/models/labels.txt`

`labels.txt` is already seeded with:

```txt
damaged
intact
```

Copy the `.tflite` file from Google Drive into `webapp/models/`, then run:

```bash
UV_CACHE_DIR=.tmp/uv-cache uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python webapp/app.py
```

Open `http://127.0.0.1:8000`, add one or more package photos, and run the test. The page shows the top class, confidence scores, inference time, and can export a CSV of the results.

You can test another exported model without moving it:

```bash
.venv/bin/python webapp/app.py --model /path/to/package_damage_float32.tflite --labels /path/to/labels.txt
```
