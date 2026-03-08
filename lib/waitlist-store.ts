import { promises as fs } from "node:fs";
import path from "node:path";

export type WaitlistEntry = {
  email: string;
  createdAt: string;
  source: string;
};

const waitlistPath = path.join(process.cwd(), "data", "waitlist.json");

async function readWaitlist(): Promise<WaitlistEntry[]> {
  try {
    const file = await fs.readFile(waitlistPath, "utf8");
    const parsed = JSON.parse(file);
    return Array.isArray(parsed) ? (parsed as WaitlistEntry[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeWaitlist(entries: WaitlistEntry[]) {
  await fs.mkdir(path.dirname(waitlistPath), { recursive: true });
  await fs.writeFile(waitlistPath, JSON.stringify(entries, null, 2), "utf8");
}

export async function addToWaitlist(email: string, source = "landing-page") {
  const normalizedEmail = email.trim().toLowerCase();
  const entries = await readWaitlist();

  const existingEntry = entries.find((entry) => entry.email === normalizedEmail);
  if (existingEntry) {
    return { status: "existing" as const, entry: existingEntry };
  }

  const nextEntry: WaitlistEntry = {
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    source,
  };

  entries.push(nextEntry);
  await writeWaitlist(entries);

  return { status: "created" as const, entry: nextEntry };
}
