import crypto from "node:crypto";

import { dbAll, dbGet, dbRun } from "@/lib/db";
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
  const rows = await dbAll("SELECT * FROM email_deliveries ORDER BY created_at DESC");
  return rows.map(mapDelivery);
}

export async function getEmailDeliveryById(id: string) {
  const row = await dbGet("SELECT * FROM email_deliveries WHERE id = ?", [id]);
  return row ? mapDelivery(row) : null;
}

export async function getEmailDeliveryByReference(kind: EmailDeliveryKind, referenceId: string) {
  const row = await dbGet("SELECT * FROM email_deliveries WHERE kind = ? AND alert_id = ?", [kind, referenceId]);
  return row ? mapDelivery(row) : null;
}

export async function getEmailDeliveriesByReferences(kind: EmailDeliveryKind, referenceIds: string[]) {
  if (!referenceIds.length) {
    return [];
  }

  const placeholders = referenceIds.map(() => "?").join(", ");
  const rows = await dbAll(
    `
      SELECT * FROM email_deliveries
      WHERE kind = ?
        AND alert_id IN (${placeholders})
    `,
    [kind, ...referenceIds],
  );
  return rows.map(mapDelivery);
}

export async function getEmailDeliveryByAlertId(alertId: string) {
  return getEmailDeliveryByReference("alert", alertId);
}

export async function getLatestEmailDeliveryForUserAndKind(userId: string, kind: EmailDeliveryKind) {
  const row = await dbGet("SELECT * FROM email_deliveries WHERE user_id = ? AND kind = ? ORDER BY created_at DESC LIMIT 1", [userId, kind]);
  return row ? mapDelivery(row) : null;
}

export async function getLatestNonFailedEmailDeliveryForUserAndKind(userId: string, kind: EmailDeliveryKind) {
  const row = await dbGet(
    `
      SELECT * FROM email_deliveries
      WHERE user_id = ?
        AND kind = ?
        AND status != 'failed'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId, kind],
  );
  return row ? mapDelivery(row) : null;
}

export async function recordEmailDelivery(input: RecordEmailDeliveryInput): Promise<EmailDelivery> {
  const existingRow = input.id
    ? await dbGet("SELECT * FROM email_deliveries WHERE id = ?", [input.id])
    : await dbGet("SELECT * FROM email_deliveries WHERE kind = ? AND alert_id = ?", [input.kind, input.referenceId]);
  const now = new Date().toISOString();

  if (existingRow) {
    const existing = mapDelivery(existingRow);
    const nextRetryCount = existing.retryCount + (input.incrementRetryCount ? 1 : 0);

    await dbRun(
      `
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
      `,
      [
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
      ],
    );

    const updated = await dbGet("SELECT * FROM email_deliveries WHERE id = ?", [existing.id]);
    if (!updated) {
      throw new Error(`Email delivery ${existing.id} disappeared after update.`);
    }

    return mapDelivery(updated);
  }

  await dbRun(
    `
      INSERT INTO email_deliveries (
        id, alert_id, kind, user_id, recipient_email, subject, mode, status,
        retry_count, metadata_json, error_message, created_at, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
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
    ],
  );

  const created = await dbGet("SELECT * FROM email_deliveries WHERE kind = ? AND alert_id = ?", [input.kind, input.referenceId]);
  if (!created) {
    throw new Error(`Email delivery ${input.kind}:${input.referenceId} was not readable after insert.`);
  }

  return mapDelivery(created);
}
