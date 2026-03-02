// Local test server for API endpoints
// Run with: node test-server.mjs
import { createServer } from 'http';
import { Redis } from '@upstash/redis';
import { config } from 'dotenv';

// Load .env.local
config({ path: '.env.local' });

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const ADMIN_PASS = "xbhi0000";

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
    if (!url.pathname.startsWith('/api/keys')) {
        return res.writeHead(404).end(JSON.stringify({ error: 'Not found' }));
    }

    const json = (status, data) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    const isAdmin = () => {
        const auth = req.headers.authorization;
        if (auth?.startsWith('Bearer ')) return auth.slice(7) === ADMIN_PASS;
        return url.searchParams.get('admin') === ADMIN_PASS;
    };

    let body = '';
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        body = await new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => r(d)); });
    }
    const reqBody = body ? JSON.parse(body) : {};

    try {
        if (req.method === 'GET') {
            if (!isAdmin()) return json(401, { error: 'Unauthorized' });
            const allKeys = await redis.smembers('keys:all') || [];
            const keys = [];
            for (const k of allKeys) {
                const data = await redis.get(`key:${k}`);
                if (data) keys.push(typeof data === 'string' ? JSON.parse(data) : data);
            }
            return json(200, { keys, adminPass: ADMIN_PASS });
        }

        if (req.method === 'POST') {
            if (!isAdmin()) return json(401, { error: 'Unauthorized' });
            const { label, days } = reqBody;
            const key = generateKey();
            const now = new Date();
            const expiresAt = days === 0 ? null : new Date(now.getTime() + (days || 7) * 86400000).toISOString();
            const keyData = {
                key, label: label || `Key (${days || 7}d)`, createdAt: now.toISOString(),
                expiresAt, active: true, deviceFingerprint: null, lastUsedAt: null,
                maxDevices: 1, loginCity: null, loginCountry: null, loginIP: null,
            };
            await redis.set(`key:${key}`, JSON.stringify(keyData));
            await redis.sadd('keys:all', key);
            if (expiresAt) {
                const ttl = Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 1000) + 86400;
                await redis.expire(`key:${key}`, ttl);
            }
            console.log(`✅ Created key: ${key} (${label}, ${days}d)`);
            return json(201, { success: true, key: keyData });
        }

        if (req.method === 'PUT') {
            const { accessKey, deviceFingerprint, city, country, ip } = reqBody;
            if (!accessKey) return json(400, { error: 'Access key required' });
            const normalizedKey = accessKey.trim().toUpperCase();
            const raw = await redis.get(`key:${normalizedKey}`);
            if (!raw) return json(404, { error: 'Invalid access key. Please check your key and try again.' });
            const keyData = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!keyData.active) return json(403, { error: 'Key deactivated. Contact support.' });
            if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) return json(403, { error: 'Key expired.' });
            if (keyData.deviceFingerprint && keyData.deviceFingerprint !== deviceFingerprint)
                return json(403, { error: 'Key linked to another device.' });
            if (!keyData.deviceFingerprint && deviceFingerprint) keyData.deviceFingerprint = deviceFingerprint;
            keyData.lastUsedAt = new Date().toISOString();
            if (city) keyData.loginCity = city;
            if (country) keyData.loginCountry = country;
            if (ip) keyData.loginIP = ip;
            await redis.set(`key:${normalizedKey}`, JSON.stringify(keyData));
            console.log(`🔐 Login: ${normalizedKey} from ${city}, ${country}`);
            return json(200, { success: true, key: keyData });
        }

        if (req.method === 'DELETE') {
            if (!isAdmin()) return json(401, { error: 'Unauthorized' });
            const k = url.searchParams.get('key');
            if (!k) return json(400, { error: 'Key required' });
            await redis.del(`key:${k}`);
            await redis.srem('keys:all', k);
            console.log(`🗑️ Deleted: ${k}`);
            return json(200, { success: true, deleted: k });
        }

        if (req.method === 'PATCH') {
            if (!isAdmin()) return json(401, { error: 'Unauthorized' });
            const { key: tk, active } = reqBody;
            const raw = await redis.get(`key:${tk}`);
            if (!raw) return json(404, { error: 'Key not found' });
            const kd = typeof raw === 'string' ? JSON.parse(raw) : raw;
            kd.active = active;
            await redis.set(`key:${tk}`, JSON.stringify(kd));
            return json(200, { success: true, key: kd });
        }

        json(405, { error: 'Method not allowed' });
    } catch (err) {
        console.error('Error:', err);
        json(500, { error: 'Server error' });
    }
});

server.listen(3001, () => console.log('🚀 API server running at http://localhost:3001'));
