import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';
import './RecruitmentStyle.css';

const RecruitmentTool = ({ onBack }) => {
  // State untuk Data
  const [view, setView] = useState('upload'); // 'upload' atau 'dashboard'
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [activeMenu, setActiveMenu] = useState('overview'); // overview, planning, process, posthiring

  // Ref untuk Chart agar tidak error saat render ulang
  const chartRefs = useRef({});

  // --- LOGIC 1: DOWNLOAD TEMPLATE ---
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const masterData = [
      ['No Request', 'Tanggal Request', 'Tanggal Closed', 'Posisi', 'Status', 'Tanggal Apply', 'Tanggal Join', 'Lulus Probation', 'Tanggal Resign', 'Biaya Rekrutmen', 'Sumber Kandidat', 'SLA Terpenuhi', 'Total Offer', 'Offer Diterima', 'Kepuasan User', 'Sesuai SOP'],
      ['REQ001', '2024-01-05', '2024-02-15', 'Software Engineer', 'Join', '2024-01-10', '2024-02-20', 'Y', '', 2000000, 'Job Portal', 'Y', 1, 1, 4.5, 'Y'],
      ['REQ002', '2024-01-10', '2024-03-01', 'Marketing Manager', 'Join', '2024-01-15', '2024-03-05', 'Y', '', 1500000, 'Referral', 'Y', 1, 1, 5, 'Y'],
      ['REQ003', '2024-01-15', '2024-02-28', 'HR Specialist', 'Join', '2024-01-20', '2024-03-01', 'N', '2024-05-15', 1000000, 'Internal', 'Y', 1, 1, 3.5, 'Y'],
      ['REQ004', '2024-02-01', '2024-03-15', 'Sales Executive', 'Join', '2024-02-05', '2024-03-20', 'Y', '', 800000, 'Walk-in', 'N', 1, 1, 4.2, 'Y'],
      ['REQ005', '2024-02-05', '2024-03-20', 'Data Analyst', 'Batal', '', '', '', '', 500000, 'Job Portal', 'N', 2, 0, 0, 'N'],
      ['REQ006', '2024-02-10', '2024-03-25', 'Product Manager', 'Join', '2024-02-15', '2024-03-28', 'Y', '', 2500000, 'LinkedIn', 'Y', 1, 1, 4.8, 'Y'],
      ['REQ007', '2024-03-01', '2024-04-10', 'UI/UX Designer', 'Join', '2024-03-05', '2024-04-15', 'Y', '', 1800000, 'Job Portal', 'Y', 1, 1, 4.3, 'Y'],
      ['REQ008', '2024-03-05', '2024-04-20', 'Finance Manager', 'Proses', '', '', '', '', 0, 'Referral', 'N', 0, 0, 0, 'Y']
    ];

    const ws = XLSX.utils.aoa_to_sheet(masterData);
    ws['!cols'] = Array(16).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(wb, ws, 'MASTER_DATA');

    const guide = [
      ['═══════════════════════════════════════════════════════════════════'],
      ['   PANDUAN TEMPLATE HR RECRUITMENT ANALYTICS - 3 FASE'],
      ['═══════════════════════════════════════════════════════════════════'],
      [''],
      ['📋 FASE 1: PLANNING (Penyusunan MPP)'],
      ['KPI yang dimonitor:'],
      ['- Total Request (Berapa banyak kebutuhan)'],
      ['- Headcount Planning vs Actual'],
      ['- Budget Allocation'],
      [''],
      ['🔄 FASE 2: PROCESS (Proses Rekrutmen Berjalan)'],
      ['KPI yang dimonitor:'],
      ['- Time to Fill (TTF) - Kecepatan tutup posisi'],
      ['- Time to Hire (TTH) - Kecepatan dari apply ke join'],
      ['- SLA Pemenuhan - Apakah sesuai timeline'],
      ['- Offer Acceptance Rate - Tingkat penerimaan offer'],
      ['- Cost per Hire - Efisiensi biaya'],
      ['- Channel Effectiveness - Sumber kandidat terbaik'],
      [''],
      ['✅ FASE 3: POST-HIRING (Monitoring Pasca Rekrutmen)'],
      ['KPI yang dimonitor:'],
      ['- Lulus Probation Rate - Quality of hire'],
      ['- Turnover < 6 bulan - Retention rate'],
      ['- Kepuasan User (Atasan) - Feedback hiring manager'],
      ['- Performance Review - Rating karyawan baru'],
      [''],
      ['═══════════════════════════════════════════════════════════════════'],
      ['KOLOM WAJIB (16 kolom):'],
      ['1.  No Request, 2. Tanggal Request, 3. Tanggal Closed'],
      ['4.  Posisi, 5. Status (Join/Batal/Proses)'],
      ['6.  Tanggal Apply, 7. Tanggal Join'],
      ['8.  Lulus Probation (Y/N), 9. Tanggal Resign'],
      ['10. Biaya Rekrutmen, 11. Sumber Kandidat'],
      ['12. SLA Terpenuhi (Y/N), 13. Total Offer, 14. Offer Diterima'],
      ['15. Kepuasan User (1-5), 16. Sesuai SOP (Y/N)'],
    ];

    const wsGuide = XLSX.utils.aoa_to_sheet(guide);
    wsGuide['!cols'] = [{ wch: 75 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, 'PANDUAN');

    XLSX.writeFile(wb, 'Template_Recruitment_Analytics_3Fase.xlsx');
  };

  // --- LOGIC 2: PROSES DATA EXCEL ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert('⚠️ Harap upload file Excel (.xlsx atau .xls)');
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (jsonData.length === 0) {
          alert('⚠️ File kosong atau tidak ada data!');
          setLoading(false);
          return;
        }

        const calculated = calculateAllKPI(jsonData);
        setRawData(jsonData);
        setKpi(calculated);
        setView('dashboard');
      } catch (error) {
        alert('❌ Error: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- LOGIC 3: RUMUS PERHITUNGAN KPI ---
  const calculateAllKPI = (data) => {
    const joinedData = data.filter(r => r.Status === 'Join');
    const closedData = data.filter(r => r['Tanggal Closed']);
    const prosesData = data.filter(r => r.Status === 'Proses');
    
    const calcDays = (start, end) => {
      const s = new Date(start);
      const e = new Date(end);
      return Math.floor((e - s) / (86400000));
    };

    // === FASE 1: PLANNING ===
    const totalRequest = data.length;
    const totalClosed = closedData.length;
    const totalProses = prosesData.length;
    const totalBatal = data.filter(r => r.Status === 'Batal').length;
    const fillRate = totalRequest > 0 ? ((totalClosed / totalRequest) * 100).toFixed(1) : 0;

    // === FASE 2: PROCESS ===
    // Time to Fill
    let totalTTF = 0, countTTF = 0;
    closedData.forEach(r => {
      if (r['Tanggal Request'] && r['Tanggal Closed']) {
        const d = calcDays(r['Tanggal Request'], r['Tanggal Closed']);
        if (d > 0) { totalTTF += d; countTTF++; }
      }
    });
    const avgTTF = countTTF > 0 ? (totalTTF / countTTF).toFixed(1) : 0;

    // Time to Hire
    let totalTTH = 0, countTTH = 0;
    joinedData.forEach(r => {
      if (r['Tanggal Apply'] && r['Tanggal Join']) {
        const d = calcDays(r['Tanggal Apply'], r['Tanggal Join']);
        if (d > 0) { totalTTH += d; countTTH++; }
      }
    });
    const avgTTH = countTTH > 0 ? (totalTTH / countTTH).toFixed(1) : 0;

    // SLA
    const slaCount = data.filter(r => r['SLA Terpenuhi'] === 'Y').length;
    const slaRate = data.length > 0 ? ((slaCount / data.length) * 100).toFixed(1) : 0;
    
    // Offer Acceptance
    const totalOffer = data.reduce((s, r) => s + (parseFloat(r['Total Offer']) || 0), 0);
    const offerAcc = data.reduce((s, r) => s + (parseFloat(r['Offer Diterima']) || 0), 0);
    const accRate = totalOffer > 0 ? ((offerAcc / totalOffer) * 100).toFixed(1) : 0;

    // Cost per Hire
    const totalBiaya = data.reduce((s, r) => s + (parseFloat(r['Biaya Rekrutmen']) || 0), 0);
    const costPerHire = joinedData.length > 0 ? Math.round(totalBiaya / joinedData.length) : 0;
    const totalBudget = totalBiaya;

    // Channel Analysis
    const channels = {};
    data.forEach(r => {
      const channel = r['Sumber Kandidat'] || 'Lainnya';
      channels[channel] = (channels[channel] || 0) + 1;
    });

    // === FASE 3: POST-HIRING ===
    // Lulus Probation
    const lulusCount = joinedData.filter(r => r['Lulus Probation'] === 'Y').length;
    const probationRate = joinedData.length > 0 ? ((lulusCount / joinedData.length) * 100).toFixed(1) : 0;
    
    // Turnover < 6 bulan
    const turnoverCount = joinedData.filter(r => r['Tanggal Resign'] && r['Tanggal Resign'] !== '').length;
    const turnoverRate = joinedData.length > 0 ? ((turnoverCount / joinedData.length) * 100).toFixed(1) : 0;

    // Kepuasan User
    const totalKepuasan = data.reduce((s, r) => s + (parseFloat(r['Kepuasan User']) || 0), 0);
    const countKepuasan = data.filter(r => parseFloat(r['Kepuasan User']) > 0).length;
    const avgKepuasan = countKepuasan > 0 ? (totalKepuasan / countKepuasan).toFixed(1) : 0;

    // Retention Rate (kebalikan dari turnover)
    const retentionRate = joinedData.length > 0 ? (100 - parseFloat(turnoverRate)).toFixed(1) : 0;

    return {
      // Overview
      totalRequest, totalClosed, totalProses, totalBatal, fillRate, totalJoined: joinedData.length,
      
      // Planning Phase
      planning: {
        totalRequest,
        totalBudget,
        avgBudgetPerPosition: totalRequest > 0 ? Math.round(totalBudget / totalRequest) : 0,
        openPositions: totalProses,
        closedPositions: totalClosed,
        canceledPositions: totalBatal,
        fillRate
      },

      // Process Phase
      process: {
        avgTTF, avgTTH, slaRate, accRate, costPerHire,
        totalInProcess: totalProses,
        channels,
        avgBiayaPerHire: costPerHire
      },

      // Post-Hiring Phase
      postHiring: {
        probationRate, turnoverRate, avgKepuasan, retentionRate,
        totalJoined: joinedData.length,
        lulusCount,
        turnoverCount,
        activeEmployees: joinedData.length - turnoverCount
      }
    };
  };

  // --- LOGIC 4: EXPORT REPORT ---
  const exportReport = () => {
    if (!kpi || !rawData) return;
    
    const wb = XLSX.utils.book_new();
    
    const summaryData = [
      ['LAPORAN ANALISIS REKRUTMEN - 3 FASE LIFECYCLE'],
      ['Tanggal Export:', new Date().toLocaleDateString('id-ID')],
      [''],
      ['OVERVIEW'],
      ['Total Request', kpi.totalRequest],
      ['Posisi Terisi', kpi.totalJoined],
      ['Fill Rate', kpi.fillRate + '%'],
      [''],
      ['FASE 1: PLANNING'],
      ['Total Budget', 'Rp ' + kpi.planning.totalBudget.toLocaleString('id-ID')],
      ['Avg Budget per Posisi', 'Rp ' + kpi.planning.avgBudgetPerPosition.toLocaleString('id-ID')],
      ['Open Positions', kpi.planning.openPositions],
      [''],
      ['FASE 2: PROCESS'],
      ['Time to Fill', kpi.process.avgTTF + ' hari'],
      ['Time to Hire', kpi.process.avgTTH + ' hari'],
      ['SLA Rate', kpi.process.slaRate + '%'],
      ['Offer Acceptance', kpi.process.accRate + '%'],
      ['Cost per Hire', 'Rp ' + kpi.process.costPerHire.toLocaleString('id-ID')],
      [''],
      ['FASE 3: POST-HIRING'],
      ['Probation Pass Rate', kpi.postHiring.probationRate + '%'],
      ['Retention Rate', kpi.postHiring.retentionRate + '%'],
      ['Turnover Rate', kpi.postHiring.turnoverRate + '%'],
      ['Kepuasan User', kpi.postHiring.avgKepuasan],
    ];
    
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');
    
    const ws2 = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Data Mentah');
    
    XLSX.writeFile(wb, `Laporan_Recruitment_3Fase_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- LOGIC 5: RENDER CHART ---
  useEffect(() => {
    if (view === 'dashboard' && kpi) {
      Object.values(chartRefs.current).forEach(c => c?.destroy());

      // Chart untuk OVERVIEW
      if (activeMenu === 'overview') {
        const ctxFunnel = document.getElementById('funnelChart');
        if (ctxFunnel) {
          chartRefs.current.funnel = new Chart(ctxFunnel, {
            type: 'bar',
            data: {
              labels: ['Request', 'Closed', 'Join', 'Active'],
              datasets: [{
                label: 'Jumlah',
                data: [kpi.totalRequest, kpi.totalClosed, kpi.totalJoined, kpi.postHiring.activeEmployees],
                backgroundColor: ['#3b82f6', '#6366f1', '#8b5cf6', '#10b981']
              }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: true }
          });
        }
      }

      // Chart untuk PLANNING
      if (activeMenu === 'planning') {
        const ctxBudget = document.getElementById('budgetChart');
        if (ctxBudget) {
          chartRefs.current.budget = new Chart(ctxBudget, {
            type: 'pie',
            data: {
              labels: ['Open', 'Closed', 'Canceled'],
              datasets: [{
                data: [kpi.planning.openPositions, kpi.planning.closedPositions, kpi.planning.canceledPositions],
                backgroundColor: ['#f59e0b', '#10b981', '#ef4444']
              }]
            },
            options: { responsive: true, maintainAspectRatio: true }
          });
        }
      }

      // Chart untuk PROCESS
      if (activeMenu === 'process') {
        const ctxTime = document.getElementById('timeChart');
        if (ctxTime) {
          chartRefs.current.time = new Chart(ctxTime, {
            type: 'bar',
            data: {
              labels: ['Time to Fill', 'Time to Hire', 'Target TTF', 'Target TTH'],
              datasets: [{
                label: 'Hari',
                data: [kpi.process.avgTTF, kpi.process.avgTTH, 30, 25],
                backgroundColor: ['#3b82f6', '#6366f1', '#10b981', '#10b981']
              }]
            },
            options: { responsive: true, maintainAspectRatio: true }
          });
        }

        const ctxChannel = document.getElementById('channelChart');
        if (ctxChannel) {
          chartRefs.current.channel = new Chart(ctxChannel, {
            type: 'pie',
            data: {
              labels: Object.keys(kpi.process.channels),
              datasets: [{
                data: Object.values(kpi.process.channels),
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
              }]
            },
            options: { responsive: true, maintainAspectRatio: true }
          });
        }
      }

      // Chart untuk POST-HIRING
      if (activeMenu === 'posthiring') {
        const ctxQuality = document.getElementById('qualityChart');
        if (ctxQuality) {
          chartRefs.current.quality = new Chart(ctxQuality, {
            type: 'bar',
            data: {
              labels: ['Probation Pass', 'Retention', 'Kepuasan User'],
              datasets: [{
                label: '%',
                data: [kpi.postHiring.probationRate, kpi.postHiring.retentionRate, (kpi.postHiring.avgKepuasan / 5 * 100).toFixed(1)],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b']
              }]
            },
            options: { 
              responsive: true, 
              maintainAspectRatio: true,
              scales: { y: { beginAtZero: true, max: 100 } }
            }
          });
        }
      }
    }

    return () => {
      Object.values(chartRefs.current).forEach(c => c?.destroy());
    };
  }, [view, activeMenu, kpi]);

  // --- TAMPILAN UPLOAD ---
  if (view === 'upload') {
    return (
      <div className="upload-container">
        <button onClick={onBack} className="fixed top-4 left-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition">
          ← Kembali
        </button>
        
        <div className="upload-card">
          <div className="upload-icon">🎯</div>
          <h1 className="upload-title">Recruitment Analytics</h1>
          <p className="upload-subtitle">3 Fase Lifecycle: Planning → Process → Post-Hiring</p>

          <div className="upload-area">
            {loading ? (
              <div className="text-center">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-blue-600 font-semibold">Menganalisa data...</p>
              </div>
            ) : (
              <>
                <div className="text-6xl mb-4">📁</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload Data Rekrutmen</h2>
                <p className="text-gray-600 mb-6">Import file Excel untuk analisa 3 fase recruitment</p>
                
                <div className="flex flex-col gap-4 items-center">
                  <label className="cursor-pointer">
                    <input type="file" onChange={handleFileUpload} accept=".xlsx,.xls" className="hidden" />
                    <div className="btn btn-primary">📂 Pilih File Excel</div>
                  </label>
                  
                  <div className="text-gray-500 font-medium">atau</div>
                  
                  <button onClick={downloadTemplate} className="btn btn-success">
                    📥 Download Template
                  </button>
                </div>

                <div className="info-box mt-6">
                  <p className="info-box-title">💡 Analisa 3 Fase Recruitment Lifecycle</p>
                  <p className="info-box-text">
                    <strong>Planning:</strong> MPP, Budget, Headcount<br/>
                    <strong>Process:</strong> TTF, TTH, Cost, SLA<br/>
                    <strong>Post-Hiring:</strong> Probation, Turnover, Retention
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <p className="feature-title">Fase Planning</p>
              <p className="feature-desc">MPP & Budget Analysis</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <p className="feature-title">Fase Process</p>
              <p className="feature-desc">TTF, TTH, Cost, SLA</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✅</div>
              <p className="feature-title">Fase Post-Hiring</p>
              <p className="feature-desc">Quality & Retention</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <p className="feature-title">Visual Analytics</p>
              <p className="feature-desc">Charts & Reports</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- TAMPILAN DASHBOARD ---
  return (
    <div className="dashboard active">
      {/* HEADER */}
      <div className="header">
        <div className="header-content">
          <div className="header-top">
            <div>
              <h1 className="text-3xl font-bold mb-1">Recruitment Analytics Dashboard</h1>
              <p className="text-blue-100 text-sm">3 Fase Lifecycle Analysis: Planning → Process → Post-Hiring</p>
            </div>
            <div className="flex gap-3">
              <button onClick={downloadTemplate} className="btn-header btn-download">📥 Template</button>
              <button onClick={exportReport} className="btn-header btn-download">📊 Export</button>
              <button onClick={() => setView('upload')} className="btn-header btn-exit">🚪 Keluar</button>
            </div>
          </div>

          {/* MAIN NAVIGATION */}
          <div className="flex gap-2 mt-6">
            <button
              className={`nav-tab ${activeMenu === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveMenu('overview')}
            >
              📊 Overview
            </button>
            <button
              className={`nav-tab ${activeMenu === 'planning' ? 'active' : ''}`}
              onClick={() => setActiveMenu('planning')}
            >
              📋 Fase Planning
            </button>
            <button
              className={`nav-tab ${activeMenu === 'process' ? 'active' : ''}`}
              onClick={() => setActiveMenu('process')}
            >
              🔄 Fase Process
            </button>
            <button
              className={`nav-tab ${activeMenu === 'posthiring' ? 'active' : ''}`}
              onClick={() => setActiveMenu('posthiring')}
            >
              ✅ Fase Post-Hiring
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="content">
        
        {/* === MENU OVERVIEW === */}
        {activeMenu === 'overview' && (
          <>
            <h2 className="page-title">Overview Rekrutmen</h2>
            <p className="page-subtitle">Ringkasan key metrics recruitment lifecycle</p>
            
            <div className="kpi-grid">
              <div className="kpi-card neutral">
                <p className="kpi-label">Total Request</p>
                <p className="kpi-value">{kpi.totalRequest}</p>
                <p className="kpi-subtext">Kebutuhan rekrutmen</p>
              </div>

              <div className="kpi-card excellent">
                <p className="kpi-label">Posisi Terisi</p>
                <p className="kpi-value">{kpi.totalJoined}</p>
                <p className="kpi-subtext">Kandidat join</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.fillRate) >= 80 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Fill Rate</p>
                <p className="kpi-value">{kpi.fillRate}%</p>
                <p className="kpi-subtext">Target: ≥80%</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.process.avgTTF) <= 30 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Time to Fill</p>
                <p className="kpi-value">{kpi.process.avgTTF}</p>
                <p className="kpi-subtext">hari (Target: ≤30)</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.process.avgTTH) <= 25 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Time to Hire</p>
                <p className="kpi-value">{kpi.process.avgTTH}</p>
                <p className="kpi-subtext">hari (Target: ≤25)</p>
              </div>

              <div className={`kpi-card ${kpi.process.costPerHire <= 2000000 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Cost per Hire</p>
                <p className="kpi-value">Rp {(kpi.process.costPerHire / 1000).toFixed(0)}k</p>
                <p className="kpi-subtext">Target: ≤Rp 2jt</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.postHiring.probationRate) >= 85 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Probation Pass Rate</p>
                <p className="kpi-value">{kpi.postHiring.probationRate}%</p>
                <p className="kpi-subtext">Target: ≥85%</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.postHiring.turnoverRate) <= 10 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Turnover Rate</p>
                <p className="kpi-value">{kpi.postHiring.turnoverRate}%</p>
                <p className="kpi-subtext">Target: ≤10%</p>
              </div>
            </div>

            <div className="charts-grid mt-8">
              <div className="chart-card">
                <h3 className="chart-title">🔄 Recruitment Funnel</h3>
                <canvas id="funnelChart"></canvas>
              </div>
            </div>
          </>
        )}

        {/* === MENU PLANNING === */}
        {activeMenu === 'planning' && (
          <>
            <h2 className="page-title">Fase Planning (Penyusunan MPP)</h2>
            <p className="page-subtitle">Analisa kebutuhan headcount dan budget allocation</p>
            
            <div className="kpi-grid">
              <div className="kpi-card neutral">
                <p className="kpi-label">Total Request</p>
                <p className="kpi-value">{kpi.planning.totalRequest}</p>
                <p className="kpi-subtext">Kebutuhan rekrutmen</p>
              </div>

              <div className="kpi-card excellent">
                <p className="kpi-label">Total Budget</p>
                <p className="kpi-value">Rp {(kpi.planning.totalBudget / 1000000).toFixed(1)}jt</p>
                <p className="kpi-subtext">Budget recruitment</p>
              </div>

              <div className="kpi-card neutral">
                <p className="kpi-label">Avg Budget per Posisi</p>
                <p className="kpi-value">Rp {(kpi.planning.avgBudgetPerPosition / 1000).toFixed(0)}k</p>
                <p className="kpi-subtext">Rata-rata biaya</p>
              </div>

              <div className="kpi-card good">
                <p className="kpi-label">Open Positions</p>
                <p className="kpi-value">{kpi.planning.openPositions}</p>
                <p className="kpi-subtext">Masih proses</p>
              </div>

              <div className="kpi-card excellent">
                <p className="kpi-label">Closed Positions</p>
                <p className="kpi-value">{kpi.planning.closedPositions}</p>
                <p className="kpi-subtext">Sudah terisi</p>
              </div>

              <div className="kpi-card poor">
                <p className="kpi-label">Canceled Positions</p>
                <p className="kpi-value">{kpi.planning.canceledPositions}</p>
                <p className="kpi-subtext">Dibatalkan</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.planning.fillRate) >= 80 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Fill Rate</p>
                <p className="kpi-value">{kpi.planning.fillRate}%</p>
                <p className="kpi-subtext">Target: ≥80%</p>
              </div>
            </div>

            <div className="charts-grid mt-8">
              <div className="chart-card">
                <h3 className="chart-title">📊 Status Distribusi</h3>
                <canvas id="budgetChart"></canvas>
              </div>
            </div>
          </>
        )}

        {/* === MENU PROCESS === */}
        {activeMenu === 'process' && (
          <>
            <h2 className="page-title">Fase Process (Rekrutmen Berjalan)</h2>
            <p className="page-subtitle">Monitoring kecepatan dan efisiensi proses recruitment</p>
            
            <div className="kpi-grid">
              <div className={`kpi-card ${parseFloat(kpi.process.avgTTF) <= 30 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Time to Fill (TTF)</p>
                <p className="kpi-value">{kpi.process.avgTTF}</p>
                <p className="kpi-subtext">hari (Target: ≤30)</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.process.avgTTH) <= 25 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Time to Hire (TTH)</p>
                <p className="kpi-value">{kpi.process.avgTTH}</p>
                <p className="kpi-subtext">hari (Target: ≤25)</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.process.slaRate) >= 90 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">SLA Pemenuhan</p>
                <p className="kpi-value">{kpi.process.slaRate}%</p>
                <p className="kpi-subtext">Target: ≥90%</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.process.accRate) >= 80 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Offer Acceptance Rate</p>
                <p className="kpi-value">{kpi.process.accRate}%</p>
                <p className="kpi-subtext">Target: ≥80%</p>
              </div>

              <div className={`kpi-card ${kpi.process.costPerHire <= 2000000 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Cost per Hire</p>
                <p className="kpi-value">Rp {(kpi.process.costPerHire / 1000).toFixed(0)}k</p>
                <p className="kpi-subtext">Target: ≤Rp 2jt</p>
              </div>

              <div className="kpi-card good">
                <p className="kpi-label">In Process</p>
                <p className="kpi-value">{kpi.process.totalInProcess}</p>
                <p className="kpi-subtext">Sedang berjalan</p>
              </div>
            </div>

            <div className="charts-grid mt-8">
              <div className="chart-card">
                <h3 className="chart-title">⏱️ Time Analysis</h3>
                <canvas id="timeChart"></canvas>
              </div>

              <div className="chart-card">
                <h3 className="chart-title">🎯 Channel Effectiveness</h3>
                <canvas id="channelChart"></canvas>
              </div>
            </div>
          </>
        )}

        {/* === MENU POST-HIRING === */}
        {activeMenu === 'posthiring' && (
          <>
            <h2 className="page-title">Fase Post-Hiring (Monitoring Pasca Rekrutmen)</h2>
            <p className="page-subtitle">Quality of hire dan retention analysis</p>
            
            <div className="kpi-grid">
              <div className="kpi-card excellent">
                <p className="kpi-label">Total Karyawan Join</p>
                <p className="kpi-value">{kpi.postHiring.totalJoined}</p>
                <p className="kpi-subtext">Yang sudah masuk</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.postHiring.probationRate) >= 85 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Probation Pass Rate</p>
                <p className="kpi-value">{kpi.postHiring.probationRate}%</p>
                <p className="kpi-subtext">Target: ≥85%</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.postHiring.retentionRate) >= 90 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Retention Rate</p>
                <p className="kpi-value">{kpi.postHiring.retentionRate}%</p>
                <p className="kpi-subtext">Target: ≥90%</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.postHiring.turnoverRate) <= 10 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Turnover &lt;6 Bulan</p>
                <p className="kpi-value">{kpi.postHiring.turnoverRate}%</p>
                <p className="kpi-subtext">Target: ≤10%</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.postHiring.avgKepuasan) >= 4.5 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Kepuasan User</p>
                <p className="kpi-value">{kpi.postHiring.avgKepuasan}</p>
                <p className="kpi-subtext">Target: ≥4.5/5.0</p>
              </div>

              <div className="kpi-card excellent">
                <p className="kpi-label">Lulus Probation</p>
                <p className="kpi-value">{kpi.postHiring.lulusCount}</p>
                <p className="kpi-subtext">Karyawan</p>
              </div>

              <div className="kpi-card poor">
                <p className="kpi-label">Turnover Count</p>
                <p className="kpi-value">{kpi.postHiring.turnoverCount}</p>
                <p className="kpi-subtext">Resign &lt;6 bulan</p>
              </div>

              <div className="kpi-card excellent">
                <p className="kpi-label">Active Employees</p>
                <p className="kpi-value">{kpi.postHiring.activeEmployees}</p>
                <p className="kpi-subtext">Masih aktif</p>
              </div>
            </div>

            <div className="charts-grid mt-8">
              <div className="chart-card">
                <h3 className="chart-title">✅ Quality Metrics</h3>
                <canvas id="qualityChart"></canvas>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RecruitmentTool;