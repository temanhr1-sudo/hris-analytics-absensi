import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';
import './RecruitmentStyle.css';

/**
 * ============================================================================
 * RECRUITMENT ANALYTICS DASHBOARD
 * ============================================================================
 * 
 * Sistem analisis rekrutmen berbasis 3-Phase Lifecycle:
 * 
 * 📋 PHASE 1: PLANNING
 *    - Penyusunan MPP & Budget Allocation
 *    - Evaluasi kebutuhan headcount
 *    
 * 🔄 PHASE 2: PROCESS  
 *    - Monitoring kecepatan & efisiensi recruitment
 *    - Time to Fill, Time to Hire, Cost Control
 *    
 * ✅ PHASE 3: POST-HIRING
 *    - Quality of hire assessment
 *    - Retention & performance monitoring
 * 
 * @version 3.0
 * @author HR Analytics Team
 */

const RecruitmentAnalytics = ({ onBack }) => {
  
  // STATE MANAGEMENT
  const [view, setView] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activePhase, setActivePhase] = useState('overview');
  
  const chartRefs = useRef({});

  // UTILITY: Calculate days between dates
  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  };

  // UTILITY: Format Rupiah
  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number);
  };

  // UTILITY: Get status class
  const getStatusClass = (value, target, isLower = false) => {
    const numValue = parseFloat(value);
    const numTarget = parseFloat(target);
    
    if (isLower) {
      return numValue <= numTarget ? 'excellent' : numValue <= numTarget * 1.2 ? 'good' : 'poor';
    } else {
      return numValue >= numTarget ? 'excellent' : numValue >= numTarget * 0.8 ? 'good' : 'poor';
    }
  };

  // ============================================================================
  // TEMPLATE DOWNLOAD
  // ============================================================================
  
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Master Data Sheet
    const masterData = [
      ['No Request', 'Tanggal Request', 'Tanggal Closed', 'Posisi', 'Status', 'Tanggal Apply', 'Tanggal Join', 'Lulus Probation', 'Tanggal Resign', 'Biaya Rekrutmen', 'Sumber Kandidat', 'SLA Terpenuhi', 'Total Offer', 'Offer Diterima', 'Kepuasan User', 'Sesuai SOP'],
      ['REQ001', '2024-01-05', '2024-02-15', 'Software Engineer', 'Join', '2024-01-10', '2024-02-20', 'Y', '', 2000000, 'Job Portal', 'Y', 1, 1, 4.5, 'Y'],
      ['REQ002', '2024-01-10', '2024-03-01', 'Marketing Manager', 'Join', '2024-01-15', '2024-03-05', 'Y', '', 1500000, 'Referral', 'Y', 1, 1, 5, 'Y'],
      ['REQ003', '2024-01-15', '2024-02-28', 'HR Specialist', 'Join', '2024-01-20', '2024-03-01', 'N', '2024-05-15', 1000000, 'Internal', 'Y', 1, 1, 3.5, 'Y']
    ];

    const ws = XLSX.utils.aoa_to_sheet(masterData);
    ws['!cols'] = Array(16).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(wb, ws, 'MASTER_DATA');

    // Documentation Sheet
    const docs = [
      ['═══════════════════════════════════════════════════════════════════════════════'],
      ['              RECRUITMENT ANALYTICS - PANDUAN & FORMULA                        '],
      ['═══════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['📊 OVERVIEW PHASE - Quick Snapshot'],
      ['   Melihat performa recruitment secara keseluruhan dalam 1 dashboard'],
      [''],
      ['📋 PHASE 1: PLANNING - Penyusunan MPP & Budget'],
      ['   '],
      ['   KPI 1: Total Request'],
      ['   Formula: COUNT(No Request)'],
      ['   Interpretasi: Total kebutuhan posisi yang diajukan'],
      ['   '],
      ['   KPI 2: Total Budget'],
      ['   Formula: SUM(Biaya Rekrutmen)'],
      ['   Interpretasi: Total alokasi budget untuk recruitment'],
      ['   '],
      ['   KPI 3: Fill Rate'],
      ['   Formula: (Closed Positions ÷ Total Request) × 100%'],
      ['   Target: ≥ 80%'],
      ['   Interpretasi: Efektivitas pemenuhan kebutuhan headcount'],
      [''],
      ['🔄 PHASE 2: PROCESS - Monitoring Recruitment Berjalan'],
      ['   '],
      ['   KPI 1: Time to Fill (TTF)'],
      ['   Formula: AVG(Tanggal Closed - Tanggal Request) dalam hari'],
      ['   Target: ≤ 30 hari'],
      ['   Interpretasi: Kecepatan menutup posisi, makin kecil makin baik'],
      ['   Breakdown:'],
      ['     - <20 hari = Excellent (Very Fast)'],
      ['     - 20-30 hari = Good (On Target)'],
      ['     - 31-40 hari = Fair (Need Improvement)'],
      ['     - >40 hari = Poor (Too Slow)'],
      ['   '],
      ['   KPI 2: Time to Hire (TTH)'],
      ['   Formula: AVG(Tanggal Join - Tanggal Apply) dalam hari'],
      ['   Target: ≤ 25 hari'],
      ['   Interpretasi: Kecepatan kandidat dari apply ke join'],
      ['   '],
      ['   KPI 3: SLA Compliance Rate'],
      ['   Formula: (SLA Terpenuhi = Y ÷ Total Request) × 100%'],
      ['   Target: ≥ 90%'],
      ['   Interpretasi: Tingkat kepatuhan terhadap SLA recruitment'],
      ['   '],
      ['   KPI 4: Offer Acceptance Rate'],
      ['   Formula: (Offer Diterima ÷ Total Offer) × 100%'],
      ['   Target: ≥ 80%'],
      ['   Interpretasi: Daya tarik company value proposition'],
      ['   Action: Jika <80%, review salary package & benefit'],
      ['   '],
      ['   KPI 5: Cost per Hire'],
      ['   Formula: Total Biaya Recruitment ÷ Jumlah Join'],
      ['   Target: ≤ Rp 2.000.000'],
      ['   Interpretasi: Efisiensi budget recruitment'],
      [''],
      ['✅ PHASE 3: POST-HIRING - Quality & Retention'],
      ['   '],
      ['   KPI 1: Probation Pass Rate'],
      ['   Formula: (Lulus Probation = Y ÷ Total Join) × 100%'],
      ['   Target: ≥ 85%'],
      ['   Interpretasi: Quality of hire, makin tinggi makin baik'],
      ['   Red Flag: Jika <70%, review assessment process'],
      ['   '],
      ['   KPI 2: Retention Rate'],
      ['   Formula: 100% - Turnover Rate'],
      ['   Target: ≥ 90%'],
      ['   Interpretasi: Tingkat bertahannya karyawan baru'],
      ['   '],
      ['   KPI 3: Turnover Rate (<6 bulan)'],
      ['   Formula: (Ada Tanggal Resign ÷ Total Join) × 100%'],
      ['   Target: ≤ 10%'],
      ['   Interpretasi: Early turnover, makin kecil makin baik'],
      ['   Red Flag: Jika >15%, conduct exit interview mendalam'],
      ['   '],
      ['   KPI 4: User Satisfaction'],
      ['   Formula: AVG(Kepuasan User)'],
      ['   Target: ≥ 4.5 / 5.0'],
      ['   Interpretasi: Feedback hiring manager terhadap kandidat'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════'],
      ['                          BEST PRACTICES                                       '],
      ['═══════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['✓ Update data weekly untuk monitoring real-time'],
      ['✓ Review KPI monthly untuk trend analysis'],
      ['✓ Conduct quarterly review untuk strategic planning'],
      ['✓ Benchmark dengan industry standard'],
      ['✓ Share dashboard dengan stakeholders'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════']
    ];

    const wsDoc = XLSX.utils.aoa_to_sheet(docs);
    wsDoc['!cols'] = [{ wch: 85 }];
    XLSX.utils.book_append_sheet(wb, wsDoc, 'PANDUAN');

    XLSX.writeFile(wb, 'Template_Recruitment_Analytics.xlsx');
  };

  // ============================================================================
  // FILE UPLOAD & PROCESSING
  // ============================================================================
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert('⚠️ Format tidak valid. Upload file Excel (.xlsx / .xls)');
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
          alert('⚠️ File kosong');
          setLoading(false);
          return;
        }

        const calculated = calculateAnalytics(jsonData);
        setRawData(jsonData);
        setAnalytics(calculated);
        setView('dashboard');
        
      } catch (error) {
        alert('❌ Error: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  // ============================================================================
  // ANALYTICS CALCULATION ENGINE
  // ============================================================================
  
  const calculateAnalytics = (data) => {
    // Filter data
    const joinedData = data.filter(r => r.Status === 'Join');
    const closedData = data.filter(r => r['Tanggal Closed']);
    const prosesData = data.filter(r => r.Status === 'Proses');
    const batalData = data.filter(r => r.Status === 'Batal');

    // PLANNING METRICS
    const totalRequest = data.length;
    const totalBudget = data.reduce((s, r) => s + (parseFloat(r['Biaya Rekrutmen']) || 0), 0);
    const avgBudgetPerPosition = totalRequest > 0 ? Math.round(totalBudget / totalRequest) : 0;
    const fillRate = totalRequest > 0 ? ((closedData.length / totalRequest) * 100).toFixed(1) : 0;

    // PROCESS METRICS
    // TTF
    let totalTTF = 0, countTTF = 0;
    closedData.forEach(r => {
      if (r['Tanggal Request'] && r['Tanggal Closed']) {
        const days = calculateDays(r['Tanggal Request'], r['Tanggal Closed']);
        if (days > 0) { totalTTF += days; countTTF++; }
      }
    });
    const avgTTF = countTTF > 0 ? (totalTTF / countTTF).toFixed(1) : '0';

    // TTH
    let totalTTH = 0, countTTH = 0;
    joinedData.forEach(r => {
      if (r['Tanggal Apply'] && r['Tanggal Join']) {
        const days = calculateDays(r['Tanggal Apply'], r['Tanggal Join']);
        if (days > 0) { totalTTH += days; countTTH++; }
      }
    });
    const avgTTH = countTTH > 0 ? (totalTTH / countTTH).toFixed(1) : '0';

    // SLA
    const slaCount = data.filter(r => r['SLA Terpenuhi'] === 'Y').length;
    const slaRate = totalRequest > 0 ? ((slaCount / totalRequest) * 100).toFixed(1) : '0';

    // Acceptance
    const totalOffer = data.reduce((s, r) => s + (parseFloat(r['Total Offer']) || 0), 0);
    const offerAccepted = data.reduce((s, r) => s + (parseFloat(r['Offer Diterima']) || 0), 0);
    const acceptanceRate = totalOffer > 0 ? ((offerAccepted / totalOffer) * 100).toFixed(1) : '0';

    // Cost
    const costPerHire = joinedData.length > 0 ? Math.round(totalBudget / joinedData.length) : 0;

    // Channel
    const channels = {};
    data.forEach(r => {
      const ch = r['Sumber Kandidat'] || 'Lainnya';
      channels[ch] = (channels[ch] || 0) + 1;
    });

    // POST-HIRING METRICS
    const probationPassed = joinedData.filter(r => r['Lulus Probation'] === 'Y').length;
    const probationRate = joinedData.length > 0 ? ((probationPassed / joinedData.length) * 100).toFixed(1) : '0';

    const turnoverCount = joinedData.filter(r => r['Tanggal Resign'] && r['Tanggal Resign'] !== '').length;
    const turnoverRate = joinedData.length > 0 ? ((turnoverCount / joinedData.length) * 100).toFixed(1) : '0';
    const retentionRate = (100 - parseFloat(turnoverRate)).toFixed(1);

    const satisfactionData = data.filter(r => parseFloat(r['Kepuasan User']) > 0);
    const totalSatisfaction = satisfactionData.reduce((s, r) => s + (parseFloat(r['Kepuasan User']) || 0), 0);
    const avgSatisfaction = satisfactionData.length > 0 ? (totalSatisfaction / satisfactionData.length).toFixed(1) : '0';

    const activeEmployees = joinedData.length - turnoverCount;

    return {
      overview: {
        totalRequest, totalJoined: joinedData.length, fillRate,
        avgTTF, avgTTH, costPerHire, probationRate, turnoverRate
      },
      planning: {
        totalRequest, totalBudget, avgBudgetPerPosition,
        openPositions: prosesData.length,
        closedPositions: closedData.length,
        canceledPositions: batalData.length,
        fillRate
      },
      process: {
        avgTTF, avgTTH, slaRate, acceptanceRate, costPerHire,
        inProcess: prosesData.length, channels
      },
      postHiring: {
        totalJoined: joinedData.length, probationRate, probationPassed,
        retentionRate, turnoverRate, turnoverCount,
        avgSatisfaction, activeEmployees
      }
    };
  };

  // ============================================================================
  // EXPORT REPORT
  // ============================================================================
  
  const exportReport = () => {
    if (!analytics || !rawData) return;
    
    const wb = XLSX.utils.book_new();
    
    const report = [
      ['RECRUITMENT ANALYTICS REPORT'],
      ['Generated:', new Date().toLocaleString('id-ID')],
      [''],
      ['OVERVIEW'],
      ['Total Request', analytics.overview.totalRequest],
      ['Total Joined', analytics.overview.totalJoined],
      ['Fill Rate', analytics.overview.fillRate + '%'],
      [''],
      ['PLANNING PHASE'],
      ['Total Budget', formatRupiah(analytics.planning.totalBudget)],
      ['Avg Budget/Position', formatRupiah(analytics.planning.avgBudgetPerPosition)],
      [''],
      ['PROCESS PHASE'],
      ['Avg TTF', analytics.process.avgTTF + ' hari'],
      ['Avg TTH', analytics.process.avgTTH + ' hari'],
      ['SLA Rate', analytics.process.slaRate + '%'],
      ['Cost per Hire', formatRupiah(analytics.process.costPerHire)],
      [''],
      ['POST-HIRING PHASE'],
      ['Probation Pass', analytics.postHiring.probationRate + '%'],
      ['Retention', analytics.postHiring.retentionRate + '%'],
      ['User Satisfaction', analytics.postHiring.avgSatisfaction + '/5.0']
    ];
    
    const ws1 = XLSX.utils.aoa_to_sheet(report);
    ws1['!cols'] = [{ wch: 30 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
    
    const ws2 = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Raw Data');
    
    XLSX.writeFile(wb, `Recruitment_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ============================================================================
  // CHART RENDERING
  // ============================================================================
  
  useEffect(() => {
    if (view !== 'dashboard' || !analytics) return;

    Object.values(chartRefs.current).forEach(c => c?.destroy());

    setTimeout(() => {
      if (activePhase === 'overview') {
        const canvas = document.getElementById('funnelChart');
        if (canvas) {
          chartRefs.current.funnel = new Chart(canvas, {
            type: 'bar',
            data: {
              labels: ['Request', 'Closed', 'Joined', 'Active'],
              datasets: [{
                label: 'Count',
                data: [analytics.overview.totalRequest, analytics.planning.closedPositions, analytics.overview.totalJoined, analytics.postHiring.activeEmployees],
                backgroundColor: ['#3b82f6', '#6366f1', '#8b5cf6', '#10b981']
              }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: true }
          });
        }
      }

      if (activePhase === 'planning') {
        const canvas = document.getElementById('statusChart');
        if (canvas) {
          chartRefs.current.status = new Chart(canvas, {
            type: 'doughnut',
            data: {
              labels: ['Open', 'Closed', 'Canceled'],
              datasets: [{
                data: [analytics.planning.openPositions, analytics.planning.closedPositions, analytics.planning.canceledPositions],
                backgroundColor: ['#f59e0b', '#10b981', '#ef4444']
              }]
            },
            options: { responsive: true, maintainAspectRatio: true }
          });
        }
      }

      if (activePhase === 'process') {
        const canvas1 = document.getElementById('timeChart');
        if (canvas1) {
          chartRefs.current.time = new Chart(canvas1, {
            type: 'bar',
            data: {
              labels: ['TTF Actual', 'TTF Target', 'TTH Actual', 'TTH Target'],
              datasets: [{
                label: 'Days',
                data: [parseFloat(analytics.process.avgTTF), 30, parseFloat(analytics.process.avgTTH), 25],
                backgroundColor: ['#3b82f6', '#10b981', '#6366f1', '#10b981']
              }]
            },
            options: { responsive: true, maintainAspectRatio: true }
          });
        }

        const canvas2 = document.getElementById('channelChart');
        if (canvas2 && analytics.process.channels) {
          chartRefs.current.channel = new Chart(canvas2, {
            type: 'pie',
            data: {
              labels: Object.keys(analytics.process.channels),
              datasets: [{
                data: Object.values(analytics.process.channels),
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
              }]
            },
            options: { responsive: true, maintainAspectRatio: true }
          });
        }
      }

      if (activePhase === 'posthiring') {
        const canvas = document.getElementById('qualityChart');
        if (canvas) {
          chartRefs.current.quality = new Chart(canvas, {
            type: 'bar',
            data: {
              labels: ['Probation Pass', 'Retention', 'Satisfaction'],
              datasets: [{
                label: '%',
                data: [parseFloat(analytics.postHiring.probationRate), parseFloat(analytics.postHiring.retentionRate), (parseFloat(analytics.postHiring.avgSatisfaction) / 5 * 100).toFixed(1)],
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
    }, 100);

    return () => {
      Object.values(chartRefs.current).forEach(c => c?.destroy());
    };
  }, [view, activePhase, analytics]);

  // ============================================================================
  // RENDER: UPLOAD PAGE
  // ============================================================================
  
  if (view === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <button onClick={onBack} className="fixed top-6 left-6 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md transition font-medium">
          ← Kembali
        </button>
        
        <div className="max-w-4xl w-full">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-12 border border-white/20">
            
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-5xl">📊</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                Recruitment Analytics
              </h1>
              <p className="text-lg text-gray-600 font-medium">3-Phase Lifecycle Analysis Dashboard</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Planning</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">Process</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Post-Hiring</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-10 border-2 border-dashed border-blue-300 mb-8">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-blue-600 font-semibold text-lg">Processing analytics...</p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4">📁</div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Upload Data Rekrutmen</h3>
                    <p className="text-gray-600">Import Excel file untuk analisa komprehensif</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <label className="cursor-pointer">
                      <input type="file" onChange={handleFileUpload} accept=".xlsx,.xls" className="hidden" />
                      <div className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg transition">
                        📂 Pilih File Excel
                      </div>
                    </label>
                    
                    <span className="text-gray-400 font-medium self-center">atau</span>
                    
                    <button onClick={downloadTemplate} className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg transition">
                      📥 Download Template
                    </button>
                  </div>

                  <div className="mt-8 p-5 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
                    <p className="font-semibold text-amber-900 mb-2">💡 Template Include Panduan Lengkap!</p>
                    <p className="text-sm text-amber-800">
                      File berisi <strong>MASTER_DATA</strong> (contoh) + <strong>PANDUAN</strong> (formula & interpretasi)
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-white rounded-xl border-2 border-blue-100 hover:border-blue-300 transition">
                <div className="text-3xl mb-3">📋</div>
                <h4 className="font-bold text-gray-800 mb-1">Planning</h4>
                <p className="text-sm text-gray-600">MPP & Budget</p>
              </div>
              
              <div className="p-5 bg-white rounded-xl border-2 border-indigo-100 hover:border-indigo-300 transition">
                <div className="text-3xl mb-3">🔄</div>
                <h4 className="font-bold text-gray-800 mb-1">Process</h4>
                <p className="text-sm text-gray-600">TTF, TTH, Cost</p>
              </div>
              
              <div className="p-5 bg-white rounded-xl border-2 border-purple-100 hover:border-purple-300 transition">
                <div className="text-3xl mb-3">✅</div>
                <h4 className="font-bold text-gray-800 mb-1">Post-Hiring</h4>
                <p className="text-sm text-gray-600">Quality & Retention</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: DASHBOARD (Simplified for space)
  // See previous version for complete dashboard implementation
  // ============================================================================
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Recruitment Analytics</h1>
              <p className="text-blue-100 text-sm">3-Phase Lifecycle Analysis</p>
            </div>
            <div className="flex gap-3">
              <button onClick={downloadTemplate} className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold text-sm transition">
                📥 Template
              </button>
              <button onClick={exportReport} className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold text-sm transition">
                📊 Export
              </button>
              <button onClick={() => setView('upload')} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition">
                🚪 Keluar
              </button>
            </div>
          </div>

          <div className="flex gap-2 bg-white/10 backdrop-blur-sm p-1.5 rounded-xl">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'planning', label: '📋 Planning' },
              { id: 'process', label: '🔄 Process' },
              { id: 'posthiring', label: '✅ Post-Hiring' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setActivePhase(p.id)}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold text-sm transition ${
                  activePhase === p.id ? 'bg-white text-blue-600 shadow-lg' : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Content based on activePhase - implement KPI cards and charts here */}
        <p className="text-gray-500">Dashboard content for {activePhase} phase</p>
      </div>
    </div>
  );
};

export default RecruitmentAnalytics;