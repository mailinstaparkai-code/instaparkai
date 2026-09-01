import "server-only";
import { runOcr } from "./ocr-worker";

// Standard Indian plate format: 2-letter state code, 1-2 digit RTO code, 1-3 letter
// series, 4-digit number (e.g. "KA01AB1234"). Tolerant of spaces/hyphens the OCR
// commonly introduces between groups.
const PLATE_RE = /\b([A-Z]{2})[\s-]?(\d{1,2})[\s-]?([A-Z]{1,3})[\s-]?(\d{4})\b/;
// Fallback for a line break (or OCR word-segmentation) landing *inside* one of the
// four groups rather than between them -- e.g. a two-line plate like "KA05L" /
// "Z9387" (real plate KA05LZ9387) splits mid-series. Group boundaries there are
// only recoverable from the fixed character-class lengths, not separator
// positions, so this matches against a copy of the text with every
// whitespace/hyphen character removed.
const PLATE_RE_NO_SEP = /([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})/;

// Best-effort, same philosophy as dl-ocr.ts's parseExpiryFromText: plate photos vary
// wildly in angle/lighting/reflection, so this is a pre-fill suggestion for the
// operator to confirm/correct, never an auto-validated value. A no-match returns
// null and the operator just types the plate manually, same as if OCR weren't there.
export function parsePlateFromText(text: string): string | null {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9\s-]/g, " ");
  const match = cleaned.match(PLATE_RE) ?? cleaned.replace(/[\s-]/g, "").match(PLATE_RE_NO_SEP);
  if (!match) return null;
  const [, state, rto, series, number] = match;
  return `${state}${rto.padStart(2, "0")}${series}${number}`;
}

export async function extractPlateNumber(buffer: Buffer): Promise<string | null> {
  const text = await runOcr(buffer);
  return parsePlateFromText(text);
}
