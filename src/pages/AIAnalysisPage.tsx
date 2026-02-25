import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Sparkles, Cpu, BarChart3, Lightbulb } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const analysisSteps = [
  { icon: Brain, label: "Understanding your requirements...", duration: 2000 },
  { icon: Sparkles, label: "Processing natural language input...", duration: 1500 },
  { icon: Cpu, label: "Running ML feasibility analysis...", duration: 2500 },
  { icon: BarChart3, label: "Calculating budget constraints...", duration: 1500 },
  { icon: Lightbulb, label: "Generating design concepts...", duration: 2000 },
];

export default function AIAnalysisPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 95);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentStepIndex < analysisSteps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
      }, analysisSteps[currentStepIndex].duration);

      return () => clearTimeout(timer);
    }
  }, [currentStepIndex]);

  useEffect(() => {
    if (progress === 100) {
      const timer = setTimeout(() => {
        navigate("/design/concepts", { state: location.state });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, navigate, location.state]);

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
        <h1 className="text-3xl font-bold text-white mb-2">
          AI Analysis in Progress
        </h1>
        <p className="text-white/60 mb-8">
          Our ML models are analyzing your design requirements
        </p>

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
