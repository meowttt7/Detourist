import fs from "node:fs";
import path from "node:path";

import nodemailer from "nodemailer";

import { getDetouristAppUrl } from "@/lib/app-url";

import type { Deal, DealAlert, EmailDeliveryMode, EmailDeliveryStatus } from "@/lib/types";

const outboxPath = path.join(process.cwd(), "data", "email-outbox.json");

type AlertEmailInput = {
  alert: DealAlert;
  deal: Deal;
  recipientEmail: string;
};

type DigestEmailInput = {
  recipientEmail: string;
  alerts: Array<{
    alert: DealAlert;
    deal: Deal;
  }>;
};

type SigninEmailInput = {
  recipientEmail: string;
  verifyUrl: string;
};

type EmailSendResult = {
  mode: EmailDeliveryMode;
  status: EmailDeliveryStatus;
  subject: string;
  errorMessage: string | null;
  sentAt: string | null;
};

type OutboxEmail = {
  id: string;
  to: string;
  subject: string;
  html: string;
  createdAt: string;
};

function usingSmtp() {
  return Boolean(process.env.DETOURIST_SMTP_HOST && process.env.DETOURIST_SMTP_PORT && process.env.DETOURIST_EMAIL_FROM);
}

function getBaseUrl() {
  return getDetouristAppUrl();
}

function getFromAddress() {
  return process.env.DETOURIST_EMAIL_FROM ?? "Detourist <alerts@detourist.local>";
}

export function getMailerConfigSummary() {
  return {
    mode: usingSmtp() ? "smtp" : "outbox",
    fromAddress: getFromAddress(),
    smtpHost: process.env.DETOURIST_SMTP_HOST ?? null,
    smtpPort: process.env.DETOURIST_SMTP_PORT ?? null,
    smtpSecure: String(process.env.DETOURIST_SMTP_SECURE ?? "false") === "true",
  };
}

function appendOutboxEmail(email: OutboxEmail) {
  fs.mkdirSync(path.dirname(outboxPath), { recursive: true });
  let current: OutboxEmail[] = [];

  if (fs.existsSync(outboxPath)) {
    try {
      const raw = fs.readFileSync(outboxPath, "utf8");
      const parsed = JSON.parse(raw);
      current = Array.isArray(parsed) ? (parsed as OutboxEmail[]) : [];
    } catch {
      current = [];
    }
  }

  current.unshift(email);
  fs.writeFileSync(outboxPath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
}

async function deliverEmail(to: string, subject: string, html: string, id: string): Promise<EmailSendResult> {
  if (!usingSmtp()) {
    appendOutboxEmail({
      id,
      to,
      subject,
      html,
      createdAt: new Date().toISOString(),
    });

    return {
      mode: "outbox",
      status: "queued",
      subject,
      errorMessage: null,
      sentAt: null,
    };
  }

  try {
    const port = Number(process.env.DETOURIST_SMTP_PORT ?? 587);
    const transporter = nodemailer.createTransport({
      host: process.env.DETOURIST_SMTP_HOST,
      port,
      secure: String(process.env.DETOURIST_SMTP_SECURE ?? "false") === "true",
      auth: process.env.DETOURIST_SMTP_USER
        ? {
            user: process.env.DETOURIST_SMTP_USER,
            pass: process.env.DETOURIST_SMTP_PASSWORD,
          }
        : undefined,
    });

    await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject,
      html,
    });

    return {
      mode: "smtp",
      status: "sent",
      subject,
      errorMessage: null,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      mode: "smtp",
      status: "failed",
      subject,
      errorMessage: error instanceof Error ? error.message : "Unknown SMTP delivery error.",
      sentAt: null,
    };
  }
}

function renderAlertEmail(input: AlertEmailInput) {
  const dealLink = `${getBaseUrl()}/deals/${input.alert.dealSlug}`;
  const title = `${input.deal.origin} to ${input.deal.destination} | ${input.deal.cabin}`;
  const subject = `Detourist alert: ${input.deal.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #1d2a2a; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
      <p style="text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; color: #0b4f4a; font-weight: 700;">Detourist alert</p>
      <h1 style="font-family: Georgia, serif; font-size: 30px; margin-bottom: 10px;">${input.deal.title}</h1>
      <p style="font-size: 16px; color: #5f6b67;">${title}</p>
      <div style="margin: 24px 0; padding: 18px; border-radius: 18px; background: #f6f0e8; border: 1px solid rgba(29,42,42,0.08);">
        <p style="margin: 0 0 8px;"><strong>Worth-It Score:</strong> ${input.alert.score} (${input.alert.matchLabel})</p>
        <p style="margin: 0 0 8px;"><strong>Current price:</strong> ${input.deal.currency} ${input.deal.currentPrice}</p>
        <p style="margin: 0 0 8px;"><strong>Usual price:</strong> ${input.deal.currency} ${input.deal.referencePrice}</p>
        <p style="margin: 0;"><strong>Why it matched:</strong> ${input.alert.reasonSummary}</p>
      </div>
      <p>${input.deal.summary}</p>
      <p><strong>The catch:</strong> ${input.deal.catchSummary}</p>
      <p><strong>Why it is worth it:</strong> ${input.deal.whyWorthIt}</p>
      <p style="margin-top: 28px;">
        <a href="${dealLink}" style="display: inline-block; padding: 14px 22px; border-radius: 999px; background: #0f766e; color: #ffffff; text-decoration: none; font-weight: 700;">Open in Detourist</a>
      </p>
      <p style="font-size: 13px; color: #5f6b67; margin-top: 18px;">This alert matched your detour profile. Review the tradeoffs before booking.</p>
    </div>
  `;

  return { subject, html };
}

