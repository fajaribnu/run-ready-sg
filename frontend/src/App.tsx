import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/BottomNav";
import { HomeView } from "./components/HomeView";
import { ShelterView } from "./components/ShelterView";
import { RouteView } from "./components/RouteView";
import { TimeView } from "./components/TimeView";
import { getCurrentPosition, checkRun } from "./services/api";
import { type Tab } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const [runCheckLoading, setRunCheckLoading] = useState(false);
  const [runCheckResult, setRunCheckResult] = useState(null);

  const handleCheckRunNow = async () => {
    setRunCheckLoading(true);

    try {
      const pos = await getCurrentPosition();
      const result = await checkRun(pos.lat, pos.lng);
      setRunCheckResult(result);
    } catch (err) {
      console.error("Failed to check run condition:", err);

      const fallbackLat = 1.35;
      const fallbackLng = 103.82;

      try {
        const result = await checkRun(fallbackLat, fallbackLng);
        setRunCheckResult(result);
      } catch (fallbackErr) {
        console.error("Fallback check also failed:", fallbackErr);
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
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar activeTab={activeTab} />

      <main className="flex-1 px-6 pt-4 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="max-w-2xl mx-auto"
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