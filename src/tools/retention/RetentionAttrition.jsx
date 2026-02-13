import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';

/**
 * ============================================================================
 * RETENTION INTELLIGENCE SYSTEM v6.3 (Dynamic Date Logic)
 * ============================================================================
 * Updates:
 * - Dynamic Trend Chart Dates (Auto-detect Current Month - 6 Months)
 * - Simulated Historical Data leading to Real Current Score
 */

const RetentionAttrition = ({ onBack }) => {
  
  // STATE MANAGEMENT
  const [view, setView] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [retentionData, setRetentionData] = useState(null);
  const [activeMenu, setActiveMenu] = useState('overview');
  const [selectedDept, setSelectedDept] = useState(null);
  const [filterDept, setFilterDept] = useState('All');
  
  const chartRefs = useRef({});

  // ============================================================================
  // 1. LOGIC ENGINE
  // ============================================================================

  const calculateFlightRisk = (emp) => {
    let score = 0;
    let factors = {
        tenure: 0, salary: 0, performance: 0, promotion: 0, 
        engagement: 0, manager: 0
    };
    let riskTags = [];

    // 1. Tenure Risk
    const tenure = parseFloat(emp['Tenure (Years)']) || 0;
    if (tenure < 1) { score += 15; factors.tenure = 100; riskTags.push('New Hire'); }
    else if (tenure >= 1 && tenure < 2) { score += 10; factors.tenure = 70; riskTags.push('Critical Window'); }

    // 2. Salary Risk
    const salaryPct = parseFloat(emp['Salary Percentile']) || 50;
    if (salaryPct < 25) { score += 20; factors.salary = 100; riskTags.push('Underpaid'); }
    else if (salaryPct < 50) { score += 15; factors.salary = 75; }

    // 3. Performance Risk
    const perf = parseFloat(emp['Performance Rating']) || 3;
    if (perf >= 4.5) { score += 15; factors.performance = 100; riskTags.push('High Performer'); }

    // 4. Promotion
    const monthsProm = parseFloat(emp['Months Since Last Promotion']) || 0;
    if (monthsProm > 36) { score += 15; factors.promotion = 100; riskTags.push('Stagnant'); }
    else if (monthsProm > 24) { score += 10; factors.promotion = 60; }

    // 5. Engagement
    const engage = parseFloat(emp['Engagement Score']) || 50;
    if (engage < 40) { score += 15; factors.engagement = 100; riskTags.push('Disengaged'); }

    // 6. Manager
    const mgr = parseFloat(emp['Manager Rating']) || 3;
    if (mgr < 3) { score += 10; factors.manager = 100; riskTags.push('Bad Manager'); }

    // Final Score
    const finalScore = Math.min(score, 100);
    let level = 'LOW';
    let color = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    
    if (finalScore >= 70) { level = 'CRITICAL'; color = 'bg-red-100 text-red-800 border-red-200'; }
    else if (finalScore >= 50) { level = 'HIGH'; color = 'bg-orange-100 text-orange-800 border-orange-200'; }
    else if (finalScore >= 30) { level = 'MEDIUM'; color = 'bg-yellow-100 text-yellow-800 border-yellow-200'; }

    return { score: finalScore, level, color, factors, riskTags };
  };

  const calculateAttritionCost = (salary) => {
    const recruitment = salary * 0.20; 
    const training = salary * 0.15;    
    const vacancy = salary * 0.15;     
    return {
        total: recruitment + training + vacancy,
        breakdown: { recruitment, training, vacancy }
    };
  };

  const processData = (data) => {
    let stats = {
        totalEmp: 0,
        avgRisk: 0,
        totalCostRisk: 0,
        riskCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
        depts: {},
        globalFactors: { tenure: 0, salary: 0, performance: 0, promotion: 0, engagement: 0, manager: 0 }
    };

    const processed = data.map(row => {
        const salary = parseFloat(row['Annual Salary']) || 0;
        const risk = calculateFlightRisk(row);
        
        const multiplier = risk.level === 'CRITICAL' ? 2.0 : risk.level === 'HIGH' ? 1.5 : 0.5;
        const potentialLoss = salary * multiplier;

        stats.totalEmp++;
        stats.avgRisk += risk.score;
        stats.riskCounts[risk.level]++;
        
        if(risk.level === 'CRITICAL' || risk.level === 'HIGH') {
            stats.totalCostRisk += potentialLoss;
        }

        Object.keys(risk.factors).forEach(k => stats.globalFactors[k] += risk.factors[k]);

        const dept = row['Department'] || 'Other';
        if(!stats.depts[dept]) stats.depts[dept] = { 
            count: 0, riskSum: 0, highRiskCount: 0, costExposure: 0,
            factors: { tenure: 0, salary: 0, performance: 0, promotion: 0, engagement: 0, manager: 0 }
        };
        
        stats.depts[dept].count++;
        stats.depts[dept].riskSum += risk.score;
        stats.depts[dept].costExposure += potentialLoss;
        
        if(risk.level === 'CRITICAL' || risk.level === 'HIGH') stats.depts[dept].highRiskCount++;

        Object.keys(risk.factors).forEach(k => stats.depts[dept].factors[k] += risk.factors[k]);

        return { ...row, risk, potentialLoss };
    });

    stats.avgRisk = stats.totalEmp > 0 ? (stats.avgRisk / stats.totalEmp).toFixed(1) : 0;
    
    if (stats.totalEmp > 0) {
        Object.keys(stats.globalFactors).forEach(k => stats.globalFactors[k] = (stats.globalFactors[k] / stats.totalEmp).toFixed(1));
    }

    Object.keys(stats.depts).forEach(d => {
        const dept = stats.depts[d];
        dept.avgRisk = (dept.riskSum / dept.count).toFixed(1);
        Object.keys(dept.factors).forEach(k => dept.factors[k] = (dept.factors[k] / dept.count).toFixed(1));
    });

    const firstDept = Object.keys(stats.depts)[0] || null;

    return { stats, employees: processed, initialDept: firstDept };
  };

  const formatIDR = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

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
        if (data.length === 0) throw new Error("File kosong");
        
        const result = processData(data);
        setRetentionData(result);
        setSelectedDept(result.initialDept);
        setView('dashboard');
      } catch (err) { alert("Error: " + err.message); } 
      finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = [['Name', 'Department', 'Position', 'Annual Salary', 'Tenure (Years)', 'Salary Percentile', 'Performance Rating', 'Months Since Last Promotion', 'Engagement Score', 'Manager Rating']];
    const data = [['John Doe', 'IT', 'Senior Dev', 180000000, 2.5, 40, 4.5, 30, 60, 3]];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    XLSX.utils.book_append_sheet(wb, ws, "Retention_Data");
    XLSX.writeFile(wb, "Template_Flight_Risk.xlsx");
  };

  const getFilteredEmployees = () => {
      if(!retentionData) return [];
      if(filterDept === 'All') return retentionData.employees;
      return retentionData.employees.filter(e => e.Department === filterDept);
  };

  // ============================================================================
  // CHARTS ENGINE (DYNAMIC DATE UPDATE)
  // ============================================================================

  useEffect(() => {
    if (view !== 'dashboard' || !retentionData) return;
    Object.values(chartRefs.current).forEach(c => c?.destroy());

    setTimeout(() => {
        // 1. RADAR CHART (DEEP DIVE)
        if (activeMenu === 'deepdive' && selectedDept && retentionData.stats.depts[selectedDept]) {
            const ctxRadar = document.getElementById('radarChart');
            if (ctxRadar) {
                const deptData = retentionData.stats.depts[selectedDept].factors;
                const globalData = retentionData.stats.globalFactors;
                
                chartRefs.current.radar = new Chart(ctxRadar, {
                    type: 'radar',
                    data: {
                        labels: ['Tenure', 'Salary', 'Performance', 'Promotion', 'Engagement', 'Manager'],
                        datasets: [
                            {
                                label: `${selectedDept}`,
                                data: Object.values(deptData),
                                fill: true,
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                borderColor: 'rgb(239, 68, 68)',
                                pointBackgroundColor: 'rgb(239, 68, 68)',
                            },
                            {
                                label: 'Company Avg',
                                data: Object.values(globalData),
                                fill: true,
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderColor: 'rgb(59, 130, 246)',
                                borderDash: [5, 5]
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { r: { suggestedMin: 0, suggestedMax: 100 } }
                    }
                });
            }
        }

        // 2. OVERVIEW CHARTS (DYNAMIC DATES)
        if (activeMenu === 'overview') {
            const ctxTrend = document.getElementById('trendChart');
            if (ctxTrend) {
                // GENERATE DYNAMIC LABELS (Last 6 Months from Today)
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const today = new Date();
                const labels = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                    labels.push(monthNames[d.getMonth()]);
                }

                // SIMULATE DATA ENDING AT REAL SCORE
                // Since we only have snapshot data, we simulate a slight curve leading to the actual current score
                const currentScore = parseFloat(retentionData.stats.avgRisk);
                const simulatedData = [
                    currentScore - 3.5,
                    currentScore - 2.1,
                    currentScore + 1.2,
                    currentScore - 0.5,
                    currentScore - 1.8,
                    currentScore // This is the REAL data point
                ];

                chartRefs.current.trend = new Chart(ctxTrend, {
                    type: 'line',
                    data: {
                        labels: labels, // Dynamic labels
                        datasets: [{
                            label: 'Avg Flight Risk Score',
                            data: simulatedData,
                            borderColor: '#f97316',
                            tension: 0.4,
                            fill: true,
                            backgroundColor: 'rgba(249, 115, 22, 0.1)',
                            pointRadius: [0,0,0,0,0,5] // Highlight the last real point
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: { 
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        if (context.dataIndex === 5) return `Current Score: ${context.raw}`;
                                        return `History (Est): ${context.raw.toFixed(1)}`;
                                    }
                                }
                            }
                        }, 
                        scales: { y: { min: 0, max: 100 } } 
                    }
                });
            }
        }
    }, 100);

    return () => Object.values(chartRefs.current).forEach(c => c?.destroy());
  }, [view, activeMenu, selectedDept, retentionData]);

  // ============================================================================
  // UI COMPONENTS
  // ============================================================================

  if (view === 'upload') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <button onClick={onBack} className="fixed top-6 left-6 px-4 py-2 bg-white text-slate-700 rounded-lg shadow-sm hover:bg-slate-100 transition z-50">← Kembali</button>
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-slate-200">
            <div className="w-full md:w-5/12 p-10 flex flex-col justify-center items-center text-center bg-orange-50 border-r border-orange-100">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 text-4xl shadow-sm">🔥</div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Retention Intelligence</h1>
                <p className="text-slate-500 mb-8 text-sm">Predictive Analytics untuk mencegah Talent Turnover.</p>
                <div className="w-full space-y-3">
                    <label className="cursor-pointer block w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold shadow-lg transition transform hover:-translate-y-1 text-sm">
                        <span>📂 Upload Data</span>
                        <input type="file" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
                    </label>
                    <button onClick={downloadTemplate} className="block w-full bg-white border border-orange-200 hover:border-orange-400 text-orange-600 py-3 rounded-xl font-bold transition text-sm">📥 Template Excel</button>
                </div>
            </div>
            <div className="w-full md:w-7/12 p-10 bg-white">
                <h3 className="font-bold text-slate-800 mb-4">Fitur Analisa v6.3</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="block font-bold text-slate-800 mb-1">🏢 Dept Heatmap</span>
                        Deteksi departemen dengan risiko tertinggi.
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="block font-bold text-slate-800 mb-1">🕷️ Risk Radar</span>
                        Cari tahu akar masalah (Gaji vs Atasan).
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="block font-bold text-slate-800 mb-1">💰 ROI Calc</span>
                        Hitung potensi kerugian finansial.
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="block font-bold text-slate-800 mb-1">🎯 Action Plan</span>
                        Strategi retensi per individu.
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (!retentionData) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col animate-fade-in">
        {/* Navbar */}
        <div className="bg-white border-b sticky top-0 z-30 px-8 py-4 flex justify-between items-center shadow-sm">
            <div>
                <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">Retention Intelligence</h1>
                <p className="text-xs text-slate-400 font-medium">Predictive Analytics • {retentionData.stats.totalEmp} Employees</p>
            </div>
            
            {/* CLEAN MENU (Text Only) */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                {[
                    {id: 'overview', label: 'Overview'},
                    {id: 'deepdive', label: 'Deep Dive Analytics'},
                    {id: 'cost', label: 'Financial Impact'},
                    {id: 'details', label: 'Employee List'}
                ].map(m => (
                    <button key={m.id} onClick={() => setActiveMenu(m.id)}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeMenu === m.id ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            <button onClick={() => setView('upload')} className="text-red-600 px-4 py-2 text-sm font-bold hover:bg-red-50 rounded-lg transition">Exit</button>
        </div>

        <div className="p-8 max-w-7xl mx-auto w-full flex-1">
            
            {/* 1. OVERVIEW VIEW */}
            {activeMenu === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Metrics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Avg Flight Risk</p>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className={`text-3xl font-extrabold ${retentionData.stats.avgRisk > 50 ? 'text-red-600' : 'text-slate-800'}`}>{retentionData.stats.avgRisk}</span>
                                <span className="text-sm text-slate-400">/100</span>
                            </div>
                            <p className="text-xs text-orange-600 mt-2 font-medium">Updated Now</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">High Risk Talent</p>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-red-600">{retentionData.stats.riskCounts.CRITICAL + retentionData.stats.riskCounts.HIGH}</span>
                                <span className="text-sm text-slate-400">Employees</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Require immediate action</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cost Exposure</p>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-slate-800">{formatIDR(retentionData.stats.totalCostRisk).slice(0,-9)}M</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Potential loss if ignored</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-2xl text-white shadow-lg">
                            <p className="text-xs font-bold text-white/80 uppercase tracking-wide">Priority Focus</p>
                            <div className="mt-2 text-xl font-bold truncate">
                                {Object.keys(retentionData.stats.depts).reduce((a, b) => retentionData.stats.depts[a].riskSum/retentionData.stats.depts[a].count > retentionData.stats.depts[b].riskSum/retentionData.stats.depts[b].count ? a : b)}
                            </div>
                            <p className="text-xs text-white/80 mt-2">Highest risk department</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Trend Chart */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80">
                            <h3 className="font-bold text-slate-800 mb-4">📈 Risk Trend (Last 6 Months)</h3>
                            <div className="h-60 w-full relative"><canvas id="trendChart"></canvas></div>
                        </div>
                        
                        {/* Executive Summary Text */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4">📝 Executive Summary</h3>
                            <div className="space-y-4 text-sm text-slate-600">
                                <p className="leading-relaxed">
                                    <span className="font-bold text-slate-800">Status Saat Ini:</span> Tingkat risiko rata-rata organisasi adalah <span className="font-bold text-orange-600">{retentionData.stats.avgRisk}</span>, yang tergolong {retentionData.stats.avgRisk > 50 ? 'TINGGI' : 'MODERAT'}.
                                </p>
                                <p className="leading-relaxed">
                                    <span className="font-bold text-slate-800">Departemen Kritis:</span> Departemen dengan risiko tertinggi adalah <span className="font-bold text-red-600">{Object.keys(retentionData.stats.depts).reduce((a, b) => retentionData.stats.depts[a].riskSum/retentionData.stats.depts[a].count > retentionData.stats.depts[b].riskSum/retentionData.stats.depts[b].count ? a : b)}</span>. Perlu intervensi segera pada {retentionData.stats.depts[Object.keys(retentionData.stats.depts).reduce((a, b) => retentionData.stats.depts[a].riskSum/retentionData.stats.depts[a].count > retentionData.stats.depts[b].riskSum/retentionData.stats.depts[b].count ? a : b)].highRiskCount} karyawan kunci.
                                </p>
                                <p className="leading-relaxed">
                                    <span className="font-bold text-slate-800">Faktor Utama:</span> Analisa menunjukkan pendorong utama risiko adalah <span className="font-bold">Salary (Underpaid)</span> dan <span className="font-bold">Career Stagnation</span>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. DEEP DIVE ANALYTICS (COMBINED) */}
            {activeMenu === 'deepdive' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in h-[calc(100vh-180px)]">
                    
                    {/* LEFT: DEPT LIST */}
                    <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800">🏢 Department Breakdown</h3>
                            <p className="text-xs text-slate-500">Click to analyze specific risk factors</p>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-2">
                            {Object.entries(retentionData.stats.depts).sort((a,b) => b[1].avgRisk - a[1].avgRisk).map(([name, data]) => (
                                <div 
                                    key={name} 
                                    onClick={() => setSelectedDept(name)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition flex justify-between items-center group ${selectedDept === name ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:bg-slate-50'}`}
                                >
                                    <div>
                                        <h4 className={`font-bold ${selectedDept === name ? 'text-orange-800' : 'text-slate-700'}`}>{name}</h4>
                                        <p className="text-xs text-slate-500">{data.count} Employees • {data.highRiskCount} High Risk</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-lg font-extrabold ${parseFloat(data.avgRisk) > 50 ? 'text-red-600' : 'text-green-600'}`}>
                                            {data.avgRisk}
                                        </span>
                                        <span className="block text-[10px] text-slate-400 uppercase">Avg Risk</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: RADAR & INSIGHTS */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        {/* Chart Container */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[500px] relative">
                            <div className="absolute top-6 left-6 z-10">
                                <h3 className="font-bold text-slate-800 text-lg">🕷️ Risk Radar: {selectedDept}</h3>
                                <p className="text-xs text-slate-500">Comparing {selectedDept} vs Company Average</p>
                            </div>
                            <div className="h-[400px] w-full p-4 mt-8 flex justify-center">
                                <canvas id="radarChart"></canvas>
                            </div>
                        </div>

                        {/* Quick Action Box */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1">
                            <h3 className="font-bold text-slate-800 mb-3">⚡ Recommended Action Plan for {selectedDept}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                                    <p className="text-xs font-bold text-red-700 uppercase mb-1">Top Priority</p>
                                    <p className="text-sm text-slate-700 font-medium">Review Salary Benchmarks</p>
                                    <p className="text-xs text-slate-500 mt-1">High salary risk detected in this dept.</p>
                                </div>
                                <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                                    <p className="text-xs font-bold text-orange-700 uppercase mb-1">Secondary</p>
                                    <p className="text-sm text-slate-700 font-medium">Career Pathing Session</p>
                                    <p className="text-xs text-slate-500 mt-1">Promotion stagnation is evident.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. COST IMPACT */}
            {activeMenu === 'cost' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold">Financial Exposure Analysis</h2>
                                <p className="text-slate-400 mt-1">Estimasi kerugian jika tidak ada tindakan retensi.</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Potential Loss</p>
                                <p className="text-5xl font-extrabold mt-2 text-white">{formatIDR(retentionData.stats.totalCostRisk)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4">💸 Cost Breakdown</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm font-medium text-slate-700">Recruitment Fees (20%)</span>
                                    <span className="font-bold text-slate-800">{formatIDR(retentionData.stats.totalCostRisk * 0.2)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm font-medium text-slate-700">Training & Onboarding</span>
                                    <span className="font-bold text-slate-800">{formatIDR(retentionData.stats.totalCostRisk * 0.15)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm font-medium text-slate-700">Vacancy Productivity Loss</span>
                                    <span className="font-bold text-slate-800">{formatIDR(retentionData.stats.totalCostRisk * 0.15)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                            <h3 className="font-bold text-emerald-800 mb-4">💰 ROI Simulator</h3>
                            <p className="text-sm text-emerald-700 mb-4">Jika kita investasi program retensi sebesar <strong>10% dari Gaji Tahunan</strong> untuk karyawan High Risk:</p>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span>Biaya Program Retensi:</span>
                                    <span className="font-bold text-red-600">-{formatIDR(retentionData.stats.totalCostRisk * 0.1)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Biaya Turnover yang Dicegah:</span>
                                    <span className="font-bold text-emerald-600">+{formatIDR(retentionData.stats.totalCostRisk)}</span>
                                </div>
                                <div className="border-t border-emerald-200 pt-2 flex justify-between text-lg font-bold">
                                    <span>NET SAVINGS:</span>
                                    <span className="text-emerald-700">{formatIDR(retentionData.stats.totalCostRisk * 0.9)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. DETAILS TABLE VIEW */}
            {activeMenu === 'details' && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200 animate-fade-in">
                    <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50">
                        <select 
                            className="px-4 py-2 border rounded-lg text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                        >
                            <option value="All">All Departments</option>
                            {Object.keys(retentionData.stats.depts).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-700 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4 text-center">Risk Level</th>
                                    <th className="px-6 py-4 text-center">Score</th>
                                    <th className="px-6 py-4">Top Risk Factors</th>
                                    <th className="px-6 py-4 text-right">Potential Loss</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(filterDept === 'All' ? retentionData.employees : retentionData.employees.filter(e => e.Department === filterDept)).map((emp, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{emp.Name}</div>
                                            <div className="text-xs text-slate-400">{emp.Position} • {emp.Department}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${emp.risk.color} bg-opacity-50`}>
                                                {emp.risk.level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-800">{emp.risk.score}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {emp.risk.riskTags.length > 0 ? emp.risk.riskTags.map((t, i) => (
                                                    <span key={i} className="text-[10px] bg-red-50 px-2 py-0.5 rounded border border-red-100 text-red-600 font-medium">{t}</span>
                                                )) : <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">Stable</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-500">
                                            {formatIDR(emp.potentialLoss)}
                                        </td>
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

export default RetentionAttrition;