"use client";

import { useDeferredValue, useMemo, useState } from "react";

import type { ScheduledJobRun, ScheduledJobRunStatus } from "@/lib/types";

type AdminScheduledJobRunsProps = {
  latestRun: ScheduledJobRun | null;
  runs: ScheduledJobRun[];
};

const statusOptions: Array<{ value: "all" | ScheduledJobRunStatus; label: string }> = [
  { value: "all", label: "All outcomes" },
  { value: "success", label: "Sent" },
  { value: "skipped", label: "Skipped" },
  { value: "failed", label: "Failed" },
  { value: "unauthorized", label: "Blocked" },
];

function formatScheduledRunStatus(status: ScheduledJobRunStatus) {
  switch (status) {
    case "success":
      return "sent";
    case "skipped":
      return "skipped";
    case "failed":
      return "failed";
    case "unauthorized":
      return "blocked";
    default:
      return status;
  }
}

function formatScheduledRunDeliveries(run: ScheduledJobRun) {
  const deliveries = run.metadata.deliveries;
  if (!deliveries) {
    return "No delivery summary.";
  }

  return `${deliveries.sent} sent, ${deliveries.queued} queued, ${deliveries.failed} failed`;
}

function matchesSearch(run: ScheduledJobRun, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [
    run.summary,
    run.status,
    run.metadata.scheduleDate ?? "",
    run.metadata.scheduleLabel ?? "",
    run.metadata.errorMessage ?? "",
    formatScheduledRunDeliveries(run),
  ].join(" ").toLowerCase();

  return haystack.includes(search);
}

export function AdminScheduledJobRuns({ latestRun, runs }: AdminScheduledJobRunsProps) {
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
          <p className="section-kicker">Scheduler</p>
          <h2>Recent cron-safe digest runs</h2>
        </div>
      </div>

      {latestRun ? (
        <div className="mini-stat-list admin-inline-summary-list">
          <div className="mini-stat-row">
            <span>Latest outcome</span>
            <strong>{formatScheduledRunStatus(latestRun.status)}</strong>
          </div>
          <div className="mini-stat-row">
            <span>Latest summary</span>
            <strong>{latestRun.summary}</strong>
          </div>
          <div className="mini-stat-row">
            <span>Latest delivery mix</span>
            <strong>{formatScheduledRunDeliveries(latestRun)}</strong>
          </div>
        </div>
      ) : (
        <p>No scheduled digest runs recorded yet.</p>
      )}

      <div className="admin-delivery-toolbar">
        <label className="field-label admin-delivery-search">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="summary, schedule date, error, outcome..."
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
        Showing {filteredRuns.length} of {runs.length} scheduler runs.
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
              <span>{formatScheduledRunStatus(run.status)}</span>
              <span>{run.summary}</span>
              <span>
                {run.metadata.scheduleDate ? `${run.metadata.scheduleDate} | ` : ""}
                {formatScheduledRunDeliveries(run)}
              </span>
            </div>
          ))
        ) : (
          <div className="admin-table-empty">No scheduler runs match the current filters.</div>
        )}
      </div>
    </article>
  );
}
