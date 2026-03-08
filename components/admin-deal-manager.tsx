"use client";

import { useEffect, useState } from "react";

import { Deal } from "@/lib/types";

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

export function AdminDealManager() {
  const [draft, setDraft] = useState<DealDraft>(defaultDraft);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [status, setStatus] = useState<string>("Ready to publish.");
  const [loading, setLoading] = useState(true);

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

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Could not publish deal.");
      return;
    }

    setDraft(defaultDraft);
    setStatus("Deal published.");
    await loadDeals();
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
                <p className="mini-label">{deal.type} · {deal.cabin}</p>
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
