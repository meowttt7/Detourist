import { redirect } from "next/navigation";

import { ProductNav } from "@/components/product-nav";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminDealManager } from "@/components/admin-deal-manager";
import { isAdminAuthenticated } from "@/lib/auth";
import { formatDigestScheduleLabel } from "@/lib/digest-config";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/login?redirect=/admin");
  }

  const digestScheduleLabel = formatDigestScheduleLabel();

  return (
    <main className="page-shell product-page-shell">
      <ProductNav />
      <section className="section product-hero">
        <p className="section-kicker">Admin</p>
        <h1>Seed the Detourist feed and keep a live pulse on product traction.</h1>
        <p className="hero-text product-hero-text">
          The admin surface now combines publishing with early-stage operating metrics, so you can see content coverage, linked identity health, and user engagement in one place.
        </p>
      </section>
      <section className="section product-section-tight admin-section-stack">
        <AdminDashboard />
        <AdminDealManager digestScheduleLabel={digestScheduleLabel} />
      </section>
    </main>
  );
}
