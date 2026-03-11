import { notFound } from "next/navigation";

import { DealBookingButton } from "@/components/deal-booking-button";
import { DealDetailTracker } from "@/components/deal-detail-tracker";
import { ProductNav } from "@/components/product-nav";
import { getCurrentAccount } from "@/lib/current-account";
import { getDealBySlug } from "@/lib/deal-store";
import { scoreDeal } from "@/lib/score";

export default async function DealDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deal = await getDealBySlug(slug);

  if (!deal) {
    notFound();
  }

  const { profile } = await getCurrentAccount();
  const score = scoreDeal(deal, profile ?? undefined);

  return (
    <main className="page-shell product-page-shell">
      <ProductNav />
      <DealDetailTracker dealId={deal.id} dealSlug={deal.slug} />
      <section className="section product-hero detail-hero">
        <div>
          <p className="section-kicker">{deal.type === "flight" ? deal.cabin : "Luxury stay"}</p>
          <h1>{deal.title}</h1>
          <p className="hero-text product-hero-text">
            {profile
              ? `This score now reflects your actual detour profile, not a generic premium-travel default. ${deal.summary}`
              : deal.summary}
          </p>
          <div className="detail-meta-row">
            <span>{deal.origin} to {deal.destination}</span>
            <span>{deal.airlineOrBrand}</span>
            <span>{score.savingsPercent}% below usual</span>
            {profile ? <span>{profile.homeAirports.join(", ")} profile</span> : null}
          </div>
        </div>
        <div className="detail-score-card">
          <div className="score-badge large">
            <span>{score.score}</span>
            <small>/100</small>
          </div>
          <p className="detail-score-label">{score.matchLabel}</p>
          <DealBookingButton
            className="button"
            href={deal.bookingUrl}
            dealId={deal.id}
            dealSlug={deal.slug}
            label="Open booking link"
            surface="detail-page"
          />
        </div>
      </section>

      <section className="section detail-grid">
        <article className="detail-card">
          <p className="section-kicker">Why this matches you</p>
          <h2>{profile ? "Personal fit" : "Detourist's current read"}</h2>
          <p>
            {profile
              ? "Detourist is weighting this against your home airports, cabin taste, budget ceiling, and pain tolerance."
              : "Set a detour profile to make this score reflect your own tolerance instead of a generic luxury-travel read."}
          </p>
          <ul className="check-list">
            {score.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {!profile ? (
            <div className="detail-actions-row">
              <a className="button" href="/onboarding">
                Set detour profile
              </a>
            </div>
          ) : null}
        </article>
        <article className="detail-card">
          <p className="section-kicker">The catch</p>
          <h2>The tradeoff</h2>
          <p>{deal.catchSummary}</p>
          <ul className="check-list">
            <li>{deal.stops} stop(s)</li>
            <li>{deal.totalDurationHours} total hours</li>
            <li>{deal.overnight ? "Overnight transit or stay restriction" : "No overnight catch"}</li>
            <li>{deal.repositionRequired ? "Reposition required" : "No repositioning required"}</li>
          </ul>
          {score.warnings.length > 0 ? (
            <div className="warning-stack">
              {score.warnings.map((warning) => (
                <span className="warning-pill" key={warning}>{warning}</span>
              ))}
            </div>
          ) : null}
        </article>
      </section>

      <section className="section detail-grid">
        <article className="detail-card">
          <p className="section-kicker">Why it's worth it</p>
          <h2>The upside</h2>
          <p>{deal.whyWorthIt}</p>
          <div className="reason-stack">
            <span className="insight-pill">{score.matchLabel}</span>
            <span className="insight-pill">{score.savingsPercent}% below usual</span>
            <span className="insight-pill">Pain score {score.painScore}</span>
          </div>
        </article>
        <article className="detail-card">
          <p className="section-kicker">Trip anatomy</p>
          <h2>Deal facts</h2>
          <div className="detail-facts-grid">
            <div>
              <span>Current price</span>
              <strong>${deal.currentPrice.toLocaleString()} {deal.currency}</strong>
            </div>
            <div>
              <span>Reference price</span>
              <strong>${deal.referencePrice.toLocaleString()} {deal.currency}</strong>
            </div>
            <div>
              <span>Expires</span>
              <strong>{new Date(deal.expiresAt).toLocaleDateString()}</strong>
            </div>
            <div>
              <span>Destination region</span>
              <strong>{deal.destinationRegion}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="section detail-grid">
        <article className="detail-card">
          <p className="section-kicker">Next actions</p>
          <h2>How to use this</h2>
          <ul className="check-list">
            <li>Compare this against your direct and cleaner premium options.</li>
            <li>Validate the layover or reposition cost before booking.</li>
            <li>
              {profile
                ? "If the score is high, the tradeoffs are already close to your stated comfort zone."
                : "Move fast if the score is high and the expiry window is short."}
            </li>
          </ul>
          <div className="detail-actions-row">
            <a className="button button-secondary" href="/deals">
              Back to feed
            </a>
            <a className="button" href="/onboarding">
              {profile ? "Tune your profile" : "Set detour profile"}
            </a>
          </div>
        </article>
        <article className="detail-card">
          <p className="section-kicker">Score context</p>
          <h2>How Detourist is judging this</h2>
          <ul className="check-list">
            <li>The score blends unusual savings, cabin quality, and travel pain.</li>
            <li>{profile ? "Your profile is actively shaping this ranking." : "Your profile is not shaping this yet."}</li>
            <li>{profile ? "Warnings here are the specific parts most likely to push against your tolerance." : "Create a profile to see whether the friction is actually acceptable for you."}</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
