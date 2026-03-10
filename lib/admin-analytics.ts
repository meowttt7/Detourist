import { getAllAlerts } from "@/lib/alert-store";
import { getDatabaseProviderLabel } from "@/lib/db";
import { formatDigestScheduleLabel, getDigestScheduleConfig } from "@/lib/digest-config";
import { getAllDeals } from "@/lib/deal-store";
import { getAllEmailDeliveries, getEmailDeliveriesByReferences } from "@/lib/email-delivery-store";
import { getAllEvents } from "@/lib/event-store";
import { getMailerConfigSummary } from "@/lib/mailer";
import { getAllProfiles } from "@/lib/profile-store";
import { getAllUsers } from "@/lib/user-store";
import { getAllWaitlistEntries } from "@/lib/waitlist-store";

function countBy(items: string[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
}

export async function getAdminAnalytics() {
  const [deals, profiles, users, waitlist, events, alerts, emailDeliveries] = await Promise.all([
    getAllDeals(),
    getAllProfiles(),
    getAllUsers(),
    getAllWaitlistEntries(),
    getAllEvents(),
    getAllAlerts(),
    getAllEmailDeliveries(),
  ]);

  const now = Date.now();
  const activeDeals = deals.filter((deal) => Date.parse(deal.expiresAt) > now);
  const expiredDeals = deals.filter((deal) => Date.parse(deal.expiresAt) <= now);
  const flightDeals = deals.filter((deal) => deal.type === "flight");
  const hotelDeals = deals.filter((deal) => deal.type === "hotel");

  const linkedUsers = users.filter((user) => user.email && user.profileId);
  const waitlistOnlyUsers = users.filter((user) => user.email && !user.profileId);
  const profileOnlyUsers = users.filter((user) => !user.email && user.profileId);

  const userMap = new Map(users.map((user) => [user.id, user]));
  const usersByEmail = new Map(
    users
      .filter((user) => Boolean(user.email))
      .map((user) => [String(user.email).toLowerCase(), user]),
  );
  const profileIds = new Set(profiles.map((profile) => profile.id));

  const totalSaved = profiles.reduce((sum, profile) => sum + profile.savedDealIds.length, 0);
  const totalHidden = profiles.reduce((sum, profile) => sum + profile.hiddenDealIds.length, 0);
  const averageSaved = profiles.length ? totalSaved / profiles.length : 0;

  const totalDetailViews = events.filter((event) => event.type === "detail_view").length;
  const totalBookingClicks = events.filter((event) => event.type === "booking_click").length;
  const totalSaveEvents = events.filter((event) => event.type === "save_deal").length;
  const totalHideEvents = events.filter((event) => event.type === "hide_deal").length;
  const bookingRate = totalDetailViews ? (totalBookingClicks / totalDetailViews) * 100 : 0;

  const totalUnreadAlerts = alerts.filter((alert) => alert.status === "new").length;
  const totalViewedAlerts = alerts.filter((alert) => alert.status === "viewed").length;
  const emailAlerts = alerts.filter((alert) => alert.channel === "email").length;
  const inAppAlerts = alerts.filter((alert) => alert.channel === "in_app").length;
  const rawPendingDigestAlerts = alerts.filter((alert) => {
    if (alert.channel !== "email" || alert.status !== "new" || alert.digestDeliveryId || !alert.userId) {
      return false;
    }

    const user = userMap.get(alert.userId);
    return user?.alertPreference === "daily_digest";
  });
  const existingInstantDeliveries = await getEmailDeliveriesByReferences("alert", rawPendingDigestAlerts.map((alert) => alert.id));
  const deliveredAlertIds = new Set(existingInstantDeliveries.map((delivery) => delivery.referenceId));
  const pendingDigestAlerts = rawPendingDigestAlerts.filter((alert) => !deliveredAlertIds.has(alert.id)).length;

  const sentEmails = emailDeliveries.filter((delivery) => delivery.status === "sent").length;
  const queuedEmails = emailDeliveries.filter((delivery) => delivery.status === "queued").length;
  const failedEmails = emailDeliveries.filter((delivery) => delivery.status === "failed").length;
  const digestEmails = emailDeliveries.filter((delivery) => delivery.kind === "digest").length;

  const topDestinations = countBy(deals.map((deal) => deal.destinationRegion));
  const topTags = countBy(deals.flatMap((deal) => deal.tags));
  const topOrigins = countBy(deals.map((deal) => deal.origin));
  const waitlistSources = countBy(waitlist.map((entry) => entry.source));
  const eventTypes = countBy(events.map((event) => event.type));
  const alertChannels = countBy(alerts.map((alert) => alert.channel));
  const alertPreferences = countBy(users.map((user) => user.alertPreference));
  const emailModes = countBy(emailDeliveries.map((delivery) => `${delivery.kind}:${delivery.mode}:${delivery.status}`));
  const emailKinds = countBy(emailDeliveries.map((delivery) => delivery.kind));

  const dealEventCounts = deals
    .map((deal) => {
      const dealEvents = events.filter((event) => event.dealId === deal.id);
      const detailViews = dealEvents.filter((event) => event.type === "detail_view").length;
      const bookingClicks = dealEvents.filter((event) => event.type === "booking_click").length;
      const saves = dealEvents.filter((event) => event.type === "save_deal").length;
      const alertCount = alerts.filter((alert) => alert.dealId === deal.id).length;

      return {
        id: deal.id,
        title: deal.title,
        slug: deal.slug,
        interactions: dealEvents.length,
        detailViews,
        bookingClicks,
        saves,
        alertCount,
      };
    })
    .sort((left, right) => (right.interactions + right.alertCount) - (left.interactions + left.alertCount))
    .slice(0, 5);

  const recentDeals = deals.slice(0, 5).map((deal) => ({
    id: deal.id,
    title: deal.title,
    slug: deal.slug,
    type: deal.type,
    publishedAt: deal.publishedAt,
    expiresAt: deal.expiresAt,
    currentPrice: deal.currentPrice,
    currency: deal.currency,
  }));

  const recentEvents = events.slice(0, 8).map((event) => ({
    id: event.id,
    type: event.type,
    surface: event.surface,
    dealSlug: event.dealSlug ?? null,
    createdAt: event.createdAt,
  }));

  const recentAlerts = alerts.slice(0, 8).map((alert) => ({
    id: alert.id,
    dealTitle: alert.dealTitle,
    dealSlug: alert.dealSlug,
    score: alert.score,
    channel: alert.channel,
    status: alert.status,
    createdAt: alert.createdAt,
  }));

  const recentEmailDeliveries = emailDeliveries.slice(0, 40);
  const recentWaitlistIdentities = waitlist.slice(0, 10).map((entry) => {
    const matchedUser = usersByEmail.get(entry.email.toLowerCase()) ?? null;
    const hasLinkedProfile = Boolean(matchedUser?.profileId && profileIds.has(matchedUser.profileId));
    const linkageState = matchedUser
      ? hasLinkedProfile
        ? "linked_profile"
        : "account_only"
      : "waitlist_only";

    return {
      email: entry.email,
      source: entry.source,
      createdAt: entry.createdAt,
      linkageState,
      userId: matchedUser?.id ?? null,
      profileId: matchedUser?.profileId ?? null,
      alertPreference: matchedUser?.alertPreference ?? null,
    };
  });
  const digestConfig = getDigestScheduleConfig();
  const mailer = getMailerConfigSummary();

  return {
    totals: {
      deals: deals.length,
      activeDeals: activeDeals.length,
      expiredDeals: expiredDeals.length,
      flights: flightDeals.length,
      hotels: hotelDeals.length,
      waitlist: waitlist.length,
      users: users.length,
      profiles: profiles.length,
      linkedUsers: linkedUsers.length,
      waitlistOnlyUsers: waitlistOnlyUsers.length,
      profileOnlyUsers: profileOnlyUsers.length,
      totalSaved,
      totalHidden,
      averageSaved: Number(averageSaved.toFixed(1)),
      totalEvents: events.length,
      totalDetailViews,
      totalBookingClicks,
      totalSaveEvents,
      totalHideEvents,
      bookingRate: Number(bookingRate.toFixed(1)),
      totalAlerts: alerts.length,
      totalUnreadAlerts,
      totalViewedAlerts,
      emailAlerts,
      inAppAlerts,
      pendingDigestAlerts,
      totalEmailDeliveries: emailDeliveries.length,
      sentEmails,
      queuedEmails,
      failedEmails,
      digestEmails,
    },
    operations: {
      appUrl: (process.env.DETOURIST_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
      databaseProvider: getDatabaseProviderLabel(),
      mailerMode: mailer.mode,
      fromAddress: mailer.fromAddress,
      smtpHost: mailer.smtpHost,
      smtpPort: mailer.smtpPort,
      smtpSecure: mailer.smtpSecure,
      digestScheduleLabel: formatDigestScheduleLabel(),
      digestHour: digestConfig.hour,
      digestTimeZone: digestConfig.timeZone,
      cronSecretConfigured: Boolean(digestConfig.cronSecret),
      tursoConfigured: Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN),
    },
    lists: {
      topDestinations,
      topTags,
      topOrigins,
      waitlistSources,
      eventTypes,
      alertChannels,
      alertPreferences,
      emailModes,
      emailKinds,
      topInteractedDeals: dealEventCounts,
      recentDeals,
      recentEvents,
      recentAlerts,
      recentEmailDeliveries,
      recentWaitlistIdentities,
    },
  };
}


