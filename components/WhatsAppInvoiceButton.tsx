'use client';

import React from 'react';
import { MessageSquare, Share2 } from 'lucide-react';
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

    const rawText =
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
      `Thank you for doing business with us! 🙏`;

    const encodedMessage = encodeURIComponent(rawText);

    const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      // Direct deep-link to native WhatsApp Mobile App (No intermediate web browser page)
      window.location.href = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
    } else {
      // Desktop Web WhatsApp link
      window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`, '_blank');
    }
  };

  const handleNativeSystemShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const profile = getStoredProfile();
    const shopName = profile.shop_name || 'FixMaster Repair & Service Center';

    const rawText =
      `🧾 ${shopName} - Invoice ${invoice.invoice_no}\n` +
      `Customer: ${invoice.customer_name}\n` +
      `Net Paid: LKR ${invoice.net_payable.toLocaleString()} (${invoice.payment_method})`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoice_no}`,
          text: rawText,
        });
      } catch (err) {
        handleSendWhatsAppInvoice();
      }
    } else {
      handleSendWhatsAppInvoice();
    }
  };

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={handleSendWhatsAppInvoice}
        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 hover:bg-emerald-900 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
        title="Open native WhatsApp app directly"
      >
        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
        <span>WhatsApp</span>
      </button>

      {/* Optional Mobile Native Share Sheet Button */}
      {typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={handleNativeSystemShare}
          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
          title="Share via native phone apps (WhatsApp, SMS, etc.)"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
