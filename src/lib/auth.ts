/**
 * Authentication & License Key System
 * Uses JSONBlob.com for centralized key storage (no Supabase needed).
 * Keys are stored in a single JSON blob accessible via REST API.
 * This way keys work across ALL devices.
 */

// API proxy endpoint (Vercel serverless function proxies to JSONBlob)
const BLOB_URL = "/api/keys";

// Generate a unique device fingerprint based on browser properties
export function getDeviceFingerprint(): string {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillText("fingerprint", 2, 2);
    }
    const canvasHash = canvas.toDataURL().slice(-50);

    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + "x" + screen.height,
        screen.colorDepth.toString(),
        new Date().getTimezoneOffset().toString(),
        navigator.hardwareConcurrency?.toString() || "0",
        (navigator as any).deviceMemory?.toString() || "0",
        navigator.platform || "",
        canvasHash,
    ];

    let hash = 0;
    const str = components.join("|");
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return "DX-" + Math.abs(hash).toString(36).toUpperCase().padStart(8, "0");
}

// Generate a random access key
export function generateAccessKey(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const segments = [];
    for (let s = 0; s < 4; s++) {
        let seg = "";
        for (let i = 0; i < 4; i++) {
            seg += chars[Math.floor(Math.random() * chars.length)];
        }
        segments.push(seg);
    }
    return segments.join("-");
}

export interface LicenseKey {
    key: string;
    label: string;
    createdAt: string;
    expiresAt: string | null;
    active: boolean;
    deviceFingerprint: string | null;
    loginCity: string | null;
    loginCountry: string | null;
    loginIP: string | null;
    lastUsedAt: string | null;
    maxDevices: number;
}

interface BlobData {
    keys: LicenseKey[];
    adminPass: string;
    youtubeUrl?: string;
}

const AUTH_STORAGE_KEY = "darksidex_auth_session";
const HARDCODED_ADMIN_PASS = "xbhi0000";

// Fetch user location from IP
async function fetchLocation(): Promise<{ city: string; country: string; ip: string }> {
    try {
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        return { city: data.city || "Unknown", country: data.country_name || "Unknown", ip: data.ip || "" };
    } catch {
        try {
            const res2 = await fetch("https://ip-api.com/json/?fields=city,country,query");
            const data2 = await res2.json();
            return { city: data2.city || "Unknown", country: data2.country || "Unknown", ip: data2.query || "" };
        } catch {
            return { city: "Unknown", country: "Unknown", ip: "" };
        }
    }
}

// ==================== JSONBLOB STORAGE ====================

// Simple write lock to prevent concurrent read-modify-write race conditions
let writeLock = false;
async function waitForLock(): Promise<void> {
    while (writeLock) {
        await new Promise(r => setTimeout(r, 100));
    }
}

async function readBlob(): Promise<BlobData> {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetch(BLOB_URL + `?_t=${Date.now()}`, {
                headers: { "Accept": "application/json", "Cache-Control": "no-cache" },
            });
            if (!res.ok) {
                console.error(`[Auth] Read blob HTTP ${res.status} (attempt ${attempt}/${maxRetries})`);
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 500 * attempt));
                    continue;
                }
                throw new Error(`[Auth] Read blob failed after ${maxRetries} retries (HTTP ${res.status})`);
            }
            const data = await res.json();
            // Safety: ensure keys array always exists
            if (!data.keys) data.keys = [];
            if (!data.adminPass) data.adminPass = HARDCODED_ADMIN_PASS;
            return data;
        } catch (err) {
            console.error(`[Auth] Read blob error (attempt ${attempt}/${maxRetries}):`, err);
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 500 * attempt));
                continue;
            }
            throw err;
        }
    }
    throw new Error("[Auth] Read blob failed unexpectedly");
}

// Safe version for read-only operations — returns defaults on failure instead of throwing
async function readBlobSafe(): Promise<BlobData> {
    try {
        return await readBlob();
    } catch {
        return { keys: [], adminPass: HARDCODED_ADMIN_PASS };
    }
}

