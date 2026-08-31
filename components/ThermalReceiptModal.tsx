'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, MessageSquare, Share2, Copy, Check } from 'lucide-react';
import { Invoice, JobCard, BusinessProfile, JobPart } from '@/lib/types';
import { getStoredJobs } from '@/lib/supabase';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  jobCard?: JobCard | null;
  profile: BusinessProfile;
}

export default function ThermalReceiptModal({ isOpen, onClose, invoice, jobCard, profile }: ThermalReceiptModalProps) {
  const [copiedText, setCopiedText] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || typeof window === 'undefined') return null;

  const handlePrint = () => {
    window.print();
  };

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
      setTimeout(() => setCopiedText(false), 3000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
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
  const customerPhone = targetJob?.phone_number || invoice?.phone_number || '';
  const customerName = targetJob?.customer_name || invoice?.customer_name || 'Customer';

  let cleanPhone = customerPhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '94' + cleanPhone.substring(1);
  }

  let partsSummaryText = parts.length > 0
    ? parts.map((p) => `• ${p.part_name} (x${p.quantity}) - ${currencyStr} ${p.total_price.toLocaleString()}`).join('\n')
    : '(No Spare Parts Charged)';

  const formattedBillText = 
`🧾 *${(profile.shop_name || 'FixMaster Repair Center').toUpperCase()}*
${profile.address ? profile.address + '\n' : ''}Tel: ${profile.phone || '-'}
----------------------------------
*${invoice ? 'TAX INVOICE / RECEIPT' : 'REPAIR SERVICE TICKET'}*
Doc No : ${docNo}
Date   : ${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
Cust   : ${customerName} (${customerPhone})
${invoice ? `Payment: ${invoice.payment_method}\n` : ''}----------------------------------
*ITEMS & REPAIR CHARGES:*
${partsSummaryText}
• Labor Charge: ${currencyStr} ${labor.toLocaleString()}
${deposit > 0 ? `• Advance Deposit: - ${currencyStr} ${deposit.toLocaleString()}\n` : ''}${discount > 0 ? `• Discount Allowed: - ${currencyStr} ${discount.toLocaleString()}\n` : ''}----------------------------------
*NET PAID: ${currencyStr} ${netPayable.toLocaleString()}*
----------------------------------
*** THANK YOU FOR YOUR BUSINESS ***`;

  const whatsappDirectUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(formattedBillText)}`;

  const modalContent = (
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

          {/* Machine Info / Multi-Job Consolidated Items */}
          {invoice?.is_consolidated && invoice?.job_cards && invoice.job_cards.length > 0 ? (
            <div className="space-y-4 py-1">
              <div className="p-1.5 bg-gray-200 font-extrabold text-[11px] text-center uppercase tracking-wider rounded border border-gray-400">
                CONSOLIDATED MASTER BILL ({invoice.job_cards.length} MACHINES REPAIRED)
              </div>
              {invoice.job_cards.map((jCard, jIdx) => {
                const jParts = jCard.parts || [];
                const jLabor = jCard.labor_charge || 0;
                const jDeposit = jCard.advance_deposit || 0;
                const jPartsSum = jParts.reduce((a, b) => a + b.total_price, 0);
                const jMachineNet = Math.max(0, jPartsSum + jLabor - jDeposit);

                return (
                  <div key={jCard.id || jIdx} className="p-2.5 bg-gray-50 rounded-lg border border-gray-400 text-[11px] space-y-1.5 text-black">
                    <div className="flex justify-between font-black border-b border-black pb-1 text-[11px]">
                      <span>{jCard.job_no}: {jCard.machine_category}</span>
                      <span>{jCard.brand_model}</span>
                    </div>

                    <div className="text-[10px] space-y-0.5 text-gray-800">
                      {jCard.serial_number && <p><span className="font-bold">S/N:</span> {jCard.serial_number}</p>}
                      <p><span className="font-bold">Fault / Note:</span> {jCard.reported_fault}</p>
                    </div>

                    {/* Machine Spare Parts List */}
                    <div className="pt-1">
                      <p className="font-bold text-[10px] uppercase tracking-wider text-black border-b border-gray-300 pb-0.5">Parts & Materials Used:</p>
                      {jParts.length === 0 ? (
                        <p className="text-[10px] text-gray-500 italic py-0.5">(No Spare Parts Charged)</p>
                      ) : (
                        <div className="divide-y divide-gray-200 text-[10px]">
                          {jParts.map((p, pIdx) => (
                            <div key={pIdx} className="flex justify-between py-0.5 text-black">
                              <span>• {p.part_name} (x{p.quantity})</span>
                              <span className="font-bold">{currencyStr} {p.total_price.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Machine Charges & Deposit */}
                    <div className="border-t border-gray-300 pt-1 space-y-0.5 text-[10px]">
                      <div className="flex justify-between font-semibold text-gray-800">
                        <span>Service & Labor Charge:</span>
                        <span>{currencyStr} {jLabor.toLocaleString()}</span>
                      </div>
                      {jDeposit > 0 && (
                        <div className="flex justify-between font-bold text-gray-900">
                          <span>Advance Deposit Paid:</span>
                          <span>- {currencyStr} {jDeposit.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-extrabold text-[11px] text-black border-t border-dashed border-gray-400 pt-0.5 mt-0.5">
                        <span>Machine Total Net:</span>
                        <span>{currencyStr} {jMachineNet.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {/* Single Machine Info */}
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
            </>
          )}

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
        <div className="no-print space-y-3 pt-3 border-t border-slate-800 sticky bottom-0 bg-slate-900 z-40 pb-4 sm:pb-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <a
              href={whatsappDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(formattedBillText);
                }
              }}
              className="py-2.5 px-3 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer text-center decoration-0 active:scale-95"
            >
              <MessageSquare className="w-4 h-4 text-white" />
              <span>Share WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleCopyText}
              className="py-2.5 px-3 rounded-xl text-xs font-extrabold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer active:scale-95"
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
              <span>{copiedText ? '✓ Copied!' : 'Copy Bill Text'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-900/50 transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" /> Print Receipt
            </button>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="py-1 px-3 rounded-lg text-slate-400 hover:text-white bg-slate-950 border border-slate-800 font-semibold cursor-pointer"
            >
              Close Modal
            </button>
            <a
              href="/sales"
              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer text-xs"
            >
              View in Sales History ➔
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
