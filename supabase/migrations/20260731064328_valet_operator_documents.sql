-- Valet operator documents: Driving License, Aadhar, optional Police Verification.
-- DL expiry is OCR-extracted at upload time (Tesseract.js, see src/lib/dl-ocr.ts)
-- and admin-editable; storage paths point into the existing private
-- `valet-photos` bucket (deny-all RLS, service-role-only -- same pattern as
-- photo_path already on this table).
alter table public.valet_accounts
  add column driving_license_path text,
  add column driving_license_expiry date,
  add column aadhar_path text,
  add column police_verification_path text;
