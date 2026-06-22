import nodemailer from "nodemailer";

// Lazy transporter — created on first use so missing env vars don't crash startup
function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   ?? "smtp.gmail.com",
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: false, // STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ─── Welcome email HTML ───────────────────────────────────────────────────────
function buildWelcomeHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Hire Ready</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #060608; font-family: 'Segoe UI', Arial, sans-serif; color: #ffffff; }
    .wrapper { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #0e0e14; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; }
    .top-bar { height: 4px; background: linear-gradient(90deg, #6366f1, #8b5cf6, #d946ef); }
    .body { padding: 40px 36px; }
    .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; margin-bottom: 32px; }
    .logo span { color: rgba(255,255,255,0.22); }
    .hero-emoji { font-size: 48px; margin-bottom: 20px; display: block; }
    h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.8px; line-height: 1.2; margin-bottom: 12px; }
    h1 em { font-style: normal; background: linear-gradient(135deg, #a78bfa, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .subtitle { font-size: 15px; color: rgba(255,255,255,0.55); line-height: 1.6; margin-bottom: 32px; }
    .features { display: table; width: 100%; margin-bottom: 32px; border-collapse: collapse; }
    .feature-row { display: table-row; }
    .feature-cell { display: table-cell; padding: 10px 0; vertical-align: middle; }
    .feature-icon { width: 36px; font-size: 20px; }
    .feature-text { font-size: 14px; color: rgba(255,255,255,0.7); }
    .feature-text strong { color: #ffffff; }
    .cta-btn { display: inline-block; background: #ffffff; color: #000000; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; text-decoration: none; letter-spacing: -0.2px; margin-bottom: 32px; }
    .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 24px 0; }
    .credits-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 16px 20px; margin-bottom: 28px; }
    .credits-box p { font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.6; }
    .credits-box strong { color: #a78bfa; }
    .footer { padding: 24px 36px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; }
    .footer p { font-size: 12px; color: rgba(255,255,255,0.22); line-height: 1.6; }
    .footer a { color: rgba(255,255,255,0.4); text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="top-bar"></div>
      <div class="body">
        <div class="logo">prep<span>/</span>ai</div>

        <span class="hero-emoji">🎉</span>

        <h1>Welcome aboard,<br/><em>${firstName}!</em></h1>
        <p class="subtitle">
          You've just unlocked the smartest way to prepare for your next big interview.
          We're pumped to have you here — let's get you that offer. 🚀
        </p>

        <div class="features">
          <div class="feature-row">
            <div class="feature-cell feature-icon">🤖</div>
            <div class="feature-cell feature-text"><strong>AI-Powered Questions</strong> — tailored to your role &amp; experience</div>
          </div>
          <div class="feature-row">
            <div class="feature-cell feature-icon">🎙️</div>
            <div class="feature-cell feature-text"><strong>Voice Interview Practice</strong> — speak naturally, get instant feedback</div>
          </div>
          <div class="feature-row">
            <div class="feature-cell feature-icon">💻</div>
            <div class="feature-cell feature-text"><strong>Coding Challenges</strong> — real LeetCode problems, matched to your level</div>
          </div>
          <div class="feature-row">
            <div class="feature-cell feature-icon">📊</div>
            <div class="feature-cell feature-text"><strong>Score Analytics</strong> — track clarity, confidence &amp; structure</div>
          </div>
          <div class="feature-row">
            <div class="feature-cell feature-icon">📄</div>
            <div class="feature-cell feature-text"><strong>Resume Analysis</strong> — AI reads your resume and personalises questions</div>
          </div>
        </div>

        <a href="${process.env.NEXTAUTH_URL ?? "https://hire-ready-lac.vercel.app/"}/interview-start" class="cta-btn">
          Start Practising Now →
        </a>

        <div class="credits-box">
          <p>
            🎁 You've received <strong>100 free credits</strong> to get started —
            that's 10 full practice sessions on us. Each session costs just 10 credits.
            Upgrade anytime for more.
          </p>
        </div>

        <div class="divider"></div>

        <p style="font-size:13px;color:rgba(255,255,255,0.4);line-height:1.6;">
          Got questions? Just reply to this email — we read every message. 💌<br/>
          Good luck with your interviews, ${firstName}. You've got this. 💪
        </p>
      </div>
      <div class="footer">
        <p>
          You're receiving this because you created a Hire Ready account.<br/>
          <a href="${process.env.NEXTAUTH_URL ?? "https://hire-ready-lac.vercel.app/"}">prepai.io</a> &nbsp;·&nbsp;
          <a href="mailto:hello@prepai.io">hello@prepai.io</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Send welcome email ───────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, firstName: string): Promise<void> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.warn("[mailer] SMTP_USER or SMTP_PASS not set — skipping welcome email.");
    return;
  }

  const from        = process.env.SMTP_FROM ?? `"Hire Ready" <${smtpUser}>`;
  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: `🎉 Welcome to Hire Ready, ${firstName}! Let's land you that offer.`,
      html: buildWelcomeHtml(firstName),
      text: `Hey ${firstName}! Welcome to Hire Ready 🎉\n\nYou've just unlocked AI-powered interview prep. Start practising at ${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/interview-start\n\nYou have 100 free credits — that's 10 full practice sessions. Good luck! 💪\n\n— The Hire Ready team`,
    });
    console.log("[mailer] Welcome email sent to", to, "— Message ID:", info.messageId);
  } catch (err) {
    // Log the full error so it's visible in the server console
    console.error("[mailer] Failed to send welcome email to", to);
    console.error("[mailer] Error:", err instanceof Error ? err.message : err);
    throw err; // re-throw so the caller can decide whether to surface it
  }
}
