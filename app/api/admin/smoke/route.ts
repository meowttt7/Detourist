import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { getAdminSmokeSnapshot, sendAdminTestSigninLink } from "@/lib/admin-smoke";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const snapshot = await getAdminSmokeSnapshot();
    return NextResponse.json(snapshot, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Could not load smoke-test status." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim() ?? "";
    const delivery = await sendAdminTestSigninLink(email);
    return NextResponse.json({ ok: true, delivery }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send test sign-in link." },
      { status: 400 },
    );
  }
}
