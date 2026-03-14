import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import InstallGate from "@/components/InstallGate";
import SplashScreen from "@/components/SplashScreen";
import LoginScreen from "@/screens/LoginScreen";
import AdminPanel from "@/screens/AdminPanel";
import { useState, useCallback, useEffect } from "react";
import { isAuthenticated, isAuthenticatedAsync, clearAuthSession } from "@/lib/auth";
import HomeScreen from "@/screens/HomeScreen";
import SearchScreen from "@/screens/SearchScreen";
import MessagesScreen from "@/screens/MessagesScreen";
import ReelsScreen from "@/screens/ReelsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import AnalyticsScreen from "@/screens/AnalyticsScreen";
import ReelInsightsScreen from "@/screens/ReelInsightsScreen";
import ReelDetailScreen from "@/screens/ReelDetailScreen";
import ViewsDetailScreen from "@/screens/ViewsDetailScreen";
import InteractionsDetailScreen from "@/screens/InteractionsDetailScreen";
import FollowersDetailScreen from "@/screens/FollowersDetailScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Layout wrapper that conditionally shows BottomNav
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const hideBottomNav = location.pathname === "/admin" || location.pathname.startsWith("/reel-insights/");
  return (
    <div className="mx-auto max-w-lg min-h-screen bg-background">
      <AnalyticsTracker />
      {children}
      {!hideBottomNav && <BottomNav />}
    </div>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [authed, setAuthed] = useState(() => isAuthenticated());
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  const handleLoginSuccess = () => {
    setAuthed(true);
  };

  // Verify auth against server periodically
  // If admin deletes/revokes key → user auto-logout within 30 seconds
  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) return; // no session, skip
      isAuthenticatedAsync().then((valid) => {
        if (!valid) {
          clearAuthSession();
          setAuthed(false);
        }
      });
    };

    // Check immediately on load
    checkAuth();

    // Check every 30 seconds
    const interval = setInterval(checkAuth, 30000);

    // Also check when user comes back to the tab
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Admin panel - always accessible (has its own auth) */}
            <Route path="/admin" element={<AdminPanel />} />

            {/* Direct access for APK - No LoginScreen or InstallGate */}
            <Route
              path="*"
              element={
                <>
                  {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
                  {showSplash && <div className="fixed inset-0 z-[9998] bg-white" />}
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<HomeScreen />} />
                      <Route path="/search" element={<SearchScreen />} />
                      <Route path="/create" element={<MessagesScreen />} />
                      <Route path="/reels" element={<ReelsScreen />} />
                      <Route path="/profile" element={<ProfileScreen />} />
                      <Route path="/analytics" element={<AnalyticsScreen />} />
                      <Route path="/analytics/views" element={<ViewsDetailScreen />} />
                      <Route path="/analytics/interactions" element={<InteractionsDetailScreen />} />
                      <Route path="/analytics/followers" element={<FollowersDetailScreen />} />
                      <Route path="/reel-insights/:id" element={<ReelInsightsScreen />} />
                      <Route path="/reel/:id" element={<ReelDetailScreen />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
