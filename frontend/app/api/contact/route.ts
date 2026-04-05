import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    // Configure transporter — uses env vars, falls back to Ethereal for dev
    let transporter;

    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Dev: log to console, skip actual send
      console.log("📧 Contact form submission (no SMTP configured):");
      console.log(`  From: ${name} <${email}>`);
      console.log(`  Message: ${message}`);
      return NextResponse.json({ success: true, dev: true });
    }

    await transporter.sendMail({
      from: `"NeuroRestore AI" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
      replyTo: email,
      subject: `Contact from ${name} — NeuroRestore AI`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0B1F2E;color:#e8f4f0;padding:32px;border-radius:12px;border:1px solid rgba(15,255,197,0.2)">
          <h2 style="color:#6B9EFF;margin-bottom:16px">New Contact Message</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <hr style="border-color:rgba(15,255,197,0.15);margin:16px 0"/>
          <p style="white-space:pre-wrap">${message}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Contact form error:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
