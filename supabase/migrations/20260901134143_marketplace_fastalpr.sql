-- Adds fast-alpr (github.com/ankandrew/fast-alpr, MIT) as a Marketplace ANPR entry --
-- unlike Kotai/Circuit Digest/CarmenCloud, this isn't a third-party vendor with a quota:
-- it's a small self-hosted service (see /alpr-service at the repo root) this deployment
-- controls, so there's no external account to run out of free calls. endpoint_url and
-- api_key stay null here -- filled in via the Marketplace UI once the service is deployed
-- and its shared secret is known, same as every other vendor key (never committed here).
insert into public.marketplace_apps (category_id, name, vendor, description, adapter_key) values
  (
    (select id from public.marketplace_categories where key = 'anpr'),
    'FastALPR (self-hosted)',
    'Open source / self-hosted',
    'Self-hosted fast-alpr (ONNX plate detector + OCR), no vendor quota. Verified against real Indian plate photos to read both a two-line plate with the "IND" country stamp and a weathered plate that a paid vendor misread. Endpoint is this deployment''s own alpr-service URL, not a third party''s.',
    'fastalpr'
  );
