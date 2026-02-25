import * as React from "react";
import { Info, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GuidedTooltipProps {
  content: string;
  children?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  variant?: "info" | "help";
  className?: string;
}

export function GuidedTooltip({
  content,
  children,
  side = "top",
  variant = "info",
  className,
}: GuidedTooltipProps) {
  const Icon = variant === "help" ? HelpCircle : Info;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children || (
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full p-1",
              "text-muted-foreground hover:text-foreground transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              className
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Feature hint component for first-time users
interface FeatureHintProps {
  title: string;
  description: string;
  isVisible: boolean;
  onDismiss: () => void;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function FeatureHint({
  title,
  description,
  isVisible,
  onDismiss,
  position = "bottom",
  className,
}: FeatureHintProps) {
  if (!isVisible) return null;

  const positionClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };

  return (
    <div
      className={cn(
        "absolute z-50 p-4 rounded-xl bg-primary text-primary-foreground shadow-xl",
        "animate-fade-in max-w-xs",
        positionClasses[position],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold mb-1">{title}</p>
          <p className="text-sm opacity-90">{description}</p>
          <button
            onClick={onDismiss}
            className="mt-2 text-sm font-medium underline hover:no-underline"
          >
            Got it!
          </button>
        </div>
      </div>
      {/* Arrow */}
      <div
        className={cn(
          "absolute w-3 h-3 bg-primary rotate-45",
          position === "bottom" && "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
          position === "top" && "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
          position === "left" && "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
          position === "right" && "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
      />
    </div>
  );
}
