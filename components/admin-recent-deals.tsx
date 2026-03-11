"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import type { DealType } from "@/lib/types";

type RecentDeal = {
  id: string;
  title: string;
  slug: string;
  type: DealType;
  publishedAt: string;
  expiresAt: string;
  currentPrice: number;
  currency: string;
};

type AdminRecentDealsProps = {
  initialDeals: RecentDeal[];
};

const typeOptions: Array<{ value: "all" | DealType; label: string }> = [
  { value: "all", label: "All types" },
  { value: "flight", label: "Flights" },
  { value: "hotel", label: "Hotels" },
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "live", label: "Live" },
  { value: "expired", label: "Expired" },
] as const;

function isExpired(expiresAt: string) {
  return Date.parse(expiresAt) <= Date.now();
}

function matchesSearch(deal: RecentDeal, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [
    deal.title,
    deal.slug,
    deal.type,
    deal.currency,
    String(deal.currentPrice),
  ].join(" ").toLowerCase();

  return haystack.includes(search);
}

export function AdminRecentDeals({ initialDeals }: AdminRecentDealsProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | DealType>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]["value"]>("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredDeals = useMemo(() => (
    initialDeals.filter((deal) => {
      if (typeFilter !== "all" && deal.type !== typeFilter) {
        return false;
      }

      if (statusFilter !== "all") {
        const expired = isExpired(deal.expiresAt);
        if (statusFilter === "live" && expired) {
          return false;
        }
        if (statusFilter === "expired" && !expired) {
          return false;
        }
      }

      return matchesSearch(deal, deferredSearch);
    })
  ), [initialDeals, typeFilter, statusFilter, deferredSearch]);

  return (
    <article className="detail-card">
      <div className="section-heading-row product-heading-row">
        <div>
          <p className="section-kicker">Recent content</p>
          <h2>Newest deals in the feed</h2>
        </div>
      </div>

      <div className="admin-delivery-toolbar">
        <label className="field-label admin-delivery-search">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="title, slug, price, type..."
          />
        </label>
        <label className="field-label admin-delivery-filter">
          Type
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "all" | DealType)}>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="field-label admin-delivery-filter">
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as (typeof statusOptions)[number]["value"])}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="support-text admin-delivery-summary">
        Showing {filteredDeals.length} of {initialDeals.length} deals.
      </p>

      <div className="admin-table">
        <div className="admin-table-head">
          <span>Deal</span>
          <span>Type</span>
          <span>Published</span>
          <span>Expires</span>
          <span>Price</span>
        </div>
        {filteredDeals.length ? (
          filteredDeals.map((deal) => (
            <div className="admin-table-row" key={deal.id}>
              <Link href={`/deals/${deal.slug}`}>{deal.title}</Link>
              <span>{deal.type}</span>
              <span>{new Date(deal.publishedAt).toLocaleDateString()}</span>
              <span>{new Date(deal.expiresAt).toLocaleDateString()}</span>
              <span>${deal.currentPrice} {deal.currency}</span>
            </div>
          ))
        ) : (
          <div className="admin-table-empty">No deals match the current filters.</div>
        )}
      </div>
    </article>
  );
}
