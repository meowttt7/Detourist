import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/current-account";
import { sendSigninLink } from "@/lib/signin-links";
import { getUserByEmail, upsertUser } from "@/lib/user-store";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const { user: currentUser, profile } = await getCurrentAccount();
    const existingUser = await getUserByEmail(email);
    const targetUser = existingUser ?? (await upsertUser({
      id: currentUser?.id ?? null,
      email,
      profileId: currentUser?.profileId ?? profile?.id ?? null,
      waitlistStatus: currentUser?.waitlistStatus ?? "not_joined",
    }));

    const delivery = await sendSigninLink({
      user: targetUser,
      email,
      requestedProfileId: profile?.id ?? currentUser?.profileId ?? null,
    });

    return NextResponse.json(
      {
        ok: true,
        delivery: {
          mode: delivery.mode,
          status: delivery.status,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Could not send a sign-in link." }, { status: 500 });
  }
}
