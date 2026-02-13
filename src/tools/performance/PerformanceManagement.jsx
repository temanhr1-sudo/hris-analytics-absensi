import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';

/**
 * ============================================================================
 * PERFORMANCE MANAGEMENT SYSTEM v4.2 (With Tenure Feature)
 * ============================================================================
 * Updates:
 * - Added 'Masa Kerja' Column
 * - Added 'Masa Kerja' Filter (New Hire, Mid, Senior)
 * - Updated Template with Tenure column
 */

const PerformanceManagement = ({ onBack }) => {
  
  // STATE
  const [view, setView] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [activeMenu, setActiveMenu] = useState('overview');
  const [selectedBox, setSelectedBox] = useState(null);
  
  // FILTER STATE
  const [tableFilter, setTableFilter] = useState({
    search: '',
    category: 'All',
    tenure: 'All' // New Filter
  });
  
  const chartRefs = useRef({});

  // ============================================================================
  // 1. CONFIGURATION
  // ============================================================================

  const SANCTION_PENALTY = {
    'none': 0, 'teguran lisan': 2, 'teguran tertulis': 5,
    'sp 1': 10, 'sp 2': 15, 'sp 3': 25
  };

  const NINE_BOX_GRID = {
    'high-high':   { id:'high-high', label: '1. STAR TALENT', bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800', icon: '👑', action: 'Promosi / Key Project', strategy: 'Pertahankan sekuat tenaga. Berikan tantangan strategis & kompensasi kompetitif.' },
    'medium-high': { id:'medium-high', label: '2. FUTURE LEADER', bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800', icon: '⭐', action: 'Mentoring', strategy: 'Siapkan untuk posisi leadership masa depan. Berikan mentor dari Senior Manager.' },
    'low-high':    { id:'low-high', label: '4. ROUGH DIAMOND', bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800', icon: '💎', action: 'Coaching Execution', strategy: 'Potensi besar tapi hasil kurang. Fokuskan pada eksekusi dan pencapaian target.' },
    
    'high-medium': { id:'high-medium', label: '3. HIGH PERFORMER', bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-800', icon: '🚀', action: 'Maintain', strategy: 'Mesin uang perusahaan. Jaga motivasi mereka agar hasil tetap tinggi.' },
    'medium-medium':{ id:'medium-medium', label: '5. CORE EMPLOYEE', bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800', icon: '⚓', action: 'Develop', strategy: 'Tulang punggung operasional. Berikan pelatihan rutin untuk upgrade skill.' },
    'low-medium':  { id:'low-medium', label: '7. INCONSISTENT', bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-800', icon: '❓', action: 'Monitor', strategy: 'Hasil kerja naik turun. Cari tahu masalahnya (skill vs will).' },
    
    'high-low':    { id:'high-low', label: '6. SPECIALIST', bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-800', icon: '🔧', action: 'Keep Technical', strategy: 'Sangat jago teknis tapi softskill kurang. Jangan jadikan leader, biarkan jadi spesialis.' },
    'medium-low':  { id:'medium-low', label: '8. RISK', bg: 'bg-gray-200', border: 'border-gray-500', text: 'text-gray-800', icon: '⚠️', action: 'Formal Warning', strategy: 'Hampir gagal. Berikan target jangka pendek (PIP). Jika gagal, proses keluar.' },
    'low-low':     { id:'low-low', label: '9. DEADWOOD', bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800', icon: '💀', action: 'Exit / PHK', strategy: 'Beban perusahaan. Siapkan dokumen pendukung untuk proses terminasi/PHK.' }
  };

  // ============================================================================
  // 2. LOGIC ENGINE
  // ============================================================================

  const findValue = (row, keyPart) => {
    const key = Object.keys(row).find(k => k.toLowerCase().includes(keyPart.toLowerCase()));
    return key ? row[key] : null;
  };

  const processPerformance = (data) => {
    let stats = { total: 0, avgScore: 0, sanctionCount: 0, bellCurve: { 4:0, 3:0, 2:0, 1:0 } };
    const grid = {};
    Object.keys(NINE_BOX_GRID).forEach(k => grid[k] = []);

    const processed = data.map(emp => {
      const rawName = findValue(emp, 'nama');
      const rawPosisi = findValue(emp, 'posisi') || '-';
      const rawDept = findValue(emp, 'departemen') || '-';
      const kpi = parseFloat(findValue(emp, 'kpi')) || 0;
      const comp = parseFloat(findValue(emp, 'kompetensi')) || 0;
      const tenure = parseFloat(findValue(emp, 'masa') || findValue(emp, 'tenure')) || 0; // New: Tenure
      const rawSanction = findValue(emp, 'sanksi') || 'None';

      const sanctionKey = String(rawSanction).toLowerCase().trim();
      const penalty = SANCTION_PENALTY[sanctionKey] || 0;
      
      const baseScore = ((kpi + comp) / 8) * 100;
      const finalScore = Math.max(0, baseScore - penalty);

      const getLevel = (val) => val > 3.2 ? 'high' : val > 2.5 ? 'medium' : 'low';
      let gridKey = `${getLevel(kpi)}-${getLevel(comp)}`;
      
      if (!NINE_BOX_GRID[gridKey]) gridKey = 'medium-medium';

      const boxConfig = NINE_BOX_GRID[gridKey];

      const roundedScore = Math.min(Math.max(Math.round((finalScore / 100) * 4), 1), 4);
      stats.bellCurve[roundedScore] = (stats.bellCurve[roundedScore] || 0) + 1;

      stats.total++;
      stats.avgScore += finalScore;
      if (penalty > 0) stats.sanctionCount++;

      const processedEmp = {
        Nama: rawName || 'No Name',
        Posisi: rawPosisi,
        Departemen: rawDept,
        kpi,
        comp,
        tenure, // Store tenure
        sanction: rawSanction,
        penalty,
        finalScore: finalScore.toFixed(1),
        gridKey,
        boxConfig
      };

      grid[gridKey].push(processedEmp);
      return processedEmp;
    });

    stats.avgScore = stats.total > 0 ? (stats.avgScore / stats.total).toFixed(1) : 0;

    return { stats, grid, details: processed, initialBox: 'high-high' };
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) throw new Error("File Excel kosong!");

        const result = processPerformance(data);
        setPerformanceData(result);
        setSelectedBox(result.initialBox);
        setView('dashboard');
      } catch (err) {
        alert("Gagal memproses file: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    // Added "Masa Kerja (Thn)" to headers
    const headers = [['Nama', 'Posisi', 'Departemen', 'Masa Kerja (Thn)', 'Nilai KPI (1-4)', 'Nilai Kompetensi (1-4)', 'Sanksi']];
    const data = [
        ['Budi Santoso', 'Sales Manager', 'Sales', 5, 3.8, 3.5, 'None'],
        ['Siti Aminah', 'Staff Finance', 'Finance', 1, 2.0, 2.5, 'SP 1'],
        ['Joko Anwar', 'IT Support', 'IT', 3, 4.0, 2.0, 'None']
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    XLSX.utils.book_append_sheet(wb, ws, "Data_Performance");
    XLSX.writeFile(wb, "Template_Performance_Strategic.xlsx");
  };

  // FILTER LOGIC UPDATED
  const getFilteredData = () => {
    if (!performanceData) return [];
    return performanceData.details.filter(item => {
        const matchesSearch = item.Nama.toLowerCase().includes(tableFilter.search.toLowerCase());
        const matchesCategory = tableFilter.category === 'All' || item.boxConfig.label === tableFilter.category;
        
        // Tenure Logic
        let matchesTenure = true;
        if (tableFilter.tenure === '< 1 Thn') matchesTenure = item.tenure < 1;
        if (tableFilter.tenure === '1 - 3 Thn') matchesTenure = item.tenure >= 1 && item.tenure <= 3;
        if (tableFilter.tenure === '> 3 Thn') matchesTenure = item.tenure > 3;

        return matchesSearch && matchesCategory && matchesTenure;
    });
  };

  // ============================================================================
  // CHART RENDERING
  // ============================================================================

  useEffect(() => {
    if (view !== 'dashboard' || !performanceData || activeMenu !== 'overview') return;
    Object.values(chartRefs.current).forEach(c => c?.destroy());

    const ctx = document.getElementById('bellChart');
    if (ctx) {
        const d = performanceData.stats.bellCurve;
        chartRefs.current.bell = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Kurang (1)', 'Cukup (2)', 'Baik (3)', 'Sangat Baik (4)'],
                datasets: [{
                    label: 'Jumlah Karyawan',
                    data: [d[1], d[2], d[3], d[4]],
                    backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
                    borderRadius: 6,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { borderDash: [2, 2] } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
    return () => Object.values(chartRefs.current).forEach(c => c?.destroy());
  }, [view, activeMenu, performanceData]);

  // ============================================================================
  // VIEW: UPLOAD
  // ============================================================================

  if (view === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6 font-sans animate-fade-in">
        <button onClick={onBack} className="fixed top-6 left-6 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition z-50">← Kembali</button>
        
        <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-blue-100">
            <div className="w-full md:w-5/12 p-10 flex flex-col justify-center items-center text-center bg-blue-50/50 border-r border-blue-100">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 text-5xl shadow-md">🎯</div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Performance 4.2</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">Strategic Talent Mapping<br/>& Sanksi Tracker</p>
                <div className="w-full space-y-3">
                    <label className="cursor-pointer block w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg transition transform hover:-translate-y-1 group">
                        <span className="group-hover:scale-105 inline-block transition">📂 Upload Excel Data</span>
                        <input type="file" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
                    </label>
                    <button onClick={downloadTemplate} className="block w-full bg-white border-2 border-blue-100 hover:border-blue-300 text-blue-600 py-3 rounded-xl font-bold transition">📥 Download Template</button>
                </div>
                {loading && <p className="mt-4 text-blue-600 font-bold animate-pulse">Sedang Menganalisa Data...</p>}
            </div>
            <div className="w-full md:w-7/12 p-10 bg-white flex flex-col justify-center">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">📖 Panduan Penggunaan</h3>
                <div className="space-y-6">
                    <div className="flex gap-4"><div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex-shrink-0 flex items-center justify-center font-bold text-lg">1</div><div><h4 className="font-bold text-slate-700">Skala 1-4 & Masa Kerja</h4><p className="text-sm text-slate-500 mt-1">Isi <strong>KPI (1-4)</strong>, <strong>Kompetensi (1-4)</strong>, dan <strong>Masa Kerja (Tahun)</strong> di Excel.</p></div></div>
                    <div className="flex gap-4"><div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex-shrink-0 flex items-center justify-center font-bold text-lg">2</div><div><h4 className="font-bold text-slate-700">Sanksi (Opsional)</h4><p className="text-sm text-slate-500 mt-1">Tulis: <em>"SP 1", "SP 2",</em> atau <em>"SP 3"</em>. Otomatis mengurangi skor akhir.</p></div></div>
                    <div className="flex gap-4"><div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex-shrink-0 flex items-center justify-center font-bold text-lg">3</div><div><h4 className="font-bold text-slate-700">Analisa Strategis</h4><p className="text-sm text-slate-500 mt-1">Dapatkan Peta 9-Box, Bell Curve, dan Filter berdasarkan Masa Kerja.</p></div></div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW: DASHBOARD
  // ============================================================================

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col animate-fade-in">
        {/* Navbar */}
        <div className="bg-white border-b sticky top-0 z-30 px-8 py-4 flex justify-between items-center shadow-sm">
            <div>
                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Performance Dashboard</h1>
                <p className="text-xs text-slate-400 font-medium">Strategic Review • {performanceData.stats.total} Karyawan</p>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
                {['overview', 'matrix', 'table'].map(m => (
                    <button key={m} onClick={() => setActiveMenu(m)}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition uppercase ${activeMenu === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            <button onClick={() => setView('upload')} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition">Exit</button>
        </div>

        <div className="p-8 max-w-7xl mx-auto w-full flex-1">
            
            {/* --- 1. OVERVIEW MENU --- */}
            {activeMenu === 'overview' && (
                <div className="space-y-8 animate-fade-in">
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-Rata Skor</p>
                            <div className="flex items-end gap-2 mt-2">
                                <span className="text-4xl font-extrabold text-slate-800">{performanceData.stats.avgScore}</span>
                                <span className="text-sm text-slate-400 mb-1">/ 100</span>
                            </div>
                        </div>
                        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 hover:shadow-md transition">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Star Talent</p>
                            <div className="mt-2 text-3xl font-extrabold text-emerald-800">
                                {performanceData.grid['high-high'].length} <span className="text-lg font-medium opacity-60">Org</span>
                            </div>
                            <p className="text-xs text-emerald-600 mt-1">Siap Promosi</p>
                        </div>
                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 hover:shadow-md transition">
                            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Zona Bahaya</p>
                            <div className="mt-2 text-3xl font-extrabold text-red-800">
                                {performanceData.grid['low-low'].length + performanceData.grid['medium-low'].length} <span className="text-lg font-medium opacity-60">Org</span>
                            </div>
                            <p className="text-xs text-red-600 mt-1">Deadwood / Risk</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kasus Sanksi</p>
                            <div className="mt-2 text-3xl font-extrabold text-slate-800">
                                {performanceData.stats.sanctionCount}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Karyawan Bermasalah</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800">📈 Distribusi Performa (Bell Curve)</h3>
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">Skala 1-4</span>
                            </div>
                            <div className="h-64 relative w-full"><canvas id="bellChart"></canvas></div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-6 text-lg">🏥 Kesehatan Talenta</h3>
                            <div className="space-y-8">
                                <div>
                                    <div className="flex justify-between text-sm mb-2"><span className="text-emerald-700 font-bold">High Potential</span><span className="text-emerald-700 font-bold">{Math.round(((performanceData.grid['high-high'].length + performanceData.grid['medium-high'].length + performanceData.grid['low-high'].length)/performanceData.stats.total)*100) || 0}%</span></div>
                                    <div className="w-full bg-emerald-100 rounded-full h-3"><div className="bg-emerald-500 h-3 rounded-full" style={{width: `${((performanceData.grid['high-high'].length + performanceData.grid['medium-high'].length + performanceData.grid['low-high'].length)/performanceData.stats.total)*100}%`}}></div></div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-2"><span className="text-blue-700 font-bold">Core Contributor</span><span className="text-blue-700 font-bold">{Math.round(((performanceData.grid['high-medium'].length + performanceData.grid['medium-medium'].length + performanceData.grid['low-medium'].length)/performanceData.stats.total)*100) || 0}%</span></div>
                                    <div className="w-full bg-blue-100 rounded-full h-3"><div className="bg-blue-500 h-3 rounded-full" style={{width: `${((performanceData.grid['high-medium'].length + performanceData.grid['medium-medium'].length + performanceData.grid['low-medium'].length)/performanceData.stats.total)*100}%`}}></div></div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-2"><span className="text-red-700 font-bold">Underperformer</span><span className="text-red-700 font-bold">{Math.round(((performanceData.grid['high-low'].length + performanceData.grid['medium-low'].length + performanceData.grid['low-low'].length)/performanceData.stats.total)*100) || 0}%</span></div>
                                    <div className="w-full bg-red-100 rounded-full h-3"><div className="bg-red-500 h-3 rounded-full" style={{width: `${((performanceData.grid['high-low'].length + performanceData.grid['medium-low'].length + performanceData.grid['low-low'].length)/performanceData.stats.total)*100}%`}}></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 2. MATRIX MENU (9-BOX) --- */}
            {activeMenu === 'matrix' && (
                <div className="flex flex-col lg:flex-row gap-6 animate-fade-in h-auto lg:h-[calc(100vh-180px)]">
                    
                    <div className="w-full lg:w-7/12 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 text-lg">9-Box Talent Grid</h3>
                            <div className="text-xs font-mono text-slate-500 bg-white px-3 py-1 rounded border border-slate-200">X: KPI (Hasil) | Y: KOMPETENSI (Perilaku)</div>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-3 gap-3">
                            {['low-high', 'medium-high', 'high-high', 'low-medium', 'medium-medium', 'high-medium', 'low-low', 'medium-low', 'high-low'].map(k => {
                                const box = NINE_BOX_GRID[k];
                                const count = performanceData.grid[k].length;
                                const isSelected = selectedBox === k;

                                return (
                                    <div 
                                        key={k} 
                                        onClick={() => setSelectedBox(k)}
                                        className={`rounded-xl border-2 p-3 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 
                                            ${isSelected ? 'ring-4 ring-blue-200 scale-105 z-10 shadow-xl' : 'hover:shadow-md opacity-95 hover:opacity-100'} 
                                            ${box.bg} ${box.border}`}
                                    >
                                        <div className="text-3xl mb-1">{box.icon}</div>
                                        <div className={`text-3xl font-extrabold ${box.text}`}>{count}</div>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${box.text} text-center leading-tight`}>{box.label.split('. ')[1]}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="w-full lg:w-5/12 bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col overflow-hidden">
                        {selectedBox ? (
                            <>
                                <div className={`p-6 border-b ${NINE_BOX_GRID[selectedBox].bg} ${NINE_BOX_GRID[selectedBox].text}`}>
                                    <div className="flex items-center gap-4">
                                        <span className="text-5xl">{NINE_BOX_GRID[selectedBox].icon}</span>
                                        <div>
                                            <h2 className="text-xl font-bold">{NINE_BOX_GRID[selectedBox].label}</h2>
                                            <div className="flex gap-2 mt-2">
                                                <span className="bg-white/50 px-2 py-1 rounded text-xs font-bold border border-white/20">
                                                    Action: {NINE_BOX_GRID[selectedBox].action}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-b border-slate-100 bg-slate-50">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Strategi HR</h4>
                                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                                        {NINE_BOX_GRID[selectedBox].strategy}
                                    </p>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 bg-white">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
                                        Daftar Karyawan ({performanceData.grid[selectedBox].length})
                                    </h4>
                                    {performanceData.grid[selectedBox].length > 0 ? (
                                        <div className="space-y-2">
                                            {performanceData.grid[selectedBox].map((emp, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition group">
                                                    <div>
                                                        <p className="font-bold text-slate-700 text-sm group-hover:text-blue-600 transition">{emp.Nama}</p>
                                                        <p className="text-xs text-slate-400">{emp.Posisi} • {emp.tenure} Thn</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-sm font-bold text-blue-600">{emp.finalScore}</span>
                                                        <span className="text-[10px] text-slate-400">Score</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                                            <span className="text-4xl mb-2">∅</span>
                                            <p className="text-sm">Tidak ada karyawan di kategori ini.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                                <span className="text-6xl mb-4 opacity-50">👆</span>
                                <p className="font-medium">Klik salah satu kotak di 9-Box Grid<br/>untuk melihat detail strategi & karyawan.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- 3. TABLE DETAIL WITH FILTERS --- */}
            {activeMenu === 'table' && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200 animate-fade-in">
                    
                    {/* Filter Controls */}
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50">
                        <input 
                            type="text" 
                            placeholder="🔍 Cari Nama Karyawan..." 
                            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                            value={tableFilter.search}
                            onChange={(e) => setTableFilter({...tableFilter, search: e.target.value})}
                        />
                        <select 
                            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={tableFilter.category}
                            onChange={(e) => setTableFilter({...tableFilter, category: e.target.value})}
                        >
                            <option value="All">Semua Kategori 9-Box</option>
                            {Object.values(NINE_BOX_GRID).map(box => (
                                <option key={box.id} value={box.label}>{box.label}</option>
                            ))}
                        </select>
                        
                        {/* TENURE FILTER */}
                        <select 
                            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={tableFilter.tenure}
                            onChange={(e) => setTableFilter({...tableFilter, tenure: e.target.value})}
                        >
                            <option value="All">Semua Masa Kerja</option>
                            <option value="< 1 Thn">New Hire (&lt; 1 Tahun)</option>
                            <option value="1 - 3 Thn">Mid-Level (1 - 3 Tahun)</option>
                            <option value="> 3 Thn">Senior (&gt; 3 Tahun)</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-700 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Nama Karyawan</th>
                                    <th className="px-6 py-4 text-center">Masa Kerja</th>
                                    <th className="px-6 py-4 text-center">KPI (1-4)</th>
                                    <th className="px-6 py-4 text-center">Kompetensi</th>
                                    <th className="px-6 py-4">Sanksi</th>
                                    <th className="px-6 py-4 text-center bg-blue-50 text-blue-800 border-x border-blue-100">Final Score</th>
                                    <th className="px-6 py-4 text-center">Status 9-Box</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {getFilteredData().length > 0 ? getFilteredData().map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{row.Nama}</div>
                                            <div className="text-xs text-slate-400">{row.Posisi}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-slate-500">
                                            {row.tenure} Thn
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium">{row.kpi}</td>
                                        <td className="px-6 py-4 text-center font-medium">{row.comp}</td>
                                        <td className="px-6 py-4">
                                            {row.penalty > 0 ? (
                                                <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded font-bold border border-red-200 inline-block">
                                                    {row.sanction} (-{row.penalty})
                                                </span>
                                            ) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-lg bg-blue-50/30 text-blue-700 border-x border-blue-50">{row.finalScore}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${row.boxConfig.bg} ${row.boxConfig.text} ${row.boxConfig.border} bg-opacity-50`}>
                                                {row.boxConfig.icon} {row.boxConfig.label.split('. ')[1]}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-slate-400 italic">
                                            Tidak ada data yang cocok dengan filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};

export default PerformanceManagement;