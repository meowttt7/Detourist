import { createAlert, getAllAlerts, getAlertsForProfile, getAlertById, promoteAlertsToEmail } from "@/lib/alert-store";
import { getAllDeals, getDealById } from "@/lib/deal-store";
import { getEmailDeliveryByAlertId, recordEmailDelivery } from "@/lib/email-delivery-store";
import { sendAlertEmail } from "@/lib/mailer";
import { getAllProfiles } from "@/lib/profile-store";
import { scoreDeal } from "@/lib/score";
import type { Deal, StoredTravelerProfile, UserRecord } from "@/lib/types";
import { getAllUsers } from "@/lib/user-store";

const MIN_ALERT_SCORE = 72;

function buildReasonSummary(reasons: string[]) {
  return reasons.slice(0, 2).join(" ");
}

function findLinkedUser(profileId: string, users: UserRecord[]) {
  const user = users.find((candidate) => candidate.profileId === profileId) ?? null;
  return {
    user,
    channel: user?.email ? "email" as const : "in_app" as const,
  };
}

function summarizeDeliveries(deliveries: Array<{ status: string; mode: string } | null>) {
  return deliveries.reduce(
    (summary, delivery) => {
      if (!delivery) {
        return summary;
      }

      if (delivery.mode === "smtp" && delivery.status === "sent") {
        summary.sent += 1;
      } else if (delivery.mode === "outbox" && delivery.status === "queued") {
        summary.queued += 1;
      } else if (delivery.status === "failed") {
        summary.failed += 1;
      }

      return summary;
    },
    { sent: 0, queued: 0, failed: 0 },
  );
}

function shouldSendInstantAlerts(user: UserRecord | null) {
  return Boolean(user?.email && user.alertPreference === "instant");
}

async function deliverAlertIfNeeded(deal: Deal, alert: Awaited<ReturnType<typeof createAlert>>, user: UserRecord | null) {
  if (alert.channel !== "email" || !shouldSendInstantAlerts(user) || !user?.email) {
    return null;
  }

  const delivery = await sendAlertEmail({
    alert,
    deal,
    recipientEmail: user.email,
  });

  return recordEmailDelivery({
    kind: "alert",
    referenceId: alert.id,
    userId: user.id,
    recipientEmail: user.email,
    subject: delivery.subject,
    mode: delivery.mode,
    status: delivery.status,
    errorMessage: delivery.errorMessage,
    sentAt: delivery.sentAt,
  });
}

async function buildAlertForProfile(deal: Deal, profile: StoredTravelerProfile, users: UserRecord[]) {
  if (profile.hiddenDealIds.includes(deal.id)) {
    return null;
  }

  const score = scoreDeal(deal, profile);
  if (score.score < MIN_ALERT_SCORE) {
    return null;
  }

  const linked = findLinkedUser(profile.id, users);
  const alert = await createAlert({
    dealId: deal.id,
    dealSlug: deal.slug,
    dealTitle: deal.title,
    profileId: profile.id,
    userId: linked.user?.id ?? null,
    score: score.score,
    matchLabel: score.matchLabel,
    reasonSummary: buildReasonSummary(score.reasons),
    channel: linked.channel,
  });

  const delivery = await deliverAlertIfNeeded(deal, alert, linked.user);

  return {
    alert,
    delivery,
  };
}

async function sendPendingInstantAlertsForProfile(profileId: string, user: UserRecord) {
  if (!shouldSendInstantAlerts(user) || !user.email) {
    return { alertsUpdated: 0, deliveries: { sent: 0, queued: 0, failed: 0 } };
  }

  const [alerts, deals] = await Promise.all([
    getAlertsForProfile(profileId),
    getAllDeals(),
  ]);

  const dealMap = new Map(deals.map((deal) => [deal.id, deal]));
  const deliveries = [];
  let alertsUpdated = 0;

  for (const alert of alerts) {
    if (alert.status !== "new" || alert.channel !== "email" || alert.digestDeliveryId) {
      continue;
    }

    const existingDelivery = await getEmailDeliveryByAlertId(alert.id);
    if (existingDelivery) {
      continue;
    }

    const deal = dealMap.get(alert.dealId);
    if (!deal) {
      continue;
    }

    const delivery = await sendAlertEmail({
      alert,
      deal,
      recipientEmail: user.email,
    });

    const recorded = await recordEmailDelivery({
      kind: "alert",
      referenceId: alert.id,
      userId: user.id,
      recipientEmail: user.email,
      subject: delivery.subject,
      mode: delivery.mode,
      status: delivery.status,
      errorMessage: delivery.errorMessage,
      sentAt: delivery.sentAt,
    });

    deliveries.push(recorded);
    alertsUpdated += 1;
  }

  return {
    alertsUpdated,
    deliveries: summarizeDeliveries(deliveries),
  };
}

export async function generateAlertsForDeal(deal: Deal) {
  const [profiles, users] = await Promise.all([getAllProfiles(), getAllUsers()]);
  const createdAlerts = [];
  const deliveries = [];

  for (const profile of profiles) {
    const result = await buildAlertForProfile(deal, profile, users);
    if (!result) {
      continue;
    }

    createdAlerts.push(result.alert);
    deliveries.push(result.delivery);
  }

  return {
    alerts: createdAlerts,
    deliveries: summarizeDeliveries(deliveries),
  };
}

export async function backfillAlerts() {
  const [deals, profiles, users, existingAlerts] = await Promise.all([
    getAllDeals(),
    getAllProfiles(),
    getAllUsers(),
    getAllAlerts(),
  ]);

  const existingKeys = new Set(existingAlerts.map((alert) => `${alert.profileId}:${alert.dealId}`));
  let createdCount = 0;
  const deliveries = [];

  for (const deal of deals) {
    for (const profile of profiles) {
      const key = `${profile.id}:${deal.id}`;
      if (existingKeys.has(key)) {
        continue;
      }

      const result = await buildAlertForProfile(deal, profile, users);
      if (!result) {
        continue;
      }

      existingKeys.add(key);
      createdCount += 1;
      deliveries.push(result.delivery);
    }
  }

  return {
    createdCount,
    deliveries: summarizeDeliveries(deliveries),
  };
}

export async function enableEmailAlertsForProfile(profileId: string, user: UserRecord) {
  if (!user.email) {
    return {
      alertsUpdated: 0,
      deliveries: { sent: 0, queued: 0, failed: 0 },
    };
  }

  await promoteAlertsToEmail(profileId, user.id);
  return sendPendingInstantAlertsForProfile(profileId, user);
}

export async function applyAlertPreferenceForProfile(profileId: string, user: UserRecord) {
  return sendPendingInstantAlertsForProfile(profileId, user);
}

export async function retryAlertDelivery(alertId: string) {
  const alert = await getAlertById(alertId);
  if (!alert || !alert.userId) {
    return null;
  }

  const [deal, users] = await Promise.all([
    getDealById(alert.dealId),
    getAllUsers(),
  ]);
  const user = users.find((candidate) => candidate.id === alert.userId) ?? null;

  if (!deal || !user?.email) {
    return null;
  }

  const delivery = await sendAlertEmail({
    alert,
    deal,
    recipientEmail: user.email,
  });

  return recordEmailDelivery({
    kind: "alert",
    referenceId: alert.id,
    userId: user.id,
    recipientEmail: user.email,
    subject: delivery.subject,
    mode: delivery.mode,
    status: delivery.status,
    errorMessage: delivery.errorMessage,
    sentAt: delivery.sentAt,
    incrementRetryCount: true,
  });
}
