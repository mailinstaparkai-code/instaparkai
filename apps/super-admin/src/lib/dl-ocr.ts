import "server-only";
import { createWorker, OEM } from "tesseract.js";
import path from "node:path";

// Bundled locally (apps/super-admin/ocr-data/eng.traineddata) so this never depends
// on tesseract.js's default jsdelivr CDN fetch at request time -- see CLAUDE.md's
// note on this app having zero external-API dependencies at the infra layer today.
const LANG_PATH = path.join(process.cwd(), "ocr-data");

// Anchored to the end ($) so the label must sit immediately before the date (only
// a colon/dash/space between) -- an unanchored match against a wider window false
// -positived on "DOE" inside an unrelated name like "JOHN DOE" during testing.
const EXPIRY_LABEL_RE = /(valid\s*(till|upto|up\s*to)|validity|doe|expiry)\s*[:\-]?\s*$/i;
const LABEL_LOOKBACK = 20;
// DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY, the format Indian DL cards print dates in.
const DATE_RE = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/g;

function toIsoDate(day: string, month: string, year: string): string | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  if (y < 1990 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// DL expiry is best-effort: the surrounding text is prone to OCR noise across the
// many state-specific DL layouts, so this is a pre-fill suggestion for the admin
// to confirm/correct, never an auto-validated value.
export function parseExpiryFromText(text: string): string | null {
  const dates: { iso: string; index: number }[] = [];
  for (const match of text.matchAll(DATE_RE)) {
    const iso = toIsoDate(match[1], match[2], match[3]);
    if (iso) dates.push({ iso, index: match.index ?? 0 });
  }
  if (!dates.length) return null;

  for (const { iso, index } of dates) {
    const before = text.slice(Math.max(0, index - LABEL_LOOKBACK), index);
    if (EXPIRY_LABEL_RE.test(before)) return iso;
  }

  // No labeled match -- fall back to the furthest-future date on the card, since
  // expiry is always later than DOB/DOI.
  return dates.map((d) => d.iso).sort().at(-1) ?? null;
}

export async function extractDlExpiryDate(buffer: Buffer): Promise<string | null> {
  const worker = await createWorker("eng", OEM.LSTM_ONLY, { langPath: LANG_PATH, gzip: false });
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return parseExpiryFromText(text);
  } finally {
    await worker.terminate();
  }
}
