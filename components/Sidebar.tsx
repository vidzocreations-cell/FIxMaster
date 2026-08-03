'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Wrench, CreditCard, History, Settings, Users } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, shortLabel: 'Home' },
  { label: 'Inventory', href: '/inventory', icon: Package, shortLabel: 'Parts' },
  { label: 'Repair Jobs', href: '/jobs', icon: Wrench, shortLabel: 'Jobs' },
  { label: 'Technicians', href: '/technicians', icon: Users, shortLabel: 'Techs' },
  { label: 'POS Terminal', href: '/pos', icon: CreditCard, shortLabel: 'POS' },
  { label: 'Sales History', href: '/sales', icon: History, shortLabel: 'Sales' },
  { label: 'Settings', href: '/settings', icon: Settings, shortLabel: 'Settings' },
];

// Mobile Bottom Nav excluding Settings (since Settings is now in Upper Right Corner)
const MOBILE_BOTTOM_NAV = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Jobs', href: '/jobs', icon: Wrench },
  { label: 'Techs', href: '/technicians', icon: Users },
  { label: 'POS', href: '/pos', icon: CreditCard },
  { label: 'Sales', href: '/sales', icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Left Sidebar (hidden on mobile, visible on md screens and up) */}
      <aside className="hidden md:flex w-64 border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-xl shrink-0 flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-900/40 border border-cyan-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Quick Footer Info */}
        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/60 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">FixMaster Hardware</p>
          <p className="text-[11px] text-slate-500">Multi-Category POS Engine</p>
        </div>
      </aside>

      {/* Mobile Fixed Bottom Navigation Bar (visible on mobile only, hidden on md screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-2xl px-1.5 py-1.5 flex items-center justify-around shadow-2xl">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all flex-1 ${
                isActive
                  ? 'text-cyan-400 font-bold bg-cyan-950/50 border border-cyan-800/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400 scale-110' : 'text-slate-400'}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