function renderDigestEmail(input: DigestEmailInput) {
  const subject = `Detourist daily digest: ${input.alerts.length} premium ${input.alerts.length === 1 ? "match" : "matches"}`;
  const digestRows = input.alerts
    .map(({ alert, deal }) => {
      const dealLink = `${getBaseUrl()}/deals/${alert.dealSlug}`;
      return `
        <div style="margin-bottom: 18px; padding: 18px; border-radius: 18px; background: #f6f0e8; border: 1px solid rgba(29,42,42,0.08);">
          <p style="margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.06em; font-size: 11px; color: #0b4f4a; font-weight: 700;">Worth-It Score ${alert.score}</p>
          <h2 style="font-family: Georgia, serif; font-size: 22px; margin: 0 0 8px;">${deal.title}</h2>
          <p style="margin: 0 0 8px; color: #5f6b67;">${deal.origin} to ${deal.destination} | ${deal.cabin}</p>
          <p style="margin: 0 0 8px;"><strong>${deal.currency} ${deal.currentPrice}</strong> now, usually ${deal.currency} ${deal.referencePrice}</p>
          <p style="margin: 0 0 8px;"><strong>Why it matched:</strong> ${alert.reasonSummary}</p>
          <p style="margin: 0 0 12px;"><strong>The catch:</strong> ${deal.catchSummary}</p>
          <a href="${dealLink}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #0f766e; color: #ffffff; text-decoration: none; font-weight: 700;">Review this deal</a>
        </div>
      `;
    })
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1d2a2a; line-height: 1.6; max-width: 720px; margin: 0 auto; padding: 24px;">
      <p style="text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; color: #0b4f4a; font-weight: 700;">Detourist daily digest</p>
      <h1 style="font-family: Georgia, serif; font-size: 32px; margin-bottom: 10px;">${input.alerts.length} premium ${input.alerts.length === 1 ? "match" : "matches"} worth checking today</h1>
      <p style="color: #5f6b67; font-size: 16px;">These alerts fit your detour tolerance and were held for your daily digest instead of being sent one by one.</p>
      <p style="margin-bottom: 24px;">
        <a href="${getBaseUrl()}/account" style="display: inline-block; padding: 14px 22px; border-radius: 999px; background: #1d2a2a; color: #ffffff; text-decoration: none; font-weight: 700;">Open your account</a>
      </p>
      ${digestRows}
      <p style="font-size: 13px; color: #5f6b67; margin-top: 18px;">You are receiving a digest because your alert preference is set to daily digest.</p>
    </div>
  `;

  return { subject, html };
}

function renderSigninEmail(input: SigninEmailInput) {
  const subject = "Your Detourist sign-in link";
  const html = `
    <div style="font-family: Arial, sans-serif; color: #1d2a2a; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
      <p style="text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; color: #0b4f4a; font-weight: 700;">Detourist sign-in</p>
      <h1 style="font-family: Georgia, serif; font-size: 30px; margin-bottom: 10px;">Sign in to Detourist</h1>
      <p style="color: #5f6b67;">Use this secure link to open your account, alerts, and detour profile on this device.</p>
      <p style="margin-top: 28px;">
        <a href="${input.verifyUrl}" style="display: inline-block; padding: 14px 22px; border-radius: 999px; background: #0f766e; color: #ffffff; text-decoration: none; font-weight: 700;">Sign in</a>
      </p>
      <p style="font-size: 13px; color: #5f6b67; margin-top: 18px;">This link expires in about 20 minutes and can only be used once.</p>
      <p style="font-size: 13px; color: #5f6b67;">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  return { subject, html };
}

export async function sendAlertEmail(input: AlertEmailInput): Promise<EmailSendResult> {
  const { subject, html } = renderAlertEmail(input);
  return deliverEmail(input.recipientEmail, subject, html, input.alert.id);
}

export async function sendDigestEmail(input: DigestEmailInput, digestId: string): Promise<EmailSendResult> {
  const { subject, html } = renderDigestEmail(input);
  return deliverEmail(input.recipientEmail, subject, html, digestId);
}

export async function sendSigninEmail(input: SigninEmailInput): Promise<EmailSendResult> {
  const { subject, html } = renderSigninEmail(input);
  return deliverEmail(input.recipientEmail, subject, html, `signin:${input.recipientEmail}:${Date.now()}`);
}

