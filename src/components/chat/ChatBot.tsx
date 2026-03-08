import { useMemo, useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Check, Copy, Loader2, Send, Sparkles, Trash2, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { askGemini } from "@/services/gemini";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatContext {
  productTitle?: string;
  selectedMaterials?: string[];
  workflowSteps?: string[];
}

interface ChatBotProps {
  context?: ChatContext;
  isLoadingContext?: boolean;
  quickPrompts?: string[];
  className?: string;
}

const defaultQuickPrompts = [
  "How do I create a design?",
  "Give me 3 quick home decor ideas.",
  "How do comments and likes work?",
  "What can I do in guest mode?",
];

const GEMINI_SYSTEM_INSTRUCTION = `You are the AI assistant for the Design Muse application.
You help users with:

* using the website
* creating design ideas
* simple craft instructions
* answering questions about posts, comments, friends and settings.

Always answer clearly and helpfully.`;

const buildGeminiPrompt = (currentUserInput: string) =>
  `${GEMINI_SYSTEM_INSTRUCTION}\n\nUser message:\n${currentUserInput}`;

const createWelcomeMessage = (): ChatMessage => ({
  id: `welcome_${Date.now()}`,
  role: "assistant",
  content:
    "Hi, I am your Design Muse assistant. Ask me about website usage, design ideas, crafts, posts, comments, friends, or settings.",
  timestamp: new Date(),
});

const MarkdownMessage = ({ content }: { content: string }) => (
  <div className="markdown-body text-sm leading-7 text-inherit">
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
        ul: ({ children }) => <ul className="my-2 list-disc pl-5 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal pl-5 space-y-1">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ className, children }) => {
          const isBlock = Boolean(className?.includes("language-"));
          if (isBlock) {
            return (
              <code
                className={cn(
                  "block overflow-x-auto rounded-lg bg-slate-950 text-slate-100 p-3 text-xs",
                  className
                )}
              >
                {children}
              </code>
            );
          }
          return (
            <code className="rounded bg-slate-200/80 px-1.5 py-0.5 text-xs dark:bg-slate-700 dark:text-slate-100">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="my-2">{children}</pre>,
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

export function ChatBot({
  context,
  isLoadingContext = false,
  quickPrompts = defaultQuickPrompts,
  className,
}: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([createWelcomeMessage()]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasUserMessage = useMemo(
    () => messages.some((message) => message.role === "user"),
    [messages]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || isTyping) return;

    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: trimmedText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const prompt = buildGeminiPrompt(trimmedText);
      const geminiReply = await askGemini(prompt);

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: geminiReply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Gemini request failed", error);
      const message = error instanceof Error ? error.message : "Gemini request failed.";
      setErrorMessage(message);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    await sendMessage(inputValue);
  };

  const handleQuickPrompt = async (prompt: string) => {
    await sendMessage(prompt);
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([createWelcomeMessage()]);
    setInputValue("");
    setIsTyping(false);
    setErrorMessage(null);
  };

  return (
    <div
      className={cn(
        "h-full w-full flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50 text-slate-900 shadow-sm dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-100",
        className
      )}
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}
    >
      <header className="shrink-0 border-b border-slate-200/80 bg-white/85 backdrop-blur px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-700/80 dark:bg-slate-900/90">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center dark:bg-blue-900/50 dark:text-blue-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold truncate">Design Muse AI Assistant</h1>
            <p className="text-xs sm:text-sm text-slate-500 truncate dark:text-slate-400">
              {isLoadingContext
                ? "Loading context..."
                : `Context: ${context?.productTitle ? "title set" : "no title"} • ${context?.selectedMaterials?.length ?? 0} materials • ${context?.workflowSteps?.length ?? 0} steps`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            className="ml-auto h-8 gap-1.5 border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
        {!hasUserMessage && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleQuickPrompt(prompt)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-slate-700 hover:bg-slate-100 transition-colors dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {prompt}
              </button>
            ))}
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={cn("mb-4 flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "flex max-w-[92%] sm:max-w-[80%] gap-2 sm:gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "mt-1 h-8 w-8 rounded-full shrink-0 flex items-center justify-center",
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                  )}
                >
                  {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div
                  className={cn(
                    "relative rounded-2xl px-4 py-3 shadow-sm",
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-white text-slate-900 border border-slate-200 rounded-bl-md dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                  )}
                >
                  <MarkdownMessage content={message.content} />
                  <p className={cn("mt-2 text-[11px]", message.role === "user" ? "text-blue-100" : "text-slate-500 dark:text-slate-400")}>
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {message.role === "assistant" && message.content.trim().length > 0 && (
                    <button
                      onClick={() => handleCopy(message.id, message.content)}
                      className="absolute -right-2 -top-2 rounded-md border border-slate-200 bg-white p-1.5 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                      aria-label="Copy message"
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex justify-start">
            <div className="flex items-center gap-3 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
              <Bot className="h-4 w-4 text-slate-500 dark:text-slate-300" />
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "240ms" }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <footer className="shrink-0 border-t border-slate-200/80 bg-white/90 backdrop-blur px-3 py-3 sm:px-6 sm:py-4 dark:border-slate-700/80 dark:bg-slate-900/90">
        {errorMessage && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{errorMessage}</p>}
        <div className="flex items-end gap-2">
          <textarea
            placeholder="Message Design Muse AI..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="min-h-[46px] max-h-36 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="h-[46px] rounded-xl px-4"
            aria-label="Send message"
          >
            {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Enter to send, Shift+Enter for a new line.</p>
      </footer>
    </div>
  );
}
