import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { previewAmadeusDealImport } from "@/lib/sources/normalize";
import type { FlightOfferSearchInput, SourceTravelClass } from "@/lib/sources/types";

const allowedTravelClasses = new Set<SourceTravelClass>(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]);

function normalizeInput(body: Record<string, unknown>): FlightOfferSearchInput {
  const travelClass = typeof body.travelClass === "string" && allowedTravelClasses.has(body.travelClass as SourceTravelClass)
    ? body.travelClass as SourceTravelClass
    : "BUSINESS";

  return {
    originLocationCode: String(body.originLocationCode ?? "").trim().toUpperCase(),
    destinationLocationCode: String(body.destinationLocationCode ?? "").trim().toUpperCase(),
    departureDate: String(body.departureDate ?? "").trim(),
    returnDate: String(body.returnDate ?? "").trim() || undefined,
    adults: Math.max(1, Number(body.adults ?? 1)),
    travelClass,
    nonStop: Boolean(body.nonStop),
    maxPrice: body.maxPrice ? Math.max(1, Number(body.maxPrice)) : undefined,
    currencyCode: String(body.currencyCode ?? "USD").trim().toUpperCase() || undefined,
    max: 6,
  };
}

function isIsoDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const input = normalizeInput(body);

    if (!input.originLocationCode || !input.destinationLocationCode || !isIsoDate(input.departureDate)) {
      return NextResponse.json({ error: "Origin, destination, and a valid departure date are required." }, { status: 400 });
    }

    if (input.returnDate && !isIsoDate(input.returnDate)) {
      return NextResponse.json({ error: "Return date must be YYYY-MM-DD when provided." }, { status: 400 });
    }

    const preview = await previewAmadeusDealImport(input);
    return NextResponse.json(preview, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load Amadeus preview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}