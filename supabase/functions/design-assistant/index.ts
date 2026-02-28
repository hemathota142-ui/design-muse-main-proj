// Supabase Edge Function: design-assistant
// This function enforces domain restriction server-side and never stores chat history.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantContext = {
  productTitle?: string;
  selectedMaterials?: string[];
  workflowSteps?: string[];
};

const DOMAIN_SYSTEM_PROMPT = `You are a design and materials expert assistant for a product design platform.
You must only answer questions related to:
- product design guidance
- materials selection
- manufacturing workflows and build steps
- safety considerations
- cost and effort estimation

If the user asks anything outside this scope, refuse politely and redirect them to product-design topics.
Keep answers practical, structured, and specific to the provided context when available.`;

const DOMAIN_KEYWORDS = [
  "design",
  "product",
  "prototype",
  "material",
  "manufacturing",
  "workflow",
  "assembly",
  "fabrication",
  "safety",
  "hazard",
  "cost",
  "budget",
  "estimate",
  "effort",
  "bom",
  "tooling",
  "tolerance",
  "finish",
  "ergonomic",
  "compliance",
  "test",
  "qa",
  "quality",
  "supplier",
  "process",
  "step",
  "steps",
  "design muse",
];

const OUT_OF_SCOPE_HINTS = [
  "sports",
  "movie",
  "music",
  "politics",
  "celebrity",
  "crypto price",
  "stock market",
  "weather",
  "recipe",
  "joke",
  "poem",
  "horoscope",
  "news",
  "travel",
  "dating",
  "game score",
];

const refusalText =
  "I can only help with product design, materials, manufacturing workflow, safety, and cost or effort planning. Ask me about your design and I will help.";

const includesAny = (text: string, words: string[]) =>
  words.some((word) => text.includes(word));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const context: AssistantContext = body?.context ?? {};

    if (!messages.length) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessages = messages.filter((m) => m?.role === "user");
    const latestUserText =
      userMessages.length > 0
        ? String(userMessages[userMessages.length - 1]?.content ?? "").toLowerCase()
        : "";

    // Extra guardrail: refuse obvious out-of-domain prompts before calling the model.
    const looksOutOfScope =
      includesAny(latestUserText, OUT_OF_SCOPE_HINTS) &&
      !includesAny(latestUserText, DOMAIN_KEYWORDS);

    if (looksOutOfScope) {
      return new Response(JSON.stringify({ reply: refusalText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Context block can be extended later with additional design metadata.
    const contextBlock = [
      context?.productTitle ? `Product title: ${context.productTitle}` : null,
      Array.isArray(context?.selectedMaterials) && context.selectedMaterials.length
        ? `Selected materials: ${context.selectedMaterials.join(", ")}`
        : null,
      Array.isArray(context?.workflowSteps) && context.workflowSteps.length
        ? `Workflow steps: ${context.workflowSteps.join(" | ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const upstreamMessages = [
      {
        role: "system",
        content: `${DOMAIN_SYSTEM_PROMPT}\n\nDesign context:\n${contextBlock || "No design context provided."}`,
      },
      ...messages
        .filter(
          (m) =>
            (m?.role === "user" || m?.role === "assistant") &&
            typeof m?.content === "string" &&
            m.content.trim().length > 0
        )
        .slice(-12),
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: upstreamMessages,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply || typeof reply !== "string") {
      return new Response(JSON.stringify({ error: "No assistant output" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ reply: reply.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
