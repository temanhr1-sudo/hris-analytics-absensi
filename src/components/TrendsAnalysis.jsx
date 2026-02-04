import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Header from './Header';
// IMPORT parseDateLocal & parseTime
import { calculateAnalytics, parseTime, validateAttendance, parseDateLocal } from '../utils/analytics';

// --- HELPER: LINEAR REGRESSION ---
const calculateTrendline = (data, dataKey) => {
  if (!data || data.length < 2) return data;

  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  data.forEach((point, index) => {
    const x = index;
    const y = point[dataKey] || 0;
    
    sumX += x;
    sumY += y;
    sumXY += (x * y);
    sumXX += (x * x);
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return data.map((point, index) => ({
    ...point,
    [`${dataKey}Trend`]: Number((slope * index + intercept).toFixed(2))
  }));
};

const TrendsAnalysis = ({ data, onNavigate, onDataUpdate }) => {
  const [selectedMetric, setSelectedMetric] = useState('attendance');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const analytics = useMemo(() => calculateAnalytics(data), [data]);

  // --- LOGIKA LOKAL ---
  const NON_WORKING_EXCEPTIONS = ['sick', 'sakit', 'leave', 'cuti', 'unpaid', 'izin', 'alpha', 'off'];

  // Helper untuk cek apakah ada text apapun di pengecualian
  const hasAnyException = (row) => {
    const exc = row.Pengecualian;
    return exc && String(exc).trim() !== '' && String(exc) !== '0' && String(exc) !== '-';
  };

  const checkIsWorkingDay = (row) => {
    if (row['Akhir Pekan'] === '1' || row['Akhir Pekan'] === 'True') return false;
    if (row['Hari Libur'] === '1' || row['Hari Libur'] === 'True') return false;
    
    const exception = row.Pengecualian;
    if (exception && exception.trim() !== '' && exception !== '0') {
      const exc = exception.toLowerCase();
      // Hanya exclude jika sakit/cuti secara eksplisit untuk total hari kerja
      if (NON_WORKING_EXCEPTIONS.some(ex => exc.includes(ex))) return false;
    }
    
    if (row.Tanggal) {
      try {
        const date = parseDateLocal(row.Tanggal);
        if (date) {
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) return false; 
        }
      } catch (e) {}
    }
    return true;
  };

  const calculateOvertimeMinutes = (row) => {
    const manualOvertime = parseTime(row.Lembur);
    if (manualOvertime > 0) return manualOvertime;

    const scanPulang = parseTime(row['Scan Pulang']);
    const jamPulang = parseTime(row['Jam Pulang']);
    if (scanPulang > 0 && jamPulang > 0 && scanPulang > jamPulang) {
      return scanPulang - jamPulang;
    }
    return 0;
  };

  const availableYears = useMemo(() => {
    const years = new Set();
    data.forEach(row => {
      try {
        const date = parseDateLocal(row.Tanggal);
        if (date && !isNaN(date.getTime())) {
          years.add(date.getFullYear());
        }
      } catch (e) {}
    });
    return ['all', ...Array.from(years).sort((a, b) => b - a)];
  }, [data]);

  const departments = useMemo(() => {
    const depts = new Set(data.map(row => row.Departemen).filter(Boolean));
    return ['all', ...Array.from(depts)];
  }, [data]);

  // --- MAIN CALCULATION ---
  const rawMonthlyTrends = useMemo(() => {
    const monthlyData = {};
    
    data.forEach(row => {
      try {
        const date = parseDateLocal(row.Tanggal);
        if (!date || isNaN(date.getTime())) return;
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
        
        if (selectedYear !== 'all' && year !== parseInt(selectedYear)) return;
        if (selectedDepartment !== 'all' && row.Departemen !== selectedDepartment) return;
        
        if (!monthlyData[yearMonth]) {
          monthlyData[yearMonth] = {
            yearMonth,
            monthIndex: month - 1,
            year: year,
            totalDays: 0, present: 0, late: 0, earlyLeave: 0, overtime: 0, absent: 0,
            lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0,
            sick: 0, leave: 0, businessTrip: 0
          };
        }
        
        const isWorking = checkIsWorkingDay(row);
        const status = validateAttendance(row);
        const currentMonth = monthlyData[yearMonth];

        const exc = row.Pengecualian ? row.Pengecualian.toLowerCase() : '';
        if (exc.includes('sick') || exc.includes('sakit')) currentMonth.sick++;
        if (exc.includes('leave') || exc.includes('cuti')) currentMonth.leave++;
        if (exc.includes('trip') || exc.includes('dinas')) currentMonth.businessTrip++;

        const otMin = calculateOvertimeMinutes(row);
        if (otMin > 0) {
          currentMonth.overtime++;
          currentMonth.overtimeMinutes += otMin;
        }

        if (isWorking) {
          currentMonth.totalDays++;
          if (status.isPresent) {
            currentMonth.present++;
          } else {
            const isAbsentFlag = row.Absent === 'True';
            if (isAbsentFlag || !status.isPresent) currentMonth.absent++;
          }

          // --- PERBAIKAN LOGIC TERLAMBAT ---
          // Cek apakah ada exception APAPUN (Izin Personal, Ijin, Permit, dll)
          // Jika ada exception, skip perhitungan Late/Early
          if (!hasAnyException(row)) {
            const scanMasuk = parseTime(row['Scan Masuk']);
            const jamMasuk = parseTime(row['Jam Masuk']);
            if (scanMasuk > 0 && jamMasuk > 0 && scanMasuk > jamMasuk) {
              currentMonth.late++;
              currentMonth.lateMinutes += (scanMasuk - jamMasuk);
            }

            const scanPulang = parseTime(row['Scan Pulang']);
            const jamPulang = parseTime(row['Jam Pulang']);
            if (scanPulang > 0 && jamPulang > 0 && scanPulang < jamPulang) {
              currentMonth.earlyLeave++;
              currentMonth.earlyLeaveMinutes += (jamPulang - scanPulang);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    });
    
    return Object.values(monthlyData)
      .sort((a, b) => (a.year - b.year) || (a.monthIndex - b.monthIndex))
      .map(d => {
        const attendanceRate = d.totalDays > 0 ? ((d.present / d.totalDays) * 100).toFixed(1) : 0;
        const onTime = Math.max(0, d.present - d.late);
        const punctualityRate = d.present > 0 ? ((onTime / d.present) * 100).toFixed(1) : 0;
        const lateRate = d.totalDays > 0 ? ((d.late / d.totalDays) * 100).toFixed(1) : 0;
        const earlyLeaveRate = d.totalDays > 0 ? ((d.earlyLeave / d.totalDays) * 100).toFixed(1) : 0;
        const overtimeRate = d.totalDays > 0 ? ((d.overtime / d.totalDays) * 100).toFixed(1) : 0;
        const complianceScore = ((parseFloat(attendanceRate) * 0.6) + (parseFloat(punctualityRate) * 0.4)).toFixed(1);
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return {
          month: `${monthNames[d.monthIndex]} ${d.year}`,
          attendanceRate: parseFloat(attendanceRate),
          punctualityRate: parseFloat(punctualityRate),
          lateRate: parseFloat(lateRate),
          earlyLeaveRate: parseFloat(earlyLeaveRate),
          overtimeRate: parseFloat(overtimeRate),
          complianceScore: parseFloat(complianceScore),
          lateCount: d.late,
          earlyLeaveCount: d.earlyLeave,
          overtimeCount: d.overtime,
          absentCount: d.absent,
          sickCount: d.sick,
          leaveCount: d.leave,
          businessTripCount: d.businessTrip
        };
      });
  }, [data, selectedYear, selectedDepartment]);

  // --- CONFIG CHART ---
  const metricOptions = [
    { value: 'attendance', label: 'Tingkat Kehadiran (%)' },
    { value: 'punctuality', label: 'Tingkat Ketepatan (%)' },
    { value: 'compliance', label: 'Compliance Score (%)' },
    { value: 'late', label: 'Tingkat Keterlambatan (%)' },
    { value: 'earlyLeave', label: 'Tingkat Pulang Cepat (%)' },
    { value: 'overtime', label: 'Tingkat Lembur (%)' },
    { value: 'lateCount', label: 'Jumlah Keterlambatan (count)' },
    { value: 'overtimeCount', label: 'Jumlah Lembur (count)' },
    { value: 'absentCount', label: 'Jumlah Absent (count)' },
    { value: 'sickCount', label: 'Jumlah Sakit (count)' },
    { value: 'leaveCount', label: 'Jumlah Cuti (count)' },
    { value: 'businessTripCount', label: 'Jumlah Dinas (count)' }
  ];

  const getChartConfig = () => {
    switch (selectedMetric) {
      case 'attendance': return { dataKey: 'attendanceRate', color: '#10b981', label: 'Kehadiran (%)' };
      case 'punctuality': return { dataKey: 'punctualityRate', color: '#3b82f6', label: 'Ketepatan (%)' };
      case 'compliance': return { dataKey: 'complianceScore', color: '#8b5cf6', label: 'Compliance (%)' };
      case 'late': return { dataKey: 'lateRate', color: '#ef4444', label: 'Keterlambatan (%)' };
      case 'earlyLeave': return { dataKey: 'earlyLeaveRate', color: '#f59e0b', label: 'Pulang Cepat (%)' };
      case 'overtime': return { dataKey: 'overtimeRate', color: '#8b5cf6', label: 'Lembur (%)' };
      case 'lateCount': return { dataKey: 'lateCount', color: '#ef4444', label: 'Jumlah Terlambat' };
      case 'overtimeCount': return { dataKey: 'overtimeCount', color: '#8b5cf6', label: 'Jumlah Lembur' };
      case 'absentCount': return { dataKey: 'absentCount', color: '#ef4444', label: 'Jumlah Absent' };
      case 'sickCount': return { dataKey: 'sickCount', color: '#f59e0b', label: 'Jumlah Sakit' };
      case 'leaveCount': return { dataKey: 'leaveCount', color: '#3b82f6', label: 'Jumlah Cuti' };
      case 'businessTripCount': return { dataKey: 'businessTripCount', color: '#8b5cf6', label: 'Jumlah Dinas' };
      default: return { dataKey: 'attendanceRate', color: '#10b981', label: 'Kehadiran (%)' };
    }
  };

  const chartConfig = getChartConfig();

  // --- APPLY TRENDLINE ---
  const finalChartData = useMemo(() => {
    return calculateTrendline(rawMonthlyTrends, chartConfig.dataKey);
  }, [rawMonthlyTrends, chartConfig]);

  // --- CUSTOM LABEL RENDERER ---
  const renderCustomLabel = (props) => {
    const { x, y, width, value, stroke } = props;
    const isCountMetric = selectedMetric.toLowerCase().includes('count');
    const displayValue = isCountMetric ? value : `${value}%`;

    return (
      <text 
        x={x} 
        y={y} 
        dy={-15} 
        fill={stroke} 
        fontSize={12} 
        fontWeight="bold"
        textAnchor="middle"
      >
        {displayValue}
      </text>
    );
  };

  if (!analytics) return <div className="p-8 text-center">Loading data...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentPage="trends" 
        onNavigate={onNavigate} 
        onDataUpdate={onDataUpdate}
        analytics={analytics}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Analisis Trend & Prediksi</h2>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Metrik</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {metricOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Tahun</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Tahun</option>
                {availableYears.slice(1).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Departemen</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Departemen</option>
                {departments.slice(1).map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Trend: {chartConfig.label}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-4 h-1 bg-gray-400 border border-gray-400 border-dashed"></span>
              <span>Garis putus-putus menunjukkan trendline</span>
            </div>
          </div>
          
          {finalChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={finalChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                
                {/* Garis Data Utama dengan Label */}
                <Line 
                  type="monotone" 
                  dataKey={chartConfig.dataKey} 
                  stroke={chartConfig.color} 
                  strokeWidth={3}
                  name="Aktual"
                  dot={{ fill: chartConfig.color, r: 5 }}
                  activeDot={{ r: 8 }}
                  label={renderCustomLabel}
                />

                {/* Garis Trendline */}
                <Line 
                  type="monotone"
                  dataKey={`${chartConfig.dataKey}Trend`}
                  stroke="#6b7280" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Trendline"
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Tidak ada data untuk ditampilkan</p>
            </div>
          )}
        </div>

        {/* Summary Table */}
        <div className="bg-white rounded-xl shadow-md overflow-x-auto">
          <h3 className="text-lg font-bold text-gray-900 p-6 pb-4">Data Detail per Bulan</h3>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Bulan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Kehadiran</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Ketepatan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Compliance</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Terlambat</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Lembur</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Sakit</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Cuti</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {finalChartData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.month}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-semibold">{row.attendanceRate}%</td>
                  <td className="px-4 py-3 text-sm text-blue-600 font-semibold">{row.punctualityRate}%</td>
                  <td className="px-4 py-3 text-sm text-purple-600 font-semibold">{row.complianceScore}%</td>
                  <td className="px-4 py-3 text-sm">{row.lateCount}x ({row.lateRate}%)</td>
                  <td className="px-4 py-3 text-sm">{row.overtimeCount}x ({row.overtimeRate}%)</td>
                  <td className="px-4 py-3 text-sm">{row.sickCount}</td>
                  <td className="px-4 py-3 text-sm">{row.leaveCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrendsAnalysis;