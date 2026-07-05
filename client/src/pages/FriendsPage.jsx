import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  UserPlus,
  Users,
  Check,
  X,
  Mail,
  Loader2,
  Clock,
  Phone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getFriends,
  getPendingRequests,
  getSentRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  sendPhoneInvite,
} from "@/api/friends";

function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("friends");
  const [showAddFriendDialog, setShowAddFriendDialog] = useState(false);
  const [addMethod, setAddMethod] = useState("search"); // 'search' or 'phone'
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneInviteSuccess, setPhoneInviteSuccess] = useState(false);

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
    fetchSentRequests();
  }, []);

  const fetchFriends = async () => {
    try {
      const response = await getFriends();
      setFriends(response.data || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await getPendingRequests();
      setPendingRequests(response.data || []);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const fetchSentRequests = async () => {
    try {
      const response = await getSentRequests();
      setSentRequests(response.data || []);
    } catch (error) {
      console.error("Error fetching sent requests:", error);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await searchUsers(query);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await sendFriendRequest(userId);
      // Update search results
      setSearchResults((prev) =>
        prev.map((user) =>
          user._id === userId ? { ...user, friendshipStatus: "sent" } : user
        )
      );
      fetchSentRequests();
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      fetchFriends();
      fetchPendingRequests();
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await rejectFriendRequest(requestId);
      fetchPendingRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await removeFriend(friendId);
      fetchFriends();
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  };

  const handleSendPhoneInvite = async () => {
    console.log("🔵 handleSendPhoneInvite called with:", phoneNumber);
    
    if (!phoneNumber.trim()) {
      alert("Please enter a phone number");
      return;
    }

    setPhoneLoading(true);
    try {
      console.log("🔵 Calling sendPhoneInvite API...");
      const response = await sendPhoneInvite(phoneNumber);
      console.log("🔵 API Response:", response);
      
      // Show success message
      alert("✅ WhatsApp invite sent successfully! Check their WhatsApp.");
      
      setPhoneInviteSuccess(true);
      setPhoneNumber("");
      setTimeout(() => {
        setPhoneInviteSuccess(false);
        setShowAddFriendDialog(false);
      }, 2000);
    } catch (error) {
      console.error("🔴 Error sending phone invite:", error);
      alert(error.response?.data?.message || "Failed to create invite. Please check the phone number.");
    } finally {
      setPhoneLoading(false);
    }
  };

  const getActionButton = (user) => {
    switch (user.friendshipStatus) {
      case "accepted":
        return (
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/20 text-destructive hover:bg-destructive/10"
            onClick={() => handleRemoveFriend(user._id)}
          >
            Remove
          </Button>
        );
      case "sent":
        return (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="border-amber-200 text-amber-600"
          >
            <Clock className="w-4 h-4 mr-1" />
            Pending
          </Button>
        );
      case "received":
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="text-primary-foreground font-semibold"
              
              onClick={() => handleAcceptRequest(user.friendshipId)}
            >
              Accept
            </Button>
          </div>
        );
      default:
        return (
          <Button
            size="sm"
            className="text-primary-foreground font-semibold"
            
            onClick={() => handleSendRequest(user._id)}
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Add
          </Button>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Add Friend Button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Friends</h1>
          <p className="text-muted-foreground">
            Connect with people and manage your friend list
          </p>
        </div>

        {/* Add Friend Button */}
        <Dialog open={showAddFriendDialog} onOpenChange={setShowAddFriendDialog}>
          <DialogTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 rounded-xl text-primary-foreground font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
              
            >
              <UserPlus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Friend</span>
            </motion.button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <UserPlus className="w-6 h-6 text-primary" />
                Add Friend
              </DialogTitle>
            </DialogHeader>

            {/* Method Tabs */}
            <Tabs value={addMethod} onValueChange={setAddMethod} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-secondary">
                <TabsTrigger value="search">
                  <Search className="w-4 h-4 mr-2" />
                  Search Users
                </TabsTrigger>
                <TabsTrigger value="phone">
                  <Phone className="w-4 h-4 mr-2" />
                  Phone Invite
                </TabsTrigger>
              </TabsList>

              {/* Search Users Tab */}
              <TabsContent value="search" className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by username, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-11 h-12 bg-secondary border-border focus:border-primary/20"
                  />
                  {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
                  )}
                </div>

                {/* Search Results */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {searchQuery ? (
                    searchResults.length > 0 ? (
                      searchResults.map((user) => (
                        <motion.div
                          key={user._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border hover:bg-secondary transition-colors"
                        >
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={user.avatar?.url} />
                            <AvatarFallback
                              className="text-foreground"
                              
                            >
                              {user.username?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.username}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                          {getActionButton(user)}
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {loading ? "Searching..." : "No users found"}
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Start typing to search for users</p>
                      <p className="text-xs mt-2">
                        Search by username, email, or phone number
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Phone Invite Tab */}
              <TabsContent value="phone" className="space-y-4">
                {phoneInviteSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Invite Sent!</h3>
                    <p className="text-sm text-muted-foreground">
                      SMS invite has been sent successfully
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Enter a phone number to send an invite via SMS
                      </p>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          type="tel"
                          placeholder="+91 1234567890"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="pl-11 h-12 bg-secondary border-border focus:border-primary/20"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                      <p className="text-sm text-primary flex items-start gap-2">
                        <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                          Your friend will receive an SMS with a link to join Cooper and automatically be added to your friend list.
                        </span>
                      </p>
                    </div>

                    <Button
                      onClick={handleSendPhoneInvite}
                      disabled={phoneLoading || !phoneNumber.trim()}
                      className="w-full text-primary-foreground font-semibold"
                      
                    >
                      {phoneLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Phone className="w-5 h-5 mr-2" />
                          Send Invite
                        </>
                      )}
                    </Button>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-secondary">
          <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
        </TabsList>

        {/* Friends List */}
        <TabsContent value="friends">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                My Friends
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {friends.length > 0 ? (
                friends.map((friend) => (
                  <motion.div
                    key={friend._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-secondary border border-border"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={friend.avatar?.url} />
                      <AvatarFallback
                        className="text-foreground"
                        
                      >
                        {friend.username?.[0]?.toUpperCase() || "F"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{friend.username}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {friend.email}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/20 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveFriend(friend._id)}
                    >
                      Remove
                    </Button>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No friends yet</p>
                  <p className="text-sm mt-1">
                    Click "Add Friend" button to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Requests */}
        <TabsContent value="pending">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Friend Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingRequests.length > 0 ? (
                pendingRequests.map((request) => (
                  <motion.div
                    key={request._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-secondary border border-border"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={request.requester?.avatar?.url} />
                      <AvatarFallback
                        className="text-foreground"
                        
                      >
                        {request.requester?.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {request.requester?.username}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {request.requester?.email}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAcceptRequest(request._id)}
                        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Check className="w-5 h-5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRejectRequest(request._id)}
                        className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pending requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sent Requests */}
        <TabsContent value="sent">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Sent Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sentRequests.length > 0 ? (
                sentRequests.map((request) => (
                  <motion.div
                    key={request._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-secondary border border-border"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={request.recipient?.avatar?.url} />
                      <AvatarFallback
                        className="text-foreground"
                        
                      >
                        {request.recipient?.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {request.recipient?.username}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {request.recipient?.email}
                      </p>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium rounded-lg bg-amber-50 text-amber-600">
                      Pending
                    </span>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No sent requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FriendsPage;
