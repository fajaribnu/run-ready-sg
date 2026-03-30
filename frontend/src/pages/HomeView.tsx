import { motion } from "motion/react";
import HomeHero from "../components/CheckRun";
import RunStatusCard from "../components/RunStatusCard";
import WeatherBentoGrid from "../components/WeatherBentoGrid";
import QuickActions from "../components/QuickActions";
import { type Tab } from "../types";

type HomeViewProps = {
  onNavigate: (tab: Tab) => void;
  loading: boolean;
  runResult: any;
  onCheckRunNow: () => void;
};

export const HomeView = ({
  onNavigate,
  loading,
  runResult,
  onCheckRunNow,
}: HomeViewProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <HomeHero
        loading={loading}
        hasChecked={!!runResult}
        onCheckRunNow={onCheckRunNow}
      />

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