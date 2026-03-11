export type DealType = "flight" | "hotel";

export type Deal = {
  id: string;
  slug: string;
  type: DealType;
  title: string;
  summary: string;
  origin: string;
  destination: string;
  destinationRegion: string;
  cabin: string;
  airlineOrBrand: string;
  currentPrice: number;
  referencePrice: number;
  currency: string;
  stops: number;
  totalDurationHours: number;
  overnight: boolean;
  repositionRequired: boolean;
  repositionFrom?: string;
  catchSummary: string;
  whyWorthIt: string;
  bookingUrl: string;
  publishedAt: string;
  expiresAt: string;
  tags: string[];
};

export type TravelerProfile = {
  homeAirports: string[];
  repositionRegions: string[];
  preferredCabins: string[];
  maxStops: number;
  allowOvernight: boolean;
  maxTravelPain: number;
  destinationInterests: string[];
  budgetMax: number;
  tripStyles: string[];
};

export type StoredTravelerProfile = TravelerProfile & {
  id: string;
  savedDealIds: string[];
  hiddenDealIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type AlertNotificationPreference = "instant" | "daily_digest" | "paused";

export type UserRecord = {
  id: string;
  email: string | null;
  profileId: string | null;
  waitlistStatus: "joined" | "not_joined";
  waitlistSources: string[];
  alertPreference: AlertNotificationPreference;
  createdAt: string;
  updatedAt: string;
};

export type AlertChannel = "email" | "in_app";

export type AlertStatus = "new" | "viewed";

export type DealAlert = {
  id: string;
  dealId: string;
  dealSlug: string;
  dealTitle: string;
  profileId: string;
  userId: string | null;
  score: number;
  matchLabel: string;
  reasonSummary: string;
  channel: AlertChannel;
  status: AlertStatus;
  digestDeliveryId: string | null;
  digestedAt: string | null;
  createdAt: string;
  viewedAt: string | null;
};

export type EmailDeliveryMode = "smtp" | "outbox";

export type EmailDeliveryStatus = "sent" | "queued" | "failed";

export type EmailDeliveryKind = "alert" | "signin" | "digest";

export type EmailDeliveryMetadata = {
  requestedProfileId?: string | null;
  profileId?: string | null;
  alertIds?: string[];
  alertCount?: number;
};

export type EmailDelivery = {
  id: string;
  kind: EmailDeliveryKind;
  referenceId: string;
  userId: string | null;
  recipientEmail: string;
  subject: string;
  mode: EmailDeliveryMode;
  status: EmailDeliveryStatus;
  retryCount: number;
  metadata: EmailDeliveryMetadata;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
};

export type ScheduledJobRunKind = "daily_digest_schedule" | "amadeus_auth_probe";

export type ScheduledJobRunStatus = "success" | "skipped" | "failed" | "unauthorized";

export type ScheduledJobRunMetadata = {
  provider?: string;
  baseUrl?: string;
  amadeusEnvironment?: string;
  authState?: string;
  tokenExpiresInSeconds?: number;
  method?: string;
  errorMessage?: string | null;
  force?: boolean;
  scheduleDate?: string;
  scheduleLabel?: string;
  eligibleUsers?: number;
  usersProcessed?: number;
  digestsCreated?: number;
  skippedForCadence?: number;
  skippedForWindow?: number;
  deliveries?: {
    sent: number;
    queued: number;
    failed: number;
  };
};

export type ScheduledJobRun = {
  id: string;
  kind: ScheduledJobRunKind;
  status: ScheduledJobRunStatus;
  summary: string;
  metadata: ScheduledJobRunMetadata;
  createdAt: string;
};

export type DealEventType = "detail_view" | "booking_click" | "save_deal" | "hide_deal";

export type DealEvent = {
  id: string;
  type: DealEventType;
  dealId: string;
  dealSlug?: string;
  userId: string | null;
  profileId: string | null;
  surface: string;
  createdAt: string;
};

export type DealScore = {
  score: number;
  matchLabel: string;
  savingsPercent: number;
  painScore: number;
  reasons: string[];
  warnings: string[];
};
