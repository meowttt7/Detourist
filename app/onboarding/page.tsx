import { ProductNav } from "@/components/product-nav";
import { OnboardingForm } from "@/components/onboarding-form";

type OnboardingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getWelcomeMessage(status: string | null) {
  if (status === "welcome") {
    return {
      title: "You are signed in. Now teach Detourist your threshold.",
      body: "This is the fastest route into a genuinely personalized feed. Set your tolerance once and Detourist can start ranking around your real tradeoffs instead of a generic luxury-travel default.",
    };
  }

  return {
    title: "Tell Detourist what kind of pain is still worth the money.",
    body: "This is the core product move: convert your flexible travel instincts into explicit rules so the deal feed stops treating every traveler the same.",
  };
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const statusParam = resolvedSearchParams?.status;
  const status = typeof statusParam === "string" ? statusParam : null;
  const welcome = getWelcomeMessage(status);

  return (
    <main className="page-shell product-page-shell">
      <ProductNav />
      <section className="section product-hero">
        <p className="section-kicker">Detour profile</p>
        <h1>{welcome.title}</h1>
        <p className="hero-text product-hero-text">{welcome.body}</p>
      </section>
      <section className="section product-section-tight">
        <OnboardingForm />
      </section>
    </main>
  );
}
