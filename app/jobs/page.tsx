'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wrench, Plus, QrCode, ArrowUpRight, MessageSquare, Clock, User, Phone, Tag, CheckCircle2, ExternalLink, AlertTriangle, Trash2, RefreshCw, Edit3, LayoutGrid, List } from 'lucide-react';
import { getStoredJobs, saveStoredJobs, deleteStoredJob, fetchJobsFromSupabaseCloud } from '@/lib/supabase';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobCard | null>(null);
  const [qrJob, setQrJob] = useState<JobCard | null>(null);

  const loadJobs = async () => {
    // 1. Instant local load
    setJobs(getStoredJobs());

    // 2. Asynchronous Cloud Sync from Supabase
    setIsCloudSyncing(true);
    const cloudJobs = await fetchJobsFromSupabaseCloud();
    setJobs(cloudJobs);
    setIsCloudSyncing(false);
  };

  const handleJobSaved = () => {
    // Automatically reset status tab and date filter to 'All' so newly created job card is 100% visible!
    setStatusTab('All');
    setDatePreset('all');
    loadJobs();
  };

  useEffect(() => {
    loadJobs();

    // 4-second Realtime Cloud Polling for instant multi-device sync
    const interval = setInterval(async () => {
      const cloudJobs = await fetchJobsFromSupabaseCloud();
      setJobs(cloudJobs);
    }, 4000);

    return () => clearInterval(interval);
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

  const handleDeleteJob = (jobId: string, jobNo: string) => {
    if (confirm(`Are you sure you want to delete Job Card ${jobNo}? This action cannot be undone.`)) {
      deleteStoredJob(jobId, jobNo);
      setJobs((prev) => prev.filter((j) => j.id !== jobId && j.job_no !== jobNo));
    }
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
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Wrench className="w-6 h-6 text-cyan-400" /> Repair Job Cards Terminal
            </h1>
            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
              Unlimited ({jobs.length} Total Jobs)
            </span>
            {isCloudSyncing && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" /> Syncing Cloud...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">Track equipment repairs, assign spare parts, switch view layouts & notify customers</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingJob(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/50 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" /> Create New Job Card
          </button>
        </div>
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

      {/* Counter & View Mode Switcher Controls Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1 py-1 bg-slate-900/40 rounded-xl border border-slate-800/80 px-3">
        <div className="flex items-center gap-3">
          <span>Displaying {filteredJobs.length} of {jobs.length} Job Cards</span>
          {(statusTab !== 'All' || categoryFilter !== 'All' || datePreset !== 'all' || searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="text-cyan-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* View Mode Toggle Switcher Buttons (Grid View vs List View) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Grid View (3-Column Cards)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid Cards</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Compact Table / List View"
          >
            <List className="w-3.5 h-3.5" />
            <span>List Table</span>
          </button>
        </div>
      </div>

      {/* 1. GRID VIEW LAYOUT */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.length === 0 ? (
            <div className="col-span-full glass-panel rounded-2xl border border-slate-800 p-12 text-center text-slate-500 italic space-y-2">
              <Wrench className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No job cards found matching your date, category, or search filters.</p>
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-cyan-300 bg-cyan-950 border border-cyan-800 inline-block cursor-pointer mt-2"
              >
                Clear All Filters
              </button>
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

                    {/* Repair Status Dropdown */}
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
                      <option value="Completed">Completed (Ready for POS)</option>
                      {job.status === 'Delivered' && <option value="Delivered">Delivered / Paid</option>}
                    </select>
                  </div>

                  {/* Overdue Alert Banner on Card */}
                  {isOverdue && (
                    <div className="px-3 py-1.5 rounded-xl bg-red-950/90 border border-red-800 text-[11px] text-red-300 font-bold flex items-center gap-1.5 my-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                      <span>⚠️ Payment & Pickup Overdue (&gt;2 Days Completed)</span>
                    </div>
                  )}

                  {/* Equipment & Fault */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1 text-xs my-3">
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

                  {/* Financial Summary & Actions */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
                    <div>
                      <span className="text-slate-400 text-[11px]">Parts ({job.parts?.length || 0}) + Labor:</span>
                      <div className="font-mono font-bold text-emerald-400 text-sm">
                        LKR {grandTotal.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingJob(job);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
                        title="Edit Job Card Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <WhatsAppButton job={job} />
                      
                      <button
                        onClick={() => setQrJob(job)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 bg-slate-900 border border-slate-800 transition-all cursor-pointer"
                        title="Print Job Ticket QR"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteJob(job.id, job.job_no)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 border border-slate-800 transition-all cursor-pointer"
                        title="Delete Job Card"
                      >
                        <Trash2 className="w-4 h-4 text-red-400/80" />
                      </button>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3">
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
      )}

      {/* 2. HIGH-DENSITY COMPACT LIST TABLE VIEW */}
      {viewMode === 'list' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Job #</th>
                  <th className="p-3.5">Customer & Phone</th>
                  <th className="p-3.5">Category & Model</th>
                  <th className="p-3.5">Reported Fault</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Grand Total</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                      No job cards found matching your date, category, or search filters.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => {
                    const partsTotal = job.parts ? job.parts.reduce((a, b) => a + b.total_price, 0) : 0;
                    const grandTotal = partsTotal + job.labor_charge;
                    const isOverdue = isOverduePickup(job);

                    return (
                      <tr
                        key={job.id}
                        className={`hover:bg-slate-900/50 transition-colors ${
                          isOverdue ? 'bg-red-950/20' : ''
                        }`}
                      >
                        <td className="p-3.5">
                          <div className="font-mono font-extrabold text-cyan-400 text-xs">{job.job_no}</div>
                          <div className="text-[10px] text-slate-500">{new Date(job.created_at).toLocaleDateString()}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-white">{job.customer_name}</div>
                          <div className="text-[11px] text-slate-400">{job.phone_number}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-200">{job.brand_model}</div>
                          <span className="text-[10px] text-cyan-400 font-semibold">{job.machine_category}</span>
                        </td>

                        <td className="p-3.5 max-w-xs">
                          <p className="text-slate-300 text-xs line-clamp-1">{job.reported_fault}</p>
                          {isOverdue && (
                            <span className="text-[10px] text-red-400 font-bold block">⚠️ Overdue Pickup</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <select
                            value={job.status}
                            onChange={(e) => handleUpdateStatus(job.id, e.target.value as JobStatus)}
                            className={`text-xs font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none ${
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
                            <option value="Completed">Completed (Ready for POS)</option>
                            {job.status === 'Delivered' && <option value="Delivered">Delivered / Paid</option>}
                          </select>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-emerald-400">
                          LKR {grandTotal.toLocaleString()}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/jobs/${job.id}`}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 inline-flex items-center gap-1"
                            >
                              Manage <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                            </Link>

                            <button
                              onClick={() => {
                                setEditingJob(job);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
                              title="Edit Job Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <WhatsAppButton job={job} />

                            <button
                              onClick={() => setQrJob(job)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 bg-slate-900 border border-slate-800 transition-all cursor-pointer"
                              title="Print QR"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteJob(job.id, job.job_no)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
                              title="Delete Job"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
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
      )}

      {/* Modals */}
      <JobCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        jobToEdit={editingJob}
        onSaved={handleJobSaved}
      />
      <QRModal
        isOpen={!!qrJob}
        onClose={() => setQrJob(null)}
        job={qrJob}
      />
    </div>
  );
}
