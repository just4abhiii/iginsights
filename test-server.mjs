// Local test server for API endpoints
// Run with: node test-server.mjs
import { createServer } from 'http';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load both .env and .env.local (later one wins on conflicts)
config({ path: '.env' });
config({ path: '.env.local' });

// ── Supabase setup ──
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ── Key gen util ──
function generateKey() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const segs = [];
    for (let s = 0; s < 4; s++) {
        let seg = "";
        for (let i = 0; i < 4; i++) seg += chars[Math.floor(Math.random() * chars.length)];
        segs.push(seg);
    }
    return segs.join("-");
}

const server = createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.writeHead(204).end();

    const url = new URL(req.url, `http://localhost:3001`);
    const path = url.pathname;

    const json = (status, data) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    let body = '';
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        body = await new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => r(d)); });
    }
    let reqBody = {};
    try { reqBody = body ? JSON.parse(body) : {}; } catch { }

    try {
        // ── /api/check-key-status  (used by KeyGuard + validateAndLogin) ──
        if (path === '/api/check-key-status') {
            if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

            const { key, deviceFingerprint } = reqBody;
            if (!key || !deviceFingerprint) {
                return json(400, { error: 'Key and device fingerprint required', valid: false });
            }

            if (!supabase) {
                console.warn('⚠️  Supabase not configured – auto-approving key check (dev mode)');
                return json(200, { valid: true });
            }

            // Lookup key in Supabase
            const { data: keyData, error: findError } = await supabase
                .from('access_keys')
                .select('*')
                .eq('key', key)
                .single();

            if (findError || !keyData) {
                console.log(`❌ Key not found: ${key}`);
                return json(404, { error: 'Invalid key', valid: false });
            }

            if (keyData.status !== 'active') {
                return json(403, { error: `Key is ${keyData.status}`, valid: false });
            }

            if (keyData.expiry_date && new Date(keyData.expiry_date) < new Date()) {
                await supabase.from('access_keys').update({ status: 'expired' }).eq('id', keyData.id);
                return json(403, { error: 'Key expired', valid: false });
            }

            // Device lock
            if (!keyData.device_id) {
                await supabase.from('access_keys').update({ device_id: deviceFingerprint }).eq('id', keyData.id);
                console.log(`🔐 Device locked for key: ${key}`);
            } else if (keyData.device_id !== deviceFingerprint) {
                return json(403, { error: 'Key is locked to another device', valid: false });
            }

            console.log(`✅ Key valid: ${key}`);
            return json(200, { valid: true });
        }

        // ── /api/bot  (Telegram bot webhook, proxied locally) ──
        if (path === '/api/bot') {
            if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
            // Forward to bot handler logic inline
            return json(200, { ok: true, note: 'Bot webhook received locally (no-op)' });
        }

        // ── /api/keys  (Admin key management) ──
        if (path.startsWith('/api/keys')) {
            const ADMIN_PASS = "xbhi0000";
            const isAdmin = () => {
                const auth = req.headers.authorization;
                if (auth?.startsWith('Bearer ')) return auth.slice(7) === ADMIN_PASS;
                return url.searchParams.get('admin') === ADMIN_PASS;
            };

            if (!supabase) return json(500, { error: 'Supabase not configured' });

            if (req.method === 'GET') {
                if (!isAdmin()) return json(401, { error: 'Unauthorized' });
                const { data, error } = await supabase.from('access_keys').select('*').order('created_at', { ascending: false });
                if (error) return json(500, { error: error.message });
                return json(200, { keys: data, adminPass: ADMIN_PASS });
            }

            if (req.method === 'POST') {
                if (!isAdmin()) return json(401, { error: 'Unauthorized' });
                const { label, days } = reqBody;
                const newKey = generateKey();
                const now = new Date();
                const expiryDate = days === 0 ? null : new Date(now.getTime() + (days || 7) * 86400000).toISOString();
                const { data, error } = await supabase.from('access_keys').insert([{
                    key: newKey,
                    expiry_date: expiryDate,
                    status: 'active',
                    label: label || `Key (${days || 7}d)`,
                    created_at: now.toISOString(),
                }]).select().single();
                if (error) return json(500, { error: error.message });
                console.log(`✅ Created key: ${newKey} (${label}, ${days}d)`);
                return json(201, { success: true, key: data });
            }

            if (req.method === 'DELETE') {
                if (!isAdmin()) return json(401, { error: 'Unauthorized' });
                const k = url.searchParams.get('key');
                if (!k) return json(400, { error: 'Key required' });
                const { error } = await supabase.from('access_keys').delete().eq('key', k);
                if (error) return json(500, { error: error.message });
                console.log(`🗑️ Deleted: ${k}`);
                return json(200, { success: true, deleted: k });
            }

            if (req.method === 'PATCH') {
                if (!isAdmin()) return json(401, { error: 'Unauthorized' });
                const { key: tk, active, status } = reqBody;
                const newStatus = active === false ? 'revoked' : (status || 'active');
                const { data, error } = await supabase.from('access_keys').update({ status: newStatus }).eq('key', tk).select().single();
                if (error) return json(500, { error: error.message });
                return json(200, { success: true, key: data });
            }

            return json(405, { error: 'Method not allowed' });
        }

        return json(404, { error: 'Not found' });

    } catch (err) {
        console.error('Error:', err);
        json(500, { error: 'Server error: ' + err.message });
    }
});

server.listen(3001, () => {
    console.log('🚀 API server running at http://localhost:3001');
    if (supabase) {
        console.log(`🗄️  Supabase connected: ${SUPABASE_URL}`);
    } else {
        console.warn('⚠️  Supabase NOT configured. Key checks will auto-approve in dev mode.');
    }
});
