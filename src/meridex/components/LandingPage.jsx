import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, AlertTriangle, Eye, Bell, Users, Shield,
  BarChart3, Globe2, Zap, TrendingUp, Calendar, Newspaper, Sparkles,
  Check, Star, Quote, X, ChevronDown,
} from "lucide-react";
import {
  EVENTS, MARKERS, IMPACT_COLORS, IMPACT_LABELS, INSTRUMENTS,
  STATS, FEATURES, HOW_IT_WORKS, TESTIMONIALS, PRICING,
} from "../data.js";
import { useCountdown, useInView } from "../hooks.js";

const ICONS = { Calendar, Newspaper, TrendingUp, Sparkles, Zap, Globe2 };

/* ═══════════════════ NAVBAR ═══════════════════ */
export function Navbar({ onEnter, inDashboard }) {
  return (
    <nav className="mx-nav">
      <div className="mx-nav-brand">
        <div className="mx-nav-mark"><Globe2 size={18} /></div>
        <span className="mx-nav-text">Meri<span>dex</span></span>
      </div>
      <div className="mx-nav-links">
        <a href="#features" className="mx-nav-link--active">Features</a>
        <a href="#how">How it works</a>
        <a href="#calendar">Calendar</a>
        <a href="#pricing">Pricing</a>
      </div>
      <div className="mx-nav-actions">
        <button className="mx-btn mx-btn--ghost mx-btn--sm">Login</button>
        <button className="mx-btn mx-btn--primary mx-btn--sm" onClick={onEnter}>
          {inDashboard ? <><ArrowLeft size={14} /> Back</> : <>Get Started <ArrowRight size={14} /></>}
        </button>
      </div>
    </nav>
  );
}

