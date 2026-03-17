-- Allow service_role (used by API with SUPABASE_SERVICE_ROLE_KEY) full access
-- Run this in Supabase SQL Editor if you get RLS errors on admin operations

CREATE POLICY "Service role all seasons" ON seasons FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role all payout_config" ON payout_config FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role all participants" ON participants FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role all matches" ON matches FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role all standings" ON standings FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
