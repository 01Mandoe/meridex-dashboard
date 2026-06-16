import React from "react";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ASSETS, EVENTS, IC } from "../data";
import { useWatchlist } from "../useAlerts";

export function WatchlistPage() {
  const { items, loading, remove } = useWatchlist();

  const handleRemove = async (id) => {
    await remove(id);
    toast("Removed from watchlist");
  };

  return (
    <section className="mx-page" data-testid="page-watchlist">
      <div className="mx-page-header">
        <div>
          <div className="mx-page-title">Watchlist</div>
          <div className="mx-page-sub">Pinned assets &amp; countries — persisted in MongoDB</div>
        </div>
      </div>

      <div className="mx-card mx-page-card">
        {loading ? (
          <div className="mx-coming-soon"><div className="mx-coming-sub">Loading…</div></div>
        ) : items.length === 0 ? (
          <div className="mx-coming-soon">
            <div className="mx-coming-title">Nothing pinned yet</div>
            <div className="mx-coming-sub">
              Hover a country marker on the globe or an asset in Market Reactions and click the star icon to pin it here.
            </div>
          </div>
        ) : (
          <div className="mx-alerts-list">
            {items.map((i) => {
              const title =
                i.kind === "asset"
                  ? ASSETS.find((a) => a.id === i.ref)?.name ?? i.ref
                  : `${EVENTS[i.ref]?.flag ?? "🏳️"} ${EVENTS[i.ref]?.name ?? i.ref}`;
              return (
                <div key={i.id} className="mx-alert-row" data-testid={`watch-${i.id}`}>
                  <div className="mx-alert-icon" style={{ color: IC.medium }}>
                    <Star size={18} fill={IC.medium} />
                  </div>
                  <div className="mx-alert-body">
                    <div className="mx-alert-title">{title}</div>
                    <div className="mx-alert-sub">
                      {i.kind === "asset" ? "Asset" : "Country"} · pinned {new Date(i.added_at).toLocaleString()}
                    </div>
                  </div>
                  <div />
                  <button className="mx-icon-btn" onClick={() => handleRemove(i.id)} aria-label="Remove">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
