import React from 'react';
import { Upload, Users, Clock, TrendingUp, AlertCircle, Download, Activity } from 'lucide-react';
import * as XLSX from 'xlsx';

const UploadPage = ({ onDataUpload }) => {
  
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
            onDataUpload(jsonData);
            alert(`✅ Berhasil! ${jsonData.length} baris data ter-load dari sheet "${sheetName}"`);
          } else {
            alert('⚠️ File berhasil dibaca tetapi tidak ada data.');
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
        'Scan Masuk': '08:15',
        'Scan Pulang': '17:20',
        'Pengecualian': ''
      },
      {
        'Emp No.': '2836',
        'Nama': 'Jane Smith',
        'Tanggal': '02/01/2026',
        'Departemen': 'Finance',
        'Jam Masuk': '08:30',
        'Jam Pulang': '17:00',
        'Scan Masuk': '08:45',
        'Scan Pulang': '17:00',
        'Pengecualian': ''
      },
      {
        'Emp No.': '2837',
        'Nama': 'Bob Johnson (Sakit)',
        'Tanggal': '04/01/2026',
        'Departemen': 'HR',
        'Jam Masuk': '08:30',
        'Jam Pulang': '17:00',
        'Scan Masuk': '',
        'Scan Pulang': '',
        'Pengecualian': 'Sick'
      },
      {
        'Emp No.': '2838',
        'Nama': 'Alice (Weekend)',
        'Tanggal': '05/01/2026',
        'Departemen': 'IT',
        'Jam Masuk': '08:30',
        'Jam Pulang': '17:00',
        'Scan Masuk': '',
        'Scan Pulang': '',
        'Pengecualian': ''
      },
      {
        'Emp No.': '2839',
        'Nama': 'Charlie (Parsial)',
        'Tanggal': '08/01/2026',
        'Departemen': 'Marketing',
        'Jam Masuk': '08:30',
        'Jam Pulang': '17:00',
        'Scan Masuk': '08:20',
        'Scan Pulang': '',
        'Pengecualian': ''
      },
      {
        'Emp No.': '2840',
        'Nama': 'Diana (Dinas)',
        'Tanggal': '09/01/2026',
        'Departemen': 'Sales',
        'Jam Masuk': '08:30',
        'Jam Pulang': '17:00',
        'Scan Masuk': '',
        'Scan Pulang': '',
        'Pengecualian': 'Dinas'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = Array(9).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(wb, ws, 'Template Absensi');
    
    const instructions = [
      ['═══════════════════════════════════════════════════════════════════'],
      ['   PANDUAN TEMPLATE ABSENSI HRIS - VERSI SEDERHANA (9 KOLOM)'],
      ['═══════════════════════════════════════════════════════════════════'],
      [''],
      ['┌─────────────────────────────────────────────────────────────────┐'],
      ['│  KOLOM YANG DIPERLUKAN (9 Kolom Saja)                          │'],
      ['└─────────────────────────────────────────────────────────────────┘'],
      [''],
      ['1. Emp No.      - Nomor karyawan (wajib, unique)'],
      ['2. Nama         - Nama lengkap karyawan'],
      ['3. Tanggal      - Format: DD/MM/YYYY (contoh: 15/01/2026)'],
      ['4. Departemen   - Nama departemen/divisi'],
      ['5. Jam Masuk    - Jadwal masuk standar (Format: HH:MM, contoh: 08:30)'],
      ['6. Jam Pulang   - Jadwal pulang standar (Format: HH:MM, contoh: 17:00)'],
      ['7. Scan Masuk   - Waktu scan masuk aktual (HH:MM, kosongkan jika tidak scan)'],
      ['8. Scan Pulang  - Waktu scan pulang aktual (HH:MM, kosongkan jika tidak scan)'],
      ['9. Pengecualian - Isi: Sick, Cuti, Dinas, WFH, Trip (kosongkan jika normal)'],
      [''],
      ['═══════════════════════════════════════════════════════════════════'],
      ['   LOGIKA PERHITUNGAN OTOMATIS'],
      ['═══════════════════════════════════════════════════════════════════'],
      [''],
      ['✓ HADIR'],
      ['  → Ada Scan Masuk ATAU Ada Scan Pulang ATAU Ada Pengecualian Dinas/WFH'],
      [''],
      ['✓ ABSEN PARSIAL (Lupa scan salah satu)'],
      ['  → Hanya ada Scan Masuk saja (tidak ada Scan Pulang)'],
      ['  → ATAU hanya ada Scan Pulang saja (tidak ada Scan Masuk)'],
      ['  → Catatan: Dinas/WFH tidak dianggap parsial (wajar tidak scan)'],
      [''],
      ['✓ TERLAMBAT'],
      ['  → Scan Masuk > Jam Masuk'],
      ['  → Contoh: Scan 08:45, Jadwal 08:30 = Terlambat 15 menit'],
      [''],
      ['✓ PULANG CEPAT'],
      ['  → Scan Pulang < Jam Pulang'],
      ['  → Contoh: Scan 16:30, Jadwal 17:00 = Pulang cepat 30 menit'],
      [''],
      ['✓ LEMBUR'],
      ['  → Scan Pulang > Jam Pulang'],
      ['  → Contoh: Scan 18:00, Jadwal 17:00 = Lembur 1 jam'],
      [''],
      ['✓ WEEKEND (Sabtu/Minggu)'],
      ['  → Otomatis terdeteksi dari tanggal'],
      ['  → TIDAK dihitung dalam KPI (attendance rate, punctuality)'],
      [''],
      ['✓ SICK/CUTI'],
      ['  → Tulis di kolom Pengecualian: Sick, Cuti, Leave'],
      ['  → TIDAK dihitung dalam KPI (tidak menurunkan attendance rate)'],
      [''],
      ['✓ DINAS/WFH'],
      ['  → Tulis di kolom Pengecualian: Dinas, Trip, WFH'],
      ['  → Dianggap HADIR penuh meski tanpa scan'],
      [''],
      ['═══════════════════════════════════════════════════════════════════'],
      ['   CONTOH PENGISIAN'],
      ['═══════════════════════════════════════════════════════════════════'],
      [''],
      ['1️⃣ HARI KERJA NORMAL - HADIR TEPAT WAKTU'],
      ['   Scan Masuk: 08:15'],
      ['   Scan Pulang: 17:20'],
      ['   Pengecualian: (kosong)'],
      ['   → Status: Hadir, Tidak terlambat'],
      [''],
      ['2️⃣ TERLAMBAT'],
      ['   Scan Masuk: 08:45'],
      ['   Scan Pulang: 17:00'],
      ['   Pengecualian: (kosong)'],
      ['   → Status: Hadir, Terlambat 15 menit (08:45 - 08:30)'],
      [''],
      ['3️⃣ ABSEN PARSIAL (Lupa scan pulang)'],
      ['   Scan Masuk: 08:20'],
      ['   Scan Pulang: (kosong)'],
      ['   Pengecualian: (kosong)'],
      ['   → Status: Hadir Parsial, Hanya scan masuk'],
      [''],
      ['4️⃣ SAKIT (Tidak masuk)'],
      ['   Scan Masuk: (kosong)'],
      ['   Scan Pulang: (kosong)'],
      ['   Pengecualian: Sick'],
      ['   → Status: Tidak dihitung dalam KPI'],
      [''],
      ['5️⃣ DINAS LUAR (Dianggap hadir)'],
      ['   Scan Masuk: (kosong)'],
      ['   Scan Pulang: (kosong)'],
      ['   Pengecualian: Dinas'],
      ['   → Status: Hadir penuh (meski tidak ada scan)'],
      [''],
      ['6️⃣ WEEKEND (Sabtu/Minggu)'],
      ['   Tanggal: 05/01/2026 (jika ini Sabtu/Minggu)'],
      ['   Scan Masuk: (kosong)'],
      ['   Scan Pulang: (kosong)'],
      ['   Pengecualian: (kosong)'],
      ['   → Status: Otomatis terdeteksi, tidak dihitung KPI'],
      [''],
      ['7️⃣ LEMBUR'],
      ['   Scan Masuk: 08:20'],
      ['   Scan Pulang: 18:30'],
      ['   Pengecualian: (kosong)'],
      ['   → Status: Hadir + Lembur 1.5 jam (18:30 - 17:00)'],
      [''],
      ['═══════════════════════════════════════════════════════════════════'],
      ['   PENTING - TIPS PENGISIAN'],
      ['═══════════════════════════════════════════════════════════════════'],
      [''],
      ['• Kolom Scan Masuk/Pulang KOSONG = Tidak ada scan (bukan angka 0)'],
      ['• Pengecualian KOSONG = Hari kerja normal'],
      ['• Weekend otomatis terdeteksi dari tanggal, tidak perlu ditandai manual'],
      ['• Sakit/Cuti tidak akan menurunkan persentase kehadiran'],
      ['• Dinas/WFH dihitung sebagai hadir penuh meski tanpa scan'],
      ['• Format waktu selalu HH:MM (2 digit:2 digit)'],
      ['• Tanggal selalu DD/MM/YYYY'],
      [''],
      ['═══════════════════════════════════════════════════════════════════'],
      ['   FITUR FILTER FOKUS KPI'],
      ['═══════════════════════════════════════════════════════════════════'],
      [''],
      ['Setelah upload, Anda bisa filter karyawan berdasarkan:'],
      ['📊 Semua Karyawan - Tampilkan semua'],
      ['⏰ Sering Terlambat - Filter yang sering terlambat'],
      ['🏃 Pulang Cepat - Filter yang sering pulang cepat'],
      ['⚠️ Absen Parsial - Filter yang sering lupa scan'],
      ['🚨 Kehadiran Rendah - Filter attendance rate < 90%'],
      [''],
      ['═══════════════════════════════════════════════════════════════════'],
      ['Dibuat dengan HRIS Analytics Pro - Template Sederhana v2.0'],
      ['═══════════════════════════════════════════════════════════════════']
    ];
    
    const wsInst = XLSX.utils.aoa_to_sheet(instructions);
    wsInst['!cols'] = [{ wch: 75 }];
    XLSX.utils.book_append_sheet(wb, wsInst, 'Panduan Lengkap');
    
    XLSX.writeFile(wb, 'Template_Absensi_Simple_9Kolom.xlsx');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="mb-6">
            <Users className="w-20 h-20 mx-auto text-blue-600 mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-2">HRIS Analytics Pro</h1>
            <p className="text-xl text-gray-600">Template Sederhana - Hanya 9 Kolom! 🎉</p>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-8 mb-8">
            <Upload className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Upload Data Absensi</h2>
            <p className="text-gray-600 mb-6">Import file Excel dengan format simple & mudah dipahami</p>
            
            <div className="flex flex-col gap-4 items-center">
              <label className="inline-block">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="bg-blue-600 text-white px-8 py-4 rounded-lg cursor-pointer hover:bg-blue-700 transition text-lg font-semibold shadow-lg hover:shadow-xl">
                  📂 Pilih File Excel
                </div>
              </label>
              
              <div className="text-gray-500 font-medium">atau</div>
              
              <button
                onClick={downloadTemplate}
                className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 transition text-lg font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Download className="w-5 h-5" />
                Download Template Sederhana
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-semibold mb-2">💡 Template Baru - Lebih Simpel!</p>
              <p className="text-sm text-yellow-700 mb-2">
                <strong>Hanya 9 kolom:</strong> Emp No, Nama, Tanggal, Departemen, Jam Masuk, Jam Pulang, 
                Scan Masuk, Scan Pulang, Pengecualian
              </p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">✓ Weekend auto-detect</span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">✓ Parsial auto-detect</span>
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">✓ Terlambat auto-calculate</span>
                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">✓ Lembur auto-calculate</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg text-white shadow-md hover:shadow-lg transition">
              <Clock className="w-8 h-8 mb-2" />
              <p className="text-sm opacity-90 font-semibold">Deteksi Terlambat</p>
              <p className="text-xs opacity-75 mt-1">Auto dari scan vs jadwal</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-lg text-white shadow-md hover:shadow-lg transition">
              <TrendingUp className="w-8 h-8 mb-2" />
              <p className="text-sm opacity-90 font-semibold">Absen Parsial</p>
              <p className="text-xs opacity-75 mt-1">Scan masuk/pulang saja</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-lg text-white shadow-md hover:shadow-lg transition">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p className="text-sm opacity-90 font-semibold">Filter Fokus KPI</p>
              <p className="text-xs opacity-75 mt-1">Late, Early, Parsial</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-lg text-white shadow-md hover:shadow-lg transition">
              <Activity className="w-8 h-8 mb-2" />
              <p className="text-sm opacity-90 font-semibold">Filter Tanggal</p>
              <p className="text-xs opacity-75 mt-1">Periode custom</p>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-indigo-800 font-semibold mb-2">🚀 Fitur Unggulan</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-indigo-700">
              <div className="flex items-center gap-1">
                <span className="text-green-600">✓</span> Auto calculate terlambat
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-600">✓</span> Auto calculate lembur
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-600">✓</span> Auto detect weekend
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-600">✓</span> Auto detect parsial
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-600">✓</span> Filter per tanggal
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-600">✓</span> Filter fokus KPI
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;