import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  X, 
  Share2, 
  Copy, 
  CheckCircle2, 
  Percent, 
  UserPlus, 
  IndianRupee,
  Receipt,
  Divide,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/api/axios";

export default function CreateSharedExpense() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [creatorEmail, setCreatorEmail] = useState("");
  const [members, setMembers] = useState([{ name: "", percentage: "" }]);
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const addMember = () => {
    setMembers([...members, { name: "", percentage: "" }]);
  };

  const removeMember = (index) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index, field, value) => {
    const newMembers = [...members];
    newMembers[index][field] = value;
    setMembers(newMembers);
  };

  const calculateAutoPercentage = () => {
    // Including the creator
    const totalPeople = members.length + 1;
    const equalPart = (100 / totalPeople).toFixed(2);
    setMembers(members.map(m => ({ ...m, percentage: equalPart })));
  };

  const handleCreateSplit = async () => {
    if (!title || !totalAmount || !creatorName || !creatorEmail) {
      alert("Please fill in all required fields");
      return;
    }

    const participantPercentage = members.reduce((sum, m) => sum + parseFloat(m.percentage || 0), 0);
    const creatorPercentage = 100 - participantPercentage;

    if (creatorPercentage < 0) {
      alert("Total percentage exceeds 100%");
      return;
    }

    setLoading(true);
    try {
      const allParticipants = [
        ...members.map(m => ({
          name: m.name,
          sharePercentage: parseFloat(m.percentage),
          shareAmount: (parseFloat(totalAmount) * parseFloat(m.percentage)) / 100
        })),
        {
          name: creatorName,
          sharePercentage: parseFloat(creatorPercentage.toFixed(2)),
          shareAmount: parseFloat(((creatorPercentage / 100) * parseFloat(totalAmount)).toFixed(2))
        }
      ];

      const response = await api.post("/shared-expenses/create", {
        title,
        description,
        totalAmount: parseFloat(totalAmount),
        creatorName,
        creatorEmail,
        participants: allParticipants
      });

      const link = `${window.location.origin}/shared-expense/${response.data.data.shareLink}`;
      setShareLink(link);
    } catch (error) {
      console.error("Error creating split:", error);
      alert(error.response?.data?.message || "Failed to create split");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
           <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Split Bills</h1>
          <p className="text-muted-foreground mt-1">Create a shareable expense breakdown with anyone</p>
        </div>
      </motion.div>

      {!shareLink ? (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Divide className="w-6 h-6 text-primary" />
              New Shared Expense
            </CardTitle>
            <CardDescription>Enter details and define how the bill is split</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Expense Title *</Label>
                <Input 
                  placeholder="e.g. Weekend Dinner" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-secondary border-border h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Amount *</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="number"
                    placeholder="0.00" 
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="pl-10 bg-secondary border-border h-12"
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Description</Label>
                <Input 
                  placeholder="What was this for?" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-secondary border-border h-12"
                />
              </div>
            </div>

            {/* Creator Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-primary/10 border border-primary/20">
              <div className="space-y-2">
                <Label>Your Name (Creator) *</Label>
                <Input 
                  placeholder="Enter your name" 
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Your Email *</Label>
                <Input 
                  type="email"
                  placeholder="your@email.com" 
                  value={creatorEmail}
                  onChange={(e) => setCreatorEmail(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg">Participants</h3>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={calculateAutoPercentage}
                  className="text-xs border-primary/20 text-primary hover:bg-primary/10"
                >
                  Split Equally
                </Button>
              </div>

              <div className="space-y-4">
                {members.map((member, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-4 items-end"
                  >
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <Input 
                        placeholder="Participant Name" 
                        value={member.name}
                        onChange={(e) => updateMember(index, "name", e.target.value)}
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs text-muted-foreground">Share %</Label>
                      <div className="relative">
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input 
                          type="number"
                          placeholder="0" 
                          value={member.percentage}
                          onChange={(e) => updateMember(index, "percentage", e.target.value)}
                          className="bg-secondary border-border pr-8"
                        />
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeMember(index)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 mb-0.5"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}

                <Button 
                  variant="outline" 
                  onClick={addMember}
                  className="w-full h-12 border-dashed border-border hover:border-primary/20 hover:bg-secondary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Person
                </Button>
              </div>

              {/* Creator auto-calculation display */}
              <div className="p-4 rounded-xl bg-secondary border border-border flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Your Remaining Share ({creatorName || 'You'}):</span>
                <span className={`font-bold ${(100 - members.reduce((s, m) => s + parseFloat(m.percentage || 0), 0)) < 0 ? 'text-destructive' : 'text-primary'}`}>
                  {(100 - members.reduce((s, m) => s + parseFloat(m.percentage || 0), 0)).toFixed(2)}%
                </span>
              </div>
            </div>

            <Button 
              onClick={handleCreateSplit}
              disabled={loading}
              className="w-full h-14 text-primary-foreground font-bold text-xl rounded-2xl"
              style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
            >
              {loading ? "Creating..." : "Create & Generate Link"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-primary/20 bg-primary/10">
            <CardContent className="p-10 text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">Split Created Successfully!</h2>
                <p className="text-muted-foreground text-lg">Your shared expense link is ready to be sent.</p>
              </div>
              
              <div className="flex gap-2 p-3 rounded-2xl border border-border mt-8">
                <Input 
                  value={shareLink} 
                  readOnly 
                  className="bg-transparent border-none focus-visible:ring-0 font-mono text-sm h-10"
                />
                <Button onClick={copyToClipboard} className="shrink-0 bg-emerald-600 hover:bg-emerald-500 px-6">
                  {copied ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button 
                  variant="outline" 
                  onClick={() => { setShareLink(""); setTitle(""); setTotalAmount(""); setMembers([{ name: "", percentage: "" }]); }}
                  className="flex-1 h-12 border-border text-lg font-semibold"
                >
                  Create Another
                </Button>
                <Button 
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-lg font-semibold"
                  onClick={() => window.open(shareLink, '_blank')}
                >
                  Preview Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
