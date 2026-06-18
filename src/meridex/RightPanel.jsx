import React, { useState } from "react";
import { ArrowUp, ArrowDown, Star, TrendingUp, TrendingDown, Target, Clock, ChartBar as BarChart3, Landmark } from "lucide-react";
import { toast } from "sonner";
import { IC, IB, ASSETS, NEWS, EVENTS } from "./data";
import { Sparkline } from "./atoms";
import { useLivePrices } from "./useLivePrices";
import { useLiveFeed } from "./useLiveFeed";
import { useWatchlist } from "./useAlerts";

const CENTRAL_BANKS = [
  { id: "fed", name: "Federal Reserve", rate: "5.25%", stance: "hawkish", nextMeeting: "Jun 12, 2024", probability: "85% hold" },
  { id: "boe", name: "Bank of England", rate: "5.00%", stance: "hawkish", nextMeeting: "Jun 20, 2024", probability: "70% hold" },
  { id: "ecb", name: "European Central Bank", rate: "4.25%", stance: "neutral", nextMeeting: "Jul 18, 2024", probability: "55% cut" },
  { id: "boj", name: "Bank of Japan", rate: "0.10%", stance: "dovish", nextMeeting: "Jun 14, 2024", probability: "90% hold" },
];

const SURPRISE_REGIONS = [
  { id: "us", name: "United States", score: 72, trend: "up", label: "Beating" },
  { id: "uk", name: "United Kingdom", score: 45, trend: "neutral", label: "Mixed" },
  { id: "ez", name: "Eurozone", score: 38, trend: "down", label: "Missing" },
  { id: "cn", name: "China", score: 55, trend: "up", label: "Mixed" },
  { id: "jp", name: "Japan", score: 61, trend: "up", label: "Beating" },
];

const VOLATILITY_HISTORY = {
  "US-CPI": { avg: 85, bullish: 58, bearish: 42, history: [72, -45, 98, 34, -28, 112, 67, -89, 45, 78, -34, 91] },
  "US-NFP": { avg: 124, bullish: 52, bearish: 48, history: [145, -89, 178, 67, -112, 98, 134, -56, 89, 145, -78, 167] },
  "default": { avg: 45, bullish: 50, bearish: 50, history: [34, -28, 45, 56, -34, 67, 45, -23, 34, 56, -45, 78] },
};

