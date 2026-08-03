'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CreditCard, CheckCircle2, DollarSign, Percent, Printer, ShoppingCart, User, Phone, Wrench, ArrowRight } from 'lucide-react';
import { getStoredJobs, saveStoredJobs, getStoredInvoices, saveStoredInvoices, getStoredProfile } from '@/lib/supabase';
import { JobCard, Invoice, PaymentMethod } from '@/lib/types';
import ThermalReceiptModal from '@/components/ThermalReceiptModal';

export default function POSPage() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadData = () => {
    const allJobs = getStoredJobs();
    // Billing terminal presents Completed or In Progress jobs for checkout
    const readyForBilling = allJobs.filter((j) => j.status !== 'Delivered');
    setJobs(readyForBilling);
  };

  useEffect(() => {
    loadData();
  }, []);

  const partsTotal = selectedJob?.parts ? selectedJob.parts.reduce((a, b) => a + b.total_price, 0) : 0;
  const laborCharge = selectedJob?.labor_charge || 0;
  const advanceDeposit = selectedJob?.advance_deposit || 0;
  const subtotal = partsTotal + laborCharge;
  const netPayable = Math.max(0, subtotal - advanceDeposit - Number(discount));

  const handleCheckout = () => {
    if (!selectedJob) return;

    // 1. Create Invoice
    const invoices = getStoredInvoices();
    const nextInvNo = `INV-${1001 + invoices.length}`;

    const newInvoice: Invoice = {
      id: 'inv-' + Date.now(),
      invoice_no: nextInvNo,
      job_card_id: selectedJob.id,
      customer_name: selectedJob.customer_name,
      phone_number: selectedJob.phone_number,
      subtotal,
      discount: Number(discount),
      net_payable: netPayable,
      payment_method: paymentMethod,
      status: 'Paid',
      created_at: new Date().toISOString(),
      job_card: selectedJob,
    };

    saveStoredInvoices([newInvoice, ...invoices]);

    // 2. Mark Job Card status as Delivered
    const allJobs = getStoredJobs();
    const updatedJobs = allJobs.map((j) => {
      if (j.id === selectedJob.id) {
        return {
          ...j,
          status: 'Delivered' as const,
          updated_at: new Date().toISOString(),
        };
      }
      return j;
    });

    saveStoredJobs(updatedJobs);

    // 3. Trigger Confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // 4. Open Thermal Receipt Print Modal
    setLastInvoice(newInvoice);
    setIsReceiptOpen(true);

    // Reset state & reload
    setSelectedJob(null);
    setDiscount(0);
    loadData();
  };

  const profile = getStoredProfile();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-cyan-400" /> Point of Sale (POS) Billing Terminal
        </h1>
        <p className="text-xs text-slate-400">Checkout completed repair jobs, apply discounts, select payment mode & issue invoices</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Job Selector Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" /> Select Ready Job Card for Billing
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {jobs.length === 0 ? (
              <div className="col-span-full glass-panel p-8 rounded-2xl text-center text-slate-500 text-xs italic">
                No ready jobs waiting for billing.
              </div>
            ) : (
              jobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                const pTotal = job.parts ? job.parts.reduce((a, b) => a + b.total_price, 0) : 0;
                const totalBill = pTotal + job.labor_charge;

                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-500 shadow-lg shadow-cyan-900/40 ring-1 ring-cyan-500'
                        : 'glass-card text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-400 text-xs">{job.job_no}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          job.status === 'Completed'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-white text-sm">{job.customer_name}</p>
                      <p className="text-xs text-slate-400">{job.brand_model} • {job.machine_category}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 font-mono">
                      <span className="text-slate-400 text-[11px]">Total: LKR {totalBill.toLocaleString()}</span>
                      {job.advance_deposit > 0 && (
                        <span className="text-cyan-300 text-[11px]">Dep: LKR {job.advance_deposit}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Checkout Terminal & Financial Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShoppingCart className="w-4 h-4 text-emerald-400" /> Itemized Billing Terminal
            </h2>

            {!selectedJob ? (
              <div className="p-8 text-center text-slate-500 text-xs italic">
                Select a job card from the left panel to begin checkout.
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Customer Info */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex justify-between font-bold text-slate-200">
                    <span>{selectedJob.customer_name}</span>
                    <span className="font-mono text-cyan-400">{selectedJob.job_no}</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{selectedJob.brand_model} ({selectedJob.machine_category})</p>
                </div>

                {/* Itemized Breakdown Table */}
                <div className="space-y-2 border-b border-slate-800 pb-3">
                  <span className="font-bold text-slate-300 text-[11px]">Line Items:</span>
                  {selectedJob.parts && selectedJob.parts.length > 0 ? (
                    selectedJob.parts.map((p) => (
                      <div key={p.id} className="flex justify-between text-slate-300">
                        <span>{p.part_name} (×{p.quantity})</span>
                        <span className="font-mono">LKR {p.total_price.toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-[11px] italic">No spare parts added</p>
                  )}
                  <div className="flex justify-between text-slate-300 font-semibold pt-1 border-t border-slate-800/60">
                    <span>Service & Labor Charge</span>
                    <span className="font-mono text-emerald-400">LKR {laborCharge.toLocaleString()}</span>
                  </div>
                </div>

                {/* Discounts & Deposits */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Custom Discount (LKR)</label>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-red-400 font-mono focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Credit / Debit Card</option>
                      <option value="Mobile Payment">Mobile Payment (EzCash / Koko)</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {/* Final Net Payable Box */}
                <div className="p-4 rounded-xl bg-slate-900 border border-emerald-900/80 space-y-1">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Subtotal:</span>
                    <span>LKR {subtotal.toLocaleString()}</span>
                  </div>
                  {advanceDeposit > 0 && (
                    <div className="flex justify-between text-cyan-400 text-[11px]">
                      <span>Advance Deposit Paid:</span>
                      <span>- LKR {advanceDeposit.toLocaleString()}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-red-400 text-[11px]">
                      <span>Discount:</span>
                      <span>- LKR {discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-lg text-emerald-400 pt-2 border-t border-slate-800 font-mono">
                    <span>NET PAYABLE:</span>
                    <span>LKR {netPayable.toLocaleString()}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  className="w-full py-3 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-xl shadow-emerald-900/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" /> Complete Payment & Deliver Job
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ThermalReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        invoice={lastInvoice}
        profile={profile}
      />
    </div>
  );
}
