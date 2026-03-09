import { NextResponse } from "next/server";

import { retryAlertDelivery } from "@/lib/alerts";
import { isAdminAuthenticated } from "@/lib/auth";
import { retryDigestDelivery } from "@/lib/digests";
import { getEmailDeliveryById } from "@/lib/email-delivery-store";
import { sendSigninLink } from "@/lib/signin-links";
import { getUserById } from "@/lib/user-store";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { deliveryId?: string };
    if (!body.deliveryId) {
      return NextResponse.json({ error: "Delivery id is required." }, { status: 400 });
    }

    const delivery = await getEmailDeliveryById(body.deliveryId);
    if (!delivery) {
      return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
    }

    if (delivery.kind === "alert") {
      const retried = await retryAlertDelivery(delivery.referenceId);
      if (!retried) {
        return NextResponse.json({ error: "Could not retry this alert delivery." }, { status: 400 });
      }

      return NextResponse.json({ delivery: retried }, { status: 200 });
    }

    if (delivery.kind === "digest") {
      const retried = await retryDigestDelivery(delivery.id);
      if (!retried) {
        return NextResponse.json({ error: "Could not retry this digest delivery." }, { status: 400 });
      }

      return NextResponse.json({ delivery: retried }, { status: 200 });
    }

    const user = delivery.userId ? await getUserById(delivery.userId) : null;
    if (!user) {
      return NextResponse.json({ error: "Could not find the user for this sign-in email." }, { status: 400 });
    }

    const retried = await sendSigninLink({
      user,
      email: delivery.recipientEmail,
      requestedProfileId: delivery.metadata.requestedProfileId ?? user.profileId ?? null,
      deliveryId: delivery.id,
    });

    return NextResponse.json({ delivery: retried }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Could not retry this delivery." }, { status: 500 });
  }
}
