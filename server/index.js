import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: "20kb" }));

const sanitizeText = (value, maxLength) =>
  String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post("/api/contact", async (req, res) => {
  const name = sanitizeText(req.body?.name, 120);
  const email = sanitizeText(req.body?.email, 254).toLowerCase();
  const subject = sanitizeText(req.body?.subject, 180);
  const message = sanitizeText(req.body?.message, 5000);

  if (!name || !email || !subject || !message) {
    console.error("CONTACT_VALIDATION_FAIL", { name: !!name, email: !!email, subject: !!subject, message: !!message });
    return res.status(400).json({
      success: false,
      message: "Failed to send message",
    });
  }

  if (!emailRegex.test(email) || message.length < 10) {
    console.error("CONTACT_VALIDATION_FAIL", { emailValid: emailRegex.test(email), messageLength: message.length });
    return res.status(400).json({
      success: false,
      message: "Failed to send message",
    });
  }

  const supportEmail = process.env.SUPPORT_EMAIL;
  const supportEmailPassword = process.env.SUPPORT_EMAIL_PASSWORD;

  if (!supportEmail || !supportEmailPassword) {
    console.error("CONTACT_CONFIG_FAIL", { hasSupportEmail: !!supportEmail, hasSupportEmailPassword: !!supportEmailPassword });
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: supportEmail,
        pass: supportEmailPassword,
      },
    });

    await transporter.sendMail({
      from: supportEmail,
      to: supportEmail,
      replyTo: email,
      subject: "New Contact Form Complaint",
      text: `New Complaint Received

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}`,
    });

    return res.status(200).json({
      success: true,
      message: "Complaint sent successfully",
    });
  } catch (error) {
    console.error("CONTACT_SEND_FAIL", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
});

app.listen(port, () => {
  console.log(`Contact API listening on port ${port}`);
});
