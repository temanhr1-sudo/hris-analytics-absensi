import React, { useState } from 'react';
import UploadPage from './components/UploadPage';
import Dashboard from './components/Dashboard';
import KPIMatrix from './components/KPIMatrix';
import DepartmentAnalysis from './components/DepartmentAnalysis';
import EmployeeAnalysis from './components/EmployeeAnalysis';
import LeaveAnalytics from './components/LeaveAnalytics';
import EmployeeManagement from './components/EmployeeManagement';
import TrendsAnalysis from './components/TrendsAnalysis';

const App = () => {
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState('upload');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // NEW: State untuk menampung parameter navigasi (data titipan antar halaman)
  const [navParams, setNavParams] = useState(null);

  // --- HANDLERS ---

  // NEW: Wrapper navigasi untuk menangani perpindahan halaman + parameter data
  const handleNavigate = (page, params = null) => {
    setCurrentPage(page);
    setNavParams(params); // Simpan parameter jika ada (misal: filter dari EmployeeAnalysis)
  };

  const handleDataUpload = (uploadedData) => {
    // Validasi ukuran data
    if (uploadedData.length > 100000) {
      alert('⚠️ Data terlalu besar! Maksimal 100,000 baris.\n\nData Anda: ' + uploadedData.length.toLocaleString() + ' baris\n\nSilakan filter data atau split menjadi beberapa file.');
      return;
    }
    
    // Show loading indicator jika data banyak
    if (uploadedData.length > 10000) {
      alert('📊 Memproses ' + uploadedData.length.toLocaleString() + ' baris data...\n\nMohon tunggu, ini mungkin memakan waktu beberapa detik.');
    }
    
    // Process data in chunks untuk menghindari freeze
    setTimeout(() => {
      try {
        setData(uploadedData);
        setCurrentPage('dashboard');
        
        if (uploadedData.length > 10000) {
          alert('✅ Data berhasil dimuat!\n\n' + uploadedData.length.toLocaleString() + ' baris data siap dianalisis.');
        }
      } catch (error) {
        console.error('Error processing data:', error);
        alert('❌ Error memproses data: ' + error.message);
      }
    }, 100);
  };

  const handleDataUpdate = (updatedData) => {
    setData(updatedData);
  };

  const handleExit = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    // Reset state (Hapus data dari memory)
    setData([]);
    setShowExitConfirm(false);
    setNavParams(null);
    
    // Force navigate to upload page
    setCurrentPage('upload');
  };

  // --- RENDER ---

  if (currentPage === 'upload' || data.length === 0) {
    return <UploadPage onDataUpload={handleDataUpload} />;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* DASHBOARD UTAMA */}
        {currentPage === 'dashboard' && (
          <Dashboard 
            data={data} 
            onNavigate={handleNavigate} // Gunakan handleNavigate
            onDataUpdate={handleDataUpdate}
            onExit={handleExit}
          />
        )}

        {/* KPI MATRIX */}
        {currentPage === 'kpi' && (
          <KPIMatrix 
            data={data} 
            onNavigate={handleNavigate}
            onDataUpdate={handleDataUpdate}
            onExit={handleExit}
          />
        )}

        {/* ANALISIS DEPARTEMEN */}
        {currentPage === 'departments' && (
          <DepartmentAnalysis 
            data={data} 
            onNavigate={handleNavigate}
            onDataUpdate={handleDataUpdate}
            onExit={handleExit}
          />
        )}

        {/* ANALISIS KARYAWAN */}
        {currentPage === 'employees' && (
          <EmployeeAnalysis 
            data={data} 
            onNavigate={handleNavigate}
            onDataUpdate={handleDataUpdate}
            onExit={handleExit}
          />
        )}

        {/* ANALISIS CUTI */}
        {currentPage === 'leave' && (
          <LeaveAnalytics 
            data={data} 
            onNavigate={handleNavigate}
            onDataUpdate={handleDataUpdate}
            onExit={handleExit}
          />
        )}

        {/* MANAJEMEN KARYAWAN */}
        {currentPage === 'management' && (
          <EmployeeManagement 
            data={data} 
            onNavigate={handleNavigate}
            onDataUpdate={handleDataUpdate}
            onExit={handleExit}
            initialParams={navParams} // <--- Pass parameter ke sini (PENTING)
          />
        )}

        {/* TRENDS ANALYSIS */}
        {currentPage === 'trends' && (
          <TrendsAnalysis 
            data={data} 
            onNavigate={handleNavigate}
            onDataUpdate={handleDataUpdate}
            onExit={handleExit}
          />
        )}
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">⚠️ Konfirmasi Keluar</h3>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin keluar? Semua data yang sudah di-upload akan dihapus dari sistem (Reset).
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmExit}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-semibold"
              >
                Ya, Keluar & Hapus Data
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition font-semibold"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;