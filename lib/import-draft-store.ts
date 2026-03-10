import crypto from "node:crypto";

import { dbAll, dbRun } from "@/lib/db";
import type { ImportedDealCandidate, ImportedDealDraft } from "@/lib/sources/types";

function mapImportedDealDraft(row: Record<string, unknown>): ImportedDealDraft {
  return {
    id: String(row.id),
    source: row.source as ImportedDealDraft["source"],
    sourceLabel: String(row.source_label),
    sourceSummary: String(row.source_summary),
    reviewNotes: JSON.parse(String(row.review_notes_json)) as string[],
    payload: JSON.parse(String(row.payload_json)) as ImportedDealDraft["payload"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getImportedDealDrafts(limit = 24) {
  const rows = await dbAll(
    "SELECT * FROM imported_deal_drafts ORDER BY updated_at DESC LIMIT ?",
    [limit],
  );
  return rows.map(mapImportedDealDraft);
}

export async function saveImportedDealDraft(candidate: ImportedDealCandidate) {
  const now = new Date().toISOString();
  const draft: ImportedDealDraft = {
    ...candidate,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  await dbRun(
    `
      INSERT INTO imported_deal_drafts (
        id, source, source_label, source_summary, review_notes_json, payload_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      draft.id,
      draft.source,
      draft.sourceLabel,
      draft.sourceSummary,
      JSON.stringify(draft.reviewNotes),
      JSON.stringify(draft.payload),
      draft.createdAt,
      draft.updatedAt,
    ],
  );

  return draft;
}

export async function deleteImportedDealDraft(id: string) {
  await dbRun("DELETE FROM imported_deal_drafts WHERE id = ?", [id]);
}
