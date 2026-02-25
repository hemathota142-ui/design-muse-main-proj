import { useState, useRef, useEffect } from "react";
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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Offline AI suggestions based on keywords
const aiResponses: Record<string, string[]> = {
  material: [
    "For durability, consider aluminum or stainless steel. They offer excellent strength-to-weight ratios.",
    "If sustainability is a priority, look into bamboo, recycled plastics, or cork-based materials.",
    "For budget-friendly options, ABS plastic or MDF wood are great choices with good machinability."
  ],
  budget: [
    "To reduce costs, consider using modular designs that minimize waste during manufacturing.",
    "Local sourcing can save 15-30% on material costs compared to imported alternatives.",
    "3D printing for prototypes can significantly reduce initial development costs."
  ],
  design: [
    "Focus on user ergonomics - products that feel natural to use have higher adoption rates.",
    "Consider designing for disassembly to make repairs easier and improve sustainability.",
    "Minimize the number of unique parts to reduce manufacturing complexity and costs."
  ],
  electronics: [
    "Use modular PCB designs for easier troubleshooting and future upgrades.",
    "Consider USB-C as the primary connector for broader compatibility.",
    "For battery-powered devices, prioritize sleep modes to extend battery life."
  ],
  sustainability: [
    "Choose materials that can be recycled at end-of-life to reduce environmental impact.",
    "Consider using bio-based plastics as alternatives to petroleum-based options.",
    "Design for longevity - products that last longer have lower lifetime environmental impact."
  ],
  default: [
    "I can help you with material selection, budget optimization, design principles, and sustainability tips!",
    "Try asking about specific materials, cost-saving strategies, or eco-friendly alternatives.",
    "Need help optimizing your design? Share your product type and constraints!"
  ]
};

const getAIResponse = (input: string): string => {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes("material") || lowerInput.includes("wood") || lowerInput.includes("metal") || lowerInput.includes("plastic")) {
    return aiResponses.material[Math.floor(Math.random() * aiResponses.material.length)];
  }
  if (lowerInput.includes("budget") || lowerInput.includes("cost") || lowerInput.includes("cheap") || lowerInput.includes("price")) {
    return aiResponses.budget[Math.floor(Math.random() * aiResponses.budget.length)];
  }
  if (lowerInput.includes("design") || lowerInput.includes("ergonomic") || lowerInput.includes("user")) {
    return aiResponses.design[Math.floor(Math.random() * aiResponses.design.length)];
  }
  if (lowerInput.includes("electronic") || lowerInput.includes("battery") || lowerInput.includes("circuit") || lowerInput.includes("pcb")) {
    return aiResponses.electronics[Math.floor(Math.random() * aiResponses.electronics.length)];
  }
  if (lowerInput.includes("eco") || lowerInput.includes("green") || lowerInput.includes("sustain") || lowerInput.includes("recycle")) {
    return aiResponses.sustainability[Math.floor(Math.random() * aiResponses.sustainability.length)];
  }
  
  return aiResponses.default[Math.floor(Math.random() * aiResponses.default.length)];
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      content: getAIResponse(inputValue),
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
          className="flex flex-wrap gap-2 mb-4"
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
                💡 This AI runs fully offline with pre-programmed responses
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
