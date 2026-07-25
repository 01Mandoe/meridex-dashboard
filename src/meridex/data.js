export const EVENTS = {
  US: {
    name: "United States", flag: "US", impact: "high", lat: 38, lon: -97,
    affects: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD"],
    items: [
      { time: "08:30", name: "CPI m/m", impact: "high", forecast: "0.3%", prev: "0.4%", desc: "Key inflation gauge." },
      { time: "10:00", name: "Fed Chair Powell Speech", impact: "high", forecast: "", prev: "", desc: "Hawkish/dovish tone." },
      { time: "13:30", name: "Retail Sales m/m", impact: "high", forecast: "0.4%", prev: "0.6%", desc: "Consumer spending." },
    ],
  },
  GB: {
    name: "United Kingdom", flag: "GB", impact: "medium", lat: 55, lon: -3,
    affects: ["GBPUSD", "EURUSD"],
    items: [
      { time: "07:00", name: "GDP m/m", impact: "medium", forecast: "0.2%", prev: "0.1%", desc: "Monthly output." },
      { time: "09:30", name: "BOE Governor Speech", impact: "medium", forecast: "", prev: "", desc: "Rate signals." },
    ],
  },
  DE: {
    name: "Germany", flag: "DE", impact: "medium", lat: 51, lon: 10, affects: ["EURUSD", "GBPUSD"],
    items: [{ time: "09:00", name: "ZEW Sentiment", impact: "medium", forecast: "45.0", prev: "42.7", desc: "Investor confidence." }],
  },
  JP: {
    name: "Japan", flag: "JP", impact: "low", lat: 36, lon: 138, affects: ["USDJPY"],
    items: [{ time: "00:30", name: "Trade Balance", impact: "low", forecast: "0.1T", prev: "-0.1T", desc: "JPY mover." }],
  },
  CA: {
    name: "Canada", flag: "CA", impact: "medium", lat: 56, lon: -106, affects: ["XAUUSD", "USDJPY"],
    items: [{ time: "13:30", name: "Employment Change", impact: "medium", forecast: "20.0K", prev: "22.1K", desc: "CAD sensitive." }],
  },
  AU: {
    name: "Australia", flag: "AU", impact: "low", lat: -25, lon: 133, affects: ["XAUUSD"],
    items: [{ time: "01:30", name: "NAB Confidence", impact: "low", forecast: "", prev: "", desc: "AUD mover." }],
  },
  CN: {
    name: "China", flag: "CN", impact: "high", lat: 35, lon: 105, affects: ["XAUUSD", "USDJPY", "BTCUSD"],
    items: [
      { time: "02:00", name: "CPI y/y", impact: "high", forecast: "0.2%", prev: "0.1%", desc: "Moves metals." },
      { time: "02:00", name: "PPI y/y", impact: "medium", forecast: "0.1%", prev: "-0.1%", desc: "Producer prices." },
    ],
  },
  BR: {
    name: "Brazil", flag: "BR", impact: "medium", lat: -14, lon: -51, affects: ["XAUUSD"],
    items: [{ time: "12:00", name: "IPCA Inflation", impact: "medium", forecast: "0.4%", prev: "0.3%", desc: "Affects BRL." }],
  },
  IN: {
    name: "India", flag: "IN", impact: "medium", lat: 20, lon: 77, affects: ["XAUUSD", "USDJPY"],
    items: [{ time: "05:30", name: "WPI Inflation", impact: "medium", forecast: "1.2%", prev: "0.9%", desc: "INR mover." }],
  },
  CH: {
    name: "Switzerland", flag: "CH", impact: "low", lat: 47, lon: 8, affects: ["EURUSD", "XAUUSD"],
    items: [{ time: "07:30", name: "CPI m/m", impact: "low", forecast: "0.1%", prev: "0.0%", desc: "CHF mover." }],
  },
};

export const MARKERS = Object.entries(EVENTS).map(([code, e]) => ({
  code, name: e.name, flag: e.flag, impact: e.impact,
  lat: e.lat, lon: e.lon, affects: e.affects, items: e.items,
}));

export const IMPACT_COLORS = { high: "#FF3D5A", medium: "#FF9F0A", low: "#1FCE89" };
export const IMPACT_LABELS = { high: "High Impact", medium: "Medium Impact", low: "Low Impact" };
