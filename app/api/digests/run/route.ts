import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { previewDailyDigests, runDailyDigests } from "@/lib/digests";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const preview = await previewDailyDigests({ force: true });
    return NextResponse.json(preview, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Could not preview daily digests." }, { status: 500 });
  }
}

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runDailyDigests({ force: true });
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Could not run daily digests." }, { status: 500 });
  }
}
