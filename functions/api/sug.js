// CORS proxy for SignUpGenius internal API
// GET /api/sug?urlid=xxx -> POST to SUG API -> return JSON

const SUG_API = 'https://www.signupgenius.com/SUGboxAPI.cfm?go=s.getSignupInfo';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const urlid = url.searchParams.get('urlid');

  if (!urlid) {
    return Response.json({ error: 'urlid parameter required' }, {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  try {
    const resp = await fetch(SUG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forSignUpView: true, urlid }),
    });

    const data = await resp.json();

    return Response.json(data, {
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'public, max-age=300', // 5 min browser cache
      },
    });
  } catch (err) {
    return Response.json({ error: 'Failed to fetch from SignUpGenius', detail: err.message }, {
      status: 502,
      headers: CORS_HEADERS,
    });
  }
}
