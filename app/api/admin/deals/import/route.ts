import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { saveImportedDealDraft } from "@/lib/import-draft-store";
import type { ImportedDealCandidate, ImportedDealPayload } from "@/lib/sources/types";

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((tag) => String(tag).trim()).filter(Boolean);
}

function normalizeBoolean(value: unknown) {
  return Boolean(value);
}

function normalizeImportedPayload(input: Record<string, unknown>): ImportedDealPayload | null {
  const title = String(input.title ?? "").trim();
  const origin = String(input.origin ?? "").trim().toUpperCase();
  const destination = String(input.destination ?? "").trim();
  const bookingUrl = String(input.bookingUrl ?? "").trim();

  if (!title || !origin || !destination || !bookingUrl) {
    return null;
  }

  return {
    type: input.type === "hotel" ? "hotel" : "flight",
    title,
    summary: String(input.summary ?? "").trim(),
    origin,
    destination,
    destinationRegion: String(input.destinationRegion ?? "Anywhere").trim() || "Anywhere",
    cabin: String(input.cabin ?? "Business Class").trim() || "Business Class",
    airlineOrBrand: String(input.airlineOrBrand ?? "Unknown").trim() || "Unknown",
    currentPrice: Number(input.currentPrice ?? 0),
    referencePrice: Number(input.referencePrice ?? 0),
    currency: String(input.currency ?? "USD").trim().toUpperCase() || "USD",
    stops: Number(input.stops ?? 0),
    totalDurationHours: Number(input.totalDurationHours ?? 0),
    overnight: normalizeBoolean(input.overnight),
    repositionRequired: normalizeBoolean(input.repositionRequired),
    repositionFrom: input.repositionFrom ? String(input.repositionFrom).trim() : undefined,
    catchSummary: String(input.catchSummary ?? "").trim(),
    whyWorthIt: String(input.whyWorthIt ?? "").trim(),
    bookingUrl,
    expiresAt: String(input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()).trim(),
    tags: normalizeTags(input.tags),
  };
}

function buildImportedCandidate(payload: ImportedDealPayload): ImportedDealCandidate {
  return {
    id: "",
    source: "manual_json",
    sourceLabel: "JSON import",
    sourceSummary: `${payload.origin} to ${payload.destination} | ${payload.currency} ${payload.currentPrice}`,
    reviewNotes: [
      "Imported from JSON for review.",
      "Loaded into the review queue instead of publishing directly.",
    ],
    payload,
  };
}

function getDealList(body: unknown) {
  if (Array.isArray(body)) {
    return body;
  }

  if (body && typeof body === "object" && Array.isArray((body as { deals?: unknown[] }).deals)) {
    return (body as { deals: unknown[] }).deals;
  }

  return null;
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json() as unknown;
    const rawDeals = getDealList(body);
    if (!rawDeals?.length) {
      return NextResponse.json({ error: "Provide a non-empty deals array." }, { status: 400 });
    }

    const candidates = rawDeals
      .map((item) => (item && typeof item === "object" ? normalizeImportedPayload(item as Record<string, unknown>) : null))
      .filter((item): item is ImportedDealPayload => Boolean(item))
      .map(buildImportedCandidate);

    if (!candidates.length) {
      return NextResponse.json(
        { error: "No valid deals were found. Each deal needs title, origin, destination, and bookingUrl." },
        { status: 400 },
      );
    }

    const drafts = [];
    for (const candidate of candidates) {
      drafts.push(await saveImportedDealDraft(candidate));
    }

    return NextResponse.json(
      {
        importedCount: drafts.length,
        skippedCount: rawDeals.length - drafts.length,
        drafts,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Could not import deals from JSON." }, { status: 500 });
  }
}
