import { NextResponse } from "next/server";

import { getUserCookieName } from "@/lib/identity";
import { getUserSessionCookieName } from "@/lib/user-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/sign-in?status=signed-out", request.url));
  response.cookies.set(getUserSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set(getUserCookieName(), "", {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
