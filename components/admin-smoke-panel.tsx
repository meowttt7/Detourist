"use client";

import { useCallback, useEffect, useState } from "react";

type SmokeState = "ok" | "warn";

type AdminSmokeSnapshot = {
  generatedAt: string;
  summary: {
    pendingDigestUsers: number;
    pendingDigestAlerts: number;
    failedDeliveries: number;
    queuedDeliveries: number;
  };
  cards: Array<{
    key: string;
    label: string;
    value: string;
    status: SmokeState;
    note: string;
  }>;
  latestSigninDelivery: {
    recipientEmail: string;
    status: string;
    mode: string;
    createdAt: string;
  } | null;
};

export function AdminSmokePanel() {
  const [snapshot, setSnapshot] = useState<AdminSmokeSnapshot | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/smoke", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not load smoke-test status.");
      }

      setSnapshot(payload as AdminSmokeSnapshot);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load smoke-test status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSendTest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setStatus("Sending test sign-in link...");

    try {
      const response = await fetch("/api/admin/smoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not send test sign-in link.");
      }

      setStatus(`Test sign-in link ${payload.delivery.status} via ${payload.delivery.mode} to ${payload.delivery.recipientEmail}.`);
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send test sign-in link.");
    } finally {
      setSending(false);
    }
  }

  return (
    <article className="detail-card admin-health-card">
      <div className="section-heading-row product-heading-row admin-health-header">
        <div>
          <p className="section-kicker">Smoke test</p>
          <h2>Notification loop checks</h2>
          <p className="admin-health-copy">Use this panel to spot delivery trouble and send yourself a fresh sign-in link without leaving admin.</p>
        </div>
        <div className="admin-health-actions">
          <button className="button button-small button-secondary" type="button" onClick={() => void refresh()} disabled={loading || sending}>
            {loading ? "Refreshing..." : "Refresh snapshot"}
          </button>
          {snapshot ? <p className="status-copy">Snapshot {new Date(snapshot.generatedAt).toLocaleString()}</p> : null}
        </div>
      </div>

      {snapshot ? (
        <div className="admin-smoke-grid">
          {snapshot.cards.map((card) => (
            <div className="admin-health-row" key={card.key}>
              <div className="admin-health-title-row">
                <strong>{card.label}</strong>
                <span className={`admin-health-pill admin-health-pill-${card.status}`}>{card.status === "ok" ? "ok" : "attention"}</span>
              </div>
              <h3 className="admin-smoke-value">{card.value}</h3>
              <p>{card.note}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>{loading ? "Loading smoke-test snapshot..." : "Smoke-test snapshot not available yet."}</p>
      )}

      <form className="admin-smoke-form" onSubmit={handleSendTest}>
        <label className="field-label">
          Test sign-in email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@detourist.vacations"
            required
          />
        </label>
        <div className="detail-actions-column admin-ops-actions">
          <button className="button button-secondary" type="submit" disabled={sending || loading}>
            {sending ? "Sending..." : "Send test sign-in link"}
          </button>
          <p className="support-text">Best for quickly validating live SMTP and the magic-link login loop.</p>
        </div>
      </form>

      {snapshot?.latestSigninDelivery ? (
        <p className="support-text">
          Latest sign-in email: {snapshot.latestSigninDelivery.status} via {snapshot.latestSigninDelivery.mode} to {snapshot.latestSigninDelivery.recipientEmail} at {new Date(snapshot.latestSigninDelivery.createdAt).toLocaleString()}.
        </p>
      ) : null}

      {status ? <p className="status-copy admin-inline-status">{status}</p> : null}
    </article>
  );
}
