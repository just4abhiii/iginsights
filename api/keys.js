// Vercel Serverless Function: Proxy to JSONBlob for license key storage
// Handles CORS and acts as a bridge between browser and JSONBlob

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
                console.error(`[keys] GET blob returned ${response.status}, returning defaults`);
                return res.status(200).json(DEFAULT_DATA);
            }
            const data = await response.json();
            if (!data.keys) data.keys = [];
            if (!data.adminPass) data.adminPass = DEFAULT_DATA.adminPass;
            return res.status(200).json(data);
        }

        if (req.method === "PUT") {
            const body = req.body || {};
            if (!body.keys) body.keys = [];
            if (!body.adminPass) body.adminPass = DEFAULT_DATA.adminPass;

            const response = await fetch(BLOB_URL, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errText = await response.text();
                console.error("[keys] PUT error:", response.status, errText);
                return res.status(response.status).json({ error: `JSONBlob PUT failed: ${response.status}` });
            }
            return res.status(200).json(body);
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (err) {
        console.error("[keys] Proxy error:", err);
        return res.status(500).json({ error: "Proxy failed", message: err.message });
    }
}
