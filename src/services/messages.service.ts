import { supabase } from "@/lib/supabase";

export type MessageRecord = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read_at?: string | null;
};

export type ChatFriend = {
  id: string;
  display_name: string;
  avatar: string | null;
};

export class MessagesServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessagesServiceError";
  }
}

export type ConversationSummary = {
  friend_id: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export async function getAcceptedFriendsForUser(userId: string): Promise<ChatFriend[]> {
  const { data: rows, error: friendsError } = await supabase
    .from("friends")
    .select("requester_id, receiver_id, status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

  if (friendsError) {
    throw new MessagesServiceError(`Failed to load friends: ${friendsError.message}`);
  }

  const ids = Array.from(
    new Set(
      (rows ?? []).map((row) => (row.requester_id === userId ? row.receiver_id : row.requester_id))
    )
  );

  if (!ids.length) return [];

  const { data: discovery, error: discoveryError } = await supabase.rpc("list_people_discovery");
  if (discoveryError) {
    throw new MessagesServiceError(`Failed to load people discovery: ${discoveryError.message}`);
  }

  const byId = Object.fromEntries((discovery ?? []).map((person: any) => [person.id, person]));
  return ids.map((id) => {
    const p = byId[id];
    return {
      id,
      display_name: p?.display_name || String(id).slice(0, 8),
      avatar: p?.avatar || null,
    };
  });
}

export async function areAcceptedFriends(userId: string, otherUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("friends")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${userId},receiver_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},receiver_id.eq.${userId})`
    )
    .limit(1);

  if (error) {
    throw new MessagesServiceError(`Failed to verify friendship: ${error.message}`);
  }

  return (data?.length ?? 0) > 0;
}

export async function getConversation(userId: string, otherUserId: string): Promise<MessageRecord[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, message, created_at, read_at")
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new MessagesServiceError(`Failed to load conversation: ${error.message}`);
  }

  return ((data ?? []) as MessageRecord[]).reverse();
}

export async function getConversationSummaries(
  userId: string,
  friendIds: string[]
): Promise<Record<string, ConversationSummary>> {
  const base: Record<string, ConversationSummary> = {};
  for (const id of friendIds) {
    base[id] = {
      friend_id: id,
      last_message: null,
      last_message_at: null,
      unread_count: 0,
    };
  }
  if (!friendIds.length) return base;

  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, message, created_at, read_at")
    .or(
      `and(sender_id.eq.${userId},receiver_id.in.(${friendIds.join(",")})),and(receiver_id.eq.${userId},sender_id.in.(${friendIds.join(",")}))`
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new MessagesServiceError(`Failed to load conversation summaries: ${error.message}`);
  }

  for (const row of (data ?? []) as MessageRecord[]) {
    const friendId = row.sender_id === userId ? row.receiver_id : row.sender_id;
    if (!base[friendId]) continue;

    if (!base[friendId].last_message_at) {
      base[friendId].last_message = row.message;
      base[friendId].last_message_at = row.created_at;
    }

    if (row.receiver_id === userId && row.sender_id === friendId && !row.read_at) {
      base[friendId].unread_count += 1;
    }
  }

  return base;
}

export async function markConversationAsRead(userId: string, otherUserId: string): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("receiver_id", userId)
    .eq("sender_id", otherUserId)
    .is("read_at", null);

  if (error) {
    throw new MessagesServiceError(`Failed to mark messages as read: ${error.message}`);
  }
}

export async function sendMessageToFriend(
  userId: string,
  receiverId: string,
  message: string
): Promise<MessageRecord> {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new MessagesServiceError("Message cannot be empty.");
  }

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) {
    throw new MessagesServiceError(`Authentication check failed: ${authError.message}`);
  }
  if (!authUser?.id) {
    throw new MessagesServiceError("You must be logged in to send messages.");
  }
  if (authUser.id !== userId) {
    throw new MessagesServiceError("Session mismatch detected. Please refresh and try again.");
  }

  const canMessage = await areAcceptedFriends(authUser.id, receiverId);
  if (!canMessage) {
    throw new MessagesServiceError("You can only message accepted friends.");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: authUser.id,
      receiver_id: receiverId,
      message: trimmed,
    })
    .select("id, sender_id, receiver_id, message, created_at, read_at")
    .single();

  if (error) {
    throw new MessagesServiceError(`Failed to send message: ${error.message}`);
  }

  return data as MessageRecord;
}
