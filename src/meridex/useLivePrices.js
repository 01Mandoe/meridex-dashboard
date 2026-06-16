import { useEffect, useRef, useState } from "react";

const ASSET_IDS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD"];
const SPARK_LEN = 24;

const FORMATTERS = {
  EURUSD: (v) => v.toFixed(4),
  GBPUSD: (v) => v.toFixed(4),
  USDJPY: (v) => v.toFixed(2),
  XAUUSD: (v) => v.toFixed(0),
  BTCUSD: (v) => Math.round(v).toLocaleString(),
};

/**
 * Connects to the backend Server-Sent Events stream and yields live ticks
 * for each asset. SSE is used (not WebSocket) because Cloudflare cannot
 * upgrade WS over HTTP/2 in this environment.
 *
 * Returns: { [id]: { val, valNum, chg, up, spark, tickKey, tickDir } }
 */
export function useLivePrices() {
  const [state, setState] = useState(null);
  const sparksRef = useRef(Object.fromEntries(ASSET_IDS.map((id) => [id, []])));
  const tickKeyRef = useRef(Object.fromEntries(ASSET_IDS.map((id) => [id, 0])));
  const prevValRef = useRef({});

  useEffect(() => {
    const httpUrl = process.env.REACT_APP_BACKEND_URL;
    if (!httpUrl) return undefined;
    const sseUrl = `${httpUrl}/api/sse/prices`;

    const apply = (data) => {
      const sparks = sparksRef.current;
      const tickKey = tickKeyRef.current;
      const prev = prevValRef.current;
      const out = {};
      for (const id of ASSET_IDS) {
        const d = data[id];
        if (!d) continue;
        sparks[id] = [...sparks[id], d.val].slice(-SPARK_LEN);
        if (prev[id] !== d.val) tickKey[id] += 1;
        const dir = prev[id] == null ? 0 : Math.sign(d.val - prev[id]);
        prev[id] = d.val;
        out[id] = {
          valNum: d.val,
          val: FORMATTERS[id](d.val),
          chg: `${d.chg >= 0 ? "+" : ""}${d.chg.toFixed(2)}%`,
          up: d.chg >= 0,
          spark: sparks[id].length > 1 ? sparks[id] : [d.val, d.val],
          tickKey: tickKey[id],
          tickDir: dir,
        };
      }
      setState(out);
    };

    const es = new EventSource(sseUrl, { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg && msg.data) apply(msg.data);
      } catch (_) { /* ignore malformed frame */ }
    };
    // EventSource auto-reconnects on error, so no manual retry loop needed.

    return () => {
      es.close();
    };
  }, []);

  return state;
}
