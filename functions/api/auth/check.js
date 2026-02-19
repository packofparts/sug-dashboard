// GET /api/auth/check
// Returns current auth status

export async function onRequestGet(context) {
  const { env } = context;

  const cookie = context.request.headers.get('Cookie') || '';
  const match = cookie.match(/sug_session=([^;]+)/);

  if (!match) {
    return Response.json({ authenticated: false });
  }

  const sessionData = await env.KV.get(`session:${match[1]}`);
  if (!sessionData) {
    return Response.json({ authenticated: false });
  }

  const session = JSON.parse(sessionData);
  return Response.json({ authenticated: true, email: session.email });
}
