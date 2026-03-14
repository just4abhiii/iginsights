/**
 * Vercel Serverless Function: Key Management API
 * Uses Upstash Redis for secure, persistent key storage
 * 
 * Endpoints:
 * GET    /api/keys              → List all keys (admin only, needs ?admin=PASSWORD)
 * POST   /api/keys              → Create a new key (admin only)
 * DELETE /api/keys?key=XXX      → Delete a key (admin only)
 * PUT    /api/keys              → Validate & login with a key (public)
 * PATCH  /api/keys              → Revoke/reactivate a key (admin only)
 */

import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const ADMIN_PASS = process.env.ADMIN_PASS || "xbhi0000";
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store, no-cache, must-revalidate",
};

function json(res, status, data) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(status).json(data);
}

function isAdmin(req) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
        return auth.slice(7) === ADMIN_PASS;
    }
    return req.query?.admin === ADMIN_PASS;
}

// Generate a random access key
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

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
        return res.status(204).end();
    }

    try {
        // ===== GET: List all keys (admin only) =====
        if (req.method === "GET") {
            if (!isAdmin(req)) {
                return json(res, 401, { error: "Unauthorized" });
            }
            const allKeys = await redis.smembers("keys:all") || [];
            const keys = [];
            for (const k of allKeys) {
                const data = await redis.get(`key:${k}`);
                if (data) keys.push(typeof data === "string" ? JSON.parse(data) : data);
            }
            return json(res, 200, { keys, adminPass: ADMIN_PASS });
        }

        // ===== POST: Create a new key (admin only) =====
        if (req.method === "POST") {
            if (!isAdmin(req)) {
                return json(res, 401, { error: "Unauthorized" });
            }
            const { label, days } = req.body;
            const key = generateKey();
            const now = new Date();
            const expiresAt = days === 0 ? null : new Date(now.getTime() + (days || 7) * 86400000).toISOString();

            const keyData = {
                key,
                label: label || `Key (${days || 7}d)`,
                createdAt: now.toISOString(),
                expiresAt,
                active: true,
                deviceFingerprint: null,
                lastUsedAt: null,
                maxDevices: 1,
                loginCity: null,
                loginCountry: null,
                loginIP: null,
            };

            // Store key data and add to set
            await redis.set(`key:${key}`, JSON.stringify(keyData));
            await redis.sadd("keys:all", key);

            // Set auto-expiry in Redis if key has expiry
            if (expiresAt) {
                const ttlSeconds = Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 1000);
                // Add 1 day buffer so we can still show "expired" message
                await redis.expire(`key:${key}`, ttlSeconds + 86400);
            }

            return json(res, 201, { success: true, key: keyData });
        }

        // ===== PUT: Validate & login (public) =====
        if (req.method === "PUT") {
            const { accessKey, deviceFingerprint, city, country, ip } = req.body;
            if (!accessKey) {
                return json(res, 400, { error: "Access key is required" });
            }

            const normalizedKey = accessKey.trim().toUpperCase();
            const raw = await redis.get(`key:${normalizedKey}`);
            if (!raw) {
                return json(res, 404, { error: "Invalid access key. Please check your key and try again." });
            }

            const keyData = typeof raw === "string" ? JSON.parse(raw) : raw;

            if (!keyData.active) {
                return json(res, 403, { error: "This access key has been deactivated. Contact support." });
            }

            if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
                return json(res, 403, { error: "This access key has expired. Please renew your subscription." });
            }

            // Device lock check
            if (keyData.deviceFingerprint && keyData.deviceFingerprint !== deviceFingerprint) {
                return json(res, 403, {
                    error: "This key is already linked to another device. Each key can only be used on one device.",
                });
            }

            // Lock to this device on first use
            if (!keyData.deviceFingerprint && deviceFingerprint) {
                keyData.deviceFingerprint = deviceFingerprint;
            }

            // Update login info
            keyData.lastUsedAt = new Date().toISOString();
            if (city) keyData.loginCity = city;
            if (country) keyData.loginCountry = country;
            if (ip) keyData.loginIP = ip;

            // Save updated key data
            await redis.set(`key:${normalizedKey}`, JSON.stringify(keyData));

            return json(res, 200, { success: true, key: keyData });
        }

        // ===== DELETE: Delete a key (admin only) =====
        if (req.method === "DELETE") {
            if (!isAdmin(req)) {
                return json(res, 401, { error: "Unauthorized" });
            }
            const keyToDelete = req.query?.key;
            if (!keyToDelete) {
                return json(res, 400, { error: "Key parameter required" });
            }
            await redis.del(`key:${keyToDelete}`);
            await redis.srem("keys:all", keyToDelete);
            return json(res, 200, { success: true, deleted: keyToDelete });
        }

        // ===== PATCH: Revoke/reactivate/reset device (admin only) =====
        if (req.method === "PATCH") {
            if (!isAdmin(req)) {
                return json(res, 401, { error: "Unauthorized" });
            }
            const { key: targetKey, active, resetDevice } = req.body;
            const raw = await redis.get(`key:${targetKey}`);
            if (!raw) {
                return json(res, 404, { error: "Key not found" });
            }
            const keyData = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (typeof active === "boolean") keyData.active = active;
            if (resetDevice) keyData.deviceFingerprint = null;
            await redis.set(`key:${targetKey}`, JSON.stringify(keyData));
            return json(res, 200, { success: true, key: keyData });
        }

        return json(res, 405, { error: "Method not allowed" });
    } catch (err) {
        console.error("[API/keys] Error:", err);
        return json(res, 500, { error: "Internal server error" });
    }
}
