'use client';

import React, { useState } from 'react';
import { FileText, Share2, Loader2, MessageSquare } from 'lucide-react';
import jsPDF from 'jspdf';
import { Invoice } from '@/lib/types';
import { getStoredProfile, getStoredJobs } from '@/lib/supabase';

interface WhatsAppInvoiceButtonProps {
  invoice: Invoice;
}

export default function WhatsAppInvoiceButton({ invoice }: WhatsAppInvoiceButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleDirectNativeShare = async () => {
    setIsSharing(true);

    try {
      const profile = getStoredProfile();
      const shopName = (profile.shop_name || 'FixMaster Repair Center').toUpperCase();
      const targetJob = invoice.job_card || getStoredJobs().find((j) => j.id === invoice.job_card_id || j.customer_name === invoice.customer_name);

      const createdDate = new Date(invoice.created_at);
      const parts = targetJob?.parts || [];
      const labor = targetJob?.labor_charge || 0;
      const deposit = targetJob?.advance_deposit || 0;
      const subtotal = invoice.subtotal;
      const discount = invoice.discount;
      const netPayable = invoice.net_payable;
      const currencyStr = profile.currency || 'LKR';
      const docNo = invoice.invoice_no;

      // 1. Create PDF document synchronously using jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 190],
      });

      let y = 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(shopName, 40, y, { align: 'center' });
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(profile.address || '', 40, y, { align: 'center' });
      y += 4;
      doc.text(`Tel: ${profile.phone || ''}`, 40, y, { align: 'center' });
      y += 5;

      doc.setFont('courier', 'normal');
      doc.text('------------------------------------------', 40, y, { align: 'center' });
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('TAX INVOICE / RECEIPT', 40, y, { align: 'center' });
      y += 5;

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text('------------------------------------------', 40, y, { align: 'center' });
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Doc No : ${docNo}`, 6, y);
      doc.text(`Date: ${createdDate.toLocaleDateString()}`, 74, y, { align: 'right' });
      y += 4;

      doc.text(`Cust   : ${invoice.customer_name.substring(0, 22)}`, 6, y);
      doc.text(`Time: ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 74, y, { align: 'right' });
      y += 4;

      doc.text(`Phone  : ${invoice.phone_number}`, 6, y);
      doc.text(`Mode: ${invoice.payment_method}`, 74, y, { align: 'right' });
      y += 5;

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

      doc.text('Service & Labor Charge', 6, y);
      doc.setFont('helvetica', 'bold');
      doc.text(labor.toLocaleString(), 74, y, { align: 'right' });
      y += 4;

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text('------------------------------------------', 40, y, { align: 'center' });
      y += 5;

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

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(profile.receipt_footer_note || '*** THANK YOU FOR YOUR BUSINESS ***', 40, y, { align: 'center' });

      // Generate PDF File & URL
      const blob = doc.output('blob');
      const pdfFile = new File([blob], `FixMaster_Receipt_${docNo}.pdf`, { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      // 2. Trigger Mobile Phone Native Share Sheet
      if (typeof navigator !== 'undefined' && navigator.share) {
        let canSharePdf = false;
        try {
          if (navigator.canShare) {
            canSharePdf = navigator.canShare({ files: [pdfFile] });
          }
        } catch {
          canSharePdf = false;
        }

        const shareData: ShareData = {
          title: `Receipt ${docNo}`,
          text: `FixMaster Receipt ${docNo}`,
        };

        if (canSharePdf) {
          shareData.files = [pdfFile];
        } else {
          shareData.url = blobUrl;
        }

        try {
          await navigator.share(shareData);
          return;
        } catch (err: any) {
          console.log('Direct share error:', err);
          if (err.name === 'AbortError') return;
        }
      }

      // 3. Fallback: Download PDF File & Open in New Tab
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `FixMaster_Receipt_${docNo}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error sharing receipt:', e);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      onClick={handleDirectNativeShare}
      disabled={isSharing}
      className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/90 border border-amber-800 hover:bg-amber-900 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
      title="Open Phone Share Page (WhatsApp, Honor Share, Nearby Share, etc.)"
    >
      {isSharing ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
          <span>Opening Share...</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Share PDF</span>
        </>
      )}
    </button>
  );
}
