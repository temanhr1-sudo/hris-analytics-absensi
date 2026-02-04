import React, { useState, useMemo, useEffect } from 'react';
import { Search, Edit, Trash2, X, Save, Eye, RotateCcw, ChevronLeft, ChevronRight, Clock, AlertCircle, Briefcase, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Header from './Header';
// IMPORT validateAttendance & isWorkingDay
import { calculateAnalytics, parseTime, minutesToTime, parseDateLocal, validateAttendance, isWorkingDay } from '../utils/analytics';

const EmployeeManagement = ({ data, onNavigate, onDataUpdate, initialParams }) => {
  const ITEMS_PER_PAGE = 20; 
  const EMPLOYEE_LIST_LIMIT = 50; 

  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterException, setFilterException] = useState('');
  const [filterLate, setFilterLate] = useState(''); 
  const [filterEarlyLeave, setFilterEarlyLeave] = useState(''); 
  const [filterAbsent, setFilterAbsent] = useState(''); 

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const analytics = useMemo(() => calculateAnalytics(data), [data]);

  // --- HELPERS ---
  const hasTimeValue = (val) => {
    return val && val !== '0' && val !== '0:00' && val !== '00:00' && val !== 0;
  };

  const getCalculatedTime = (row) => {
    let lateDisplay = row.Terlambat;
    let earlyDisplay = row['Plg. Cepat'];

    if (!hasTimeValue(lateDisplay)) {
      const scan = parseTime(row['Scan Masuk']);
      const sched = parseTime(row['Jam Masuk']);
      if (scan > 0 && sched > 0 && scan > sched) {
        lateDisplay = minutesToTime(scan - sched);
      }
    }

    if (!hasTimeValue(earlyDisplay)) {
      const scan = parseTime(row['Scan Pulang']);
      const sched = parseTime(row['Jam Pulang']);
      if (scan > 0 && sched > 0 && scan < sched) {
        earlyDisplay = minutesToTime(sched - scan);
      }
    }
    return { lateDisplay, earlyDisplay };
  };

  // --- MONTHLY TREND DATA ---
  const monthlyTrendData = useMemo(() => {
    if (!selectedEmployee) return [];

    const employeeRecords = data.filter(row => row['Emp No.'] === selectedEmployee.empNo);
    const monthMap = new Map();

    employeeRecords.forEach(row => {
      const date = parseDateLocal(row.Tanggal);
      if (!date) return;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: monthKey,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          earlyLeaveDays: 0,
          totalLateMinutes: 0,
          totalEarlyMinutes: 0
        });
      }

      const monthData = monthMap.get(monthKey);
      const { lateDisplay, earlyDisplay } = getCalculatedTime(row);
      const isWorking = isWorkingDay(row);
      const status = validateAttendance(row);
      const isCalculatedAlpha = isWorking && (!status.isPresent || row.Absent === 'True');

      monthData.totalDays++;
      
      if (!isCalculatedAlpha) {
        monthData.presentDays++;
      } else {
        monthData.absentDays++;
      }

      if (hasTimeValue(lateDisplay)) {
        monthData.lateDays++;
        monthData.totalLateMinutes += parseTime(lateDisplay);
      }

      if (hasTimeValue(earlyDisplay)) {
        monthData.earlyLeaveDays++;
        monthData.totalEarlyMinutes += parseTime(earlyDisplay);
      }
    });

    return Array.from(monthMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(item => ({
        ...item,
        monthLabel: new Date(item.month + '-01').toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
        attendanceRate: Math.round((item.presentDays / item.totalDays) * 100),
        avgLateMinutes: item.lateDays > 0 ? Math.round(item.totalLateMinutes / item.lateDays) : 0
      }));
  }, [selectedEmployee, data]);

  // --- 1. LOGIC EMPLOYEES LIST ---
  const employees = useMemo(() => {
    const empMap = new Map();
    data.forEach(row => {
      const empNo = row['Emp No.'];
      if (!empMap.has(empNo)) {
        empMap.set(empNo, {
          empNo,
          name: row.Nama,
          dept: row.Departemen,
          recordCount: 0
        });
      }
      empMap.get(empNo).recordCount++;
    });
    return Array.from(empMap.values());
  }, [data]);

  // --- 2. EFFECT UNTUK MENANGKAP DATA DARI PAGE SEBELAH ---
  useEffect(() => {
    if (initialParams && employees.length > 0) {
      if (initialParams.startDate) setFilterStartDate(initialParams.startDate);
      if (initialParams.endDate) setFilterEndDate(initialParams.endDate);
      
      if (initialParams.searchTerm) {
        setSearchTerm(initialParams.searchTerm);
        const targetEmp = employees.find(e => String(e.empNo) === String(initialParams.searchTerm));
        if (targetEmp) {
          setSelectedEmployee(targetEmp);
        }
      }
    }
  }, [initialParams, employees]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStartDate, filterEndDate, filterException, filterLate, filterEarlyLeave, filterAbsent, selectedEmployee]);

  const filteredEmployees = useMemo(() => {
    const filtered = employees.filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.dept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.empNo.toString().includes(searchTerm)
    );
    return searchTerm ? filtered : filtered.slice(0, EMPLOYEE_LIST_LIMIT);
  }, [employees, searchTerm]);

  const uniqueExceptions = useMemo(() => {
    const exceptions = new Set();
    data.forEach(row => {
      if (row.Pengecualian && row.Pengecualian.trim() !== '') {
        exceptions.add(row.Pengecualian);
      }
    });
    return Array.from(exceptions).sort();
  }, [data]);

  // --- FILTERING UTAMA ---
  const allFilteredRecords = useMemo(() => {
    return data.filter(row => {
      const { lateDisplay, earlyDisplay } = getCalculatedTime(row);

      const isEmployeeMatch = selectedEmployee 
        ? row['Emp No.'] === selectedEmployee.empNo
        : true; 
      
      let isDateMatch = true;
      const rowDate = parseDateLocal(row.Tanggal);

      if (rowDate) {
        if (filterStartDate) {
          const start = parseDateLocal(filterStartDate);
          if (start && rowDate < start) isDateMatch = false;
        }
        
        if (filterEndDate && isDateMatch) {
          const end = parseDateLocal(filterEndDate);
          if (end) {
            end.setHours(23, 59, 59, 999); 
            if (rowDate > end) isDateMatch = false;
          }
        }
      }

      const isExceptionMatch = filterException ? row.Pengecualian === filterException : true;

      let isLateMatch = true;
      if (filterLate === 'yes') isLateMatch = hasTimeValue(lateDisplay);
      else if (filterLate === 'no') isLateMatch = !hasTimeValue(lateDisplay);

      let isEarlyMatch = true;
      if (filterEarlyLeave === 'yes') isEarlyMatch = hasTimeValue(earlyDisplay);
      else if (filterEarlyLeave === 'no') isEarlyMatch = !hasTimeValue(earlyDisplay);

      // --- LOGIC ALPHA / ABSENT (DIPERBAIKI) ---
      let isAbsentMatch = true;
      
      // Hitung status Alpha secara dinamis (sama seperti Dashboard)
      const isWorking = isWorkingDay(row); // Cek hari kerja
      const status = validateAttendance(row); // Cek kehadiran
      const isExplicitAbsent = row.Absent === 'True';
      
      // Karyawan dianggap Alpha jika:
      // 1. Hari Kerja (bukan libur/sabtu/minggu/cuti)
      // 2. DAN (Tidak hadir secara sistem ATAU ditandai Absent manual)
      const isCalculatedAlpha = isWorking && (!status.isPresent || isExplicitAbsent);

      if (filterAbsent === 'yes') isAbsentMatch = isCalculatedAlpha;
      else if (filterAbsent === 'no') isAbsentMatch = !isCalculatedAlpha;

      return isEmployeeMatch && isDateMatch && isExceptionMatch && isLateMatch && isEarlyMatch && isAbsentMatch;
    });
  }, [data, selectedEmployee, filterStartDate, filterEndDate, filterException, filterLate, filterEarlyLeave, filterAbsent]);

  const totalPages = Math.ceil(allFilteredRecords.length / ITEMS_PER_PAGE);
  const currentTableData = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return allFilteredRecords.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [allFilteredRecords, currentPage]);

  // --- HANDLERS UI ---
  const handleResetFilters = () => {
    setFilterStartDate(''); setFilterEndDate(''); setFilterException('');
    setFilterLate(''); setFilterEarlyLeave(''); setFilterAbsent(''); setSearchTerm('');
    setSelectedEmployee(null);
  };

  const handleEditRecord = (record) => { setEditingRecord({ ...record }); };

  const handleSaveEdit = () => {
    const updatedData = data.map(row => {
      if (row['Emp No.'] === editingRecord['Emp No.'] && row.Tanggal === editingRecord.Tanggal) {
        return editingRecord;
      }
      return row;
    });
    onDataUpdate(updatedData);
    setEditingRecord(null);
    alert('✅ Data berhasil diperbarui!');
  };

  const handleDeleteRecord = (record) => { setShowDeleteConfirm({ type: 'single', data: record }); };
  const handleDeleteEmployee = (employee) => { setShowDeleteConfirm({ type: 'all', data: employee }); };

  const confirmDelete = () => {
    if (showDeleteConfirm.type === 'single') {
      const target = showDeleteConfirm.data;
      const updatedData = data.filter(row => !(row['Emp No.'] === target['Emp No.'] && row.Tanggal === target.Tanggal));
      onDataUpdate(updatedData);
    } else if (showDeleteConfirm.type === 'all') {
      const target = showDeleteConfirm.data;
      const updatedData = data.filter(row => row['Emp No.'] !== target.empNo);
      onDataUpdate(updatedData);
      setSelectedEmployee(null);
    }
    setShowDeleteConfirm(null);
    alert('✅ Data berhasil dihapus!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPage="management" onNavigate={onNavigate} onDataUpdate={onDataUpdate} analytics={analytics} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Manajemen Karyawan</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT SIDEBAR: LIST KARYAWAN */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-md p-6 h-fit max-h-[800px] flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Daftar Karyawan</h3>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Cari nama / NIK..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              {!searchTerm && employees.length > EMPLOYEE_LIST_LIMIT && <p className="text-xs text-gray-400 mt-2 text-center">Menampilkan {EMPLOYEE_LIST_LIMIT} karyawan teratas.</p>}
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {filteredEmployees.map((emp, idx) => (
                <div key={idx} onClick={() => setSelectedEmployee(emp)} className={`p-3 rounded-lg cursor-pointer transition border ${selectedEmployee?.empNo === emp.empNo ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{emp.name}</p>
                      <p className="text-xs text-gray-600">{emp.dept}</p>
                      <p className="text-xs text-gray-500 font-mono">{emp.empNo}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp); }} className="text-gray-400 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <p className="text-[10px] text-blue-600 mt-1 font-medium">{emp.recordCount} records</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT CONTENT: TREND + TABLE */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* TREND CHART - Only show when employee selected */}
            {selectedEmployee && monthlyTrendData.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Tren Kehadiran Bulanan</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Attendance Rate Chart */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Tingkat Kehadiran (%)</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={monthlyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip 
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          formatter={(value) => [`${value}%`, 'Kehadiran']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="attendanceRate" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          dot={{ fill: '#10b981', r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Late & Absent Days Chart */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Terlambat & Alpha (Hari)</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={monthlyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="lateDays" fill="#ef4444" name="Terlambat" />
                        <Bar dataKey="absentDays" fill="#dc2626" name="Alpha" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Total Hari</p>
                    <p className="text-lg font-bold text-gray-900">
                      {monthlyTrendData.reduce((sum, m) => sum + m.totalDays, 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Hadir</p>
                    <p className="text-lg font-bold text-green-600">
                      {monthlyTrendData.reduce((sum, m) => sum + m.presentDays, 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Terlambat</p>
                    <p className="text-lg font-bold text-red-600">
                      {monthlyTrendData.reduce((sum, m) => sum + m.lateDays, 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Alpha</p>
                    <p className="text-lg font-bold text-red-700">
                      {monthlyTrendData.reduce((sum, m) => sum + m.absentDays, 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TABLE SECTION */}
            <div className="bg-white rounded-xl shadow-md p-6 min-h-[600px] flex flex-col">
            <div className="flex flex-col gap-4 border-b pb-4 mb-4">
              <div className="flex justify-between items-start">
                {selectedEmployee ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedEmployee.name}</h3>
                    <p className="text-sm text-gray-600">{selectedEmployee.dept} • {selectedEmployee.empNo}</p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Semua Data Absensi</h3>
                    <p className="text-sm text-gray-600">Total: <strong>{allFilteredRecords.length}</strong> data ditemukan.</p>
                  </div>
                )}
                {selectedEmployee && <button onClick={() => setSelectedEmployee(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /> Lihat Semua</button>}
              </div>

              {/* Filter Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="col-span-1 lg:col-span-1"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Dari</label><input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500"/></div>
                  <div className="col-span-1 lg:col-span-1"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Sampai</label><input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500"/></div>
                  <div className="col-span-1 lg:col-span-2"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Pengecualian</label><select value={filterException} onChange={(e) => setFilterException(e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 bg-white"><option value="">Semua Status</option>{uniqueExceptions.map((exc, idx) => (<option key={idx} value={exc}>{exc}</option>))}</select></div>
                  <div className="col-span-1 lg:col-span-1"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Terlambat</label><select value={filterLate} onChange={(e) => setFilterLate(e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 bg-white"><option value="">Semua</option><option value="yes">Ya</option><option value="no">Tidak</option></select></div>
                  
                  {/* NEW FILTER: ABSENT (ALPHA) */}
                  <div className="col-span-1 lg:col-span-1"><label className="text-[10px] font-bold text-red-500 uppercase block mb-1">Alpha (Absent)</label><select value={filterAbsent} onChange={(e) => setFilterAbsent(e.target.value)} className="w-full px-2 py-1 text-xs border border-red-300 rounded focus:border-red-500 bg-white"><option value="">Semua</option><option value="yes">Ya (Alpha)</option><option value="no">Tidak</option></select></div>
                  
                  <div className="col-span-1 lg:col-span-1 flex items-end"><button onClick={handleResetFilters} className="w-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-blue-600 px-2 py-1 rounded text-xs flex items-center justify-center gap-1 transition h-[26px]"><RotateCcw className="w-3 h-3" /> Reset</button></div>
              </div>
            </div>

            {/* Tabel Data */}
            <div className="flex-grow overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    {!selectedEmployee && <th className="px-3 py-3 text-left font-semibold">Karyawan</th>}
                    <th className="px-3 py-3 text-left font-semibold">Tanggal</th>
                    <th className="px-3 py-3 text-left font-semibold">Normal</th>
                    <th className="px-3 py-3 text-left font-semibold">In / Out</th>
                    <th className="px-3 py-3 text-left font-semibold">Terlambat</th>
                    <th className="px-3 py-3 text-left font-semibold">Plg Cepat</th>
                    <th className="px-3 py-3 text-left font-semibold">Status</th>
                    <th className="px-3 py-3 text-left font-semibold">Ket</th>
                    <th className="px-3 py-3 text-center font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {currentTableData.length > 0 ? (
                    currentTableData.map((record, idx) => {
                      const { lateDisplay, earlyDisplay } = getCalculatedTime(record);
                      const normalHours = record.Normal || '08:30'; 
                      
                      // LOGIC VISUALISASI STATUS
                      const isWorking = isWorkingDay(record);
                      const status = validateAttendance(record);
                      const isCalculatedAlpha = isWorking && (!status.isPresent || record.Absent === 'True');

                      return (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          {!selectedEmployee && (
                             <td className="px-3 py-2">
                               <div className="font-medium text-gray-900">{record.Nama}</div>
                               <div className="text-[10px] text-gray-500 font-mono">{record['Emp No.']}</div>
                             </td>
                          )}
                          <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{record.Tanggal}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">
                             <div className="flex items-center gap-1"><Briefcase className="w-3 h-3" /><span className="font-mono">{normalHours}h</span></div>
                          </td>
                          <td className="px-3 py-2 text-xs">
                             <div className="flex items-center gap-1"><span className="text-gray-400 w-6">IN:</span> <span className="font-mono text-gray-700">{record['Scan Masuk'] || '-'}</span></div>
                             <div className="flex items-center gap-1"><span className="text-gray-400 w-6">OUT:</span><span className="font-mono text-gray-700">{record['Scan Pulang'] || '-'}</span></div>
                          </td>
                          <td className="px-3 py-2">
                              {hasTimeValue(lateDisplay) ? <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {lateDisplay}</span> : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="px-3 py-2">
                              {hasTimeValue(earlyDisplay) ? <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {earlyDisplay}</span> : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="px-3 py-2">
                            {/* Logic Display Status di Tabel */}
                            {isCalculatedAlpha ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">Absent</span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">Hadir</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                              {record.Pengecualian ? <span className="inline-block px-2 py-0.5 border border-purple-200 bg-purple-50 text-purple-700 rounded text-[10px] font-medium">{record.Pengecualian}</span> : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleEditRecord(record)} className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteRecord(record)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={selectedEmployee ? "9" : "10"} className="text-center py-12 text-gray-400">Tidak ada data yang cocok dengan filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {allFilteredRecords.length > 0 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t sticky bottom-0 bg-white">
                 <div className="text-xs text-gray-500">Menampilkan <strong>{currentTableData.length}</strong> dari <strong>{allFilteredRecords.length}</strong> data</div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 bg-white border rounded hover:bg-gray-100 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-xs font-medium px-2">{currentPage} / {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 bg-white border rounded hover:bg-gray-100 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
                 </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Edit Data Absensi</h3>
              <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                 <div className="flex justify-between"><span className="text-sm font-bold text-blue-900">{editingRecord.Nama}</span><span className="text-sm text-blue-700">{editingRecord.Tanggal}</span></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Jam Masuk</label><input type="text" value={editingRecord['Jam Masuk']} onChange={(e) => setEditingRecord({...editingRecord, 'Jam Masuk': e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Jam Pulang</label><input type="text" value={editingRecord['Jam Pulang']} onChange={(e) => setEditingRecord({...editingRecord, 'Jam Pulang': e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Scan Masuk</label><input type="text" value={editingRecord['Scan Masuk']} onChange={(e) => setEditingRecord({...editingRecord, 'Scan Masuk': e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 font-mono" /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Scan Pulang</label><input type="text" value={editingRecord['Scan Pulang']} onChange={(e) => setEditingRecord({...editingRecord, 'Scan Pulang': e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 font-mono" /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Terlambat</label><input type="text" value={editingRecord.Terlambat} onChange={(e) => setEditingRecord({...editingRecord, Terlambat: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm text-red-600" /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Pulang Cepat</label><input type="text" value={editingRecord['Plg. Cepat']} onChange={(e) => setEditingRecord({...editingRecord, 'Plg. Cepat': e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm text-orange-600" /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Pengecualian</label><input type="text" value={editingRecord.Pengecualian} onChange={(e) => setEditingRecord({...editingRecord, Pengecualian: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg w-full hover:bg-gray-50"><input type="checkbox" checked={editingRecord.Absent === 'True'} onChange={(e) => setEditingRecord({...editingRecord, Absent: e.target.checked ? 'True' : ''})} className="w-4 h-4 text-red-600" /><span className="text-sm font-medium text-gray-700">Tandai Absent</span></label></div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end rounded-b-xl">
              <button onClick={() => setEditingRecord(null)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium">Batal</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"><Save className="w-4 h-4" /> Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6" /></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Konfirmasi Hapus</h3>
            <p className="text-gray-600 mb-6 text-sm">Apakah Anda yakin ingin menghapus data ini?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium">Batal</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;