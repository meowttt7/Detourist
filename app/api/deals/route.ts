import { NextResponse } from "next/server";

import { generateAlertsForDeal } from "@/lib/alerts";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDuplicateMatchesForDeal, hasBlockingDuplicate } from "@/lib/deal-duplicates";
import { addDeal, getAllDeals, getLiveDeals } from "@/lib/deal-store";
import { parseDealInput } from "@/lib/deal-publish";
import { Deal } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeExpired = searchParams.get("includeExpired") === "1";
  const deals = includeExpired && (await isAdminAuthenticated())
    ? await getAllDeals()
    : await getLiveDeals();

  return NextResponse.json({ deals }, { status: 200 });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<Deal> & { allowDuplicatePublish?: boolean };
    const parsed = parseDealInput(body);
    if (!parsed.dealInput) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const nextDealInput = parsed.dealInput;
    const duplicateMatches = getDuplicateMatchesForDeal(nextDealInput, await getLiveDeals());
    if (hasBlockingDuplicate(duplicateMatches) && !body.allowDuplicatePublish) {
      return NextResponse.json(
        {
          error: "A near-duplicate live deal already exists. Review the live deal before publishing this one.",
          duplicates: duplicateMatches,
        },
        { status: 409 },
      );
    }

    const nextDeal = await addDeal(nextDealInput);
    const result = await generateAlertsForDeal(nextDeal);

    return NextResponse.json(
      {
        deal: nextDeal,
        alertsGenerated: result.alerts.length,
        deliveryBreakdown: result.deliveries,
        duplicateWarnings: duplicateMatches.filter((match) => match.confidence === "medium"),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Could not create deal." }, { status: 500 });
  }
}