function CentralBankTracker() {
  const stanceColor = (s) => s === "hawkish" ? IC.high : s === "dovish" ? IC.low : IC.medium;

  return (
    <div className="mx-card mx-cb-card" data-testid="central-bank-tracker">
      <div className="mx-card-header">
        <div className="mx-card-title"><Landmark size={14} style={{ marginRight: 6 }} />Central Bank Tracker</div>
      </div>
      <div className="mx-cb-list">
        {CENTRAL_BANKS.map((bank) => (
          <div key={bank.id} className="mx-cb-row">
            <div className="mx-cb-info">
              <div className="mx-cb-name">{bank.name}</div>
              <div className="mx-cb-next">Next: {bank.nextMeeting}</div>
            </div>
            <div className="mx-cb-rate">{bank.rate}</div>
            <div className="mx-cb-stance" style={{ background: `${stanceColor(bank.stance)}15`, color: stanceColor(bank.stance) }}>
              <span className="mx-cb-stance-dot" style={{ background: stanceColor(bank.stance) }} />
              {bank.stance}
            </div>
            <div className="mx-cb-prob">{bank.probability}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EconomicSurpriseIndex() {
  const barColor = (s) => s > 60 ? IC.low : s > 40 ? IC.medium : IC.high;

  return (
    <div className="mx-card mx-surprise-card" data-testid="economic-surprise">
      <div className="mx-card-header">
        <div className="mx-card-title"><BarChart3 size={14} style={{ marginRight: 6 }} />Economic Surprise Index</div>
      </div>
      <div className="mx-surprise-list">
        {SURPRISE_REGIONS.map((region) => (
          <div key={region.id} className="mx-surprise-row">
            <div className="mx-surprise-name">{region.name}</div>
            <div className="mx-surprise-bar-wrap">
              <div className="mx-surprise-bar">
                <div className="mx-surprise-fill" style={{ width: `${region.score}%`, background: barColor(region.score) }} />
              </div>
              <div className="mx-surprise-center" />
            </div>
            <div className="mx-surprise-score" style={{ color: barColor(region.score) }}>{region.score}</div>
          </div>
        ))}
      </div>
      <div className="mx-surprise-legend">
        <span className="mx-surprise-legend-item"><span className="mx-surprise-legend-dot" style={{ background: IC.low }} />Beating</span>
        <span className="mx-surprise-legend-item"><span className="mx-surprise-legend-dot" style={{ background: IC.medium }} />Mixed</span>
        <span className="mx-surprise-legend-item"><span className="mx-surprise-legend-dot" style={{ background: IC.high }} />Missing</span>
      </div>
    </div>
  );
}

function NQESBriefings({ ev }) {
  const eventName = ev?.name || "US CPI";

  return (
    <div className="mx-card mx-briefings-card" data-testid="nq-es-briefings">
      <div className="mx-card-header">
        <div className="mx-card-title"><Target size={14} style={{ marginRight: 6 }} />NQ/ES Pre-event Briefing</div>
        {ev && <span className="mx-briefings-event-tag" style={{ background: IB[ev.impact], color: IC[ev.impact] }}>{ev.flag} {eventName}</span>}
      </div>

      <div className="mx-briefings-scenarios">
        <div className="mx-briefings-scenario bullish">
          <div className="mx-briefings-scenario-head">
            <TrendingUp size={14} />
            <span>Bullish Scenario</span>
          </div>
          <div className="mx-briefings-levels">
            <div className="mx-briefings-level">
              <span className="mx-briefings-label">NQ Entry:</span>
              <span className="mx-briefings-val">18,150-18,250</span>
            </div>
            <div className="mx-briefings-level">
              <span className="mx-briefings-label">ES Entry:</span>
              <span className="mx-briefings-val">5,250-5,300</span>
            </div>
          </div>
          <div className="mx-briefings-target">
            Target: NQ 18,400+ | Stop: 17,900
          </div>
        </div>

        <div className="mx-briefings-scenario bearish">
          <div className="mx-briefings-scenario-head">
            <TrendingDown size={14} />
            <span>Bearish Scenario</span>
          </div>
          <div className="mx-briefings-levels">
            <div className="mx-briefings-level">
              <span className="mx-briefings-label">NQ Entry:</span>
              <span className="mx-briefings-val">17,800-17,900</span>
            </div>
            <div className="mx-briefings-level">
              <span className="mx-briefings-label">ES Entry:</span>
              <span className="mx-briefings-val">5,150-5,200</span>
            </div>
          </div>
          <div className="mx-briefings-target">
            Target: NQ 17,500 | Stop: 18,100
          </div>
        </div>
      </div>

      <div className="mx-briefings-avoid">
        <div className="mx-briefings-avoid-head">
          <Clock size={12} />
          Time windows to avoid
        </div>
        <div className="mx-briefings-avoid-times">
          <span className="mx-briefings-avoid-time">08:25-08:45</span>
          <span className="mx-briefings-avoid-time">09:55-10:15</span>
        </div>
      </div>

      <div className="mx-briefings-affected">
        <span className="mx-briefings-affected-label">Markets affected:</span>
        <span className="mx-briefings-affected-assets">NQ, ES, EURUSD, XAUUSD, TNX</span>
      </div>
    </div>
  );
}

function VolatilityHistory({ eventId, onClose }) {
  const data = VOLATILITY_HISTORY[eventId] || VOLATILITY_HISTORY["default"];
  const maxAbs = Math.max(...data.history.map(Math.abs));

  return (
    <div className="mx-card mx-vol-history" data-testid="volatility-history">
      <div className="mx-card-header">
        <div className="mx-card-title">NQ Volatility History</div>
        <button className="mx-close" onClick={onClose}>×</button>
      </div>

      <div className="mx-vol-stats">
        <div className="mx-vol-stat">
          <span className="mx-vol-stat-label">Avg Move</span>
          <span className="mx-vol-stat-value">{data.avg} pts</span>
        </div>
        <div className="mx-vol-stat">
          <span className="mx-vol-stat-label">Bullish</span>
          <span className="mx-vol-stat-value" style={{ color: IC.low }}>{data.bullish}%</span>
        </div>
        <div className="mx-vol-stat">
          <span className="mx-vol-stat-label">Bearish</span>
          <span className="mx-vol-stat-value" style={{ color: IC.high }}>{data.bearish}%</span>
        </div>
      </div>

      <div className="mx-vol-chart">
        {data.history.map((val, i) => {
          const height = Math.abs(val) / maxAbs * 100;
          const isUp = val > 0;
          return (
            <div key={i} className="mx-vol-bar-wrap">
              <div
                className="mx-vol-bar"
                style={{
                  height: `${height}%`,
                  background: isUp ? IC.low : IC.high,
                  boxShadow: `0 0 4px ${isUp ? IC.low : IC.high}`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mx-vol-chart-label">Last 12 releases (NQ points)</div>
    </div>
  );
}

function EventDetail({ ev, onClose }) {
  return (
    <div className="mx-card mx-event-detail" data-testid="event-detail">
      <div className="mx-card-header">
        <div className="mx-card-title">
          <span style={{ marginRight: 8 }}>{ev.flag}</span>
          {ev.name}
        </div>
        <button className="mx-close" onClick={onClose} data-testid="close-event-detail">×</button>
      </div>
      {ev.items.map((it) => (
        <div key={`${it.time}-${it.name}`} className="mx-event-item">
          <div className="mx-event-head">
            <span className="mx-event-name">{it.name}</span>
            <span className="mx-pill" style={{ color: IC[it.impact], background: IB[it.impact], borderColor: IC[it.impact] + "55" }}>
              {it.impact}
            </span>
          </div>
          <div className="mx-event-time" style={{ color: IC[it.impact] }}>{it.time} GMT</div>
          {it.forecast && (
            <div className="mx-event-meta">
              <span>Prev: <b>{it.prev}</b></span>
              <span>Forecast: <b>{it.forecast}</b></span>
            </div>
          )}
          <div className="mx-event-desc">{it.desc}</div>
        </div>
      ))}
    </div>
  );
}

export function RightPanel({ selected, onClearSelection }) {
  const ev = selected ? EVENTS[selected] : null;
  const live = useLivePrices();
  const feed = useLiveFeed();
  const news = feed?.news?.length ? feed.news.slice(0, 4) : NEWS;
  const { add, remove, items, has } = useWatchlist();
  const [showVolHistory, setShowVolHistory] = useState(false);

  const toggleWatch = async (kind, ref, label) => {
    const existing = items.find((i) => i.kind === kind && i.ref === ref);
    if (existing) {
      await remove(existing.id);
      toast(`${label} removed from watchlist`);
    } else {
      await add(kind, ref);
      toast.success(`${label} pinned to watchlist`);
    }
  };

  return (
    <section className="mx-col mx-col-right">
      <CentralBankTracker />
      <NQESBriefings ev={ev} />
      <EconomicSurpriseIndex />

      {ev && ev.impact === "high" && (
        showVolHistory ? (
          <VolatilityHistory eventId={selected} onClose={() => setShowVolHistory(false)} />
        ) : (
          <button className="mx-cta-ghost" onClick={() => setShowVolHistory(true)}>
            <BarChart3 size={12} style={{ marginRight: 6 }} />View NQ Volatility History
          </button>
        )
      )}

      <div className="mx-card mx-market-card">
        <div className="mx-card-title">
          <span>
            Market Reactions
            <span className={`mx-ws-dot ${live ? "live" : ""}`} title={live ? "Live" : "Connecting…"} />
          </span>
          {ev && (
            <span className="mx-impact-tag" style={{ color: IC[ev.impact], borderColor: IC[ev.impact] + "55" }}>
              <span className="mx-impact-tag-pulse" style={{ background: IC[ev.impact] }} />
              {ev.flag} {ev.name}
            </span>
          )}
        </div>
        <div className="mx-assets">
          {ASSETS.map((a) => {
            const affected = ev?.affects?.includes(a.id);
            const pinned = has("asset", a.id);
            const tick = live?.[a.id];
            const val = tick?.val ?? a.val;
            const chg = tick?.chg ?? a.chg;
            const up = tick != null ? tick.up : a.up;
            const spark = tick?.spark ?? a.spark;
            const tickDir = tick?.tickDir ?? 0;
            const flashClass = tickDir > 0 ? "tick-up" : tickDir < 0 ? "tick-down" : "";
            const sparkColor = affected ? IC[ev.impact] : pinned ? "#FF9F0A" : (up ? IC.low : IC.high);
            return (
              <div
                key={a.id}
                className={`mx-asset-row ${affected ? "affected" : ""} ${pinned ? "pinned" : ""}`}
                data-testid={`asset-${a.id}`}
                style={affected ? { "--affect-color": IC[ev.impact] } : {}}
              >
                {affected && <span className="mx-asset-pulse" style={{ background: IC[ev.impact] }} />}
                <button
                  className="mx-star-btn"
                  onClick={() => toggleWatch("asset", a.id, a.name)}
                  aria-label={pinned ? "Unpin" : "Pin to watchlist"}
                  data-testid={`star-${a.id}`}
                >
                  <Star size={12} fill={pinned ? IC.medium : "transparent"} color={pinned ? IC.medium : "var(--text-soft)"} />
                </button>
                <div className="mx-asset-name">{a.name}</div>
                <Sparkline data={spark} color={sparkColor} />
                <div
                  key={`val-${tick?.tickKey ?? 0}`}
                  className={`mx-asset-val ${flashClass}`}
                >
                  {val}
                </div>
                <div className="mx-asset-chg" style={{ color: up ? IC.low : IC.high }}>
                  {tickDir > 0 && <ArrowUp size={9} style={{ verticalAlign: "middle", marginRight: 2 }} />}
                  {tickDir < 0 && <ArrowDown size={9} style={{ verticalAlign: "middle", marginRight: 2 }} />}
                  {chg}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-card">
        <div className="mx-card-header">
          <div className="mx-card-title">
            News Feed
            <span className={`mx-ws-dot ${feed ? "live" : ""}`} style={{ marginLeft: 8 }} />
          </div>
          <button className="mx-link" data-testid="news-view-all">View all</button>
        </div>
        <div className="mx-news">
          {news.map((n) => (
            <div key={n.id} className="mx-news-row" data-testid={`news-${n.id}`}>
              <div className="mx-news-time">{n.time}</div>
              <div className="mx-news-text">{n.text}</div>
            </div>
          ))}
        </div>
      </div>

      {ev && <EventDetail ev={ev} onClose={onClearSelection} />}
    </section>
  );
}
