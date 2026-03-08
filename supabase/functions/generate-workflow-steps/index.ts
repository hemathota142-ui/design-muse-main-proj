const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InputPayload = {
  productType?: string;
  purpose?: string;
  materials?: string[] | string;
  tools?: string[] | string;
  skillLevel?: string;
  budget?: number | string;
  timeWeeks?: number | string;
  safetyRequirements?: string;
  sustainabilityPriority?: boolean | string;
};

type WorkflowStep = {
  id: string;
  title: string;
  description: string;
  duration?: string;
  effort?: "Low" | "Medium" | "High";
  completed: boolean;
  materials?: string[];
  safetyNote?: string;
};

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[;,|,]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

const normalize = (input: InputPayload) => {
  const materials = toList(input.materials);
  const tools = toList(input.tools);

  return {
    productType: String(input.productType ?? "Product").trim() || "Product",
    purpose: String(input.purpose ?? "General-purpose design").trim() || "General-purpose design",
    materials,
    tools,
    skillLevel: String(input.skillLevel ?? "Intermediate").trim() || "Intermediate",
    budget: String(input.budget ?? "").trim(),
    timeWeeks: String(input.timeWeeks ?? "").trim(),
    safetyRequirements: String(input.safetyRequirements ?? "Follow standard safety practices.").trim(),
    sustainabilityPriority: String(input.sustainabilityPriority ?? "normal").trim().toLowerCase(),
  };
};

const fallbackWorkflow = (input: ReturnType<typeof normalize>): WorkflowStep[] => {
  const matText = input.materials.length ? input.materials.join(", ") : "recommended materials";
  const toolText = input.tools.length ? input.tools.join(", ") : "available tools";

  const steps: WorkflowStep[] = [
    {
      id: "1",
      title: "Define Requirements",
      description: `Define requirements for the ${input.productType} based on this purpose: ${input.purpose}.`,
      duration: "1-2 hours",
      effort: "Low",
      completed: false,
      materials: input.materials,
    },
    {
      id: "2",
      title: "Plan Materials and Tools",
      description: `Confirm material plan (${matText}) and tooling plan (${toolText}) for ${input.skillLevel} execution.`,
      duration: "1-2 hours",
      effort: "Low",
      completed: false,
    },
    {
      id: "3",
      title: "Build Prototype Structure",
      description: "Fabricate core structural components and verify dimensional fit before integration.",
      duration: "3-5 hours",
      effort: "High",
      completed: false,
    },
    {
      id: "4",
      title: "Integrate Components",
      description: "Assemble and integrate mechanical/electrical subsystems according to the design intent.",
      duration: "2-4 hours",
      effort: "High",
      completed: false,
    },
    {
      id: "5",
      title: "Validate Performance",
      description: "Run functional and usability tests, then document issues and iterate where needed.",
      duration: "2-3 hours",
      effort: "Medium",
      completed: false,
      safetyNote: input.safetyRequirements,
    },
    {
      id: "6",
      title: "Finalize for Manufacturing",
      description: "Finalize manufacturability details, quality checks, and release the approved workflow.",
      duration: "1-2 hours",
      effort: "Medium",
      completed: false,
      safetyNote: input.safetyRequirements,
    },
  ];

  return steps;
};

const sanitizeStep = (raw: any, index: number): WorkflowStep => {
  const effortRaw = String(raw?.effort ?? "Medium");
  const effort = effortRaw === "Low" || effortRaw === "High" ? effortRaw : "Medium";

  const normalized: WorkflowStep = {
    id: String(raw?.id ?? index + 1),
    title: String(raw?.title ?? `Step ${index + 1}`),
    description: String(raw?.description ?? ""),
    duration: raw?.duration ? String(raw.duration) : "1-3 hours",
    effort,
    completed: false,
  };

  const materials = toList(raw?.materials);
  if (materials.length) normalized.materials = materials;

  if (raw?.safetyNote) normalized.safetyNote = String(raw.safetyNote);

  return normalized;
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
    const body = await req.json();
    const input = normalize(body ?? {});

    const inferenceUrl = Deno.env.get("ML_INFERENCE_URL");

    if (inferenceUrl) {
      const upstream = await fetch(inferenceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (upstream.ok) {
        const payload = await upstream.json();
        if (Array.isArray(payload?.workflowSteps)) {
          const workflowSteps = payload.workflowSteps.map((step: any, i: number) => sanitizeStep(step, i));
          return new Response(JSON.stringify({ workflowSteps }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const workflowSteps = fallbackWorkflow(input);
    return new Response(JSON.stringify({ workflowSteps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
