import React, { useState, useEffect } from 'react';
import { Phone, Shield, Save, Eye, EyeOff, Key, Sparkles, CheckCircle2 } from 'lucide-react';

interface SettingsProps {
  token: string;
}

export default function Settings({ token }: SettingsProps) {
  // Twilio Settings State
  const [sid, setSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [phone, setPhone] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Password Settings State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status State
  const [loadingTwilio, setLoadingTwilio] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [successTwilio, setSuccessTwilio] = useState('');
  const [errorTwilio, setErrorTwilio] = useState('');
  const [successPass, setSuccessPass] = useState('');
  const [errorPass, setErrorPass] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSid(data.twilio_account_sid || '');
        setAuthToken(data.twilio_auth_token || '');
        setPhone(data.twilio_phone_number || '');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSaveTwilio = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingTwilio(true);
    setSuccessTwilio('');
    setErrorTwilio('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          twilio_account_sid: sid,
          twilio_auth_token: authToken,
          twilio_phone_number: phone,
        }),
      });

      if (response.ok) {
        setSuccessTwilio('Twilio configuration saved successfully!');
        setTimeout(() => setSuccessTwilio(''), 5000);
      } else {
        const errData = await response.json();
        setErrorTwilio(errData.error || 'Failed to save settings.');
      }
    } catch (err) {
      setErrorTwilio('Network error saving settings.');
    } finally {
      setLoadingTwilio(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorPass('New passwords do not match.');
      return;
    }

    setLoadingPass(true);
    setSuccessPass('');
    setErrorPass('');

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessPass('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccessPass(''), 5000);
      } else {
        setErrorPass(data.error || 'Failed to change password.');
      }
    } catch (err) {
      setErrorPass('Network error changing password.');
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <div id="settings-view" className="space-y-8 animate-fade-in">
      <div id="settings-header" className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          Settings Panel
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure your Twilio voice calling credentials and manage dashboard security.
        </p>
      </div>

      <div id="settings-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Twilio Configurations Card */}
        <div id="twilio-config-card" className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Twilio API Integration</h2>
              <p className="text-xs text-slate-500">Set up credentials for outbound phone lines</p>
            </div>
          </div>

          <form onSubmit={handleSaveTwilio} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Account SID
              </label>
              <input
                type="text"
                value={sid}
                onChange={(e) => setSid(e.target.value)}
                placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-sm font-mono transition-all"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between">
                Auth Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Your Twilio Authentication Token"
                  className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-sm font-mono transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Twilio Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-sm font-mono transition-all"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">Must be in standard E.164 format with the leading plus symbol (+).</p>
            </div>

            {successTwilio && (
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                {successTwilio}
              </div>
            )}

            {errorTwilio && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                {errorTwilio}
              </div>
            )}

            <button
              type="submit"
              disabled={loadingTwilio}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {loadingTwilio ? 'Saving...' : 'Save Twilio Credentials'}
            </button>
          </form>
        </div>

        {/* Change Admin Password Card */}
        <div id="password-config-card" className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Security Settings</h2>
              <p className="text-xs text-slate-500">Update admin login authorization details</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-sm transition-all"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 4 characters"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-sm transition-all"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-sm transition-all"
                required
              />
            </div>

            {successPass && (
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                {successPass}
              </div>
            )}

            {errorPass && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                {errorPass}
              </div>
            )}

            <button
              type="submit"
              disabled={loadingPass}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              <Key className="h-4 w-4" />
              {loadingPass ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
