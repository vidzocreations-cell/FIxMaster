'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { CreditCard, CheckCircle2, DollarSign, Percent, Printer, ShoppingCart, User, Phone, Wrench, ArrowRight, RefreshCw, Check, Clock, Building2, CheckSquare, Square } from 'lucide-react';
import { getStoredJobs, saveStoredJobs, getStoredInvoices, saveStoredInvoices, getStoredProfile, fetchJobsFromSupabaseCloud, generateNextInvoiceNo } from '@/lib/supabase';
import { JobCard, Invoice, PaymentMethod } from '@/lib/types';
import ThermalReceiptModal from '@/components/ThermalReceiptModal';

export default function POSPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [filterTab, setFilterTab] = useState<'Completed' | 'Delivered' | 'CorporateBulk' | 'All'>('Completed');
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);
  
  // Corporate Multi-Job Billing State
  const [selectedCorporateCustomer, setSelectedCorporateCustomer] = useState<string>('');
  const [bulkSelectedJobIds, setBulkSelectedJobIds] = useState<string[]>([]);

  const [discount, setDiscount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const loadData = async () => {
    // 1. Initial local load
    const localJobs = getStoredJobs();
    setJobs(localJobs);

    // 2. Fetch latest live jobs from cloud
    setIsCloudSyncing(true);
    const cloudJobs = await fetchJobsFromSupabaseCloud();
    setJobs(cloudJobs);
    setIsCloudSyncing(false);
  };

  useEffect(() => {
    loadData();

    // 3. Realtime background sync polling every 4 seconds
    const interval = setInterval(async () => {
      const cloudJobs = await fetchJobsFromSupabaseCloud();
      setJobs(cloudJobs);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const filteredJobs = jobs.filter((j) => {
    if (filterTab === 'Completed') return j.status === 'Completed';
    if (filterTab === 'Delivered') return j.status === 'Delivered';
    if (filterTab === 'CorporateBulk') {
      if (!selectedCorporateCustomer) return j.status === 'Completed';
      return j.status === 'Completed' && j.customer_name.toLowerCase() === selectedCorporateCustomer.toLowerCase();
    }
    return true;
  });

  // Extract unique customer names having completed jobs for Corporate Bulk Selector
  const corporateCustomers = Array.from(
    new Set(jobs.filter((j) => j.status === 'Completed').map((j) => j.customer_name))
  );

  // Single Job Checkout Financial Calculations
  const partsTotal = selectedJob?.parts ? selectedJob.parts.reduce((a, b) => a + b.total_price, 0) : 0;
  const laborCharge = selectedJob?.labor_charge || 0;
  const advanceDeposit = selectedJob?.advance_deposit || 0;
  const subtotal = partsTotal + laborCharge;
  const netPayable = Math.max(0, subtotal - advanceDeposit - Number(discount));

  // Corporate Multi-Job Bulk Financial Calculations
  const bulkSelectedJobsList = jobs.filter((j) => bulkSelectedJobIds.includes(j.id));
  const bulkPartsTotal = bulkSelectedJobsList.reduce((acc, j) => {
    const jParts = j.parts ? j.parts.reduce((a, b) => a + b.total_price, 0) : 0;
    return acc + jParts;
  }, 0);
  const bulkLaborTotal = bulkSelectedJobsList.reduce((acc, j) => acc + (j.labor_charge || 0), 0);
  const bulkDepositTotal = bulkSelectedJobsList.reduce((acc, j) => acc + (j.advance_deposit || 0), 0);
  const bulkSubtotal = bulkPartsTotal + bulkLaborTotal;
  const bulkNetPayable = Math.max(0, bulkSubtotal - bulkDepositTotal - Number(discount));

  const handleToggleBulkSelectJob = (id: string) => {
    setBulkSelectedJobIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllBulkJobs = () => {
    if (filteredJobs.length === 0) return;
    const allFilteredIds = filteredJobs.map((j) => j.id);
    const isAllSelected = allFilteredIds.every((id) => bulkSelectedJobIds.includes(id));
    if (isAllSelected) {
      setBulkSelectedJobIds([]);
    } else {
      setBulkSelectedJobIds(allFilteredIds);
    }
  };

  const handleCheckoutJob = async (jobToCheckout: JobCard) => {
    // 1. Create Invoice
    const invoices = getStoredInvoices();
    const nextInvNo = generateNextInvoiceNo(invoices);

    const pTotal = jobToCheckout.parts ? jobToCheckout.parts.reduce((a, b) => a + b.total_price, 0) : 0;
    const lCharge = jobToCheckout.labor_charge || 0;
    const aDep = jobToCheckout.advance_deposit || 0;
    const discNum = jobToCheckout.id === selectedJob?.id ? (Number(discount) || 0) : 0;
    const netPay = Math.max(0, pTotal + lCharge - aDep - discNum);

    const newInvoice: Invoice = {
      id: 'inv-' + Date.now(),
      invoice_no: nextInvNo,
      job_card_id: jobToCheckout.id,
      customer_name: jobToCheckout.customer_name,
      phone_number: jobToCheckout.phone_number,
      subtotal: pTotal + lCharge,
      discount: discNum,
      net_payable: netPay,
      payment_method: paymentMethod,
      status: 'Paid',
      created_at: new Date().toISOString(),
      job_card: jobToCheckout,
    };

    await saveStoredInvoices([newInvoice, ...invoices]);

    // 2. Mark Job Card status as Delivered / Paid
    const allJobs = getStoredJobs();
    const updatedJobs = allJobs.map((j) => {
      if (j.id === jobToCheckout.id) {
        return {
          ...j,
          status: 'Delivered' as const,
          updated_at: new Date().toISOString(),
        };
      }
      return j;
    });

    await saveStoredJobs(updatedJobs);

    // 3. Trigger Confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // 4. Open Thermal Receipt Print Modal & Keep Open for User Actions
    setLastInvoice(newInvoice);
    setIsReceiptOpen(true);

    // Reset state & reload
    setSelectedJob(null);
    setDiscount('');
    loadData();
  };

  const handleCheckoutBulkJobs = async () => {
    if (bulkSelectedJobsList.length === 0) {
      alert('Please select at least 1 completed repair job card to generate a consolidated invoice.');
      return;
    }

    const invoices = getStoredInvoices();
    const nextInvNo = generateNextInvoiceNo(invoices);
    const discNum = Number(discount) || 0;
    const custName = selectedCorporateCustomer || bulkSelectedJobsList[0].customer_name;
    const custPhone = bulkSelectedJobsList[0].phone_number;

    const newInvoice: Invoice = {
      id: 'inv-' + Date.now(),
      invoice_no: nextInvNo,
      job_card_id: bulkSelectedJobsList[0].id,
      customer_name: custName,
      phone_number: custPhone,
      subtotal: bulkSubtotal,
      discount: discNum,
      net_payable: bulkNetPayable,
      payment_method: paymentMethod,
      status: 'Paid',
      created_at: new Date().toISOString(),
      job_cards: bulkSelectedJobsList,
      is_consolidated: true,
    };

    await saveStoredInvoices([newInvoice, ...invoices]);

    // Mark all included jobs as Delivered / Paid
    const allJobs = getStoredJobs();
    const bulkIds = bulkSelectedJobsList.map((j) => j.id);
    const updatedJobs = allJobs.map((j) => {
      if (bulkIds.includes(j.id)) {
        return {
          ...j,
          status: 'Delivered' as const,
          updated_at: new Date().toISOString(),
        };
      }
      return j;
    });

    await saveStoredJobs(updatedJobs);

    // Trigger Confetti
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
    });

    setLastInvoice(newInvoice);
    setIsReceiptOpen(true);

    setBulkSelectedJobIds([]);
    setDiscount('');
    loadData();
  };

  const profile = getStoredProfile();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-cyan-400" /> Point of Sale (POS) Billing Terminal
            </h1>
            {isCloudSyncing && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" /> Syncing Cloud...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">Checkout repair jobs, mark Paid & Delivered, or issue corporate multi-job combined master invoices</p>
        </div>

        {/* Tab Filters inside POS */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => {
              setFilterTab('Completed');
              setSelectedJob(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filterTab === 'Completed'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ready for Delivery ({jobs.filter((j) => j.status === 'Completed').length})
          </button>
          <button
            onClick={() => {
              setFilterTab('CorporateBulk');
              setSelectedJob(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'CorporateBulk'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow font-extrabold'
                : 'text-amber-400 hover:bg-amber-950/40'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Corporate / Multi-Job Bulk Billing
          </button>
          <button
            onClick={() => {
              setFilterTab('Delivered');
              setSelectedJob(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filterTab === 'Delivered'
                ? 'bg-slate-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Delivered History
          </button>
          <button
            onClick={() => {
              setFilterTab('All');
              setSelectedJob(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filterTab === 'All' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Jobs ({jobs.length})
          </button>
        </div>
      </div>

      {/* Main Terminal Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Job Cards List / Corporate Selector */}
        <div className="lg:col-span-7 space-y-4">
          {/* Corporate Multi-Job Customer Selector Banner */}
          {filterTab === 'CorporateBulk' && (
            <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-amber-300">
                  🏢 Corporate Multi-Job Billing (සමුච්චිත / එකතු කළ B2B බිල්පත)
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                Company/Customer කෙනෙකුගේ අලුත්වැඩියා කළ මැෂින් කිහිපයක බිල්පත් **එකම Master Invoice එකක්** ලෙස Checkout කිරීමට Company එක තෝරා Jobs Select කරන්න.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Select Company / Customer:</label>
                  <select
                    value={selectedCorporateCustomer}
                    onChange={(e) => {
                      setSelectedCorporateCustomer(e.target.value);
                      setBulkSelectedJobIds([]);
                    }}
                    className="w-full bg-slate-900 border border-amber-800/80 rounded-xl px-3 py-2 text-xs text-amber-200 focus:border-amber-500 focus:outline-none cursor-pointer font-bold"
                  >
                    <option value="">-- Choose Company / Customer ({corporateCustomers.length}) --</option>
                    {corporateCustomers.map((cust) => (
                      <option key={cust} value={cust}>
                        {cust} ({jobs.filter((j) => j.status === 'Completed' && j.customer_name === cust).length} Completed Jobs)
                      </option>
                    ))}
                  </select>
                </div>
                {filteredJobs.length > 0 && (
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleSelectAllBulkJobs}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>
                        {filteredJobs.length > 0 && filteredJobs.every((j) => bulkSelectedJobIds.includes(j.id))
                          ? 'Deselect All Jobs'
                          : 'Select All Available Jobs'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              {filterTab === 'CorporateBulk'
                ? `Available Corporate Jobs (${filteredJobs.length})`
                : `${filterTab} Repair Jobs (${filteredJobs.length})`}
            </h2>
            <span className="text-xs text-slate-400">
              {filterTab === 'CorporateBulk' ? 'Check jobs to combine into 1 invoice' : 'Click job card to load checkout totals'}
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredJobs.length === 0 ? (
              <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center space-y-2">
                <Wrench className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-400">No jobs matching filter</p>
                <p className="text-xs text-slate-500">
                  {filterTab === 'CorporateBulk'
                    ? 'Select a company/customer above to view their completed repair jobs.'
                    : 'Change tab filter or complete repair jobs from Repair Terminal.'}
                </p>
              </div>
            ) : (
              filteredJobs.map((j) => {
                const isSelected = selectedJob?.id === j.id;
                const isBulkChecked = bulkSelectedJobIds.includes(j.id);
                const jPartsTotal = j.parts ? j.parts.reduce((a, b) => a + b.total_price, 0) : 0;
                const jLabor = j.labor_charge || 0;
                const jDeposit = j.advance_deposit || 0;
                const jNet = Math.max(0, jPartsTotal + jLabor - jDeposit);

                return (
                  <div
                    key={j.id}
                    onClick={() => {
                      if (filterTab === 'CorporateBulk') {
                        handleToggleBulkSelectJob(j.id);
                      } else {
                        setSelectedJob(j);
                      }
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      filterTab === 'CorporateBulk'
                        ? isBulkChecked
                          ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        : isSelected
                        ? 'bg-cyan-950/50 border-cyan-500 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {filterTab === 'CorporateBulk' && (
                            <input
                              type="checkbox"
                              checked={isBulkChecked}
                              onChange={() => handleToggleBulkSelectJob(j.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                            />
                          )}
                          <span className="font-mono text-xs font-bold text-cyan-400">{j.job_no}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              j.status === 'Completed'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : j.status === 'Delivered'
                                ? 'bg-slate-800 text-slate-300'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}
                          >
                            {j.status}
                          </span>
                        </div>

                        <h3 className="text-sm font-extrabold text-white">{j.customer_name}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-500" /> {j.phone_number}
                        </p>
                        <p className="text-xs font-semibold text-slate-300 pt-1">
                          🛠️ {j.machine_category} - <span className="text-slate-100">{j.brand_model}</span>
                        </p>
                      </div>

                      <div className="text-right space-y-1">
                        <span className="text-[10px] text-slate-400 block">Job Net Balance:</span>
                        <div className="text-sm font-mono font-extrabold text-emerald-400">
                          LKR {jNet.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          Parts: LKR {jPartsTotal.toLocaleString()} | Labor: LKR {jLabor.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Checkout Calculation Card */}
        <div className="lg:col-span-5 space-y-4">
          {filterTab === 'CorporateBulk' ? (
            /* Corporate Multi-Job Bulk Checkout Card */
            <div className="glass-panel p-5 rounded-2xl border border-amber-500/80 space-y-5 shadow-2xl bg-amber-950/20">
              <div className="flex items-center justify-between border-b border-amber-900/60 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-extrabold text-white">Corporate Combined Billing</h3>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800">
                  {bulkSelectedJobsList.length} Jobs Selected
                </span>
              </div>

              {bulkSelectedJobsList.length === 0 ? (
                <div className="p-6 text-center text-slate-400 italic text-xs space-y-2">
                  <Building2 className="w-8 h-8 text-amber-500/50 mx-auto" />
                  <p className="font-semibold text-slate-300">No jobs selected for combined invoice</p>
                  <p className="text-slate-500">Select a company and check 1 or more completed jobs on the left.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Jobs Summary Pills */}
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    <span className="text-[11px] font-bold text-amber-300 block">Included Jobs:</span>
                    {bulkSelectedJobsList.map((j) => (
                      <div key={j.id} className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono font-bold text-cyan-400">{j.job_no}</span> - {j.brand_model}
                        </div>
                        <div className="font-mono font-bold text-emerald-400">
                          LKR {Math.max(0, (j.parts ? j.parts.reduce((a,b)=>a+b.total_price,0) : 0) + (j.labor_charge||0) - (j.advance_deposit||0)).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial Breakdowns */}
                  <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Combined Spare Parts Total:</span>
                      <span className="font-mono font-bold">LKR {bulkPartsTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Combined Labor Charges:</span>
                      <span className="font-mono font-bold">LKR {bulkLaborTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 font-bold border-t border-slate-800 pt-2">
                      <span>Gross Combined Subtotal:</span>
                      <span className="font-mono font-extrabold text-cyan-400">LKR {bulkSubtotal.toLocaleString()}</span>
                    </div>
                    {bulkDepositTotal > 0 && (
                      <div className="flex justify-between text-amber-300 font-bold">
                        <span>Combined Advance Deposits:</span>
                        <span className="font-mono">- LKR {bulkDepositTotal.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Discount Allowed */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Corporate Discount Allowed (LKR)</label>
                    <div className="relative">
                      <Percent className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-amber-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Payment Mode Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Cash', 'Card', 'Mobile Payment', 'Bank Transfer'] as PaymentMethod[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPaymentMethod(mode)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            paymentMethod === mode
                              ? 'bg-amber-500 text-slate-950 shadow-lg font-extrabold'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Combined Net Payable Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/80 text-center space-y-1">
                    <span className="text-xs text-emerald-300 uppercase tracking-wider font-extrabold">TOTAL COMBINED MASTER BILL:</span>
                    <div className="text-2xl font-mono font-black text-emerald-400">
                      LKR {bulkNetPayable.toLocaleString()}
                    </div>
                  </div>

                  {/* Master Checkout Button */}
                  <button
                    type="button"
                    onClick={handleCheckoutBulkJobs}
                    className="w-full py-3.5 px-4 rounded-xl text-sm font-black text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-xl shadow-amber-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-5 h-5 text-slate-950" />
                    <span>⚡ Checkout 1 Master Invoice ({bulkSelectedJobsList.length} Jobs)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Single Job Checkout Card */
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-white">Single Job Checkout Summary</h3>
                {selectedJob && (
                  <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800">
                    {selectedJob.job_no}
                  </span>
                )}
              </div>

              {!selectedJob ? (
                <div className="p-8 text-center text-slate-500 italic text-xs space-y-2">
                  <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-400">No Job Selected</p>
                  <p className="text-slate-500">Click on any completed job card from the left list to load totals.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Customer & Machine Card */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-xs font-bold text-white">{selectedJob.customer_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{selectedJob.phone_number}</div>
                    <div className="text-xs font-semibold text-cyan-300 pt-1">
                      {selectedJob.machine_category} - {selectedJob.brand_model}
                    </div>
                  </div>

                  {/* Financial Breakdowns */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Spare Parts Total ({selectedJob.parts ? selectedJob.parts.length : 0} items):</span>
                      <span className="font-mono font-bold text-slate-200">LKR {partsTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Service & Labor Charge:</span>
                      <span className="font-mono font-bold text-slate-200">LKR {laborCharge.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 font-bold border-t border-slate-800 pt-2">
                      <span>Subtotal:</span>
                      <span className="font-mono text-cyan-400">LKR {subtotal.toLocaleString()}</span>
                    </div>
                    {advanceDeposit > 0 && (
                      <div className="flex justify-between text-cyan-400 font-bold">
                        <span>Advance Deposit Paid:</span>
                        <span className="font-mono">- LKR {advanceDeposit.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Discount Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Discount Allowed (LKR)</label>
                    <div className="relative">
                      <Percent className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-amber-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Cash', 'Card', 'Mobile Payment', 'Bank Transfer'] as PaymentMethod[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPaymentMethod(mode)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            paymentMethod === mode
                              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950 font-extrabold'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Net Payable Display Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/80 text-center space-y-1">
                    <span className="text-xs text-emerald-300 uppercase tracking-wider font-extrabold">TOTAL NET PAYABLE:</span>
                    <div className="text-2xl font-mono font-black text-emerald-400">
                      LKR {netPayable.toLocaleString()}
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    type="button"
                    onClick={() => handleCheckoutJob(selectedJob)}
                    className="w-full py-3.5 px-4 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-950 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>Checkout & Issue Invoice ({selectedJob.job_no})</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Thermal Receipt Print Modal */}
      <ThermalReceiptModal
        isOpen={isReceiptOpen && !!lastInvoice}
        invoice={lastInvoice}
        profile={profile}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
}
