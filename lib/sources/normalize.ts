import { searchAmadeusFlightOffers } from "@/lib/sources/amadeus";
import type { DealImportPreviewResult, FlightOfferSearchInput, ImportedDealCandidate, SourceTravelClass } from "@/lib/sources/types";

function parseDurationToHours(input: string | undefined) {
  if (!input) {
    return 0;
  }

  const hoursMatch = input.match(/(\d+)H/);
  const minutesMatch = input.match(/(\d+)M/);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
  return Math.round((hours + minutes / 60) * 10) / 10;
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTravelClassMultiplier(travelClass: SourceTravelClass) {
  switch (travelClass) {
    case "FIRST":
      return 2.2;
    case "BUSINESS":
      return 1.8;
    case "PREMIUM_ECONOMY":
      return 1.45;
    default:
      return 1.25;
  }
}

function estimateReferencePrice(currentPrice: number, travelClass: SourceTravelClass, stops: number) {
  const stopDiscount = stops === 0 ? 0 : Math.min(stops * 0.08, 0.2);
  const multiplier = Math.max(1.18, getTravelClassMultiplier(travelClass) - stopDiscount);
  return Math.round(currentPrice * multiplier);
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildCatchSummary(stops: number, durationHours: number, overnight: boolean) {
  const parts: string[] = [];

  if (stops === 0) {
    parts.push("No extra stop risk");
  } else if (stops === 1) {
    parts.push("One stop on the way");
  } else {
    parts.push(`${stops} stops on the way`);
  }

  if (durationHours > 0) {
    parts.push(`${durationHours}h total travel time`);
  }

  if (overnight) {
    parts.push("includes an overnight segment or arrival");
  }

  return parts.join(". ");
}

function buildWhyWorthIt(currentPrice: number, referencePrice: number, travelClass: SourceTravelClass, carrierName: string) {
  const savingsPercent = referencePrice > currentPrice
    ? Math.round(((referencePrice - currentPrice) / referencePrice) * 100)
    : 0;
  const classLabel = toTitleCase(travelClass);
  return `${classLabel} pricing on ${carrierName} appears roughly ${savingsPercent}% below the estimated benchmark for this itinerary.`;
}

function buildSourceSummary(price: number, currency: string, carrierName: string, durationHours: number, stops: number) {
  const stopSummary = stops === 0 ? "nonstop" : `${stops} stop${stops === 1 ? "" : "s"}`;
  return `${formatMoney(price, currency)} · ${carrierName} · ${durationHours}h · ${stopSummary}`;
}

function buildReviewNotes(bookingLink: string | null, destinationRegion: string) {
  const notes = ["Add a real public booking URL before publishing."];

  if (!bookingLink) {
    notes.push("The source preview does not include a consumer checkout link.");
  }

  if (destinationRegion === "Imported") {
    notes.push("Replace the placeholder destination region before publishing.");
  }

  return notes;
}

function getCarrierName(offer: Record<string, unknown>, carriers: Record<string, string>) {
  const validating = Array.isArray(offer.validatingAirlineCodes) ? offer.validatingAirlineCodes[0] : null;
  if (typeof validating === "string" && carriers[validating]) {
    return carriers[validating];
  }

  return typeof validating === "string" ? validating : "Imported carrier";
}

function getDestinationRegion(destinationCode: string) {
  const regionMap: Record<string, string> = {
    CDG: "Europe",
    HND: "Asia",
    NRT: "Asia",
    BKK: "Asia",
    SIN: "Asia",
    JFK: "North America",
    LAX: "North America",
    SYD: "Oceania",
    DXB: "Middle East",
  };

  return regionMap[destinationCode] ?? "Imported";
}

function normalizeAmadeusOffer(
  offer: Record<string, unknown>,
  carriers: Record<string, string>,
  query: FlightOfferSearchInput,
): ImportedDealCandidate | null {
  const itineraries = Array.isArray(offer.itineraries) ? offer.itineraries as Array<Record<string, unknown>> : [];
  const outbound = itineraries[0];
  const segments = outbound && Array.isArray(outbound.segments) ? outbound.segments as Array<Record<string, unknown>> : [];

  if (!segments.length) {
    return null;
  }

  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  const arrival = lastSegment.arrival as Record<string, unknown> | undefined;
  const departure = firstSegment.departure as Record<string, unknown> | undefined;
  const destinationCode = typeof arrival?.iataCode === "string" ? arrival.iataCode : query.destinationLocationCode;
  const originCode = typeof departure?.iataCode === "string" ? departure.iataCode : query.originLocationCode;
  const outboundDuration = parseDurationToHours(typeof outbound.duration === "string" ? outbound.duration : undefined);
  const returnDuration = itineraries[1] && typeof itineraries[1].duration === "string"
    ? parseDurationToHours(String(itineraries[1].duration))
    : 0;
  const totalDurationHours = Math.round((outboundDuration + returnDuration) * 10) / 10;
  const overnight = segments.some((segment) => {
    const dep = (segment.departure as Record<string, unknown> | undefined)?.at;
    const arr = (segment.arrival as Record<string, unknown> | undefined)?.at;
    return typeof dep === "string" && typeof arr === "string" && dep.slice(0, 10) !== arr.slice(0, 10);
  });

  const priceBlock = offer.price as Record<string, unknown> | undefined;
  const currentPrice = Number(priceBlock?.grandTotal ?? priceBlock?.total ?? 0);
  const currency = typeof priceBlock?.currency === "string" ? priceBlock.currency : query.currencyCode ?? "USD";
  const stops = Math.max(segments.length - 1, 0);
  const referencePrice = estimateReferencePrice(currentPrice, query.travelClass, stops);
  const carrierName = getCarrierName(offer, carriers);
  const destinationRegion = getDestinationRegion(destinationCode);
  const bookingUrl = "";
  const travelClassLabel = toTitleCase(query.travelClass);
  const sourceId = typeof offer.id === "string" ? offer.id : `${originCode}-${destinationCode}-${query.departureDate}`;

  return {
    id: `amadeus-${sourceId}`,
    source: "amadeus",
    sourceLabel: "Amadeus flight offers",
    sourceSummary: buildSourceSummary(currentPrice, currency, carrierName, totalDurationHours, stops),
    reviewNotes: buildReviewNotes(bookingUrl || null, destinationRegion),
    payload: {
      type: "flight",
      title: `${originCode} to ${destinationCode}`,
      summary: `${travelClassLabel} itinerary sourced from Amadeus live search for ${query.departureDate}.`,
      origin: originCode,
      destination: destinationCode,
      destinationRegion,
      cabin: travelClassLabel,
      airlineOrBrand: carrierName,
      currentPrice,
      referencePrice,
      currency,
      stops,
      totalDurationHours,
      overnight,
      repositionRequired: false,
      repositionFrom: undefined,
      catchSummary: buildCatchSummary(stops, totalDurationHours, overnight),
      whyWorthIt: buildWhyWorthIt(currentPrice, referencePrice, query.travelClass, carrierName),
      bookingUrl,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      tags: [
        "live-source",
        "amadeus",
        query.travelClass.toLowerCase().replace(/_/g, "-"),
        stops === 0 ? "nonstop" : `${stops}-stop`,
      ],
    },
  };
}

export async function previewAmadeusDealImport(query: FlightOfferSearchInput): Promise<DealImportPreviewResult> {
  const response = await searchAmadeusFlightOffers(query);
  const carriers = response.dictionaries?.carriers ?? {};
  const candidates = response.data
    .map((offer) => normalizeAmadeusOffer(offer, carriers, query))
    .filter((candidate): candidate is ImportedDealCandidate => Boolean(candidate));

  const warnings = candidates.length
    ? ["Live offers still need manual review, destination-region cleanup, and a real public booking URL before publishing."]
    : ["No import candidates returned for this search. Try adjusting dates, class, or max price."];

  return {
    generatedAt: new Date().toISOString(),
    query,
    warnings,
    candidates,
  };
}