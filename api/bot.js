// DarkSideX Telegram Bot - Full Commerce + Auto Blockchain Verification
// Features: Key Purchase, USDT Auto-Verify (BSCScan), Referral System (30%), Admin Panel

const BOT_TOKEN = "8679302654:AAElCbMtg1Op9U1m7jfPH0_4G0Ri1cJpaRw";
const ADMIN_CHAT_ID = "8236323612";
const ADMIN_USERNAME = "@just4abhii";
const USDT_ADDRESS = "0xA07b34C582F31e70110C59faD70C0395a5BD339f".toLowerCase();
const PUBLIC_URL = "https://darksidex.vercel.app";
const KEYS_BLOB = "https://jsonblob.com/api/jsonBlob/019cace4-dd9d-783f-8b04-2aa74eae247b";
const ORDERS_BLOB = "https://jsonblob.com/api/jsonBlob/019caa48-225e-7b3d-87b5-d2a1d2ec73e5";

// USDT Contract Addresses (for verification)
const USDT_CONTRACTS = {
    bsc: "0x55d398326f99059ff775485246999027b3197955",    // BSC USDT
    eth: "0xdac17f958d2ee523a2206206994597c13d831ec7",     // ETH USDT
};

// Direct RPC nodes (more reliable than BSCScan API)
const RPC_URLS = {
    bsc: [
        "https://bsc-dataseed1.binance.org",
        "https://bsc-dataseed2.binance.org",
        "https://bsc-dataseed3.binance.org",
        "https://bsc-dataseed.bnbchain.org",
    ],
    eth: [
        "https://eth.llamarpc.com",
        "https://rpc.ankr.com/eth",
        "https://ethereum-rpc.publicnode.com",
    ],
};

const PLANS = {
    "24hour": { name: "24 Hours WL Access", days: 1, price: 1, emoji: "🎟️" },
    "7day": { name: "7 Days Access", days: 7, price: 5, emoji: "⚡" },
    "30day": { name: "30 Days Access", days: 30, price: 20, emoji: "🔥" },
    "lifetime": { name: "Lifetime Access", days: null, price: 49, emoji: "👑" },
};

// ==================== STORAGE ====================
async function readBlob(url) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetch(url, { headers: { Accept: "application/json" } });
            if (!res.ok) {
                console.error(`[Bot] readBlob HTTP ${res.status} for ${url} (attempt ${attempt}/${maxRetries})`);
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 500 * attempt));
                    continue;
                }
                throw new Error(`[Bot] readBlob failed after ${maxRetries} retries (HTTP ${res.status}) for ${url}`);
            }
            const data = await res.json();
            // Safety: ensure keys array exists if reading KEYS_BLOB
            if (url === KEYS_BLOB && !data.keys) data.keys = [];
            return data;
        } catch (err) {
            console.error(`[Bot] readBlob error (attempt ${attempt}/${maxRetries}):`, err.message);
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 500 * attempt));
                continue;
            }
            throw err;
        }
    }
    throw new Error(`[Bot] readBlob failed unexpectedly for ${url}`);
}

// Safe version for read-only operations — returns defaults on failure
async function readBlobSafe(url) {
    try {
        return await readBlob(url);
    } catch {
        if (url === KEYS_BLOB) return { keys: [], adminPass: "xbhi0000" };
        return { orders: [], users: [], referrals: {}, balances: {}, pendingVerify: {} };
    }
}

async function writeBlob(url, data) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetch(url, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                console.error(`[Bot] writeBlob HTTP ${res.status} (attempt ${attempt}/${maxRetries})`);
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 500 * attempt));
                    continue;
                }
                return false;
            }
            return true;
        } catch (err) {
            console.error(`[Bot] writeBlob error (attempt ${attempt}/${maxRetries}):`, err.message);
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 500 * attempt));
                continue;
            }
            return false;
        }
    }
    return false;
}

// ==================== KEY GENERATION ====================
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

// ==================== BLOCKCHAIN VERIFICATION ====================
async function verifyTransaction(txHash, expectedAmount) {
    // Try BSC first (most common for USDT), then ETH
    for (const chain of ["bsc", "eth"]) {
        try {
            const result = await verifyOnChain(txHash, expectedAmount, chain);
            if (result.verified) return result;
        } catch (e) {
            console.error(`[${chain}] Verify error:`, e.message);
        }
    }
    return { verified: false, error: "Transaction not found on BSC or ETH. Please check the tx hash." };
}

