import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth.js";
import { useState } from "react";
import api from "../api/axios.js";


export default function Login() {
  const[email, setEmail] = useState("");
  const[password, setPassword] = useState("");
  const[loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    if(!email || !password){
      alert("All fields are required")
      return;
    }

    setLoading(true)
    try {
      const res = await loginUser({
        email,
        password,
      });

      console.log(res.data);
      alert("Logged in successfully");
      localStorage.setItem("user", JSON.stringify(res.data));
      const res1=await api.post("api/v1/wallet/add_new",{}, { withCredentials: true });
      console.log("Hello")
      console.log(res1)

      navigate('/homepage');
    } catch (error) {
      alert(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 border border-gray-200">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block bg-gradient-to-r from-indigo-600 to-blue-600 p-3 rounded-full mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622"
              />
            </svg>
          </div>
        </div>

        {/* Form */}
        <form 
          className="space-y-6"
          onSubmit={(e) =>{
            e.preventDefault();
            handleLogin();
          }}
        >
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email ID
            </label>
            <input
              type="email"
              placeholder="your.name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold shadow-lg"
          >
            {loading ? "Logging In..." : "Login"}
          </button>
        </form>

        {/* Footer */}
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
