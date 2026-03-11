import crypto from "node:crypto";

import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { AlertChannel, AlertStatus, DealAlert } from "@/lib/types";

type CreateAlertInput = {
  dealId: string;
  dealSlug: string;
  dealTitle: string;
  profileId: string;
  userId: string | null;
  score: number;
  matchLabel: string;
  reasonSummary: string;
  reasons: string[];
  warnings: string[];
  channel: AlertChannel;
};

function mapAlert(row: Record<string, unknown>): DealAlert {
  const parsedReasons = row.reasons_json ? JSON.parse(String(row.reasons_json)) as string[] : [];
  const parsedWarnings = row.warnings_json ? JSON.parse(String(row.warnings_json)) as string[] : [];
  const reasonSummary = String(row.reason_summary);

  return {
    id: String(row.id),
    dealId: String(row.deal_id),
    dealSlug: String(row.deal_slug),
    dealTitle: String(row.deal_title),
    profileId: String(row.profile_id),
    userId: row.user_id ? String(row.user_id) : null,
    score: Number(row.score),
    matchLabel: String(row.match_label),
    reasonSummary,
    reasons: parsedReasons.length ? parsedReasons : [reasonSummary],
    warnings: parsedWarnings,
    channel: row.channel as AlertChannel,
    status: row.status as AlertStatus,
    digestDeliveryId: row.digest_delivery_id ? String(row.digest_delivery_id) : null,
    digestedAt: row.digested_at ? String(row.digested_at) : null,
    createdAt: String(row.created_at),
    viewedAt: row.viewed_at ? String(row.viewed_at) : null,
  };
}

export async function getAllAlerts() {
  const rows = await dbAll("SELECT * FROM alerts ORDER BY created_at DESC");
  return rows.map(mapAlert);
}

export async function getAlertById(id: string) {
  const row = await dbGet("SELECT * FROM alerts WHERE id = ?", [id]);
  return row ? mapAlert(row) : null;
}

export async function getAlertsByIds(ids: string[]) {
  if (!ids.length) {
    return [];
  }

  const placeholders = ids.map(() => "?").join(", ");
  const rows = await dbAll(`SELECT * FROM alerts WHERE id IN (${placeholders}) ORDER BY created_at DESC`, ids);
  const alertMap = new Map(rows.map((row) => {
    const alert = mapAlert(row);
    return [alert.id, alert] as const;
  }));

  return ids.map((id) => alertMap.get(id)).filter((alert): alert is DealAlert => Boolean(alert));
}

export async function getAlertsForProfile(profileId: string) {
  const rows = await dbAll("SELECT * FROM alerts WHERE profile_id = ? ORDER BY created_at DESC", [profileId]);
  return rows.map(mapAlert);
}

export async function getPendingDigestAlertsForUser(userId: string, profileId: string) {
  const rows = await dbAll(
    `
      SELECT * FROM alerts
      WHERE user_id = ?
        AND profile_id = ?
        AND channel = 'email'
        AND status = 'new'
        AND digest_delivery_id IS NULL
      ORDER BY created_at DESC
    `,
    [userId, profileId],
  );
  return rows.map(mapAlert);
}

export async function getAlertsForUser(userId: string) {
  const rows = await dbAll("SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC", [userId]);
  return rows.map(mapAlert);
}

export async function createAlert(input: CreateAlertInput) {
  const existing = await dbGet("SELECT * FROM alerts WHERE profile_id = ? AND deal_id = ?", [input.profileId, input.dealId]);
  if (existing) {
    return mapAlert(existing);
  }

  const now = new Date().toISOString();
  const alert: DealAlert = {
    id: crypto.randomUUID(),
    dealId: input.dealId,
    dealSlug: input.dealSlug,
    dealTitle: input.dealTitle,
    profileId: input.profileId,
    userId: input.userId,
    score: input.score,
    matchLabel: input.matchLabel,
    reasonSummary: input.reasonSummary,
    reasons: input.reasons,
    warnings: input.warnings,
    channel: input.channel,
    status: "new",
    digestDeliveryId: null,
    digestedAt: null,
    createdAt: now,
    viewedAt: null,
  };

  await dbRun(
    `
      INSERT INTO alerts (
        id, deal_id, deal_slug, deal_title, profile_id, user_id, score,
        match_label, reason_summary, reasons_json, warnings_json, channel, status, digest_delivery_id, digested_at, created_at, viewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      alert.id,
      alert.dealId,
      alert.dealSlug,
      alert.dealTitle,
      alert.profileId,
      alert.userId,
      alert.score,
      alert.matchLabel,
      alert.reasonSummary,
      JSON.stringify(alert.reasons),
      JSON.stringify(alert.warnings),
      alert.channel,
      alert.status,
      alert.digestDeliveryId,
      alert.digestedAt,
      alert.createdAt,
      alert.viewedAt,
    ],
  );

  return alert;
}

export async function markAlertViewed(alertId: string, profileId: string) {
  const row = await dbGet("SELECT * FROM alerts WHERE id = ? AND profile_id = ?", [alertId, profileId]);
  if (!row) {
    return null;
  }

  if (row.status === "viewed") {
    return mapAlert(row);
  }

  const viewedAt = new Date().toISOString();
  await dbRun("UPDATE alerts SET status = 'viewed', viewed_at = ? WHERE id = ?", [viewedAt, alertId]);

  const updated = await dbGet("SELECT * FROM alerts WHERE id = ?", [alertId]);
  return updated ? mapAlert(updated) : null;
}

export async function markAlertsDigested(alertIds: string[], digestDeliveryId: string) {
  if (!alertIds.length) {
    return [];
  }

  const digestedAt = new Date().toISOString();
  const placeholders = alertIds.map(() => "?").join(", ");
  await dbRun(
    `
      UPDATE alerts
      SET digest_delivery_id = ?, digested_at = ?
      WHERE id IN (${placeholders})
    `,
    [digestDeliveryId, digestedAt, ...alertIds],
  );

  const rows = await dbAll(`SELECT * FROM alerts WHERE id IN (${placeholders}) ORDER BY created_at DESC`, alertIds);
  return rows.map(mapAlert);
}

export async function promoteAlertsToEmail(profileId: string, userId: string) {
  await dbRun("UPDATE alerts SET user_id = ?, channel = 'email' WHERE profile_id = ?", [userId, profileId]);
  const rows = await dbAll("SELECT * FROM alerts WHERE profile_id = ? ORDER BY created_at DESC", [profileId]);
  return rows.map(mapAlert);
}
