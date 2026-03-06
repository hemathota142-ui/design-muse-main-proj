import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RefreshCw, Search, UserPlus, Users, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  is_online?: boolean;
};

type FriendshipState = "none" | "pending" | "accepted";

export default function FriendsPage() {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [friendRows, setFriendRows] = useState<FriendRequestRecord[]>([]);
  const [friendCountByUserId, setFriendCountByUserId] = useState<Record<string, number>>({});
  const [publicDesignCountByUserId, setPublicDesignCountByUserId] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "discover">("friends");
  const [searchQuery, setSearchQuery] = useState("");
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
    if (!user?.id || isGuest) {
      setProfiles([]);
      setFriendRows([]);
      setFriendCountByUserId({});
      setPublicDesignCountByUserId({});
      return;
    }

    setIsLoading(true);
    try {
      const [profilesRes, friendsRes] = await Promise.all([
        supabase.rpc("list_people_discovery"),
        supabase
          .from("friends")
          .select("id, requester_id, receiver_id, status, created_at, updated_at")
          .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (friendsRes.error) throw friendsRes.error;

      const people = ((profilesRes.data ?? []) as ProfileLite[]).filter((profile) => profile.id !== user.id);
      const rows = (friendsRes.data ?? []) as FriendRequestRecord[];
      const acceptedIds = Array.from(
        new Set(
          rows
            .filter((row) => row.status === "accepted")
            .map((row) => (row.requester_id === user.id ? row.receiver_id : row.requester_id))
        )
      );

      setProfiles(people);
      setFriendRows(rows);

      if (!acceptedIds.length) {
        setFriendCountByUserId({});
        setPublicDesignCountByUserId({});
        return;
      }

      const [requesterFriendsRes, receiverFriendsRes, publicDesignsRes] = await Promise.all([
        supabase
          .from("friends")
          .select("requester_id")
          .eq("status", "accepted")
          .in("requester_id", acceptedIds),
        supabase
          .from("friends")
          .select("receiver_id")
          .eq("status", "accepted")
          .in("receiver_id", acceptedIds),
        supabase
          .from("designs")
          .select("user_id")
          .eq("visibility", "public")
          .in("user_id", acceptedIds),
      ]);

      if (requesterFriendsRes.error || receiverFriendsRes.error) {
        setFriendCountByUserId({});
      } else {
        const counts: Record<string, number> = {};
        for (const row of requesterFriendsRes.data ?? []) {
          const uid = row.requester_id as string;
          counts[uid] = (counts[uid] ?? 0) + 1;
        }
        for (const row of receiverFriendsRes.data ?? []) {
          const uid = row.receiver_id as string;
          counts[uid] = (counts[uid] ?? 0) + 1;
        }
        setFriendCountByUserId(counts);
      }

      if (publicDesignsRes.error) {
        setPublicDesignCountByUserId({});
      } else {
        const counts: Record<string, number> = {};
        for (const row of publicDesignsRes.data ?? []) {
          const uid = row.user_id as string;
          counts[uid] = (counts[uid] ?? 0) + 1;
        }
        setPublicDesignCountByUserId(counts);
      }
    } catch (error: any) {
      console.error("FRIENDS PAGE LOAD ERROR:", error);
      toast({
        title: "Unable to load friends data",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isGuest, toast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const profileById = useMemo(
    () => Object.fromEntries(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );

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

  const acceptedFriendIds = useMemo(() => {
    if (!user?.id) return [] as string[];
    return friendRows
      .filter((row) => row.status === "accepted")
      .map((row) => (row.requester_id === user.id ? row.receiver_id : row.requester_id));
  }, [friendRows, user?.id]);

  const acceptedFriends = useMemo(
    () =>
      acceptedFriendIds.map((id) => {
        const profile = profileById[id] ?? { id, display_name: id.slice(0, 8), avatar: null };
        return profile;
      }),
    [acceptedFriendIds, profileById]
  );

  const searchLower = searchQuery.trim().toLowerCase();

  const filteredAcceptedFriends = useMemo(() => {
    if (!searchLower) return acceptedFriends;
    return acceptedFriends.filter((profile) => getDisplayName(profile).toLowerCase().includes(searchLower));
  }, [acceptedFriends, searchLower]);

  const incomingRequests = useMemo(() => {
    const base = friendRows.filter((row) => row.status === "pending" && user?.id && row.receiver_id === user.id);
    if (!searchLower) return base;
    return base.filter((row) => {
      const profile = profileById[row.requester_id];
      const name = profile ? getDisplayName(profile) : row.requester_id.slice(0, 8);
      return name.toLowerCase().includes(searchLower);
    });
  }, [friendRows, user?.id, searchLower, profileById]);

  const discoverPeople = useMemo(() => {
    const base = profiles.filter((profile) => profile.id !== user?.id);
    if (!searchLower) return base;
    return base.filter((profile) => getDisplayName(profile).toLowerCase().includes(searchLower));
  }, [profiles, user?.id, searchLower]);

  const renderLoadingSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Card key={idx}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

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
      return;
    }

    await withActionBusy(`view:${targetUserId}`, async () => {
      try {
        const { error } = await supabase.from("profiles").select("id").eq("id", targetUserId).single();
        if (error) {
          toast({
            title: "Profile not accessible",
            description: "You do not have permission to view this profile.",
            variant: "destructive",
          });
          return;
        }
        navigate(`/profile/${targetUserId}`);
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
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Friends</h1>
            <p className="text-muted-foreground">Manage your network and discover people.</p>
          </div>
          {!isGuest && (
            <Button variant="outline" onClick={refreshData} className="gap-2 self-start sm:self-auto">
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Refresh
            </Button>
          )}
        </div>
        <div className="relative max-w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends by name..."
            className="pl-9"
          />
        </div>

        {isGuest ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-foreground font-medium">Login first to access this feature.</p>
              <p className="text-sm text-muted-foreground mt-1">Friends is disabled in guest mode.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "friends" | "requests" | "discover")} className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="friends">Friends</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="discover">Discover People</TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {isLoading && renderLoadingSkeletons()}

                {!isLoading && activeTab === "friends" && (
                  filteredAcceptedFriends.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No accepted friends yet.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredAcceptedFriends.map((profile) => {
                        const name = getDisplayName(profile);
                        return (
                          <motion.div key={profile.id} whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.18 }}>
                            <Card className="transition-all duration-200 hover:shadow-lg">
                              <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-12 h-12">
                                    {profile.avatar ? <AvatarImage src={profile.avatar} alt={name} /> : null}
                                    <AvatarFallback className="text-sm font-semibold">
                                      {getInitials(name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate">{name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{profile.id}</p>
                                    {typeof profile.is_online === "boolean" && (
                                      <p className="text-xs mt-1 flex items-center gap-1">
                                        <span className={cn("inline-block w-2 h-2 rounded-full", profile.is_online ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                                        <span className={cn(profile.is_online ? "text-emerald-600" : "text-muted-foreground")}>
                                          {profile.is_online ? "Online" : "Offline"}
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                                    <p className="text-xs text-muted-foreground">Friends</p>
                                    <p className="text-lg font-semibold text-foreground">
                                      {friendCountByUserId[profile.id] ?? 0}
                                    </p>
                                  </div>
                                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                                    <p className="text-xs text-muted-foreground">Public Designs</p>
                                    <p className="text-lg font-semibold text-foreground">
                                      {publicDesignCountByUserId[profile.id] ?? 0}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  disabled={Boolean(actionBusy[`view:${profile.id}`])}
                                  onClick={() => handleViewProfile(profile.id)}
                                >
                                  View Profile
                                </Button>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  )
                )}

                {!isLoading && activeTab === "requests" && (
                  incomingRequests.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No incoming friend requests.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {incomingRequests.map((request) => {
                        const profile =
                          profileById[request.requester_id] ??
                          ({ id: request.requester_id, display_name: request.requester_id.slice(0, 8), avatar: null } as ProfileLite);
                        const name = getDisplayName(profile);
                        return (
                          <motion.div key={request.id} whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.18 }}>
                            <Card className="transition-all duration-200 hover:shadow-lg">
                              <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-12 h-12">
                                    {profile.avatar ? <AvatarImage src={profile.avatar} alt={name} /> : null}
                                    <AvatarFallback className="text-sm font-semibold">
                                      {getInitials(name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate">{name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{profile.id}</p>
                                    {typeof profile.is_online === "boolean" && (
                                      <p className="text-xs mt-1 flex items-center gap-1">
                                        <span className={cn("inline-block w-2 h-2 rounded-full", profile.is_online ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                                        <span className={cn(profile.is_online ? "text-emerald-600" : "text-muted-foreground")}>
                                          {profile.is_online ? "Online" : "Offline"}
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-2">
                                  <Button
                                    className="w-full gap-2"
                                    disabled={Boolean(actionBusy[`accept:${request.id}`])}
                                    onClick={() => handleAccept(request.id)}
                                  >
                                    <Check className="w-4 h-4" />
                                    Accept
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="w-full gap-2"
                                    disabled={Boolean(actionBusy[`reject:${request.id}`])}
                                    onClick={() => handleReject(request.id)}
                                  >
                                    <X className="w-4 h-4" />
                                    Reject
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  )
                )}

                {!isLoading && activeTab === "discover" && (
                  discoverPeople.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No users found.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {discoverPeople.map((profile) => {
                        const name = getDisplayName(profile);
                        const state = friendshipByUserId[profile.id]?.state ?? "none";
                        return (
                          <motion.div key={profile.id} whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.18 }}>
                            <Card className="transition-all duration-200 hover:shadow-lg">
                              <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-12 h-12">
                                    {profile.avatar ? <AvatarImage src={profile.avatar} alt={name} /> : null}
                                    <AvatarFallback className="text-sm font-semibold">
                                      {getInitials(name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate">{name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{profile.id}</p>
                                    {typeof profile.is_online === "boolean" && (
                                      <p className="text-xs mt-1 flex items-center gap-1">
                                        <span className={cn("inline-block w-2 h-2 rounded-full", profile.is_online ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                                        <span className={cn(profile.is_online ? "text-emerald-600" : "text-muted-foreground")}>
                                          {profile.is_online ? "Online" : "Offline"}
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant={state === "none" ? "default" : "outline"}
                                  className="w-full gap-2"
                                  disabled={state !== "none" || Boolean(actionBusy[`send:${profile.id}`])}
                                  onClick={() => handleSendRequest(profile.id)}
                                >
                                  <UserPlus className="w-4 h-4" />
                                  {state === "accepted" ? "Already Friends" : state === "pending" ? "Request Pending" : "Add Friend"}
                                </Button>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  )
                )}
              </motion.div>
            </AnimatePresence>
          </Tabs>
        )}
      </motion.div>
    </AppLayout>
  );
}
