import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';

// ============================================================================
// KONFIGURASI & KONSTANTA (2026 STANDARDS)
// ============================================================================

const CONFIG = {
  BPJS_KES_CAP: 12000000,    // Batas Upah Kes (Rp 12 Juta)
  BPJS_JP_CAP: 10547400,     // Batas Upah JP (Updated: Rp 10.547.400)
  UMR_DEFAULT: 5067381,      // Contoh UMR
};

// Tabel TER (Tarif Efektif Rata-rata)
const TER_TABLE = {
  'A': [ 
    { min: 0, max: 5400000, rate: 0 },
    { min: 5400001, max: 5650000, rate: 0.0025 },
    { min: 5650001, max: 5950000, rate: 0.005 },
    { min: 5950001, max: 6300000, rate: 0.0075 },
    { min: 6300001, max: 6750000, rate: 0.01 },
    { min: 6750001, max: 7500000, rate: 0.015 },
    { min: 7500001, max: 8550000, rate: 0.02 },
    { min: 8550001, max: 9650000, rate: 0.0225 },
    { min: 9650001, max: Infinity, rate: 0.34 }
  ],
  'B': [ 
    { min: 0, max: 6200000, rate: 0 },
    { min: 6200001, max: 6500000, rate: 0.0025 },
    { min: 6500001, max: Infinity, rate: 0.34 }
  ],
  'C': [ 
    { min: 0, max: 6600000, rate: 0 },
    { min: 6600001, max: Infinity, rate: 0.34 }
  ]
};

const getTerCategory = (status) => {
  const s = status ? status.toUpperCase().replace(/\s/g, '') : 'TK/0';
  if (['TK/0', 'TK/1', 'K/0'].includes(s)) return 'A';
  if (['TK/2', 'TK/3', 'K/1', 'K/2'].includes(s)) return 'B';
  if (['K/3'].includes(s)) return 'C';
  return 'A'; 
};

