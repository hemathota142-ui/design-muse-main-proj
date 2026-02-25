import type { WorkflowStep } from "@/types/workflow";
import { supabase } from "@/lib/supabase";

// DB assumption: the Supabase "designs" table stores visibility in `is_public` (BOOLEAN).
// UI uses "public" | "private", so we map between the two here only.
const toDbIsPublic = (visibility?: "public" | "private") =>
  visibility === "public";

const fromDbIsPublic = (isPublic?: boolean | null) =>
  isPublic ? "public" : "private";

const mapDesignVisibilityFromDb = (design: any) => {
  if (!design) return design;
  return {
    ...design,
    // Map DB boolean to UI string without changing UI components.
    visibility: fromDbIsPublic(design.is_public),
  };
};


export const updateDesignWorkflow = async (
  designId: string,
  workflow: WorkflowStep[]
) => {
  const { error } = await supabase
    .from("designs")
    .update({ workflow })
    .eq("id", designId);

  if (error) {
    console.error("SUPABASE WORKFLOW UPDATE ERROR:", error);
    throw error;
  }

  return true;
};


export async function getMyDesigns(userId: string) {
  const { data, error } = await supabase
    .from("designs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data?.map(mapDesignVisibilityFromDb);
}

export async function createDesign(payload: {
  title: string;
  workflow: any;
  constraints: any;
  status?: string;
  visibility?: "public" | "private";
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not logged in");

  const { data, error } = await supabase
    .from("designs")
    .insert({
      title: payload.title || "Untitled",
      workflow: payload.workflow,        // MUST MATCH COLUMN NAME
      constraints: payload.constraints,
      status: payload.status ?? "draft",
      // Map UI "public"/"private" to DB `is_public` BOOLEAN.
      is_public: toDbIsPublic(payload.visibility),
      user_id: user.id,                  // REQUIRED for RLS
    })
    .select()
    .single();

  if (error) {
    console.error("createDesign error", error);
    throw error;
  }

  return mapDesignVisibilityFromDb(data);
}





export async function getDesignById(id: string) {
  const { data, error } = await supabase
    .from("designs")
    .select(
      `
      id,
      title,
      workflow,
      constraints,
      status,
      is_public,
      created_at
      `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("getDesignById error", error);
    return null;
  }

  return mapDesignVisibilityFromDb(data);
}


export const updateDesignTitle = async (
  id: string,
  title: string
) => {
  const { error } = await supabase
    .from("designs")
    .update({ title })
    .eq("id", id);

  if (error) {
    console.error("SUPABASE UPDATE ERROR:", error);
    throw error;
  }

  return true;
};

export const updateDesignVisibility = async (
  id: string,
  visibility: "public" | "private"
) => {
  const { error } = await supabase
    .from("designs")
    // Map UI "public"/"private" to DB `is_public` BOOLEAN for updates.
    .update({ is_public: toDbIsPublic(visibility) })
    .eq("id", id);

  if (error) {
    console.error("SUPABASE VISIBILITY UPDATE ERROR:", error);
    throw error;
  }

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
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

  if (error) {
    console.error("DELETE ERROR:", error);
    throw error;
  }
};




