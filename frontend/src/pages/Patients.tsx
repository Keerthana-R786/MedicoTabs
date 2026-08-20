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

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      performSearch();
    } else {
      setFilteredPatients(patients);
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Patient Records</h1>
          <p className="text-gray-600 mt-1">Manage and view patient information</p>
        </div>
        <button
          onClick={() => navigate('/patients/new')}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Patient
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, referral ID, or contact number..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="space-y-3">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => navigate(`/patients/${patient.id}`)}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-primary-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {patient.referralId}
                  </span>
                </div>
                <div className="flex gap-4 mt-1 text-sm text-gray-600">
                  <span>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{patient.contactNumber}</span>
                  <span>•</span>
                  <span>{patient.insurance.provider}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Last updated</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(patient.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}

          {filteredPatients.length === 0 && (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No patients found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Patients;
