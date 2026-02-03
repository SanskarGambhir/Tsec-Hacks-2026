import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth.js";
import { useState } from "react";


export default function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!username || !email || !password) {
      alert("All fields are required");
      return;
    }

    try {
      setLoading(true);

      const res = await registerUser({
        email,
        username,
        password,
      });

      console.log(res.data);
      alert("Signup successful. Check your email!");

      navigate('/homepage')
    } catch (error) {
      console.error(error.response?.data);
      alert(error.response?.data?.message);
    } finally {
      setLoading(false)
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 border border-gray-200">

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            Create Account
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Sign up to get started
          </p>
        </div>

        {/* Form */}
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
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Footer */}
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