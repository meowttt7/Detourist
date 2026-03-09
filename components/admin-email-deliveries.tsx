"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { EmailDelivery } from "@/lib/types";

type AdminEmailDeliveriesProps = {
  initialDeliveries: EmailDelivery[];
};

export function AdminEmailDeliveries({ initialDeliveries }: AdminEmailDeliveriesProps) {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [status, setStatus] = useState<string>("");
  const [pendingId, setPendingId] = useState<string | null>(null);

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
      <div className="admin-table admin-table-events">
        <div className="admin-table-head admin-table-head-deliveries">
          <span>Recipient</span>
          <span>Type</span>
          <span>Mode</span>
          <span>Status</span>
          <span>Retries</span>
          <span>Action</span>
        </div>
        {deliveries.length ? (
          deliveries.map((delivery) => {
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
          <div className="admin-table-empty">No email deliveries yet.</div>
        )}
      </div>
      {status ? <p className="status-copy admin-inline-status">{status}</p> : null}
    </article>
  );
}
