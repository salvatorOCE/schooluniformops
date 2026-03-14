/**
 * Server-side Xero API client for creating invoices from bulk orders.
 * Uses OAuth2 refresh token; env: XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REFRESH_TOKEN, XERO_TENANT_ID.
 */

import { XeroClient, Invoice, Contact } from 'xero-node';

const SCOPES = 'openid profile email accounting.transactions accounting.contacts'.split(' ');

let cachedClient: XeroClient | null = null;

function getConfig() {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const refreshToken = process.env.XERO_REFRESH_TOKEN;
  const tenantId = process.env.XERO_TENANT_ID;
  if (!clientId || !clientSecret || !refreshToken || !tenantId) {
    throw new Error(
      'Xero env missing: set XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REFRESH_TOKEN, XERO_TENANT_ID'
    );
  }
  return { clientId, clientSecret, refreshToken, tenantId };
}

async function getClient(): Promise<{ client: XeroClient; tenantId: string }> {
  const { clientId, clientSecret, refreshToken, tenantId } = getConfig();
  if (!cachedClient) {
    cachedClient = new XeroClient({
      clientId,
      clientSecret,
      redirectUris: [process.env.XERO_REDIRECT_URI || 'http://localhost:3000/api/xero/callback'],
      scopes: SCOPES,
    });
  }
  try {
    const tokenSet = await cachedClient.refreshWithRefreshToken(clientId, clientSecret, refreshToken);
    cachedClient.setTokenSet(tokenSet);
  } catch (e) {
    throw new Error(
      `Xero token refresh failed: ${e instanceof Error ? e.message : String(e)}. Check XERO_REFRESH_TOKEN and re-auth if needed.`
    );
  }
  return { client: cachedClient, tenantId };
}

export interface XeroLineItemInput {
  itemCode: string;
  description: string;
  quantity: number;
  unitAmount: number;
}

export interface CreateInvoiceInput {
  contactId: string;
  lineItems: XeroLineItemInput[];
  reference?: string;
  dueDate?: string;
  date?: string;
}

export interface CreateInvoiceResult {
  invoiceID: string;
  invoiceNumber: string;
  status?: string;
}

/**
 * Get a contact by ID. Throws if not found.
 */
export async function getContact(contactId: string): Promise<Contact> {
  const { client, tenantId } = await getClient();
  const res = await client.accountingApi.getContact(tenantId, contactId);
  const contact = res.body?.contacts?.[0];
  if (!contact) throw new Error(`Xero contact not found: ${contactId}`);
  return contact;
}

/**
 * Create a contact by name (and optional contact number). Returns the created contact with contactID.
 */
export async function createContact(name: string, contactNumber?: string): Promise<Contact> {
  const { client, tenantId } = await getClient();
  const contactsBody = {
    contacts: [{ name, contactNumber: contactNumber || undefined }],
  };
  const res = await client.accountingApi.createContacts(tenantId, contactsBody as any, false);
  const contact = res.body?.contacts?.[0];
  if (!contact?.contactID) throw new Error('Xero createContact did not return a contact');
  return contact;
}

/**
 * Create a single sales invoice (ACCREC) in Xero.
 */
export async function createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  const { client, tenantId } = await getClient();
  const date = input.date || new Date().toISOString().slice(0, 10);
  const dueDate = input.dueDate || (() => {
    const d = new Date(date);
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();

  const lineItems = input.lineItems.map((li) => ({
    itemCode: li.itemCode,
    description: li.description,
    quantity: li.quantity,
    unitAmount: li.unitAmount,
  }));

  const invoice = {
    type: Invoice.TypeEnum.ACCREC,
    contact: { contactID: input.contactId },
    date,
    dueDate,
    lineItems,
    reference: input.reference || undefined,
    status: Invoice.StatusEnum.AUTHORISED,
  };

  const body = { invoices: [invoice] };
  const res = await client.accountingApi.createInvoices(
    tenantId,
    body as any,
    true,
    4,
    undefined
  );
  const created = res.body?.invoices?.[0];
  if (!created?.invoiceID) {
    const err = res.body?.invoices?.[0] as any;
    const msg = err?.validationErrors?.map((e: any) => e.message).join('; ') || JSON.stringify(res.body);
    throw new Error(`Xero createInvoices failed: ${msg}`);
  }
  return {
    invoiceID: created.invoiceID,
    invoiceNumber: created.invoiceNumber ?? created.invoiceID,
    status: created.status as string | undefined,
  };
}