async function writeBlob(data: BlobData): Promise<boolean> {
    await waitForLock();
    // Ensure keys array always exists before writing
    if (!data.keys) data.keys = [];
    if (!data.adminPass) data.adminPass = HARDCODED_ADMIN_PASS;
    const maxRetries = 3;
    try {
        writeLock = true;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const res = await fetch(BLOB_URL, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify(data),
                });
                // Safety guard blocked the write (race condition detected)
                if (res.status === 409) {
                    console.error("[Auth] Write BLOCKED by safety guard — race condition detected. Aborting.");
                    return false;
                }
                if (!res.ok) {
                    console.error(`[Auth] Write blob HTTP ${res.status} (attempt ${attempt}/${maxRetries})`);
                    if (attempt < maxRetries) {
                        await new Promise(r => setTimeout(r, 500 * attempt));
                        continue;
                    }
                    return false;
                }
                // Small delay to let JSONBlob persist
                await new Promise(r => setTimeout(r, 400));
                return true;
            } catch (err) {
                console.error(`[Auth] Write blob error (attempt ${attempt}/${maxRetries}):`, err);
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 500 * attempt));
                    continue;
                }
                return false;
            }
        }
        return false;
    } finally {
        writeLock = false;
    }
}

// ==================== PUBLIC API ====================

// --- Admin Password ---
export function getAdminPassword(): string {
    // For display in admin panel
    return HARDCODED_ADMIN_PASS;
}

export async function getAdminPasswordAsync(): Promise<string> {
    const blob = await readBlobSafe();
    return blob.adminPass || HARDCODED_ADMIN_PASS;
}

export async function setAdminPassword(pass: string) {
    const blob = await readBlob();
    blob.adminPass = pass;
    await writeBlob(blob);
}

// --- YouTube URL Management ---
const DEFAULT_YT_URL = "https://www.youtube.com/embed/pYfpNRmoRC0?rel=0&modestbranding=1&showinfo=0";

export async function getYoutubeUrl(): Promise<string> {
    const blob = await readBlobSafe();
    return blob.youtubeUrl || DEFAULT_YT_URL;
}

