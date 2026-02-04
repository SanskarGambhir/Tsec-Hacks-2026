import React, { useState, useEffect } from "react";
import axios from "axios";
import api from "../api/axios";

function Wallet() {
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [transactions, setTransactions] = useState([]);


  //   useEffect(() => {
  //   const intentId = localStorage.getItem("pendingIntent");
  //   if (intentId) {
  //     console.log("hello")
  //     verifyPayment(intentId);
  //   }
  // }, []);

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
    checkPayments();

  }, []);

  useEffect(() => {
    const interval = setInterval(checkPayments, 5000);
    return () => clearInterval(interval);
  }, []);
  const fetchTransactions = async () => {
    try {
      const res = await api.get("/wallet/get_trans", {
        withCredentials: true,
      });
      console.log(res.data.transactions)
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error(err);
    }
  };

  const verifyTransaction = async (intentId) => {
    try {
      setMessage("Submitting proof...");

      const res = await api.post(
        `/wallet/complete_deposit/${intentId}`,
        {},
        { withCredentials: true }
      );

      if (res.data.success) {
        setMessage("Proof submitted. Payment will settle shortly.");
        fetchTransactions();  // refresh ledger
        fetchBalance();       // update wallet balance
      }

      console.log(res.data);

      const response = await api.post(
        `/auth/add-money`,
        { amount: Number(amount) },
        { withCredentials: true }
      );

      console.log(response.data);

    } catch (err) {
      console.error(err);
      setMessage("Proof submission failed");
    }
  };


  const fetchBalance = async () => {
    try {
      const res = await api.get("/wallet/balance", { withCredentials: true });
      console.log(res)
      setBalance(res.data.balance);
    } catch (err) {
      console.error("Balance fetch failed", err);
    }
  };

  const checkPayments = async () => {
    try {
      const res = await api.get("/wallet/check_payments", {
        withCredentials: true,
      });

      const { updated } = res.data;

      if (updated.length > 0) {
        setMessage("Payment confirmed and wallet updated!");
        fetchTransactions(); // refresh history
      }
    } catch (err) {
      console.log(err)
      console.error("Payment sync failed", err);
    }
  };


  const verifyPayment = async (intentId) => {
    const res = await api.post(`/wallet/pay_verify`, {
      intentId: intentId,
    });
    console.log(res.data)
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/pay_verify`, {
          body: {
            intentId: intentId,
          },
          withCredentials: true,
        });
        console.log(res.data)
        const status = res.data.status;
        if (status === "FUNDED" || status === "COMPLETED") {
          clearInterval(interval);
          localStorage.removeItem("pendingIntent");

          // 🔥 NOW safe to credit wallet
          const walletRes = await api.post(
            "/wallet/add",
            { amount: Number(amount) },
            { withCredentials: true }
          );

          setBalance(walletRes.data.balance);
          setMessage("Money added successfully");
          setAmount("");
        }

      } catch (err) {
        if (err.response?.status !== 404) {
          console.error("Verification error:", err);
        }
      }
    }, 5000);
  };



  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setMessage("Enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const res3 = await api.post(
        "/wallet/pay",
        {},)
      console.log(res3.data.paymentUrl);


      const intentId = res3.data.intentId;
      console.log(intentId)
      localStorage.setItem("pendingIntent", intentId);
      window.open(res3.data.paymentUrl);


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

      <h3 style={{ marginBottom: "10px" }}>
        Current Balance: {balance !== null ? `₹${balance}` : "Loading..."}
      </h3>
      <h3>Recent Transactions</h3>

      {transactions.length === 0 && <p>No transactions yet</p>}

      {transactions.map((tx) => (
        <div key={tx._id} style={{
          border: "1px solid #ddd",
          padding: "10px",
          marginBottom: "10px",
          borderRadius: "6px"
        }}>
          <p><b>Type:</b> {tx.type}</p>
          <p><b>Amount:</b> ₹{tx.amount}</p>
          <p><b>Status:</b> {tx.status}</p>
          <p><b>Intent ID:</b> {tx.intentId}</p>

          {tx.status === "PENDING" && (
            <button
              onClick={() => verifyTransaction(tx.intentId)}
              style={{
                padding: "8px 12px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Confirm Delivery
            </button>
          )}
        </div>
      ))}

    </div>
  );
}

export default Wallet;