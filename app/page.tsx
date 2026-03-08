import { WaitlistForm } from "@/components/waitlist-form";

const navItems = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Sample Deals", href: "#sample-deals" },
  { label: "Worth-It Score", href: "#worth-it-score" },
  { label: "Pricing", href: "#pricing" },
];

const steps = [
  {
    title: "Set your detour tolerance",
    body: "Choose your home airports, preferred cabin, budget, and how many hoops you're willing to jump through.",
    badge: "01",
  },
  {
    title: "We hunt the irrational deals",
    body: "Detourist surfaces premium fares and luxury stays where the savings meaningfully outweigh the inconvenience.",
    badge: "02",
  },
  {
    title: "Book only when it's worth it",
    body: "Every deal shows the upside, the catch, and a Worth-It Score so you can decide in minutes.",
    badge: "03",
  },
];

const differentiators = [
  "Premium cabins and luxury stays, not generic bargain hunting",
  "Built for repositioning, layovers, and odd routings",
  "Explains why a deal matters, not just the price",
  "Personalized to your actual tolerance for pain",
];

const deals = [
  {
    title: "Singapore to Paris",
    subtitle: "Business Class",
    price: "$1,780",
    reference: "Usually around $4,200",
    score: 91,
    catchText: "One overnight layover in Doha",
    valueText: "42% of the usual premium fare",
  },
  {
    title: "Sydney to Tokyo",
    subtitle: "First Class",
    price: "Near standard business-class pricing",
    reference: "Rare for this cabin",
    score: 88,
    catchText: "Requires a reposition to Kuala Lumpur",
    valueText: "A premium-cabin jump without the normal premium-cabin price",
  },
  {
    title: "Bangkok Riverside Stay",
    subtitle: "5-Star Luxury Hotel",
    price: "Effective 41% off",
    reference: "After promo stacking",
    score: 84,
    catchText: "Weekday-only availability",
    valueText: "Luxury pricing that behaves like an off-market rate",
  },
];

const scoreBreakdown = [
  { label: "Value", detail: "How unusual is the savings?", width: "92%" },
  { label: "Comfort", detail: "What class of trip are you getting?", width: "86%" },
  { label: "Friction", detail: "How annoying is the routing?", width: "58%" },
  { label: "Fit", detail: "Does it match your tolerance and preferences?", width: "88%" },
];

const audience = [
  "You check more than one airport before booking",
  "You don't mind a layover if the value is real",
  "You care about premium comfort, but not at any price",
  "You get a thrill from finding the smarter route",
];

const pricing = [
  {
    name: "Free",
    subtitle: "A low-friction way to feel out the deal quality.",
    features: ["Daily digest", "Limited alerts", "One airport profile", "Basic filters"],
    featured: false,
  },
  {
    name: "Detourist Pro",
    subtitle: "For the travelers who want the best alerts first.",
    features: [
      "Instant alerts",
      "Multiple airports",
      "Premium-only tracking",
      "Advanced Worth-It personalization",
      "Early access to weird-route finds",
    ],
    featured: true,
  },
];

