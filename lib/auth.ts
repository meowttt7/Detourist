import crypto from "node:crypto";

import { cookies } from "next/headers";

const adminCookieName = "detourist_admin_session";
const fallbackUsername = "admin";
const fallbackPassword = "detourist-admin";
const fallbackSecret = "detourist-dev-secret-change-me";

type AdminSessionPayload = {
  sub: "admin";
  iat: number;
};

function getSessionSecret() {
  return process.env.DETOURIST_SESSION_SECRET ?? fallbackSecret;
}

export function getAdminUsername() {
  return process.env.DETOURIST_ADMIN_USERNAME ?? fallbackUsername;
}

export function getAdminPassword() {
  return process.env.DETOURIST_ADMIN_PASSWORD ?? fallbackPassword;
}

export function usingFallbackAdminCredentials() {
  return !process.env.DETOURIST_ADMIN_USERNAME || !process.env.DETOURIST_ADMIN_PASSWORD;
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createAdminSessionToken() {
  const payload: AdminSessionPayload = {
    sub: "admin",
    iat: Date.now(),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string) {
  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    return false;
  }

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(provided, expected)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AdminSessionPayload;
    return payload.sub === "admin";
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName)?.value;
  if (!token) {
    return false;
  }

  return verifyAdminSessionToken(token);
}

export function getAdminCookieName() {
  return adminCookieName;
}
