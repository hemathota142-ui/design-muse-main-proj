import { useState, useMemo } from "react";
import type { WorkflowStep } from "@/types/workflow";
import { generateStepPDF, generateFullWorkflowPDF } from "@/utils/pdfExport"; // ✅ updated
import { useAuth } from "@/contexts/AuthContext";
import { createDesign, updateDesignWorkflow } from "@/services/designs.service";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import {
  GripVertical,
  Check,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit2,
  Save,
  ArrowRight,
  Info,
  Download,
  FileText,
  Package,
  Wrench
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";


  
// Generate workflow based on selected concept
const generateWorkflowSteps = (concept?: any, formData?: any): WorkflowStep[] => {
  const baseMaterials = concept?.materials || formData?.preferredMaterials || ["Aluminum", "ABS Plastic", "Silicon"];

  return [
    {
      id: "1",
      title: "Gather Materials",
      description: `Collect all required materials for your ${concept?.name || "design"}.`,
      duration: "2-3 hours",
      effort: "Low",
      completed: false,
      materials: baseMaterials,
    },
    {
      id: "2",
      title: "Prepare Workspace",
      description: "Set up your workspace with proper ventilation and safety equipment. Ensure all tools are accessible.",
      duration: "30 mins",
      effort: "Low",
      safetyNote: "Ensure proper ventilation when working with adhesives.",
      completed: false,
    },
    {
      id: "3",
      title: "Cut Primary Components",
      description: `Using measurements from the ${concept?.name || "design"}, cut the frame pieces and panels to size.`,
      duration: "1-2 hours",
      effort: "Medium",
      safetyNote: "Wear safety goggles and gloves when cutting materials.",
      completed: false,
    },
    {
      id: "4",
      title: "Assemble Frame Structure",
      description: "Connect the frame pieces using corner brackets and screws. Verify alignment.",
      duration: "1 hour",
      effort: "Medium",
      completed: false,
    },
    {
      id: "5",
      title: "Install Core Components",
      description: `Install the main components according to the ${concept?.name || "design"} specifications.`,
      duration: "2 hours",
      effort: "High",
      safetyNote: concept?.name?.includes("Electronic") ? "Disconnect power before handling electronic components." : undefined,
      completed: false,
    },
    {
      id: "6",
      title: "Apply Finishing",
      description: "Apply sealant, paint, or finishing touches as needed for protection and aesthetics.",
      duration: "1 hour + drying",
      effort: "Low",
      completed: false,
    },
    {
      id: "7",
      title: "Final Assembly & Testing",
      description: "Complete final assembly, run functionality tests, and verify all connections.",
      duration: "1-2 hours",
      effort: "Medium",
      completed: false,
    },
  ];
};

export default function WorkflowPage() {
  const location = useLocation();
  const existingDesign = location.state?.design ?? null;
  const navigate = useNavigate();
  
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
const { user, isGuest } = useAuth();
  const concept = location.state?.concept;
  console.log("WorkflowPage concept:", concept);
  const formData = location.state?.formData;
  
const [steps, setSteps] = useState<WorkflowStep[]>(() => generateWorkflowSteps(concept, formData));
  const [expandedStep, setExpandedStep] = useState<string | null>("1");
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showMaterialsOptimization, setShowMaterialsOptimization] = useState(false);

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;
  const allCompleted = completedCount === steps.length;

  const toggleComplete = (id: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, completed: !step.completed } : step
      )
    );
    
    // Show optimize button after first step is completed
    const stepIndex = steps.findIndex(s => s.id === id);
    if (stepIndex === 0 && !steps[0].completed) {
      setShowMaterialsOptimization(true);
    }
  };

  const startEditing = (step: WorkflowStep) => {
    setEditingStep(step.id);
    setEditTitle(step.title);
  };

  const saveEdit = (id: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, title: editTitle } : step
      )
    );
    setEditingStep(null);
  };

  const handleDownloadStep = (step: WorkflowStep, index: number) => {
    generateStepPDF(step, index + 1);
    toast({
      title: "PDF Generated",
      description: `Step ${index + 1}: ${step.title} is ready to print/save.`
    });
  };
  const handleDownloadAll = () => {
  generateFullWorkflowPDF(
    steps,
    concept?.name || "Design Workflow"
  );

  toast({
    title: "Workflow PDF Generated",
    description: "Complete workflow PDF is ready.",
  });
};


  const handleContinue = async () => {
  if (!user || isGuest) {
    toast({
      title: "Login required",
      description: "Please login to save designs",
      variant: "destructive",
    });
    return;
  }

  try {
    setLoading(true);

    let savedDesign;

    if (existingDesign?.id) {
      await updateDesignWorkflow(existingDesign.id, steps);
      savedDesign = { ...existingDesign, workflow: steps };
    } else {
      console.log("FINAL STEPS", steps);
      savedDesign = await createDesign({
  title: concept?.name?.trim() || "Untitled Design",
  workflow: steps, // MUST be final steps array
  constraints: {
    description: formData.description,
    materials: formData.materials,
    tools: formData.tools,
    notes: formData.notes,
  },
});

    }

    if (!savedDesign?.id) {
      throw new Error("Design ID missing after save");
    }

    toast({
      title: "Design saved",
      description: `Design "${savedDesign.title}" saved successfully!`,
    });

    navigate(`/designs/${savedDesign.id}`);
  } catch (err: any) {
    toast({
      title: "Failed to save design",
      description: err.message || "Unknown error",
    });
  } finally {
    setLoading(false);
  }
};


  const effortColor = (effort: string) => {
    switch (effort) {
      case "Low":
        return "text-success bg-success/10";
      case "Medium":
        return "text-warning bg-warning/10";
      case "High":
        return "text-destructive bg-destructive/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Manufacturing Workflow
            </h1>
            <p className="text-muted-foreground">
              Follow these steps to build your {concept?.name || "design"}
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleDownloadAll}>
            <Download className="w-4 h-4" />
            Download Full PDF
          </Button>
        </motion.div>

        {/* Progress Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Overall Progress</p>
                <p className="text-2xl font-bold text-foreground">
                  {completedCount} of {steps.length} steps completed
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">
                  {Math.round(progressPercent)}%
                </p>
              </div>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </CardContent>
        </Card>

        {/* Materials Optimization Button */}
        <AnimatePresence>
          {showMaterialsOptimization && !allCompleted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Optimize Materials</p>
                      <p className="text-sm text-muted-foreground">
                        Find cost-effective alternatives before continuing
                      </p>
                    </div>
                  </div>
                  <Button variant="gradient" onClick={() => navigate("/design/optimize", { state: { concept, formData } })}>
                    Optimize Now
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workflow Steps */}
        <Reorder.Group
          axis="y"
          values={steps}
          onReorder={setSteps}
          className="space-y-3"
        >
          {steps.map((step, index) => (
            <Reorder.Item
              key={step.id}
              value={step}
              className="list-none"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    "transition-all duration-200",
                    step.completed && "bg-muted/50",
                    expandedStep === step.id && "ring-1 ring-primary/20"
                  )}
                >
                  <CardContent className="p-0">
                    {/* Step Header */}
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer"
                      onClick={() =>
                        setExpandedStep(expandedStep === step.id ? null : step.id)
                      }
                    >
                      {/* Drag Handle */}
                      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="w-5 h-5" />
                      </div>

                      {/* Completion Checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComplete(step.id);
                        }}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                          step.completed
                            ? "bg-success border-success text-success-foreground"
                            : "border-border hover:border-primary"
                        )}
                      >
                        {step.completed && <Check className="w-4 h-4" />}
                      </button>

                      {/* Step Number */}
                      <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {index + 1}
                      </span>

                      {/* Step Title */}
                      <div className="flex-1">
                        {editingStep === step.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="h-8"
                              autoFocus
                            />
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => saveEdit(step.id)}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <p
                            className={cn(
                              "font-medium",
                              step.completed ? "text-muted-foreground line-through" : "text-foreground"
                            )}
                          >
                            {step.title}
                          </p>
                        )}
                      </div>

                      {/* Duration & Effort */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {step.duration}
                        </div>
                        <span
                          className={cn(
                            "px-2 py-1 text-xs font-medium rounded-full",
                            effortColor(step.effort)
                          )}
                        >
                          {step.effort}
                        </span>
                        {expandedStep === step.id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedStep === step.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 border-t border-border"
                      >
                        <div className="pt-4 pl-16 space-y-3">
                          <p className="text-muted-foreground">{step.description}</p>

                          {/* Materials List (for Gather Materials step) */}
                          {step.materials && step.materials.length > 0 && (
                            <div className="p-3 rounded-lg bg-muted/50 border border-border">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="w-4 h-4 text-primary" />
                                <p className="text-sm font-medium text-foreground">Required Materials:</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {step.materials.map((material) => (
                                  <span
                                    key={material}
                                    className="px-3 py-1 text-sm rounded-full bg-primary/10 text-primary"
                                  >
                                    {material}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {step.safetyNote && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-warning">Safety Note</p>
                                <p className="text-sm text-warning/80">{step.safetyNote}</p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(step);
                              }}
                            >
                              <Edit2 className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadStep(step, index);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Download PDF
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex justify-between"
        >
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back to Concepts
          </Button>
         
  {loading && (
  <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-50">
    <p className="text-lg font-medium">Saving workflow… please wait</p>
  </div>
)}


          
          {allCompleted ? (
            <Button
              variant="gradient"
              className="gap-2"
              onClick={handleContinue}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="gradient"
              className="gap-2"
              onClick={() => navigate("/design/optimize", { state: { concept, formData } })}
            >
              Optimize Materials
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
