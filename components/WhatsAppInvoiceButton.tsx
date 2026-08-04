'use client';

import React, { useState } from 'react';
import { MessageSquare, Image, Share2, Loader2, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Invoice } from '@/lib/types';
import { getStoredProfile } from '@/lib/supabase';

interface WhatsAppInvoiceButtonProps {
  invoice: Invoice;
}

export default function WhatsAppInvoiceButton({ invoice }: WhatsAppInvoiceButtonProps) {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleShareReceiptAsImage = async () => {
    setIsGeneratingImage(true);

    try {
      const profile = getStoredProfile();
      const shopName = profile.shop_name || 'FixMaster Repair & Service Center';

      // Create a temporary off-screen receipt container for html2canvas
      const receiptContainer = document.createElement('div');
      receiptContainer.style.position = 'fixed';
      receiptContainer.style.left = '-9999px';
      receiptContainer.style.top = '-9999px';
      receiptContainer.style.width = '380px';
      receiptContainer.style.backgroundColor = '#ffffff';
      receiptContainer.style.color = '#000000';
      receiptContainer.style.padding = '20px';
      receiptContainer.style.fontFamily = 'monospace';
      receiptContainer.style.fontSize = '12px';
      receiptContainer.style.boxSizing = 'border-box';
      receiptContainer.style.border = '1px solid #e5e7eb';

      let partsRows = '';
      if (invoice.job_card?.parts && invoice.job_card.parts.length > 0) {
        partsRows = invoice.job_card.parts
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

      const laborFee = invoice.job_card?.labor_charge || 0;
      const createdDate = new Date(invoice.created_at);

      receiptContainer.innerHTML = `
        <div style="text-align:center; padding-bottom:8px; border-bottom:2px dashed #000;">
          <h2 style="font-size:18px; font-weight:900; margin:0; text-transform:uppercase;">${shopName}</h2>
          <p style="font-size:11px; margin:2px 0;">${profile.address}</p>
          <p style="font-size:11px; margin:2px 0;">Tel: ${profile.phone}</p>
        </div>

        <div style="text-align:center; margin:8px 0; padding:4px; background:#f3f4f6; font-weight:800; font-size:12px; text-transform:uppercase;">
          TAX INVOICE / RECEIPT
        </div>

        <div style="display:flex; justify-content:space-between; font-size:11px; border-bottom:1px dashed #ccc; padding-bottom:6px; margin-bottom:8px;">
          <div>
            <div><b>Inv No:</b> ${invoice.invoice_no}</div>
            <div><b>Customer:</b> ${invoice.customer_name}</div>
            <div><b>Phone:</b> ${invoice.phone_number}</div>
          </div>
          <div style="text-align:right;">
            <div><b>Date:</b> ${createdDate.toLocaleDateString()}</div>
            <div><b>Time:</b> ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div><b>Mode:</b> ${invoice.payment_method}</div>
          </div>
        </div>

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
              <td style="padding:4px 0; text-align:right; font-weight:bold;">${laborFee.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div style="border-top:2px dashed #000; padding-top:6px; font-size:11px; text-align:right;">
          <div style="display:flex; justify-content:space-between;">
            <span>Gross Subtotal:</span>
            <b>LKR ${invoice.subtotal.toLocaleString()}</b>
          </div>
          ${
            invoice.discount > 0
              ? `<div style="display:flex; justify-content:space-between; color:#dc2626;">
                  <span>Discount Allowed:</span>
                  <b>- LKR ${invoice.discount.toLocaleString()}</b>
                 </div>`
              : ''
          }
          <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:900; border-top:2px solid #000; padding-top:6px; margin-top:4px;">
            <span>NET PAID:</span>
            <span>LKR ${invoice.net_payable.toLocaleString()}</span>
          </div>
        </div>

        <div style="text-align:center; font-size:10px; border-top:1px dashed #000; margin-top:10px; padding-top:8px;">
          <p style="font-weight:bold; margin:0;">*** THANK YOU FOR YOUR BUSINESS ***</p>
          <p style="font-size:9px; color:#555; margin:3px 0;">FixMaster POS System</p>
        </div>
      `;

      document.body.appendChild(receiptContainer);

      // Render to PNG canvas
      const canvas = await html2canvas(receiptContainer, { scale: 2, backgroundColor: '#ffffff' });
      document.body.removeChild(receiptContainer);

      const dataUrl = canvas.toDataURL('image/png');

      // Convert Data URL to Blob / File for Native Sharing
      const blob = await (await fetch(dataUrl)).blob();
      const receiptFile = new File([blob], `FixMaster_Receipt_${invoice.invoice_no}.png`, { type: 'image/png' });

      // Check Mobile Native Web Share API (Android/iOS)
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [receiptFile] })) {
        await navigator.share({
          files: [receiptFile],
          title: `Receipt ${invoice.invoice_no}`,
          text: `Sales Invoice Receipt ${invoice.invoice_no} for ${invoice.customer_name}`,
        });
      } else {
        // Fallback for PC / Browser without file share: Download PNG image directly & open WhatsApp
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `Receipt_${invoice.invoice_no}.png`;
        link.click();

        // Also open WhatsApp text notification
        let cleanPhone = invoice.phone_number.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
          cleanPhone = '94' + cleanPhone.substring(1);
        }
        const textMsg = encodeURIComponent(
          `🧾 *${shopName}*\n` +
          `Sales Receipt *${invoice.invoice_no}* for *${invoice.customer_name}*\n` +
          `Net Paid: *LKR ${invoice.net_payable.toLocaleString()}* (${invoice.payment_method})\n\n` +
          `🖼️ (Receipt Image downloaded to your device - attach to chat!)`
        );
        window.open(`https://wa.me/${cleanPhone}?text=${textMsg}`, '_blank');
      }
    } catch (err) {
      console.error('Failed to generate image:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <button
      onClick={handleShareReceiptAsImage}
      disabled={isGeneratingImage}
      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 hover:bg-emerald-900 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
      title="Share Receipt as Photo / Image to WhatsApp"
    >
      {isGeneratingImage ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          <span>Generating Image...</span>
        </>
      ) : (
        <>
          <Image className="w-3.5 h-3.5 text-emerald-400" />
          <span>WhatsApp Image</span>
        </>
      )}
    </button>
  );
}
