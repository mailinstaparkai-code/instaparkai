-- Wires Marketplace's ANPR catalog into the actual check-in plate-scan flow.
-- adapter_key names which vendor-specific code path (if any) knows how to call this
-- app's API -- null means catalog-only, no working integration (e.g. Circuit
-- Digest, whose API docs were never supplied). Only an app with both a non-null
-- adapter_key AND a configured api_key is ever actually selected at runtime;
-- everything else falls back to the existing OCR.space default in lib/plate-ocr.ts.
alter table public.marketplace_apps add column adapter_key text;

update public.marketplace_apps set adapter_key = 'kotai' where name = 'ANPR Plate Reader';
