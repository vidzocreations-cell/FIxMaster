'use client';

import React from 'react';
import { Share2 } from 'lucide-react';
import { JobCard } from '@/lib/types';
import { getStoredProfile } from '@/lib/supabase';

interface WhatsAppButtonProps {
  job: JobCard;
}

export default function WhatsAppButton({ job }: WhatsAppButtonProps) {
  const handleInstantShare = () => {
    try {
      const profile = getStoredProfile();
      const shopName = profile.shop_name || 'FixMaster Repair Center';
      const createdDate = new Date(job.created_at);
      const parts = job.parts || [];
      const labor = job.labor_charge || 0;
      const deposit = job.advance_deposit || 0;
      const subtotal = parts.reduce((a, b) => a + b.total_price, 0) + labor;
      const netPayable = Math.max(0, subtotal - deposit);
      const currencyStr = profile.currency || 'LKR';

      let partsText = parts.length > 0
        ? parts.map((p) => `• ${p.part_name} (Qty: ${p.quantity}) - ${currencyStr} ${p.total_price.toLocaleString()}`).join('\n')
        : '(No Spare Parts Charged)';

      const ticketSummaryText = 
`🔧 *${shopName.toUpperCase()}*
${profile.address ? profile.address + '\n' : ''}Tel: ${profile.phone || '-'}
----------------------------------
*REPAIR SERVICE JOB TICKET*
Job No : ${job.job_no}
Date   : ${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
Cust   : ${job.customer_name} (${job.phone_number})
Device : ${job.machine_category} - ${job.brand_model}
Fault  : ${job.reported_fault}
Status : ${job.status}
----------------------------------
*ESTIMATED PARTS & REPAIR:*
${partsText}
• Labor Charge: ${currencyStr} ${labor.toLocaleString()}
${deposit > 0 ? `• Advance Deposit Paid: - ${currencyStr} ${deposit.toLocaleString()}\n` : ''}----------------------------------
*ESTIMATED NET PAYABLE: ${currencyStr} ${netPayable.toLocaleString()}*
----------------------------------
*** THANK YOU FOR YOUR BUSINESS ***`;

      // 1. Instant 0ms Native Mobile Share Sheet Call
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          navigator.share({
            title: `Job Ticket ${job.job_no}`,
            text: ticketSummaryText,
          });
          return;
        } catch (err: any) {
          console.log('Native share error:', err);
          if (err.name === 'AbortError') return;
        }
      }

      // 2. Direct Mobile WhatsApp Fallback if Web Share is disabled on device
      let cleanPhone = job.phone_number.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '94' + cleanPhone.substring(1);
      }
      const encodedMsg = encodeURIComponent(ticketSummaryText);
      const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile) {
        window.location.href = `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`;
      } else {
        window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`, '_blank');
      }
    } catch (e) {
      console.error('Instant share error:', e);
    }
  };

  return (
    <button
      type="button"
      onClick={handleInstantShare}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/90 border border-amber-800 hover:bg-amber-900 transition-all cursor-pointer active:scale-95"
      title="Share Job Ticket via Phone Apps Menu / WhatsApp"
    >
      <Share2 className="w-3.5 h-3.5 text-amber-400" />
      <span className="hidden sm:inline">Share</span>
    </button>
  );
}
