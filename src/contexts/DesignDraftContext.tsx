import { createContext, useContext, useMemo, useState, useEffect } from "react";

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
  skillLevel: "Intermediate",
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

const DesignDraftContext = createContext<DesignDraftContextValue | null>(null);

export const DesignDraftProvider = ({ children }: { children: React.ReactNode }) => {
  const [designDraft, setDesignDraft] = useState<DesignDraft>(() => {
    if (typeof window === "undefined") return defaultDraft;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultDraft;
      const parsed = JSON.parse(raw) as Partial<DesignDraft>;
      return { ...defaultDraft, ...parsed };
    } catch {
      return defaultDraft;
    }
  });

  const updateDraft = (updates: Partial<DesignDraft>) => {
    setDesignDraft((prev) => ({ ...prev, ...updates }));
  };

  const resetDraft = () => setDesignDraft(defaultDraft);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(designDraft));
    } catch {
      // ignore storage failures
    }
  }, [designDraft]);

  const value = useMemo(
    () => ({ designDraft, updateDraft, resetDraft }),
    [designDraft]
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
