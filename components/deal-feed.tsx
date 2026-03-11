"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { scoreDeal } from "@/lib/score";
import { trackDealEvent } from "@/lib/tracking-client";
import { Deal, TravelerProfile, UserRecord } from "@/lib/types";

const profileStorageKey = "detourist-profile";
const savedDealsKey = "detourist-saved-deals";
const hiddenDealsKey = "detourist-hidden-deals";
const FEATURED_MATCH_THRESHOLD = 80;

type SortMode = "best" | "latest" | "cheapest";
type FilterMode = "all" | "flight" | "hotel" | "saved";

async function persistProfileState(payload: {
  profile?: Partial<TravelerProfile>;
  savedDealIds?: string[];
  hiddenDealIds?: string[];
}) {
  await fetch("/api/profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function DealFeed() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<TravelerProfile | null>(null);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [savedDeals, setSavedDeals] = useState<string[]>([]);
  const [hiddenDeals, setHiddenDeals] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("best");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  useEffect(() => {
    async function loadState() {
      try {
        const profileResponse = await fetch("/api/profile", { cache: "no-store" });
        const profilePayload = (await profileResponse.json()) as {
          profile: (TravelerProfile & { savedDealIds: string[]; hiddenDealIds: string[] }) | null;
          user: UserRecord | null;
        };

        if (profilePayload.profile) {
          setProfile(profilePayload.profile);
          setUser(profilePayload.user);
          setSavedDeals(profilePayload.profile.savedDealIds);
          setHiddenDeals(profilePayload.profile.hiddenDealIds);
          window.localStorage.setItem(profileStorageKey, JSON.stringify(profilePayload.profile));
          window.localStorage.setItem(savedDealsKey, JSON.stringify(profilePayload.profile.savedDealIds));
          window.localStorage.setItem(hiddenDealsKey, JSON.stringify(profilePayload.profile.hiddenDealIds));
        } else {
          const storedProfile = window.localStorage.getItem(profileStorageKey);
          const storedSaved = window.localStorage.getItem(savedDealsKey);
          const storedHidden = window.localStorage.getItem(hiddenDealsKey);

          const nextProfile = storedProfile ? (JSON.parse(storedProfile) as TravelerProfile) : null;
          const nextSaved = storedSaved ? (JSON.parse(storedSaved) as string[]) : [];
          const nextHidden = storedHidden ? (JSON.parse(storedHidden) as string[]) : [];

          if (nextProfile) {
            setProfile(nextProfile);
            setSavedDeals(nextSaved);
            setHiddenDeals(nextHidden);
            await persistProfileState({
              profile: nextProfile,
              savedDealIds: nextSaved,
              hiddenDealIds: nextHidden,
            });
          }
        }

        const dealsResponse = await fetch("/api/deals", { cache: "no-store" });
        const dealsPayload = (await dealsResponse.json()) as { deals?: Deal[]; error?: string };

        if (!dealsResponse.ok || !dealsPayload.deals) {
          throw new Error(dealsPayload.error ?? "Could not load deals.");
        }

        setDeals(dealsPayload.deals);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load deals.");
      } finally {
        setLoading(false);
      }
    }

    void loadState();
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

  const featuredMatch = useMemo(() => {
    if (!profile || rankedDeals.length === 0) {
      return null;
    }

    return rankedDeals[0] ?? null;
  }, [profile, rankedDeals]);

  const strongMatchCount = useMemo(() => {
    if (!profile) {
      return 0;
    }

    return rankedDeals.filter(({ score }) => score.score >= FEATURED_MATCH_THRESHOLD).length;
  }, [profile, rankedDeals]);

  function syncLocalState(nextSaved: string[], nextHidden: string[]) {
    window.localStorage.setItem(savedDealsKey, JSON.stringify(nextSaved));
    window.localStorage.setItem(hiddenDealsKey, JSON.stringify(nextHidden));
    void persistProfileState({
      profile: profile ?? undefined,
      savedDealIds: nextSaved,
      hiddenDealIds: nextHidden,
    });
  }

  function toggleSaved(deal: Deal) {
    setSavedDeals((current) => {
      const isCurrentlySaved = current.includes(deal.id);
      const next = isCurrentlySaved ? current.filter((item) => item !== deal.id) : [...current, deal.id];
      syncLocalState(next, hiddenDeals);
      if (!isCurrentlySaved) {
        void trackDealEvent({
          type: "save_deal",
          dealId: deal.id,
          dealSlug: deal.slug,
          surface: "feed",
        });
      }
      return next;
    });
  }

  function hideDeal(deal: Deal) {
    setHiddenDeals((current) => {
      if (current.includes(deal.id)) {
        return current;
      }

      const next = [...current, deal.id];
      syncLocalState(savedDeals, next);
      void trackDealEvent({
        type: "hide_deal",
        dealId: deal.id,
        dealSlug: deal.slug,
        surface: "feed",
      });
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
            <div className="account-banner account-banner-tight">
              <p className="section-kicker">Linked account</p>
              <p>
                {user?.email
                  ? `Waitlist and profile linked to ${user.email}.`
                  : "This profile exists independently right now. Join the waitlist from the homepage to attach an email identity."}
              </p>
            </div>
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
              {profile
                ? "These rankings now reflect your home airports, cabin taste, budget ceiling, and pain tolerance instead of a generic luxury-travel default."
                : "The score is higher when the savings are unusual, the cabin is strong, and the pain stays within your comfort zone."}
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

        {featuredMatch ? (
          <article className="feed-spotlight-card">
            <div className="feed-spotlight-header">
              <div className="feed-spotlight-copy">
                <p className="section-kicker">Best fit right now</p>
                <h3>{featuredMatch.deal.title}</h3>
                <p>
                  {strongMatchCount > 1
                    ? `${strongMatchCount} strong matches clear your current threshold. This is the one Detourist would open first.`
                    : "This is the cleanest high-conviction match against your current profile."}
                </p>
                <div className="feed-profile-strip">
                  <span>{featuredMatch.deal.origin} to {featuredMatch.deal.destination}</span>
                  <span>{featuredMatch.score.matchLabel}</span>
                  <span>{featuredMatch.score.savingsPercent}% below usual</span>
                </div>
              </div>
              <div className="score-badge large">
                <span>{featuredMatch.score.score}</span>
                <small>/100</small>
              </div>
            </div>
            <div className="deal-match-panel deal-match-panel-featured">
              <p className="deal-label">Why this matches you</p>
              <div className="reason-stack">
                {featuredMatch.score.reasons.slice(0, 3).map((reason) => (
                  <span className="insight-pill" key={`featured-${reason}`}>{reason}</span>
                ))}
              </div>
              {featuredMatch.score.warnings.length ? (
                <>
                  <p className="deal-label">Tradeoffs to check</p>
                  <div className="warning-stack">
                    {featuredMatch.score.warnings.slice(0, 2).map((warning) => (
                      <span className="warning-pill" key={`featured-warning-${warning}`}>{warning}</span>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
            <div className="feed-spotlight-actions">
              <Link
                className="button button-secondary"
                href={`/deals/${featuredMatch.deal.slug}`}
                onClick={() => {
                  void trackDealEvent({
                    type: "detail_view",
                    dealId: featuredMatch.deal.id,
                    dealSlug: featuredMatch.deal.slug,
                    surface: "feed-spotlight",
                  });
                }}
              >
                Review best fit
              </Link>
              <a
                className="button"
                href={featuredMatch.deal.bookingUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  void trackDealEvent({
                    type: "booking_click",
                    dealId: featuredMatch.deal.id,
                    dealSlug: featuredMatch.deal.slug,
                    surface: "feed-spotlight",
                  });
                }}
              >
                Open booking link
              </a>
            </div>
          </article>
        ) : null}

        {!profile ? (
          <article className="detail-card feed-guidance-card">
            <p className="section-kicker">Make this personal</p>
            <h3>Right now the feed is smart, but not truly yours yet.</h3>
            <p>
              Add your detour profile and Detourist will explain which deals match your home airports, cabin preferences,
              budget, and inconvenience tolerance instead of scoring them generically.
            </p>
            <a className="button" href="/onboarding">Set detour profile</a>
          </article>
        ) : null}

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
                <div className="deal-match-panel">
                  <p className="deal-label">Why this matches you</p>
                  <div className="reason-stack">
                    {score.reasons.slice(0, 2).map((reason) => (
                      <span className="insight-pill" key={reason}>{reason}</span>
                    ))}
                  </div>
                  {score.warnings.length ? (
                    <>
                      <p className="deal-label">Tradeoffs to check</p>
                      <div className="warning-stack">
                        {score.warnings.slice(0, 2).map((warning) => (
                          <span className="warning-pill" key={warning}>{warning}</span>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
                <p className="deal-copy">{deal.summary}</p>
                <p className="deal-label">Why it's worth it</p>
                <p className="deal-value">{deal.whyWorthIt}</p>
                <p className="deal-label">The catch</p>
                <p className="deal-copy">{deal.catchSummary}</p>
                <div className="deal-actions deal-actions-stack">
                  <div className="deal-actions-inline">
                    <button className="button button-secondary" type="button" onClick={() => toggleSaved(deal)}>
                      {isSaved ? "Saved" : "Save deal"}
                    </button>
                    <button className="button button-secondary" type="button" onClick={() => hideDeal(deal)}>
                      Hide
                    </button>
                  </div>
                  <div className="deal-actions-inline">
                    <Link
                      className="button button-secondary"
                      href={`/deals/${deal.slug}`}
                      onClick={() => {
                        void trackDealEvent({
                          type: "detail_view",
                          dealId: deal.id,
                          dealSlug: deal.slug,
                          surface: "feed",
                        });
                      }}
                    >
                      View detail
                    </Link>
                    <a
                      className="button"
                      href={deal.bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        void trackDealEvent({
                          type: "booking_click",
                          dealId: deal.id,
                          dealSlug: deal.slug,
                          surface: "feed",
                        });
                      }}
                    >
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
