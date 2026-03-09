import { cookies } from "next/headers";

import { getProfileCookieName, getUserCookieName } from "@/lib/identity";
import { getProfileById } from "@/lib/profile-store";
import { getUserById, getUserByProfileId } from "@/lib/user-store";
import { getAuthenticatedUserId } from "@/lib/user-auth";

export async function getCurrentAccount() {
  const cookieStore = await cookies();
  const authenticatedUserId = await getAuthenticatedUserId();
  const cookieUserId = cookieStore.get(getUserCookieName())?.value ?? null;
  const cookieProfileId = cookieStore.get(getProfileCookieName())?.value ?? null;

  const user = authenticatedUserId
    ? await getUserById(authenticatedUserId)
    : cookieUserId
      ? await getUserById(cookieUserId)
      : cookieProfileId
        ? await getUserByProfileId(cookieProfileId)
        : null;

  const profileId = user?.profileId ?? cookieProfileId;
  const profile = profileId ? await getProfileById(profileId) : null;

  return { user, profile, isAuthenticated: Boolean(authenticatedUserId) };
}
