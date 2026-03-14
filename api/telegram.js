// Vercel Serverless: Telegram Bot Notification Proxy
const BOT_TOKEN = "8679302654:AAElCbMtg1Op9U1m7jfPH0_4G0Ri1cJpaRw";
const ADMIN_CHAT_ID = "8236323612";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    try {
        const { text, chat_id } = req.body || {};
        const targetChat = chat_id || ADMIN_CHAT_ID;
        const message = text || "🔐 DarkSideX Test Message";

        const tgRes = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: targetChat,
                    text: message,
                    parse_mode: "HTML",
                }),
            }
        );
        const data = await tgRes.json();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
