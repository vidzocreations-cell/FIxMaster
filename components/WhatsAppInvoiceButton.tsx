'use client';

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Invoice } from '@/lib/types';
import ReceiptShareModal from '@/components/ReceiptShareModal';

interface WhatsAppInvoiceButtonProps {
  invoice: Invoice;
  onOpenPrint?: () => void;
}

export default function WhatsAppInvoiceButton({ invoice, onOpenPrint }: WhatsAppInvoiceButtonProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsShareModalOpen(true)}
        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/90 border border-amber-800 hover:bg-amber-900 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
        title="Share Receipt (WhatsApp, Copy Text, Phone Share Sheet)"
      >
        <Share2 className="w-3.5 h-3.5 text-amber-400" />
        <span>Share Receipt</span>
      </button>

      <ReceiptShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        invoice={invoice}
        onOpenPrint={onOpenPrint}
      />
    </>
  );
}
