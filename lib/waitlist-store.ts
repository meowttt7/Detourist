import { dbAll, dbGet, dbRun } from "@/lib/db";

export type WaitlistEntry = {
  email: string;
  createdAt: string;
  source: string;
};

function mapWaitlistEntry(row: Record<string, unknown>): WaitlistEntry {
  return {
    email: String(row.email),
    createdAt: String(row.created_at),
    source: String(row.source),
  };
}

export async function getAllWaitlistEntries() {
  const rows = await dbAll("SELECT email, created_at, source FROM waitlist_entries ORDER BY created_at DESC");
  return rows.map(mapWaitlistEntry);
}

export async function addToWaitlist(email: string, source = "landing-page") {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await dbGet("SELECT email, created_at, source FROM waitlist_entries WHERE email = ?", [normalizedEmail]);

  if (existing) {
    return { status: "existing" as const, entry: mapWaitlistEntry(existing) };
  }

  const nextEntry: WaitlistEntry = {
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    source,
  };

  await dbRun("INSERT INTO waitlist_entries (email, created_at, source) VALUES (?, ?, ?)", [
    nextEntry.email,
    nextEntry.createdAt,
    nextEntry.source,
  ]);

  return { status: "created" as const, entry: nextEntry };
}
