import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { runAmadeusAuthProbe } from "@/lib/amadeus-probe";

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const run = await runAmadeusAuthProbe();
  if (run.status !== "success") {
    return NextResponse.json(
      {
        error: run.metadata.errorMessage ?? run.summary,
        run,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ run }, { status: 200 });
}
