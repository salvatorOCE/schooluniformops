/**
 * GET /api/xero/connect
 * Redirects to Xero's OAuth consent page. After the user authorises, Xero redirects to /api/xero/callback.
 * Use this to get a refresh token and tenant ID when the OAuth2 Playground is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { XeroClient } from 'xero-node';

// Identity-only (Xero returns "Invalid scope for client" for accounting.* on this app; use identity-only to get refresh token; tenant ID requires accounting access from Xero).
const SCOPES = 'openid profile email offline_access'.split(' ');
const STATE_COOKIE = 'xero_oauth_state';
const STATE_MAX_AGE = 600; // 10 minutes

export async function GET() {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI || 'http://localhost:3000/api/xero/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Set XERO_CLIENT_ID and XERO_CLIENT_SECRET in .env.local' },
      { status: 500 }
    );
  }

  try {
    const state = crypto.randomUUID();
    const client = new XeroClient({
      clientId,
      clientSecret,
      redirectUris: [redirectUri],
      scopes: SCOPES,
      state,
    });

    await client.initialize();
    const consentUrl = await client.buildConsentUrl();

    const res = NextResponse.redirect(consentUrl);
    res.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_MAX_AGE,
      path: '/',
    });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error('Xero connect error:', e);
    return NextResponse.json(
      {
        error: 'Xero connect failed',
        message,
        ...(process.env.NODE_ENV === 'development' && stack ? { stack } : {}),
      },
      { status: 500 }
    );
  }
}
