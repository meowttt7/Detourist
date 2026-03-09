import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { runDailyDigests } from "@/lib/digests";

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
