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
    if (wbgtValue > 32) {
      return "Heat levels are high. Consider delaying or seeking shelter.";
    }

    return "Conditions look comfortable for outdoor activity.";
  }

  return "No projection available.";
}

function isHeatAlert(data: any) {
  const rawProjection = String(data?.projection || "");
  const projection = rawProjection.toLowerCase();

  const wbgtValue = parseFloat(
    String(data?.wbgt || "").replace("°C", "")
  );

  const mentionsHeat =
    projection.includes("wbgt") ||
    projection.includes("heat") ||
    projection.includes("heat stress");

  return mentionsHeat || (!Number.isNaN(wbgtValue) && wbgtValue > 32);
}

export default function WeatherBentoGrid({ result }) {
  const data = result?.data ?? {};
  const ForecastIcon = getForecastIcon(data?.forecast);
  const heatStressText = getHeatStressText(data);
  const isHeat = isHeatAlert(data);

  return (
    <section className="grid grid-cols-2 gap-4">
    <div
    className={`col-span-2 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] ${
        isHeat ? "bg-orange-100" : "bg-surface-container-lowest"
    }`}
    >
    <div className="flex items-center justify-between">
        {/* LEFT */}
        <div className="space-y-0.5">
        <span
            className={`flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide ${
            isHeat ? "text-on-error-container" : "text-on-surface-variant"
            }`}
        >
            <Thermometer size={14} /> Heat Stress
        </span>

        <h3
            className={`text-2xl font-bold ${
            isHeat ? "text-on-error-container" : "text-on-surface"
            }`}
        >
            {data?.wbgt?.replace("°C", "") || "--"}
            <span className="ml-0.5 text-sm font-medium">°C</span>
        </h3>
        </div>

        {/* SEPARATOR */}
        <div
        className={`h-12 w-1.5 rounded-full flex-shrink-0 ${
            isHeat
            ? "bg-orange-600/50"
            : "bg-secondary-container"
        }`}
        />

        {/* RIGHT */}
        <p
        className={`max-w-[140px] text-right text-xs font-medium leading-snug ${
            isHeat ? "text-on-error-container" : "text-on-surface-variant"
        }`}
        >
        {heatStressText}
        </p>
    </div>
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