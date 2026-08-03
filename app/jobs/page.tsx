'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wrench, Plus, QrCode, ArrowUpRight, MessageSquare, Clock, User, Phone, Tag, CheckCircle2, ExternalLink, AlertTriangle } from 'lucide-react';
import { getStoredJobs, saveStoredJobs } from '@/lib/supabase';
import { JobCard, JobStatus } from '@/lib/types';
import JobCardFilterBar, { DatePreset } from '@/components/JobCardFilterBar';
import JobCardModal from '@/components/JobCardModal';
import WhatsAppButton from '@/components/WhatsAppButton';
import QRModal from '@/components/QRModal';

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [statusTab, setStatusTab] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobCard | null>(null);
  const [qrJob, setQrJob] = useState<JobCard | null>(null);

  const loadJobs = () => {
    setJobs(getStoredJobs());
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleUpdateStatus = (jobId: string, newStatus: JobStatus) => {
    const updated = jobs.map((j) => {
      if (j.id === jobId) {
        return {
          ...j,
          status: newStatus,
          updated_at: new Date().toISOString(),
        };
      }
      return j;
    });
    saveStoredJobs(updated);
    setJobs(updated);
  };

  const handleResetFilters = () => {
    setStatusTab('All');
    setCategoryFilter('All');
    setSearchQuery('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  // Helper to check if a completed job is overdue for pickup/payment (>2 days)
  const isOverduePickup = (job: JobCard) => {
    if (job.status !== 'Completed') return false;
    const dateToCheck = job.updated_at ? new Date(job.updated_at) : new Date(job.created_at);
    const diffDays = (Date.now() - dateToCheck.getTime()) / (1000 * 3600 * 24);
    return diffDays >= 2;
  };

  const counts = {
    all: jobs.length,
    pending: jobs.filter((j) => j.status === 'Pending').length,
    inProgress: jobs.filter((j) => j.status === 'In Progress').length,
    completed: jobs.filter((j) => j.status === 'Completed').length,
    delivered: jobs.filter((j) => j.status === 'Delivered').length,
    overduePickup: jobs.filter(isOverduePickup).length,
  };

  const filteredJobs = jobs.filter((job) => {
    if (statusTab !== 'All') {
      if (statusTab === 'OverduePickup') {
        if (!isOverduePickup(job)) return false;
      } else if (statusTab === 'Delivered') {
        if (job.status !== 'Delivered') return false;
      } else if (job.status !== statusTab) {
        return false;
      }
    }

    if (categoryFilter !== 'All' && job.machine_category !== categoryFilter) {
      return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matches =
        job.job_no.toLowerCase().includes(q) ||
        job.customer_name.toLowerCase().includes(q) ||
        job.phone_number.toLowerCase().includes(q) ||
        job.brand_model.toLowerCase().includes(q) ||
        job.reported_fault.toLowerCase().includes(q) ||
        (job.external_parts_note && job.external_parts_note.toLowerCase().includes(q));
      if (!matches) return false;
    }

    if (datePreset !== 'all') {
      const jobDate = new Date(job.created_at);
      const now = new Date();

      if (datePreset === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        if (!job.created_at.startsWith(todayStr)) return false;
      } else if (datePreset === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (jobDate < oneWeekAgo) return false;
      } else if (datePreset === 'month') {
        if (jobDate.getMonth() !== now.getMonth() || jobDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (datePreset === 'custom' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (jobDate < start || jobDate > end) return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-cyan-400" /> Repair Job Cards Terminal
          </h1>
          <p className="text-xs text-slate-400">Track equipment repairs, assign spare parts, update statuses & notify customers</p>
        </div>

        <button
          onClick={() => {
            setEditingJob(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/50 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create New Job Card
        </button>
      </div>

      {/* Enhanced Multi-Filter Component */}
      <JobCardFilterBar
        statusTab={statusTab}
        setStatusTab={setStatusTab}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        datePreset={datePreset}
        setDatePreset={setDatePreset}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        counts={counts}
        onResetFilters={handleResetFilters}
      />

      {/* Overdue Notice Banner if Overdue Tab is active */}
      {statusTab === 'OverduePickup' && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
            <div>
              <p className="font-bold text-white">Overdue Pickup & Payment Alert (ගෙවීම් සහ ලබාගැනීම් ප්‍රමාද වූ Jobs)</p>
              <p className="text-[11px] text-red-300">
                මෙම Completed Repair Jobs සාදා නිමකර දින 2කට වඩා ගතවී ඇතත් Customer විසින් තවමත් ලබාගෙන නොමැත. WhatsApp හරහා Reminder යවන්න.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Job Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredJobs.length === 0 ? (
          <div className="col-span-full glass-panel rounded-2xl border border-slate-800 p-12 text-center text-slate-500 italic space-y-2">
            <Wrench className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No job cards found matching your date, category, or search filters.</p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const partsTotal = job.parts ? job.parts.reduce((a, b) => a + b.total_price, 0) : 0;
            const grandTotal = partsTotal + job.labor_charge;
            const hasExt = job.has_external_parts || (job.parts && job.parts.some((p) => p.is_external));
            const isOverdue = isOverduePickup(job);

            return (
              <div
                key={job.id}
                className={`glass-panel p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                  isOverdue
                    ? 'border-red-600/80 bg-red-950/20 shadow-lg shadow-red-950/40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-cyan-400">{job.job_no}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(job.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-100 text-sm">{job.customer_name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" /> {job.phone_number}
                    </p>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={job.status}
                    onChange={(e) => handleUpdateStatus(job.id, e.target.value as JobStatus)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-none ${
                      job.status === 'Pending'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                        : job.status === 'In Progress'
                        ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                        : job.status === 'Completed'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : 'bg-purple-950/80 text-purple-300 border-purple-800'
                    }`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Delivered">Delivered / Paid</option>
                  </select>
                </div>

                {/* Overdue Alert Banner on Card */}
                {isOverdue && (
                  <div className="px-3 py-1.5 rounded-xl bg-red-950/90 border border-red-800 text-[11px] text-red-300 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                    <span>⚠️ Payment & Pickup Overdue (&gt;2 Days Completed)</span>
                  </div>
                )}

                {/* Equipment & Fault */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-300 font-semibold">
                    <span>{job.brand_model}</span>
                    <span className="text-[10px] text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-900">
                      {job.machine_category}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] line-clamp-2">Fault: {job.reported_fault}</p>

                  {/* Outside Shop Parts Badge Indicator */}
                  {hasExt && (
                    <div className="pt-1 flex items-center gap-1.5 text-amber-300 text-[10px] font-bold">
                      <ExternalLink className="w-3 h-3 text-amber-400" />
                      <span>Outside Shop Parts Marked</span>
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                  <div>
                    <span className="text-slate-400 text-[11px]">Parts ({job.parts?.length || 0}) + Labor:</span>
                    <div className="font-mono font-bold text-emerald-400 text-sm">
                      LKR {grandTotal.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <WhatsAppButton job={job} />
                    <button
                      onClick={() => setQrJob(job)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 bg-slate-900 border border-slate-800 transition-all cursor-pointer"
                      title="Print Job Ticket QR"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="w-full py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
                  >
                    Manage Job & Assign Parts <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <JobCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        jobToEdit={editingJob}
        onSaved={loadJobs}
      />
      <QRModal
        isOpen={!!qrJob}
        onClose={() => setQrJob(null)}
        job={qrJob}
      />
    </div>
  );
}
