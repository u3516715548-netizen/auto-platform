-- Etapa 7A — Supabase Storage bucket + policies (run in Supabase SQL editor or CLI).
-- Not a Drizzle migration. Bucket name must match NEXT_PUBLIC_MEDIA_BUCKET (default: vehicle-media).
--
-- Object path (inside bucket): {tenant_id}/{vehicle_id}/{media_id}.{ext}
-- Paths are minted server-side only after membership + vehicle checks.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-media',
  'vehicle-media',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Authenticated staff: read/write/delete only under their tenant prefix when JWT sub matches
-- a profile with membership on that tenant. Uses first path segment as tenant_id UUID.
CREATE POLICY vehicle_media_storage_staff_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vehicle-media'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT m.tenant_id FROM public.memberships m
      WHERE m.profile_id = auth.uid()::uuid
    )
  );

CREATE POLICY vehicle_media_storage_staff_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-media'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT m.tenant_id FROM public.memberships m
      WHERE m.profile_id = auth.uid()::uuid
        AND m.role IN ('owner', 'manager', 'sales')
    )
  );

CREATE POLICY vehicle_media_storage_staff_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'vehicle-media'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT m.tenant_id FROM public.memberships m
      WHERE m.profile_id = auth.uid()::uuid
        AND m.role IN ('owner', 'manager', 'sales')
    )
  );

CREATE POLICY vehicle_media_storage_staff_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'vehicle-media'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT m.tenant_id FROM public.memberships m
      WHERE m.profile_id = auth.uid()::uuid
        AND m.role IN ('owner', 'manager', 'sales')
    )
  );
