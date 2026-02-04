import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth.js";
import axios from "axios";
import api from "../api/axios.js";
import { useState, useEffect } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [showOTP, setShowOTP] = useState(false);

  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();

  /* ================= LOGIN ================= */

  const handleLogin = async () => {
    if (!email || !password) {
      alert("All fields are required");
      return;
    }

    setLoading(true);

    try {
      var res=await loginUser({ email, password });

      alert("Logged in successfully");
      localStorage.setItem("user", JSON.stringify(res.data));
      const res1=await api.post("api/v1/wallet/add_new",{}, { withCredentials: true });
      console.log("Hello")
      console.log(res1)
      navigate("/homepage");

    } catch (error) {
      alert(error);
      const message = error.response?.data?.message;

      if (message?.includes("phone")) {
        alert("Phone not verified. OTP sent.");
        setShowOTP(true);
        startCountdown();
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
      await axios.post("/api/v1/users/verify-phone", {
        email,
        otp,
      });

      alert("Phone verified successfully. Please login again.");
      setShowOTP(false);
      setOtp("");

    } catch (error) {
      alert(error.response?.data?.message);
    }
  };

  /* ================= RESEND OTP ================= */

  const handleResendOTP = async () => {
    try {
      await axios.post("/api/v1/users/resend-phone-otp", {
        email,
      });

      alert("OTP resent successfully");
      startCountdown();

    } catch (error) {
      alert(error.response?.data?.message);
    }
  };

  /* ================= COUNTDOWN LOGIC ================= */

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 border border-gray-200">

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Login
          </h2>
        </div>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          {/* EMAIL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email ID
            </label>
            <input
              type="email"
              placeholder="your.name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500"
            />
          </div>

          {/* OTP SECTION */}
          {showOTP && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Enter OTP
                </label>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                />
              </div>

              <button
                type="button"
                onClick={handleVerifyOTP}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold"
              >
                Verify OTP
              </button>

              {/* RESEND + TIMER */}
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

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold shadow-lg"
          >
            {loading ? "Logging In..." : "Login"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Don’t have an account?
            <Link
              to="/signup"
              className="ml-1 text-indigo-600 font-semibold hover:underline"
            >
              Sign Up
            </Link>
          </p>

          <p className="text-xs text-gray-400 mt-3">
            © 2025 Project Management App. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
