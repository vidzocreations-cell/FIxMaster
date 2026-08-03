'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, Calendar, Wrench, AlertTriangle, ArrowUpRight, Plus, ChevronRight, Package, CheckCircle2, Clock } from 'lucide-react';
import { getStoredJobs, getStoredParts, getStoredInvoices } from '@/lib/supabase';
import { JobCard, Part, Invoice } from '@/lib/types';
import JobCardModal from '@/components/JobCardModal';
import PartModal from '@/components/PartModal';

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [partToRestock, setPartToRestock] = useState<Part | null>(null);

  const refreshData = () => {
    setJobs(getStoredJobs());
    setParts(getStoredParts());
    setInvoices(getStoredInvoices());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Compute Revenue Stats
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const todayRevenue = invoices
    .filter((inv) => inv.created_at.startsWith(todayStr))
    .reduce((acc, inv) => acc + inv.net_payable, 0);

  const monthRevenue = invoices
    .filter((inv) => {
      const d = new Date(inv.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, inv) => acc + inv.net_payable, 0);

  const activeJobs = jobs.filter((j) => j.status === 'Pending' || j.status === 'In Progress');
  const lowStockParts = parts.filter((p) => p.stock_quantity <= p.min_stock_alert);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-xs text-slate-400">Live metrics, active repair cards & low stock monitoring</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsJobModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Job Card
          </button>
          <button
            onClick={() => {
              setPartToRestock(null);
              setIsPartModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Package className="w-4 h-4 text-cyan-400" /> Add Spare Part
          </button>
        </div>
      </div>

      {/* Metrics Widgets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Widget 1: Today Revenue */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Today&apos;s Sales Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            LKR {todayRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" /> Updated live from POS receipts
          </p>
        </div>

        {/* Widget 2: Monthly Revenue */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Monthly Revenue</span>
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800/80 text-cyan-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            LKR {monthRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">Current calendar month total</p>
        </div>

        {/* Widget 3: Pending Repairs */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Repair Jobs</span>
            <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-400">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">
            {activeJobs.length} Jobs
          </div>
          <p className="text-[11px] text-amber-300">Pending & In Progress</p>
        </div>

        {/* Widget 4: Low Stock Alert */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Low Stock Alerts</span>
            <div className="p-2 rounded-xl bg-red-950/60 border border-red-800/80 text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-red-400 font-mono">
            {lowStockParts.length} Parts
          </div>
          <p className="text-[11px] text-red-300">Below minimum threshold</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Jobs Table (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Active Repairs Overview</h2>
            </div>
            <Link href="/jobs" className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold">
              View All Jobs <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">Job #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Category & Model</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500 italic">
                      No active repair jobs right now. All caught up!
                    </td>
                  </tr>
                ) : (
                  activeJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-cyan-400">{job.job_no}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{job.customer_name}</div>
                        <div className="text-[11px] text-slate-500">{job.phone_number}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-200">{job.brand_model}</div>
                        <div className="text-[11px] text-cyan-500/80">{job.machine_category}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            job.status === 'Pending'
                              ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                              : 'bg-blue-950/60 text-blue-400 border-blue-800'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700 inline-block"
                        >
                          Manage Job
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alert Table (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold text-white">Low Stock Parts</h2>
            </div>
            <Link href="/inventory" className="text-xs text-cyan-400 hover:underline font-semibold">
              Catalog
            </Link>
          </div>

          <div className="space-y-3">
            {lowStockParts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                All spare parts stock levels are healthy!
              </p>
            ) : (
              lowStockParts.map((part) => (
                <div
                  key={part.id}
                  className="p-3 rounded-xl bg-slate-900/80 border border-red-950/80 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">{part.part_name}</p>
                    <p className="text-[11px] text-slate-400">{part.category}</p>
                    <div className="text-[11px] font-mono text-red-400">
                      In Stock: <span className="font-bold">{part.stock_quantity}</span> (Min: {part.min_stock_alert})
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPartToRestock(part);
                      setIsPartModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 hover:bg-emerald-900 transition-all cursor-pointer shrink-0"
                  >
                    Restock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <JobCardModal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        onSaved={refreshData}
      />
      <PartModal
        isOpen={isPartModalOpen}
        onClose={() => setIsPartModalOpen(false)}
        partToEdit={partToRestock}
        onSaved={refreshData}
      />
    </div>
  );
}
