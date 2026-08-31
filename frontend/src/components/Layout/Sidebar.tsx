import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Users, FileText, Stethoscope, MessageSquare,
  Bell, CheckCircle, Settings, Inbox, FileUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isSpecialist = user?.role === 'specialist_doctor';

  const specialistMenuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard', badge: false },
    { path: '/incoming-referrals', icon: Inbox, label: 'Incoming Referrals', badge: true },
    { path: '/patients', icon: Users, label: 'Patient Records', badge: false },
    { path: '/messages', icon: MessageSquare, label: 'Messages', badge: false },
    { path: '/approvals', icon: CheckCircle, label: 'Approvals', badge: false },
    { path: '/document-requests', icon: FileUp, label: 'Document Requests', badge: false },
    { path: '/notifications', icon: Bell, label: 'Notifications', badge: false },
    { path: '/settings', icon: Settings, label: 'Settings', badge: false },
  ];

  const primaryMenuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard', badge: false },
    { path: '/patients', icon: Users, label: 'Patient Records', badge: false },
    { path: '/referrals', icon: FileText, label: 'Referrals', badge: false },
    { path: '/doctors', icon: Stethoscope, label: 'Doctor Records', badge: false },
    { path: '/messages', icon: MessageSquare, label: 'Messages', badge: false },
    { path: '/approvals', icon: CheckCircle, label: 'Approvals', badge: false },
    { path: '/document-requests', icon: FileUp, label: 'Document Requests', badge: false },
    { path: '/notifications', icon: Bell, label: 'Notifications', badge: false },
    { path: '/settings', icon: Settings, label: 'Settings', badge: false },
  ];

  const menuItems = isSpecialist ? specialistMenuItems : primaryMenuItems;

  return (
    <aside className="app-sidebar relative z-[1] w-64 p-4 flex flex-col shrink-0">
      <div className="app-sidebar__brand flex items-center gap-3 p-4 mb-5">
        <div className="app-sidebar__logo w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
          <Stethoscope className="w-5 h-5 text-primary-800" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight tracking-tight">MedicoTabs</h1>
          <p className="text-[10px] text-white/55 font-medium uppercase tracking-wider">
            {isSpecialist ? 'Specialist Portal' : 'EHR System'}
          </p>
        </div>
      </div>

      <nav className="app-sidebar__nav flex-1 rounded-2xl p-2.5 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path || location.pathname.startsWith(item.path + '/');

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            >
              <Icon className="app-sidebar__icon w-[18px] h-[18px]" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.badge && <span className="app-sidebar__badge" aria-hidden />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
