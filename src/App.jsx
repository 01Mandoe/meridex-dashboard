import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, AlertTriangle, Eye, Bell, Users, Shield,
  BarChart3, Globe2, Zap, TrendingUp, Calendar, Newspaper, Sparkles,
  Activity, DollarSign, Clock, ChevronRight, X,
} from "lucide-react";
import { EVENTS, MARKERS, IMPACT_COLORS, IMPACT_LABELS } from "./meridex/data.js";
import DigitalGlobe from "./meridex/components/DigitalGlobe.jsx";

/* ═══ NAVBAR ═══ */
function Navbar({ onEnter, inDashboard }) {
  return (
    <nav className="mx-nav">
      <div className="mx-nav-brand">
        <div className="mx-nav-mark"><Globe2 size={18} /></div>
        <span className="mx-nav-text">Meri<span>dex</span></span>
      </div>
      <div className="mx-nav-links">
        <a href="#features" className="mx-nav-link--active">Features</a>
        <a href="#calendar">Calendar</a>
        <a href="#markets">Markets</a>
        <a href="#pricing">Pricing</a>
      </div>
      <div className="mx-nav-actions">
        <button className="mx-btn mx-btn--ghost mx-btn--sm">Login</button>
        <button className="mx-btn mx-btn--primary mx-btn--sm" onClick={onEnter}>
          {inDashboard ? "Back to Site" : "Get Started"}
        </button>
      </div>
    </nav>
  );
}

/* ═══ COUNTDOWN ═══ */
function useCountdown(targetHours) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const target = Date.now() + targetHours * 3600000;
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetHours]);
  return time;
}

