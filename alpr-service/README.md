# alpr-service

A minimal FastAPI wrapper around [fast-alpr](https://github.com/ankandrew/fast-alpr)
(MIT-licensed, self-hosted, no per-call quota) exposing one endpoint that
`apps/super-admin`'s `extractPlateViaFastAlpr` adapter
(`apps/super-admin/src/lib/parking-admin/anpr.ts`) calls over HTTP, the same way it
calls the Kotai/CarmenCloud vendor APIs -- this is a separate Python service because
fast-alpr is a Python/ONNX library with nothing to `npm install`, not because it
needs its own product surface.

## Why this exists

Vendor ANPR APIs hit real quota/access limits (Kotai's demo key exhausted its free
trial, CarmenCloud's key was rejected outright). fast-alpr runs entirely locally --
no key, no quota, no per-call cost -- and in local testing against two real,
known-answer plate photos (a two-line plate with the "IND" country stamp, and a
weathered/worn plate that Kotai itself misread) it read both perfectly. See the
Super Admin project's plan history for the full comparison.

## Endpoints

- `GET /health` -- liveness check for the hosting platform.
- `POST /predict` -- multipart `file` field (the plate photo) + `X-Api-Key` header
  matching the `ALPR_API_KEY` env var. Returns `{"found": false}` or
  `{"found": true, "plate": "KA05A00673", "confidence": 0.57}` (confidence is the
  weakest single character's OCR confidence, 0-1).

## Running locally

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
ALPR_API_KEY=some-local-secret uvicorn main:app --reload
```

## Deploying

Built from the `Dockerfile` in this directory (downloads and bakes in the ONNX
model weights at build time, so a cold start doesn't also pay for a model
download). Point Render or Fly.io at this directory with `ALPR_API_KEY` set to a
long random secret, then enter that same secret as the "API key" and the
service's HTTPS URL as the endpoint when assigning it in Super Admin's
Marketplace (category: ANPR).
