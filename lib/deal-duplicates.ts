import type { Deal } from "@/lib/types";

export type DealDuplicateMatch = {
  dealId: string;
  dealSlug: string;
  title: string;
  publishedAt: string;
  currentPrice: number;
  currency: string;
  similarityLabel: string;
  confidence: "high" | "medium";
};

type ComparableDeal = Pick<Deal, "type" | "origin" | "destination" | "airlineOrBrand" | "cabin" | "currentPrice">;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getPriceGapPercent(left: number, right: number) {
  const baseline = Math.max(left, right, 1);
  return Math.round((Math.abs(left - right) / baseline) * 100);
}

function buildSimilarity(result: ComparableDeal, liveDeal: Deal) {
  const routeMatch = normalizeText(liveDeal.origin) === normalizeText(result.origin)
    && normalizeText(liveDeal.destination) === normalizeText(result.destination);
  const inverseRouteMatch = normalizeText(liveDeal.origin) === normalizeText(result.destination)
    && normalizeText(liveDeal.destination) === normalizeText(result.origin);
  const brandMatch = normalizeText(liveDeal.airlineOrBrand) === normalizeText(result.airlineOrBrand);
  const cabinMatch = normalizeText(liveDeal.cabin) === normalizeText(result.cabin);
  const priceGapPercent = getPriceGapPercent(liveDeal.currentPrice, result.currentPrice);

  let similarityScore = 0;
  if (routeMatch) {
    similarityScore += 5;
  }
  if (inverseRouteMatch) {
    similarityScore += 2;
  }
  if (brandMatch) {
    similarityScore += 3;
  }
  if (cabinMatch) {
    similarityScore += 2;
  }
  if (priceGapPercent <= 12) {
    similarityScore += 3;
  } else if (priceGapPercent <= 20) {
    similarityScore += 2;
  } else if (priceGapPercent <= 30) {
    similarityScore += 1;
  }

  let confidence: DealDuplicateMatch["confidence"] | null = null;
  let similarityLabel = "Related route already live";

  if (routeMatch && brandMatch && cabinMatch && priceGapPercent <= 12) {
    confidence = "high";
    similarityLabel = "Near-duplicate live deal";
  } else if (routeMatch && cabinMatch && priceGapPercent <= 20) {
    confidence = "medium";
    similarityLabel = "Very similar route and cabin";
  } else if (similarityScore >= 5) {
    confidence = "medium";
  }

  return {
    routeMatch,
    inverseRouteMatch,
    brandMatch,
    cabinMatch,
    priceGapPercent,
    similarityScore,
    confidence,
    similarityLabel,
  };
}

export function getDuplicateMatchesForDeal(result: ComparableDeal, liveDeals: Deal[], limit = 3): DealDuplicateMatch[] {
  return liveDeals
    .filter((deal) => deal.type === result.type)
    .map((deal) => {
      const similarity = buildSimilarity(result, deal);
      return {
        deal,
        ...similarity,
      };
    })
    .filter((candidate) => candidate.confidence)
    .sort((left, right) => {
      const confidenceDelta = (right.confidence === "high" ? 1 : 0) - (left.confidence === "high" ? 1 : 0);
      if (confidenceDelta !== 0) {
        return confidenceDelta;
      }
      return right.similarityScore - left.similarityScore || left.priceGapPercent - right.priceGapPercent;
    })
    .slice(0, limit)
    .map(({ deal, confidence, similarityLabel }) => ({
      dealId: deal.id,
      dealSlug: deal.slug,
      title: deal.title,
      publishedAt: deal.publishedAt,
      currentPrice: deal.currentPrice,
      currency: deal.currency,
      similarityLabel,
      confidence: confidence ?? "medium",
    }));
}

export function hasBlockingDuplicate(matches: DealDuplicateMatch[]) {
  return matches.some((match) => match.confidence === "high");
}