async function verifyOnChain(txHash, expectedAmount, chain) {
    const rpcUrls = RPC_URLS[chain];
    const usdtContract = USDT_CONTRACTS[chain];
    let receipt = null;

    // Try multiple RPC nodes
    for (const rpcUrl of rpcUrls) {
        try {
            const res = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_getTransactionReceipt",
                    params: [txHash],
                    id: 1,
                }),
            });
            const data = await res.json();
            if (data.result) {
                receipt = data.result;
                break;
            }
        } catch (e) {
            console.error(`[${chain}] RPC ${rpcUrl} error:`, e.message);
        }
    }

    if (!receipt) {
        return { verified: false, error: `Transaction not found on ${chain.toUpperCase()}.` };
    }

    // Check if transaction was successful
    if (receipt.status !== "0x1") {
        return { verified: false, error: "Transaction failed on blockchain." };
    }

    // Check logs for USDT Transfer event
    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== usdtContract) continue;
        if (log.topics[0] !== transferTopic) continue;

        const toAddress = "0x" + log.topics[2].slice(26).toLowerCase();
        if (toAddress !== USDT_ADDRESS) continue;

        const rawAmount = BigInt(log.data);
        const decimals = chain === "bsc" ? 18n : 6n;
        const amount = Number(rawAmount) / Number(10n ** decimals);

        if (amount >= expectedAmount * 0.99) {
            return {
                verified: true,
                chain: chain.toUpperCase(),
                amount: amount.toFixed(2),
                from: "0x" + log.topics[1].slice(26),
                txHash,
            };
        } else {
            return {
                verified: false,
                error: `Amount mismatch. Expected $${expectedAmount}, received $${amount.toFixed(2)}.`,
            };
        }
    }

    return { verified: false, error: `No USDT transfer to our address found in this transaction on ${chain.toUpperCase()}.` };
}

// ==================== TELEGRAM HELPERS ====================
async function sendMessage(chatId, text, opts = {}) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...opts }),
    });
}

async function answerCallback(callbackId, text = "") {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackId, text }),
    });
}

// ==================== AUTO-APPROVE (shared logic) ====================
async function autoApproveOrder(orderId) {
    const ordersData = await readBlob(ORDERS_BLOB);
    const order = ordersData.orders?.find((o) => o.id === orderId);
    if (!order || order.status === "approved") return;

    // Generate key via the Redis API
    let newKey;
    try {
        const apiRes = await fetch(`${PUBLIC_URL}/api/keys`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer xbhi0000",
            },
            body: JSON.stringify({
                label: `${order.firstName} (${order.planName})`,
                days: order.days || 0,
            }),
        });
        if (!apiRes.ok) {
            const errText = await apiRes.text();
            throw new Error(`API ${apiRes.status}: ${errText}`);
        }
        const apiData = await apiRes.json();
        newKey = apiData.key;
    } catch (err) {
        console.error("[Bot] autoApproveOrder: ABORTING — cannot create key:", err.message);
        await sendMessage(ADMIN_CHAT_ID, `⚠️ Failed to auto-approve order ${orderId} — could not create key: ${err.message}. Please create key manually in admin panel.`);
        return;
    }

    // Update order
    order.status = "approved";
    order.key = newKey.key;
    order.approvedAt = new Date().toISOString();

    // Handle referral commission (30%) — NO commission for 24-hour WL plan
    if (order.referrer && order.planId !== "24hour") {
        const referrerId = order.referrer;
        if (!ordersData.balances) ordersData.balances = {};
        if (!ordersData.balances[referrerId]) ordersData.balances[referrerId] = 0;
        const commission = +(order.price * 0.3).toFixed(2);
        ordersData.balances[referrerId] += commission;

        await sendMessage(referrerId, `
💰 <b>Referral Commission!</b>
━━━━━━━━━━━━━━━━━━━━
You earned <b>$${commission} USDT</b> (30%) from a referral!
💼 New Balance: <b>$${ordersData.balances[referrerId].toFixed(2)} USDT</b>
━━━━━━━━━━━━━━━━━━━━
Contact ${ADMIN_USERNAME} to withdraw.`);
    }

    await writeBlob(ORDERS_BLOB, ordersData);

    // Send key to customer
    await sendMessage(order.chatId, `
🎉 <b>Payment Verified & Approved!</b>
━━━━━━━━━━━━━━━━━━━━

🔑 Your Access Key:
<code>${newKey.key}</code>

📦 Plan: ${order.planName}
${newKey.expiresAt ? `📅 Expires: ${new Date(newKey.expiresAt).toLocaleDateString()}` : "♾ Lifetime Access"}

🌐 <b>Open App:</b> ${PUBLIC_URL}
Paste your key and enjoy! 🚀

━━━━━━━━━━━━━━━━━━━━
💡 Share your referral link to earn 30% on every sale!`);

    // Notify admin
    await sendMessage(ADMIN_CHAT_ID, `✅ Auto-approved order <code>${orderId}</code>\n🔑 Key: <code>${newKey.key}</code>\n📤 Sent to ${order.firstName}\n💵 $${order.price} USDT verified on blockchain`);

    return newKey;
}

