import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { registerUser } from "../api/auth.js";
import axios from "axios";
import api from "../api/axios.js";
import { useState, useEffect } from "react";

export default function SignUp() {
  const [searchParams] = useSearchParams();
  const isInvited = searchParams.get("invited") === "true";
  
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
      await api.post(
        "/auth/verify-phone",
        { email, otp }
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
      await api.post(
        "/auth/resend-phone-otp",
        { email }
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


  const handlePanFileChange = (e) => {
  const file = e.target.files[0];

  if (!file) return;

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

  if (!allowedTypes.includes(file.type)) {
    alert("Only PDF, JPG, and PNG files are allowed");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("File size must be less than 5MB");
    return;
  }

  setPanFile(file);

  // Create preview URL
  const previewURL = URL.createObjectURL(file);
  setPanPreview(previewURL);
};



  /* ================= UI ================= */

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #e0e7ff, #dbeafe, #f3e8ff)" }}>
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 border border-gray-200">

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            Create Account
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isInvited ? "Complete signup to join your friend" : "Sign up to get started"}
          </p>
        </div>

        {isInvited && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-700 text-center">
              🎉 You've been invited! Complete signup to connect with your friend.
            </p>
          </div>
        )}

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

          <div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    Upload PAN Card Document
  </label>

  <input
    type="file"
    accept=".pdf,.jpg,.jpeg,.png"
    onChange={handlePanFileChange}
    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white"
  />

  {panFile && (
    <div className="mt-4 border rounded-lg p-3 bg-gray-50">
      <p className="text-sm text-gray-600 mb-2">
        Selected: {panFile.name}
      </p>

      {/* Image Preview */}
      {(panFile.type === "image/jpeg" ||
        panFile.type === "image/png") && (
        <img
          src={panPreview}
          alt="PAN Preview"
          className="w-full max-h-60 object-contain rounded-lg border"
        />
      )}

      {/* PDF Preview */}
      {panFile.type === "application/pdf" && (
        <iframe
          src={panPreview}
          title="PDF Preview"
          className="w-full h-60 border rounded-lg"
        />
      )}
    </div>
  )}
</div>


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
              className="w-full text-white py-3 rounded-lg font-semibold"
              style={{ background: "linear-gradient(90deg, #4f46e5, #2563eb)" }}
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