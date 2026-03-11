"use client";

import { useState } from "react";

type SignInFormProps = {
  initialMessage?: string;
};

type SignInResponse = {
  error?: string;
  delivery?: {
    mode: string;
    status: string;
  };
};

export function SignInForm({ initialMessage = "" }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("Sending your sign-in link...");

    const response = await fetch("/api/auth/request-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const payload = (await response.json()) as SignInResponse;
    if (!response.ok) {
      setMessage(payload.error ?? "Could not send your sign-in link.");
      setSubmitting(false);
      return;
    }

    const deliveryMessage = payload.delivery
      ? `${payload.delivery.status} via ${payload.delivery.mode}`
      : "queued";

    setMessage(`Sign-in link sent. Delivery: ${deliveryMessage}. Open it and we will drop you into your personalized feed or straight into profile setup.`);
    setSubmitting(false);
  }

  return (
    <form className="account-email-form" onSubmit={handleSubmit}>
      <div>
        <p className="section-kicker">Magic link</p>
        <h2 className="signin-title">Send a secure link</h2>
        <p className="support-text">Use the same email you linked to your Detourist account or traveler profile.</p>
      </div>
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
          {submitting ? "Sending..." : "Email me a sign-in link"}
        </button>
        {message ? <p className="status-copy">{message}</p> : null}
      </div>
    </form>
  );
}
