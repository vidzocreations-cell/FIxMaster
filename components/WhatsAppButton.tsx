'use client';

import React, { useState } from 'react';
import { FileText, Share2 } from 'lucide-react';
import { JobCard } from '@/lib/types';
import ReceiptPdfShareModal from '@/components/ReceiptPdfShareModal';

interface WhatsAppButtonProps {
  job: JobCard;
}

export default function WhatsAppButton({ job }: WhatsAppButtonProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsShareModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-amber-300 bg-amber-950/80 border border-amber-800/80 hover:bg-amber-900 transition-all cursor-pointer"
        title="Share or Download PDF Receipt"
      >
        <FileText className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">Share PDF</span>
      </button>

      <ReceiptPdfShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        jobCard={job}
      />
    </>
  );
}
