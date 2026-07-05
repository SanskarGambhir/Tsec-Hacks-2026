import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth.js";
import axios from "axios";
import api from "../api/axios.js";
import { useState, useEffect } from "react";
import { Zap, Mail, Lock, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" },
  }),
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [showOTP, setShowOTP] = useState(false);

  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();


  const handleLogin = async () => {
    if (!email || !password) {
      alert("All fields are required");
      return;
    }

    setLoading(true);

    try {
      const res = await loginUser({ email, password });
      localStorage.setItem("user", JSON.stringify(res.data));

      await api.post("wallet/add_new", {}, { withCredentials: true });

      navigate("/dashboard");

    } catch (error) {
      const message = error.response?.data?.message;

      if (message?.includes("phone")) {
        setShowOTP(true);
        setCountdown(60);
      } else {
        alert(message);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ================= VERIFY OTP ================= */

  const handleVerifyOTP = async () => {
    if (!otp) {
      alert("Enter OTP");
      return;
    }

    try {
      await axios.post(
        `${import.meta.env.VITE_SERVER_URL}auth/verify-phone`,
        { email, otp },
        { withCredentials: true }
      );

      setShowOTP(false);
      setOtp("");
      alert("Phone verified successfully. Please login again.");

    } catch (error) {
      alert(error.response?.data?.message);
    }
  };

  /* ================= RESEND OTP ================= */

  const handleResendOTP = async () => {
    await axios.post(
      `${import.meta.env.VITE_SERVER_URL}auth/resend-phone-otp`,
      { email },
      { withCredentials: true }
    );
    setCountdown(60);
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  /* ================= UI ================= */

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-secondary/30">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="border-border shadow-lg">
          <CardContent className="p-8 space-y-6">

            {/* Branding */}
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-md">
                <Zap className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Sign in to manage your shared expenses
                </p>
              </div>
            </motion.div>

            <div className="space-y-4">

              <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-10 bg-secondary border-border"
                />
              </motion.div>

              <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10 bg-secondary border-border"
                />
              </motion.div>

              {showOTP && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-4 pt-2 overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
                    <Shield className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground">A verification code has been sent to your phone</p>
                  </div>

                  <div className="relative">
                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="h-12 pl-10 bg-secondary border-border"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleVerifyOTP}
                    className="w-full h-12 font-semibold"
                  >
                    Verify OTP
                  </Button>

                  {countdown > 0 ? (
                    <p className="text-center text-muted-foreground text-sm">
                      Resend OTP in {countdown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-primary text-sm w-full text-center hover:underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </motion.div>
              )}

              <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
                <Button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full h-12 text-base font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </motion.div>

            </div>

            <motion.p custom={4} variants={fadeUp} initial="hidden" animate="visible" className="text-center text-muted-foreground text-sm">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Create account
              </Link>
            </motion.p>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}