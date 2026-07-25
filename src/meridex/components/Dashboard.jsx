import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Calendar, Activity, Sparkles, Target, TrendingUp,
  Layers, ChevronRight, Radio, Gauge, Newspaper, Zap, Filter, Bell,
} from "lucide-react";
import {
  EVENTS, IMPACT_COLORS, IMPACT_LABELS, INSTRUMENTS, PULSE_METRICS,
  CORRELATIONS, NEWS_FEED,
} from "../data.js";
import Sparkline from "./Sparkline.jsx";
import { useCountdown } from "../hooks.js";

function LiveTimer() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="mx-dash-live-time">
      {now.toLocaleTimeString("en-US", { hour12: false })}
    </span>
  );
}

function MarketCards() {
  return (
    <div className="mx-dash-cards">
      {INSTRUMENTS.map((inst, i) => (
        <motion.div key={inst.sym} className="mx-dash-card"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <div className="mx-dash-card-glow" style={{ background: `radial-gradient(circle at 80% 0%, ${inst.color}15, transparent 60%)` }} />
          <div className="mx-dash-card-top">
            <div className="mx-dash-card-info">
              <span className="mx-dash-sym">{inst.sym}</span>
              <span className="mx-dash-name">{inst.name}</span>
            </div>
            <Sparkline data={inst.spark} color={inst.color} width={88} height={32} />
          </div>
          <div className="mx-dash-card-bottom">
            <span className="mx-dash-price">{inst.price}</span>
            <span className={`mx-dash-change ${inst.up ? "up" : "down"}`}>
              {inst.up ? "▲" : "▼"} {inst.change} <span className="mx-dash-pct">({inst.pct})</span>
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function EventPanel() {
  const upcoming = Object.entries(EVENTS).flatMap(([code, e]) =>
    e.items.map((item) => ({ ...item, country: e.name, flag: e.flag, affects: e.affects }))
  ).sort((a, b) => a.time.localeCompare(b.time));

  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? upcoming : upcoming.filter(e => e.impact === filter);

  return (
    <div className="mx-dash-panel">
      <div className="mx-dash-panel-header">
        <Calendar size={16} /> Upcoming Events
        <span className="mx-dash-panel-live"><span className="mx-dash-live-dot" /> LIVE</span>
      </div>
      <div className="mx-dash-filter-row">
        {["all", "high", "medium", "low"].map((f) => (
          <button key={f} className={`mx-dash-filter ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : IMPACT_LABELS[f].split(" ")[0]}
          </button>
        ))}
      </div>
      <div className="mx-dash-event-list">
        {filtered.slice(0, 8).map((ev, i) => (
          <div key={i} className="mx-dash-event">
            <span className="mx-dash-event-time">{ev.time}</span>
            <div className="mx-dash-event-info">
              <span className="mx-dash-event-name">{ev.name}</span>
              <span className="mx-dash-event-country">{ev.flag} {ev.country}</span>
            </div>
            <span className="mx-dash-event-impact" style={{ color: IMPACT_COLORS[ev.impact] }}>
              <span className="mx-dash-impact-dot" style={{ background: IMPACT_COLORS[ev.impact] }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketPulse() {
  return (
    <div className="mx-dash-pulse">
      <div className="mx-dash-pulse-header"><Activity size={16} /> Market Pulse</div>
      <div className="mx-dash-pulse-bars">
        {PULSE_METRICS.map((b, i) => (
          <div key={i} className="mx-dash-pulse-bar">
            <div className="mx-dash-pulse-bar-top">
              <span className="mx-dash-pulse-label">{b.label}</span>
              <span className="mx-dash-pulse-desc" style={{ color: b.color }}>{b.desc}</span>
            </div>
            <div className="mx-dash-pulse-track">
              <motion.div className="mx-dash-pulse-fill" style={{ background: `linear-gradient(90deg, ${b.color}88, ${b.color})` }}
                initial={{ width: 0 }} animate={{ width: `${b.val}%` }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.9, ease: "easeOut" }}
              />
            </div>
            <span className="mx-dash-pulse-val">{b.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CorrelationMatrix() {
  const cols = [
    { key: "nq", label: "NQ" }, { key: "es", label: "ES" },
    { key: "gold", label: "Gold" }, { key: "dxy", label: "DXY" },
  ];
  const corrColor = (v) => {
    if (v > 0.5) return "rgba(31,206,137,0.85)";
    if (v > 0.2) return "rgba(31,206,137,0.4)";
    if (v > -0.2) return "rgba(160,173,184,0.2)";
    if (v > -0.5) return "rgba(255,159,10,0.4)";
    return "rgba(255,61,90,0.85)";
  };
  return (
    <div className="mx-dash-corr">
      <div className="mx-dash-corr-header"><Layers size={16} /> Event Correlation Matrix</div>
      <div className="mx-dash-corr-table">
        <div className="mx-dash-corr-row mx-dash-corr-headrow">
          <span className="mx-dash-corr-event">Event</span>
          {cols.map((c) => <span key={c.key} className="mx-dash-corr-colhead">{c.label}</span>)}
        </div>
        {CORRELATIONS.map((row, i) => (
          <div key={i} className="mx-dash-corr-row">
            <span className="mx-dash-corr-event">{row.event}</span>
            {cols.map((c) => (
              <span key={c.key} className="mx-dash-corr-cell" style={{ background: corrColor(row[c.key]) }}>
                {row[c.key] > 0 ? "+" : ""}{row[c.key].toFixed(2)}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="mx-dash-corr-legend">
        <span>−1.0</span>
        <div className="mx-dash-corr-gradient" />
        <span>+1.0</span>
      </div>
    </div>
  );
}

function AIBriefing() {
  return (
    <div className="mx-dash-briefing">
      <div className="mx-dash-briefing-header">
        <Sparkles size={16} /> AI Pre-Event Briefing
        <span className="mx-dash-briefing-tag">US CPI m/m</span>
      </div>
      <div className="mx-dash-briefing-countdown">
        <Clock /> Releases in <strong>2h 47m</strong>
      </div>
      <p className="mx-dash-briefing-text">
        NQ futures showing elevated long positioning into CPI. Consensus at 0.3% m/m.
        A hot print (0.4%+) likely triggers a 0.8–1.2% gap down on NQ with flight to
        XAUUSD. A cool print (0.2% or below) favors continuation toward 18,600 resistance.
        Watch the 10Y yield — break above 4.25% confirms risk-off.
      </p>
      <div className="mx-dash-briefing-tags">
        <span className="mx-dash-tag">NQ</span>
        <span className="mx-dash-tag">ES</span>
        <span className="mx-dash-tag">XAUUSD</span>
 <span className="mx-dash-tag">10Y Yield</span>
      </div>
      <button className="mx-btn mx-btn--primary mx-btn--sm mx-dash-briefing-btn">
        Read full briefing <ChevronRight size={14} />
      </button>
    </div>
  );
}

function Clock() {
  return <span className="mx-dash-briefing-clock"><Zap size={13} /></span>;
}

function TradeSetups() {
  return (
    <div className="mx-dash-strategy">
      <div className="mx-dash-strategy-header"><Target size={16} /> Trade Setup Scenarios</div>
      <div className="mx-dash-strategy-grid">
        <div className="mx-dash-strategy-card mx-dash-strategy-card--bull">
          <div className="mx-dash-strategy-label"><TrendingUp size={14} /> Bullish Scenario</div>
          <p>CPI ≤ 0.2% — Long NQ at <strong>18,450</strong>. Target <strong>18,600</strong>. Stop <strong>18,380</strong>.</p>
          <div className="mx-dash-strategy-meta">
            <span className="mx-dash-strategy-rr">R:R 1:2.5</span>
            <span className="mx-dash-strategy-prob">68% confidence</span>
          </div>
        </div>
        <div className="mx-dash-strategy-card mx-dash-strategy-card--bear">
          <div className="mx-dash-strategy-label"><Layers size={14} /> Bearish Scenario</div>
          <p>CPI ≥ 0.4% — Short NQ at <strong>18,450</strong>. Target <strong>18,250</strong>. Stop <strong>18,520</strong>.</p>
          <div className="mx-dash-strategy-meta">
            <span className="mx-dash-strategy-rr">R:R 1:2.0</span>
            <span className="mx-dash-strategy-prob">61% confidence</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewsFeed() {
  return (
    <div className="mx-dash-news">
      <div className="mx-dash-news-header">
        <Newspaper size={16} /> Live News Wire
        <span className="mx-dash-panel-live"><span className="mx-dash-live-dot" /> LIVE</span>
      </div>
      <div className="mx-dash-news-list">
        {NEWS_FEED.map((n, i) => (
          <div key={i} className="mx-dash-news-item">
            <span className="mx-dash-news-time">{n.time}</span>
            <div className="mx-dash-news-body">
              <span className="mx-dash-news-source">{n.source}</span>
              <span className="mx-dash-news-headline">{n.headline}</span>
            </div>
            <span className="mx-dash-news-tag" style={{
              color: IMPACT_COLORS[n.impact],
              background: IMPACT_COLORS[n.impact] + "18",
            }}>{n.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SentimentGauge() {
  const score = 45;
  const angle = (score / 100) * 180 - 90;
  return (
    <div className="mx-dash-gauge">
      <div className="mx-dash-gauge-header"><Gauge size={16} /> Fear & Greed</div>
      <div className="mx-dash-gauge-vis">
        <svg viewBox="0 0 200 110" className="mx-dash-gauge-svg">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,61,90,0.3)" strokeWidth="12" strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 100 20" fill="none" stroke="rgba(255,159,10,0.3)" strokeWidth="12" strokeLinecap="round" />
          <path d="M 100 20 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(31,206,137,0.3)" strokeWidth="12" strokeLinecap="round" />
          <motion.line
            x1="100" y1="100" x2="100" y2="30"
            stroke="#FF9F0A" strokeWidth="3" strokeLinecap="round"
            initial={{ rotate: -90 }}
            animate={{ rotate: angle }}
            transition={{ type: "spring", stiffness: 60, damping: 12 }}
            style={{ transformOrigin: "100px 100px" }}
          />
          <circle cx="100" cy="100" r="6" fill="#FF9F0A" />
        </svg>
        <div className="mx-dash-gauge-readout">
          <span className="mx-dash-gauge-score">{score}</span>
          <span className="mx-dash-gauge-label">Neutral</span>
        </div>
      </div>
      <div className="mx-dash-gauge-scale">
        <span>Extreme Fear</span>
        <span>Extreme Greed</span>
      </div>
    </div>
  );
}

export default function Dashboard({ onBack }) {
  return (
    <motion.div className="mx-dashboard"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
    >
      <div className="mx-dash-header">
        <div className="mx-dash-title">
          <span className="mx-dash-title-mark"><Radio size={18} /></span>
          <h2>Command Centre</h2>
          <span className="mx-dash-badge">LIVE</span>
          <LiveTimer />
        </div>
        <button className="mx-btn mx-btn--ghost mx-btn--sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back to site
        </button>
      </div>

      <div className="mx-dash-grid">
        <MarketCards />
        <EventPanel />
        <div className="mx-dash-row-2">
          <MarketPulse />
          <SentimentGauge />
        </div>
        <CorrelationMatrix />
        <AIBriefing />
        <TradeSetups />
        <NewsFeed />
      </div>
    </motion.div>
  );
}
