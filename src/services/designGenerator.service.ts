import { supabase } from "@/lib/supabase";
import type { WorkflowStep } from "@/types/workflow";
import { FunctionsHttpError } from "@supabase/supabase-js";

export interface DesignGeneratorDraftPayload {
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

export interface DesignOption {
  id: number;
  designName: string;
  shortDescription: string;
  recommendedMaterials: string[];
  manufacturingMethod: string;
  name: string;
  description: string;
  materials: string[];
  highlights: string[];
  feasibilityScore: number;
  estimatedCost: number;
  complexity: "Low" | "Medium" | "High";
  timeEstimate: string;
}

const toWeekScalar = (value: DesignGeneratorDraftPayload["timeWeeks"]): number | string => {
  if (Array.isArray(value)) {
    const first = value.find((v) => Number.isFinite(Number(v)));
    return first ?? "";
  }
  return value;
};

const parseErrorMessage = async (error: any, fallback: string) => {
  if (error instanceof FunctionsHttpError) {
    try {
      const details = await error.context.json();
      if (typeof details?.error === "string" && details.error.trim()) {
        return details.error;
      }
    } catch {
      // noop
    }
  }
  return error?.message || fallback;
};

const normalizeEffort = (value: unknown): "Low" | "Medium" | "High" => {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "low") return "Low";
  if (text === "high") return "High";
  return "Medium";
};

const normalizeWorkflowStep = (raw: any, index: number): WorkflowStep => {
  const title = String(raw?.title ?? `Step ${index + 1}`).trim();
  const description = String(raw?.description ?? "").trim();
  if (!title || !description) {
    throw new Error("Invalid workflow step in response");
  }

  return {
    id: String(raw?.id ?? index + 1),
    title,
    description,
    duration: String(raw?.duration ?? "1-3 hours"),
    effort: normalizeEffort(raw?.effort),
    completed: false,
    ...(Array.isArray(raw?.materials)
      ? { materials: raw.materials.map((m: unknown) => String(m)).filter(Boolean) }
      : {}),
    ...(typeof raw?.safetyNote === "string" && raw.safetyNote.trim()
      ? { safetyNote: raw.safetyNote.trim() }
      : {}),
  };
};

const normalizeDesignOption = (
  raw: any,
  index: number,
  budgetInput: number | string
): DesignOption => {
  const budget = Number(budgetInput);
  const budgetFallback = Number.isFinite(budget) && budget > 0 ? budget : 30000;

  const recommendedMaterials = Array.isArray(raw?.recommendedMaterials)
    ? raw.recommendedMaterials.map((m: unknown) => String(m).trim()).filter(Boolean)
    : [];

  const designName = String(raw?.designName ?? raw?.name ?? `Design Approach ${index + 1}`).trim();
  const shortDescription = String(raw?.shortDescription ?? raw?.description ?? "Generated design approach").trim();
  const manufacturingMethod = String(raw?.manufacturingMethod ?? "Hybrid fabrication").trim();

  const feasibilityScore = Number(raw?.feasibilityScore);
  const estimatedCost = Number(raw?.estimatedCost);
  const complexityRaw = String(raw?.complexity ?? "Medium").trim();
  const complexity =
    complexityRaw === "Low" || complexityRaw === "High" ? complexityRaw : "Medium";

  return {
    id: Number(raw?.id ?? index + 1),
    designName,
    shortDescription,
    recommendedMaterials,
    manufacturingMethod,
    // Backward-compatible aliases used by existing UI
    name: designName,
    description: shortDescription,
    materials: recommendedMaterials,
    highlights: [
      manufacturingMethod,
      `${complexity} complexity`,
      "Model-generated approach",
    ],
    feasibilityScore: Number.isFinite(feasibilityScore)
      ? Math.max(1, Math.min(99, Math.round(feasibilityScore)))
      : 80 - index * 3,
    estimatedCost: Number.isFinite(estimatedCost) ? Math.round(estimatedCost) : Math.round(budgetFallback * (0.7 + index * 0.15)),
    complexity,
    timeEstimate: String(raw?.timeEstimate ?? `${Math.max(2, 4 + index)} weeks`),
  };
};

export const generateDesignData = async (
  designDraft: DesignGeneratorDraftPayload,
  selectedDesign?: DesignOption
): Promise<{ designOptions: DesignOption[]; workflowSteps: WorkflowStep[] }> => {
  const payload = {
    productType: designDraft.productType,
    purpose: designDraft.purpose,
    targetUser: designDraft.targetUser,
    environment: designDraft.environment,
    skillLevel: designDraft.skillLevel,
    budget: designDraft.budget,
    timeWeeks: toWeekScalar(designDraft.timeWeeks),
    safetyRequirements: designDraft.safetyRequirements,
    preferredMaterials: designDraft.preferredMaterials,
    availableTools: designDraft.availableTools,
    sustainabilityPriority: designDraft.sustainabilityPriority,
    ...(selectedDesign ? { selectedDesign } : {}),
  };

  let data: any = null;

  try {
    const response = await fetch("/api/ml/generate-design-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const parsed = await response.json();
    if (!response.ok || parsed?.success === false) {
      throw new Error(parsed?.message || "Failed to generate design data");
    }
    data = parsed;
  } catch {
    const edge = await supabase.functions.invoke("design-steps-generator", {
      body: payload,
    });
    if (edge.error) {
      const message = await parseErrorMessage(edge.error, "Failed to generate design data");
      throw new Error(message);
    }
    data = edge.data;
  }

  if (!Array.isArray(data?.designOptions)) {
    throw new Error("Invalid design options response");
  }

  const designOptions = data.designOptions
    .map((option: any, index: number) => normalizeDesignOption(option, index, designDraft.budget))
    .slice(0, 3);

  if (designOptions.length !== 3) {
    throw new Error("Expected exactly 3 design options");
  }

  const workflowStepsRaw = Array.isArray(data?.workflowSteps) ? data.workflowSteps : [];
  const workflowSteps = workflowStepsRaw.map((step: any, index: number) =>
    normalizeWorkflowStep(step, index)
  );

  return { designOptions, workflowSteps };
};
