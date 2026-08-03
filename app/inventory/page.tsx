'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, Edit, Trash2, AlertTriangle, ArrowUpDown, Tag } from 'lucide-react';
import { getStoredParts, saveStoredParts } from '@/lib/supabase';
import { Part, EQUIPMENT_CATEGORIES } from '@/lib/types';
import PartModal from '@/components/PartModal';

export default function InventoryPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

  const loadParts = () => {
    setParts(getStoredParts());
  };

  useEffect(() => {
    loadParts();
  }, []);

  const handleDeletePart = (id: string) => {
    if (confirm('Are you sure you want to delete this spare part item from catalog?')) {
      const updated = parts.filter((p) => p.id !== id);
      saveStoredParts(updated);
      setParts(updated);
    }
  };

  // Filter Engine
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-cyan-400" /> Inventory & Spare Parts Catalog
          </h1>
          <p className="text-xs text-slate-400">Manage equipment spare parts, costs, automated retail margins & stock thresholds</p>
        </div>

        <button
          onClick={() => {
            setEditingPart(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/50 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Spare Part Item
        </button>
      </div>

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

      <PartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        partToEdit={editingPart}
        onSaved={loadParts}
      />
    </div>
  );
}
