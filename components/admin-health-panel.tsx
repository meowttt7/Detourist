"use client";

import { useCallback, useEffect, useState } from "react";

type HealthState = "ok" | "warn";

type AdminHealthSnapshot = {
  generatedAt: string;
  overallStatus: HealthState;
  checks: Array<{
    key: string;
    label: string;
    status: HealthState;
    summary: string;
    details: string[];
  }>;
};

export function AdminHealthPanel() {
  const [snapshot, setSnapshot] = useState<AdminHealthSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/health", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not load admin health status.");
      }

      setSnapshot(payload as AdminHealthSnapshot);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load admin health status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <article className="detail-card admin-health-card">
      <div className="section-heading-row product-heading-row admin-health-header">
        <div>
          <p className="section-kicker">Health</p>
          <h2>Runtime readiness checks</h2>
          <p className="admin-health-copy">Read-only checks for database reachability, mailer mode, scheduler protection, canonical URL, and admin auth guardrails.</p>
        </div>
        <div className="admin-health-actions">
          <button className="button button-small button-secondary" type="button" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Checking..." : "Refresh checks"}
          </button>
          {snapshot ? (
            <p className="status-copy">Last run {new Date(snapshot.generatedAt).toLocaleString()}</p>
          ) : null}
        </div>
      </div>

      {error ? <p className="status-copy warning-pill admin-health-error">{error}</p> : null}

      {snapshot ? (
        <div className="admin-health-list">
          {snapshot.checks.map((check) => (
            <div className="admin-health-row" key={check.key}>
              <div>
                <div className="admin-health-title-row">
                  <strong>{check.label}</strong>
                  <span className={`admin-health-pill admin-health-pill-${check.status}`}>{check.status === "ok" ? "ok" : "attention"}</span>
                </div>
                <p>{check.summary}</p>
              </div>
              <div className="admin-health-detail-list">
                {check.details.map((detail) => (
                  <span key={`${check.key}-${detail}`}>{detail}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>{loading ? "Running readiness checks..." : "No health checks available yet."}</p>
      )}
    </article>
  );
}