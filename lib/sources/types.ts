import type { Deal } from "@/lib/types";

export type SourceTravelClass = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

export type FlightOfferSearchInput = {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  travelClass: SourceTravelClass;
  nonStop: boolean;
  maxPrice?: number;
  currencyCode?: string;
  max?: number;
};

export type ImportedDealCandidate = {
  id: string;
  source: "amadeus";
  sourceLabel: string;
  sourceSummary: string;
  reviewNotes: string[];
  payload: Omit<Deal, "id" | "slug" | "publishedAt">;
};

export type DealImportPreviewResult = {
  generatedAt: string;
  query: FlightOfferSearchInput;
  warnings: string[];
  candidates: ImportedDealCandidate[];
};