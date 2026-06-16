import React, { useEffect, useRef } from "react";
import { IC, IB, allEvents } from "./data";
import { StatTile } from "./atoms";
import { useLiveFeed } from "./useLiveFeed";

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

export function LeftPanel({ timelineFilter, setTimelineFilter, selected, onSelect }) {
  const filteredEvents =
    timelineFilter === "all" ? allEvents : allEvents.filter((e) => e.impact === timelineFilter);
  const feed = useLiveFeed();
  const countdowns = feed?.countdowns ?? {};

  const listRef = useRef(null);

  // When `selected` changes (e.g. a globe marker was clicked),
  // scroll the first matching timeline row into view.
  useEffect(() => {
    if (!selected || !listRef.current) return;
    const target = listRef.current.querySelector(`[data-event-code="${selected}"]`);
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selected]);

  return (
    <section className="mx-col mx-col-left">
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
