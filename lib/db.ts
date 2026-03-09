import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "detourist.sqlite");

let database: DatabaseSync | null = null;

function readJsonArray<T>(fileName: string): T[] {
  const filePath = path.join(dataDir, fileName);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function getTableCount(db: DatabaseSync, tableName: string) {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as { count?: number } | undefined;
  return Number(row?.count ?? 0);
}

function runInTransaction(db: DatabaseSync, callback: () => void) {
  db.exec("BEGIN");
  try {
    callback();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function tableHasColumn(db: DatabaseSync, tableName: string, columnName: string) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<Record<string, unknown>>;
  return rows.some((row) => String(row.name) === columnName);
}

function runMigrations(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      destination_region TEXT NOT NULL,
      cabin TEXT NOT NULL,
      airline_or_brand TEXT NOT NULL,
      current_price REAL NOT NULL,
      reference_price REAL NOT NULL,
      currency TEXT NOT NULL,
      stops INTEGER NOT NULL,
      total_duration_hours REAL NOT NULL,
      overnight INTEGER NOT NULL,
      reposition_required INTEGER NOT NULL,
      reposition_from TEXT,
      catch_summary TEXT NOT NULL,
      why_worth_it TEXT NOT NULL,
      booking_url TEXT NOT NULL,
      published_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      tags_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS waitlist_entries (
      email TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      source TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      home_airports_json TEXT NOT NULL,
      reposition_regions_json TEXT NOT NULL,
      preferred_cabins_json TEXT NOT NULL,
      max_stops INTEGER NOT NULL,
      allow_overnight INTEGER NOT NULL,
      max_travel_pain INTEGER NOT NULL,
      destination_interests_json TEXT NOT NULL,
      budget_max REAL NOT NULL,
      trip_styles_json TEXT NOT NULL,
      saved_deal_ids_json TEXT NOT NULL,
      hidden_deal_ids_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      profile_id TEXT,
      waitlist_status TEXT NOT NULL,
      waitlist_sources_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      deal_id TEXT NOT NULL,
      deal_slug TEXT,
      user_id TEXT,
      profile_id TEXT,
      surface TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL,
      deal_slug TEXT NOT NULL,
      deal_title TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      user_id TEXT,
      score INTEGER NOT NULL,
      match_label TEXT NOT NULL,
      reason_summary TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      digest_delivery_id TEXT,
      digested_at TEXT,
      created_at TEXT NOT NULL,
      viewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS email_deliveries (
      id TEXT PRIMARY KEY,
      alert_id TEXT NOT NULL UNIQUE,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL,
      sent_at TEXT
    );

    CREATE TABLE IF NOT EXISTS user_auth_tokens (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      requested_profile_id TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_profile_deal ON alerts (profile_id, deal_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts (user_id);
    CREATE INDEX IF NOT EXISTS idx_email_deliveries_created_at ON email_deliveries (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_deliveries_status ON email_deliveries (status);
    CREATE INDEX IF NOT EXISTS idx_user_auth_tokens_hash ON user_auth_tokens (token_hash);
    CREATE INDEX IF NOT EXISTS idx_user_auth_tokens_user_id ON user_auth_tokens (user_id);
    CREATE INDEX IF NOT EXISTS idx_user_auth_tokens_expires_at ON user_auth_tokens (expires_at);
    CREATE INDEX IF NOT EXISTS idx_deals_published_at ON deals (published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_deals_slug ON deals (slug);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_deal_id ON events (deal_id);
    CREATE INDEX IF NOT EXISTS idx_users_profile_id ON users (profile_id);
  `);

  if (!tableHasColumn(db, "users", "alert_preference")) {
    db.exec("ALTER TABLE users ADD COLUMN alert_preference TEXT NOT NULL DEFAULT 'instant'");
  }

  if (!tableHasColumn(db, "alerts", "digest_delivery_id")) {
    db.exec("ALTER TABLE alerts ADD COLUMN digest_delivery_id TEXT");
  }

  if (!tableHasColumn(db, "alerts", "digested_at")) {
    db.exec("ALTER TABLE alerts ADD COLUMN digested_at TEXT");
  }

  if (!tableHasColumn(db, "email_deliveries", "kind")) {
    db.exec("ALTER TABLE email_deliveries ADD COLUMN kind TEXT NOT NULL DEFAULT 'alert'");
  }

  if (!tableHasColumn(db, "email_deliveries", "user_id")) {
    db.exec("ALTER TABLE email_deliveries ADD COLUMN user_id TEXT");
  }

  if (!tableHasColumn(db, "email_deliveries", "retry_count")) {
    db.exec("ALTER TABLE email_deliveries ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0");
  }

  if (!tableHasColumn(db, "email_deliveries", "metadata_json")) {
    db.exec("ALTER TABLE email_deliveries ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'");
  }
}

function seedFromJson(db: DatabaseSync) {
  const dealCount = getTableCount(db, "deals");
  if (dealCount === 0) {
    const deals = readJsonArray<any>("deals.json");
    const insert = db.prepare(`
      INSERT INTO deals (
        id, slug, type, title, summary, origin, destination, destination_region, cabin,
        airline_or_brand, current_price, reference_price, currency, stops,
        total_duration_hours, overnight, reposition_required, reposition_from,
        catch_summary, why_worth_it, booking_url, published_at, expires_at, tags_json
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    runInTransaction(db, () => {
      for (const deal of deals) {
        insert.run(
          deal.id,
          deal.slug,
          deal.type,
          deal.title,
          deal.summary,
          deal.origin,
          deal.destination,
          deal.destinationRegion,
          deal.cabin,
          deal.airlineOrBrand,
          deal.currentPrice,
          deal.referencePrice,
          deal.currency,
          deal.stops,
          deal.totalDurationHours,
          deal.overnight ? 1 : 0,
          deal.repositionRequired ? 1 : 0,
          deal.repositionFrom ?? null,
          deal.catchSummary,
          deal.whyWorthIt,
          deal.bookingUrl,
          deal.publishedAt,
          deal.expiresAt,
          JSON.stringify(deal.tags ?? []),
        );
      }
    });
  }

  const waitlistCount = getTableCount(db, "waitlist_entries");
  if (waitlistCount === 0) {
    const entries = readJsonArray<any>("waitlist.json");
    const insert = db.prepare("INSERT INTO waitlist_entries (email, created_at, source) VALUES (?, ?, ?)");
    runInTransaction(db, () => {
      for (const entry of entries) {
        insert.run(entry.email, entry.createdAt, entry.source);
      }
    });
  }

  const profileCount = getTableCount(db, "profiles");
  if (profileCount === 0) {
    const profiles = readJsonArray<any>("profiles.json");
    const insert = db.prepare(`
      INSERT INTO profiles (
        id, home_airports_json, reposition_regions_json, preferred_cabins_json,
        max_stops, allow_overnight, max_travel_pain, destination_interests_json,
        budget_max, trip_styles_json, saved_deal_ids_json, hidden_deal_ids_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    runInTransaction(db, () => {
      for (const profile of profiles) {
        insert.run(
          profile.id,
          JSON.stringify(profile.homeAirports ?? []),
          JSON.stringify(profile.repositionRegions ?? []),
          JSON.stringify(profile.preferredCabins ?? []),
          profile.maxStops,
          profile.allowOvernight ? 1 : 0,
          profile.maxTravelPain,
          JSON.stringify(profile.destinationInterests ?? []),
          profile.budgetMax,
          JSON.stringify(profile.tripStyles ?? []),
          JSON.stringify(profile.savedDealIds ?? []),
          JSON.stringify(profile.hiddenDealIds ?? []),
          profile.createdAt,
          profile.updatedAt,
        );
      }
    });
  }

  const userCount = getTableCount(db, "users");
  if (userCount === 0) {
    const users = readJsonArray<any>("users.json");
    const insert = db.prepare(`
      INSERT INTO users (
        id, email, profile_id, waitlist_status, waitlist_sources_json, alert_preference, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    runInTransaction(db, () => {
      for (const user of users) {
        insert.run(
          user.id,
          user.email ?? null,
          user.profileId ?? null,
          user.waitlistStatus,
          JSON.stringify(user.waitlistSources ?? []),
          user.alertPreference ?? "instant",
          user.createdAt,
          user.updatedAt,
        );
      }
    });
  }

  const eventCount = getTableCount(db, "events");
  if (eventCount === 0) {
    const events = readJsonArray<any>("events.json");
    const insert = db.prepare(`
      INSERT INTO events (
        id, type, deal_id, deal_slug, user_id, profile_id, surface, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    runInTransaction(db, () => {
      for (const event of events) {
        insert.run(
          event.id,
          event.type,
          event.dealId,
          event.dealSlug ?? null,
          event.userId ?? null,
          event.profileId ?? null,
          event.surface,
          event.createdAt,
        );
      }
    });
  }
}

export function getDb() {
  if (!database) {
    fs.mkdirSync(dataDir, { recursive: true });
    database = new DatabaseSync(dbPath);
    runMigrations(database);
    seedFromJson(database);
  }

  return database;
}
