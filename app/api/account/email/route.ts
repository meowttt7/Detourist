import { NextResponse } from "next/server";

import { enableEmailAlertsForProfile } from "@/lib/alerts";
import { getCurrentAccount } from "@/lib/current-account";
import { getProfileCookieName, getUserCookieName } from "@/lib/identity";
import { getUserByEmail, upsertUser } from "@/lib/user-store";
import { addToWaitlist } from "@/lib/waitlist-store";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { user: currentUser, profile } = await getCurrentAccount();
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const conflictingUser = await getUserByEmail(email);
    if (conflictingUser && conflictingUser.id !== currentUser?.id) {
      return NextResponse.json(
        { error: "That email is already linked to another Detourist account." },
        { status: 409 },
      );
    }

    await addToWaitlist(email, "account-page");

    const storedUser = await upsertUser({
      id: currentUser?.id ?? null,
      email,
      profileId: profile?.id ?? currentUser?.profileId ?? null,
      waitlistStatus: "joined",
      waitlistSource: "account-page",
    });

    const summary = profile
      ? await enableEmailAlertsForProfile(profile.id, storedUser)
      : { alertsUpdated: 0, deliveries: { sent: 0, queued: 0, failed: 0 } };

    const response = NextResponse.json(
      {
        user: storedUser,
        summary,
      },
      { status: 200 },
    );

    response.cookies.set(getUserCookieName(), storedUser.id, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    if (profile) {
      response.cookies.set(getProfileCookieName(), profile.id, {
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Could not update your email." }, { status: 500 });
  }
}
