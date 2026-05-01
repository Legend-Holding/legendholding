ALTER TABLE management_profiles
ADD COLUMN IF NOT EXISTS telephone TEXT DEFAULT '';