// ==================== COMMAND HANDLERS ====================
async function handleStart(chatId, firstName, refCode) {
    const ordersData = await readBlob(ORDERS_BLOB);

    // Track user for broadcast
    if (!ordersData.users) ordersData.users = [];
    if (!ordersData.users.includes(chatId)) {
        ordersData.users.push(chatId);
    }

    if (refCode && refCode !== String(chatId)) {
        if (!ordersData.referrals) ordersData.referrals = {};
        if (!ordersData.referrals[chatId]) {
            ordersData.referrals[chatId] = refCode;
        }
    }
    await writeBlob(ORDERS_BLOB, ordersData);

    const text = `
🔐 <b>Welcome to DarkSideX!</b>
━━━━━━━━━━━━━━━━━━━━

Hey <b>${firstName}</b>! 👋

DarkSideX is the #1 <b>Instagram Insights Editor & Analytics Tool</b> for Content Creators, Clippers & Agencies 🚀

🎯 <b>Perfect For:</b>
┗ Whop sellers & digital agencies
┗ Clippers who need US/UK tier proof
┗ Content creators building portfolios
┗ Anyone selling social media services

✨ <b>What You Get:</b>

🎨 <b>Insights Editor</b>
┗ Edit any IG insights screenshot
┗ Change views, reach, impressions to any number
┗ Make it look like US/UK/EU tier engagement
┗ HD export — 100% realistic

📊 <b>Reel & Story Insights</b>
┗ Generate pro-level reel analytics
┗ Views, likes, shares, saves — customize all
┗ Edit sources (Feed, Reels tab, Stories)
┗ Edit countries, age groups, accounts reached
┗ Graph on/off toggle per reel

📈 <b>Retention Graph Editor</b>
┗ Edit retention curves to look viral
┗ Show clients professional growth metrics

🎵 <b>Music & Caption Editor</b>
┗ Add custom music title & cover art
┗ Edit captions on any reel

🎬 <b>Video & Thumbnail Upload</b>
┗ Upload real videos from gallery
┗ Custom thumbnails — Supabase cloud storage
┗ Cross-device sync — works on every device!

⭐ <b>Highlights Editor</b>
┗ Add, edit, delete story highlights
┗ Upload custom highlight covers
┗ Show/hide highlights toggle

🔍 <b>Profile Analyzer</b>
┗ Deep analytics of any profile
┗ 2-sec press on Search → theme changes

✏️ <b>Edit Profile Section</b>
┗ Premium bio & profile templates

🔄 <b>Cross-Device Sync</b>
┗ All edits saved to cloud
┗ Login on any device — your data is there!

💰 <b>Pricing:</b>
🎟️ <b>24 Hours WL</b> — $1 USDT
⚡ <b>7 Days</b> — $5 USDT
🔥 <b>30 Days</b> — $20 USDT
👑 <b>Lifetime</b> — $49 USDT

🔗 <b>App:</b> ${PUBLIC_URL}
━━━━━━━━━━━━━━━━━━━━`;

    const keyboard = {
        inline_keyboard: [
            [{ text: "🛒 Buy Access Key", callback_data: "buy" }],
            [{ text: "✨ All Features", callback_data: "features" }, { text: "📖 How to Pay", callback_data: "howtopay" }],
            [{ text: "💰 My Balance", callback_data: "balance" }, { text: "🔗 Referral Link", callback_data: "ref" }],
            [{ text: "📋 My Orders", callback_data: "orders" }, { text: "🆘 Support", callback_data: "support" }],
            [{ text: "🌐 Open DarkSideX App", url: PUBLIC_URL }],
        ],
    };

    await sendMessage(chatId, text, { reply_markup: JSON.stringify(keyboard) });
}

