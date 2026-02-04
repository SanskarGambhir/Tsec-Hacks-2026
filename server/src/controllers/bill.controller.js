import { analyzeBillText } from "../utils/gemini.js";
import { calculateSplit } from "../utils/splitEngine.js";

export const processBill = async (req, res) => {
  try {
    const { text, members } = req.body;

    if (!text) {
      return res.status(400).json({ message: "No text provided" });
    }

    const structuredData = await analyzeBillText(text, members);

    // 🔥 SANITIZE DATA
    structuredData.items = structuredData.items.map(item => {
      const cleanPrice = Number(
        String(item.price).replace(/[^\d.]/g, "")
      );

      return {
        ...item,
        quantity: Number(item.quantity) || 1,
        price: cleanPrice || 0,
        assignedTo: item.assignedTo || [],
        isShared: Boolean(item.isShared),
      };
    });

    return res.json({
      success: true,
      data: structuredData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Bill processing failed" });
  }
};


export const splitBill = async (req, res) => {
  try {
    const { items, members } = req.body;

    if (!items || !members) {
      return res.status(400).json({
        success: false,
        message: "Items and members are required"
      });
    }

    const balances = calculateSplit(items, members);

    return res.status(200).json({
      success: true,
      balances
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Split calculation failed"
    });
  }
};
