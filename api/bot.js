import { createClient } from "@supabase/supabase-js";

const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "2074522956"; 
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8371268102:AAEt0kfGyixOZyPiHGvuvn7ztOcNdzZ7UCA";

export default async function handler(req, res) {
    // ALWAYS acknowledge Telegram quickly to prevent webhook hangs/retries
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(200).send("OK");

    try {
        const { message, callback_query } = req.body;
        const chatId = (message?.chat?.id || callback_query?.message?.chat?.id)?.toString();
        
        if (!chatId) return res.status(200).send("OK");

        const text = message?.text?.trim() || "";
        const data = callback_query?.data || "";

        // 1. Authorization Check (Allow current user and known admin IDs)
        const ALLOWED_IDS = [ADMIN_CHAT_ID, "2074522956", "8236323612"];
        if (!ALLOWED_IDS.includes(chatId)) {
            await reply(chatId, `⚠️ Unauthorized! ID: <code>${chatId}</code>`);
            return res.status(200).send("OK");
        }

        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
        let supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();

        // Smart Project Ref Extraction from Key
        if (supabaseKey && supabaseKey.includes(".")) {
            try {
                const payloadStr = Buffer.from(supabaseKey.split(".")[1], 'base64').toString('utf8');
                const payload = JSON.parse(payloadStr);
                if (payload.ref) supabaseUrl = `https://${payload.ref}.supabase.co`;
            } catch (e) {}
        }

        if (!supabaseUrl || !supabaseKey) {
            await reply(chatId, "⚠️ Server Error: Supabase keys missing.");
            return res.status(200).send("OK");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // --- STATE DETECTION ---
        const isReplyToGen = message?.reply_to_message?.text?.includes("Type the name and days below");
        const isReplyToRevoke = message?.reply_to_message?.text?.includes("Paste the key you want to revoke");

        // --- RECOVERY LOGIC (If they paste just a key without command) ---
        if (!text.startsWith("/") && !isReplyToGen && !isReplyToRevoke) {
            // Check if it looks like a valid key format (e.g. AAAA-BBBB-CCCC)
            if (text.split("-").length === 3 && text.length > 10) {
                 await reply(chatId, "If you want to revoke this key, tap `/revoke` first, then paste it.", {
                     reply_markup: {
                         keyboard: [[{ text: "/revoke" }, { text: "/start" }]],
                         resize_keyboard: true
                     }
                 });
                 return res.status(200).send("OK");
            }
        }

        // --- COMMAND HANDLERS ---
        if (text === "/start") {
            const menuMsg = `👋 <b>Admin Control Panel</b>\n\nAvailable commands:\n• /gen [label] [days] - Generate a new key\n• /keys - List keys with names\n• /revoke [code] - Deactivate a key`;
            await reply(chatId, menuMsg, {
                reply_markup: {
                    keyboard: [
                        [{ text: "/gen" }, { text: "/keys" }, { text: "/revoke" }]
                    ],
                    resize_keyboard: true,
                    is_persistent: true
                }
            });
            return res.status(200).send("OK");
        }
        
        // --- /gen COMMAND LOGIC ---
        else if (text === "/gen" && !isReplyToGen) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    chat_id: chatId, 
                    text: "✍️ <b>Type the name and days below</b>:", 
                    parse_mode: "HTML",
                    reply_markup: { force_reply: true, input_field_placeholder: "e.g. Abhi 30" }
                })
            });
            return res.status(200).send("OK");
        }
        else if (text.startsWith("/gen") || isReplyToGen) {
            let processText = isReplyToGen ? `/gen ${text}` : text;
            let parts = processText.split(" ").filter(p => p.trim() !== "");
            
            let label = "User";
            let days = 30;

            if (parts.length >= 2) {
                if (!isNaN(parseInt(parts[1]))) {
                    days = parseInt(parts[1]);
                } else {
                    label = parts[1];
                    if (parts.length >= 3 && !isNaN(parseInt(parts[2]))) {
                        days = parseInt(parts[2]);
                    }
                }
            }

            const newKey = generateKey();
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + days);

            const { error } = await supabase.from("access_keys").insert([{
                key: newKey,
                expiry_date: expiryDate.toISOString(),
                status: "active",
                label: label
            }]);

            if (error) {
                await reply(chatId, `❌ Supabase Error: ${error.message}`);
            } else {
                await reply(chatId, `✅ <b>Key Generated for [${label}]</b>\n\n🔑 <code>${newKey}</code>\n⏳ Duration: ${days} days\n📅 Exp: ${expiryDate.toDateString()}`);
            }
            return res.status(200).send("OK");
        }

        // --- /keys COMMAND LOGIC ---
        else if (text.startsWith("/keys") || text.startsWith("/list")) {
            const { data: keys, error } = await supabase.from("access_keys").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(10);
            if (error) {
                await reply(chatId, `❌ Error: ${error.message}`);
            } else {
                let msg = "📋 <b>Active Keys (Latest 10)</b>\n\n";
                if (!keys?.length) msg += "No active keys found.";
                else keys.forEach(k => msg += `👤 <b>${k.label || 'No Name'}</b>\n🔑 <code>${k.key}</code>\n⏳ Exp: ${new Date(k.expiry_date).toLocaleDateString()}\n\n`);
                await reply(chatId, msg);
            }
            return res.status(200).send("OK");
        }

        // --- /revoke COMMAND LOGIC ---
        else if (text === "/revoke" && !isReplyToRevoke) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    chat_id: chatId, 
                    text: "🗑️ <b>Paste the key you want to revoke below:</b>", 
                    parse_mode: "HTML",
                    reply_markup: { force_reply: true, input_field_placeholder: "Paste key here..." }
                })
            });
            return res.status(200).send("OK");
        }
        else if (text.startsWith("/revoke") || isReplyToRevoke) {
            let key = (isReplyToRevoke ? text : text.split(" ")[1])?.trim();
            
            if (!key) {
                await reply(chatId, "⚠️ Usage: <code>/revoke [key]</code>");
                return res.status(200).send("OK");
            }
            const { error } = await supabase.from("access_keys").update({ status: "revoked" }).eq("key", key);
            if (error) {
                await reply(chatId, `❌ Revoke Error: ${error.message}`);
            } else {
                await reply(chatId, `🚫 Key Revoked: <code>${key}</code>`);
            }
            return res.status(200).send("OK");
        }

        // Catchall fallback
        return res.status(200).send("OK");

    } catch (err) {
        console.error("Bot Error:", err);
        // Extremely critical to ALWAYS return 200 so Telegram doesn't queue and freeze the bot
        return res.status(200).send("OK");
    }
}

// Ensure the fetch is awaited, but any failure is handled locally 
async function reply(chatId, text, extraOpts = {}) {
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extraOpts })
        });
    } catch(e) {
        console.log("Failed to send message to Telegram:", e);
    }
}

function generateKey() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const segs = [];
    for (let s = 0; s < 3; s++) {
        let seg = "";
        for (let i = 0; i < 4; i++) seg += chars[Math.floor(Math.random() * chars.length)];
        segs.push(seg);
    }
    return segs.join("-");
}
