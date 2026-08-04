'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Share2, Download, Image as ImageIcon, Loader2, MessageSquare, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Invoice, JobCard, BusinessProfile } from '@/lib/types';
import { getStoredProfile, getStoredJobs } from '@/lib/supabase';

interface ReceiptImageShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  jobCard?: JobCard | null;
}

function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export default function ReceiptImageShareModal({ isOpen, onClose, invoice, jobCard }: ReceiptImageShareModalProps) {
  const [mounted, setMounted] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStatusNotice('');
      generateImage();
    } else {
      setImageUri(null);
      setImageFile(null);
    }
  }, [isOpen, invoice, jobCard]);

  const docNo = invoice ? invoice.invoice_no : jobCard?.job_no || 'RECEIPT';

  const generateImage = async () => {
    setIsGenerating(true);

    try {
      const profile: BusinessProfile = getStoredProfile();
      const shopName = profile.shop_name || 'FixMaster Repair & Service Center';

      // Determine Target Job Card
      let targetJob: JobCard | null | undefined = jobCard || invoice?.job_card;
      if (!targetJob && invoice) {
        const allJobs = getStoredJobs();
        targetJob = allJobs.find((j) => j.id === invoice.job_card_id || j.customer_name === invoice.customer_name);
      }

      const createdDate = invoice ? new Date(invoice.created_at) : targetJob ? new Date(targetJob.created_at) : new Date();
      const parts = targetJob?.parts || [];
      const labor = targetJob?.labor_charge || 0;
      const deposit = targetJob?.advance_deposit || 0;
      const subtotal = invoice ? invoice.subtotal : parts.reduce((a, b) => a + b.total_price, 0) + labor;
      const discount = invoice ? invoice.discount : 0;
      const netPayable = invoice ? invoice.net_payable : Math.max(0, subtotal - deposit - discount);
      const currencyStr = profile.currency || 'LKR';

      // Create an off-screen container for crisp html2canvas rendering
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '380px';
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#000000';
      container.style.padding = '20px';
      container.style.fontFamily = 'monospace';
      container.style.fontSize = '12px';
      container.style.boxSizing = 'border-box';

      let partsRows = '';
      if (parts.length > 0) {
        partsRows = parts
          .map(
            (p) =>
              `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:4px 0;">${p.part_name}</td>
                <td style="padding:4px 0; text-align:center;">${p.quantity}</td>
                <td style="padding:4px 0; text-align:right;">${p.unit_price.toLocaleString()}</td>
                <td style="padding:4px 0; text-align:right; font-weight:bold;">${p.total_price.toLocaleString()}</td>
              </tr>`
          )
          .join('');
      } else {
        partsRows = `<tr><td colspan="4" style="padding:6px 0; text-align:center; color:#666;">(No Spare Parts Charged)</td></tr>`;
      }

      container.innerHTML = `
        <div style="text-align:center; padding-bottom:8px; border-bottom:2px dashed #000;">
          <h2 style="font-size:18px; font-weight:900; margin:0; text-transform:uppercase;">${shopName}</h2>
          <p style="font-size:11px; margin:2px 0;">${profile.address}</p>
          <p style="font-size:11px; margin:2px 0;">Tel: ${profile.phone}</p>
        </div>

        <div style="text-align:center; margin:8px 0; padding:4px; background:#f3f4f6; font-weight:800; font-size:12px; text-transform:uppercase;">
          ${invoice ? 'TAX INVOICE / RECEIPT' : 'REPAIR SERVICE TICKET'}
        </div>

        <div style="display:flex; justify-content:space-between; font-size:11px; border-bottom:1px dashed #ccc; padding-bottom:6px; margin-bottom:8px;">
          <div>
            <div><b>Doc No:</b> ${docNo}</div>
            <div><b>Cust:</b> ${targetJob?.customer_name || invoice?.customer_name || 'Customer'}</div>
            <div><b>Phone:</b> ${targetJob?.phone_number || invoice?.phone_number || '-'}</div>
          </div>
          <div style="text-align:right;">
            <div><b>Date:</b> ${createdDate.toLocaleDateString()}</div>
            <div><b>Time:</b> ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            ${invoice ? `<div><b>Mode:</b> ${invoice.payment_method}</div>` : ''}
          </div>
        </div>

        ${
          targetJob
            ? `<div style="padding:6px; background:#f9fafb; border:1px solid #e5e7eb; margin-bottom:8px; font-size:11px;">
                <div style="display:flex; justify-content:space-between; font-weight:bold;">
                  <span>${targetJob.machine_category}</span>
                  <span>${targetJob.brand_model}</span>
                </div>
                <div style="font-size:10px; color:#4b5563;">Fault: ${targetJob.reported_fault}</div>
              </div>`
            : ''
        }

        <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:8px;">
          <thead>
            <tr style="border-bottom:2px solid #000; font-weight:bold; font-size:10px; text-transform:uppercase;">
              <th style="text-align:left; padding:4px 0;">Item</th>
              <th style="text-align:center; padding:4px 0;">Qty</th>
              <th style="text-align:right; padding:4px 0;">Price</th>
              <th style="text-align:right; padding:4px 0;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${partsRows}
            <tr style="border-top:1px solid #000;">
              <td colspan="3" style="padding:4px 0; font-weight:bold;">Service & Labor Charge</td>
              <td style="padding:4px 0; text-align:right; font-weight:bold;">${labor.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div style="border-top:2px dashed #000; padding-top:6px; font-size:11px; text-align:right;">
          <div style="display:flex; justify-content:space-between;">
            <span>Gross Subtotal:</span>
            <b>${currencyStr} ${subtotal.toLocaleString()}</b>
          </div>
          ${
            deposit > 0
              ? `<div style="display:flex; justify-content:space-between;">
                  <span>Advance Deposit Paid:</span>
                  <b>- ${currencyStr} ${deposit.toLocaleString()}</b>
                 </div>`
              : ''
          }
          ${
            discount > 0
              ? `<div style="display:flex; justify-content:space-between; color:#dc2626;">
                  <span>Discount Allowed:</span>
                  <b>- ${currencyStr} ${discount.toLocaleString()}</b>
                 </div>`
              : ''
          }
          <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:900; border-top:2px solid #000; padding-top:6px; margin-top:4px;">
            <span>NET PAYABLE:</span>
            <span>${currencyStr} ${netPayable.toLocaleString()}</span>
          </div>
        </div>

        <div style="text-align:center; font-size:10px; border-top:1px dashed #000; margin-top:10px; padding-top:8px;">
          <p style="font-weight:bold; margin:0;">*** THANK YOU FOR YOUR BUSINESS ***</p>
          <p style="font-size:9px; color:#555; margin:3px 0;">FixMaster POS System</p>
        </div>
      `;

      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
      document.body.removeChild(container);

      const dataUrl = canvas.toDataURL('image/png');
      const file = dataURLtoFile(dataUrl, `${docNo}_receipt.png`);

      setImageUri(dataUrl);
      setImageFile(file);
    } catch (e) {
      console.error('Error generating receipt image preview:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!imageUri) return;
    try {
      const link = document.createElement('a');
      link.href = imageUri;
      link.download = `${docNo}_receipt.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatusNotice('✓ Saved Receipt Photo to Phone Gallery / Downloads!');
    } catch {
      setStatusNotice('✓ Downloaded Receipt Photo!');
    }
  };

  const handleNativeShare = async () => {
    setStatusNotice('');

    if (imageUri) {
      const fileToShare = imageFile || dataURLtoFile(imageUri, `${docNo}_receipt.png`);

      if (typeof navigator !== 'undefined' && navigator.share) {
        // 1. Synchronously trigger native file share sheet
        try {
          await navigator.share({
            files: [fileToShare],
            title: `Receipt ${docNo}`,
            text: `FixMaster Receipt ${docNo}`,
          });
          setStatusNotice('✓ Opened Mobile App Share Menu!');
          return;
        } catch (err: any) {
          console.log('Native file share error:', err);
          if (err.name === 'AbortError') return; // User closed share sheet intentionally
        }

        // 2. Fallback text share if file share threw error
        try {
          await navigator.share({
            title: `Receipt ${docNo}`,
            text: `FixMaster Receipt ${docNo}`,
          });
          setStatusNotice('✓ Opened Mobile App Share Menu!');
          return;
        } catch (err: any) {
          console.log('Text share error:', err);
          if (err.name === 'AbortError') return;
        }
      }
    }

    // 3. Fallback: Save photo directly
    handleDownload();
  };

  const handleDirectWhatsApp = () => {
    const rawPhone = invoice?.phone_number || jobCard?.phone_number || '';
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '94' + cleanPhone.substring(1);
    }

    const profile = getStoredProfile();
    const shopName = profile.shop_name || 'FixMaster Repair Center';

    // Save photo
    handleDownload();

    const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const msgText = encodeURIComponent(
      `🧾 *${shopName}*\n` +
      `Receipt *${docNo}*\n\n` +
      `🖼️ (Saved receipt photo to your device - attach to chat!)`
    );

    if (isMobile) {
      window.location.href = `whatsapp://send?phone=${cleanPhone}&text=${msgText}`;
    } else {
      window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${msgText}`, '_blank');
    }

    setStatusNotice('✓ Saved Photo & Opening WhatsApp!');
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-150 p-4 sm:p-6 flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">Receipt Photo & Mobile Share Options</h2>
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

        {/* Image Preview Box */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[260px] overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2 py-12 text-slate-400 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <span>Generating Receipt Photo Preview...</span>
            </div>
          ) : imageUri ? (
            <div className="space-y-2 text-center w-full">
              <img
                src={imageUri}
                alt="Receipt Preview"
                className="max-h-[320px] w-auto mx-auto rounded-lg shadow-xl border border-gray-200 object-contain bg-white"
              />
              <p className="text-[11px] text-slate-400">Receipt photo ready! Tap orange button to open phone share menu</p>
            </div>
          ) : (
            <p className="text-xs text-red-400">Failed to render receipt image.</p>
          )}
        </div>

        {/* Action Controls Grid */}
        <div className="space-y-2 pt-1">
          {/* Main Mobile Native Share Sheet Button (Honor / MIUI / Android / iOS share page) */}
          <button
            type="button"
            onClick={handleNativeShare}
            disabled={!imageUri || isGenerating}
            className="w-full py-3.5 rounded-xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 shadow-xl shadow-amber-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Share2 className="w-4.5 h-4.5 text-slate-950" /> Mobile App Options (Open Phone Share Page)
          </button>

          <div className="grid grid-cols-2 gap-2">
            {/* Direct WhatsApp App Launcher */}
            <button
              type="button"
              onClick={handleDirectWhatsApp}
              disabled={!imageUri || isGenerating}
              className="py-2.5 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950 border border-emerald-800/80 hover:bg-emerald-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Direct
            </button>

            {/* Save Photo */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={!imageUri || isGenerating}
              className="py-2.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-950 border border-cyan-800/80 hover:bg-cyan-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" /> Save Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
