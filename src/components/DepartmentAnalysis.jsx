import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Header from './Header';
import { calculateAnalytics, calculateDepartmentStats } from '../utils/analytics';

const DepartmentAnalysis = ({ data, onNavigate, onDataUpdate }) => {
  // State untuk menyimpan metrik yang dipilih
  const [selectedMetric, setSelectedMetric] = useState('complianceScore');

  const analytics = useMemo(() => calculateAnalytics(data), [data]);
  const deptStats = useMemo(() => calculateDepartmentStats(data), [data]);

  // Konfigurasi Pilihan Metrik
  const metricOptions = [
    { value: 'complianceScore', label: 'Compliance Score (%)', color: '#8b5cf6' }, // Ungu
    { value: 'attendance', label: 'Tingkat Kehadiran (%)', color: '#10b981' },    // Hijau
    { value: 'punctuality', label: 'Tingkat Ketepatan (%)', color: '#3b82f6' },   // Biru
    { value: 'effectiveHours', label: 'Jam Kerja Efektif (%)', color: '#06b6d4' }, // Cyan
    { value: 'lateCount', label: 'Jumlah Keterlambatan (x)', color: '#ef4444' },  // Merah
    { value: 'lateRate', label: 'Rate Keterlambatan (%)', color: '#ef4444' },      // Merah
    { value: 'earlyLeaveCount', label: 'Jumlah Pulang Cepat (x)', color: '#f59e0b' }, // Orange
    { value: 'overtimeCount', label: 'Jumlah Lembur (x)', color: '#6366f1' },      // Indigo
    { value: 'sick', label: 'Jumlah Sakit (Hari)', color: '#eab308' },             // Kuning
    { value: 'leave', label: 'Jumlah Cuti (Hari)', color: '#ec4899' },             // Pink
  ];

  // Helper untuk mendapatkan config saat ini
  const currentMetricConfig = metricOptions.find(m => m.value === selectedMetric) || metricOptions[0];

  // Data Processor: Memastikan data string (misal "98.5") diubah jadi number agar grafik valid
  const chartData = useMemo(() => {
    if (!deptStats) return [];
    return deptStats.map(dept => ({
      ...dept,
      // Konversi nilai ke float/number
      [selectedMetric]: parseFloat(dept[selectedMetric]) || 0 
    })).sort((a, b) => b[selectedMetric] - a[selectedMetric]); // Urutkan dari terbesar ke terkecil
  }, [deptStats, selectedMetric]);

  if (!analytics) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentPage="departments" 
        onNavigate={onNavigate} 
        onDataUpdate={onDataUpdate}
        analytics={analytics}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Analisis Per Departemen</h2>
        
        {/* CHART SECTION */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Perbandingan Departemen</h3>
              <p className="text-sm text-gray-500">Visualisasi metrik kinerja per divisi</p>
            </div>
            
            {/* DROPDOWN FILTER */}
            <div className="w-full md:w-64">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Metrik</label>
              <select 
                value={selectedMetric} 
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {metricOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={80} 
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => [value, currentMetricConfig.label]}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar 
                dataKey={selectedMetric} 
                fill={currentMetricConfig.color} 
                name={currentMetricConfig.label} 
                radius={[4, 4, 0, 0]}
                barSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Departemen</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Karyawan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Kehadiran</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Ketepatan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Compliance</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Terlambat</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Pulang Cepat</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Lembur</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Sakit</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Cuti</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Dinas</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {deptStats.map((dept, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{dept.name}</td>
                  <td className="px-4 py-3 text-sm text-center">{dept.employees}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">{dept.attendance}%</td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">{dept.punctuality}%</td>
                  <td className="px-4 py-3 text-sm font-semibold text-purple-600">{dept.complianceScore}%</td>
                  <td className="px-4 py-3 text-sm">
                    {dept.lateCount}x <span className="text-gray-400 text-xs">({dept.lateTotalHours}h)</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {dept.earlyLeaveCount}x <span className="text-gray-400 text-xs">({dept.earlyLeaveTotalHours}h)</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {dept.overtimeCount}x <span className="text-gray-400 text-xs">({dept.overtimeTotalHours}h)</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">{dept.sick}</td>
                  <td className="px-4 py-3 text-sm text-center">{dept.leave}</td>
                  <td className="px-4 py-3 text-sm text-center">{dept.businessTrip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DepartmentAnalysis;