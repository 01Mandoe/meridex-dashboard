import React, { useMemo } from "react";
import { Clock, Target, MapPin, Zap, Users } from "lucide-react";
import { IC } from "./data";
import { useMeridexGlobe } from "./useMeridexGlobe";
import { useWatchlist } from "./useAlerts";
import { BottomStat } from "./atoms";

const LEGEND = ["high", "medium", "low"];

export function CenterPanel({ now, onMarkerClick, selectedCode }) {
  const { items: watchlist } = useWatchlist();
  const pinnedCountries = useMemo(
    () => watchlist.filter((i) => i.kind === "event").map((i) => i.ref),
    [watchlist]
  );
  const { containerRef, loaded } = useMeridexGlobe(onMarkerClick, selectedCode, pinnedCountries);
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().slice(11, 16);

  return (
    <section className="mx-col mx-col-center">
      <div className="mx-globe-card">
        <div className="mx-globe-topbar">
          <div className="mx-time-chip">{dateStr} {timeStr} (UTC)</div>
          <div className="mx-live"><span className="mx-live-dot" />Live</div>
        </div>

        <div className="mx-globe-wrap">
          <div className="mx-globe-glow" />
          <div ref={containerRef} className="mx-globe" data-testid="globe" />
          {!loaded && (
            <div className="mx-globe-loader">
              <div className="mx-loader-text">Meri<span style={{ color: "#00E5C7" }}>dex</span></div>
              <div className="mx-loader-sub">Initializing globe…</div>
            </div>
          )}
        </div>

        <div className="mx-globe-legend">
          {LEGEND.map((i) => (
            <div key={i} className="mx-legend-item">
              <span className="mx-legend-dot" style={{ background: IC[i], boxShadow: `0 0 10px ${IC[i]}` }} />
              <span>{i.charAt(0).toUpperCase() + i.slice(1)} Impact</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-bottom-stats">
        <BottomStat Icon={Clock} value="24/7" label="Monitoring" />
        <BottomStat Icon={Target} value="98.7%" label="Accuracy" />
        <BottomStat Icon={MapPin} value="195+" label="Countries" />
        <BottomStat Icon={Zap} value="2.4s" label="Avg. Response" />
        <BottomStat Icon={Users} value="10K+" label="Active Users" />
      </div>
    </section>
  );
}
