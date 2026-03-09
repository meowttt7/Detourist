import crypto from "node:crypto";

import { dbAll, dbRun } from "@/lib/db";
import type { DealEvent, DealEventType } from "@/lib/types";

type NewDealEvent = {
  type: DealEventType;
  dealId: string;
  dealSlug?: string;
  userId: string | null;
  profileId: string | null;
  surface: string;
};

function mapEvent(row: Record<string, unknown>): DealEvent {
  return {
    id: String(row.id),
    type: row.type as DealEventType,
    dealId: String(row.deal_id),
    dealSlug: row.deal_slug ? String(row.deal_slug) : undefined,
    userId: row.user_id ? String(row.user_id) : null,
    profileId: row.profile_id ? String(row.profile_id) : null,
    surface: String(row.surface),
    createdAt: String(row.created_at),
  };
}

export async function getAllEvents() {
  const rows = await dbAll("SELECT * FROM events ORDER BY created_at DESC");
  return rows.map(mapEvent);
}

export async function addDealEvent(input: NewDealEvent) {
  const nextEvent: DealEvent = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
  };

  await dbRun(
    `
      INSERT INTO events (
        id, type, deal_id, deal_slug, user_id, profile_id, surface, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      nextEvent.id,
      nextEvent.type,
      nextEvent.dealId,
      nextEvent.dealSlug ?? null,
      nextEvent.userId,
      nextEvent.profileId,
      nextEvent.surface,
      nextEvent.createdAt,
    ],
  );

  return nextEvent;
}
