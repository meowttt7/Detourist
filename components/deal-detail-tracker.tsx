"use client";

import { useEffect } from "react";

import { trackDealEvent } from "@/lib/tracking-client";

type DealDetailTrackerProps = {
  dealId: string;
  dealSlug: string;
};

export function DealDetailTracker({ dealId, dealSlug }: DealDetailTrackerProps) {
  useEffect(() => {
    void trackDealEvent({
      type: "detail_view",
      dealId,
      dealSlug,
      surface: "detail-page",
    });
  }, [dealId, dealSlug]);

  return null;
}
