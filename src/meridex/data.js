export const EVENTS = {
  US: {
    name: "United States", flag: "US", impact: "high", lat: 38, lon: -97,
    currency: "USD", centralBank: "Federal Reserve",
    affects: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD", "NQ", "ES"],
    items: [
      { time: "08:30", name: "CPI m/m", impact: "high", forecast: "0.3%", prev: "0.4%", desc: "Key inflation gauge. Hot print triggers risk-off across equities." },
      { time: "10:00", name: "Fed Chair Powell Speech", impact: "high", forecast: "—", prev: "—", desc: "Hawkish/dovish tone. Markets hang on every word." },
      { time: "13:30", name: "Retail Sales m/m", impact: "high", forecast: "0.4%", prev: "0.6%", desc: "Consumer spending. Strong number lifts ES and NQ." },
    ],
  },
  GB: {
    name: "United Kingdom", flag: "GB", impact: "medium", lat: 55, lon: -3,
    currency: "GBP", centralBank: "Bank of England",
    affects: ["GBPUSD", "EURUSD"],
    items: [
      { time: "07:00", name: "GDP m/m", impact: "medium", forecast: "0.2%", prev: "0.1%", desc: "Monthly output. Miss weighs on GBP." },
      { time: "09:30", name: "BOE Governor Speech", impact: "medium", forecast: "—", prev: "—", desc: "Rate path signals from Bailey." },
    ],
  },
  DE: {
    name: "Germany", flag: "DE", impact: "medium", lat: 51, lon: 10,
    currency: "EUR", centralBank: "ECB",
    affects: ["EURUSD", "GBPUSD"],
    items: [{ time: "09:00", name: "ZEW Sentiment", impact: "medium", forecast: "45.0", prev: "42.7", desc: "Investor confidence. EUR-sensitive." }],
  },
  JP: {
    name: "Japan", flag: "JP", impact: "low", lat: 36, lon: 138,
    currency: "JPY", centralBank: "Bank of Japan",
    affects: ["USDJPY"],
    items: [{ time: "00:30", name: "Trade Balance", impact: "low", forecast: "0.1T", prev: "-0.1T", desc: "JPY mover. Surplus strengthens yen." }],
  },
  CA: {
    name: "Canada", flag: "CA", impact: "medium", lat: 56, lon: -106,
    currency: "CAD", centralBank: "Bank of Canada",
    affects: ["XAUUSD", "USDJPY"],
    items: [{ time: "13:30", name: "Employment Change", impact: "medium", forecast: "20.0K", prev: "22.1K", desc: "CAD sensitive. Strong jobs lift loonie." }],
  },
  AU: {
    name: "Australia", flag: "AU", impact: "low", lat: -25, lon: 133,
    currency: "AUD", centralBank: "RBA",
    affects: ["XAUUSD"],
    items: [{ time: "01:30", name: "NAB Confidence", impact: "low", forecast: "—", prev: "—", desc: "AUD mover. Business sentiment gauge." }],
  },
  CN: {
    name: "China", flag: "CN", impact: "high", lat: 35, lon: 105,
    currency: "CNY", centralBank: "PBOC",
    affects: ["XAUUSD", "USDJPY", "BTCUSD"],
    items: [
      { time: "02:00", name: "CPI y/y", impact: "high", forecast: "0.2%", prev: "0.1%", desc: "Moves metals and risk sentiment." },
      { time: "02:00", name: "PPI y/y", impact: "medium", forecast: "0.1%", prev: "-0.1%", desc: "Producer prices. Deflation signals hit commodities." },
    ],
  },
  BR: {
    name: "Brazil", flag: "BR", impact: "medium", lat: -14, lon: -51,
    currency: "BRL", centralBank: "BCB",
    affects: ["XAUUSD"],
    items: [{ time: "12:00", name: "IPCA Inflation", impact: "medium", forecast: "0.4%", prev: "0.3%", desc: "Affects BRL and EM sentiment." }],
  },
  IN: {
    name: "India", flag: "IN", impact: "medium", lat: 20, lon: 77,
    currency: "INR", centralBank: "RBI",
    affects: ["XAUUSD", "USDJPY"],
    items: [{ time: "05:30", name: "WPI Inflation", impact: "medium", forecast: "1.2%", prev: "0.9%", desc: "INR mover. Gold demand implications." }],
  },
  CH: {
    name: "Switzerland", flag: "CH", impact: "low", lat: 47, lon: 8,
    currency: "CHF", centralBank: "SNB",
    affects: ["EURUSD", "XAUUSD"],
    items: [{ time: "07:30", name: "CPI m/m", impact: "low", forecast: "0.1%", prev: "0.0%", desc: "CHF mover. Safe haven flows." }],
  },
};

