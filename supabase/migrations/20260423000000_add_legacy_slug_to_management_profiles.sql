ALTER TABLE management_profiles
ADD COLUMN IF NOT EXISTS legacy_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_management_profiles_legacy_slug_unique
ON management_profiles (legacy_slug)
WHERE legacy_slug IS NOT NULL AND legacy_slug <> '';
