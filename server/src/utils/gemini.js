import { GoogleGenerativeAI } from "@google/generative-ai";

let model;

const getModel = () => {
  if (model) return model;

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY must be set to use bill scanning");
  }

  model = new GoogleGenerativeAI(key).getGenerativeModel({
    model: "gemini-2.5-flash",
  });
  return model;
};

/**
 * Turn raw OCR text from a receipt into structured items.
 *
 * When `members` is supplied the model is told who the diners are so it can
 * pre-assign obviously personal items; otherwise everything comes back
 * unassigned for the user to allocate.
 */
export const analyzeBillText = async (rawText, members = []) => {
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    throw new Error("Receipt text is required");
  }

  const roster = Array.isArray(members) && members.length > 0
    ? `The people sharing this bill are: ${members.join(", ")}.
Use ONLY these exact names in "assignedTo". If an item is clearly shared
(a pitcher, a starter platter, service charge) set "isShared": true and leave
"assignedTo" empty. If you cannot tell who an item belongs to, leave
"assignedTo" empty and "isShared" false.`
    : `No diner list was provided. Always return an empty "assignedTo" array
and set "isShared" to false.`;

  const prompt = `You are a receipt parser. Extract structured data from the OCR text below.

${roster}

RULES:
- "price" is numeric only, and is the total line price (quantity x unit price).
- Distinguish the currency symbol from digits; the rupee sign is not a 2.
- Preserve decimals exactly as printed.
- "quantity" is numeric.
- "assignedTo" is an array of names.
- "isShared" is a boolean.
- Return STRICT JSON matching the format, with no commentary.

FORMAT:
{
  "vendor": "",
  "date": "",
  "total": 0,
  "tax": 0,
  "items": [
    { "name": "", "quantity": 1, "price": 0, "assignedTo": [], "isShared": false }
  ]
}

RECEIPT TEXT:
${rawText}`;

  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const text = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("Gemini returned non-JSON for a receipt parse");
    throw new Error("Could not read that receipt. Please try a clearer photo.");
  }

  // The model is instructed to return this shape but is not guaranteed to, so
  // normalise before it reaches the split engine.
  return {
    vendor: typeof parsed.vendor === "string" ? parsed.vendor : "",
    date: typeof parsed.date === "string" ? parsed.date : "",
    total: Number(parsed.total) || 0,
    tax: Number(parsed.tax) || 0,
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
};