export const MARKERS = Object.entries(EVENTS).map(([code, e]) => ({
  code, name: e.name, flag: e.flag, impact: e.impact,
  lat: e.lat, lon: e.lon, affects: e.affects, items: e.items,
  currency: e.currency, centralBank: e.centralBank,
}));

export const IMPACT_COLORS = { high: "#FF3D5A", medium: "#FF9F0A", low: "#1FCE89" };
export const IMPACT_LABELS = { high: "High Impact", medium: "Medium Impact", low: "Low Impact" };
export const IMPACT_GLOW = {
  high: "rgba(255,61,90,0.4)",
  medium: "rgba(255,159,10,0.4)",
  low: "rgba(31,206,137,0.4)",
};

export const INSTRUMENTS = [
  { sym: "NQ", name: "Nasdaq 100 Futures", price: "18,427.50", change: "+127.30", pct: "+0.70%", up: true, data: [30, 32, 28, 35, 40, 38, 42, 45, 43, 48, 52, 55], color: "#00C9A7", spark: [50,52,49,53,51,54,56,55,57,58,60,62,59,61,63] },
  { sym: "ES", name: "S&P 500 Futures", price: "5,234.75", change: "+18.40", pct: "+0.35%", up: true, data: [50, 48, 52, 49, 53, 51, 54, 56, 55, 57, 58, 60], color: "#00C9A7", spark: [40,42,41,43,44,43,45,44,46,47,45,48,47,49,50] },
  { sym: "XAUUSD", name: "Gold Spot", price: "2,341.20", change: "-8.50", pct: "-0.36%", up: false, data: [60, 58, 59, 55, 52, 54, 50, 48, 49, 45, 43, 42], color: "#FF9F0A", spark: [60,58,59,55,56,53,54,50,51,48,49,45,46,43,42] },
  { sym: "EURUSD", name: "Euro / US Dollar", price: "1.0852", change: "+0.0012", pct: "+0.11%", up: true, data: [40, 41, 39, 42, 44, 43, 45, 44, 46, 47, 45, 48], color: "#00C9A7", spark: [40,41,39,42,41,43,44,43,45,44,46,47,45,48,47] },
  { sym: "USDJPY", name: "US Dollar / Yen", price: "151.34", change: "+0.42", pct: "+0.28%", up: true, data: [45, 44, 46, 43, 45, 47, 46, 48, 47, 49, 50, 52], color: "#00C9A7", spark: [45,44,46,43,45,47,46,48,47,49,50,51,49,52,53] },
  { sym: "BTCUSD", name: "Bitcoin", price: "67,820", change: "+1,240", pct: "+1.86%", up: true, data: [35, 36, 34, 38, 40, 39, 42, 44, 43, 46, 48, 50], color: "#00C9A7", spark: [35,36,34,38,37,40,39,42,41,44,43,46,48,47,50] },
];

export const PULSE_METRICS = [
  { label: "Volatility", val: 78, color: "#FF3D5A", desc: "Elevated" },
  { label: "Momentum", val: 62, color: "#00C9A7", desc: "Bullish" },
  { label: "Fear / Greed", val: 45, color: "#FF9F0A", desc: "Neutral" },
  { label: "Liquidity", val: 84, color: "#1FCE89", desc: "Deep" },
];

export const CORRELATIONS = [
  { event: "US CPI m/m", nq: -0.82, es: -0.71, gold: 0.68, dxy: 0.74 },
  { event: "Fed Speech", nq: -0.64, es: -0.58, gold: 0.41, dxy: 0.52 },
  { event: "Retail Sales", nq: 0.55, es: 0.49, gold: -0.32, dxy: -0.28 },
  { event: "China CPI", nq: 0.38, es: 0.31, gold: 0.61, dxy: -0.22 },
  { event: "BOE Gov Speech", nq: 0.12, es: 0.09, gold: 0.18, dxy: -0.34 },
];

