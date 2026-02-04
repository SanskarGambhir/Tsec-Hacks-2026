import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();


const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

console.log(process.env.TWILIO_VERIFY_SERVICE_SID);
console.log(process.env.TWILIO_ACCOUNT_SID);
console.log(process.env.TWILIO_AUTH_TOKEN);

export const sendOTP = async (phone) => {
  return await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({
      to: phone,
      channel: "sms",
    });
};

export const verifyOTP = async (phone, code) => {
  return await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({
      to: phone,
      code,
    });
};

// Send SMS message
export const sendSMS = async (to, message) => {
  return await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to,
  });
};
