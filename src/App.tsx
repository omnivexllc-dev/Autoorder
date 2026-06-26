import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings as SettingsIcon, LogOut, PhoneCall, Calendar, ShieldCheck } from 'lucide-react';
import Login from './components/Login.js';
import Dashboard from './components/Dashboard.js';
import Settings from './components/Settings.js';
import OrderTable from './components/OrderTable.js';
import { Order, DashboardStats } from './types.js';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');

  // Campaign State
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pending: 0,
    calling: 0,
    confirmed: 0,
    cancelled: 0,
    noAnswer: 0,
    failed: 0,
    totalAttempts: 0,
    averageDuration: 0,
  });
  const [isCallingStarted, setIsCallingStarted] = useState(false);
  const [isSimulatorMode, setIsSimulatorMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Read session token from localStorage on boot
  useEffect(() => {
    const savedToken = localStorage.getItem('orderconfirm_admin_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // Fetch campaign dashboard parameters from server
  const fetchCampaignData = async () => {
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch active orders, overall stats, and current background worker status in parallel
      const [ordersRes, statsRes, statusRes] = await Promise.all([
        fetch('/api/orders', { headers }),
        fetch('/api/stats', { headers }),
        fetch('/api/calling/status', { headers }),
      ]);

      if (ordersRes.ok && statsRes.ok && statusRes.ok) {
        const ordersData = await ordersRes.json();
        const statsData = await statsRes.json();
        const statusData = await statusRes.json();

        setOrders(ordersData);
        setStats(statsData);
        setIsCallingStarted(statusData.isCallingStarted);
        setIsSimulatorMode(statusData.isSimulatorMode || false);
      } else if (ordersRes.status === 401 || ordersRes.status === 403) {
        // Token has expired or invalid
        handleLogout();
      }
    } catch (err) {
      console.error('[App] Error refreshing dashboard data:', err);
    }
  };

  // Poll server for live progress updates while logged in
  useEffect(() => {
    if (!token) return;

    fetchCampaignData();

    // Poll every 3 seconds
    const interval = setInterval(() => {
      fetchCampaignData();
    }, 3000);

    return () => clearInterval(interval);
  }, [token]);

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem('orderconfirm_admin_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('orderconfirm_admin_token');
    setToken(null);
    setActiveTab('dashboard');
  };

  const handleStartCalling = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/calling/start', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setIsCallingStarted(true);
        fetchCampaignData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to start calling.');
      }
    } catch (err) {
      alert('Network error starting calling.');
    }
  };

  const handleStopCalling = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/calling/stop', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setIsCallingStarted(false);
        fetchCampaignData();
      }
    } catch (err) {
      console.error('Failed to stop calling:', err);
    }
  };

  // If not logged in, render secure sign in page
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="app-viewport" className="min-h-screen bg-slate-50 text-slate-700 flex flex-col font-sans">
      {/* Universal Top Dashboard Header */}
      <header id="app-header" className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Branding */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-sm">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-800 tracking-tight">OrderConfirm AI</span>
              <span className="text-[10px] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-slate-500 ml-2">v1.0.0</span>
            </div>
          </div>

          {/* Controls & Navigations */}
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Console
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <SettingsIcon className="h-3.5 w-3.5" />
                Settings
              </button>
            </nav>

            {/* Logout Trigger */}
            <button
              onClick={handleLogout}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-all shadow-sm cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Campaign Canvas */}
      <main id="app-main-canvas" className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === 'dashboard' ? (
          <>
            {/* Dashboard Control Panel */}
            <Dashboard
              token={token}
              orders={orders}
              stats={stats}
              isCallingStarted={isCallingStarted}
              isSimulatorMode={isSimulatorMode}
              onRefreshData={fetchCampaignData}
              onStartCalling={handleStartCalling}
              onStopCalling={handleStopCalling}
            />

            {/* Detailed logs and filter system */}
            <OrderTable orders={orders} />
          </>
        ) : (
          <Settings token={token} />
        )}
      </main>

      {/* Footer bar */}
      <footer id="app-footer" className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div>
            &copy; 2026 OrderConfirm AI. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              Secure Admin Console
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Campaign active
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
