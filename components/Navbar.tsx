'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wrench, ShieldCheck, Smartphone, RefreshCw, Zap, Settings } from 'lucide-react';
import { getStoredJobs, getStoredParts } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const [pendingJobsCount, setPendingJobsCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleSyncUpdates = async () => {
    setIsUpdating(true);
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
      }
    }
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30 px-3 md:px-6 flex items-center justify-between">
      {/* Brand & Status */}
      <div className="flex items-center gap-2.5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base md:text-lg text-white tracking-wide">
                FixMaster <span className="text-cyan-400 text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 font-mono">v2.0 POS</span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Point of Sale & Repair Management System</p>
          </div>
        </Link>
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

      {/* Right Controls (Upper Right Corner) */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Instant Live Update Sync Button */}
        <button
          onClick={handleSyncUpdates}
          disabled={isUpdating}
          className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950 transition-all cursor-pointer"
          title="Sync Latest System Updates from Cloud"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span className="text-[11px] sm:text-xs">{isUpdating ? 'Syncing...' : 'Sync Update'}</span>
        </button>

        <button
          onClick={handleInstallPwa}
          className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
          title="Install App on Android / iOS / Windows Desktop"
        >
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span className="hidden md:inline">{isPwaInstalled ? 'App Installed' : 'Install App'}</span>
        </button>

        {/* Upper Right Corner Settings Icon Button */}
        <Link
          href="/settings"
          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
            pathname === '/settings'
              ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white border-cyan-400 shadow-md shadow-cyan-900/50'
              : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
          }`}
          title="Settings & Cloud Config"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
