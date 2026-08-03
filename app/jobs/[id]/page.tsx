'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wrench, Package, Plus, Trash2, Printer, Save, CheckCircle2, User, Phone, Tag, AlertCircle, DollarSign, ExternalLink, Store, Percent, Edit3 } from 'lucide-react';
import { getStoredJobs, saveStoredJobs, getStoredParts, saveStoredParts, getStoredProfile } from '@/lib/supabase';
import { JobCard, Part, JobPart } from '@/lib/types';
import ThermalReceiptModal from '@/components/ThermalReceiptModal';
import JobCardModal from '@/components/JobCardModal';
import WhatsAppButton from '@/components/WhatsAppButton';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<JobCard | null>(null);
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Tab state for adding parts: 'stock' | 'external'
  const [addPartMode, setAddPartMode] = useState<'stock' | 'external'>('stock');

  // Stock Part Selection State
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);

  // External / Outside Shop Part State (පිට කඩෙන් ගෙනා කොටස්)
  const [extPartName, setExtPartName] = useState('');
  const [extCostPrice, setExtCostPrice] = useState<number>(2000);
  const [extMarginPercent, setExtMarginPercent] = useState<number>(30);
  const [extVendorName, setExtVendorName] = useState('');
  const [extQty, setExtQty] = useState<number>(1);
  const [extSaveToInventory, setExtSaveToInventory] = useState(false);

  // Financials State
  const [laborCharge, setLaborCharge] = useState(0);
  const [advanceDeposit, setAdvanceDeposit] = useState(0);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadJobData = () => {
    const jobs = getStoredJobs();
    const found = jobs.find((j) => j.id === jobId);
    if (found) {
      setJob(found);
      setLaborCharge(found.labor_charge);
      setAdvanceDeposit(found.advance_deposit || 0);
    }
    setAvailableParts(getStoredParts());
  };

  useEffect(() => {
    if (jobId) {
      loadJobData();
    }
  }, [jobId]);

  if (!job) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-4">
        <p>Loading repair job details...</p>
        <Link href="/jobs" className="text-cyan-400 hover:underline font-semibold">
          Return to Job Cards
        </Link>
      </div>
    );
  }

  // Delete Job Card
  const handleDeleteJobCard = () => {
    if (confirm(`Are you sure you want to delete Job Card ${job.job_no}? This action cannot be undone.`)) {
      const jobs = getStoredJobs();
      const updated = jobs.filter((j) => j.id !== job.id);
      saveStoredJobs(updated);
      router.push('/jobs');
    }
  };

  // 1. Add Part from Internal Shop Stock
  const handleAddStockPart = () => {
    if (!selectedPartId) return;

    const partObj = availableParts.find((p) => p.id === selectedPartId);
    if (!partObj) return;

    if (partObj.stock_quantity < partQty) {
      alert(`Insufficient stock! Only ${partObj.stock_quantity} in stock.`);
      return;
    }

    // Deduct stock from inventory
    const updatedInventory = availableParts.map((p) => {
      if (p.id === selectedPartId) {
        return { ...p, stock_quantity: p.stock_quantity - partQty };
      }
      return p;
    });
    saveStoredParts(updatedInventory);
    setAvailableParts(updatedInventory);

    // Add part item to Job Card
    const existingParts = job.parts || [];
    const newJobPart: JobPart = {
      id: 'jp-' + Date.now(),
      job_card_id: job.id,
      part_id: partObj.id,
      part_name: partObj.part_name,
      quantity: Number(partQty),
      unit_price: partObj.retail_price,
      total_price: partObj.retail_price * Number(partQty),
      cost_price: partObj.cost_price,
      margin_percent: partObj.margin_percent,
      is_external: false,
      warranty_days: 30,
    };

    const updatedJobParts = [...existingParts, newJobPart];
    const newPartsTotal = updatedJobParts.reduce((acc, item) => acc + item.total_price, 0);

    const jobs = getStoredJobs();
    const updatedJobs = jobs.map((j) => {
      if (j.id === job.id) {
        return {
          ...j,
          parts: updatedJobParts,
          total_amount: newPartsTotal + j.labor_charge,
          updated_at: new Date().toISOString(),
        };
      }
      return j;
    });

    saveStoredJobs(updatedJobs);
    setJob({ ...job, parts: updatedJobParts, total_amount: newPartsTotal + job.labor_charge });
    setSelectedPartId('');
    setPartQty(1);
  };

  // 2. Add External / Outside Shop Part (පිට කඩෙන් ගෙනා කොටස්)
  const handleAddExternalPart = () => {
    if (!extPartName.trim()) {
      alert('Please enter the part name.');
      return;
    }

    const computedRetail = Number((extCostPrice + (extCostPrice * extMarginPercent) / 100).toFixed(2));
    const totalPrice = computedRetail * extQty;

    // Optional: Save to shop inventory catalog for future use
    let externalPartId = 'ext-part-' + Date.now();
    if (extSaveToInventory) {
      const newPart: Part = {
        id: externalPartId,
        part_name: extPartName,
        category: job.machine_category,
        vendor_name: extVendorName || 'Outside Shop Vendor',
        cost_price: Number(extCostPrice),
        margin_percent: Number(extMarginPercent),
        retail_price: computedRetail,
        stock_quantity: 0, // Since it's purchased for this job
        min_stock_alert: 3,
        created_at: new Date().toISOString(),
      };
      const updatedInventory = [newPart, ...availableParts];
      saveStoredParts(updatedInventory);
      setAvailableParts(updatedInventory);
    }

    const existingParts = job.parts || [];
    const newJobPart: JobPart = {
      id: 'jp-ext-' + Date.now(),
      job_card_id: job.id,
      part_id: externalPartId,
      part_name: `${extPartName} (Outside Purchase)`,
      quantity: Number(extQty),
      unit_price: computedRetail,
      total_price: totalPrice,
      cost_price: Number(extCostPrice),
      margin_percent: Number(extMarginPercent),
      is_external: true,
      vendor_name: extVendorName || 'Outside Shop',
      warranty_days: 30,
    };

    const updatedJobParts = [...existingParts, newJobPart];
    const newPartsTotal = updatedJobParts.reduce((acc, item) => acc + item.total_price, 0);

    const jobs = getStoredJobs();
    const updatedJobs = jobs.map((j) => {
      if (j.id === job.id) {
        return {
          ...j,
          parts: updatedJobParts,
          total_amount: newPartsTotal + j.labor_charge,
          updated_at: new Date().toISOString(),
        };
      }
      return j;
    });

    saveStoredJobs(updatedJobs);
    setJob({ ...job, parts: updatedJobParts, total_amount: newPartsTotal + job.labor_charge });

    // Reset external form
    setExtPartName('');
    setExtCostPrice(2000);
    setExtMarginPercent(30);
    setExtVendorName('');
    setExtQty(1);
    setExtSaveToInventory(false);
  };

  // Remove Part from Job Card
  const handleRemovePartFromJob = (jobPartId: string, partId: string, qty: number, isExternal?: boolean) => {
    // Restore inventory stock only if it was an internal stock part
    if (!isExternal) {
      const updatedInventory = availableParts.map((p) => {
        if (p.id === partId) {
          return { ...p, stock_quantity: p.stock_quantity + qty };
        }
        return p;
      });
      saveStoredParts(updatedInventory);
      setAvailableParts(updatedInventory);
    }

    // Remove from job card
    const updatedParts = (job.parts || []).filter((jp) => jp.id !== jobPartId);
    const newPartsTotal = updatedParts.reduce((acc, item) => acc + item.total_price, 0);

    const jobs = getStoredJobs();
    const updatedJobs = jobs.map((j) => {
      if (j.id === job.id) {
        return {
          ...j,
          parts: updatedParts,
          total_amount: newPartsTotal + j.labor_charge,
          updated_at: new Date().toISOString(),
        };
      }
      return j;
    });

    saveStoredJobs(updatedJobs);
    setJob({ ...job, parts: updatedParts, total_amount: newPartsTotal + job.labor_charge });
  };

  // Save Labor & Deposit changes
  const handleSaveFinancials = () => {
    const partsTotal = job.parts ? job.parts.reduce((a, b) => a + b.total_price, 0) : 0;
    const newTotal = partsTotal + Number(laborCharge);

    const jobs = getStoredJobs();
    const updatedJobs = jobs.map((j) => {
      if (j.id === job.id) {
        return {
          ...j,
          labor_charge: Number(laborCharge),
          advance_deposit: Number(advanceDeposit),
          total_amount: newTotal,
          updated_at: new Date().toISOString(),
        };
      }
      return j;
    });

    saveStoredJobs(updatedJobs);
    setJob({ ...job, labor_charge: Number(laborCharge), advance_deposit: Number(advanceDeposit), total_amount: newTotal });
    alert('Labor charge & deposit updated successfully!');
  };

  const partsTotal = job.parts ? job.parts.reduce((a, b) => a + b.total_price, 0) : 0;
  const grandTotal = partsTotal + Number(laborCharge);
  const profile = getStoredProfile();

  // Computed retail price for external preview
  const extComputedRetail = Number((extCostPrice + (extCostPrice * extMarginPercent) / 100).toFixed(2));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back Link & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-all font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Job Cards
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Job Details Button */}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 transition-all cursor-pointer shadow-md shadow-cyan-950"
          >
            <Edit3 className="w-4 h-4 text-cyan-400" /> Edit Job Details
          </button>

          <WhatsAppButton job={job} />
          
          <button
            onClick={() => setIsReceiptOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-cyan-400" /> Print Ticket / Receipt
          </button>

          <button
            onClick={handleDeleteJobCard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-300 bg-red-950/60 hover:bg-red-900/80 border border-red-900 transition-all cursor-pointer"
            title="Delete Job Card"
          >
            <Trash2 className="w-4 h-4 text-red-400" /> Delete Job
          </button>
        </div>
      </div>

      {/* Main Ticket Info Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-white font-mono">{job.job_no}</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  job.status === 'Pending'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : job.status === 'In Progress'
                    ? 'bg-blue-950 text-blue-300 border-blue-800'
                    : job.status === 'Completed'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-purple-950 text-purple-300 border-purple-800'
                }`}
              >
                {job.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Created on {new Date(job.created_at).toLocaleString()}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-right">
            <span className="text-[11px] text-slate-400">Total Bill Amount:</span>
            <div className="text-xl font-mono font-extrabold text-emerald-400">
              LKR {grandTotal.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Customer & Machine Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 relative">
            <p className="text-slate-400 font-semibold flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-cyan-400" /> Customer Information
            </p>
            <p className="font-bold text-slate-100 text-sm">{job.customer_name}</p>
            <p className="text-slate-400 flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-500" /> {job.phone_number}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <p className="text-slate-400 font-semibold flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-cyan-400" /> Equipment Category & Model
            </p>
            <p className="font-bold text-slate-100 text-sm">{job.brand_model}</p>
            <p className="text-cyan-400 font-semibold">{job.machine_category}</p>
            {job.serial_number && <p className="text-[11px] text-slate-500">SN: {job.serial_number}</p>}
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <p className="text-slate-400 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-cyan-400" /> Fault & Tech Assigned
            </p>
            <p className="text-slate-200">{job.reported_fault}</p>
            <p className="text-[11px] text-slate-400 pt-1">
              Technician: <span className="text-white font-semibold">{job.assigned_technician_name || 'Unassigned'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Repair Terminal Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Assigned Parts List (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" /> Spare Parts Added to Job Card
            </h2>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              Subtotal: LKR {partsTotal.toLocaleString()}
            </span>
          </div>

          <div className="space-y-3">
            {(!job.parts || job.parts.length === 0) ? (
              <div className="p-8 text-center text-slate-500 text-xs italic">
                No spare parts assigned to this job card yet. Select from internal stock or add outside shop purchases on the right.
              </div>
            ) : (
              job.parts.map((jp) => (
                <div
                  key={jp.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">{jp.part_name}</span>
                      {jp.is_external && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Outside Shop
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400">
                      Qty: {jp.quantity} × LKR {jp.unit_price.toLocaleString()}
                      {jp.cost_price ? ` (Cost: LKR ${jp.cost_price} | Margin: +${jp.margin_percent}%)` : ''}
                    </p>
                    {jp.vendor_name && <p className="text-[10px] text-slate-500">Vendor: {jp.vendor_name}</p>}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-emerald-400">
                      LKR {jp.total_price.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleRemovePartFromJob(jp.id, jp.part_id, jp.quantity, jp.is_external)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all cursor-pointer"
                      title="Remove Part"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Dual Mode Add Parts & Financials (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Add Part Container with Mode Tabs */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
            {/* Mode Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setAddPartMode('stock')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                  addPartMode === 'stock'
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-900/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Store className="w-3.5 h-3.5" /> Shop Stock
              </button>

              <button
                onClick={() => setAddPartMode('external')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                  addPartMode === 'external'
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-900/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Outside Shop Purchase
              </button>
            </div>

            {/* Mode 1: From Shop Internal Stock */}
            {addPartMode === 'stock' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Select Spare Part Item</label>
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Spare Part --</option>
                    {availableParts.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                        {p.part_name} (Stock: {p.stock_quantity}) - LKR {p.retail_price}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={partQty}
                    onChange={(e) => setPartQty(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleAddStockPart}
                  disabled={!selectedPartId}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-cyan-900/40"
                >
                  Add Part from Shop Stock
                </button>
              </div>
            )}

            {/* Mode 2: Outside Shop Purchase (පිට කඩෙන් ගෙනා කොටස්) */}
            {addPartMode === 'external' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-200">
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[11px]">
                  💡 පිට කඩෙන් ගෙනා කොටස් (External Shop Parts) සදහා Cost Price එක හා Profit Margin % එක ලබාදී Retail Customer Price එක සකස් කරන්න.
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Part Name *</label>
                  <input
                    type="text"
                    required
                    value={extPartName}
                    onChange={(e) => setExtPartName(e.target.value)}
                    placeholder="e.g. Stihl MS180 Clutch Drum Assembly"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Pita Shop Cost (LKR)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={extCostPrice}
                      onChange={(e) => setExtCostPrice(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Profit Margin (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        required
                        value={extMarginPercent}
                        onChange={(e) => setExtMarginPercent(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-mono focus:border-amber-500 focus:outline-none"
                      />
                      <Percent className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
                    </div>
                  </div>
                </div>

                {/* Computed Customer Retail Price Preview */}
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">Customer Retail Price:</span>
                  <span className="font-mono font-extrabold text-emerald-400 text-sm">
                    LKR {extComputedRetail.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Outside Shop Name</label>
                    <input
                      type="text"
                      value={extVendorName}
                      onChange={(e) => setExtVendorName(e.target.value)}
                      placeholder="e.g. Pettah Tools Shop"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={extQty}
                      onChange={(e) => setExtQty(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="saveToInv"
                    checked={extSaveToInventory}
                    onChange={(e) => setExtSaveToInventory(e.target.checked)}
                    className="rounded border-slate-800 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="saveToInv" className="text-[11px] text-slate-300 cursor-pointer">
                    Save to shop inventory catalog for future repairs
                  </label>
                </div>

                <button
                  onClick={handleAddExternalPart}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 transition-all cursor-pointer shadow-lg shadow-amber-900/40"
                >
                  Add Outside Shop Part to Job Ticket
                </button>
              </div>
            )}
          </div>

          {/* Labor Charge & Advance Deposit Controls */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Labor Fee & Advance Deposit
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Labor / Service Fee (LKR)</label>
                <input
                  type="number"
                  min="0"
                  value={laborCharge}
                  onChange={(e) => setLaborCharge(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Advance Deposit Paid (LKR)</label>
                <input
                  type="number"
                  min="0"
                  value={advanceDeposit}
                  onChange={(e) => setAdvanceDeposit(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-cyan-400 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleSaveFinancials}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 text-cyan-400" /> Save Financial Charges
              </button>
            </div>
          </div>
        </div>
      </div>

      <JobCardModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        jobToEdit={job}
        onSaved={loadJobData}
      />

      <ThermalReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        jobCard={job}
        profile={profile}
      />
    </div>
  );
}
