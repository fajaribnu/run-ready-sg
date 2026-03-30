import {
  Thermometer,
  CloudSun,
  Sun,
  CloudRain,
  CloudLightning,
} from "lucide-react";

function getForecastIcon(forecast?: string) {
  const text = (forecast || "").toLowerCase();

  const hasThunder =
    text.includes("thunder") || text.includes("lightning");
  const hasRain =
    text.includes("rain") ||
    text.includes("shower") ||
    text.includes("drizzle");
  const isSunny =
    text.includes("sunny") && !text.includes("cloud");

  if (hasThunder && hasRain) return CloudLightning;
  if (hasThunder) return CloudLightning;
  if (hasRain) return CloudRain;
  if (isSunny) return Sun;

  return CloudSun;
}

function getHeatStressText(data: any) {
  const rawProjection = data?.projection || "";
  const projection = rawProjection.toLowerCase();

  const wbgtValue = parseFloat(
    String(data?.wbgt || "").replace("°C", "")
  );

  const mentionsHeat =
    projection.includes("wbgt") ||
    projection.includes("heat") ||
    projection.includes("heat stress");

  if (mentionsHeat && rawProjection) {
    return rawProjection;
  }

  if (!Number.isNaN(wbgtValue)) {
    if (wbgtValue >= 32) {
      return "Heat levels are high. Consider delaying or seeking shelter.";
    }

    if (wbgtValue >= 28) {
      return "Moderate heat. Stay hydrated and take breaks.";
    }

    return "Conditions look comfortable for outdoor activity.";
  }

  return "No projection available.";
}

export default function WeatherBentoGrid({ result }) {
  const data = result?.data ?? {};
  const ForecastIcon = getForecastIcon(data?.forecast);
  const heatStressText = getHeatStressText(data);

  return (
    <section className="grid grid-cols-2 gap-4">
      <div className="col-span-2 flex items-center justify-between rounded-2xl bg-surface-container-lowest p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="space-y-1">
          <span className="flex items-center gap-1 text-sm font-medium uppercase tracking-wider text-on-surface-variant">
            <Thermometer size={16} /> Heat Stress
          </span>
          <h3 className="text-4xl font-bold text-on-surface">
            {data?.wbgt?.replace("°C", "") || "--"}
            <span className="text-xl font-medium">°C</span>
          </h3>
        </div>

        <div className="h-12 w-1.5 rounded-full bg-secondary-container"></div>

        <p className="max-w-[220px] text-sm font-medium text-on-surface-variant leading-snug text-left">
            {heatStressText}
        </p>
      </div>

      <div className="space-y-2 rounded-2xl bg-surface-container-low p-6">
        <Thermometer size={24} className="text-primary" />
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Temp
          </span>
          <span className="text-2xl font-bold text-on-surface">
            {data?.temperature || "--"}
          </span>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl bg-surface-container-low p-6">
        <ForecastIcon size={24} className="text-primary-container" />
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Forecast
          </span>
          <span className="text-base font-bold text-on-surface">
            {data?.forecast || "--"}
          </span>
        </div>
      </div>
    </section>
  );
}