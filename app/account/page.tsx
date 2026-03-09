import Link from "next/link";

import { AccountAlerts } from "@/components/account-alerts";
import { AccountEmailForm } from "@/components/account-email-form";
import { AccountNotificationForm } from "@/components/account-notification-form";
import { ProductNav } from "@/components/product-nav";
import { getAlertsForProfile } from "@/lib/alert-store";
import { getCurrentAccount } from "@/lib/current-account";
import { formatDigestScheduleLabel } from "@/lib/digest-config";
import { getPendingDailyDigestCount } from "@/lib/digests";
import { getLatestEmailDeliveryForUserAndKind } from "@/lib/email-delivery-store";

export default async function AccountPage() {
  const { user, profile } = await getCurrentAccount();
  const alerts = profile ? await getAlertsForProfile(profile.id) : [];
  const pendingDigestCount = user ? await getPendingDailyDigestCount(user) : 0;
  const latestDigestDelivery = user ? await getLatestEmailDeliveryForUserAndKind(user.id, "digest") : null;
  const digestScheduleLabel = formatDigestScheduleLabel();

  const hasProfile = Boolean(profile);
  const hasEmail = Boolean(user?.email);
  const savedCount = profile?.savedDealIds.length ?? 0;
  const hiddenCount = profile?.hiddenDealIds.length ?? 0;
  const unreadAlerts = alerts.filter((alert) => alert.status === "new").length;

  return (
    <main className="page-shell product-page-shell">
      <ProductNav />
      <section className="section product-hero">
        <p className="section-kicker">Account</p>
        <h1>Your Detourist identity, profile, and saved-deal state in one place.</h1>
        <p className="hero-text product-hero-text">
          This page is the first unified view of who the product thinks you are: your linked email, your detour profile, and the state that powers your feed.
        </p>
      </section>

      <section className="section product-section-tight account-layout">
        <article className="detail-card">
          <p className="section-kicker">Identity</p>
          <h2>Linked account</h2>
          <div className="detail-facts-grid">
            <div>
              <span>Email</span>
              <strong>{hasEmail ? user?.email : "Not linked yet"}</strong>
            </div>
            <div>
              <span>Waitlist status</span>
              <strong>{user?.waitlistStatus === "joined" ? "Joined" : "Not joined"}</strong>
            </div>
            <div>
              <span>Profile linked</span>
              <strong>{hasProfile ? "Yes" : "No"}</strong>
            </div>
            <div>
              <span>Identity created</span>
              <strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Not yet"}</strong>
            </div>
          </div>
          {user?.waitlistSources.length ? (
            <div className="reason-stack account-tag-row">
              {user.waitlistSources.map((source) => (
                <span className="insight-pill" key={source}>{source}</span>
              ))}
            </div>
          ) : null}
          <AccountEmailForm initialEmail={user?.email ?? ""} hasProfile={hasProfile} />
          {user ? <AccountNotificationForm initialPreference={user.alertPreference} hasEmail={hasEmail} /> : null}
        </article>

        <article className="detail-card">
          <p className="section-kicker">Feed state</p>
          <h2>Your live product state</h2>
          <div className="detail-facts-grid">
            <div>
              <span>Saved deals</span>
              <strong>{savedCount}</strong>
            </div>
            <div>
              <span>Hidden deals</span>
              <strong>{hiddenCount}</strong>
            </div>
            <div>
              <span>Unread alerts</span>
              <strong>{unreadAlerts}</strong>
            </div>
            <div>
              <span>Alert mode</span>
              <strong>{user ? user.alertPreference.replace("_", " ") : "Not set"}</strong>
            </div>
          </div>
          <div className="detail-facts-grid detail-facts-grid-compact">
            <div>
              <span>Pending digest alerts</span>
              <strong>{pendingDigestCount}</strong>
            </div>
            <div>
              <span>Latest digest</span>
              <strong>
                {latestDigestDelivery
                  ? `${latestDigestDelivery.status} on ${new Date(latestDigestDelivery.createdAt).toLocaleDateString()}`
                  : "No digest sent yet"}
              </strong>
            </div>
          </div>
          {user?.alertPreference === "daily_digest" ? (
            <p className="support-text account-inline-note">
              Daily digest is active. Matching unread alerts will batch here until the next scheduled run after {digestScheduleLabel} instead of sending one-by-one.
            </p>
          ) : null}
        </article>
      </section>

      <section className="section detail-grid">
        <article className="detail-card">
          <p className="section-kicker">Profile detail</p>
          <h2>Detour profile snapshot</h2>
          {profile ? (
            <ul className="check-list">
              <li>Budget ceiling: ${profile.budgetMax}</li>
              <li>Max stops: {profile.maxStops}</li>
              <li>Overnight layovers: {profile.allowOvernight ? "Allowed" : "Avoided"}</li>
              <li>Pain tolerance: {profile.maxTravelPain}/10</li>
              <li>Destination interests: {profile.destinationInterests.join(", ")}</li>
              <li>Reposition regions: {profile.repositionRegions.join(", ")}</li>
            </ul>
          ) : (
            <p>You have not created a Detourist profile yet, so the feed cannot personalize around your tradeoff preferences.</p>
          )}
        </article>

        <article className="detail-card">
          <p className="section-kicker">Next actions</p>
          <h2>What to do next</h2>
          <div className="detail-actions-column">
            <Link className="button" href={hasProfile ? "/deals" : "/onboarding"}>
              {hasProfile ? "Open personalized deals" : "Create your detour profile"}
            </Link>
            <Link className="button button-secondary" href="/onboarding">
              Update profile
            </Link>
            <Link className="button button-secondary" href="/">
              Go to homepage
            </Link>
          </div>
        </article>
      </section>

      <section className="section product-section-tight">
        <AccountAlerts initialAlerts={alerts} />
      </section>
    </main>
  );
}
