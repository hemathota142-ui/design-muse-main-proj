const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DesignDraftInput = {
  productType?: string;
  purpose?: string;
  targetUser?: string;
  environment?: string;
  skillLevel?: string;
  budget?: number | string;
  timeWeeks?: number | string;
  safetyRequirements?: string;
  preferredMaterials?: string[] | string;
  availableTools?: string[] | string;
  sustainabilityPriority?: boolean | string;
  selectedDesign?: {
    id?: number | string;
    designName?: string;
    shortDescription?: string;
    recommendedMaterials?: string[];
    manufacturingMethod?: string;
    name?: string;
    description?: string;
    materials?: string[];
  };
};

type DesignOption = {
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
};

type WorkflowStep = {
  id: string;
  title: string;
  description: string;
  duration?: string;
  effort?: "Low" | "Medium" | "High";
  materials?: string[];
  safetyNote?: string;
  completed: false;
};

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[;,|,]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeInput = (raw: DesignDraftInput) => {
  const preferredMaterials = toList(raw.preferredMaterials);
  const availableTools = toList(raw.availableTools);

  return {
    productType: String(raw.productType ?? "Product").trim() || "Product",
    purpose: String(raw.purpose ?? "General-purpose product").trim() || "General-purpose product",
    targetUser: String(raw.targetUser ?? "General users").trim() || "General users",
    environment: String(raw.environment ?? "General").trim() || "General",
    skillLevel: String(raw.skillLevel ?? "Intermediate").trim() || "Intermediate",
    budget: Number(raw.budget ?? 0) || 0,
    timeWeeks: Number(raw.timeWeeks ?? 0) || 0,
    safetyRequirements:
      String(raw.safetyRequirements ?? "Ensure safe edges and structural stability.").trim() ||
      "Ensure safe edges and structural stability.",
    preferredMaterials,
    availableTools,
    sustainabilityPriority: String(raw.sustainabilityPriority ?? "normal").trim().toLowerCase(),
  };
};

const normalizeEffort = (value: unknown): "Low" | "Medium" | "High" => {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "low") return "Low";
  if (text === "high") return "High";
  return "Medium";
};

const normalizeDuration = (value: unknown, index: number): string => {
  const text = String(value ?? "").trim();
  if (text) return text;
  const defaults = ["1-2 hours", "2-3 hours", "3-5 hours", "2-4 hours", "2-3 hours", "1-2 hours", "1-2 hours"];
  return defaults[index] ?? "1-3 hours";
};

const sanitizeWorkflowStep = (raw: any, index: number, safetyFallback: string): WorkflowStep => {
  const description = String(raw?.description ?? "").trim() || `Complete step ${index + 1}.`;
  const step: WorkflowStep = {
    id: String(raw?.id ?? index + 1),
    title: String(raw?.title ?? `Step ${index + 1}`),
    description,
    duration: normalizeDuration(raw?.duration, index),
    effort: normalizeEffort(raw?.effort),
    completed: false,
  };

  const materials = toList(raw?.materials);
  if (materials.length) step.materials = materials;

  if (raw?.safetyNote || description.toLowerCase().includes("safety") || index >= 5) {
    step.safetyNote = String(raw?.safetyNote ?? safetyFallback);
  }

  return step;
};

const ensureStepCount = (steps: WorkflowStep[], safetyNote: string): WorkflowStep[] => {
  let normalized = steps.slice(0, 8).map((step, i) => ({ ...step, id: String(i + 1), completed: false as const }));

  while (normalized.length < 6) {
    const idx = normalized.length;
    normalized.push({
      id: String(idx + 1),
      title: `Step ${idx + 1}`,
      description: `Execute phase ${idx + 1} and validate outputs.`,
      duration: "1-2 hours",
      effort: "Medium",
      completed: false,
      ...(idx >= 4 ? { safetyNote } : {}),
    });
  }

  return normalized;
};

const chooseMaterials = (preferred: string[], fallback: string[]) =>
  preferred.length ? preferred : fallback;

