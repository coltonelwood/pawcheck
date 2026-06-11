-- =====================================================
-- Migration 008: Make pet-photos private (signed-URL access)
-- =====================================================
-- Pet/assessment photos are health-context images and were world-readable via
-- a public bucket. Flip the bucket to private and restrict SELECT to the owner
-- (folder = {auth.uid()}). Images are now served via short-lived signed URLs
-- generated server-side (analyze) or by the owning client (display), both of
-- which satisfy this owner-scoped policy. The service role bypasses RLS so the
-- assessment pipeline can sign any path it needs to fetch.
--
-- community-photos intentionally remains public (social feed).
-- =====================================================

update storage.buckets set public = false where id = 'pet-photos';

drop policy if exists "Anyone can view pet photos" on storage.objects;

create policy "Users can view own pet photos"
  on storage.objects for select
  using (
    bucket_id = 'pet-photos'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );
