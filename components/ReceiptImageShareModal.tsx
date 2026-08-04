'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Share2, Download, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Invoice, JobCard, BusinessProfile } from '@/lib/types';
import { getStoredProfile, getStoredJobs } from '@/lib/supabase';

interface ReceiptImageShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  jobCard?: JobCard | null;
}

export default function ReceiptImageShareModal({ isOpen, onClose, invoice, jobCard }: ReceiptImageShareModalProps) {
  const [mounted, setMounted] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      generateImage();
    } else {
      setImageUri(null);
      setImageFile(null);
    }
  }, [isOpen, invoice, jobCard]);

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

      const docNo = invoice ? invoice.invoice_no : targetJob?.job_no || 'RECEIPT-1001';
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
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${docNo}_receipt.png`, { type: 'image/png' });

      setImageUri(dataUrl);
      setImageFile(file);
    } catch (e) {
      console.error('Error generating receipt image preview:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNativeShare = async () => {
    if (!imageFile) return;

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
      try {
        await navigator.share({
          files: [imageFile],
          title: 'Receipt Image',
          text: 'FixMaster Sales Receipt Image',
        });
      } catch (err) {
        console.log('Share dismissed or failed:', err);
      }
    } else {
      // Fallback download if mobile share is unavailable
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!imageUri) return;
    const docNo = invoice ? invoice.invoice_no : jobCard?.job_no || 'RECEIPT';
    const link = document.createElement('a');
    link.href = imageUri;
    link.download = `${docNo}_receipt.png`;
    link.click();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-150 p-4 sm:p-6 flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">Receipt Photo Preview</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview Box */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2 py-12 text-slate-400 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <span>Generating Receipt Image Preview...</span>
            </div>
          ) : imageUri ? (
            <div className="space-y-2 text-center w-full">
              <img
                src={imageUri}
                alt="Receipt Preview"
                className="max-h-[380px] w-auto mx-auto rounded-lg shadow-xl border border-gray-200 object-contain bg-white"
              />
              <p className="text-[11px] text-slate-400">Select any app (WhatsApp, Viber, Gallery) from your phone share menu below</p>
            </div>
          ) : (
            <p className="text-xs text-red-400">Failed to render receipt image.</p>
          )}
        </div>

        {/* Mobile Action Controls */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!imageUri || isGenerating}
            className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-cyan-400" /> Save Photo
          </button>

          <button
            type="button"
            onClick={handleNativeShare}
            disabled={!imageUri || isGenerating}
            className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 text-white" /> Mobile App Options
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
