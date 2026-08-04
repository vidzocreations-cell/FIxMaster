'use client';

import React, { useState } from 'react';
import { FileText, Share2 } from 'lucide-react';
import { Invoice } from '@/lib/types';
import ReceiptPdfShareModal from '@/components/ReceiptPdfShareModal';

interface WhatsAppInvoiceButtonProps {
  invoice: Invoice;
}

export default function WhatsAppInvoiceButton({ invoice }: WhatsAppInvoiceButtonProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsShareModalOpen(true)}
        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-300 bg-amber-950/80 border border-amber-800/80 hover:bg-amber-900 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
        title="Share or Download PDF Receipt"
      >
        <FileText className="w-3.5 h-3.5 text-amber-400" />
        <span>Share PDF</span>
      </button>

      <ReceiptPdfShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        invoice={invoice}
      />
    </>
  );
}
