"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Deal } from "@/lib/types";
import type { DealImportPreviewResult, ImportedDealCandidate, ImportedDealDraft, ImportedDealDraftWithReview, SourceTravelClass } from "@/lib/sources/types";

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

type AmadeusSearchDraft = {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  returnDate: string;
  adults: number;
  travelClass: SourceTravelClass;
  nonStop: boolean;
  maxPrice: number;
  currencyCode: string;
};

type DeliveryBreakdown = {
  sent: number;
  queued: number;
  failed: number;
};

type DuplicateMatch = {
  dealId: string;
  dealSlug: string;
  title: string;
  publishedAt: string;
  currentPrice: number;
  currency: string;
  similarityLabel: string;
  confidence: "high" | "medium";
};

type AlertBackfillPreview = {
  dealsConsidered: number;
  profilesConsidered: number;
  existingAlertCount: number;
  missingMatches: number;
  emailAlerts: number;
  inAppAlerts: number;
  instantEmailDeliveries: number;
  dailyDigestCandidates: number;
};

type DigestRunPreview = {
  force: boolean;
  scheduleDate: string;
  scheduleLabel: string;
  eligibleUsers: number;
  usersWithPendingAlerts: number;
  usersReadyToSend: number;
  pendingAlertCount: number;
  skippedForCadence: number;
  skippedForWindow: number;
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

const defaultAmadeusSearch: AmadeusSearchDraft = {
  originLocationCode: "SIN",
  destinationLocationCode: "CDG",
  departureDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  returnDate: new Date(Date.now() + 52 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  adults: 1,
  travelClass: "BUSINESS",
  nonStop: false,
  maxPrice: 2500,
  currencyCode: "USD",
};

function summarizeDelivery(delivery: DeliveryBreakdown | undefined) {
  if (!delivery) {
    return "0 sent, 0 queued, 0 failed";
  }

  return `${delivery.sent} sent, ${delivery.queued} queued, ${delivery.failed} failed`;
}

function formatImportTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

export function AdminDealManager({ digestScheduleLabel }: { digestScheduleLabel: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<DealDraft>(defaultDraft);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [status, setStatus] = useState<string>("Ready to publish.");
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [backfillPreview, setBackfillPreview] = useState<AlertBackfillPreview | null>(null);
  const [digestPreview, setDigestPreview] = useState<DigestRunPreview | null>(null);
  const [backfillStatus, setBackfillStatus] = useState<string>("Alert matching runs automatically on publish.");
  const [demoStatus, setDemoStatus] = useState<string>("Seed demo mode to light up the dashboard with believable product activity.");
  const [digestStatus, setDigestStatus] = useState<string>("Daily digest waits for users on batch mode and can be triggered manually for now.");
  const [amadeusSearch, setAmadeusSearch] = useState<AmadeusSearchDraft>(defaultAmadeusSearch);
  const [amadeusPreview, setAmadeusPreview] = useState<DealImportPreviewResult | null>(null);
  const [amadeusLoading, setAmadeusLoading] = useState(false);
  const [amadeusStatus, setAmadeusStatus] = useState<string>("Preview live-source fares, then load one into the publish form for review.");
  const [savedImports, setSavedImports] = useState<ImportedDealDraftWithReview[]>([]);
  const [importsLoading, setImportsLoading] = useState(true);
  const [importsStatus, setImportsStatus] = useState<string>("Save strong live-source candidates here while you review copy and booking links.");
  const [activeImportDraftId, setActiveImportDraftId] = useState<string | null>(null);

  async function loadDeals() {
    setLoading(true);
    const response = await fetch("/api/deals", { cache: "no-store" });
    const payload = (await response.json()) as { deals: Deal[] };
    setDeals(payload.deals);
    setLoading(false);
  }

  async function loadImportDrafts() {
    setImportsLoading(true);

    try {
      const response = await fetch("/api/admin/sources/imports", { cache: "no-store" });
      const payload = (await response.json()) as { drafts?: ImportedDealDraftWithReview[]; error?: string };

      if (!response.ok) {
        setSavedImports([]);
        setImportsStatus(payload.error ?? "Could not load saved import drafts.");
        if (response.status === 401) {
          router.push("/login?redirect=/admin");
        }
        return;
      }

      setSavedImports(payload.drafts ?? []);
    } finally {
      setImportsLoading(false);
    }
  }

  async function loadPreviews() {
    setPreviewLoading(true);

    try {
      const [backfillResponse, digestResponse] = await Promise.all([
        fetch("/api/alerts/run", { cache: "no-store" }),
        fetch("/api/digests/run", { cache: "no-store" }),
      ]);

      if (backfillResponse.ok) {
        setBackfillPreview(await backfillResponse.json() as AlertBackfillPreview);
      }

      if (digestResponse.ok) {
        setDigestPreview(await digestResponse.json() as DigestRunPreview);
      }
    } finally {
      setPreviewLoading(false);
    }
  }

  useEffect(() => {
    void loadDeals();
    void loadPreviews();
    void loadImportDrafts();
  }, []);

  const deleteImportDraftById = async (draftId: string) => {
    const response = await fetch(`/api/admin/sources/imports?id=${encodeURIComponent(draftId)}`, {
      method: "DELETE",
    });

    const payload = (await response.json()) as { success?: boolean; error?: string };
    if (!response.ok) {
      if (response.status === 401) {
        router.push("/login?redirect=/admin");
      }
      throw new Error(payload.error ?? "Could not delete saved import.");
    }
  };

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
      duplicates?: DuplicateMatch[];
      duplicateWarnings?: DuplicateMatch[];
    };

    if (!response.ok) {
      const duplicateSummary = payload.duplicates?.length
        ? ` Conflicts: ${payload.duplicates.map((match) => `${match.title} (${match.similarityLabel})`).join("; ")}.`
        : "";
      setStatus(`${payload.error ?? "Could not publish deal."}${duplicateSummary}`);
      if (response.status === 401) {
        router.push("/login?redirect=/admin");
      }
      return;
    }

    const publishedImportDraftId = activeImportDraftId;
    let nextStatus = `Deal published. ${payload.alertsGenerated ?? 0} alerts matched. Delivery: ${summarizeDelivery(payload.deliveryBreakdown)}.`;
    if (payload.duplicateWarnings?.length) {
      nextStatus += ` Similar live deals worth reviewing: ${payload.duplicateWarnings.map((match) => match.title).join(", ")}.`;
    }

    setDraft(defaultDraft);
    setActiveImportDraftId(null);

    if (publishedImportDraftId) {
      try {
        await deleteImportDraftById(publishedImportDraftId);
        setImportsStatus("Saved import removed from the queue after publish.");
        nextStatus += " Saved import removed from queue.";
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not delete saved import after publish.";
        setImportsStatus(message);
        nextStatus += " The saved import could not be removed automatically.";
      }
    }

    setStatus(nextStatus);
    await Promise.all([loadDeals(), loadPreviews(), loadImportDrafts()]);
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
    await loadPreviews();
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
    await loadPreviews();
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
    await Promise.all([loadDeals(), loadPreviews()]);
    router.refresh();
  };

  const handleAmadeusPreview = async () => {
    setAmadeusLoading(true);
    setAmadeusStatus("Searching live fares from Amadeus...");

    const response = await fetch("/api/admin/sources/amadeus/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(amadeusSearch),
    });

    const payload = (await response.json()) as DealImportPreviewResult & { error?: string };
    setAmadeusLoading(false);

    if (!response.ok) {
      setAmadeusPreview(null);
      setAmadeusStatus(payload.error ?? "Could not load live-source preview.");
      if (response.status === 401) {
        router.push("/login?redirect=/admin");
      }
      return;
    }

    setAmadeusPreview(payload);
    setAmadeusStatus(`Loaded ${payload.candidates.length} live-source candidates from Amadeus.`);
  };

  const handleSaveImportCandidate = async (candidate: ImportedDealCandidate) => {
    setImportsStatus("Saving live-source candidate...");

    const response = await fetch("/api/admin/sources/imports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(candidate),
    });

    const payload = (await response.json()) as { draft?: ImportedDealDraft; error?: string };
    if (!response.ok) {
      setImportsStatus(payload.error ?? "Could not save import draft.");
      if (response.status === 401) {
        router.push("/login?redirect=/admin");
      }
      return;
    }

    setImportsStatus(`Saved ${payload.draft?.payload.title ?? candidate.payload.title} to the review queue.`);
    await loadImportDrafts();
  };

  const handleDeleteImportDraft = async (draftId: string) => {
    setImportsStatus("Removing saved import...");

    try {
      await deleteImportDraftById(draftId);
      if (activeImportDraftId === draftId) {
        setActiveImportDraftId(null);
      }
      setImportsStatus("Saved import removed from the queue.");
      await loadImportDrafts();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete saved import.";
      setImportsStatus(message);
    }
  };

  const applyImportCandidate = (candidate: ImportedDealCandidate, importDraftId: string | null = null) => {
    setDraft({
      type: candidate.payload.type,
      title: candidate.payload.title,
      summary: candidate.payload.summary,
      origin: candidate.payload.origin,
      destination: candidate.payload.destination,
      destinationRegion: candidate.payload.destinationRegion,
      cabin: candidate.payload.cabin,
      airlineOrBrand: candidate.payload.airlineOrBrand,
      currentPrice: candidate.payload.currentPrice,
      referencePrice: candidate.payload.referencePrice,
      currency: candidate.payload.currency,
      stops: candidate.payload.stops,
      totalDurationHours: candidate.payload.totalDurationHours,
      overnight: candidate.payload.overnight,
      repositionRequired: candidate.payload.repositionRequired,
      repositionFrom: candidate.payload.repositionFrom ?? "",
      catchSummary: candidate.payload.catchSummary,
      whyWorthIt: candidate.payload.whyWorthIt,
      bookingUrl: candidate.payload.bookingUrl,
      expiresAt: candidate.payload.expiresAt.slice(0, 16),
      tags: candidate.payload.tags.join(", "),
    });
    setActiveImportDraftId(importDraftId);
    setStatus(
      importDraftId
        ? "Saved import loaded into the publish form. Add a public booking URL before publishing."
        : "Live-source candidate loaded into the publish form. Add a public booking URL before publishing.",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          <p className="support-text admin-preview-copy">
            {previewLoading
              ? "Loading preview..."
              : backfillPreview
                ? `Preview: ${backfillPreview.missingMatches} missing matches across ${backfillPreview.dealsConsidered} deals and ${backfillPreview.profilesConsidered} profiles. ${backfillPreview.emailAlerts} email, ${backfillPreview.inAppAlerts} in-app, ${backfillPreview.instantEmailDeliveries} instant sends, ${backfillPreview.dailyDigestCandidates} daily-digest candidates.`
                : "Preview unavailable right now."}
          </p>
          <div className="detail-actions-column admin-ops-actions">
            <button className="button button-secondary" type="button" onClick={handleBackfill}>Run alert backfill</button>
            <p className="status-copy">{backfillStatus}</p>
          </div>
        </div>

        <div className="detail-card admin-ops-card">
          <p className="section-kicker">Digests</p>
          <h3>Send the daily batch</h3>
          <p className="support-text">Users on daily digest mode collect matched alerts until a digest run sends them as a single email. Scheduled runs can safely fire every hour and will only send after {digestScheduleLabel} once per local day.</p>
          <p className="support-text admin-preview-copy">
            {previewLoading
              ? "Loading preview..."
              : digestPreview
                ? `Preview: ${digestPreview.usersReadyToSend} digests ready now across ${digestPreview.pendingAlertCount} pending alerts. ${digestPreview.usersWithPendingAlerts} users have digest-eligible alerts, ${digestPreview.eligibleUsers} users are on daily digest.`
                : "Preview unavailable right now."}
          </p>
          <div className="detail-actions-column admin-ops-actions">
            <button className="button button-secondary" type="button" onClick={handleDigestRun}>Run daily digests</button>
            <p className="status-copy">{digestStatus}</p>
          </div>
        </div>

        <div className="detail-card admin-ops-card">
          <p className="section-kicker">Live source preview</p>
          <h3>Search Amadeus and load a candidate into the publish form</h3>
          <p className="support-text">This is a review-first workflow. Live-source candidates do not publish automatically, and each one still needs a public booking URL before it goes live.</p>
          <div className="form-grid-two admin-import-grid">
            <label className="field-label">
              Origin
              <input value={amadeusSearch.originLocationCode} onChange={(event) => setAmadeusSearch((current) => ({ ...current, originLocationCode: event.target.value.toUpperCase() }))} />
            </label>
            <label className="field-label">
              Destination
              <input value={amadeusSearch.destinationLocationCode} onChange={(event) => setAmadeusSearch((current) => ({ ...current, destinationLocationCode: event.target.value.toUpperCase() }))} />
            </label>
            <label className="field-label">
              Departure date
              <input type="date" value={amadeusSearch.departureDate} onChange={(event) => setAmadeusSearch((current) => ({ ...current, departureDate: event.target.value }))} />
            </label>
            <label className="field-label">
              Return date
              <input type="date" value={amadeusSearch.returnDate} onChange={(event) => setAmadeusSearch((current) => ({ ...current, returnDate: event.target.value }))} />
            </label>
            <label className="field-label">
              Travel class
              <select value={amadeusSearch.travelClass} onChange={(event) => setAmadeusSearch((current) => ({ ...current, travelClass: event.target.value as SourceTravelClass }))}>
                <option value="ECONOMY">Economy</option>
                <option value="PREMIUM_ECONOMY">Premium Economy</option>
                <option value="BUSINESS">Business</option>
                <option value="FIRST">First</option>
              </select>
            </label>
            <label className="field-label">
              Max price
              <input type="number" value={amadeusSearch.maxPrice} onChange={(event) => setAmadeusSearch((current) => ({ ...current, maxPrice: Number(event.target.value) }))} />
            </label>
            <label className="field-label">
              Adults
              <input type="number" min={1} max={6} value={amadeusSearch.adults} onChange={(event) => setAmadeusSearch((current) => ({ ...current, adults: Number(event.target.value) }))} />
            </label>
            <label className="field-label">
              Currency
              <input value={amadeusSearch.currencyCode} onChange={(event) => setAmadeusSearch((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} />
            </label>
            <label className="toggle-row form-grid-span-two">
              <input type="checkbox" checked={amadeusSearch.nonStop} onChange={(event) => setAmadeusSearch((current) => ({ ...current, nonStop: event.target.checked }))} />
              <span>Only show nonstop options</span>
            </label>
          </div>
          <div className="detail-actions-column admin-ops-actions">
            <button className="button button-secondary" type="button" onClick={handleAmadeusPreview} disabled={amadeusLoading}>
              {amadeusLoading ? "Searching..." : "Preview live fares"}
            </button>
            <p className="status-copy">{amadeusStatus}</p>
          </div>
          {amadeusPreview ? (
            <div className="admin-import-preview-list">
              {amadeusPreview.warnings.map((warning) => (
                <p className="status-copy" key={warning}>{warning}</p>
              ))}
              {amadeusPreview.candidates.map((candidate) => (
                <article className="admin-import-preview-card" key={candidate.id}>
                  <div className="admin-import-preview-head">
                    <div>
                      <p className="mini-label">{candidate.sourceLabel}</p>
                      <h4>{candidate.payload.title}</h4>
                      <p>{candidate.sourceSummary}</p>
                    </div>
                    <div className="admin-import-actions">
                      <button className="button button-small button-secondary" type="button" onClick={() => handleSaveImportCandidate(candidate)}>
                        Save to queue
                      </button>
                      <button className="button button-small button-secondary" type="button" onClick={() => applyImportCandidate(candidate)}>
                        Use in publish form
                      </button>
                    </div>
                  </div>
                  <div className="mini-stat-list admin-inline-summary-list">
                    <div className="mini-stat-row">
                      <span>Current</span>
                      <strong>{candidate.payload.currency} {candidate.payload.currentPrice}</strong>
                    </div>
                    <div className="mini-stat-row">
                      <span>Reference</span>
                      <strong>{candidate.payload.currency} {candidate.payload.referencePrice}</strong>
                    </div>
                    <div className="mini-stat-row">
                      <span>Catch</span>
                      <strong>{candidate.payload.catchSummary}</strong>
                    </div>
                  </div>
                  <div className="reason-stack account-tag-row">
                    {candidate.payload.tags.map((tag) => (
                      <span className="insight-pill" key={`${candidate.id}-${tag}`}>{tag}</span>
                    ))}
                  </div>
                  <div className="admin-import-notes">
                    {candidate.reviewNotes.map((note) => (
                      <p key={`${candidate.id}-${note}`}>{note}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          <div className="admin-import-queue">
            <div className="section-heading-row product-heading-row">
              <div>
                <p className="section-kicker">Saved queue</p>
                <h3>{importsLoading ? "Loading..." : `${savedImports.length} saved candidates`}</h3>
              </div>
            </div>
            <p className="status-copy">{importsStatus}</p>
            {importsLoading ? (
              <p className="support-text">Loading saved imports...</p>
            ) : savedImports.length ? (
              <div className="admin-import-preview-list">
                {savedImports.map((savedImport) => (
                  <article className={`admin-import-preview-card${activeImportDraftId === savedImport.id ? " is-active" : ""}`} key={savedImport.id}>
                    <div className="admin-import-preview-head">
                      <div>
                        <p className="mini-label">{savedImport.sourceLabel}</p>
                        <h4>{savedImport.payload.title}</h4>
                        <p>{savedImport.sourceSummary}</p>
                      </div>
                      <div className="admin-import-actions">
                        <button className="button button-small button-secondary" type="button" onClick={() => applyImportCandidate(savedImport, savedImport.id)}>
                          Load into publish form
                        </button>
                        <button className="button button-small button-secondary" type="button" onClick={() => handleDeleteImportDraft(savedImport.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="admin-import-meta">
                      <span>Saved {formatImportTimestamp(savedImport.createdAt)}</span>
                      <span>{savedImport.payload.currency} {savedImport.payload.currentPrice} vs {savedImport.payload.referencePrice}</span>
                    </div>
                    <div className="admin-import-review-band">
                      <div className="score-badge alt">
                        <span>{savedImport.review.worthItScore}</span>
                      </div>
                      <div className="admin-import-review-copy">
                        <p className="mini-label">{savedImport.review.matchLabel} Â· {savedImport.review.savingsPercent}% below benchmark</p>
                        <p>{savedImport.payload.whyWorthIt}</p>
                      </div>
                    </div>
                    <div className="reason-stack account-tag-row">
                      {savedImport.payload.tags.map((tag) => (
                        <span className="insight-pill" key={`${savedImport.id}-${tag}`}>{tag}</span>
                      ))}
                    </div>
                    <div className="admin-import-notes">
                      {savedImport.review.reasons.slice(0, 2).map((reason) => (
                        <p key={`${savedImport.id}-reason-${reason}`}>{reason}</p>
                      ))}
                      {savedImport.review.warnings.map((warning) => (
                        <p key={`${savedImport.id}-warning-${warning}`}>{warning}</p>
                      ))}
                      {savedImport.reviewNotes.map((note) => (
                        <p key={`${savedImport.id}-note-${note}`}>{note}</p>
                      ))}
                    </div>
                    {savedImport.review.duplicateMatches.length ? (
                      <div className="admin-import-duplicates">
                        <p className="mini-label">Similar live deals already in the feed</p>
                        <div className="mini-stat-list">
                          {savedImport.review.duplicateMatches.map((match) => (
                            <div className="mini-stat-row" key={`${savedImport.id}-${match.dealId}`}>
                              <span>
                                <a href={`/deals/${match.dealSlug}`}>{match.title}</a>
                                {` Â· ${match.similarityLabel}`}
                              </span>
                              <strong>{match.currency} {match.currentPrice}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="support-text">No saved candidates yet. Save the best live fares here while you finish copy and booking links.</p>
            )}
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













