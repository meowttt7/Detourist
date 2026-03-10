import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { getImportedDealDraftsWithReview } from "@/lib/import-draft-review";
import { deleteImportedDealDraft, saveImportedDealDraft } from "@/lib/import-draft-store";
import type { ImportedDealCandidate } from "@/lib/sources/types";

function normalizeCandidate(body: Record<string, unknown>): ImportedDealCandidate | null {
  const payload = body.payload;
  const reviewNotes = body.reviewNotes;

  if (
    typeof body.source !== "string"
    || typeof body.sourceLabel !== "string"
    || typeof body.sourceSummary !== "string"
    || !Array.isArray(reviewNotes)
    || !payload
    || typeof payload !== "object"
  ) {
    return null;
  }

  return {
    id: String(body.id ?? ""),
    source: body.source === "amadeus" ? "amadeus" : "amadeus",
    sourceLabel: body.sourceLabel.trim(),
    sourceSummary: body.sourceSummary.trim(),
    reviewNotes: reviewNotes.map((note) => String(note)).filter(Boolean),
    payload: payload as ImportedDealCandidate["payload"],
  };
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const drafts = await getImportedDealDraftsWithReview();
  return NextResponse.json({ drafts }, { status: 200 });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const candidate = normalizeCandidate(body);

    if (!candidate || !candidate.payload.title || !candidate.payload.origin || !candidate.payload.destination) {
      return NextResponse.json({ error: "A valid import candidate is required." }, { status: 400 });
    }

    const draft = await saveImportedDealDraft(candidate);
    return NextResponse.json({ draft }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save import draft." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json({ error: "Draft id is required." }, { status: 400 });
  }

  await deleteImportedDealDraft(id);
  return NextResponse.json({ success: true }, { status: 200 });
}
