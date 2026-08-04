'use client';

import React, { useState } from 'react';
import { Image, Share2 } from 'lucide-react';
import { JobCard } from '@/lib/types';
import ReceiptImageShareModal from '@/components/ReceiptImageShareModal';

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
        title="Preview receipt photo & choose mobile app share options"
      >
        <Image className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">Share Image</span>
      </button>

      <ReceiptImageShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        jobCard={job}
      />
    </>
  );
}
