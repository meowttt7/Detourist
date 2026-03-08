import { ProductNav } from "@/components/product-nav";
import { OnboardingForm } from "@/components/onboarding-form";

export default function OnboardingPage() {
  return (
    <main className="page-shell product-page-shell">
      <ProductNav />
      <section className="section product-hero">
        <p className="section-kicker">Detour profile</p>
        <h1>Tell Detourist what kind of pain is still worth the money.</h1>
        <p className="hero-text product-hero-text">
          This is the core product move: convert your flexible travel instincts into explicit rules so the deal feed stops treating every traveler the same.
        </p>
      </section>
      <section className="section product-section-tight">
        <OnboardingForm />
      </section>
    </main>
  );
}
