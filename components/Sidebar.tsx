'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Wrench, CreditCard, History, Settings, Users } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Inventory & Parts', href: '/inventory', icon: Package },
  { label: 'Repair Job Cards', href: '/jobs', icon: Wrench },
  { label: 'Technicians', href: '/technicians', icon: Users },
  { label: 'POS Terminal', href: '/pos', icon: CreditCard },
  { label: 'Sales History', href: '/sales', icon: History },
  { label: 'Settings & Cloud', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 md:w-64 border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-xl shrink-0 flex flex-col justify-between p-2 md:p-4 min-h-[calc(100vh-4rem)]">
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
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Quick Footer Info */}
      <div className="hidden md:block p-3 rounded-xl bg-slate-900/50 border border-slate-800/60 text-xs text-slate-400">
        <p className="font-semibold text-slate-300">FixMaster Hardware</p>
        <p className="text-[11px] text-slate-500">Multi-Category POS Engine</p>
      </div>
    </aside>
  );
}
