import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth.js";
import axios from "axios";
import { useState, useEffect } from "react";

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

  const navigate = useNavigate();

  /* ================= SIGNUP ================= */

  const handleSignup = async () => {
    if (!username || !email || !password || !phone || !panCard) {
      alert("All fields are required");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      await registerUser({
        email,
        username,
        password,
        phone,
        panCard,
      });

      alert("OTP sent to your phone. Please verify.");

      setShowOTP(true);
      startCountdown();

    } catch (error) {
      alert(error.response?.data?.message);
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
        "http://localhost:8000/api/v1/auth/verify-phone",
        { email, otp },
        { withCredentials: true }
      );

      alert("Phone verified successfully! Please verify email and login.");
      navigate("/login");

    } catch (error) {
      alert(error.response?.data?.message);
    }
  };

  /* ================= RESEND OTP ================= */

  const handleResendOTP = async () => {
    try {
      await axios.post(
        "http://localhost:8000/api/v1/auth/resend-phone-otp",
        { email },
        { withCredentials: true }
      );

      alert("OTP resent successfully");
      startCountdown();

    } catch (error) {
      alert(error.response?.data?.message);
    }
  };

  /* ================= COUNTDOWN ================= */

  const startCountdown = () => {
    setCountdown(60);
  };

  useEffect(() => {
    let timer;

    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }

    return () => clearTimeout(timer);
  }, [countdown]);

  /* ================= UI ================= */

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 border border-gray-200">

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            Create Account
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Sign up to get started
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            handleSignup();
          }}
        >
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
          />

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
          />

          <input
            type="text"
            placeholder="Phone (+91XXXXXXXXXX)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
          />

          <input
            type="text"
            placeholder="PAN Card (ABCDE1234F)"
            value={panCard}
            onChange={(e) =>
              setPanCard(e.target.value.toUpperCase())
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
          />

          {!showOTP && (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          )}

          {/* OTP SECTION */}
          {showOTP && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
              />

              <button
                type="button"
                onClick={handleVerifyOTP}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold"
              >
                Verify OTP
              </button>

              <div className="text-center text-sm">
                {countdown > 0 ? (
                  <p className="text-gray-500">
                    Resend OTP in {countdown}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?
            <Link
              to="/login"
              className="ml-1 text-indigo-600 font-semibold hover:underline"
            >
              Sign In
            </Link>
          </p>

          <p className="text-xs text-gray-400 mt-4">
            © 2025 All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
