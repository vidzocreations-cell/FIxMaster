'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit3, User, Phone, DollarSign, CreditCard, Save } from 'lucide-react';
import { Invoice, PaymentMethod } from '@/lib/types';
import { getStoredInvoices, saveStoredInvoices, getStoredJobs, saveStoredJobs } from '@/lib/supabase';

interface InvoiceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceToEdit: Invoice | null;
  onSaved: () => void;
}

export default function InvoiceEditModal({ isOpen, onClose, invoiceToEdit, onSaved }: InvoiceEditModalProps) {
  const [mounted, setMounted] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [subtotal, setSubtotal] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [netPayable, setNetPayable] = useState<number | ''>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (invoiceToEdit) {
      setCustomerName(invoiceToEdit.customer_name);
      setPhoneNumber(invoiceToEdit.phone_number);
      setPaymentMethod(invoiceToEdit.payment_method || 'Cash');
      setSubtotal(invoiceToEdit.subtotal);
      setDiscount(invoiceToEdit.discount ? invoiceToEdit.discount : '');
      setNetPayable(invoiceToEdit.net_payable);
    }
  }, [invoiceToEdit, isOpen]);

  if (!isOpen || !mounted || !invoiceToEdit) return null;

  const handleSubtotalDiscountChange = (newSub: number | '', newDisc: number | '') => {
    setSubtotal(newSub);
    setDiscount(newDisc);
    const subNum = Number(newSub) || 0;
    const discNum = Number(newDisc) || 0;
    setNetPayable(Math.max(0, subNum - discNum));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const invoices = getStoredInvoices();
    const subNum = Number(subtotal) || 0;
    const discNum = Number(discount) || 0;
    const netNum = Number(netPayable) || Math.max(0, subNum - discNum);

    const updatedInvoices = invoices.map((inv) => {
      if (inv.id === invoiceToEdit.id || inv.invoice_no === invoiceToEdit.invoice_no) {
        return {
          ...inv,
          customer_name: customerName,
          phone_number: phoneNumber,
          payment_method: paymentMethod,
          subtotal: subNum,
          discount: discNum,
          net_payable: netNum,
          job_card: inv.job_card
            ? {
                ...inv.job_card,
                customer_name: customerName,
                phone_number: phoneNumber,
              }
            : undefined,
        };
      }
      return inv;
    });

    await saveStoredInvoices(updatedInvoices);

    // Also update associated job card if found
    if (invoiceToEdit.job_card_id) {
      const jobs = getStoredJobs();
      const updatedJobs = jobs.map((j) => {
        if (j.id === invoiceToEdit.job_card_id || j.customer_name === invoiceToEdit.customer_name) {
          return {
            ...j,
            customer_name: customerName,
            phone_number: phoneNumber,
          };
        }
        return j;
      });
      await saveStoredJobs(updatedJobs);
    }

    onSaved();
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-150 p-0 sm:p-6 flex items-start sm:items-center justify-center min-h-screen">
      <div className="w-full max-w-lg bg-slate-900 sm:rounded-2xl border-0 sm:border border-slate-800 p-4 sm:p-6 space-y-4 shadow-2xl relative min-h-screen sm:min-h-0 sm:my-auto sm:max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 sticky top-0 bg-slate-900 z-40 pt-2 sm:pt-0">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Edit Invoice ({invoiceToEdit.invoice_no})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pb-12 sm:pb-0 text-xs">
          {/* Customer Name */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Customer Full Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Phone Number & Payment Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Mobile Payment">Mobile Payment (EzCash / Koko)</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Subtotal, Discount & Net Payable Box */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="font-bold text-cyan-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" /> Invoice Financial Adjustments
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Gross Subtotal (LKR)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={subtotal}
                  onChange={(e) => handleSubtotalDiscountChange(e.target.value === '' ? '' : Number(e.target.value), discount)}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-red-400 mb-1">Discount (LKR)</label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => handleSubtotalDiscountChange(subtotal, e.target.value === '' ? '' : Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-red-400 font-mono focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-emerald-400 mb-1">Net Payable (LKR)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={netPayable}
                  onChange={(e) => setNetPayable(e.target.value === '' ? '' : Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-slate-900 border border-emerald-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 sticky bottom-0 bg-slate-900 z-40 pb-4 sm:pb-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 bg-slate-950 border border-slate-800 hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/50 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Invoice Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
