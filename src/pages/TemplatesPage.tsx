import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Layers, 
  Smartphone, 
  Lamp, 
  Watch, 
  Package,
  Wrench,
  Home,
  ArrowRight,
  X,
  Copy,
  Eye,
  Edit,
  Play
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ElementType;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime: string;
  materials: string[];
  previewImage?: string;
}

const templates: Template[] = [
  {
    id: "solar-charger",
    name: "Portable Solar Charger",
    category: "Consumer Electronics",
    description: "A compact solar-powered USB charger perfect for outdoor enthusiasts.",
    icon: Smartphone,
    difficulty: "Intermediate",
    estimatedTime: "3-4 weeks",
    materials: ["Solar panel", "Lithium battery", "PCB", "ABS plastic case"]
  },
  {
    id: "desk-lamp",
    name: "Adjustable LED Desk Lamp",
    category: "Home Decor",
    description: "Modern minimalist lamp with adjustable arm and dimmable LED lighting.",
    icon: Lamp,
    difficulty: "Beginner",
    estimatedTime: "1-2 weeks",
    materials: ["Aluminum tubing", "LED strip", "Wood base", "Touch dimmer"]
  },
  {
    id: "smart-watch-stand",
    name: "Smart Watch Charging Stand",
    category: "Wearables Accessory",
    description: "Elegant charging dock for smartwatches with cable management.",
    icon: Watch,
    difficulty: "Beginner",
    estimatedTime: "1 week",
    materials: ["Wood or bamboo", "Felt padding", "Magnets"]
  },
  {
    id: "tool-organizer",
    name: "Modular Tool Organizer",
    category: "Tools",
    description: "Customizable wall-mounted system for organizing workshop tools.",
    icon: Wrench,
    difficulty: "Intermediate",
    estimatedTime: "2-3 weeks",
    materials: ["Plywood", "3D printed hooks", "Metal brackets"]
  },
  {
    id: "plant-pot",
    name: "Self-Watering Plant Pot",
    category: "Home Decor",
    description: "Smart planter with reservoir and water level indicator.",
    icon: Home,
    difficulty: "Beginner",
    estimatedTime: "1-2 weeks",
    materials: ["Ceramic or plastic", "Wick rope", "Water reservoir"]
  },
  {
    id: "cable-box",
    name: "Cable Management Box",
    category: "Home Office",
    description: "Sleek box to hide and organize power strips and cables.",
    icon: Package,
    difficulty: "Beginner",
    estimatedTime: "1 week",
    materials: ["MDF or plywood", "Ventilation mesh", "Cable slots"]
  }
];

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", ...new Set(templates.map(t => t.category))];

  const filteredTemplates = activeCategory === "All" 
    ? templates 
    : templates.filter(t => t.category === activeCategory);

  const handleUseTemplate = (template: Template) => {
    // Navigate to design wizard with template data pre-filled
    navigate("/design/new", { 
      state: { 
        template: {
          productType: template.category,
          productName: template.name,
          purpose: template.description,
          preferredMaterials: template.materials
        }
      }
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "text-success bg-success/10";
      case "Intermediate": return "text-warning bg-warning/10";
      case "Advanced": return "text-destructive bg-destructive/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-success" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Design Templates</h1>
              <p className="text-muted-foreground">Start with pre-built templates to speed up your design</p>
            </div>
          </div>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {category}
            </button>
          ))}
        </motion.div>

        {/* Templates Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="card-hover cursor-pointer h-full"
                onClick={() => setSelectedTemplate(template)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <template.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      getDifficultyColor(template.difficulty)
                    )}>
                      {template.difficulty}
                    </span>
                  </div>

                  <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {template.description}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{template.estimatedTime}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {template.category}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Template Detail Modal */}
        <AnimatePresence>
          {selectedTemplate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedTemplate(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border rounded-2xl shadow-xl max-w-lg w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <selectedTemplate.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{selectedTemplate.name}</h2>
                      <p className="text-sm text-muted-foreground">{selectedTemplate.category}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <p className="text-muted-foreground mb-6">{selectedTemplate.description}</p>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Difficulty</span>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      getDifficultyColor(selectedTemplate.difficulty)
                    )}>
                      {selectedTemplate.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estimated Time</span>
                    <span className="text-sm font-medium text-foreground">{selectedTemplate.estimatedTime}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm font-medium text-foreground mb-2">Required Materials</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.materials.map((material) => (
                      <span 
                        key={material}
                        className="px-3 py-1 rounded-full text-xs bg-muted text-muted-foreground"
                      >
                        {material}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Template Actions */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Button variant="outline" className="gap-2">
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </Button>
                </div>

                <Button 
                  variant="gradient" 
                  className="w-full gap-2"
                  onClick={() => handleUseTemplate(selectedTemplate)}
                >
                  <Play className="w-4 h-4" />
                  Use This Template
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
