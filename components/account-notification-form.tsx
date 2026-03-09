"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AlertNotificationPreference } from "@/lib/types";

type AccountNotificationFormProps = {
  initialPreference: AlertNotificationPreference;
  hasEmail: boolean;
};

type NotificationResponse = {
  error?: string;
  user?: { alertPreference: AlertNotificationPreference };
  summary?: {
    alertsUpdated: number;
    deliveries: {
      sent: number;
      queued: number;
      failed: number;
    };
  };
};

const options: Array<{ value: AlertNotificationPreference; label: string; description: string }> = [
  {
    value: "instant",
    label: "Instant",
    description: "Send alert emails as soon as a deal matches strongly enough.",
  },
  {
    value: "daily_digest",
    label: "Daily digest",
    description: "Batch matching alerts into a single digest instead of sending them one by one.",
  },
  {
    value: "paused",
    label: "Paused",
    description: "Stop sending alert emails while keeping your account and feed intact.",
  },
];

export function AccountNotificationForm({ initialPreference, hasEmail }: AccountNotificationFormProps) {
  const router = useRouter();
  const [preference, setPreference] = useState<AlertNotificationPreference>(initialPreference);
  const [status, setStatus] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("Updating notification settings...");

    const response = await fetch("/api/account/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ preference }),
    });

    const payload = (await response.json()) as NotificationResponse;
    if (!response.ok || !payload.user) {
      setStatus(payload.error ?? "Could not update notification settings.");
      setSubmitting(false);
      return;
    }

    const summary = payload.summary;
    const deliverySummary = summary
      ? `${summary.deliveries.sent} sent, ${summary.deliveries.queued} queued, ${summary.deliveries.failed} failed`
      : "0 sent, 0 queued, 0 failed";

    setStatus(
      `Notifications updated to ${payload.user.alertPreference.replace("_", " ")}. ` +
      `${summary?.alertsUpdated ?? 0} unread alerts were processed immediately. Delivery: ${deliverySummary}.`,
    );
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="account-email-shell">
      <div className="account-email-copy">
        <p className="section-kicker">Alert delivery</p>
        <h3>Choose how Detourist nudges you</h3>
        <p className="support-text">
          {hasEmail
            ? "These settings control alert emails only. Sign-in links and security emails still send when you ask for them."
            : "Link an email first if you want these preferences to affect real email delivery."}
        </p>
      </div>
      <form className="account-notification-form" onSubmit={handleSubmit}>
        <div className="account-notification-options">
          {options.map((option) => (
            <label className="account-notification-option" key={option.value}>
              <input
                type="radio"
                name="alertPreference"
                value={option.value}
                checked={preference === option.value}
                onChange={() => setPreference(option.value)}
              />
              <div>
                <strong>{option.label}</strong>
                <p>{option.description}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="detail-actions-column">
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save notification preference"}
          </button>
          {status ? <p className="status-copy">{status}</p> : null}
        </div>
      </form>
    </div>
  );
}
