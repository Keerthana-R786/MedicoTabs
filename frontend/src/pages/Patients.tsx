import React, { useEffect, useState } from 'react';
import { Search, Plus, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockPatientsAPI } from '@/services/mockAPI';
import { Patient } from '@/types';

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const navigate = useNavigate();

  useEffect(() => { loadPatients(); }, []);

  useEffect(() => {
    if (searchQuery) performSearch();
    else setFilteredPatients(patients);
  }, [searchQuery, patients]);

  const loadPatients = async () => {
    const data = await mockPatientsAPI.getAll();
    setPatients(data);
    setFilteredPatients(data);
  };

  const performSearch = async () => {
    if (searchQuery.trim()) {
      const results = await mockPatientsAPI.search(searchQuery);
      setFilteredPatients(results);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Patient Records</h1>
          <p className="text-base-500 mt-1 text-sm">Manage and view patient information</p>
        </div>
        <button onClick={() => navigate('/patients/new')}
          className="neu-btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Patient
        </button>
      </div>

      <div className="neu-card p-6">
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-base-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, referral ID, or phone..."
            className="neu-input w-full pl-10"
          />
        </div>

        <div className="space-y-3">
          {filteredPatients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => navigate(`/patients/${patient.id}`)}
              className="neu-btn w-full flex items-center gap-4 px-5 py-4 text-left"
            >
              <div className="w-11 h-11 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base-800 text-sm">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <span className="neu-badge bg-base-300 text-base-600">{patient.referralId}</span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-base-500">
                  <span>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{patient.contactNumber}</span>
                  <span>•</span>
                  <span>{patient.insurance.provider}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-base-400 uppercase tracking-wider">Updated</p>
                <p className="text-xs font-semibold text-base-700">
                  {new Date(patient.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </button>
          ))}

          {filteredPatients.length === 0 && (
            <div className="neu-pressed rounded-2xl text-center py-14">
              <User className="w-14 h-14 text-base-300 mx-auto mb-3" />
              <p className="text-base-500">No patients found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Patients;
