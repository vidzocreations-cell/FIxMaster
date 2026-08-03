'use client';

import React, { useState, useEffect } from 'react';
import { Wrench, ShieldCheck, Download, Smartphone, RefreshCw, Zap } from 'lucide-react';
import { getStoredJobs, getStoredParts } from '@/lib/supabase';

export default function Navbar() {
  const [pendingJobsCount, setPendingJobsCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const jobs = getStoredJobs();
    const parts = getStoredParts();
    setPendingJobsCount(jobs.filter((j) => j.status === 'Pending' || j.status === 'In Progress').length);
    setLowStockCount(parts.filter((p) => p.stock_quantity <= p.min_stock_alert).length);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwaInstalled(true);
    }
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsPwaInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install FixMaster on Mobile/Desktop:\n• Android Chrome: Tap menu (⋮) → "Install App"\n• iOS Safari: Tap Share (⎋) → "Add to Home Screen"');
    }
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-white tracking-wide">FixMaster <span className="text-cyan-400 text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 font-mono">v2.0 POS</span></h1>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">Point of Sale & Repair Management System</p>
        </div>
      </div>

      {/* Center Status Badges */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs text-slate-300">Active Jobs:</span>
          <span className="text-xs font-bold text-amber-400">{pendingJobsCount}</span>
        </div>

        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-900/60">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-xs text-red-300">Low Stock Alert:</span>
            <span className="text-xs font-bold text-red-400">{lowStockCount} Parts</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleInstallPwa}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
          title="Install App on Android / iOS / Windows Desktop"
        >
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">{isPwaInstalled ? 'PWA Installed' : 'Install App'}</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4" />
          <span className="hidden sm:inline">Supabase Connected</span>
        </div>
      </div>
    </header>
  );
}
