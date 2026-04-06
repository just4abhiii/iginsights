import { createClient } from "@supabase/supabase-js";

const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "8236323612"; // User's chat id
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8679302654:AAElCbMtg1Op9U1m7jfPH0_4G0Ri1cJpaRw";

export default async function handler(req, res) {
    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    try {
        const { message } = req.body;
        if (!message || !message.text) {
            return res.status(200).send("OK");
        }

        const chatId = message.chat.id.toString();
        const text = message.text.trim();

        // 1. Strict Authorization Check
        if (chatId !== ADMIN_CHAT_ID) {
            await reply(chatId, `⚠️ Unauthorized access! Your Chat ID is: <code>${chatId}</code>\nPlease update ADMIN_CHAT_ID in the code.`);
            return res.status(200).send("OK");
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            await reply(chatId, "⚠️ Server misconfiguration: Supabase keys missing.");
            return res.status(200).send("OK");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. Command Parsing
        // /start
        if (text === "/start") {
            await reply(chatId, `🔐 <b>TikTok/IG Key Manager</b>\n\nCommands:\n<code>/gen [days]</code> - Generate a new key\n<code>/revoke [key]</code> - Fast revoke a key\n<code>/list</code> - List active keys`);
        } 
        // /gen [days]
        else if (text.startsWith("/gen")) {
            const parts = text.split(" ");
            let days = 30; // Default 30 days
            if (parts.length > 1 && !isNaN(parseInt(parts[1]))) {
                days = parseInt(parts[1]);
            }

            const newKey = generateKey();
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + days);

            const { error } = await supabase.from("access_keys").insert([{
                key: newKey,
                expiry_date: expiryDate.toISOString(),
                status: "active"
            }]);

            if (error) {
                await reply(chatId, `❌ Failed to create key: ${error.message}`);
            } else {
                await reply(chatId, `✅ <b>Key Generated</b>\n\n🔑 <code>${newKey}</code>\n⏳ Valid for: ${days} days\n📅 Expires: ${expiryDate.toDateString()}`);
            }
        }
        // /revoke [key]
        else if (text.startsWith("/revoke")) {
            const parts = text.split(" ");
            if (parts.length < 2) {
                await reply(chatId, "⚠️ Usage: <code>/revoke [key]</code>");
                return res.status(200).send("OK");
            }
            const keyToRevoke = parts[1].trim();

            const { data, error: findError } = await supabase.from("access_keys").select("*").eq("key", keyToRevoke).single();
            if (findError || !data) {
                await reply(chatId, "❌ Key not found.");
                return res.status(200).send("OK");
            }

            const { error } = await supabase.from("access_keys").update({ status: "revoked" }).eq("key", keyToRevoke);

            if (error) {
                await reply(chatId, `❌ Revoke failed: ${error.message}`);
            } else {
                await reply(chatId, `🚫 <b>Key Revoked</b>\n\n🔑 <code>${keyToRevoke}</code>\nThe device has been instantly locked out.`);
            }
        }
        // /list
        else if (text.startsWith("/list")) {
            const { data, error } = await supabase.from("access_keys").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(10);
            if (error) {
                await reply(chatId, `❌ Failed to list keys: ${error.message}`);
            } else {
                if (!data || data.length === 0) {
                    await reply(chatId, "No active keys found.");
                } else {
                    let msg = "📋 <b>Active Keys (Latest 10)</b>\n\n";
                    data.forEach(k => {
                        msg += `🔑 <code>${k.key}</code>\n📱 ${k.device_id ? "Locked" : "Unused"}\n⏳ Exp: ${new Date(k.expiry_date).toLocaleDateString()}\n\n`;
                    });
                    await reply(chatId, msg);
                }
            }
        } else {
            await reply(chatId, "Unrecognized command.");
        }

        return res.status(200).send("OK");
    } catch (err) {
        console.error("Bot Error:", err);
        return res.status(500).send("Internal Server Error");
    }
}

async function reply(chatId, text) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: "HTML"
        })
    });
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
