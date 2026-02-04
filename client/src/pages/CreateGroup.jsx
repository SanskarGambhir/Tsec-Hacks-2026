import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus, X, UserPlus, Phone, Check, Loader2, MessageCircle,Coins, Divide, Zap, Clock, Target  } from "lucide-react";
import api from "@/api/axios";
import { getFriends, sendPhoneInvite } from "@/api/friends";
import { sendGroupInviteToFriend, sendGroupInviteViaWhatsApp } from "@/api/groups";

export default function CreateGroup() {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupType, setGroupType] = useState("pooling"); // splitwise or pooling
  const [releaseType, setReleaseType] = useState("instant"); // instant, time_locked, or milestone
  const [unlockDate, setUnlockDate] = useState("");
  const [milestones, setMilestones] = useState([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneAmount, setNewMilestoneAmount] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Friend selection states
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [addMethod, setAddMethod] = useState("friends"); // 'friends' or 'whatsapp'
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);

  // WhatsApp invite states
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneInviteSuccess, setPhoneInviteSuccess] = useState(false);
  const [invitedNumbers, setInvitedNumbers] = useState([]);

  // Fetch friends list
  const fetchFriends = async () => {
    setFriendsLoading(true);
    try {
      const response = await getFriends();
      setFriends(response.data || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setFriendsLoading(false);
    }
  };

  // Handle dialog open
  const handleDialogOpen = (open) => {
    setShowAddMemberDialog(open);
    if (open) {
      fetchFriends();
      setSelectedFriends([]);
      setPhoneInviteSuccess(false);
    }
  };

  // Toggle friend selection
  const toggleFriendSelection = (friend) => {
    const isSelected = selectedFriends.some(f => f._id === friend._id);
    if (isSelected) {
      setSelectedFriends(selectedFriends.filter(f => f._id !== friend._id));
    } else {
      setSelectedFriends([...selectedFriends, friend]);
    }
  };

  // Add selected friends to group members
  const handleAddSelectedFriends = () => {
    const newMembers = selectedFriends
      .filter(friend => !groupMembers.some(m => m._id === friend._id))
      .map(friend => ({
        _id: friend._id,
        email: friend.email,
        username: friend.username,
        avatar: friend.avatar,
        type: "friend"
      }));
    
    setGroupMembers([...groupMembers, ...newMembers]);
    setSelectedFriends([]);
    setShowAddMemberDialog(false);
  };

  // Send WhatsApp invite
  const handleSendWhatsAppInvite = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter a phone number");
      return;
    }

    // Check if already invited
    if (invitedNumbers.includes(phoneNumber.trim())) {
      setError("This number has already been invited");
      return;
    }

    setPhoneLoading(true);
    setError("");
    try {
      // Note: For now, we're just tracking the phone number
      // Actual group invite will be sent after group creation
      console.log("Phone number added for group invite:", phoneNumber);
      
      // Add to invited list
      setInvitedNumbers([...invitedNumbers, phoneNumber.trim()]);
      
      // Add as pending member
      setGroupMembers([...groupMembers, {
        id: Date.now(),
        phone: phoneNumber.trim(),
        type: "invited",
        status: "pending"
      }]);

      setPhoneInviteSuccess(true);
      setPhoneNumber("");
      
      setTimeout(() => {
        setPhoneInviteSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error adding phone number:", error);
      setError(error.response?.data?.message || "Failed to add phone number.");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleAddMember = () => {
    if (!newMemberEmail) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    // Check if email already exists
    if (groupMembers.some((member) => member.email === newMemberEmail)) {
      setError("This email is already added");
      return;
    }

    // Add member to the list
    setGroupMembers([...groupMembers, { email: newMemberEmail, id: Date.now(), type: "email" }]);
    setNewMemberEmail("");
    setError("");
  };

  const handleRemoveMember = (member) => {
    if (member._id) {
      setGroupMembers(groupMembers.filter(m => m._id !== member._id));
    } else if (member.id) {
      setGroupMembers(groupMembers.filter(m => m.id !== member.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    setLoading(true);

    try {
      // Prepare rules array based on group type
      const rules = [
        {
          ruleType: groupType,
          ruleValue:
            groupType === "pool" ? "Pool-based group" : "Regular split group",
          description:
            groupType === "pool"
              ? "Money is collected in a shared pool"
              : "Expenses are split evenly among members",
        },
      ];
      console.log("Setting Release Type:", releaseType);
      // Create group payload
      const groupData = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        rules: rules,
        ruleType: groupType,
        releaseType,
        pool: 0,
        // Time-locked fields
        ...(releaseType === "time_locked" && {
          unlockDate: new Date(unlockDate),
          isLocked: true,
        }),
        // Milestone fields
        ...(releaseType === "milestone" && {
          milestones: milestones.map((m) => ({
            title: m.title,
            targetAmount: Number(m.amount),
            currentAmount: 0,
            isCompleted: false,
          })),
        }),
      };

      // Create the group
      const response = await api.post("/groups/", groupData, {
        withCredentials: true,
      });

      // Get the created group ID
      const groupId = response.data.data._id;

      // Send invites to added members
      if (groupMembers.length > 0) {
        const invitePromises = [];
        
        for (const member of groupMembers) {
          if (member.type === "friend") {
            // Send invite to friend
            invitePromises.push(
              sendGroupInviteToFriend(groupId, member._id).catch(err => 
                console.error("Failed to invite friend:", err)
              )
            );
          } else if (member.type === "invited") {
            // Send WhatsApp invite for group
            invitePromises.push(
              sendGroupInviteViaWhatsApp(groupId, member.phone).catch(err => 
                console.error("Failed to send WhatsApp invite:", err)
              )
            );
          }
        }
        
        // Wait for all invites to be sent
        await Promise.all(invitePromises);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate(`/groups/${groupId}`);
      }, 1500);
    } catch (err) {
      console.error("Error creating group:", err);
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            Create New Group
          </CardTitle>
          <CardDescription>
            Start a new group and add members to manage expenses together
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name *</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                required
              />
            </div>

            {/* Group Type Selection */}
            <div className="space-y-2">
              <Label>Group Type *</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={groupType === "pooling" ? "default" : "outline"}
                  className="flex flex-col items-center justify-center p-4 h-auto"
                  onClick={() => setGroupType("pooling")}
                >
                  <Coins className="w-6 h-6 mb-2" />
                  <span className="font-medium">Pooling</span>
                  <span className="text-xs opacity-80">
                    Collect money in a shared pool
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={groupType === "splitwise" ? "default" : "outline"}
                  className="flex flex-col items-center justify-center p-4 h-auto"
                  onClick={() => setGroupType("splitwise")}
                >
                  <Divide className="w-6 h-6 mb-2" />
                  <span className="font-medium">Splitwise</span>
                  <span className="text-xs opacity-80">
                    Split expenses evenly
                  </span>
                </Button>
              </div>
            </div>

            {/* Release Type Selection */}
            <div className="space-y-2">
              <Label>Fund Release Type *</Label>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  type="button"
                  variant={releaseType === "instant" ? "default" : "outline"}
                  className="flex flex-col items-center justify-center p-4 h-auto"
                  onClick={() => setReleaseType("instant")}
                >
                  <Zap className="w-6 h-6 mb-2" />
                  <span className="font-medium">Instant</span>
                  <span className="text-xs opacity-80">Release anytime</span>
                </Button>
                <Button
                  type="button"
                  variant={
                    releaseType === "time_locked" ? "default" : "outline"
                  }
                  className="flex flex-col items-center justify-center p-4 h-auto"
                  onClick={() => setReleaseType("time_locked")}
                >
                  <Clock className="w-6 h-6 mb-2" />
                  <span className="font-medium">Time Locked</span>
                  <span className="text-xs opacity-80">Locked until date</span>
                </Button>
                <Button
                  type="button"
                  variant={releaseType === "milestone" ? "default" : "outline"}
                  className="flex flex-col items-center justify-center p-4 h-auto"
                  onClick={() => setReleaseType("milestone")}
                >
                  <Target className="w-6 h-6 mb-2" />
                  <span className="font-medium">Milestone</span>
                  <span className="text-xs opacity-80">Release on goals</span>
                </Button>
              </div>
            </div>

            {/* Time Locked Options */}
            {releaseType === "time_locked" && (
              <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
                <Label htmlFor="unlockDate">Unlock Date *</Label>
                <Input
                  id="unlockDate"
                  type="datetime-local"
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
                <p className="text-sm text-gray-500">
                  Funds will be locked until this date
                </p>
              </div>
            )}

            {/* Milestone Options */}
            {releaseType === "milestone" && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <Label>Milestones</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Milestone title"
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newMilestoneAmount}
                    onChange={(e) => setNewMilestoneAmount(e.target.value)}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newMilestoneTitle && newMilestoneAmount) {
                        setMilestones([
                          ...milestones,
                          {
                            id: Date.now(),
                            title: newMilestoneTitle,
                            amount: newMilestoneAmount,
                          },
                        ]);
                        setNewMilestoneTitle("");
                        setNewMilestoneAmount("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {milestones.length > 0 && (
                  <div className="space-y-2">
                    {milestones.map((milestone, index) => (
                      <div
                        key={milestone.id}
                        className="flex items-center justify-between p-2 bg-white rounded border"
                      >
                        <span>
                          {index + 1}. {milestone.title} - ${milestone.amount}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setMilestones(
                              milestones.filter((m) => m.id !== milestone.id),
                            )
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-500">
                  Funds are released when milestones are completed
                </p>
              </div>
            )}

            {/* Group Description */}
            <div className="space-y-2">
              <Label htmlFor="groupDescription">Description</Label>
              <Input
                id="groupDescription"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Enter group description"
              />
            </div>

            {/* Add Members */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Add Members</Label>
                <p className="text-sm text-gray-500">Invite friends to join your group</p>
                
                {/* Add Member Dialog */}
                <Dialog open={showAddMemberDialog} onOpenChange={handleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Members
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-xl">
                        <UserPlus className="w-6 h-6 text-emerald-500" />
                        Add Members
                      </DialogTitle>
                    </DialogHeader>

                    {/* Method Tabs */}
                    <Tabs value={addMethod} onValueChange={setAddMethod} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="friends">
                          <Users className="w-4 h-4 mr-2" />
                          From Friends
                        </TabsTrigger>
                        <TabsTrigger value="whatsapp">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          WhatsApp Invite
                        </TabsTrigger>
                      </TabsList>

                      {/* Friends List Tab */}
                      <TabsContent value="friends" className="space-y-4">
                        {friendsLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                          </div>
                        ) : friends.length > 0 ? (
                          <>
                            <div className="max-h-72 overflow-y-auto space-y-2">
                              {friends.map((friend) => {
                                const isSelected = selectedFriends.some(f => f._id === friend._id);
                                const isAlreadyAdded = groupMembers.some(m => m._id === friend._id);
                                
                                return (
                                  <div
                                    key={friend._id}
                                    onClick={() => !isAlreadyAdded && toggleFriendSelection(friend)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                      isAlreadyAdded 
                                        ? "opacity-50 cursor-not-allowed bg-gray-100" 
                                        : isSelected 
                                          ? "border-emerald-500 bg-emerald-50" 
                                          : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
                                    }`}
                                  >
                                    <Avatar className="w-10 h-10">
                                      <AvatarImage src={friend.avatar?.url} />
                                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-green-500 text-white">
                                        {friend.username?.[0]?.toUpperCase() || "F"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{friend.username}</p>
                                      <p className="text-sm text-gray-500 truncate">{friend.email}</p>
                                    </div>
                                    {isAlreadyAdded ? (
                                      <Badge variant="secondary">Added</Badge>
                                    ) : isSelected ? (
                                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" />
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {selectedFriends.length > 0 && (
                              <Button 
                                type="button"
                                onClick={handleAddSelectedFriends}
                                className="w-full bg-emerald-500 hover:bg-emerald-600"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add {selectedFriends.length} Friend{selectedFriends.length > 1 ? "s" : ""}
                              </Button>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No friends yet</p>
                            <p className="text-sm mt-1">Add friends first from the Friends page</p>
                          </div>
                        )}
                      </TabsContent>

                      {/* WhatsApp Invite Tab */}
                      <TabsContent value="whatsapp" className="space-y-4">
                        {phoneInviteSuccess ? (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                              <Check className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Invite Sent!</h3>
                            <p className="text-sm text-gray-500">
                              WhatsApp invite has been sent successfully
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <p className="text-sm text-gray-500">
                                Send a WhatsApp invite to join the group
                              </p>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                  type="tel"
                                  placeholder="+91 1234567890"
                                  value={phoneNumber}
                                  onChange={(e) => setPhoneNumber(e.target.value)}
                                  className="pl-11"
                                />
                              </div>
                            </div>

                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                              <p className="text-sm text-blue-700 flex items-start gap-2">
                                <MessageCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>
                                  Your friend will receive a WhatsApp message with a link to join Cooper and will be added as your friend automatically.
                                </span>
                              </p>
                            </div>

                            <Button
                              type="button"
                              onClick={handleSendWhatsAppInvite}
                              disabled={phoneLoading || !phoneNumber.trim()}
                              className="w-full bg-green-500 hover:bg-green-600"
                            >
                              {phoneLoading ? (
                                <>
                                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <MessageCircle className="w-5 h-5 mr-2" />
                                  Send WhatsApp Invite
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Selected Members */}
              {groupMembers.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Members ({groupMembers.length})</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {groupMembers.map((member) => (
                      <div 
                        key={member._id || member.id} 
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200"
                      >
                        {member.type === "friend" ? (
                          <>
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={member.avatar?.url} />
                              <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-green-500 text-white text-sm">
                                {member.username?.[0]?.toUpperCase() || "F"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{member.username}</p>
                              <p className="text-xs text-gray-500 truncate">{member.email}</p>
                            </div>
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                              Friend
                            </Badge>
                          </>
                        ) : member.type === "invited" ? (
                          <>
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <MessageCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{member.phone}</p>
                              <p className="text-xs text-gray-500">WhatsApp invite sent</p>
                            </div>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                              Pending
                            </Badge>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <UserPlus className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{member.email}</p>
                            </div>
                            <Badge variant="secondary">Email</Badge>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm">
                Group created successfully! Redirecting...
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 animate-spin rounded-full border border-white border-t-transparent"></div>
                    Creating...
                  </div>
                ) : (
                  "Create Group"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
