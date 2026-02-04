import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Wallet,
  ImagePlus,
  X,
  Plus,
  DollarSign,
  Mail,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const groupIcons = ["🏖️", "🏠", "🍕", "👨‍👩‍👧‍👦", "💪", "📚", "🎮", "✈️", "🎉", "💼", "🏋️", "🎬"];

// Color options with CSS gradient values
const groupColors = [
  { id: "blue-cyan", gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)" },
  { id: "purple-pink", gradient: "linear-gradient(135deg, #a855f7, #ec4899)" },
  { id: "orange-red", gradient: "linear-gradient(135deg, #f97316, #ef4444)" },
  { id: "emerald-green", gradient: "linear-gradient(135deg, #4ade80, #22c55e)" },
  { id: "yellow-orange", gradient: "linear-gradient(135deg, #eab308, #f97316)" },
  { id: "indigo-purple", gradient: "linear-gradient(135deg, #6366f1, #a855f7)" },
];

export default function CreateGroup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "🏖️",
    color: groupColors[0],
    enablePool: false,
    poolAmount: "",
    members: [],
    newMemberEmail: "",
  });

  const handleAddMember = () => {
    if (formData.newMemberEmail && !formData.members.includes(formData.newMemberEmail)) {
      setFormData({
        ...formData,
        members: [...formData.members, formData.newMemberEmail],
        newMemberEmail: "",
      });
    }
  };

  const handleRemoveMember = (email) => {
    setFormData({
      ...formData,
      members: formData.members.filter((m) => m !== email),
    });
  };

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/groups");
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-2xl font-bold">Create New Group</h1>
          <p className="text-gray-400 text-sm">Step {step} of 3</p>
        </div>
      </motion.div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-emerald-500" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Group Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Group Name */}
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input
                  placeholder="e.g., Weekend Trip, Roommates"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 bg-white/5 border-white/10 focus:border-emerald-500/50"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="What's this group for?"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="bg-white/5 border-white/10 focus:border-emerald-500/50 resize-none"
                  rows={3}
                />
              </div>

              {/* Icon Selection */}
              <div className="space-y-2">
                <Label>Group Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {groupIcons.map((icon) => (
                    <motion.button
                      key={icon}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                        formData.icon === icon
                          ? "bg-emerald-500/20 border-2 border-emerald-500"
                          : "bg-white/5 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {icon}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div className="space-y-2">
                <Label>Theme Color</Label>
                <div className="flex flex-wrap gap-2">
                  {groupColors.map((color) => (
                    <motion.button
                      key={color.id}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-12 h-12 rounded-xl transition-all ${
                        formData.color.id === color.id
                          ? "ring-2 ring-white ring-offset-2 ring-offset-[#0a0f0a]"
                          : ""
                      }`}
                      style={{ background: color.gradient }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-gray-400 mb-3">Preview</p>
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: formData.color.gradient }}
                  >
                    {formData.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {formData.name || "Group Name"}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {formData.description || "No description"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end mt-6">
            <Button
              onClick={() => setStep(2)}
              disabled={!formData.name}
              className="text-black font-semibold hover:opacity-90"
              style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
            >
              Continue
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 2: Pool Fund */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                Pool Fund Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Pool Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="space-y-1">
                  <h3 className="font-medium">Enable Pool Fund</h3>
                  <p className="text-sm text-gray-400">
                    Create a shared wallet for group expenses
                  </p>
                </div>
                <Switch
                  checked={formData.enablePool}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enablePool: checked })
                  }
                />
              </div>

              {formData.enablePool && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {/* Initial Pool Amount */}
                  <div className="space-y-2">
                    <Label>Initial Contribution (per member)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={formData.poolAmount}
                        onChange={(e) =>
                          setFormData({ ...formData, poolAmount: e.target.value })
                        }
                        className="pl-11 h-12 bg-white/5 border-white/10 focus:border-emerald-500/50"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Each member will contribute this amount to start the pool
                    </p>
                  </div>

                  {/* Pool Rules */}
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <h4 className="font-medium text-emerald-400 mb-2">Pool Rules</h4>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Any member can add expenses from the pool
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        All transactions are visible to group members
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Admins can adjust contributions anytime
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="border-white/10 hover:bg-white/5"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              className="text-black font-semibold hover:opacity-90"
              style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
            >
              Continue
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Add Members */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Add Members
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Member Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={formData.newMemberEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, newMemberEmail: e.target.value })
                    }
                    onKeyPress={(e) => e.key === "Enter" && handleAddMember()}
                    className="pl-11 h-12 bg-white/5 border-white/10 focus:border-emerald-500/50"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddMember}
                  className="h-12 px-4 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
              </div>

              {/* You (Creator) */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-emerald-500/50">
                    <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=cooper" />
                    <AvatarFallback 
                      className="text-black"
                      style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}
                    >
                      Y
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">You</p>
                    <p className="text-sm text-gray-400">alex@example.com</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-400">
                    Admin
                  </span>
                </div>
              </div>

              {/* Added Members */}
              {formData.members.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Invited Members</p>
                  {formData.members.map((email, index) => (
                    <motion.div
                      key={email}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`}
                        />
                        <AvatarFallback 
                          className="text-white text-sm"
                          style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}
                        >
                          {email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{email}</p>
                        <p className="text-xs text-gray-500">Pending invite</p>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(email)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Info */}
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-400">
                  💡 Members will receive an email invitation to join the group.
                  You can also add members later.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="border-white/10 hover:bg-white/5"
            >
              Back
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="text-black font-semibold hover:opacity-90"
                style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                  />
                ) : (
                  "Create Group"
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
