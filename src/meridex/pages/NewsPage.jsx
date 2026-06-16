import React from "react";
import { NEWS as STATIC_NEWS } from "../data";
import { useLiveFeed } from "../useLiveFeed";

export function NewsPage() {
  const feed = useLiveFeed();
  const news = feed?.news?.length ? feed.news : STATIC_NEWS;

  return (
    <section className="mx-page" data-testid="page-news">
      <div className="mx-page-header">
        <div>
          <div className="mx-page-title">News Feed</div>
          <div className="mx-page-sub">
            Live breaking news from global financial wires
            <span className={`mx-ws-dot ${feed ? "live" : ""}`} style={{ marginLeft: 8 }} />
          </div>
        </div>
      </div>

      <div className="mx-card mx-page-card">
        <div className="mx-news mx-news-page">
          {news.map((n) => (
            <div key={n.id} className="mx-news-row" data-testid={`news-${n.id}`}>
              <div className="mx-news-time">{n.time}</div>
              <div>
                <div className="mx-news-text">{n.text}</div>
                {n.detail && <div className="mx-news-detail">{n.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
