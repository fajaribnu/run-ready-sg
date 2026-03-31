import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/BottomNav";
import { HomeView } from "./pages/HomeView";
import { ShelterView } from "./pages/ShelterView";
import { RouteView } from "./pages/RouteView";
import { TimeView } from "./pages/TimeView";
import { checkRun } from "./services/api";
import { useLocation } from "./components/LocationProvider";
import { type Tab } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const [runCheckLoading, setRunCheckLoading] = useState(false);
  const [runCheckResult, setRunCheckResult] = useState<any>(null);

  const { currentUserPos, locationReady, permissionState } = useLocation();

  const handleCheckRunNow = async () => {
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
  };

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
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
        return (
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
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar activeTab={activeTab} />

      <main className="flex-1 overflow-x-hidden px-6 pt-4">
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

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}