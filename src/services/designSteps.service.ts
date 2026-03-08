import { supabase } from "@/lib/supabase";
import type { WorkflowStep } from "@/types/workflow";
import { FunctionsHttpError } from "@supabase/supabase-js";

export interface DesignStepsDraftPayload {
  productType: string;
  purpose: string;
  targetUser: string;
  environment: string;
  skillLevel: string;
  budget: number | string;
  timeWeeks: number | number[] | string;
  safetyRequirements: string;
  preferredMaterials: string[];
  availableTools: string[];
  sustainabilityPriority: boolean | string;
}

const allowedEfforts = new Set<WorkflowStep["effort"]>(["Low", "Medium", "High"]);

const normalizeTimeWeeks = (value: DesignStepsDraftPayload["timeWeeks"]): number | string => {
  if (Array.isArray(value)) {
    const first = value.find((v) => Number.isFinite(Number(v)));
    return first ?? "";
  }
  return value;
};

const normalizeStep = (raw: any, index: number): WorkflowStep => {
  const id = String(raw?.id ?? index + 1);
  const title = String(raw?.title ?? `Step ${index + 1}`).trim();
  const description = String(raw?.description ?? "").trim();

  if (!title || !description) {
    throw new Error("Invalid workflow step data");
  }

  const effort = allowedEfforts.has(raw?.effort) ? raw.effort : "Medium";
  const duration = typeof raw?.duration === "string" && raw.duration.trim() ? raw.duration.trim() : "1-3 hours";

  const materials = Array.isArray(raw?.materials)
    ? raw.materials.map((m: unknown) => String(m).trim()).filter(Boolean)
    : undefined;

  const safetyNote = typeof raw?.safetyNote === "string" && raw.safetyNote.trim()
    ? raw.safetyNote.trim()
    : undefined;

  return {
    id,
    title,
    description,
    duration,
    effort,
    completed: false,
    ...(materials && materials.length ? { materials } : {}),
    ...(safetyNote ? { safetyNote } : {}),
  };
};

const parseStepsFromData = (data: any): WorkflowStep[] => {
  const steps = data?.workflowSteps;
  if (!Array.isArray(steps)) {
    throw new Error("Invalid design steps response");
  }

  const normalized = steps.map((step: any, index: number) => normalizeStep(step, index));
  if (normalized.length < 6 || normalized.length > 10) {
    throw new Error("Invalid number of workflow steps returned");
  }

  return normalized;
};

const buildPayload = (designDraft: DesignStepsDraftPayload) => ({
  productType: designDraft.productType,
  purpose: designDraft.purpose,
  targetUser: designDraft.targetUser,
  environment: designDraft.environment,
  skillLevel: designDraft.skillLevel,
  budget: designDraft.budget,
  timeWeeks: normalizeTimeWeeks(designDraft.timeWeeks),
  safetyRequirements: designDraft.safetyRequirements,
  preferredMaterials: designDraft.preferredMaterials,
  availableTools: designDraft.availableTools,
  sustainabilityPriority: designDraft.sustainabilityPriority,
});

const tryMlApi = async (payload: ReturnType<typeof buildPayload>) => {
  const response = await fetch("/api/ml/generate-steps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to generate workflow steps");
  }

  return parseStepsFromData(data);
};

const tryEdgeFunction = async (payload: ReturnType<typeof buildPayload>) => {
  const { data, error } = await supabase.functions.invoke("design-steps-generator", {
    body: payload,
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const details = await error.context.json();
        if (typeof details?.error === "string" && details.error.trim()) {
          throw new Error(details.error);
        }
      } catch {
        // noop
      }
    }
    throw new Error(error.message || "Failed to generate workflow steps");
  }

  return parseStepsFromData(data);
};

export const generateDesignSteps = async (
  designDraft: DesignStepsDraftPayload
): Promise<WorkflowStep[]> => {
  const payload = buildPayload(designDraft);

  try {
    return await tryMlApi(payload);
  } catch {
    return await tryEdgeFunction(payload);
  }
};
