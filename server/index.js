import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

app.use(express.json({ limit: "20kb" }));

const sanitizeText = (value, maxLength) =>
  String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 25000;
const FALLBACK_CHAT_REPLY =
  "I'm having trouble reaching the AI service right now. Please try again in a moment.";

const mapGeminiError = (error) => {
  const msg = String(error?.message || error || "");
  const lower = msg.toLowerCase();
  if (lower.includes("reported as leaked")) {
    return "Gemini API key is blocked because it was reported as leaked. Create a new key and set GEMINI_API_KEY in .env.";
  }
  if (lower.includes("api key not valid") || lower.includes("403")) {
    return "Gemini API key is invalid or does not have access to gemini-2.5-flash.";
  }
  if (lower.includes("quota") || lower.includes("429")) {
    return "Gemini quota exceeded for this API key.";
  }
  if (lower.includes("timed out")) {
    return "Gemini request timed out.";
  }
  return "Gemini request failed.";
};

const getGeminiClient = () => {
  const key = String(
    process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      ""
  ).trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(key);
};

const runGemini = async (prompt) => {
  const cleanPrompt = sanitizeText(prompt, 6000);
  if (!cleanPrompt) {
    throw new Error("Prompt is required.");
  }

  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: GEMINI_MODEL });
  const response = await Promise.race([
    model.generateContent(cleanPrompt),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini request timed out.")), GEMINI_TIMEOUT_MS)
    ),
  ]);
  const text = response?.response?.text?.()?.trim() || "";
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
};

const runMlInference = (inputPayload) =>
  new Promise((resolve, reject) => {
    const scriptPath = path.join(projectRoot, "ml", "inference", "generate_steps.py");
    const modelPath = path.join(projectRoot, "ml", "model", "design_steps_model.pkl");
    const pythonBin = process.env.PYTHON_BIN || "py";

    const args =
      pythonBin === "py"
        ? ["-3", scriptPath, "--model", modelPath]
        : [scriptPath, "--model", modelPath];

    const child = spawn(pythonBin, args, {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk ?? "");
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk ?? "");
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to start ML process: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ML process exited with code ${code}. ${stderr || stdout}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (error) {
        reject(new Error(`Invalid ML JSON output: ${error.message}`));
      }
    });

    child.stdin.write(JSON.stringify(inputPayload));
    child.stdin.end();
  });

const buildDesignOptions = (input) => {
  const budget = Number(input.budget) > 0 ? Number(input.budget) : 30000;
  const materials = Array.isArray(input.materials) && input.materials.length
    ? input.materials
    : ["Aluminum", "ABS Plastic", "Composite"];

  return [
    {
      id: 1,
      designName: `Lightweight Minimal ${input.productType || "Design"}`,
      shortDescription: "Minimal architecture to reduce weight and part count for faster manufacturing.",
      recommendedMaterials: materials,
      manufacturingMethod: "Modular CNC + light assembly",
      name: `Lightweight Minimal ${input.productType || "Design"}`,
      description: "Minimal architecture to reduce weight and part count for faster manufacturing.",
      materials,
      highlights: ["Low weight", "Fast build", "Cost efficient"],
      feasibilityScore: 88,
      estimatedCost: Math.round(budget * 0.72),
      complexity: "Low",
      timeEstimate: `${Math.max(2, Number(input.timeWeeks) || 4)} weeks`,
    },
    {
      id: 2,
      designName: `Durable Industrial ${input.productType || "Design"}`,
      shortDescription: "Reinforced industrial strategy focused on durability and long service life.",
      recommendedMaterials: materials,
      manufacturingMethod: "Industrial machining + reinforced assembly",
      name: `Durable Industrial ${input.productType || "Design"}`,
      description: "Reinforced industrial strategy focused on durability and long service life.",
      materials,
      highlights: ["High durability", "Rugged build", "Serviceable"],
      feasibilityScore: 84,
      estimatedCost: Math.round(budget * 1.1),
      complexity: "High",
      timeEstimate: `${Math.max(4, Number(input.timeWeeks) || 6)} weeks`,
    },
    {
      id: 3,
      designName: `Ergonomic User-Centered ${input.productType || "Design"}`,
      shortDescription: "Human-centered strategy prioritizing usability, comfort, and intuitive operation.",
      recommendedMaterials: materials,
      manufacturingMethod: "Ergonomic prototyping + iterative testing",
      name: `Ergonomic User-Centered ${input.productType || "Design"}`,
      description: "Human-centered strategy prioritizing usability, comfort, and intuitive operation.",
      materials,
      highlights: ["Better usability", "Comfort focused", "User-tested"],
      feasibilityScore: 86,
      estimatedCost: Math.round(budget * 0.92),
      complexity: "Medium",
      timeEstimate: `${Math.max(3, Number(input.timeWeeks) || 5)} weeks`,
    },
  ];
};

