import crypto from "node:crypto";

import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { Deal } from "@/lib/types";

function mapDeal(row: Record<string, unknown>): Deal {
  return {
    id: String(row.id),
    slug: String(row.slug),
    type: row.type as Deal["type"],
    title: String(row.title),
    summary: String(row.summary),
    origin: String(row.origin),
    destination: String(row.destination),
    destinationRegion: String(row.destination_region),
    cabin: String(row.cabin),
    airlineOrBrand: String(row.airline_or_brand),
    currentPrice: Number(row.current_price),
    referencePrice: Number(row.reference_price),
    currency: String(row.currency),
    stops: Number(row.stops),
    totalDurationHours: Number(row.total_duration_hours),
    overnight: Boolean(row.overnight),
    repositionRequired: Boolean(row.reposition_required),
    repositionFrom: row.reposition_from ? String(row.reposition_from) : undefined,
    catchSummary: String(row.catch_summary),
    whyWorthIt: String(row.why_worth_it),
    bookingUrl: String(row.booking_url),
    publishedAt: String(row.published_at),
    expiresAt: String(row.expires_at),
    tags: JSON.parse(String(row.tags_json)) as string[],
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

export async function getAllDeals() {
  const rows = await dbAll("SELECT * FROM deals ORDER BY published_at DESC");
  return rows.map(mapDeal);
}

export async function getLiveDeals() {
  const rows = await dbAll("SELECT * FROM deals WHERE expires_at > ? ORDER BY published_at DESC", [new Date().toISOString()]);
  return rows.map(mapDeal);
}

export async function getDealById(id: string) {
  const row = await dbGet("SELECT * FROM deals WHERE id = ?", [id]);
  return row ? mapDeal(row) : null;
}

export async function getDealBySlug(slug: string) {
  const row = await dbGet("SELECT * FROM deals WHERE slug = ?", [slug]);
  return row ? mapDeal(row) : null;
}

export async function addDeal(input: Omit<Deal, "id" | "slug" | "publishedAt">) {
  const baseSlug = slugify(`${input.origin}-${input.destination}-${input.title}`);
  let slug = baseSlug;
  let suffix = 2;

  while (await dbGet("SELECT 1 FROM deals WHERE slug = ?", [slug])) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const nextDeal: Deal = {
    ...input,
    id: crypto.randomUUID(),
    slug,
    publishedAt: new Date().toISOString(),
  };

  await dbRun(
    `
      INSERT INTO deals (
        id, slug, type, title, summary, origin, destination, destination_region, cabin,
        airline_or_brand, current_price, reference_price, currency, stops,
        total_duration_hours, overnight, reposition_required, reposition_from,
        catch_summary, why_worth_it, booking_url, published_at, expires_at, tags_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      nextDeal.id,
      nextDeal.slug,
      nextDeal.type,
      nextDeal.title,
      nextDeal.summary,
      nextDeal.origin,
      nextDeal.destination,
      nextDeal.destinationRegion,
      nextDeal.cabin,
      nextDeal.airlineOrBrand,
      nextDeal.currentPrice,
      nextDeal.referencePrice,
      nextDeal.currency,
      nextDeal.stops,
      nextDeal.totalDurationHours,
      nextDeal.overnight ? 1 : 0,
      nextDeal.repositionRequired ? 1 : 0,
      nextDeal.repositionFrom ?? null,
      nextDeal.catchSummary,
      nextDeal.whyWorthIt,
      nextDeal.bookingUrl,
      nextDeal.publishedAt,
      nextDeal.expiresAt,
      JSON.stringify(nextDeal.tags),
    ],
  );

  return nextDeal;
}

export async function expireDeal(id: string) {
  const existing = await getDealById(id);
  if (!existing) {
    return null;
  }

  const expiredAt = new Date().toISOString();
  await dbRun("UPDATE deals SET expires_at = ? WHERE id = ?", [expiredAt, id]);
  return {
    ...existing,
    expiresAt: expiredAt,
  } satisfies Deal;
}
