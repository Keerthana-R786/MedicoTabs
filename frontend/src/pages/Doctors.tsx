import React, { useEffect, useState } from 'react';
import { Search, Stethoscope, Building2, Phone, Mail, BadgeCheck } from 'lucide-react';
import { mockDoctorsAPI } from '@/services/mockAPI';
import { User } from '@/types';

const ROLE_LABEL: Record<string, string> = {
  primary_doctor: 'Primary Care',
  specialist_doctor: 'Specialist',
};

const Doctors: React.FC = () => {
  const [doctors, setDoctors] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'primary_doctor' | 'specialist_doctor'>('all');
  const [selected, setSelected] = useState<User | null>(null);

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, roleFilter, doctors]);

  const loadDoctors = async () => {
    const data = await mockDoctorsAPI.getAll();
    setDoctors(data);
    setFiltered(data);
  };

  const applyFilters = async () => {
    let list = doctors;
    if (searchQuery.trim()) {
      list = await mockDoctorsAPI.search(searchQuery);
    }
    if (roleFilter !== 'all') {
      list = list.filter((d) => d.role === roleFilter);
    }
    setFiltered(list);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Doctor Records</h1>
        <p className="text-base-500 mt-1 text-sm">
          Directory of primary and specialist physicians in the care network
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 neu-card p-6">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-base-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, specialty, organization, or license..."
              className="neu-input w-full pl-10"
            />
          </div>

          <div className="neu-pressed rounded-xl p-1.5 flex gap-1 mb-5">
            {[
              { id: 'all' as const, label: 'All' },
              { id: 'primary_doctor' as const, label: 'Primary Care' },
              { id: 'specialist_doctor' as const, label: 'Specialists' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  roleFilter === tab.id
                    ? 'bg-base-200 text-primary-700 shadow-neu-btn'
                    : 'text-base-500 hover:text-base-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map((doctor) => (
              <button
                key={doctor.id}
                type="button"
                onClick={() => setSelected(doctor)}
                className={`neu-btn w-full flex items-center gap-4 px-5 py-4 text-left ${
                  selected?.id === doctor.id ? 'neu-pressed' : ''
                }`}
              >
                <div className="w-11 h-11 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-5 h-5 text-primary-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base-800 text-sm">
                      Dr. {doctor.firstName} {doctor.lastName}
                    </h3>
                    <span
                      className={`neu-badge ${
                        doctor.role === 'specialist_doctor'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-base-300 text-base-700'
                      }`}
                    >
                      {ROLE_LABEL[doctor.role]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-base-500">
                    <span>{doctor.specialization || 'General Practice'}</span>
                    <span className="text-base-300">·</span>
                    <span>{doctor.organization}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <p className="text-[10px] text-base-400 uppercase tracking-wider">License</p>
                  <p className="text-xs font-semibold text-base-700">{doctor.licenseNumber}</p>
                </div>
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="neu-pressed rounded-2xl text-center py-14">
                <Stethoscope className="w-14 h-14 text-base-300 mx-auto mb-3" />
                <p className="text-base-500">No doctors found</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 neu-card p-6">
          {selected ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary-800 rounded-2xl flex items-center justify-center shadow-neu-raised-sm">
                  <Stethoscope className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-base-800 tracking-tight">
                    Dr. {selected.firstName} {selected.lastName}
                  </h2>
                  <p className="text-sm text-primary-700 font-medium mt-0.5">
                    {selected.specialization || 'General Practice'}
                  </p>
                </div>
              </div>

              <div className="neu-pressed rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-base-500 uppercase tracking-wider">Role</p>
                    <p className="text-sm font-semibold text-base-800">{ROLE_LABEL[selected.role]}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-base-500 uppercase tracking-wider">Organization</p>
                    <p className="text-sm font-semibold text-base-800">{selected.organization}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BadgeCheck className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-base-500 uppercase tracking-wider">License</p>
                    <p className="text-sm font-semibold text-base-800">{selected.licenseNumber}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-base-500 uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-semibold text-base-800">{selected.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-base-500 uppercase tracking-wider">Email</p>
                    <p className="text-sm font-semibold text-base-800 break-all">{selected.email}</p>
                  </div>
                </div>
              </div>

              <div className="neu-flat rounded-xl p-4">
                <p className="text-[10px] font-semibold text-base-500 uppercase tracking-wider mb-1">
                  Directory note
                </p>
                <p className="text-xs text-base-600 leading-relaxed">
                  Use this record when routing referrals or confirming specialist availability within the HarborCare network.
                </p>
              </div>
            </div>
          ) : (
            <div className="neu-pressed rounded-2xl text-center py-16 px-4">
              <Stethoscope className="w-14 h-14 text-base-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-base-700">Select a doctor</p>
              <p className="text-xs text-base-500 mt-1.5 max-w-[14rem] mx-auto">
                Choose a physician from the list to view credentials and contact details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Doctors;