const buildDesignOptions = (input: ReturnType<typeof normalizeInput>): DesignOption[] => {
  const baseBudget = input.budget > 0 ? input.budget : 30000;
  const baseMaterials = input.preferredMaterials;

  const options: Omit<DesignOption, "id">[] = [
    {
      designName: `Lightweight Minimal ${input.productType}`,
      shortDescription: `Minimal-part architecture optimized for low weight and quick fabrication for ${input.targetUser}.`,
      recommendedMaterials: chooseMaterials(baseMaterials, ["ABS Plastic", "Aluminum", "Composite"]),
      manufacturingMethod: "Modular CNC + light assembly",
      name: `Lightweight Minimal ${input.productType}`,
      description: `Minimal-part architecture optimized for low weight and quick fabrication for ${input.targetUser}.`,
      materials: chooseMaterials(baseMaterials, ["ABS Plastic", "Aluminum", "Composite"]),
      highlights: ["Lower mass", "Fast build", "Cost efficient"],
      feasibilityScore: 88,
      estimatedCost: Math.round(baseBudget * 0.72),
      complexity: "Low",
      timeEstimate: `${Math.max(2, input.timeWeeks || 4)} weeks`,
    },
    {
      designName: `Durable Industrial ${input.productType}`,
      shortDescription: `Reinforced industrial strategy focused on durability, reliability, and rugged environmental tolerance.`,
      recommendedMaterials: chooseMaterials(baseMaterials, ["Stainless Steel", "Aluminum", "Glass-Fiber Composite"]),
      manufacturingMethod: "Industrial machining + reinforced assembly",
      name: `Durable Industrial ${input.productType}`,
      description: `Reinforced industrial strategy focused on durability, reliability, and rugged environmental tolerance.`,
      materials: chooseMaterials(baseMaterials, ["Stainless Steel", "Aluminum", "Glass-Fiber Composite"]),
      highlights: ["High durability", "Rugged build", "Serviceable"],
      feasibilityScore: 84,
      estimatedCost: Math.round(baseBudget * 1.1),
      complexity: "High",
      timeEstimate: `${Math.max(4, input.timeWeeks || 6)} weeks`,
    },
    {
      designName: `Ergonomic User-Centered ${input.productType}`,
      shortDescription: `Human-centered layout prioritizing comfort, accessibility, and intuitive interaction for end users.`,
      recommendedMaterials: chooseMaterials(baseMaterials, ["Biopolymer", "Aluminum", "Soft-touch TPE"]),
      manufacturingMethod: "Ergonomic prototyping + iterative testing",
      name: `Ergonomic User-Centered ${input.productType}`,
      description: `Human-centered layout prioritizing comfort, accessibility, and intuitive interaction for end users.`,
      materials: chooseMaterials(baseMaterials, ["Biopolymer", "Aluminum", "Soft-touch TPE"]),
      highlights: ["Better usability", "Comfort focused", "User-tested"],
      feasibilityScore: 86,
      estimatedCost: Math.round(baseBudget * 0.92),
      complexity: "Medium",
      timeEstimate: `${Math.max(3, input.timeWeeks || 5)} weeks`,
    },
  ];

  if (input.sustainabilityPriority === "true" || input.sustainabilityPriority === "high") {
    options[2].highlights = ["Eco-focused", "User comfort", "Lifecycle mindful"];
    options[2].feasibilityScore = 89;
  }

  return options.map((option, i) => ({ id: i + 1, ...option }));
};

const parsePredictedText = (text: string): string[] => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const numbered = cleaned.split(/\s*\d+\.\s*/).map((s) => s.trim()).filter(Boolean);
  if (numbered.length) return numbered;
  return cleaned.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
};

const fallbackWorkflow = (input: ReturnType<typeof normalizeInput>, selected?: DesignOption): WorkflowStep[] => {
  const designName = selected?.designName || `Selected ${input.productType} approach`;

  const steps: WorkflowStep[] = [
    {
      id: "1",
      title: "Define Requirements",
      description: `Define requirements and constraints for ${designName}.`,
      duration: "1-2 hours",
      effort: "Low",
      materials: selected?.recommendedMaterials ?? input.preferredMaterials,
      completed: false,
    },
    {
      id: "2",
      title: "Material and Method Planning",
      description: `Finalize materials and manufacturing strategy: ${selected?.manufacturingMethod || "hybrid manufacturing"}.`,
      duration: "2-3 hours",
      effort: "Low",
      completed: false,
    },
    {
      id: "3",
      title: "Geometry and Structure Design",
      description: "Create detailed geometry, tolerances, and structural breakdown for fabrication.",
      duration: "2-4 hours",
      effort: "Medium",
      completed: false,
    },
    {
      id: "4",
      title: "Fabricate Core Components",
      description: "Fabricate primary parts using selected tools and verify dimensions.",
      duration: "3-5 hours",
      effort: "High",
      completed: false,
    },
    {
      id: "5",
      title: "Assemble and Integrate",
      description: "Assemble subcomponents and integrate functional modules.",
      duration: "2-4 hours",
      effort: "High",
      completed: false,
    },
    {
      id: "6",
      title: "Validation and Safety Check",
      description: "Run functionality tests and verify compliance with safety constraints.",
      duration: "2-3 hours",
      effort: "Medium",
      completed: false,
      safetyNote: input.safetyRequirements,
    },
    {
      id: "7",
      title: "Finalize Workflow",
      description: "Document final manufacturing workflow and release build-ready instructions.",
      duration: "1-2 hours",
      effort: "Medium",
      completed: false,
      safetyNote: input.safetyRequirements,
    },
  ];

  return ensureStepCount(steps, input.safetyRequirements);
};

