import React from "react";
import { Link } from "react-router-dom";
import { Globe as Globe2, Activity, Bell, ChartLine as LineChart, Zap, ArrowRight, CircleCheck as CheckCircle } from "lucide-react";

const FEATURES = [
  {
    icon: Globe2,
    title: "Global Event Tracking",
    desc: "Real-time economic calendar with 195+ countries. Visualize market-moving events on an interactive 3D globe."
  },
  {
    icon: Activity,
    title: "Live Market Data",
    desc: "Stream live prices for major forex pairs, gold, and Bitcoin with millisecond precision."
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Set price thresholds or event-based alerts. Get notified via in-app toasts or Discord webhooks."
  },
  {
    icon: LineChart,
    title: "Impact Analysis",
    desc: "See which assets are affected by each event. Make informed decisions before the market moves."
  }
];

const STATS = [
  { value: "195+", label: "Countries monitored" },
  { value: "24/7", label: "Real-time coverage" },
  { value: "98.7%", label: "Event accuracy" },
  { value: "10K+", label: "Active traders" }
];

export function HomePage() {
  return (
    <section className="mx-page" data-testid="page-home">
      {/* Hero */}
      <div className="mx-hero">
        <div className="mx-hero-glow" />
        <div className="mx-hero-content">
          <div className="mx-hero-badge">
            <Zap size={12} />
            <span>Real-time trading intelligence</span>
          </div>
          <h1 className="mx-hero-title">
            Navigate markets with
            <span className="mx-hero-title-accent"> precision</span>
          </h1>
          <p className="mx-hero-desc">
            Meridex fuses live economic calendars, global event visualization, and instant alerts
            into a single command center for traders. Know what moves markets — before it happens.
          </p>
          <div className="mx-hero-ctas">
            <Link to="/dashboard" className="mx-cta-primary mx-cta-lg">
              Open Dashboard
              <ArrowRight size={16} />
            </Link>
            <Link to="/calendar" className="mx-cta-secondary mx-cta-lg">
              View Calendar
            </Link>
          </div>
        </div>
        <div className="mx-hero-visual">
          <div className="mx-hero-globe">
            <Globe2 size={200} strokeWidth={0.5} />
            <div className="mx-hero-pulse" />
            <div className="mx-hero-pulse mx-hero-pulse-2" />
            <div className="mx-hero-pulse mx-hero-pulse-3" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-stats-bar">
        {STATS.map((s, i) => (
          <div key={i} className="mx-stat-item">
            <div className="mx-stat-value-hero">{s.value}</div>
            <div className="mx-stat-label-hero">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="mx-features-section">
        <div className="mx-section-header">
          <h2 className="mx-section-title">Everything you need to stay ahead</h2>
          <p className="mx-section-desc">
            From macroeconomic events to real-time price alerts, Meridex gives you the edge.
          </p>
        </div>
        <div className="mx-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="mx-feature-card">
              <div className="mx-feature-icon">
                <f.icon size={20} />
              </div>
              <h3 className="mx-feature-title">{f.title}</h3>
              <p className="mx-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mx-how-section">
        <div className="mx-section-header">
          <h2 className="mx-section-title">How it works</h2>
        </div>
        <div className="mx-how-grid">
          <div className="mx-how-step">
            <div className="mx-how-num">1</div>
            <div className="mx-how-content">
              <h3>Connect</h3>
              <p>Sign in and access the live dashboard instantly. No complex setup.</p>
            </div>
          </div>
          <div className="mx-how-step">
            <div className="mx-how-num">2</div>
            <div className="mx-how-content">
              <h3>Configure</h3>
              <p>Pin assets to your watchlist. Set alerts for price thresholds or upcoming events.</p>
            </div>
          </div>
          <div className="mx-how-step">
            <div className="mx-how-num">3</div>
            <div className="mx-how-content">
              <h3>Act</h3>
              <p>Get notified instantly when your conditions trigger. Stay ahead of the market.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-final-cta">
        <div className="mx-final-cta-card">
          <h2>Ready to trade smarter?</h2>
          <p>Join thousands of traders who use Meridex to stay informed.</p>
          <div className="mx-final-cta-actions">
            <Link to="/dashboard" className="mx-cta-primary mx-cta-lg">
              Get Started
              <ArrowRight size={16} />
            </Link>
          </div>
          <ul className="mx-final-cta-perks">
            <li><CheckCircle size={14} /> Free to use</li>
            <li><CheckCircle size={14} /> No credit card required</li>
            <li><CheckCircle size={14} /> Instant access</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
