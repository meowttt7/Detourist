# Detourist

Detourist is a premium travel deals product for flexible travelers who care more about value than convenience. It pairs a curated deals feed with a `Worth-It Score`, onboarding, alerts, digests, account management, and an admin workflow for running the catalog.

## Stack

- Next.js 16
- React 19
- TypeScript
- Turso/libSQL in production
- Local file-backed libSQL for development
- SMTP delivery with local JSON outbox fallback

## Current product surface

- Landing page and waitlist capture
- Onboarding and profile flow
- Deals feed and deal detail pages
- Admin auth and dashboard
- Account email linking and magic-link auth
- Instant alerts, daily digests, and paused notifications
- Retry controls for queued and failed email deliveries
- Demo seed mode and event tracking

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in the required values.

3. Start the app:

```bash
npm run dev
```

4. Build for a production check:

```bash
npm run build
```

## Required environment variables

```dotenv
DETOURIST_ADMIN_USERNAME=
DETOURIST_ADMIN_PASSWORD=
DETOURIST_SESSION_SECRET=
DETOURIST_APP_URL=
DETOURIST_EMAIL_FROM=
DETOURIST_SMTP_HOST=
DETOURIST_SMTP_PORT=
DETOURIST_SMTP_SECURE=
DETOURIST_SMTP_USER=
DETOURIST_SMTP_PASSWORD=
DETOURIST_CRON_SECRET=
DETOURIST_DIGEST_HOUR=
DETOURIST_DIGEST_TIMEZONE=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
DETOURIST_ENABLE_BOOTSTRAP_SEED=
```

Notes:

- `DETOURIST_APP_URL` should be the full deployed origin, with no trailing slash.
- `DETOURIST_CRON_SECRET` must match between the deployed app and the GitHub Actions secret.
- `DETOURIST_DIGEST_HOUR` is interpreted in `DETOURIST_DIGEST_TIMEZONE`.
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are required in Vercel for production writes.
- Local development falls back to a file-backed database in `data/detourist.sqlite` when Turso env vars are absent.
- JSON bootstrap seeding is on by default only for the local file-backed database. Remote databases stay unseeded unless `DETOURIST_ENABLE_BOOTSTRAP_SEED=true` is set explicitly.

## Daily digest scheduling

Detourist includes a GitHub Actions workflow at [`.github/workflows/detourist-digests.yml`](C:\Users\Meow\Documents\Detourist\.github\workflows\detourist-digests.yml) that calls [`/api/digests/schedule`](C:\Users\Meow\Documents\Detourist\app\api\digests\schedule\route.ts) every hour.

The endpoint is safe to trigger hourly because it:

- Requires the cron secret
- Waits until the configured local digest hour
- Sends at most one non-failed digest per user per local day
- Skips alerts that were already delivered individually

Full setup steps live in [docs-digest-scheduler.md](C:\Users\Meow\Documents\Detourist\docs-digest-scheduler.md).

## Operator guide

Day-two production checks, incident playbooks, and canonical environment ownership live in [docs-operator-runbook.md](C:\Users\Meow\Documents\Detourist\docs-operator-runbook.md).

## GitHub repo setup

Typical next commands:

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

After the first push:

1. Add `DETOURIST_APP_URL` and `DETOURIST_CRON_SECRET` as GitHub repository secrets.
2. Add the matching deploy environment variables in your hosting platform.
3. Run the workflow manually with `workflow_dispatch` once to confirm it reaches the app.

## Important files

- [app/account/page.tsx](C:\Users\Meow\Documents\Detourist\app\account\page.tsx)
- [app/admin/page.tsx](C:\Users\Meow\Documents\Detourist\app\admin\page.tsx)
- [app/api/alerts/run/route.ts](C:\Users\Meow\Documents\Detourist\app\api\alerts\run\route.ts)
- [app/api/digests/run/route.ts](C:\Users\Meow\Documents\Detourist\app\api\digests\run\route.ts)
- [app/api/digests/schedule/route.ts](C:\Users\Meow\Documents\Detourist\app\api\digests\schedule\route.ts)
- [app/api/email-deliveries/retry/route.ts](C:\Users\Meow\Documents\Detourist\app\api\email-deliveries\retry\route.ts)
- [lib/alerts.ts](C:\Users\Meow\Documents\Detourist\lib\alerts.ts)
- [lib/db.ts](C:\Users\Meow\Documents\Detourist\lib\db.ts)
- [lib/digests.ts](C:\Users\Meow\Documents\Detourist\lib\digests.ts)
- [lib/scheduled-jobs.ts](C:\Users\Meow\Documents\Detourist\lib\scheduled-jobs.ts)



