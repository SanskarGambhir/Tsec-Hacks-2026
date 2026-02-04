import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeBillText = async (rawText, members = []) => {
  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.5-flash",
  });

  const prompt = `
You are a receipt parser.

Extract structured data from this OCR receipt text.
please differentiate between ₹ and 2
also check for decimals as amount is changing while you read it

IMPORTANT RULES:
- price must be numeric only ()
- price must be total line price (quantity × unit price)
- quantity must be numeric
- assignedTo must be an array
- isShared must be boolean
- Return STRICT JSON only

Format:

{
  "vendor": "",
  "date": "",
  "total": 0,
  "tax": 0,
  "items": [
    {
      "name": "",
      "quantity": 1,
      "price": 0,
      "assignedTo": [],
      "isShared": false
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
      responseMimeType: "application/json",
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
