import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  ReferenceLine, Cell, Legend, ComposedChart, Line, CartesianGrid
} from 'recharts';

/**
 * ============================================================================
 * COMP & BEN FAIRNESS SYSTEM v8.1 (Clean UI)
 * ============================================================================
 * Updates:
 * - Removed Menu Icons
 * - Removed Horizontal Scroll (Flex Wrap Layout)
 * - Full Strategic Insight Features (ROI, Action Plan, Deep Dive)
 */

const CompBenFairness = ({ onBack }) => {
  const [view, setView] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeMenu, setActiveMenu] = useState('overview');
  const [filterDept, setFilterDept] = useState('ALL');

  // ============================================================
  // 1. HELPER FUNCTIONS
  // ============================================================
  
  const formatIDR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0 
    }).format(val);
  };

  const formatCompact = (val) => {
    if (!val) return '0';
    if (val >= 1000000000) return (val / 1000000000).toFixed(1) + 'M';
    if (val >= 1000000) return (val / 1000000).toFixed(0) + 'jt';
    return val.toLocaleString();
  };

  // ============================================================
  // 2. CORE LOGIC
  // ============================================================

  const getCompaStatus = (cr) => {
    if (cr < 0.80) return { label: 'Underpaid', color: 'text-red-700 bg-red-50 border-red-200', fill: '#ef4444' };
    if (cr < 0.90) return { label: 'Below Mid', color: 'text-orange-700 bg-orange-50 border-orange-200', fill: '#f97316' };
    if (cr <= 1.10) return { label: 'At Market', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', fill: '#10b981' };
    if (cr <= 1.20) return { label: 'Above Mid', color: 'text-blue-700 bg-blue-50 border-blue-200', fill: '#3b82f6' };
    return { label: 'Overpaid', color: 'text-purple-700 bg-purple-50 border-purple-200', fill: '#a855f7' };
  };

  const processData = (raw) => {
    let stats = {
      totalEmp: 0, totalPayroll: 0, 
      underpaidCount: 0, overpaidCount: 0, anomalyCount: 0,
      buckets: [
        { name: '< 0.8', count: 0, fill: '#ef4444' },
        { name: '0.8-0.9', count: 0, fill: '#f97316' },
        { name: '0.9-1.1', count: 0, fill: '#10b981' },
        { name: '1.1-1.2', count: 0, fill: '#3b82f6' },
        { name: '> 1.2', count: 0, fill: '#a855f7' },
      ],
      depts: {}, grades: {}, gender: {}, anomalies: []
    };

    const employees = raw.map(r => {
      const salary = parseFloat(r['Actual Salary']) || 0;
      const midpoint = parseFloat(r['Grade Midpoint']) || 0;
      const min = parseFloat(r['Grade Min']) || 0;
      const max = parseFloat(r['Grade Max']) || 0;
      const perf = parseFloat(r['Performance Rating']) || 3;
      
      const cr = midpoint ? parseFloat((salary / midpoint).toFixed(2)) : 0;
      const rp = (max - min) ? parseFloat(((salary - min) / (max - min)).toFixed(2)) : 0;
      const status = getCompaStatus(cr);

      // --- AGGREGATION ---
      stats.totalEmp++;
      stats.totalPayroll += salary;
      if (cr < 0.8) { stats.underpaidCount++; stats.buckets[0].count++; }
      else if (cr < 0.9) stats.buckets[1].count++;
      else if (cr <= 1.1) stats.buckets[2].count++;
      else if (cr <= 1.2) stats.buckets[3].count++;
      else { stats.overpaidCount++; stats.buckets[4].count++; }

      // --- ANOMALY DETECTION ---
      let anomalyType = null;
      let interventionCost = 0;
      
      if (perf >= 4.0 && cr < 0.9) {
        anomalyType = 'High Perf / Low Pay';
        interventionCost = (midpoint * 0.95) - salary; 
      }
      else if (cr < 0.8) {
        anomalyType = 'Underpaid';
        interventionCost = (midpoint * 0.85) - salary; 
      }
      else if (cr > 1.2) {
        anomalyType = 'Overpaid';
        interventionCost = 0; 
      }
      else if (perf < 2.5 && cr > 1.0) {
        anomalyType = 'Low Perf / High Pay';
        interventionCost = 0;
      }

      if (anomalyType) {
        stats.anomalyCount++;
        stats.anomalies.push({
            name: r['Employee Name'],
            dept: r['Department'],
            grade: r['Grade'],
            salary, midpoint, cr, perf, anomalyType, interventionCost: Math.max(0, interventionCost),
            attritionCost: salary * 1.3 
        });
      }

      const dName = r['Department'] || 'Other';
      if (!stats.depts[dName]) stats.depts[dName] = { name: dName, count: 0, sumCR: 0, under: 0, over: 0, sumSal: 0 };
      stats.depts[dName].count++;
      stats.depts[dName].sumCR += cr;
      stats.depts[dName].sumSal += salary;
      if (cr < 0.9) stats.depts[dName].under++;
      if (cr > 1.1) stats.depts[dName].over++;

      const gName = r['Grade'] || 'Unassigned';
      if (!stats.grades[gName]) stats.grades[gName] = { name: gName, count: 0, sumSal: 0, sumCR: 0, min, mid: midpoint, max, under: 0, at: 0, over: 0 };
      stats.grades[gName].count++;
      stats.grades[gName].sumSal += salary;
      stats.grades[gName].sumCR += cr;
      if (cr < 0.9) stats.grades[gName].under++;
      else if (cr > 1.1) stats.grades[gName].over++;
      else stats.grades[gName].at++;

      const gdr = r['Gender'] || 'Unknown';
      if (!stats.gender[gdr]) stats.gender[gdr] = { name: gdr, count: 0, sumSal: 0 };
      stats.gender[gdr].count++;
      stats.gender[gdr].sumSal += salary;

      return { ...r, cr, rp, status };
    });

    const avgCR = stats.totalEmp ? (employees.reduce((a,b)=>a+b.cr,0) / employees.length).toFixed(2) : 0;
    
    const depts = Object.values(stats.depts).map(d => ({
        ...d, avgCR: parseFloat((d.sumCR / d.count).toFixed(2)), avgSal: Math.round(d.sumSal / d.count)
    })).sort((a,b) => a.avgCR - b.avgCR);

    const grades = Object.values(stats.grades).map(g => ({
        ...g, avgSal: Math.round(g.sumSal / g.count), avgCR: parseFloat((g.sumCR / g.count).toFixed(2)), spread: g.min ? ((g.max/g.min)).toFixed(2) : 0
    })).sort((a,b) => a.mid - b.mid);

    const genderGroups = Object.values(stats.gender).map(g => ({
        ...g, avgSal: Math.round(g.sumSal / g.count)
    }));
    const refAvg = Math.max(...genderGroups.map(g=>g.avgSal), 1);
    genderGroups.forEach(g => {
        g.index = parseFloat((g.avgSal / refAvg).toFixed(2));
        g.gap = parseFloat(((1 - g.index) * 100).toFixed(1));
    });

    const recommendations = {
        p1: stats.anomalies.filter(a => a.anomalyType === 'High Perf / Low Pay' || a.anomalyType === 'Underpaid'),
        p2: stats.anomalies.filter(a => a.anomalyType === 'Overpaid'),
        p3: stats.anomalies.filter(a => a.anomalyType === 'Low Perf / High Pay')
    };

    return { 
        employees, avgCR, totalPayroll: stats.totalPayroll, 
        underpaid: stats.underpaidCount, overpaid: stats.overpaidCount, anomalyCount: stats.anomalyCount,
        buckets: stats.buckets, depts, grades, genderGroups, anomalies: stats.anomalies, recommendations 
    };
  };

  // ============================================================
  // 3. HANDLERS
  // ============================================================

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (!json.length) throw new Error("File kosong");
        setData(processData(json));
        setView('dashboard');
      } catch(err) { alert(err.message); }
      finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = [['Employee Name','Department','Position','Grade','Gender','Actual Salary','Grade Min','Grade Midpoint','Grade Max','Performance Rating']];
    const dummy = [
        ['Andi', 'IT', 'Dev', 'G4', 'Male', 12000000, 10000000, 13000000, 16000000, 4.5],
        ['Budi', 'Sales', 'Manager', 'G5', 'Male', 18000000, 15000000, 20000000, 25000000, 3.0]
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...dummy]);
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, "Template_CompBen.xlsx");
  };

  // ============================================================
  // 4. RENDER
  // ============================================================

  if (view === 'upload') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <button onClick={onBack} className="fixed top-6 left-6 px-4 py-2 bg-white text-slate-700 rounded-lg shadow-sm hover:bg-slate-100 transition z-50">← Kembali</button>
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-slate-200">
            <div className="w-full md:w-5/12 p-10 flex flex-col justify-center items-center text-center bg-teal-50 border-r border-teal-100">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 text-4xl shadow-sm">⚖️</div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Comp & Ben Fairness</h1>
                <p className="text-slate-500 mb-8 text-sm">Internal Equity & Pay Competitiveness</p>
                <div className="w-full space-y-3">
                    <label className="cursor-pointer block w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold shadow-lg transition transform hover:-translate-y-1 text-sm">
                        <span>📂 Upload Data</span>
                        <input type="file" className="hidden" accept=".xlsx" onChange={handleUpload} />
                    </label>
                    <button onClick={downloadTemplate} className="block w-full bg-white border border-teal-200 hover:border-teal-400 text-teal-600 py-3 rounded-xl font-bold transition text-sm">📥 Template Excel</button>
                </div>
            </div>
            <div className="w-full md:w-7/12 p-10 bg-white">
                <h3 className="font-bold text-slate-800 mb-4">Fitur Analisa</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="block font-bold text-slate-800 mb-1">📊 Compa-Ratio</span>
                        Posisi gaji vs pasar.
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="block font-bold text-slate-800 mb-1">💡 Action Plan</span>
                        Rekomendasi P1/P2/P3.
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="block font-bold text-slate-800 mb-1">🚻 Pay Equity</span>
                        Gender pay gap check.
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="block font-bold text-slate-800 mb-1">💰 ROI Calc</span>
                        Cost of Inaction analysis.
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col animate-fade-in">
        {/* Navbar */}
        <div className="bg-white border-b sticky top-0 z-30 px-8 py-4 flex justify-between items-center shadow-sm">
            <div>
                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Fairness Analytics</h1>
                <p className="text-xs text-slate-400 font-medium">{data.employees.length} Employees • Payroll: {formatCompact(data.totalPayroll)}</p>
            </div>
            
            {/* UPDATED MENU: No Icons, No Scroll, Flex Wrap */}
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
                {[
                    {id:'overview', label:'Overview'},
                    {id:'comparatio', label:'Compa-Ratio'},
                    {id:'department', label:'By Dept'},
                    {id:'grade', label:'Grade Structure'},
                    {id:'equity', label:'Pay Equity'},
                    {id:'anomaly', label:'Anomaly Detector'},
                    {id:'recommendations', label:'Recommendations'}
                ].map(m => (
                    <button key={m.id} onClick={()=>setActiveMenu(m.id)}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeMenu===m.id ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            <button onClick={()=>setView('upload')} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition">Exit</button>
        </div>

        <div className="p-8 max-w-7xl mx-auto w-full flex-1">
            
            {/* 1. OVERVIEW */}
            {activeMenu === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">Avg Compa-Ratio</p>
                            <p className="text-3xl font-extrabold text-slate-800 mt-2">{data.avgCR}</p>
                            <p className="text-xs text-emerald-600 font-bold mt-1">Target: 1.00 (Market)</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">Underpaid Staff</p>
                            <p className="text-3xl font-extrabold text-red-600 mt-2">{data.underpaid}</p>
                            <p className="text-xs text-slate-400 mt-1">CR &lt; 0.90</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">Overpaid Staff</p>
                            <p className="text-3xl font-extrabold text-purple-600 mt-2">{data.overpaid}</p>
                            <p className="text-xs text-slate-400 mt-1">CR &gt; 1.10</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">Anomalies</p>
                            <p className="text-3xl font-extrabold text-orange-600 mt-2">{data.anomalyCount}</p>
                            <p className="text-xs text-slate-400 mt-1">Need Action</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-6">📊 Compa-Ratio Distribution</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.buckets}>
                                    <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
                                    <YAxis fontSize={12} allowDecimals={false} stroke="#94a3b8" />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="count" radius={[4,4,0,0]}>
                                        {data.buckets.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. COMPA RATIO (TABLE) */}
            {activeMenu === 'comparatio' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                    <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50">
                        <select 
                            className="px-4 py-2 border rounded-lg text-sm font-bold text-slate-600 focus:outline-none"
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                        >
                            <option value="ALL">All Departments</option>
                            {data.depts.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-700 font-bold border-b">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Gaji vs Midpoint</th>
                                <th className="px-6 py-4 text-center">Compa-Ratio</th>
                                <th className="px-6 py-4 text-right">Range Pen.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.employees
                                .filter(e => filterDept === 'ALL' || e.dept === filterDept)
                                .sort((a,b) => a.cr - b.cr)
                                .map((e, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{e.name}</div>
                                        <div className="text-xs text-slate-400">{e.dept} • {e.grade}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${e.status.color}`}>
                                            {e.status.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-xs">
                                        {formatCompact(e.salary)} <span className="text-slate-300">/</span> {formatCompact(e.midpoint)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 w-24">
                                                <div 
                                                    className="h-1.5 rounded-full" 
                                                    style={{ width: `${Math.min(e.cr*80, 100)}%`, backgroundColor: e.status.fill }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-bold">{e.cr}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-xs">
                                        {(e.rp * 100).toFixed(0)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}

            {/* 3. BY DEPARTMENT */}
            {activeMenu === 'department' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-6">Avg Compa-Ratio by Department</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={data.depts} margin={{left: 20}}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" domain={[0.7, 1.3]} />
                                    <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12}} />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <ReferenceLine x={1} stroke="black" strokeDasharray="3 3" label="Midpoint" />
                                    <Bar dataKey="avgCR" barSize={20}>
                                        {data.depts.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.avgCR < 0.9 ? '#ef4444' : entry.avgCR > 1.1 ? '#a855f7' : '#10b981'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {data.depts.map((d, i) => (
                            <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-slate-800">{d.name}</h4>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${d.avgCR < 0.9 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        CR: {d.avgCR}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm text-slate-600">
                                    <div className="flex justify-between"><span>Employees:</span> <span className="font-bold">{d.count}</span></div>
                                    <div className="flex justify-between"><span>Avg Salary:</span> <span className="font-bold">{formatCompact(d.avgSal)}</span></div>
                                    <div className="flex justify-between">
                                        <span>Issues:</span> 
                                        <span>
                                            <span className="text-red-600 font-bold">{d.under} Under</span> • <span className="text-purple-600 font-bold">{d.over} Over</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. GRADE STRUCTURE */}
            {activeMenu === 'grade' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-700 font-bold border-b">
                            <tr>
                                <th className="px-6 py-4">Grade</th>
                                <th className="px-6 py-4 text-center">Headcount</th>
                                <th className="px-6 py-4 text-center">Avg Salary</th>
                                <th className="px-6 py-4 text-center">Spread</th>
                                <th className="px-6 py-4 text-center">Avg CR</th>
                                <th className="px-6 py-4 text-center">Distribution (Low / Mid / High)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.grades.map((g, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-800">{g.name}</td>
                                    <td className="px-6 py-4 text-center">{g.count}</td>
                                    <td className="px-6 py-4 text-center font-mono">{formatCompact(g.avgSal)}</td>
                                    <td className="px-6 py-4 text-center font-mono">{g.spread}x</td>
                                    <td className="px-6 py-4 text-center font-bold">{g.avgCR}</td>
                                    <td className="px-6 py-4 text-center text-xs">
                                        <span className="text-red-600 font-bold">{g.under}</span> / <span className="text-green-600 font-bold">{g.at}</span> / <span className="text-purple-600 font-bold">{g.over}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 5. PAY EQUITY */}
            {activeMenu === 'equity' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    {data.genderGroups.map((g, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{g.name}</h3>
                                <p className="text-slate-500 text-sm">Avg: {formatIDR(g.avgSal)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 uppercase font-bold">Equity Index</p>
                                <p className={`text-3xl font-extrabold ${g.index < 0.95 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {g.index}
                                </p>
                                <span className={`text-xs px-2 py-1 rounded font-bold ${g.gap > 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    Gap: {g.gap}% ({g.gap > 10 ? 'CRITICAL' : g.gap > 5 ? 'WARNING' : 'OK'})
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 6. ANOMALY DETECTOR */}
            {activeMenu === 'anomaly' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-700">⚠️ Detected Anomalies</h3>
                        <div className="flex gap-2">
                            <select className="text-xs border rounded p-1 text-slate-600 focus:outline-none" onChange={(e)=>setFilterDept(e.target.value)}>
                                <option value="ALL">All Depts</option>
                                {[...new Set(data.employees.map(d=>d.dept))].map(d=><option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-white text-xs uppercase text-slate-700 font-bold border-b">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Anomaly Type</th>
                                <th className="px-6 py-4 text-center">Compa-Ratio</th>
                                <th className="px-6 py-4 text-center">Performance</th>
                                <th className="px-6 py-4 text-right">Action Plan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.anomalies
                                .filter(e => filterDept === 'ALL' || e.dept === filterDept)
                                .map((e, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-800">{e.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${e.anomalyType.includes('High Perf') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {e.anomalyType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-xs">
                                        CR: <strong>{e.cr}</strong> | Perf: <strong>{e.perf}</strong>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-500">
                                        {formatIDR(e.interventionCost)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 7. RECOMMENDATIONS (Action Plan) */}
            {activeMenu === 'recommendations' && (
                <div className="space-y-8 animate-fade-in">
                    
                    {/* ROI PANEL */}
                    <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl">
                        <h3 className="font-bold text-xl mb-4">💰 ROI Analysis: Cost of Inaction</h3>
                        <div className="grid grid-cols-3 gap-8">
                            <div>
                                <p className="text-slate-400 text-xs uppercase">Potential Attrition Cost</p>
                                <p className="text-3xl font-extrabold text-red-400">{formatCompact(data.anomalies.reduce((a,b)=>a+b.attritionCost,0))}</p>
                                <p className="text-xs text-slate-500 mt-1">If key anomalies leave (130% Salary)</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs uppercase">Intervention Cost</p>
                                <p className="text-3xl font-extrabold text-yellow-400">{formatCompact(data.anomalies.reduce((a,b)=>a+b.interventionCost,0))}</p>
                                <p className="text-xs text-slate-500 mt-1">Total adjustment needed</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs uppercase">Net Savings</p>
                                <p className="text-3xl font-extrabold text-emerald-400">
                                    {formatCompact(data.anomalies.reduce((a,b)=>a+b.attritionCost,0) - data.anomalies.reduce((a,b)=>a+b.interventionCost,0))}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Positive ROI</p>
                            </div>
                        </div>
                    </div>

                    {/* ACTION PLAN */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                            <h3 className="font-bold text-red-800 mb-3">🔴 P1 - CRITICAL (This Week)</h3>
                            <ul className="text-sm text-red-700 space-y-2 list-disc list-inside">
                                <li><strong>High Perf / Low Pay:</strong> {data.recommendations.p1.length} employees found. Immediate market adjustment needed.</li>
                                <li><strong>Underpaid:</strong> Salary adjustment to min 0.85 CR.</li>
                            </ul>
                        </div>
                        <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                            <h3 className="font-bold text-orange-800 mb-3">🟠 P2 - HIGH (This Month)</h3>
                            <ul className="text-sm text-orange-700 space-y-2 list-disc list-inside">
                                <li><strong>Overpaid:</strong> {data.recommendations.p2.length} employees. Freeze increment & evaluate job scope.</li>
                                <li>Review departments with avg CR &lt; 0.9.</li>
                            </ul>
                        </div>
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                            <h3 className="font-bold text-blue-800 mb-3">🔵 P3 - MEDIUM (This Quarter)</h3>
                            <ul className="text-sm text-blue-700 space-y-2 list-disc list-inside">
                                <li><strong>Low Perf / High Pay:</strong> {data.recommendations.p3.length} employees. Initiate PIP.</li>
                                <li>Address Grade Spreads &gt; 1.6x.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};

export default CompBenFairness;