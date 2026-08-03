'use client';

import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Database, Download, Upload, RotateCcw, Save, Building, Link2, CheckCircle2 } from 'lucide-react';
import { getStoredProfile, saveStoredProfile, getStoredJobs, saveStoredJobs, getStoredParts, saveStoredParts, getStoredInvoices, saveStoredInvoices } from '@/lib/supabase';
import { BusinessProfile } from '@/lib/types';

export default function SettingsPage() {
  const [profile, setProfile] = useState<BusinessProfile>(getStoredProfile());
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const prof = getStoredProfile();
    setProfile(prof);
    if (typeof window !== 'undefined') {
      setSbUrl(localStorage.getItem('fixmaster_sb_url') || '');
      setSbKey(localStorage.getItem('fixmaster_sb_key') || '');
    }
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredProfile(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fixmaster_sb_url', sbUrl);
      localStorage.setItem('fixmaster_sb_key', sbKey);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const backupData = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      profile: getStoredProfile(),
      parts: getStoredParts(),
      jobs: getStoredJobs(),
      invoices: getStoredInvoices(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FixMaster_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.parts && parsed.jobs) {
          if (parsed.parts) saveStoredParts(parsed.parts);
          if (parsed.jobs) saveStoredJobs(parsed.jobs);
          if (parsed.invoices) saveStoredInvoices(parsed.invoices);
          if (parsed.profile) saveStoredProfile(parsed.profile);
          alert('Data backup restored successfully!');
          window.location.reload();
        } else {
          alert('Invalid backup JSON format.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Factory Reset
  const handleFactoryReset = () => {
    if (confirm('CAUTION: Are you sure you want to perform a Factory Reset? All current data will be erased.')) {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        alert('Database reset complete.');
        window.location.reload();
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-400" /> Settings & Supabase Cloud Link
        </h1>
        <p className="text-xs text-slate-400">Configure business information, Supabase database keys & data backup controls</p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Settings & Supabase credentials saved successfully!
        </div>
      )}

      {/* 1. Supabase Cloud Configuration */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Link2 className="w-4 h-4 text-cyan-400" /> Supabase Realtime Database Credentials
          </h2>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
            Live Sync Ready
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Enter your Supabase Project URL and Anon API Key below to broadcast data live between Mobile Phones and PC Terminals.
        </p>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Supabase Project URL</label>
            <input
              type="text"
              value={sbUrl}
              onChange={(e) => setSbUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Supabase Anon API Key</label>
            <input
              type="password"
              value={sbKey}
              onChange={(e) => setSbKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Business Profile Details */}
      <form onSubmit={handleSaveProfile} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Building className="w-4 h-4 text-cyan-400" /> Business Profile & Receipt Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Shop / Business Name *</label>
            <input
              type="text"
              required
              value={profile.shop_name}
              onChange={(e) => setProfile({ ...profile, shop_name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Contact Phone Numbers *</label>
            <input
              type="text"
              required
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-300 font-semibold mb-1">Shop Address *</label>
            <input
              type="text"
              required
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Currency Code</label>
            <input
              type="text"
              value={profile.currency}
              onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Default Profit Margin (%)</label>
            <input
              type="number"
              value={profile.default_margin}
              onChange={(e) => setProfile({ ...profile, default_margin: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 text-right">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/50 inline-flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Business Profile
          </button>
        </div>
      </form>

      {/* 3. Data Backup & Maintenance Controls */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Database className="w-4 h-4 text-cyan-400" /> Data Backup & System Reset
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Export JSON */}
          <button
            onClick={handleExportBackup}
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-left space-y-1 transition-all cursor-pointer"
          >
            <Download className="w-5 h-5 text-cyan-400" />
            <p className="text-xs font-bold text-slate-200">Export Backup (JSON)</p>
            <p className="text-[11px] text-slate-400">Download complete database snapshot</p>
          </button>

          {/* Import JSON */}
          <label className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-left space-y-1 transition-all cursor-pointer block relative">
            <Upload className="w-5 h-5 text-emerald-400" />
            <p className="text-xs font-bold text-slate-200">Import Backup (JSON)</p>
            <p className="text-[11px] text-slate-400">Restore database from JSON file</p>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          {/* Factory Reset */}
          <button
            onClick={handleFactoryReset}
            className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 hover:bg-red-900/50 text-left space-y-1 transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5 text-red-400" />
            <p className="text-xs font-bold text-red-300">Factory Reset</p>
            <p className="text-[11px] text-red-400">Erase database and restore defaults</p>
          </button>
        </div>
      </div>
    </div>
  );
}
