-- Add explicit `source` column to classify profiles in the admin dashboard:
--   'new'      = profile created via the admin UI / featured leadership
--   'imported' = profile imported from the legacy OutSystems CSV
--
-- legacy_slug is kept solely for the QR-code redirect logic and is no
-- longer used to determine the New vs Old tab.
ALTER TABLE management_profiles
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'imported';

-- Backfill: anything that is NOT one of the featured leadership profiles
-- and was created from the CSV import is marked imported. The featured
-- leadership profiles (created in admin UI) are marked 'new'.
UPDATE management_profiles
SET source = 'new'
WHERE slug IN (
  'kai-zheng',
  'mira-wu',
  'cannon-wang',
  'jonathan-stretton',
  'nagaraj-ponnada',
  'rejeesh-raveendran',
  'waseem-khalayleh'
);

-- Imported-duplicate profiles created from the CSV (e.g. kai-zheng-imported)
-- belong in the Old / Imported tab.
UPDATE management_profiles
SET source = 'imported'
WHERE slug LIKE '%-imported';

CREATE INDEX IF NOT EXISTS idx_management_profiles_source
  ON management_profiles (source);
