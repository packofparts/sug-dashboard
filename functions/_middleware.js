// Auth middleware - only protects /api/* routes (except /api/auth/*)

async function authMiddleware(context) {
  const url = new URL(context.request.url);

  // Only protect /api/* routes (not /api/auth/*)
  if (!url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/auth/')) {
    return context.next();
  }

  // Check session cookie
  const cookie = context.request.headers.get('Cookie') || '';
  const match = cookie.match(/sug_session=([^;]+)/);

  if (!match) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const sessionData = await context.env.KV.get(`session:${match[1]}`);
  if (!sessionData) {
    return Response.json({ error: 'Session expired' }, { status: 401 });
  }

  return context.next();
}

export const onRequest = [authMiddleware];
