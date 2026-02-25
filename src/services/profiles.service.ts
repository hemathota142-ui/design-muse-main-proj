import { supabase } from "@/lib/supabase";

export type ProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  bio: string | null;
  created_at?: string | null;
};

const resolveDisplayName = (user: {
  email?: string | null;
  user_metadata?: Record<string, any>;
}) => {
  const meta = user.user_metadata || {};
  return (
    meta.full_name ||
    meta.display_name ||
    meta.name ||
    user.email?.split("@")[0] ||
    null
  );
};

export async function upsertMyProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any>;
}) {
  const fullName = resolveDisplayName(user);

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        full_name: fullName,
        email: user.email ?? null,
      },
      { onConflict: "id" }
    )
    .select("id, full_name, email, bio, created_at")
    .single();

  if (error) {
    console.error("SUPABASE PROFILE UPSERT ERROR:", error);
    throw error;
  }

  return data as ProfileRecord;
}

export async function getMyProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, bio, created_at")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("SUPABASE PROFILE LOAD ERROR:", error);
    throw error;
  }

  return data as ProfileRecord;
}

export async function updateMyProfile(updates: {
  full_name?: string | null;
  bio?: string | null;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: updates.full_name ?? null,
      bio: updates.bio ?? null,
    })
    .eq("id", user.id)
    .select("id, full_name, email, bio, created_at")
    .single();

  if (error) {
    console.error("SUPABASE PROFILE UPDATE ERROR:", error);
    throw error;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("profile:updated"));
  }

  return data as ProfileRecord;
}
