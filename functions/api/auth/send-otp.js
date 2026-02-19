// POST /api/auth/send-otp
// Body: { email }
// Generates 6-digit OTP, stores in KV (5min TTL), sends via Resend

const ALLOWED_DOMAINS = ['packofparts.org'];
const OTP_TTL = 300; // 5 minutes
const RATE_LIMIT_TTL = 300;
const MAX_ATTEMPTS = 5;

export async function onRequestPost(context) {
  const { env } = context;

  try {
    const { email } = await context.request.json();
    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const domain = normalizedEmail.split('@')[1];

    // Check allowed domains + allowlist from KV
    // KV key "allowed_emails" stores JSON array: ["parent@gmail.com", "mentor@outlook.com"]
    const domainAllowed = ALLOWED_DOMAINS.includes(domain);
    let emailAllowed = false;
    if (!domainAllowed) {
      const raw = await env.KV.get('allowed_emails');
      const allowlist = raw ? JSON.parse(raw) : [];
      emailAllowed = allowlist.map(e => e.toLowerCase()).includes(normalizedEmail);
    }
    if (!domainAllowed && !emailAllowed) {
      return Response.json({ error: 'Email not authorized. Use your @packofparts.org email.' }, { status: 403 });
    }

    // Rate limit: max attempts per email
    const rateKey = `rate:${normalizedEmail}`;
    const rateCount = parseInt(await env.KV.get(rateKey) || '0');
    if (rateCount >= MAX_ATTEMPTS) {
      return Response.json({ error: 'Too many attempts. Try again in 5 minutes.' }, { status: 429 });
    }
    await env.KV.put(rateKey, String(rateCount + 1), { expirationTtl: RATE_LIMIT_TTL });

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Store in KV
    await env.KV.put(`otp:${normalizedEmail}`, otp, { expirationTtl: OTP_TTL });

    // Send via Resend
    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Pack of Parts Dashboard <onboarding@resend.dev>',
        to: [normalizedEmail],
        subject: `Your login code: ${otp}`,
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
            <h2 style="color:#1e3a5f;">Pack of Parts Dashboard</h2>
            <p>Your login code is:</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1e3a5f;padding:16px;background:#f1f5f9;border-radius:8px;text-align:center;">${otp}</div>
            <p style="color:#64748b;font-size:14px;margin-top:16px;">This code expires in 5 minutes.</p>
          </div>
        `,
      }),
    });

    if (!resendResp.ok) {
      const err = await resendResp.text();
      console.error('Resend error:', err);
      return Response.json({ error: 'Failed to send email. Please try again.' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('send-otp error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
