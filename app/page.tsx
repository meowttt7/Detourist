import { WaitlistForm } from "@/components/waitlist-form";

const navItems = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Sample Deals", href: "#sample-deals" },
  { label: "Pricing", href: "#pricing" },
];

const heroHighlights = [
  "Premium cabins and luxury stays",
  "Built for alternate airports and smart detours",
  "Worth-It Score explains the tradeoff fast",
];

const steps = [
  {
    title: "Set your detour tolerance",
    body: "Choose airports, cabin, budget, and how much friction you will tolerate.",
    badge: "01",
  },
  {
    title: "Detourist filters the weird value",
    body: "We look for premium routes and stays where the savings meaningfully outweigh the inconvenience.",
    badge: "02",
  },
  {
    title: "You book the ones that clear the bar",
    body: "Each alert shows the upside, the catch, and a Worth-It Score so you can decide quickly.",
    badge: "03",
  },
];

const differentiators = [
  "Not cheapest-for-the-sake-of-cheapest",
  "Personalized to your real tolerance for pain",
  "Made for travelers who already compare nearby airports",
];

const deals = [
  {
    title: "Singapore to Paris",
    subtitle: "Business Class",
    price: "$1,780",
    reference: "Usually around $4,200",
    score: 91,
    catchText: "One overnight layover in Doha",
    valueText: "A premium-cabin fare at roughly 42% of the usual price.",
  },
  {
    title: "Sydney to Tokyo",
    subtitle: "First Class",
    price: "Near standard business pricing",
    reference: "Rare for this cabin",
    score: 88,
    catchText: "Requires a reposition to Kuala Lumpur",
    valueText: "A true cabin upgrade without the normal first-class premium.",
  },
  {
    title: "Bangkok Riverside Stay",
    subtitle: "5-Star Luxury Hotel",
    price: "Effective 41% off",
    reference: "After promo stacking",
    score: 84,
    catchText: "Weekday-only availability",
    valueText: "Luxury pricing that behaves like an off-market rate.",
  },
];

const scoreBreakdown = [
  { label: "Value", detail: "How unusual is the savings?", width: "92%" },
  { label: "Comfort", detail: "What level of trip are you getting?", width: "86%" },
  { label: "Friction", detail: "How annoying is the detour?", width: "58%" },
  { label: "Fit", detail: "Does it match your tolerance?", width: "88%" },
];

const audience = [
  "You check more than one airport before booking.",
  "You will take the extra stop if the value is obvious.",
  "You care about premium comfort, just not at any price.",
  "You like the smarter route more than the obvious one.",
];

const pricing = [
  {
    name: "Free",
    subtitle: "Feel the quality of the feed before you commit.",
    features: ["Daily digest", "Limited alerts", "One airport profile", "Basic filters"],
    featured: false,
  },
  {
    name: "Detourist Pro",
    subtitle: "For travelers who want the best alerts first.",
    features: ["Instant alerts", "Multiple airports", "Premium-only tracking", "Deeper Worth-It personalization"],
    featured: true,
  },
];

