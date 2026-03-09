"use client";

import { trackDealEvent } from "@/lib/tracking-client";

type DealBookingButtonProps = {
  href: string;
  dealId: string;
  dealSlug: string;
  label: string;
  className?: string;
  surface: string;
};

export function DealBookingButton({ href, dealId, dealSlug, label, className, surface }: DealBookingButtonProps) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        void trackDealEvent({
          type: "booking_click",
          dealId,
          dealSlug,
          surface,
        });
      }}
    >
      {label}
    </a>
  );
}
