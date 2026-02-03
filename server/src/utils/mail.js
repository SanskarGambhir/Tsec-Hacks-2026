import Mailgen from "mailgen";
import nodemailer from "nodemailer";

// This function is used to send emails using the "nodemailer" and "mailgen" libraries
const sendEmail = async (options) => {
  // This "mailGenerator" object is used to generate email content in HTML and plaintext format
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task Manager App",
      link: "https://taskmanagerapp.com"
    }
  })

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

  const emailHTML = mailGenerator.generate(options.mailgenContent);

  // Create a transporter (It is like a service which will send emails on our behalf)
  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASSWORD
    }
  });

  const mail = {
    from: "mail.taskmanager@example.com",
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHTML
  };

  try{
    await transporter.sendMail(mail);
  } catch(error){
    console.error("Error sending email. Make sure that you have provided your MAILTRAP credentials in the .env file.");
    console.error(error);
  }
}

// This is just a format for generating email content using Mailgen library.
const emailVerificationMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our App! We're very excited to have you on board.",
      action: {
        instructions: "To verify your email, please click on the button below:",
        button: {
          color: "#22BC66",
          text: "Verify Email",
          link: verificationUrl
        }
      },
      outro: "If you did not create an account, no further action is required."
    }
  }
}

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "You have requested to reset your password.",
      action: {
        instructions: "To reset your password, please click on the button below:",  
        button: {
          color: "#DC4D2F",
          text: "Reset Password",
          link: passwordResetUrl
        }
      },
      outro: "If you did not request a password reset, no further action is required."
    }
  }
}

export { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail };