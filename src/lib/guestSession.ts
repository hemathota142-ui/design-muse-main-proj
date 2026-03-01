const GUEST_SESSION_ID_KEY = "guest_session_id";
const GUEST_MODE_KEY = "guest_mode";
const GUEST_STORAGE_PREFIX = "guest_";

const makeId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export const getGuestSessionId = () => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(GUEST_SESSION_ID_KEY);
};

export const ensureGuestSession = () => {
  if (typeof window === "undefined") return null;
  const existing = getGuestSessionId();
  if (existing) return existing;
  const created = makeId();
  window.sessionStorage.setItem(GUEST_SESSION_ID_KEY, created);
  window.sessionStorage.setItem(GUEST_MODE_KEY, "1");
  return created;
};

export const isGuestSessionActive = () => {
  if (typeof window === "undefined") return false;
  return !!window.sessionStorage.getItem(GUEST_MODE_KEY) && !!getGuestSessionId();
};

export const clearGuestSessionData = () => {
  if (typeof window === "undefined") return;

  const keysToDelete: string[] = [];
  for (let i = 0; i < window.sessionStorage.length; i += 1) {
    const key = window.sessionStorage.key(i);
    if (!key) continue;
    if (
      key === GUEST_SESSION_ID_KEY ||
      key === GUEST_MODE_KEY ||
      key.startsWith(GUEST_STORAGE_PREFIX)
    ) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => window.sessionStorage.removeItem(key));
};

export const guestStorageKey = (name: string, sessionId: string) =>
  `${GUEST_STORAGE_PREFIX}${name}_${sessionId}`;
