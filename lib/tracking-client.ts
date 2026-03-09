import { DealEventType } from "@/lib/types";

type TrackDealEventInput = {
  type: DealEventType;
  dealId: string;
  dealSlug?: string;
  surface: string;
};

export async function trackDealEvent(input: TrackDealEventInput) {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    // Tracking should never block the product UX.
  }
}