const mapDraftToMlPayload = (body, selectedDesign) => ({
  productType: sanitizeText(body?.productType, 120),
  purpose: sanitizeText(
    selectedDesign?.designName
      ? `${body?.purpose || ""}. Strategy: ${selectedDesign.designName}. ${selectedDesign.shortDescription || ""}`
      : body?.purpose,
    500
  ),
  targetUser: sanitizeText(body?.targetUser, 120),
  environment: sanitizeText(body?.environment, 120),
  skillLevel: sanitizeText(body?.skillLevel, 60),
  budget: body?.budget ?? "",
  timeWeeks: body?.timeWeeks ?? "",
  safetyRequirements: sanitizeText(body?.safetyRequirements, 400),
  materials: Array.isArray(selectedDesign?.recommendedMaterials)
    ? selectedDesign.recommendedMaterials.map((m) => sanitizeText(m, 60)).filter(Boolean)
    : Array.isArray(body?.preferredMaterials)
      ? body.preferredMaterials.map((m) => sanitizeText(m, 60)).filter(Boolean)
      : [],
  tools: Array.isArray(body?.availableTools)
    ? body.availableTools.map((t) => sanitizeText(t, 60)).filter(Boolean)
    : [],
  sustainabilityPriority: body?.sustainabilityPriority ?? false,
});

app.post("/api/contact", async (req, res) => {
  const name = sanitizeText(req.body?.name, 120);
  const email = sanitizeText(req.body?.email, 254).toLowerCase();
  const subject = sanitizeText(req.body?.subject, 180);
  const message = sanitizeText(req.body?.message, 5000);

  if (!name || !email || !subject || !message) {
    console.error("CONTACT_VALIDATION_FAIL", { name: !!name, email: !!email, subject: !!subject, message: !!message });
    return res.status(400).json({
      success: false,
      message: "Failed to send message",
    });
  }

  if (!emailRegex.test(email) || message.length < 10) {
    console.error("CONTACT_VALIDATION_FAIL", { emailValid: emailRegex.test(email), messageLength: message.length });
    return res.status(400).json({
      success: false,
      message: "Failed to send message",
    });
  }

  const supportEmail = process.env.SUPPORT_EMAIL;
  const supportEmailPassword = process.env.SUPPORT_EMAIL_PASSWORD;

  if (!supportEmail || !supportEmailPassword) {
    console.error("CONTACT_CONFIG_FAIL", { hasSupportEmail: !!supportEmail, hasSupportEmailPassword: !!supportEmailPassword });
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: supportEmail,
        pass: supportEmailPassword,
      },
    });

    await transporter.sendMail({
      from: supportEmail,
      to: supportEmail,
      replyTo: email,
      subject: "New Contact Form Complaint",
      text: `New Complaint Received

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}`,
    });

    return res.status(200).json({
      success: true,
      message: "Complaint sent successfully",
    });
  } catch (error) {
    console.error("CONTACT_SEND_FAIL", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
});

const handleChatRequest = async (req, res) => {
  try {
    const prompt = req.body?.message ?? req.body?.prompt ?? "";
    const reply = await runGemini(prompt);
    return res.status(200).json({
      success: true,
      reply,
      model: GEMINI_MODEL,
    });
  } catch (error) {
    console.error("GEMINI_CHAT_FAIL", error);
    return res.status(200).json({
      success: true,
      reply: FALLBACK_CHAT_REPLY,
      model: GEMINI_MODEL,
      fallback: true,
      message: mapGeminiError(error),
    });
  }
};

app.post("/api/chat", handleChatRequest);
app.post("/api/chatbot/gemini", handleChatRequest);

app.post("/api/ml/generate-steps", async (req, res) => {
  try {
    const payload = {
      productType: sanitizeText(req.body?.productType, 120),
      purpose: sanitizeText(req.body?.purpose, 400),
      targetUser: sanitizeText(req.body?.targetUser, 120),
      environment: sanitizeText(req.body?.environment, 120),
      skillLevel: sanitizeText(req.body?.skillLevel, 60),
      budget: req.body?.budget ?? "",
      timeWeeks: req.body?.timeWeeks ?? "",
      safetyRequirements: sanitizeText(req.body?.safetyRequirements, 400),
      materials: Array.isArray(req.body?.preferredMaterials)
        ? req.body.preferredMaterials.map((m) => sanitizeText(m, 60)).filter(Boolean)
        : [],
      tools: Array.isArray(req.body?.availableTools)
        ? req.body.availableTools.map((t) => sanitizeText(t, 60)).filter(Boolean)
        : [],
      sustainabilityPriority: req.body?.sustainabilityPriority ?? false,
    };

    const output = await runMlInference(payload);
    const workflowSteps = Array.isArray(output?.workflowSteps) ? output.workflowSteps : [];

    if (!workflowSteps.length) {
      return res.status(502).json({
        success: false,
        message: "Failed to generate workflow steps",
      });
    }

    return res.status(200).json({
      success: true,
      workflowSteps,
    });
  } catch (error) {
    console.error("ML_GENERATE_STEPS_FAIL", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate workflow steps",
    });
  }
});

app.post("/api/ml/generate-design-data", async (req, res) => {
  try {
    const selectedDesign = req.body?.selectedDesign ?? null;
    const mlPayload = mapDraftToMlPayload(req.body ?? {}, selectedDesign);
    const designOptions = buildDesignOptions(mlPayload);

    let workflowSteps = [];
    if (selectedDesign) {
      try {
        const output = await runMlInference(mlPayload);
        workflowSteps = Array.isArray(output?.workflowSteps) ? output.workflowSteps : [];
      } catch (error) {
        console.error("ML_GENERATE_DESIGN_DATA_WORKFLOW_FAIL", error);
      }
    }

    return res.status(200).json({
      success: true,
      designOptions,
      workflowSteps,
    });
  } catch (error) {
    console.error("ML_GENERATE_DESIGN_DATA_FAIL", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate design data",
    });
  }
});

app.listen(port, () => {
  console.log(`Contact API listening on port ${port}`);
});