export async function setYoutubeUrl(url: string) {
    const blob = await readBlob();
    // Convert watch URL to embed URL
    let embedUrl = url;
    if (url.includes("youtube.com/watch")) {
        const videoId = new URL(url).searchParams.get("v");
        if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0`;
    } else if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1]?.split("?")[0];
        if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0`;
    } else if (url.includes("youtube.com/live/")) {
        const videoId = url.split("youtube.com/live/")[1]?.split("?")[0];
        if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0`;
    }
    blob.youtubeUrl = embedUrl;
    await writeBlob(blob);
}

export async function verifyAdminAsync(pass: string): Promise<boolean> {
    const blob = await readBlobSafe();
    return pass === (blob.adminPass || HARDCODED_ADMIN_PASS);
}

// Sync version for quick checks (uses hardcoded)
export function verifyAdmin(pass: string): boolean {
    return pass === HARDCODED_ADMIN_PASS;
}

// --- License Keys (async, via JSONBlob) ---
export async function getAllKeys(): Promise<LicenseKey[]> {
    const blob = await readBlobSafe();
    return blob.keys || [];
}

export async function createKey(label: string, expiresInDays?: number): Promise<LicenseKey> {
    const blob = await readBlob();
    const now = new Date();
    const newKey: LicenseKey = {
        key: generateAccessKey(),
        label,
        createdAt: now.toISOString(),
        expiresAt: expiresInDays ? new Date(now.getTime() + expiresInDays * 86400000).toISOString() : null,
        active: true,
        deviceFingerprint: null,
        lastUsedAt: null,
        maxDevices: 1,
        loginCity: null,
        loginCountry: null,
        loginIP: null,
    };
    blob.keys.push(newKey);
    const success = await writeBlob(blob);
    if (!success) {
        throw new Error("Failed to save key — write to server failed");
    }
    return newKey;
}

export async function revokeKey(key: string) {
    const blob = await readBlob();
    const keyData = blob.keys.find((k) => k.key === key);
    if (keyData) {
        keyData.active = false;
        await writeBlob(blob);
    }
}

export async function reactivateKey(key: string) {
    const blob = await readBlob();
    const keyData = blob.keys.find((k) => k.key === key);
    if (keyData) {
        keyData.active = true;
        keyData.deviceFingerprint = null;
        await writeBlob(blob);
    }
}

export async function deleteKey(key: string): Promise<boolean> {
    const blob = await readBlob();
    const originalCount = blob.keys.length;
    blob.keys = blob.keys.filter((k) => k.key !== key);
    if (blob.keys.length === originalCount) {
        console.warn(`[Auth] deleteKey: key ${key} not found in blob`);
        return false;
    }
    const success = await writeBlob(blob);
    if (!success) {
        console.error(`[Auth] deleteKey: failed to write blob after deleting key ${key}`);
        return false;
    }
    return true;
}

export async function resetDeviceLock(key: string) {
    const blob = await readBlob();
    const keyData = blob.keys.find((k) => k.key === key);
    if (keyData) {
        keyData.deviceFingerprint = null;
        await writeBlob(blob);
    }
}

// --- Auth Session ---
export interface AuthSession {
    key: string;
    deviceFingerprint: string;
    loginAt: string;
}

export function getAuthSession(): AuthSession | null {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveAuthSession(session: AuthSession) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
}

// --- Telegram Alert ---
async function sendTelegramAlert(keyData: LicenseKey, deviceFP: string) {
    try {
        const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        const text = [
            "🔐 New Login Alert!",
            "━━━━━━━━━━━━━━━━",
            `🏷 User: ${keyData.label}`,
            `🔑 Key: ${keyData.key}`,
            `📍 Location: ${keyData.loginCity || "Unknown"}, ${keyData.loginCountry || "Unknown"}`,
            `🌐 IP: ${keyData.loginIP || "Unknown"}`,
            `📱 Device: ${deviceFP}`,
            `🕐 Time: ${now}`,
            "━━━━━━━━━━━━━━━━",
            "Powered by DarkSideX 🚀",
        ].join("\n");
        // Fire and forget — don't await
        fetch("/api/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        }).catch(() => { });
    } catch {
        // Telegram alert is non-critical
    }
}

// --- Login Validation ---
export type LoginResult =
    | { success: true }
    | { success: false; error: string };

export async function validateAndLogin(accessKey: string): Promise<LoginResult> {
    const blob = await readBlob();
    const normalizedKey = accessKey.toUpperCase().trim();
    const keyData = blob.keys.find((k) => k.key === normalizedKey);

    if (!keyData) {
        return { success: false, error: "Invalid access key. Please check your key and try again." };
    }

    if (!keyData.active) {
        return { success: false, error: "This access key has been deactivated. Contact support." };
    }

    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
        return { success: false, error: "This access key has expired. Please renew your subscription." };
    }

    const deviceFP = getDeviceFingerprint();

    // Check device lock
    if (keyData.deviceFingerprint && keyData.deviceFingerprint !== deviceFP) {
        return {
            success: false,
            error: "This key is already linked to another device. Each key can only be used on one device.",
        };
    }

    // Lock to this device
    if (!keyData.deviceFingerprint) {
        keyData.deviceFingerprint = deviceFP;
    }

    // Get location info
    try {
        const loc = await fetchLocation();
        keyData.loginCity = loc.city;
        keyData.loginCountry = loc.country;
        keyData.loginIP = loc.ip;
    } catch {
        // not critical
    }

    keyData.lastUsedAt = new Date().toISOString();
    await writeBlob(blob);

    // Send Telegram notification to admin
    sendTelegramAlert(keyData, deviceFP);

    // Save session locally
    saveAuthSession({
        key: normalizedKey,
        deviceFingerprint: deviceFP,
        loginAt: new Date().toISOString(),
    });

    return { success: true };
}

// --- Check if currently authenticated ---
export async function isAuthenticatedAsync(): Promise<boolean> {
    const session = getAuthSession();
    if (!session) return false;

    const blob = await readBlobSafe();
    const keyData = blob.keys.find((k) => k.key === session.key);
    if (!keyData) return false;
    if (!keyData.active) return false;
    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) return false;

    const deviceFP = getDeviceFingerprint();
    if (keyData.deviceFingerprint && keyData.deviceFingerprint !== deviceFP) return false;

    return true;
}

// Quick local check (for initial render)
export function isAuthenticated(): boolean {
    const session = getAuthSession();
    return !!session;
}

// --- Admin session ---
export function isAdminLoggedIn(): boolean {
    return sessionStorage.getItem("darksidex_admin_logged_in") === "true";
}

export function loginAdmin() {
    sessionStorage.setItem("darksidex_admin_logged_in", "true");
}

export function logoutAdmin() {
    sessionStorage.removeItem("darksidex_admin_logged_in");
}
