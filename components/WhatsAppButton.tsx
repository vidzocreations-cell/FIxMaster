'use client';

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { JobCard } from '@/lib/types';
import ReceiptShareModal from '@/components/ReceiptShareModal';

interface WhatsAppButtonProps {
  job: JobCard;
}

export default function WhatsAppButton({ job }: WhatsAppButtonProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsShareModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/90 border border-amber-800 hover:bg-amber-900 transition-all cursor-pointer active:scale-95"
        title="Share Job Ticket (WhatsApp, Copy Text, Phone Share Sheet)"
      >
        <Share2 className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">Share</span>
      </button>

      <ReceiptShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        jobCard={job}
      />
    </>
  );
}
