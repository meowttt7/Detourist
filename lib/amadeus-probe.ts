import { recordScheduledJobRun } from "@/lib/scheduled-job-run-store";
import { getAmadeusConfigStatus, probeAmadeusAuth } from "@/lib/sources/amadeus";

export async function runAmadeusAuthProbe() {
  const readiness = getAmadeusConfigStatus();

  if (readiness.authState !== "configured") {
    const summary = readiness.authState === "partial"
      ? "Amadeus auth probe could not run because credentials are incomplete."
      : "Amadeus auth probe could not run because credentials are missing.";

    return recordScheduledJobRun({
      kind: "amadeus_auth_probe",
      status: "failed",
      summary,
      metadata: {
        provider: "amadeus",
        baseUrl: readiness.baseUrl,
        amadeusEnvironment: readiness.environment,
        authState: readiness.authState,
        errorMessage: summary,
      },
    });
  }

  try {
    const result = await probeAmadeusAuth();

    return recordScheduledJobRun({
      kind: "amadeus_auth_probe",
      status: "success",
      summary: `Amadeus auth probe succeeded against ${result.environment}.`,
      metadata: {
        provider: "amadeus",
        baseUrl: result.baseUrl,
        amadeusEnvironment: result.environment,
        authState: readiness.authState,
        tokenExpiresInSeconds: result.expiresInSeconds,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Amadeus auth probe failed.";

    return recordScheduledJobRun({
      kind: "amadeus_auth_probe",
      status: "failed",
      summary: "Amadeus auth probe failed.",
      metadata: {
        provider: "amadeus",
        baseUrl: readiness.baseUrl,
        amadeusEnvironment: readiness.environment,
        authState: readiness.authState,
        errorMessage: message,
      },
    });
  }
}
