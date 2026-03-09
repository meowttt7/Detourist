import { notFound } from "next/navigation";

import { DealBookingButton } from "@/components/deal-booking-button";
import { DealDetailTracker } from "@/components/deal-detail-tracker";
import { ProductNav } from "@/components/product-nav";
import { getDealBySlug } from "@/lib/deal-store";
import { scoreDeal } from "@/lib/score";

export default async function DealDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deal = await getDealBySlug(slug);

  if (!deal) {
    notFound();
  }

  const score = scoreDeal(deal);

  return (
    <main className="page-shell product-page-shell">
      <ProductNav />
      <DealDetailTracker dealId={deal.id} dealSlug={deal.slug} />
      <section className="section product-hero detail-hero">
        <div>
          <p className="section-kicker">{deal.type === "flight" ? deal.cabin : "Luxury stay"}</p>
          <h1>{deal.title}</h1>
          <p className="hero-text product-hero-text">{deal.summary}</p>
          <div className="detail-meta-row">
            <span>{deal.origin} to {deal.destination}</span>
            <span>{deal.airlineOrBrand}</span>
            <span>{score.savingsPercent}% below usual</span>
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
          <p className="section-kicker">Why it's worth it</p>
          <h2>The upside</h2>
          <p>{deal.whyWorthIt}</p>
          <ul className="check-list">
            {score.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
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
        <article className="detail-card">
          <p className="section-kicker">Next actions</p>
          <h2>How to use this</h2>
          <ul className="check-list">
            <li>Compare this against your direct and cleaner premium options.</li>
            <li>Validate the layover or reposition cost before booking.</li>
            <li>Move fast if the score is high and the expiry window is short.</li>
          </ul>
          <div className="detail-actions-row">
            <a className="button button-secondary" href="/deals">
              Back to feed
            </a>
            <a className="button" href="/onboarding">
              Tune your profile
            </a>
          </div>
        </article>
      </section>
    </main>
  );
}
