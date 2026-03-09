import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { ProductNav } from "@/components/product-nav";
import { isAdminAuthenticated, usingFallbackAdminCredentials } from "@/lib/auth";

export default async function LoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  return (
    <main className="page-shell product-page-shell">
      <ProductNav />
      <section className="section product-hero">
        <p className="section-kicker">Admin access</p>
        <h1>Sign in before you publish anything to the Detourist feed.</h1>
        <p className="hero-text product-hero-text">
          This keeps the editorial surface separate from the public experience while the product is still in lightweight prototype mode.
        </p>
        {usingFallbackAdminCredentials() ? (
          <p className="support-text auth-note">
            Dev note: set `DETOURIST_ADMIN_USERNAME`, `DETOURIST_ADMIN_PASSWORD`, and `DETOURIST_SESSION_SECRET` in your environment. Current fallback username is `admin`.
          </p>
        ) : null}
      </section>
      <section className="section product-section-tight">
        <LoginForm />
        <p className="support-text centered-copy">
          Looking for the product instead? <Link href="/deals">Go back to the deal feed</Link>.
        </p>
      </section>
    </main>
  );
}