/* ═══════════════════ COUNTDOWN BANNER ═══════════════════ */
function CountdownBanner() {
  const t = useCountdown(3.23 * 3600000);
  const blocks = [
    { label: "Hrs", value: String(t.h).padStart(2, "0") },
    { label: "Min", value: String(t.m).padStart(2, "0") },
    { label: "Sec", value: String(t.s).padStart(2, "0") },
  ];
  return (
    <div className="mx-countdown">
      <div className="mx-countdown-left">
        <AlertTriangle size={14} className="mx-countdown-icon" />
        <span>Next high-impact event: <strong>US CPI m/m</strong> in</span>
        <div className="mx-countdown-blocks">
          {blocks.map((b) => (
            <div key={b.label} className="mx-countdown-block">
              <span className="mx-countdown-num">{b.value}</span>
              <span className="mx-countdown-label">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-countdown-pill"><Zap size={11} /> 5 High Impact Events Today</div>
    </div>
  );
}

/* ═══════════════════ TICKER TAPE ═══════════════════ */
function TickerTape() {
  const items = INSTRUMENTS.concat(INSTRUMENTS).concat(INSTRUMENTS);
  return (
    <div className="mx-ticker">
      <div className="mx-ticker-track">
        {items.map((inst, i) => (
          <div key={i} className="mx-ticker-item">
            <span className="mx-ticker-sym">{inst.sym}</span>
            <span className="mx-ticker-price">{inst.price}</span>
            <span className={`mx-ticker-change ${inst.up ? "up" : "down"}`}>
              {inst.up ? "▲" : "▼"} {inst.pct}
            </span>
            <span className="mx-ticker-dot">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════ HERO ═══════════════════ */
function Hero({ onEnter }) {
  return (
    <section className="mx-hero">
      <div className="mx-dot-grid" />
      <div className="mx-hero-glow" />
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
            The command centre built for NQ and ES futures traders.
            Economic events, central bank intelligence, AI pre-event briefings,
            and correlation analytics — all in one platform.
          </p>
          <p className="mx-hint">
            <span className="mx-hint-cursor" /> Click any marker on the globe to explore
          </p>
          <div className="mx-btns">
            <button className="mx-btn mx-btn--primary mx-btn--arrow mx-btn--hero" onClick={onEnter}>
              Enter Meridex <ArrowRight size={16} className="mx-btn-arrow-icon" />
            </button>
            <a href="#how" className="mx-btn mx-btn--ghost mx-btn--ghost-teal">
              See how it works
            </a>
          </div>
          <div className="mx-trust-row">
            <div className="mx-trust-item"><span className="mx-trust-dot" /> Live data</div>
            <span className="mx-trust-sep" />
            <div className="mx-trust-item"><Shield size={13} /> 10K+ traders</div>
            <span className="mx-trust-sep" />
            <div className="mx-trust-item"><BarChart3 size={13} /> 195 countries</div>
          </div>
        </motion.div>
      </div>
      <ActivityFeed />
      <ScrollCue />
    </section>
  );
}

function FloatingPills() {
  const pills = [
    { icon: Globe2, num: "195+", label: "Countries" },
    { icon: Zap, num: "14", label: "Events Today" },
    { icon: BarChart3, num: "847", label: "Active Now" },
  ];
  return (
    <div className="mx-stat-pills">
      {pills.map((p, i) => {
        const Icon = p.icon;
        return (
          <motion.div key={i} className="mx-stat-pill"
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.2, duration: 0.6 }}
          >
            <Icon size={16} className="mx-stat-pill-icon" />
            <div className="mx-stat-pill-text">
              <span className="mx-stat-pill-num">{p.num}</span>
              <span className="mx-stat-pill-label">{p.label}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function ActivityFeed() {
  const messages = [
    { icon: Eye, text: "A trader in London just opened the US CPI briefing" },
    { icon: Bell, text: "New: Pre-event NQ briefing for US CPI published" },
    { icon: Users, text: "847 traders are viewing the dashboard right now" },
    { icon: Bell, text: "High impact alert: Fed Chair Powell in 2h 14m" },
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
        <motion.div key={idx} className="mx-activity-item"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5 }}
        >
          <Icon size={13} className="mx-activity-icon" />{messages[idx].text}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ScrollCue() {
  return (
    <div className="mx-scroll-cue">
      <span>Scroll to explore</span>
      <div className="mx-scroll-cue-track">
        <motion.div className="mx-scroll-cue-dot"
          animate={{ y: [0, 18, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════ MARKER POPUP ═══════════════════ */
export function MarkerPopup({ marker, onClose, onEnter }) {
  return (
    <motion.div className="mx-marker-popup"
      initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.25 }}
    >
      <div className="mx-popup-header">
        <span className="mx-popup-flag">{marker.flag}</span>
        <span className="mx-popup-name">{marker.name}</span>
        <span className="mx-popup-impact" style={{ color: IMPACT_COLORS[marker.impact], background: IMPACT_COLORS[marker.impact] + "22" }}>
          {IMPACT_LABELS[marker.impact]}
        </span>
        <button className="mx-popup-close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="mx-popup-meta">
        <span className="mx-popup-meta-item">{marker.currency}</span>
        <span className="mx-popup-meta-sep">·</span>
        <span className="mx-popup-meta-item">{marker.centralBank}</span>
      </div>
      <div className="mx-popup-events">
        {marker.items.map((item, i) => (
          <div key={i} className="mx-popup-event">
            <span className="mx-popup-time">{item.time}</span>
            <div className="mx-popup-event-info">
              <span className="mx-popup-event-name">{item.name}</span>
              <span className="mx-popup-event-desc">{item.desc}</span>
            </div>
            <div className="mx-popup-event-right">
              <span className="mx-popup-event-fc">Fc: {item.forecast || "—"}</span>
              <span className="mx-popup-event-prev">Pr: {item.prev || "—"}</span>
            </div>
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
        Open in Command Centre <ArrowRight size={13} />
      </button>
    </motion.div>
  );
}

/* ═══════════════════ STATS BAR ═══════════════════ */
function StatsBar() {
  const [ref, inView] = useInView(0.3);
  return (
    <section className="mx-stats-bar" ref={ref}>
      <div className="mx-stats-inner">
        {STATS.map((s, i) => (
          <motion.div key={i} className="mx-stat-item"
            initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <span className="mx-stat-num">{s.num}</span>
            <span className="mx-stat-label">{s.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════ FEATURES ═══════════════════ */
function Features() {
  return (
    <section className="mx-section mx-features" id="features">
      <div className="mx-section-inner">
        <div className="mx-section-head">
          <div className="mx-section-label">Features</div>
          <h2 className="mx-section-title">Everything you need<br />to trade the news</h2>
        </div>
        <div className="mx-features-grid">
          {FEATURES.map((f, i) => {
            const Icon = ICONS[f.icon] || Sparkles;
            return (
              <motion.div key={i} className="mx-feature-card"
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
              >
                <div className="mx-feature-icon"><Icon size={22} /></div>
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

/* ═══════════════════ HOW IT WORKS ═══════════════════ */
function HowItWorks() {
  return (
    <section className="mx-section mx-how" id="how">
      <div className="mx-section-inner">
        <div className="mx-section-head">
          <div className="mx-section-label">How it works</div>
          <h2 className="mx-section-title">From chaos to clarity<br />in three steps</h2>
        </div>
        <div className="mx-how-grid">
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div key={i} className="mx-how-step"
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <span className="mx-how-num">{step.num}</span>
              <h3 className="mx-how-title">{step.title}</h3>
              <p className="mx-how-desc">{step.desc}</p>
              {i < HOW_IT_WORKS.length - 1 && <div className="mx-how-arrow"><ArrowRight size={20} /></div>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ CALENDAR PREVIEW ═══════════════════ */
function CalendarPreview() {
  const rows = Object.entries(EVENTS).flatMap(([code, e]) =>
    e.items.map((item) => ({ ...item, country: e.name, flag: e.flag, code }))
  ).slice(0, 9);
  return (
    <section className="mx-section mx-calendar" id="calendar">
      <div className="mx-section-inner">
        <div className="mx-section-head">
          <div className="mx-section-label">Calendar</div>
          <h2 className="mx-section-title">Today's high-impact events</h2>
        </div>
        <div className="mx-cal-table">
          <div className="mx-cal-header">
            <span>Time</span><span>Event</span><span>Country</span><span>Impact</span><span>Forecast</span><span>Previous</span>
          </div>
          {rows.map((r, i) => (
            <motion.div key={i} className="mx-cal-row"
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
            >
              <span className="mx-cal-time">{r.time}</span>
              <span className="mx-cal-name">{r.name}</span>
              <span className="mx-cal-country">{r.flag} {r.country}</span>
              <span className="mx-cal-impact" style={{ color: IMPACT_COLORS[r.impact], background: IMPACT_COLORS[r.impact] + "22" }}>
                {r.impact}
              </span>
              <span className="mx-cal-forecast">{r.forecast || "—"}</span>
              <span className="mx-cal-prev">{r.prev || "—"}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ TESTIMONIALS ═══════════════════ */
function Testimonials() {
  return (
    <section className="mx-section mx-testimonials">
      <div className="mx-section-inner">
        <div className="mx-section-head">
          <div className="mx-section-label">Testimonials</div>
          <h2 className="mx-section-title">Trusted by traders<br />who can't afford surprises</h2>
        </div>
        <div className="mx-testimonial-grid">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={i} className="mx-testimonial-card"
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: (i % 2) * 0.1 }}
            >
              <Quote size={22} className="mx-testimonial-quote" />
              <p className="mx-testimonial-text">{t.quote}</p>
              <div className="mx-testimonial-author">
                <div className="mx-testimonial-avatar">{t.initials}</div>
                <div>
                  <span className="mx-testimonial-name">{t.name}</span>
                  <span className="mx-testimonial-role">{t.role}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ PRICING ═══════════════════ */
function Pricing({ onEnter }) {
  return (
    <section className="mx-section mx-pricing" id="pricing">
      <div className="mx-section-inner">
        <div className="mx-section-head">
          <div className="mx-section-label">Pricing</div>
          <h2 className="mx-section-title">Choose your edge</h2>
        </div>
        <div className="mx-pricing-grid">
          {PRICING.map((plan, i) => (
            <motion.div key={i} className={`mx-pricing-card ${plan.highlight ? "highlight" : ""}`}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {plan.highlight && <span className="mx-pricing-badge">Most Popular</span>}
              <h3 className="mx-pricing-name">{plan.name}</h3>
              <div className="mx-pricing-price">
                <span className="mx-pricing-amount">{plan.price}</span>
                <span className="mx-pricing-period">{plan.period}</span>
              </div>
              <ul className="mx-pricing-features">
                {plan.features.map((f, j) => (
                  <li key={j}><Check size={15} /> {f}</li>
                ))}
              </ul>
              <button className={`mx-btn ${plan.highlight ? "mx-btn--primary" : "mx-btn--ghost"} mx-btn--block`} onClick={onEnter}>
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ CTA ═══════════════════ */
function CTA({ onEnter }) {
  return (
    <section className="mx-cta-section">
      <div className="mx-cta-glow" />
      <div className="mx-cta-inner">
        <motion.h2 className="mx-cta-title"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          Stop trading blind.<br />
          <span className="mx-headline-accent">Start trading smart.</span>
        </motion.h2>
        <p className="mx-cta-sub">Join 10,000+ futures traders who never miss a market-moving event.</p>
        <button className="mx-btn mx-btn--primary mx-btn--arrow mx-btn--hero" onClick={onEnter}>
          Enter Meridex <ArrowRight size={16} className="mx-btn-arrow-icon" />
        </button>
      </div>
    </section>
  );
}

/* ═══════════════════ FOOTER ═══════════════════ */
function Footer() {
  return (
    <footer className="mx-footer">
      <div className="mx-footer-inner">
        <div className="mx-footer-brand">
          <Globe2 size={20} />
          <span>Meridex</span>
        </div>
        <div className="mx-footer-cols">
          <div className="mx-footer-col">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#calendar">Calendar</a>
          </div>
          <div className="mx-footer-col">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Blog</a>
            <a href="#">Careers</a>
          </div>
          <div className="mx-footer-col">
            <h4>Legal</h4>
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Disclaimer</a>
          </div>
        </div>
      </div>
      <div className="mx-footer-bottom">
        <span>© 2025 Meridex. All rights reserved.</span>
        <span className="mx-footer-disclaimer">Trading futures carries risk. Meridex is an information platform, not financial advice.</span>
      </div>
    </footer>
  );
}

/* ═══════════════════ GLOBE OVERLAY ═══════════════════ */
function GlobeOverlay({ globe, popupMarker, onMarkerClick, onPopupClose, onEnter }) {
  return (
    <div className="mx-globe-wrapper">
      {globe}
      <AnimatePresence>
        {popupMarker && (
          <MarkerPopup marker={popupMarker} onClose={onPopupClose} onEnter={onEnter} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════ LANDING PAGE ═══════════════════ */
export default function LandingPage({ onEnter, globe, popupMarker, onMarkerClick, onPopupClose }) {
  return (
    <>
      <CountdownBanner />
      <GlobeOverlay
        globe={globe}
        popupMarker={popupMarker}
        onMarkerClick={onMarkerClick}
        onPopupClose={onPopupClose}
        onEnter={onEnter}
      />
      <Hero onEnter={onEnter} />
      <TickerTape />
      <StatsBar />
      <Features />
      <HowItWorks />
      <CalendarPreview />
      <Testimonials />
      <Pricing onEnter={onEnter} />
      <CTA onEnter={onEnter} />
      <Footer />
    </>
  );
}