function CountdownBanner() {
  const t = useCountdown(3.23);
  const blocks = [
    { label: "Days", value: String(t.d).padStart(2, "0") },
    { label: "Hours", value: String(t.h).padStart(2, "0") },
    { label: "Minutes", value: String(t.m).padStart(2, "0") },
    { label: "Seconds", value: String(t.s).padStart(2, "0") },
  ];
  return (
    <div className="mx-countdown">
      <div className="mx-countdown-left">
        <AlertTriangle size={14} className="mx-countdown-icon" />
        <span>Next high impact event: <strong>US CPI m/m</strong> in</span>
        <div className="mx-countdown-blocks">
          {blocks.map((b) => (
            <div key={b.label} className="mx-countdown-block">
              <span className="mx-countdown-num">{b.value}</span>
              <span className="mx-countdown-label">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-countdown-pill">Today: 5 High Impact Events</div>
    </div>
  );
}

/* ═══ ACTIVITY FEED ═══ */
function ActivityFeed() {
  const messages = [
    { icon: Eye, text: "A trader in London just checked US CPI briefing" },
    { icon: Bell, text: "New: Pre-event NQ briefing for US CPI published" },
    { icon: Users, text: "847 traders are viewing the dashboard right now" },
    { icon: Bell, text: "New high impact alert: Fed Chair Powell in 2h 14m" },
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), 3500);
    return () => clearInterval(id);
  }, [messages.length]);
  const Icon = messages[idx].icon;
  return (
    <div className="mx-activity">
      <div className="mx-activity-header">
        <span className="mx-activity-dot" /> Live Activity
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx} className="mx-activity-item"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Icon size={13} className="mx-activity-icon" />{messages[idx].text}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ═══ FLOATING PILLS ═══ */
function FloatingPills() {
  const pills = [
    { icon: Globe2, num: "195+", label: "Countries", delay: 0 },
    { icon: Zap, num: "14", label: "Events Today", delay: 1.3 },
    { icon: BarChart3, num: "847", label: "Active Now", delay: 2.6 },
  ];
  return (
    <div className="mx-stat-pills">
      {pills.map((p, i) => {
        const Icon = p.icon;
        return (
          <div key={i} className="mx-stat-pill" style={{ animationDelay: `${p.delay}s` }}>
            <Icon size={16} className="mx-stat-pill-icon" />
            <div className="mx-stat-pill-text">
              <span className="mx-stat-pill-num">{p.num}</span>
              <span className="mx-stat-pill-label">{p.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══ SCROLL CUE ═══ */
function ScrollCue() {
  return (
    <div className="mx-scroll-cue">
      <span>Scroll</span>
      <div className="mx-scroll-cue-track">
        <motion.div className="mx-scroll-cue-dot"
          animate={{ y: [0, 18, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

/* ═══ HERO ═══ */
function Hero({ onEnter }) {
  return (
    <section className="mx-section mx-hero">
      <div className="mx-dot-grid" />
      <FloatingPills />
      <div className="mx-hero-content">
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mx-eyebrow">
            <span className="mx-eyebrow-dot" /> Global Economic Intelligence
          </div>
          <h1 className="mx-headline">
            Markets move fast.<br />
            <span className="mx-headline-accent">We move faster.</span>
          </h1>
          <p className="mx-subtitle">
            The only platform built specifically for NQ and ES futures traders.
            Economic events, central bank intelligence, and pre-event price briefings —
            all in one command centre.
          </p>
          <p className="mx-hint">Try it — click any marker on the globe.</p>
          <div className="mx-btns">
            <button className="mx-btn mx-btn--primary mx-btn--arrow mx-btn--hero" onClick={onEnter}>
              Enter Meridex <ArrowRight size={16} className="mx-btn-arrow-icon" />
            </button>
            <a href="#features" className="mx-btn mx-btn--ghost mx-btn--ghost-teal">
              See how it works
            </a>
          </div>
          <div className="mx-trust-row">
            <div className="mx-trust-item"><span className="mx-trust-dot" /> Live data</div>
            <span className="mx-trust-sep" />
            <div className="mx-trust-item"><Shield size={14} /> Used by 10K+ traders</div>
            <span className="mx-trust-sep" />
            <div className="mx-trust-item"><BarChart3 size={14} /> 195 countries tracked</div>
          </div>
        </motion.div>
      </div>
      <ActivityFeed />
      <ScrollCue />
    </section>
  );
}

/* ═══ MARKER POPUP ═══ */
function MarkerPopup({ marker, onClose, onEnter }) {
  return (
    <motion.div className="mx-marker-popup"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.25 }}
    >
      <div className="mx-popup-header">
        <span className="mx-popup-flag">{marker.flag}</span>
        <span className="mx-popup-name">{marker.name}</span>
        <span className="mx-popup-impact" style={{ color: IMPACT_COLORS[marker.impact], background: IMPACT_COLORS[marker.impact] + "22" }}>
          {IMPACT_LABELS[marker.impact]}
        </span>
        <button className="mx-popup-close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="mx-popup-events">
        {marker.items.map((item, i) => (
          <div key={i} className="mx-popup-event">
            <span className="mx-popup-time">{item.time}</span>
            <span className="mx-popup-event-name">{item.name}</span>
            <span className="mx-popup-event-fc">{item.forecast || "—"}</span>
          </div>
        ))}
      </div>
      <div className="mx-popup-affects">
        <span>Affects:</span>
        {marker.affects.map((s) => (
          <span key={s} className="mx-popup-affect-pill">{s}</span>
        ))}
      </div>
      <button className="mx-btn mx-btn--primary mx-btn--sm mx-popup-enter" onClick={onEnter}>
        View in Meridex <ArrowRight size={13} />
      </button>
    </motion.div>
  );
}

/* ═══ FEATURES ═══ */
function Features() {
  const features = [
    { icon: Calendar, title: "Economic Calendar", desc: "Every high-impact event across 195 countries, filtered for NQ and ES relevance." },
    { icon: Newspaper, title: "Pre-Event Briefings", desc: "AI-generated price action briefings published before each major event." },
    { icon: TrendingUp, title: "Live Market Impact", desc: "Real-time correlation between events and NQ, ES, gold, and FX movements." },
    { icon: Sparkles, title: "Central Bank Watch", desc: "Track every central bank stance, speech, and rate decision in one place." },
  ];
  return (
    <section className="mx-section mx-features" id="features">
      <div className="mx-section-inner">
        <div className="mx-section-label">Features</div>
        <h2 className="mx-section-title">Everything you need to trade the news</h2>
        <div className="mx-features-grid">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={i} className="mx-feature-card"
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="mx-feature-icon"><Icon size={24} /></div>
                <h3 className="mx-feature-title">{f.title}</h3>
                <p className="mx-feature-desc">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══ CALENDAR PREVIEW ═══ */
function CalendarPreview() {
  const rows = Object.entries(EVENTS).flatMap(([code, e]) =>
    e.items.map((item) => ({ ...item, country: e.name, flag: e.flag, code }))
  ).slice(0, 8);
  return (
    <section className="mx-section mx-calendar" id="calendar">
      <div className="mx-section-inner">
        <div className="mx-section-label">Calendar</div>
        <h2 className="mx-section-title">Today's high-impact events</h2>
        <div className="mx-cal-table">
          <div className="mx-cal-header">
            <span>Time</span><span>Event</span><span>Country</span><span>Impact</span><span>Forecast</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="mx-cal-row">
              <span className="mx-cal-time">{r.time}</span>
              <span className="mx-cal-name">{r.name}</span>
              <span className="mx-cal-country">{r.flag} {r.country}</span>
              <span className="mx-cal-impact" style={{ color: IMPACT_COLORS[r.impact], background: IMPACT_COLORS[r.impact] + "22" }}>
                {r.impact}
              </span>
              <span className="mx-cal-forecast">{r.forecast || "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ CTA ═══ */
function CTA({ onEnter }) {
  return (
    <section className="mx-section mx-cta" id="pricing">
      <div className="mx-section-inner">
        <h2 className="mx-section-title">Start trading smarter today</h2>
        <p className="mx-section-sub">Join 10,000+ futures traders using Meridex to stay ahead of the market.</p>
        <button className="mx-btn mx-btn--primary mx-btn--arrow mx-btn--hero" onClick={onEnter}>
          Enter Meridex <ArrowRight size={16} className="mx-btn-arrow-icon" />
        </button>
      </div>
    </section>
  );
}

/* ═══ FOOTER ═══ */
function Footer() {
  return (
    <footer className="mx-footer">
      <div className="mx-footer-inner">
        <div className="mx-footer-brand"><Globe2 size={18} /><span>Meridex</span></div>
        <div className="mx-footer-links">
          <a href="#features">Features</a><a href="#calendar">Calendar</a><a href="#pricing">Pricing</a>
        </div>
        <div className="mx-footer-copy">© 2025 Meridex. All rights reserved.</div>
      </div>
    </footer>
  );
}

/* ═══ DASHBOARD PREVIEW (the surprise) ═══ */
function Sparkline({ data, color, up }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="mx-spark" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function DashboardPreview({ onBack }) {
  const instruments = [
    { sym: "NQ", name: "Nasdaq 100", price: "18,427.50", change: "+127.30", pct: "+0.70%", up: true, data: [30, 32, 28, 35, 40, 38, 42, 45, 43, 48, 52, 55], color: "#00C9A7" },
    { sym: "ES", name: "S&P 500", price: "5,234.75", change: "+18.40", pct: "+0.35%", up: true, data: [50, 48, 52, 49, 53, 51, 54, 56, 55, 57, 58, 60], color: "#00C9A7" },
    { sym: "XAUUSD", name: "Gold", price: "2,341.20", change: "-8.50", pct: "-0.36%", up: false, data: [60, 58, 59, 55, 52, 54, 50, 48, 49, 45, 43, 42], color: "#FF9F0A" },
    { sym: "EURUSD", name: "Euro / USD", price: "1.0852", change: "+0.0012", pct: "+0.11%", up: true, data: [40, 41, 39, 42, 44, 43, 45, 44, 46, 47, 45, 48], color: "#00C9A7" },
  ];

  const upcomingEvents = Object.entries(EVENTS).flatMap(([code, e]) =>
    e.items.map((item) => ({ ...item, country: e.name, flag: e.flag, affects: e.affects }))
  ).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 6);

  return (
    <motion.div className="mx-dashboard"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
    >
      <div className="mx-dash-header">
        <div className="mx-dash-title">
          <Globe2 size={20} className="mx-dash-title-icon" />
          <h2>Meridex Dashboard</h2>
          <span className="mx-dash-badge">LIVE PREVIEW</span>
        </div>
        <button className="mx-btn mx-btn--ghost mx-btn--sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back to site
        </button>
      </div>

      <div className="mx-dash-grid">
        {/* Market cards */}
        <div className="mx-dash-cards">
          {instruments.map((inst, i) => (
            <motion.div key={inst.sym} className="mx-dash-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="mx-dash-card-top">
                <div>
                  <span className="mx-dash-sym">{inst.sym}</span>
                  <span className="mx-dash-name">{inst.name}</span>
                </div>
                <Sparkline data={inst.data} color={inst.color} up={inst.up} />
              </div>
              <div className="mx-dash-card-bottom">
                <span className="mx-dash-price">{inst.price}</span>
                <span className={`mx-dash-change ${inst.up ? "up" : "down"}`}>
                  {inst.change} ({inst.pct})
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Upcoming events panel */}
        <motion.div className="mx-dash-panel"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mx-dash-panel-header">
            <Calendar size={16} /> Upcoming Events
            <span className="mx-dash-panel-live"><span className="mx-dash-live-dot" /> LIVE</span>
          </div>
          {upcomingEvents.map((ev, i) => (
            <div key={i} className="mx-dash-event">
              <span className="mx-dash-event-time">{ev.time}</span>
              <div className="mx-dash-event-info">
                <span className="mx-dash-event-name">{ev.name}</span>
                <span className="mx-dash-event-country">{ev.flag} {ev.country}</span>
              </div>
              <span className="mx-dash-event-impact" style={{ color: IMPACT_COLORS[ev.impact] }}>
                <span className="mx-dash-impact-dot" style={{ background: IMPACT_COLORS[ev.impact] }} />
                {ev.impact}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Market pulse bar */}
        <motion.div className="mx-dash-pulse"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="mx-dash-pulse-header">
            <Activity size={16} /> Market Pulse
          </div>
          <div className="mx-dash-pulse-bars">
            {[
              { label: "Volatility", val: 78, color: "#FF3D5A" },
              { label: "Momentum", val: 62, color: "#00C9A7" },
              { label: "Fear / Greed", val: 45, color: "#FF9F0A" },
              { label: "Liquidity", val: 84, color: "#1FCE89" },
            ].map((b, i) => (
              <div key={i} className="mx-dash-pulse-bar">
                <span className="mx-dash-pulse-label">{b.label}</span>
                <div className="mx-dash-pulse-track">
                  <motion.div className="mx-dash-pulse-fill"
                    style={{ background: b.color }}
                    initial={{ width: 0 }} animate={{ width: `${b.val}%` }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                  />
                </div>
                <span className="mx-dash-pulse-val">{b.val}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI Briefing card */}
        <motion.div className="mx-dash-briefing"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="mx-dash-briefing-header">
            <Sparkles size={16} /> AI Pre-Event Briefing
            <span className="mx-dash-briefing-tag">US CPI m/m</span>
          </div>
          <p className="mx-dash-briefing-text">
            NQ futures showing elevated long positioning into CPI. Consensus at 0.3% m/m.
            A hot print (0.4%+) likely triggers a 0.8-1.2% gap down on NQ with flight to
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
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ═══ MAIN APP ═══ */
export default function App() {
  const [view, setView] = useState("landing");
  const [popupMarker, setPopupMarker] = useState(null);

  const handleEnter = useCallback(() => {
    setPopupMarker(null);
    setView("dashboard");
    window.scrollTo(0, 0);
  }, []);

  const handleBack = useCallback(() => {
    setView("landing");
    window.scrollTo(0, 0);
  }, []);

  const handleMarkerClick = useCallback((m) => setPopupMarker(m), []);

  return (
    <div className="mx-app">
      <Navbar onEnter={view === "dashboard" ? handleBack : handleEnter} inDashboard={view === "dashboard"} />
      {view === "landing" && <CountdownBanner />}

      <AnimatePresence mode="wait">
        {view === "landing" ? (
          <motion.div key="landing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mx-globe-wrapper">
              <DigitalGlobe onMarkerClick={handleMarkerClick} focusMarker={popupMarker} />
              <AnimatePresence>
                {popupMarker && (
                  <MarkerPopup marker={popupMarker} onClose={() => setPopupMarker(null)} onEnter={handleEnter} />
                )}
              </AnimatePresence>
            </div>
            <Hero onEnter={handleEnter} />
            <Features />
            <CalendarPreview />
            <CTA onEnter={handleEnter} />
            <Footer />
          </motion.div>
        ) : (
          <DashboardPreview key="dash" onBack={handleBack} />
        )}
      </AnimatePresence>
    </div>
  );
}
