"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { EmailDelivery, EmailDeliveryKind, EmailDeliveryStatus } from "@/lib/types";

type AdminEmailDeliveriesProps = {
  initialDeliveries: EmailDelivery[];
};

const kindOptions: Array<{ value: "all" | EmailDeliveryKind; label: string }> = [
  { value: "all", label: "All types" },
  { value: "alert", label: "Alerts" },
  { value: "signin", label: "Sign-in links" },
  { value: "digest", label: "Digests" },
];

const statusOptions: Array<{ value: "all" | EmailDeliveryStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "sent", label: "Sent" },
  { value: "queued", label: "Queued" },
  { value: "failed", label: "Failed" },
];

function matchesSearch(delivery: EmailDelivery, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [
    delivery.recipientEmail,
    delivery.subject,
    delivery.referenceId,
    delivery.kind,
    delivery.mode,
    delivery.status,
  ].join(" ").toLowerCase();

  return haystack.includes(search);
}

export function AdminEmailDeliveries({ initialDeliveries }: AdminEmailDeliveriesProps) {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [status, setStatus] = useState<string>("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | EmailDeliveryKind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EmailDeliveryStatus>("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredDeliveries = useMemo(() => (
    deliveries.filter((delivery) => {
      if (kindFilter !== "all" && delivery.kind !== kindFilter) {
        return false;
      }

      if (statusFilter !== "all" && delivery.status !== statusFilter) {
        return false;
      }

      return matchesSearch(delivery, deferredSearch);
    })
  ), [deliveries, kindFilter, statusFilter, deferredSearch]);

  async function handleRetry(deliveryId: string) {
    setPendingId(deliveryId);
    setStatus("Retrying delivery...");

    const response = await fetch("/api/email-deliveries/retry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deliveryId }),
    });

    const payload = (await response.json()) as { error?: string; delivery?: EmailDelivery };
    if (!response.ok || !payload.delivery) {
      setStatus(payload.error ?? "Could not retry this delivery.");
      setPendingId(null);
      return;
    }

    setDeliveries((current) => current.map((delivery) => (delivery.id === payload.delivery?.id ? payload.delivery : delivery)));
    setStatus(`Retried ${payload.delivery.kind} email for ${payload.delivery.recipientEmail}.`);
    setPendingId(null);
    router.refresh();
  }

  return (
    <article className="detail-card">
      <div className="section-heading-row product-heading-row">
        <div>
          <p className="section-kicker">Recent deliveries</p>
          <h2>Latest email attempts</h2>
        </div>
      </div>

      <div className="admin-delivery-toolbar">
        <label className="field-label admin-delivery-search">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="recipient, subject, status, reference..."
          />
        </label>
        <label className="field-label admin-delivery-filter">
          Type
          <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as "all" | EmailDeliveryKind)}>
            {kindOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="field-label admin-delivery-filter">
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | EmailDeliveryStatus)}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="support-text admin-delivery-summary">
        Showing {filteredDeliveries.length} of {deliveries.length} deliveries.
      </p>

      <div className="admin-table admin-table-events">
        <div className="admin-table-head admin-table-head-deliveries">
          <span>Recipient</span>
          <span>Type</span>
          <span>Mode</span>
          <span>Status</span>
          <span>Retries</span>
          <span>Action</span>
        </div>
        {filteredDeliveries.length ? (
          filteredDeliveries.map((delivery) => {
            const retryable = delivery.status === "queued" || delivery.status === "failed";
            return (
              <div className="admin-table-row admin-table-row-deliveries" key={delivery.id}>
                <span>{delivery.recipientEmail}</span>
                <span>{delivery.kind}</span>
                <span>{delivery.mode}</span>
                <span>{delivery.status}</span>
                <span>{delivery.retryCount}</span>
                <div className="admin-delivery-action">
                  {retryable ? (
                    <button
                      className="button button-secondary button-small"
                      type="button"
                      disabled={pendingId === delivery.id}
                      onClick={() => void handleRetry(delivery.id)}
                    >
                      {pendingId === delivery.id ? "Retrying..." : "Retry"}
                    </button>
                  ) : (
                    <span className="support-text">No action</span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="admin-table-empty">No deliveries match the current filters.</div>
        )}
      </div>
      {status ? <p className="status-copy admin-inline-status">{status}</p> : null}
    </article>
  );
}
