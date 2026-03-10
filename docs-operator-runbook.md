# Detourist Operator Runbook

Detourist is live on Vercel with Turso-backed persistence, Resend SMTP delivery, GitHub Actions scheduled digests, and a Cloudflare-managed custom domain.

Use this document as the day-two operations guide for production checks, debugging, and safe changes.

## Canonical production shape

- Primary site URL: `https://www.detourist.vacations`
- Apex redirect: `https://detourist.vacations` should redirect to `https://www.detourist.vacations`
- Email sender: `Detourist <alerts@send.detourist.vacations>`
- Hosting: Vercel
- Production database: Turso/libSQL
- Outbound email: Resend SMTP
- Scheduled digests trigger: GitHub Actions calling `/api/digests/schedule`

## Source of truth by system

### Vercel

Vercel owns the runtime environment variables and the production deployment.

Required production variables:

```dotenv
DETOURIST_ADMIN_USERNAME=
DETOURIST_ADMIN_PASSWORD=
DETOURIST_SESSION_SECRET=
DETOURIST_APP_URL=https://www.detourist.vacations
DETOURIST_EMAIL_FROM=Detourist <alerts@send.detourist.vacations>
DETOURIST_SMTP_HOST=smtp.resend.com
DETOURIST_SMTP_PORT=465
DETOURIST_SMTP_SECURE=true
DETOURIST_SMTP_USER=resend
DETOURIST_SMTP_PASSWORD=
DETOURIST_CRON_SECRET=
DETOURIST_DIGEST_HOUR=8
DETOURIST_DIGEST_TIMEZONE=UTC
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

Rules:

- `DETOURIST_APP_URL` should be the exact canonical public origin, with no trailing slash.
- `DETOURIST_CRON_SECRET` must match GitHub Actions exactly.
- Any change to Vercel env vars should be followed by a redeploy and smoke test.

### GitHub Actions

GitHub owns the scheduled digest trigger.

Repository secrets:

```dotenv
DETOURIST_APP_URL=https://www.detourist.vacations
DETOURIST_CRON_SECRET=
```

Rules:

- `DETOURIST_APP_URL` should match Vercel exactly.
- `DETOURIST_CRON_SECRET` should match Vercel exactly.
- If scheduler behavior looks wrong, check GitHub workflow logs first before changing application code.

### Cloudflare and DNS

Cloudflare owns DNS.

Rules:

- Keep both `detourist.vacations` and `www.detourist.vacations` active.
- Prefer `www` as the canonical production hostname.
- Keep the Resend sending subdomain `send.detourist.vacations` verified and untouched unless you are deliberately rotating email infrastructure.

### Resend

Resend owns outbound SMTP reputation and sender verification.

Rules:

- Keep `send.detourist.vacations` verified.
- Keep the sender address on that verified domain.
- If you rotate the API key, update `DETOURIST_SMTP_PASSWORD` in Vercel and redeploy before testing email again.

## Routine operating checklist

### After every production deploy

1. Load the landing page on `https://www.detourist.vacations`.
2. Submit a waitlist signup.
3. Request a sign-in link on `/sign-in`.
4. Open `/admin` and confirm the health snapshot still shows the expected app URL, Turso, SMTP, and digest schedule.
5. Open the email deliveries panel and confirm recent traffic looks normal.

### Daily or after notification-related changes

1. Open `/admin`.
2. Check the health panel for warnings.
3. Check email deliveries filtered to `Failed`.
4. If scheduler-related changes were made, run the `Detourist Daily Digests` GitHub workflow once manually.

### Before risky backend or env changes

1. Capture a fresh Turso backup or export using your current Turso dashboard or CLI workflow.
2. Confirm the current `DETOURIST_APP_URL`, `DETOURIST_CRON_SECRET`, and SMTP settings in Vercel.
3. Pause and inspect before changing multiple systems at once.

## Incident playbooks

### Waitlist signup, onboarding, or account writes fail

Symptoms:

- waitlist form shows save failure
- onboarding/profile/account updates fail
- admin health suggests database problems

What to check:

1. Open `/admin` and inspect the health panel.
2. Confirm `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` still exist in Vercel production env vars.
3. Check Vercel runtime logs for the failing route.
4. Confirm the latest deploy contains the expected database code.

Likely causes:

- missing or rotated Turso credentials
- Turso connectivity issue
- deploy running with stale env vars

### Sign-in link, alert, or digest email does not arrive

Symptoms:

- request succeeded but no email arrived
- deliveries appear as `failed` or stay `queued`
- sign-in links stop sending after an env or domain change

What to check:

1. Open `/admin` -> Email deliveries.
2. Filter to `Failed`.
3. Expand a failed row and inspect the error detail.
4. Confirm `DETOURIST_EMAIL_FROM` still uses `alerts@send.detourist.vacations`.
5. Confirm the SMTP host, port, secure mode, user, and password are correct in Vercel.
6. Confirm `send.detourist.vacations` is still verified in Resend.

Likely causes:

- rotated Resend API key not updated in Vercel
- sending domain verification problem
- incorrect SMTP secure/port pairing

### Scheduler fails or digests stop sending

Symptoms:

- GitHub workflow fails
- GitHub workflow returns `401`
- digests never create even after the configured hour

What to check:

1. Open the latest `Detourist Daily Digests` workflow run in GitHub Actions.
2. Confirm the request reached `/api/digests/schedule`.
3. If the response is `401`, compare the GitHub `DETOURIST_CRON_SECRET` secret against the Vercel env var.
4. Confirm `DETOURIST_APP_URL` matches between GitHub and Vercel.
5. Confirm `DETOURIST_DIGEST_HOUR` and `DETOURIST_DIGEST_TIMEZONE` are set as expected in Vercel.
6. Use `/admin` previews or manual runs to confirm digest-eligible users and alerts actually exist.

Likely causes:

- GitHub secret drift
- wrong app URL
- scheduler running before the configured local hour
- no digest-eligible alerts available

### Wrong hostnames or bad magic-link destinations

Symptoms:

- emails point to the wrong host
- users bounce between `www` and non-`www`
- sign-in links land on the wrong origin

What to check:

1. Confirm `DETOURIST_APP_URL=https://www.detourist.vacations` in Vercel.
2. Confirm GitHub `DETOURIST_APP_URL` uses the same `www` origin.
3. Confirm Vercel domains are configured so the apex redirects to `www`.
4. Test a fresh sign-in link after any domain change.

## Backup and recovery notes

- Treat Turso as the production source of truth.
- Local `data/` files are for development and local fallback only.
- Before changing auth, scheduler, or database configuration, capture a fresh Turso backup or export with your current Turso tooling.
- If you need to restore production data, do the restore first, then re-run smoke tests for waitlist signup, sign-in email, and admin health before resuming normal operations.
- If recovery work may cause duplicate outbound email, temporarily disable the GitHub digest workflow or avoid manual digest runs until state is confirmed.

## Safe change rules

- Prefer changing one system at a time: Vercel env vars, GitHub secrets, DNS, or Resend.
- After env changes, redeploy before declaring the change complete.
- After email changes, test a sign-in link before testing digests.
- After scheduler changes, run one manual GitHub workflow before waiting for cron.

## Fast smoke-test sequence

Use this when you want a quick confidence check in under ten minutes:

1. Landing page load on `https://www.detourist.vacations`
2. Waitlist signup
3. Sign-in link request and email click-through
4. `/admin` health snapshot
5. `/admin` failed email deliveries filter
6. Optional manual `Detourist Daily Digests` workflow run
