import { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import { getGuestSessionId, guestStorageKey } from "@/lib/guestSession";

export type DesignDraft = {
  // Step 1: Idea & Intent
  productType: string;
  customProductType: string;
  productName: string;
  purpose: string;
  targetUser: string;
  customTargetUser: string;
  environment: string;
  customEnvironment: string;
  // Step 2: Constraints
  skillLevel: string;
  budget: number;
  timeWeeks: number[];
  safetyRequirements: string;
  // Step 3: Materials
  preferredMaterials: string[];
  availableTools: string[];
  sustainabilityPriority: boolean;
  // Downstream selections
  selectedConceptName?: string;
  estimatedCost?: number | null;
  workflowSteps?: any[];
};

type DesignDraftContextValue = {
  designDraft: DesignDraft;
  updateDraft: (updates: Partial<DesignDraft>) => void;
  resetDraft: () => void;
};

const defaultDraft: DesignDraft = {
  productType: "",
  customProductType: "",
  productName: "",
  purpose: "",
  targetUser: "",
  customTargetUser: "",
  environment: "",
  customEnvironment: "",
  skillLevel: "",
  budget: 5000,
  timeWeeks: [4],
  safetyRequirements: "",
  preferredMaterials: [],
  availableTools: [],
  sustainabilityPriority: false,
  selectedConceptName: "",
  estimatedCost: null,
  workflowSteps: [],
};

const STORAGE_KEY = "design_draft_v1";
const GUEST_DRAFT_STORAGE = "design_draft";

const resolveStorage = () => {
  if (typeof window === "undefined") return null;
  const guestSessionId = getGuestSessionId();
  if (guestSessionId) {
    return {
      storage: window.sessionStorage,
      key: guestStorageKey(GUEST_DRAFT_STORAGE, guestSessionId),
    };
  }
  return {
    storage: window.localStorage,
    key: STORAGE_KEY,
  };
};

const readDraftFromStorage = (): DesignDraft => {
  const target = resolveStorage();
  if (!target) return defaultDraft;
  try {
    const raw = target.storage.getItem(target.key);
    if (!raw) return defaultDraft;
    const parsed = JSON.parse(raw) as Partial<DesignDraft>;
    return { ...defaultDraft, ...parsed };
  } catch {
    return defaultDraft;
  }
};

const DesignDraftContext = createContext<DesignDraftContextValue | null>(null);

export const DesignDraftProvider = ({ children }: { children: React.ReactNode }) => {
  const [designDraft, setDesignDraft] = useState<DesignDraft>(() => readDraftFromStorage());

  const updateDraft = useCallback((updates: Partial<DesignDraft>) => {
    setDesignDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetDraft = useCallback(() => setDesignDraft(defaultDraft), []);

  useEffect(() => {
    const target = resolveStorage();
    if (!target) return;
    try {
      target.storage.setItem(target.key, JSON.stringify(designDraft));
    } catch {
      // ignore storage failures
    }
  }, [designDraft]);

  useEffect(() => {
    const handleGuestSessionChanged = () => {
      setDesignDraft(readDraftFromStorage());
    };

    window.addEventListener("guest:session-changed", handleGuestSessionChanged);
    return () => {
      window.removeEventListener("guest:session-changed", handleGuestSessionChanged);
    };
  }, []);

  const value = useMemo(
    () => ({ designDraft, updateDraft, resetDraft }),
    [designDraft, updateDraft, resetDraft]
  );

  return (
    <DesignDraftContext.Provider value={value}>
      {children}
    </DesignDraftContext.Provider>
  );
};

export const useDesignDraft = () => {
  const ctx = useContext(DesignDraftContext);
  if (!ctx) {
    throw new Error("useDesignDraft must be used within DesignDraftProvider");
  }
  return ctx;
};
