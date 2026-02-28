import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Lightbulb,
  RefreshCw,
  Copy,
  Check
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getMyDesigns } from "@/services/designs.service";
import { useLocation } from "react-router-dom";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const pickOne = (items: string[]) =>
  items[Math.floor(Math.random() * items.length)];

const buildResponse = (input: string, context: {
  currentTitle?: string;
  lastTitles: string[];
  avgFeasibility: number | null;
  lastFeasibility: number | null;
}) => {
  const lowerInput = input.toLowerCase();
  const titleHint = context.currentTitle || context.lastTitles[0] || "this design";
  const feasibilityHint =
    typeof context.lastFeasibility === "number"
      ? `${context.lastFeasibility}%`
      : context.avgFeasibility !== null
        ? `${context.avgFeasibility}%`
        : null;

  const base = [
    `For ${titleHint}, focus on the highest-risk step first and validate it with a quick prototype.`,
    `If you’re refining ${titleHint}, reduce part count and standardize fasteners to simplify assembly.`,
    `Consider a modular split for ${titleHint} so future revisions don’t force a full redesign.`
  ];

  if (lowerInput.includes("material") || lowerInput.includes("wood") || lowerInput.includes("metal") || lowerInput.includes("plastic")) {
    const materialTips = [
      `For ${titleHint}, compare aluminum vs. ABS for weight and cost—prototype both for fit.`,
      `If durability is key for ${titleHint}, consider stainless steel or glass-filled nylon.`,
      `For a lower-cost build of ${titleHint}, evaluate MDF or ABS with reinforcing ribs.`
    ];
    return pickOne(materialTips);
  }

  if (lowerInput.includes("budget") || lowerInput.includes("cost") || lowerInput.includes("cheap") || lowerInput.includes("price")) {
    const budgetTips = [
      `Reduce cost on ${titleHint} by minimizing unique parts and reusing common components.`,
      `For ${titleHint}, target one process (e.g., sheet cutting) to keep tooling simple.`,
      `If ${titleHint} needs a lower BOM, swap to off‑the‑shelf fasteners and standard sizes.`
    ];
    return pickOne(budgetTips);
  }

  if (lowerInput.includes("electronics") || lowerInput.includes("battery") || lowerInput.includes("circuit") || lowerInput.includes("pcb")) {
    const electronicsTips = [
      `For ${titleHint}, keep the PCB modular so you can swap power stages without re-layout.`,
      `If ${titleHint} is battery-powered, prioritize sleep modes and test idle draw early.`,
      `Use a single connector standard (USB‑C or JST) across ${titleHint} to simplify sourcing.`
    ];
    return pickOne(electronicsTips);
  }

  if (lowerInput.includes("eco") || lowerInput.includes("green") || lowerInput.includes("sustain") || lowerInput.includes("recycle")) {
    const sustainabilityTips = [
      `Design ${titleHint} for disassembly so parts can be replaced and recycled easily.`,
      `For ${titleHint}, choose mono‑material parts where possible to improve recyclability.`,
      `If feasible, use recycled plastics or bamboo panels for ${titleHint} to lower impact.`
    ];
    return pickOne(sustainabilityTips);
  }

  if (lowerInput.includes("feasibility") || lowerInput.includes("risk") || lowerInput.includes("validate")) {
    if (feasibilityHint) {
      return `Your recent feasibility signal is ${feasibilityHint}. Focus on the lowest‑confidence step and prototype it first.`;
    }
    return `Focus on the riskiest step in ${titleHint} and validate it with a quick prototype.`;
  }

  const contextLine = feasibilityHint
    ? `Recent feasibility: ${feasibilityHint}.`
    : `I can tailor tips using your recent designs.`;

  return `${pickOne(base)} ${contextLine}`;
};

const quickPrompts = [
  "Suggest eco-friendly materials",
  "How can I reduce costs?",
  "Best practices for electronics",
  "Tips for modular design",
  "Material alternatives for plastic"
];

export default function AISuggestionsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [designs, setDesigns] = useState<any[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello${user?.user_metadata?.name ? `, ${user.user_metadata.name}` : ""}!
 I'm your AI design assistant. I can help with material selection, cost optimization, design tips, and sustainability recommendations. What would you like to know?`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    const loadDesigns = async () => {
      try {
        setIsLoadingContext(true);
        const data = await getMyDesigns(user.id);
        if (isMounted) {
          setDesigns(data || []);
        }
      } catch (error) {
        console.error("Failed to load designs for AI context", error);
      } finally {
        if (isMounted) setIsLoadingContext(false);
      }
    };

    loadDesigns();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const context = useMemo(() => {
    const currentTitle =
      typeof location.state?.title === "string" && location.state.title.trim()
        ? location.state.title.trim()
        : typeof location.state?.design?.title === "string"
          ? location.state.design.title.trim()
          : undefined;
    const lastTitles = designs
      .map((design) => design?.title)
      .filter((title: any) => typeof title === "string" && title.trim())
      .slice(0, 3);
    const feasibilityValues = designs
      .map((design) => design?.feasibilityScore)
      .filter((value: any) => typeof value === "number") as number[];
    const avgFeasibility = feasibilityValues.length
      ? Math.round(
          feasibilityValues.reduce((sum, value) => sum + value, 0) /
            feasibilityValues.length
        )
      : null;
    const lastFeasibility =
      feasibilityValues.length > 0 ? feasibilityValues[0] : null;

    return {
      currentTitle,
      lastTitles,
      avgFeasibility,
      lastFeasibility,
    };
  }, [designs, location.state]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI thinking delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    const aiResponse: Message = {
      id: `ai_${Date.now()}`,
      role: "assistant",
      content: buildResponse(inputValue, context),
      timestamp: new Date()
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, aiResponse]);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Design Assistant</h1>
              <p className="text-sm text-muted-foreground">Get instant design suggestions offline</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Prompts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-2 mb-4"
        >
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleQuickPrompt(prompt)}
              className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Lightbulb className="w-3 h-3 inline-block mr-1" />
              {prompt}
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-auto">
            {isLoadingContext
              ? "Context: loading…"
              : `Context: ${designs.length} designs${context.avgFeasibility !== null ? ` • Avg feasibility ${context.avgFeasibility}%` : ""}`}
          </span>
        </motion.div>

        {/* Chat Messages */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-4 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      message.role === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}>
                      {message.role === "user" 
                        ? <User className="w-4 h-4" /> 
                        : <Bot className="w-4 h-4 text-primary" />
                      }
                    </div>
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 group relative",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p className={cn(
                        "text-xs mt-1",
                        message.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                      )}>
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {message.role === "assistant" && (
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="absolute -right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-background border shadow-sm hover:bg-muted"
                        >
                          {copiedId === message.id 
                            ? <Check className="w-3 h-3 text-success" /> 
                            : <Copy className="w-3 h-3 text-muted-foreground" />
                          }
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about materials, costs, design tips..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={!inputValue.trim() || isTyping}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {isLoadingContext
                  ? "Loading your design context..."
                  : "Suggestions adapt to your designs and recent feasibility."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
