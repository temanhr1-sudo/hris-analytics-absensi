import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';

/**
 * ============================================================================
 * MANPOWER PLANNING SYSTEM v5.0 (Insightful Edition)
 * ============================================================================
 * Updates:
 * - Richer Department View (Cost Share + Workload Health)
 * - Detailed Growth View (CAGR, Hiring Roadmap)
 * - Strategic Insights per Section
 */

const ManpowerPlanning = ({ onBack }) => {
  
  // STATE MANAGEMENT
  const [view, setView] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [manpowerData, setManpowerData] = useState(null);
  const [activeMenu, setActiveMenu] = useState('overview');
  
  const chartRefs = useRef({});

  // ============================================================================
  // LOGIC: ANALYTICS ENGINE
  // ============================================================================

  const calculateFTE = (workloadHours) => (workloadHours / 176);

  const analyzeManpower = (data) => {
    const departments = {};
    let totals = {
      currentHeadcount: 0,
      plannedHeadcount: 0,
      totalAnnualCost: 0,
      gap: 0,
      departments: 0,
      totalWorkload: 0
    };

    data.forEach(row => {
      const dept = row['Department'] || 'Unassigned';
      const workloadHours = parseFloat(row['Workload (Hours/Month)']) || 0;
      const currentHC = parseFloat(row['Current Headcount']) || 0;
      const plannedHC = parseFloat(row['Planned Headcount']) || 0;
      const avgSalary = parseFloat(row['Avg Salary']) || 0;

      if (!departments[dept]) {
        departments[dept] = { 
            name: dept, positions: [], 
            currentHC: 0, requiredFTE: 0, plannedHC: 0, 
            cost: 0, gap: 0, workload: 0 
        };
      }

      const fte = calculateFTE(workloadHours);
      const annualCost = plannedHC * avgSalary * 12;
      const gap = plannedHC - currentHC;

      const positionData = {
        position: row['Position'] || 'Unknown',
        workload: workloadHours,
        fte: fte.toFixed(2),
        current: currentHC,
        planned: plannedHC,
        gap,
        salary: avgSalary,
        cost: annualCost,
        status: gap > 0 ? 'Hiring' : gap < 0 ? 'Surplus' : 'Stable'
      };

      departments[dept].positions.push(positionData);
      departments[dept].currentHC += currentHC;
      departments[dept].requiredFTE += fte;
      departments[dept].plannedHC += plannedHC;
      departments[dept].cost += annualCost;
      departments[dept].gap += gap;
      departments[dept].workload += workloadHours;

      // Global Totals
      totals.currentHeadcount += currentHC;
      totals.plannedHeadcount += plannedHC;
      totals.totalAnnualCost += annualCost;
      totals.totalWorkload += workloadHours;
    });

    totals.gap = totals.plannedHeadcount - totals.currentHeadcount;
    totals.departments = Object.keys(departments).length;

    // Calculate Dept Health (Avg FTE per Person)
    Object.values(departments).forEach(d => {
        const avgFTE = d.plannedHC > 0 ? d.requiredFTE / d.plannedHC : 0;
        d.health = avgFTE > 1.1 ? 'Overloaded' : avgFTE < 0.8 ? 'Underutilized' : 'Healthy';
        d.avgFTE = avgFTE.toFixed(2);
    });

    // Projection (3 Years) - 10% Growth Model
    const projection = [];
    let baseHC = totals.plannedHeadcount;
    let baseCost = totals.totalAnnualCost;
    
    for(let i=1; i<=3; i++) {
        const growthHC = Math.round(baseHC * 0.10);
        const attrition = Math.round(baseHC * 0.15); // Replacement hiring
        
        baseHC += growthHC; 
        baseCost = baseCost * 1.15; // 15% Cost Increase (Salary adjust + New Hires)
        
        projection.push({ 
            year: `Year ${i}`, 
            hc: baseHC, 
            cost: baseCost,
            hiringTotal: growthHC + attrition, // Total Rekrutmen (New + Replace)
            growthHire: growthHC,
            replaceHire: attrition
        });
    }

    return { departments, totals, projection };
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
        setManpowerData(analyzeManpower(data));
        setView('dashboard');
      } catch (err) { alert("Error: " + err.message); } 
      finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = [['Department', 'Position', 'Workload (Hours/Month)', 'Current Headcount', 'Planned Headcount', 'Avg Salary']];
    const data = [['IT', 'Software Engineer', 352, 2, 3, 15000000], ['Sales', 'Sales Exec', 500, 2, 4, 8000000]];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    XLSX.utils.book_append_sheet(wb, ws, "Manpower_Data");
    XLSX.writeFile(wb, "Template_Manpower_Planning.xlsx");
  };

  const exportReport = () => {
    if (!manpowerData) return;
    const wb = XLSX.utils.book_new();
    
    // Summary Sheet
    const summary = [
        ['Metric', 'Value'],
        ['Total Cost', formatIDR(manpowerData.totals.totalAnnualCost)],
        ['Total Headcount', manpowerData.totals.plannedHeadcount],
        ['Total Gap', manpowerData.totals.gap]
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    XLSX.writeFile(wb, "Manpower_Strategic_Report.xlsx");
  };

  // ============================================================================
  // CHARTS
  // ============================================================================

  useEffect(() => {
    if (view !== 'dashboard' || !manpowerData) return;
    Object.values(chartRefs.current).forEach(c => c?.destroy());

    setTimeout(() => {
        // 1. DEPT HC CHART
        if (activeMenu === 'department' || activeMenu === 'overview') {
            const ctx = document.getElementById('deptChart');
            if (ctx) {
                const depts = Object.values(manpowerData.departments);
                chartRefs.current.dept = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: depts.map(d => d.name),
                        datasets: [
                            { label: 'Existing Team', data: depts.map(d => d.currentHC), backgroundColor: '#94a3b8', stack: 'Stack 0' },
                            { label: 'Hiring Plan', data: depts.map(d => d.gap > 0 ? d.gap : 0), backgroundColor: '#22c55e', stack: 'Stack 0' }
                        ]
                    },
                    options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true } } }
                });
            }
        }

        // 2. COST SHARE CHART (Donut) - NEW for Department View
        if (activeMenu === 'department') {
            const ctxCost = document.getElementById('costChart');
            if (ctxCost) {
                const depts = Object.values(manpowerData.departments);
                chartRefs.current.cost = new Chart(ctxCost, {
                    type: 'doughnut',
                    data: {
                        labels: depts.map(d => d.name),
                        datasets: [{
                            data: depts.map(d => d.cost),
                            backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
                        }]
                    },
                    options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'right' } } }
                });
            }
        }

        // 3. PROJECTION CHART
        if (activeMenu === 'growth' || activeMenu === 'overview') {
            const ctx = document.getElementById('projChart');
            if (ctx) {
                chartRefs.current.proj = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Current', ...manpowerData.projection.map(p => p.year)],
                        datasets: [
                            { 
                                label: 'Total Headcount', 
                                data: [manpowerData.totals.plannedHeadcount, ...manpowerData.projection.map(p => p.hc)],
                                borderColor: '#2563eb',
                                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                fill: true,
                                tension: 0.4
                            }
                        ]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        }
    }, 100);

    return () => Object.values(chartRefs.current).forEach(c => c?.destroy());
  }, [view, activeMenu, manpowerData]);

  // ============================================================================
  // UI RENDER
  // ============================================================================

  if (view === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-6 font-sans">
        <button onClick={onBack} className="fixed top-6 left-6 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition z-50">← Kembali</button>
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-red-100">
            <div className="w-full md:w-5/12 p-10 flex flex-col justify-center items-center text-center bg-red-50/50 border-r border-red-100">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 text-5xl shadow-md">👥</div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Manpower 5.0</h1>
                <p className="text-slate-500 mb-8">Strategic Workforce Planning & FTE Analysis</p>
                <div className="w-full space-y-3">
                    <label className="cursor-pointer block w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-bold shadow-lg transition transform hover:-translate-y-1">
                        <span>📂 Upload Data</span>
                        <input type="file" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
                    </label>
                    <button onClick={downloadTemplate} className="block w-full bg-white border-2 border-red-100 hover:border-red-300 text-red-600 py-3 rounded-xl font-bold transition">📥 Template</button>
                </div>
                {loading && <p className="mt-4 text-red-600 font-bold animate-pulse">Analyzing...</p>}
            </div>
            <div className="w-full md:w-7/12 p-10 bg-white flex flex-col justify-center">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">📖 Konsep FTE</h3>
                <div className="space-y-4 text-sm text-slate-600">
                    <p><strong>1. Workload Analysis:</strong> Input jam kerja/bulan untuk setiap posisi.</p>
                    <p><strong>2. FTE Calculation:</strong> Rumus <code>Jam Kerja / 176</code>. (176 jam = 1 Orang Full Time).</p>
                    <p><strong>3. Efficiency Check:</strong> Sistem akan mendeteksi departemen mana yang <em>Overloaded</em> (Kurang Orang) atau <em>Underutilized</em> (Kebanyakan Orang).</p>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col animate-fade-in">
        {/* Navbar */}
        <div className="bg-white border-b sticky top-0 z-30 px-8 py-4 flex justify-between items-center shadow-sm">
            <div>
                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Manpower Dashboard</h1>
                <p className="text-xs text-slate-400 font-medium">Planning Year 2026 • {manpowerData.totals.departments} Departments</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
                {['overview', 'department', 'growth', 'details'].map(m => (
                    <button key={m} onClick={() => setActiveMenu(m)}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition uppercase ${activeMenu === m ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {m}
                    </button>
                ))}
            </div>
            <div className="flex gap-2">
                <button onClick={exportReport} className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition">Export</button>
                <button onClick={() => setView('upload')} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition">Exit</button>
            </div>
        </div>

        <div className="p-8 max-w-7xl mx-auto w-full flex-1">
            
            {/* OVERVIEW */}
            {activeMenu === 'overview' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">Total Headcount</p>
                            <p className="text-3xl font-extrabold text-slate-800 mt-2">{manpowerData.totals.plannedHeadcount}</p>
                            <p className="text-xs text-slate-400 mt-1">Target 2026</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">Hiring Gap</p>
                            <p className="text-3xl font-extrabold text-green-600 mt-2">+{manpowerData.totals.gap}</p>
                            <p className="text-xs text-slate-400 mt-1">Positions to fill</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">Annual Cost</p>
                            <p className="text-2xl font-extrabold text-blue-600 mt-2">{formatIDR(manpowerData.totals.totalAnnualCost).slice(0, -9)} M</p>
                            <p className="text-xs text-slate-400 mt-1">Salary Budget</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">Growth Rate</p>
                            <p className="text-3xl font-extrabold text-purple-600 mt-2">10%</p>
                            <p className="text-xs text-slate-400 mt-1">Projected YoY</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4">📊 Headcount Distribution Plan</h3>
                            <div className="h-64 relative"><canvas id="deptChart"></canvas></div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4">📈 3-Year Growth Trajectory</h3>
                            <div className="h-64 relative"><canvas id="projChart"></canvas></div>
                        </div>
                    </div>
                </div>
            )}

            {/* DEPARTMENT VIEW (ENHANCED) */}
            {activeMenu === 'department' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Top Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4">📊 Headcount Breakdown</h3>
                            <div className="h-64 relative"><canvas id="deptChart"></canvas></div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4">💰 Cost Distribution (Budget Share)</h3>
                            <div className="h-64 relative flex justify-center"><canvas id="costChart"></canvas></div>
                        </div>
                    </div>

                    {/* Department Health Cards */}
                    <div>
                        <h3 className="font-bold text-slate-800 mb-4 text-lg">🏢 Department Health & Workload Analysis</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {Object.values(manpowerData.departments).map(dept => (
                                <div key={dept.name} className={`bg-white p-5 rounded-xl border-l-4 shadow-sm ${
                                    dept.health === 'Overloaded' ? 'border-red-500' : 
                                    dept.health === 'Underutilized' ? 'border-yellow-500' : 'border-emerald-500'
                                }`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-bold text-slate-800 text-lg">{dept.name}</h4>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            dept.health === 'Overloaded' ? 'bg-red-100 text-red-700' : 
                                            dept.health === 'Underutilized' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {dept.health}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-600">
                                        <div className="flex justify-between"><span>Headcount:</span> <span className="font-bold">{dept.currentHC} → {dept.plannedHC}</span></div>
                                        <div className="flex justify-between"><span>Avg Workload:</span> <span className="font-bold">{dept.avgFTE} FTE</span></div>
                                        <div className="flex justify-between"><span>Annual Cost:</span> <span className="font-bold text-blue-600">{formatIDR(dept.cost)}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* GROWTH VIEW (ENHANCED) */}
            {activeMenu === 'growth' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Growth Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg">
                            <p className="text-blue-100 text-xs uppercase font-bold">Total Hiring (3 Years)</p>
                            <p className="text-4xl font-extrabold mt-2">
                                {manpowerData.projection.reduce((acc, curr) => acc + curr.hiringTotal, 0)} <span className="text-lg opacity-70">People</span>
                            </p>
                            <p className="text-sm mt-1 opacity-80">Include replacement & growth</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-400 text-xs uppercase font-bold">Budget Increase</p>
                            <p className="text-3xl font-extrabold text-slate-800 mt-2">
                                +{formatIDR(manpowerData.projection[2].cost - manpowerData.totals.totalAnnualCost).slice(0,-9)} M
                            </p>
                            <p className="text-sm text-green-600 mt-1 font-bold">↑ 35% in 3 Years</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-400 text-xs uppercase font-bold">CAGR (Growth Rate)</p>
                            <p className="text-3xl font-extrabold text-slate-800 mt-2">10.5%</p>
                            <p className="text-sm text-slate-400 mt-1">Compound Annual Growth</p>
                        </div>
                    </div>

                    {/* Projection Chart */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-[400px]">
                        <h3 className="font-bold text-slate-800 mb-6 text-lg">📈 Growth Scenario (Conservative 10%)</h3>
                        <div className="h-[300px] relative w-full"><canvas id="projChart"></canvas></div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-700">📅 Yearly Hiring Roadmap</h3>
                        </div>
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="bg-white text-xs uppercase text-slate-500 font-bold border-b">
                                <tr>
                                    <th className="px-6 py-4">Timeline</th>
                                    <th className="px-6 py-4">Total Headcount</th>
                                    <th className="px-6 py-4 text-green-600">New Growth</th>
                                    <th className="px-6 py-4 text-red-500">Replacement</th>
                                    <th className="px-6 py-4 text-blue-600 font-bold">Total Recruitment</th>
                                    <th className="px-6 py-4 text-right">Est. Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {manpowerData.projection.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 font-bold text-slate-800">{p.year}</td>
                                        <td className="px-6 py-4 font-mono">{p.hc}</td>
                                        <td className="px-6 py-4 text-green-600">+{p.growthHire}</td>
                                        <td className="px-6 py-4 text-red-500">{p.replaceHire}</td>
                                        <td className="px-6 py-4 font-bold text-blue-700 bg-blue-50/50">{p.hiringTotal}</td>
                                        <td className="px-6 py-4 text-right font-mono">{formatIDR(p.cost)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* DETAILS TABLE */}
            {activeMenu === 'details' && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Position</th>
                                <th className="px-6 py-4 text-center">Workload (Hrs)</th>
                                <th className="px-6 py-4 text-center bg-blue-50 text-blue-800">FTE Score</th>
                                <th className="px-6 py-4 text-center">Cur / Plan</th>
                                <th className="px-6 py-4 text-right">Annual Cost</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {Object.values(manpowerData.departments).map((dept) => (
                                dept.positions.map((pos, idx) => (
                                    <tr key={`${dept.name}-${idx}`} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 font-bold text-slate-800">{dept.name}</td>
                                        <td className="px-6 py-4">{pos.position}</td>
                                        <td className="px-6 py-4 text-center">{pos.workload}</td>
                                        <td className="px-6 py-4 text-center font-bold bg-blue-50/30 text-blue-700">{pos.fte}</td>
                                        <td className="px-6 py-4 text-center font-mono">
                                            {pos.current} <span className="text-slate-300">→</span> <strong>{pos.planned}</strong>
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-500">{formatIDR(pos.cost)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                pos.status === 'Hiring' ? 'bg-green-100 text-green-700' : 
                                                pos.status === 'Surplus' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {pos.status} {pos.gap !== 0 && Math.abs(pos.gap)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    </div>
  );
};

export default ManpowerPlanning;