import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { ASSETS, IC } from "../data";
import { Sparkline } from "../atoms";
import { useLivePrices } from "../useLivePrices";

export function MarketsPage() {
  const live = useLivePrices();

  return (
    <section className="mx-page" data-testid="page-markets">
      <div className="mx-page-header">
        <div>
          <div className="mx-page-title">Markets</div>
          <div className="mx-page-sub">
            Live order book — random-walk simulator over SSE
            <span className={`mx-ws-dot ${live ? "live" : ""}`} style={{ marginLeft: 8 }} />
          </div>
        </div>
      </div>

      <div className="mx-card mx-page-card">
        <table className="mx-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Last</th>
              <th>Change %</th>
              <th>Chart</th>
              <th>24h Range</th>
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((a) => {
              const tick = live?.[a.id];
              const val = tick?.val ?? a.val;
              const chg = tick?.chg ?? a.chg;
              const up = tick != null ? tick.up : a.up;
              const spark = tick?.spark ?? a.spark;
              const tickDir = tick?.tickDir ?? 0;
              const lo = Math.min(...spark);
              const hi = Math.max(...spark);
              return (
                <tr key={a.id} data-testid={`mkt-${a.id}`}>
                  <td className="mx-asset-name">{a.name}</td>
                  <td
                    key={`val-${tick?.tickKey ?? 0}`}
                    className={`mx-asset-val ${tickDir > 0 ? "tick-up" : tickDir < 0 ? "tick-down" : ""}`}
                  >
                    {val}
                  </td>
                  <td style={{ color: up ? IC.low : IC.high }}>
                    {tickDir > 0 && <ArrowUp size={10} style={{ verticalAlign: "middle", marginRight: 2 }} />}
                    {tickDir < 0 && <ArrowDown size={10} style={{ verticalAlign: "middle", marginRight: 2 }} />}
                    {chg}
                  </td>
                  <td><Sparkline data={spark} color={up ? IC.low : IC.high} width={120} height={30} /></td>
                  <td className="mx-asset-range">
                    {typeof spark[0] === "number" ? `${lo.toFixed(2)} — ${hi.toFixed(2)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
