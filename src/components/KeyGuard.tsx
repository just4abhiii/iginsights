import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getDeviceFingerprint, clearAuthSession, getAuthSession } from "@/lib/auth";

export default function KeyGuard({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const [isValidating, setIsValidating] = useState(true);

    const checkKey = useCallback(async () => {
        const session = getAuthSession();
        if (!session) {
            clearAuthSession();
            navigate("/");
            return;
        }

        try {
            const deviceFingerprint = getDeviceFingerprint();
            const res = await fetch("/api/check-key-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: session.key,
                    deviceFingerprint
                })
            });

            if (!res.ok) {
                // Fail closed
                clearAuthSession();
                navigate("/");
            } else {
                setIsValidating(false);
            }
        } catch (err) {
            // Fail closed on network drop or server error
            clearAuthSession();
            navigate("/");
        }
    }, [navigate]);

    useEffect(() => {
        checkKey();

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                checkKey();
            }
        };

        const interval = setInterval(checkKey, 30000); // Check every 30s

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [checkKey]);

    if (isValidating) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-[9999]">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return <>{children}</>;
}
