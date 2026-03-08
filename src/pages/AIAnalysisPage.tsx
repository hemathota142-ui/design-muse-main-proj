import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Sparkles, Cpu, BarChart3, Lightbulb } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useDesignDraft } from "@/contexts/DesignDraftContext";
import { useToast } from "@/hooks/use-toast";
import { generateDesignData } from "@/services/designGenerator.service";

const analysisSteps = [
  { icon: Brain, label: "Understanding your requirements...", duration: 2000 },
  { icon: Sparkles, label: "Analyzing your design inputs...", duration: 1500 },
  { icon: Cpu, label: "Working on your design model...", duration: 2500 },
  { icon: BarChart3, label: "Preparing feasibility insights...", duration: 1500 },
  { icon: Lightbulb, label: "Generating design concepts...", duration: 2000 },
];

export default function AIAnalysisPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { designDraft } = useDesignDraft();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [generatedOptions, setGeneratedOptions] = useState<any[] | null>(null);

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 1, 92));
    }, 140);

    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = setTimeout(() => {
      setCurrentStepIndex((prev) => (prev + 1) % analysisSteps.length);
    }, analysisSteps[currentStepIndex].duration);

    return () => clearTimeout(timer);
  }, [currentStepIndex, isGenerating]);

  useEffect(() => {
    let isMounted = true;

    const runGeneration = async () => {
      try {
        const payload = {
          productType: (designDraft.customProductType || designDraft.productType || "").trim(),
          purpose: designDraft.purpose,
          targetUser: (designDraft.customTargetUser || designDraft.targetUser || "").trim(),
          environment: (designDraft.customEnvironment || designDraft.environment || "").trim(),
          skillLevel: designDraft.skillLevel,
          budget: designDraft.budget,
          timeWeeks: Array.isArray(designDraft.timeWeeks) ? designDraft.timeWeeks[0] ?? "" : designDraft.timeWeeks,
          safetyRequirements: designDraft.safetyRequirements,
          preferredMaterials: designDraft.preferredMaterials,
          availableTools: designDraft.availableTools,
          sustainabilityPriority: designDraft.sustainabilityPriority,
        };

        const result = await generateDesignData(payload);
        if (!isMounted) return;
        setGeneratedOptions(result.designOptions);
      } catch (_error) {
        if (!isMounted) return;
        toast({
          title: "Model generation delayed",
          description: "Using fallback design options for now.",
          variant: "destructive",
        });
      } finally {
        if (!isMounted) return;
        setIsGenerating(false);
      }
    };

    runGeneration();

    return () => {
      isMounted = false;
    };
  }, [designDraft, toast]);

  useEffect(() => {
    if (isGenerating) return;
    if (progress < 100) {
      const timer = setTimeout(() => {
        setProgress((prev) => Math.min(prev + 8, 100));
      }, 40);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      navigate("/design/concepts", {
        state: generatedOptions ? { designOptions: generatedOptions } : undefined,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [isGenerating, progress, navigate, generatedOptions]);

  const currentStep = analysisSteps[currentStepIndex];

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg text-center"
      >
        {/* Animated Brain Icon */}
        <div className="relative mb-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-32 h-32 mx-auto rounded-full border-2 border-primary/30"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full border-2 border-accent/30"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/20 backdrop-blur-lg flex items-center justify-center">
              <currentStep.icon className="w-10 h-10 text-primary" />
            </div>
          </motion.div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2">Design Analysis in Progress</h1>
        <p className="text-white/60 mb-8">Analyzing your design inputs and constraints</p>

        {/* Current Step */}
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-lg text-white/80">{currentStep.label}</p>
        </motion.div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <Progress value={progress} className="h-2 bg-white/10" />
          <p className="text-sm text-white/40">{Math.round(progress)}% complete</p>
        </div>

        {/* Analysis Steps Indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {analysisSteps.map((step, index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index <= currentStepIndex ? "bg-primary" : "bg-white/20"
              }`}
              animate={index === currentStepIndex ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
