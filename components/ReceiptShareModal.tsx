'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, MessageSquare, Share2, Printer, ExternalLink } from 'lucide-react';
import { Invoice, JobCard, BusinessProfile } from '@/lib/types';
import { getStoredProfile, getStoredJobs } from '@/lib/supabase';

interface ReceiptShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  jobCard?: JobCard | null;
  onOpenPrint?: () => void;
}

export default function ReceiptShareModal({ isOpen, onClose, invoice, jobCard, onOpenPrint }: ReceiptShareModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCopiedText(false);
      setStatusNotice('');
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const profile: BusinessProfile = getStoredProfile();
  const shopName = profile.shop_name || 'FixMaster Repair Center';
  const targetJob = jobCard || invoice?.job_card || (invoice ? getStoredJobs().find((j) => j.id === invoice.job_card_id || j.customer_name === invoice.customer_name) : null);

  const docNo = invoice ? invoice.invoice_no : targetJob?.job_no || 'RECEIPT-1001';
  const createdDate = invoice ? new Date(invoice.created_at) : targetJob ? new Date(targetJob.created_at) : new Date();
  const parts = targetJob?.parts || [];
  const labor = targetJob?.labor_charge || 0;
  const deposit = targetJob?.advance_deposit || 0;
  const subtotal = invoice ? invoice.subtotal : parts.reduce((a, b) => a + b.total_price, 0) + labor;
  const discount = invoice ? invoice.discount : 0;
  const netPayable = invoice ? invoice.net_payable : Math.max(0, subtotal - deposit - discount);
  const currencyStr = profile.currency || 'LKR';
  const customerPhone = invoice?.phone_number || targetJob?.phone_number || '';
  const customerName = invoice?.customer_name || targetJob?.customer_name || 'Customer';

  let partsText = parts.length > 0
    ? parts.map((p) => `• ${p.part_name} (x${p.quantity}) - ${currencyStr} ${p.total_price.toLocaleString()}`).join('\n')
    : '(No Spare Parts Charged)';

  const formattedBillText = 
`🧾 *${shopName.toUpperCase()}*
${profile.address ? profile.address + '\n' : ''}Tel: ${profile.phone || '-'}
----------------------------------
*${invoice ? 'TAX INVOICE / RECEIPT' : 'REPAIR SERVICE TICKET'}*
Doc No : ${docNo}
Date   : ${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
Cust   : ${customerName} (${customerPhone})
${invoice ? `Payment: ${invoice.payment_method}\n` : ''}----------------------------------
*ITEMS & REPAIR CHARGES:*
${partsText}
• Labor Charge: ${currencyStr} ${labor.toLocaleString()}
${deposit > 0 ? `• Advance Deposit: - ${currencyStr} ${deposit.toLocaleString()}\n` : ''}${discount > 0 ? `• Discount Allowed: - ${currencyStr} ${discount.toLocaleString()}\n` : ''}----------------------------------
*NET PAID: ${currencyStr} ${netPayable.toLocaleString()}*
----------------------------------
*** THANK YOU FOR YOUR BUSINESS ***`;

  // Action 1: Copy Formatted Bill Text to Clipboard
  const handleCopyText = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(formattedBillText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formattedBillText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedText(true);
      setStatusNotice('✓ Receipt Text Copied to Clipboard!');
      setTimeout(() => setCopiedText(false), 3000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  // Action 2: Direct Android Intent / WhatsApp App Launcher (Bypasses "Open app" intermediate page!)
  const handleOpenWhatsAppDirect = () => {
    let cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '94' + cleanPhone.substring(1);
    }
    const encodedMsg = encodeURIComponent(formattedBillText);

    // Auto-copy text first
    handleCopyText();

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isAndroid = /Android/i.test(userAgent);

    if (isAndroid) {
      // Android OS Intent: Directly launches com.whatsapp package without web browser page!
      window.location.href = `intent://send?phone=${cleanPhone}&text=${encodedMsg}#Intent;scheme=whatsapp;package=com.whatsapp;end`;
    } else {
      // iOS / Desktop Web fallback
      window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`, '_blank');
    }

    setStatusNotice('✓ Opening Native WhatsApp Mobile App!');
  };

  // Action 3: System Native Share Sheet
  const handleSystemShare = async () => {
    setStatusNotice('');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${docNo}`,
          text: formattedBillText,
        });
        setStatusNotice('✓ Opened Phone Share Menu!');
        return;
      } catch (err: any) {
        console.log('Share dismissed or blocked:', err);
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: Copy to Clipboard & Open WhatsApp
    handleCopyText();
    handleOpenWhatsAppDirect();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-150 p-4 sm:p-6 flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">Share Receipt ({docNo})</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notice Banner */}
        {statusNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Bill Text Preview Box */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold border-b border-slate-800/80 pb-1.5">
            <span>Bill Text Summary</span>
            <button
              onClick={handleCopyText}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed selection:bg-cyan-500 selection:text-white">
            {formattedBillText}
          </pre>
        </div>

        {/* Action Controls Grid */}
        <div className="space-y-2 pt-1">
          {/* Method 1: Direct Android Intent WhatsApp Launcher */}
          <button
            type="button"
            onClick={handleOpenWhatsAppDirect}
            className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <MessageSquare className="w-4 h-4 text-white" /> Open WhatsApp App Directly
          </button>

          <div className="grid grid-cols-2 gap-2">
            {/* Method 2: System Phone Share Menu */}
            <button
              type="button"
              onClick={handleSystemShare}
              className="py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-950 border border-amber-800/80 hover:bg-amber-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" /> Phone Share Menu
            </button>

            {/* Method 3: Copy Bill Text */}
            <button
              type="button"
              onClick={handleCopyText}
              className="py-2.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-950 border border-cyan-800/80 hover:bg-cyan-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedText ? 'Text Copied' : 'Copy Bill Text'}</span>
            </button>
          </div>

          {/* Optional Print View Button */}
          {onOpenPrint && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPrint();
              }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:text-white hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-1"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" /> Open POS Thermal Printer View
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
