import React, { useEffect, useRef, useState } from "react";
import { IC, IB, allEvents } from "./data";
import { StatTile } from "./atoms";
import { useLiveFeed } from "./useLiveFeed";
import { TriangleAlert as AlertTriangle, Shield, TrendingUp } from "lucide-react";

const FILTERS = ["all", "high", "medium", "low"];

function fmtSecs(s) {
  if (s == null) return "—";
  if (s < 0) return "past";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function AnimCounter({ value, color, duration = 1500 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return;
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(num * eased * 10) / 10);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <span style={{ color }}>{display}</span>;
}

function DailySessionVerdict() {
  const now = new Date();
  const highImpactToday = allEvents.filter((e) => e.impact === "high").length;
  const volatilityRating = highImpactToday > 3 ? "High" : highImpactToday > 1 ? "Moderate" : "Low";
  const volColor = volatilityRating === "High" ? IC.high : volatilityRating === "Moderate" ? IC.medium : IC.low;

  const keyWindows = [
    { time: "08:30", label: "US CPI", risk: "high" },
    { time: "10:00", label: "Fed Speech", risk: "high" },
    { time: "14:00", label: "Oil Inventory", risk: "medium" },
  ];

  return (
    <div className="mx-verdict-card" data-testid="daily-verdict">
      <div className="mx-verdict-header">
        <div className="mx-verdict-title">
          <Shield size={14} />
          Today's Session Verdict
        </div>
        <div className="mx-verdict-date">{now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
      </div>

      <div className="mx-verdict-body">
        <div className="mx-verdict-vol">
          <div className="mx-verdict-vol-label">Volatility</div>
          <div className="mx-verdict-vol-value" style={{ color: volColor }}>
            <AnimCounter value={volatilityRating === "High" ? 78 : volatilityRating === "Moderate" ? 52 : 28} />
            <span className="mx-verdict-vol-unit">/ 100</span>
          </div>
          <div className="mx-verdict-vol-rating" style={{ color: volColor }}>{volatilityRating}</div>
        </div>

        <div className="mx-verdict-approach">
          <div className="mx-verdict-approach-label">Recommended Approach</div>
          <div className="mx-verdict-approach-value">
            {volatilityRating === "High" ? (
              <>Reduce position sizes. Wait for event clears. Avoid <TrendingUp size={12} /> longs before CPI.</>
            ) : volatilityRating === "Moderate" ? (
              <>Standard sizing. Trail stops on existing positions. Watch Fed speakers.</>
            ) : (
              <>Normal trading conditions. Good day for swing entries.</>
            )}
          </div>
        </div>

        <div className="mx-verdict-windows">
          <div className="mx-verdict-windows-label">
            <AlertTriangle size={12} />
            Time windows to avoid
          </div>
          <div className="mx-verdict-windows-list">
            {keyWindows.slice(0, 3).map((w, i) => (
              <div key={i} className="mx-verdict-window">
                <span className="mx-verdict-window-time" style={{ color: IC[w.risk] }}>{w.time}</span>
                <span className="mx-verdict-window-label">{w.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeftPanel({ timelineFilter, setTimelineFilter, selected, onSelect }) {
  const filteredEvents =
    timelineFilter === "all" ? allEvents : allEvents.filter((e) => e.impact === timelineFilter);
  const feed = useLiveFeed();
  const countdowns = feed?.countdowns ?? {};

  const listRef = useRef(null);

  useEffect(() => {
    if (!selected || !listRef.current) return;
    const target = listRef.current.querySelector(`[data-event-code="${selected}"]`);
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selected]);

  return (
    <section className="mx-col mx-col-left">
      <DailySessionVerdict />

      <div className="mx-card">
        <div className="mx-card-title">Global Overview</div>
        <div className="mx-stats-grid">
          <StatTile label="Live Events" value="84" trend="up" color="#1FCE89" />
          <StatTile label="High Impact" value="15" trend="down" color="#FF3D5A" />
          <StatTile label="Markets Move" value="1.24%" trend="up" color="#FF9F0A" />
          <StatTile label="Volatility" value="22.4" trend="up" color="#A78BFA" />
        </div>
      </div>

      <div className="mx-card mx-card-flex">
        <div className="mx-card-header">
          <div className="mx-card-title">Impact Timeline</div>
          <div className="mx-tabs">
            {FILTERS.map((f) => (
              <button
                key={f}
                data-testid={`timeline-tab-${f}`}
                className={`mx-tab ${timelineFilter === f ? "active" : ""}`}
                onClick={() => setTimelineFilter(f)}
                style={timelineFilter === f && f !== "all" ? { color: IC[f], borderColor: IC[f] } : {}}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="mx-timeline-list" ref={listRef}>
          {filteredEvents.slice(0, 8).map((e, idx) => {
            const isActive = selected === e.code;
            return (
              <button
                key={e.id}
                type="button"
                data-event-code={e.code}
                data-testid={`timeline-${e.id}`}
                className={`mx-timeline-row ${isActive ? "active" : ""}`}
                style={isActive ? { borderColor: IC[e.impact], boxShadow: `inset 3px 0 0 ${IC[e.impact]}` } : {}}
                onClick={() => onSelect(e.code)}
              >
                <div className="mx-tl-time" style={{ color: IC[e.impact] }}>{e.time}</div>
                <span className="mx-tl-flag">{e.flag}</span>
                <div className="mx-tl-info">
                  <div className="mx-tl-name">{e.name}</div>
                  <div className="mx-tl-sub">
                    <span>Forecast: {e.forecast || "—"}</span>
                    <span className="mx-tl-dot">·</span>
                    <span>Previous: {e.prev || "—"}</span>
                  </div>
                </div>
                <div className="mx-tl-right">
                  <span className="mx-pill" style={{ color: IC[e.impact], background: IB[e.impact], borderColor: IC[e.impact] + "55" }}>
                    {e.impact.charAt(0).toUpperCase() + e.impact.slice(1)}
                  </span>
                  <div className="mx-tl-ago">{fmtSecs(countdowns[e.id])}</div>
                </div>
              </button>
            );
          })}
        </div>
        <button className="mx-cta-ghost" data-testid="go-full-calendar">Go to Full Calendar</button>
      </div>
    </section>
  );
}
