'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, Printer, Calendar, DollarSign, ArrowUpRight, Trash2, RefreshCw, Edit3, RotateCcw, Filter, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { getStoredInvoices, fetchInvoicesFromSupabaseCloud, deleteStoredInvoice, getStoredProfile, clearAllSalesHistory, returnFullInvoiceToPOS } from '@/lib/supabase';
import { Invoice } from '@/lib/types';
import ThermalReceiptModal from '@/components/ThermalReceiptModal';
import InvoiceEditModal from '@/components/InvoiceEditModal';
import WhatsAppInvoiceButton from '@/components/WhatsAppInvoiceButton';

export type SalesDatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function SalesHistoryPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<SalesDatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const loadInvoices = async () => {
    // 1. Initial local load for instant UI
    setInvoices(getStoredInvoices());

    // 2. Fetch latest live invoices from Supabase Cloud
    setIsCloudSyncing(true);
    const cloudData = await fetchInvoicesFromSupabaseCloud();
    setInvoices(cloudData);
    setIsCloudSyncing(false);
  };

  useEffect(() => {
    loadInvoices();

    // 3. Realtime background sync polling every 4 seconds
    const interval = setInterval(async () => {
      const cloudData = await fetchInvoicesFromSupabaseCloud();
      setInvoices(cloudData);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleDeleteInvoice = async (invoiceId: string, invoiceNo: string) => {
    if (confirm(`Are you sure you want to delete Invoice ${invoiceNo}? This action cannot be undone.`)) {
      await deleteStoredInvoice(invoiceId, invoiceNo);
      setInvoices((prev) => prev.filter((i) => i.id !== invoiceId && i.invoice_no !== invoiceNo));
      setSelectedInvoiceIds((prev) => prev.filter((id) => id !== invoiceId));
    }
  };

  const handleReturnFullInvoiceToPOS = async (inv: Invoice) => {
    if (
      confirm(
        `Are you sure you want to void Invoice ${inv.invoice_no} and return all included repair jobs back to POS Completed status?`
      )
    ) {
      setIsCloudSyncing(true);
      await returnFullInvoiceToPOS(inv);
      setInvoices((prev) => prev.filter((i) => i.id !== inv.id && i.invoice_no !== inv.invoice_no));
      setSelectedInvoiceIds((prev) => prev.filter((id) => id !== inv.id));
      setIsCloudSyncing(false);
      alert(`✓ Invoice ${inv.invoice_no} voided! All jobs returned to POS Completed status.`);
    }
  };

  const handleBulkDeleteInvoices = async () => {
    if (selectedInvoiceIds.length === 0) return;
    const count = selectedInvoiceIds.length;
    if (confirm(`Are you sure you want to delete ${count} selected invoice(s) from Sales History? This action cannot be undone.`)) {
      setIsCloudSyncing(true);
      for (const id of selectedInvoiceIds) {
        const inv = invoices.find((i) => i.id === id);
        if (inv) {
          await deleteStoredInvoice(inv.id, inv.invoice_no);
        }
      }
      setInvoices((prev) => prev.filter((i) => !selectedInvoiceIds.includes(i.id)));
      setSelectedInvoiceIds([]);
      setIsCloudSyncing(false);
    }
  };

  const handleClearSalesHistory = async () => {
    if (
      confirm(
        '⚠️ WARNING: Are you sure you want to clear ALL past sales history and reset total revenue to LKR 0? New sales will save fresh starting from today forward.'
      )
    ) {
      setIsCloudSyncing(true);
      await clearAllSalesHistory();
      setInvoices([]);
      setSelectedInvoiceIds([]);
      setIsCloudSyncing(false);
      alert('✓ Sales History has been reset to LKR 0! Future sales will be recorded fresh from today forward.');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  const filteredInvoices = invoices.filter((inv) => {
    // 1. Search Query Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matches =
        inv.invoice_no.toLowerCase().includes(q) ||
        inv.customer_name.toLowerCase().includes(q) ||
        inv.phone_number.toLowerCase().includes(q);
      if (!matches) return false;
    }

    // 2. Date Presets Filter
    if (datePreset !== 'all') {
      const invDate = new Date(inv.created_at);
      const now = new Date();

      if (datePreset === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        if (!inv.created_at.startsWith(todayStr)) return false;
      } else if (datePreset === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (invDate < oneWeekAgo) return false;
      } else if (datePreset === 'month') {
        if (invDate.getMonth() !== now.getMonth() || invDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (datePreset === 'custom' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (invDate < start || invDate > end) return false;
      }
    }

    return true;
  });

  const isAllSelected = filteredInvoices.length > 0 && filteredInvoices.every((i) => selectedInvoiceIds.includes(i.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(filteredInvoices.map((i) => i.id));
    }
  };

  const handleToggleSelectInvoice = (id: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const totalSalesRevenue = invoices.reduce((acc, inv) => acc + inv.net_payable, 0);
  const filteredSalesRevenue = filteredInvoices.reduce((acc, inv) => acc + inv.net_payable, 0);
  const profile = getStoredProfile();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <History className="w-6 h-6 text-cyan-400" /> Sales History & Invoice Archive
            </h1>
            {isCloudSyncing && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" /> Syncing Cloud...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            View past sales transactions, filter by date range, edit receipt details, reprint & share receipts via WhatsApp
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-right">
            <span className="text-[11px] text-slate-400 block">Filtered Revenue ({filteredInvoices.length} Bills):</span>
            <span className="text-base font-mono font-extrabold text-cyan-400">
              LKR {filteredSalesRevenue.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-900/80 text-right">
            <span className="text-[11px] text-slate-400 block">Total Lifetime Revenue:</span>
            <div className="text-lg font-mono font-extrabold text-emerald-400">
              LKR {totalSalesRevenue.toLocaleString()}
            </div>
          </div>

          {/* Reset Sales History Button */}
          <button
            type="button"
            onClick={handleClearSalesHistory}
            className="py-3 px-3.5 rounded-2xl text-xs font-bold text-red-300 bg-red-950/80 hover:bg-red-900 border border-red-800 flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
            title="Clear all past sales history and reset revenue to LKR 0 (fresh start from today)"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Reset History to 0</span>
          </button>
        </div>
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedInvoiceIds.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-cyan-950/95 border border-cyan-500 text-cyan-200 text-xs flex items-center justify-between shadow-2xl animate-in fade-in sticky top-4 z-30">
          <div className="flex items-center gap-2 font-bold text-white">
            <CheckSquare className="w-4.5 h-4.5 text-cyan-400" />
            <span>{selectedInvoiceIds.length} Invoice(s) Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedInvoiceIds([])}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={handleBulkDeleteInvoices}
              className="px-4 py-1.5 rounded-xl text-xs font-extrabold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-950 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedInvoiceIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Date Filter & Search Controls Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Bar */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice no, customer name, phone..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Date Filter Quick Presets */}
          <div className="md:col-span-5 flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            {(['all', 'today', 'week', 'month', 'custom'] as SalesDatePreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDatePreset(preset)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all cursor-pointer ${
                  datePreset === preset
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {preset === 'all' ? 'All Time' : preset === 'today' ? 'Today' : preset === 'week' ? 'This Week' : preset === 'month' ? 'This Month' : 'Custom'}
              </button>
            ))}
          </div>

          {/* Reset Filters Button */}
          <div className="md:col-span-3 flex items-center justify-end gap-2">
            {(searchQuery || datePreset !== 'all') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-2 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Selection (Only when Custom preset is active) */}
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/60 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">From Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">To Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Invoices List Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold text-[11px] border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Invoice No</th>
                <th className="p-4">Customer Details</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4 text-right">Net Paid</th>
                <th className="p-4 text-center">Payment Method</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 italic space-y-2">
                    <History className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-sm font-semibold text-slate-400">No Sales Transactions Recorded</p>
                    <p className="text-xs text-slate-500">
                      {invoices.length === 0
                        ? 'Sales history is fresh starting from today! New sales from POS and Repair Jobs will save automatically.'
                        : 'No invoices match your current search or date filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isSelected = selectedInvoiceIds.includes(inv.id);

                  return (
                    <tr key={inv.id} className={`transition-colors ${isSelected ? 'bg-cyan-950/40' : 'hover:bg-slate-900/40'}`}>
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectInvoice(inv.id)}
                          className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 font-mono font-bold text-cyan-400">{inv.invoice_no}</td>
                      <td className="p-4">
                        <div className="font-bold text-white">{inv.customer_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{inv.phone_number}</div>
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-[11px]">
                        {new Date(inv.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-4 text-right font-mono font-extrabold text-emerald-400">
                        LKR {inv.net_payable.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
                          {inv.payment_method}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 rounded-lg text-cyan-400 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800 transition-all cursor-pointer"
                            title="Print Thermal Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <WhatsAppInvoiceButton invoice={inv} />
                          <button
                            type="button"
                            onClick={() => setEditingInvoice(inv)}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-white bg-amber-950/60 hover:bg-amber-900 border border-amber-800 transition-all cursor-pointer"
                            title="Edit Receipt Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReturnFullInvoiceToPOS(inv)}
                            className="p-1.5 rounded-lg text-amber-300 hover:text-white bg-amber-950/90 hover:bg-amber-900 border border-amber-700 transition-all cursor-pointer"
                            title="Void Invoice & Return All Jobs back to POS Completed status"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(inv.id, inv.invoice_no)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-white bg-red-950/60 hover:bg-red-900 border border-red-800 transition-all cursor-pointer"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thermal Receipt Print Modal */}
      {selectedInvoice && (
        <ThermalReceiptModal
          isOpen={!!selectedInvoice}
          invoice={selectedInvoice}
          profile={profile}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Invoice Edit Modal */}
      {editingInvoice && (
        <InvoiceEditModal
          isOpen={!!editingInvoice}
          invoiceToEdit={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaved={loadInvoices}
        />
      )}
    </div>
  );
}
