import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "../AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [webhook, setWebhook] = useState("");

  useEffect(() => { setWebhook(user?.discord_webhook_url || ""); }, [user]);

  const save = () => {
    fetch(`${API}/auth/me/webhook`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discord_webhook_url: webhook || null }),
    })
      .then((r) => { if (r.ok) toast.success("Webhook saved"); else toast.error("Could not save"); })
      .catch(() => toast.error("Could not save"));
  };

  const sendTest = () => {
    fetch(`${API}/alerts`, { credentials: "include" })
      .then((r) => r.json())
      .then((alerts) => {
        if (!alerts.length) { toast("Create an alert first, then test from the Alerts page"); return null; }
        return fetch(`${API}/alerts/${alerts[0].id}/test`, { method: "POST", credentials: "include" });
      })
      .then((post) => {
        if (post && post.ok) toast.success("Sent — check your Discord channel");
        else if (post) toast.error("Delivery failed — check the URL");
      });
  };

  return (
    <section className="mx-page" data-testid="page-settings">
      <div className="mx-page-header">
        <div>
          <div className="mx-page-title">Settings</div>
          <div className="mx-page-sub">Account, notifications, profile</div>
        </div>
      </div>

      <div className="mx-card mx-page-card" style={{ padding: 24 }}>
        <div className="mx-settings-section">
          <div className="mx-settings-title"><UserIcon size={14} /> Account</div>
          <div className="mx-settings-row">
            <div className="mx-settings-label">Signed in as</div>
            <div className="mx-settings-val">
              <div style={{ fontWeight: 600 }}>{user?.name}</div>
              <div style={{ color: "var(--text-dim)", fontSize: 11.5 }}>{user?.email} · {user?.auth_provider}</div>
            </div>
          </div>
          <button className="mx-cta-ghost" onClick={() => logout()} data-testid="logout-btn">
            <LogOut size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Log out
          </button>
        </div>

        <div className="mx-settings-section">
          <div className="mx-settings-title"><Send size={14} /> Discord notifications</div>
          <label className="mx-field">
            <span>Personal webhook URL (overrides the default)</span>
            <input
              className="mx-input"
              placeholder="https://discord.com/api/webhooks/..."
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              data-testid="webhook-input"
            />
          </label>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="mx-cta-primary" onClick={save} data-testid="save-webhook">Save</button>
            <button className="mx-cta-ghost" onClick={sendTest} data-testid="test-webhook">Send test</button>
          </div>
        </div>
      </div>
    </section>
  );
}
