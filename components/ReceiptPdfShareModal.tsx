'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Share2, Download, FileText, Loader2, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import { Invoice, JobCard, BusinessProfile } from '@/lib/types';
import { getStoredProfile, getStoredJobs } from '@/lib/supabase';

interface ReceiptPdfShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  jobCard?: JobCard | null;
}

export default function ReceiptPdfShareModal({ isOpen, onClose, invoice, jobCard }: ReceiptPdfShareModalProps) {
  const [mounted, setMounted] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStatusNotice('');
      generatePdf();
    } else {
      setPdfBlobUrl(null);
      setPdfFile(null);
    }
  }, [isOpen, invoice, jobCard]);

  const docNo = invoice ? invoice.invoice_no : jobCard?.job_no || 'RECEIPT';

  const generatePdf = async () => {
    setIsGenerating(true);

    try {
      const profile: BusinessProfile = getStoredProfile();
      const shopName = (profile.shop_name || 'FixMaster Repair Center').toUpperCase();

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

      // Create 80mm standard thermal roll PDF in jsPDF (80mm x 180mm)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 190],
      });

      let y = 10;

      // Shop Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(shopName, 40, y, { align: 'center' });
      y += 5;

      // Address & Tel
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(profile.address || '', 40, y, { align: 'center' });
      y += 4;
      doc.text(`Tel: ${profile.phone || ''}`, 40, y, { align: 'center' });
      y += 5;

      // Dashed Line
      doc.setFont('courier', 'normal');
      doc.text('------------------------------------------', 40, y, { align: 'center' });
      y += 5;

      // Document Banner
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const docTitle = invoice ? 'TAX INVOICE / RECEIPT' : 'REPAIR SERVICE TICKET';
      doc.text(docTitle, 40, y, { align: 'center' });
      y += 5;

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text('------------------------------------------', 40, y, { align: 'center' });
      y += 4;

      // Doc Info Grid
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Doc No : ${docNo}`, 6, y);
      doc.text(`Date: ${createdDate.toLocaleDateString()}`, 74, y, { align: 'right' });
      y += 4;

      const custName = targetJob?.customer_name || invoice?.customer_name || 'Customer';
      doc.text(`Cust   : ${custName.substring(0, 22)}`, 6, y);
      doc.text(`Time: ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 74, y, { align: 'right' });
      y += 4;

      const phoneNo = targetJob?.phone_number || invoice?.phone_number || '-';
      doc.text(`Phone  : ${phoneNo}`, 6, y);
      if (invoice) {
        doc.text(`Mode: ${invoice.payment_method}`, 74, y, { align: 'right' });
      }
      y += 5;

      // Machine Specs
      if (targetJob) {
        doc.setFillColor(245, 245, 245);
        doc.rect(5, y, 70, 9, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`${targetJob.machine_category} - ${targetJob.brand_model}`, 7, y + 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(`Fault: ${targetJob.reported_fault.substring(0, 32)}`, 7, y + 7.5);
        y += 12;
      }

      // Line Items Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('ITEM / DESCRIPTION', 6, y);
      doc.text('QTY', 44, y, { align: 'center' });
      doc.text('PRICE', 58, y, { align: 'right' });
      doc.text('TOTAL', 74, y, { align: 'right' });
      y += 2;

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text('------------------------------------------', 40, y, { align: 'center' });
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      if (parts.length === 0) {
        doc.text('(No Spare Parts Charged)', 40, y, { align: 'center' });
        y += 4;
      } else {
        parts.forEach((p) => {
          doc.text(p.part_name.substring(0, 20), 6, y);
          doc.text(`${p.quantity}`, 44, y, { align: 'center' });
          doc.text(p.unit_price.toLocaleString(), 58, y, { align: 'right' });
          doc.setFont('helvetica', 'bold');
          doc.text(p.total_price.toLocaleString(), 74, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          y += 4;
        });
      }

      // Labor Fee
      doc.text('Service & Labor Charge', 6, y);
      doc.setFont('helvetica', 'bold');
      doc.text(labor.toLocaleString(), 74, y, { align: 'right' });
      y += 4;

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text('------------------------------------------', 40, y, { align: 'center' });
      y += 5;

      // Totals
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Gross Subtotal:', 6, y);
      doc.text(`${currencyStr} ${subtotal.toLocaleString()}`, 74, y, { align: 'right' });
      y += 4;

      if (deposit > 0) {
        doc.text('Advance Deposit Paid:', 6, y);
        doc.text(`- ${currencyStr} ${deposit.toLocaleString()}`, 74, y, { align: 'right' });
        y += 4;
      }

      if (discount > 0) {
        doc.text('Discount Allowed:', 6, y);
        doc.text(`- ${currencyStr} ${discount.toLocaleString()}`, 74, y, { align: 'right' });
        y += 4;
      }

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text('==========================================', 40, y, { align: 'center' });
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('NET PAYABLE:', 6, y);
      doc.text(`${currencyStr} ${netPayable.toLocaleString()}`, 74, y, { align: 'right' });
      y += 6;

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text('------------------------------------------', 40, y, { align: 'center' });
      y += 5;

      // Footer
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(profile.receipt_footer_note || '*** THANK YOU FOR YOUR BUSINESS ***', 40, y, { align: 'center' });
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('FixMaster POS System - Mobile Receipt PDF', 40, y, { align: 'center' });

      // Generate PDF File & Blob URL
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const file = new File([blob], `FixMaster_Receipt_${docNo}.pdf`, { type: 'application/pdf' });

      setPdfBlobUrl(url);
      setPdfFile(file);
    } catch (e) {
      console.error('Error generating PDF receipt:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    const link = document.createElement('a');
    link.href = pdfBlobUrl;
    link.download = `FixMaster_Receipt_${docNo}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatusNotice('✓ Saved PDF Receipt to Downloads!');
  };

  const handleNativeShare = async () => {
    setStatusNotice('');

    if (pdfFile && typeof navigator !== 'undefined' && navigator.share) {
      const shareData: ShareData = {
        title: `Receipt ${docNo}`,
        text: `FixMaster Sales Receipt PDF ${docNo}`,
      };

      let canSharePdf = false;
      try {
        if (navigator.canShare) {
          canSharePdf = navigator.canShare({ files: [pdfFile] });
        }
      } catch {
        canSharePdf = false;
      }

      if (canSharePdf) {
        shareData.files = [pdfFile];
      }

      try {
        await navigator.share(shareData);
        setStatusNotice('✓ Opened Mobile App Share Menu!');
        return;
      } catch (err: any) {
        console.log('PDF native share error:', err);
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback if Web Share API fails: download PDF file
    handleDownload();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-150 p-4 sm:p-6 flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">PDF Receipt Share & Download</h2>
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

        {/* PDF Preview Card */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[220px] text-center space-y-3">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-400 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <span>Generating HD PDF Receipt...</span>
            </div>
          ) : pdfBlobUrl ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center shadow-lg text-cyan-400">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">FixMaster_Receipt_{docNo}.pdf</h3>
                <p className="text-xs text-slate-400 mt-0.5">Vector PDF Thermal Bill Format</p>
              </div>
            </>
          ) : (
            <p className="text-xs text-red-400">Failed to render PDF document.</p>
          )}
        </div>

        {/* Action Controls Grid (Save PDF & Mobile Share Option) */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Save PDF */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!pdfBlobUrl || isGenerating}
            className="py-3.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-cyan-400" /> Download PDF
          </button>

          {/* Main Mobile Native Share Sheet Button */}
          <button
            type="button"
            onClick={handleNativeShare}
            disabled={!pdfBlobUrl || isGenerating}
            className="py-3.5 rounded-xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 shadow-xl shadow-amber-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 text-slate-950" /> Mobile Share Option
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
