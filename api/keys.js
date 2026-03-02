// Vercel Serverless Function: Proxy to JSONBlob for license key storage
// Handles CORS and acts as a bridge between browser and JSONBlob
// If the blob is missing/deleted, auto-recovers with default data

const BLOB_URL = "https://jsonblob.com/api/jsonBlob/019cace4-dd9d-783f-8b04-2aa74eae247b";

const DEFAULT_DATA = {
    keys: [],
    adminPass: "xbhi0000",
    youtubeUrl: "https://www.youtube.com/embed/pYfpNRmoRC0?rel=0&modestbranding=1&showinfo=0",
};

export default async function handler(req, res) {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Cache-Control");
    // Prevent caching of API responses
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        if (req.method === "GET") {
            const response = await fetch(BLOB_URL, {
                headers: { Accept: "application/json", "Cache-Control": "no-cache" },
            });
            if (!response.ok) {
                // If blob is deleted/missing, return default data so the app doesn't break
                console.error(`[keys] GET blob returned ${response.status}, returning defaults`);
                return res.status(200).json(DEFAULT_DATA);
            }
            const data = await response.json();
            // Ensure keys array always exists (safety net)
            if (!data.keys) data.keys = [];
            if (!data.adminPass) data.adminPass = DEFAULT_DATA.adminPass;
            return res.status(200).json(data);
        }

        if (req.method === "PUT") {
            // Validate: always ensure keys array exists before writing
            const body = req.body || {};
            if (!body.keys) body.keys = [];
            if (!body.adminPass) body.adminPass = DEFAULT_DATA.adminPass;

            // ===== SAFETY GUARD: Prevent accidental data loss =====
            // Before writing, check if we're about to lose keys
            // (e.g., due to race condition or stale data overwrite)
            try {
                const currentRes = await fetch(BLOB_URL, {
                    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
                });
                if (currentRes.ok) {
                    const currentData = await currentRes.json();
                    const currentKeyCount = (currentData.keys || []).length;
                    const newKeyCount = body.keys.length;

                    // Block write if it would delete MORE than 1 key at once
                    // (legitimate operations only add keys or remove 1 at a time)
                    if (currentKeyCount > 0 && newKeyCount < currentKeyCount - 1) {
                        console.error(`[keys] BLOCKED dangerous write: would reduce keys from ${currentKeyCount} to ${newKeyCount}`);
                        return res.status(409).json({
                            error: "Write blocked: would delete multiple keys at once. This is likely a race condition.",
                            currentKeys: currentKeyCount,
                            attemptedKeys: newKeyCount,
                        });
                    }

                    // Also block writing 0 keys if there were existing keys
                    if (currentKeyCount > 0 && newKeyCount === 0) {
                        console.error(`[keys] BLOCKED dangerous write: would wipe all ${currentKeyCount} keys`);
                        return res.status(409).json({
                            error: "Write blocked: cannot wipe all keys.",
                            currentKeys: currentKeyCount,
                        });
                    }
                }
            } catch (guardErr) {
                // If guard check fails, still allow write (don't block everything)
                console.warn("[keys] Safety guard check failed, proceeding with write:", guardErr.message);
            }
            // ===== END SAFETY GUARD =====

            const bodyStr = JSON.stringify(body);
            const response = await fetch(BLOB_URL, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: bodyStr,
            });
            if (!response.ok) {
                const errText = await response.text();
                console.error("[keys] PUT error:", response.status, errText);
                return res.status(response.status).json({ error: `JSONBlob PUT failed: ${response.status}` });
            }
            // Return the data we sent (since JSONBlob echoes the input)
            return res.status(200).json(body);
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (err) {
        console.error("[keys] Proxy error:", err);
        return res.status(500).json({ error: "Proxy failed", message: err.message });
    }
}
