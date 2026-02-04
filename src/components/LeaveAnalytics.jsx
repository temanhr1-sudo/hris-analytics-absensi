import React, { useMemo } from 'react';
import { CalendarX, Briefcase, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Header from './Header';
import { calculateAnalytics, calculateDepartmentStats } from '../utils/analytics';

const LeaveAnalytics = ({ data, onNavigate, onDataUpdate }) => {
  const analytics = useMemo(() => calculateAnalytics(data), [data]);
  const deptStats = useMemo(() => calculateDepartmentStats(data), [data]);

  if (!analytics) return null;

  const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentPage="leave" 
        onNavigate={onNavigate} 
        onDataUpdate={onDataUpdate}
        analytics={analytics}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Analisis Cuti & Izin</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium">Sakit</p>
              <CalendarX className="w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.leaveTypes.sick}</p>
            <p className="text-sm text-gray-500 mt-1">Total hari sakit</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium">Cuti</p>
              <CalendarX className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.leaveTypes.leave}</p>
            <p className="text-sm text-gray-500 mt-1">Total hari cuti</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium">Perjalanan Dinas</p>
              <Briefcase className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.leaveTypes.businessTrip}</p>
            <p className="text-sm text-gray-500 mt-1">Total hari dinas</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 font-medium">Unpaid Leave</p>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.leaveTypes.unpaidLeave}</p>
            <p className="text-sm text-gray-500 mt-1">Total unpaid leave</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Distribusi Jenis Izin</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Sakit', value: analytics.leaveTypes.sick },
                    { name: 'Cuti', value: analytics.leaveTypes.leave },
                    { name: 'Dinas', value: analytics.leaveTypes.businessTrip },
                    { name: 'Unpaid', value: analytics.leaveTypes.unpaidLeave }
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">Izin per Departemen</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {deptStats.map((dept, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-gray-900 mb-2">{dept.name}</p>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-yellow-600 font-bold">{dept.sick}</p>
                      <p className="text-gray-500">Sakit</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-600 font-bold">{dept.leave}</p>
                      <p className="text-gray-500">Cuti</p>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-600 font-bold">{dept.businessTrip}</p>
                      <p className="text-gray-500">Dinas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-red-600 font-bold">{dept.unpaidLeave}</p>
                      <p className="text-gray-500">Unpaid</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveAnalytics;