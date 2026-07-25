import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  AlertTriangle,
  Eye,
  Bell,
  Users,
  Shield,
  BarChart3,
  Globe2,
  Zap,
  TrendingUp,
  Calendar,
  Newspaper,
  Sparkles,
} from "lucide-react";
import { EVENTS } from "../data.js";
import GlobeBoundary from "../components/GlobeBoundary.jsx";
import Globe3D from "../components/Globe3D.jsx";

function Navbar() {
  return (
    <nav className="mx-land-nav">
      <div className="mx-land-nav-brand">
        <div className="mx-land-nav-mark">
          <Globe2 size={18} />
        </div>
        <span className="mx-land-nav-text">Meri<span>dex</span></span>
      </div>
      <div className="mx-land-nav-links">
        <a href="#features" className="mx-land-nav-link--active">Features</a>
        <a href="#calendar">Calendar</a>
        <a href="#markets">Markets</a>
        <a href="#intelligence">Intelligence</a>
        <a href="#pricing">Pricing</a>
      </div>
      <div className="mx-land-nav-actions">
        <button className="mx-land-btn mx-land-btn--ghost mx-land-btn--sm mx-land-nav-login">Login</button>
        <button className="mx-land-btn mx-land-btn--primary mx-land-btn--sm">Get Started</button>
      </div>
    </nav>
  );
}

