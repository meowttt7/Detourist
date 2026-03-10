import crypto from "node:crypto";

import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { ScheduledJobRun, ScheduledJobRunKind, ScheduledJobRunMetadata, ScheduledJobRunStatus } from "@/lib/types";

type RecordScheduledJobRunInput = {
  kind: ScheduledJobRunKind;
  status: ScheduledJobRunStatus;
  summary: string;
  metadata?: ScheduledJobRunMetadata;
};

function mapScheduledJobRun(row: Record<string, unknown>): ScheduledJobRun {
  return {
    id: String(row.id),
    kind: row.kind as ScheduledJobRunKind,
    status: row.status as ScheduledJobRunStatus,
    summary: String(row.summary),
    metadata: row.metadata_json ? JSON.parse(String(row.metadata_json)) as ScheduledJobRunMetadata : {},
    createdAt: String(row.created_at),
  };
}

export async function getRecentScheduledJobRuns(kind?: ScheduledJobRunKind, limit = 8) {
  const safeLimit = Math.max(1, Math.min(limit, 25));
  const rows = kind
    ? await dbAll(
      "SELECT * FROM scheduled_job_runs WHERE kind = ? ORDER BY created_at DESC LIMIT ?",
      [kind, safeLimit],
    )
    : await dbAll("SELECT * FROM scheduled_job_runs ORDER BY created_at DESC LIMIT ?", [safeLimit]);

  return rows.map(mapScheduledJobRun);
}

export async function getLatestScheduledJobRun(kind?: ScheduledJobRunKind) {
  const row = kind
    ? await dbGet("SELECT * FROM scheduled_job_runs WHERE kind = ? ORDER BY created_at DESC LIMIT 1", [kind])
    : await dbGet("SELECT * FROM scheduled_job_runs ORDER BY created_at DESC LIMIT 1");
  return row ? mapScheduledJobRun(row) : null;
}

export async function recordScheduledJobRun(input: RecordScheduledJobRunInput): Promise<ScheduledJobRun> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await dbRun(
    `
      INSERT INTO scheduled_job_runs (
        id, kind, status, summary, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      input.kind,
      input.status,
      input.summary,
      JSON.stringify(input.metadata ?? {}),
      createdAt,
    ],
  );

  const created = await dbGet("SELECT * FROM scheduled_job_runs WHERE id = ?", [id]);
  if (!created) {
    throw new Error(`Scheduled job run ${id} was not readable after insert.`);
  }

  return mapScheduledJobRun(created);
}