async function handleFeatures(chatId) {
    const text = `
✨ <b>DarkSideX — Full Feature List</b>
━━━━━━━━━━━━━━━━━━━━

🎨 <b>INSIGHTS EDITOR</b>
━━━━━━━━━━━━━━━━
The most powerful IG insights editor:
• Edit follower count, reach, impressions
• Set any numbers — show US/UK tier stats
• Modify engagement rate & growth %
• Export in HD — pixel-perfect quality
• 100% realistic — no one can tell!
• Perfect for Whop proofs & client reports

📊 <b>REEL & STORY INSIGHTS</b>
━━━━━━━━━━━━━━━━
• Press any reel → full insights panel
• Customize views, likes, shares, saves
• Edit top sources (Feed, Reels tab, Stories)
• Edit countries & percentages
• Edit age groups & demographics
• Edit accounts reached & follows
• Graph on/off toggle per reel
• Great for portfolio & case studies

📈 <b>RETENTION GRAPH EDITOR</b>
━━━━━━━━━━━━━━━━
• Edit retention curves to look viral
• Custom drop-off points
• Show clients your content performs
• Export-ready professional graphs

🎵 <b>MUSIC & CAPTION EDITOR</b>
━━━━━━━━━━━━━━━━
• Add custom music title on any reel
• Upload music cover art
• Edit captions directly
• Shows on reel detail page like real IG

🎬 <b>VIDEO & THUMBNAIL UPLOAD</b>
━━━━━━━━━━━━━━━━
• Upload real videos from your gallery
• Custom thumbnail upload
• Stored in cloud — works on every device!
• Supports Streamable, ScreenPal & direct

⭐ <b>HIGHLIGHTS EDITOR</b>
━━━━━━━━━━━━━━━━
• Add, edit, delete story highlights
• Upload custom highlight covers
• Rename highlights
• Show/hide highlights toggle in Edit Profile

🔍 <b>PROFILE ANALYZER</b>
━━━━━━━━━━━━━━━━
• Long press (2 sec) on Search icon
• Color theme changes instantly!
• Deep analytics of any profile
• Follower/following ratio analysis
• Engagement rate calculator

✏️ <b>EDIT PROFILE</b>
━━━━━━━━━━━━━━━━
• Edit your profile appearance
• Premium bio templates
• Professional layout options

🔄 <b>CROSS-DEVICE SYNC</b>
━━━━━━━━━━━━━━━━
• All data saved to Supabase cloud
• Videos, thumbnails, insights — everything synced
• Login on any device, your edits are there!

🔒 <b>SECURITY</b>
━━━━━━━━━━━━━━━━
• One key = One device (locked)
• Auto-logout on key deletion
• 24/7 monitoring

━━━━━━━━━━━━━━━━━━━━
🌐 Try it now: ${PUBLIC_URL}`;

    const keyboard = {
        inline_keyboard: [
            [{ text: "🛒 Buy Now", callback_data: "buy" }],
            [{ text: "📖 How to Pay", callback_data: "howtopay" }],
            [{ text: "◀️ Back", callback_data: "start" }],
        ],
    };

    await sendMessage(chatId, text, { reply_markup: JSON.stringify(keyboard) });
}

async function handleHowToPay(chatId) {
    const text = `
📖 <b>How to Buy — Step by Step</b>
━━━━━━━━━━━━━━━━━━━━

<b>Step 1️⃣ — Choose Plan</b>
Tap "🛒 Buy Access Key" and select:
• 🎟️ 24 Hours WL → $1
• ⚡ 7 Days → $5
• 🔥 30 Days → $20
• 👑 Lifetime → $49

<b>Step 2️⃣ — Copy USDT Address</b>
Copy this address:
<code>${USDT_ADDRESS}</code>

<b>Step 3️⃣ — Send Payment</b>
• Open your crypto wallet
  (Trust Wallet / MetaMask / Binance)
• Send EXACT amount in USDT
• Network: <b>BEP20 (BSC)</b> or ERC20

<b>Step 4️⃣ — Copy TX Hash</b>
After sending, copy the <b>Transaction Hash</b>
It looks like: <code>0x1a2b3c4d5e...</code>

<b>Step 5️⃣ — Paste TX Hash Here</b>
Paste the TX hash in this bot chat!
Bot will <b>automatically verify</b> on blockchain! ⚡

<b>Step 6️⃣ — Get Your Key! 🔑</b>
If payment verified → Key sent instantly!
Open ${PUBLIC_URL} and paste your key!

━━━━━━━━━━━━━━━━━━━━
💡 <b>No USDT?</b> Contact ${ADMIN_USERNAME} for UPI payment!
💬 <b>Issues?</b> Contact ${ADMIN_USERNAME} for manual verification`;

    const keyboard = {
        inline_keyboard: [
            [{ text: "🛒 Buy Now", callback_data: "buy" }],
            [{ text: `💬 Contact ${ADMIN_USERNAME}`, url: `https://t.me/${ADMIN_USERNAME.replace("@", "")}` }],
            [{ text: "◀️ Back", callback_data: "start" }],
        ],
    };

    await sendMessage(chatId, text, { reply_markup: JSON.stringify(keyboard) });
}

