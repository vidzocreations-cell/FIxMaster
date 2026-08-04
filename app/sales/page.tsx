'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, Printer, Calendar, DollarSign, ArrowUpRight, Trash2, RefreshCw, Edit3, RotateCcw, Filter } from 'lucide-react';
import { getStoredInvoices, fetchInvoicesFromSupabaseCloud, deleteStoredInvoice, getStoredProfile } from '@/lib/supabase';
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
          <p className="text-xs text-slate-400">View past sales transactions, filter by date range, edit receipt details, reprint & share receipts via WhatsApp</p>
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
        </div>
      </div>

      {/* Date Filter & Search Controls Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Bar */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Invoice #, Customer Name, or Phone..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Date Range Presets Dropdown */}
          <div className="md:col-span-4 relative">
            <Calendar className="w-4 h-4 text-cyan-400 absolute left-3 top-3 z-10" />
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as SalesDatePreset)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none cursor-pointer font-semibold"
            >
              <option value="all">📅 All Dates Sales (සියලුම දින)</option>
              <option value="today">☀️ Today Sales (අද දින)</option>
              <option value="week">📆 This Week Sales (මෙම සතියේ)</option>
              <option value="month">📅 This Month Sales (මෙම මාසයේ)</option>
              <option value="custom">🔍 Custom Date Range (නියමිත දින)</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="md:col-span-3 flex items-center justify-end">
            <button
              onClick={handleResetFilters}
              className="w-full md:w-auto px-3.5 py-2 rounded-xl text-xs text-slate-400 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Start Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">End Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Invoices Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Subtotal</th>
                <th className="p-3.5">Discount</th>
                <th className="p-3.5">Net Paid</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                    No sales invoices found matching your date or search filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-cyan-400">{inv.invoice_no}</td>
                    <td className="p-3.5 text-slate-400">{new Date(inv.created_at).toLocaleString()}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-200">{inv.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{inv.phone_number}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {inv.payment_method}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono">LKR {inv.subtotal.toLocaleString()}</td>
                    <td className="p-3.5 font-mono text-red-400">
                      {inv.discount > 0 ? `- LKR ${inv.discount.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      LKR {inv.net_payable.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Edit Receipt Button */}
                        <button
                          onClick={() => setEditingInvoice(inv)}
                          className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
                          title="Edit Receipt Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Reprint Button */}
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-cyan-400" /> Reprint
                        </button>

                        {/* WhatsApp Invoice Receipt Sharing Button */}
                        <WhatsAppInvoiceButton invoice={inv} />

                        {/* Delete Invoice Button */}
                        <button
                          onClick={() => handleDeleteInvoice(inv.id, inv.invoice_no)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ThermalReceiptModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        profile={profile}
      />

      <InvoiceEditModal
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        invoiceToEdit={editingInvoice}
        onSaved={loadInvoices}
      />
    </div>
  );
}
