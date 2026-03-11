"use client";

import { useDeferredValue, useMemo, useState } from "react";

import type { ScheduledJobRun, ScheduledJobRunStatus } from "@/lib/types";

type AdminSourceProbeRunsProps = {
  latestRun: ScheduledJobRun | null;
  runs: ScheduledJobRun[];
};

const statusOptions: Array<{ value: "all" | ScheduledJobRunStatus; label: string }> = [
  { value: "all", label: "All outcomes" },
  { value: "success", label: "Healthy" },
  { value: "failed", label: "Failed" },
  { value: "unauthorized", label: "Blocked" },
  { value: "skipped", label: "Skipped" },
];

function formatProbeStatus(status: ScheduledJobRunStatus) {
  switch (status) {
    case "success":
      return "healthy";
    case "failed":
      return "failed";
    case "unauthorized":
      return "blocked";
    case "skipped":
      return "skipped";
    default:
      return status;
  }
}

function formatProbeDetails(run: ScheduledJobRun) {
  const details = [
    run.metadata.amadeusEnvironment ? `env ${run.metadata.amadeusEnvironment}` : null,
    run.metadata.authState ? `auth ${run.metadata.authState}` : null,
    typeof run.metadata.tokenExpiresInSeconds === "number" ? `ttl ${run.metadata.tokenExpiresInSeconds}s` : null,
    run.metadata.errorMessage ? `error ${run.metadata.errorMessage}` : null,
  ].filter(Boolean);

  return details.length ? details.join(" | ") : "No probe metadata.";
}

function matchesSearch(run: ScheduledJobRun, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [
    run.summary,
    run.status,
    run.metadata.amadeusEnvironment ?? "",
    run.metadata.authState ?? "",
    run.metadata.baseUrl ?? "",
    run.metadata.errorMessage ?? "",
    formatProbeDetails(run),
  ].join(" ").toLowerCase();

  return haystack.includes(search);
}

export function AdminSourceProbeRuns({ latestRun, runs }: AdminSourceProbeRunsProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ScheduledJobRunStatus>("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredRuns = useMemo(() => (
    runs.filter((run) => {
      if (statusFilter !== "all" && run.status !== statusFilter) {
        return false;
      }

      return matchesSearch(run, deferredSearch);
    })
  ), [runs, statusFilter, deferredSearch]);

  return (
    <article className="detail-card">
      <div className="section-heading-row product-heading-row">
        <div>
          <p className="section-kicker">Deal ingestion</p>
          <h2>Recent Amadeus auth probes</h2>
        </div>
      </div>

      {latestRun ? (
        <div className="mini-stat-list admin-inline-summary-list">
          <div className="mini-stat-row">
            <span>Latest outcome</span>
            <strong>{formatProbeStatus(latestRun.status)}</strong>
          </div>
          <div className="mini-stat-row">
            <span>Latest summary</span>
            <strong>{latestRun.summary}</strong>
          </div>
          <div className="mini-stat-row">
            <span>Latest details</span>
            <strong>{formatProbeDetails(latestRun)}</strong>
          </div>
        </div>
      ) : (
        <p>No Amadeus probes recorded yet.</p>
      )}

      <div className="admin-delivery-toolbar">
        <label className="field-label admin-delivery-search">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="summary, env, auth state, error..."
          />
        </label>
        <label className="field-label admin-delivery-filter">
          Outcome
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | ScheduledJobRunStatus)}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="support-text admin-delivery-summary">
        Showing {filteredRuns.length} of {runs.length} probe runs.
      </p>

      <div className="admin-table admin-table-events">
        <div className="admin-table-head admin-table-head-events">
          <span>Time</span>
          <span>Status</span>
          <span>Summary</span>
          <span>Details</span>
        </div>
        {filteredRuns.length ? (
          filteredRuns.map((run) => (
            <div className="admin-table-row admin-table-row-events" key={run.id}>
              <span>{new Date(run.createdAt).toLocaleString()}</span>
              <span>{formatProbeStatus(run.status)}</span>
              <span>{run.summary}</span>
              <span>{formatProbeDetails(run)}</span>
            </div>
          ))
        ) : (
          <div className="admin-table-empty">No Amadeus probes match the current filters.</div>
        )}
      </div>
    </article>
  );
}
