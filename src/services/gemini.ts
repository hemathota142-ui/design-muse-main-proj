import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = "AIzaSyB5ucM6qVqY24iqvOA8UD7POcPAHNZMew8";
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-2.5-pro",
] as const;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const mapGeminiErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes("429") || message.includes("quota exceeded")) {
    return "Gemini API quota exceeded. Please enable billing or wait for quota reset.";
  }

  if (message.includes("api key not valid") || message.includes("permission denied")) {
    return "Gemini API key is invalid or does not have access.";
  }

  return "Failed to generate Gemini response.";
};

export async function askGemini(prompt: string): Promise<string> {
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new Error("Prompt is required.");
  }

  let lastError: unknown = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(trimmedPrompt);
      const text = result.response.text()?.trim() || "";

      if (!text) {
        throw new Error(`Gemini returned an empty response from ${modelName}.`);
      }

      if (modelName !== GEMINI_MODELS[0]) {
        console.warn("Primary Gemini model failed; fallback model succeeded.", {
          primary: GEMINI_MODELS[0],
          fallbackUsed: modelName,
        });
      }

      return text;
    } catch (error) {
      lastError = error;
      console.error("Gemini API error on model", { model: modelName, error, prompt: trimmedPrompt });
    }
  }

  throw new Error(mapGeminiErrorMessage(lastError));
}