const PayrollSimulator = ({ onBack }) => {
  
  // STATE MANAGEMENT
  const [view, setView] = useState('upload'); 
  const [loading, setLoading] = useState(false);
  const [payrollData, setPayrollData] = useState(null);
  const [activeMenu, setActiveMenu] = useState('summary'); 
  
  // VARIABLES STATE
  const [simulation, setSimulation] = useState({
    thrMonth: 3,        // Default April (Index 3)
    bonusMonth: 11,     // Default Desember (Index 11)
    overtimeBudget: 0,  
    bonusBudget: 0      
  });

  // FILTERS STATE
  const [ctcFilter, setCtcFilter] = useState({
    dept: 'All',
    search: ''
  });

  const chartRefs = useRef({});

  // ============================================================================
  // LOGIC: CALCULATIONS
  // ============================================================================

  const calculateBPJS = (gajiPokok, tunjanganTetap) => {
    const upahTetap = gajiPokok + tunjanganTetap;
    const basisKes = Math.min(upahTetap, CONFIG.BPJS_KES_CAP);
    const basisJP = Math.min(upahTetap, CONFIG.BPJS_JP_CAP);
    const basisJHT = upahTetap; 

    return {
      comp_Kes: Math.round(basisKes * 0.04),
      comp_JKK: Math.round(basisJHT * 0.0024),
      comp_JKM: Math.round(basisJHT * 0.003),
      comp_JHT: Math.round(basisJHT * 0.037),
      comp_JP: Math.round(basisJP * 0.02),
      emp_Kes: Math.round(basisKes * 0.01),
      emp_JHT: Math.round(basisJHT * 0.02),
      emp_JP: Math.round(basisJP * 0.01),
    };
  };

  const calculatePPh21 = (bruto, status) => {
    const category = getTerCategory(status);
    const table = TER_TABLE[category] || TER_TABLE['A'];
    let rate = 0;
    for (let row of table) {
      if (bruto >= row.min && bruto <= row.max) { rate = row.rate; break; }
      if (row.max === Infinity && bruto >= row.min) { rate = row.rate; }
    }
    return Math.round(bruto * rate);
  };

  const processPayroll = (rawData) => {
    let grandTotal = {
      count: 0,
      ctcMonthly: 0,
      ctcYearly: 0,
      hiddenCost: 0,
      takeHome: 0,
      bpjsComp: 0,
      thrReserve: 0,
      pesangonReserve: 0,
      totalBrutoFixed: 0 
    };

    const departments = new Set();

    const employees = rawData.map(emp => {
      const nama = emp['Nama'] || 'No Name';
      const departemen = emp['Departemen'] || 'Unassigned';
      departments.add(departemen);

      const gapok = parseFloat(emp['Gaji Pokok']) || 0;
      const tunjTetap = parseFloat(emp['Tunjangan Tetap']) || 0;
      const tunjLain = (parseFloat(emp['Tunjangan Makan']) || 0) + (parseFloat(emp['Tunjangan Transport']) || 0);
      const status = emp['Status'] || 'TK/0';
      const isGrossUp = (emp['Metode Pajak'] || '').toLowerCase().includes('gross');

      const bruto = gapok + tunjTetap + tunjLain;
      const bpjs = calculateBPJS(gapok, tunjTetap);
      const totalBPJS_Comp = bpjs.comp_Kes + bpjs.comp_JKK + bpjs.comp_JKM + bpjs.comp_JHT + bpjs.comp_JP;
      const totalBPJS_Emp = bpjs.emp_Kes + bpjs.emp_JHT + bpjs.emp_JP;
      const pph21 = calculatePPh21(bruto, status);
      
      const thr = Math.round(bruto / 12); 
      const pesangon = Math.round(bruto / 12); 
      const ctcMonth = bruto + totalBPJS_Comp + (isGrossUp ? pph21 : 0) + thr + pesangon;
      const thp = bruto - totalBPJS_Emp - (isGrossUp ? 0 : pph21);
      const hidden = ctcMonth - thp;
      const hiddenPct = ((hidden / thp) * 100).toFixed(1);

      grandTotal.count++;
      grandTotal.ctcMonthly += ctcMonth;
      grandTotal.ctcYearly += ctcMonth * 12;
      grandTotal.hiddenCost += hidden;
      grandTotal.takeHome += thp;
      grandTotal.bpjsComp += totalBPJS_Comp;
      grandTotal.thrReserve += thr;
      grandTotal.pesangonReserve += pesangon;
      grandTotal.totalBrutoFixed += bruto;

      return {
        nama, posisi: emp['Posisi'], dept: departemen,
        bruto, thp, ctcMonth, hidden, hiddenPct, pph21,
        bpjsComp: totalBPJS_Comp,
        thr, pesangon, isGrossUp
      };
    });

    return { 
        summary: grandTotal, 
        details: employees,
        departments: Array.from(departments)
    };
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
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        if(data.length > 0) {
            const result = processPayroll(data);
            setPayrollData(result);
            setView('dashboard');
        } else { alert("File kosong!"); }
      } catch (err) { alert("Gagal memproses file."); } 
      finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = [['Nama', 'Posisi', 'Departemen', 'Status', 'Gaji Pokok', 'Tunjangan Tetap', 'Tunjangan Makan', 'Tunjangan Transport', 'Metode Pajak']];
    const example = [['Budi Santoso', 'Staff Admin', 'HR', 'TK/0', 5000000, 500000, 400000, 200000, 'Net']];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...example]);
    XLSX.utils.book_append_sheet(wb, ws, "Template_Payroll");
    XLSX.writeFile(wb, "Template_Payroll_Simulator.xlsx");
  };

  const exportReport = () => {
    if(!payrollData) return;
    const wb = XLSX.utils.book_new();
    const ws1Data = [
        ['METRIC', 'VALUE'],
        ['Total Karyawan', payrollData.summary.count],
        ['Total CTC Fixed (Tahunan)', payrollData.summary.ctcYearly],
        ['Projected Overtime (Tahunan)', simulation.overtimeBudget * 12],
        ['Projected Bonus (Tahunan)', simulation.bonusBudget],
        ['GRAND TOTAL PROJECTED', payrollData.summary.ctcYearly + (simulation.overtimeBudget * 12) + parseFloat(simulation.bonusBudget)]
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");
    
    const ws2 = XLSX.utils.json_to_sheet(payrollData.details);
    XLSX.utils.book_append_sheet(wb, ws2, "Details");
    
    XLSX.writeFile(wb, "Payroll_Report.xlsx");
  };

  // ============================================================================
  // EFFECTS & UTILS
  // ============================================================================

  useEffect(() => {
    if (view !== 'dashboard' || !payrollData) return;
    Object.values(chartRefs.current).forEach(c => c?.destroy());

    setTimeout(() => {
        // --- PROJECTION CHART LOGIC ---
        if (activeMenu === 'projection') {
            const ctx = document.getElementById('projectionChart');
            if (ctx) {
                // Base cost = (CTC bulanan - Cadangan THR) + Overtime
                const baseCostMonthly = (payrollData.summary.ctcMonthly - payrollData.summary.thrReserve) + parseFloat(simulation.overtimeBudget);
                const thrTotal = payrollData.summary.thrReserve * 12;
                const monthlyData = Array(12).fill(baseCostMonthly);
                
                // Add Spikes
                monthlyData[simulation.thrMonth] += thrTotal;
                if (simulation.bonusBudget > 0) monthlyData[simulation.bonusMonth] += parseFloat(simulation.bonusBudget);

                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                
                chartRefs.current.proj = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: months,
                        datasets: [{
                            label: 'Projected Cashflow (IDR)',
                            data: monthlyData,
                            borderColor: '#10b981',
                            backgroundColor: (context) => {
                                const ctx = context.chart.ctx;
                                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                                gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
                                gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                                return gradient;
                            },
                            fill: true,
                            tension: 0.3,
                            pointRadius: 6,
                            pointBackgroundColor: '#fff',
                            pointBorderColor: '#10b981',
                            pointBorderWidth: 2
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => ` Rp ${new Intl.NumberFormat('id-ID').format(ctx.raw)}`
                                }
                            }
                        }
                    }
                });
            }
        }

        // --- CTC DONUT CHART ---
        if (activeMenu === 'ctc' || activeMenu === 'summary') {
            const ctx = document.getElementById('ctcChart');
            if (ctx) {
                chartRefs.current.ctc = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Gaji Bersih (THP)', 'BPJS Kantor', 'Cadangan THR', 'Cadangan Pesangon'],
                        datasets: [{
                            data: [
                                payrollData.summary.takeHome,
                                payrollData.summary.bpjsComp,
                                payrollData.summary.thrReserve,
                                payrollData.summary.pesangonReserve
                            ],
                            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                            borderWidth: 0
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
                });
            }
        }
    }, 100);

    return () => { Object.values(chartRefs.current).forEach(c => c?.destroy()); };

  }, [view, activeMenu, payrollData, simulation]);

  const formatIDR = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  // ============================================================================
  // UPLOAD VIEW
  // ============================================================================

  if (view === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-6 font-sans animate-fade-in">
        <button onClick={onBack} className="fixed top-6 left-6 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition z-50">← Kembali</button>
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-3xl shadow-xl overflow-hidden border border-emerald-100">
            <div className="p-10 flex flex-col justify-center items-center text-center border-r border-gray-100">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-4xl">💰</div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Payroll Simulator</h1>
                <p className="text-gray-500 mb-8">Analisa CTC, PPh 21 TER, dan Hidden Cost.</p>
                <div className="w-full border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-xl p-8 mb-6">
                    {loading ? <div className="text-emerald-600 font-bold animate-pulse">Sedang Menghitung...</div> : (
                        <div className="flex flex-col gap-3 justify-center items-center">
                            <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition transform hover:-translate-y-1 w-full flex justify-center gap-2">
                                <span>📂</span> Upload Excel
                                <input type="file" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
                            </label>
                            <button onClick={downloadTemplate} className="text-sm text-emerald-600 hover:underline font-semibold flex items-center gap-1">📥 Download Template Excel</button>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-10 bg-gray-50 flex flex-col justify-center">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">📖 Panduan Penggunaan</h3>
                <ul className="space-y-4 text-sm text-gray-600">
                    <li className="flex items-start gap-3"><span className="bg-emerald-100 text-emerald-700 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">1</span><span>Download Template.</span></li>
                    <li className="flex items-start gap-3"><span className="bg-emerald-100 text-emerald-700 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">2</span><span>Isi data karyawan (Status TK/0, K/1, dll).</span></li>
                    <li className="flex items-start gap-3"><span className="bg-emerald-100 text-emerald-700 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">3</span><span>Upload file. Sistem menghitung BPJS & Pajak.</span></li>
                </ul>
            </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // DASHBOARD VIEW
  // ============================================================================

  const getFilteredCTCData = () => {
    if (!payrollData) return [];
    return payrollData.details.filter(item => {
        const matchesDept = ctcFilter.dept === 'All' || item.dept === ctcFilter.dept;
        const matchesSearch = item.nama.toLowerCase().includes(ctcFilter.search.toLowerCase());
        return matchesDept && matchesSearch;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col animate-fade-in">
        {/* HEADER */}
        <div className="bg-white border-b sticky top-0 z-30 px-6 py-4 shadow-sm flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold text-gray-800">Payroll Analysis Dashboard</h1>
                <p className="text-xs text-gray-400">Total {payrollData.summary.count} Karyawan</p>
            </div>
            <div className="flex gap-2">
                <button onClick={exportReport} className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-200">Export Report</button>
                <button onClick={() => setView('upload')} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-100">Exit</button>
            </div>
        </div>

        {/* TABS MENU */}
        <div className="bg-white px-6 border-b flex gap-6 overflow-x-auto">
            {['summary', 'ctc', 'projection', 'details'].map(m => (
                <button key={m} onClick={() => setActiveMenu(m)}
                    className={`py-3 text-sm font-bold border-b-2 transition ${activeMenu === m ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    {m.toUpperCase()}
                </button>
            ))}
        </div>

        {/* CONTENT AREA */}
        <div className="p-6 max-w-7xl mx-auto w-full flex-1">
            
            {/* 1. SUMMARY VIEW */}
            {activeMenu === 'summary' && (
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-blue-500">
                            <p className="text-xs text-gray-400 uppercase font-bold">Total CTC (Bulanan)</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{formatIDR(payrollData.summary.ctcMonthly)}</p>
                            <p className="text-xs text-blue-500 mt-1">Total Cost to Company</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-emerald-500">
                            <p className="text-xs text-gray-400 uppercase font-bold">Take Home Pay</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{formatIDR(payrollData.summary.takeHome)}</p>
                            <p className="text-xs text-emerald-500 mt-1">Diterima Karyawan</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-red-500">
                            <p className="text-xs text-gray-400 uppercase font-bold">Hidden Cost</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{formatIDR(payrollData.summary.hiddenCost)}</p>
                            <p className="text-xs text-red-500 mt-1">BPJS + Pajak + Cadangan</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-purple-500">
                            <p className="text-xs text-gray-400 uppercase font-bold">Ratio Beban</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{((payrollData.summary.hiddenCost / payrollData.summary.takeHome) * 100).toFixed(1)}%</p>
                            <p className="text-xs text-purple-500 mt-1">Markup vs Gaji Bersih</p>
                        </div>
                    </div>
                    <div className="col-span-12 md:col-span-8 bg-white p-6 rounded-2xl shadow-sm">
                        <h3 className="font-bold text-gray-700 mb-4">Komposisi Biaya Perusahaan</h3>
                        <div className="h-64 relative"><canvas id="ctcChart"></canvas></div>
                    </div>
                    <div className="col-span-12 md:col-span-4 bg-emerald-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl">💡</div>
                        <h3 className="font-bold text-lg mb-2">Smart Insight</h3>
                        <p className="text-sm opacity-90 leading-relaxed">
                            Beban Hidden Cost Anda adalah <strong>{((payrollData.summary.hiddenCost / payrollData.summary.takeHome) * 100).toFixed(1)}%</strong>.
                            <br/><br/>
                            {((payrollData.summary.hiddenCost / payrollData.summary.takeHome) * 100) > 40 
                                ? "⚠️ Rasio beban di atas 40% mengindikasikan struktur gaji yang berat di tunjangan tetap/pajak." 
                                : "✅ Rasio beban di bawah 40% masih dalam batas wajar industri."}
                        </p>
                    </div>
                </div>
            )}

            {/* 2. CTC BREAKDOWN VIEW (With Filters) */}
            {activeMenu === 'ctc' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-12 md:col-span-8 bg-white p-6 rounded-2xl shadow-sm">
                            <h3 className="font-bold text-gray-700 mb-4">Grafik Detail Hidden Cost</h3>
                             <div className="h-64 relative flex justify-center"><canvas id="ctcChart"></canvas></div>
                        </div>
                        <div className="col-span-12 md:col-span-4 space-y-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border">
                                <p className="text-xs text-gray-500">BPJS Perusahaan (4% Kes + 6.24% TK)</p>
                                <p className="font-bold text-lg">{formatIDR(payrollData.summary.bpjsComp)}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border">
                                <p className="text-xs text-gray-500">Cadangan THR (1 Bulan Gaji)</p>
                                <p className="font-bold text-lg">{formatIDR(payrollData.summary.thrReserve)}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border">
                                <p className="text-xs text-gray-500">Cadangan Pesangon (Estimasi)</p>
                                <p className="font-bold text-lg">{formatIDR(payrollData.summary.pesangonReserve)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                            <h3 className="font-bold text-gray-800 text-lg">📊 Rincian Cost per Karyawan</h3>
                            <div className="flex gap-2 w-full md:w-auto">
                                <select 
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={ctcFilter.dept}
                                    onChange={(e) => setCtcFilter({...ctcFilter, dept: e.target.value})}
                                >
                                    <option value="All">Semua Departemen</option>
                                    {payrollData.departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <input 
                                    type="text" 
                                    placeholder="Cari Nama..." 
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={ctcFilter.search}
                                    onChange={(e) => setCtcFilter({...ctcFilter, search: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-600">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-4">Karyawan</th>
                                        <th className="px-6 py-4 text-right bg-blue-50 text-blue-700">Direct Cost (Bruto)</th>
                                        <th className="px-6 py-4 text-right">BPJS (Kantor)</th>
                                        <th className="px-6 py-4 text-right">Cadangan (THR+Psg)</th>
                                        <th className="px-6 py-4 text-right bg-emerald-50 text-emerald-700 font-bold">Total CTC</th>
                                        <th className="px-6 py-4 text-right text-xs">Hidden Cost %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getFilteredCTCData().map((row, idx) => (
                                        <tr key={idx} className="border-b hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{row.nama}</div>
                                                <div className="text-xs text-gray-400">{row.posisi} • {row.dept}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium bg-blue-50/30 text-blue-600">{formatIDR(row.bruto)}</td>
                                            <td className="px-6 py-4 text-right">{formatIDR(row.bpjsComp)}</td>
                                            <td className="px-6 py-4 text-right text-gray-500">{formatIDR(row.thr + row.pesangon)}</td>
                                            <td className="px-6 py-4 text-right font-bold bg-emerald-50/30 text-emerald-700">{formatIDR(row.ctcMonth)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${row.hiddenPct > 40 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                                    {row.hiddenPct}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. PROJECTION VIEW (TOP: Settings, BOTTOM: Chart) */}
            {activeMenu === 'projection' && (
                <div className="space-y-6">
                    
                    {/* TOP: COMPACT SETTINGS BAR */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            
                            {/* Input 1: THR */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">📅 Bulan THR</label>
                                <select 
                                    value={simulation.thrMonth} 
                                    onChange={(e) => setSimulation({...simulation, thrMonth: parseInt(e.target.value)})}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                >
                                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                                        <option key={i} value={i}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Input 2: Overtime */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">⚡ Lembur / Bulan</label>
                                <div className="flex items-center">
                                    <span className="bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-gray-500 text-sm">Rp</span>
                                    <input 
                                        type="number" 
                                        value={simulation.overtimeBudget} 
                                        onChange={(e) => setSimulation({...simulation, overtimeBudget: e.target.value})}
                                        className="w-full border border-gray-300 rounded-r-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Input 3: Bonus Amount */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">🎁 Total Bonus</label>
                                <div className="flex items-center">
                                    <span className="bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-gray-500 text-sm">Rp</span>
                                    <input 
                                        type="number" 
                                        value={simulation.bonusBudget} 
                                        onChange={(e) => setSimulation({...simulation, bonusBudget: e.target.value})}
                                        className="w-full border border-gray-300 rounded-r-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Input 4: Bonus Month */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">📅 Bulan Bonus</label>
                                <select 
                                    value={simulation.bonusMonth} 
                                    onChange={(e) => setSimulation({...simulation, bonusMonth: parseInt(e.target.value)})}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                >
                                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                                        <option key={i} value={i}>{m}</option>
                                    ))}
                                </select>
                            </div>

                        </div>
                    </div>

                    {/* BOTTOM: CHART */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm h-[500px] flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-gray-700 text-lg">Proyeksi Cashflow</h3>
                                <p className="text-sm text-gray-400">Total estimasi pengeluaran kas tahunan (termasuk variabel di atas)</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400 uppercase">Grand Total (Projected)</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {formatIDR(
                                        payrollData.summary.ctcYearly + 
                                        (parseFloat(simulation.overtimeBudget) * 12) + 
                                        parseFloat(simulation.bonusBudget)
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            <canvas id="projectionChart"></canvas>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. DETAILS TABLE VIEW */}
            {activeMenu === 'details' && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Nama</th>
                                    <th className="px-6 py-3">Posisi</th>
                                    <th className="px-6 py-3 text-right">Bruto</th>
                                    <th className="px-6 py-3 text-right">Pajak (PPh 21)</th>
                                    <th className="px-6 py-3 text-right">Take Home</th>
                                    <th className="px-6 py-3 text-right bg-emerald-50 text-emerald-700">Total CTC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrollData.details.map((row, idx) => (
                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{row.nama}</td>
                                        <td className="px-6 py-4">{row.posisi}</td>
                                        <td className="px-6 py-4 text-right">{formatIDR(row.bruto)}</td>
                                        <td className="px-6 py-4 text-right text-red-500">{formatIDR(row.pph21)}</td>
                                        <td className="px-6 py-4 text-right font-bold">{formatIDR(row.thp)}</td>
                                        <td className="px-6 py-4 text-right font-bold bg-emerald-50 text-emerald-700">{formatIDR(row.ctcMonth)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};

export default PayrollSimulator;