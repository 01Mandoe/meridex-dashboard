import React from "react";
import { ChevronRight, ArrowUp, ArrowDown, Star } from "lucide-react";
import { toast } from "sonner";
import { IC, IB, REGIONS, ASSETS, NEWS, EVENTS } from "./data";
import { Sparkline } from "./atoms";
import { useLivePrices } from "./useLivePrices";
import { useLiveFeed } from "./useLiveFeed";
import { useWatchlist } from "./useAlerts";

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
      <div className="mx-card">
        <div className="mx-card-title">Regional Risk</div>
        <div className="mx-regions">
          {REGIONS.map((r) => (
            <div key={r.id} className="mx-region-row">
              <div className="mx-region-name">{r.name}</div>
              <div className="mx-region-label" style={{ color: IC[r.impact] }}>{r.label}</div>
              <div className="mx-region-track">
                <div className="mx-region-fill" style={{ width: `${r.score}%`, background: IC[r.impact], boxShadow: `0 0 8px ${IC[r.impact]}` }} />
                <div className="mx-region-knob" style={{ left: `calc(${r.score}% - 6px)`, background: IC[r.impact] }} />
              </div>
              <div className="mx-region-score">{r.score}</div>
            </div>
          ))}
        </div>
        <button className="mx-cta-link" data-testid="view-full-report">
          View full report <ChevronRight size={14} />
        </button>
      </div>

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
            // Pinned items override severity color with gold to make them stand out
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
