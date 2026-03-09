# Detourist Finish Plan

Detourist is now live with working waitlist signup, magic-link auth, SMTP delivery, scheduled digests, GitHub Actions triggering, and Turso-backed production persistence. The remaining work is less about basic launch viability and more about polishing Detourist into a durable, easier-to-operate premium travel product.

## Operating principle

Ship in small, production-safe slices.

For each iteration:
- choose one bounded improvement
- implement it without changing unrelated behavior
- run `npm run build`
- leave a short note about what changed, how it was verified, and what should come next

## Phase 1: Production hardening

Goal: make the live product safer and easier to operate.

Priority tasks:
- add a richer admin smoke-test flow for alerts, digests, sign-in email, and queue visibility
- expose clearer delivery failure details and recovery actions in admin
- add a small health/status route for database, mailer, and scheduler configuration
- tighten canonical URL behavior around `www.detourist.vacations`
- add guardrails and friendlier server logs around auth, waitlist, and digest failures
- document Turso backup and recovery steps
- document Vercel, GitHub Actions, SMTP, and DNS runbooks in one operator guide

Definition of done for this phase:
- common operational failures are diagnosable from admin or logs
- the canonical production URL is consistent across auth, email links, and scheduler calls
- there is a short written recovery guide for storage and email issues

## Phase 2: Admin operations maturity

Goal: make content and notifications easier to run without code edits.

Priority tasks:
- add deal duplication or draft-from-existing workflow in admin
- add import/export for deals in JSON or CSV form
- add alert preview counts before running alert generation
- add digest preview for a selected user or profile
- add filtering/search in recent deliveries and alerts
- add recent waitlist identities and linked-account visibility in admin

Definition of done for this phase:
- a non-technical operator can publish, inspect, retry, and understand what happened
- routine content and alert tasks do not require source edits

## Phase 3: User experience polish

Goal: turn the current prototype flow into a more persuasive product.

Priority tasks:
- improve onboarding defaults and copy so first-time profiles feel more intentional
- make account and alert preference states easier to understand
- add empty-state guidance across account, alerts, and deals
- improve deal detail storytelling around tradeoffs and value
- add a clearer “why this matched you” explanation in both app and email surfaces
- refine mobile spacing and hierarchy in longer account/admin screens

Definition of done for this phase:
- the product explains itself clearly to a first-time user
- users can understand why they are receiving a deal and what to do next

## Phase 4: Growth and retention loops

Goal: turn launch traffic into a measurable audience.

Priority tasks:
- add better attribution for waitlist and sign-in sources
- add a post-signup or post-sign-in nudge into onboarding completion
- add first-session prompts to save or hide deals to improve profile quality
- add more admin reporting around conversion from waitlist to linked account to engaged user
- consider referral capture or “share this deal” hooks once the core loop is stable

Definition of done for this phase:
- the admin surface shows where users come from and how they progress
- Detourist has at least one intentional loop that improves retention or acquisition

## Good overnight automation targets

Best unattended tasks:
- documentation improvements
- admin UX improvements with low blast radius
- empty-state and copy improvements
- internal health tooling
- analytics views and operator affordances
- non-destructive refactors with build verification

Avoid unattended tasks:
- secret rotation
- DNS or Vercel dashboard changes
- pushing commits automatically
- broad schema rewrites without verification notes
- deleting or migrating production data in risky ways

## Recommended next coding order

1. Add an admin health or smoke-test surface for alerts, digests, sign-in email, and scheduler state.
2. Add better filtering and inspection for email deliveries and alert records.
3. Consolidate operator docs for Vercel, Turso, SMTP, and GitHub Actions.
4. Improve onboarding and account clarity now that the backend is stable.
5. Add content-ops helpers like deal duplication or import/export.

## Overnight automation rules

The automation should:
- inspect the current repo state first
- pick one high-signal, bounded task from the priorities above
- avoid risky external operations
- keep changes reversible
- run `npm run build` before wrapping up
- leave a clear summary of edits, verification, and next best task

The automation should not:
- push to GitHub
- change external dashboards
- rotate secrets
- do destructive cleanup
- attempt large multi-area rewrites in one pass


