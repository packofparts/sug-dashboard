// POST /api/auth/verify-otp
// Body: { email, otp }
// Verifies OTP, creates session cookie

const COOKIE_MAX_AGE = 10 * 365 * 24 * 60 * 60; // 10 years (effectively permanent)

export async function onRequestPost(context) {
  const { env } = context;

  try {
    const { email, otp } = await context.request.json();
    if (!email || !otp) {
      return Response.json({ error: 'Email and OTP required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otpKey = `otp:${normalizedEmail}`;
    const storedOtp = await env.KV.get(otpKey);

    if (!storedOtp) {
      return Response.json({ error: 'Code expired. Request a new one.' }, { status: 401 });
    }

    if (storedOtp !== otp.trim()) {
      return Response.json({ error: 'Invalid code' }, { status: 401 });
    }

    // OTP valid - delete it
    await env.KV.delete(otpKey);

    // Create session
    const sessionId = crypto.randomUUID() + '-' + crypto.randomUUID();
    await env.KV.put(`session:${sessionId}`, JSON.stringify({
      email: normalizedEmail,
      createdAt: Date.now(),
    }));

    // Set cookie
    const isLocal = context.request.url.includes('localhost');
    const cookie = [
      `sug_session=${sessionId}`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=${COOKIE_MAX_AGE}`,
      isLocal ? '' : 'Secure',
    ].filter(Boolean).join('; ');

    return new Response(JSON.stringify({ ok: true, email: normalizedEmail }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
