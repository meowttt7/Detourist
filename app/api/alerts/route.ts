import { NextResponse } from "next/server";

import { getAlertsForProfile, markAlertViewed } from "@/lib/alert-store";
import { getCurrentAccount } from "@/lib/current-account";

export async function GET() {
  const { profile } = await getCurrentAccount();
  if (!profile) {
    return NextResponse.json({ alerts: [] }, { status: 200 });
  }

  const alerts = await getAlertsForProfile(profile.id);
  return NextResponse.json({ alerts }, { status: 200 });
}

export async function POST(request: Request) {
  const { profile } = await getCurrentAccount();
  if (!profile) {
    return NextResponse.json({ error: "No active profile found." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { alertId?: string; action?: string };
    if (body.action !== "mark_viewed" || !body.alertId) {
      return NextResponse.json({ error: "Invalid alert action." }, { status: 400 });
    }

    const alert = await markAlertViewed(body.alertId, profile.id);
    if (!alert) {
      return NextResponse.json({ error: "Alert not found." }, { status: 404 });
    }

    return NextResponse.json({ alert }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Could not update alert." }, { status: 500 });
  }
}
