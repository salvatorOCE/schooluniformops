/**
 * GET /api/xero/tenants
 * Uses your stored refresh token to fetch Xero connections (tenants). Call this after
 * adding XERO_REFRESH_TOKEN to .env.local if the callback didn't return a tenant ID
 * (e.g. when using identity-only scopes). Copy the tenantId into .env.local as XERO_TENANT_ID.
 */

import { NextResponse } from 'next/server';
import { XeroClient } from 'xero-node';

const SCOPES = 'openid profile email offline_access'.split(' ');

export async function GET() {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const refreshToken = process.env.XERO_REFRESH_TOKEN;
  const redirectUri = process.env.XERO_REDIRECT_URI || 'http://localhost:3000/api/xero/callback';

  if (!clientId || !clientSecret || !refreshToken) {
    const missing = [
      !clientId && 'XERO_CLIENT_ID',
      !clientSecret && 'XERO_CLIENT_SECRET',
      !refreshToken && 'XERO_REFRESH_TOKEN',
    ].filter(Boolean);
    return NextResponse.json(
      {
        error: 'Missing Xero env vars',
        missing,
        hint: 'Set them in ops-app/.env.local and restart the dev server (Next.js only loads .env.local at startup).',
      },
      { status: 400 }
    );
  }

  try {
    const client = new XeroClient({
      clientId,
      clientSecret,
      redirectUris: [redirectUri],
      scopes: SCOPES,
    });
    await client.initialize();
    const tokenSet = await client.refreshWithRefreshToken(clientId, clientSecret, refreshToken);
    client.setTokenSet(tokenSet);

    const tenants = await client.updateTenants();
    const list = (tenants || []).map((t: { tenantId?: string; tenantID?: string; tenantName?: string; id?: string; orgData?: { Name?: string } }) => ({
      tenantId: t.tenantId ?? t.tenantID ?? t.id,
      tenantName: t.tenantName ?? t.orgData?.Name,
    }));

    if (list.length === 0) {
      return NextResponse.json({
        message: 'No Xero connections (tenants) found. This often happens when you authorised with identity-only scopes. Re-run the connect flow with accounting scopes once your app has access, or link an organisation in Xero.',
        tenants: [],
      });
    }

    return NextResponse.json({
      message: `Found ${list.length} connection(s). Add the tenantId below to .env.local as XERO_TENANT_ID.`,
      tenants: list,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Xero tenants error:', e);
    return NextResponse.json(
      { error: 'Failed to fetch tenants', message },
      { status: 500 }
    );
  }
}
