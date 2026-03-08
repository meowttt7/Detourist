export function ProductNav() {
  return (
    <header className="product-header">
      <a className="brand" href="/">
        <span className="brand-mark">D</span>
        <span>Detourist</span>
      </a>
      <nav className="product-nav" aria-label="Product">
        <a href="/">Home</a>
        <a href="/onboarding">Onboarding</a>
        <a href="/deals">Deals</a>
        <a href="/admin">Admin</a>
      </nav>
      <span className="product-badge">Prototype</span>
    </header>
  );
}
