import type { WorkflowStep } from "@/types/workflow";
import { supabase } from "@/lib/supabase";

// DB assumption: the Supabase "designs" table stores visibility in `is_public` (BOOLEAN).
// UI uses "public" | "private", so we map between the two here only.
const toDbIsPublic = (visibility?: "public" | "private") =>
  visibility === "public";

const fromDbIsPublic = (isPublic?: boolean | null) =>
  isPublic ? "public" : "private";

type DesignContent = {
  workflow?: WorkflowStep[];
  constraints?: any;
  status?: string;
  feasibilityScore?: number | null;
  design?: any;
};

const normalizeTitle = (title: string) => title.trim();

const mapDesignFromDb = (design: any) => {
  if (!design) return design;
  const content = (design.content ?? {}) as DesignContent;
  const canonicalDesign = content.design ?? null;

  const visibility =
    typeof design.visibility === "string"
      ? design.visibility
      : fromDbIsPublic(design.is_public);

  return {
    ...design,
    // Map DB boolean to UI string without changing UI components.
    visibility,
    // Canonical source for workflow is designs.workflow.
    workflow:
      design.workflow ??
      content.workflow ??
      (Array.isArray(canonicalDesign?.steps) ? canonicalDesign.steps : []),
    constraints: content.constraints ?? design.constraints,
    status: content.status ?? design.status,
    feasibilityScore:
      content.feasibilityScore ??
      design.feasibility_score ??
      design.feasibilityScore ??
      null,
    canonicalDesign: canonicalDesign
      ? { ...canonicalDesign, visibility: canonicalDesign.visibility ?? visibility }
      : null,
  };
};

const notifyDesignsUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("designs:updated"));
  }
};

const migrateWorkflowIfNeeded = async (design: any, userId: string) => {
  if (!design || !userId) return;
  const hasWorkflow = Array.isArray(design.workflow) && design.workflow.length > 0;
  const contentWorkflow = (design.content ?? {}).workflow;
  const shouldMigrate = !hasWorkflow && Array.isArray(contentWorkflow) && contentWorkflow.length > 0;

  if (!shouldMigrate) return;

  const { error } = await supabase
    .from("designs")
    .update({ workflow: contentWorkflow })
    .eq("id", design.id)
    .eq("user_id", userId);

  if (error) {
    console.error("WORKFLOW MIGRATION ERROR:", error);
  } else {
    design.workflow = contentWorkflow;
  }
};


export const updateDesignWorkflow = async (
  designId: string,
  workflow: WorkflowStep[]
) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: existing, error: fetchError } = await supabase
    .from("designs")
    .select("content")
    .eq("id", designId)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    console.error("SUPABASE WORKFLOW LOAD ERROR:", fetchError);
    throw fetchError;
  }

  const prevContent = (existing?.content ?? {}) as DesignContent;
  const nextContent: DesignContent = {
    ...prevContent,
    workflow,
    design: prevContent.design
      ? { ...prevContent.design, steps: workflow }
      : prevContent.design,
  };

  const { error } = await supabase
    .from("designs")
    .update({ content: nextContent })
    .eq("id", designId)
    .eq("user_id", user.id);

  if (error) {
    console.error("SUPABASE WORKFLOW UPDATE ERROR:", error);
    throw error;
  }

  notifyDesignsUpdated();
  return true;
};


