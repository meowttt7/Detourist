import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/current-account";
import { getProfileCookieName, getUserCookieName } from "@/lib/identity";
import { upsertProfile } from "@/lib/profile-store";
import { upsertUser } from "@/lib/user-store";
import type { TravelerProfile } from "@/lib/types";

export async function GET() {
  const currentAccount = await getCurrentAccount();
  return NextResponse.json({ profile: currentAccount.profile, user: currentAccount.user }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const currentAccount = await getCurrentAccount();
    const existingProfileId = currentAccount.profile?.id ?? cookieStore.get(getProfileCookieName())?.value ?? null;
    const existingUserId = currentAccount.user?.id ?? cookieStore.get(getUserCookieName())?.value ?? null;
    const body = (await request.json()) as {
      profile?: Partial<TravelerProfile>;
      savedDealIds?: string[];
      hiddenDealIds?: string[];
    };

    const storedProfile = await upsertProfile(existingProfileId, {
      ...(body.profile ?? {}),
      savedDealIds: body.savedDealIds,
      hiddenDealIds: body.hiddenDealIds,
    });

    const storedUser = await upsertUser({
      id: existingUserId,
      email: currentAccount.user?.email ?? null,
      profileId: storedProfile.id,
      waitlistStatus: currentAccount.user?.waitlistStatus ?? (existingUserId ? undefined : "not_joined"),
    });

    const response = NextResponse.json({ profile: storedProfile, user: storedUser }, { status: 200 });
    response.cookies.set(getProfileCookieName(), storedProfile.id, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    response.cookies.set(getUserCookieName(), storedUser.id, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Could not save profile." }, { status: 500 });
  }
}
