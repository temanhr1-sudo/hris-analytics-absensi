import React, { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import Header from './Header';
import { calculateAnalytics } from '../utils/analytics';

const KPIMatrix = ({ data, onNavigate, onDataUpdate }) => {
  const analytics = useMemo(() => calculateAnalytics(data), [data]);

  if (!analytics) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentPage="kpi" 
        onNavigate={onNavigate} 
        onDataUpdate={onDataUpdate}
        analytics={analytics}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Performance Indicators (KPI)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Tingkat Kehadiran</h3>
            <p className="text-4xl font-bold mb-2">{analytics.attendanceRate}%</p>
            <p className="text-sm opacity-80">Hadir / Total Hari Kerja × 100%</p>
            <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-xs">Formula: {analytics.attendanceCount} / {analytics.totalRecords} × 100</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Tingkat Ketepatan</h3>
            <p className="text-4xl font-bold mb-2">{analytics.punctualityRate}%</p>
            <p className="text-sm opacity-80">Tepat Waktu / Total Hadir × 100%</p>
            <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-xs">Formula: {analytics.attendanceCount - analytics.lateRecords} / {analytics.attendanceCount} × 100</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Tingkat Keterlambatan</h3>
            <p className="text-4xl font-bold mb-2">{analytics.lateRate}%</p>
            {/* PERBAIKAN DESKRIPSI FORMULA */}
            <p className="text-sm opacity-80">Terlambat / Total Hadir × 100%</p>
            <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-xs">Formula: {analytics.lateRecords} / {analytics.attendanceCount} × 100</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Tingkat Alpha</h3>
            <p className="text-4xl font-bold mb-2">{analytics.alphaRate}%</p>
            <p className="text-sm opacity-80">Alpha / Total Hari Kerja × 100%</p>
            <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-xs">Formula: {analytics.absentCount} / {analytics.totalRecords} × 100</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Compliance Score</h3>
            <p className="text-4xl font-bold mb-2">{analytics.complianceScore}%</p>
            <p className="text-sm opacity-80">(Kehadiran × 60%) + (Ketepatan × 40%)</p>
            <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-xs">Formula: ({analytics.attendanceRate} × 0.6) + ({analytics.punctualityRate} × 0.4)</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Jam Kerja Efektif</h3>
            <p className="text-4xl font-bold mb-2">{analytics.effectiveWorkHours}%</p>
            <p className="text-sm opacity-80">Actual / Standard × 100%</p>
            <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-xs">Rata-rata: {analytics.avgWorkHours}h per hari</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Visualisasi KPI Matrix</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={[
              { metric: 'Kehadiran', value: parseFloat(analytics.attendanceRate), fullMark: 100 },
              { metric: 'Ketepatan', value: parseFloat(analytics.punctualityRate), fullMark: 100 },
              { metric: 'Compliance', value: parseFloat(analytics.complianceScore), fullMark: 100 },
              { metric: 'Jam Efektif', value: parseFloat(analytics.effectiveWorkHours), fullMark: 100 },
              { metric: 'Rendah Terlambat', value: 100 - parseFloat(analytics.lateRate), fullMark: 100 },
              { metric: 'Rendah Alpha', value: 100 - parseFloat(analytics.alphaRate), fullMark: 100 }
            ]}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Performa" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default KPIMatrix;