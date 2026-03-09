# Detourist digest scheduler

Recommended scheduler: GitHub Actions.

Why this is the best cheap option:
- free for public repos
- usually comfortably within free minutes for a private repo too
- no extra service to provision
- hourly schedule works well with Detourist's once-per-day digest guard

## What you need to add

Before the workflow can run in GitHub, this local repo needs a GitHub remote. `git remote -v` is currently empty in this workspace, so create or connect the repository first.

### 0. Connect this repo to GitHub

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

Once the first push succeeds, GitHub will pick up [`.github/workflows/detourist-digests.yml`](C:\Users\Meow\Documents\Detourist\.github\workflows\detourist-digests.yml).

### 1. GitHub repository secrets
- `DETOURIST_APP_URL`
  - example: `https://your-detourist-app.vercel.app`
- `DETOURIST_CRON_SECRET`
  - long random string shared with the deployed app

### 2. Deployment environment variables
Set these in your deployed app as well:
- `DETOURIST_CRON_SECRET`
- `DETOURIST_DIGEST_HOUR`
- `DETOURIST_DIGEST_TIMEZONE`

Suggested starting values:
- `DETOURIST_DIGEST_HOUR=8`
- `DETOURIST_DIGEST_TIMEZONE=UTC`

Recommended additions in the same deploy environment:
- `DETOURIST_APP_URL`
  - use the exact production origin with no trailing slash
- SMTP settings if you want live delivery instead of local outbox fallback

## End-to-end setup checklist

1. Push this repository to GitHub so the workflow exists in the remote repo.
2. Deploy the app to your hosting platform.
3. In the hosting platform, set:
   - `DETOURIST_APP_URL`
   - `DETOURIST_CRON_SECRET`
   - `DETOURIST_DIGEST_HOUR`
   - `DETOURIST_DIGEST_TIMEZONE`
4. In GitHub repository settings, add these Actions secrets:
   - `DETOURIST_APP_URL`
   - `DETOURIST_CRON_SECRET`
5. Confirm the GitHub secret values match the deployed app values.
6. Run the `Detourist Daily Digests` workflow manually with `workflow_dispatch`.
7. Check the workflow log for a `200` response from `/api/digests/schedule`.
8. Verify the response body looks sane:
   - `eligibleUsers` should reflect users set to `daily_digest`
   - `digestsCreated` should be greater than `0` only when digest-eligible alerts exist
   - `skippedForCadence` should rise on repeat runs the same local day

## Expected endpoint behavior

The scheduled endpoint accepts:
- `Authorization: Bearer <DETOURIST_CRON_SECRET>`
- `x-detourist-cron-secret: <DETOURIST_CRON_SECRET>`
- `?secret=<DETOURIST_CRON_SECRET>`

GitHub Actions is configured to use the bearer token form.

## How it works
- GitHub Actions calls `/api/digests/schedule` every hour at minute `17`
- Detourist only sends after the configured digest hour
- Detourist only sends one non-failed digest per user per local day
- repeated hourly calls are safe and will skip once the daily send has happened
- both `GET` and `POST` are accepted by the route, though the workflow uses `POST`

## Why minute 17
GitHub scheduled workflows can be a bit delayed near the top of the hour. Running at `:17` avoids the busiest slot and is usually steadier.

## If your repo is private
This is still usually the cheapest option. The workflow is only a short `curl`, so it should use very little GitHub Actions runtime.

## Troubleshooting

- `401 Unauthorized`
  - The GitHub secret and deploy env var for `DETOURIST_CRON_SECRET` do not match, or the deploy does not have the env var yet.
- Workflow fails before the request
  - One or both GitHub repository secrets are missing.
- Workflow succeeds but creates `0` digests
  - This can be correct if the current local time is before `DETOURIST_DIGEST_HOUR`, no users are on `daily_digest`, or there are no digest-eligible alerts.
- Repeated manual runs create digests only once
  - This is the intended once-per-local-day cadence guard.
