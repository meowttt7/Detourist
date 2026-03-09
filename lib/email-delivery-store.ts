import crypto from "node:crypto";

import { getDb } from "@/lib/db";
import type { EmailDelivery, EmailDeliveryKind, EmailDeliveryMetadata, EmailDeliveryMode, EmailDeliveryStatus } from "@/lib/types";

type RecordEmailDeliveryInput = {
  id?: string;
  kind: EmailDeliveryKind;
  referenceId: string;
  userId: string | null;
  recipientEmail: string;
  subject: string;
  mode: EmailDeliveryMode;
  status: EmailDeliveryStatus;
  metadata?: EmailDeliveryMetadata;
  errorMessage?: string | null;
  sentAt?: string | null;
  incrementRetryCount?: boolean;
};

function mapDelivery(row: Record<string, unknown>): EmailDelivery {
  return {
    id: String(row.id),
    kind: (row.kind ? String(row.kind) : "alert") as EmailDeliveryKind,
    referenceId: String(row.alert_id),
    userId: row.user_id ? String(row.user_id) : null,
    recipientEmail: String(row.recipient_email),
    subject: String(row.subject),
    mode: row.mode as EmailDeliveryMode,
    status: row.status as EmailDeliveryStatus,
    retryCount: Number(row.retry_count ?? 0),
    metadata: row.metadata_json ? JSON.parse(String(row.metadata_json)) as EmailDeliveryMetadata : {},
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: String(row.created_at),
    sentAt: row.sent_at ? String(row.sent_at) : null,
  };
}

export async function getAllEmailDeliveries() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM email_deliveries ORDER BY created_at DESC").all() as Record<string, unknown>[];
  return rows.map(mapDelivery);
}

export async function getEmailDeliveryById(id: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM email_deliveries WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? mapDelivery(row) : null;
}

export async function getEmailDeliveryByReference(kind: EmailDeliveryKind, referenceId: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM email_deliveries WHERE kind = ? AND alert_id = ?").get(kind, referenceId) as Record<string, unknown> | undefined;
  return row ? mapDelivery(row) : null;
}

export async function getEmailDeliveriesByReferences(kind: EmailDeliveryKind, referenceIds: string[]) {
  if (!referenceIds.length) {
    return [];
  }

  const db = getDb();
  const placeholders = referenceIds.map(() => "?").join(", ");
  const rows = db.prepare(`
    SELECT * FROM email_deliveries
    WHERE kind = ?
      AND alert_id IN (${placeholders})
  `).all(kind, ...referenceIds) as Record<string, unknown>[];
  return rows.map(mapDelivery);
}

export async function getEmailDeliveryByAlertId(alertId: string) {
  return getEmailDeliveryByReference("alert", alertId);
}

export async function getLatestEmailDeliveryForUserAndKind(userId: string, kind: EmailDeliveryKind) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM email_deliveries WHERE user_id = ? AND kind = ? ORDER BY created_at DESC LIMIT 1").get(userId, kind) as Record<string, unknown> | undefined;
  return row ? mapDelivery(row) : null;
}

export async function getLatestNonFailedEmailDeliveryForUserAndKind(userId: string, kind: EmailDeliveryKind) {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM email_deliveries
    WHERE user_id = ?
      AND kind = ?
      AND status != 'failed'
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId, kind) as Record<string, unknown> | undefined;
  return row ? mapDelivery(row) : null;
}

export async function recordEmailDelivery(input: RecordEmailDeliveryInput) {
  const db = getDb();
  const existingRow = input.id
    ? db.prepare("SELECT * FROM email_deliveries WHERE id = ?").get(input.id) as Record<string, unknown> | undefined
    : db.prepare("SELECT * FROM email_deliveries WHERE kind = ? AND alert_id = ?").get(input.kind, input.referenceId) as Record<string, unknown> | undefined;
  const now = new Date().toISOString();

  if (existingRow) {
    const existing = mapDelivery(existingRow);
    const nextRetryCount = existing.retryCount + (input.incrementRetryCount ? 1 : 0);

    db.prepare(`
      UPDATE email_deliveries SET
        alert_id = ?,
        kind = ?,
        user_id = ?,
        recipient_email = ?,
        subject = ?,
        mode = ?,
        status = ?,
        retry_count = ?,
        metadata_json = ?,
        error_message = ?,
        sent_at = ?
      WHERE id = ?
    `).run(
      input.referenceId,
      input.kind,
      input.userId,
      input.recipientEmail,
      input.subject,
      input.mode,
      input.status,
      nextRetryCount,
      JSON.stringify(input.metadata ?? existing.metadata ?? {}),
      input.errorMessage ?? null,
      input.sentAt ?? null,
      existing.id,
    );

    const updated = db.prepare("SELECT * FROM email_deliveries WHERE id = ?").get(existing.id) as Record<string, unknown>;
    return mapDelivery(updated);
  }

  db.prepare(`
    INSERT INTO email_deliveries (
      id, alert_id, kind, user_id, recipient_email, subject, mode, status,
      retry_count, metadata_json, error_message, created_at, sent_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    input.referenceId,
    input.kind,
    input.userId,
    input.recipientEmail,
    input.subject,
    input.mode,
    input.status,
    0,
    JSON.stringify(input.metadata ?? {}),
    input.errorMessage ?? null,
    now,
    input.sentAt ?? null,
  );

  const created = db.prepare("SELECT * FROM email_deliveries WHERE kind = ? AND alert_id = ?").get(input.kind, input.referenceId) as Record<string, unknown>;
  return mapDelivery(created);
}
