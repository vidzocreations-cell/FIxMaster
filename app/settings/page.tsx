'use client';

import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Database, Download, Upload, RotateCcw, Save, Building, Link2, CheckCircle2, RefreshCw, Sparkles, Smartphone, Receipt, FileText } from 'lucide-react';
import { getStoredProfile, saveStoredProfile, fetchProfileFromSupabaseCloud, getStoredJobs, saveStoredJobs, getStoredParts, saveStoredParts, getStoredInvoices, saveStoredInvoices } from '@/lib/supabase';
import { BusinessProfile } from '@/lib/types';

export default function SettingsPage() {
  const [profile, setProfile] = useState<BusinessProfile>(getStoredProfile());
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // 1. Initial local load
    const prof = getStoredProfile();
    setProfile(prof);

    if (typeof window !== 'undefined') {
      const defaultUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://emvbsjturokhyjpeoiiv.supabase.co';
      const defaultKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_TAPl-Lyp0TejP6u60giaxA_sk76E7d9';
      setSbUrl(localStorage.getItem('fixmaster_sb_url') || defaultUrl);
      setSbKey(localStorage.getItem('fixmaster_sb_key') || defaultKey);
    }

    // 2. Fetch live profile from Supabase Cloud ONCE on mount so inputs are populated with latest cloud data
    fetchProfileFromSupabaseCloud().then((cloudProf) => {
      if (cloudProf) {
        setProfile(cloudProf);
      }
    });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await saveStoredProfile(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fixmaster_sb_url', sbUrl);
      localStorage.setItem('fixmaster_sb_key', sbKey);
    }
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleSyncLiveUpdates = async () => {
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
          <Settings className="w-6 h-6 text-cyan-400" /> Settings & Live System Sync
        </h1>
        <p className="text-xs text-slate-400">Configure business information, receipt customization, Supabase database keys & data backups</p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Business profile & receipt customization saved & synced to Supabase Cloud!
        </div>
      )}

      {/* 0. In-App Instant Live Updater */}
      <div className="glass-panel p-6 rounded-2xl border border-cyan-800/60 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" /> In-App Instant System Updater (ලයිව් Updates ලබාගන්න)
          </h2>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" /> No APK Re-install Needed
          </span>
        </div>

        <p className="text-xs text-slate-300">
          💡 System එකට කරනු ලබන **සියලුම නව Updates (Job Cards, Modals, Designs, Fixes)** APK එක නැවත Install නොකරම 1-Click එකෙන් සජීවීව Phone එකට ලබාගැනීමට පහත බටන් එක Click කරන්න.
        </p>

        <div className="pt-1">
          <button
            onClick={handleSyncLiveUpdates}
            disabled={isUpdating}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Checking & Applying Live Updates...' : '🚀 Check & Apply Live Updates Now (නවතම Updates සජීවීව ලබාගන්න)'}</span>
          </button>
        </div>
      </div>

      {/* 1. Business Profile & Receipt Information Customization Form */}
      <form onSubmit={handleSaveProfile} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-cyan-400" /> Business Profile & Receipt Customization Table
          </h2>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Realtime Cloud Sync
          </span>
        </div>

        <p className="text-xs text-slate-400">
          පහත සදහන් තොරතුරු වෙනස් කර Save කළ විට, **Print වන සියලුම Invoices & Receipts වල මෙම තොරතුරු ඍජුවම සජීවීව වෙනස් වනු ඇත.**
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Shop / Business Name (ආයතනයේ නම) *</label>
            <input
              type="text"
              required
              value={profile.shop_name}
              onChange={(e) => setProfile({ ...profile, shop_name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Contact Phone Numbers (දුරකථන අංක) *</label>
            <input
              type="text"
              required
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-300 font-semibold mb-1">Shop Address (ලිපිනය) *</label>
            <input
              type="text"
              required
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Business Email (ඊමේල්)</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Currency Symbol (මුදල් ඒකකය)</label>
            <input
              type="text"
              value={profile.currency}
              onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Invoice Number Prefix</label>
            <input
              type="text"
              value={profile.invoice_prefix}
              onChange={(e) => setProfile({ ...profile, invoice_prefix: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Repair Job Number Prefix</label>
            <input
              type="text"
              value={profile.job_prefix}
              onChange={(e) => setProfile({ ...profile, job_prefix: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none font-mono"
            />
          </div>

          {/* Receipt Custom Messages */}
          <div className="md:col-span-2 space-y-3 pt-2 border-t border-slate-800">
            <h3 className="font-bold text-cyan-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Custom Receipt Messages & Terms (Receipt එකේ යටින් මුද්‍රණය වන පාඨ)
            </h3>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Receipt Thank You Footer Message</label>
              <input
                type="text"
                value={profile.receipt_footer_note || ''}
                onChange={(e) => setProfile({ ...profile, receipt_footer_note: e.target.value })}
                placeholder="e.g. *** THANK YOU FOR YOUR BUSINESS ***"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Receipt Warranty & Conditions Note</label>
              <textarea
                rows={2}
                value={profile.receipt_terms || ''}
                onChange={(e) => setProfile({ ...profile, receipt_terms: e.target.value })}
                placeholder="e.g. 30-day warranty applies to replaced parts with this original receipt."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 text-right">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/50 inline-flex items-center gap-2 cursor-pointer"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Saving to Cloud...' : 'Save & Sync Business Settings'}</span>
          </button>
        </div>
      </form>

      {/* 2. Supabase Cloud Configuration */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Link2 className="w-4 h-4 text-cyan-400" /> Supabase Realtime Database Credentials
          </h2>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Live Sync Active
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Your Supabase Cloud Credentials are auto-configured across all Mobile & PC devices for real-time synchronization.
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
