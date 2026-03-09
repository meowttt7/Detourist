import { backfillAlerts } from "@/lib/alerts";
import { getAlertsForProfile, markAlertViewed } from "@/lib/alert-store";
import { getAllDeals } from "@/lib/deal-store";
import { addDealEvent, getAllEvents } from "@/lib/event-store";
import { upsertProfile } from "@/lib/profile-store";
import { getUserByEmail, upsertUser } from "@/lib/user-store";
import { addToWaitlist } from "@/lib/waitlist-store";

const demoEmails = {
  kai: "kai@demo.detourist",
  maya: "maya@demo.detourist",
  noa: "noa@demo.detourist",
};

function existingDealIds(candidates: string[], dealIds: Set<string>) {
  return candidates.filter((id) => dealIds.has(id));
}

export async function seedDemoData() {
  const existingDemoUser = await getUserByEmail(demoEmails.kai);
  if (existingDemoUser) {
    return {
      status: "existing" as const,
      message: "Demo mode has already been seeded.",
      created: {
        profiles: 0,
        linkedUsers: 0,
        waitlistOnlyUsers: 0,
        events: 0,
        alerts: 0,
        deliveries: { sent: 0, queued: 0, failed: 0 },
      },
    };
  }

  const deals = await getAllDeals();
  const dealIds = new Set(deals.map((deal) => deal.id));

  const kaiProfile = await upsertProfile("demo-profile-kai", {
    homeAirports: ["SIN", "KUL"],
    repositionRegions: ["Southeast Asia", "Middle East"],
    preferredCabins: ["Business", "First"],
    maxStops: 1,
    allowOvernight: true,
    maxTravelPain: 8,
    destinationInterests: ["Europe", "North Asia", "Tokyo"],
    budgetMax: 2600,
    tripStyles: ["Flexible luxury", "Premium long-haul"],
    savedDealIds: existingDealIds(["deal-001", "deal-002"], dealIds),
    hiddenDealIds: [],
  });

  const mayaProfile = await upsertProfile("demo-profile-maya", {
    homeAirports: ["SYD"],
    repositionRegions: ["Australia", "Southeast Asia"],
    preferredCabins: ["Business"],
    maxStops: 2,
    allowOvernight: false,
    maxTravelPain: 7,
    destinationInterests: ["Europe", "Rome"],
    budgetMax: 2900,
    tripStyles: ["Long-haul value", "Shoulder-season trips"],
    savedDealIds: existingDealIds(["deal-003"], dealIds),
    hiddenDealIds: existingDealIds(["deal-004"], dealIds),
  });

  const renProfile = await upsertProfile("demo-profile-ren", {
    homeAirports: ["BKK", "HKG"],
    repositionRegions: ["Southeast Asia"],
    preferredCabins: ["Luxury", "Business"],
    maxStops: 1,
    allowOvernight: false,
    maxTravelPain: 5,
    destinationInterests: ["Southeast Asia", "Bangkok"],
    budgetMax: 450,
    tripStyles: ["City breaks", "Luxury stays"],
    savedDealIds: existingDealIds(["deal-004"], dealIds),
    hiddenDealIds: existingDealIds(["deal-003"], dealIds),
  });

  await addToWaitlist(demoEmails.kai, "demo-seed");
  await addToWaitlist(demoEmails.maya, "demo-seed");
  await addToWaitlist(demoEmails.noa, "demo-seed");

  await upsertUser({
    id: "demo-user-kai",
    email: demoEmails.kai,
    profileId: kaiProfile.id,
    waitlistStatus: "joined",
    waitlistSource: "demo-seed",
  });

  await upsertUser({
    id: "demo-user-maya",
    email: demoEmails.maya,
    profileId: mayaProfile.id,
    waitlistStatus: "joined",
    waitlistSource: "demo-seed",
  });

  await upsertUser({
    id: "demo-user-noa",
    email: demoEmails.noa,
    profileId: null,
    waitlistStatus: "joined",
    waitlistSource: "demo-seed",
  });

  const { createdCount, deliveries } = await backfillAlerts();

  const demoEvents = await getAllEvents();
  const hasDemoEvents = demoEvents.some((event) => event.surface.startsWith("demo-seed"));
  let createdEvents = 0;

  if (!hasDemoEvents) {
    const eventInputs = [
      { type: "detail_view" as const, dealId: "deal-001", dealSlug: "sin-cdg-qatar-business-spring-window", userId: "demo-user-kai", profileId: kaiProfile.id, surface: "demo-seed:feed" },
      { type: "save_deal" as const, dealId: "deal-001", dealSlug: "sin-cdg-qatar-business-spring-window", userId: "demo-user-kai", profileId: kaiProfile.id, surface: "demo-seed:feed" },
      { type: "booking_click" as const, dealId: "deal-001", dealSlug: "sin-cdg-qatar-business-spring-window", userId: "demo-user-kai", profileId: kaiProfile.id, surface: "demo-seed:detail" },
      { type: "detail_view" as const, dealId: "deal-002", dealSlug: "kul-hnd-jal-first-positioning-play", userId: "demo-user-kai", profileId: kaiProfile.id, surface: "demo-seed:feed" },
      { type: "detail_view" as const, dealId: "deal-003", dealSlug: "syd-fco-turkish-business-double-stop-play", userId: "demo-user-maya", profileId: mayaProfile.id, surface: "demo-seed:feed" },
      { type: "save_deal" as const, dealId: "deal-003", dealSlug: "syd-fco-turkish-business-double-stop-play", userId: "demo-user-maya", profileId: mayaProfile.id, surface: "demo-seed:detail" },
      { type: "hide_deal" as const, dealId: "deal-004", dealSlug: "bkk-riverside-suite-soft-opening-stack", userId: "demo-user-maya", profileId: mayaProfile.id, surface: "demo-seed:feed" },
      { type: "detail_view" as const, dealId: "deal-004", dealSlug: "bkk-riverside-suite-soft-opening-stack", userId: null, profileId: renProfile.id, surface: "demo-seed:feed" },
      { type: "save_deal" as const, dealId: "deal-004", dealSlug: "bkk-riverside-suite-soft-opening-stack", userId: null, profileId: renProfile.id, surface: "demo-seed:detail" },
    ].filter((event) => dealIds.has(event.dealId));

    for (const event of eventInputs) {
      await addDealEvent(event);
      createdEvents += 1;
    }
  }

  const kaiAlerts = await getAlertsForProfile(kaiProfile.id);
  if (kaiAlerts[0]) {
    await markAlertViewed(kaiAlerts[0].id, kaiProfile.id);
  }

  const renAlerts = await getAlertsForProfile(renProfile.id);
  if (renAlerts[0]) {
    await markAlertViewed(renAlerts[0].id, renProfile.id);
  }

  return {
    status: "created" as const,
    message: "Demo mode seeded successfully.",
    created: {
      profiles: 3,
      linkedUsers: 2,
      waitlistOnlyUsers: 1,
      events: createdEvents,
      alerts: createdCount,
      deliveries,
    },
  };
}
