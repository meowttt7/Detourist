import { getDigestScheduleConfig } from "@/lib/digest-config";

function getTokenFromAuthorizationHeader(header: string | null) {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ", 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export function isScheduleWindowOpen(now: Date = new Date()) {
  const { hour, timeZone } = getDigestScheduleConfig();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    hour12: false,
    timeZone,
  });
  const parts = formatter.formatToParts(now);
  const hourPart = parts.find((part) => part.type === "hour")?.value ?? "0";
  return Number(hourPart) >= hour;
}

export function getLocalScheduleDateKey(now: Date = new Date()) {
  const { timeZone } = getDigestScheduleConfig();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  });

  return formatter.format(now);
}

export function isSameScheduledDay(firstIso: string, second: Date = new Date()) {
  return getLocalScheduleDateKey(new Date(firstIso)) === getLocalScheduleDateKey(second);
}

export function authorizeScheduledRequest(request: Request) {
  const { cronSecret } = getDigestScheduleConfig();
  if (!cronSecret) {
    return false;
  }

  const headerToken =
    request.headers.get("x-detourist-cron-secret")
    ?? getTokenFromAuthorizationHeader(request.headers.get("authorization"));
  const queryToken = new URL(request.url).searchParams.get("secret");

  return headerToken === cronSecret || queryToken === cronSecret;
}
