import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  X, 
  Search, 
  UserPlus, 
  Share2,
  Eye,
  MessageCircle,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline" | "away";
  lastActive?: string;
  sharedDesigns: number;
}

// Dummy friends data (offline)
const dummyFriends: Friend[] = [
  { id: "1", name: "Alex Chen", avatar: "AC", status: "online", sharedDesigns: 5 },
  { id: "2", name: "Sarah Miller", avatar: "SM", status: "online", sharedDesigns: 3 },
  { id: "3", name: "James Wilson", avatar: "JW", status: "away", lastActive: "5m ago", sharedDesigns: 8 },
  { id: "4", name: "Emma Davis", avatar: "ED", status: "offline", lastActive: "2h ago", sharedDesigns: 2 },
  { id: "5", name: "Michael Brown", avatar: "MB", status: "offline", lastActive: "1d ago", sharedDesigns: 12 },
  { id: "6", name: "Lisa Johnson", avatar: "LJ", status: "online", sharedDesigns: 6 },
];

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FriendsPanel({ isOpen, onClose }: FriendsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  const filteredFriends = dummyFriends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-success";
      case "away": return "bg-warning";
      default: return "bg-muted-foreground/50";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Friends</h2>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                    {dummyFriends.filter(f => f.status === "online").length} online
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredFriends.map((friend) => (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-3 rounded-xl cursor-pointer transition-colors group",
                    selectedFriend?.id === friend.id ? "bg-primary/10" : "hover:bg-muted"
                  )}
                  onClick={() => setSelectedFriend(friend)}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                        {friend.avatar}
                      </div>
                      <span className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
                        getStatusColor(friend.status)
                      )} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{friend.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {friend.status === "online" 
                          ? "Online" 
                          : friend.lastActive || "Offline"
                        }
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-background transition-colors">
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-background transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded view when selected */}
                  {selectedFriend?.id === friend.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mt-3 pt-3 border-t border-border"
                    >
                      <p className="text-xs text-muted-foreground mb-2">
                        {friend.sharedDesigns} shared designs
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs">
                          <Eye className="w-3 h-3" />
                          View Designs
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs">
                          <Share2 className="w-3 h-3" />
                          Share
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}

              {filteredFriends.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No friends found</p>
                </div>
              )}
            </div>

            {/* Add Friend Button */}
            <div className="p-4 border-t border-border">
              <Button variant="outline" className="w-full gap-2">
                <UserPlus className="w-4 h-4" />
                Add Friend
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                💡 Friend data is stored offline
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
