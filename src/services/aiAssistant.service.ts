import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";

export type AssistantRole = "user" | "assistant";

export interface AssistantMessage {
  role: AssistantRole;
  content: string;
}

export interface AssistantContextPayload {
  productTitle?: string;
  selectedMaterials?: string[];
  workflowSteps?: string[];
}

export const askDesignAssistant = async (payload: {
  messages: AssistantMessage[];
  context?: AssistantContextPayload;
}) => {
  const { data, error } = await supabase.functions.invoke("design-assistant", {
    body: payload,
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const details = await error.context.json();
        if (typeof details?.error === "string" && details.error.trim()) {
          throw new Error(details.error);
        }
      } catch (parseError) {
        console.error("Failed to parse design-assistant error response", parseError);
      }
    }
    throw new Error(error.message || "Failed to contact AI assistant");
  }

  if (data?.error && typeof data.error === "string") {
    throw new Error(data.error);
  }

  if (!data?.reply || typeof data.reply !== "string") {
    throw new Error("Invalid AI assistant response");
  }

  return data.reply;
};
