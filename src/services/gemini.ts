export async function askGemini(prompt: string): Promise<string> {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error("Prompt is required.");
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: trimmedPrompt }),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || "Gemini request failed.");
  }

  if (typeof data?.reply !== "string" || !data.reply.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return data.reply.trim();
}
