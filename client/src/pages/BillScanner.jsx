import { useState } from "react";
import Tesseract from "tesseract.js";
import axios from "axios";

export default function BillScanner() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleScan = async () => {
    if (!image) return;

    setLoading(true);

    try {
      // Step 1: OCR
      const { data } = await Tesseract.recognize(image, "eng");

      // Step 2: Send text to backend (Gemini)
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}bill/analyze`,
        { text: data.text }
      );

      setBillData(response.data.data);

    } catch (error) {
      console.error(error);
    }

    setLoading(false);
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
        <div className="glass-card p-6 rounded-xl mt-6">
          <h3 className="font-semibold text-lg">Extracted Details</h3>
          <p><strong>Vendor:</strong> {billData.vendor}</p>
          <p><strong>Date:</strong> {billData.date}</p>
          <p><strong>Total:</strong> ₹ {billData.total}</p>
          <p><strong>Tax:</strong> ₹ {billData.tax}</p>

          <div className="mt-4">
            <h4 className="font-semibold">Items:</h4>
            {billData.items.map((item, i) => (
              <div key={i} className="text-sm">
                {item.name} × {item.quantity} — ₹ {item.price}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
