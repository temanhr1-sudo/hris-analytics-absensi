import React, { useState } from 'react';
import { useClerk } from "@clerk/clerk-react";

// --- 1. IMPORT FITUR BARU ---
// Pastikan kedua file ini ada di folder src!
import MenuDashboard from './MenuDashboard.jsx';
import RecruitmentTool from './RecruitmentTool.jsx';

// --- 2. IMPORT FITUR LAMA (ABSENSI) ---
import UploadPage from './components/UploadPage';
import Dashboard from './components/Dashboard';
import KPIMatrix from './components/KPIMatrix';
import DepartmentAnalysis from './components/DepartmentAnalysis';
import EmployeeAnalysis from './components/EmployeeAnalysis';
import LeaveAnalytics from './components/LeaveAnalytics';
import EmployeeManagement from './components/EmployeeManagement';
import TrendsAnalysis from './components/TrendsAnalysis';

const App = () => {
  // --- STATE UTAMA ---
  const { signOut } = useClerk();
  
  // State untuk memilih Tools (null = Menu Utama, 'absensi' = App Lama, 'recruitment' = App Baru)
  const [activeTool, setActiveTool] = useState(null);

  // --- STATE UNTUK APPS ABSENSI (KODE LAMA) ---
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState('upload');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [navParams, setNavParams] = useState(null);

  // --- HANDLER NAVIGASI ABSENSI ---
  const handleNavigate = (page, params = null) => {
    setCurrentPage(page);
    setNavParams(params);
  };

  const handleDataUpload = (uploadedData) => {
    if (uploadedData.length > 100000) {
      alert('⚠️ Data terlalu besar! Maksimal 100,000 baris.');
      return;
    }
    // Loading simulasi
    if (uploadedData.length > 5000) alert('📊 Memproses data...');
    
    setTimeout(() => {
      setData(uploadedData);
      setCurrentPage('dashboard');
    }, 100);
  };

  const handleDataUpdate = (updatedData) => setData(updatedData);
  const handleExit = () => setShowExitConfirm(true);

  // Reset Data saat keluar dari Absensi App
  const confirmExitAbsensi = () => {
    setData([]);
    setNavParams(null);
    setCurrentPage('upload');
    setShowExitConfirm(false);
    // Kita tidak SignOut, tapi kembali ke Menu Tools
    setActiveTool(null); 
  };

  // --- LOGIC TAMPILAN (ROUTING SEDERHANA) ---

  // 1. Jika belum pilih tools, tampilkan MENU DASHBOARD
  if (!activeTool) {
    return <MenuDashboard onSelectTool={setActiveTool} />;
  }

  // 2. Jika pilih RECRUITMENT
  if (activeTool === 'recruitment') {
    return <RecruitmentTool onBack={() => setActiveTool(null)} />;
  }

  // 3. Jika pilih ABSENSI (Render Logic Lama)
  if (activeTool === 'absensi') {
    return (
      <div className="relative min-h-screen bg-gray-50">
        
        {/* Tombol Back Kecil (Opsional: Agar bisa balik ke menu tanpa reset data) */}
        {currentPage === 'dashboard' && (
             <button 
                onClick={() => setActiveTool(null)}
                className="fixed bottom-4 left-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-xs hover:bg-black transition"
             >
                ← Menu Utama
             </button>
        )}

        {/* --- LOGIC ABSENSI LAMA --- */}
        {(currentPage === 'upload' || data.length === 0) ? (
          // Tambahkan tombol back di halaman upload juga
          <div>
            <button 
                onClick={() => setActiveTool(null)} 
                className="fixed top-4 left-4 z-50 bg-gray-500 text-white px-3 py-1 rounded shadow text-sm hover:bg-gray-600"
            >
                ← Menu Utama
            </button>
            <UploadPage onDataUpload={handleDataUpload} />
          </div>
        ) : (
          <>
            {currentPage === 'dashboard' && <Dashboard data={data} onNavigate={handleNavigate} onDataUpdate={handleDataUpdate} onExit={handleExit} />}
            {currentPage === 'kpi' && <KPIMatrix data={data} onNavigate={handleNavigate} onDataUpdate={handleDataUpdate} onExit={handleExit} />}
            {currentPage === 'departments' && <DepartmentAnalysis data={data} onNavigate={handleNavigate} onDataUpdate={handleDataUpdate} onExit={handleExit} />}
            {currentPage === 'employees' && <EmployeeAnalysis data={data} onNavigate={handleNavigate} onDataUpdate={handleDataUpdate} onExit={handleExit} />}
            {currentPage === 'leave' && <LeaveAnalytics data={data} onNavigate={handleNavigate} onDataUpdate={handleDataUpdate} onExit={handleExit} />}
            {currentPage === 'management' && <EmployeeManagement data={data} onNavigate={handleNavigate} onDataUpdate={handleDataUpdate} onExit={handleExit} initialParams={navParams} />}
            {currentPage === 'trends' && <TrendsAnalysis data={data} onNavigate={handleNavigate} onDataUpdate={handleDataUpdate} onExit={handleExit} />}
          </>
        )}

        {/* MODAL KONFIRMASI KELUAR ABSENSI */}
        {showExitConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">⚠️ Keluar dari Absensi?</h3>
              <p className="text-gray-600 mb-6">Data yang diupload akan di-reset. Anda akan kembali ke Menu Utama.</p>
              <div className="flex gap-3">
                <button onClick={confirmExitAbsensi} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-semibold">Ya, Keluar</button>
                <button onClick={() => setShowExitConfirm(false)} className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition font-semibold">Batal</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default App;