async function handleBroadcast(chatId, messageText) {
    if (String(chatId) !== String(ADMIN_CHAT_ID)) {
        await sendMessage(chatId, "❌ Only admin can broadcast.");
        return;
    }

    const ordersData = await readBlob(ORDERS_BLOB);
    const users = ordersData.users || [];

    if (users.length === 0) {
        await sendMessage(chatId, "❌ No users to broadcast to.");
        return;
    }

    let sent = 0;
    let failed = 0;
    for (const userId of users) {
        try {
            await sendMessage(userId, `📢 <b>Announcement</b>\n━━━━━━━━━━━━━━━━━━━━\n\n${messageText}\n\n━━━━━━━━━━━━━━━━━━━━\n🔐 <i>DarkSideX Official</i>`);
            sent++;
        } catch {
            failed++;
        }
    }

    await sendMessage(ADMIN_CHAT_ID, `📢 Broadcast Complete!\n✅ Sent: ${sent}\n❌ Failed: ${failed}\n👥 Total Users: ${users.length}`);
}

async function handleBuy(chatId) {
    const text = `
🛒 <b>Choose Your Plan</b>
━━━━━━━━━━━━━━━━━━━━

🎟️ <b>24 Hours WL</b> — $1 USDT
⚡ <b>7 Days</b> — $5 USDT
🔥 <b>30 Days</b> — $20 USDT
👑 <b>Lifetime</b> — $49 USDT

✅ <b>Auto-verified</b> — Pay & get key instantly!
🔒 1 Device Lock per key
📍 Location tracking enabled
🔄 24/7 Support

Select a plan below 👇`;

    const keyboard = {
        inline_keyboard: [
            [{ text: "🎟️ 24 Hours WL — $1", callback_data: "plan_24hour" }],
            [{ text: "⚡ 7 Days — $5", callback_data: "plan_7day" }],
            [{ text: "🔥 30 Days — $20", callback_data: "plan_30day" }],
            [{ text: "👑 Lifetime — $49", callback_data: "plan_lifetime" }],
            [{ text: "◀️ Back", callback_data: "start" }],
        ],
    };

    await sendMessage(chatId, text, { reply_markup: JSON.stringify(keyboard) });
}

async function handlePlanSelect(chatId, planId, firstName) {
    const plan = PLANS[planId];
    if (!plan) return;

    // Check if user already has an active key (read-only, safe fallback)
    const keysData = await readBlobSafe(KEYS_BLOB);
    const ordersData = await readBlobSafe(ORDERS_BLOB);

    // Find all approved orders for this user
    const userOrders = (ordersData.orders || []).filter(
        (o) => String(o.chatId) === String(chatId) && o.status === "approved" && o.key
    );

    // Check if any of those keys are still active
    for (const order of userOrders) {
        const keyData = keysData.keys?.find((k) => k.key === order.key);
        if (keyData && keyData.active) {
            // Key exists and is active — check if expired
            if (!keyData.expiresAt || new Date(keyData.expiresAt) > new Date()) {
                // Key is still valid! Block purchase
                const expiryText = keyData.expiresAt
                    ? `expires on ${new Date(keyData.expiresAt).toLocaleDateString()}`
                    : "Lifetime (never expires)";

                await sendMessage(chatId, `
⚠️ <b>You Already Have an Active Key!</b>
━━━━━━━━━━━━━━━━━━━━

🔑 Key: <code>${keyData.key}</code>
📦 Plan: ${order.planName}
📅 Status: ${expiryText}

You can only have <b>one active key</b> at a time.
Wait for your current key to expire, or contact ${ADMIN_USERNAME} for an upgrade.

🌐 <b>Open App:</b> ${PUBLIC_URL}`, {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{ text: `💬 Contact ${ADMIN_USERNAME}`, url: `https://t.me/${ADMIN_USERNAME.replace("@", "")}` }],
                            [{ text: "◀️ Back", callback_data: "start" }],
                        ],
                    }),
                });
                return;
            }
        }
    }

    // Create order
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const order = {
        id: orderId,
        chatId,
        firstName,
        planId,
        planName: plan.name,
        price: plan.price,
        days: plan.days,
        status: "pending",
        createdAt: new Date().toISOString(),
        referrer: ordersData.referrals?.[chatId] || null,
    };

    if (!ordersData.orders) ordersData.orders = [];
    ordersData.orders.push(order);
    await writeBlob(ORDERS_BLOB, ordersData);

    const text = `
📦 <b>Order Created — ${plan.emoji} ${plan.name}</b>
━━━━━━━━━━━━━━━━━━━━

🆔 Order: <code>${orderId}</code>
💵 Amount: <b>$${plan.price} USDT</b>
📅 Plan: ${plan.name}

━━━━━━━━━━━━━━━━━━━━
💳 <b>Send EXACTLY $${plan.price} USDT to:</b>

<b>Network:</b> BEP20 (BSC) or ERC20
<b>USDT Address:</b>
<code>${USDT_ADDRESS}</code>

━━━━━━━━━━━━━━━━━━━━

⚡ <b>After payment, send your TX Hash here!</b>
Bot will auto-verify on blockchain & send key instantly!

Example: <code>0x1234abcd...</code>

💡 Don't have USDT? Contact ${ADMIN_USERNAME} for UPI option.`;

    const keyboard = {
        inline_keyboard: [
            [{ text: "📋 Copy USDT Address", callback_data: "copy_address" }],
            [{ text: "💬 Pay via UPI — Contact Admin", url: `https://t.me/${ADMIN_USERNAME.replace("@", "")}` }],
            [{ text: "◀️ Back to Plans", callback_data: "buy" }],
        ],
    };

    // Store pending order for this user so we know which order to verify
    if (!ordersData.pendingVerify) ordersData.pendingVerify = {};
    ordersData.pendingVerify[chatId] = orderId;
    await writeBlob(ORDERS_BLOB, ordersData);

    await sendMessage(chatId, text, { reply_markup: JSON.stringify(keyboard) });
}