const faqs = [
  {
    question: "Do I need points to use Detourist?",
    answer:
      "No. Detourist starts with premium travel deals you can act on with cash. Over time, we may add more ways to evaluate value, but the product does not depend on you being deep into points or miles.",
  },
  {
    question: "Is this only for business and first class?",
    answer:
      "The core focus is premium comfort and luxury value. Most alerts will be business class, first class, or high-value luxury stays.",
  },
  {
    question: "Do you book the trips for me?",
    answer:
      "Not in the first version. Detourist helps you discover and evaluate the right deals quickly, then sends you to book them.",
  },
  {
    question: "Which regions do you support?",
    answer:
      "Detourist is designed for a global audience. Early coverage will be strongest around major international hubs and flexible departure regions.",
  },
  {
    question: "What if I hate long layovers?",
    answer:
      "That's exactly why Detourist asks for your detour tolerance. The product is built to personalize the tradeoff instead of assuming every traveler values convenience the same way.",
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
          <p className="eyebrow">Premium travel deals for flexible people</p>
          <h1>Premium travel deals for people who don't mind the long way around.</h1>
          <p className="hero-text">
            Detourist finds business-class, first-class, and luxury stay deals that
            become ridiculously good value if you're flexible on routing, timing, or
            departure city.
          </p>
          <div id="waitlist">
            <WaitlistForm source="hero" />
          </div>
          <p className="support-text">
            Built for travelers who care more about value than convenience.
          </p>
        </div>

        <div className="hero-panel">
          <div className="hero-card hero-score-card">
            <p className="mini-label">Worth-It signal</p>
            <div className="score-badge large">
              <span>91</span>
              <small>/100</small>
            </div>
            <p className="hero-card-title">Singapore to Paris in business class</p>
            <p className="hero-card-copy">
              Massive discount, mild pain, strong match for a flexible traveler.
            </p>
          </div>
          <div className="hero-card hero-stat-card">
            <div>
              <p className="mini-label">What Detourist catches</p>
              <ul className="stat-list">
                <li>Business class for 42% below typical fare</li>
                <li>First class near business-class pricing</li>
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
        <p className="section-kicker">Global by design</p>
        <div className="split-section">
          <h2>Designed for value-obsessed travelers across major global hubs</h2>
          <p>
            From Singapore to Sydney, London to Dubai, Detourist is built for travelers
            who know a clever routing can save thousands.
          </p>
        </div>
        <div className="pill-row" aria-label="Product coverage highlights">
          <span>Global airports</span>
          <span>Premium cabins</span>
          <span>Luxury stays</span>
          <span>Smart detours</span>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <p className="section-kicker">How It Works</p>
        <div className="split-section">
          <div>
            <h2>Luxury travel, priced like a loophole</h2>
            <p>
              Tell us what kind of inconvenience you're willing to tolerate, and we'll
              surface the premium deals where the payoff actually justifies it.
            </p>
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

      <section className="section accent-panel">
        <p className="section-kicker">Why Detourist</p>
        <div className="comparison-layout">
          <div>
            <h2>Most travel sites optimize for easy. We optimize for worth it.</h2>
            <p>
              Detourist is for travelers who care about the math, not just the map.
            </p>
            <ul className="check-list">
              {differentiators.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="comparison-card">
            <div>
              <p className="mini-label">Typical travel site</p>
              <p className="comparison-copy">Cheapest route or easiest route</p>
            </div>
            <div>
              <p className="mini-label">Detourist</p>
              <p className="comparison-copy">
                Premium routes where the savings justify every extra hoop
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="sample-deals">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Sample Deals</p>
            <h2>A few examples of what worth it looks like</h2>
            <p>The exact deals change fast. The pattern doesn't.</p>
          </div>
          <a className="text-link" href="#waitlist">
            See More Sample Deals
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
              <p className="deal-label">Why it's worth it</p>
              <p className="deal-value">{deal.valueText}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section score-section" id="worth-it-score">
        <div>
          <p className="section-kicker">Worth-It Score</p>
          <h2>Not every cheap premium trip is actually worth taking</h2>
          <p>
            Detourist scores deals based on the upside and the pain. A massive discount
            gets credit. Extra stops, long layovers, overnight transits, or repositioning
            reduce the score. Your personal detour tolerance adjusts the final result.
          </p>
          <div className="score-example-card">
            <div className="score-badge large alt">
              <span>89</span>
              <small>/100</small>
            </div>
            <div>
              <p className="deal-label">Why it's worth it</p>
              <p className="deal-copy">Deep premium-cabin discount</p>
              <p className="deal-label">The catch</p>
              <p className="deal-copy">Long layover and separate positioning leg</p>
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
          <ul className="score-notes">
            <li>Business-class fare at 42% below typical price</li>
            <li>One extra stop</li>
            <li>Five-hour longer journey</li>
            <li>Still a strong match for flexible travelers</li>
          </ul>
        </div>
      </section>

      <section className="section audience-section">
        <p className="section-kicker">Built for Detourists</p>
        <div className="split-section">
          <div>
            <h2>Built for the travelers who enjoy the smarter route</h2>
            <p>
              You know nearby airports can change everything. You'd rather take an extra
              stop than overpay thousands. You want lie-flat comfort, but only when the
              math makes sense.
            </p>
          </div>
        </div>
        <div className="pill-grid">
          {audience.map((item) => (
            <div className="audience-pill" key={item}>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Pricing</p>
            <h2>Start free. Upgrade when you want the best alerts first.</h2>
            <p>Founding-member pricing will open to early users first.</p>
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

      <section className="section faq-section">
        <p className="section-kicker">FAQ</p>
        <h2>Questions travelers will ask</h2>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section final-cta">
        <div>
          <p className="section-kicker">Join Early</p>
          <h2>If you'd take the smarter route to fly better for less, you're one of us.</h2>
          <p>
            Join the Detourist waitlist and get early access when premium deals start
            landing.
          </p>
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

