import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { Deal } from "@/lib/types";

const dealsPath = path.join(process.cwd(), "data", "deals.json");

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

async function readDeals(): Promise<Deal[]> {
  try {
    const file = await fs.readFile(dealsPath, "utf8");
    const parsed = JSON.parse(file);
    return Array.isArray(parsed) ? (parsed as Deal[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeDeals(deals: Deal[]) {
  await fs.mkdir(path.dirname(dealsPath), { recursive: true });
  await fs.writeFile(dealsPath, JSON.stringify(deals, null, 2), "utf8");
}

export async function getAllDeals() {
  const deals = await readDeals();
  return deals.sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

export async function getDealBySlug(slug: string) {
  const deals = await readDeals();
  return deals.find((deal) => deal.slug === slug) ?? null;
}

export async function addDeal(input: Omit<Deal, "id" | "slug" | "publishedAt">) {
  const deals = await readDeals();
  const baseSlug = slugify(`${input.origin}-${input.destination}-${input.title}`);
  let slug = baseSlug;
  let suffix = 2;

  while (deals.some((deal) => deal.slug === slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const nextDeal: Deal = {
    ...input,
    id: crypto.randomUUID(),
    slug,
    publishedAt: new Date().toISOString(),
  };

  deals.push(nextDeal);
  await writeDeals(deals);

  return nextDeal;
}
