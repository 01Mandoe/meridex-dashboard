import { useEffect, useState } from "react";

/**
 * Combined live feed: event countdowns + news ticker.
 * Streamed over Server-Sent Events from /api/sse/feed.
 *
 * Returns: { countdowns: { [eventId]: secondsUntil }, news: [{id,time,text,detail?}] }
 */
export function useLiveFeed() {
  const [state, setState] = useState(null);

  useEffect(() => {
    const httpUrl = process.env.REACT_APP_BACKEND_URL;
    if (!httpUrl) return undefined;
    const es = new EventSource(`${httpUrl}/api/sse/feed`, { withCredentials: true });

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (!msg) return;
        if (msg.type === "snapshot") {
          setState({ countdowns: msg.countdowns || {}, news: msg.news || [] });
        } else if (msg.type === "tick") {
          setState((prev) => ({
            countdowns: msg.countdowns || prev?.countdowns || {},
            news: prev?.news || [],
          }));
        } else if (msg.type === "news") {
          setState((prev) => ({
            countdowns: prev?.countdowns || {},
            news: [msg.item, ...(prev?.news || [])].slice(0, 30),
          }));
        }
      } catch (_) { /* ignore */ }
    };

    return () => es.close();
  }, []);

  return state;
}
