import { supabase } from "@/lib/supabase";

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
    throw new Error(error.message || "Failed to contact AI assistant");
  }

  if (!data?.reply || typeof data.reply !== "string") {
    throw new Error("Invalid AI assistant response");
  }

  return data.reply;
};
