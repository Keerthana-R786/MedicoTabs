import React, { useState } from 'react';
import {
  User, Building2, Bell, Save,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const ROLE_LABEL: Record<string, string> = {
  primary_doctor: 'Primary Care Doctor',
  specialist_doctor: 'Specialist Doctor',
  coordinator: 'Care Coordinator',
};

const DEFAULT_PREFS = {
  emailAlerts: true,
  referralUpdates: true,
  approvalReminders: true,
  weeklyDigest: false,
};

const Settings: React.FC = () => {
  const { user, updateProfile, updatePreferences } = useAuth();
  const { success, info, error: showError } = useToast();
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    organization: user?.organization || '',
    specialization: user?.specialization || '',
    licenseNumber: user?.licenseNumber || '',
  });

  const [prefs, setPrefs] = useState(user?.notificationPreferences || DEFAULT_PREFS);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(profile);

      try {
        await updatePreferences(prefs);
        success('Settings saved', 'Your profile and notification preferences are up to date.');
      } catch (prefErr: any) {
        if (prefErr.response?.status === 501) {
          info(
            'Profile saved',
            'Notification preferences aren’t enabled on this database yet — ask an admin to run the setup migration.'
          );
        } else {
          throw prefErr;
        }
      }
    } catch (err: any) {
      const serverMessage = err.response?.data?.error;
      showError('Couldn’t save settings', serverMessage || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-base-500 mt-1 text-sm">
          Manage your profile, alerts, and workspace preferences
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile */}
        <section className="neu-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-base-800">Profile</h2>
              <p className="text-xs text-base-500">How you appear across MedicoTabs</p>
            </div>
          </div>

          <div className="neu-pressed rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">
                First name
              </label>
              <input
                className="neu-input w-full"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">
                Last name
              </label>
              <input
                className="neu-input w-full"
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                className="neu-input w-full"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">
                Phone
              </label>
              <input
                className="neu-input w-full"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">
                Role
              </label>
              <div className="neu-flat rounded-xl px-4 py-3 text-sm font-semibold text-base-700">
                {ROLE_LABEL[user?.role || ''] || user?.role}
              </div>
            </div>
          </div>
        </section>

        {/* Practice */}
        <section className="neu-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-base-800">Practice details</h2>
              <p className="text-xs text-base-500">Organization and credentials on file</p>
            </div>
          </div>

          <div className="neu-pressed rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">
                Organization
              </label>
              <input
                className="neu-input w-full"
                value={profile.organization}
                onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">
                Specialization
              </label>
              <input
                className="neu-input w-full"
                value={profile.specialization}
                onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                placeholder="e.g. Family Medicine"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">
                License number
              </label>
              <input
                className="neu-input w-full"
                value={profile.licenseNumber}
                onChange={(e) => setProfile({ ...profile, licenseNumber: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* Notifications prefs */}
        <section className="neu-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-base-800">Notification preferences</h2>
              <p className="text-xs text-base-500">Choose what reaches your inbox</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { key: 'emailAlerts' as const, title: 'Email alerts', desc: 'Send important updates to your work email' },
              { key: 'referralUpdates' as const, title: 'Referral status changes', desc: 'Accepted, scheduled, and completed handoffs' },
              { key: 'approvalReminders' as const, title: 'Approval reminders', desc: 'Pending HITL decisions that need your sign-off' },
              { key: 'weeklyDigest' as const, title: 'Weekly digest', desc: 'A summary of referral activity every Monday' },
            ].map((item) => (
              <label
                key={item.key}
                className="neu-btn w-full flex items-center justify-between px-5 py-4 cursor-pointer"
              >
                <div className="text-left pr-4">
                  <p className="text-sm font-semibold text-base-800">{item.title}</p>
                  <p className="text-xs text-base-500 mt-0.5">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs[item.key]}
                  onChange={(e) => setPrefs({ ...prefs, [item.key]: e.target.checked })}
                  className="w-4 h-4 accent-primary-700"
                />
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="neu-btn-primary inline-flex items-center gap-2 min-w-[9rem] justify-center">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
