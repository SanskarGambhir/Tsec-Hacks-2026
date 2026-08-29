import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const APP_NAME = process.env.APP_NAME || "Cooper";
const APP_URL = process.env.FRONTEND_URL || "http://localhost:5173";

let transporter;

/** Built once and reused; nodemailer pools connections per transporter. */
const getTransporter = () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error(
      "SMTP_HOST, SMTP_USER and SMTP_PASSWORD must be set to send email"
    );
  }

  const port = Number(SMTP_PORT) || 587;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  return transporter;
};

/**
 * Send a transactional email.
 *
 * Failures throw. An earlier version swallowed them, which meant registration
 * reported success while the verification mail never left the building.
 */
const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: { name: APP_NAME, link: APP_URL },
  });

  const mail = {
    from: process.env.MAIL_FROM || `${APP_NAME} <no-reply@${process.env.MAIL_DOMAIN || "localhost"}>`,
    to: options.email,
    subject: options.subject,
    text: mailGenerator.generatePlaintext(options.mailgenContent),
    html: mailGenerator.generate(options.mailgenContent),
  };

  await getTransporter().sendMail(mail);
};

const emailVerificationMailgenContent = (username, verificationUrl) => ({
  body: {
    name: username,
    intro: `Welcome to ${APP_NAME}! We're glad to have you on board.`,
    action: {
      instructions: "To verify your email address, click the button below:",
      button: {
        color: "#22BC66",
        text: "Verify Email",
        link: verificationUrl,
      },
    },
    outro: "If you did not create an account, no further action is required.",
  },
});

const forgotPasswordMailgenContent = (username, passwordResetUrl) => ({
  body: {
    name: username,
    intro: "You requested a password reset.",
    action: {
      instructions: "To choose a new password, click the button below:",
      button: {
        color: "#DC4D2F",
        text: "Reset Password",
        link: passwordResetUrl,
      },
    },
    outro: "This link expires in 20 minutes. If you did not request a reset, ignore this email.",
  },
});

const groupInviteMailgenContent = (inviterName, groupName, inviteUrl) => ({
  body: {
    intro: `${inviterName} invited you to join the group "${groupName}" on ${APP_NAME}.`,
    action: {
      instructions: "To accept the invitation, click the button below:",
      button: { color: "#0052ff", text: "Join Group", link: inviteUrl },
    },
    outro: "If you weren't expecting this invitation, you can ignore this email.",
  },
});

export {
  sendEmail,
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  groupInviteMailgenContent,
};
