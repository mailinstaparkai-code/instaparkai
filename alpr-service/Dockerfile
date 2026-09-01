FROM python:3.11-slim

WORKDIR /app

# opencv-python-headless (a fast-alpr dependency) needs libgl/libglib at
# runtime even though it never opens a display.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Downloads the detector/OCR ONNX weights into the image at build time rather
# than on first request -- avoids a slow, network-dependent first call after
# every cold start on top of the free-tier spin-up delay.
RUN python -c "from fast_alpr import ALPR; ALPR(detector_model='yolo-v9-t-384-license-plate-end2end', ocr_model='cct-xs-v2-global-model')"

COPY main.py .

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