function useCountdown(targetHours) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });
  React.useEffect(() => {
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
    <div className="mx-land-countdown-banner">
      <div className="mx-land-countdown-left">
        <AlertTriangle size={14} className="mx-land-countdown-icon" />
        <span>Next high impact event: <strong>US CPI m/m</strong> in</span>
        <div className="mx-land-countdown-blocks">
          {blocks.map((b) => (
            <div key={b.label} className="mx-land-countdown-block">
              <span className="mx-land-countdown-num">{b.value}</span>
              <span className="mx-land-countdown-label">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-land-countdown-pill">Today: 5 High Impact Events</div>
    </div>
  );
}

function ActivityFeed() {
  const messages = [
    { icon: Eye, text: "A trader in London just checked US CPI briefing" },
    { icon: Bell, text: "New: Pre-event NQ briefing for US CPI published" },
    { icon: Users, text: "847 traders are viewing the dashboard right now" },
    { icon: Bell, text: "New high impact alert: Fed Chair Powell in 2h 14m" },
  ];
  const [idx, setIdx] = useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), 3500);
    return () => clearInterval(id);
  }, [messages.length]);
  const Icon = messages[idx].icon;
  return (
    <div className="mx-land-activity-feed">
      <div className="mx-land-activity-header">
        <span className="mx-land-activity-dot" />
        Live Activity
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          className="mx-land-activity-item"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Icon size={13} className="mx-land-activity-icon" />
          {messages[idx].text}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ScrollCue() {
  return (
    <div className="mx-land-scroll-cue">
      <span>Scroll</span>
      <div className="mx-land-scroll-cue-track">
        <motion.div
          className="mx-land-scroll-cue-dot"
          animate={{ y: [0, 18, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

function FloatingStatPills() {
  const pills = [
    { icon: Globe2, num: "195+", label: "Countries", delay: 0 },
    { icon: Zap, num: "14", label: "Events Today", delay: 1.3 },
    { icon: BarChart3, num: "847", label: "Active Now", delay: 2.6 },
  ];
  return (
    <div className="mx-land-stat-pills">
      {pills.map((p, i) => {
        const Icon = p.icon;
        return (
          <div key={i} className="mx-land-stat-pill" style={{ animationDelay: `${p.delay}s` }}>
            <Icon size={16} className="mx-land-stat-pill-icon" />
            <div className="mx-land-stat-pill-text">
              <span className="mx-land-stat-pill-num">{p.num}</span>
              <span className="mx-land-stat-pill-label">{p.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HeroSection({ onEnter }) {
  return (
    <section className="mx-land-section mx-land-hero" data-section="0">
      <div className="mx-land-dot-grid" />
      <FloatingStatPills />
      <div className="mx-land-hero-content">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mx-land-eyebrow">
            <span className="mx-land-eyebrow-dot" />
            Global Economic Intelligence
          </div>
          <h1 className="mx-land-headline">
            Markets move fast.
            <br />
            <span className="mx-land-headline-accent">We move faster.</span>
          </h1>
          <p className="mx-land-subtitle">
            The only platform built specifically for NQ and ES futures traders.
            Economic events, central bank intelligence, and pre-event price briefings —
            all in one command centre.
          </p>
          <p className="mx-land-hint">Try it — click any marker on the globe.</p>
          <div className="mx-land-btns">
            <button className="mx-land-btn mx-land-btn--primary mx-land-btn--arrow mx-land-btn--hero" onClick={onEnter}>
              Enter Meridex <ArrowRight size={15} className="mx-land-btn-arrow-icon" />
            </button>
            <button className="mx-land-btn mx-land-btn--ghost mx-land-btn--ghost-teal">
              See how it works
            </button>
          </div>
          <div className="mx-land-trust-row">
            <div className="mx-land-trust-item">
              <span className="mx-land-trust-dot" />
              Live data
            </div>
            <span className="mx-land-trust-sep" />
            <div className="mx-land-trust-item">
              <Shield size={14} />
              Used by 10K+ traders
            </div>
            <span className="mx-land-trust-sep" />
            <div className="mx-land-trust-item">
              <BarChart3 size={14} />
              195 countries tracked
            </div>
          </div>
        </motion.div>
      </div>
      <ActivityFeed />
      <ScrollCue />
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: Calendar, title: "Economic Calendar", desc: "Every high-impact event across 195 countries, filtered for NQ and ES relevance." },
    { icon: Newspaper, title: "Pre-Event Briefings", desc: "AI-generated price action briefings published before each major event." },
    { icon: TrendingUp, title: "Live Market Impact", desc: "Real-time correlation between events and NQ, ES, gold, and FX movements." },
    { icon: Sparkles, title: "Central Bank Watch", desc: "Track every central bank stance, speech, and rate decision in one place." },
  ];
  return (
    <section className="mx-land-section mx-land-features" id="features">
      <div className="mx-land-section-inner">
        <div className="mx-land-section-label">Features</div>
        <h2 className="mx-land-section-title">Everything you need to trade the news</h2>
        <div className="mx-land-features-grid">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                className="mx-land-feature-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="mx-land-feature-icon"><Icon size={24} /></div>
                <h3 className="mx-land-feature-title">{f.title}</h3>
                <p className="mx-land-feature-desc">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CalendarSection() {
  const rows = Object.entries(EVENTS).flatMap(([code, e]) =>
    e.items.map((item) => ({ ...item, country: e.name, flag: e.flag, code }))
  ).slice(0, 8);
  return (
    <section className="mx-land-section mx-land-calendar" id="calendar">
      <div className="mx-land-section-inner">
        <div className="mx-land-section-label">Calendar</div>
        <h2 className="mx-land-section-title">Today's high-impact events</h2>
        <div className="mx-land-cal-table">
          <div className="mx-land-cal-header">
            <span>Time</span><span>Event</span><span>Country</span><span>Impact</span><span>Forecast</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="mx-land-cal-row">
              <span className="mx-land-cal-time">{r.time}</span>
              <span className="mx-land-cal-name">{r.name}</span>
              <span className="mx-land-cal-country">{r.flag} {r.country}</span>
              <span className={`mx-land-cal-impact mx-land-cal-impact--${r.impact}`}>{r.impact}</span>
              <span className="mx-land-cal-forecast">{r.forecast || "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({ onEnter }) {
  return (
    <section className="mx-land-section mx-land-cta" id="pricing">
      <div className="mx-land-section-inner">
        <h2 className="mx-land-section-title">Start trading smarter today</h2>
        <p className="mx-land-section-sub">Join 10,000+ futures traders using Meridex to stay ahead of the market.</p>
        <button className="mx-land-btn mx-land-btn--primary mx-land-btn--arrow mx-land-btn--hero" onClick={onEnter}>
          Enter Meridex <ArrowRight size={15} className="mx-land-btn-arrow-icon" />
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-land-footer">
      <div className="mx-land-footer-inner">
        <div className="mx-land-footer-brand">
          <Globe2 size={18} />
          <span>Meridex</span>
        </div>
        <div className="mx-land-footer-links">
          <a href="#features">Features</a>
          <a href="#calendar">Calendar</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="mx-land-footer-copy">© 2025 Meridex. All rights reserved.</div>
      </div>
    </footer>
  );
}

export default function HomePage({ onEnter }) {
  const [popupMarker, setPopupMarker] = useState(null);
  const handleMarkerClick = useCallback((d) => setPopupMarker(d), []);
  const handlePopupClose = useCallback(() => setPopupMarker(null), []);

  return (
    <div className="mx-land-page">
      <Navbar />
      <CountdownBanner />
      <div className="mx-land-globe-wrapper">
        <GlobeBoundary>
          <Globe3D
            onMarkerClick={handleMarkerClick}
            popupMarker={popupMarker}
            onPopupClose={handlePopupClose}
            onEnter={onEnter}
          />
        </GlobeBoundary>
      </div>
      <HeroSection onEnter={onEnter} />
      <FeaturesSection />
      <CalendarSection />
      <CTASection onEnter={onEnter} />
      <Footer />
    </div>
  );
}