export const NEWS_FEED = [
  { time: "2m", source: "Reuters", headline: "Fed's Powell signals patience on rate cuts amid sticky inflation", tag: "Fed", impact: "high" },
  { time: "14m", source: "Bloomberg", headline: "Nasdaq futures rally as tech earnings beat estimates across the board", tag: "NQ", impact: "medium" },
  { time: "31m", source: "CNBC", headline: "Gold holds above $2,340 as China CPI data fuels safe-haven demand", tag: "Gold", impact: "medium" },
  { time: "48m", source: "FT", headline: "ECB sources hint at June cut as eurozone disinflation accelerates", tag: "EUR", impact: "high" },
  { time: "1h", source: "Reuters", headline: "Yen weakens past 151 as BoJ stays dovish on yield curve control", tag: "JPY", impact: "medium" },
  { time: "1h", source: "WSJ", headline: "Bitcoin reclaims $67K as ETF inflows hit record weekly high", tag: "BTC", impact: "low" },
];

export const TESTIMONIALS = [
  { quote: "Meridex replaced four dashboards. The pre-event briefings alone pay for the subscription ten times over.", name: "Marcus Chen", role: "Prop Trader, 8 yrs", initials: "MC" },
  { quote: "I stopped getting caught by CPI surprises. The correlation matrix tells me exactly what to hedge before the number drops.", name: "Sarah Vasquez", role: "Futures Day Trader", initials: "SV" },
  { quote: "The globe isn't just pretty — it's how I see risk. One glance and I know which regions are live today.", name: "James Okafor", role: "Macro Hedge Fund Analyst", initials: "JO" },
  { quote: "Best tool I've added to my stack in five years. The AI briefings are scarily accurate on NQ direction.", name: "Priya Nair", role: "Independent Trader", initials: "PN" },
];

export const PRICING = [
  {
    name: "Trader", price: "$49", period: "/mo",
    features: ["Economic calendar (195 countries)", "Pre-event briefings (top 3 events)", "Live market impact dashboard", "Mobile + desktop access"],
    highlight: false, cta: "Start free trial",
  },
  {
    name: "Pro", price: "$149", period: "/mo",
    features: ["Everything in Trader", "Unlimited AI pre-event briefings", "Full correlation matrix", "Central bank watch + speech tracker", "Custom event alerts", "API access (1000 calls/day)"],
    highlight: true, cta: "Start free trial",
  },
  {
    name: "Desk", price: "$499", period: "/mo",
    features: ["Everything in Pro", "Team workspace (up to 10 seats)", "Shared watchlists & briefings", "Priority data feed", "Dedicated account manager", "API access (unlimited)"],
    highlight: false, cta: "Contact sales",
  },
];

export const STATS = [
  { num: "10,000+", label: "Active traders" },
  { num: "195", label: "Countries tracked" },
  { num: "2.4M+", label: "Events covered" },
  { num: "99.97%", label: "Data uptime" },
];

export const HOW_IT_WORKS = [
  { num: "01", title: "See the whole board", desc: "A live 3D globe shows every economic event happening across 195 countries. Color-coded by impact. Click any marker to drill in." },
  { num: "02", title: "Get the briefing", desc: "Before every high-impact event, our AI publishes a price-action briefing — expected scenarios, key levels, instruments to watch." },
  { num: "03", title: "Trade with conviction", desc: "Correlation matrices show you exactly how each event moves NQ, ES, gold, and FX. No more guessing. No more getting blindsided." },
];

export const FEATURES = [
  { icon: "Calendar", title: "Economic Calendar", desc: "Every high-impact event across 195 countries, filtered and ranked for NQ and ES relevance. Never miss a market-moving print again." },
  { icon: "Newspaper", title: "AI Pre-Event Briefings", desc: "Price-action briefings published before each major event. Expected scenarios, key levels, and instrument-by-instrument impact analysis." },
  { icon: "TrendingUp", title: "Correlation Matrix", desc: "See exactly how each event historically moves NQ, ES, gold, the dollar, and more. Data-driven, not gut-driven." },
  { icon: "Sparkles", title: "Central Bank Watch", desc: "Track every central bank stance, speech, and rate decision in one place. Powell, Lagarde, Ueda, Bailey — all on one screen." },
  { icon: "Zap", title: "Instant Alerts", desc: "Custom alerts for the events that matter to your book. Get notified 15 minutes before, at release, and on surprise prints." },
  { icon: "Globe2", title: "Risk Radar", desc: "A live volatility, momentum, fear/greed, and liquidity dashboard. Know the market regime before you place a single trade." },
];
