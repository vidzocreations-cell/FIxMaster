'use client';

import React, { useState, useEffect } from 'react';
import { X, Package, Tag, DollarSign, Percent, AlertTriangle } from 'lucide-react';
import { EQUIPMENT_CATEGORIES, Part, EquipmentCategory } from '@/lib/types';
import { getStoredParts, saveStoredParts } from '@/lib/supabase';

interface PartModalProps {
  isOpen: boolean;
  onClose: () => void;
  partToEdit?: Part | null;
  onSaved: () => void;
}

export default function PartModal({ isOpen, onClose, partToEdit, onSaved }: PartModalProps) {
  const [partName, setPartName] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('Chainsaws');
  const [vendorName, setVendorName] = useState('');
  const [costPrice, setCostPrice] = useState<number | ''>(500);
  const [marginPercent, setMarginPercent] = useState<number | ''>(30);
  const [retailPrice, setRetailPrice] = useState<number | ''>(650);
  const [stockQuantity, setStockQuantity] = useState<number | ''>(10);
  const [minStockAlert, setMinStockAlert] = useState<number | ''>(5);

  useEffect(() => {
    if (partToEdit) {
      setPartName(partToEdit.part_name);
      setCategory(partToEdit.category as EquipmentCategory);
      setVendorName(partToEdit.vendor_name || '');
      setCostPrice(partToEdit.cost_price);
      setMarginPercent(partToEdit.margin_percent);
      setRetailPrice(partToEdit.retail_price);
      setStockQuantity(partToEdit.stock_quantity);
      setMinStockAlert(partToEdit.min_stock_alert);
    } else {
      setPartName('');
      setCategory('Chainsaws');
      setVendorName('');
      setCostPrice(500);
      setMarginPercent(30);
      setRetailPrice(650);
      setStockQuantity(10);
      setMinStockAlert(5);
    }
  }, [partToEdit, isOpen]);

  if (!isOpen) return null;

  // Bi-directional pricing engine:

  // 1. When Cost Price changes
  const handleCostPriceChange = (costVal: number) => {
    setCostPrice(costVal);
    const currMargin = Number(marginPercent) || 0;
    if (costVal > 0 && currMargin >= 0) {
      const computedRetail = Number((costVal + (costVal * currMargin) / 100).toFixed(2));
      setRetailPrice(computedRetail);
    }
  };

  // 2. When Selling Price (Retail Price) changes -> Auto calculate Margin %
  const handleRetailPriceChange = (retailVal: number) => {
    setRetailPrice(retailVal);
    const currCost = Number(costPrice) || 0;
    if (currCost > 0 && retailVal >= 0) {
      const computedMargin = Number((((retailVal - currCost) / currCost) * 100).toFixed(2));
      setMarginPercent(computedMargin);
    }
  };

  // 3. When Margin % changes -> Auto calculate Selling Price
  const handleMarginPercentChange = (marginVal: number) => {
    setMarginPercent(marginVal);
    const currCost = Number(costPrice) || 0;
    if (currCost > 0) {
      const computedRetail = Number((currCost + (currCost * marginVal) / 100).toFixed(2));
      setRetailPrice(computedRetail);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = getStoredParts();

    const finalCost = Number(costPrice) || 0;
    const finalRetail = Number(retailPrice) || 0;
    const finalMargin = Number(marginPercent) || 0;

    if (partToEdit) {
      const updated = parts.map((p) => {
        if (p.id === partToEdit.id) {
          return {
            ...p,
            part_name: partName,
            category,
            vendor_name: vendorName,
            cost_price: finalCost,
            margin_percent: finalMargin,
            retail_price: finalRetail,
            stock_quantity: Number(stockQuantity) || 0,
            min_stock_alert: Number(minStockAlert) || 0,
          };
        }
        return p;
      });
      saveStoredParts(updated);
    } else {
      const newPart: Part = {
        id: 'part-' + Date.now(),
        part_name: partName,
        category,
        vendor_name: vendorName,
        cost_price: finalCost,
        margin_percent: finalMargin,
        retail_price: finalRetail,
        stock_quantity: Number(stockQuantity) || 0,
        min_stock_alert: Number(minStockAlert) || 0,
        created_at: new Date().toISOString(),
      };
      saveStoredParts([newPart, ...parts]);
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 p-3 sm:p-6 flex items-start sm:items-center justify-center">
      <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl relative my-auto max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 sticky top-0 bg-slate-950/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              {partToEdit ? 'Edit Spare Part Item' : 'Add New Spare Part Item'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Part Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Part Name *</label>
            <input
              type="text"
              required
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="e.g. Chainsaw Carburetor Gasket Kit"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Equipment Category *</label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 z-10" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none appearance-none cursor-pointer"
                >
                  {EQUIPMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Vendor / Supplier Name</label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Stihl Lanka / Singer"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing Engine Box (Two-Way Bi-Directional Auto Calculation) */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" /> Pricing & Margin Engine (Bi-Directional Calculation)
            </h3>
            <p className="text-[11px] text-slate-400">
              💡 Selling Price (විකුණුම් මිල) ලබාදුන් විට Profit Margin % එකද, Margin % ලබාදුන් විට Selling Price එකද Auto සාදාගනී.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Cost Price */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Cost Price (LKR)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={costPrice}
                  onChange={(e) => handleCostPriceChange(Number(e.target.value))}
                  placeholder="500"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Selling Price (Retail Price) */}
              <div>
                <label className="block text-[11px] font-bold text-emerald-400 mb-1">Selling Price (LKR)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={retailPrice}
                  onChange={(e) => handleRetailPriceChange(Number(e.target.value))}
                  placeholder="650"
                  className="w-full bg-slate-950 border border-emerald-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Profit Margin % */}
              <div>
                <label className="block text-[11px] font-semibold text-cyan-300 mb-1">Margin (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={marginPercent}
                    onChange={(e) => handleMarginPercentChange(Number(e.target.value))}
                    placeholder="30"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none pr-6"
                  />
                  <Percent className="w-3 h-3 text-slate-500 absolute right-2 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Stock Quantities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">In-Stock Quantity *</label>
              <input
                type="number"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Min Stock Alert Limit</label>
              <div className="relative">
                <AlertTriangle className="w-4 h-4 text-amber-500 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="1"
                  required
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 sticky bottom-0 bg-slate-950/90 backdrop-blur-md z-20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 bg-slate-900 border border-slate-800 hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/50 transition-all cursor-pointer"
            >
              {partToEdit ? 'Save Item' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
