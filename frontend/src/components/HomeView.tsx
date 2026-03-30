import { useState } from "react";
import { motion } from "motion/react";
import HomeHero from "./HomeHero";
import RunStatusCard from "./RunStatusCard";
import WeatherBentoGrid from "./WeatherBentoGrid";
import QuickActions from "./QuickActions";
import { getCurrentPosition, checkRun } from "../services/api";

type HomeViewProps = {
  onNavigate: (tab: "home" | "shelter" | "route" | "time") => void;
};

export const HomeView = ({ onNavigate }: HomeViewProps) => {
  const [loading, setLoading] = useState(false);
  const [runResult, setRunResult] = useState(null);

  const onCheckRunNow = async () => {
    setLoading(true);

    try {
      const pos = await getCurrentPosition();

      const result = await checkRun(pos.lat, pos.lng);
      setRunResult(result);
    } catch (err) {
      console.error("Failed to check run condition:", err);

      const fallbackLat = 1.35;
      const fallbackLng = 103.82;

      try {
        const result = await checkRun(fallbackLat, fallbackLng);
        setRunResult(result);
      } catch (fallbackErr) {
        console.error("Fallback check also failed:", fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <HomeHero loading={loading} onCheckRunNow={onCheckRunNow} />

      {runResult && (
        <>
          <RunStatusCard result={runResult} />
          <WeatherBentoGrid result={runResult} />
        </>
      )}

      <QuickActions onNavigate={onNavigate} />
    </motion.div>
  );
};