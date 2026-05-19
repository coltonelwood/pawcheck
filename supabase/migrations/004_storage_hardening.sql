-- =====================================================
-- Migration 004: Storage hardening
-- =====================================================
-- The initial migrations created public buckets without
-- file size or MIME type restrictions. A bad actor could
-- upload 5GB binaries. This sets sensible limits.
-- =====================================================

-- Pet photos: 10 MB max, images only
update storage.buckets
set
  file_size_limit = 10485760,  -- 10 MB
  allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'pet-photos';

-- Community photos: 10 MB max, images only
update storage.buckets
set
  file_size_limit = 10485760,  -- 10 MB
  allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'community-photos';
