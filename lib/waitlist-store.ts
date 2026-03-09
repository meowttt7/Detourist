import { getDb } from "@/lib/db";

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
  const db = getDb();
  const rows = db.prepare("SELECT email, created_at, source FROM waitlist_entries ORDER BY created_at DESC").all() as Record<string, unknown>[];
  return rows.map(mapWaitlistEntry);
}

export async function addToWaitlist(email: string, source = "landing-page") {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare("SELECT email, created_at, source FROM waitlist_entries WHERE email = ?").get(normalizedEmail) as Record<string, unknown> | undefined;

  if (existing) {
    return { status: "existing" as const, entry: mapWaitlistEntry(existing) };
  }

  const nextEntry: WaitlistEntry = {
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    source,
  };

  db.prepare("INSERT INTO waitlist_entries (email, created_at, source) VALUES (?, ?, ?)").run(
    nextEntry.email,
    nextEntry.createdAt,
    nextEntry.source,
  );

  return { status: "created" as const, entry: nextEntry };
}
