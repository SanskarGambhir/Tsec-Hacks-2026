import React, { useState } from "react";
import axios from "axios";
import api from "../api/axios";

function Wallet() {
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setMessage("Enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await api.post(
       "/wallet/add",
        { amount: Number(amount) },
        { withCredentials: true } // for auth cookies
      );

      setBalance(res.data.balance);
      setMessage("Money added successfully");
      setAmount("");

    } catch (err) {
        console.log(err)
      setMessage(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px" }}>
      <h2>Wallet</h2>

      <input
        type="number"
        placeholder="Enter amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ padding: "8px", width: "100%", marginBottom: "10px" }}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          padding: "10px",
          width: "100%",
          background: "#4CAF50",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        {loading ? "Processing..." : "Add Money"}
      </button>

      {message && <p style={{ marginTop: "10px" }}>{message}</p>}

      {balance !== null && (
        <h3 style={{ marginTop: "15px" }}>Balance: ₹{balance}</h3>
      )}
    </div>
  );
}

export default Wallet;
