import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth.js";
import axios from "axios";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [panCard, setPanCard] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [panFile, setPanFile] = useState(null);
  const [panPreview, setPanPreview] = useState(null);

  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!username || !email || !password || !phone || !panCard) {
      alert("All fields are required");
      return;
    }

    try {
      setLoading(true);

      await registerUser({
        email,
        username,
        password,
        phone,
        panCard,
      });

      setShowOTP(true);
      setCountdown(60);

    } catch (error) {
      alert(error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_SERVER_URL}auth/verify-phone`,
        { email, otp },
        { withCredentials: true }
      );

      navigate("/login");

    } catch (error) {
      alert(error.response?.data?.message);
    }
  };

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

  const handlePanFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPanFile(file);
    setPanPreview(URL.createObjectURL(file));
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-border">
          <CardContent className="p-8 space-y-6">

            <div className="text-center">
              <h2 className="text-2xl font-bold">
                Create <span className="text-primary">Account</span>
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Join and start managing group expenses
              </p>
            </div>

            {!showOTP && (
              <div className="space-y-4">
                <input
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                <input
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <input
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <input
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3"
                  placeholder="PAN Card"
                  value={panCard}
                  onChange={(e) => setPanCard(e.target.value.toUpperCase())}
                />

                <input
                  type="file"
                  onChange={handlePanFileChange}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3"
                />

                {panFile && (
                  <div className="bg-secondary p-3 rounded-xl">
                    {panFile.type.includes("image") && (
                      <img src={panPreview} className="rounded-lg max-h-48" />
                    )}
                    {panFile.type === "application/pdf" && (
                      <iframe src={panPreview} className="w-full h-48 rounded-lg" />
                    )}
                  </div>
                )}

                <input
                  type="password"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-primary-foreground"
                  style={{ background: "linear-gradient(90deg,#4ade80,#22c55e)" }}
                >
                  {loading ? "Creating..." : "Create Account"}
                </button>
              </div>
            )}

            {showOTP && (
              <div className="space-y-4">
                <input
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />

                <button
                  onClick={handleVerifyOTP}
                  className="w-full py-3 rounded-xl bg-emerald-600 font-semibold"
                >
                  Verify OTP
                </button>

                {countdown > 0 ? (
                  <p className="text-center text-muted-foreground text-sm">
                    Resend OTP in {countdown}s
                  </p>
                ) : (
                  <button
                    onClick={handleResendOTP}
                    className="text-primary text-sm w-full text-center"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            )}

            <p className="text-center text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-primary">
                Sign In
              </Link>
            </p>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}