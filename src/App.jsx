import React, { useState } from 'react';
import { useClerk, useUser } from "@clerk/clerk-react";

// --- 1. IMPORT FITUR BARU ---
import MenuDashboard from './tools/menu/MenuDashboard.jsx';
import RecruitmentTool from './tools/recruitment/RecruitmentTool.jsx';
import PayrollSimulator from './tools/payroll/PayrollSimulator.jsx';
import PerformanceManagement from './tools/performance/PerformanceManagement.jsx';
import ManpowerPlanning from './tools/manpower/ManpowerPlanning.jsx';
import CompBenFairness from './tools/compben/CompBenFairness.jsx'; 
import RetentionAttrition from './tools/retention/RetentionAttrition.jsx';
import DEIDashboard from './tools/dei/DEIDashboard.jsx';
// 👇 Pastikan file ini ada dan tidak error
import LDAnalytics from './tools/ld/LDAnalytics.jsx';

// --- 2. IMPORT FITUR LAMA ---
import UploadPage from './components/UploadPage';
import Dashboard from './components/Dashboard';
import KPIMatrix from './components/KPIMatrix';
import DepartmentAnalysis from './components/DepartmentAnalysis';
import EmployeeAnalysis from './components/EmployeeAnalysis';
import LeaveAnalytics from './components/LeaveAnalytics';
import EmployeeManagement from './components/EmployeeManagement';
import TrendsAnalysis from './components/TrendsAnalysis';
import OrgNetworkAnalysis from './tools/ona/OrgNetworkAnalysis.jsx';

const App = () => {
  const { signOut } = useClerk();
  const { user } = useUser();
  
  // STATE UTAMA
  const [activeTool, setActiveTool] = useState(null);

  // STATE ABSENSI (LAMA)
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
    if (uploadedData.length > 5000) alert('📊 Memproses data...');
    setTimeout(() => {
      setData(uploadedData);
      setCurrentPage('dashboard');
    }, 100);
  };

  const handleDataUpdate = (updatedData) => setData(updatedData);
  const handleExit = () => setShowExitConfirm(true);

  const exitToMainMenu = () => {
    setData([]);
    setNavParams(null);
    setCurrentPage('upload');
    setShowExitConfirm(false);
    setActiveTool(null); 
  };

  // --- ROUTING / NAVIGATION ---

  // 1. MENU UTAMA
  if (!activeTool) {
    return <MenuDashboard onSelectTool={setActiveTool} />;
  }

  // 2. FITUR BARU
  if (activeTool === 'recruitment') return <RecruitmentTool onBack={() => setActiveTool(null)} />;
  if (activeTool === 'payroll') return <PayrollSimulator onBack={() => setActiveTool(null)} />;
  if (activeTool === 'performance') return <PerformanceManagement onBack={() => setActiveTool(null)} />;
  if (activeTool === 'manpower') return <ManpowerPlanning onBack={() => setActiveTool(null)} />;
  if (activeTool === 'retention') return <RetentionAttrition onBack={() => setActiveTool(null)} />;
  if (activeTool === 'compen') return <CompBenFairness onBack={() => setActiveTool(null)} />;
  if (activeTool === 'dei') return <DEIDashboard onBack={() => setActiveTool(null)} />;
  if (activeTool === 'ona') return <OrgNetworkAnalysis onBack={() => setActiveTool(null)} />;
  // 👇 INI RUTE UNTUK L&D
  if (activeTool === 'lnd') return <LDAnalytics onBack={() => setActiveTool(null)} />;

  // 3. FITUR LAMA (ABSENSI)
  if (activeTool === 'absensi') {
    return (
      <div className="relative min-h-screen bg-gray-50">
        <button 
            onClick={() => {
                if(data.length === 0) setActiveTool(null);
                else setShowExitConfirm(true);
            }} 
            className="fixed top-4 left-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold hover:bg-black transition flex items-center gap-2"
        >
            <span>←</span> Menu Utama
        </button>

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

 return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-red-100">
        <div className="text-6xl mb-4">🚨</div>
        <h1 className="text-2xl font-black text-red-600 mb-2">Rute Tidak Ditemukan</h1>
        <p className="text-slate-600 mb-6">
          Menu mengirimkan ID: <strong className="bg-slate-200 text-black px-2 py-1 rounded text-xl">"{activeTool}"</strong>
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Tetapi di App.jsx, Anda hanya mendaftarkan <strong>'ld'</strong>. Silakan samakan ID-nya!
        </p>
        <button 
          onClick={exitToMainMenu} 
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
        >
          ← Kembali ke Menu
        </button>
      </div>
    </div>
  );
};

export default App;