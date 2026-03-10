const fallbackAppUrl = "http://localhost:3000";

export function getDetouristAppUrl() {
  return (process.env.DETOURIST_APP_URL?.trim() || fallbackAppUrl).replace(/\/$/, "");
}

export function buildDetouristUrl(pathname = "/") {
  return new URL(pathname, `${getDetouristAppUrl()}/`);
}

