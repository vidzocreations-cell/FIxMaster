'use client';

import React, { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { JobCard } from '@/lib/types';
import { getStoredProfile } from '@/lib/supabase';

interface WhatsAppButtonProps {
  job: JobCard;
}

export default function WhatsAppButton({ job }: WhatsAppButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleDirectNativeShare = async () => {
    setIsSharing(true);

    try {
      const profile = getStoredProfile();
      const shopName = (profile.shop_name || 'FixMaster Repair Center').toUpperCase();
      const docNo = job.job_no || 'TICKET-001';
      const createdDate = new Date(job.created_at);
      const parts = job.parts || [];
      const labor = job.labor_charge || 0;
      const deposit = job.advance_deposit || 0;
      const subtotal = parts.reduce((a, b) => a + b.total_price, 0) + labor;
      const netPayable = Math.max(0, subtotal - deposit);
      const currencyStr = profile.currency || 'LKR';

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
      doc.text('REPAIR SERVICE TICKET', 40, y, { align: 'center' });
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

      doc.text(`Cust   : ${job.customer_name.substring(0, 22)}`, 6, y);
      doc.text(`Time: ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 74, y, { align: 'right' });
      y += 4;

      doc.text(`Phone  : ${job.phone_number}`, 6, y);
      y += 5;

      doc.setFillColor(245, 245, 245);
      doc.rect(5, y, 70, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`${job.machine_category} - ${job.brand_model}`, 7, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`Fault: ${job.reported_fault.substring(0, 32)}`, 7, y + 7.5);
      y += 12;

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

      const blob = doc.output('blob');
      const pdfFile = new File([blob], `FixMaster_JobTicket_${docNo}.pdf`, { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

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
          title: `Job Ticket ${docNo}`,
          text: `FixMaster Repair Ticket ${docNo}`,
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

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `FixMaster_JobTicket_${docNo}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error sharing job ticket:', e);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      onClick={handleDirectNativeShare}
      disabled={isSharing}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/90 border border-amber-800 hover:bg-amber-900 transition-all cursor-pointer disabled:opacity-50"
      title="Open Phone Share Page"
    >
      {isSharing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
      ) : (
        <Share2 className="w-3.5 h-3.5 text-amber-400" />
      )}
      <span className="hidden sm:inline">Share</span>
    </button>
  );
}
