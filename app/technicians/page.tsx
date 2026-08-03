'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, Phone, Wrench, ShieldCheck, UserCheck, Trash2, Edit, X, Search, CheckCircle2 } from 'lucide-react';
import { getStoredTechnicians, saveStoredTechnicians, deleteStoredTechnician, getStoredJobs } from '@/lib/supabase';
import { Technician, JobCard } from '@/lib/types';
import { createPortal } from 'react-dom';

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = () => {
    setTechnicians(getStoredTechnicians());
    setJobs(getStoredJobs());
  };

  const handleOpenAddModal = () => {
    setEditingTech(null);
    setName('');
    setSpecialization('General Power Tools Tech');
    setPhone('');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tech: Technician) => {
    setEditingTech(tech);
    setName(tech.name);
    setSpecialization(tech.specialization);
    setPhone(tech.phone);
    setStatus(tech.status);
    setIsModalOpen(true);
  };

  const handleDeleteTech = (techId: string, techName: string) => {
    if (confirm(`Are you sure you want to remove technician ${techName}?`)) {
      deleteStoredTechnician(techId);
      loadData();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const current = getStoredTechnicians();

    if (editingTech) {
      const updated = current.map((t) => (t.id === editingTech.id ? { ...t, name, specialization, phone, status } : t));
      saveStoredTechnicians(updated);
    } else {
      const newTech: Technician = {
        id: 'tech-' + Date.now(),
        name,
        specialization,
        phone,
        status,
        created_at: new Date().toISOString(),
      };
      saveStoredTechnicians([...current, newTech]);
    }

    setIsModalOpen(false);
    loadData();
  };

  const filteredTechs = technicians.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.includes(searchQuery)
  );

  const getTechJobCount = (techName: string) => {
    return jobs.filter((j) => j.assigned_technician_name === techName).length;
  };

  const getTechActiveJobCount = (techName: string) => {
    return jobs.filter((j) => j.assigned_technician_name === techName && (j.status === 'Pending' || j.status === 'In Progress')).length;
  };

  const modalContent = isModalOpen ? (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-150 p-3 sm:p-6 flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-2xl relative my-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 sticky top-0 bg-slate-900 z-40">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              {editingTech ? 'Edit Technician' : 'Add New Workshop Technician'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Technician Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ruwan Dissayake"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Specialization / Expertise *</label>
            <input
              type="text"
              required
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="e.g. Chainsaw & Motor Specialist / Power Tools"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Phone Number *</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0771234567"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
            >
              <option value="Active">Active (Available for Job Assignment)</option>
              <option value="Inactive">Inactive / On Leave</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 bg-slate-950 border border-slate-800 hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/50 transition-all cursor-pointer"
            >
              {editingTech ? 'Save Changes' : 'Add Technician'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" /> Workshop Technicians Management
          </h1>
          <p className="text-xs text-slate-400">Manage repair technicians, staff specializations & track active job allocations</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/50 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Technician
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-500 ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search technician by name, specialization or phone..."
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Technicians Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTechs.length === 0 ? (
          <div className="col-span-full glass-panel rounded-2xl border border-slate-800 p-12 text-center text-slate-500 italic space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No technicians found matching your search query.</p>
          </div>
        ) : (
          filteredTechs.map((tech) => {
            const totalJobs = getTechJobCount(tech.name);
            const activeJobs = getTechActiveJobCount(tech.name);

            return (
              <div
                key={tech.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-4 relative flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-950 to-slate-900 border border-cyan-800 flex items-center justify-center font-bold text-cyan-400 text-sm">
                      {tech.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{tech.name}</h3>
                      <p className="text-[11px] text-cyan-400 font-medium">{tech.specialization}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      tech.status === 'Active' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    {tech.status}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" /> {tech.phone}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
                      <span className="block text-slate-400 text-[10px]">Active Jobs</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">{activeJobs}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
                      <span className="block text-slate-400 text-[10px]">Total Handled</span>
                      <span className="font-mono font-bold text-cyan-400 text-sm">{totalJobs}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => handleOpenEditModal(tech)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-cyan-400" /> Edit
                  </button>

                  <button
                    onClick={() => handleDeleteTech(tech.id, tech.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 bg-slate-900 border border-slate-800 transition-all cursor-pointer"
                    title="Remove Technician"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400/80" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </div>
  );
}
