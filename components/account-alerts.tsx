"use client";

import { useState } from "react";

import { DealAlert } from "@/lib/types";

type AccountAlertsProps = {
  initialAlerts: DealAlert[];
};

export function AccountAlerts({ initialAlerts }: AccountAlertsProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [status, setStatus] = useState<string>("");

  async function handleMarkViewed(alertId: string) {
    setStatus("Updating alert state...");

    const response = await fetch("/api/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "mark_viewed",
        alertId,
      }),
    });

    const payload = (await response.json()) as { error?: string; alert?: DealAlert };
    if (!response.ok || !payload.alert) {
      setStatus(payload.error ?? "Could not update alert.");
      return;
    }

    setAlerts((current) => current.map((alert) => (alert.id === payload.alert?.id ? payload.alert : alert)));
    setStatus("Alert updated.");
  }

  return (
    <article className="detail-card">
      <p className="section-kicker">Alerts</p>
      <h2>Your matched deals</h2>
      <p className="support-text">
        These are the deals Detourist thinks clear your current worth-it threshold strongly enough to deserve a nudge.
      </p>
      {alerts.length ? (
        <div className="account-alert-list">
          {alerts.map((alert) => (
            <div className="account-alert-card" key={alert.id}>
              <div>
                <p className="mini-label">{alert.channel === "email" ? "Email-ready" : "In-app"} | Score {alert.score}</p>
                <h3>{alert.dealTitle}</h3>
                <p>{alert.reasonSummary}</p>
              </div>
              <div className="account-alert-actions">
                <span className={`alert-status-pill ${alert.status === "viewed" ? "alert-status-viewed" : "alert-status-new"}`}>
                  {alert.status === "viewed" ? "Viewed" : "New"}
                </span>
                <a className="button button-secondary" href={`/deals/${alert.dealSlug}`}>Open deal</a>
                {alert.status === "new" ? (
                  <button className="button button-ghost" type="button" onClick={() => void handleMarkViewed(alert.id)}>
                    Mark viewed
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No alerts yet. Once your profile matches a published deal strongly enough, it will show up here.</p>
      )}
      {status ? <p className="status-copy">{status}</p> : null}
    </article>
  );
}
