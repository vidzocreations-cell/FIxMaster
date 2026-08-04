'use client';

import React from 'react';
import { MessageSquare, Share2 } from 'lucide-react';
import { JobCard } from '@/lib/types';

interface WhatsAppButtonProps {
  job: JobCard;
}

export default function WhatsAppButton({ job }: WhatsAppButtonProps) {
  const handleWhatsApp = () => {
    let cleanPhone = job.phone_number.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '94' + cleanPhone.substring(1);
    }

    const textContent =
      `Hello ${job.customer_name},\n` +
      `Your repair ticket *${job.job_no}* for *${job.brand_model}* (${job.machine_category}) has been updated!\n\n` +
      `Status: *${job.status}*\n` +
      `Total Estimated Amount: *LKR ${job.total_amount.toLocaleString()}*\n\n` +
      `Thank you for choosing FixMaster Repair Center!`;

    const encodedMessage = encodeURIComponent(textContent);

    const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      // Direct deep link to native WhatsApp Mobile App (No browser tab)
      window.location.href = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
    } else {
      // Desktop Web WhatsApp link
      window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`, '_blank');
    }
  };

  return (
    <button
      onClick={handleWhatsApp}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 hover:bg-emerald-900 transition-all cursor-pointer"
      title="Open native WhatsApp App & send update"
    >
      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
      <span className="hidden sm:inline">WhatsApp</span>
    </button>
  );
}
