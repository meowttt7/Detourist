"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import type { AlertChannel, AlertStatus } from "@/lib/types";

type RecentAlert = {
  id: string;
  dealTitle: string;
  dealSlug: string;
  score: number;
  channel: AlertChannel;
  status: AlertStatus;
  createdAt: string;
};

type AdminRecentAlertsProps = {
  initialAlerts: RecentAlert[];
};

const channelOptions: Array<{ value: "all" | AlertChannel; label: string }> = [
  { value: "all", label: "All channels" },
  { value: "email", label: "Email" },
  { value: "in_app", label: "In-app" },
];

const statusOptions: Array<{ value: "all" | AlertStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "viewed", label: "Viewed" },
];

function matchesSearch(alert: RecentAlert, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [
    alert.dealTitle,
    alert.dealSlug,
    alert.channel,
    alert.status,
    String(alert.score),
  ].join(" ").toLowerCase();

  return haystack.includes(search);
}

export function AdminRecentAlerts({ initialAlerts }: AdminRecentAlertsProps) {
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | AlertChannel>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AlertStatus>("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredAlerts = useMemo(() => (
    initialAlerts.filter((alert) => {
      if (channelFilter !== "all" && alert.channel !== channelFilter) {
        return false;
      }

      if (statusFilter !== "all" && alert.status !== statusFilter) {
        return false;
      }

      return matchesSearch(alert, deferredSearch);
    })
  ), [initialAlerts, channelFilter, statusFilter, deferredSearch]);

  return (
    <article className="detail-card">
      <div className="section-heading-row product-heading-row">
        <div>
          <p className="section-kicker">Recent alerts</p>
          <h2>Latest generated matches</h2>
        </div>
      </div>

      <div className="admin-delivery-toolbar">
        <label className="field-label admin-delivery-search">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="deal, slug, score, channel..."
          />
        </label>
        <label className="field-label admin-delivery-filter">
          Channel
          <select value={channelFilter} onChange={(event) => setChannelFilter(event.target.value as "all" | AlertChannel)}>
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="field-label admin-delivery-filter">
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | AlertStatus)}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="support-text admin-delivery-summary">
        Showing {filteredAlerts.length} of {initialAlerts.length} alerts.
      </p>

      <div className="admin-table admin-table-events">
        <div className="admin-table-head admin-table-head-events">
          <span>Deal</span>
          <span>Channel</span>
          <span>Score</span>
          <span>Status</span>
          <span>Created</span>
        </div>
        {filteredAlerts.length ? (
          filteredAlerts.map((alert) => (
            <div className="admin-table-row admin-table-row-events" key={alert.id}>
              <Link href={`/deals/${alert.dealSlug}`}>{alert.dealTitle}</Link>
              <span>{alert.channel}</span>
              <span>{alert.score}</span>
              <span>{alert.status}</span>
              <span>{new Date(alert.createdAt).toLocaleString()}</span>
            </div>
          ))
        ) : (
          <div className="admin-table-empty">No alerts match the current filters.</div>
        )}
      </div>
    </article>
  );
}
