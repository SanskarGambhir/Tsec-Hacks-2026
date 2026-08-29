import twilio from "twilio";

let client;

const getClient = () => {
  if (client) return client;

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
  }

  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client;
};

const verifyService = () => {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid) throw new Error("TWILIO_VERIFY_SERVICE_SID must be set");
  return getClient().verify.v2.services(sid);
};

export const sendOTP = async (phone) =>
  verifyService().verifications.create({ to: phone, channel: "sms" });

export const verifyOTP = async (phone, code) =>
  verifyService().verificationChecks.create({ to: phone, code });

export const sendSMS = async (to, message) =>
  getClient().messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });

export const sendWhatsApp = async (to, message) => {
  const from = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;
  if (!from) throw new Error("TWILIO_WHATSAPP_NUMBER must be set");

  return getClient().messages.create({
    body: message,
    from: `whatsapp:${from}`,
    to: `whatsapp:${to}`,
  });
};
