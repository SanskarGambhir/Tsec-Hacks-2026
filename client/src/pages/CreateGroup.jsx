import { useState } from "react";
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
import {
  Users,
  Plus,
  X,
  UserPlus,
  Coins,
  Divide,
  Clock,
  Target,
  Zap,
} from "lucide-react";
import api from "@/api/axios";

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
    setGroupMembers([
      ...groupMembers,
      { email: newMemberEmail, id: Date.now() },
    ]);
    setNewMemberEmail("");
    setError("");
  };

  const handleRemoveMember = (id) => {
    setGroupMembers(groupMembers.filter((member) => member.id !== id));
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

      // Create group payload
      const groupData = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        rules: rules,
        ruleType: groupType,
        releaseType: releaseType,
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

      // If there are members to add, we would need to invite them separately
      // For now, we'll just navigate to the group page

      setSuccess(true);
      setTimeout(() => {
        navigate(`/group/${groupId}`);
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
                <div className="flex gap-2">
                  <Input
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Enter member's email"
                    type="email"
                  />
                  <Button
                    type="button"
                    onClick={handleAddMember}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Add members by entering their email addresses
                </p>
              </div>

              {/* Selected Members */}
              {groupMembers.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Members</Label>
                  <div className="flex flex-wrap gap-2">
                    {groupMembers.map((member) => (
                      <Badge
                        key={member.id}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {member.email}
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
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
