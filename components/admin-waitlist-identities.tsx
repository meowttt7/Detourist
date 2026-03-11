"use client";

import { useDeferredValue, useMemo, useState } from "react";

type WaitlistIdentity = {
  email: string;
  source: string;
  createdAt: string;
  linkageState: string;
  userId: string | null;
  profileId: string | null;
  alertPreference: string | null;
};

type AdminWaitlistIdentitiesProps = {
  initialEntries: WaitlistIdentity[];
};

const linkageOptions = [
  { value: "all", label: "All states" },
  { value: "linked_profile", label: "Linked profile" },
  { value: "account_only", label: "Account only" },
  { value: "waitlist_only", label: "Waitlist only" },
] as const;

function formatLinkage(entry: WaitlistIdentity) {
  if (entry.linkageState === "linked_profile") {
    return `User ${entry.userId} / Profile ${entry.profileId}`;
  }

  if (entry.linkageState === "account_only") {
    return `User ${entry.userId} (no profile)`;
  }

  return "Waitlist only";
}

function matchesSearch(entry: WaitlistIdentity, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [
    entry.email,
    entry.source,
    entry.linkageState,
    entry.userId ?? "",
    entry.profileId ?? "",
    entry.alertPreference ?? "",
  ].join(" ").toLowerCase();

  return haystack.includes(search);
}

export function AdminWaitlistIdentities({ initialEntries }: AdminWaitlistIdentitiesProps) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [linkageFilter, setLinkageFilter] = useState<(typeof linkageOptions)[number]["value"]>("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const sourceOptions = useMemo(() => {
    const values = Array.from(new Set(initialEntries.map((entry) => entry.source))).sort();
    return ["all", ...values];
  }, [initialEntries]);

  const filteredEntries = useMemo(() => (
    initialEntries.filter((entry) => {
      if (sourceFilter !== "all" && entry.source !== sourceFilter) {
        return false;
      }

      if (linkageFilter !== "all" && entry.linkageState !== linkageFilter) {
        return false;
      }

      return matchesSearch(entry, deferredSearch);
    })
  ), [initialEntries, sourceFilter, linkageFilter, deferredSearch]);

  return (
    <article className="detail-card">
      <div className="section-heading-row product-heading-row">
        <div>
          <p className="section-kicker">Waitlist identities</p>
          <h2>Recent signups and account linkage</h2>
        </div>
      </div>

      <div className="admin-delivery-toolbar">
        <label className="field-label admin-delivery-search">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="email, source, user id, profile id..."
          />
        </label>
        <label className="field-label admin-delivery-filter">
          Source
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            {sourceOptions.map((option) => (
              <option key={option} value={option}>{option === "all" ? "All sources" : option}</option>
            ))}
          </select>
        </label>
        <label className="field-label admin-delivery-filter">
          Linkage
          <select value={linkageFilter} onChange={(event) => setLinkageFilter(event.target.value as (typeof linkageOptions)[number]["value"])}>
            {linkageOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="support-text admin-delivery-summary">
        Showing {filteredEntries.length} of {initialEntries.length} waitlist identities.
      </p>

      <div className="admin-table">
        <div className="admin-table-head">
          <span>Email</span>
          <span>Source</span>
          <span>Linked account</span>
          <span>Preference</span>
          <span>Joined</span>
        </div>
        {filteredEntries.length ? (
          filteredEntries.map((entry) => (
            <div className="admin-table-row" key={`${entry.email}-${entry.createdAt}`}>
              <span>{entry.email}</span>
              <span>{entry.source}</span>
              <span>{formatLinkage(entry)}</span>
              <span>{entry.alertPreference ? entry.alertPreference.replace("_", " ") : "not set"}</span>
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
            </div>
          ))
        ) : (
          <div className="admin-table-empty">No waitlist identities match the current filters.</div>
        )}
      </div>
    </article>
  );
}
