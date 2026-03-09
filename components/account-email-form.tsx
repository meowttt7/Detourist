"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AccountEmailFormProps = {
  initialEmail: string;
  hasProfile: boolean;
};

type EmailUpdateResponse = {
  error?: string;
  user?: { email: string | null };
  summary?: {
    alertsUpdated: number;
    deliveries: {
      sent: number;
      queued: number;
      failed: number;
    };
  };
};

export function AccountEmailForm({ initialEmail, hasProfile }: AccountEmailFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("Saving email...");

    const response = await fetch("/api/account/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const payload = (await response.json()) as EmailUpdateResponse;
    if (!response.ok || !payload.user) {
      setStatus(payload.error ?? "Could not update your email.");
      setSubmitting(false);
      return;
    }

    const summary = payload.summary;
    const deliverySummary = summary
      ? `${summary.deliveries.sent} sent, ${summary.deliveries.queued} queued, ${summary.deliveries.failed} failed`
      : "0 sent, 0 queued, 0 failed";

    setStatus(
      `Email linked. ${summary?.alertsUpdated ?? 0} alerts are now email-ready. Delivery: ${deliverySummary}.`,
    );
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="account-email-shell">
      <div className="account-email-copy">
        <p className="section-kicker">Delivery email</p>
        <h3>{initialEmail ? "Update where Detourist reaches you" : "Add an email for alerts"}</h3>
        <p className="support-text">
          {hasProfile
            ? "Linking an email upgrades your unread alerts to email-ready delivery and keeps future matches reachable outside the app."
            : "Add an email now and your future Detourist profile will inherit it automatically."}
        </p>
      </div>
      <form className="account-email-form" onSubmit={handleSubmit}>
        <label className="field-label">
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <div className="detail-actions-column">
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : initialEmail ? "Update email" : "Link email"}
          </button>
          {status ? <p className="status-copy">{status}</p> : null}
        </div>
      </form>
    </div>
  );
}
