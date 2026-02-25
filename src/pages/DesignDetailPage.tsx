import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getDesignById, updateDesignTitle, deleteDesign } from "@/services/designs.service";
import { isValidUUID } from "@/lib/utils";

export default function DesignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [design, setDesign] = useState<any>(location.state?.design || null);
  const [loading, setLoading] = useState(!location.state?.design);
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
      await updateDesignTitle(design.id, title);
      setDesign({ ...design, title });
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


  // Render
  if (!isValidUUID(id)) return <AppLayout>Design not found</AppLayout>;
  if (loading) return <AppLayout>Loading design...</AppLayout>;
  if (!design) return <AppLayout>Design not found</AppLayout>;

  return (
    <AppLayout>
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
        <h1
          className="text-2xl font-bold cursor-pointer mb-4"
          onClick={() => {
            setTitle(design.title);
            setEditingTitle(true);
          }}
        >
          {design.title}
        </h1>
      )}

      <Button variant="destructive" onClick={handleDelete} className="mb-4">
        Delete Design
      </Button>

      <p className="text-sm text-muted-foreground">Status: {design.status}</p>
      <p className="text-sm text-muted-foreground">
        Created at: {new Date(design.created_at).toLocaleString()}
      </p>

     <h2>Description</h2>
<p>{design.constraints?.description || "No description"}</p>

<h2>Materials</h2>
<ul>
  {design.constraints?.materials?.map((m: string, i: number) => (
    <li key={i}>{m}</li>
  )) || <li>None</li>}
</ul>

<h2>Tools</h2>
<ul>
  {design.constraints?.tools?.map((t: string, i: number) => (
    <li key={i}>{t}</li>
  )) || <li>None</li>}
</ul>

<h2>Workflow</h2>
<ol>
  {design.workflow?.map((s: any, i: number) => (
    <li key={i}>{s.title || s}</li>
  )) || <li>No steps</li>}
</ol>
    </AppLayout>
  );
}
