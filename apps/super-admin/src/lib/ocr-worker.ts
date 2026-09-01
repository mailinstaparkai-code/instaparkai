import "server-only";
import { createWorker, OEM, type Worker } from "tesseract.js";
import path from "node:path";

// Vercel's Next.js/Turbopack build cannot deploy tesseract.js's own Node worker
// script: it's only ever loaded via a runtime string path passed to
// `new Worker(...)` (worker_threads), never a static import, so the build's file
// tracer never discovers it (or its own further internal files -- getCore.js,
// the WASM core, etc.) as a dependency and silently drops them from the deployed
// function. Confirmed live: this also means the pre-existing DL-expiry OCR feature
// (operators/ocr-actions.ts) never actually worked in production either.
//
// Fix: vendor the worker script and its full dependency closure into this app's
// own source tree (ocr-data/tesseract-worker/, copied from tesseract.js's own
// source almost verbatim -- see that folder's files for the one-line diffs) so it
// deploys like any other project file, and point `workerPath`/`corePath` at it
// explicitly instead of relying on tesseract.js's own (broken-on-Vercel) default
// path resolution. getCore.js was simplified to always load the one WASM variant
// this app actually uses (LSTM-only, no SIMD detection) rather than the six
// tesseract.js normally picks between, dropping the tesseract.js-core package and
// wasm-feature-detect entirely -- both would have had the exact same
// only-reachable-via-a-runtime-path deployment problem.
const OCR_DATA_DIR = path.join(process.cwd(), "ocr-data");
const WORKER_PATH = path.join(OCR_DATA_DIR, "tesseract-worker", "worker-script", "node", "index.js");

// To swap in a cloud OCR API later: this is the only file that constructs a
// tesseract.js worker. Replace `runOcr`'s body with an API call and every caller
// (lib/dl-ocr.ts, lib/plate-ocr.ts) keeps working unchanged, since they only ever
// see a plain `(buffer) => Promise<string>` function.
export async function runOcr(buffer: Buffer): Promise<string> {
  const worker: Worker = await createWorker("eng", OEM.LSTM_ONLY, {
    langPath: OCR_DATA_DIR,
    gzip: false,
    workerPath: WORKER_PATH,
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}
