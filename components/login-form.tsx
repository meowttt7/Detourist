"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/admin";
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("Use your admin credentials to manage Detourist deals.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage("Checking credentials...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatusMessage(payload.error ?? "Could not log in.");
        setIsSubmitting(false);
        return;
      }

      setStatusMessage("Admin session created. Redirecting...");
      router.push(redirectTo);
      router.refresh();
    } catch {
      setStatusMessage("Could not log in.");
      setIsSubmitting(false);
    }
  };

  return (
    <form className="product-form login-form-shell" onSubmit={handleSubmit}>
      <div className="form-card login-card">
        <p className="section-kicker">Admin login</p>
        <h3>Protect the publishing surface</h3>
        <p>Detourist uses a lightweight admin session right now so only authorized people can publish deals.</p>
        <label className="field-label">
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label className="field-label">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <div className="form-footer">
          <p className="status-copy">{statusMessage}</p>
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </div>
    </form>
  );
}
