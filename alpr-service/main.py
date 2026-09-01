import os

import cv2
import numpy as np
from fast_alpr import ALPR
from fastapi import FastAPI, File, Header, HTTPException, UploadFile

# Loaded once at process startup, not per-request -- the ONNX models are a few
# MB each and take noticeable time to initialize, so this keeps steady-state
# requests fast at the cost of a slower cold start on the host's free tier.
alpr = ALPR(
    detector_model="yolo-v9-t-384-license-plate-end2end",
    ocr_model="cct-xs-v2-global-model",
)

API_KEY = os.environ["ALPR_API_KEY"]

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
async def predict(file: UploadFile = File(...), x_api_key: str | None = Header(default=None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    image_bytes = await file.read()
    # alpr.predict() takes a numpy array (or file path), not raw bytes -- decode
    # the uploaded image the same way cv2.imread would for a file on disk.
    image = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    results = alpr.predict(image)
    if not results:
        return {"found": False}

    # Pick the highest-confidence detection if more than one plate-like region
    # was found in the frame (e.g. a reflection or a second vehicle in shot).
    best = max(results, key=lambda r: r.detection.confidence)
    if best.ocr is None or not best.ocr.text:
        return {"found": False}

    confidence = min(best.ocr.confidence) if best.ocr.confidence else None
    return {"found": True, "plate": best.ocr.text, "confidence": confidence}
