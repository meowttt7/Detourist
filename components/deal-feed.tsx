"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { scoreDeal } from "@/lib/score";
import { Deal, TravelerProfile } from "@/lib/types";

const profileStorageKey = "detourist-profile";
const savedDealsKey = "detourist-saved-deals";
const hiddenDealsKey = "detourist-hidden-deals";

type SortMode = "best" | "latest" | "cheapest";
type FilterMode = "all" | "flight" | "hotel" | "saved";

export function DealFeed() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<TravelerProfile | null>(null);
  const [savedDeals, setSavedDeals] = useState<string[]>([]);
  const [hiddenDeals, setHiddenDeals] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("best");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  useEffect(() => {
    const stored = window.localStorage.getItem(profileStorageKey);
    if (stored) {
      try {
        setProfile(JSON.parse(stored) as TravelerProfile);
      } catch {
        window.localStorage.removeItem(profileStorageKey);
      }
    }

    const saved = window.localStorage.getItem(savedDealsKey);
    if (saved) {
      try {
        setSavedDeals(JSON.parse(saved) as string[]);
      } catch {
        window.localStorage.removeItem(savedDealsKey);
      }
    }

    const hidden = window.localStorage.getItem(hiddenDealsKey);
    if (hidden) {
      try {
        setHiddenDeals(JSON.parse(hidden) as string[]);
      } catch {
        window.localStorage.removeItem(hiddenDealsKey);
      }
    }

    async function loadDeals() {
      try {
        const response = await fetch("/api/deals", { cache: "no-store" });
        const payload = (await response.json()) as { deals?: Deal[]; error?: string };

        if (!response.ok || !payload.deals) {
          throw new Error(payload.error ?? "Could not load deals.");
        }

        setDeals(payload.deals);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load deals.");
      } finally {
        setLoading(false);
      }
    }

    void loadDeals();
  }, []);

  const rankedDeals = useMemo(() => {
    const visible = deals.filter((deal) => !hiddenDeals.includes(deal.id));
    const filtered = visible.filter((deal) => {
      if (filterMode === "saved") {
        return savedDeals.includes(deal.id);
      }

      return filterMode === "all" || deal.type === filterMode;
    });

    return filtered
      .map((deal) => ({ deal, score: scoreDeal(deal, profile ?? undefined) }))
      .sort((left, right) => {
        if (sortMode === "cheapest") {
          return left.deal.currentPrice - right.deal.currentPrice;
        }
        if (sortMode === "latest") {
          return Date.parse(right.deal.publishedAt) - Date.parse(left.deal.publishedAt);
        }
        return right.score.score - left.score.score;
      });
  }, [deals, filterMode, hiddenDeals, profile, savedDeals, sortMode]);

  function toggleSaved(id: string) {
    setSavedDeals((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem(savedDealsKey, JSON.stringify(next));
      return next;
    });
  }

  function hideDeal(id: string) {
    setHiddenDeals((current) => {
      if (current.includes(id)) {
        return current;
      }

      const next = [...current, id];
      window.localStorage.setItem(hiddenDealsKey, JSON.stringify(next));
      return next;
    });
  }

  if (loading) {
    return <div className="state-card">Loading Detourist deals...</div>;
  }

  if (error) {
    return <div className="state-card state-card-error">{error}</div>;
  }

  return (
    <div className="feed-layout">
      <aside className="sidebar-card">
        <p className="section-kicker">Your profile</p>
        {profile ? (
          <>
            <h3>{profile.homeAirports.join(", ")} departures</h3>
            <ul className="profile-list">
              <li>Cabins: {profile.preferredCabins.join(", ")}</li>
              <li>Budget ceiling: ${profile.budgetMax}</li>
              <li>Max stops: {profile.maxStops}</li>
              <li>Overnight okay: {profile.allowOvernight ? "Yes" : "No"}</li>
              <li>Pain tolerance: {profile.maxTravelPain}/10</li>
              <li>Saved deals: {savedDeals.length}</li>
              <li>Hidden deals: {hiddenDeals.length}</li>
            </ul>
            <a className="button button-secondary" href="/onboarding">
              Edit profile
            </a>
          </>
        ) : (
          <>
            <h3>No detour profile yet</h3>
            <p>Set your tolerance once and Detourist will rank deals around your actual preferences.</p>
            <a className="button" href="/onboarding">
              Set detour profile
            </a>
          </>
        )}
      </aside>

      <section className="feed-main">
        <div className="section-heading-row product-heading-row">
          <div>
            <p className="section-kicker">Personalized feed</p>
            <h2>Deals ranked by upside versus inconvenience</h2>
            <p>
              The score is higher when the savings are unusual, the cabin is strong, and the pain stays within your comfort zone.
            </p>
          </div>
          <div className="toolbar-card">
            <label>
              Type
              <select value={filterMode} onChange={(event) => setFilterMode(event.target.value as FilterMode)}>
                <option value="all">All</option>
                <option value="flight">Flights</option>
                <option value="hotel">Hotels</option>
                <option value="saved">Saved only</option>
              </select>
            </label>
            <label>
              Sort
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                <option value="best">Best fit</option>
                <option value="latest">Newest</option>
                <option value="cheapest">Cheapest</option>
              </select>
            </label>
          </div>
        </div>

        <div className="feed-grid">
          {rankedDeals.map(({ deal, score }) => {
            const isSaved = savedDeals.includes(deal.id);

            return (
              <article className="deal-card deal-card-product" key={deal.id}>
                <div className="deal-card-top">
                  <div>
                    <p className="mini-label">{deal.type === "flight" ? deal.cabin : deal.type}</p>
                    <h3>{deal.title}</h3>
                  </div>
                  <div className="score-badge">
                    <span>{score.score}</span>
                  </div>
                </div>
                <p className="deal-route">{deal.origin} to {deal.destination}</p>
                <p className="deal-price">${deal.currentPrice.toLocaleString()} {deal.currency}</p>
                <p className="deal-reference">Usually ${deal.referencePrice.toLocaleString()} {deal.currency}</p>
                <div className="insight-band">
                  <span>{score.matchLabel}</span>
                  <span>{score.savingsPercent}% below usual</span>
                </div>
                <p className="deal-copy">{deal.summary}</p>
                <p className="deal-label">Why it's worth it</p>
                <p className="deal-value">{deal.whyWorthIt}</p>
                <p className="deal-label">The catch</p>
                <p className="deal-copy">{deal.catchSummary}</p>
                <div className="reason-stack">
                  {score.reasons.slice(0, 2).map((reason) => (
                    <span className="insight-pill" key={reason}>{reason}</span>
                  ))}
                </div>
                <div className="deal-actions deal-actions-stack">
                  <div className="deal-actions-inline">
                    <button className="button button-secondary" type="button" onClick={() => toggleSaved(deal.id)}>
                      {isSaved ? "Saved" : "Save deal"}
                    </button>
                    <button className="button button-secondary" type="button" onClick={() => hideDeal(deal.id)}>
                      Hide
                    </button>
                  </div>
                  <div className="deal-actions-inline">
                    <Link className="button button-secondary" href={`/deals/${deal.slug}`}>
                      View detail
                    </Link>
                    <a className="button" href={deal.bookingUrl} target="_blank" rel="noreferrer">
                      Booking link
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
