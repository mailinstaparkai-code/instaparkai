-- Public bucket for signed Android release APKs -- unlike valet-photos (private,
-- read via short-lived signed URLs), a release download link must stay valid
-- indefinitely and be openable directly by the OS browser/download manager with no
-- auth header, so this bucket is public. Uploads happen out-of-band as part of the
-- release-cutting checklist (apps/valet-operator-android/README.md), not through
-- app code, so no storage.objects policies are needed here.
insert into storage.buckets (id, name, public)
values ('app-releases', 'app-releases', true)
on conflict (id) do nothing;
