import { NextResponse } from "next/server";

import { addToWaitlist } from "@/lib/waitlist-store";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
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

    return NextResponse.json({ ok: true, status: result.status }, { status: 200 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "We couldn't save your email just now. Please try again." },
      { status: 500 },
    );
  }
}
