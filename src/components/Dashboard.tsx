import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  PhoneCall,
  Clock,
  Play,
  Square,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Loader2,
  PhoneOff,
  UserPlus,
  Upload,
} from 'lucide-react';
import { DashboardStats, Order } from '../types';

interface DashboardProps {
  token: string;
  orders: Order[];
  stats: DashboardStats;
  isCallingStarted: boolean;
  isSimulatorMode?: boolean;
  onRefreshData: () => void;
  onStartCalling: () => void;
  onStopCalling: () => void;
}

export default function Dashboard({
  token,
  orders,
  stats,
  isCallingStarted,
  isSimulatorMode = false,
  onRefreshData,
  onStartCalling,
  onStopCalling,
}: DashboardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab selection for the right panel (uploading list vs manually adding a single customer)
  const [activeRightTab, setActiveRightTab] = useState<'upload' | 'manual'>('upload');

  // Manual customer order states
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualProduct, setManualProduct] = useState('SaaS Pro Subscription');
  const [manualPrice, setManualPrice] = useState('149');
  const [manualSuccess, setManualSuccess] = useState('');
  const [manualError, setManualError] = useState('');
  const [addingManual, setAddingManual] = useState(false);

  // Compute calling progress stats
  const totalProcessed = stats.confirmed + stats.cancelled + stats.noAnswer + stats.failed;
  const progressPercent = stats.totalOrders > 0 ? Math.round((totalProcessed / stats.totalOrders) * 100) : 0;

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'csv') {
        setFile(droppedFile);
        setUploadError('');
      } else {
        setUploadError('Only Excel (.xlsx) or CSV (.csv) files are supported.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setUploadError('');
    }
  };

  // Upload file to server
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/orders/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadSuccess(data.message || 'File uploaded successfully.');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onRefreshData();
        setTimeout(() => setUploadSuccess(''), 5000);
      } else {
        setUploadError(data.error || 'Failed to import document.');
      }
    } catch (err) {
      setUploadError('Network error uploading file.');
    } finally {
      setUploading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete all customer records, queue settings, and calling history? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/orders/clear', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to clear orders:', err);
    }
  };

  const handleResetCampaign = async () => {
    if (!window.confirm('Do you want to reset all completed/cancelled orders back to "Pending" and set call attempts back to 0 so you can re-run the campaign?')) {
      return;
    }

    try {
      const response = await fetch('/api/orders/reset', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to reset campaign:', err);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim()) {
      setManualError('Customer Name and Phone Number are required.');
      return;
    }

    setAddingManual(true);
    setManualError('');
    setManualSuccess('');

    // Generate a randomized unique order reference
    const randomOrderNum = 'TX' + Math.floor(100000 + Math.random() * 900000);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer_name: manualName.trim(),
          phone_number: manualPhone.trim(),
          order_number: randomOrderNum,
          product_name: manualProduct.trim(),
          price: manualPrice.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setManualSuccess('Customer successfully added to calling queue as Pending!');
        setManualName('');
        setManualPhone('');
        onRefreshData();
        setTimeout(() => setManualSuccess(''), 5000);
      } else {
        setManualError(data.error || 'Failed to add customer.');
      }
    } catch (err) {
      setManualError('Network error adding customer.');
    } finally {
      setAddingManual(false);
    }
  };

  return (
    <div id="dashboard-view" className="space-y-8 animate-fade-in">
      {/* Top Banner and System Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Calling Command Console</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time dashboard monitoring order verification campaigns.
          </p>
        </div>

        {/* Live Indicator Panel */}
        <div className="flex items-center gap-3">
          {isCallingStarted && isSimulatorMode && (
            <div className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              SIMULATOR ACTIVE
            </div>
          )}
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-sm font-semibold transition-all ${
            isCallingStarted
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-white text-slate-500 border-slate-200 shadow-sm'
          }`}>
            <span className={`h-2.5 w-2.5 rounded-full ${isCallingStarted ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
            {isCallingStarted ? 'SYSTEM ONLINE: CAMPAIGN IN PROGRESS' : 'SYSTEM IDLE'}
          </div>

          <button
            onClick={onRefreshData}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-xl transition-all shadow-sm cursor-pointer"
            title="Refresh Stats"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Simulator Mode Informational Alert */}
      {!isCallingStarted && !isSimulatorMode && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5.5 w-5.5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold block text-blue-900">Sandbox Simulation Mode Active</span>
              <span className="text-xs text-blue-700 block mt-0.5">
                Because Twilio API credentials are not configured in settings, starting the campaign will run in <strong>outbound simulation sandbox</strong>. Virtual customers will answer, press keys, and update confirmation statuses automatically in real-time!
              </span>
              <span className="text-xs text-slate-600 block mt-2 bg-white/60 p-2 rounded-lg border border-blue-100">
                🚀 <strong>Want real phone calls?</strong> Go to the <strong>Settings</strong> tab, configure your <strong>Twilio Account SID, Auth Token, and Twilio Phone Number</strong>. Then, use the <strong>Quick Add</strong> form below to add a pending order with your mobile phone number, and click <strong>Start Calling Campaign</strong> to receive a real call!
              </span>
            </div>
          </div>
        </div>
      )}

      {isCallingStarted && isSimulatorMode && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5.5 w-5.5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold block text-amber-900">Virtual Call Simulator Running</span>
              <span className="text-xs text-amber-700 block mt-0.5">
                The campaign is running in virtual demo mode. Outbound calls are being simulated sequentially in the background. Watch the orders below update as virtual customers answer our calls and press IVR keys!
              </span>
              <span className="text-xs text-slate-700 block mt-2 bg-white/60 p-2 rounded-lg border border-amber-100">
                💡 Note: To place actual calls, pause the campaign, save valid Twilio keys in <strong>Settings</strong>, ensure you have <strong>Pending</strong> orders, and start the campaign.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Widgets (Bento Stats) */}
      <div id="stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <div className="p-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono">{stats.totalOrders}</div>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Customer rows imported</p>
          </div>
        </div>

        {/* Confirmed Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmed</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-600 font-mono">
              {stats.confirmed}{' '}
              <span className="text-xs font-semibold text-slate-400">
                ({stats.totalOrders > 0 ? Math.round((stats.confirmed / stats.totalOrders) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Verified by IVR response</p>
          </div>
        </div>

        {/* Cancelled Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cancelled</span>
            <div className="p-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-rose-600 font-mono">
              {stats.cancelled}{' '}
              <span className="text-xs font-semibold text-slate-400">
                ({stats.totalOrders > 0 ? Math.round((stats.cancelled / stats.totalOrders) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Flagged for manual support follow-up</p>
          </div>
        </div>

        {/* Unanswered / Failures */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">No Answer / Failed</span>
            <div className="p-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl">
              <PhoneOff className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-amber-600 font-mono">
              {stats.noAnswer + stats.failed}{' '}
              <span className="text-xs font-semibold text-slate-400">
                ({stats.totalOrders > 0 ? Math.round(((stats.noAnswer + stats.failed) / stats.totalOrders) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Max attempts reached without pickup</p>
          </div>
        </div>
      </div>

      {/* Campaign Control Hub */}
      <div id="campaign-hub-panel" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Progress Meter */}
        <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Calling Queue Progress Meter</h2>
            <p className="text-xs text-slate-500 mt-1">
              Shows how many customers in the queue have been fully processed. Each contact has up to 3 tries.
            </p>
          </div>

          {/* Progress Bar visualizer */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-slate-600">
                <span className="text-blue-600 font-bold font-mono text-base">{totalProcessed}</span> of{' '}
                <span className="font-bold font-mono text-base">{stats.totalOrders}</span> customers called
              </span>
              <span className="text-blue-600 font-mono font-bold text-base">{progressPercent}%</span>
            </div>

            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out flex items-center justify-end px-1.5"
                style={{ width: `${progressPercent}%` }}
              >
                {progressPercent > 5 && <span className="text-[8px] font-bold text-white font-mono">{progressPercent}%</span>}
              </div>
            </div>

            {/* Sub stats row */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[10px] uppercase font-bold text-slate-400">
              <div>
                Pending: <span className="text-slate-700 font-mono font-bold">{stats.pending}</span>
              </div>
              <div>
                In Call: <span className="text-blue-600 font-mono font-bold">{stats.calling}</span>
              </div>
              <div>
                Total Attempts: <span className="text-slate-700 font-mono font-bold">{stats.totalAttempts}</span>
              </div>
            </div>
          </div>

          {stats.pending === 0 && stats.totalOrders > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 text-xs flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold block text-amber-900">Campaign Queue Finished (0 Pending)</span>
                <span className="text-amber-700 block mt-0.5">
                  All customer records in the current list have been called and finalized. To restart and dial again, click the <strong>Reset Campaign Progress</strong> button below or add a new customer on the right.
                </span>
              </div>
            </div>
          )}

          {/* System Control buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            {!isCallingStarted ? (
              <button
                onClick={onStartCalling}
                disabled={stats.pending === 0}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer text-sm"
              >
                <Play className="h-4.5 w-4.5 fill-current" />
                Start Calling Campaign
              </button>
            ) : (
              <button
                onClick={onStopCalling}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer text-sm animate-pulse"
              >
                <Square className="h-4.5 w-4.5 fill-current" />
                Pause Calling Campaign
              </button>
            )}

            <button
              onClick={handleResetCampaign}
              disabled={stats.totalOrders === 0 || isCallingStarted}
              className="px-5 py-3 bg-white hover:bg-blue-50 border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-200 font-semibold rounded-xl flex items-center gap-2 transition-all disabled:opacity-40 cursor-pointer text-sm"
              title="Reset all completed calls back to Pending status"
            >
              <RefreshCw className="h-4.5 w-4.5" />
              Reset Campaign Progress
            </button>

            <button
              onClick={handleClearAll}
              disabled={stats.totalOrders === 0}
              className="px-5 py-3 bg-slate-50 hover:bg-red-50 hover:text-red-700 border border-slate-200 text-slate-600 hover:border-red-200 font-semibold rounded-xl flex items-center gap-2 transition-all disabled:opacity-40 cursor-pointer text-sm"
            >
              <Trash2 className="h-4.5 w-4.5" />
              Clear All Logs
            </button>
          </div>
        </div>

        {/* Right Side: Tabbed Interface for Upload or Quick Manual Add */}
        <div className="border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-6 space-y-4">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveRightTab('upload')}
              className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-all ${
                activeRightTab === 'upload'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload List
            </button>
            <button
              onClick={() => setActiveRightTab('manual')}
              className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-all ${
                activeRightTab === 'manual'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Quick Add
            </button>
          </div>

          {activeRightTab === 'upload' ? (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Import Customer Campaign List</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload a `.xlsx` Excel sheet or `.csv` with customer details.
                </p>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-3">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <FileSpreadsheet className={`h-8 w-8 ${file ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div className="text-xs">
                    {file ? (
                      <span className="text-blue-700 font-semibold font-mono block truncate max-w-[200px]">
                        {file.name}
                      </span>
                    ) : (
                      <>
                        <span className="text-blue-600 font-bold block">Click to upload</span>
                        <span className="text-slate-400 mt-1 block text-[11px]">or drag & drop spreadsheet</span>
                      </>
                    )}
                  </div>
                </div>

                {uploadSuccess && (
                  <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 font-semibold">
                    {uploadSuccess}
                  </div>
                )}

                {uploadError && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    {uploadError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Importing Spreadsheet...
                    </>
                  ) : (
                    'Process Campaign File'
                  )}
                </button>
              </form>

              {/* Quick tips about format requirements */}
              <div className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                <span className="font-bold block text-slate-700 mb-0.5 uppercase tracking-wide">Excel Header Requirements:</span>
                `Customer Name`, `Phone Number`, `Order Number`, `Product Name`, `price`
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Add Test Customer to Queue</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Directly queue a customer to test Twilio calling flows in real-time.
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3 text-left">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Customer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Doe"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Phone Number (to Dial)</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +14155552671"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    Enter your mobile number to receive actual voice calls from Twilio.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Product</label>
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={manualProduct}
                      onChange={(e) => setManualProduct(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Price ($)</label>
                    <input
                      type="number"
                      placeholder="99"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-mono"
                    />
                  </div>
                </div>

                {manualSuccess && (
                  <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 font-semibold">
                    {manualSuccess}
                  </div>
                )}

                {manualError && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    {manualError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={addingManual}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm mt-2"
                >
                  {addingManual ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Queuing customer...
                    </>
                  ) : (
                    'Add Customer to Queue'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