async function handleTxHash(chatId, txHash, firstName) {
    // Find pending order for this user
    const ordersData = await readBlob(ORDERS_BLOB);
    const pendingOrderId = ordersData.pendingVerify?.[chatId];

    if (!pendingOrderId) {
        await sendMessage(chatId, "❌ No pending order found.\n\nUse /buy to create an order first!");
        return;
    }

    const order = ordersData.orders?.find((o) => o.id === pendingOrderId);
    if (!order) {
        await sendMessage(chatId, "❌ Order not found. Please create a new order with /buy");
        return;
    }

    if (order.status === "approved") {
        await sendMessage(chatId, "✅ This order is already approved! Check /orders for your key.");
        return;
    }

    // Show verifying message
    await sendMessage(chatId, `
⏳ <b>Verifying Transaction...</b>
━━━━━━━━━━━━━━━━━━━━
🔍 TX: <code>${txHash}</code>
💵 Expected: $${order.price} USDT
🔗 Checking BSC & ETH blockchain...

Please wait... ⌛`);

    // Notify admin
    await sendMessage(ADMIN_CHAT_ID, `🔍 Verifying payment for order <code>${pendingOrderId}</code>\n👤 User: ${firstName}\n💵 $${order.price} USDT\n🔗 TX: <code>${txHash}</code>`);

    // Verify on blockchain
    const result = await verifyTransaction(txHash, order.price);

    if (result.verified) {
        // Save tx hash
        order.txHash = txHash;
        order.verifiedChain = result.chain;
        order.verifiedAmount = result.amount;
        delete ordersData.pendingVerify[chatId];
        await writeBlob(ORDERS_BLOB, ordersData);

        // Auto approve & send key
        await sendMessage(chatId, `
✅ <b>Blockchain Verified!</b>
━━━━━━━━━━━━━━━━━━━━
🔗 Chain: ${result.chain}
💵 Amount: $${result.amount} USDT
✅ Status: Confirmed

Generating your key... ⏳`);

        await autoApproveOrder(pendingOrderId);
    } else {
        // Verification failed
        await sendMessage(chatId, `
❌ <b>Verification Failed</b>
━━━━━━━━━━━━━━━━━━━━
${result.error}

<b>Possible reasons:</b>
• Transaction not yet confirmed (wait a few minutes)
• Wrong TX hash
• Payment sent to wrong address
• Amount doesn't match the plan

Try again by sending the correct TX hash.
Or contact ${ADMIN_USERNAME} for manual verification.`);

        // Notify admin about failed verification
        await sendMessage(ADMIN_CHAT_ID, `❌ Auto-verify failed for <code>${pendingOrderId}</code>\n👤 ${firstName}\n🔗 TX: <code>${txHash}</code>\n⚠️ Error: ${result.error}`, {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{ text: "✅ Manual Approve", callback_data: `approve_${pendingOrderId}` }],
                    [{ text: "❌ Reject", callback_data: `reject_${pendingOrderId}` }],
                ],
            }),
        });
    }
}

