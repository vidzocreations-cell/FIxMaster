'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
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

    const message = encodeURIComponent(
      ` Hello ${job.customer_name},\n` +
      `Your repair ticket *${job.job_no}* for *${job.brand_model}* (${job.machine_category}) has been updated!\n\n` +
      ` Status: *${job.status}*\n` +
      ` Total Estimated Amount: *LKR ${job.total_amount.toLocaleString()}*\n\n` +
      `Thank you for choosing FixMaster Repair Center!`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <button
      onClick={handleWhatsApp}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 hover:bg-emerald-900 transition-all cursor-pointer"
      title="Send WhatsApp update to customer"
    >
      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
      <span className="hidden sm:inline">WhatsApp</span>
    </button>
  );
}
