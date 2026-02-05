import React, { useState, useEffect } from 'react';
import { useClerk, useUser } from "@clerk/clerk-react";

// --- 1. IMPORT FITUR BARU (Pastikan file ini ada di folder src) ---
import MenuDashboard from './MenuDashboard.jsx';
import RecruitmentTool from './RecruitmentTool.jsx';

// --- 2. IMPORT FITUR LAMA (Pastikan path folder components benar) ---
import UploadPage from './components/UploadPage';
import Dashboard from './components/Dashboard';
import KPIMatrix from './components/KPIMatrix';
import DepartmentAnalysis from './components/DepartmentAnalysis';
import EmployeeAnalysis from './components/EmployeeAnalysis';
import LeaveAnalytics from './components/LeaveAnalytics';
import EmployeeManagement from './components/EmployeeManagement';
import TrendsAnalysis from './components/TrendsAnalysis';

const App = () => {
  const { signOut } = useClerk();
  const { user } = useUser();
  
  // STATE UTAMA: Menentukan sedang di menu mana
  // null = Menu Utama (5 Pilihan)
  // 'recruitment' = Tools Rekrutmen
  // 'absensi' = Tools Absensi (App Lama)
  const [activeTool, setActiveTool] = useState(null);

  // --- STATE KHUSUS APP ABSENSI (LAMA) ---
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState('upload');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [navParams, setNavParams] = useState(null);

  // --- HANDLERS ABSENSI ---
  const handleNavigate = (page, params = null) => {
    setCurrentPage(page);
    setNavParams(params);
  };

  const handleDataUpload = (uploadedData) => {
    if (uploadedData.length > 100000) {
      alert('⚠️ Data terlalu besar!');
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

  // LOGIC KELUAR DARI MENU ABSENSI (KEMBALI KE MENU UTAMA)
  const exitToMainMenu = () => {
    // Reset data absensi
    setData([]);
    setNavParams(null);
    setCurrentPage('upload');
    setShowExitConfirm(false);
    // KEMBALI KE MENU 5 PILIHAN
    setActiveTool(null); 
  };

  // --- RENDER UTAMA (LOGIC PINTU GERBANG) ---

  // 1. JIKA BELUM MEMILIH TOOLS -> TAMPILKAN MENU 5 PILIHAN
  if (!activeTool) {
    return <MenuDashboard onSelectTool={setActiveTool} />;
  }

  // 2. JIKA MEMILIH TOOLS REKRUTMEN
  if (activeTool === 'recruitment') {
    return <RecruitmentTool onBack={() => setActiveTool(null)} />;
  }

  // 3. JIKA MEMILIH TOOLS ABSENSI (APP LAMA)
  if (activeTool === 'absensi') {
    return (
      <div className="relative min-h-screen bg-gray-50">
        
        {/* TOMBOL KEMBALI KE MENU UTAMA (SELALU MUNCUL DI POJOK KIRI ATAS) */}
        <button 
            onClick={() => {
                // Jika sedang di halaman upload (belum ada data), langsung balik aja
                if(data.length === 0) setActiveTool(null);
                // Jika sudah ada data, konfirmasi dulu
                else setShowExitConfirm(true);
            }} 
            className="fixed top-4 left-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold hover:bg-black transition flex items-center gap-2"
        >
            <span>←</span> Menu Utama
        </button>

        {/* LOGIC RENDER HALAMAN ABSENSI LAMA */}
        {(currentPage === 'upload' || data.length === 0) ? (
          <UploadPage onDataUpload={handleDataUpload} />
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

        {/* MODAL KONFIRMASI KELUAR */}
        {showExitConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">⚠️ Kembali ke Menu Utama?</h3>
              <p className="text-gray-600 mb-6">Data absensi yang sedang dibuka akan ditutup (reset). Anda akan kembali ke halaman pemilihan tools.</p>
              <div className="flex gap-3">
                <button onClick={exitToMainMenu} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-semibold">Ya, Keluar</button>
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