import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/current-account";
import { getProfileCookieName, getUserCookieName } from "@/lib/identity";
import { getUserById, upsertUser } from "@/lib/user-store";
import { addToWaitlist } from "@/lib/waitlist-store";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const currentAccount = await getCurrentAccount();
    const profileId = currentAccount.profile?.id ?? cookieStore.get(getProfileCookieName())?.value ?? null;
    const existingUserId = currentAccount.user?.id ?? cookieStore.get(getUserCookieName())?.value ?? null;

    const body = (await request.json()) as {
      email?: string;
      website?: string;
      source?: string;
    };

    if (body.website) {
      return NextResponse.json({ ok: true, status: "ignored" }, { status: 200 });
    }

    const email = body.email?.trim() ?? "";
    if (!email || !emailPattern.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const result = await addToWaitlist(email, body.source ?? "landing-page");
    const existingUser = existingUserId ? await getUserById(existingUserId) : null;
    const storedUser = await upsertUser({
      id: existingUser?.id ?? existingUserId,
      email,
      profileId: profileId ?? existingUser?.profileId ?? null,
      waitlistStatus: "joined",
      waitlistSource: body.source ?? "landing-page",
    });

    const response = NextResponse.json(
      { ok: true, status: result.status, user: storedUser },
      { status: 200 },
    );
    response.cookies.set(getUserCookieName(), storedUser.id, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Waitlist signup failed.", error);
    return NextResponse.json(
      { ok: false, error: "We couldn't save your email just now. Please try again." },
      { status: 500 },
    );
  }
}
