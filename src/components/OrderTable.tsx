import React, { useState } from 'react';
import { Search, Download, Filter, Phone, Clock, RotateCcw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Order } from '../types';

interface OrderTableProps {
  orders: Order[];
}

export default function OrderTable({ orders }: OrderTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Filter orders based on search input and status selection
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      order.phone_number.includes(search) ||
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.product_name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export filtered list to standard CSV file
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;

    const headers = [
      'Customer Name',
      'Phone Number',
      'Order Number',
      'Product Name',
      'Price',
      'Status',
      'Attempts',
      'Call Duration (s)',
      'Called At',
      'Completed At'
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.customer_name.replace(/"/g, '""')}"`,
      `"${o.phone_number}"`,
      `"${o.order_number}"`,
      `"${o.product_name.replace(/"/g, '""')}"`,
      `"${o.price}"`,
      `"${o.status}"`,
      o.attempts,
      o.call_duration || 0,
      o.called_at ? new Date(o.called_at).toLocaleString() : '',
      o.completed_at ? new Date(o.completed_at).toLocaleString() : ''
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `order_calls_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#166534] border border-[#bbf7d0]">
            <CheckCircle className="h-3.5 w-3.5" />
            Confirmed
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#fecaca]">
            <XCircle className="h-3.5 w-3.5" />
            Cancelled
          </span>
        );
      case 'Calling':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DBEAFE] text-[#1E40AF] border border-[#bfdbfe] animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
            Calling...
          </span>
        );
      case 'No Answer':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF9C3] text-[#854D0E] border border-[#fef08a]">
            <AlertTriangle className="h-3.5 w-3.5" />
            No Answer
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#fecaca]">
            <XCircle className="h-3.5 w-3.5" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="h-3.5 w-3.5" />
            Pending
          </span>
        );
    }
  };

  return (
    <div id="orders-table-wrapper" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-800">Customer Orders & Call Logs</h2>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers, orders..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative w-full sm:w-44 flex items-center bg-white border border-slate-300 rounded-lg px-2">
            <Filter className="h-4 w-4 text-slate-400 ml-1" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-transparent border-0 text-xs text-slate-700 py-2 pl-2 focus:ring-0 focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Calling">Calling</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Answer">No Answer</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          {/* Export Action */}
          <button
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
            className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 border border-slate-200 text-slate-700 font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
              <th className="px-5 py-3.5">Customer / Phone</th>
              <th className="px-5 py-3.5">Order No</th>
              <th className="px-5 py-3.5">Product Details</th>
              <th className="px-5 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-center">Attempts</th>
              <th className="px-5 py-3.5 text-center">Duration</th>
              <th className="px-5 py-3.5">Call Timestamps</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400 font-medium bg-white">
                  No order call logs found. Upload an Excel or CSV file to start.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70 transition-colors text-sm">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{order.customer_name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {order.phone_number}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono font-medium text-slate-600">
                    {order.order_number}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-slate-800 font-medium">{order.product_name}</div>
                    <div className="text-xs text-blue-600 font-bold mt-0.5">{order.price}</div>
                  </td>
                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-5 py-4 text-center font-mono">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs ${order.attempts > 1 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                      {order.attempts}/3
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center font-mono">
                    {order.call_duration !== null && order.call_duration !== undefined ? (
                      <span className="text-xs text-slate-700">{order.call_duration}s</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs space-y-1">
                    {order.called_at && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <span className="text-slate-400 font-medium">Called:</span>
                        {new Date(order.called_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    {order.completed_at && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <span className="text-slate-400 font-medium">End:</span>
                        {new Date(order.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    {!order.called_at && <span className="text-slate-400 italic">Not called yet</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredOrders.length > 0 && (
        <div className="text-xs text-slate-400 text-right font-medium">
          Showing {filteredOrders.length} of {orders.length} customer records
        </div>
      )}
    </div>
  );
}
