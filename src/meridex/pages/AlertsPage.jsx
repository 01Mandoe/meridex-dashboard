import React, { useState } from "react";
import { Bell, BellRing, Trash2, Plus, X, Send } from "lucide-react";
import { toast } from "sonner";
import { ASSETS, EVENTS, IC } from "../data";
import { useAlerts } from "../useAlerts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ASSET_OPTIONS = ASSETS.map((a) => ({ id: a.id, label: a.name }));
const COUNTRY_OPTIONS = Object.entries(EVENTS).map(([code, ev]) => ({
  id: code,
  label: `${ev.flag} ${ev.name}`,
}));

function NewAlertModal({ onClose, onCreate }) {
  const [type, setType] = useState("price");
  const [asset, setAsset] = useState("BTCUSD");
  const [direction, setDirection] = useState("above");
  const [threshold, setThreshold] = useState("");
  const [code, setCode] = useState("US");
  const [impact, setImpact] = useState("high");

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (type === "price") {
        const t = parseFloat(threshold);
        if (Number.isNaN(t)) { toast.error("Threshold must be a number"); return; }
        await onCreate({ type, asset, direction, threshold: t, active: true, triggered: false });
      } else {
        await onCreate({ type, code, impact, active: true, triggered: false });
      }
      toast.success("Alert saved");
      onClose();
    } catch (err) {
      toast.error("Failed to save alert");
    }
  };

  return (
    <div className="mx-modal-backdrop" onClick={onClose}>
      <form className="mx-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} data-testid="new-alert-form">
        <div className="mx-modal-header">
          <div className="mx-modal-title">Create alert</div>
          <button type="button" className="mx-icon-btn" onClick={onClose} aria-label="close"><X size={16} /></button>
        </div>

        <div className="mx-field-row">
          <button type="button" className={`mx-seg ${type === "price" ? "active" : ""}`} onClick={() => setType("price")}>Price</button>
          <button type="button" className={`mx-seg ${type === "event" ? "active" : ""}`} onClick={() => setType("event")}>Event</button>
        </div>

        {type === "price" ? (
          <>
            <label className="mx-field">
              <span>Asset</span>
              <select className="mx-select" value={asset} onChange={(e) => setAsset(e.target.value)}>
                {ASSET_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
            <label className="mx-field">
              <span>Direction</span>
              <select className="mx-select" value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </label>
            <label className="mx-field">
              <span>Threshold</span>
              <input
                className="mx-input"
                type="number"
                step="any"
                value={threshold}
                placeholder="e.g. 67000"
                onChange={(e) => setThreshold(e.target.value)}
                data-testid="threshold-input"
              />
            </label>
          </>
        ) : (
          <>
            <label className="mx-field">
              <span>Country</span>
              <select className="mx-select" value={code} onChange={(e) => setCode(e.target.value)}>
                {COUNTRY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
            <label className="mx-field">
              <span>Impact tier</span>
              <select className="mx-select" value={impact} onChange={(e) => setImpact(e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          </>
        )}

        <button type="submit" className="mx-cta-primary" data-testid="submit-alert">Create alert</button>
      </form>
    </div>
  );
}

export function AlertsPage() {
  const { alerts, loading, create, patch, remove } = useAlerts();
  const [modalOpen, setModalOpen] = useState(false);

  const resetTriggered = (id) =>
    patch(id, { triggered: false }).catch(() => toast.error("Could not reset"));

  const testDelivery = (id) => {
    toast.promise(
      fetch(`${API}/alerts/${id}/test`, { method: "POST", credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error("failed");
      }),
      {
        loading: "Sending test to Discord…",
        success: "Sent — check your Discord channel",
        error: "Discord delivery failed",
      }
    );
  };

  return (
    <section className="mx-page" data-testid="page-alerts">
      <div className="mx-page-header">
        <div>
          <div className="mx-page-title">Alerts</div>
          <div className="mx-page-sub">Persisted in MongoDB — fires toast on live tick crossing or event proximity</div>
        </div>
        <button className="mx-cta-primary" onClick={() => setModalOpen(true)} data-testid="new-alert">
          <Plus size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
          New alert
        </button>
      </div>

      <div className="mx-card mx-page-card">
        {loading ? (
          <div className="mx-coming-soon">
            <div className="mx-coming-sub">Loading alerts…</div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="mx-coming-soon">
            <div className="mx-coming-title">No alerts yet</div>
            <div className="mx-coming-sub">Click &ldquo;New alert&rdquo; to add your first price or event alert.</div>
          </div>
        ) : (
          <div className="mx-alerts-list">
            {alerts.map((a) => {
              const title =
                a.type === "price"
                  ? `${ASSETS.find((x) => x.id === a.asset)?.name ?? a.asset} ${a.direction} ${a.threshold}`
                  : `${EVENTS[a.code]?.flag ?? "🏳️"} ${EVENTS[a.code]?.name ?? a.code} — ${a.impact} impact event`;
              return (
                <div key={a.id} className={`mx-alert-row ${a.triggered ? "triggered" : ""}`} data-testid={`alert-${a.id}`}>
                  <div className="mx-alert-icon" style={{ color: a.triggered ? IC.high : "var(--accent)" }}>
                    {a.triggered ? <BellRing size={18} /> : <Bell size={18} />}
                  </div>
                  <div className="mx-alert-body">
                    <div className="mx-alert-title">{title}</div>
                    <div className="mx-alert-sub">
                      {a.type === "price" ? "Price alert" : "Event alert"} · {a.active ? "Active" : "Paused"}
                      {a.triggered && (
                        <> · <button className="mx-link" onClick={() => resetTriggered(a.id)} data-testid={`reset-${a.id}`}>
                          Triggered — reset
                        </button></>
                      )}
                    </div>
                  </div>
                  <button
                    className="mx-toggle"
                    onClick={() => patch(a.id, { active: !a.active })}
                    data-testid={`toggle-${a.id}`}
                    aria-pressed={a.active}
                  >
                    <span className={`mx-toggle-dot ${a.active ? "on" : ""}`} />
                  </button>
                  <button
                    className="mx-icon-btn"
                    onClick={() => testDelivery(a.id)}
                    data-testid={`test-${a.id}`}
                    aria-label="Send test to Discord"
                    title="Send test to Discord"
                  >
                    <Send size={14} />
                  </button>
                  <button
                    className="mx-icon-btn"
                    onClick={() => remove(a.id).then(() => toast("Alert removed"))}
                    data-testid={`remove-${a.id}`}
                    aria-label="Remove alert"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && <NewAlertModal onClose={() => setModalOpen(false)} onCreate={create} />}
    </section>
  );
}
