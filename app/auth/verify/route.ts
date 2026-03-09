import { NextResponse } from "next/server";

import { getProfileCookieName, getUserCookieName } from "@/lib/identity";
import { getUserById, upsertUser } from "@/lib/user-store";
import { consumeUserMagicLinkToken, createUserSessionToken, getUserSessionCookieName } from "@/lib/user-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.redirect(new URL("/sign-in?status=missing", request.url));
  }

  const authRecord = await consumeUserMagicLinkToken(token);
  if (!authRecord) {
    return NextResponse.redirect(new URL("/sign-in?status=invalid", request.url));
  }

  const existingUser = await getUserById(authRecord.userId);
  if (!existingUser) {
    return NextResponse.redirect(new URL("/sign-in?status=invalid", request.url));
  }

  const storedUser = authRecord.requestedProfileId && !existingUser.profileId
    ? await upsertUser({
        id: existingUser.id,
        email: existingUser.email,
        profileId: authRecord.requestedProfileId,
        waitlistStatus: existingUser.waitlistStatus,
      })
    : existingUser;

  const response = NextResponse.redirect(new URL("/account?status=signed-in", request.url));
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
