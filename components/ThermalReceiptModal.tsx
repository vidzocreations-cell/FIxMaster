'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Wrench, Phone, MapPin, CheckCircle2, QrCode, Share2 } from 'lucide-react';
import { Invoice, JobCard, BusinessProfile, JobPart } from '@/lib/types';
import { getStoredJobs } from '@/lib/supabase';
import ReceiptShareModal from '@/components/ReceiptShareModal';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  jobCard?: JobCard | null;
  profile: BusinessProfile;
}

export default function ThermalReceiptModal({ isOpen, onClose, invoice, jobCard, profile }: ThermalReceiptModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isShareHubOpen, setIsShareHubOpen] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handlePrint = () => {
    window.print();
  };

  // Find job card either directly or via stored jobs matching invoice
  let targetJob: JobCard | null | undefined = jobCard || invoice?.job_card;
  if (!targetJob && invoice) {
    const allJobs = getStoredJobs();
    targetJob = allJobs.find((j) => j.id === invoice.job_card_id || j.customer_name === invoice.customer_name);
  }

  let parts: JobPart[] = targetJob?.parts || [];

  // Fallback: If parts array is empty but ext_part_name exists, construct the outside shop part
  if (parts.length === 0 && targetJob?.ext_part_name) {
    const sellingNum = targetJob.ext_selling_price || targetJob.ext_cost_price || 0;
    parts = [
      {
        id: 'ext-' + (targetJob.id || '1'),
        job_card_id: targetJob.id || '',
        part_id: 'ext-part',
        part_name: `${targetJob.ext_part_name} (Outside Shop)`,
        quantity: 1,
        unit_price: sellingNum,
        total_price: sellingNum,
        cost_price: targetJob.ext_cost_price || 0,
        margin_percent: 0,
        is_external: true,
      },
    ];
  }

  const labor = targetJob?.labor_charge || 0;
  const deposit = targetJob?.advance_deposit || 0;
  const docNo = invoice ? invoice.invoice_no : targetJob?.job_no || 'TICKET-001';
  const createdDate = invoice ? new Date(invoice.created_at) : targetJob ? new Date(targetJob.created_at) : new Date();

  const partsTotal = parts.reduce((a, b) => a + b.total_price, 0);
  const subtotal = invoice ? invoice.subtotal : partsTotal + labor;
  const discount = invoice ? invoice.discount : 0;
  const netPayable = invoice ? invoice.net_payable : Math.max(0, subtotal - deposit - discount);

  const currencyStr = profile.currency || 'LKR';

  const modalContent = (
    <>
      <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-150 p-0 sm:p-6 flex items-start sm:items-center justify-center min-h-screen">
        <div className="w-full max-w-lg bg-slate-900 sm:rounded-2xl border-0 sm:border border-slate-800 p-4 sm:p-6 space-y-4 shadow-2xl relative min-h-screen sm:min-h-0 sm:my-auto sm:max-h-[88vh] overflow-y-auto">
          {/* Top Modal Controls (Screen Only) */}
          <div className="flex items-center justify-between no-print border-b border-slate-800 pb-3 sticky top-0 bg-slate-900 z-40 pt-2 sm:pt-0">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm sm:text-base font-bold text-white">POS Thermal Receipt & Invoice Preview</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable Area (Thermal Receipt Roll 80mm Layout) */}
          <div ref={receiptRef} className="print-area bg-white text-black p-4 sm:p-5 rounded-xl font-mono text-[12px] leading-snug shadow-inner space-y-3 border border-gray-200">
            {/* Header */}
            <div className="text-center pb-2 border-b-2 border-dashed border-black space-y-1">
              <h1 className="font-extrabold text-base sm:text-lg uppercase tracking-wider text-black">{profile.shop_name}</h1>
              <p className="text-[11px] font-semibold text-black">{profile.address}</p>
              <p className="text-[11px] font-semibold text-black">Tel: {profile.phone}</p>
              <p className="text-[10px] text-gray-800">Email: {profile.email}</p>
            </div>

            {/* Document Title & Number */}
            <div className="text-center py-1 bg-gray-100 border-y border-black font-extrabold text-xs uppercase tracking-widest text-black">
              {invoice ? 'TAX INVOICE / RECEIPT' : 'REPAIR SERVICE JOB TICKET'}
            </div>

            {/* Receipt Info Grid */}
            <div className="grid grid-cols-2 text-[11px] py-1 border-b border-dashed border-gray-400 gap-1 text-black">
              <div>
                <p><span className="font-bold">Doc No:</span> {docNo}</p>
                <p><span className="font-bold">Cust:</span> {targetJob?.customer_name || invoice?.customer_name || 'Customer'}</p>
                <p><span className="font-bold">Phone:</span> {targetJob?.phone_number || invoice?.phone_number || '-'}</p>
              </div>
              <div className="text-right">
                <p><span className="font-bold">Date:</span> {createdDate.toLocaleDateString()}</p>
                <p><span className="font-bold">Time:</span> {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <p><span className="font-bold">Tech:</span> {targetJob?.assigned_technician_name || 'Staff'}</p>
              </div>
            </div>

            {/* Machine Info */}
            {targetJob && (
              <div className="p-2 bg-gray-100 rounded border border-gray-300 text-[11px] space-y-0.5 text-black">
                <div className="flex justify-between font-bold">
                  <span>{targetJob.machine_category}</span>
                  <span>{targetJob.brand_model}</span>
                </div>
                {targetJob.serial_number && <p className="text-[10px] text-gray-700">S/N: {targetJob.serial_number}</p>}
                <p className="text-[10px] text-gray-800"><span className="font-bold">Fault:</span> {targetJob.reported_fault}</p>
              </div>
            )}

            {/* Line Items Table */}
            <div className="py-1">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black font-bold uppercase text-[10px] text-black">
                    <th className="py-1">Item / Description</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Price</th>
                    <th className="py-1 text-right">Total ({currencyStr})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-black">
                  {parts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-1.5 text-center text-gray-500 italic text-[10px]">
                        (No Spare Parts Charged)
                      </td>
                    </tr>
                  ) : (
                    parts.map((p, idx) => (
                      <tr key={p.id || idx}>
                        <td className="py-1 text-black font-medium">{p.part_name}</td>
                        <td className="py-1 text-center">{p.quantity}</td>
                        <td className="py-1 text-right">{p.unit_price.toLocaleString()}</td>
                        <td className="py-1 text-right font-bold">{p.total_price.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                  <tr className="border-t border-gray-300">
                    <td className="py-1.5 font-bold text-black" colSpan={3}>Service & Labor Charge</td>
                    <td className="py-1.5 text-right font-bold">{labor.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="border-t-2 border-dashed border-black pt-2 space-y-1 text-right text-[11px] text-black">
              <div className="flex justify-between">
                <span>Gross Subtotal:</span>
                <span className="font-bold">{currencyStr} {subtotal.toLocaleString()}</span>
              </div>

              {deposit > 0 && (
                <div className="flex justify-between font-bold text-black">
                  <span>Advance Deposit Paid:</span>
                  <span>- {currencyStr} {deposit.toLocaleString()}</span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex justify-between font-bold text-black">
                  <span>Discount Allowed:</span>
                  <span>- {currencyStr} {discount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between font-extrabold text-sm sm:text-base border-t-2 border-black pt-1.5 mt-1 text-black">
                <span>NET PAYABLE:</span>
                <span>{currencyStr} {netPayable.toLocaleString()}</span>
              </div>

              {invoice && (
                <div className="flex justify-between text-[10px] pt-1 text-gray-800">
                  <span>Payment Mode:</span>
                  <span className="font-extrabold uppercase">{invoice.payment_method} (PAID)</span>
                </div>
              )}
            </div>

            {/* Terms & Barcode Visual */}
            <div className="text-center text-[10px] border-t border-dashed border-black pt-3 space-y-2 text-black">
              <p className="font-bold">{profile.receipt_footer_note || '*** THANK YOU FOR YOUR BUSINESS ***'}</p>
              <p className="text-[9px] text-gray-700">{profile.receipt_terms || '30-day warranty applies to replaced parts with this original receipt.'}</p>

              {/* Barcode Visual */}
              <div className="pt-1 flex flex-col items-center justify-center">
                <div className="font-mono text-sm tracking-[0.25em] font-extrabold text-black selection:bg-none">
                  |||||| | |||| ||| ||||||| ||| |||
                </div>
                <span className="text-[9px] text-gray-600 font-mono mt-0.5">{docNo}</span>
              </div>

              <div className="flex justify-between pt-5 text-[9px] text-gray-600">
                <span className="border-t border-gray-600 px-2">Customer Signature</span>
                <span className="border-t border-gray-600 px-2">Authorized Stamp</span>
              </div>
            </div>
          </div>

          {/* Action Controls (Screen Only) */}
          <div className="no-print flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800 sticky bottom-0 bg-slate-900 z-40 pb-4 sm:pb-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => setIsShareHubOpen(true)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-950 border border-amber-800 hover:bg-amber-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <span>Share Receipt</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-900/50 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Embedded 3-Way Failproof Receipt Share Hub */}
      <ReceiptShareModal
        isOpen={isShareHubOpen}
        onClose={() => setIsShareHubOpen(false)}
        invoice={invoice}
        jobCard={jobCard}
      />
    </>
  );

  return createPortal(modalContent, document.body);
}