async function handleBalance(chatId) {
    const ordersData = await readBlobSafe(ORDERS_BLOB);
    const balance = ordersData.balances?.[chatId] || 0;
    const referralCount = Object.values(ordersData.referrals || {}).filter((r) => String(r) === String(chatId)).length;
    const totalEarned = balance;
    const approvedOrders = (ordersData.orders || []).filter((o) => o.referrer === String(chatId) && o.status === "approved");

    await sendMessage(chatId, `
💰 <b>Your Wallet</b>
━━━━━━━━━━━━━━━━━━━━

💵 Available Balance: <b>$${balance.toFixed(2)} USDT</b>
👥 Total Referrals: <b>${referralCount}</b>
🛒 Successful Sales: <b>${approvedOrders.length}</b>
📊 Commission Rate: <b>30%</b>

━━━━━━━━━━━━━━━━━━━━
💡 <b>Earnings Breakdown:</b>
🎟️ 24-Hour WL: No commission
⚡ Per 7-Day sale: $1.50
🔥 Per 30-Day sale: $6.00
👑 Per Lifetime sale: $14.70
${balance > 0 ? `\n💳 Contact ${ADMIN_USERNAME} to withdraw your balance.` : "\n🔗 Share your referral link to start earning!"}`);
}

async function handleRef(chatId) {
    const refLink = `https://t.me/Darksidexik_bot?start=ref_${chatId}`;

    await sendMessage(chatId, `
🔗 <b>Your Referral Link</b>
━━━━━━━━━━━━━━━━━━━━

Share this link to earn <b>30%</b> on every sale!

🔗 Link:
<code>${refLink}</code>

━━━━━━━━━━━━━━━━━━━━

💡 <b>How it works:</b>
1️⃣ Share your link with friends
2️⃣ They click & buy a plan  
3️⃣ You get 30% commission instantly
4️⃣ Withdraw via ${ADMIN_USERNAME}

📊 <b>Your Earnings Per Sale:</b>
🎟️ 24-Hour WL → No commission
⚡ 7 Day sale → You earn <b>$1.50</b>
🔥 30 Day sale → You earn <b>$6.00</b>
👑 Lifetime sale → You earn <b>$14.70</b>`);
}

async function handleOrders(chatId) {
    const ordersData = await readBlobSafe(ORDERS_BLOB);
    const myOrders = (ordersData.orders || []).filter((o) => String(o.chatId) === String(chatId)).slice(-5);

    if (myOrders.length === 0) {
        await sendMessage(chatId, "📋 No orders yet.\n\nUse /buy to purchase your first key!");
        return;
    }

    let text = "📋 <b>Your Recent Orders</b>\n━━━━━━━━━━━━━━━━━━━━\n\n";
    for (const o of myOrders) {
        const statusEmoji = o.status === "approved" ? "✅" : o.status === "rejected" ? "❌" : "⏳";
        text += `${statusEmoji} <code>${o.id}</code>\n`;
        text += `   📦 ${o.planName} — $${o.price}\n`;
        text += `   📅 ${new Date(o.createdAt).toLocaleDateString()}\n`;
        if (o.key) text += `   🔑 <code>${o.key}</code>\n`;
        if (o.txHash) text += `   🔗 TX: <code>${o.txHash.slice(0, 20)}...</code>\n`;
        text += "\n";
    }

    await sendMessage(chatId, text);
}

async function handleSupport(chatId) {
    await sendMessage(chatId, `
🆘 <b>Support</b>
━━━━━━━━━━━━━━━━━━━━

📞 Contact Admin: ${ADMIN_USERNAME}
💬 Available 24/7

<b>Common Issues:</b>
• Payment verification failed
• Key not working
• Device lock reset
• UPI payment option
• Referral withdrawal
• TX hash not detected

Tap below to contact 👇`, {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{ text: `💬 Message ${ADMIN_USERNAME}`, url: `https://t.me/${ADMIN_USERNAME.replace("@", "")}` }],
                [{ text: "◀️ Back", callback_data: "start" }],
            ],
        }),
    });
}

async function handleApprove(chatId, orderId) {
    if (String(chatId) !== String(ADMIN_CHAT_ID)) {
        await sendMessage(chatId, "❌ Only admin can approve orders.");
        return;
    }

    const ordersData = await readBlob(ORDERS_BLOB);
    const order = ordersData.orders?.find((o) => o.id === orderId);

    if (!order) {
        await sendMessage(chatId, "❌ Order not found.");
        return;
    }

    if (order.status === "approved") {
        await sendMessage(chatId, "⚠️ This order is already approved.");
        return;
    }

    await autoApproveOrder(orderId);
}

