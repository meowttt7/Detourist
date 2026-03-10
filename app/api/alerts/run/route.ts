import { NextResponse } from "next/server";

import { backfillAlerts, previewBackfillAlerts } from "@/lib/alerts";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const preview = await previewBackfillAlerts();
    return NextResponse.json(preview, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Could not preview alert backfill." }, { status: 500 });
  }
}

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await backfillAlerts();
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Could not run alert backfill." }, { status: 500 });
  }
}
