'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, Printer, Calendar, DollarSign, ArrowUpRight } from 'lucide-react';
import { getStoredInvoices, getStoredProfile } from '@/lib/supabase';
import { Invoice } from '@/lib/types';
import ThermalReceiptModal from '@/components/ThermalReceiptModal';

export default function SalesHistoryPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    setInvoices(getStoredInvoices());
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    return (
      inv.invoice_no.toLowerCase().includes(q) ||
      inv.customer_name.toLowerCase().includes(q) ||
      inv.phone_number.toLowerCase().includes(q)
    );
  });

  const totalSalesRevenue = invoices.reduce((acc, inv) => acc + inv.net_payable, 0);
  const profile = getStoredProfile();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-cyan-400" /> Sales History & Invoice Archive
          </h1>
          <p className="text-xs text-slate-400">View past sales transactions, filter by customer, and reprint sales invoices</p>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-900/80 text-right">
          <span className="text-[11px] text-slate-400">Total Lifetime Sales Revenue:</span>
          <div className="text-xl font-mono font-extrabold text-emerald-400">
            LKR {totalSalesRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-7 top-7" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Invoice #, Customer Name, or Phone..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        />
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
                <th className="p-3.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                    No sales invoices found in history archive.
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
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-cyan-400" /> Reprint
                      </button>
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
    </div>
  );
}
