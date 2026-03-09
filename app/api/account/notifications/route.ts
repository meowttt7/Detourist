import { NextResponse } from "next/server";

import { applyAlertPreferenceForProfile } from "@/lib/alerts";
import { getCurrentAccount } from "@/lib/current-account";
import type { AlertNotificationPreference } from "@/lib/types";
import { upsertUser } from "@/lib/user-store";

const validPreferences = new Set<AlertNotificationPreference>(["instant", "daily_digest", "paused"]);

export async function POST(request: Request) {
  try {
    const currentAccount = await getCurrentAccount();
    if (!currentAccount.user) {
      return NextResponse.json({ error: "No account available to update." }, { status: 401 });
    }

    const body = (await request.json()) as { preference?: AlertNotificationPreference };
    const preference = body.preference;
    if (!preference || !validPreferences.has(preference)) {
      return NextResponse.json({ error: "Please choose a valid notification preference." }, { status: 400 });
    }

    const storedUser = await upsertUser({
      id: currentAccount.user.id,
      email: currentAccount.user.email,
      profileId: currentAccount.user.profileId,
      waitlistStatus: currentAccount.user.waitlistStatus,
      alertPreference: preference,
    });

    const summary = currentAccount.profile
      ? await applyAlertPreferenceForProfile(currentAccount.profile.id, storedUser)
      : { alertsUpdated: 0, deliveries: { sent: 0, queued: 0, failed: 0 } };

    return NextResponse.json({ user: storedUser, summary }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Could not update notification settings." }, { status: 500 });
  }
}
