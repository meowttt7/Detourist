"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Deal } from "@/lib/types";

type DealDraft = {
  type: "flight" | "hotel";
  title: string;
  summary: string;
  origin: string;
  destination: string;
  destinationRegion: string;
  cabin: string;
  airlineOrBrand: string;
  currentPrice: number;
  referencePrice: number;
  currency: string;
  stops: number;
  totalDurationHours: number;
  overnight: boolean;
  repositionRequired: boolean;
  repositionFrom: string;
  catchSummary: string;
  whyWorthIt: string;
  bookingUrl: string;
  expiresAt: string;
  tags: string;
};

type DeliveryBreakdown = {
  sent: number;
  queued: number;
  failed: number;
};

type DemoSeedResult = {
  status: "created" | "existing";
  message: string;
  created: {
    profiles: number;
    linkedUsers: number;
    waitlistOnlyUsers: number;
    events: number;
    alerts: number;
    deliveries: DeliveryBreakdown;
  };
};

const defaultDraft: DealDraft = {
  type: "flight",
  title: "",
  summary: "",
  origin: "SIN",
  destination: "CDG",
  destinationRegion: "Europe",
  cabin: "Business Class",
  airlineOrBrand: "",
  currentPrice: 1800,
  referencePrice: 4200,
  currency: "USD",
  stops: 1,
  totalDurationHours: 18,
  overnight: false,
  repositionRequired: false,
  repositionFrom: "",
  catchSummary: "",
  whyWorthIt: "",
  bookingUrl: "https://example.com/deals/new-deal",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  tags: "business-class, flexible",
};

function summarizeDelivery(delivery: DeliveryBreakdown | undefined) {
  if (!delivery) {
    return "0 sent, 0 queued, 0 failed";
  }

  return `${delivery.sent} sent, ${delivery.queued} queued, ${delivery.failed} failed`;
}

