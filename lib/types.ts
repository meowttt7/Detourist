export type DealType = "flight" | "hotel";

export type Deal = {
  id: string;
  slug: string;
  type: DealType;
  title: string;
  summary: string;
  origin: string;
  destination: string;
  destinationRegion: string;
  cabin: string;
  airlineOrBrand: string;
  currentPrice: number;
  referencePrice: number;
  currency: string;
  stops: number;
  totalDurationHours: number;
  overnight: boolean;
  repositionRequired: boolean;
  repositionFrom?: string;
  catchSummary: string;
  whyWorthIt: string;
  bookingUrl: string;
  publishedAt: string;
  expiresAt: string;
  tags: string[];
};

export type TravelerProfile = {
  homeAirports: string[];
  repositionRegions: string[];
  preferredCabins: string[];
  maxStops: number;
  allowOvernight: boolean;
  maxTravelPain: number;
  destinationInterests: string[];
  budgetMax: number;
  tripStyles: string[];
};

export type DealScore = {
  score: number;
  matchLabel: string;
  savingsPercent: number;
  painScore: number;
  reasons: string[];
  warnings: string[];
};
