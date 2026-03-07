import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  getAcceptedFriendsForUser,
  getConversation,
  getConversationSummaries,
  markConversationAsRead,
  sendMessageToFriend,
  type ChatFriend,
  type ConversationSummary,
  type MessageRecord,
  MessagesServiceError,
} from "@/services/messages.service";
import { parseDesignShareMessage } from "@/services/designShareMessage";

export default function MessagesPage() {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [friends, setFriends] = useState<ChatFriend[]>([]);
  const [conversationSummaries, setConversationSummaries] = useState<Record<string, ConversationSummary>>({});
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [linkedDesigns, setLinkedDesigns] = useState<Record<string, { id: string; title: string; previewImage: string | null }>>({});
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedFriendIdRef = useRef<string | null>(null);
  const friendIdsRef = useRef<string[]>([]);
  const userScrolledUpRef = useRef(false);
  const scrollToBottomOnceRef = useRef(false);
  const activeConversationLoadRef = useRef(0);

  const selectedFriend = useMemo(
    () => friends.find((f) => f.id === selectedFriendId) ?? null,
    [friends, selectedFriendId]
  );
  const friendIds = useMemo(() => friends.map((friend) => friend.id), [friends]);
  const friendIdFromQuery = searchParams.get("friendId");
  const renderedMessages = useMemo(() => messages, [messages]);

  const initialsFor = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const formatMessageTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDateDivider = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const formatConversationPreview = (message: string | null) => {
    if (!message) return null;
    const shared = parseDesignShareMessage(message);
    if (shared) return shared.text;
    return message;
  };

  const extractDesignIdFromText = (text: string): string | null => {
    if (!text) return null;
    const match = text.match(/\/designs\/([a-zA-Z0-9-]+)/);
    return match?.[1] ?? null;
  };

  const loadSummaries = useCallback(async (friendIds: string[]) => {
    if (!user?.id || isGuest || !friendIds.length) {
      setConversationSummaries({});
      return;
    }
    try {
      const summaries = await getConversationSummaries(user.id, friendIds);
      setConversationSummaries(summaries);
    } catch (error: any) {
      toast({
        title: "Unable to load message previews",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  }, [user?.id, isGuest, toast]);

  const loadConversation = useCallback(
    async (friendId: string, opts?: { silent?: boolean; markRead?: boolean }) => {
      if (!user?.id || !friendId || isGuest) {
        setMessages([]);
        return;
      }
      const loadId = ++activeConversationLoadRef.current;
      const silent = Boolean(opts?.silent);
      const markRead = opts?.markRead ?? true;

      if (!silent) setIsLoadingMessages(true);
      try {
        const data = await getConversation(user.id, friendId);
        if (loadId !== activeConversationLoadRef.current) return;
        setMessages(data);
        if (markRead) {
          await markConversationAsRead(user.id, friendId);
        }
      } catch (error: any) {
        if (!silent) {
          toast({
            title: "Unable to load conversation",
            description: error?.message || "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!silent) setIsLoadingMessages(false);
      }
    },
    [user?.id, isGuest, toast]
  );

  const appendIncomingMessage = useCallback((incoming: MessageRecord) => {
    setMessages((prev) => {
      if (prev.some((msg) => msg.id === incoming.id)) return prev;
      const next = [...prev, incoming].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return next.length > 10 ? next.slice(next.length - 10) : next;
    });
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const container = messagesScrollRef.current;
    if (!container) return;
    const nearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 64;
    userScrolledUpRef.current = !nearBottom;
  }, []);

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (!container) return;
    if (scrollToBottomOnceRef.current || !userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      if (scrollToBottomOnceRef.current) {
        scrollToBottomOnceRef.current = false;
        userScrolledUpRef.current = false;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!user?.id || isGuest) {
      setFriends([]);
      setSelectedFriendId(null);
      setMessages([]);
      return;
    }

    let isMounted = true;
    const loadFriends = async () => {
      setIsLoadingFriends(true);
      try {
        const data = await getAcceptedFriendsForUser(user.id);
        if (!isMounted) return;
        setFriends(data);
        setSelectedFriendId((prev) => prev ?? data[0]?.id ?? null);
        await loadSummaries(data.map((friend) => friend.id));
      } catch (error: any) {
        if (!isMounted) return;
        toast({
          title: "Unable to load friends",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) setIsLoadingFriends(false);
      }
    };

    loadFriends();
    const handleFriendsUpdated = () => loadFriends();
    window.addEventListener("friends:updated", handleFriendsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("friends:updated", handleFriendsUpdated);
    };
  }, [user?.id, isGuest, toast, loadSummaries]);

  useEffect(() => {
    if (!friendIdFromQuery || !friends.length) return;
    const existsInList = friends.some((friend) => friend.id === friendIdFromQuery);
    if (existsInList) {
      setSelectedFriendId(friendIdFromQuery);
    }
  }, [friendIdFromQuery, friends]);

  useEffect(() => {
    if (!selectedFriendId) {
      setMessages([]);
      return;
    }
    scrollToBottomOnceRef.current = true;
    userScrolledUpRef.current = false;
    loadConversation(selectedFriendId, { silent: false, markRead: true });
    loadSummaries(friendIds);
  }, [selectedFriendId, loadConversation, loadSummaries, friendIds]);

  useEffect(() => {
    selectedFriendIdRef.current = selectedFriendId;
  }, [selectedFriendId]);

  useEffect(() => {
    friendIdsRef.current = friendIds;
  }, [friendIds]);

  useEffect(() => {
    if (!selectedFriendId) return;
    inputRef.current?.focus();
  }, [selectedFriendId]);

  useEffect(() => {
    const unresolvedIds = Array.from(
      new Set(
        messages
          .map((msg) => {
            const shared = parseDesignShareMessage(msg.message);
            if (shared?.designId) return shared.designId;
            return extractDesignIdFromText(msg.message);
          })
          .filter((id): id is string => Boolean(id) && !linkedDesigns[id])
      )
    );

    if (!unresolvedIds.length) return;

    let isMounted = true;
    const loadLinkedDesigns = async () => {
      const { data, error } = await supabase
        .from("designs")
        .select("id, title, preview_image, content")
        .in("id", unresolvedIds);

      if (!isMounted || error || !data) return;

      const mapped = (data as any[]).reduce(
        (acc, design) => {
          const fromContent = design?.content?.design ?? design?.content ?? {};
          const previewImage =
            design?.preview_image ||
            fromContent?.previewImage ||
            fromContent?.preview_image ||
            fromContent?.imageUrl ||
            fromContent?.image_url ||
            fromContent?.thumbnail ||
            fromContent?.thumbnailUrl ||
            fromContent?.image ||
            null;
          acc[design.id] = {
            id: design.id,
            title: design?.title || "Untitled design",
            previewImage: typeof previewImage === "string" ? previewImage : null,
          };
          return acc;
        },
        {} as Record<string, { id: string; title: string; previewImage: string | null }>
      );

      setLinkedDesigns((prev) => ({ ...prev, ...mapped }));
    };

    loadLinkedDesigns();
    return () => {
      isMounted = false;
    };
  }, [messages, linkedDesigns]);

  useEffect(() => {
    if (!user?.id || isGuest) return;

    const senderChannel = supabase
      .channel(`messages-sender-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const incoming = payload.new as MessageRecord;
          const counterpart = incoming.receiver_id;
          if (counterpart === selectedFriendIdRef.current) {
            appendIncomingMessage(incoming);
          }
          loadSummaries(friendIdsRef.current);
        }
      )
      .subscribe();

    const receiverChannel = supabase
      .channel(`messages-receiver-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const incoming = payload.new as MessageRecord;
          const counterpart = incoming.sender_id;
          if (counterpart === selectedFriendIdRef.current) {
            appendIncomingMessage(incoming);
            markConversationAsRead(user.id, counterpart).catch(() => undefined);
          }
          loadSummaries(friendIdsRef.current);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(senderChannel);
      supabase.removeChannel(receiverChannel);
    };
  }, [user?.id, isGuest, loadSummaries, appendIncomingMessage]);

  const handleSend = async () => {
    if (!user?.id || !selectedFriendId || isGuest || !draft.trim()) return;

    setIsSending(true);
    try {
      const sent = await sendMessageToFriend(user.id, selectedFriendId, draft);
      setMessages((prev) => (prev.some((msg) => msg.id === sent.id) ? prev : [...prev, sent]));
      setDraft("");
      await loadSummaries(friendIds);
      inputRef.current?.focus();
    } catch (error: any) {
      const message =
        error instanceof MessagesServiceError ? error.message : error?.message || "Failed to send message.";
      toast({
        title: "Message failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  if (isGuest) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-foreground">Login first to access this feature.</p>
            <p className="text-sm text-muted-foreground mt-1">Messages are disabled in guest mode.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground">Chat with your accepted friends.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[560px]">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Friends</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-72px)] overflow-y-auto space-y-2">
              {isLoadingFriends && <p className="text-sm text-muted-foreground">Loading friends...</p>}
              {!isLoadingFriends && friends.length === 0 && (
                <p className="text-sm text-muted-foreground">No accepted friends yet.</p>
              )}
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => setSelectedFriendId(friend.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                    selectedFriendId === friend.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      {friend.avatar ? <AvatarImage src={friend.avatar} alt={friend.display_name} /> : null}
                      <AvatarFallback>{initialsFor(friend.display_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{friend.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatConversationPreview(conversationSummaries[friend.id]?.last_message) || friend.id}
                      </p>
                    </div>
                    {(conversationSummaries[friend.id]?.unread_count ?? 0) > 0 && (
                      <span className="ml-auto min-w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs px-1.5 flex items-center justify-center">
                        {conversationSummaries[friend.id]?.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="h-full flex flex-col">
            <CardHeader className="border-b">
              <CardTitle className="text-base">
                {selectedFriend ? `Conversation with ${selectedFriend.display_name}` : "Select a friend"}
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col min-h-0">
              <div ref={messagesScrollRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
                {!selectedFriend && (
                  <p className="text-sm text-muted-foreground">Choose a friend from the left list to start chatting.</p>
                )}
                {selectedFriend && isLoadingMessages && (
                  <p className="text-sm text-muted-foreground">Loading conversation...</p>
                )}
                {selectedFriend && !isLoadingMessages && messages.length === 0 && (
                  <p className="text-sm text-muted-foreground">No messages yet. Say hello.</p>
                )}
                {renderedMessages.map((msg, idx) => {
                  const prev = idx > 0 ? messages[idx - 1] : null;
                  const showDateDivider =
                    !prev ||
                    new Date(prev.created_at).toDateString() !== new Date(msg.created_at).toDateString();
                  const mine = msg.sender_id === user?.id;
                  const sharedDesign = parseDesignShareMessage(msg.message);
                  const linkedDesignId = sharedDesign?.designId || extractDesignIdFromText(msg.message);
                  const linkedDesign = linkedDesignId ? linkedDesigns[linkedDesignId] : null;
                  return (
                    <div key={msg.id}>
                      {showDateDivider && (
                        <div className="my-2 text-center text-xs text-muted-foreground">
                          {formatDateDivider(msg.created_at)}
                        </div>
                      )}
                      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                            mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                          }`}
                        >
                          {sharedDesign || linkedDesign ? (
                            <div className="space-y-2">
                              <p className="font-medium">{sharedDesign?.text || "Shared a design with you"}</p>
                              <div
                                className={`rounded-xl border p-2 ${
                                  mine ? "border-primary-foreground/30 bg-primary-foreground/10" : "border-border bg-background"
                                }`}
                              >
                                <div className="w-full h-32 rounded-md overflow-hidden bg-muted mb-2">
                                  {(sharedDesign?.previewImage || linkedDesign?.previewImage) ? (
                                    <img
                                      src={sharedDesign?.previewImage || linkedDesign?.previewImage || ""}
                                      alt={sharedDesign?.title || linkedDesign?.title || "Shared design"}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                      No preview image
                                    </div>
                                  )}
                                </div>
                                <p className="font-medium text-sm line-clamp-1">
                                  {sharedDesign?.title || linkedDesign?.title || "Untitled design"}
                                </p>
                                <Link to={`/designs/${linkedDesignId}?mode=read`} className="inline-block mt-2">
                                  <Button size="sm" variant={mine ? "secondary" : "outline"}>
                                    Open Design
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          )}
                          <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {formatMessageTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-3 flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={selectedFriend ? "Type a message..." : "Select a friend to chat"}
                  disabled={!selectedFriend}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!selectedFriend || !draft.trim() || isSending}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </AppLayout>
  );
}
