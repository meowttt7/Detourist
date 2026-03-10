import { getPendingDailyDigestCount } from "@/lib/digests";
import { getAllEmailDeliveries } from "@/lib/email-delivery-store";
import { sendSigninLink } from "@/lib/signin-links";
import type { EmailDelivery, UserRecord } from "@/lib/types";
import { getAllUsers, getUserByEmail, upsertUser } from "@/lib/user-store";

type SmokeState = "ok" | "warn";

type SmokeCard = {
  key: string;
  label: string;
  value: string;
  status: SmokeState;
  note: string;
};

export type AdminSmokeSnapshot = {
  generatedAt: string;
  summary: {
    pendingDigestUsers: number;
    pendingDigestAlerts: number;
    failedDeliveries: number;
    queuedDeliveries: number;
  };
  cards: SmokeCard[];
  latestSigninDelivery: {
    recipientEmail: string;
    status: string;
    mode: string;
    createdAt: string;
  } | null;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getPendingDigestSummary(users: UserRecord[]) {
  const digestUsers = users.filter((user) => user.alertPreference === "daily_digest" && user.email && user.profileId);
  let pendingDigestUsers = 0;
  let pendingDigestAlerts = 0;

  for (const user of digestUsers) {
    const count = await getPendingDailyDigestCount(user);
    if (count > 0) {
      pendingDigestUsers += 1;
      pendingDigestAlerts += count;
    }
  }

  return {
    pendingDigestUsers,
    pendingDigestAlerts,
  };
}

function buildCard(key: string, label: string, value: string, status: SmokeState, note: string): SmokeCard {
  return { key, label, value, status, note };
}

export async function getAdminSmokeSnapshot(): Promise<AdminSmokeSnapshot> {
  const [users, emailDeliveries] = await Promise.all([
    getAllUsers(),
    getAllEmailDeliveries(),
  ]);

  const { pendingDigestUsers, pendingDigestAlerts } = await getPendingDigestSummary(users);
  const failedDeliveries = emailDeliveries.filter((delivery) => delivery.status === "failed").length;
  const queuedDeliveries = emailDeliveries.filter((delivery) => delivery.status === "queued").length;
  const signinDeliveries = emailDeliveries.filter((delivery) => delivery.kind === "signin");
  const latestSigninDelivery = signinDeliveries[0]
    ? {
        recipientEmail: signinDeliveries[0].recipientEmail,
        status: signinDeliveries[0].status,
        mode: signinDeliveries[0].mode,
        createdAt: signinDeliveries[0].createdAt,
      }
    : null;

  const cards: SmokeCard[] = [
    buildCard(
      "pending-digests",
      "Pending digest alerts",
      String(pendingDigestAlerts),
      pendingDigestAlerts > 0 ? "warn" : "ok",
      pendingDigestUsers > 0
        ? `${pendingDigestUsers} daily-digest users currently have unread eligible alerts.`
        : "No daily-digest users are currently waiting for a batch send.",
    ),
    buildCard(
      "failed-deliveries",
      "Failed deliveries",
      String(failedDeliveries),
      failedDeliveries > 0 ? "warn" : "ok",
      failedDeliveries > 0
        ? "Review failed deliveries in the admin table and retry the ones that should be recoverable."
        : "No failed email deliveries are currently recorded.",
    ),
    buildCard(
      "queued-deliveries",
      "Queued deliveries",
      String(queuedDeliveries),
      queuedDeliveries > 0 ? "warn" : "ok",
      queuedDeliveries > 0
        ? "Queued deliveries usually mean outbox mode or a delivery path that needs a retry."
        : "No queued deliveries are waiting right now.",
    ),
    buildCard(
      "signin-loop",
      "Sign-in loop",
      latestSigninDelivery ? latestSigninDelivery.status : "no data",
      latestSigninDelivery && latestSigninDelivery.status === "failed" ? "warn" : "ok",
      latestSigninDelivery
        ? `Latest sign-in email went to ${latestSigninDelivery.recipientEmail} via ${latestSigninDelivery.mode}.`
        : "No sign-in delivery has been recorded yet in this environment.",
    ),
  ];

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      pendingDigestUsers,
      pendingDigestAlerts,
      failedDeliveries,
      queuedDeliveries,
    },
    cards,
    latestSigninDelivery,
  };
}

export async function sendAdminTestSigninLink(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  if (!emailPattern.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  const existingUser = await getUserByEmail(email);
  const user = existingUser ?? await upsertUser({
    email,
    waitlistStatus: "not_joined",
  });

  const delivery = await sendSigninLink({
    user,
    email,
    requestedProfileId: user.profileId ?? null,
  });

  return {
    recipientEmail: delivery.recipientEmail,
    mode: delivery.mode,
    status: delivery.status,
    createdAt: delivery.createdAt,
  };
}
