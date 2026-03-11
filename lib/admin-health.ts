import { usingFallbackAdminCredentials } from "@/lib/auth";
import { dbGet, getBootstrapSeedModeLabel, getDatabaseProviderLabel, shouldSeedDatabaseFromJson } from "@/lib/db";
import { formatDigestScheduleLabel, getDigestScheduleConfig } from "@/lib/digest-config";
import { getMailerConfigSummary } from "@/lib/mailer";
import { getLatestScheduledJobRun } from "@/lib/scheduled-job-run-store";
import { getAmadeusConfigStatus } from "@/lib/sources/amadeus";

type HealthState = "ok" | "warn";

type HealthCheck = {
  key: "database" | "mailer" | "scheduler" | "canonical_url" | "admin_auth" | "deal_ingestion";
  label: string;
  status: HealthState;
  summary: string;
  details: string[];
};

export type AdminHealthSnapshot = {
  generatedAt: string;
  overallStatus: HealthState;
  checks: HealthCheck[];
};

function isProductionRuntime() {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

function parseAppUrl(input: string) {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function isValidTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

async function buildDatabaseCheck(): Promise<HealthCheck> {
  const provider = getDatabaseProviderLabel();
  const details = [`provider=${provider}`];
  const hasTursoUrl = Boolean(process.env.TURSO_DATABASE_URL?.trim());
  const hasTursoToken = Boolean(process.env.TURSO_AUTH_TOKEN?.trim());
  const bootstrapSeedEnabled = shouldSeedDatabaseFromJson();
  details.push(`bootstrap_seed=${getBootstrapSeedModeLabel()}`);

  if (hasTursoUrl) {
    details.push(`turso_auth_token=${hasTursoToken ? "present" : "missing"}`);
  }

  try {
    await dbGet("SELECT 1 AS ok");

    if (provider === "local-file" && isProductionRuntime()) {
      return {
        key: "database",
        label: "Database",
        status: "warn",
        summary: "Database responds, but production appears to use local-file storage.",
        details,
      };
    }

    if (provider !== "local-file" && isProductionRuntime() && bootstrapSeedEnabled) {
      return {
        key: "database",
        label: "Database",
        status: "warn",
        summary: "Database responds, but JSON bootstrap seeding is enabled for a remote database.",
        details,
      };
    }

    if (hasTursoUrl && !hasTursoToken) {
      return {
        key: "database",
        label: "Database",
        status: "warn",
        summary: "Database responds, but TURSO_AUTH_TOKEN is missing.",
        details,
      };
    }

    return {
      key: "database",
      label: "Database",
      status: "ok",
      summary: "Database query succeeded.",
      details,
    };
  } catch (error) {
    details.push(error instanceof Error ? error.message : "Unknown database error.");
    return {
      key: "database",
      label: "Database",
      status: "warn",
      summary: "Database query failed.",
      details,
    };
  }
}

function buildMailerCheck(): HealthCheck {
  const config = getMailerConfigSummary();
  const details = [
    `mode=${config.mode}`,
    `from=${config.fromAddress}`,
    config.smtpHost ? `smtp=${config.smtpHost}:${config.smtpPort ?? "?"}` : "smtp=not-configured",
    `secure=${config.smtpSecure ? "true" : "false"}`,
    `auth=${config.smtpAuthState}`,
  ];

  if (config.mode === "outbox") {
    return {
      key: "mailer",
      label: "Mailer",
      status: isProductionRuntime() ? "warn" : "ok",
      summary: isProductionRuntime() ? "SMTP is not configured; email is only queued locally." : "SMTP is not configured; local outbox mode is active.",
      details,
    };
  }

  if (config.smtpAuthState === "partial") {
    return {
      key: "mailer",
      label: "Mailer",
      status: "warn",
      summary: "SMTP transport is configured, but auth credentials are incomplete.",
      details,
    };
  }

  if (config.smtpProviderHint === "resend" && config.smtpAuthState !== "configured") {
    return {
      key: "mailer",
      label: "Mailer",
      status: "warn",
      summary: "Resend SMTP requires auth credentials, but they are missing.",
      details,
    };
  }

  return {
    key: "mailer",
    label: "Mailer",
    status: "ok",
    summary: "SMTP delivery mode is active.",
    details,
  };
}

function buildSchedulerCheck(): HealthCheck {
  const config = getDigestScheduleConfig();
  const details = [
    `schedule=${formatDigestScheduleLabel()}`,
    `cron_secret=${config.cronSecret ? "present" : "missing"}`,
  ];

  if (!isValidTimeZone(config.timeZone)) {
    return {
      key: "scheduler",
      label: "Scheduler",
      status: "warn",
      summary: "Digest time zone is invalid.",
      details,
    };
  }

  if (!config.cronSecret) {
    return {
      key: "scheduler",
      label: "Scheduler",
      status: "warn",
      summary: "Cron secret is missing; scheduled endpoints are not protected.",
      details,
    };
  }

  return {
    key: "scheduler",
    label: "Scheduler",
    status: "ok",
    summary: "Digest schedule and cron secret are configured.",
    details,
  };
}

async function buildDealIngestionCheck(): Promise<HealthCheck> {
  const config = getAmadeusConfigStatus();
  const latestProbe = await getLatestScheduledJobRun("amadeus_auth_probe");
  const details = [
    `provider=amadeus`,
    `environment=${config.environment}`,
    `base_url=${config.baseUrl}`,
    `auth=${config.authState}`,
    `client_id=${config.clientIdConfigured ? "present" : "missing"}`,
    `client_secret=${config.clientSecretConfigured ? "present" : "missing"}`,
  ];

  if (latestProbe) {
    details.push(`last_probe=${latestProbe.status}`);
    details.push(`last_probe_at=${new Date(latestProbe.createdAt).toLocaleString()}`);
    if (typeof latestProbe.metadata.tokenExpiresInSeconds === "number") {
      details.push(`token_ttl=${latestProbe.metadata.tokenExpiresInSeconds}s`);
    }
    if (latestProbe.metadata.errorMessage) {
      details.push(`last_error=${latestProbe.metadata.errorMessage}`);
    }
  } else {
    details.push("last_probe=never");
  }

  if (config.authState === "missing") {
    return {
      key: "deal_ingestion",
      label: "Deal ingestion",
      status: "warn",
      summary: "Amadeus credentials are missing, so live fare ingestion cannot run.",
      details,
    };
  }

  if (config.authState === "partial") {
    return {
      key: "deal_ingestion",
      label: "Deal ingestion",
      status: "warn",
      summary: "Amadeus credentials are incomplete.",
      details,
    };
  }

  if (isProductionRuntime() && config.environment !== "production") {
    return {
      key: "deal_ingestion",
      label: "Deal ingestion",
      status: "warn",
      summary: "Production runtime still points to Amadeus test environment.",
      details,
    };
  }

  if (!latestProbe) {
    return {
      key: "deal_ingestion",
      label: "Deal ingestion",
      status: "warn",
      summary: "Amadeus is configured, but no auth probe has been run yet.",
      details,
    };
  }

  if (latestProbe.status !== "success") {
    return {
      key: "deal_ingestion",
      label: "Deal ingestion",
      status: "warn",
      summary: "The latest Amadeus auth probe failed.",
      details,
    };
  }

  return {
    key: "deal_ingestion",
    label: "Deal ingestion",
    status: "ok",
    summary: "Amadeus credentials and latest auth probe look healthy.",
    details,
  };
}

function buildCanonicalUrlCheck(): HealthCheck {
  const rawUrl = (process.env.DETOURIST_APP_URL ?? "http://localhost:3000").trim();
  const parsed = parseAppUrl(rawUrl);
  const details = [`app_url=${rawUrl}`];

  if (!parsed) {
    return {
      key: "canonical_url",
      label: "Canonical URL",
      status: "warn",
      summary: "DETOURIST_APP_URL is not a valid absolute URL.",
      details,
    };
  }

  const expectedHost = "www.detourist.vacations";
  if (isProductionRuntime() && parsed.host !== expectedHost) {
    return {
      key: "canonical_url",
      label: "Canonical URL",
      status: "warn",
      summary: `Production host is ${parsed.host}; expected ${expectedHost}.`,
      details,
    };
  }

  return {
    key: "canonical_url",
    label: "Canonical URL",
    status: "ok",
    summary: "App URL parses cleanly and host check passes.",
    details,
  };
}

function buildAdminAuthCheck(): HealthCheck {
  const usingFallbackCredentials = usingFallbackAdminCredentials();
  const sessionSecretConfigured = Boolean(process.env.DETOURIST_SESSION_SECRET?.trim());
  const details = [
    `fallback_credentials=${usingFallbackCredentials ? "yes" : "no"}`,
    `session_secret=${sessionSecretConfigured ? "configured" : "fallback"}`,
  ];

  if (isProductionRuntime() && (usingFallbackCredentials || !sessionSecretConfigured)) {
    return {
      key: "admin_auth",
      label: "Admin auth",
      status: "warn",
      summary: "Admin auth still relies on fallback credentials or session secret.",
      details,
    };
  }

  return {
    key: "admin_auth",
    label: "Admin auth",
    status: "ok",
    summary: "Admin auth credentials and session secret checks passed.",
    details,
  };
}

export async function getAdminHealthSnapshot(): Promise<AdminHealthSnapshot> {
  const checks: HealthCheck[] = [
    await buildDatabaseCheck(),
    buildMailerCheck(),
    buildSchedulerCheck(),
    await buildDealIngestionCheck(),
    buildCanonicalUrlCheck(),
    buildAdminAuthCheck(),
  ];

  return {
    generatedAt: new Date().toISOString(),
    overallStatus: checks.some((check) => check.status === "warn") ? "warn" : "ok",
    checks,
  };
}
