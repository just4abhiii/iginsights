import { useState, useEffect, useCallback } from "react";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Copy,
    RefreshCw,
    Key,
    Shield,
    Smartphone,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    EyeOff,
    Lock,
    LogOut,
    Search,
    Loader2,
    MapPin,
    Play,
} from "lucide-react";
import {
    getAllKeys,
    createKey,
    revokeKey,
    reactivateKey,
    deleteKey,
    resetDeviceLock,
    verifyAdminAsync,
    getAdminPassword,
    setAdminPassword,
    getYoutubeUrl,
    setYoutubeUrl,
    isAdminLoggedIn,
    loginAdmin,
    logoutAdmin,
    type LicenseKey,
} from "@/lib/auth";

const AdminPanel = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [adminPass, setAdminPass] = useState("");
    const [passError, setPassError] = useState("");

    const [keys, setKeys] = useState<LicenseKey[]>([]);
    const [loading, setLoading] = useState(false);
    const [newLabel, setNewLabel] = useState("");
    const [newExpiry, setNewExpiry] = useState<string>("30");
    const [noExpiry, setNoExpiry] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [copiedKey, setCopiedKey] = useState("");
    const [search, setSearch] = useState("");
    const [showChangePass, setShowChangePass] = useState(false);
    const [newPass, setNewPass] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [actionLoading, setActionLoading] = useState("");
    const [ytInput, setYtInput] = useState("");
    const [ytSaved, setYtSaved] = useState(false);

    const refreshKeys = useCallback(async () => {
        setLoading(true);
        const fetchedKeys = await getAllKeys();
        setKeys(fetchedKeys);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isAdminLoggedIn()) {
            setIsLoggedIn(true);
            refreshKeys();
            getYoutubeUrl().then(setYtInput);
        }
    }, [refreshKeys]);

    const handleAdminLogin = async () => {
        const valid = await verifyAdminAsync(adminPass);
        if (valid) {
            loginAdmin();
            setIsLoggedIn(true);
            setPassError("");
            refreshKeys();
        } else {
            setPassError("Incorrect password");
        }
    };

    const handleCreateKey = async () => {
        if (!newLabel.trim()) return;
        setActionLoading("create");
        try {
            const k = await createKey(newLabel.trim(), noExpiry ? undefined : parseInt(newExpiry) || 30);
            setNewLabel("");
            setNewExpiry("30");
            setNoExpiry(false);
            setShowCreate(false);
            await refreshKeys();
            copyToClipboard(k.key);
        } catch (err) {
            alert("❌ Failed to create key. Network error — please try again.");
            console.error("[Admin] createKey failed:", err);
        }
        setActionLoading("");
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).catch(() => { });
        setCopiedKey(text);
        setTimeout(() => setCopiedKey(""), 2000);
    };

    const handleChangePassword = async () => {
        if (newPass.length < 4) return;
        try {
            await setAdminPassword(newPass);
            setNewPass("");
            setShowChangePass(false);
        } catch (err) {
            alert("❌ Failed to change password. Network error — please try again.");
            console.error("[Admin] setAdminPassword failed:", err);
        }
    };

    const handleAction = async (action: string, key: string, fn: () => Promise<unknown>) => {
        // Add confirmation for destructive actions
        if (action === "delete") {
            const confirmed = window.confirm(`Are you sure you want to DELETE this key?\n\nKey: ${key}\n\nThis action cannot be undone!`);
            if (!confirmed) return;
        }
        if (action === "revoke") {
            const confirmed = window.confirm(`Are you sure you want to REVOKE this key?\n\nKey: ${key}`);
            if (!confirmed) return;
        }
        setActionLoading(`${action}-${key}`);
        try {
            await fn();
            await refreshKeys();
        } catch (err) {
            alert(`❌ Failed to ${action} key. Network error — please try again.`);
            console.error(`[Admin] ${action} failed:`, err);
        }
        setActionLoading("");
    };

    const filteredKeys = keys.filter(
        (k) =>
            k.key.toLowerCase().includes(search.toLowerCase()) ||
            k.label.toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = keys.filter((k) => k.active).length;
    const deviceLockedCount = keys.filter((k) => k.deviceFingerprint).length;

    // --- Admin Login Screen ---
    if (!isLoggedIn) {
        return (
            <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black text-white px-6">
                <div className="absolute inset-0 opacity-20">
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                "radial-gradient(ellipse at 30% 30%, rgba(99,102,241,0.3) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(236,72,153,0.2) 0%, transparent 60%)",
                        }}
                    />
                </div>
                <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/30">
                        <Shield size={32} className="text-white" />
                    </div>
                    <h1 className="text-xl font-bold mb-1">Admin Panel</h1>
                    <p className="text-sm text-gray-400 mb-6 text-center">Enter admin password to manage access keys</p>

                    <input
                        type={showPass ? "text" : "password"}
                        value={adminPass}
                        onChange={(e) => {
                            setAdminPass(e.target.value);
                            setPassError("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                        placeholder="Admin password"
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white text-[14px] placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mb-2"
                        autoFocus
                    />
                    <button
                        onClick={() => setShowPass(!showPass)}
                        className="text-xs text-gray-500 mb-3 flex items-center gap-1"
                    >
                        {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
                        {showPass ? "Hide" : "Show"} password
                    </button>

                    {passError && <p className="text-red-400 text-sm mb-3">{passError}</p>}

                    <button
                        onClick={handleAdminLogin}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-[14px] active:scale-[0.97] transition-transform shadow-lg"
                    >
                        Login as Admin
                    </button>

                    <p className="mt-4 text-[11px] text-gray-600">Contact admin for access</p>
                </div>
            </div>
        );
    }

    // --- Admin Dashboard ---
    return (
        <div className="fixed inset-0 z-[99999] bg-[#0a0a0a] text-white overflow-y-auto">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-[16px] font-bold">Admin Panel</h1>
                    {loading && <Loader2 size={14} className="animate-spin text-indigo-400" />}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={refreshKeys}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button
                        onClick={() => setShowChangePass(!showChangePass)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Change password"
                    >
                        <Lock size={16} />
                    </button>
                    <button
                        onClick={() => {
                            logoutAdmin();
                            setIsLoggedIn(false);
                            setAdminPass("");
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-red-400"
                        title="Logout"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            <div className="px-4 py-4 space-y-4 pb-28">
                {/* Change Password Panel */}
                {showChangePass && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                        <h3 className="text-[14px] font-semibold flex items-center gap-2">
                            <Lock size={14} /> Change Admin Password
                        </h3>
                        <input
                            type="text"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            placeholder="New password (min 4 chars)"
                            className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/10 text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleChangePassword}
                                disabled={newPass.length < 4}
                                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold disabled:opacity-40"
                            >
                                Save Password
                            </button>
                            <button
                                onClick={() => setShowChangePass(false)}
                                className="px-4 py-2 rounded-lg bg-white/10 text-[13px]"
                            >
                                Cancel
                            </button>
                        </div>
                        <p className="text-[11px] text-gray-500">Current: {getAdminPassword()}</p>
                    </div>
                )}

                {/* YouTube URL Changer */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                    <h3 className="text-[13px] font-semibold flex items-center gap-2 text-red-400">
                        <Play size={14} /> Login Page Video
                    </h3>
                    <div className="flex gap-2">
                        <input
                            value={ytInput}
                            onChange={(e) => { setYtInput(e.target.value); setYtSaved(false); }}
                            placeholder="Paste YouTube URL..."
                            className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-[12px] placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                        />
                        <button
                            onClick={async () => {
                                if (!ytInput.trim()) return;
                                setActionLoading("yt");
                                try {
                                    await setYoutubeUrl(ytInput.trim());
                                    setYtSaved(true);
                                    setTimeout(() => setYtSaved(false), 3000);
                                } catch (err) {
                                    alert("❌ Failed to update YouTube URL. Network error — please try again.");
                                    console.error("[Admin] setYoutubeUrl failed:", err);
                                }
                                setActionLoading("");
                            }}
                            disabled={actionLoading === "yt"}
                            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-[12px] font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                            {actionLoading === "yt" ? "Saving..." : ytSaved ? "✅ Saved!" : "Update"}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-500">Paste any YouTube link — watch, live, short. It auto-converts.</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-600/5 border border-indigo-500/20 rounded-xl p-3">
                        <p className="text-[11px] text-indigo-300 mb-1">Total Keys</p>
                        <p className="text-xl font-bold">{keys.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/20 rounded-xl p-3">
                        <p className="text-[11px] text-green-300 mb-1">Active</p>
                        <p className="text-xl font-bold">{activeCount}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/20 rounded-xl p-3">
                        <p className="text-[11px] text-purple-300 mb-1">Device Locked</p>
                        <p className="text-xl font-bold">{deviceLockedCount}</p>
                    </div>
                </div>

                {/* Create Key Section */}
                {!showCreate ? (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-lg shadow-indigo-500/20"
                    >
                        <Plus size={18} /> Generate New Access Key
                    </button>
                ) : (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                        <h3 className="text-[14px] font-semibold flex items-center gap-2">
                            <Key size={14} /> New Access Key
                        </h3>
                        <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="Customer name / label"
                            className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/10 text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                        />
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-[13px]">
                                <input
                                    type="checkbox"
                                    checked={noExpiry}
                                    onChange={(e) => setNoExpiry(e.target.checked)}
                                    className="rounded accent-indigo-500"
                                />
                                Never expires
                            </label>
                            {!noExpiry && (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        value={newExpiry}
                                        onChange={(e) => setNewExpiry(e.target.value)}
                                        className="w-16 px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-[13px] text-white text-center focus:outline-none"
                                        min={1}
                                    />
                                    <span className="text-[12px] text-gray-400">days</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreateKey}
                                disabled={!newLabel.trim() || actionLoading === "create"}
                                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[13px] font-semibold disabled:opacity-40 active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
                            >
                                {actionLoading === "create" ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : null}
                                Generate & Copy Key
                            </button>
                            <button
                                onClick={() => setShowCreate(false)}
                                className="px-4 py-2.5 rounded-lg bg-white/10 text-[13px]"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search keys or labels..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    />
                </div>

                {/* Keys List */}
                <div className="space-y-2">
                    {filteredKeys.length === 0 && !loading && (
                        <div className="text-center py-12 text-gray-500">
                            <Key size={32} className="mx-auto mb-3 opacity-30" />
                            <p className="text-[14px]">No access keys yet</p>
                            <p className="text-[12px] mt-1">Create your first key above</p>
                        </div>
                    )}

                    {loading && filteredKeys.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <Loader2 size={24} className="mx-auto mb-3 animate-spin" />
                            <p className="text-[13px]">Loading keys...</p>
                        </div>
                    )}

                    {filteredKeys.map((k) => {
                        const isExpired = k.expiresAt ? new Date(k.expiresAt) < new Date() : false;
                        const statusLabel = !k.active ? "Revoked" : isExpired ? "Expired" : "Active";

                        return (
                            <div
                                key={k.key}
                                className={`bg-white/5 border rounded-xl p-3.5 space-y-2.5 transition-colors ${!k.active || isExpired ? "border-white/5 opacity-60" : "border-white/10"
                                    }`}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${!k.active ? "bg-red-500/20 text-red-400" :
                                            isExpired ? "bg-amber-500/20 text-amber-400" :
                                                "bg-green-500/20 text-green-400"
                                            }`}>
                                            {statusLabel}
                                        </span>
                                        <span className="text-[13px] font-semibold text-white">{k.label}</span>
                                    </div>
                                </div>

                                {/* Key */}
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 text-[13px] font-mono text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg tracking-wider">
                                        {k.key}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(k.key)}
                                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                                    >
                                        {copiedKey === k.key ? (
                                            <CheckCircle2 size={14} className="text-green-400" />
                                        ) : (
                                            <Copy size={14} />
                                        )}
                                    </button>
                                </div>

                                {/* Info Row */}
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Clock size={10} />
                                        Created: {new Date(k.createdAt).toLocaleDateString()}
                                    </span>
                                    {k.expiresAt && (
                                        <span className={`flex items-center gap-1 ${isExpired ? "text-amber-400" : ""}`}>
                                            <Clock size={10} />
                                            Expires: {new Date(k.expiresAt).toLocaleDateString()}
                                        </span>
                                    )}
                                    {!k.expiresAt && (
                                        <span className="text-green-400 flex items-center gap-1">
                                            <CheckCircle2 size={10} />
                                            Never expires
                                        </span>
                                    )}
                                    {k.deviceFingerprint && (
                                        <span className="flex items-center gap-1 text-purple-400">
                                            <Smartphone size={10} />
                                            {k.deviceFingerprint}
                                        </span>
                                    )}
                                    {k.lastUsedAt && (
                                        <span className="flex items-center gap-1">
                                            <Clock size={10} />
                                            Last used: {new Date(k.lastUsedAt).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                                {/* Location Info */}
                                {(k.loginCity || k.loginIP) && (
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2">
                                        {k.loginCity && (
                                            <span className="flex items-center gap-1 text-blue-400">
                                                <MapPin size={10} />
                                                {k.loginCity}{k.loginCountry ? `, ${k.loginCountry}` : ''}
                                            </span>
                                        )}
                                        {k.loginIP && (
                                            <span className="flex items-center gap-1 text-gray-400">
                                                IP: {k.loginIP}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {k.active ? (
                                        <button
                                            onClick={() => handleAction("revoke", k.key, () => revokeKey(k.key))}
                                            disabled={actionLoading === `revoke-${k.key}`}
                                            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[11px] font-semibold hover:bg-red-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                                        >
                                            {actionLoading === `revoke-${k.key}` ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Revoke
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAction("reactivate", k.key, () => reactivateKey(k.key))}
                                            disabled={actionLoading === `reactivate-${k.key}`}
                                            className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-[11px] font-semibold hover:bg-green-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                                        >
                                            {actionLoading === `reactivate-${k.key}` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Reactivate
                                        </button>
                                    )}
                                    {k.deviceFingerprint && (
                                        <button
                                            onClick={() => handleAction("reset", k.key, () => resetDeviceLock(k.key))}
                                            disabled={actionLoading === `reset-${k.key}`}
                                            className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-[11px] font-semibold hover:bg-purple-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                                        >
                                            {actionLoading === `reset-${k.key}` ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Reset Device
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleAction("delete", k.key, () => deleteKey(k.key))}
                                        disabled={actionLoading === `delete-${k.key}`}
                                        className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-[11px] font-semibold hover:bg-red-500/20 hover:text-red-400 transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {actionLoading === `delete-${k.key}` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
