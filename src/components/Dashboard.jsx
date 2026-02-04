import React, { useMemo, useState } from 'react';
import { Users, TrendingUp, Activity, Clock, AlertCircle, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Header from './Header';
import { calculateAnalytics } from '../utils/analytics';

const Dashboard = ({ data, onNavigate, onDataUpdate }) => {
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const filteredData = useMemo(() => {
    let filtered = data;
    
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(row => row.Departemen === selectedDepartment);
    }
    
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(row => {
        const rowDate = new Date(row.Tanggal);
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        return rowDate >= start && rowDate <= end;
      });
    }
    
    return filtered;
  }, [data, selectedDepartment, dateRange]);

  const analytics = useMemo(() => calculateAnalytics(filteredData), [filteredData]);

  const departments = useMemo(() => {
    const depts = new Set(data.map(row => row.Departemen).filter(Boolean));
    return ['all', ...Array.from(depts)];
  }, [data]);

  if (!analytics) return null;

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentPage="dashboard" 
        onNavigate={onNavigate} 
        onDataUpdate={onDataUpdate}
        analytics={analytics}
      />

      {/* Filters */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="font-semibold text-gray-700">Filter:</span>
            </div>
            
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Semua Departemen</option>
              {departments.slice(1).map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            
            <span className="text-gray-500">s/d</span>
            
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            
            {(dateRange.start || dateRange.end || selectedDepartment !== 'all') && (
              <button
                onClick={() => {
                  setDateRange({ start: '', end: '' });
                  setSelectedDepartment('all');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium">Total Karyawan</p>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.totalEmployees}</p>
            <p className="text-sm text-gray-500 mt-1">{analytics.totalRecords} hari kerja</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium">Tingkat Kehadiran</p>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.attendanceRate}%</p>
            <p className="text-sm text-gray-500 mt-1">{analytics.attendanceCount} hadir</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium">Compliance Score</p>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.complianceScore}%</p>
            <p className="text-sm text-gray-500 mt-1">60% Kehadiran + 40% Ketepatan</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium">Tingkat Ketepatan</p>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.punctualityRate}%</p>
            <p className="text-sm text-gray-500 mt-1">{analytics.lateRecords} terlambat</p>
          </div>
        </div>

        {/* Detail Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Keterlambatan
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Kejadian:</span>
                <span className="font-bold text-red-600">{analytics.lateRecords}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Waktu:</span>
                <span className="font-bold text-red-600">{analytics.totalLateHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Late Rate:</span>
                <span className="font-bold text-red-600">{analytics.lateRate}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Pulang Cepat
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Kejadian:</span>
                <span className="font-bold text-orange-600">{analytics.earlyLeaveRecords}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Waktu:</span>
                <span className="font-bold text-orange-600">{analytics.totalEarlyLeaveHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Early Leave Rate:</span>
                <span className="font-bold text-orange-600">{analytics.earlyLeaveRate}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              Lembur
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Kejadian:</span>
                <span className="font-bold text-purple-600">{analytics.overtimeRecords}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Waktu:</span>
                <span className="font-bold text-purple-600">{analytics.totalOvertimeHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Overtime Rate:</span>
                <span className="font-bold text-purple-600">{analytics.overtimeRate}%</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Absen Parsial
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Hanya Scan Masuk:</span>
                <span className="font-bold text-yellow-600">{analytics.onlyMasukCount}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hanya Scan Pulang:</span>
                <span className="font-bold text-yellow-600">{analytics.onlyPulangCount}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Parsial:</span>
                <span className="font-bold text-yellow-600">{analytics.partialAttendanceCount}x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Distribusi Kehadiran</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Hadir', value: analytics.attendanceCount },
                    { name: 'Alpha', value: analytics.absentCount },
                    { name: 'Sakit', value: analytics.leaveTypes.sick },
                    { name: 'Cuti', value: analytics.leaveTypes.leave },
                    { name: 'Dinas', value: analytics.leaveTypes.businessTrip }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label
                >
                  {COLORS.map((color, idx) => (
                    <Cell key={idx} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Statistik Waktu</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Terlambat', hours: parseFloat(analytics.totalLateHours) },
                { name: 'Pulang Cepat', hours: parseFloat(analytics.totalEarlyLeaveHours) },
                { name: 'Lembur', hours: parseFloat(analytics.totalOvertimeHours) }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Jam', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="hours">
                  {[0, 1, 2].map((idx) => (
                    <Cell key={idx} fill={['#ef4444', '#f59e0b', '#8b5cf6'][idx]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;