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

  // --- LOGIC 1: PROSES DATA EXCEL ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (jsonData.length === 0) {
          alert('File kosong!');
          return;
        }

        // Hitung KPI
        const calculated = calculateAllKPI(jsonData);
        setRawData(jsonData);
        setKpi(calculated);
        setView('dashboard'); // Pindah ke dashboard
      } catch (error) {
        alert('Error: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- LOGIC 2: RUMUS PERHITUNGAN (Sama persis dengan kode Mas Ari) ---
  const calculateAllKPI = (data) => {
    const joinedData = data.filter(r => r.Status === 'Join');
    const closedData = data.filter(r => r['Tanggal Closed']);
    
    // Helper hitung hari
    const calcDays = (start, end) => {
        const s = new Date(start); const e = new Date(end);
        return Math.floor((e - s) / (86400000));
    };

    // 1. TTF
    let totalTTF = 0, countTTF = 0;
    closedData.forEach(r => {
        if(r['Tanggal Request'] && r['Tanggal Closed']) {
            const d = calcDays(r['Tanggal Request'], r['Tanggal Closed']);
            if(d > 0) { totalTTF += d; countTTF++; }
        }
    });
    const avgTTF = countTTF > 0 ? (totalTTF / countTTF).toFixed(1) : 0;

    // 2. TTH
    let totalTTH = 0, countTTH = 0;
    joinedData.forEach(r => {
        if(r['Tanggal Apply'] && r['Tanggal Join']) {
            const d = calcDays(r['Tanggal Apply'], r['Tanggal Join']);
            if(d > 0) { totalTTH += d; countTTH++; }
        }
    });
    const avgTTH = countTTH > 0 ? (totalTTH / countTTH).toFixed(1) : 0;

    // KPI Lainnya
    const slaRate = ((data.filter(r => r['SLA Terpenuhi'] === 'Y').length / data.length) * 100).toFixed(1);
    
    const totalOffer = data.reduce((s, r) => s + (parseFloat(r['Total Offer'])||0), 0);
    const offerAcc = data.reduce((s, r) => s + (parseFloat(r['Offer Diterima'])||0), 0);
    const accRate = totalOffer > 0 ? ((offerAcc/totalOffer)*100).toFixed(1) : 0;

    const probationRate = joinedData.length > 0 ? ((joinedData.filter(r => r['Lulus Probation'] === 'Y').length / joinedData.length)*100).toFixed(1) : 0;
    
    const turnoverRate = joinedData.length > 0 ? ((joinedData.filter(r => r['Tanggal Resign']).length / joinedData.length)*100).toFixed(1) : 0;

    const totalBiaya = data.reduce((s, r) => s + (parseFloat(r['Biaya Rekrutmen'])||0), 0);
    const costPerHire = joinedData.length > 0 ? Math.round(totalBiaya / joinedData.length) : 0;

    const totalKepuasan = data.reduce((s, r) => s + (parseFloat(r['Kepuasan User'])||0), 0);
    const countKepuasan = data.filter(r => parseFloat(r['Kepuasan User']) > 0).length;
    const avgKepuasan = countKepuasan > 0 ? (totalKepuasan/countKepuasan).toFixed(1) : 0;

    // Kalkulasi Skor (Simplified)
    let score = 0;
    if(avgTTF <= 30) score += 15;
    if(avgTTH <= 25) score += 10;
    if(slaRate >= 90) score += 15;
    if(accRate >= 80) score += 10;
    if(probationRate >= 85) score += 15;
    if(turnoverRate <= 10) score += 10;
    if(costPerHire <= 2000000) score += 10;
    if(avgKepuasan >= 4.5) score += 10;
    
    // Pastikan return semua variable yang dipakai di UI
    return { avgTTF, avgTTH, slaRate, accRate, probationRate, turnoverRate, costPerHire, avgKepuasan, score, totalRequest: data.length, posisiTerisi: joinedData.length };
  };

  // --- LOGIC 3: RENDER CHART (Effect) ---
  useEffect(() => {
    if (view === 'dashboard' && activeTab === 'charts' && kpi) {
        // Hancurkan chart lama jika ada
        Object.values(chartRefs.current).forEach(c => c?.destroy());

        // Contoh 1 Chart Saja (Sisanya sama polanya)
        const ctxQuality = document.getElementById('qualityChart');
        if(ctxQuality) {
            chartRefs.current.quality = new Chart(ctxQuality, {
                type: 'bar',
                data: {
                    labels: ['Probation', 'Turnover', 'Acceptance'],
                    datasets: [{
                        label: '%',
                        data: [kpi.probationRate, kpi.turnoverRate, kpi.accRate],
                        backgroundColor: ['#10b981', '#ef4444', '#3b82f6']
                    }]
                }
            });
        }
    }
  }, [view, activeTab, kpi]);


  // --- TAMPILAN (JSX) ---
  if (view === 'upload') {
    return (
      <div className="upload-container">
        <button onClick={onBack} className="fixed top-4 left-4 bg-gray-500 text-white px-4 py-2 rounded">← Kembali</button>
        <div className="upload-card">
            <div className="upload-icon">🎯</div>
            <h1 className="upload-title">Recruitment Analytics</h1>
            <p className="upload-subtitle">Upload data Excel rekrutmen Anda</p>

            <div className="upload-area mt-8">
                {loading ? (
                    <div className="spinner"></div> 
                ) : (
                    <label className="cursor-pointer">
                        <input type="file" onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                        <div className="btn btn-primary">📂 Pilih File Excel</div>
                    </label>
                )}
            </div>
            
            <div className="features-grid">
                <div className="feature-card"><p className="feature-title">Auto KPI</p><p className="feature-desc">TTF, TTH, Cost</p></div>
                <div className="feature-card"><p className="feature-title">Smart Charts</p><p className="feature-desc">Visualisasi Data</p></div>
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
                    <h1 className="text-2xl font-bold">📊 Dashboard Rekrutmen</h1>
                    <button onClick={() => setView('upload')} className="btn-header btn-exit">Keluar</button>
                </div>
                {/* NAV TABS */}
                <div className="nav-tabs flex gap-4 mt-4">
                    <button className={`nav-tab ${activeTab==='summary'?'active':''}`} onClick={()=>setActiveTab('summary')}>Ringkasan</button>
                    <button className={`nav-tab ${activeTab==='charts'?'active':''}`} onClick={()=>setActiveTab('charts')}>Grafik</button>
                </div>
            </div>
        </div>

        {/* CONTENT */}
        <div className="content">
            
            {/* TAB SUMMARY */}
            {activeTab === 'summary' && (
                <div className="kpi-grid">
                    <div className="kpi-card neutral">
                        <p className="kpi-label">Total Request</p>
                        <p className="kpi-value">{kpi.totalRequest}</p>
                    </div>
                    <div className="kpi-card excellent">
                        <p className="kpi-label">Posisi Terisi</p>
                        <p className="kpi-value">{kpi.posisiTerisi}</p>
                    </div>
                    <div className={`kpi-card ${kpi.avgTTF <= 30 ? 'excellent':'poor'}`}>
                        <p className="kpi-label">Time to Fill</p>
                        <p className="kpi-value">{kpi.avgTTF} <span className="text-sm">hari</span></p>
                    </div>
                    <div className={`kpi-card ${kpi.costPerHire <= 2000000 ? 'excellent':'poor'}`}>
                        <p className="kpi-label">Cost per Hire</p>
                        <p className="kpi-value">Rp {(kpi.costPerHire/1000).toFixed(0)}k</p>
                    </div>
                </div>
            )}

            {/* TAB CHARTS */}
            {activeTab === 'charts' && (
                <div className="charts-grid">
                    <div className="chart-card">
                        <h3>Kualitas Rekrutmen</h3>
                        <canvas id="qualityChart"></canvas>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};

export default RecruitmentTool;