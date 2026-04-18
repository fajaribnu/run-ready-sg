import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppAuth } from "./auth/AppAuthProvider";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/BottomNav";
import { LoginRequiredModal } from "./components/LoginRequiredModal";
import { HomeView } from "./pages/HomeView";
import { LandingView } from "./pages/LandingView";
import { ShelterView } from "./pages/ShelterView";
import { RouteView } from "./pages/RouteView";
import { TimeView } from "./pages/TimeView";
import { QuotaModal } from "./components/QuotaModal";
import { checkRun } from "./services/api";
import { useLocation } from "./components/LocationProvider";
import { useGuestQuota } from "./map/useGuestQuota";
import { type Tab } from "./types";

const POST_LOGIN_TAB_KEY = "runready_post_login_tab";

function isTab(value: string | null): value is Tab {
  return value === "home" || value === "shelter" || value === "route" || value === "time";
}

export default function App() {
  const auth = useAppAuth();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [isGuest, setIsGuest] = useState(true);
  const quota = useGuestQuota();
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [runCheckLoading, setRunCheckLoading] = useState(false);
  const [runCheckResult, setRunCheckResult] = useState<any>(null);

  const { currentUserPos, locationReady, permissionState } = useLocation();

  // Helper: open one modal and always close the other
  const openQuotaModal = useCallback(() => {
    setShowLoginModal(false);
    setShowQuotaModal(true);
  }, []);

  const openLoginModal = useCallback(() => {
    setShowQuotaModal(false);
    setShowLoginModal(true);
  }, []);

  // Restore tab after login redirect
  useEffect(() => {
    if (!auth.enabled || !auth.isAuthenticated) {
      return;
    }
    const nextTab = window.sessionStorage.getItem(POST_LOGIN_TAB_KEY);
    if (isTab(nextTab)) {
      setActiveTab(nextTab);
    }
    window.sessionStorage.removeItem(POST_LOGIN_TAB_KEY);
  }, [auth.enabled, auth.isAuthenticated]);

  const handleCheckRunNow = useCallback(async () => {
    setRunCheckLoading(true);
    const lat = currentUserPos?.lat ?? 1.35;
    const lng = currentUserPos?.lng ?? 103.82;
    try {
      const result = await checkRun(lat, lng);
      setRunCheckResult(result);
    } catch (err) {
      console.error("Failed to check run condition:", err);
      if (lat !== 1.35 || lng !== 103.82) {
        try {
          const fallbackResult = await checkRun(1.35, 103.82);
          setRunCheckResult(fallbackResult);
        } catch (fallbackErr) {
          console.error("Fallback check also failed:", fallbackErr);
        }
      }
    } finally {
      setRunCheckLoading(false);
    }
  }, [currentUserPos]);

  /**
   * Returns true if the check was allowed (quota available),
   * false if quota was exhausted (QuotaModal opened instead).
   */
  const handleGuestCheckRunNow = useCallback((): boolean => {
    if (quota.isExhausted) {
      openQuotaModal();
      return false;
    }
    const allowed = quota.consume();
    if (!allowed) {
      openQuotaModal();
      return false;
    }
    handleCheckRunNow();
    return true;
  }, [quota, handleCheckRunNow, openQuotaModal]);

  // Tab switch:
  // - Auth enabled but not authenticated on non-home tab: save tab, show LoginRequiredModal
  // - Guest on non-home tab: blur view + show LoginRequiredModal
  // - Otherwise: switch freely, clear modals
  const handleTabChange = useCallback(
    (tab: Tab) => {
      if (auth.enabled && !auth.isAuthenticated && tab !== "home") {
        window.sessionStorage.setItem(POST_LOGIN_TAB_KEY, tab);
        setActiveTab(tab);
        setShowLoginModal(true);
        return;
      }
      setActiveTab(tab);
    },
    [auth.enabled, auth.isAuthenticated, isGuest, openLoginModal],
  );

  const handleLogin = useCallback(() => {
    setShowLoginModal(false);
    if (!auth.enabled) {
      return;
    }
    void auth.signIn();
  }, [auth.enabled, auth.signIn]);

  const handleSignUp = useCallback(() => {
    setShowLoginModal(false);
    setShowQuotaModal(false);
    if (!auth.enabled) {
      return;
    }
    void auth.signUp();
  }, [auth.enabled, auth.signUp]);

  const handleModalClose = useCallback(() => {
    setShowLoginModal(false);
    setActiveTab("home");
    window.sessionStorage.removeItem(POST_LOGIN_TAB_KEY);
  }, []);

  const handleUpgrade = useCallback(() => {
    setShowQuotaModal(false);
    // TODO: wire to your payments flow
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "home":
        return isGuest ? (
          <LandingView
            loading={runCheckLoading}
            quota={quota}
            onCheckRunNow={handleGuestCheckRunNow}
            onShowQuotaModal={openQuotaModal}
          />
        ) : (
          <HomeView
            onNavigate={setActiveTab}
            loading={runCheckLoading}
            runResult={runCheckResult}
            onCheckRunNow={handleCheckRunNow}
          />
        );
      case "shelter":
        return <ShelterView isGuest={isGuest} onRequireLogin={openLoginModal} />;
      case "route":
        return <RouteView isGuest={isGuest} onRequireLogin={openLoginModal} />;
      case "time":
        return <TimeView isGuest={isGuest} onRequireLogin={openLoginModal} />;
      default:
        return isGuest ? (
          <LandingView
            loading={runCheckLoading}
            quota={quota}
            onCheckRunNow={handleGuestCheckRunNow}
            onShowQuotaModal={openQuotaModal}
          />
        ) : (
          <HomeView
            onNavigate={setActiveTab}
            loading={runCheckLoading}
            runResult={runCheckResult}
            onCheckRunNow={handleCheckRunNow}
          />
        );
    }
  };

  return (
    // Outer shell — never blurred, provides stacking context
    <div className="relative min-h-screen bg-background">
        <TopBar
          activeTab={activeTab}
          authEnabled={auth.enabled}
          isAuthenticated={auth.isAuthenticated}
          userLabel={auth.user?.name ?? auth.user?.email ?? "Runner"}
          onLogin={handleLogin}
        />

        <main className="flex-1 overflow-x-hidden px-6 pt-4">
          {auth.enabled && auth.error && (
            <div className="mx-auto mb-4 max-w-2xl rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
              {auth.error}
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="mx-auto max-w-2xl"
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Spacer so content doesn't sit behind the fixed BottomNav */}
        <div className="h-32" />

      {/* BottomNav — fixed, always floats above everything including blur */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Quota exhausted modal */}
      <QuotaModal
        isOpen={showQuotaModal}
        onClose={() => {
          setShowQuotaModal(false);
          setActiveTab("home");
        }}
        onSignUp={handleSignUp}
        onUpgrade={handleUpgrade}
      />

      {/* Login required modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={handleModalClose}
        onSignUp={handleSignUp}
        onLogin={handleLogin}
      />
    </div>
  );
}