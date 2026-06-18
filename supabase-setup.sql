-- Supabase Table Setup needed for this application
-- Run this in your Supabase SQL Editor

-- 1. Create registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
  cpf TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at BIGINT DEFAULT extract(epoch from now()) * 1000,
  updated_at BIGINT DEFAULT extract(epoch from now()) * 1000
);

-- 2. Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  headers JSONB,
  cpf_column_name TEXT,
  updated_at BIGINT DEFAULT extract(epoch from now()) * 1000
);

-- 3. Enable real-time for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;

-- 4. Set row level security (RLS) policies 
--    (Optional: disable RLS or open them publicly as per the requested behavior)
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for registrations"
  ON public.registrations FOR SELECT USING (true);

CREATE POLICY "Allow public write access for registrations"
  ON public.registrations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access for app_settings"
  ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Allow public write access for app_settings"
  ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
