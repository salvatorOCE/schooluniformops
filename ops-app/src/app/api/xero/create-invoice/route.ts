/**
 * POST /api/xero/create-invoice
 * Creates a Xero sales invoice for a bulk order. Links products via xero_item_code (or sku) and school as contact.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getContact, createContact, createInvoice } from '@/lib/xero-client';

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  let body: { orderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const orderId = body.orderId;
  if (!orderId || typeof orderId !== 'string') {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const { data: orderRow, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, school_id, customer_name, meta')
    .eq('id', orderId)
    .single();

  if (orderError || !orderRow) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const orderNumber = (orderRow as { order_number?: string }).order_number || '';
  if (!orderNumber.startsWith('BULK-')) {
    return NextResponse.json({ error: 'Only bulk orders can be sent to Xero' }, { status: 400 });
  }

  const meta = (orderRow as { meta?: Record<string, unknown> }).meta;
  if (meta && typeof meta === 'object' && meta.xero_invoice_id) {
    return NextResponse.json(
      {
        error: 'Invoice already created in Xero',
        xeroInvoiceId: meta.xero_invoice_id,
        xeroInvoiceNumber: meta.xero_invoice_number,
      },
      { status: 409 }
    );
  }

  const { data: orderItems, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('id, product_id, sku, name, quantity, unit_price')
    .eq('order_id', orderId);

  if (itemsError || !orderItems?.length) {
    return NextResponse.json({ error: 'Order has no line items' }, { status: 400 });
  }

  const schoolId = (orderRow as { school_id?: string }).school_id;
  if (!schoolId) {
    return NextResponse.json({ error: 'Order has no school' }, { status: 400 });
  }

  const { data: schoolRow, error: schoolError } = await supabaseAdmin
    .from('schools')
    .select('id, name, code, xero_contact_id')
    .eq('id', schoolId)
    .single();

  if (schoolError || !schoolRow) {
    return NextResponse.json({ error: 'School not found' }, { status: 400 });
  }

  const school = schoolRow as { name: string; code?: string; xero_contact_id?: string | null };
  const productIds = [...new Set((orderItems as { product_id?: string }[]).map((i) => i.product_id).filter(Boolean))] as string[];
  const skus = [...new Set((orderItems as { sku: string }[]).map((i) => i.sku))];

  let skuToXeroCode: Map<string, string> = new Map();
  if (productIds.length > 0) {
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, sku, xero_item_code')
      .in('id', productIds);
    (products || []).forEach((p: { sku?: string | null; xero_item_code?: string | null }) => {
      const sku = p.sku ?? '';
      if (sku) skuToXeroCode.set(sku, (p.xero_item_code ?? p.sku ?? sku) as string);
    });
  }
  if (skus.some((s) => !skuToXeroCode.has(s))) {
    const { data: productsBySku } = await supabaseAdmin
      .from('products')
      .select('sku, xero_item_code')
      .in('sku', skus);
    (productsBySku || []).forEach((p: { sku?: string | null; xero_item_code?: string | null }) => {
      const sku = p.sku ?? '';
      if (sku && !skuToXeroCode.has(sku)) skuToXeroCode.set(sku, (p.xero_item_code ?? p.sku ?? sku) as string);
    });
  }

  let contactId: string;
  if (school.xero_contact_id) {
    try {
      await getContact(school.xero_contact_id);
      contactId = school.xero_contact_id;
    } catch {
      contactId = (await createContact(school.name, school.code)).contactID!;
      await supabaseAdmin.from('schools').update({ xero_contact_id: contactId }).eq('id', schoolId);
    }
  } else {
    const contact = await createContact(school.name, school.code);
    contactId = contact.contactID!;
    await supabaseAdmin.from('schools').update({ xero_contact_id: contactId }).eq('id', schoolId);
  }

  let lineItems: { itemCode: string; description: string; quantity: number; unitAmount: number }[];
  try {
    lineItems = (orderItems as { sku: string; name: string; quantity: number; unit_price?: number }[]).map((item) => {
      const itemCode = skuToXeroCode.get(item.sku) ?? item.sku;
      const unitAmount = Number(item.unit_price);
      const quantity = Number(item.quantity);
      if (!itemCode || quantity <= 0) {
        throw new Error(`Invalid line: SKU ${item.sku} has no Xero item code or invalid quantity`);
      }
      return {
        itemCode,
        description: `${item.name || item.sku}`.slice(0, 500),
        quantity,
        unitAmount: Number.isFinite(unitAmount) ? unitAmount : 0,
      };
    });
  } catch (lineErr: unknown) {
    const msg = lineErr instanceof Error ? lineErr.message : String(lineErr);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let result: { invoiceID: string; invoiceNumber: string };
  try {
    result = await createInvoice({
      contactId,
      lineItems,
      reference: orderNumber,
      date: new Date().toISOString().slice(0, 10),
    });
  } catch (createErr: unknown) {
    const msg = createErr instanceof Error ? createErr.message : String(createErr);
    return NextResponse.json(
      { error: 'Xero invoice creation failed', detail: msg },
      { status: 502 }
    );
  }

  const existingMeta = (meta && typeof meta === 'object' ? meta : {}) as Record<string, unknown>;
  const newMeta = {
    ...existingMeta,
    xero_invoice_id: result.invoiceID,
    xero_invoice_number: result.invoiceNumber,
  };
  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ meta: newMeta })
    .eq('id', orderId);

  if (updateError) {
    return NextResponse.json(
      { error: 'Invoice created in Xero but failed to save reference', xeroInvoiceId: result.invoiceID, xeroInvoiceNumber: result.invoiceNumber },
      { status: 500 }
    );
  }

  const url = `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${result.invoiceID}`;
  return NextResponse.json({
    success: true,
    xeroInvoiceId: result.invoiceID,
    xeroInvoiceNumber: result.invoiceNumber,
    url,
  });
}
