import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth.js";
import axios from "axios";
import api from "../api/axios.js";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card border-white/10">
          <CardContent className="p-8 space-y-6">

            <div className="text-center">
              <h2 className="text-2xl font-bold">
                Welcome Back <span className="text-emerald-400">👋</span>
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Login to manage your shared expenses
              </p>
            </div>

            <div className="space-y-4">

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
              />

              {showOTP && (
                <div className="space-y-4 pt-2">

                  <input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                  />

                  <button
                    type="button"
                    onClick={handleVerifyOTP}
                    className="w-full py-3 rounded-xl bg-emerald-600 font-semibold hover:bg-emerald-500 transition-colors"
                  >
                    Verify OTP
                  </button>

                  {countdown > 0 ? (
                    <p className="text-center text-gray-400 text-sm">
                      Resend OTP in {countdown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-emerald-400 text-sm w-full text-center"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-black"
                style={{ background: "linear-gradient(90deg,#4ade80,#22c55e)" }}
              >
                {loading ? "Logging In..." : "Login"}
              </button>

            </div>

            <p className="text-center text-gray-400 text-sm">
              Don’t have an account?{" "}
              <Link to="/signup" className="text-emerald-400 hover:text-emerald-300">
                Sign Up
              </Link>
            </p>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}