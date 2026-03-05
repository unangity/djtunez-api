import { FastifyReply, FastifyRequest } from "fastify";
import nodemailer from "nodemailer";
import { httpStatusMap } from "../utils/http-status-map";

export type ContactBody = { name: string; email: string; message: string };

/**
 * POST /contact
 *
 * Accepts a contact form submission and sends an email to the configured
 * recipient. SMTP credentials are read from environment variables:
 *
 *   SMTP_HOST      - SMTP server hostname (e.g. smtp.gmail.com)
 *   SMTP_PORT      - SMTP server port    (e.g. 587)
 *   SMTP_USER      - Sender email address
 *   SMTP_PASSWORD  - Sender account password (from Secret Manager in prod)
 *   CONTACT_RECIPIENT - Email address that receives the contact form submissions
 */
export const send_contact_email = async (
  request: FastifyRequest<{ Body: ContactBody }>,
  reply: FastifyReply
) => {
  const { name, email, message } = request.body;

  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpUser = process.env.SMTP_USER;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const recipient = process.env.CONTACT_RECIPIENT;

  if (!smtpPassword || !smtpUser || !smtpHost || !recipient) {
    request.log.error("Missing SMTP configuration environment variables");
    return reply
      .code(httpStatusMap.internalServerError)
      .send({ error: "Email service is not configured" });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Reqrave Contact" <${smtpUser}>`,
      to: recipient,
      replyTo: email,
      subject: `Contact form: ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, "<br>")}</p>`,
    });

    return reply.code(httpStatusMap.ok).send({ success: true });
  } catch (err: any) {
    request.log.error({ err }, "Failed to send contact email");
    return reply
      .code(httpStatusMap.internalServerError)
      .send({ error: "Failed to send email" });
  }
};
