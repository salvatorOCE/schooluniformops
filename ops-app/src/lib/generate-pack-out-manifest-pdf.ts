/**
 * Generates and downloads a PDF pack-out manifest for a school run.
 * For sending to the school and keeping record of what was packed.
 */

import jsPDF from 'jspdf';
import { PackOutManifest, Order } from '@/lib/types';

const COMPANY = {
  name: 'School Uniform Solutions',
  abn: '69 685 416 433',
  address: '409 Grand Junction Road, Wingfield SA 5013',
};

/** Build manifest from raw orders (e.g. when finishing pack out in Distribution) */
export function buildManifestFromOrders(
  schoolCode: string,
  schoolName: string,
  orders: Order[]
): PackOutManifest {
  const packed_at = new Date().toISOString();
  const ordersSummary = orders.map(o => {
    const summary = o.items
      .map(i => `${i.quantity}x ${(i.product_name || '').slice(0, 24)}${i.size ? ` ${i.size}` : ''}`)
      .join(', ');
    // Build a short, single-line address where available (for HOME deliveries)
    let address_summary: string | null = null;
    if (o.delivery_type === 'HOME' && o.shipping_address) {
      const parts = [
        o.shipping_address.line1,
        o.shipping_address.line2,
        [o.shipping_address.city, o.shipping_address.state].filter(Boolean).join(' '),
        o.shipping_address.postcode,
      ].filter(Boolean);
      address_summary = parts.join(', ');
    }

    return {
      order_id: o.id,
      order_number: o.order_number,
      student_name: o.student_name || null,
      parent_name: o.parent_name || null,
      delivery_type: o.delivery_type,
      address_summary,
      item_count: o.items.reduce((s, i) => s + i.quantity, 0),
      items_summary: summary.length > 80 ? summary.slice(0, 80) + '…' : summary,
    };
  });
  return {
    id: crypto.randomUUID(),
    school_code: schoolCode,
    school_name: schoolName,
    packed_at,
    orders: ordersSummary,
  };
}

export function downloadPackOutManifestPdf(manifest: PackOutManifest, filename?: string): void {
  (async () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const rightMargin = 20;
    const colX = [20, 50, 80, 95];
    let y = 18;

    const lineHeight = 4;

    const drawHeader = async () => {
      // Logo (if available)
      try {
        const res = await fetch('/logo.png');
        if (res.ok) {
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
          // Draw logo on the left
          doc.addImage(dataUrl, 'PNG', 20, 12, 35, 15);
        }
      } catch {
        // Non-blocking: continue without logo
      }

      // Company header to the right of logo
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(COMPANY.name, 60, 18);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`ABN: ${COMPANY.abn}`, 60, 24);
      doc.text(COMPANY.address, 60, 29);

      y = 40;

      // Title + meta
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Pack-out Manifest', 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const packedDate = new Date(manifest.packed_at).toLocaleString('en-AU', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      doc.text(`School: ${manifest.school_name} (${manifest.school_code})`, 20, y);
      y += 6;
      doc.text(`Packed: ${packedDate}`, 20, y);
      doc.text(`Orders: ${manifest.orders.length}`, 120, y);
      y += 10;

      // Table header
      const headers = ['Order #', 'Student', 'Items', 'Contents / Contact'];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y - 3, pageWidth - rightMargin, y - 3);
      doc.setFont('helvetica', 'normal');
    };

    await drawHeader();

    for (const row of manifest.orders) {
      const student = (row.student_name || '—').slice(0, 24);
      const contentsText = row.items_summary;

      // Contact / delivery line
      const contactBits: string[] = [];
      if (row.parent_name) contactBits.push(`Parent: ${row.parent_name}`);
      if (row.delivery_type) contactBits.push(`Delivery: ${row.delivery_type}`);
      if (row.address_summary) contactBits.push(row.address_summary);
      const contactText = contactBits.join(' • ');

      const maxContentsWidth = pageWidth - rightMargin - colX[3];
      const contentsLines = doc.splitTextToSize(contentsText, maxContentsWidth);
      const contactLines = contactText ? doc.splitTextToSize(contactText, pageWidth - rightMargin - colX[1]) : [];

      const rowLines = Math.max(1, contentsLines.length) + (contactLines.length > 0 ? contactLines.length + 1 : 0);
      const neededHeight = rowLines * lineHeight + 2;

      if (y + neededHeight > 270) {
        doc.addPage();
        y = 18;
        await drawHeader();
      }

      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(row.order_number.slice(0, 18), colX[0], y);
      doc.text(student, colX[1], y);
      doc.text(String(row.item_count), colX[2], y);
      doc.text(contentsLines, colX[3], y);

      let currentY = y + Math.max(1, contentsLines.length) * lineHeight;

      if (contactLines.length > 0) {
        currentY += 1;
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        doc.text(contactLines, colX[1], currentY);
        doc.setTextColor(0, 0, 0);
        currentY += contactLines.length * lineHeight;
      }

      y = currentY + 2;
    }

    // Footer note
    if (y + 10 > 285) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('This manifest is a record of orders packed for the above school. Send to school for their records.', 20, y);

    const safeName = (filename || `manifest-${manifest.school_code}-${manifest.packed_at.slice(0, 10)}`).replace(/[^a-z0-9-]/gi, '_');
    doc.save(`${safeName}.pdf`);
  })();
}
