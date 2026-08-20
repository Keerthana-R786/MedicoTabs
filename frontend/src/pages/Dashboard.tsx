import React, { useEffect, useState } from 'react';
import { Users, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { mockStatsAPI } from '@/services/mockAPI';
import { DashboardStats } from '@/types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await mockStatsAPI.getDashboard();
    setStats(data);
  };

  const statCards = [
    { label: 'Total Patients', value: stats?.totalPatients || 0, icon: Users, color: 'bg-primary-500' },
    { label: 'Active Referrals', value: stats?.activeReferrals || 0, icon: FileText, color: 'bg-success-500' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals || 0, icon: CheckCircle, color: 'bg-warning-500' },
    { label: 'Completed Today', value: stats?.completedToday || 0, icon: Clock, color: 'bg-primary-600' },
    { label: 'Urgent Cases', value: stats?.urgentCases || 0, icon: AlertCircle, color: 'bg-danger-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your medical practice</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-success-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Referral accepted by Dr. Priya Shah</p>
                <p className="text-xs text-gray-600 mt-1">Elena Marquez - Gastroenterology consultation</p>
                <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Coverage verified for patient</p>
                <p className="text-xs text-gray-600 mt-1">Elena Marquez - HarborCare PPO approved</p>
                <p className="text-xs text-gray-400 mt-1">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-warning-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Appointment scheduled</p>
                <p className="text-xs text-gray-600 mt-1">Michael Chen - Cardiology evaluation</p>
                <p className="text-xs text-gray-400 mt-1">1 day ago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 border-2 border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
              <Users className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">New Patient</p>
            </button>
            <button className="p-4 border-2 border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
              <FileText className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Create Referral</p>
            </button>
            <button className="p-4 border-2 border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
              <CheckCircle className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Pending Approvals</p>
            </button>
            <button className="p-4 border-2 border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
              <Clock className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">View Schedule</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
