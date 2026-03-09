import crypto from "node:crypto";

import { getDb } from "@/lib/db";
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
  channel: AlertChannel;
};

function mapAlert(row: Record<string, unknown>): DealAlert {
  return {
    id: String(row.id),
    dealId: String(row.deal_id),
    dealSlug: String(row.deal_slug),
    dealTitle: String(row.deal_title),
    profileId: String(row.profile_id),
    userId: row.user_id ? String(row.user_id) : null,
    score: Number(row.score),
    matchLabel: String(row.match_label),
    reasonSummary: String(row.reason_summary),
    channel: row.channel as AlertChannel,
    status: row.status as AlertStatus,
    digestDeliveryId: row.digest_delivery_id ? String(row.digest_delivery_id) : null,
    digestedAt: row.digested_at ? String(row.digested_at) : null,
    createdAt: String(row.created_at),
    viewedAt: row.viewed_at ? String(row.viewed_at) : null,
  };
}

export async function getAllAlerts() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM alerts ORDER BY created_at DESC").all() as Record<string, unknown>[];
  return rows.map(mapAlert);
}

export async function getAlertById(id: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM alerts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? mapAlert(row) : null;
}

export async function getAlertsByIds(ids: string[]) {
  if (!ids.length) {
    return [];
  }

  const db = getDb();
  const placeholders = ids.map(() => "?").join(", ");
  const rows = db.prepare(`SELECT * FROM alerts WHERE id IN (${placeholders}) ORDER BY created_at DESC`).all(...ids) as Record<string, unknown>[];
  const alertMap = new Map(rows.map((row) => {
    const alert = mapAlert(row);
    return [alert.id, alert] as const;
  }));

  return ids.map((id) => alertMap.get(id)).filter((alert): alert is DealAlert => Boolean(alert));
}

export async function getAlertsForProfile(profileId: string) {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM alerts WHERE profile_id = ? ORDER BY created_at DESC").all(profileId) as Record<string, unknown>[];
  return rows.map(mapAlert);
}

export async function getPendingDigestAlertsForUser(userId: string, profileId: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM alerts
    WHERE user_id = ?
      AND profile_id = ?
      AND channel = 'email'
      AND status = 'new'
      AND digest_delivery_id IS NULL
    ORDER BY created_at DESC
  `).all(userId, profileId) as Record<string, unknown>[];
  return rows.map(mapAlert);
}

export async function getAlertsForUser(userId: string) {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC").all(userId) as Record<string, unknown>[];
  return rows.map(mapAlert);
}

export async function createAlert(input: CreateAlertInput) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM alerts WHERE profile_id = ? AND deal_id = ?").get(input.profileId, input.dealId) as Record<string, unknown> | undefined;
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
    channel: input.channel,
    status: "new",
    digestDeliveryId: null,
    digestedAt: null,
    createdAt: now,
    viewedAt: null,
  };

  db.prepare(`
    INSERT INTO alerts (
      id, deal_id, deal_slug, deal_title, profile_id, user_id, score,
      match_label, reason_summary, channel, status, digest_delivery_id, digested_at, created_at, viewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    alert.id,
    alert.dealId,
    alert.dealSlug,
    alert.dealTitle,
    alert.profileId,
    alert.userId,
    alert.score,
    alert.matchLabel,
    alert.reasonSummary,
    alert.channel,
    alert.status,
    alert.digestDeliveryId,
    alert.digestedAt,
    alert.createdAt,
    alert.viewedAt,
  );

  return alert;
}

export async function markAlertViewed(alertId: string, profileId: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM alerts WHERE id = ? AND profile_id = ?").get(alertId, profileId) as Record<string, unknown> | undefined;
  if (!row) {
    return null;
  }

  if (row.status === "viewed") {
    return mapAlert(row);
  }

  const viewedAt = new Date().toISOString();
  db.prepare("UPDATE alerts SET status = 'viewed', viewed_at = ? WHERE id = ?").run(viewedAt, alertId);

  const updated = db.prepare("SELECT * FROM alerts WHERE id = ?").get(alertId) as Record<string, unknown>;
  return mapAlert(updated);
}

export async function markAlertsDigested(alertIds: string[], digestDeliveryId: string) {
  if (!alertIds.length) {
    return [];
  }

  const db = getDb();
  const digestedAt = new Date().toISOString();
  const placeholders = alertIds.map(() => "?").join(", ");
  db.prepare(`
    UPDATE alerts
    SET digest_delivery_id = ?, digested_at = ?
    WHERE id IN (${placeholders})
  `).run(digestDeliveryId, digestedAt, ...alertIds);

  const rows = db.prepare(`SELECT * FROM alerts WHERE id IN (${placeholders}) ORDER BY created_at DESC`).all(...alertIds) as Record<string, unknown>[];
  return rows.map(mapAlert);
}

export async function promoteAlertsToEmail(profileId: string, userId: string) {
  const db = getDb();
  db.prepare("UPDATE alerts SET user_id = ?, channel = 'email' WHERE profile_id = ?").run(userId, profileId);
  const rows = db.prepare("SELECT * FROM alerts WHERE profile_id = ? ORDER BY created_at DESC").all(profileId) as Record<string, unknown>[];
  return rows.map(mapAlert);
}
