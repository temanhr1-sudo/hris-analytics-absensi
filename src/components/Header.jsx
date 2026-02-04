import React, { useRef } from 'react';
import { Download, Upload, Users } from 'lucide-react';
import * as XLSX from 'xlsx';

const Header = ({ currentPage, onNavigate, onDataUpdate, analytics, onExit }) => {
  const fileInputRef = useRef(null);

  const exportToExcel = () => {
    if (!analytics) return;
    
    // Sheet 1: Summary
    const summaryData = [
      ['LAPORAN ANALISIS ABSENSI KARYAWAN'],
      ['Tanggal Export:', new Date().toLocaleDateString('id-ID')],
      [''],
      ['RINGKASAN'],
      ['Total Karyawan', analytics.totalEmployees],
      ['Total Hari Kerja', analytics.totalRecords],
      ['Tingkat Kehadiran', analytics.attendanceRate + '%'],
      ['Tingkat Ketepatan Waktu', analytics.punctualityRate + '%'],
      ['Compliance Score', analytics.complianceScore + '%'],
      ['Jam Kerja Efektif', analytics.effectiveWorkHours + '%'],
      [''],
      ['KETERLAMBATAN'],
      ['Total Kejadian', analytics.lateRecords],
      ['Total Waktu', analytics.totalLateHours + ' jam'],
      ['Late Rate', analytics.lateRate + '%'],
      [''],
      ['PULANG CEPAT'],
      ['Total Kejadian', analytics.earlyLeaveRecords],
      ['Total Waktu', analytics.totalEarlyLeaveHours + ' jam'],
      ['Early Leave Rate', analytics.earlyLeaveRate + '%'],
      [''],
      ['LEMBUR'],
      ['Total Kejadian', analytics.overtimeRecords],
      ['Total Waktu', analytics.totalOvertimeHours + ' jam'],
      ['Overtime Rate', analytics.overtimeRate + '%']
    ];
    
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');
    
    // Download
    XLSX.writeFile(wb, `Laporan_Absensi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const binaryStr = event.target.result;
          const workbook = XLSX.read(binaryStr, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            raw: false,
            defval: ''
          });
          
          if (jsonData && jsonData.length > 0) {
            onDataUpdate(jsonData);
            alert(`✅ Data berhasil diperbarui! ${jsonData.length} baris data ter-load`);
          }
        } catch (error) {
          alert('❌ Error: ' + error.message);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Emp No.': '2835',
        'Nama': 'John Doe',
        'Tanggal': '01/01/2026',
        'Departemen': 'IT',
        'Jam Masuk': '08:30',
        'Jam Pulang': '17:00',
        'Jml Kehadiran': '1',
        'Scan Masuk': '08:15',
        'Scan Pulang': '17:20',
        'Terlambat': '',
        'Plg. Cepat': '',
        'Lembur': '',
        'Jml Jam Kerja': '08:30',
        'Absent': '',
        'Pengecualian': '',
        'Akhir Pekan': '',
        'Hari Libur': ''
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = Array(17).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(wb, ws, 'Template Absensi');
    XLSX.writeFile(wb, 'Template_Absensi_HRIS.xlsx');
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Dashboard HRIS Analytics</h1>
            <p className="text-blue-100">Sistem Analisis Absensi & KPI Karyawan</p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
            >
              <Download className="w-4 h-4" />
              Template
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition font-semibold"
            >
              <Upload className="w-4 h-4" />
              Update Data
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              <Download className="w-4 h-4" />
              Export Laporan
            </button>
            
            <button
              onClick={onExit}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-semibold"
            >
              <Users className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Ringkasan' },
              { id: 'kpi', label: 'KPI Matrix' },
              { id: 'departments', label: 'Departemen' },
              { id: 'employees', label: 'Karyawan' },
              { id: 'leave', label: 'Cuti & Izin' },
              { id: 'trends', label: 'Trend Bulanan' },
              { id: 'management', label: 'Manajemen Karyawan' }
            ].map(menu => (
              <button
                key={menu.id}
                onClick={() => onNavigate(menu.id)}
                className={`px-6 py-3 font-semibold transition whitespace-nowrap ${
                  currentPage === menu.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {menu.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;