async function handleReject(chatId, orderId) {
    if (String(chatId) !== String(ADMIN_CHAT_ID)) return;

    const ordersData = await readBlob(ORDERS_BLOB);
    const order = ordersData.orders?.find((o) => o.id === orderId);
    if (!order) return;

    order.status = "rejected";
    if (ordersData.pendingVerify?.[order.chatId]) {
        delete ordersData.pendingVerify[order.chatId];
    }
    await writeBlob(ORDERS_BLOB, ordersData);

    await sendMessage(order.chatId, `
❌ <b>Payment Not Verified</b>
━━━━━━━━━━━━━━━━━━━━
Order <code>${orderId}</code> could not be verified.
Please contact ${ADMIN_USERNAME} for support.`);

    await sendMessage(ADMIN_CHAT_ID, `❌ Order <code>${orderId}</code> rejected.`);
}

// ==================== WEBHOOK HANDLER ====================
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(200).json({ ok: true, message: "DarkSideX Bot Active 🚀" });
    }

    try {
        const update = req.body;

        // Handle text messages
        if (update.message?.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text.trim();
            const firstName = update.message.from.first_name || "User";

            if (text.startsWith("/start")) {
                const refCode = text.includes("ref_") ? text.split("ref_")[1] : null;
                await handleStart(chatId, firstName, refCode);
            } else if (text === "/buy") {
                await handleBuy(chatId);
            } else if (text === "/balance" || text === "/wallet") {
                await handleBalance(chatId);
            } else if (text === "/ref" || text === "/referral") {
                await handleRef(chatId);
            } else if (text === "/orders" || text === "/myorders") {
                await handleOrders(chatId);
            } else if (text === "/support" || text === "/help") {
                await handleSupport(chatId);
            } else if (text === "/features") {
                await handleFeatures(chatId);
            } else if (text === "/howtopay") {
                await handleHowToPay(chatId);
            } else if (text.startsWith("/broadcast ") && String(chatId) === String(ADMIN_CHAT_ID)) {
                const msg = text.replace("/broadcast ", "");
                await handleBroadcast(chatId, msg);
            } else if (text.startsWith("0x") && text.length >= 60) {
                await handleTxHash(chatId, text, firstName);
            } else if (String(chatId) === String(ADMIN_CHAT_ID) && !text.startsWith("/")) {
                // ADMIN: Any non-command message → broadcast to all users
                await handleBroadcast(chatId, text);
            } else {
                // Track user
                const ordersData = await readBlob(ORDERS_BLOB);
                if (!ordersData.users) ordersData.users = [];
                if (!ordersData.users.includes(chatId)) {
                    ordersData.users.push(chatId);
                    await writeBlob(ORDERS_BLOB, ordersData);
                }
                await sendMessage(chatId, `Hey <b>${firstName}</b>! 👋\n\n📱 <b>Commands:</b>\n/buy — 🛒 Purchase a key\n/features — ✨ See all features\n/howtopay — 📖 Payment guide\n/balance — 💰 Check earnings\n/ref — 🔗 Referral link\n/orders — 📋 My orders\n/support — 🆘 Get help\n\n💳 Paste your <b>TX Hash</b> (0x...) to verify payment!`);
            }
        }

        // Handle callback queries (button clicks)
        if (update.callback_query) {
            const cb = update.callback_query;
            const chatId = cb.message.chat.id;
            const data = cb.data;
            const firstName = cb.from.first_name || "User";

            await answerCallback(cb.id);

            if (data === "buy") await handleBuy(chatId);
            else if (data === "balance") await handleBalance(chatId);
            else if (data === "ref") await handleRef(chatId);
            else if (data === "orders") await handleOrders(chatId);
            else if (data === "support") await handleSupport(chatId);
            else if (data === "features") await handleFeatures(chatId);
            else if (data === "howtopay") await handleHowToPay(chatId);
            else if (data === "start") await handleStart(chatId, firstName, null);
            else if (data === "copy_address") {
                await sendMessage(chatId, `<code>${USDT_ADDRESS}</code>\n\n👆 Tap to copy USDT address\n\n<b>Network:</b> BEP20 (BSC) or ERC20\nSend USDT and paste your TX hash here!`);
            }
            else if (data.startsWith("plan_")) await handlePlanSelect(chatId, data.replace("plan_", ""), firstName);
            else if (data.startsWith("approve_")) await handleApprove(chatId, data.replace("approve_", ""));
            else if (data.startsWith("reject_")) await handleReject(chatId, data.replace("reject_", ""));
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error("Bot error:", err);
        return res.status(200).json({ ok: true });
    }
}