export function AdminDealManager({ digestScheduleLabel }: { digestScheduleLabel: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<DealDraft>(defaultDraft);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [status, setStatus] = useState<string>("Ready to publish.");
  const [loading, setLoading] = useState(true);
  const [backfillStatus, setBackfillStatus] = useState<string>("Alert matching runs automatically on publish.");
  const [demoStatus, setDemoStatus] = useState<string>("Seed demo mode to light up the dashboard with believable product activity.");
  const [digestStatus, setDigestStatus] = useState<string>("Daily digest waits for users on batch mode and can be triggered manually for now.");

  async function loadDeals() {
    setLoading(true);
    const response = await fetch("/api/deals", { cache: "no-store" });
    const payload = (await response.json()) as { deals: Deal[] };
    setDeals(payload.deals);
    setLoading(false);
  }

  useEffect(() => {
    void loadDeals();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Publishing deal...");

    const response = await fetch("/api/deals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...draft,
        expiresAt: new Date(draft.expiresAt).toISOString(),
        repositionFrom: draft.repositionFrom || undefined,
        tags: draft.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      alertsGenerated?: number;
      deliveryBreakdown?: DeliveryBreakdown;
    };

    if (!response.ok) {
      setStatus(payload.error ?? "Could not publish deal.");
      if (response.status === 401) {
        router.push("/login?redirect=/admin");
      }
      return;
    }

    setDraft(defaultDraft);
    setStatus(`Deal published. ${payload.alertsGenerated ?? 0} alerts matched. Delivery: ${summarizeDelivery(payload.deliveryBreakdown)}.`);
    await loadDeals();
    router.refresh();
  };

  const handleBackfill = async () => {
    setBackfillStatus("Backfilling alerts across existing deals...");

    const response = await fetch("/api/alerts/run", {
      method: "POST",
    });

    const payload = (await response.json()) as { error?: string; createdCount?: number; deliveries?: DeliveryBreakdown };
    if (!response.ok) {
      setBackfillStatus(payload.error ?? "Could not run alert backfill.");
      if (response.status === 401) {
        router.push("/login?redirect=/admin");
      }
      return;
    }

    setBackfillStatus(`Backfill complete. ${payload.createdCount ?? 0} missing alerts created. Delivery: ${summarizeDelivery(payload.deliveries)}.`);
    router.refresh();
  };

  const handleDigestRun = async () => {
    setDigestStatus("Running daily digests...");

    const response = await fetch("/api/digests/run", {
      method: "POST",
    });

    const payload = (await response.json()) as {
      error?: string;
      usersProcessed?: number;
      digestsCreated?: number;
      skippedForCadence?: number;
      skippedForWindow?: number;
      deliveries?: DeliveryBreakdown;
    };
    if (!response.ok) {
      setDigestStatus(payload.error ?? "Could not run daily digests.");
      if (response.status === 401) {
        router.push("/login?redirect=/admin");
      }
      return;
    }

    setDigestStatus(
      `Daily digest run complete. ${payload.digestsCreated ?? 0} digests created across ${payload.usersProcessed ?? 0} users. ` +
      `${payload.skippedForCadence ?? 0} skipped for cadence, ${payload.skippedForWindow ?? 0} skipped for timing. ` +
      `Delivery: ${summarizeDelivery(payload.deliveries)}.`,
    );
    router.refresh();
  };

  const handleSeedDemo = async () => {
    setDemoStatus("Seeding demo mode...");

    const response = await fetch("/api/demo/seed", {
      method: "POST",
    });

    const payload = (await response.json()) as { error?: string } & Partial<DemoSeedResult>;
    if (!response.ok || !payload.status || !payload.created) {
      setDemoStatus(payload.error ?? "Could not seed demo mode.");
      if (response.status === 401) {
        router.push("/login?redirect=/admin");
      }
      return;
    }

    setDemoStatus(
      `${payload.message} ${payload.created.profiles} profiles, ${payload.created.linkedUsers} linked users, ` +
      `${payload.created.waitlistOnlyUsers} waitlist-only users, ${payload.created.events} events, ` +
      `${payload.created.alerts} alerts. Delivery: ${summarizeDelivery(payload.created.deliveries)}.`,
    );
    await loadDeals();
    router.refresh();
  };

  return (
    <div className="admin-layout">
      <form className="product-form" onSubmit={handleSubmit}>
        <div className="form-card">
          <p className="section-kicker">Admin</p>
          <h3>Publish a new Detourist deal</h3>
          <p>Keep this lightweight for now: enter the economics, the catch, and the booking link.</p>
          <div className="form-grid-two">
            <label className="field-label">
              Type
              <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as DealDraft["type"] }))}>
                <option value="flight">Flight</option>
                <option value="hotel">Hotel</option>
              </select>
            </label>
            <label className="field-label">
              Cabin or category
              <input value={draft.cabin} onChange={(event) => setDraft((current) => ({ ...current, cabin: event.target.value }))} />
            </label>
            <label className="field-label form-grid-span-two">
              Title
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} required />
            </label>
            <label className="field-label form-grid-span-two">
              Summary
              <textarea value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} rows={3} required />
            </label>
            <label className="field-label">
              Origin
              <input value={draft.origin} onChange={(event) => setDraft((current) => ({ ...current, origin: event.target.value.toUpperCase() }))} required />
            </label>
            <label className="field-label">
              Destination
              <input value={draft.destination} onChange={(event) => setDraft((current) => ({ ...current, destination: event.target.value.toUpperCase() }))} required />
            </label>
            <label className="field-label">
              Destination region
              <input value={draft.destinationRegion} onChange={(event) => setDraft((current) => ({ ...current, destinationRegion: event.target.value }))} required />
            </label>
            <label className="field-label">
              Airline or brand
              <input value={draft.airlineOrBrand} onChange={(event) => setDraft((current) => ({ ...current, airlineOrBrand: event.target.value }))} required />
            </label>
            <label className="field-label">
              Current price
              <input type="number" value={draft.currentPrice} onChange={(event) => setDraft((current) => ({ ...current, currentPrice: Number(event.target.value) }))} required />
            </label>
            <label className="field-label">
              Reference price
              <input type="number" value={draft.referencePrice} onChange={(event) => setDraft((current) => ({ ...current, referencePrice: Number(event.target.value) }))} required />
            </label>
            <label className="field-label">
              Currency
              <input value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} required />
            </label>
            <label className="field-label">
              Total duration hours
              <input type="number" value={draft.totalDurationHours} onChange={(event) => setDraft((current) => ({ ...current, totalDurationHours: Number(event.target.value) }))} />
            </label>
            <label className="field-label">
              Stops
              <input type="number" min={0} max={3} value={draft.stops} onChange={(event) => setDraft((current) => ({ ...current, stops: Number(event.target.value) }))} />
            </label>
            <label className="field-label">
              Expires at
              <input type="datetime-local" value={draft.expiresAt} onChange={(event) => setDraft((current) => ({ ...current, expiresAt: event.target.value }))} required />
            </label>
            <label className="toggle-row">
              <input type="checkbox" checked={draft.overnight} onChange={(event) => setDraft((current) => ({ ...current, overnight: event.target.checked }))} />
              <span>Includes overnight transit or check-in restriction</span>
            </label>
            <label className="toggle-row">
              <input type="checkbox" checked={draft.repositionRequired} onChange={(event) => setDraft((current) => ({ ...current, repositionRequired: event.target.checked }))} />
              <span>Requires repositioning to unlock the deal</span>
            </label>
            <label className="field-label form-grid-span-two">
              Reposition from
              <input value={draft.repositionFrom} onChange={(event) => setDraft((current) => ({ ...current, repositionFrom: event.target.value }))} />
            </label>
            <label className="field-label form-grid-span-two">
              The catch
              <textarea value={draft.catchSummary} onChange={(event) => setDraft((current) => ({ ...current, catchSummary: event.target.value }))} rows={3} required />
            </label>
            <label className="field-label form-grid-span-two">
              Why it's worth it
              <textarea value={draft.whyWorthIt} onChange={(event) => setDraft((current) => ({ ...current, whyWorthIt: event.target.value }))} rows={3} required />
            </label>
            <label className="field-label form-grid-span-two">
              Booking URL
              <input value={draft.bookingUrl} onChange={(event) => setDraft((current) => ({ ...current, bookingUrl: event.target.value }))} required />
            </label>
            <label className="field-label form-grid-span-two">
              Tags
              <input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} />
            </label>
          </div>
          <div className="form-footer">
            <p className="status-copy">{status}</p>
            <button className="button" type="submit">Publish deal</button>
          </div>
        </div>
      </form>

      <section className="admin-list">
        <div className="detail-card admin-ops-card">
          <p className="section-kicker">Demo mode</p>
          <h3>Light up Detourist with one click</h3>
          <p className="support-text">Create believable travelers, matched alerts, queued email deliveries, and early engagement signals without repeat-seeding duplicates.</p>
          <div className="detail-actions-column admin-ops-actions">
            <button className="button button-secondary" type="button" onClick={handleSeedDemo}>Seed demo data</button>
            <p className="status-copy">{demoStatus}</p>
          </div>
        </div>

        <div className="detail-card admin-ops-card">
          <p className="section-kicker">Alerts</p>
          <h3>Keep the alert inventory healthy</h3>
          <p className="support-text">Publishing new deals generates alerts automatically. Use backfill after importing profiles or adding seed content.</p>
          <div className="detail-actions-column admin-ops-actions">
            <button className="button button-secondary" type="button" onClick={handleBackfill}>Run alert backfill</button>
            <p className="status-copy">{backfillStatus}</p>
          </div>
        </div>

        <div className="detail-card admin-ops-card">
          <p className="section-kicker">Digests</p>
          <h3>Send the daily batch</h3>
          <p className="support-text">Users on daily digest mode collect matched alerts until a digest run sends them as a single email. Scheduled runs can safely fire every hour and will only send after {digestScheduleLabel} once per local day.</p>
          <div className="detail-actions-column admin-ops-actions">
            <button className="button button-secondary" type="button" onClick={handleDigestRun}>Run daily digests</button>
            <p className="status-copy">{digestStatus}</p>
          </div>
        </div>

        <div className="section-heading-row product-heading-row">
          <div>
            <p className="section-kicker">Current deals</p>
            <h2>{loading ? "Loading..." : `${deals.length} deals in the feed`}</h2>
          </div>
        </div>
        <div className="admin-deal-list">
          {deals.map((deal) => (
            <article className="mini-deal-card" key={deal.id}>
              <div>
                <p className="mini-label">{deal.type} | {deal.cabin}</p>
                <h3>{deal.title}</h3>
                <p>{deal.origin} to {deal.destination}</p>
              </div>
              <div className="mini-deal-meta">
                <span>${deal.currentPrice}</span>
                <a href={`/deals/${deal.slug}`}>Open</a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
