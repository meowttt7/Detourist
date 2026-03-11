"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import type { DealEventType } from "@/lib/types";

type RecentEvent = {
  id: string;
  type: DealEventType;
  surface: string;
  dealSlug: string | null;
  createdAt: string;
};

type AdminRecentEventsProps = {
  initialEvents: RecentEvent[];
};

const typeOptions: Array<{ value: "all" | DealEventType; label: string }> = [
  { value: "all", label: "All events" },
  { value: "detail_view", label: "Detail views" },
  { value: "booking_click", label: "Booking clicks" },
  { value: "save_deal", label: "Saves" },
  { value: "hide_deal", label: "Hides" },
];

function matchesSearch(event: RecentEvent, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [
    event.type,
    event.surface,
    event.dealSlug ?? "",
  ].join(" ").toLowerCase();

  return haystack.includes(search);
}

export function AdminRecentEvents({ initialEvents }: AdminRecentEventsProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | DealEventType>("all");
  const [surfaceFilter, setSurfaceFilter] = useState("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const surfaceOptions = useMemo(() => {
    const values = Array.from(new Set(initialEvents.map((event) => event.surface))).sort();
    return ["all", ...values];
  }, [initialEvents]);

  const filteredEvents = useMemo(() => (
    initialEvents.filter((event) => {
      if (typeFilter !== "all" && event.type !== typeFilter) {
        return false;
      }

      if (surfaceFilter !== "all" && event.surface !== surfaceFilter) {
        return false;
      }

      return matchesSearch(event, deferredSearch);
    })
  ), [initialEvents, typeFilter, surfaceFilter, deferredSearch]);

  return (
    <article className="detail-card">
      <div className="section-heading-row product-heading-row">
        <div>
          <p className="section-kicker">Recent behavior</p>
          <h2>Latest tracked actions</h2>
        </div>
      </div>

      <div className="admin-delivery-toolbar">
        <label className="field-label admin-delivery-search">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="event, surface, deal slug..."
          />
        </label>
        <label className="field-label admin-delivery-filter">
          Event
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "all" | DealEventType)}>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="field-label admin-delivery-filter">
          Surface
          <select value={surfaceFilter} onChange={(event) => setSurfaceFilter(event.target.value)}>
            {surfaceOptions.map((option) => (
              <option key={option} value={option}>{option === "all" ? "All surfaces" : option}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="support-text admin-delivery-summary">
        Showing {filteredEvents.length} of {initialEvents.length} tracked events.
      </p>

      <div className="admin-table admin-table-events">
        <div className="admin-table-head admin-table-head-events">
          <span>Event</span>
          <span>Surface</span>
          <span>Deal</span>
          <span>Time</span>
        </div>
        {filteredEvents.length ? (
          filteredEvents.map((event) => (
            <div className="admin-table-row admin-table-row-events" key={event.id}>
              <span>{event.type}</span>
              <span>{event.surface}</span>
              <span>
                {event.dealSlug ? <Link href={`/deals/${event.dealSlug}`}>{event.dealSlug}</Link> : "Unknown deal"}
              </span>
              <span>{new Date(event.createdAt).toLocaleString()}</span>
            </div>
          ))
        ) : (
          <div className="admin-table-empty">No events match the current filters.</div>
        )}
      </div>
    </article>
  );
}
