import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getDesignById, updateDesignTitle, deleteDesign } from "@/services/designs.service";
import { isValidUUID } from "@/lib/utils";
import { generateFullWorkflowPDF } from "@/utils/pdfExport";

export default function DesignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [design, setDesign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
const [title, setTitle] = useState(design?.title || "");
useEffect(() => {
  if (design?.title) setTitle(design.title);
}, [design]);

  // Fetch design safely if not passed via location.state
useEffect(() => {
  if (!id || !isValidUUID(id) || !user) return;

  const fetchDesign = async () => {
    setLoading(true);
    try {
      const data = await getDesignById(id);
      setDesign(data);
    } catch (err) {
      console.error("FAILED TO LOAD DESIGN", err);
      setDesign(null);
    } finally {
      setLoading(false);
    }
  };

  fetchDesign();
}, [id, user]);



  // Handle title update
  const handleUpdateTitle = async () => {
    if (!design || !user) return;

    try {
      const updatedTitle = await updateDesignTitle(design.id, title);
      setDesign({ ...design, title: updatedTitle });
      setEditingTitle(false);
    } catch (err) {
      console.error("UPDATE FAILED", err);
    }
  };

  // Handle delete
  const handleDelete = async () => {
  if (!design || !user || !confirm("Delete this design?")) return;

  try {
    await deleteDesign(design.id);
    navigate("/dashboard");
  } catch (err) {
    console.error("DELETE FAILED", err);
  }
};

  const handleDownload = () => {
    if (!design || !user) return;

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

  // Render
  if (!isValidUUID(id)) return <AppLayout>Design not found</AppLayout>;
  if (!user) return <AppLayout>Loading design...</AppLayout>;
  if (loading) return <AppLayout>Loading design...</AppLayout>;
  if (!design) return <AppLayout>Design not found</AppLayout>;

  return (
    <AppLayout>
      <div className="font-[system-ui]">
      {editingTitle ? (
        <div className="flex gap-2 mb-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <Button onClick={handleUpdateTitle}>Save</Button>
        </div>
      ) : (
        <div className="text-center border-b-2 border-teal-600 pb-6 mb-6">
          <h1
            className="text-[28px] font-bold cursor-pointer"
            onClick={() => {
              setTitle(design.title);
              setEditingTitle(true);
            }}
          >
            {design.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manufacturing Workflow - {steps.length} Steps
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" onClick={handleDownload}>
          Download PDF
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          Delete Design
        </Button>
      </div>

      {canonical && (
        <div className="mb-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-[12px] border border-[#e5e7eb] p-4">
            <p className="text-xs uppercase text-slate-500">Product</p>
            <p className="text-base font-semibold">
              {canonical.product_name || canonical.title || "Untitled"}
            </p>
            <p className="text-sm text-slate-500">
              {canonical.product_type || "Unknown type"}
            </p>
          </div>
          <div className="rounded-[12px] border border-[#e5e7eb] p-4">
            <p className="text-xs uppercase text-slate-500">Estimated Cost</p>
            <p className="text-base font-semibold">
              {typeof canonical.estimated_cost === "number"
                ? `â‚¹${canonical.estimated_cost.toLocaleString()}`
                : "N/A"}
            </p>
            <p className="text-sm text-slate-500">
              Time: {canonical.time_available || "N/A"}
            </p>
          </div>
          <div className="rounded-[12px] border border-[#e5e7eb] p-4 md:col-span-2">
            <p className="text-xs uppercase text-slate-500">Materials</p>
            {Array.isArray(canonical.materials) && canonical.materials.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {canonical.materials.map((material: string) => (
                  <span
                    key={material}
                    className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700"
                  >
                    {material}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No materials listed</p>
            )}
          </div>
        </div>
      )}

      {steps.length ? (
        <div className="space-y-6">
          {steps.map((step: any, index: number) => (
            <div key={step.id || index} className="border border-[#e5e7eb] rounded-[12px] p-5">
              <div className="flex items-center gap-4 mb-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-600 text-white text-sm font-bold">
                  {index + 1}
                </span>
                <h3 className="text-[18px] font-semibold flex-1">{step.title}</h3>
                <span className="text-sm text-slate-500">{step.duration}</span>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${formatEffortClass(
                    step.effort
                  )}`}
                >
                  {step.effort}
                </span>
              </div>
              <p className="text-[14px] text-[#4b5563]">{step.description}</p>
              {step.safetyNote ? (
                <div className="mt-[15px] rounded-lg bg-amber-100 text-[#92400e] text-sm px-3 py-2">
                  <strong>⚠️ Safety:</strong> {step.safetyNote}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          This design was created before workflow tracking.
        </p>
      )}
      </div>
    </AppLayout>
  );
}
