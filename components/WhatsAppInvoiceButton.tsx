'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Invoice } from '@/lib/types';
import { getStoredProfile } from '@/lib/supabase';

interface WhatsAppInvoiceButtonProps {
  invoice: Invoice;
}

export default function WhatsAppInvoiceButton({ invoice }: WhatsAppInvoiceButtonProps) {
  const handleSendWhatsAppInvoice = () => {
    let cleanPhone = invoice.phone_number.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '94' + cleanPhone.substring(1);
    }

    const profile = getStoredProfile();
    const shopName = profile.shop_name || 'FixMaster Repair & Service Center';

    // Format itemized parts breakdown if available
    let itemsText = '';
    if (invoice.job_card?.parts && invoice.job_card.parts.length > 0) {
      itemsText = invoice.job_card.parts
        ? invoice.job_card.parts.map((p) => `• ${p.part_name} (x${p.quantity}): LKR ${p.total_price.toLocaleString()}`).join('\n')
        : '';
    }

    let laborText = '';
    if (invoice.job_card?.labor_charge) {
      laborText = `• Service & Labor Charge: LKR ${invoice.job_card.labor_charge.toLocaleString()}`;
    }

    const subtotalText = `Subtotal: LKR ${invoice.subtotal.toLocaleString()}`;
    const discountText = invoice.discount > 0 ? `\nDiscount: - LKR ${invoice.discount.toLocaleString()}` : '';
    const netPayableText = `*NET PAID: LKR ${invoice.net_payable.toLocaleString()}*`;
    const paymentMethodText = `Payment Mode: *${invoice.payment_method}*`;

    const message = encodeURIComponent(
      `🧾 *${shopName}*\n` +
      `*SALES INVOICE & RECEIPT*\n` +
      `--------------------------------\n` +
      `📄 Invoice No: *${invoice.invoice_no}*\n` +
      `👤 Customer: *${invoice.customer_name}*\n` +
      `📅 Date: ${new Date(invoice.created_at).toLocaleDateString()}\n\n` +
      `📋 *BILL DETAILS:*\n` +
      (itemsText ? `${itemsText}\n` : '') +
      (laborText ? `${laborText}\n` : '') +
      `\n${subtotalText}` +
      `${discountText}\n` +
      `${netPayableText}\n` +
      `💳 ${paymentMethodText}\n\n` +
      `Thank you for doing business with us! 🙏`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <button
      onClick={handleSendWhatsAppInvoice}
      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 hover:bg-emerald-900 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
      title="Send Invoice Receipt via WhatsApp"
    >
      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
      <span>WhatsApp</span>
    </button>
  );
}
