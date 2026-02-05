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
  const [activeTab, setActiveTab] = useState('summary');

  // Ref untuk Chart agar tidak error saat render ulang
  const chartRefs = useRef({});

  // --- LOGIC 1: DOWNLOAD TEMPLATE ---
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Master Data dengan contoh lengkap
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

    // Panduan Sheet
    const guide = [
      ['═══════════════════════════════════════════════════════════════════'],
      ['   PANDUAN TEMPLATE HR RECRUITMENT KPI - MASTER DATA'],
      ['═══════════════════════════════════════════════════════════════════'],
      [''],
      ['KOLOM YANG DIPERLUKAN (16 Kolom):'],
      ['1.  No Request        - Nomor request rekrutmen (unique)'],
      ['2.  Tanggal Request   - Tanggal request diajukan (YYYY-MM-DD)'],
      ['3.  Tanggal Closed    - Tanggal posisi terisi (YYYY-MM-DD)'],
      ['4.  Posisi            - Nama posisi yang direkrut'],
      ['5.  Status            - Join / Batal / Proses'],
      ['6.  Tanggal Apply     - Tanggal kandidat melamar (YYYY-MM-DD)'],
      ['7.  Tanggal Join      - Tanggal kandidat mulai kerja (YYYY-MM-DD)'],
      ['8.  Lulus Probation   - Y = Lulus / N = Tidak Lulus'],
      ['9.  Tanggal Resign    - Tanggal resign jika < 6 bulan'],
      ['10. Biaya Rekrutmen   - Total biaya dalam Rupiah'],
      ['11. Sumber Kandidat   - Job Portal/Referral/Internal/Walk-in/LinkedIn'],
      ['12. SLA Terpenuhi     - Y = Sesuai SLA / N = Tidak sesuai'],
      ['13. Total Offer       - Jumlah offer yang diberikan'],
      ['14. Offer Diterima    - Jumlah offer yang diterima'],
      ['15. Kepuasan User     - Skor 1-5 (contoh: 4.5)'],
      ['16. Sesuai SOP        - Y = Sesuai SOP / N = Tidak sesuai'],
      [''],
      ['9 KPI YANG DIHITUNG OTOMATIS:'],
      ['1. Time to Fill = Tanggal Closed - Tanggal Request (Target: ≤30 hari)'],
      ['2. Time to Hire = Tanggal Join - Tanggal Apply (Target: ≤25 hari)'],
      ['3. SLA Pemenuhan = (SLA Terpenuhi Y ÷ Total) × 100% (Target: ≥90%)'],
      ['4. Offer Acceptance = (Offer Diterima ÷ Total Offer) × 100% (Target: ≥80%)'],
      ['5. Lulus Probation = (Lulus Y ÷ Total Join) × 100% (Target: ≥85%)'],
      ['6. Turnover <6 bulan = (Ada Resign ÷ Total Join) × 100% (Target: ≤10%)'],
      ['7. Cost per Hire = Total Biaya ÷ Jumlah Join (Target: ≤Rp 2jt)'],
      ['8. Kepuasan User = Total Skor ÷ Jumlah Data (Target: ≥4.5)'],
      ['9. Compliance SOP = (Sesuai SOP Y ÷ Total) × 100% (Target: 100%)'],
    ];

    const wsGuide = XLSX.utils.aoa_to_sheet(guide);
    wsGuide['!cols'] = [{ wch: 75 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, 'PANDUAN');

    XLSX.writeFile(wb, 'Template_HR_Recruitment_Master_Data.xlsx');
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

        // Hitung KPI
        const calculated = calculateAllKPI(jsonData);
        setRawData(jsonData);
        setKpi(calculated);
        setView('dashboard'); // Pindah ke dashboard
      } catch (error) {
        alert('❌ Error: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- LOGIC 3: RUMUS PERHITUNGAN KPI (LENGKAP) ---
  const calculateAllKPI = (data) => {
    const joinedData = data.filter(r => r.Status === 'Join');
    const closedData = data.filter(r => r['Tanggal Closed']);
    
    // Helper hitung hari
    const calcDays = (start, end) => {
      const s = new Date(start);
      const e = new Date(end);
      return Math.floor((e - s) / (86400000));
    };

    // 1. Time to Fill (TTF)
    let totalTTF = 0, countTTF = 0;
    closedData.forEach(r => {
      if (r['Tanggal Request'] && r['Tanggal Closed']) {
        const d = calcDays(r['Tanggal Request'], r['Tanggal Closed']);
        if (d > 0) {
          totalTTF += d;
          countTTF++;
        }
      }
    });
    const avgTTF = countTTF > 0 ? (totalTTF / countTTF).toFixed(1) : 0;

    // 2. Time to Hire (TTH)
    let totalTTH = 0, countTTH = 0;
    joinedData.forEach(r => {
      if (r['Tanggal Apply'] && r['Tanggal Join']) {
        const d = calcDays(r['Tanggal Apply'], r['Tanggal Join']);
        if (d > 0) {
          totalTTH += d;
          countTTH++;
        }
      }
    });
    const avgTTH = countTTH > 0 ? (totalTTH / countTTH).toFixed(1) : 0;

    // 3. SLA Pemenuhan
    const slaCount = data.filter(r => r['SLA Terpenuhi'] === 'Y').length;
    const slaRate = data.length > 0 ? ((slaCount / data.length) * 100).toFixed(1) : 0;
    
    // 4. Offer Acceptance
    const totalOffer = data.reduce((s, r) => s + (parseFloat(r['Total Offer']) || 0), 0);
    const offerAcc = data.reduce((s, r) => s + (parseFloat(r['Offer Diterima']) || 0), 0);
    const accRate = totalOffer > 0 ? ((offerAcc / totalOffer) * 100).toFixed(1) : 0;

    // 5. Lulus Probation
    const lulusCount = joinedData.filter(r => r['Lulus Probation'] === 'Y').length;
    const probationRate = joinedData.length > 0 ? ((lulusCount / joinedData.length) * 100).toFixed(1) : 0;
    
    // 6. Turnover < 6 bulan
    const turnoverCount = joinedData.filter(r => r['Tanggal Resign'] && r['Tanggal Resign'] !== '').length;
    const turnoverRate = joinedData.length > 0 ? ((turnoverCount / joinedData.length) * 100).toFixed(1) : 0;

    // 7. Cost per Hire
    const totalBiaya = data.reduce((s, r) => s + (parseFloat(r['Biaya Rekrutmen']) || 0), 0);
    const costPerHire = joinedData.length > 0 ? Math.round(totalBiaya / joinedData.length) : 0;

    // 8. Kepuasan User
    const totalKepuasan = data.reduce((s, r) => s + (parseFloat(r['Kepuasan User']) || 0), 0);
    const countKepuasan = data.filter(r => parseFloat(r['Kepuasan User']) > 0).length;
    const avgKepuasan = countKepuasan > 0 ? (totalKepuasan / countKepuasan).toFixed(1) : 0;

    // 9. Compliance SOP
    const sopCount = data.filter(r => r['Sesuai SOP'] === 'Y').length;
    const complianceRate = data.length > 0 ? ((sopCount / data.length) * 100).toFixed(1) : 0;

    // Weighted Score Calculation
    const weights = { ttf: 15, tth: 10, sla: 15, acc: 10, prob: 15, turn: 10, cost: 10, sat: 10, comp: 5 };
    
    let totalScore = 0;
    
    // Score TTF (target 30, makin kecil makin baik)
    const scoreTTF = avgTTF > 0 ? Math.min((30 / avgTTF) * 100, 120) : 100;
    totalScore += (scoreTTF * weights.ttf) / 100;

    // Score TTH (target 25, makin kecil makin baik)
    const scoreTTH = avgTTH > 0 ? Math.min((25 / avgTTH) * 100, 120) : 100;
    totalScore += (scoreTTH * weights.tth) / 100;

    // Score lainnya
    totalScore += ((slaRate / 90) * 100 * weights.sla) / 100;
    totalScore += ((accRate / 80) * 100 * weights.acc) / 100;
    totalScore += ((probationRate / 85) * 100 * weights.prob) / 100;
    totalScore += (turnoverRate > 0 ? Math.min((10 / turnoverRate) * 100, 120) : 100) * weights.turn / 100;
    totalScore += (costPerHire > 0 ? Math.min((2000000 / costPerHire) * 100, 120) : 100) * weights.cost / 100;
    totalScore += ((avgKepuasan / 4.5) * 100 * weights.sat) / 100;
    totalScore += (parseFloat(complianceRate) * weights.comp) / 100;

    // Predikat
    let predikat = 'Perlu Perbaikan';
    let predikatClass = 'poor';
    if (totalScore >= 90) {
      predikat = 'Efektif';
      predikatClass = 'excellent';
    } else if (totalScore >= 70) {
      predikat = 'Cukup';
      predikatClass = 'good';
    }

    return {
      totalRequest: data.length,
      posisiTerisi: joinedData.length,
      avgTTF, avgTTH, slaRate, accRate,
      probationRate, turnoverRate, costPerHire,
      avgKepuasan, complianceRate,
      totalScore: totalScore.toFixed(1),
      predikat, predikatClass,
      scores: {
        scoreTTF: scoreTTF.toFixed(1),
        scoreTTH: scoreTTH.toFixed(1),
        scoreSLA: ((slaRate / 90) * 100).toFixed(1),
        scoreAcceptance: ((accRate / 80) * 100).toFixed(1),
        scoreProbation: ((probationRate / 85) * 100).toFixed(1),
        scoreTurnover: (turnoverRate > 0 ? Math.min((10 / turnoverRate) * 100, 120) : 100).toFixed(1),
        scoreCost: (costPerHire > 0 ? Math.min((2000000 / costPerHire) * 100, 120) : 100).toFixed(1),
        scoreSatisfaction: ((avgKepuasan / 4.5) * 100).toFixed(1),
        scoreCompliance: parseFloat(complianceRate).toFixed(1)
      }
    };
  };

  // --- LOGIC 4: EXPORT REPORT ---
  const exportReport = () => {
    if (!kpi || !rawData) return;
    
    const wb = XLSX.utils.book_new();
    
    const summaryData = [
      ['LAPORAN ANALISIS REKRUTMEN KPI - AUTO CALCULATE'],
      ['Tanggal Export:', new Date().toLocaleDateString('id-ID')],
      [''],
      ['RINGKASAN KPI'],
      ['Overall Score', kpi.totalScore],
      ['Predikat', kpi.predikat],
      ['Total Request', kpi.totalRequest],
      ['Posisi Terisi', kpi.posisiTerisi],
      [''],
      ['DETAIL KPI'],
      ['Time to Fill (rata-rata)', kpi.avgTTF + ' hari'],
      ['Time to Hire (rata-rata)', kpi.avgTTH + ' hari'],
      ['SLA Pemenuhan Request', kpi.slaRate + '%'],
      ['Offer Acceptance Rate', kpi.accRate + '%'],
      ['Lulus Probation', kpi.probationRate + '%'],
      ['Turnover < 6 bulan', kpi.turnoverRate + '%'],
      ['Cost per Hire', 'Rp ' + kpi.costPerHire.toLocaleString('id-ID')],
      ['Kepuasan User', kpi.avgKepuasan],
      ['Compliance SOP', kpi.complianceRate + '%']
    ];
    
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');
    
    const ws2 = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Data Mentah');
    
    XLSX.writeFile(wb, `Laporan_Rekrutmen_KPI_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- LOGIC 5: RENDER CHART (Effect) ---
  useEffect(() => {
    if (view === 'dashboard' && activeTab === 'charts' && kpi) {
      // Hancurkan chart lama jika ada
      Object.values(chartRefs.current).forEach(c => c?.destroy());

      // 1. KPI Overview Chart (Radar)
      const ctxOverview = document.getElementById('overviewChart');
      if (ctxOverview) {
        chartRefs.current.overview = new Chart(ctxOverview, {
          type: 'radar',
          data: {
            labels: ['TTF', 'TTH', 'SLA', 'Acceptance', 'Probation', 'Turnover', 'Cost', 'Satisfaction', 'Compliance'],
            datasets: [{
              label: 'Skor KPI (%)',
              data: [
                kpi.scores.scoreTTF,
                kpi.scores.scoreTTH,
                kpi.scores.scoreSLA,
                kpi.scores.scoreAcceptance,
                kpi.scores.scoreProbation,
                kpi.scores.scoreTurnover,
                kpi.scores.scoreCost,
                kpi.scores.scoreSatisfaction,
                kpi.scores.scoreCompliance
              ],
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: '#3b82f6',
              borderWidth: 2,
              pointBackgroundColor: '#3b82f6'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
              r: {
                beginAtZero: true,
                max: 120
              }
            }
          }
        });
      }

      // 2. Quality Chart
      const ctxQuality = document.getElementById('qualityChart');
      if (ctxQuality) {
        chartRefs.current.quality = new Chart(ctxQuality, {
          type: 'bar',
          data: {
            labels: ['Lulus Probation', 'Turnover < 6 bulan', 'Offer Acceptance'],
            datasets: [{
              label: 'Percentage (%)',
              data: [kpi.probationRate, kpi.turnoverRate, kpi.accRate],
              backgroundColor: ['#10b981', '#ef4444', '#3b82f6']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
              y: {
                beginAtZero: true,
                max: 100
              }
            }
          }
        });
      }

      // 3. Funnel Chart
      const ctxFunnel = document.getElementById('funnelChart');
      if (ctxFunnel) {
        chartRefs.current.funnel = new Chart(ctxFunnel, {
          type: 'bar',
          data: {
            labels: ['Total Request', 'Closed', 'Join', 'Lulus Probation'],
            datasets: [{
              label: 'Jumlah',
              data: [
                kpi.totalRequest,
                rawData.filter(r => r['Tanggal Closed']).length,
                kpi.posisiTerisi,
                rawData.filter(r => r['Lulus Probation'] === 'Y').length
              ],
              backgroundColor: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7']
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true
          }
        });
      }

      // 4. Channel Chart
      const ctxChannel = document.getElementById('channelChart');
      if (ctxChannel) {
        const channels = {};
        rawData.forEach(r => {
          const channel = r['Sumber Kandidat'] || 'Lainnya';
          channels[channel] = (channels[channel] || 0) + 1;
        });

        chartRefs.current.channel = new Chart(ctxChannel, {
          type: 'pie',
          data: {
            labels: Object.keys(channels),
            datasets: [{
              data: Object.values(channels),
              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true
          }
        });
      }
    }

    // Cleanup saat component unmount
    return () => {
      Object.values(chartRefs.current).forEach(c => c?.destroy());
    };
  }, [view, activeTab, kpi, rawData]);

  // --- TAMPILAN (JSX) ---
  if (view === 'upload') {
    return (
      <div className="upload-container">
        <button onClick={onBack} className="fixed top-4 left-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition">
          ← Kembali
        </button>
        
        <div className="upload-card">
          <div className="upload-icon">🎯</div>
          <h1 className="upload-title">HR Recruitment KPI Dashboard</h1>
          <p className="upload-subtitle">Auto-Calculate & Analyze - Powered by Smart Analytics</p>

          <div className="upload-area">
            {loading ? (
              <div className="text-center">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-blue-600 font-semibold">Menganalisa data dan menghitung KPI...</p>
              </div>
            ) : (
              <>
                <div className="text-6xl mb-4">📁</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload Master Data Rekrutmen</h2>
                <p className="text-gray-600 mb-6">Import 1 file Excel dengan data lengkap rekrutmen</p>
                
                <div className="flex flex-col gap-4 items-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".xlsx,.xls"
                      className="hidden"
                    />
                    <div className="btn btn-primary">📂 Pilih File Excel</div>
                  </label>
                  
                  <div className="text-gray-500 font-medium">atau</div>
                  
                  <button onClick={downloadTemplate} className="btn btn-success">
                    📥 Download Template Master Data
                  </button>
                </div>

                <div className="info-box mt-6">
                  <p className="info-box-title">💡 Template Sederhana - 1 Sheet Master Data!</p>
                  <p className="info-box-text">
                    <strong>Kolom wajib:</strong> No Request, Tanggal Request, Tanggal Closed, Posisi, Status, 
                    Tanggal Apply, Tanggal Join, Lulus Probation, Tanggal Resign, Biaya, Sumber Kandidat, 
                    SLA Terpenuhi, Total Offer, Offer Diterima, Kepuasan User, Sesuai SOP
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    <span className="badge">✓ Auto-calculate 9 KPI</span>
                    <span className="badge">✓ Smart Analytics</span>
                    <span className="badge">✓ Visual Dashboard</span>
                    <span className="badge">✓ Export Report</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⏱️</div>
              <p className="feature-title">Auto Calculate TTF & TTH</p>
              <p className="feature-desc">Hitung otomatis dari tanggal</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <p className="feature-title">9 KPI Metrics</p>
              <p className="feature-desc">Compliance, Quality, Cost, Time</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <p className="feature-title">Smart Analysis</p>
              <p className="feature-desc">Probation, Turnover, Acceptance</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <p className="feature-title">Visual Charts</p>
              <p className="feature-desc">Funnel, Trend, Channel Analysis</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TAMPILAN DASHBOARD
  return (
    <div className="dashboard active">
      {/* HEADER */}
      <div className="header">
        <div className="header-content">
          <div className="header-top">
            <div>
              <h1 className="text-3xl font-bold mb-1">Dashboard Rekrutmen KPI - Auto Analytics</h1>
              <p className="text-blue-100 text-sm">Sistem Analisis Otomatis dengan 9 Key Performance Indicators</p>
            </div>
            <div className="flex gap-3">
              <button onClick={downloadTemplate} className="btn-header btn-download">
                📥 Template
              </button>
              <button onClick={exportReport} className="btn-header btn-download">
                📊 Export Laporan
              </button>
              <button onClick={() => setView('upload')} className="btn-header btn-exit">
                🚪 Keluar
              </button>
            </div>
          </div>

          {/* NAV TABS */}
          <div className="flex gap-2 mt-6">
            <button
              className={`nav-tab ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              Ringkasan KPI
            </button>
            <button
              className={`nav-tab ${activeTab === 'matrix' ? 'active' : ''}`}
              onClick={() => setActiveTab('matrix')}
            >
              Detail Matrix
            </button>
            <button
              className={`nav-tab ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => setActiveTab('charts')}
            >
              Grafik Analisis
            </button>
            <button
              className={`nav-tab ${activeTab === 'rawdata' ? 'active' : ''}`}
              onClick={() => setActiveTab('rawdata')}
            >
              Data Mentah
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="content">
        {/* TAB SUMMARY */}
        {activeTab === 'summary' && (
          <>
            <h2 className="page-title">Ringkasan KPI Rekrutmen</h2>
            <p className="page-subtitle">Perhitungan otomatis dari master data rekrutmen</p>
            
            <div className="kpi-grid">
              <div className={`kpi-card ${kpi.predikatClass}`}>
                <p className="kpi-label">Overall Score</p>
                <p className="kpi-value">{kpi.totalScore}</p>
                <p className="kpi-subtext">Skor keseluruhan KPI</p>
              </div>
              
              <div className={`kpi-card ${kpi.predikatClass}`}>
                <p className="kpi-label">Predikat</p>
                <div className={`predikat-badge ${kpi.predikatClass}`}>{kpi.predikat}</div>
              </div>

              <div className="kpi-card neutral">
                <p className="kpi-label">Total Request</p>
                <p className="kpi-value">{kpi.totalRequest}</p>
                <p className="kpi-subtext">Permintaan rekrutmen</p>
              </div>

              <div className="kpi-card excellent">
                <p className="kpi-label">Posisi Terisi</p>
                <p className="kpi-value">{kpi.posisiTerisi}</p>
                <p className="kpi-subtext">Kandidat join</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.avgTTF) <= 30 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Avg Time to Fill</p>
                <p className="kpi-value">{kpi.avgTTF}</p>
                <p className="kpi-subtext">hari (Target: ≤30)</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.avgTTH) <= 25 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Avg Time to Hire</p>
                <p className="kpi-value">{kpi.avgTTH}</p>
                <p className="kpi-subtext">hari (Target: ≤25)</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.slaRate) >= 90 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">SLA Pemenuhan</p>
                <p className="kpi-value">{kpi.slaRate}%</p>
                <p className="kpi-subtext">Target: ≥90%</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.accRate) >= 80 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Offer Acceptance</p>
                <p className="kpi-value">{kpi.accRate}%</p>
                <p className="kpi-subtext">Target: ≥80%</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.probationRate) >= 85 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Lulus Probation</p>
                <p className="kpi-value">{kpi.probationRate}%</p>
                <p className="kpi-subtext">Target: ≥85%</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.turnoverRate) <= 10 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Turnover &lt;6 bulan</p>
                <p className="kpi-value">{kpi.turnoverRate}%</p>
                <p className="kpi-subtext">Target: ≤10%</p>
              </div>

              <div className={`kpi-card ${kpi.costPerHire <= 2000000 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Cost per Hire</p>
                <p className="kpi-value">Rp {(kpi.costPerHire / 1000).toFixed(0)}k</p>
                <p className="kpi-subtext">Target: ≤Rp 2jt</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.avgKepuasan) >= 4.5 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Kepuasan User</p>
                <p className="kpi-value">{kpi.avgKepuasan}</p>
                <p className="kpi-subtext">Target: ≥4.5</p>
              </div>

              <div className={`kpi-card ${parseFloat(kpi.complianceRate) >= 100 ? 'excellent' : 'poor'}`}>
                <p className="kpi-label">Compliance SOP</p>
                <p className="kpi-value">{kpi.complianceRate}%</p>
                <p className="kpi-subtext">Target: 100%</p>
              </div>
            </div>
          </>
        )}

        {/* TAB MATRIX */}
        {activeTab === 'matrix' && (
          <>
            <h2 className="page-title">Detail KPI Matrix dengan Formula</h2>
            <p className="page-subtitle">Rumus perhitungan dan hasil analisa lengkap</p>
            
            <div className="section-card">
              <table className="kpi-table">
                <thead>
                  <tr>
                    <th style={{width: '25%'}}>KPI</th>
                    <th>Hasil</th>
                    <th>Target</th>
                    <th>Status</th>
                    <th>Formula</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Time to Fill</strong></td>
                    <td><strong className="text-blue-600">{kpi.avgTTF} hari</strong></td>
                    <td>≤ 30 hari</td>
                    <td>
                      <span className={`score-badge ${parseFloat(kpi.avgTTF) <= 30 ? 'score-excellent' : 'score-poor'}`}>
                        {parseFloat(kpi.avgTTF) <= 30 ? '✅ Tercapai' : '❌ Belum Tercapai'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">Skor: {kpi.scores.scoreTTF}%</div>
                    </td>
                    <td className="text-xs text-gray-600">Rata-rata (Tanggal Closed - Tanggal Request)</td>
                  </tr>
                  <tr>
                    <td><strong>Time to Hire</strong></td>
                    <td><strong className="text-blue-600">{kpi.avgTTH} hari</strong></td>
                    <td>≤ 25 hari</td>
                    <td>
                      <span className={`score-badge ${parseFloat(kpi.avgTTH) <= 25 ? 'score-excellent' : 'score-poor'}`}>
                        {parseFloat(kpi.avgTTH) <= 25 ? '✅ Tercapai' : '❌ Belum Tercapai'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">Skor: {kpi.scores.scoreTTH}%</div>
                    </td>
                    <td className="text-xs text-gray-600">Rata-rata (Tanggal Join - Tanggal Apply)</td>
                  </tr>
                  <tr>
                    <td><strong>SLA Pemenuhan</strong></td>
                    <td><strong className="text-blue-600">{kpi.slaRate}%</strong></td>
                    <td>≥ 90%</td>
                    <td>
                      <span className={`score-badge ${parseFloat(kpi.slaRate) >= 90 ? 'score-excellent' : 'score-poor'}`}>
                        {parseFloat(kpi.slaRate) >= 90 ? '✅ Tercapai' : '❌ Belum Tercapai'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">Skor: {kpi.scores.scoreSLA}%</div>
                    </td>
                    <td className="text-xs text-gray-600">(SLA Terpenuhi = Y ÷ Total Request) × 100%</td>
                  </tr>
                  <tr>
                    <td><strong>Offer Acceptance</strong></td>
                    <td><strong className="text-blue-600">{kpi.accRate}%</strong></td>
                    <td>≥ 80%</td>
                    <td>
                      <span className={`score-badge ${parseFloat(kpi.accRate) >= 80 ? 'score-excellent' : 'score-poor'}`}>
                        {parseFloat(kpi.accRate) >= 80 ? '✅ Tercapai' : '❌ Belum Tercapai'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">Skor: {kpi.scores.scoreAcceptance}%</div>
                    </td>
                    <td className="text-xs text-gray-600">(Offer Diterima ÷ Total Offer) × 100%</td>
                  </tr>
                  <tr>
                    <td><strong>Lulus Probation</strong></td>
                    <td><strong className="text-blue-600">{kpi.probationRate}%</strong></td>
                    <td>≥ 85%</td>
                    <td>
                      <span className={`score-badge ${parseFloat(kpi.probationRate) >= 85 ? 'score-excellent' : 'score-poor'}`}>
                        {parseFloat(kpi.probationRate) >= 85 ? '✅ Tercapai' : '❌ Belum Tercapai'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">Skor: {kpi.scores.scoreProbation}%</div>
                    </td>
                    <td className="text-xs text-gray-600">(Lulus Probation = Y ÷ Total Join) × 100%</td>
                  </tr>
                  <tr>
                    <td><strong>Turnover &lt; 6 bulan</strong></td>
                    <td><strong className="text-blue-600">{kpi.turnoverRate}%</strong></td>
                    <td>≤ 10%</td>
                    <td>
                      <span className={`score-badge ${parseFloat(kpi.turnoverRate) <= 10 ? 'score-excellent' : 'score-poor'}`}>
                        {parseFloat(kpi.turnoverRate) <= 10 ? '✅ Tercapai' : '❌ Belum Tercapai'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">Skor: {kpi.scores.scoreTurnover}%</div>
                    </td>
                    <td className="text-xs text-gray-600">(Ada Tanggal Resign ÷ Total Join) × 100%</td>
                  </tr>
                  <tr>
                    <td><strong>Cost per Hire</strong></td>
                    <td><strong className="text-blue-600">Rp {kpi.costPerHire.toLocaleString('id-ID')}</strong></td>
                    <td>≤ Rp 2.000.000</td>
                    <td>
                      <span className={`score-badge ${kpi.costPerHire <= 2000000 ? 'score-excellent' : 'score-poor'}`}>
                        {kpi.costPerHire <= 2000000 ? '✅ Tercapai' : '❌ Belum Tercapai'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">Skor: {kpi.scores.scoreCost}%</div>
                    </td>
                    <td className="text-xs text-gray-600">Total Biaya ÷ Jumlah Join</td>
                  </tr>
                  <tr>
                    <td><strong>Kepuasan User</strong></td>
                    <td><strong className="text-blue-600">{kpi.avgKepuasan}</strong></td>
                    <td>≥ 4.5</td>
                    <td>
                      <span className={`score-badge ${parseFloat(kpi.avgKepuasan) >= 4.5 ? 'score-excellent' : 'score-poor'}`}>
                        {parseFloat(kpi.avgKepuasan) >= 4.5 ? '✅ Tercapai' : '❌ Belum Tercapai'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">Skor: {kpi.scores.scoreSatisfaction}%</div>
                    </td>
                    <td className="text-xs text-gray-600">Total Skor ÷ Jumlah Data</td>
                  </tr>
                  <tr>
                    <td><strong>Compliance SOP</strong></td>
                    <td><strong className="text-blue-600">{kpi.complianceRate}%</strong></td>
                    <td>100%</td>
                    <td>
                      <span className={`score-badge ${parseFloat(kpi.complianceRate) >= 100 ? 'score-excellent' : 'score-poor'}`}>
                        {parseFloat(kpi.complianceRate) >= 100 ? '✅ Tercapai' : '❌ Belum Tercapai'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">Skor: {kpi.scores.scoreCompliance}%</div>
                    </td>
                    <td className="text-xs text-gray-600">(Sesuai SOP = Y ÷ Total Request) × 100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB CHARTS */}
        {activeTab === 'charts' && (
          <>
            <h2 className="page-title">Grafik Analisis Visual</h2>
            <p className="page-subtitle">Visualisasi data rekrutmen dalam berbagai perspektif</p>
            
            <div className="charts-grid">
              <div className="chart-card">
                <h3 className="chart-title">📊 Performa KPI Overview</h3>
                <canvas id="overviewChart"></canvas>
              </div>
              
              <div className="chart-card">
                <h3 className="chart-title">📊 Quality Metrics</h3>
                <canvas id="qualityChart"></canvas>
              </div>
              
              <div className="chart-card">
                <h3 className="chart-title">🔄 Funnel Rekrutmen</h3>
                <canvas id="funnelChart"></canvas>
              </div>
              
              <div className="chart-card">
                <h3 className="chart-title">🎯 Channel Effectiveness</h3>
                <canvas id="channelChart"></canvas>
              </div>
            </div>
          </>
        )}

        {/* TAB RAW DATA */}
        {activeTab === 'rawdata' && (
          <>
            <h2 className="page-title">Data Mentah Rekrutmen</h2>
            <p className="page-subtitle">Tabel lengkap data yang di-upload</p>
            
            <div className="section-card">
              <div className="overflow-x-auto">
                <table className="kpi-table">
                  <thead>
                    <tr>
                      {rawData.length > 0 && Object.keys(rawData[0]).map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Object.keys(rawData[0]).map((header, colIndex) => (
                          <td key={colIndex}>{row[header] || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-sm text-gray-500 text-center">
                Total: {rawData.length} baris data
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RecruitmentTool;