/**
 * Generates and downloads a PDF docket listing selected orders with item details, dates, phone, and address.
 * Branded for School Uniform Solutions with clear layout and margins.
 */

import jsPDF from 'jspdf';
import { OrderHistoryRecord } from '@/lib/types';
import { format } from 'date-fns';

const COMPANY = {
  name: 'School Uniform Solutions',
  tagline: 'Solutions for Success',
  abn: '69 685 416 433',
};
// Brand colours (RGB 0–255) — dark teal and accent green from the app
const BRAND = {
  dark: [0, 45, 43] as [number, number, number],       // #002D2B
  accent: [25, 150, 109] as [number, number, number],   // #19966D
  lightBg: [240, 250, 248] as [number, number, number], // very light teal
  rule: [200, 212, 210] as [number, number, number],    // light grey rule
};

/** Enriched order row for the docket (optional fields from WooCommerce) */
export interface OrderDocketRow extends OrderHistoryRecord {
  phone?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  /** Customer note / additional info from WooCommerce checkout */
  additionalInfo?: string | null;
}

/** Format a date for display */
function formatOrderDate(d: Date | undefined): string {
  if (!d) return '—';
  try {
    return format(new Date(d), 'd MMM yyyy, h:mm a');
  } catch {
    return '—';
  }
}

/** A4 in mm; used as fallback if internal page size is missing */
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
/** Inset from each edge so content never touches the page boundary (avoids cut-through in viewers) */
const SAFE_INSET_MM = 20;
/** Extra gap from right edge so nothing draws near the trim */
const RIGHT_GAP_MM = 15;
/** Max x for any horizontal line (belt-and-suspenders: never draw past this) */
const MAX_LINE_RIGHT_MM = 170;

/** Get page dimensions and safe content area (always in mm to match doc unit; avoids pt/mm mismatch) */
function getPageLayout(_doc: jsPDF) {
  const pageWidth = A4_WIDTH_MM;
  const pageHeight = A4_HEIGHT_MM;
  const contentLeft = SAFE_INSET_MM;
  const contentRight = pageWidth - SAFE_INSET_MM - RIGHT_GAP_MM;
  const contentWidth = Math.max(20, contentRight - contentLeft);
  return { pageWidth, pageHeight, contentLeft, contentRight, contentWidth };
}

/** Draw branded header (text + accent line only; stays inside safe area) */
function drawHeader(doc: jsPDF, orderCount: number, layout: ReturnType<typeof getPageLayout>): number {
  const { contentLeft, contentRight } = layout;
  const lineRight = Math.min(contentRight, MAX_LINE_RIGHT_MM);
  const headerHeight = 22;
  doc.setTextColor(...BRAND.dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(COMPANY.name, contentLeft, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 112, 110);
  doc.text(COMPANY.tagline, contentLeft, 16);

  doc.setFontSize(8);
  doc.text(`Order Docket • ${orderCount} order(s) • Generated ${format(new Date(), 'd MMM yyyy HH:mm')}`, contentRight, 12, { align: 'right' });
  doc.text(`ABN ${COMPANY.abn}`, contentRight, 17, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(...BRAND.accent);
  doc.setLineWidth(0.6);
  doc.line(contentLeft, headerHeight, lineRight, headerHeight);

  return headerHeight + 14;
}

/** Draw a horizontal rule inside safe area (clamped to never reach page edge) */
function drawRule(doc: jsPDF, y: number, layout: ReturnType<typeof getPageLayout>): void {
  const { contentLeft, contentRight } = layout;
  const lineRight = Math.min(contentRight, MAX_LINE_RIGHT_MM);
  doc.setDrawColor(...BRAND.rule);
  doc.setLineWidth(0.2);
  doc.line(contentLeft, y, lineRight, y);
}

/** Download a single PDF docket for the given orders (enriched with phone/address when provided) */
export function downloadOrderDocketPdf(orders: OrderDocketRow[], filename?: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const layout = getPageLayout(doc);
  const { pageHeight, contentLeft, contentWidth } = layout;
  const lineHeight = 5;
  const smallLine = 4.2;
  const sectionGap = 6;
  const orderBlockPadding = 4;
  const labelW = 32;
  const valueX = contentLeft + labelW;
  const valueMaxWidth = contentWidth - labelW;
  const itemIndent = 5;

  let y = drawHeader(doc, orders.length, layout);
  let ordersOnPage = 0;

  orders.forEach((order, idx) => {
    // Start a new page after 3 orders, or if we're too close to the bottom
    if (ordersOnPage >= 3 || y > pageHeight - 35) {
      doc.addPage('a4', 'p');
      y = drawHeader(doc, orders.length, layout);
      ordersOnPage = 0;
    }

    // Draw rule between orders on the same page only
    if (ordersOnPage > 0) {
      drawRule(doc, y, layout);
      y += sectionGap;
    }

    y += orderBlockPadding;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.dark);
    doc.text(`Order ${order.orderId}`, contentLeft, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 90, 90);
    doc.text(order.status, contentLeft + 42, y);
    doc.setTextColor(0, 0, 0);
    y += lineHeight + 2;

    const col1 = contentLeft + 3;

    function line(label: string, value: string, indent = 0): void {
      const x = valueX + indent;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 112, 110);
      doc.text(label, col1 + indent, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(value, valueMaxWidth - indent);
      doc.text(lines, x, y);
      y += smallLine * Math.max(1, lines.length);
    }

    line('Parent', order.parentName);
    line('School', order.schoolName);
    line('Date purchased', formatOrderDate(order.paidAt ?? order.createdAt));

    if (order.billingAddress?.trim()) {
      line('Billing', order.billingAddress.trim());
    }

    if (order.additionalInfo?.trim()) {
      line('Additional Information', order.additionalInfo.trim());
    }

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.dark);
    doc.text('Items', col1, y);
    y += smallLine;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    order.items.forEach((item) => {
      if (y > pageHeight - 30) {
        doc.addPage('a4', 'p');
        y = drawHeader(doc, orders.length, layout);
        ordersOnPage = 0;
      }
      const desc = `${item.qty}× ${item.productName}${item.sku ? ` (${item.sku})` : ''}${item.size ? ` — Size ${item.size}` : ''}`;
      const lines = doc.splitTextToSize(desc, valueMaxWidth - itemIndent);
      doc.text(lines, valueX + itemIndent, y);
      y += smallLine * lines.length;
    });

    y += orderBlockPadding + 4;
    ordersOnPage += 1;
  });

  const safeName = (filename || `order-docket-${format(new Date(), 'yyyy-MM-dd-HHmm')}`).replace(/[^a-z0-9-]/gi, '_');
  doc.save(`${safeName}.pdf`);
}
