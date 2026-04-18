
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
// import { LoginRequiredModal } from "./components/LoginRequiredModal";
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
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Replace `true` with a real session check when you add auth.
  const [isGuest, setIsGuest] = useState(true);

  const quota = useGuestQuota();

  const [showQuotaModal, setShowQuotaModal] = useState(false);
  // const [showLoginModal, setShowLoginModal] = useState(false);

  const [runCheckLoading, setRunCheckLoading] = useState(false);
  const [runCheckResult, setRunCheckResult] = useState<any>(null);

  const { currentUserPos, locationReady, permissionState } = useLocation();

  // Helper: open one modal and always close the other
  const openQuotaModal = useCallback(() => {
    // setShowLoginModal(false);
    setShowQuotaModal(true);
  }, []);

  // const openLoginModal = useCallback(() => {
  //   setShowQuotaModal(false);
  //   setShowLoginModal(true);
  // }, []);
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

  // Tab switch — always switch route.
  // Guests on non-home tabs: show view blurred + LoginRequiredModal on top.
  const handleTabChange = useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      // if (isGuest && tab !== "home") {
      //   openLoginModal();
      // } else {
        // Switching back to home clears both modals
        setShowQuotaModal(false);
      //   setShowLoginModal(false);
      // }
    },
    [isGuest],
  );
  const handleTabChange = useCallback(
    (tab: Tab) => {
      if (auth.enabled && !auth.isAuthenticated && tab !== "home") {
        window.sessionStorage.setItem(POST_LOGIN_TAB_KEY, tab);
        setShowLoginModal(true);
        return;
      }
      setShowLoginModal(false);
      setActiveTab(tab);
    },
    [auth.enabled, auth.isAuthenticated],
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
    if (!auth.enabled) {
      return;
    }
    void auth.signUp();
  }, [auth.enabled, auth.signUp]);

  const handleModalClose = useCallback(() => {
    setShowLoginModal(false);
    window.sessionStorage.removeItem(POST_LOGIN_TAB_KEY);
  }, []);

  const handleSignUp = useCallback(() => {
    setShowQuotaModal(false);
    // setShowLoginModal(false);
    // TODO: wire to your auth flow, then setIsGuest(false)
  }, []);

  // const handleLogin = useCallback(() => {
  //   setShowLoginModal(false);
  //   // TODO: wire to your auth flow, then setIsGuest(false)
  // }, []);

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
        return <ShelterView />;
      case "route":
        return <RouteView />;
      case "time":
        return <TimeView />;
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

  // Blur the entire page when a guest is on a locked tab
  // const shouldBlur = isGuest && activeTab !== "home";

//   return (
//     // Outer shell — never blurred, provides stacking context
//     <div className="relative min-h-screen bg-background">

//       {/* Page content — blurred as a whole when guest on locked tab */}
//       <div
//         className="flex min-h-screen flex-col transition-all duration-300"
//       >
//         <TopBar activeTab={activeTab} />

//         <main className="flex-1 overflow-x-hidden px-6 pt-4">
//           <AnimatePresence mode="wait">
//             <motion.div
//               key={activeTab}
//               initial={{ opacity: 0, x: 10 }}
//               animate={{ opacity: 1, x: 0 }}
//               exit={{ opacity: 0, x: -10 }}
//               transition={{ duration: 0.2, ease: "easeInOut" }}
//               className="mx-auto max-w-2xl"
//             >
//               {renderTabContent()}
//             </motion.div>
//           </AnimatePresence>
//         </main>

//         {/* Spacer so content doesn't sit behind the fixed BottomNav */}
//         <div className="h-32" />
//       </div>

//       {/* BottomNav — fixed, always floats above everything including blur */}
//       <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

//       {/* Quota exhausted modal */}
//       <QuotaModal
//         isOpen={showQuotaModal}
//         onClose={() => {
//           setShowQuotaModal(false);
//           setActiveTab("home");
//         }}
//         onSignUp={handleSignUp}
//         onUpgrade={handleUpgrade}
//       />

//       {/* Login required modal
//       <LoginRequiredModal
//         isOpen={showLoginModal}
//         onClose={() => {
//           setShowLoginModal(false);
//           setActiveTab("home");
//         }}
//         onSignUp={handleSignUp}
//         onLogin={handleLogin}
//       /> */}
//   if (auth.enabled && auth.isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
//         <div className="max-w-sm rounded-3xl border border-outline-variant/20 bg-surface-container-lowest px-6 py-8 shadow-sm">
//           <p className="font-headline text-2xl font-extrabold tracking-tight text-primary">
//             Checking your session
//           </p>
//           <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
//             Restoring your RunReady access.
//           </p>
//         </div>
//       </div>
//     );
//   }

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="h-32" />

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={handleModalClose}
        onSignUp={handleSignUp}
        onLogin={handleLogin}
      />
    </div>
  );
}
