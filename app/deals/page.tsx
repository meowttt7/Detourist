import { ProductNav } from "@/components/product-nav";
import { DealFeed } from "@/components/deal-feed";

type DealsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getFeedMessage(status: string | null) {
  if (status === "signed-in") {
    return "You are back in your personalized feed. The ranking below is already tuned to your saved profile.";
  }

  if (status === "profile-ready") {
    return "Your detour profile is live. Start saving and hiding deals so Detourist can sharpen the next round of alerts.";
  }

  return "Use the feed as the living heart of Detourist: update your tolerance, compare catch versus upside, and decide quickly when the economics make sense.";
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const statusParam = resolvedSearchParams?.status;
  const status = typeof statusParam === "string" ? statusParam : null;

  return (
    <main className="page-shell product-page-shell">
      <ProductNav />
      <section className="section product-hero">
        <p className="section-kicker">Detourist feed</p>
        <h1>Premium deals ranked for travelers who care about value, not convenience theater.</h1>
        <p className="hero-text product-hero-text">
          {getFeedMessage(status)}
        </p>
      </section>
      <section className="section product-section-tight">
        <DealFeed />
      </section>
    </main>
  );
}
