'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Plus, Search, Filter, Edit, Trash2, AlertTriangle, ArrowUpDown, Tag, ExternalLink, ShoppingBag, DollarSign, TrendingUp, RefreshCw, Wrench } from 'lucide-react';
import { getStoredParts, saveStoredParts, getStoredJobs, fetchJobsFromSupabaseCloud } from '@/lib/supabase';
import { Part, EQUIPMENT_CATEGORIES, JobCard, JobPart } from '@/lib/types';
import PartModal from '@/components/PartModal';

interface OutsidePurchaseItem {
  id: string;
  job_no: string;
  job_id: string;
  customer_name: string;
  phone_number: string;
  part_name: string;
  vendor_name: string;
  quantity: number;
  cost_price: number;
  retail_price: number;
  profit: number;
  margin_percent: number;
  job_status: string;
  date: string;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'outside'>('catalog');
  const [parts, setParts] = useState<Part[]>([]);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const loadData = async () => {
    // Local load
    setParts(getStoredParts());
    setJobs(getStoredJobs());

    // Sync Cloud jobs for accurate outside purchases
    setIsCloudSyncing(true);
    const cloudJobs = await fetchJobsFromSupabaseCloud();
    setJobs(cloudJobs);
    setIsCloudSyncing(false);
  };

  useEffect(() => {
    loadData();

    // Background polling every 4 seconds
    const interval = setInterval(async () => {
      const cloudJobs = await fetchJobsFromSupabaseCloud();
      setJobs(cloudJobs);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleDeletePart = (id: string) => {
    if (confirm('Are you sure you want to delete this spare part item from catalog?')) {
      const updated = parts.filter((p) => p.id !== id);
      saveStoredParts(updated);
      setParts(updated);
    }
  };

  // Filter Catalog Parts
  const filteredParts = parts.filter((part) => {
    const matchesSearch =
      part.part_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (part.vendor_name && part.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'All' || part.category === categoryFilter;

    let matchesStock = true;
    if (stockStatusFilter === 'Low') {
      matchesStock = part.stock_quantity <= part.min_stock_alert && part.stock_quantity > 0;
    } else if (stockStatusFilter === 'Out') {
      matchesStock = part.stock_quantity === 0;
    } else if (stockStatusFilter === 'In') {
      matchesStock = part.stock_quantity > part.min_stock_alert;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Extract Outside Shop Purchases list from Repair Jobs
  const outsidePurchases: OutsidePurchaseItem[] = [];

  jobs.forEach((job) => {
    // 1. From parts array marked as is_external
    if (job.parts && job.parts.length > 0) {
      job.parts.forEach((p) => {
        if (p.is_external || (p.cost_price && p.cost_price > 0)) {
          const cost = p.cost_price || 0;
          const retail = p.unit_price || p.total_price || 0;
          const qty = p.quantity || 1;
          const totalCost = cost * qty;
          const totalRetail = p.total_price || (retail * qty);
          const profit = totalRetail - totalCost;
          const margin = totalCost > 0 ? Math.round(((totalRetail - totalCost) / totalCost) * 100) : p.margin_percent || 0;

          outsidePurchases.push({
            id: p.id || 'ext-' + Math.random(),
            job_no: job.job_no,
            job_id: job.id,
            customer_name: job.customer_name,
            phone_number: job.phone_number,
            part_name: p.part_name,
            vendor_name: p.vendor_name || job.ext_shop_name || 'Outside Supplier',
            quantity: qty,
            cost_price: totalCost,
            retail_price: totalRetail,
            profit,
            margin_percent: margin,
            job_status: job.status,
            date: job.created_at,
          });
        }
      });
    }

    // 2. From legacy ext_part_name fields if not already captured
    if (job.has_external_parts && job.ext_part_name && (!job.parts || job.parts.length === 0)) {
      const cost = job.ext_cost_price || 0;
      const retail = job.ext_selling_price || 0;
      const profit = retail - cost;
      const margin = cost > 0 ? Math.round(((retail - cost) / cost) * 100) : 0;

      outsidePurchases.push({
        id: 'legacy-ext-' + job.id,
        job_no: job.job_no,
        job_id: job.id,
        customer_name: job.customer_name,
        phone_number: job.phone_number,
        part_name: job.ext_part_name,
        vendor_name: job.ext_shop_name || 'Outside Supplier',
        quantity: 1,
        cost_price: cost,
        retail_price: retail,
        profit,
        margin_percent: margin,
        job_status: job.status,
        date: job.created_at,
      });
    }
  });

  // Filter Outside Purchases
  const filteredOutsidePurchases = outsidePurchases.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.part_name.toLowerCase().includes(q) ||
      item.job_no.toLowerCase().includes(q) ||
      item.customer_name.toLowerCase().includes(q) ||
      item.vendor_name.toLowerCase().includes(q)
    );
  });

  const totalOutsideCost = outsidePurchases.reduce((a, b) => a + b.cost_price, 0);
  const totalOutsideRetail = outsidePurchases.reduce((a, b) => a + b.retail_price, 0);
  const totalOutsideProfit = outsidePurchases.reduce((a, b) => a + b.profit, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-cyan-400" /> Inventory & Outside Purchases Manager
            </h1>
            {isCloudSyncing && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" /> Syncing Cloud...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">Manage catalog spare parts, track outside shop purchases & monitor retail profit margins</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingPart(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Catalog Spare Part
          </button>
        </div>
      </div>

      {/* Main View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            activeTab === 'catalog'
              ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-900/40'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" /> In-House Stock Catalog ({parts.length})
        </button>

        <button
          onClick={() => setActiveTab('outside')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            activeTab === 'outside'
              ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-900/40'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <ExternalLink className="w-4 h-4 text-amber-300" /> Outside Shop Purchases ({outsidePurchases.length})
        </button>
      </div>

      {/* TAB 1: IN-HOUSE CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 glass-panel p-4 rounded-2xl border border-slate-800">
            {/* Search */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Part Name or Vendor..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Category Dropdown */}
            <div className="md:col-span-4 relative">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3 z-10" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none"
              >
                <option value="All">All Equipment Categories</option>
                {EQUIPMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Status Dropdown */}
            <div className="md:col-span-3">
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="All">All Stock Levels</option>
                <option value="In">Healthy Stock (&gt; Min)</option>
                <option value="Low">Low Stock Alert (≤ Min)</option>
                <option value="Out">Out of Stock (0)</option>
              </select>
            </div>
          </div>

          {/* Parts Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Part Details</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Vendor</th>
                    <th className="p-3.5">Cost Price</th>
                    <th className="p-3.5">Margin %</th>
                    <th className="p-3.5">Retail Price</th>
                    <th className="p-3.5">Stock Quantity</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredParts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                        No spare parts matched your search filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredParts.map((part) => {
                      const isLow = part.stock_quantity <= part.min_stock_alert && part.stock_quantity > 0;
                      const isOut = part.stock_quantity === 0;

                      return (
                        <tr key={part.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-100">{part.part_name}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                              {part.category}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400">{part.vendor_name || 'N/A'}</td>
                          <td className="p-3.5 font-mono text-slate-300">LKR {part.cost_price.toLocaleString()}</td>
                          <td className="p-3.5 font-mono text-cyan-400 font-bold">+{part.margin_percent}%</td>
                          <td className="p-3.5 font-mono font-bold text-emerald-400">
                            LKR {part.retail_price.toLocaleString()}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs border ${
                                  isOut
                                    ? 'bg-red-950 text-red-400 border-red-800'
                                    : isLow
                                    ? 'bg-amber-950 text-amber-400 border-amber-800'
                                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                }`}
                              >
                                {part.stock_quantity}
                              </span>
                              {isLow && (
                                <span className="text-[10px] text-amber-400 flex items-center gap-1 font-semibold">
                                  <AlertTriangle className="w-3 h-3" /> Low
                                </span>
                              )}
                              {isOut && (
                                <span className="text-[10px] text-red-400 flex items-center gap-1 font-semibold">
                                  Out
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingPart(part);
                                  setIsModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all cursor-pointer"
                                title="Edit Spare Part"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePart(part.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* TAB 2: OUTSIDE SHOP PURCHASES LIST */}
      {activeTab === 'outside' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-amber-900/50 bg-amber-950/20">
              <span className="text-[11px] text-amber-300 font-semibold block">Total Outside Items</span>
              <div className="text-xl font-bold text-white font-mono">{outsidePurchases.length} Parts</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold block">Total Purchase Cost</span>
              <div className="text-xl font-bold text-slate-200 font-mono">LKR {totalOutsideCost.toLocaleString()}</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold block">Total Customer Billing</span>
              <div className="text-xl font-bold text-cyan-400 font-mono">LKR {totalOutsideRetail.toLocaleString()}</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-emerald-900/80 bg-emerald-950/20">
              <span className="text-[11px] text-emerald-400 font-semibold block">Net Profit Earned</span>
              <div className="text-xl font-bold text-emerald-400 font-mono">LKR {totalOutsideProfit.toLocaleString()}</div>
            </div>
          </div>

          {/* Search Bar for Outside Purchases */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-7 top-7" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search outside purchases by Part Name, Job #, Customer, or Vendor..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Outside Purchases Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-amber-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Outside Part Name</th>
                    <th className="p-3.5">Job Card # & Customer</th>
                    <th className="p-3.5">Vendor / Shop</th>
                    <th className="p-3.5">Qty</th>
                    <th className="p-3.5">Cost Price</th>
                    <th className="p-3.5">Margin %</th>
                    <th className="p-3.5">Retail Billed</th>
                    <th className="p-3.5">Net Profit</th>
                    <th className="p-3.5">Job Status</th>
                    <th className="p-3.5 text-right">View Job</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOutsidePurchases.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500 italic">
                        No outside shop purchases found.
                      </td>
                    </tr>
                  ) : (
                    filteredOutsidePurchases.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3.5 font-bold text-white flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{item.part_name}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-cyan-400">{item.job_no}</div>
                          <div className="text-[11px] text-slate-400">{item.customer_name} ({item.phone_number})</div>
                        </td>
                        <td className="p-3.5 text-slate-400">{item.vendor_name}</td>
                        <td className="p-3.5 font-mono font-bold text-slate-200">×{item.quantity}</td>
                        <td className="p-3.5 font-mono text-slate-300">LKR {item.cost_price.toLocaleString()}</td>
                        <td className="p-3.5 font-mono text-cyan-400 font-bold">+{item.margin_percent}%</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">LKR {item.retail_price.toLocaleString()}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-300">+ LKR {item.profit.toLocaleString()}</td>
                        <td className="p-3.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              item.job_status === 'Completed'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : item.job_status === 'Delivered'
                                ? 'bg-purple-950 text-purple-300 border-purple-800'
                                : 'bg-amber-950 text-amber-300 border-amber-800'
                            }`}
                          >
                            {item.job_status === 'Delivered' ? 'Paid & Delivered' : item.job_status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <Link
                            href={`/jobs/${item.job_id}`}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 inline-flex items-center gap-1"
                          >
                            Job <Wrench className="w-3 h-3 text-cyan-400" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <PartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        partToEdit={editingPart}
        onSaved={loadData}
      />
    </div>
  );
}
