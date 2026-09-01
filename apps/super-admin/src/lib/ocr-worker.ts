import "server-only";

const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";

type OcrSpaceParsedResult = {
  ParsedText?: string;
  FileParseExitCode?: number;
  ErrorMessage?: string | string[];
};

type OcrSpaceResponse = {
  ParsedResults?: OcrSpaceParsedResult[];
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
};

// OCR.space is inconsistent about whether ErrorMessage is a string or an array of
// strings across its error paths -- normalize both here rather than at every call site.
function ocrSpaceErrorText(message: string | string[] | undefined): string {
  if (!message) return "unknown error";
  return Array.isArray(message) ? message.join("; ") : message;
}

// Cloud OCR (not self-hosted Tesseract.js): a prior self-hosted attempt required an
// extremely fragile vendoring effort to get tesseract.js's Node worker to actually
// deploy on Vercel (Turbopack's build can't trace a worker script only ever loaded
// via a runtime path string), and even once deployed, raw Tesseract's read quality
// on real-world angled/glare plate photos was poor. OCR.space trades this app's
// prior zero-external-API stance for a commercial OCR engine that handles this
// input far more reliably.
//
// To swap OCR engines again later: this is the only function that talks to
// OCR.space. Every caller (lib/dl-ocr.ts, lib/plate-ocr.ts) only ever sees a plain
// (buffer) => Promise<string> function -- replace this body and they keep working.
export async function runOcr(buffer: Buffer): Promise<string> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) throw new Error("OCR_SPACE_API_KEY is not set");

  const body = new FormData();
  // Filename/extension matters -- OCR.space uses it (absent an explicit `filetype`
  // param) to pick its image decoder. compressImageFile always re-encodes to JPEG
  // client-side before this ever runs, so this is always accurate.
  body.set("file", new Blob([new Uint8Array(buffer)], { type: "image/jpeg" }), "capture.jpg");
  body.set("OCREngine", "2"); // default free-tier engine (25k req/month)
  body.set("detectOrientation", "true"); // auto-rotate an angled handheld photo
  body.set("scale", "true"); // upscale a small plate region in a full-frame photo

  const res = await fetch(OCR_SPACE_ENDPOINT, {
    method: "POST",
    headers: { apikey: apiKey },
    body,
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`OCR.space request failed with HTTP ${res.status}`);
  }

  const data = (await res.json()) as OcrSpaceResponse;

  // OCR.space returns HTTP 200 even on failure, signaling it via this flag instead.
  if (data.IsErroredOnProcessing) {
    throw new Error(`OCR.space failed to process image: ${ocrSpaceErrorText(data.ErrorMessage)}`);
  }

  const result = data.ParsedResults?.[0];
  if (!result || result.FileParseExitCode !== 1) {
    throw new Error(`OCR.space failed to parse image: ${ocrSpaceErrorText(result?.ErrorMessage)}`);
  }

  return result.ParsedText ?? "";
}
