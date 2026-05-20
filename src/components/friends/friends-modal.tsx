"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  UserCheck,
  UserX,
  Loader2,
  X,
  Send,
} from "lucide-react";

interface FriendUser {
  id: string;
  username: string;
  display_number: string | null;
  friendship_id: string;
}

interface FriendsData {
  friends: FriendUser[];
  incoming: FriendUser[];
  outgoing: FriendUser[];
}

interface FriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORMAT_REGEX = /^[^#]+#\d{3}$/;

export function FriendsModal({ open, onOpenChange }: FriendsModalProps) {
  const [friendsData, setFriendsData] = useState<FriendsData>({
    friends: [],
    incoming: [],
    outgoing: [],
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/friends");
      if (res.ok) {
        const data = await res.json();
        setFriendsData(data);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchFriends();
      setSearchQuery("");
      setSearchError(null);
    }
  }, [open, fetchFriends]);

  const handleSendRequest = async () => {
    if (!FORMAT_REGEX.test(searchQuery.trim())) {
      setSearchError("Must be display name followed by # and 3 digits");
      return;
    }

    setSendingRequest(true);
    setSearchError(null);

    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: searchQuery.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Friend request sent");
        setSearchQuery("");
        fetchFriends();
      } else {
        setSearchError(data.error ?? "Failed to send request");
      }
    } catch {
      setSearchError("Network error");
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendship_id: friendshipId }),
      });
      if (res.ok) {
        toast.success("Friend request accepted");
        fetchFriends();
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      const res = await fetch("/api/friends/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendship_id: friendshipId }),
      });
      if (res.ok) {
        toast.success("Friend request declined");
        fetchFriends();
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendship_id: friendshipId }),
      });
      if (res.ok) {
        toast.success("Friend removed");
        fetchFriends();
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      const res = await fetch("/api/friends/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendship_id: friendshipId }),
      });
      if (res.ok) {
        toast.success("Request cancelled");
        fetchFriends();
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const renderUserRow = (
    user: { username: string; display_number: string | null },
    action: React.ReactNode
  ) => (
    <div
      key={user.username}
      className="flex items-center justify-between rounded-lg border border-neutral-100 px-4 py-3"
    >
      <div>
        <p className="text-sm font-medium text-black">
          {user.username}
          {user.display_number && (
            <span className="ml-1.5 text-xs text-neutral-400">
              ({user.display_number})
            </span>
          )}
        </p>
      </div>
      {action}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Friends</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="friends" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="requests">
              Requests
              {friendsData.incoming.length > 0 && (
                <Badge
                  variant="default"
                  className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]"
                >
                  {friendsData.incoming.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="flex-1 overflow-y-auto mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : friendsData.friends.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No friends yet. Add friends in the Requests tab.
              </div>
            ) : (
              <div className="space-y-2">
                {friendsData.friends.map((friend) =>
                  renderUserRow(friend, (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(friend.friendship_id)}
                      disabled={actionLoading === friend.friendship_id}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                    >
                      {actionLoading === friend.friendship_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-4">
              {/* Search bar */}
              <div>
                <div className="relative">
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSendRequest();
                      }
                    }}
                    placeholder="e.g. testing#002"
                    className="h-10 pr-12"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSendRequest}
                    disabled={sendingRequest || !searchQuery.trim()}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  >
                    {sendingRequest ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {searchError && (
                  <p className="mt-1.5 text-xs font-medium text-[#FF4444]">
                    {searchError}
                  </p>
                )}
              </div>

              {/* Incoming */}
              {friendsData.incoming.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Incoming Requests
                  </h4>
                  <div className="space-y-2">
                    {friendsData.incoming.map((req) =>
                      renderUserRow(req, (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleAccept(req.friendship_id)}
                            disabled={actionLoading === req.friendship_id}
                            className="h-8 gap-1 text-xs bg-black text-white hover:bg-neutral-800"
                          >
                            {actionLoading === req.friendship_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecline(req.friendship_id)}
                            disabled={actionLoading === req.friendship_id}
                            className="h-8 gap-1 text-xs"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Decline
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Outgoing */}
              {friendsData.outgoing.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Sent Requests
                  </h4>
                  <div className="space-y-2">
                    {friendsData.outgoing.map((req) =>
                      renderUserRow(req, (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(req.friendship_id)}
                          disabled={actionLoading === req.friendship_id}
                          className="h-8 gap-1 text-xs"
                        >
                          {actionLoading === req.friendship_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          Cancel
                        </Button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {friendsData.incoming.length === 0 &&
                friendsData.outgoing.length === 0 &&
                !searchError && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No pending requests
                  </div>
                )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
