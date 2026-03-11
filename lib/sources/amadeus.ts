import type { FlightOfferSearchInput } from "@/lib/sources/types";

type AmadeusAccessTokenResponse = {
  access_token: string;
  expires_in: number;
};

type AmadeusFlightOfferResponse = {
  data: Array<Record<string, unknown>>;
  dictionaries?: {
    carriers?: Record<string, string>;
  };
};

type AmadeusConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
};

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

type AccessTokenRequestOptions = {
  forceRefresh?: boolean;
  signal?: AbortSignal;
};

export type AmadeusConfigStatus = {
  baseUrl: string;
  environment: "production" | "test";
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  authState: "configured" | "partial" | "missing";
};

export type AmadeusAuthProbeResult = {
  baseUrl: string;
  environment: "production" | "test";
  expiresInSeconds: number;
};

let cachedToken: CachedToken | null = null;

function getAmadeusEnvironment(environment: string | undefined): "production" | "test" {
  return environment?.trim().toLowerCase() === "production" ? "production" : "test";
}

function getAmadeusBaseUrl(environment: string | undefined) {
  return getAmadeusEnvironment(environment) === "production"
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com";
}

export function getAmadeusConfigStatus(): AmadeusConfigStatus {
  const clientIdConfigured = Boolean(process.env.DETOURIST_AMADEUS_CLIENT_ID?.trim());
  const clientSecretConfigured = Boolean(process.env.DETOURIST_AMADEUS_CLIENT_SECRET?.trim());
  const environment = getAmadeusEnvironment(process.env.DETOURIST_AMADEUS_ENV);
  const authState = clientIdConfigured && clientSecretConfigured
    ? "configured"
    : clientIdConfigured || clientSecretConfigured
      ? "partial"
      : "missing";

  return {
    baseUrl: getAmadeusBaseUrl(process.env.DETOURIST_AMADEUS_ENV),
    environment,
    clientIdConfigured,
    clientSecretConfigured,
    authState,
  };
}

export function getAmadeusConfig(): AmadeusConfig | null {
  const clientId = process.env.DETOURIST_AMADEUS_CLIENT_ID?.trim();
  const clientSecret = process.env.DETOURIST_AMADEUS_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    baseUrl: getAmadeusBaseUrl(process.env.DETOURIST_AMADEUS_ENV),
    clientId,
    clientSecret,
  };
}

function buildTokenBody(config: AmadeusConfig) {
  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", config.clientId);
  body.set("client_secret", config.clientSecret);
  return body;
}

async function requestAccessToken(config: AmadeusConfig, options: AccessTokenRequestOptions = {}) {
  if (!options.forceRefresh && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return {
      accessToken: cachedToken.accessToken,
      expiresInSeconds: Math.max(0, Math.floor((cachedToken.expiresAt - Date.now()) / 1000)),
    };
  }

  const response = await fetch(`${config.baseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: buildTokenBody(config),
    cache: "no-store",
    signal: options.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Amadeus auth failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as AmadeusAccessTokenResponse;
  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };

  return {
    accessToken: payload.access_token,
    expiresInSeconds: payload.expires_in,
  };
}

async function getAccessToken(config: AmadeusConfig) {
  const token = await requestAccessToken(config);
  return token.accessToken;
}

export async function probeAmadeusAuth(): Promise<AmadeusAuthProbeResult> {
  const config = getAmadeusConfig();
  if (!config) {
    throw new Error("Amadeus credentials are not configured.");
  }

  const signal = typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(10_000) : undefined;
  const token = await requestAccessToken(config, {
    forceRefresh: true,
    signal,
  });

  return {
    baseUrl: config.baseUrl,
    environment: getAmadeusEnvironment(process.env.DETOURIST_AMADEUS_ENV),
    expiresInSeconds: token.expiresInSeconds,
  };
}

function buildFlightOfferQuery(input: FlightOfferSearchInput) {
  const query = new URLSearchParams();
  query.set("originLocationCode", input.originLocationCode);
  query.set("destinationLocationCode", input.destinationLocationCode);
  query.set("departureDate", input.departureDate);
  query.set("adults", String(input.adults));
  query.set("travelClass", input.travelClass);
  query.set("nonStop", input.nonStop ? "true" : "false");
  query.set("max", String(input.max ?? 6));

  if (input.returnDate) {
    query.set("returnDate", input.returnDate);
  }

  if (input.maxPrice) {
    query.set("maxPrice", String(input.maxPrice));
  }

  if (input.currencyCode) {
    query.set("currencyCode", input.currencyCode);
  }

  return query;
}

export async function searchAmadeusFlightOffers(input: FlightOfferSearchInput): Promise<AmadeusFlightOfferResponse> {
  const config = getAmadeusConfig();
  if (!config) {
    throw new Error("Amadeus credentials are not configured.");
  }

  const accessToken = await getAccessToken(config);
  const query = buildFlightOfferQuery(input);
  const response = await fetch(`${config.baseUrl}/v2/shopping/flight-offers?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Amadeus flight search failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as AmadeusFlightOfferResponse;
}