const buildModelPayload = (
  input: ReturnType<typeof normalizeInput>,
  selected?: DesignOption
) => ({
  productType: input.productType,
  purpose: selected
    ? `${input.purpose}. Strategy: ${selected.designName}. ${selected.shortDescription}`
    : input.purpose,
  materials: selected?.recommendedMaterials ?? input.preferredMaterials,
  tools: input.availableTools,
  skillLevel: input.skillLevel,
  budget: input.budget,
  timeWeeks: input.timeWeeks,
  safetyRequirements: input.safetyRequirements,
  sustainabilityPriority: input.sustainabilityPriority,
});

const callMlWorkflow = async (
  input: ReturnType<typeof normalizeInput>,
  selected?: DesignOption
): Promise<WorkflowStep[] | null> => {
  const inferenceUrl = Deno.env.get("ML_INFERENCE_URL");
  if (!inferenceUrl) return null;

  const response = await fetch(inferenceUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildModelPayload(input, selected)),
  });

  if (!response.ok) {
    throw new Error(`ML inference failed with status ${response.status}`);
  }

  const data = await response.json();

  if (Array.isArray(data?.workflowSteps)) {
    return ensureStepCount(
      data.workflowSteps.map((step: any, i: number) => sanitizeWorkflowStep(step, i, input.safetyRequirements)),
      input.safetyRequirements
    );
  }

  if (typeof data?.predicted_design_steps === "string") {
    const parsed = parsePredictedText(data.predicted_design_steps)
      .slice(0, 8)
      .map((description, i) =>
        sanitizeWorkflowStep(
          {
            id: String(i + 1),
            title: i === 0 ? "Define Requirements" : `Step ${i + 1}`,
            description,
            effort: i <= 1 ? "Low" : i >= 5 ? "Medium" : "High",
          },
          i,
          input.safetyRequirements
        )
      );

    return ensureStepCount(parsed, input.safetyRequirements);
  }

  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: DesignDraftInput = await req.json();
    const input = normalizeInput(body ?? {});

    const designOptions = buildDesignOptions(input);

    const selectedRaw = body?.selectedDesign;
    const selectedDesign = selectedRaw
      ? designOptions.find((option) => option.id === Number(selectedRaw.id)) ||
        ({
          id: Number(selectedRaw.id ?? 1) || 1,
          designName: String(selectedRaw.designName ?? selectedRaw.name ?? "Selected approach"),
          shortDescription: String(selectedRaw.shortDescription ?? selectedRaw.description ?? ""),
          recommendedMaterials: toList(selectedRaw.recommendedMaterials ?? selectedRaw.materials),
          manufacturingMethod: String(selectedRaw.manufacturingMethod ?? "Hybrid fabrication"),
          name: String(selectedRaw.designName ?? selectedRaw.name ?? "Selected approach"),
          description: String(selectedRaw.shortDescription ?? selectedRaw.description ?? ""),
          materials: toList(selectedRaw.recommendedMaterials ?? selectedRaw.materials),
          highlights: ["Model-guided"],
          feasibilityScore: 85,
          estimatedCost: input.budget > 0 ? input.budget : 30000,
          complexity: "Medium" as const,
          timeEstimate: `${Math.max(3, input.timeWeeks || 4)} weeks`,
        } as DesignOption)
      : undefined;

    let workflowSteps: WorkflowStep[] = [];

    if (selectedDesign) {
      try {
        workflowSteps = (await callMlWorkflow(input, selectedDesign)) ?? fallbackWorkflow(input, selectedDesign);
      } catch {
        workflowSteps = fallbackWorkflow(input, selectedDesign);
      }
    }

    return new Response(JSON.stringify({ designOptions, workflowSteps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
