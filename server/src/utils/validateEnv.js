/**
 * Fail fast on missing configuration.
 *
 * Without this the server starts happily and then throws deep inside a request
 * handler — a missing JWT secret becomes a 500 on login rather than a refusal
 * to boot.
 */

const REQUIRED = [
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "ACCESS_TOKEN_EXPIRY",
  "REFRESH_TOKEN_EXPIRY",
  "FRONTEND_URL",
];

// Features degrade gracefully when these are absent, but the operator should
// know which ones are off.
const OPTIONAL_FEATURES = {
  "Razorpay payments": ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
  "Email delivery": ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"],
  "SMS / WhatsApp": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID"],
  "AI bill scanning and insights": ["GEMINI_API_KEY"],
};

export const validateEnv = () => {
  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length) {
    console.error(
      `\nMissing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\n`
    );
    process.exit(1);
  }

  if (!process.env.PAN_HASH_SECRET) {
    console.warn(
      "PAN_HASH_SECRET is not set; falling back to ACCESS_TOKEN_SECRET. " +
        "Set a dedicated secret so rotating JWT keys does not invalidate PAN lookups."
    );
  }

  for (const [feature, keys] of Object.entries(OPTIONAL_FEATURES)) {
    const absent = keys.filter((key) => !process.env[key]);
    if (absent.length) {
      console.warn(`${feature} disabled — missing: ${absent.join(", ")}`);
    }
  }
};
