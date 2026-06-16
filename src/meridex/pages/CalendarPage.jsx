import React, { useState, useMemo } from "react";
import { IC, IB, allEvents, EVENTS } from "../data";
import { useLiveFeed } from "../useLiveFeed";

const FILTERS = ["all", "high", "medium", "low"];
const COUNTRY_FILTER = ["all", ...Object.keys(EVENTS)];

function fmtCountdown(s) {
  if (s == null) return "—";
  if (s < 0) return "Past";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function CalendarPage() {
  const [impactFilter, setImpactFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const feed = useLiveFeed();
  const countdowns = feed?.countdowns ?? {};

  const rows = useMemo(() => {
    return allEvents.filter((e) => {
      if (impactFilter !== "all" && e.impact !== impactFilter) return false;
      if (countryFilter !== "all" && e.code !== countryFilter) return false;
      return true;
    });
  }, [impactFilter, countryFilter]);

  return (
    <section className="mx-page" data-testid="page-calendar">
      <div className="mx-page-header">
        <div>
          <div className="mx-page-title">Economic Calendar</div>
          <div className="mx-page-sub">All upcoming events with live countdown</div>
        </div>
        <div className="mx-page-actions">
          <div className="mx-tabs">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`mx-tab ${impactFilter === f ? "active" : ""}`}
                onClick={() => setImpactFilter(f)}
                style={impactFilter === f && f !== "all" ? { color: IC[f], borderColor: IC[f] } : {}}
              >
                {f === "all" ? "All" : f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <select
            className="mx-select"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            data-testid="country-filter"
          >
            {COUNTRY_FILTER.map((c) => (
              <option key={c} value={c}>{c === "all" ? "All countries" : `${EVENTS[c].flag} ${EVENTS[c].name}`}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mx-card mx-page-card">
        <table className="mx-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Country</th>
              <th>Event</th>
              <th>Forecast</th>
              <th>Previous</th>
              <th>Impact</th>
              <th>Countdown</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} data-testid={`row-${e.id}`}>
                <td><span className="mx-tl-time" style={{ color: IC[e.impact] }}>{e.time}</span></td>
                <td><span className="mx-tl-flag">{e.flag}</span> {e.country}</td>
                <td>{e.name}</td>
                <td>{e.forecast || "—"}</td>
                <td>{e.prev || "—"}</td>
                <td>
                  <span className="mx-pill" style={{ color: IC[e.impact], background: IB[e.impact], borderColor: IC[e.impact] + "55" }}>
                    {e.impact}
                  </span>
                </td>
                <td className="mx-countdown">{fmtCountdown(countdowns[e.id])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
