import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  DollarSign,
  Leaf,
  Check,
  X,
  TrendingDown,
  ExternalLink,
  Package,
  ArrowRight,
  Save,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MaterialSuggestion {
  id: string;
  original: {
    name: string;
    price: number;
    source: "Local" | "Online";
  };
  alternative: {
    name: string;
    price: number;
    source: "Local" | "Online";
    sustainabilityScore: number;
  };
  savings: number;
  tradeoff: string;
  accepted: boolean | null;
}

const initialSuggestions: MaterialSuggestion[] = [
  {
    id: "1",
    original: { name: "Premium Aluminum 6061", price: 45, source: "Online" },
    alternative: { name: "Recycled Aluminum Alloy", price: 28, source: "Local", sustainabilityScore: 92 },
    savings: 17,
    tradeoff: "Slightly lower tensile strength, but adequate for this design. Better for environment.",
    accepted: null,
  },
  {
    id: "2",
    original: { name: "Virgin ABS Plastic", price: 32, source: "Online" },
    alternative: { name: "Recycled PETG", price: 24, source: "Local", sustainabilityScore: 88 },
    savings: 8,
    tradeoff: "Similar durability, slightly different finish texture. More eco-friendly.",
    accepted: null,
  },
  {
    id: "3",
    original: { name: "Lithium Polymer Battery", price: 55, source: "Online" },
    alternative: { name: "LiFePO4 Battery", price: 48, source: "Online", sustainabilityScore: 85 },
    savings: 7,
    tradeoff: "Longer lifespan, safer chemistry, slightly heavier.",
    accepted: null,
  },
  {
    id: "4",
    original: { name: "Silicon Sealant Premium", price: 18, source: "Local" },
    alternative: { name: "Eco-Silicon Sealant", price: 15, source: "Local", sustainabilityScore: 95 },
    savings: 3,
    tradeoff: "Same performance, made with sustainable ingredients.",
    accepted: null,
  },
];

export default function MaterialOptimizationPage() {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<MaterialSuggestion[]>(initialSuggestions);

  const handleDecision = (id: string, accepted: boolean) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, accepted } : s))
    );
  };

  const totalOriginalCost = suggestions.reduce((sum, s) => sum + s.original.price, 0);
  const totalOptimizedCost = suggestions.reduce(
    (sum, s) => sum + (s.accepted ? s.alternative.price : s.original.price),
    0
  );
  const totalSavings = totalOriginalCost - totalOptimizedCost;
  const acceptedCount = suggestions.filter((s) => s.accepted === true).length;
  const avgSustainability =
    suggestions.filter((s) => s.accepted).length > 0
      ? Math.round(
          suggestions
            .filter((s) => s.accepted)
            .reduce((sum, s) => sum + s.alternative.sustainabilityScore, 0) /
            suggestions.filter((s) => s.accepted).length
        )
      : 0;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-success/10 text-success text-sm font-medium rounded-full flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Cost Optimization Available
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Material Optimization
          </h1>
          <p className="text-muted-foreground">
            Our AI found cheaper and more sustainable alternatives for your materials
          </p>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Potential Savings</span>
              </div>
              <p className="text-3xl font-bold text-success">${totalSavings}</p>
              <p className="text-sm text-muted-foreground">
                {acceptedCount} of {suggestions.length} accepted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-success" />
                </div>
                <span className="text-sm text-muted-foreground">Sustainability</span>
              </div>
              <p className="text-3xl font-bold text-success">{avgSustainability}%</p>
              <p className="text-sm text-muted-foreground">
                Average eco-score of selected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-accent" />
                </div>
                <span className="text-sm text-muted-foreground">New Total Cost</span>
              </div>
              <p className="text-3xl font-bold text-foreground">${totalOptimizedCost}</p>
              <p className="text-sm text-muted-foreground">
                Original: ${totalOriginalCost}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Material Suggestions */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">Material Alternatives</h2>
          
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  "transition-all",
                  suggestion.accepted === true && "ring-2 ring-success/50 bg-success/5",
                  suggestion.accepted === false && "opacity-60"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Original Material */}
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                        Current
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{suggestion.original.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ${suggestion.original.price} • {suggestion.original.source}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="hidden lg:flex items-center justify-center">
                      <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    </div>

                    {/* Alternative Material */}
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                        Suggested Alternative
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                          <Leaf className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{suggestion.alternative.name}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-success font-medium">${suggestion.alternative.price}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{suggestion.alternative.source}</span>
                            <span className="px-2 py-0.5 bg-success/10 text-success text-xs rounded-full">
                              {suggestion.alternative.sustainabilityScore}% eco
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Savings Badge */}
                    <div className="text-center lg:text-right">
                      <p className="text-2xl font-bold text-success">-${suggestion.savings}</p>
                      <p className="text-xs text-muted-foreground">savings</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant={suggestion.accepted === true ? "success" : "outline"}
                        size="icon"
                        onClick={() => handleDecision(suggestion.id, true)}
                        className={cn(
                          suggestion.accepted === true && "bg-success hover:bg-success/90"
                        )}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={suggestion.accepted === false ? "destructive" : "outline"}
                        size="icon"
                        onClick={() => handleDecision(suggestion.id, false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Tradeoff Info */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Trade-off:</span> {suggestion.tradeoff}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back to Workflow
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Compare Sources
            </Button>
            <Button variant="gradient" className="gap-2" onClick={() => navigate("/design/preview")}>
              <Save className="w-4 h-4" />
              Save & Continue
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
