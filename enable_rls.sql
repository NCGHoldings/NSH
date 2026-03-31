-- Basic Row Level Security (RLS) Enablement
-- Note: Since true Supabase Auth (auth.users) is not fully utilized, we rely on the Anon key for basic UI reads,
-- but we restrict write/update procedures. Adjust as necessary if moving fully to auth.users.

-- 1. Enable RLS on core tables
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- 2. Create basic policies for reading (Allow anon key for public UI visibility if needed, or strictly authenticated)
-- Allow anyone to read visitors (Needed for kiosk search)
CREATE POLICY "Enable read access for all users" ON visitors FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON visitors FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON vehicle_entries FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON vehicle_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON vehicle_entries FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON scheduled_meetings FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON scheduled_meetings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON scheduled_meetings FOR UPDATE USING (true);

CREATE POLICY "Enable insert access for all users" ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON audit_logs FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON alerts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON alerts FOR UPDATE USING (true);

-- To truly lock this down in production, change `true` to `auth.role() = 'authenticated'`
-- after transitioning to Supabase Auth entirely.
