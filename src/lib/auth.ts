/**
 * Authentication & License Key System
 * Uses Upstash Redis (via /api/keys) for secure, persistent key storage.
 * Keys are stored in Redis - data never randomly disappears.
 * Device lock, expiry, and admin management all supported.
 */

const API_URL = "/api/keys";
const AUTH_STORAGE_KEY = "darksidex_auth_session";
const ADMIN_PASS_KEY = "darksidex_admin_pass";
const HARDCODED_ADMIN_PASS = "xbhi0000";

// ==================== DEVICE FINGERPRINT ====================

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

// ==================== KEY GENERATION ====================

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

// ==================== TYPES ====================

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

interface AuthSession {
    key: string;
    deviceFingerprint: string;
    loginAt: string;
}

// ==================== LOCATION ====================

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

// ==================== API HELPERS ====================

function getAdminPass(): string {
    return sessionStorage.getItem(ADMIN_PASS_KEY) || HARDCODED_ADMIN_PASS;
}

async function apiCall(method: string, body?: any, query?: string): Promise<any> {
    const url = query ? `${API_URL}?${query}` : API_URL;
    const options: RequestInit = {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getAdminPass()}`,
        },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || `API error: ${res.status}`);
    }
    return data;
}

// ==================== KEY MANAGEMENT (Admin) ====================

export async function getAllKeys(): Promise<LicenseKey[]> {
    try {
        const data = await apiCall("GET", undefined, `admin=${getAdminPass()}`);
        return data.keys || [];
    } catch (err) {
        console.error("[Auth] getAllKeys failed:", err);
        return [];
    }
}

export async function createKey(label: string, days: number): Promise<LicenseKey> {
    const data = await apiCall("POST", { label, days });
    if (!data.success) throw new Error("Failed to create key");
    return data.key;
}

export async function deleteKey(key: string): Promise<void> {
    await apiCall("DELETE", undefined, `key=${key}&admin=${getAdminPass()}`);
}

export async function revokeKey(key: string): Promise<void> {
    await apiCall("PATCH", { key, active: false });
}

export async function reactivateKey(key: string): Promise<void> {
    await apiCall("PATCH", { key, active: true });
}

// ==================== YOUTUBE URL ====================

// Store YouTube URL in Redis too
export async function getYoutubeUrl(): Promise<string> {
    try {
        // Use a simple fetch to a dedicated endpoint or fallback
        const res = await fetch(`${API_URL}?admin=${getAdminPass()}`);
        if (res.ok) {
            const data = await res.json();
            return data.youtubeUrl || "https://www.youtube.com/embed/pYfpNRmoRC0?rel=0&modestbranding=1&showinfo=0";
        }
    } catch { }
    return "https://www.youtube.com/embed/pYfpNRmoRC0?rel=0&modestbranding=1&showinfo=0";
}

export async function setYoutubeUrl(url: string): Promise<void> {
    // For now, YouTube URL is not stored in Redis (would need API extension)
    // Can be added later if needed
    console.log("[Auth] YouTube URL update not yet implemented in Redis:", url);
}

// ==================== SESSION MANAGEMENT ====================

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

// ==================== TELEGRAM ALERT ====================

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
        fetch("/api/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        }).catch(() => { });
    } catch {
        // non-critical
    }
}

// ==================== LOGIN VALIDATION ====================

export type LoginResult =
    | { success: true }
    | { success: false; error: string };

export async function validateAndLogin(accessKey: string): Promise<LoginResult> {
    const normalizedKey = accessKey.trim();

    if (!normalizedKey) {
        return { success: false, error: "Please enter your access key." };
    }

    try {
        // Get device fingerprint
        const deviceFP = getDeviceFingerprint();

        // Get location
        let loc = { city: "Unknown", country: "Unknown", ip: "" };
        try {
            loc = await fetchLocation();
        } catch { }

        // Call API to validate
        const result = await apiCall("PUT", {
            accessKey: normalizedKey,
            deviceFingerprint: deviceFP,
            city: loc.city,
            country: loc.country,
            ip: loc.ip,
        });

        if (result.success) {
            // Save session locally
            saveAuthSession({
                key: result.key.key,
                deviceFingerprint: deviceFP,
                loginAt: new Date().toISOString(),
            });

            // Send Telegram alert (fire and forget)
            sendTelegramAlert(result.key, deviceFP);

            return { success: true };
        }

        return { success: false, error: "Login failed. Please try again." };
    } catch (err: any) {
        console.error("[Auth] Login error:", err);
        return { success: false, error: err.message || "Server error. Please try again." };
    }
}

// ==================== AUTH CHECK ====================

export async function isAuthenticatedAsync(): Promise<boolean> {
    const session = getAuthSession();
    if (!session) return false;

    try {
        // Verify key is still valid by trying to validate again
        const deviceFP = getDeviceFingerprint();
        const res = await fetch(API_URL, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accessKey: session.key,
                deviceFingerprint: deviceFP,
            }),
        });

        if (!res.ok) {
            // Key is invalid/expired/revoked — clear session
            clearAuthSession();
            return false;
        }

        return true;
    } catch {
        // Network error — don't kick user out, trust local session
        return true;
    }
}

// Quick local check (for initial render, no network call)
export function isAuthenticated(): boolean {
    const session = getAuthSession();
    return !!session;
}

// ==================== ADMIN SESSION ====================

export async function validateAdminPassword(password: string): Promise<boolean> {
    // Try validating against the server
    try {
        const res = await fetch(`${API_URL}?admin=${password}`);
        if (res.ok) {
            sessionStorage.setItem(ADMIN_PASS_KEY, password);
            return true;
        }
    } catch { }

    // Fallback to hardcoded password
    if (password === HARDCODED_ADMIN_PASS) {
        sessionStorage.setItem(ADMIN_PASS_KEY, password);
        return true;
    }

    return false;
}

export function isAdminLoggedIn(): boolean {
    return sessionStorage.getItem("darksidex_admin_logged_in") === "true";
}

export function loginAdmin() {
    sessionStorage.setItem("darksidex_admin_logged_in", "true");
}

export function logoutAdmin() {
    sessionStorage.removeItem("darksidex_admin_logged_in");
    sessionStorage.removeItem(ADMIN_PASS_KEY);
}

// Admin verification (used by AdminPanel)
export async function verifyAdminAsync(password: string): Promise<boolean> {
    return validateAdminPassword(password);
}

// Get current admin password (display in admin panel)
export function getAdminPassword(): string {
    return getAdminPass();
}

// Set admin password (for now, stored in session only)
export async function setAdminPassword(newPassword: string): Promise<void> {
    sessionStorage.setItem(ADMIN_PASS_KEY, newPassword);
    // Note: This only changes the password for this session
    // To permanently change, update HARDCODED_ADMIN_PASS in code
}

