import { jsPDF } from 'jspdf';

export interface AgreementPdfData {
  id: number;
  property_title: string;
  property_address: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone?: string;
  landlord_name: string;
  landlord_email: string;
  landlord_phone?: string;
  monthly_rent: number;
  advance_amount: number;
  duration_months: number;
  notice_period_days: number;
  utility_terms: string;
  house_rules: string;
  start_date: string;
  end_date: string;
  tenant_accepted: number | boolean;
  tenant_accepted_at?: string | null;
  status: string;
}

export function downloadAgreementPdf(ag: AgreementPdfData): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 52;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RentShare BD — Digital Rental Consent Agreement', 48, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 98, 112);
  doc.text(`Agreement Reference #${ag.id} | Status: ${ag.status.toUpperCase()}`, 48, y);
  y += 24;

  doc.setDrawColor(210, 215, 224);
  doc.line(48, y, 547, y);
  y += 22;

  doc.setTextColor(15, 23, 42);
  const addField = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(label, 48, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value, 340);
    doc.text(lines, 195, y);
    y += Math.max(18, lines.length * 14 + 4);
  };

  addField('Property:', `${ag.property_title}`);
  addField('Property Address:', ag.property_address);
  addField('Landlord:', `${ag.landlord_name} (${ag.landlord_email})`);
  addField('Tenant:', `${ag.tenant_name} (${ag.tenant_email})`);
  addField('Monthly Rent:', `BDT ${Number(ag.monthly_rent).toLocaleString()}`);
  addField('Advance Deposit:', `BDT ${Number(ag.advance_amount).toLocaleString()}`);
  addField('Duration:', `${ag.duration_months} months (${ag.start_date} to ${ag.end_date})`);
  addField('Notice Period:', `${ag.notice_period_days} days prior notice`);
  y += 8;

  addField('Utility Terms:', ag.utility_terms);
  addField('House Rules:', ag.house_rules);
  y += 14;

  doc.setDrawColor(210, 215, 224);
  doc.line(48, y, 547, y);
  y += 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Consent Record:', 48, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Landlord Consent: Recorded | Tenant Consent: ${
      ag.tenant_accepted ? `Accepted (${ag.tenant_accepted_at || 'Recorded'})` : 'Pending'
    }`,
    48,
    y
  );
  y += 22;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const disclaimer = doc.splitTextToSize(
    'Note: This document serves as a digital record of mutual consent on RentShare BD. It does not constitute a government-notarized electronic signature.',
    495
  );
  doc.text(disclaimer, 48, y);

  doc.save(`RentShareBD_Agreement_${ag.id}.pdf`);
}
