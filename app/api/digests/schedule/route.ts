import { NextResponse } from "next/server";

import { runDailyDigests } from "@/lib/digests";
import { authorizeScheduledRequest } from "@/lib/scheduled-jobs";

async function handleScheduledDigest(request: Request) {
  if (!authorizeScheduledRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runDailyDigests({ force: false });
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Could not run scheduled daily digests." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleScheduledDigest(request);
}

export async function POST(request: Request) {
  return handleScheduledDigest(request);
}
