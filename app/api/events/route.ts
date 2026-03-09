import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { addDealEvent } from "@/lib/event-store";
import { getProfileCookieName, getUserCookieName } from "@/lib/identity";
import { DealEventType } from "@/lib/types";

const supportedTypes = new Set<DealEventType>(["detail_view", "booking_click", "save_deal", "hide_deal"]);

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const body = (await request.json()) as {
      type?: DealEventType;
      dealId?: string;
      dealSlug?: string;
      surface?: string;
    };

    if (!body.type || !supportedTypes.has(body.type) || !body.dealId || !body.surface) {
      return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
    }

    const event = await addDealEvent({
      type: body.type,
      dealId: body.dealId,
      dealSlug: body.dealSlug,
      userId: cookieStore.get(getUserCookieName())?.value ?? null,
      profileId: cookieStore.get(getProfileCookieName())?.value ?? null,
      surface: body.surface,
    });

    return NextResponse.json({ ok: true, eventId: event.id }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Could not track event." }, { status: 500 });
  }
}
