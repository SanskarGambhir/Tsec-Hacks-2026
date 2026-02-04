import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeBillText = async (rawText) => {
  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.5-flash",  // ✅ Correct format
  });

  const prompt = `
You are a receipt parser.

Extract structured data from this OCR receipt text.

Return STRICT JSON only.
No markdown.
No explanation.

Format:

{
  "vendor": "",
  "date": "",
  "total": "",
  "tax": "",
  "items": [
    {
      "name": "",
      "quantity": "",
      "price": ""
    }
  ]
}

Receipt Text:
${rawText}
`;

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",  // 🔥 THIS IS KEY
    },
  });

  const response = await result.response;
  const text = response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Raw Response:", text);
    throw new Error("Invalid JSON returned from Gemini");
  }
};
