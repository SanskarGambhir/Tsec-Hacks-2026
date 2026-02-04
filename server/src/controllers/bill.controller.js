import { analyzeBillText } from "../utils/gemini.js";

export const processBill = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: "No text provided" });
    }

    const structuredData = await analyzeBillText(text);

    res.json({
      success: true,
      data: structuredData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Bill processing failed" });
  }
};
