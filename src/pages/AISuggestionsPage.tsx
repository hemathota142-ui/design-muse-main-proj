import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Lightbulb,
  Copy,
  Check,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useDesignDraft } from "@/contexts/DesignDraftContext";
import { getMyDesigns } from "@/services/designs.service";
import { getGuestDesigns } from "@/services/designStorage";
import { askDesignAssistant } from "@/services/aiAssistant.service";
import { useLocation } from "react-router-dom";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickPrompts = [
  "Suggest safer material alternatives",
  "Estimate cost and effort for 10 units",
  "Improve workflow for faster assembly",
  "Reduce manufacturing risks",
  "Recommend tools for this build",
];

export default function AISuggestionsPage() {
  const { user, isGuest } = useAuth();
  const { designDraft } = useDesignDraft();
  const location = useLocation();
  const [designs, setDesigns] = useState<any[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello${user?.user_metadata?.name ? `, ${user.user_metadata.name}` : ""}!\nI'm your Design Muse assistant for product design, materials, manufacturing workflow, safety, and cost/effort planning. Ask a design-specific question to get started.`,
      timestamp: new Date(),
    },
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
        const data = isGuest ? await getGuestDesigns() : user?.id ? await getMyDesigns(user.id) : [];
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
  }, [user, isGuest]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const context = useMemo(() => {
    const productTitle =
      typeof location.state?.title === "string" && location.state.title.trim()
        ? location.state.title.trim()
        : typeof location.state?.design?.title === "string" &&
            location.state.design.title.trim()
          ? location.state.design.title.trim()
          : typeof designDraft.productName === "string" &&
              designDraft.productName.trim()
            ? designDraft.productName.trim()
            : typeof designs[0]?.title === "string" && designs[0].title.trim()
              ? designs[0].title.trim()
              : undefined;

    const locationMaterials = Array.isArray(location.state?.design?.materials)
      ? location.state.design.materials
      : [];
    const draftMaterials = Array.isArray(designDraft.preferredMaterials)
      ? designDraft.preferredMaterials
      : [];
    const savedMaterials = Array.isArray(designs[0]?.canonicalDesign?.materials)
      ? designs[0].canonicalDesign.materials
      : [];

    const selectedMaterials = Array.from(
      new Set(
        [...locationMaterials, ...draftMaterials, ...savedMaterials]
          .filter(
            (material): material is string =>
              typeof material === "string" && material.trim().length > 0
          )
          .map((material) => material.trim())
      )
    ).slice(0, 12);

    const getStepLabel = (step: any) => {
      if (!step) return null;
      if (typeof step === "string" && step.trim()) return step.trim();
      if (typeof step?.title === "string" && step.title.trim()) {
        return step.title.trim();
      }
      if (typeof step?.description === "string" && step.description.trim()) {
        return step.description.trim();
      }
      return null;
    };

    const locationSteps = Array.isArray(location.state?.design?.workflow)
      ? location.state.design.workflow
      : Array.isArray(location.state?.design?.steps)
        ? location.state.design.steps
        : [];
    const draftSteps = Array.isArray(designDraft.workflowSteps)
      ? designDraft.workflowSteps
      : [];
    const savedSteps = Array.isArray(designs[0]?.workflow) ? designs[0].workflow : [];

    const workflowSteps = Array.from(
      new Set(
        [...locationSteps, ...draftSteps, ...savedSteps]
          .map(getStepLabel)
          .filter((label): label is string => typeof label === "string" && label.length > 0)
      )
    ).slice(0, 12);

    return {
      productTitle,
      selectedMaterials,
      workflowSteps,
    };
  }, [designDraft, designs, location.state]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const outgoingText = inputValue.trim();
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: outgoingText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const conversation = [...messages, userMessage]
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .slice(-12)
        .map((msg) => ({ role: msg.role, content: msg.content }));

      const responseText = await askDesignAssistant({
        messages: conversation,
        context,
      });

      const aiResponse: Message = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("AI assistant error", error);
      const fallback: Message = {
        id: `ai_error_${Date.now()}`,
        role: "assistant",
        content: "I couldn't generate a response right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsTyping(false);
    }
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
              <p className="text-sm text-muted-foreground">Design-only guidance with live AI responses</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">AI suggestions are advisory.</p>
        </motion.div>

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
              ? "Context: loading..."
              : `Context: ${context.productTitle ? "title set" : "no title"} • ${context.selectedMaterials.length} materials • ${context.workflowSteps.length} steps`}
          </span>
        </motion.div>

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
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 group relative",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p
                        className={cn(
                          "text-xs mt-1",
                          message.role === "user"
                            ? "text-primary-foreground/60"
                            : "text-muted-foreground"
                        )}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {message.role === "assistant" && (
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="absolute -right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-background border shadow-sm hover:bg-muted"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          )}
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
                      <span
                        className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about design, materials, workflow, safety, or cost..."
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
                  ? "Loading design context..."
                  : "Responses are generated from your design context and scoped to Design Muse topics."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

