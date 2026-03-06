import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Search, UserPlus, Check, Ban, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  acceptFriendRequest,
  FriendsServiceError,
  rejectFriendRequest,
  sendFriendRequest,
  type FriendRequestRecord,
  type FriendRequestStatus,
} from "@/services/friends.service";
import { useToast } from "@/hooks/use-toast";

type ProfileLite = {
  id: string;
  display_name: string | null;
  avatar: string | null;
};

type FriendshipState = "none" | "pending" | "accepted";

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FriendsPanel({ isOpen, onClose }: FriendsPanelProps) {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [friendRows, setFriendRows] = useState<FriendRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});

  const withActionBusy = async (key: string, action: () => Promise<void>) => {
    setActionBusy((prev) => ({ ...prev, [key]: true }));
    try {
      await action();
    } finally {
      setActionBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  const getDisplayName = (profile: ProfileLite) => profile.display_name || profile.id.slice(0, 8);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const refreshData = useCallback(async () => {
    if (!isOpen || !user?.id || isGuest) {
      setProfiles([]);
      setFriendRows([]);
      return;
    }

    setIsLoading(true);
    try {
      // Safe people discovery source; minimal public fields only.
      const [profilesRes, friendsRes] = await Promise.all([
        supabase.rpc("list_people_discovery"),
        supabase
          .from("friends")
          .select("id, requester_id, receiver_id, status, created_at, updated_at")
          .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (friendsRes.error) throw friendsRes.error;

      const people = ((profilesRes.data ?? []) as ProfileLite[]).filter(
        (profile) => profile.id !== user.id
      );

      setProfiles(people);
      setFriendRows((friendsRes.data ?? []) as FriendRequestRecord[]);
    } catch (error: any) {
      console.error("FRIENDS PANEL LOAD ERROR:", error);
      toast({
        title: "Unable to load friends data",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, user?.id, isGuest, toast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const friendshipByUserId = useMemo(() => {
    const map: Record<string, { state: FriendshipState; status: FriendRequestStatus; requestId: string }> = {};

    if (!user?.id) return map;

    for (const row of friendRows) {
      const otherUserId = row.requester_id === user.id ? row.receiver_id : row.requester_id;
      const normalizedState: FriendshipState =
        row.status === "accepted" ? "accepted" : row.status === "pending" ? "pending" : "none";

      const current = map[otherUserId];
      if (!current || (current.state !== "accepted" && normalizedState === "accepted")) {
        map[otherUserId] = { state: normalizedState, status: row.status, requestId: row.id };
      }
    }

    return map;
  }, [friendRows, user?.id]);

  const incomingRequests = useMemo(
    () => friendRows.filter((row) => row.status === "pending" && user?.id && row.receiver_id === user.id),
    [friendRows, user?.id]
  );

  const outgoingRequests = useMemo(
    () => friendRows.filter((row) => row.status === "pending" && user?.id && row.requester_id === user.id),
    [friendRows, user?.id]
  );

  const profileById = useMemo(
    () => Object.fromEntries(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );

  const filteredPeople = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((profile) => getDisplayName(profile).toLowerCase().includes(q));
  }, [profiles, searchQuery]);

  const handleSendRequest = async (receiverId: string) => {
    await withActionBusy(`send:${receiverId}`, async () => {
      try {
        await sendFriendRequest(receiverId);
        await refreshData();
        toast({
          title: "Friend request sent",
          description: "Your request is pending.",
        });
      } catch (error: any) {
        const message = error instanceof FriendsServiceError ? error.message : "Unable to send request.";
        toast({
          title: "Send failed",
          description: message,
          variant: "destructive",
        });
      }
    });
  };

  const handleAccept = async (requestId: string) => {
    await withActionBusy(`accept:${requestId}`, async () => {
      try {
        await acceptFriendRequest(requestId);
        await refreshData();
        window.dispatchEvent(new Event("friends:updated"));
        toast({
          title: "Friend request accepted",
          description: "You are now connected.",
        });
      } catch (error: any) {
        const message = error instanceof FriendsServiceError ? error.message : "Unable to accept request.";
        toast({
          title: "Accept failed",
          description: message,
          variant: "destructive",
        });
      }
    });
  };

  const handleReject = async (requestId: string) => {
    await withActionBusy(`reject:${requestId}`, async () => {
      try {
        await rejectFriendRequest(requestId);
        await refreshData();
        toast({
          title: "Friend request rejected",
          description: "The request has been declined.",
        });
      } catch (error: any) {
        const message = error instanceof FriendsServiceError ? error.message : "Unable to reject request.";
        toast({
          title: "Reject failed",
          description: message,
          variant: "destructive",
        });
      }
    });
  };

  const handleViewProfile = async (targetUserId: string) => {
    if (!targetUserId) return;

    if (targetUserId === user?.id) {
      navigate("/profile");
      onClose();
      return;
    }

    await withActionBusy(`view:${targetUserId}`, async () => {
      try {
        const { error } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", targetUserId)
          .single();

        if (error) {
          toast({
            title: "Profile not accessible",
            description: "You do not have permission to view this profile.",
            variant: "destructive",
          });
          return;
        }

        navigate(`/profile/${targetUserId}`);
        onClose();
      } catch (error: any) {
        toast({
          title: "View failed",
          description: error?.message || "Unable to open profile.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-xl z-50 flex flex-col"
          >
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">People & Requests</h2>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                    {profiles.length} people
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {isGuest && (
                <div className="p-3 mb-3 rounded-lg border border-warning/30 bg-warning/10 text-sm text-warning-foreground">
                  Sign in to use friends.
                </div>
              )}

              {!isGuest && (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h3 className="text-sm font-semibold text-foreground">Requests</h3>
                      <span className="text-xs text-muted-foreground">
                        {incomingRequests.length} incoming • {outgoingRequests.length} outgoing
                      </span>
                    </div>

                    <div className="space-y-2">
                      {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                        <p className="text-xs text-muted-foreground px-2 py-1">No pending requests.</p>
                      )}

                      {incomingRequests.map((request) => {
                        const profile = profileById[request.requester_id];
                        const name = profile ? getDisplayName(profile) : request.requester_id.slice(0, 8);
                        return (
                          <div key={request.id} className="p-3 rounded-lg border border-border bg-muted/30">
                            <p className="text-sm text-foreground mb-2">
                              <span className="font-medium">{name}</span> sent you a request
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                disabled={Boolean(actionBusy[`accept:${request.id}`])}
                                onClick={() => handleAccept(request.id)}
                              >
                                <Check className="w-3 h-3" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                disabled={Boolean(actionBusy[`reject:${request.id}`])}
                                onClick={() => handleReject(request.id)}
                              >
                                <Ban className="w-3 h-3" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {outgoingRequests.map((request) => {
                        const profile = profileById[request.receiver_id];
                        const name = profile ? getDisplayName(profile) : request.receiver_id.slice(0, 8);
                        return (
                          <div key={request.id} className="p-3 rounded-lg border border-border bg-muted/30">
                            <p className="text-sm text-muted-foreground">
                              Pending request to <span className="font-medium text-foreground">{name}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h3 className="text-sm font-semibold text-foreground">People</h3>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={refreshData}>
                        <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {filteredPeople.map((profile) => {
                        const name = getDisplayName(profile);
                        const state = friendshipByUserId[profile.id]?.state ?? "none";
                        return (
                          <div key={profile.id} className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center">
                                  {getInitials(name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{profile.id}</p>
                                </div>
                              </div>

                              {state === "accepted" && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">
                                    Accepted
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1"
                                    disabled={Boolean(actionBusy[`view:${profile.id}`])}
                                    onClick={() => handleViewProfile(profile.id)}
                                  >
                                    <Eye className="w-3 h-3" />
                                    View Profile
                                  </Button>
                                </div>
                              )}

                              {state === "pending" && (
                                <span className="text-xs px-2 py-1 rounded-full bg-warning/15 text-warning-foreground">
                                  Pending
                                </span>
                              )}

                              {state === "none" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  disabled={Boolean(actionBusy[`send:${profile.id}`])}
                                  onClick={() => handleSendRequest(profile.id)}
                                >
                                  <UserPlus className="w-3 h-3" />
                                  Add
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {!isLoading && filteredPeople.length === 0 && (
                        <div className="text-center py-6">
                          <Users className="w-9 h-9 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No people available.</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            People list uses a minimal safe discovery source.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
