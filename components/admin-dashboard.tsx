import Link from "next/link";

import { AdminEmailDeliveries } from "@/components/admin-email-deliveries";
import { getAdminAnalytics } from "@/lib/admin-analytics";

function MetricCard({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <article className="metric-card">
      <p className="section-kicker">{label}</p>
      <h3>{value}</h3>
      <p>{note}</p>
    </article>
  );
}

export async function AdminDashboard() {
  const analytics = await getAdminAnalytics();
  const { totals, operations, lists } = analytics;

  return (
    <section className="admin-dashboard-shell">
      <div className="metrics-grid">
        <MetricCard label="Deals live" value={totals.activeDeals} note={`${totals.deals} total deals, ${totals.expiredDeals} expired`} />
        <MetricCard label="Waitlist" value={totals.waitlist} note={`${totals.users} user records, ${totals.linkedUsers} linked identities`} />
        <MetricCard label="Profiles" value={totals.profiles} note={`${totals.profileOnlyUsers} profile-only users right now`} />
        <MetricCard label="Engagement" value={totals.totalSaved} note={`${totals.totalHidden} hidden actions, ${totals.averageSaved} avg saves per profile`} />
      </div>

      <div className="metrics-grid behavior-metrics-grid">
        <MetricCard label="Behavior events" value={totals.totalEvents} note={`${totals.totalSaveEvents} saves and ${totals.totalHideEvents} hides captured`} />
        <MetricCard label="Detail views" value={totals.totalDetailViews} note="Tracked from feed clicks and direct detail-page views" />
        <MetricCard label="Booking clicks" value={totals.totalBookingClicks} note="Outbound interest in actually taking the deal" />
        <MetricCard label="View-to-book" value={`${totals.bookingRate}%`} note="Booking clicks divided by tracked detail views" />
      </div>

      <div className="metrics-grid behavior-metrics-grid">
        <MetricCard label="Alerts" value={totals.totalAlerts} note={`${totals.totalUnreadAlerts} unread and ${totals.totalViewedAlerts} viewed`} />
        <MetricCard label="Email alerts" value={totals.emailAlerts} note="Profiles with a linked email can be reached outside the app" />
        <MetricCard label="In-app alerts" value={totals.inAppAlerts} note="Profiles without linked email still get alert inventory" />
        <MetricCard label="Alert coverage" value={totals.profiles ? `${Math.round((totals.totalAlerts / totals.profiles) * 10) / 10}` : "0"} note="Average alerts generated per profile" />
        <MetricCard label="Digest backlog" value={totals.pendingDigestAlerts} note={`${totals.digestEmails} digest deliveries recorded so far`} />
      </div>

      <div className="metrics-grid behavior-metrics-grid">
        <MetricCard label="Email deliveries" value={totals.totalEmailDeliveries} note={`${totals.sentEmails} sent, ${totals.queuedEmails} queued, ${totals.failedEmails} failed`} />
        <MetricCard label="Digests" value={totals.digestEmails} note={`${totals.pendingDigestAlerts} unread alerts currently waiting for batch send`} />
        <MetricCard label="Sent" value={totals.sentEmails} note="SMTP deliveries that left the app successfully" />
        <MetricCard label="Queued" value={totals.queuedEmails} note="Local outbox entries waiting for a real mail transport" />
        <MetricCard label="Failed" value={totals.failedEmails} note="SMTP attempts that need attention" />
      </div>

      <div className="admin-insights-grid">
        <article className="detail-card">
          <p className="section-kicker">Operations</p>
          <h2>Live config snapshot</h2>
          <div className="mini-stat-list">
            <div className="mini-stat-row">
              <span>App URL</span>
              <strong>{operations.appUrl}</strong>
            </div>
            <div className="mini-stat-row">
              <span>Database</span>
              <strong>{operations.databaseProvider}</strong>
            </div>
            <div className="mini-stat-row">
              <span>Turso ready</span>
              <strong>{operations.tursoConfigured ? "yes" : "no"}</strong>
            </div>
            <div className="mini-stat-row">
              <span>Mailer</span>
              <strong>{operations.mailerMode}</strong>
            </div>
            <div className="mini-stat-row">
              <span>From</span>
              <strong>{operations.fromAddress}</strong>
            </div>
            <div className="mini-stat-row">
              <span>SMTP</span>
              <strong>{operations.smtpHost ? `${operations.smtpHost}:${operations.smtpPort ?? "?"}${operations.smtpSecure ? " (TLS)" : ""}` : "not configured"}</strong>
            </div>
            <div className="mini-stat-row">
              <span>Digest schedule</span>
              <strong>{operations.digestScheduleLabel}</strong>
            </div>
            <div className="mini-stat-row">
              <span>Cron secret</span>
              <strong>{operations.cronSecretConfigured ? "present" : "missing"}</strong>
            </div>
          </div>
        </article>

        <article className="detail-card">
          <p className="section-kicker">Coverage</p>
          <h2>Content mix</h2>
          <div className="detail-facts-grid compact-facts-grid">
            <div>
              <span>Flights</span>
              <strong>{totals.flights}</strong>
            </div>
            <div>
              <span>Hotels</span>
              <strong>{totals.hotels}</strong>
            </div>
            <div>
              <span>Waitlist only</span>
              <strong>{totals.waitlistOnlyUsers}</strong>
            </div>
            <div>
              <span>Fully linked</span>
              <strong>{totals.linkedUsers}</strong>
            </div>
          </div>
        </article>

        <article className="detail-card">
          <p className="section-kicker">Top destinations</p>
          <h2>Where the inventory points</h2>
          <div className="mini-stat-list">
            {lists.topDestinations.length ? (
              lists.topDestinations.map((item) => (
                <div className="mini-stat-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            ) : (
              <p>No destination data yet.</p>
            )}
          </div>
        </article>

        <article className="detail-card">
          <p className="section-kicker">Top tags</p>
          <h2>What kinds of deals dominate</h2>
          <div className="reason-stack account-tag-row">
            {lists.topTags.length ? (
              lists.topTags.map((item) => (
                <span className="insight-pill" key={item.label}>{item.label} ({item.count})</span>
              ))
            ) : (
              <p>No tags yet.</p>
            )}
          </div>
          <div className="mini-stat-list compact-top-list">
            {lists.topOrigins.length ? (
              lists.topOrigins.map((item) => (
                <div className="mini-stat-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            ) : null}
          </div>
        </article>

        <article className="detail-card">
          <p className="section-kicker">Waitlist sources</p>
          <h2>Acquisition signals</h2>
          <div className="mini-stat-list">
            {lists.waitlistSources.length ? (
              lists.waitlistSources.map((item) => (
                <div className="mini-stat-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            ) : (
              <p>No waitlist signups yet. This is a healthy empty-state check for a fresh prototype.</p>
            )}
          </div>
        </article>
      </div>

      <div className="admin-insights-grid">
        <article className="detail-card">
          <p className="section-kicker">Event mix</p>
          <h2>What users are doing</h2>
          <div className="mini-stat-list">
            {lists.eventTypes.length ? (
              lists.eventTypes.map((item) => (
                <div className="mini-stat-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            ) : (
              <p>No behavior events yet. As soon as someone interacts with a deal, this panel starts filling in.</p>
            )}
          </div>
        </article>

        <article className="detail-card">
          <p className="section-kicker">Alert channels</p>
          <h2>How alerts can be delivered</h2>
          <div className="mini-stat-list">
            {lists.alertChannels.length ? (
              lists.alertChannels.map((item) => (
                <div className="mini-stat-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            ) : (
              <p>No alerts yet. Publish a deal or run backfill after creating profiles.</p>
            )}
          </div>
        </article>

        <article className="detail-card">
          <p className="section-kicker">Notification prefs</p>
          <h2>How users want to hear from you</h2>
          <div className="mini-stat-list">
            {lists.alertPreferences.length ? (
              lists.alertPreferences.map((item) => (
                <div className="mini-stat-row" key={item.label}>
                  <span>{item.label.replace("_", " ")}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            ) : (
              <p>No notification preferences yet.</p>
            )}
          </div>
        </article>

        <article className="detail-card">
          <p className="section-kicker">Email mix</p>
          <h2>Delivery kinds and result mix</h2>
          <div className="mini-stat-list">
            {lists.emailKinds.length ? (
              lists.emailKinds.map((item) => (
                <div className="mini-stat-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            ) : (
              <p>No email deliveries yet.</p>
            )}
          </div>
          <div className="mini-stat-list">
            {lists.emailModes.length ? (
              lists.emailModes.map((item) => (
                <div className="mini-stat-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            ) : (
              <p>No email deliveries yet.</p>
            )}
          </div>
        </article>
      </div>

      <article className="detail-card">
        <div className="section-heading-row product-heading-row">
          <div>
            <p className="section-kicker">Recent content</p>
            <h2>Newest deals in the feed</h2>
          </div>
        </div>
        <div className="admin-table">
          <div className="admin-table-head">
            <span>Deal</span>
            <span>Type</span>
            <span>Published</span>
            <span>Expires</span>
            <span>Price</span>
          </div>
          {lists.recentDeals.length ? (
            lists.recentDeals.map((deal) => (
              <div className="admin-table-row" key={deal.id}>
                <Link href={`/deals/${deal.slug}`}>{deal.title}</Link>
                <span>{deal.type}</span>
                <span>{new Date(deal.publishedAt).toLocaleDateString()}</span>
                <span>{new Date(deal.expiresAt).toLocaleDateString()}</span>
                <span>${deal.currentPrice} {deal.currency}</span>
              </div>
            ))
          ) : (
            <div className="admin-table-empty">No deals published yet.</div>
          )}
        </div>
      </article>

      <article className="detail-card">
        <div className="section-heading-row product-heading-row">
          <div>
            <p className="section-kicker">Recent alerts</p>
            <h2>Latest generated matches</h2>
          </div>
        </div>
        <div className="admin-table admin-table-events">
          <div className="admin-table-head admin-table-head-events">
            <span>Deal</span>
            <span>Channel</span>
            <span>Score</span>
            <span>Status</span>
            <span>Created</span>
          </div>
          {lists.recentAlerts.length ? (
            lists.recentAlerts.map((alert) => (
              <div className="admin-table-row admin-table-row-events" key={alert.id}>
                <Link href={`/deals/${alert.dealSlug}`}>{alert.dealTitle}</Link>
                <span>{alert.channel}</span>
                <span>{alert.score}</span>
                <span>{alert.status}</span>
                <span>{new Date(alert.createdAt).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <div className="admin-table-empty">No alerts generated yet.</div>
          )}
        </div>
      </article>

      <AdminEmailDeliveries initialDeliveries={lists.recentEmailDeliveries} />

      <article className="detail-card">
        <div className="section-heading-row product-heading-row">
          <div>
            <p className="section-kicker">Recent behavior</p>
            <h2>Latest tracked actions</h2>
          </div>
        </div>
        <div className="admin-table admin-table-events">
          <div className="admin-table-head admin-table-head-events">
            <span>Event</span>
            <span>Surface</span>
            <span>Deal</span>
            <span>Time</span>
          </div>
          {lists.recentEvents.length ? (
            lists.recentEvents.map((event) => (
              <div className="admin-table-row admin-table-row-events" key={event.id}>
                <span>{event.type}</span>
                <span>{event.surface}</span>
                <span>{event.dealSlug ?? "Unknown deal"}</span>
                <span>{new Date(event.createdAt).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <div className="admin-table-empty">No tracked events yet.</div>
          )}
        </div>
      </article>
    </section>
  );
}
