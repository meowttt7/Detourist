import crypto from "node:crypto";

import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { StoredTravelerProfile, TravelerProfile } from "@/lib/types";

type ProfileUpdate = Partial<TravelerProfile> & {
  savedDealIds?: string[];
  hiddenDealIds?: string[];
};

function defaultTravelerProfile(): TravelerProfile {
  return {
    homeAirports: ["SIN"],
    repositionRegions: ["Southeast Asia"],
    preferredCabins: ["Business", "First"],
    maxStops: 1,
    allowOvernight: true,
    maxTravelPain: 7,
    destinationInterests: ["Europe", "Japan"],
    budgetMax: 2500,
    tripStyles: ["Flexible luxury"],
  };
}

function mapProfile(row: Record<string, unknown>): StoredTravelerProfile {
  return {
    id: String(row.id),
    homeAirports: JSON.parse(String(row.home_airports_json)) as string[],
    repositionRegions: JSON.parse(String(row.reposition_regions_json)) as string[],
    preferredCabins: JSON.parse(String(row.preferred_cabins_json)) as string[],
    maxStops: Number(row.max_stops),
    allowOvernight: Boolean(row.allow_overnight),
    maxTravelPain: Number(row.max_travel_pain),
    destinationInterests: JSON.parse(String(row.destination_interests_json)) as string[],
    budgetMax: Number(row.budget_max),
    tripStyles: JSON.parse(String(row.trip_styles_json)) as string[],
    savedDealIds: JSON.parse(String(row.saved_deal_ids_json)) as string[],
    hiddenDealIds: JSON.parse(String(row.hidden_deal_ids_json)) as string[],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getAllProfiles() {
  const rows = await dbAll("SELECT * FROM profiles ORDER BY updated_at DESC");
  return rows.map(mapProfile);
}

export async function getProfileById(id: string) {
  const row = await dbGet("SELECT * FROM profiles WHERE id = ?", [id]);
  return row ? mapProfile(row) : null;
}

export async function upsertProfile(id: string | null, update: ProfileUpdate = {}) {
  const now = new Date().toISOString();
  const nextId = id ?? crypto.randomUUID();
  const existingRow = await dbGet("SELECT * FROM profiles WHERE id = ?", [nextId]);

  if (existingRow) {
    const existing = mapProfile(existingRow);
    const merged: StoredTravelerProfile = {
      ...existing,
      ...update,
      savedDealIds: update.savedDealIds ?? existing.savedDealIds,
      hiddenDealIds: update.hiddenDealIds ?? existing.hiddenDealIds,
      updatedAt: now,
    };

    await dbRun(
      `
        UPDATE profiles SET
          home_airports_json = ?,
          reposition_regions_json = ?,
          preferred_cabins_json = ?,
          max_stops = ?,
          allow_overnight = ?,
          max_travel_pain = ?,
          destination_interests_json = ?,
          budget_max = ?,
          trip_styles_json = ?,
          saved_deal_ids_json = ?,
          hidden_deal_ids_json = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        JSON.stringify(merged.homeAirports),
        JSON.stringify(merged.repositionRegions),
        JSON.stringify(merged.preferredCabins),
        merged.maxStops,
        merged.allowOvernight ? 1 : 0,
        merged.maxTravelPain,
        JSON.stringify(merged.destinationInterests),
        merged.budgetMax,
        JSON.stringify(merged.tripStyles),
        JSON.stringify(merged.savedDealIds),
        JSON.stringify(merged.hiddenDealIds),
        merged.updatedAt,
        merged.id,
      ],
    );

    return merged;
  }

  const defaults = defaultTravelerProfile();
  const created: StoredTravelerProfile = {
    id: nextId,
    ...defaults,
    ...update,
    savedDealIds: update.savedDealIds ?? [],
    hiddenDealIds: update.hiddenDealIds ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await dbRun(
    `
      INSERT INTO profiles (
        id, home_airports_json, reposition_regions_json, preferred_cabins_json,
        max_stops, allow_overnight, max_travel_pain, destination_interests_json,
        budget_max, trip_styles_json, saved_deal_ids_json, hidden_deal_ids_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      created.id,
      JSON.stringify(created.homeAirports),
      JSON.stringify(created.repositionRegions),
      JSON.stringify(created.preferredCabins),
      created.maxStops,
      created.allowOvernight ? 1 : 0,
      created.maxTravelPain,
      JSON.stringify(created.destinationInterests),
      created.budgetMax,
      JSON.stringify(created.tripStyles),
      JSON.stringify(created.savedDealIds),
      JSON.stringify(created.hiddenDealIds),
      created.createdAt,
      created.updatedAt,
    ],
  );

  return created;
}
