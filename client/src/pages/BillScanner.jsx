import { useState } from "react";
import Tesseract from "tesseract.js";
import axios from "axios";

export default function BillScanner() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState(null);
  const [members] = useState(["Alex", "Sarah", "Mike"]);
  const [balances, setBalances] = useState(null);
  const [settled, setSettled] = useState(false);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleScan = async () => {
    if (!image) return;

    setLoading(true);

    try {
      const { data } = await Tesseract.recognize(image, "eng");

      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}bill/analyze`,
        { text: data.text }
      );

      setBillData(response.data.data);
      setBalances(null);
      setSettled(false);

    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  const handleAssign = (index, member) => {
    const updated = [...billData.items];

    if (updated[index].assignedTo.includes(member)) {
      updated[index].assignedTo =
        updated[index].assignedTo.filter(m => m !== member);
    } else {
      updated[index].assignedTo.push(member);
    }

    updated[index].isShared = false;
    setBillData({ ...billData, items: updated });
  };

  const handleShared = (index) => {
    const updated = [...billData.items];
    updated[index].isShared = !updated[index].isShared;
    updated[index].assignedTo = [];
    setBillData({ ...billData, items: updated });
  };

  const handleSplit = async () => {
    try {
      const response = await axios.post(
        "http://localhost:8000/api/v1/bill/split",
        {
          items: billData.items,
          members
        }
      );

      setBalances(response.data.balances);

    } catch (error) {
      console.error(error);
    }
  };

  const handleAutoSettle = () => {
    // Simulate settlement logic
    setSettled(true);
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">AI Bill Scanner</h1>

      <input type="file" accept="image/*" onChange={handleUpload} />

      {preview && (
        <img src={preview} className="max-h-60 rounded-xl" />
      )}

      <button
        onClick={handleScan}
        className="bg-emerald-500 px-4 py-2 rounded-xl"
      >
        {loading ? "Processing..." : "Scan with AI"}
      </button>

      {billData && (
        <div className="glass-card p-6 rounded-xl mt-6 space-y-4">

          <h3 className="font-semibold text-lg">
            {billData.vendor}
          </h3>

          {billData.items.map((item, i) => (
            <div key={i} className="border p-4 rounded-xl space-y-3">

              <div className="flex justify-between font-semibold">
                <span>{item.name}</span>
                <span>₹ {Number(item.price).toFixed(2)}</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {members.map(member => (
                  <button
                    key={member}
                    onClick={() => handleAssign(i, member)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      item.assignedTo.includes(member)
                        ? "bg-emerald-500 text-black"
                        : "bg-white/10"
                    }`}
                  >
                    {member}
                  </button>
                ))}

                <button
                  onClick={() => handleShared(i)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    item.isShared
                      ? "bg-blue-500 text-black"
                      : "bg-white/10"
                  }`}
                >
                  Shared
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={handleSplit}
            className="w-full bg-emerald-500 py-2 rounded-xl font-semibold"
          >
            Calculate Split
          </button>

          {/* 🔥 SPLIT RESULT DISPLAY */}
          {balances && (
            <div className="mt-6 p-4 rounded-xl bg-white/5 space-y-3">
              <h4 className="font-semibold text-lg">Split Summary</h4>

              {Object.entries(balances).map(([member, amount]) => (
                <div key={member} className="flex justify-between text-sm">
                  <span>{member}</span>
                  <span className="font-semibold">
                    ₹ {amount.toFixed(2)}
                  </span>
                </div>
              ))}

              {!settled && (
                <button
                  onClick={handleAutoSettle}
                  className="w-full bg-blue-500 mt-4 py-2 rounded-xl font-semibold"
                >
                  Auto Settle
                </button>
              )}

              {settled && (
                <div className="text-green-400 font-semibold text-center mt-4">
                  ✅ Settlement Completed Successfully
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
