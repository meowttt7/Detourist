import { ProductNav } from "@/components/product-nav";
import { AdminDealManager } from "@/components/admin-deal-manager";

export default function AdminPage() {
  return (
    <main className="page-shell product-page-shell">
      <ProductNav />
      <section className="section product-hero">
        <p className="section-kicker">Admin</p>
        <h1>Seed the Detourist feed with deals and keep the magic alive.</h1>
        <p className="hero-text product-hero-text">
          This is intentionally lightweight: enter the economics, describe the tradeoff clearly, and let the scoring layer do the rest.
        </p>
      </section>
      <section className="section product-section-tight">
        <AdminDealManager />
      </section>
    </main>
  );
}
