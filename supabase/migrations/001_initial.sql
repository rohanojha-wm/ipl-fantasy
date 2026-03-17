-- IPL Fantasy App - Initial Schema
-- Run this in Supabase SQL Editor

-- Seasons (e.g., IPL 2025, IPL 2026)
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payout config per season (direct $ per position per phase)
CREATE TABLE payout_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('round_robin', 'knockout', 'final')),
  position_1st DECIMAL(10,2) NOT NULL DEFAULT 0,
  position_2nd DECIMAL(10,2) NOT NULL DEFAULT 0,
  position_3rd DECIMAL(10,2) NOT NULL DEFAULT 0,
  position_4th DECIMAL(10,2) NOT NULL DEFAULT 0,
  position_5th DECIMAL(10,2) NOT NULL DEFAULT 0,
  UNIQUE(season_id, phase)
);

-- Participants (configurable)
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT,
  dream11_team_name TEXT,
  payment_zelle TEXT,
  payment_cashapp TEXT,
  payment_venmo TEXT,
  buy_in_amount DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  match_date DATE NOT NULL,
  match_time TEXT,
  team1 TEXT NOT NULL,
  team2 TEXT NOT NULL,
  venue TEXT,
  match_type TEXT NOT NULL CHECK (match_type IN ('round_robin', 'qualifier1', 'qualifier2', 'eliminator', 'final')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Standings: top 5 per match (supports ties via multiple rows same position)
CREATE TABLE standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  position INT NOT NULL CHECK (position BETWEEN 1 AND 5),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  dollars_earned DECIMAL(10,2),
  UNIQUE(match_id, position, participant_id)
);

-- Indexes
CREATE INDEX idx_matches_season_date ON matches(season_id, match_date);
CREATE INDEX idx_standings_match ON standings(match_id);
CREATE INDEX idx_participants_season ON participants(season_id);

-- Row Level Security: allow public read on all tables
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read seasons" ON seasons FOR SELECT USING (true);
CREATE POLICY "Public read payout_config" ON payout_config FOR SELECT USING (true);
CREATE POLICY "Public read participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read standings" ON standings FOR SELECT USING (true);

-- Service role bypasses RLS for admin writes (used from API routes)
