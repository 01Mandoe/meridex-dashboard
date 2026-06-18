import { useMemo } from "react";
import { allEvents, IC } from "../data";

function ImpactDot({ level }) {
  const color = IC[level] || IC.low;
  return (
    <span
      className="mx-ticker-impact"
      style={{ background: color }}
      title={`Impact: ${level}`}
    />
  );
}

function TickerItem({ event }) {
  return (
    <div className="mx-ticker-item">
      <span className="mx-ticker-flag">{event.flag}</span>
      <span className="mx-ticker-name">{event.name}</span>
      <span className="mx-ticker-time">{event.time} GMT</span>
      <ImpactDot level={event.impact} />
    </div>
  );
}

export function EventTicker() {
  const items = useMemo(() => allEvents, []);

  if (items.length === 0) return null;

  return (
    <div className="mx-ticker-wrap">
      <div className="mx-ticker-track">
        {/* Render items twice for seamless loop */}
        {items.map((ev) => (
          <TickerItem key={`a-${ev.id}`} event={ev} />
        ))}
        {items.map((ev) => (
          <TickerItem key={`b-${ev.id}`} event={ev} />
        ))}
      </div>
    </div>
  );
}
