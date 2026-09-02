import "server-only";
import { runOcr } from "./ocr-worker";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveAnprProvider, extractPlateViaKotai, extractPlateViaFastAlpr } from "./parking-admin/anpr";

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

// Strict full-string check for vendor-adapter output (Kotai, FastALPR, ...), which
// returns an already-segmented plate rather than free-text to parse. Vendors have
// been observed returning non-plate garbage as confidently as a real read -- a
// 45-real-photo batch test found FastALPR's default model silently drops the last
// character on ~40% of real check-in photos (e.g. "KA05JG324" for actual
// "KA05JG3244"), and Kotai's demo key has separately been caught returning a wrong
// plate outright. Unlike parsePlateFromText's OCR.space path (which scans noisy
// free text for a substring match), a vendor's output is either the whole plate or
// it's wrong -- so this validates the complete string, not a substring.
const WELL_FORMED_PLATE_RE = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/;

// Best-effort, same philosophy as dl-ocr.ts's parseExpiryFromText: plate photos vary
// wildly in angle/lighting/reflection, so this is a pre-fill suggestion for the
// operator to confirm/correct, never an auto-validated value. A no-match returns
// null and the operator just types the plate manually, same as if OCR weren't there.
export function parsePlateFromText(text: string): string | null {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9\s-]/g, " ");
  // Most modern Indian plates print a blue "IND" country stamp between the plate's
  // own two lines (see the hologram/IND mark next to the state code) -- OCR reads
  // it as literal text sitting right in the middle of the plate number and, since
  // it's a real alphabetic token (not punctuation `[^A-Z0-9\s-]` already strips),
  // it survives into both match attempts below and breaks them the same way actual
  // noise would. No legitimate plate has "IND" as part of its own text (state codes
  // are always exactly 2 letters), so it's safe to drop as a known artifact.
  const withoutCountryStamp = cleaned.replace(/\bIND\b/g, " ");
  const match =
    withoutCountryStamp.match(PLATE_RE) ??
    withoutCountryStamp.replace(/[\s-]/g, "").match(PLATE_RE_NO_SEP);
  if (!match) return null;
  const [, state, rto, series, number] = match;
  return `${state}${rto.padStart(2, "0")}${series}${number}`;
}

// Marketplace lets a super_admin assign a per-organization ANPR vendor (see
// lib/parking-admin/anpr.ts) that, when configured and enabled, takes over plate
// reading for that organization's check-ins instead of the OCR.space default --
// this is the single place that decision gets made, so neither caller (the
// Android-facing route nor the web Server Action) has to duplicate it.
export async function extractPlateNumber(
  buffer: Buffer,
  organizationId: string | null
): Promise<string | null> {
  if (organizationId) {
    const provider = await resolveAnprProvider(createServiceClient(), organizationId);
    try {
      let vendorPlate: string | null = null;
      if (provider?.adapterKey === "kotai") {
        vendorPlate = await extractPlateViaKotai(buffer, provider.apiKey, provider.endpointUrl);
      } else if (provider?.adapterKey === "fastalpr" && provider.endpointUrl) {
        vendorPlate = await extractPlateViaFastAlpr(buffer, provider.apiKey, provider.endpointUrl);
      }

      // A clean "no plate found" (null) is trusted as final -- a purpose-built ANPR
      // engine saying "nothing here" is a real answer, not a failure to route
      // around. A non-null result that isn't a well-formed plate, though, is
      // exactly the silent-garbage failure mode found in testing -- that gets
      // treated the same as a thrown error, not returned to the operator.
      if (vendorPlate === null || WELL_FORMED_PLATE_RE.test(vendorPlate)) {
        return vendorPlate;
      }
      console.error(
        `ANPR vendor "${provider?.adapterKey}" returned a malformed plate ("${vendorPlate}"), falling back to OCR.space`
      );
    } catch (err) {
      // Silent fallback by explicit product decision: an operator should still
      // get a best-effort reading rather than nothing, even if the assigned
      // vendor is temporarily broken (bad key, network issue, etc.) -- but that
      // failure must stay visible somewhere, hence the log.
      console.error("ANPR vendor call failed, falling back to OCR.space", err);
    }
  }

  const text = await runOcr(buffer);
  return parsePlateFromText(text);
}
