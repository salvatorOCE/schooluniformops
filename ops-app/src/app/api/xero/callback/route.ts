/**
 * GET /api/xero/callback
 * Xero redirects here after the user authorises. Exchanges the code for tokens and shows
 * refresh_token and tenant_id so you can add them to .env.local.
 */

import { NextRequest, NextResponse } from 'next/server';
import { XeroClient } from 'xero-node';

const SCOPES = 'openid profile email accounting.transactions accounting.contacts'.split(' ');
const STATE_COOKIE = 'xero_oauth_state';

export async function GET(request: NextRequest) {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI || 'http://localhost:3000/api/xero/callback';
  const state = request.cookies.get(STATE_COOKIE)?.value;

  if (!clientId || !clientSecret) {
    return htmlResponse(500, 'Missing XERO_CLIENT_ID or XERO_CLIENT_SECRET in .env.local');
  }

  const error = request.nextUrl.searchParams.get('error');
  if (error) {
    const desc = request.nextUrl.searchParams.get('error_description') || error;
    return htmlResponse(400, `Xero authorisation failed: ${desc}`);
  }

  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return htmlResponse(400, 'No authorisation code in callback URL.');
  }

  const client = new XeroClient({
    clientId,
    clientSecret,
    redirectUris: [redirectUri],
    scopes: SCOPES,
    state: state ?? undefined,
  });

  await client.initialize();
  const callbackUrl = request.url;
  let tokenSet: { refresh_token?: string };
  try {
    tokenSet = await client.apiCallback(callbackUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return htmlResponse(500, `Token exchange failed: ${msg}`);
  }

  const tenants = await client.updateTenants();
  const tenantId = tenants?.[0]?.tenantId ?? tenants?.[0]?.tenantID ?? '';

  const refreshToken = tokenSet.refresh_token || (tokenSet as any).refresh_token;
  if (!refreshToken) {
    return htmlResponse(500, 'No refresh_token in response.');
  }

  const tenantNote = !tenantId
    ? '<p><strong>No tenant ID this time</strong> (common with identity-only scopes). Add the refresh token to <code>.env.local</code>, restart the dev server, then open <a href="/api/xero/tenants">/api/xero/tenants</a> to fetch your tenant ID.</p>'
    : '';
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Xero tokens</title></head>
<body style="font-family: system-ui; max-width: 640px; margin: 2rem auto; padding: 1rem;">
  <h1>Xero tokens</h1>
  <p>Add these to <code>ops-app/.env.local</code> (then restart the dev server):</p>
  <pre style="background: #f4f4f4; padding: 1rem; overflow-x: auto; font-size: 0.875rem;">XERO_REFRESH_TOKEN=${escapeHtml(refreshToken)}
XERO_TENANT_ID=${escapeHtml(tenantId)}</pre>
  ${tenantNote}
  <p><strong>Then delete this page from your browser history if needed and clear the cookie.</strong></p>
  <p><a href="/">Back to app</a></p>
</body>
</html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
  res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlResponse(status: number, message: string): NextResponse {
  const body = `<!DOCTYPE html><html><body style="font-family: system-ui; margin: 2rem;"><h1>Error</h1><p>${escapeHtml(message)}</p><a href="/">Back</a></body></html>`;
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
