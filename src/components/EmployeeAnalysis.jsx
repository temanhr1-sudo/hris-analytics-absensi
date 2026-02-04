import React, { useMemo, useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, RotateCcw, Filter, X } from 'lucide-react';
import Header from './Header';
// IMPORT parseDateLocal
import { calculateAnalytics, calculateEmployeeStats, parseDateLocal } from '../utils/analytics';

const EmployeeAnalysis = ({ data, onNavigate, onDataUpdate }) => {
  const ITEMS_PER_PAGE = 20;

  // State Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [focusFilter, setFocusFilter] = useState('all'); 
  
  const [currentPage, setCurrentPage] = useState(1);

  // --- HANDLER NAVIGASI (PENTING) ---
  const handleEmployeeClick = (emp) => {
    // Kirim data ke App.js -> EmployeeManagement
    onNavigate('management', {
      searchTerm: emp.empNo, // Kirim NIK
      startDate: startDate,  // Kirim Filter Tanggal
      endDate: endDate
    });
  };

  // 1. FILTER RAW DATA BERDASARKAN TANGGAL
  const filteredRawData = useMemo(() => {
    if (!startDate && !endDate) return data;

    return data.filter(row => {
      const rowDate = parseDateLocal(row.Tanggal);
      if (!rowDate) return false;

      let isValid = true;

      if (startDate) {
        const start = parseDateLocal(startDate);
        if (start && rowDate < start) isValid = false;
      }

      if (endDate && isValid) {
        const end = parseDateLocal(endDate);
        if (end) {
          end.setHours(23, 59, 59, 999);
          if (rowDate > end) isValid = false;
        }
      }

      return isValid;
    });
  }, [data, startDate, endDate]);

  // 2. HITUNG STATISTIK
  const analytics = useMemo(() => calculateAnalytics(filteredRawData), [filteredRawData]);
  const employeeList = useMemo(() => calculateEmployeeStats(filteredRawData), [filteredRawData]);

  // Reset page saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, focusFilter]);

  // Handler Reset Filter
  const handleReset = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setFocusFilter('all');
  };

  if (!analytics) return null;

  const topPerformers = employeeList.slice(0, 10);
  const bottomPerformers = employeeList.slice(-10).reverse();

  // 3. FILTER LIST KARYAWAN
  const filteredEmployeeList = useMemo(() => {
    let filtered = employeeList.filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.dept.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (focusFilter === 'late') {
      filtered = filtered.filter(emp => emp.late > 0).sort((a, b) => b.late - a.late);
    } else if (focusFilter === 'early_leave') {
      filtered = filtered.filter(emp => emp.earlyLeave > 0).sort((a, b) => b.earlyLeave - a.earlyLeave);
    } else if (focusFilter === 'partial') {
      filtered = filtered.filter(emp => emp.partialCount > 0).sort((a, b) => b.partialCount - a.partialCount);
    } else if (focusFilter === 'low_attendance') {
      filtered = filtered.filter(emp => parseFloat(emp.attendanceRate) < 90).sort((a, b) => parseFloat(a.attendanceRate) - parseFloat(b.attendanceRate));
    }
    
    return filtered;
  }, [employeeList, searchTerm, focusFilter]);

  // 4. PAGINATION
  const totalPages = Math.ceil(filteredEmployeeList.length / ITEMS_PER_PAGE);
  const currentTableData = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEmployeeList.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredEmployeeList, currentPage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentPage="employees" 
        onNavigate={onNavigate} 
        onDataUpdate={onDataUpdate}
        analytics={analytics}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
           <div>
              <h2 className="text-2xl font-bold text-gray-900">Analisis Per Karyawan</h2>
              <p className="text-sm text-gray-500">
                {startDate || endDate 
                  ? `Menampilkan data dari ${startDate || 'Awal'} s/d ${endDate || 'Akhir'}` 
                  : 'Menampilkan semua data historis'}
              </p>
           </div>
        </div>
        
        {/* Top & Bottom Cards (UI sama seperti sebelumnya) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Performers */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-green-600 mb-4">🏆 Top 10 Performers</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {topPerformers.length > 0 ? topPerformers.map((emp, idx) => (
                <div key={idx} className="flex justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-600">{emp.dept} • {emp.totalDays} hari kerja</p>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="text-green-600">Kehadiran: {emp.attendanceRate}%</span>
                      <span className="text-blue-600">Ketepatan: {emp.punctualityRate}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">{emp.complianceScore}%</p>
                    <p className="text-xs text-gray-500">{emp.late} terlambat</p>
                  </div>
                </div>
              )) : <p className="text-gray-500 text-center py-4">Tidak ada data.</p>}
            </div>
          </div>

          {/* Bottom Performers */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Perlu Perhatian</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {bottomPerformers.length > 0 ? bottomPerformers.map((emp, idx) => (
                <div key={idx} className="flex justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-600">{emp.dept} • {emp.totalDays} hari kerja</p>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="text-red-600">Kehadiran: {emp.attendanceRate}%</span>
                      <span className="text-orange-600">Ketepatan: {emp.punctualityRate}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-red-600">{emp.complianceScore}%</p>
                    <p className="text-xs text-gray-500">{emp.late} terlambat</p>
                  </div>
                </div>
              )) : <p className="text-gray-500 text-center py-4">Tidak ada data.</p>}
            </div>
          </div>
        </div>

        {/* Tabel Utama */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
          
          {/* Toolbar & Filters (Sama seperti sebelumnya) */}
          <div className="p-6 pb-4 border-b bg-gray-50">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Detail Karyawan</h3>
                  <p className="text-sm text-gray-500">Total: {filteredEmployeeList.length} Karyawan ditemukan</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="flex gap-2">
                        <div className="relative">
                            <span className="text-[10px] absolute -top-2 left-2 bg-gray-50 px-1 text-gray-500 font-medium">Dari</span>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" />
                        </div>
                        <div className="relative">
                            <span className="text-[10px] absolute -top-2 left-2 bg-gray-50 px-1 text-gray-500 font-medium">Sampai</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" />
                        </div>
                    </div>
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                        <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Cari nama / departemen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white" />
                    </div>
                    <button onClick={handleReset} className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 text-gray-600"><RotateCcw className="w-5 h-5" /></button>
                </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
                {['all', 'late', 'early_leave', 'partial', 'low_attendance'].map(f => (
                    <button key={f} onClick={() => setFocusFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${focusFilter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
                        {f.replace('_', ' ')}
                    </button>
                ))}
            </div>
          </div>

          <div className="overflow-x-auto flex-grow">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Nama</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Dept</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Compliance</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Kehadiran</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Ketepatan</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Terlambat</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Pulang Cepat</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Parsial</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Lembur</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentTableData.length > 0 ? (
                  currentTableData.map((emp, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      {/* --- FIX DISINI: Gunakan Arrow Function di onClick --- */}
                      <td className="px-4 py-3 text-sm font-medium">
                        <button 
                          onClick={() => handleEmployeeClick(emp)} 
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left font-bold"
                          title="Lihat detail history di Manajemen Karyawan"
                        >
                          {emp.name}
                        </button>
                      </td>
                      
                      <td className="px-4 py-3 text-sm text-gray-600">{emp.dept}</td>
                      <td className="px-4 py-3 text-sm font-bold text-purple-600">{emp.complianceScore}%</td>
                      <td className="px-4 py-3 text-sm text-green-600">{emp.attendanceRate}%</td>
                      <td className="px-4 py-3 text-sm text-blue-600">{emp.punctualityRate}%</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {emp.late > 0 ? <span className="text-orange-600 font-semibold">{emp.late}x ({emp.lateTotalHours}h)</span> : <span className="text-gray-400">0x</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {emp.earlyLeave > 0 ? <span className="text-purple-600 font-semibold">{emp.earlyLeave}x ({emp.earlyLeaveTotalHours}h)</span> : <span className="text-gray-400">0x</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {emp.partialCount > 0 ? <span className="text-yellow-600 font-semibold">{emp.partialCount}x</span> : <span className="text-gray-400">0x</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{emp.overtimeTotalHours}h</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="px-4 py-12 text-center text-gray-500">Tidak ada data ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination (Sama seperti sebelumnya) */}
          {filteredEmployeeList.length > 0 && (
            <div className="flex justify-between items-center p-4 border-t bg-gray-50">
                <div className="text-sm text-gray-600">
                   Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployeeList.length)}</strong> of <strong>{filteredEmployeeList.length}</strong>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 bg-white border rounded hover:bg-gray-100 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="px-4 py-2 text-sm font-medium bg-white border rounded">Page {currentPage} / {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 bg-white border rounded hover:bg-gray-100 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeAnalysis;