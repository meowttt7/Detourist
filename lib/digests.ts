import crypto from "node:crypto";

import { getAlertsByIds, getPendingDigestAlertsForUser, markAlertsDigested } from "@/lib/alert-store";
import { formatDigestScheduleLabel } from "@/lib/digest-config";
import { getDealById } from "@/lib/deal-store";
import { getEmailDeliveriesByReferences, getEmailDeliveryById, getLatestNonFailedEmailDeliveryForUserAndKind, recordEmailDelivery } from "@/lib/email-delivery-store";
import { sendDigestEmail } from "@/lib/mailer";
import { getLocalScheduleDateKey, isSameScheduledDay, isScheduleWindowOpen } from "@/lib/scheduled-jobs";
import type { Deal, DealAlert, UserRecord } from "@/lib/types";
import { getAllUsers } from "@/lib/user-store";

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

function canReceiveDailyDigest(user: UserRecord) {
  return Boolean(user.email && user.profileId && user.alertPreference === "daily_digest");
}

async function buildDigestPayload(alerts: DealAlert[]): Promise<Array<{ alert: DealAlert; deal: Deal }>> {
  if (!alerts.length) {
    return [];
  }

  const uniqueDealIds = Array.from(new Set(alerts.map((alert) => alert.dealId)));
  const deals = (await Promise.all(uniqueDealIds.map((dealId) => getDealById(dealId)))).filter((deal): deal is Deal => Boolean(deal));
  const dealMap = new Map(deals.map((deal) => [deal.id, deal]));

  return alerts
    .map((alert) => {
      const deal = dealMap.get(alert.dealId);
      if (!deal) {
        return null;
      }

      return { alert, deal };
    })
    .filter((entry): entry is { alert: DealAlert; deal: Deal } => Boolean(entry));
}

async function getDigestEligibleAlertsForUser(user: UserRecord) {
  if (!user.profileId) {
    return [];
  }

  const alerts = await getPendingDigestAlertsForUser(user.id, user.profileId);
  if (!alerts.length) {
    return [];
  }

  const existingInstantDeliveries = await getEmailDeliveriesByReferences("alert", alerts.map((alert) => alert.id));
  const deliveredAlertIds = new Set(existingInstantDeliveries.map((delivery) => delivery.referenceId));
  return alerts.filter((alert) => !deliveredAlertIds.has(alert.id));
}

async function shouldSendDigestNow(user: UserRecord, now: Date, force: boolean) {
  if (force) {
    return true;
  }

  if (!isScheduleWindowOpen(now)) {
    return false;
  }

  const latestDelivery = await getLatestNonFailedEmailDeliveryForUserAndKind(user.id, "digest");
  if (!latestDelivery) {
    return true;
  }

  return !isSameScheduledDay(latestDelivery.createdAt, now);
}

export async function getPendingDailyDigestCount(user: UserRecord | null) {
  if (!user) {
    return 0;
  }

  const alerts = await getDigestEligibleAlertsForUser(user);
  return alerts.length;
}

export async function previewDailyDigests(options?: { force?: boolean; now?: Date }) {
  const users = await getAllUsers();
  const now = options?.now ?? new Date();
  const force = options?.force ?? true;
  let eligibleUsers = 0;
  let usersWithPendingAlerts = 0;
  let usersReadyToSend = 0;
  let pendingAlertCount = 0;
  let skippedForCadence = 0;
  let skippedForWindow = 0;

  for (const user of users) {
    if (!canReceiveDailyDigest(user)) {
      continue;
    }

    eligibleUsers += 1;
    const alerts = await getDigestEligibleAlertsForUser(user);
    if (!alerts.length) {
      continue;
    }

    usersWithPendingAlerts += 1;
    pendingAlertCount += alerts.length;

    const canSendNow = await shouldSendDigestNow(user, now, force);
    if (canSendNow) {
      usersReadyToSend += 1;
      continue;
    }

    if (!force && !isScheduleWindowOpen(now)) {
      skippedForWindow += 1;
    } else {
      skippedForCadence += 1;
    }
  }

  return {
    force,
    scheduleDate: getLocalScheduleDateKey(now),
    scheduleLabel: formatDigestScheduleLabel(),
    eligibleUsers,
    usersWithPendingAlerts,
    usersReadyToSend,
    pendingAlertCount,
    skippedForCadence,
    skippedForWindow,
  };
}

export async function runDailyDigestForUser(user: UserRecord, options?: { force?: boolean; now?: Date }) {
  if (!canReceiveDailyDigest(user) || !user.email || !user.profileId) {
    return null;
  }

  const now = options?.now ?? new Date();
  const force = options?.force ?? false;
  if (!(await shouldSendDigestNow(user, now, force))) {
    return null;
  }

  const alerts = await getDigestEligibleAlertsForUser(user);
  if (!alerts.length) {
    return null;
  }

  const digestEntries = await buildDigestPayload(alerts);
  if (!digestEntries.length) {
    return null;
  }

  const digestId = crypto.randomUUID();
  const delivery = await sendDigestEmail({
    recipientEmail: user.email,
    alerts: digestEntries,
  }, digestId);

  const recorded = await recordEmailDelivery({
    kind: "digest",
    referenceId: digestId,
    userId: user.id,
    recipientEmail: user.email,
    subject: delivery.subject,
    mode: delivery.mode,
    status: delivery.status,
    errorMessage: delivery.errorMessage,
    sentAt: delivery.sentAt,
    metadata: {
      profileId: user.profileId,
      alertIds: digestEntries.map((entry) => entry.alert.id),
      alertCount: digestEntries.length,
    },
  });

  if (delivery.status !== "failed") {
    await markAlertsDigested(digestEntries.map((entry) => entry.alert.id), digestId);
  }

  return recorded;
}

export async function runDailyDigests(options?: { force?: boolean; now?: Date }) {
  const users = await getAllUsers();
  const now = options?.now ?? new Date();
  const force = options?.force ?? false;
  const deliveries = [];
  let usersProcessed = 0;
  let eligibleUsers = 0;
  let skippedForCadence = 0;
  let skippedForWindow = 0;

  for (const user of users) {
    if (!canReceiveDailyDigest(user)) {
      continue;
    }

    eligibleUsers += 1;
    const canSendNow = await shouldSendDigestNow(user, now, force);
    if (!canSendNow) {
      if (!force && !isScheduleWindowOpen(now)) {
        skippedForWindow += 1;
      } else {
        skippedForCadence += 1;
      }
      continue;
    }

    const delivery = await runDailyDigestForUser(user, { force: true, now });
    if (!delivery) {
      continue;
    }

    usersProcessed += 1;
    deliveries.push(delivery);
  }

  return {
    force,
    scheduleDate: getLocalScheduleDateKey(now),
    scheduleLabel: formatDigestScheduleLabel(),
    eligibleUsers,
    usersProcessed,
    digestsCreated: deliveries.length,
    skippedForCadence,
    skippedForWindow,
    deliveries: summarizeDeliveries(deliveries),
  };
}

export async function retryDigestDelivery(deliveryId: string) {
  const delivery = await getEmailDeliveryById(deliveryId);
  if (!delivery || delivery.kind !== "digest" || !delivery.userId) {
    return null;
  }

  const users = await getAllUsers();
  const user = users.find((candidate) => candidate.id === delivery.userId) ?? null;
  const alertIds = delivery.metadata.alertIds ?? [];

  if (!user?.email || !alertIds.length) {
    return null;
  }

  const alerts = await getAlertsByIds(alertIds);
  if (!alerts.length) {
    return null;
  }

  const digestEntries = await buildDigestPayload(alerts);
  if (!digestEntries.length) {
    return null;
  }

  const resent = await sendDigestEmail({
    recipientEmail: user.email,
    alerts: digestEntries,
  }, delivery.referenceId);

  const recorded = await recordEmailDelivery({
    id: delivery.id,
    kind: "digest",
    referenceId: delivery.referenceId,
    userId: user.id,
    recipientEmail: user.email,
    subject: resent.subject,
    mode: resent.mode,
    status: resent.status,
    errorMessage: resent.errorMessage,
    sentAt: resent.sentAt,
    incrementRetryCount: true,
    metadata: {
      profileId: delivery.metadata.profileId ?? user.profileId ?? null,
      alertIds,
      alertCount: alertIds.length,
    },
  });

  if (resent.status !== "failed") {
    await markAlertsDigested(alertIds, delivery.referenceId);
  }

  return recorded;
}
