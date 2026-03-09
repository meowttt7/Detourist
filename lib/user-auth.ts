import crypto from "node:crypto";

import { cookies } from "next/headers";

import { dbGet, dbRun } from "@/lib/db";

const userSessionCookieName = "detourist_user_session";
const fallbackSecret = "detourist-dev-secret-change-me";
const magicLinkLifetimeMinutes = 20;

type UserSessionPayload = {
  sub: "user";
  uid: string;
  iat: number;
};

type StoredAuthToken = {
  userId: string;
  email: string;
  requestedProfileId: string | null;
};

function getSessionSecret() {
  return process.env.DETOURIST_SESSION_SECRET ?? fallbackSecret;
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getUserSessionCookieName() {
  return userSessionCookieName;
}

export function createUserSessionToken(userId: string) {
  const payload: UserSessionPayload = {
    sub: "user",
    uid: userId,
    iat: Date.now(),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyUserSessionToken(token: string) {
  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as UserSessionPayload;
    return payload.sub === "user" ? payload.uid : null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(userSessionCookieName)?.value;
  if (!token) {
    return null;
  }

  return verifyUserSessionToken(token);
}

export async function isUserAuthenticated() {
  return Boolean(await getAuthenticatedUserId());
}

export async function createUserMagicLinkToken(input: StoredAuthToken) {
  const rawToken = crypto.randomBytes(24).toString("base64url");
  const tokenId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + magicLinkLifetimeMinutes * 60 * 1000).toISOString();

  await dbRun(
    `
      INSERT INTO user_auth_tokens (
        id, token_hash, user_id, email, requested_profile_id, created_at, expires_at, consumed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      tokenId,
      hashToken(rawToken),
      input.userId,
      input.email,
      input.requestedProfileId,
      now.toISOString(),
      expiresAt,
      null,
    ],
  );

  return {
    tokenId,
    rawToken,
  };
}

export async function consumeUserMagicLinkToken(rawToken: string) {
  const row = await dbGet(
    `
      SELECT * FROM user_auth_tokens
      WHERE token_hash = ? AND consumed_at IS NULL
    `,
    [hashToken(rawToken)],
  );

  if (!row) {
    return null;
  }

  if (Date.parse(String(row.expires_at)) <= Date.now()) {
    return null;
  }

  const consumedAt = new Date().toISOString();
  await dbRun("UPDATE user_auth_tokens SET consumed_at = ? WHERE id = ?", [consumedAt, String(row.id)]);

  return {
    userId: String(row.user_id),
    email: String(row.email),
    requestedProfileId: row.requested_profile_id ? String(row.requested_profile_id) : null,
  };
}

export function buildSigninVerifyUrl(rawToken: string) {
  const baseUrl = (process.env.DETOURIST_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${baseUrl}/auth/verify?token=${encodeURIComponent(rawToken)}`;
}
