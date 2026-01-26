-- Create translations table for dynamic updates
CREATE TABLE IF NOT EXISTS public.translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    en_val TEXT NOT NULL,
    si_val TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read translations" ON public.translations
    FOR SELECT USING (true);

-- Allow admin write access (using service role or specific authenticated role)
CREATE POLICY "Allow authenticated update translations" ON public.translations
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert initial values for testing
INSERT INTO public.translations (key, en_val, si_val)
VALUES 
    ('common.welcome', 'Welcome', 'සාදරයෙන් පිළිගනිමු'),
    ('kiosk.title', 'Visitor Check-In', 'අමුත්තන් පැමිණීමේ ලියාපදිංචිය')
ON CONFLICT (key) DO NOTHING;
