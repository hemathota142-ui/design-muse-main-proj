import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export type FriendRequestRecord = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
};

export class FriendsServiceError extends Error {
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;
  readonly status?: number;

  constructor(
    message: string,
    opts?: {
      code?: string;
      details?: string;
      hint?: string;
      status?: number;
    }
  ) {
    super(message);
    this.name = "FriendsServiceError";
    this.code = opts?.code;
    this.details = opts?.details;
    this.hint = opts?.hint;
    this.status = opts?.status;
  }
}

async function requireAuthUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new FriendsServiceError("Not authenticated", { code: "AUTH_REQUIRED" });
  }

  return user.id;
}

function mapSupabaseError(operation: string, error: PostgrestError): FriendsServiceError {
  // 42501 often indicates RLS/permission denial for Postgres.
  if (error.code === "42501") {
    return new FriendsServiceError(
      `${operation} failed: permission denied by database policy`,
      {
        code: error.code,
        details: error.details ?? undefined,
        hint: error.hint ?? undefined,
      }
    );
  }

  // PGRST116 is commonly returned when .single() finds no rows.
  if (error.code === "PGRST116") {
    return new FriendsServiceError(`${operation} failed: record not found`, {
      code: error.code,
      details: error.details ?? undefined,
      hint: error.hint ?? undefined,
    });
  }

  return new FriendsServiceError(`${operation} failed: ${error.message}`, {
    code: error.code,
    details: error.details ?? undefined,
    hint: error.hint ?? undefined,
  });
}

/**
 * Create a new pending friend request from the current user to receiverId.
 * RLS is expected to enforce requester_id = auth.uid().
 */
export async function sendFriendRequest(receiverId: string): Promise<FriendRequestRecord> {
  const requesterId = await requireAuthUserId();

  if (!receiverId || typeof receiverId !== "string") {
    throw new FriendsServiceError("receiverId is required", { code: "VALIDATION_ERROR" });
  }

  if (requesterId === receiverId) {
    throw new FriendsServiceError("Cannot send a friend request to yourself", {
      code: "VALIDATION_ERROR",
    });
  }

  const { data, error } = await supabase
    .from("friends")
    .insert({
      requester_id: requesterId,
      receiver_id: receiverId,
      status: "pending",
    })
    .select("id, requester_id, receiver_id, status, created_at, updated_at")
    .single();

  if (error) {
    throw mapSupabaseError("sendFriendRequest", error);
  }

  return data as FriendRequestRecord;
}

async function updateFriendRequestStatus(
  requestId: string,
  status: "accepted" | "rejected"
): Promise<FriendRequestRecord> {
  await requireAuthUserId();

  if (!requestId || typeof requestId !== "string") {
    throw new FriendsServiceError("requestId is required", { code: "VALIDATION_ERROR" });
  }

  const { data, error } = await supabase
    .from("friends")
    .update({ status })
    .eq("id", requestId)
    .select("id, requester_id, receiver_id, status, created_at, updated_at")
    .single();

  if (error) {
    throw mapSupabaseError(
      status === "accepted" ? "acceptFriendRequest" : "rejectFriendRequest",
      error
    );
  }

  return data as FriendRequestRecord;
}

/**
 * Accept a pending friend request by id.
 * RLS + DB trigger are expected to enforce receiver-only status transition.
 */
export async function acceptFriendRequest(requestId: string): Promise<FriendRequestRecord> {
  return updateFriendRequestStatus(requestId, "accepted");
}

/**
 * Reject a pending friend request by id.
 * RLS + DB trigger are expected to enforce receiver-only status transition.
 */
export async function rejectFriendRequest(requestId: string): Promise<FriendRequestRecord> {
  return updateFriendRequestStatus(requestId, "rejected");
}
