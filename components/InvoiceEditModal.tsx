'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit3, User, Phone, DollarSign, CreditCard, Save, Package, Plus, Trash2, Tag, RotateCcw, Building2 } from 'lucide-react';
import { Invoice, PaymentMethod, JobPart, Part, JobCard } from '@/lib/types';
import { getStoredInvoices, saveStoredInvoices, getStoredJobs, saveStoredJobs, getStoredParts, deleteStoredInvoice } from '@/lib/supabase';

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
  const [catalogParts, setCatalogParts] = useState<Part[]>([]);
  const [selectedCatalogPartId, setSelectedCatalogPartId] = useState('');
  const [laborCharge, setLaborCharge] = useState<number | ''>(0);
  const [subtotal, setSubtotal] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [netPayable, setNetPayable] = useState<number | ''>('');
  
  // Linked Jobs for Multi-Job Master Invoice
  const [linkedJobCards, setLinkedJobCards] = useState<JobCard[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (invoiceToEdit) {
      setCustomerName(invoiceToEdit.customer_name);
      setPhoneNumber(invoiceToEdit.phone_number);
      setPaymentMethod(invoiceToEdit.payment_method || 'Cash');

      // Load catalog parts
      const availableCatalog = getStoredParts();
      setCatalogParts(availableCatalog);

      // Check if consolidated master invoice with linked jobs
      if (invoiceToEdit.job_cards && invoiceToEdit.job_cards.length > 0) {
        setLinkedJobCards(invoiceToEdit.job_cards);
      } else {
        setLinkedJobCards([]);
      }

      // Load matching job card to extract parts
      const allJobs = getStoredJobs();
      const targetJob =
        allJobs.find((j) => (invoiceToEdit.job_card_id && j.id === invoiceToEdit.job_card_id) || j.customer_name === invoiceToEdit.customer_name) ||
        invoiceToEdit.job_card;

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
      const finalSub = invoiceToEdit.subtotal || computedSub;
      setSubtotal(finalSub);
      setNetPayable(invoiceToEdit.net_payable || Math.max(0, finalSub - Number(discVal)));
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

  const handleUnlinkJobReturnToPOS = async (jobId: string, jobNo: string) => {
    if (
      confirm(
        `Are you sure you want to remove Job ${jobNo} from this master invoice and return it back to POS Completed status?`
      )
    ) {
      // 1. Update job card status from Delivered BACK to Completed!
      const allJobs = getStoredJobs();
      const updatedJobs = allJobs.map((j) => {
        if (j.id === jobId || j.job_no === jobNo) {
          return {
            ...j,
            status: 'Completed' as const,
            updated_at: new Date().toISOString(),
          };
        }
        return j;
      });
      await saveStoredJobs(updatedJobs);

      // 2. Remove job from linkedJobCards array
      const remainingJobs = linkedJobCards.filter((j) => j.id !== jobId && j.job_no !== jobNo);
      setLinkedJobCards(remainingJobs);

      // 3. Recalculate Master Invoice Subtotal & Net Payable
      const newPartsSum = remainingJobs.reduce((acc, j) => {
        const pTotal = j.parts ? j.parts.reduce((a, b) => a + b.total_price, 0) : 0;
        return acc + pTotal;
      }, 0);
      const newLaborSum = remainingJobs.reduce((acc, j) => acc + (j.labor_charge || 0), 0);
      const newDepositSum = remainingJobs.reduce((acc, j) => acc + (j.advance_deposit || 0), 0);
      const newSubtotal = newPartsSum + newLaborSum;
      const discNum = Number(discount) || 0;
      const newNetPayable = Math.max(0, newSubtotal - newDepositSum - discNum);

      setSubtotal(newSubtotal);
      setNetPayable(newNetPayable);

      // 4. Update the Invoice in LocalStorage & Supabase Cloud
      const invoices = getStoredInvoices();
      if (remainingJobs.length === 0) {
        // If all jobs were unlinked/returned, delete the master invoice completely!
        await deleteStoredInvoice(invoiceToEdit.id, invoiceToEdit.invoice_no);
        alert(`✓ All jobs returned to POS. Master Invoice ${invoiceToEdit.invoice_no} has been closed.`);
        onSaved();
        onClose();
        return;
      } else {
        const updatedInvoices = invoices.map((inv) => {
          if (inv.id === invoiceToEdit.id || inv.invoice_no === invoiceToEdit.invoice_no) {
            return {
              ...inv,
              subtotal: newSubtotal,
              net_payable: newNetPayable,
              job_cards: remainingJobs,
            };
          }
          return inv;
        });
        await saveStoredInvoices(updatedInvoices);
        alert(`✓ Job ${jobNo} has been returned to POS Completed list! Master invoice total updated.`);
        onSaved();
      }
    }
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
      id: 'jp-custom-' + Date.now() + Math.random(),
      job_card_id: invoiceToEdit.job_card_id || '',
      part_id: 'custom-' + Date.now(),
      part_name: 'Spare Part Item',
      quantity: 1,
      unit_price: 1000,
      total_price: 1000,
      cost_price: 0,
      margin_percent: 0,
    };
    updateFinancials([...partsList, newPartItem], laborCharge, discount);
  };

  const handleAddCatalogPartSelect = (partId: string) => {
    if (!partId) return;
    const selected = catalogParts.find((p) => p.id === partId);
    if (!selected) return;

    const newPartItem: JobPart = {
      id: 'jp-cat-' + Date.now() + Math.random(),
      job_card_id: invoiceToEdit.job_card_id || '',
      part_id: selected.id,
      part_name: selected.part_name,
      quantity: 1,
      unit_price: selected.retail_price,
      total_price: selected.retail_price,
      cost_price: selected.cost_price,
      margin_percent: selected.margin_percent,
    };

    updateFinancials([...partsList, newPartItem], laborCharge, discount);
    setSelectedCatalogPartId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const invoices = getStoredInvoices();
    const subNum = Number(subtotal) || 0;
    const discNum = Number(discount) || 0;
    const netNum = Number(netPayable) || Math.max(0, subNum - discNum);
    const laborNum = Number(laborCharge) || 0;

    const allJobs = getStoredJobs();
    const targetJob =
      allJobs.find((j) => (invoiceToEdit.job_card_id && j.id === invoiceToEdit.job_card_id) || j.customer_name === invoiceToEdit.customer_name) ||
      invoiceToEdit.job_card;

    const updatedJobCard = targetJob
      ? {
          ...targetJob,
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
          job_cards: linkedJobCards.length > 0 ? linkedJobCards : inv.job_cards,
        };
      }
      return inv;
    });

    await saveStoredInvoices(updatedInvoices);

    // Also update associated job card if found
    if (targetJob) {
      const updatedJobs = allJobs.map((j) => {
        if (j.id === targetJob.id || j.customer_name === invoiceToEdit.customer_name) {
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

        {/* Linked Jobs Unlink / Return-to-POS Section */}
        {linkedJobCards.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-400" /> Linked Jobs in Master Invoice ({linkedJobCards.length} Jobs):
              </span>
              <span className="text-[10px] text-slate-400">
                Accidentally added job? Click Return to POS to un-link it!
              </span>
            </div>

            <div className="space-y-2">
              {linkedJobCards.map((jCard, index) => {
                const jParts = jCard.parts ? jCard.parts.reduce((a, b) => a + b.total_price, 0) : 0;
                const jLabor = jCard.labor_charge || 0;
                const jDep = jCard.advance_deposit || 0;
                const jNet = Math.max(0, jParts + jLabor - jDep);

                return (
                  <div key={jCard.id || index} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="font-mono text-cyan-400">{jCard.job_no}</span>
                        <span>{jCard.machine_category} - {jCard.brand_model}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono pt-0.5">
                        Parts: LKR {jParts.toLocaleString()} | Labor: LKR {jLabor.toLocaleString()} | Net: LKR {jNet.toLocaleString()}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnlinkJobReturnToPOS(jCard.id, jCard.job_no)}
                      className="py-1.5 px-3 rounded-lg text-xs font-extrabold text-amber-300 bg-amber-950 border border-amber-800 hover:bg-amber-900 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 shrink-0"
                      title="Remove job from master bill and return back to POS Completed list"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>↩️ Return Job to POS</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pb-12 sm:pb-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none cursor-pointer font-semibold"
            >
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Mobile Payment">Mobile Payment</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          {/* Itemized Parts Section */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-cyan-400" /> Itemized Spare Parts & Services
              </span>
              <button
                type="button"
                onClick={handleAddNewPartRow}
                className="py-1 px-2.5 rounded-lg text-xs font-bold text-cyan-400 bg-cyan-950 border border-cyan-800 hover:bg-cyan-900 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom Row
              </button>
            </div>

            {/* Catalog Dropdown Quick Add */}
            {catalogParts.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400 shrink-0">Quick Add Catalog Part:</span>
                <select
                  value={selectedCatalogPartId}
                  onChange={(e) => handleAddCatalogPartSelect(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose spare part from catalog --</option>
                  {catalogParts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.part_name} (Stock: {p.stock_quantity}) - LKR {p.retail_price.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Parts Table */}
            <div className="space-y-2 pt-2">
              {partsList.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-2">(No spare parts attached)</p>
              ) : (
                partsList.map((part, index) => (
                  <div key={part.id || index} className="grid grid-cols-12 gap-2 items-center text-xs bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={part.part_name}
                        onChange={(e) => handlePartNameChange(index, e.target.value)}
                        placeholder="Part name"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={part.quantity}
                        onChange={(e) => handlePartQtyChange(index, e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Qty"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-center font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        value={part.unit_price}
                        onChange={(e) => handlePartPriceChange(index, e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Unit Price"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-right font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-1 pl-1">
                      <span className="font-mono font-bold text-emerald-400 text-[11px]">
                        LKR {part.total_price.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePart(index)}
                        className="p-1 rounded text-red-400 hover:text-white bg-red-950 hover:bg-red-900 transition-all cursor-pointer"
                        title="Remove part item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Labor & Financial Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Labor Charge (LKR)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-emerald-500 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="0"
                  value={laborCharge}
                  onChange={(e) => updateFinancials(partsList, e.target.value === '' ? '' : Number(e.target.value), discount)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Discount Allowed (LKR)</label>
              <div className="relative">
                <Tag className="w-4 h-4 text-amber-500 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => updateFinancials(partsList, laborCharge, e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-amber-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Subtotal & Net Payable Banner */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block">Subtotal (Parts + Labor):</span>
              <span className="font-mono font-bold text-slate-200">LKR {Number(subtotal || 0).toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-emerald-400 font-bold block">Net Payable Balance:</span>
              <span className="text-base font-mono font-black text-emerald-400">LKR {Number(netPayable || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Modal Actions */}
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
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/50 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" /> Save Receipt Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
