import { createClient } from "@supabase/supabase-js";

// Vercel serverless function to check key status and enforce device lock
export default async function handler(req, res) {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { key, deviceFingerprint } = req.body;

    if (!key || !deviceFingerprint) {
        return res.status(400).json({ error: "Key and device fingerprint required", valid: false });
    }

    const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();

    if (!supabaseUrl || !supabaseKey) {
        // Fallback for development if not configured yet
        return res.status(500).json({ error: "Server misconfigured", valid: false });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Find key
        const { data: keyData, error: findError } = await supabase
            .from("access_keys")
            .select("*")
            .eq("key", key)
            .single();

        if (findError || !keyData) {
            return res.status(404).json({ error: "Invalid key", valid: false });
        }

        if (keyData.status !== "active") {
            return res.status(403).json({ error: `Key is ${keyData.status}`, valid: false });
        }

        if (new Date(keyData.expiry_date) < new Date()) {
            await supabase.from("access_keys").update({ status: "expired" }).eq("id", keyData.id);
            return res.status(403).json({ error: "Key expired", valid: false });
        }

        // Device lock logic
        if (!keyData.device_id) {
            // First time use, lock it
            const { error: updateError } = await supabase
                .from("access_keys")
                .update({ device_id: deviceFingerprint })
                .eq("id", keyData.id);
            
            if (updateError) {
                return res.status(500).json({ error: "Failed to lock device", valid: false });
            }
        } else if (keyData.device_id !== deviceFingerprint) {
            return res.status(403).json({ error: "Key is locked to another device", valid: false });
        }

        return res.status(200).json({ valid: true });
    } catch (err) {
        return res.status(500).json({ error: "Internal server error", valid: false });
    }
}
