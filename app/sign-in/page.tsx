import { ProductNav } from "@/components/product-nav";
import { SignInForm } from "@/components/signin-form";

type SignInPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStatusMessage(status: string | null) {
  if (status === "invalid") {
    return "That sign-in link is invalid or has already been used.";
  }

  if (status === "missing") {
    return "Your sign-in link was incomplete. Request a fresh one below.";
  }

  if (status === "signed-out") {
    return "You have been signed out on this device.";
  }

  return "";
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const statusParam = resolvedSearchParams?.status;
  const status = typeof statusParam === "string" ? statusParam : null;

  return (
    <main className="page-shell product-page-shell">
      <ProductNav />
      <section className="section product-hero">
        <p className="section-kicker">Sign in</p>
        <h1>Open your Detourist account on any device.</h1>
        <p className="hero-text product-hero-text">
          We send a secure magic link to your email. That keeps auth lightweight while still giving you cross-device access to your profile, alerts, and saved state.
        </p>
      </section>
      <section className="section product-section-tight login-form-shell">
        <div className="detail-card login-card">
          <SignInForm initialMessage={getStatusMessage(status)} />
        </div>
      </section>
    </main>
  );
}