export async function getMyDesigns(userId: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  if (userId !== user.id) {
    throw new Error("Unauthorized access");
  }

  const { data, error } = await supabase
    .from("designs")
    .select(
      "id, title, description, content, user_id, is_public, visibility, status, created_at, workflow, constraints, feasibility_score"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (data?.length) {
    await Promise.all(data.map((design) => migrateWorkflowIfNeeded(design, user.id)));
  }
  return data?.map(mapDesignFromDb);
}

export async function createDesign(payload: {
  title: string;
  workflow: any;
  constraints: any;
  status?: string;
  visibility?: "public" | "private";
  description?: string;
  feasibilityScore?: number | null;
  canonicalDesign?: any;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not logged in");

  const normalizedTitle = normalizeTitle(payload.title || "");
  if (!normalizedTitle) {
    throw new Error("Title is required");
  }

  const canonicalDesign = payload.canonicalDesign;

  const { data, error } = await supabase
    .from("designs")
    .insert({
      title: normalizedTitle,
      status: payload.status ?? "draft",
      description: payload.description ?? null,
      workflow: payload.workflow ?? null,
      constraints: payload.constraints ?? null,
      // Store all design content in a single JSON column to match the DB contract.
      content: {
        constraints: payload.constraints,
        status: payload.status ?? "draft",
        feasibilityScore: payload.feasibilityScore ?? null,
        design: canonicalDesign ?? null,
      },
      // Map UI "public"/"private" to DB `is_public` BOOLEAN.
      is_public: toDbIsPublic(payload.visibility),
      visibility: payload.visibility ?? "private",
      feasibility_score: payload.feasibilityScore ?? null,
      user_id: user.id,                  // REQUIRED for RLS
    })
    .select()
    .single();

  if (error) {
    console.error("createDesign error", error);
    throw error;
  }

  if (data?.id) {
    console.info("Saved design ID:", data.id);
  }

  if (data?.id && canonicalDesign) {
    const nextContent: DesignContent = {
      ...(data.content ?? {}),
      design: {
        ...canonicalDesign,
        id: data.id,
        created_at: data.created_at ?? canonicalDesign.created_at,
      },
    };

    const { error: updateError } = await supabase
      .from("designs")
      .update({ content: nextContent })
      .eq("id", data.id)
      .eq("user_id", data.user_id);

    if (updateError) {
      console.error("CANONICAL DESIGN UPDATE ERROR:", updateError);
    } else {
      data.content = nextContent;
    }
  }

  notifyDesignsUpdated();
  return mapDesignFromDb(data);
}





export async function getDesignById(id: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("designs")
    .select(
      `
      id,
      title,
      description,
      content,
      is_public,
      visibility,
      status,
      feasibility_score,
      workflow,
      constraints,
      created_at
      `
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("getDesignById error", error);
    return null;
  }

  await migrateWorkflowIfNeeded(data, user.id);
  return mapDesignFromDb(data);
}


export const updateDesignTitle = async (
  id: string,
  title: string
) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const normalizedTitle = normalizeTitle(title || "");
  if (!normalizedTitle) {
    throw new Error("Title is required");
  }

  const { error } = await supabase
    .from("designs")
    .update({ title: normalizedTitle })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("SUPABASE UPDATE ERROR:", error);
    throw error;
  }

  notifyDesignsUpdated();

  return normalizedTitle;
};

export const updateDesignVisibility = async (
  id: string,
  visibility: "public" | "private"
) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: existing, error: fetchError } = await supabase
    .from("designs")
    .select("content")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    console.error("SUPABASE VISIBILITY LOAD ERROR:", fetchError);
    throw fetchError;
  }

  const prevContent = (existing?.content ?? {}) as DesignContent;
  const nextContent: DesignContent = {
    ...prevContent,
    design: prevContent.design
      ? { ...prevContent.design, visibility }
      : prevContent.design,
  };

  const { error } = await supabase
    .from("designs")
    // Map UI "public"/"private" to DB `is_public` BOOLEAN for updates.
    .update({ is_public: toDbIsPublic(visibility), content: nextContent })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("SUPABASE VISIBILITY UPDATE ERROR:", error);
    throw error;
  }

  notifyDesignsUpdated();
  return true;
};

export async function deleteDesign(designId: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("designs")
    .delete()
    .eq("id", designId)
    .eq("user_id", user.id);

  if (error) {
    console.error("DELETE ERROR:", error);
    throw error;
  }

  notifyDesignsUpdated();
};