export default function Home() {
  return (
    <main className="page-shell">
      <div className="background-orb orb-one" />
      <div className="background-orb orb-two" />

      <header className="site-header">
        <a className="brand" href="#top">
          <span className="brand-mark">D</span>
          <span>Detourist</span>
        </a>
        <nav className="site-nav" aria-label="Primary">
          {navItems.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="button button-small" href="#waitlist">
          Join Waitlist
        </a>
      </header>

      <section className="hero section" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Premium deals for flexible travelers</p>
          <h1>Luxury travel deals that make the detour worth it.</h1>
          <p className="hero-text">
            Detourist finds premium fares and luxury stays where flexibility unlocks outsized value.
          </p>
          <div id="waitlist">
            <WaitlistForm source="hero" />
          </div>
          <p className="support-text">For travelers who care more about value than convenience.</p>
          <div className="pill-row" aria-label="Detourist highlights">
            {heroHighlights.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-card hero-score-card">
            <p className="mini-label">Worth-It signal</p>
            <div className="score-badge large">
              <span>91</span>
              <small>/100</small>
            </div>
            <p className="hero-card-title">Singapore to Paris in business class</p>
            <p className="hero-card-copy">Huge savings. Mild pain. Strong fit.</p>
          </div>
          <div className="hero-card hero-stat-card">
            <div>
              <p className="mini-label">What Detourist catches</p>
              <ul className="stat-list">
                <li>Business class 42% below typical fare</li>
                <li>First class near business pricing</li>
                <li>Luxury stays with stackable savings</li>
              </ul>
            </div>
            <div className="route-chip-grid">
              <span>SIN</span>
              <span>DOH</span>
              <span>CDG</span>
              <span>KUL</span>
              <span>HND</span>
              <span>BKK</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section social-proof">
        <p className="section-kicker">Built for Detourists</p>
        <div className="split-section">
          <h2>Made for travelers who already know the obvious route is not always the smart one.</h2>
          <p>Better comfort, stronger value, clearer tradeoffs.</p>
        </div>
        <div className="pill-grid">
          {audience.map((item) => (
            <div className="audience-pill" key={item}>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="how-it-works">
        <p className="section-kicker">How It Works</p>
        <div className="split-section">
          <div>
            <h2>Tell us your tolerance. We filter for the upside.</h2>
            <p>Detourist is not hunting for the cheapest option. It is hunting for premium value that clears your bar.</p>
          </div>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <article className="feature-card" key={step.title}>
              <span className="feature-badge">{step.badge}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section accent-panel" id="worth-it-score">
        <p className="section-kicker">Why Detourist</p>
        <div className="comparison-layout">
          <div>
            <h2>Cheap is easy to find. Worth it is harder.</h2>
            <p>Detourist helps flexible travelers evaluate premium deals in seconds, not tabs.</p>
            <ul className="check-list">
              {differentiators.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="score-example-card">
              <div className="score-badge large alt">
                <span>89</span>
                <small>/100</small>
              </div>
              <div>
                <p className="deal-label">Worth-It Score</p>
                <p className="deal-copy">Balances savings, comfort, friction, and fit.</p>
              </div>
            </div>
          </div>
          <div className="score-panel">
            <p className="mini-label">Example score breakdown</p>
            {scoreBreakdown.map((item) => (
              <div className="score-row" key={item.label}>
                <div className="score-row-label">
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <div className="score-track">
                  <div className="score-fill" style={{ width: item.width }} />
                </div>
              </div>
            ))}
            <div className="comparison-card">
              <div>
                <p className="mini-label">Typical travel site</p>
                <p className="comparison-copy">Cheapest route or easiest route</p>
              </div>
              <div>
                <p className="mini-label">Detourist</p>
                <p className="comparison-copy">Premium trips where the savings justify the extra hoop</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="sample-deals">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Sample Deals</p>
            <h2>Three examples of the kind of value we mean</h2>
            <p>Deals change fast. The logic does not.</p>
          </div>
          <a className="text-link" href="#waitlist">
            Join for Early Access
          </a>
        </div>
        <div className="deal-grid">
          {deals.map((deal) => (
            <article className="deal-card" key={deal.title}>
              <div className="deal-card-top">
                <div>
                  <p className="mini-label">{deal.subtitle}</p>
                  <h3>{deal.title}</h3>
                </div>
                <div className="score-badge">
                  <span>{deal.score}</span>
                </div>
              </div>
              <p className="deal-price">{deal.price}</p>
              <p className="deal-reference">{deal.reference}</p>
              <div className="deal-divider" />
              <p className="deal-label">The catch</p>
              <p className="deal-copy">{deal.catchText}</p>
              <p className="deal-label">Why it clears the bar</p>
              <p className="deal-value">{deal.valueText}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Pricing</p>
            <h2>Start free. Upgrade if you want the best alerts first.</h2>
            <p>Founding-member access opens to early users first.</p>
          </div>
        </div>
        <div className="pricing-grid">
          {pricing.map((plan) => (
            <article
              className={plan.featured ? "pricing-card pricing-card-featured" : "pricing-card"}
              key={plan.name}
            >
              <p className="mini-label">{plan.featured ? "Most aligned" : "Start here"}</p>
              <h3>{plan.name}</h3>
              <p>{plan.subtitle}</p>
              <ul className="check-list compact">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <a className={plan.featured ? "button" : "button button-secondary"} href="#waitlist">
                Join the Waitlist
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="section final-cta">
        <div>
          <p className="section-kicker">Join Early</p>
          <h2>If you would travel better for less, you are probably one of us.</h2>
          <p>Join the waitlist and get early access when Detourist opens up.</p>
        </div>
        <WaitlistForm buttonLabel="Get Early Access" compact source="final-cta" />
      </section>

      <footer className="site-footer">
        <p>Detourist helps flexible travelers find premium trips that are actually worth it.</p>
        <div className="footer-links">
          <a href="#top">About</a>
          <a href="#pricing">Pricing</a>
          <a href="#sample-deals">Sample Deals</a>
          <a href="#waitlist">Contact</a>
        </div>
      </footer>
    </main>
  );
}