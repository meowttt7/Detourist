import { ProductNav } from "@/components/product-nav";
import { DealFeed } from "@/components/deal-feed";

export default function DealsPage() {
  return (
    <main className="page-shell product-page-shell">
      <ProductNav />
      <section className="section product-hero">
        <p className="section-kicker">Detourist feed</p>
        <h1>Premium deals ranked for travelers who care about value, not convenience theater.</h1>
        <p className="hero-text product-hero-text">
          Use the feed as the living heart of Detourist: update your tolerance, compare catch versus upside, and decide quickly when the economics make sense.
        </p>
      </section>
      <section className="section product-section-tight">
        <DealFeed />
      </section>
    </main>
  );
}
