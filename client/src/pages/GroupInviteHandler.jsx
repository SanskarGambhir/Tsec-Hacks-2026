import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptGroupInviteByToken } from "@/api/groups";

export default function GroupInviteHandler() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem("user");
    if (!user) {
      // Store token and redirect to login
      localStorage.setItem("groupInviteToken", token);
      setTimeout(() => {
        navigate("/login?invited=group");
      }, 2000);
    }
  }, [token, navigate]);

  const handleAcceptInvite = async () => {
    setLoading(true);
    setError("");
    
    try {
      const response = await acceptGroupInviteByToken(token);
      setSuccess(true);
      
      setTimeout(() => {
        navigate(`/groups/${response.data._id}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join group");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: "linear-gradient(180deg, rgba(10, 15, 10, 0.98) 0%, rgba(16, 24, 16, 0.95) 100%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-primary/10">
            <Check className="w-10 h-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Welcome to the Group!</h1>
            <p className="text-muted-foreground">
              Redirecting to group page...
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-primary">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(180deg, rgba(10, 15, 10, 0.98) 0%, rgba(16, 24, 16, 0.95) 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 max-w-md"
      >
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}
        >
          <Users className="w-10 h-10 text-primary-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">You're Invited to a Group!</h1>
          <p className="text-muted-foreground">
            Someone wants you to join their group on Cooper
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-red-500/20 text-destructive">
            {error}
          </div>
        )}

        {localStorage.getItem("user") ? (
          <Button
            onClick={handleAcceptInvite}
            disabled={loading}
            className="w-full text-primary-foreground font-semibold"
            style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              "Accept Invite & Join Group"
            )}
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-primary">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Redirecting to login...</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          By accepting, you'll be able to manage expenses together
        </p>
      </motion.div>
    </div>
  );
}
