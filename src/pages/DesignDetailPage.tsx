import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { getDesignById, updateDesignTitle, deleteDesign } from "@/services/designs.service";
import { isValidUUID } from "@/lib/utils";
import { generateFullWorkflowPDF } from "@/utils/pdfExport";
import { Download, Trash2, Pencil, Clock3, ShieldAlert } from "lucide-react";
import {
  getGuestDesignById,
  deleteGuestDesign,
  updateGuestDesign,
} from "@/services/designStorage";

const normalizeGuestDesign = (guest: any) => {
  if (!guest) return null;
  const draft = guest.designDraft || guest.data?.designDraft || {};
  return {
    id: guest.id,
    title: guest.name || draft.title || "Untitled Design",
    canonicalDesign: guest.canonicalDesign || guest.data?.canonicalDesign || null,
    workflow: Array.isArray(draft.workflow) ? draft.workflow : [],
  };
};

export default function DesignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGuest } = useAuth();
  const isReadOnly = new URLSearchParams(location.search).get("mode") === "read";

  const [design, setDesign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(design?.title || "");

  useEffect(() => {
    if (design?.title) setTitle(design.title);
  }, [design]);

  useEffect(() => {
    if (!id) return;

    const fetchDesign = async () => {
      setLoading(true);
      try {
        const data = isGuest
          ? normalizeGuestDesign(await getGuestDesignById(id))
          : user && isValidUUID(id)
            ? await getDesignById(id)
            : null;
        setDesign(data);
      } catch (err) {
        console.error("FAILED TO LOAD DESIGN", err);
        setDesign(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDesign();
  }, [id, user, isGuest]);

  const handleUpdateTitle = async () => {
    if (!design || isReadOnly) return;

    try {
      if (isGuest) {
        const updated = await updateGuestDesign(design.id, { name: title } as any);
        setDesign(normalizeGuestDesign(updated));
      } else {
        if (!user) return;
        const updatedTitle = await updateDesignTitle(design.id, title);
        setDesign({ ...design, title: updatedTitle });
      }
      setEditingTitle(false);
    } catch (err) {
      console.error("UPDATE FAILED", err);
    }
  };

  const handleDelete = async () => {
    if (!design || isReadOnly || !confirm("Delete this design?")) return;

    try {
      if (isGuest) {
        await deleteGuestDesign(design.id);
      } else {
        if (!user) return;
        await deleteDesign(design.id);
      }
      navigate("/dashboard");
    } catch (err) {
      console.error("DELETE FAILED", err);
    }
  };

  const handleDownload = () => {
    if (!design) return;

    const steps = Array.isArray(design.workflow) ? design.workflow : [];
    generateFullWorkflowPDF(steps, design.title || "Design Workflow");
  };

  const canonical = design?.canonicalDesign ?? design?.content?.design ?? null;
  const steps = Array.isArray(design?.workflow) ? design.workflow : [];

  const formatEffortClass = (effort: string) => {
    const value = (effort || "").toLowerCase();
    if (value === "low") return "bg-green-100 text-green-800";
    if (value === "medium") return "bg-amber-100 text-amber-800";
    if (value === "high") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-600";
  };

  if (!id) return <AppLayout>Design not found</AppLayout>;
  if (!isGuest && !isValidUUID(id)) return <AppLayout>Design not found</AppLayout>;
  if (!isGuest && !user) return <AppLayout>Loading design...</AppLayout>;
  if (loading) return <AppLayout>Loading design...</AppLayout>;
  if (!design) return <AppLayout>Design not found</AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-6">
            {editingTitle ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
                <Button onClick={handleUpdateTitle}>Save</Button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{design.title || "Untitled Design"}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manufacturing workflow - {steps.length} steps
                  </p>
                </div>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setTitle(design.title || "");
                      setEditingTitle(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit title
                  </Button>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" className="gap-2" onClick={handleDownload}>
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              {!isReadOnly && (
                <Button variant="destructive" className="gap-2" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" />
                  Delete Design
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {canonical && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Product</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-foreground">
                  {canonical.product_name || canonical.title || "Untitled"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {canonical.product_type || "Unknown type"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Estimate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-lg font-semibold text-foreground">
                  {typeof canonical.estimated_cost === "number"
                    ? `INR ${canonical.estimated_cost.toLocaleString()}`
                    : "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Time: {canonical.time_available || "N/A"}
                </p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Materials</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(canonical.materials) && canonical.materials.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {canonical.materials.map((material: string) => (
                      <span
                        key={material}
                        className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {material}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No materials listed</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {steps.length ? (
          <div className="space-y-4">
            {steps.map((step: any, index: number) => (
              <Card key={step.id || index}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      {index + 1}
                    </span>
                    <h3 className="text-lg font-semibold text-foreground flex-1">{step.title}</h3>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="w-3 h-3" />
                      {step.duration || "N/A"}
                    </span>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${formatEffortClass(
                        step.effort
                      )}`}
                    >
                      {step.effort || "unknown"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.safetyNote ? (
                    <div className="mt-3 rounded-lg bg-amber-100/80 text-amber-900 text-sm px-3 py-2 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 mt-0.5" />
                      <span>{step.safetyNote}</span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                This design was created before workflow tracking.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
