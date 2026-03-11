import { NextResponse } from "next/server";

import { buildDetouristUrl } from "@/lib/app-url";
import { getProfileCookieName, getUserCookieName } from "@/lib/identity";
import { getUserById, upsertUser } from "@/lib/user-store";
import { consumeUserMagicLinkToken, createUserSessionToken, getUserSessionCookieName } from "@/lib/user-auth";

function redirectTo(pathname: string) {
  return NextResponse.redirect(buildDetouristUrl(pathname));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token) {
    return redirectTo("/sign-in?status=missing");
  }

  const canonicalVerifyUrl = buildDetouristUrl(`/auth/verify?token=${encodeURIComponent(token)}`);
  if (url.origin !== canonicalVerifyUrl.origin) {
    return NextResponse.redirect(canonicalVerifyUrl);
  }

  const authRecord = await consumeUserMagicLinkToken(token);
  if (!authRecord) {
    return redirectTo("/sign-in?status=invalid");
  }

  const existingUser = await getUserById(authRecord.userId);
  if (!existingUser) {
    return redirectTo("/sign-in?status=invalid");
  }

  const storedUser = authRecord.requestedProfileId && !existingUser.profileId
    ? await upsertUser({
        id: existingUser.id,
        email: existingUser.email,
        profileId: authRecord.requestedProfileId,
        waitlistStatus: existingUser.waitlistStatus,
      })
    : existingUser;

  const destinationPath = storedUser.profileId
    ? "/deals?status=signed-in"
    : "/onboarding?status=welcome";

  const response = NextResponse.redirect(buildDetouristUrl(destinationPath));
  response.cookies.set(getUserSessionCookieName(), createUserSessionToken(storedUser.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  response.cookies.set(getUserCookieName(), storedUser.id, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  if (storedUser.profileId) {
    response.cookies.set(getProfileCookieName(), storedUser.profileId, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return response;
}
