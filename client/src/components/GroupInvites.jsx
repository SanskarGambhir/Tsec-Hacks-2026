import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Check, X, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  getGroupInvites,
  acceptGroupInvite,
  rejectGroupInvite,
} from "@/api/groups";
import { useNavigate } from "react-router-dom";

function GroupInvites() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const response = await getGroupInvites();
      setInvites(response.data || []);
    } catch (error) {
      console.error("Error fetching group invites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (inviteId, groupId) => {
    try {
      setActionLoading(inviteId);
      await acceptGroupInvite(inviteId);
      setInvites(invites.filter((inv) => inv._id !== inviteId));
      // Navigate to the group page
      navigate(`/groups/${groupId}`);
    } catch (error) {
      console.error("Error accepting invite:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (inviteId) => {
    try {
      setActionLoading(inviteId);
      await rejectGroupInvite(inviteId);
      setInvites(invites.filter((inv) => inv._id !== inviteId));
    } catch (error) {
      console.error("Error rejecting invite:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const inviteDate = new Date(date);
    const diffTime = Math.abs(now - inviteDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return inviteDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Users className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No Pending Invites
        </h3>
        <p className="text-gray-500">
          You don't have any group invites at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {invites.map((invite) => (
          <motion.div
            key={invite._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Group Avatar */}
                  <Avatar className="h-14 w-14 border-2 border-purple-500">
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-lg font-bold">
                      {invite.group?.name?.charAt(0) || "G"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          {invite.group?.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Invited by{" "}
                          <span className="font-medium">
                            {invite.sender?.username || "Someone"}
                          </span>
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-purple-50 text-purple-700 border-purple-200"
                      >
                        {invite.inviteType === "friend"
                          ? "Friend Invite"
                          : "Phone Invite"}
                      </Badge>
                    </div>

                    {/* Group Info */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{invite.group?.members?.length || 0} members</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(invite.createdAt)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleAccept(invite._id, invite.group._id)}
                        disabled={actionLoading === invite._id}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        {actionLoading === invite._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Accept
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleReject(invite._id)}
                        disabled={actionLoading === invite._id}
                        variant="outline"
                        className="border-gray-300 hover:bg-gray-50"
                      >
                        {actionLoading === invite._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Decline
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default GroupInvites;
