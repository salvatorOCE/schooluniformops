/**
 * Generates and downloads a PDF invoice for a bulk order.
 * Company details: School Uniform Solutions
 */

import jsPDF from 'jspdf';

const COMPANY = {
  name: 'School Uniform Solutions',
  abn: '69 685 416 433',
  address: '409 Grand Junction Road, Wingfield SA 5013',
  bsb: '015228',
  account: '177580573',
};

export interface BulkInvoiceItem {
  productName: string;
  sku: string;
  size: string;
  quantity: number;
  price: number;
}

export interface BulkInvoiceDetails {
  orderNumber: string;
  dateOrdered: string;
  schoolName: string;
  customerName: string;
  department?: string;
  items: BulkInvoiceItem[];
}

function getItemTotal(item: BulkInvoiceItem): number {
  return (Number.isFinite(item.quantity) ? item.quantity : 0) * (Number.isFinite(item.price) ? item.price : 0);
}

export function downloadBulkOrderInvoice(details: BulkInvoiceDetails, filename?: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Company header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY.name, 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`ABN: ${COMPANY.abn}`, 20, y);
  y += 6;
  doc.text(COMPANY.address, 20, y);
  y += 6;
  doc.text(`BSB: ${COMPANY.bsb}  |  Account: ${COMPANY.account}`, 20, y);
  y += 14;

  // Invoice title & order info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 20, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Order #: ${details.orderNumber}`, 20, y);
  doc.text(`Date: ${details.dateOrdered}`, 100, y);
  y += 7;
  doc.text(`Bill to: ${details.schoolName}`, 20, y);
  y += 6;
  doc.text(`${details.customerName}${details.department ? `, ${details.department}` : ''}`, 20, y);
  y += 12;

  // Table header
  const colW = [70, 25, 20, 25, 30];
  const colX = [20, 90, 115, 135, 160];
  const headers = ['Item', 'Size', 'Qty', 'Unit $', 'Total $'];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  headers.forEach((h, i) => doc.text(h, colX[i], y));
  y += 7;

  doc.setDrawColor(200, 200, 200);
  doc.line(20, y - 4, pageWidth - 20, y - 4);
  doc.setFont('helvetica', 'normal');

  let total = 0;
  for (const item of details.items) {
    const lineTotal = getItemTotal(item);
    total += lineTotal;
    const name = (item.productName || '').slice(0, 32);
    doc.text(name, colX[0], y);
    doc.text(String(item.size || '-'), colX[1], y);
    doc.text(String(item.quantity), colX[2], y);
    doc.text((item.price ?? 0).toFixed(2), colX[3], y);
    doc.text(lineTotal.toFixed(2), colX[4], y);
    y += 6;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  y += 4;
  doc.line(20, y, pageWidth - 20, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', colX[3], y);
  doc.text(`$${total.toFixed(2)}`, colX[4], y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Payment details:', 20, y);
  y += 5;
  doc.text(`BSB: ${COMPANY.bsb}  Account: ${COMPANY.account}`, 20, y);
  y += 5;
  doc.text('Please use the order number as the reference.', 20, y);

  const safeName = (filename || details.orderNumber || 'invoice').replace(/[^a-z0-9-]/gi, '_');
  doc.save(`${safeName}.pdf`);
}
