"use client";

import { useState } from "react";

import { DealAlert } from "@/lib/types";

type AccountAlertsProps = {
  initialAlerts: DealAlert[];
  hasProfile: boolean;
  hasEmail: boolean;
  savedCount: number;
};

export function AccountAlerts({ initialAlerts, hasProfile, hasEmail, savedCount }: AccountAlertsProps) {
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

  const emptyState = !hasProfile
    ? {
        title: "No alert engine yet",
        body: "Create your detour profile first and Detourist can start deciding which deals deserve a real nudge instead of showing you a generic feed.",
        primaryHref: "/onboarding",
        primaryLabel: "Create your detour profile",
        secondaryHref: "/deals",
        secondaryLabel: "Browse deals first",
      }
    : !hasEmail
      ? {
          title: "You can match deals, but Detourist cannot reach you yet",
          body: "Your profile is active, so strong matches can still appear here. Add an email above if you want those same matches to arrive outside the app too.",
          primaryHref: "/deals",
          primaryLabel: "Open personalized deals",
          secondaryHref: "/onboarding",
          secondaryLabel: "Tune profile",
        }
      : savedCount === 0
        ? {
            title: "No alerts yet, but the account is ready",
            body: "Open the feed, save the deals you would genuinely consider, and hide the ones that are too annoying. That gives Detourist sharper signal before the next alert cycle.",
            primaryHref: "/deals",
            primaryLabel: "Open personalized deals",
            secondaryHref: "/onboarding",
            secondaryLabel: "Tune profile",
          }
        : {
            title: "No fresh alerts right now",
            body: "That usually means your current saved state and profile are in sync with the live inventory. Keep checking the feed and Detourist will nudge you when a stronger mismatch in price shows up.",
            primaryHref: "/deals",
            primaryLabel: "Review live deals",
            secondaryHref: "/onboarding",
            secondaryLabel: "Adjust profile",
          };

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
                <p className="mini-label">{alert.channel === "email" ? "Email-ready" : "In-app"} | Score {alert.score} | {alert.matchLabel}</p>
                <h3>{alert.dealTitle}</h3>
                <p>{alert.reasonSummary}</p>
                <div className="account-alert-reasons">
                  {alert.reasons.slice(0, 3).map((reason) => (
                    <p key={`${alert.id}-${reason}`}>{reason}</p>
                  ))}
                </div>
                {alert.warnings.length ? (
                  <div className="account-alert-warnings">
                    <span className="mini-label">Tradeoffs to check</span>
                    <div className="reason-stack account-tag-row">
                      {alert.warnings.map((warning) => (
                        <span className="insight-pill" key={`${alert.id}-warning-${warning}`}>{warning}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
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
        <div className="account-empty-state">
          <h3>{emptyState.title}</h3>
          <p>{emptyState.body}</p>
          <div className="detail-actions-column account-empty-actions">
            <a className="button" href={emptyState.primaryHref}>{emptyState.primaryLabel}</a>
            <a className="button button-secondary" href={emptyState.secondaryHref}>{emptyState.secondaryLabel}</a>
          </div>
        </div>
      )}
      {status ? <p className="status-copy">{status}</p> : null}
    </article>
  );
}
