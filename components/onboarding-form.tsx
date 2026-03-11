"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TravelerProfile, UserRecord } from "@/lib/types";

const profileStorageKey = "detourist-profile";

const defaultProfile: TravelerProfile = {
  homeAirports: ["SIN"],
  repositionRegions: ["Southeast Asia"],
  preferredCabins: ["Business", "First"],
  maxStops: 1,
  allowOvernight: true,
  maxTravelPain: 7,
  destinationInterests: ["Europe", "Japan"],
  budgetMax: 2500,
  tripStyles: ["Flexible luxury", "Long weekend"],
};

const airportOptions = ["SIN", "SYD", "MEL", "BKK", "KUL", "LHR", "DXB", "HKG"];
const regionOptions = ["Southeast Asia", "Australia", "Europe", "Middle East", "Japan", "Anywhere"];
const cabinOptions = ["Business", "First", "Luxury Stay"];
const tripStyleOptions = ["Flexible luxury", "Long weekend", "Aspirational trip", "Remote work hop"];

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function OnboardingForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<TravelerProfile>(defaultProfile);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState("Your profile can now sync to the Detourist backend.");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const payload = (await response.json()) as { profile: TravelerProfile | null; user: UserRecord | null };

        if (payload.profile) {
          setProfile(payload.profile);
          setUser(payload.user);
          window.localStorage.setItem(profileStorageKey, JSON.stringify(payload.profile));
          return;
        }
      } catch {
      }

      const stored = window.localStorage.getItem(profileStorageKey);
      if (!stored) {
        return;
      }

      try {
        const parsed = JSON.parse(stored) as TravelerProfile;
        setProfile(parsed);
      } catch {
        window.localStorage.removeItem(profileStorageKey);
      }
    }

    void loadProfile();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage("Saving your detour profile...");

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile }),
      });

      if (!response.ok) {
        throw new Error("Could not save profile.");
      }

      const payload = (await response.json()) as { profile: TravelerProfile; user: UserRecord | null };
      window.localStorage.setItem(profileStorageKey, JSON.stringify(payload.profile));
      setUser(payload.user);
      setStatusMessage(
        payload.user?.email
          ? `Profile saved and linked to ${payload.user.email}. Sending you to the live deal feed...`
          : "Profile saved. Sending you to the live deal feed...",
      );
      router.push("/deals?status=profile-ready");
    } catch {
      setStatusMessage("We couldn't save your profile just now. Your local draft is still here.");
      setIsSaving(false);
    }
  };

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      {user ? (
        <div className="account-banner">
          <p className="section-kicker">Linked identity</p>
          <p>
            {user.email
              ? `This traveler profile is linked to ${user.email}.`
              : "This traveler profile exists, but it is not linked to a waitlist email yet."}
          </p>
        </div>
      ) : null}
      <section className="form-section-grid">
        <div className="form-card">
          <p className="section-kicker">Step 1</p>
          <h3>Where can you start?</h3>
          <p>Choose the airports you can realistically depart from without hating your life.</p>
          <div className="option-grid option-grid-tight">
            {airportOptions.map((airport) => (
              <label className="choice-chip" key={airport}>
                <input
                  type="checkbox"
                  checked={profile.homeAirports.includes(airport)}
                  onChange={() =>
                    setProfile((current) => ({
                      ...current,
                      homeAirports: toggleValue(current.homeAirports, airport),
                    }))
                  }
                />
                <span>{airport}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-card">
          <p className="section-kicker">Step 2</p>
          <h3>How much detour can you tolerate?</h3>
          <label className="field-label">
            Max stops
            <select
              value={profile.maxStops}
              onChange={(event) =>
                setProfile((current) => ({ ...current, maxStops: Number(event.target.value) }))
              }
            >
              <option value={0}>Nonstop only</option>
              <option value={1}>Up to 1 stop</option>
              <option value={2}>Up to 2 stops</option>
            </select>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={profile.allowOvernight}
              onChange={(event) =>
                setProfile((current) => ({ ...current, allowOvernight: event.target.checked }))
              }
            />
            <span>Allow overnight layovers if the value is strong enough</span>
          </label>
          <label className="field-label">
            Travel pain tolerance: <strong>{profile.maxTravelPain}/10</strong>
            <input
              type="range"
              min={1}
              max={10}
              value={profile.maxTravelPain}
              onChange={(event) =>
                setProfile((current) => ({ ...current, maxTravelPain: Number(event.target.value) }))
              }
            />
          </label>
        </div>
      </section>

      <section className="form-section-grid">
        <div className="form-card">
          <p className="section-kicker">Step 3</p>
          <h3>What do you actually want?</h3>
          <div className="field-stack">
            <span className="field-caption">Preferred cabins</span>
            <div className="option-grid">
              {cabinOptions.map((cabin) => (
                <label className="choice-chip" key={cabin}>
                  <input
                    type="checkbox"
                    checked={profile.preferredCabins.includes(cabin)}
                    onChange={() =>
                      setProfile((current) => ({
                        ...current,
                        preferredCabins: toggleValue(current.preferredCabins, cabin),
                      }))
                    }
                  />
                  <span>{cabin}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="field-stack">
            <span className="field-caption">Regions worth watching</span>
            <div className="option-grid">
              {regionOptions.map((region) => (
                <label className="choice-chip" key={region}>
                  <input
                    type="checkbox"
                    checked={profile.destinationInterests.includes(region)}
                    onChange={() =>
                      setProfile((current) => ({
                        ...current,
                        destinationInterests: toggleValue(current.destinationInterests, region),
                      }))
                    }
                  />
                  <span>{region}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="form-card">
          <p className="section-kicker">Step 4</p>
          <h3>Set your budget ceiling</h3>
          <label className="field-label">
            Max cash budget in USD
            <input
              type="number"
              min={150}
              step={50}
              value={profile.budgetMax}
              onChange={(event) =>
                setProfile((current) => ({ ...current, budgetMax: Number(event.target.value) }))
              }
            />
          </label>
          <div className="field-stack">
            <span className="field-caption">Trip styles that matter to you</span>
            <div className="option-grid">
              {tripStyleOptions.map((style) => (
                <label className="choice-chip" key={style}>
                  <input
                    type="checkbox"
                    checked={profile.tripStyles.includes(style)}
                    onChange={() =>
                      setProfile((current) => ({
                        ...current,
                        tripStyles: toggleValue(current.tripStyles, style),
                      }))
                    }
                  />
                  <span>{style}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="field-stack">
            <span className="field-caption">Regions you can reposition from</span>
            <div className="option-grid">
              {regionOptions.map((region) => (
                <label className="choice-chip" key={`${region}-reposition`}>
                  <input
                    type="checkbox"
                    checked={profile.repositionRegions.includes(region)}
                    onChange={() =>
                      setProfile((current) => ({
                        ...current,
                        repositionRegions: toggleValue(current.repositionRegions, region),
                      }))
                    }
                  />
                  <span>{region}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="form-footer">
        <div>
          <p className="form-footer-title">What happens next</p>
          <p>{statusMessage}</p>
        </div>
        <button className="button" type="submit" disabled={isSaving}>
          {isSaving ? "Saving profile..." : "Save profile and see deals"}
        </button>
      </div>
    </form>
  );
}
