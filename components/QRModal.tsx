'use client';

import React from 'react';
import { X, QrCode, Printer } from 'lucide-react';
import { JobCard } from '@/lib/types';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobCard | null;
}

export default function QRModal({ isOpen, onClose, job }: QRModalProps) {
  if (!isOpen || !job) return null;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    JSON.stringify({ job_no: job.job_no, customer: job.customer_name, status: job.status })
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm glass-panel rounded-2xl border border-slate-800 p-6 space-y-4 text-center">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <QrCode className="w-4 h-4 text-cyan-400" /> Job Ticket QR Code
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl inline-block shadow-lg mx-auto">
          {/* eslint-disable-next-html-element-suppression */}
          <img src={qrUrl} alt="Job Ticket QR Code" className="w-44 h-44" />
        </div>

        <div className="space-y-1">
          <p className="font-bold text-white text-base">{job.job_no}</p>
          <p className="text-xs text-slate-400">{job.customer_name} • {job.brand_model}</p>
          <p className="text-[11px] text-cyan-400">Scan QR Code to view status on Mobile/Tablet</p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-xs text-slate-400 bg-slate-900 border border-slate-800 hover:text-white transition-all cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print QR
          </button>
        </div>
      </div>
    </div>
  );
}
