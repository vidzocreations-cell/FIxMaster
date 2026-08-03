'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit3, User, Phone, DollarSign, CreditCard, Save, Package, Plus, Trash2 } from 'lucide-react';
import { Invoice, PaymentMethod, JobPart } from '@/lib/types';
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
  const [partsList, setPartsList] = useState<JobPart[]>([]);
  const [laborCharge, setLaborCharge] = useState<number | ''>(0);
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

      // Load parts from invoice or associated job card
      const targetJob = invoiceToEdit.job_card;
      let initialParts: JobPart[] = targetJob?.parts || [];

      if (initialParts.length === 0 && targetJob?.ext_part_name) {
        const sPrice = targetJob.ext_selling_price || targetJob.ext_cost_price || 0;
        initialParts = [
          {
            id: 'jp-ext-' + Date.now(),
            job_card_id: targetJob.id || '',
            part_id: 'ext-part',
            part_name: `${targetJob.ext_part_name} (Outside Shop)`,
            quantity: 1,
            unit_price: sPrice,
            total_price: sPrice,
            cost_price: targetJob.ext_cost_price || 0,
            margin_percent: 0,
            is_external: true,
          },
        ];
      }

      setPartsList(initialParts);
      const lCharge = targetJob?.labor_charge || 0;
      setLaborCharge(lCharge);

      const discVal = invoiceToEdit.discount ? invoiceToEdit.discount : '';
      setDiscount(discVal);

      const partsTotal = initialParts.reduce((a, b) => a + b.total_price, 0);
      const computedSub = partsTotal + lCharge;
      setSubtotal(invoiceToEdit.subtotal || computedSub);
      setNetPayable(invoiceToEdit.net_payable || Math.max(0, computedSub - Number(discVal)));
    }
  }, [invoiceToEdit, isOpen]);

  if (!isOpen || !mounted || !invoiceToEdit) return null;

  // Auto-recalculate subtotal & net payable when parts or prices change
  const updateFinancials = (updatedParts: JobPart[], currentLabor: number | '', currentDisc: number | '') => {
    const partsSum = updatedParts.reduce((acc, p) => acc + p.total_price, 0);
    const laborNum = Number(currentLabor) || 0;
    const newSub = partsSum + laborNum;
    const discNum = Number(currentDisc) || 0;
    const newNet = Math.max(0, newSub - discNum);

    setPartsList(updatedParts);
    setLaborCharge(currentLabor);
    setSubtotal(newSub);
    setDiscount(currentDisc);
    setNetPayable(newNet);
  };

  const handlePartNameChange = (index: number, name: string) => {
    const copy = [...partsList];
    copy[index] = { ...copy[index], part_name: name };
    updateFinancials(copy, laborCharge, discount);
  };

  const handlePartQtyChange = (index: number, qtyVal: number | '') => {
    const copy = [...partsList];
    const qtyNum = Number(qtyVal) || 0;
    const unitPrice = copy[index].unit_price || 0;
    copy[index] = {
      ...copy[index],
      quantity: qtyNum,
      total_price: qtyNum * unitPrice,
    };
    updateFinancials(copy, laborCharge, discount);
  };

  const handlePartPriceChange = (index: number, priceVal: number | '') => {
    const copy = [...partsList];
    const unitPrice = Number(priceVal) || 0;
    const qtyNum = copy[index].quantity || 1;
    copy[index] = {
      ...copy[index],
      unit_price: unitPrice,
      total_price: qtyNum * unitPrice,
    };
    updateFinancials(copy, laborCharge, discount);
  };

  const handleRemovePart = (index: number) => {
    const copy = partsList.filter((_, i) => i !== index);
    updateFinancials(copy, laborCharge, discount);
  };

  const handleAddNewPartRow = () => {
    const newPartItem: JobPart = {
      id: 'jp-custom-' + Date.now(),
      job_card_id: invoiceToEdit.job_card_id || '',
      part_id: 'custom-' + Date.now(),
      part_name: 'New Part Item',
      quantity: 1,
      unit_price: 500,
      total_price: 500,
      cost_price: 0,
      margin_percent: 0,
    };
    updateFinancials([...partsList, newPartItem], laborCharge, discount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const invoices = getStoredInvoices();
    const subNum = Number(subtotal) || 0;
    const discNum = Number(discount) || 0;
    const netNum = Number(netPayable) || Math.max(0, subNum - discNum);
    const laborNum = Number(laborCharge) || 0;

    const updatedJobCard = invoiceToEdit.job_card
      ? {
          ...invoiceToEdit.job_card,
          customer_name: customerName,
          phone_number: phoneNumber,
          labor_charge: laborNum,
          parts: partsList,
          total_amount: subNum,
        }
      : undefined;

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
          job_card: updatedJobCard,
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
            labor_charge: laborNum,
            parts: partsList,
            total_amount: subNum,
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
      <div className="w-full max-w-2xl bg-slate-900 sm:rounded-2xl border-0 sm:border border-slate-800 p-4 sm:p-6 space-y-4 shadow-2xl relative min-h-screen sm:min-h-0 sm:my-auto sm:max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 sticky top-0 bg-slate-900 z-40 pt-2 sm:pt-0">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Edit Receipt & Itemized Prices ({invoiceToEdit.invoice_no})
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

          {/* Itemized Parts & Prices Table */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Package className="w-4 h-4" /> Itemized Spare Parts & Retail Prices (කොටස්වල මිල වෙනස් කරන්න)
              </h3>
              <button
                type="button"
                onClick={handleAddNewPartRow}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-cyan-300 bg-cyan-950 border border-cyan-800 hover:bg-cyan-900 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>

            <div className="space-y-2">
              {partsList.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-[11px] italic">
                  No spare parts items on this invoice. Click &apos;+ Add Item&apos; to add parts.
                </div>
              ) : (
                partsList.map((p, idx) => (
                  <div key={p.id || idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={p.part_name}
                        onChange={(e) => handlePartNameChange(idx, e.target.value)}
                        placeholder="Part Name"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={p.quantity}
                        onChange={(e) => handlePartQtyChange(idx, e.target.value === '' ? '' : Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        placeholder="Qty"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-center text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        value={p.unit_price}
                        onChange={(e) => handlePartPriceChange(idx, e.target.value === '' ? '' : Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        placeholder="Unit Price"
                        className="w-full bg-slate-950 border border-emerald-800 rounded-lg px-2 py-1 text-emerald-400 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <span className="font-mono text-[11px] text-emerald-400 font-bold hidden sm:inline">
                        LKR {p.total_price.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePart(idx)}
                        className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Subtotal, Labor, Discount & Net Payable Box */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="font-bold text-emerald-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" /> Labor & Final Financial Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Labor Fee (LKR)</label>
                <input
                  type="number"
                  min="0"
                  value={laborCharge}
                  onChange={(e) => updateFinancials(partsList, e.target.value === '' ? '' : Number(e.target.value), discount)}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Subtotal (LKR)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={subtotal}
                  onChange={(e) => {
                    const newSub = e.target.value === '' ? '' : Number(e.target.value);
                    setSubtotal(newSub);
                    setNetPayable(Math.max(0, (Number(newSub) || 0) - (Number(discount) || 0)));
                  }}
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
                  onChange={(e) => updateFinancials(partsList, laborCharge, e.target.value === '' ? '' : Number(e.target.value))}
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
              <Save className="w-4 h-4" /> Save Receipt & Parts Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
