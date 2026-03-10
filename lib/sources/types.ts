import type { Deal } from "@/lib/types";

export type SourceTravelClass = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
export type DealImportSource = "amadeus";
export type ImportedDealPayload = Omit<Deal, "id" | "slug" | "publishedAt">;

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
  source: DealImportSource;
  sourceLabel: string;
  sourceSummary: string;
  reviewNotes: string[];
  payload: ImportedDealPayload;
};

export type DealImportPreviewResult = {
  generatedAt: string;
  query: FlightOfferSearchInput;
  warnings: string[];
  candidates: ImportedDealCandidate[];
};

export type ImportedDealDraft = ImportedDealCandidate & {
  createdAt: string;
  updatedAt: string;
};
