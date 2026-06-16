import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAlerts } from "./useAlerts";
import { useLivePrices } from "./useLivePrices";
import { useLiveFeed } from "./useLiveFeed";
import { ASSETS, EVENTS } from "./data";

const EVENT_FIRE_THRESHOLD_SECONDS = 300; // fire when countdown drops below 5 min
const DEFAULT_COOLDOWN_MIN = 15;

/**
 * Headless component. Listens to live prices + live feed countdowns and fires
 * toasts whenever an active alert crosses its threshold. Persists state to MongoDB.
 *
 * Re-arm logic:
 *   - On fire, set `triggered: true`, `last_triggered_at`, `last_price_side` (which side of the threshold we landed on).
 *   - On subsequent ticks, if the price returns to the OPPOSITE side AND the cooldown has elapsed,
 *     auto-rearm by setting `triggered: false` so the alert can fire again on the next crossing.
 *   - For event alerts: re-arm at UTC midnight (next day's event time).
 */
export function AlertEngine() {
  const { alerts, patch } = useAlerts();
  const live = useLivePrices();
  const feed = useLiveFeed();

  // Track fired-this-tick set to prevent double-firing during a single render cycle
  const firingNowRef = useRef(new Set());

  // ── PRICE alerts ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!live) return;
    for (const a of alerts) {
      if (a.type !== "price" || !a.active) continue;
      if (firingNowRef.current.has(a.id)) continue;
      const tick = live[a.asset];
      if (!tick || tick.valNum == null || a.threshold == null) continue;

      const cooldownMs = (a.cooldown_minutes ?? DEFAULT_COOLDOWN_MIN) * 60 * 1000;
      const lastFiredAt = a.last_triggered_at ? new Date(a.last_triggered_at).getTime() : 0;
      const cooldownElapsed = Date.now() - lastFiredAt >= cooldownMs;
      const currentSide = tick.valNum > a.threshold ? "above" : "below";

      // ── RE-ARM: triggered alert sees price has retraced to opposite side ──
      if (a.triggered) {
        const oppositeOfDirection = a.direction === "above" ? "below" : "above";
        if (currentSide === oppositeOfDirection && cooldownElapsed) {
          firingNowRef.current.add(a.id);
          patch(a.id, { triggered: false, last_price_side: currentSide })
            .finally(() => firingNowRef.current.delete(a.id));
        }
        continue;
      }

      // ── FIRE: untriggered alert crosses its threshold in the watched direction ──
      const crossed =
        (a.direction === "above" && tick.valNum > a.threshold) ||
        (a.direction === "below" && tick.valNum < a.threshold);
      if (!crossed) continue;

      firingNowRef.current.add(a.id);
      const assetLabel = ASSETS.find((x) => x.id === a.asset)?.name ?? a.asset;
      const arrow = a.direction === "above" ? "↑" : "↓";
      toast.error(`${arrow} ${assetLabel} ${a.direction} ${a.threshold}`, {
        description: `Now trading at ${tick.val} — re-arms after ${a.cooldown_minutes ?? DEFAULT_COOLDOWN_MIN}m + price retrace.`,
        duration: 6000,
      });
      patch(a.id, {
        triggered: true,
        last_triggered_at: new Date().toISOString(),
        last_price_side: currentSide,
      })
        .catch(() => { /* silent */ })
        .finally(() => firingNowRef.current.delete(a.id));
    }
  }, [live, alerts, patch]);

  // ── EVENT alerts ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!feed?.countdowns) return;
    for (const a of alerts) {
      if (a.type !== "event" || !a.active) continue;
      if (firingNowRef.current.has(a.id)) continue;

      const country = EVENTS[a.code];
      if (!country) continue;
      const matching = country.items.filter((it) => !a.impact || it.impact === a.impact);
      let soonest = null;
      for (const item of matching) {
        const eventId = `${a.code}-${item.time}-${country.items.indexOf(item)}`;
        const secs = feed.countdowns[eventId];
        if (secs != null && (soonest == null || secs < soonest)) soonest = secs;
      }
      if (soonest == null) continue;

      // RE-ARM event alerts when soonest event is > 23h away (i.e. tomorrow)
      if (a.triggered && soonest > 23 * 3600) {
        firingNowRef.current.add(a.id);
        patch(a.id, { triggered: false })
          .finally(() => firingNowRef.current.delete(a.id));
        continue;
      }

      if (a.triggered) continue;
      if (soonest > EVENT_FIRE_THRESHOLD_SECONDS) continue;

      firingNowRef.current.add(a.id);
      const mins = Math.max(1, Math.floor(soonest / 60));
      toast.warning(`${country.flag} ${country.name} — ${a.impact} impact event in ${mins}m`, {
        description: "Heads up: consider sitting out of new trades around the print.",
        duration: 8000,
      });
      patch(a.id, { triggered: true, last_triggered_at: new Date().toISOString() })
        .catch(() => {})
        .finally(() => firingNowRef.current.delete(a.id));
    }
  }, [feed, alerts, patch]);

  return null;
}
