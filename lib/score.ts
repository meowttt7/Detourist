import type { Deal, DealScore, TravelerProfile } from "@/lib/types";

const premiumCabinWeights: Record<string, number> = {
  first: 18,
  business: 14,
  suite: 20,
  luxury: 10,
};

function normalizeCabin(cabin: string) {
  return cabin.trim().toLowerCase();
}

export function getSavingsPercent(deal: Deal) {
  if (!deal.referencePrice) {
    return 0;
  }

  return Math.round(((deal.referencePrice - deal.currentPrice) / deal.referencePrice) * 100);
}

export function scoreDeal(deal: Deal, profile?: TravelerProfile): DealScore {
  const savingsPercent = getSavingsPercent(deal);
  const cabinKey = normalizeCabin(deal.cabin);
  const cabinBoost = Object.entries(premiumCabinWeights).find(([key]) => cabinKey.includes(key))?.[1] ?? 8;

  let score = 40 + Math.max(0, savingsPercent * 0.55) + cabinBoost;
  let painScore = 0;

  painScore += deal.stops * 8;
  painScore += Math.max(0, deal.totalDurationHours - 12) * 1.1;
  if (deal.overnight) {
    painScore += 10;
  }
  if (deal.repositionRequired) {
    painScore += 12;
  }

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (savingsPercent >= 45) {
    reasons.push(`Deep discount at ${savingsPercent}% below the usual fare.`);
  } else if (savingsPercent >= 30) {
    reasons.push(`Strong value at ${savingsPercent}% below the usual fare.`);
  } else {
    reasons.push(`Still priced meaningfully below the typical premium trip.`);
  }

  if (cabinKey.includes("first")) {
    reasons.push("First-class comfort at a price that behaves closer to business class.");
  } else if (cabinKey.includes("business")) {
    reasons.push("Lie-flat premium comfort without a full premium price penalty.");
  } else {
    reasons.push("Luxury positioning with stackable upside.");
  }

  if (deal.overnight) {
    warnings.push("Includes an overnight layover.");
  }
  if (deal.repositionRequired) {
    warnings.push(`Requires repositioning${deal.repositionFrom ? ` from ${deal.repositionFrom}` : ""}.`);
  }
  if (deal.stops >= 2) {
    warnings.push(`Includes ${deal.stops} stops before arrival.`);
  }

  if (profile) {
    const prefersCabin = profile.preferredCabins.some((item) => cabinKey.includes(item.toLowerCase()));
    if (prefersCabin) {
      score += 8;
      reasons.push("Matches your preferred cabin style.");
    }

    const withinStops = deal.stops <= profile.maxStops;
    if (withinStops) {
      score += 6;
    } else {
      score -= (deal.stops - profile.maxStops) * 7;
      warnings.push("Exceeds your preferred stop count.");
    }

    if (!profile.allowOvernight && deal.overnight) {
      score -= 14;
    }

    const withinBudget = deal.currentPrice <= profile.budgetMax;
    if (withinBudget) {
      score += 6;
    } else {
      score -= Math.min(18, Math.round((deal.currentPrice - profile.budgetMax) / 150));
      warnings.push("Above your current budget ceiling.");
    }

    const homeAirportMatch = profile.homeAirports.some(
      (airport) => airport.toLowerCase() === deal.origin.toLowerCase(),
    );
    if (homeAirportMatch) {
      score += 8;
      reasons.push("Departs from one of your home airports.");
    } else if (!deal.repositionRequired) {
      score -= 4;
    }

    const destinationMatch = profile.destinationInterests.some((interest) =>
      deal.destinationRegion.toLowerCase().includes(interest.toLowerCase()) ||
      deal.destination.toLowerCase().includes(interest.toLowerCase()),
    );
    if (destinationMatch) {
      score += 5;
      reasons.push("Lines up with the destinations you want to watch.");
    }

    score -= Math.max(0, painScore - profile.maxTravelPain * 4);
  } else {
    score -= painScore * 0.8;
  }

  score = Math.max(18, Math.min(98, Math.round(score)));

  let matchLabel = "Worth watching";
  if (score >= 88) {
    matchLabel = "Book-this-now territory";
  } else if (score >= 76) {
    matchLabel = "Very strong fit";
  } else if (score >= 62) {
    matchLabel = "Good flexible-traveler fit";
  }

  return {
    score,
    matchLabel,
    savingsPercent,
    painScore: Math.round(painScore),
    reasons,
    warnings,
  };
}
