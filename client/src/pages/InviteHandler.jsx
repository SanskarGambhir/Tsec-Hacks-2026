import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, Loader2 } from "lucide-react";

export default function InviteHandler() {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      // Store invite token in localStorage
      localStorage.setItem("inviteToken", token);
      
      // Redirect to signup page with token context
      setTimeout(() => {
        navigate("/signup?invited=true");
      }, 2000);
    }
  }, [token, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 max-w-md"
      >
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
          
        >
          <UserPlus className="w-10 h-10 text-primary-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">You're Invited!</h1>
          <p className="text-muted-foreground">
            Someone wants to connect with you on Cooper
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-primary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Redirecting to signup...</span>
        </div>

        <p className="text-xs text-muted-foreground">
          You'll be redirected to create an account or login
        </p>
      </motion.div>
    </div>
  );
}
