'use client';

import React from 'react';
import { X, Printer, CheckCircle, Wrench, Phone, MapPin } from 'lucide-react';
import { Invoice, JobCard, BusinessProfile } from '@/lib/types';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  jobCard?: JobCard | null;
  profile: BusinessProfile;
}

export default function ThermalReceiptModal({ isOpen, onClose, invoice, jobCard, profile }: ThermalReceiptModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const targetJob = jobCard || invoice?.job_card;
  const parts = targetJob?.parts || [];
  const labor = targetJob?.labor_charge || 0;
  const deposit = targetJob?.advance_deposit || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between no-print border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Printer className="w-4 h-4 text-cyan-400" /> Printable Receipt Preview
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area */}
        <div className="print-area bg-white text-black p-6 rounded-xl font-mono text-xs shadow-md space-y-4">
          {/* Header */}
          <div className="text-center border-b border-dashed border-gray-300 pb-4 space-y-1">
            <h1 className="font-extrabold text-base uppercase tracking-wider">{profile.shop_name}</h1>
            <p className="text-[11px] text-gray-600 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" /> {profile.address}
            </p>
            <p className="text-[11px] text-gray-600 flex items-center justify-center gap-1">
              <Phone className="w-3 h-3" /> {profile.phone}
            </p>
          </div>

          {/* Ticket / Invoice Metadata */}
          <div className="flex justify-between text-[11px] text-gray-700 py-1 border-b border-gray-200">
            <div>
              <p><span className="font-bold">Doc #:</span> {invoice ? invoice.invoice_no : targetJob?.job_no}</p>
              <p><span className="font-bold">Customer:</span> {targetJob?.customer_name || invoice?.customer_name}</p>
              <p><span className="font-bold">Phone:</span> {targetJob?.phone_number || invoice?.phone_number}</p>
            </div>
            <div className="text-right">
              <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString()}</p>
              <p><span className="font-bold">Category:</span> {targetJob?.machine_category}</p>
              <p><span className="font-bold">Model:</span> {targetJob?.brand_model}</p>
            </div>
          </div>

          {/* Machine & Fault Details */}
          {targetJob && (
            <div className="bg-gray-50 p-2 rounded border border-gray-200 text-[11px]">
              <p className="font-bold text-gray-900">Reported Fault:</p>
              <p className="text-gray-700">{targetJob.reported_fault}</p>
              {targetJob.serial_number && <p className="text-[10px] text-gray-500 mt-1">Serial: {targetJob.serial_number}</p>}
            </div>
          )}

          {/* Items Breakdown Table */}
          <table className="w-full text-[11px] text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-300 font-bold text-gray-700">
                <th className="py-1">Description</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Price</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {parts.map((p) => (
                <tr key={p.id}>
                  <td className="py-1 text-gray-800">{p.part_name}</td>
                  <td className="py-1 text-center">{p.quantity}</td>
                  <td className="py-1 text-right">{p.unit_price.toLocaleString()}</td>
                  <td className="py-1 text-right font-semibold">{p.total_price.toLocaleString()}</td>
                </tr>
              ))}
              <tr>
                <td className="py-1 font-semibold text-gray-800" colSpan={3}>Service & Labor Charge</td>
                <td className="py-1 text-right font-semibold">{labor.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          {/* Summary Financials */}
          <div className="border-t border-dashed border-gray-300 pt-3 space-y-1 text-right font-mono text-[11px]">
            {parts.length > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Spare Parts Total:</span>
                <span>LKR {parts.reduce((a, b) => a + b.total_price, 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Labor Charge:</span>
              <span>LKR {labor.toLocaleString()}</span>
            </div>
            {deposit > 0 && (
              <div className="flex justify-between text-amber-700 font-semibold">
                <span>Advance Deposit Paid:</span>
                <span>- LKR {deposit.toLocaleString()}</span>
              </div>
            )}
            {invoice && invoice.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount Applied:</span>
                <span>- LKR {invoice.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm text-gray-900 border-t border-gray-300 pt-2">
              <span>NET PAYABLE:</span>
              <span>LKR {(invoice ? invoice.net_payable : (targetJob?.total_amount || 0) - deposit).toLocaleString()}</span>
            </div>
            {invoice && (
              <div className="flex justify-between text-gray-500 text-[10px] pt-1">
                <span>Payment Mode:</span>
                <span className="font-bold">{invoice.payment_method}</span>
              </div>
            )}
          </div>

          {/* Footer Note & Signatures */}
          <div className="text-center text-[10px] text-gray-500 border-t border-dashed border-gray-300 pt-3 space-y-3">
            <p>Thank you for choosing {profile.shop_name}!</p>
            <p className="italic">Warranty applicable only on replaced parts with original receipt within 30 days.</p>
            
            <div className="flex justify-between pt-6 text-[9px] text-gray-400">
              <span className="border-t border-gray-400 px-3">Customer Signature</span>
              <span className="border-t border-gray-400 px-3">Authorized Stamp / Sign</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="no-print flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-xs text-slate-400 bg-slate-800 hover:text-white transition-all cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/50 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
