type DigestScheduleConfig = {
  hour: number;
  timeZone: string;
  cronSecret: string | null;
};

function normalizeHour(value: string | undefined) {
  const parsed = Number(value ?? "8");
  if (!Number.isFinite(parsed)) {
    return 8;
  }

  return Math.min(23, Math.max(0, Math.trunc(parsed)));
}

export function getDigestScheduleConfig(): DigestScheduleConfig {
  return {
    hour: normalizeHour(process.env.DETOURIST_DIGEST_HOUR),
    timeZone: process.env.DETOURIST_DIGEST_TIMEZONE ?? "UTC",
    cronSecret: process.env.DETOURIST_CRON_SECRET ?? null,
  };
}

export function formatDigestScheduleLabel() {
  const config = getDigestScheduleConfig();
  return `${String(config.hour).padStart(2, "0")}:00 ${config.timeZone}`;
}
