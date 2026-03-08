import { NextResponse } from "next/server";

import { addDeal, getAllDeals } from "@/lib/deal-store";
import { Deal } from "@/lib/types";

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const deals = await getAllDeals();
  return NextResponse.json({ deals }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Deal>;

    if (!body.title || !body.origin || !body.destination || !body.bookingUrl) {
      return NextResponse.json(
        { error: "Title, origin, destination, and booking URL are required." },
        { status: 400 },
      );
    }

    if (!isValidUrl(body.bookingUrl)) {
      return NextResponse.json({ error: "Booking URL must be a valid URL." }, { status: 400 });
    }

    const nextDeal = await addDeal({
      type: body.type === "hotel" ? "hotel" : "flight",
      title: body.title,
      summary: body.summary ?? "",
      origin: body.origin.toUpperCase(),
      destination: body.destination,
      destinationRegion: body.destinationRegion ?? "Anywhere",
      cabin: body.cabin ?? "Business Class",
      airlineOrBrand: body.airlineOrBrand ?? "Unknown",
      currentPrice: Number(body.currentPrice ?? 0),
      referencePrice: Number(body.referencePrice ?? 0),
      currency: (body.currency ?? "USD").toUpperCase(),
      stops: Number(body.stops ?? 0),
      totalDurationHours: Number(body.totalDurationHours ?? 0),
      overnight: Boolean(body.overnight),
      repositionRequired: Boolean(body.repositionRequired),
      repositionFrom: body.repositionFrom,
      catchSummary: body.catchSummary ?? "",
      whyWorthIt: body.whyWorthIt ?? "",
      bookingUrl: body.bookingUrl,
      expiresAt: body.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      tags: Array.isArray(body.tags) ? body.tags : [],
    });

    return NextResponse.json({ deal: nextDeal }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create deal." }, { status: 500 });
  }
}
