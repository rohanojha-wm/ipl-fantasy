-- When standings are saved (admin), we stamp this for /matches sort order
ALTER TABLE matches ADD COLUMN IF NOT EXISTS standings_updated_at TIMESTAMPTZ;

-- Approximate last-updated for existing rows that already have standings
UPDATE matches m
SET standings_updated_at = m.created_at
WHERE standings_updated_at IS NULL
  AND EXISTS (SELECT 1 FROM standings s WHERE s.match_id = m.id);
