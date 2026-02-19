// POST /api/auth/logout
// Clears session cookie and KV entry

export async function onRequestPost(context) {
  const { env } = context;

  const cookie = context.request.headers.get('Cookie') || '';
  const match = cookie.match(/sug_session=([^;]+)/);

  if (match) {
    await env.KV.delete(`session:${match[1]}`);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'sug_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    },
  });
}
