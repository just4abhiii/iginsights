-- Run this in your Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS public.access_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    expiry_date TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    device_id TEXT,
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    login_city TEXT,
    login_country TEXT,
    login_ip TEXT
);

-- Note: No RLS policies here to keep it simple if you use the Service Role Key.
-- If you want it secure with the Anon key, more policies are needed.
