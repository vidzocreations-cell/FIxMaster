'use client';

import React, { useState } from 'react';
import { Search, Calendar, Filter, RotateCcw, Wrench, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { EQUIPMENT_CATEGORIES, JobStatus } from '@/lib/types';

export type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

interface JobCardFilterBarProps {
  statusTab: string;
  setStatusTab: (status: string) => void;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  counts: {
    all: number;
    pending: number;
    inProgress: number;
    completed: number;
    delivered: number;
    overduePickup: number;
  };
  onResetFilters: () => void;
}

export default function JobCardFilterBar({
  statusTab,
  setStatusTab,
  categoryFilter,
  setCategoryFilter,
  searchQuery,
  setSearchQuery,
  datePreset,
  setDatePreset,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  counts,
  onResetFilters,
}: JobCardFilterBarProps) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const tabs = [
    { key: 'All', label: 'All Active Jobs', count: counts.all, color: 'bg-slate-700 text-slate-200' },
    { key: 'Pending', label: 'Pending', count: counts.pending, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { key: 'In Progress', label: 'In Progress', count: counts.inProgress, color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { key: 'Completed', label: 'Completed', count: counts.completed, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { key: 'OverduePickup', label: '⚠️ Overdue Unpaid (ප්‍රමාද වූ)', count: counts.overduePickup, color: 'bg-red-500/30 text-red-300 border-red-500/60 font-bold animate-pulse' },
  ];

  return (
    <div className="space-y-4 glass-panel p-4 rounded-2xl border border-slate-800">
      {/* 1. Mobile Status Category Selector Dropdown (Hidden on Desktop) */}
      <div className="md:hidden space-y-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
            Job Status Filter Category:
          </label>
          <button
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>More Filters</span>
            {isMobileFiltersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Compact Mobile Dropdown for Status Category */}
        <select
          value={statusTab}
          onChange={(e) => setStatusTab(e.target.value)}
          className="w-full bg-slate-900 border border-cyan-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-400 cursor-pointer shadow-md"
        >
          <option value="All">📋 All Active Jobs ({counts.all})</option>
          <option value="Pending">⏳ Pending ({counts.pending})</option>
          <option value="In Progress">⚡ In Progress ({counts.inProgress})</option>
          <option value="Completed">✅ Completed ({counts.completed})</option>
          <option value="OverduePickup">⚠️ Overdue Unpaid ({counts.overduePickup})</option>
        </select>
      </div>

      {/* 2. Desktop Status Tabs Bar (Hidden on Mobile) */}
      <div className="hidden md:flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {tabs.map((tab) => {
          const isActive = statusTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isActive
                  ? tab.key === 'OverduePickup'
                    ? 'bg-red-600 text-white border-red-400 shadow-md shadow-red-900/50'
                    : 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-900/50'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isActive ? 'bg-white/20 text-white' : tab.color}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Filter Controls Row (Always visible on desktop, collapsible on mobile) */}
      <div className={`grid grid-cols-1 md:grid-cols-12 gap-3 ${isMobileFiltersOpen ? 'block' : 'hidden md:grid'}`}>
        {/* Search Bar */}
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Job #, Customer, Phone, Machine model..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
          />
        </div>

        {/* Repair Mode / Equipment Category Dropdown */}
        <div className="md:col-span-3 relative">
          <div className="flex items-center">
            <Wrench className="w-4 h-4 text-slate-400 absolute left-3 top-3 z-10" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none cursor-pointer"
            >
              <option value="All">All Repair Categories / Modes</option>
              {EQUIPMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Presets Dropdown */}
        <div className="md:col-span-2 relative">
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 z-10" />
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as DatePreset)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {/* Reset Filters Button */}
        <div className="md:col-span-3 flex items-center justify-end">
          <button
            onClick={onResetFilters}
            className="flex items-center justify-center gap-1.5 w-full md:w-auto px-3 py-2 rounded-xl text-xs text-slate-400 bg-slate-900 border border-slate-800 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Pickers */}
      {datePreset === 'custom' && (
        <div className="flex items-center gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">From Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">To Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
