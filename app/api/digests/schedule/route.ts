import { NextResponse } from "next/server";

import { runDailyDigests } from "@/lib/digests";
import { recordScheduledJobRun } from "@/lib/scheduled-job-run-store";
import type { ScheduledJobRunMetadata } from "@/lib/types";
import { authorizeScheduledRequest } from "@/lib/scheduled-jobs";

function buildScheduledDigestSummary(result: {
  digestsCreated: number;
  usersProcessed: number;
  skippedForCadence: number;
  skippedForWindow: number;
}) {
  if (result.digestsCreated > 0) {
    return `Created ${result.digestsCreated} daily digests across ${result.usersProcessed} users.`;
  }

  if (result.skippedForWindow > 0) {
    return `Skipped ${result.skippedForWindow} daily-digest users because the schedule window is not open yet.`;
  }

  if (result.skippedForCadence > 0) {
    return `Skipped ${result.skippedForCadence} daily-digest users because they already received a digest for their local day.`;
  }

  return "No daily digests were ready to send.";
}

async function logScheduledDigestRun(input: {
  status: "success" | "skipped" | "failed" | "unauthorized";
  summary: string;
  metadata: ScheduledJobRunMetadata;
}) {
  try {
    await recordScheduledJobRun({
      kind: "daily_digest_schedule",
      status: input.status,
      summary: input.summary,
      metadata: input.metadata,
    });
  } catch (error) {
    console.error("Could not record scheduled digest run", error);
  }
}

async function handleScheduledDigest(request: Request) {
  const baseMetadata = {
    method: request.method,
  };

  if (!authorizeScheduledRequest(request)) {
    await logScheduledDigestRun({
      status: "unauthorized",
      summary: "Rejected scheduled digest request because the cron secret was missing or invalid.",
      metadata: baseMetadata,
    });
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runDailyDigests({ force: false });
    await logScheduledDigestRun({
      status: result.digestsCreated > 0 ? "success" : "skipped",
      summary: buildScheduledDigestSummary(result),
      metadata: {
        ...baseMetadata,
        force: result.force,
        scheduleDate: result.scheduleDate,
        scheduleLabel: result.scheduleLabel,
        eligibleUsers: result.eligibleUsers,
        usersProcessed: result.usersProcessed,
        digestsCreated: result.digestsCreated,
        skippedForCadence: result.skippedForCadence,
        skippedForWindow: result.skippedForWindow,
        deliveries: result.deliveries,
      },
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    await logScheduledDigestRun({
      status: "failed",
      summary: "Scheduled daily digest run failed before completion.",
      metadata: {
        ...baseMetadata,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json({ error: "Could not run scheduled daily digests." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleScheduledDigest(request);
}

export async function POST(request: Request) {
  return handleScheduledDigest(request);
}

