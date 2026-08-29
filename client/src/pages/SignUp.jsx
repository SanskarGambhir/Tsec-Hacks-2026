import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth.js";
import api from "../api/axios.js";
import { useState, useEffect } from "react";
import { Zap, User, Mail, Phone, CreditCard, Lock, Shield, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" },
  }),
};

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
      await api.post("/auth/verify-phone", { email, otp });

      navigate("/login");

    } catch (error) {
      alert(error.response?.data?.message);
    }
  };

  const handleResendOTP = async () => {
    await api.post("/auth/resend-phone-otp", { email });
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-background via-background to-secondary/30">
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
                <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Join Cooper and start managing group expenses
                </p>
              </div>
            </motion.div>

            {!showOTP && (
              <div className="space-y-3">
                <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 pl-10 bg-secondary border-border"
                  />
                </motion.div>

                <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10 bg-secondary border-border"
                  />
                </motion.div>

                <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 pl-10 bg-secondary border-border"
                  />
                </motion.div>

                <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="relative">
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="PAN Card number"
                    value={panCard}
                    onChange={(e) => setPanCard(e.target.value.toUpperCase())}
                    className="h-12 pl-10 bg-secondary border-border"
                  />
                </motion.div>

                <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible">
                  <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary border border-border cursor-pointer hover:border-primary/30 transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">
                      {panFile ? panFile.name : "Upload PAN card image (optional)"}
                    </span>
                    <input
                      type="file"
                      onChange={handlePanFileChange}
                      className="hidden"
                    />
                  </label>
                </motion.div>

                {panFile && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl overflow-hidden border border-border">
                    {panFile.type.includes("image") && (
                      <img src={panPreview} className="w-full max-h-48 object-cover" />
                    )}
                    {panFile.type === "application/pdf" && (
                      <iframe src={panPreview} className="w-full h-48" />
                    )}
                  </motion.div>
                )}

                <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible" className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Create password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-10 bg-secondary border-border"
                  />
                </motion.div>

                <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible">
                  <Button
                    onClick={handleSignup}
                    disabled={loading}
                    className="w-full h-12 text-base font-semibold"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Creating account...
                      </span>
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </motion.div>
              </div>
            )}

            {showOTP && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
                  <Shield className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">A verification code has been sent to your phone</p>
                </div>

                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="h-12 pl-10 bg-secondary border-border"
                  />
                </div>

                <Button
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
                    onClick={handleResendOTP}
                    className="text-primary text-sm w-full text-center hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </motion.div>
            )}

            <motion.p custom={8} variants={fadeUp} initial="hidden" animate="visible" className="text-center text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </motion.p>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}