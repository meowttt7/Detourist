import { NextResponse } from "next/server";

import { generateAlertsForDeal } from "@/lib/alerts";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDuplicateMatchesForDeal, hasBlockingDuplicate } from "@/lib/deal-duplicates";
import { addDeal, expireDeal, getDealById, getLiveDeals } from "@/lib/deal-store";
import { parseDealInput } from "@/lib/deal-publish";
import type { Deal } from "@/lib/types";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<Deal> & {
      allowDuplicatePublish?: boolean;
      replaceDealId?: string;
    };

    if (!body.replaceDealId) {
      return NextResponse.json({ error: "Select the live deal you want to replace." }, { status: 400 });
    }

    const dealToReplace = await getDealById(body.replaceDealId);
    if (!dealToReplace) {
      return NextResponse.json({ error: "Live deal not found." }, { status: 404 });
    }

    if (Date.parse(dealToReplace.expiresAt) <= Date.now()) {
      return NextResponse.json(
        { error: "That deal is already expired. Choose a live deal to replace." },
        { status: 409 },
      );
    }

    const parsed = parseDealInput(body);
    if (!parsed.dealInput) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const nextDealInput = parsed.dealInput;
    const duplicateMatches = getDuplicateMatchesForDeal(
      nextDealInput,
      await getLiveDeals(),
      3,
      [body.replaceDealId],
    );

    if (hasBlockingDuplicate(duplicateMatches) && !body.allowDuplicatePublish) {
      return NextResponse.json(
        {
          error: "Another near-duplicate live deal still exists after excluding the one you're replacing.",
          duplicates: duplicateMatches,
        },
        { status: 409 },
      );
    }

    const nextDeal = await addDeal(nextDealInput);
    const replacedDeal = await expireDeal(body.replaceDealId);

    if (!replacedDeal) {
      return NextResponse.json(
        { error: "The live deal could not be expired after creating the replacement." },
        { status: 500 },
      );
    }

    const result = await generateAlertsForDeal(nextDeal);

    return NextResponse.json(
      {
        deal: nextDeal,
        replacedDeal,
        alertsGenerated: result.alerts.length,
        deliveryBreakdown: result.deliveries,
        duplicateWarnings: duplicateMatches.filter((match) => match.confidence === "medium"),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Could not replace deal." }, { status: 500 });
  }
}
