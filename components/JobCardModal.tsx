'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Wrench, User, Phone, Tag, AlertCircle, DollarSign, ExternalLink, Store, Percent, Sparkles, Search } from 'lucide-react';
import { EQUIPMENT_CATEGORIES, JobCard, JobPart, Technician, Customer } from '@/lib/types';
import { getStoredJobs, saveStoredJobs, getStoredTechnicians, generateNextJobNo, getStoredCustomers, saveOrUpdateCustomer } from '@/lib/supabase';
import OutsideBillScanner from '@/components/OutsideBillScanner';

interface JobCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobToEdit?: JobCard | null;
  onSaved: () => void;
}

export default function JobCardModal({ isOpen, onClose, jobToEdit, onSaved }: JobCardModalProps) {
  const [mounted, setMounted] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [machineCategory, setMachineCategory] = useState<string>('Chainsaws');
  const [brandModel, setBrandModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [reportedFault, setReportedFault] = useState('');
  const [laborCharge, setLaborCharge] = useState<number | ''>(1500);
  const [advanceDeposit, setAdvanceDeposit] = useState<number | ''>('');
  const [assignedTechnician, setAssignedTechnician] = useState('');
  const [techniciansList, setTechniciansList] = useState<Technician[]>([]);

  // Customer Database & Auto-Fill Suggestions
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Outside Shop Parts Fields (පිට කඩෙන් ගෙනා කොටස්)
  const [hasExternalParts, setHasExternalParts] = useState(false);
  const [extShopName, setExtShopName] = useState('');
  const [extPartName, setExtPartName] = useState('');
  const [extCostPrice, setExtCostPrice] = useState<number | ''>('');
  const [extMarginPercent, setExtMarginPercent] = useState<number | ''>(30);
  const [extSellingPrice, setExtSellingPrice] = useState<number | ''>('');
  const [billImageUri, setBillImageUri] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
    const techs = getStoredTechnicians().filter((t) => t.status === 'Active');
    setTechniciansList(techs);
    if (techs.length > 0 && !assignedTechnician) {
      setAssignedTechnician(techs[0].name);
    }
    const custs = getStoredCustomers();
    setCustomersList(custs);
  }, [isOpen]);

  useEffect(() => {
    const techs = getStoredTechnicians().filter((t) => t.status === 'Active');
    setTechniciansList(techs);
    const custs = getStoredCustomers();
    setCustomersList(custs);

    if (jobToEdit) {
      setCustomerName(jobToEdit.customer_name);
      setPhoneNumber(jobToEdit.phone_number);
      setMachineCategory(jobToEdit.machine_category);
      setBrandModel(jobToEdit.brand_model);
      setSerialNumber(jobToEdit.serial_number || '');
      setReportedFault(jobToEdit.reported_fault);
      setLaborCharge(jobToEdit.labor_charge);
      setAdvanceDeposit(jobToEdit.advance_deposit ? jobToEdit.advance_deposit : '');
      setAssignedTechnician(jobToEdit.assigned_technician_name || (techs[0]?.name ?? 'Saman Kumara'));
      setHasExternalParts(!!jobToEdit.has_external_parts);
      setExtShopName(jobToEdit.ext_shop_name || '');
      setExtPartName(jobToEdit.ext_part_name || '');

      const cPrice = jobToEdit.ext_cost_price ? jobToEdit.ext_cost_price : '';
      const sPrice = jobToEdit.ext_selling_price ? jobToEdit.ext_selling_price : '';
      setExtCostPrice(cPrice);
      setExtSellingPrice(sPrice);

      const cNum = Number(cPrice) || 0;
      const sNum = Number(sPrice) || 0;
      if (cNum > 0 && sNum > 0) {
        setExtMarginPercent(Number((((sNum - cNum) / cNum) * 100).toFixed(2)));
      } else {
        setExtMarginPercent(30);
      }
    } else {
      setCustomerName('');
      setPhoneNumber('');
      setMachineCategory('Chainsaws');
      setBrandModel('');
      setSerialNumber('');
      setReportedFault('');
      setLaborCharge(1500);
      setAdvanceDeposit('');
      setAssignedTechnician(techs[0]?.name ?? 'Saman Kumara');
      setHasExternalParts(false);
      setExtShopName('');
      setExtPartName('');
      setExtCostPrice('');
      setExtMarginPercent(30);
      setExtSellingPrice('');
      setBillImageUri(undefined);
      setSelectedCustomerId('');
    }
  }, [jobToEdit, isOpen]);

  // Real-Time Customer Auto-Fill Detection (Only triggers after 4+ characters are typed, without native popups!)
  useEffect(() => {
    const nameTrim = customerName.trim();
    const phoneTrim = phoneNumber.trim();

    if (nameTrim.length < 4 && phoneTrim.length < 4) {
      setMatchedCustomer(null);
      return;
    }

    const match = customersList.find((c) => {
      const nameMatch = nameTrim.length >= 4 && c.customer_name.toLowerCase().includes(nameTrim.toLowerCase());
      const phoneMatch = phoneTrim.length >= 4 && c.phone_number.includes(phoneTrim);
      return nameMatch || phoneMatch;
    });

    if (match) {
      if (match.customer_name.toLowerCase() === nameTrim.toLowerCase() && match.phone_number === phoneTrim) {
        setMatchedCustomer(null);
      } else {
        setMatchedCustomer(match);
      }
    } else {
      setMatchedCustomer(null);
    }
  }, [customerName, phoneNumber, customersList]);

  const applyCustomerAutoFill = (cust: Customer) => {
    setCustomerName(cust.customer_name);
    setPhoneNumber(cust.phone_number);
    if (cust.machine_category) setMachineCategory(cust.machine_category);
    if (cust.brand_model) setBrandModel(cust.brand_model);
    setMatchedCustomer(null);
    setSelectedCustomerId(cust.id);
  };

  const handleSelectCustomerFromDropdown = (id: string) => {
    setSelectedCustomerId(id);
    const found = customersList.find((c) => c.id === id);
    if (found) {
      applyCustomerAutoFill(found);
    }
  };

  if (!isOpen || !mounted) return null;

  const handleExtCostChange = (val: number | '') => {
    setExtCostPrice(val);
    const cost = Number(val) || 0;
    const margin = Number(extMarginPercent) || 0;
    if (cost > 0 && margin >= 0) {
      const retail = Number((cost + (cost * margin) / 100).toFixed(2));
      setExtSellingPrice(retail);
    }
  };

  const handleExtMarginChange = (val: number | '') => {
    setExtMarginPercent(val);
    const margin = Number(val) || 0;
    const cost = Number(extCostPrice) || 0;
    if (cost > 0) {
      const retail = Number((cost + (cost * margin) / 100).toFixed(2));
      setExtSellingPrice(retail);
    }
  };

  const handleExtSellingPriceChange = (val: number | '') => {
    setExtSellingPrice(val);
    const retail = Number(val) || 0;
    const cost = Number(extCostPrice) || 0;
    if (cost > 0 && retail >= 0) {
      const margin = Number((((retail - cost) / cost) * 100).toFixed(2));
      setExtMarginPercent(margin);
    }
  };

  const handleBillScanned = (scannedData: {
    shopName?: string;
    partName?: string;
    costPrice?: number;
    sellingPrice?: number;
    billImageUri?: string;
  }) => {
    if (scannedData.shopName) setExtShopName(scannedData.shopName);
    if (scannedData.partName) setExtPartName(scannedData.partName);
    if (scannedData.costPrice) handleExtCostChange(scannedData.costPrice);
    if (scannedData.sellingPrice) handleExtSellingPriceChange(scannedData.sellingPrice);
    if (scannedData.billImageUri) setBillImageUri(scannedData.billImageUri);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !phoneNumber.trim() || !brandModel.trim() || !reportedFault.trim()) {
      alert('Please fill in Customer Name, Phone Number, Machine Brand & Model, and Reported Fault.');
      return;
    }

    // Auto-save Customer to Database & LocalStorage
    saveOrUpdateCustomer({
      customer_name: customerName,
      phone_number: phoneNumber,
      machine_category: machineCategory,
      brand_model: brandModel,
    });

    const jobs = getStoredJobs();

    const costNum = Number(extCostPrice) || 0;
    const sellingNum = Number(extSellingPrice) || (costNum > 0 ? Number((costNum + (costNum * (Number(extMarginPercent) || 30)) / 100).toFixed(2)) : 0);
    const computedMargin = Number(extMarginPercent) || (costNum > 0 ? Math.round(((sellingNum - costNum) / costNum) * 100) : 0);
    const laborNum = Number(laborCharge) || 0;
    const depositNum = Number(advanceDeposit) || 0;

    if (jobToEdit) {
      const updated = jobs.map((j) => {
        if (j.id === jobToEdit.id) {
          let updatedParts = j.parts || [];

          if (hasExternalParts && extPartName.trim()) {
            const extJobPart: JobPart = {
              id: 'jp-ext-' + Date.now(),
              job_card_id: j.id,
              part_id: 'ext-part-' + Date.now(),
              part_name: `${extPartName} (Outside Shop)`,
              quantity: 1,
              unit_price: sellingNum,
              total_price: sellingNum,
              cost_price: costNum,
              margin_percent: computedMargin,
              is_external: true,
              vendor_name: extShopName || 'Outside Shop',
              warranty_days: 30,
            };
            const existsIndex = updatedParts.findIndex(p => p.is_external && p.part_name.startsWith(extPartName));
            if (existsIndex >= 0) {
              updatedParts[existsIndex] = extJobPart;
            } else {
              updatedParts = [...updatedParts, extJobPart];
            }
          }

          const partsTotal = updatedParts.reduce((acc, p) => acc + p.total_price, 0);

          return {
            ...j,
            customer_name: customerName,
            phone_number: phoneNumber,
            machine_category: machineCategory,
            brand_model: brandModel,
            serial_number: serialNumber,
            reported_fault: reportedFault,
            labor_charge: laborNum,
            advance_deposit: depositNum,
            total_amount: partsTotal + laborNum,
            assigned_technician_name: assignedTechnician,
            has_external_parts: hasExternalParts,
            ext_shop_name: extShopName,
            ext_part_name: extPartName,
            ext_cost_price: costNum,
            ext_selling_price: sellingNum,
            parts: updatedParts,
            updated_at: new Date().toISOString(),
          };
        }
        return j;
      });
      saveStoredJobs(updated);
    } else {
      const nextJobNo = generateNextJobNo(jobs);
      const newJobId = 'job-' + Date.now();
      let initialParts: JobPart[] = [];

      if (hasExternalParts && extPartName.trim()) {
        initialParts.push({
          id: 'jp-ext-' + Date.now(),
          job_card_id: newJobId,
          part_id: 'ext-part-' + Date.now(),
          part_name: `${extPartName} (Outside Shop)`,
          quantity: 1,
          unit_price: sellingNum,
          total_price: sellingNum,
          cost_price: costNum,
          margin_percent: computedMargin,
          is_external: true,
          vendor_name: extShopName || 'Outside Shop',
          warranty_days: 30,
        });
      }

      const partsTotal = initialParts.reduce((acc, p) => acc + p.total_price, 0);
      const grandTotal = partsTotal + laborNum;

      const newJob: JobCard = {
        id: newJobId,
        job_no: nextJobNo,
        customer_name: customerName,
        phone_number: phoneNumber,
        machine_category: machineCategory,
        brand_model: brandModel,
        serial_number: serialNumber,
        reported_fault: reportedFault,
        status: 'Pending',
        labor_charge: laborNum,
        advance_deposit: depositNum,
        total_amount: grandTotal,
        assigned_technician_name: assignedTechnician,
        has_external_parts: hasExternalParts,
        ext_shop_name: extShopName,
        ext_part_name: extPartName,
        ext_cost_price: costNum,
        ext_selling_price: sellingNum,
        parts: initialParts,
        created_at: new Date().toISOString(),
      };
      saveStoredJobs([newJob, ...jobs]);
    }

    onSaved();
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/95 animate-in fade-in duration-150 p-0 sm:p-6 flex items-start sm:items-center justify-center min-h-screen">
      <div className="w-full max-w-xl bg-slate-900 sm:rounded-2xl border-0 sm:border border-slate-800 p-4 sm:p-6 space-y-4 shadow-2xl relative min-h-screen sm:min-h-0 sm:my-auto sm:max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 sticky top-0 bg-slate-900 z-40 pt-2 sm:pt-0">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              {jobToEdit ? `Edit Job Card (${jobToEdit.job_no})` : 'New Repair Job Card'}
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

        <form onSubmit={handleSubmit} noValidate className="space-y-4 pb-12 sm:pb-0">
          {/* Optional Returning Customer Selector Dropdown */}
          {customersList.length > 0 && (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <label className="block text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-cyan-400" /> Select Existing Saved Customer (Optional):
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomerFromDropdown(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                <option value="">-- Choose returning customer or type below --</option>
                {customersList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customer_name} ({c.phone_number}) {c.brand_model ? `- ${c.brand_model}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Name Input (100% Clean, NO datalists or popups) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 z-10" />
                <input
                  type="text"
                  name="cust_full_name_clean"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Kamal Perera"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Phone Number Input (100% Clean, NO datalists or popups) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 z-10" />
                <input
                  type="text"
                  name="cust_phone_no_clean"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0771234567"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* 
            Subtle 1-Line Non-Overlapping Auto-Fill Prompt 
            (Appears BELOW inputs ONLY when 4+ characters match an existing customer!)
          */}
          {matchedCustomer && (
            <div className="p-2.5 rounded-xl bg-cyan-950/90 border border-cyan-600/80 text-cyan-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-in fade-in shadow-lg shadow-cyan-950">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
                <div>
                  <p className="font-bold text-white">
                    Matched: <span className="text-cyan-300">{matchedCustomer.customer_name}</span> ({matchedCustomer.phone_number})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => applyCustomerAutoFill(matchedCustomer)}
                className="w-full sm:w-auto py-1 px-3 rounded-lg text-xs font-extrabold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 shadow flex items-center justify-center gap-1 shrink-0 cursor-pointer active:scale-95"
              >
                ⚡ Auto-Fill Details
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Equipment Category / Type Dropdown (Standard Clean Select) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Equipment Category / Type *</label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 z-10" />
                <select
                  value={machineCategory}
                  onChange={(e) => setMachineCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-semibold cursor-pointer"
                >
                  {EQUIPMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Machine Brand & Model */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Brand & Model No. *</label>
              <input
                type="text"
                autoComplete="off"
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                placeholder="e.g. Stihl MS180 / Makita GA4030"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Serial Number & Tech */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Machine Serial No. (Optional)</label>
              <input
                type="text"
                autoComplete="off"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. SN-883920"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Dynamic Assigned Technician Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Technician</label>
              <select
                value={assignedTechnician}
                onChange={(e) => setAssignedTechnician(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {techniciansList.length === 0 ? (
                  <option value="Saman Kumara">Saman Kumara (Senior Tech)</option>
                ) : (
                  techniciansList.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({t.specialization})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Reported Fault */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reported Fault / Customer Note *</label>
            <div className="relative">
              <AlertCircle className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                value={reportedFault}
                onChange={(e) => setReportedFault(e.target.value)}
                placeholder="Describe fault (e.g. Engine starting issue, smoke from motor, broken switch)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Outside Shop Parts Section (පිට කඩෙන් ගෙනා කොටස්) */}
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-900/60 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasExtParts"
                checked={hasExternalParts}
                onChange={(e) => setHasExternalParts(e.target.checked)}
                className="rounded border-slate-800 text-amber-500 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="hasExtParts" className="text-xs font-bold text-amber-300 cursor-pointer flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Mark: Outside Shop Parts Brought (පිට කඩෙන් ගෙනා කොටස් ඇත)
              </label>
            </div>

            {hasExternalParts && (
              <div className="space-y-3 pt-2 border-amber-900/40 text-xs animate-in fade-in duration-200 border-t">
                {/* Embedded Bill Scanner & Camera Upload Tool */}
                <OutsideBillScanner onBillScanned={handleBillScanned} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Outside Shop Name (පිට කඩේ නම)</label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-amber-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={extShopName}
                        onChange={(e) => setExtShopName(e.target.value)}
                        placeholder="e.g. Pettah Hardware / Stihl Dealer"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Part Name (කොටසේ නම) *</label>
                    <input
                      type="text"
                      value={extPartName}
                      onChange={(e) => setExtPartName(e.target.value)}
                      placeholder="e.g. Stihl MS180 Carburetor"
                      className="w-full bg-slate-950 border border-amber-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none font-bold"
                    />
                  </div>
                </div>

                {/* 3-Way Bi-Directional Pricing Box for Outside Shop Parts */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 block">
                    💰 Outside Shop Bi-Directional Pricing Engine (කඩෙන් ගත් ගණන, ලාභ %, පාරිභෝගික විකුණුම් මිල)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 text-[10px] font-semibold mb-1">Pita Shop Cost (LKR)</label>
                      <input
                        type="number"
                        min="0"
                        value={extCostPrice}
                        onChange={(e) => handleExtCostChange(e.target.value === '' ? '' : Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        placeholder="2500"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 font-mono text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-amber-300 text-[10px] font-semibold mb-1">Margin (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={extMarginPercent}
                          onChange={(e) => handleExtMarginChange(e.target.value === '' ? '' : Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          placeholder="30"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-amber-300 font-mono text-xs focus:border-amber-500 focus:outline-none pr-6"
                        />
                        <Percent className="w-3 h-3 text-slate-500 absolute right-2 top-2" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-emerald-400 text-[10px] font-bold mb-1">Bill Retail Price (LKR)</label>
                      <input
                        type="number"
                        min="0"
                        value={extSellingPrice}
                        onChange={(e) => handleExtSellingPriceChange(e.target.value === '' ? '' : Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        placeholder="3250"
                        className="w-full bg-slate-900 border border-emerald-800 rounded-xl px-3 py-1.5 text-emerald-400 font-mono font-bold text-xs focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Financials: Estimated Labor Charge & Advance Deposit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Estimated Labor Charge (LKR)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-emerald-500 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="0"
                  value={laborCharge}
                  onChange={(e) => setLaborCharge(e.target.value === '' ? '' : Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  placeholder="e.g. 1500"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Advance Deposit (LKR)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-cyan-500 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="0"
                  value={advanceDeposit}
                  onChange={(e) => setAdvanceDeposit(e.target.value === '' ? '' : Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  placeholder="e.g. 500"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-cyan-400 font-mono font-bold focus:border-cyan-500 focus:outline-none"
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
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/50 transition-all cursor-pointer"
            >
              {jobToEdit ? 'Save Changes' : 'Create Job Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
