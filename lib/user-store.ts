import crypto from "node:crypto";

import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { AlertNotificationPreference, UserRecord } from "@/lib/types";

type UpsertUserInput = {
  id?: string | null;
  email?: string | null;
  profileId?: string | null;
  waitlistStatus?: "joined" | "not_joined";
  waitlistSource?: string | null;
  alertPreference?: AlertNotificationPreference;
};

function mapUser(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    email: row.email ? String(row.email) : null,
    profileId: row.profile_id ? String(row.profile_id) : null,
    waitlistStatus: row.waitlist_status as UserRecord["waitlistStatus"],
    waitlistSources: JSON.parse(String(row.waitlist_sources_json)) as string[],
    alertPreference: (row.alert_preference ? String(row.alert_preference) : "instant") as AlertNotificationPreference,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getAllUsers() {
  const rows = await dbAll("SELECT * FROM users ORDER BY updated_at DESC");
  return rows.map(mapUser);
}

export async function getUserById(id: string) {
  const row = await dbGet("SELECT * FROM users WHERE id = ?", [id]);
  return row ? mapUser(row) : null;
}

export async function getUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const row = await dbGet("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
  return row ? mapUser(row) : null;
}

export async function getUserByProfileId(profileId: string) {
  const row = await dbGet("SELECT * FROM users WHERE profile_id = ?", [profileId]);
  return row ? mapUser(row) : null;
}

export async function upsertUser(input: UpsertUserInput) {
  const normalizedEmail = input.email?.trim().toLowerCase() ?? null;
  const now = new Date().toISOString();

  const existingRow =
    (input.id ? await dbGet("SELECT * FROM users WHERE id = ?", [input.id]) : null)
    ?? (normalizedEmail ? await dbGet("SELECT * FROM users WHERE email = ?", [normalizedEmail]) : null)
    ?? (input.profileId ? await dbGet("SELECT * FROM users WHERE profile_id = ?", [input.profileId]) : null);

  if (existingRow) {
    const existing = mapUser(existingRow);
    const nextSources = new Set(existing.waitlistSources);
    if (input.waitlistSource) {
      nextSources.add(input.waitlistSource);
    }

    const merged: UserRecord = {
      ...existing,
      email: normalizedEmail ?? existing.email,
      profileId: input.profileId ?? existing.profileId,
      waitlistStatus: input.waitlistStatus ?? existing.waitlistStatus,
      waitlistSources: Array.from(nextSources),
      alertPreference: input.alertPreference ?? existing.alertPreference,
      updatedAt: now,
    };

    await dbRun(
      `
        UPDATE users SET
          email = ?,
          profile_id = ?,
          waitlist_status = ?,
          waitlist_sources_json = ?,
          alert_preference = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        merged.email,
        merged.profileId,
        merged.waitlistStatus,
        JSON.stringify(merged.waitlistSources),
        merged.alertPreference,
        merged.updatedAt,
        merged.id,
      ],
    );

    return merged;
  }

  const created: UserRecord = {
    id: input.id ?? crypto.randomUUID(),
    email: normalizedEmail,
    profileId: input.profileId ?? null,
    waitlistStatus: input.waitlistStatus ?? (normalizedEmail ? "joined" : "not_joined"),
    waitlistSources: input.waitlistSource ? [input.waitlistSource] : [],
    alertPreference: input.alertPreference ?? "instant",
    createdAt: now,
    updatedAt: now,
  };

  await dbRun(
    `
      INSERT INTO users (
        id, email, profile_id, waitlist_status, waitlist_sources_json, alert_preference, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      created.id,
      created.email,
      created.profileId,
      created.waitlistStatus,
      JSON.stringify(created.waitlistSources),
      created.alertPreference,
      created.createdAt,
      created.updatedAt,
    ],
  );

  return created;
}
