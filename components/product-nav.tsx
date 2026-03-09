import Link from "next/link";

import { isAdminAuthenticated } from "@/lib/auth";
import { getCurrentAccount } from "@/lib/current-account";

export async function ProductNav() {
  const isAdmin = await isAdminAuthenticated();
  const { user, isAuthenticated } = await getCurrentAccount();

  return (
    <header className="product-header">
      <Link className="brand" href="/">
        <span className="brand-mark">D</span>
        <span>Detourist</span>
      </Link>
      <nav className="product-nav" aria-label="Product">
        <Link href="/">Home</Link>
        <Link href="/onboarding">Onboarding</Link>
        <Link href="/deals">Deals</Link>
        <Link href="/account">Account</Link>
        <Link href={isAdmin ? "/admin" : "/login?redirect=/admin"}>{isAdmin ? "Admin" : "Admin Login"}</Link>
      </nav>
      <div className="product-nav-actions">
        <span className="product-badge">Prototype</span>
        {isAuthenticated && user?.email ? (
          <span className="product-user-pill">{user.email}</span>
        ) : (
          <Link className="button button-secondary button-small" href="/sign-in">
            Sign in
          </Link>
        )}
        {isAuthenticated ? (
          <form action="/api/auth/user/logout" method="post">
            <button className="button button-secondary button-small" type="submit">
              Sign out
            </button>
          </form>
        ) : null}
        {isAdmin ? (
          <form action="/api/auth/logout" method="post">
            <button className="button button-secondary button-small" type="submit">
              Admin log out
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
