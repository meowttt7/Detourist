"use client";

import { FormEvent, useState } from "react";

type WaitlistFormProps = {
  buttonLabel?: string;
  compact?: boolean;
  source?: string;
};

type SubmitState = "idle" | "submitting" | "success" | "existing" | "error";

export function WaitlistForm({
  buttonLabel = "Get Early Access",
  compact = false,
  source = "landing-page",
}: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("No spam. Just the good stuff.");

  const inputId = compact ? "email-compact" : "email-main";
  const honeypotId = compact ? "website-compact" : "website-main";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    setSubmitState("submitting");
    setMessage("Saving your spot...");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          website,
          source,
        }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        status?: "created" | "existing" | "ignored";
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setSubmitState("error");
        setMessage(payload.error ?? "We couldn't save your email just now. Please try again.");
        return;
      }

      if (payload.status === "existing") {
        setSubmitState("existing");
        setMessage("You're already on the list. We'll be in touch when Detourist opens up.");
      } else {
        setSubmitState("success");
        setMessage("You're on the list. We'll send early access when Detourist opens up.");
      }

      setEmail("");
      setWebsite("");
    } catch {
      setSubmitState("error");
      setMessage("We couldn't save your email just now. Please try again.");
    }
  };

  return (
    <form
      className={compact ? "waitlist-form waitlist-form-compact" : "waitlist-form"}
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor={inputId}>
        Email address
      </label>
      <input
        id={inputId}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="Your email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-label="Email address"
        required
        disabled={submitState === "submitting"}
      />
      <div className="honeypot-field" aria-hidden="true">
        <label htmlFor={honeypotId}>Website</label>
        <input
          id={honeypotId}
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      <button type="submit" disabled={submitState === "submitting"}>
        {submitState === "submitting" ? "Joining..." : buttonLabel}
      </button>
      <p className={`form-note form-note-${submitState}`} aria-live="polite">
        {message}
      </p>
    </form>
  );
}
