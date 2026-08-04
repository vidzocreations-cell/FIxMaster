'use client';

import React from 'react';
import { Share2 } from 'lucide-react';
import { Invoice } from '@/lib/types';
import { getStoredProfile, getStoredJobs } from '@/lib/supabase';

interface WhatsAppInvoiceButtonProps {
  invoice: Invoice;
}

export default function WhatsAppInvoiceButton({ invoice }: WhatsAppInvoiceButtonProps) {
  const handleInstantShare = () => {
    try {
      const profile = getStoredProfile();
      const shopName = profile.shop_name || 'FixMaster Repair Center';
      const targetJob = invoice.job_card || getStoredJobs().find((j) => j.id === invoice.job_card_id || j.customer_name === invoice.customer_name);

      const createdDate = new Date(invoice.created_at);
      const parts = targetJob?.parts || [];
      const labor = targetJob?.labor_charge || 0;
      const currencyStr = profile.currency || 'LKR';

      let partsText = parts.length > 0
        ? parts.map((p) => `• ${p.part_name} (Qty: ${p.quantity}) - ${currencyStr} ${p.total_price.toLocaleString()}`).join('\n')
        : '(No Spare Parts Charged)';

      const receiptSummaryText = 
`🧾 *${shopName.toUpperCase()}*
${profile.address ? profile.address + '\n' : ''}Tel: ${profile.phone || '-'}
----------------------------------
*TAX INVOICE / RECEIPT*
Inv No : ${invoice.invoice_no}
Date   : ${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
Cust   : ${invoice.customer_name} (${invoice.phone_number})
Mode   : ${invoice.payment_method}
----------------------------------
*ITEMS & REPAIR CHARGES:*
${partsText}
• Labor Charge: ${currencyStr} ${labor.toLocaleString()}
----------------------------------
*NET PAID: ${currencyStr} ${invoice.net_payable.toLocaleString()}*
----------------------------------
*** THANK YOU FOR YOUR BUSINESS ***`;

      // 1. Instant 0ms Native Mobile Share Sheet Call (Honor Share, Nearby Share, System Share)
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          navigator.share({
            title: `Receipt ${invoice.invoice_no}`,
            text: receiptSummaryText,
          });
          return;
        } catch (err: any) {
          console.log('Native share error:', err);
          if (err.name === 'AbortError') return;
        }
      }

      // 2. Direct Official HTTPS WhatsApp Fallback (Prevents net::ERR_UNKNOWN_URL_SCHEMA in WebViews)
      let cleanPhone = invoice.phone_number.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '94' + cleanPhone.substring(1);
      }
      const encodedMsg = encodeURIComponent(receiptSummaryText);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;

      window.open(whatsappUrl, '_blank');
    } catch (e) {
      console.error('Instant share error:', e);
    }
  };

  return (
    <button
      type="button"
      onClick={handleInstantShare}
      className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/90 border border-amber-800 hover:bg-amber-900 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
      title="Share Receipt via Phone Apps Menu / WhatsApp"
    >
      <Share2 className="w-3.5 h-3.5 text-amber-400" />
      <span>Share Receipt</span>
    </button>
  );
}
