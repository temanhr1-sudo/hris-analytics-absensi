import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

// ─── KONFIGURASI WARNA (Unified Light Theme) ──────────────────────────────────
const DEPT_COLORS = ['#6366f1', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];
const LEVEL_COLORS = { 'C-Suite': '#ef4444', 'VP': '#f97316', 'Director': '#f59e0b', 'Manager': '#10b981', 'Senior': '#3b82f6', 'Mid': '#8b5cf6', 'Junior': '#6b7280' };
const TIE_COLORS = { Strong: '#10b981', Moderate: '#f59e0b', Weak: '#cbd5e1' }; 

// ─── ALGORITMA CENTRALITY ─────────────────────────────────────────────────────
const buildAdj = (edges, nodes) => {
  const adj = {};
  nodes.forEach(n => { adj[n.id] = []; });
  edges.forEach(e => {
    if (adj[e.source]) adj[e.source].push(e.target);
    if (adj[e.target]) adj[e.target].push(e.source);
  });
  return adj;
};

const bfsDist = (start, adj) => {
  const dist = { [start]: 0 }, q = [start];
  while (q.length) {
    const c = q.shift();
    (adj[c] || []).forEach(nb => { if (dist[nb] === undefined) { dist[nb] = dist[c] + 1; q.push(nb); } });
  }
  return dist;
};

const calcCentrality = (nodes, edges) => {
  const adj = buildAdj(edges, nodes);
  const N = nodes.length;
  if (N < 2) return nodes.map(n => ({ ...n, degree: 0, betweenness: 0, closeness: 0, influence: 0 }));
  
  const degMap = {};
  nodes.forEach(n => { degMap[n.id] = (adj[n.id] || []).length; });
  
  const closeMap = {};
  nodes.forEach(n => {
    const d = bfsDist(n.id, adj);
    const reach = Object.values(d).filter(x => x > 0);
    closeMap[n.id] = reach.length ? reach.length / reach.reduce((a, b) => a + b, 0) : 0;
  });
  
  const btwMap = {};
  nodes.forEach(n => { btwMap[n.id] = 0; });
  nodes.forEach(s => {
    const prevMap = {}, visited = { [s.id]: true }, q = [s.id];
    while (q.length) { const c = q.shift(); (adj[c] || []).forEach(nb => { if (!visited[nb]) { visited[nb] = true; prevMap[nb] = c; q.push(nb); } }); }
    nodes.forEach(t => {
      if (t.id === s.id || !prevMap[t.id]) return;
      let c = t.id;
      while (c && prevMap[c] && prevMap[c] !== s.id) { btwMap[c] = (btwMap[c] || 0) + 1; c = prevMap[c]; }
    });
  });

  const mxD = Math.max(1, ...Object.values(degMap));
  const mxB = Math.max(1, ...Object.values(btwMap));
  const mxC = Math.max(0.001, ...Object.values(closeMap));
  
  return nodes.map(n => {
    const dN = degMap[n.id] / mxD, bN = (btwMap[n.id] || 0) / mxB, cN = closeMap[n.id] / mxC;
    return {
      ...n, degree: degMap[n.id], betweenness: Math.round(bN * 100), closeness: Math.round(cN * 100),
      influence: Math.round(dN * 0.4 + bN * 0.3 + cN * 0.3) * 100
    };
  });
};

// ─── FORCE LAYOUT ─────────────────────────────────────────────────────────────
const forceLayout = (nodes, edges, W, H, iter = 120) => {
  const k = Math.sqrt(W * H / Math.max(nodes.length, 1));
  let pos = nodes.map((n, i) => ({
    id: n.id,
    x: W / 2 + Math.cos(2 * Math.PI * i / nodes.length) * (W * 0.35),
    y: H / 2 + Math.sin(2 * Math.PI * i / nodes.length) * (H * 0.35)
  }));
  
  for (let t = 0; t < iter; t++) {
    const f = pos.map(() => ({ fx: 0, fy: 0 }));
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
        const d = Math.max(1, Math.sqrt(dx * dx + dy * dy)), fr = (k * k) / d;
        f[i].fx += dx / d * fr; f[i].fy += dy / d * fr; f[j].fx -= dx / d * fr; f[j].fy -= dy / d * fr;
      }
    }
    edges.forEach(e => {
      const si = pos.findIndex(p => p.id === e.source), ti = pos.findIndex(p => p.id === e.target);
      if (si < 0 || ti < 0) return;
      const dx = pos[ti].x - pos[si].x, dy = pos[ti].y - pos[si].y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy)), fa = (d * d) / k;
      f[si].fx += dx / d * fa * 0.5; f[si].fy += dy / d * fa * 0.5;
      f[ti].fx -= dx / d * fa * 0.5; f[ti].fy -= dy / d * fa * 0.5;
    });
    const temp = k * Math.max(0.01, 1 - t / iter);
    pos = pos.map((p, i) => {
      const m = Math.sqrt(f[i].fx ** 2 + f[i].fy ** 2) || 0.001;
      const disp = Math.min(temp, m);
      return {
        id: p.id,
        x: Math.max(28, Math.min(W - 28, p.x + f[i].fx / m * disp)),
        y: Math.max(28, Math.min(H - 28, p.y + f[i].fy / m * disp))
      };
    });
  }
  return pos;
};

// ─── PROCESS DATA ─────────────────────────────────────────────────────────────
const processData = (nodeRows, edgeRows) => {
  if (!nodeRows.length) return null;
  const nodes = nodeRows.map(r => ({
    id: (r['Employee ID'] || r['Name'] || '').toString().trim(),
    name: r['Name'] || '—', dept: r['Department'] || '—',
    level: r['Level'] || 'Mid', role: r['Role'] || '—',
    location: r['Location'] || '—', tenure: parseFloat(r['Tenure (Years)']) || 0,
    perf: parseFloat(r['Performance']) || 0,
  })).filter(n => n.id);
  
  const edges = edgeRows.map(r => ({
    source: (r['Source ID'] || r['From'] || '').toString().trim(),
    target: (r['Target ID'] || r['To'] || '').toString().trim(),
    tie: r['Tie Strength'] || 'Moderate',
    type: r['Interaction Type'] || 'Collaboration',
    freq: parseFloat(r['Frequency (per month)']) || 1,
  })).filter(e => e.source && e.target && e.source !== e.target);
  
  const enriched = calcCentrality(nodes, edges);
  const depts = [...new Set(nodes.map(n => n.dept))];
  const deptColor = {};
  depts.forEach((d, i) => { deptColor[d] = DEPT_COLORS[i % DEPT_COLORS.length]; });
  
  const connIds = new Set([...edges.map(e => e.source), ...edges.map(e => e.target)]);
  const isolated = enriched.filter(n => !connIds.has(n.id));
  
  const crossEdges = edges.filter(e => {
    const s = enriched.find(n => n.id === e.source), t = enriched.find(n => n.id === e.target);
    return s && t && s.dept !== t.dept;
  });
  
  const deptSilos = depts.map(d => {
    const dNodes = enriched.filter(n => n.dept === d);
    const dEdges = edges.filter(e => {
      const s = enriched.find(n => n.id === e.source), t = enriched.find(n => n.id === e.target);
      return s?.dept === d || t?.dept === d;
    });
    const cEdges = crossEdges.filter(e => {
      const s = enriched.find(n => n.id === e.source), t = enriched.find(n => n.id === e.target);
      return s?.dept === d || t?.dept === d;
    });
    const r = dEdges.length ? cEdges.length / dEdges.length : 0;
    return {
      dept: d, nodes: dNodes.length, edges: dEdges.length, crossEdges: cEdges.length,
      crossRatio: +(r * 100).toFixed(1), isSilo: r < 0.1
    };
  });
  
  const top = [...enriched].sort((a, b) => b.influence - a.influence).slice(0, 10);
  
  return {
    nodes: enriched, edges, depts, deptColor, crossEdges, isolated, deptSilos, topInfluencers: top,
    stats: {
      totalNodes: nodes.length, totalEdges: edges.length,
      avgDegree: +(edges.length * 2 / Math.max(nodes.length, 1)).toFixed(1),
      density: +((edges.length * 2) / (Math.max(nodes.length * (nodes.length - 1), 1)) * 100).toFixed(1),
      crossDeptPct: +(crossEdges.length / Math.max(edges.length, 1) * 100).toFixed(1),
      isolatedCount: isolated.length,
    },
  };
};

// ─── TEMPLATE DOWNLOAD ────────────────────────────────────────────────────────
const downloadTemplate = () => {
  const wb = XLSX.utils.book_new();
  const n = [
    ['Employee ID', 'Name', 'Department', 'Level', 'Role', 'Location', 'Tenure (Years)', 'Performance'],
    ['E001', 'Andi Pratama', 'Engineering', 'Senior', 'Backend Engineer', 'Jakarta', 5, 4.2],
    ['E002', 'Budi Santoso', 'Engineering', 'Manager', 'Eng Manager', 'Jakarta', 8, 4.5],
    ['E003', 'Citra Dewi', 'Marketing', 'Senior', 'Brand Manager', 'Jakarta', 4, 4.1],
    ['E004', 'Dian Kusuma', 'HR', 'Mid', 'HR Generalist', 'Surabaya', 2, 3.8],
    ['E005', 'Eko Wijaya', 'Finance', 'Senior', 'Finance Analyst', 'Jakarta', 6, 4.3],
    ['E006', 'Fira Handayani', 'Operations', 'Manager', 'Ops Manager', 'Jakarta', 7, 4.4],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(n);
  XLSX.utils.book_append_sheet(wb, ws1, 'NODES');
  
  const e = [
    ['Source ID', 'Target ID', 'Tie Strength', 'Interaction Type', 'Frequency (per month)'],
    ['E001', 'E002', 'Strong', 'Collaboration', 20], ['E001', 'E003', 'Weak', 'Cross-dept', 5],
    ['E002', 'E005', 'Moderate', 'Collaboration', 10], ['E003', 'E004', 'Strong', 'Reports To', 15],
    ['E005', 'E001', 'Moderate', 'Collaboration', 8],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(e);
  XLSX.utils.book_append_sheet(wb, ws2, 'EDGES');
  XLSX.writeFile(wb, 'Template_ONA_Indonesia.xlsx');
};

// ─── NETWORK GRAPH COMPONENT (Light Mode) ─────────────────────────────────────
const NetworkGraph = ({ data, W = 800, H = 520, highlight, onNodeClick, colorBy = 'dept' }) => {
  const [pos, setPos] = useState(null);
  const [hov, setHov] = useState(null);
  
  useEffect(() => {
    if (!data || !data.nodes.length) return;
    setPos(null);
    setTimeout(() => { setPos(forceLayout(data.nodes, data.edges, W, H)); }, 50);
  }, [data, W, H]);

  if (!pos) return (
    <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl" style={{ height: H }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full animate-spin mx-auto mb-3 border-4 border-indigo-200 border-t-indigo-600" />
        <p className="text-xs font-bold text-slate-500">Menghitung tata letak jaringan...</p>
      </div>
    </div>
  );

  const gp = id => pos.find(p => p.id === id);
  const getColor = n => {
    if (colorBy === 'dept') return data.deptColor[n.dept] || '#94a3b8';
    if (colorBy === 'level') return LEVEL_COLORS[n.level] || '#94a3b8';
    return n.influence >= 70 ? '#10b981' : n.influence >= 40 ? '#f59e0b' : '#94a3b8';
  };
  const getR = n => Math.max(8, Math.min(22, 9 + n.degree * 1.4));
  const isLit = n => !highlight || n.id === highlight || data.edges.some(e => (e.source === highlight && e.target === n.id) || (e.target === highlight && e.source === n.id));

  return (
    <svg width={W} height={H} style={{ borderRadius: 12, display: 'block', background: '#f8fafc' }}>
      <rect width={W} height={H} fill="#f8fafc" />
      {/* Grid Pattern */}
      {Array.from({ length: 10 }, (_, i) => Array.from({ length: 7 }, (_, j) => (
        <circle key={i + '-' + j} cx={i * (W / 9)} cy={j * (H / 6)} r="1.5" fill="#cbd5e1" />
      )))}
      {/* Edges */}
      {data.edges.map((e, i) => {
        const sp = gp(e.source), tp = gp(e.target); if (!sp || !tp) return null;
        const sn = data.nodes.find(n => n.id === e.source), tn = data.nodes.find(n => n.id === e.target);
        const dim = highlight && !isLit(sn) && !isLit(tn);
        return <line key={i} x1={sp.x} y1={sp.y} x2={tp.x} y2={tp.y}
          stroke={TIE_COLORS[e.tie] || '#cbd5e1'}
          strokeWidth={e.tie === 'Strong' ? 2 : e.tie === 'Moderate' ? 1 : 0.5}
          strokeOpacity={dim ? 0.05 : 0.6}
          strokeDasharray={e.tie === 'Weak' ? '4 3' : undefined} />;
      })}
      {/* Nodes */}
      {data.nodes.map(node => {
        const p = gp(node.id); if (!p) return null;
        const r = getR(node), col = getColor(node), dim = highlight && !isLit(node);
        const hl = node.id === highlight, hovered = hov === node.id;
        return (
          <g key={node.id} transform={'translate(' + p.x + ',' + p.y + ')'}
            style={{ cursor: 'pointer', opacity: dim ? 0.1 : 1 }}
            onMouseEnter={() => setHov(node.id)} onMouseLeave={() => setHov(null)}
            onClick={() => onNodeClick && onNodeClick(node)}>
            
            {/* Outer Glow for Hover/Highlight */}
            {(hovered || hl) && <circle r={r + 6} fill={col} opacity="0.2" />}
            
            {/* Main Circle */}
            <circle r={r} fill={col} stroke="white" strokeWidth={2} className="transition-all duration-300" />
            
            {/* Label */}
            {(hovered || hl || r > 15) &&
              <text y={r + 12} textAnchor="middle" fill="#334155" fontSize="10" fontWeight="600" style={{ pointerEvents: 'none', textShadow: '0 1px 2px white' }}>
                {node.name.split(' ')[0]}
              </text>}
            
            {/* Tooltip on Hover */}
            {hovered && (
              <g transform={'translate(' + (r + 8) + ',' + (-(r + 8)) + ')'} style={{pointerEvents:'none'}}>
                <rect x="0" y="-30" width="140" height="65" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" className="shadow-lg" />
                <text x="10" y="-14" fill="#0f172a" fontSize="11" fontWeight="700">{node.name}</text>
                <text x="10" y="2" fill="#64748b" fontSize="10">{node.dept} · {node.level}</text>
                <text x="10" y="18" fill="#6366f1" fontSize="10" fontWeight="600">Infl: {node.influence} · Deg: {node.degree}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─── KOMPONEN BANTUAN UI ───
const HBar = ({ label, value, max, color, sub }) => (
  <div className="flex items-center gap-3">
    <p className="text-xs font-semibold text-slate-600 w-28 flex-shrink-0 truncate">{label}</p>
    <div className="flex-1 bg-slate-100 rounded-full h-2">
      <div className="h-2 rounded-full transition-all" style={{ width: Math.min(100, (value / Math.max(max, 1)) * 100) + '%', background: color }} />
    </div>
    <span className="text-xs font-bold w-8 text-right text-slate-700">{value}</span>
    {sub && <span className="text-[10px] text-slate-400 w-10 flex-shrink-0">{sub}</span>}
  </div>
);

const KpiCard = ({ icon, label, value, sub, color = 'indigo' }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500 opacity-5 rounded-full -mr-10 -mt-10`} />
    <span className="text-3xl block mb-2">{icon}</span>
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
    <p className="text-2xl font-black text-slate-800 mb-0.5">{value}</p>
    {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function OrgNetworkAnalysis({ onBack }) {
  const [view, setView] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [menu, setMenu] = useState('overview');
  const [highlight, setHL] = useState(null);
  const [colorBy, setColorBy] = useState('dept');
  const [filterDept, setFilterDept] = useState('SEMUA');
  const graphRef = useRef(null);
  const [gSize, setGSize] = useState({ w: 800, h: 500 });

  useEffect(() => {
    const upd = () => { if (graphRef.current) { const w = graphRef.current.offsetWidth; setGSize({ w: Math.max(380, w), h: Math.max(380, Math.round(w * 0.6)) }); } };
    upd(); window.addEventListener('resize', upd); return () => window.removeEventListener('resize', upd);
  }, [view, menu]);

  const handleUpload = e => {
    const file = e.target.files[0]; if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
        let nR = [], eR = [];
        wb.SheetNames.forEach(name => {
          const json = XLSX.utils.sheet_to_json(wb.Sheets[name]);
          if (!json.length) return;
          const k = Object.keys(json[0]);
          if (k.includes('Employee ID') || k.includes('Name')) nR = [...nR, ...json];
          if (k.includes('Source ID') || k.includes('From')) eR = [...eR, ...json];
        });
        const result = processData(nR, eR);
        if (!result) { alert('Format tidak dikenali. Gunakan template.'); return; }
        setData(result); setView('dashboard'); setMenu('overview');
      } catch (err) { alert('Error: ' + err.message); }
      finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportReport = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['LAPORAN ONA'], ['Tanggal:', new Date().toLocaleString('id-ID')], [''],
      ['Total Nodes', data.stats.totalNodes], ['Total Edges', data.stats.totalEdges],
      ['Avg Degree', data.stats.avgDegree], ['Kepadatan', data.stats.density + '%'],
      ['Lintas Dept %', data.stats.crossDeptPct + '%'], ['Terisolasi', data.stats.isolatedCount],
    ]), 'Ringkasan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.nodes), 'Detail Node');
    XLSX.writeFile(wb, 'Laporan_ONA.xlsx');
  };

  const fData = useMemo(() => {
    if (!data) return null;
    if (filterDept === 'SEMUA') return data;
    const nodes = data.nodes.filter(n => n.dept === filterDept);
    const ids = new Set(nodes.map(n => n.id));
    return { ...data, nodes, edges: data.edges.filter(e => ids.has(e.source) && ids.has(e.target)) };
  }, [data, filterDept]);

  const MENUS = [
    { id: 'overview', label: 'Ringkasan' },
    { id: 'graph', label: 'Grafik Jaringan' },
    { id: 'influencers', label: 'Influencer' },
    { id: 'silos', label: 'Analisa Silo' },
    { id: 'individuals', label: 'Profil Individu' },
  ];

  if (view === 'upload') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans relative">
      {onBack && <button onClick={onBack} className="absolute top-6 left-6 z-50 px-4 py-2 bg-white text-slate-700 rounded-lg shadow-sm font-bold text-sm border border-slate-200">← Kembali</button>}
      
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6">
        {/* Kiri: Form Upload */}
        <div className="flex-1 bg-white rounded-3xl shadow-xl p-10 text-center border border-slate-200 flex flex-col justify-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm text-indigo-600">🕸️</div>
          <h1 className="text-4xl font-black text-slate-800 mb-2">Network <span className="text-indigo-600">Pulse</span></h1>
          <p className="text-slate-500 mb-8 text-sm">Organizational Network Analysis (ONA)</p>
          
          {loading ? (
            <div className="py-8"><p className="text-indigo-600 font-bold animate-pulse text-lg">Memproses topologi jaringan...</p></div>
          ) : (
            <>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Mulai Analisa</h3>
                <p className="text-xs mb-6 text-slate-500">Upload Excel yang berisi informasi Karyawan (Nodes) dan Interaksi (Edges).</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <label className="cursor-pointer flex-1">
                    <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" />
                    <span className="block w-full px-6 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-transform transform hover:-translate-y-1">📂 Upload Data</span>
                  </label>
                  <button onClick={downloadTemplate} className="flex-1 px-6 py-3 rounded-xl font-bold text-sm bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition">
                    📥 Unduh Template
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">Pastikan menggunakan format template yang telah disediakan.</p>
            </>
          )}
        </div>

        {/* Kanan: Panduan Panel */}
        <div className="w-full md:w-80 bg-white rounded-3xl shadow-lg border border-slate-200 p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <span className="text-2xl">📖</span>
            <h2 className="text-lg font-bold text-slate-800">Panduan ONA</h2>
          </div>
          
          <div className="space-y-5 overflow-y-auto flex-1 pr-2" style={{maxHeight: '400px'}}>
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"/> Sentralitas Derajat (Degree)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Mengukur seberapa banyak koneksi langsung yang dimiliki seseorang. Angka tinggi menunjukkan orang tersebut sangat aktif berjejaring.</p>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"/> Sentralitas Antara (Betweenness)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Mengukur seberapa sering seseorang menjadi jembatan informasi antar kelompok. Mereka adalah "Broker" dalam jaringan.</p>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"/> Sentralitas Dekat (Closeness)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Menghitung rata-rata jarak terpendek ke semua orang lain. Semakin tinggi, semakin cepat ia bisa menyebarkan informasi.</p>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"/> Deteksi Silo</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Mendeteksi departemen yang jarang berinteraksi dengan departemen lain (terisolasi) sehingga berpotensi menghambat inovasi perusahaan.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30 px-8 py-4 shadow-sm">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <div>
              <button onClick={() => setView('upload')} className="text-xs mb-1 font-bold text-indigo-500">← Upload Baru</button>
              <h1 className="text-xl font-extrabold text-slate-800">Network <span className="text-indigo-600">Pulse</span></h1>
              <p className="text-xs text-slate-500 font-medium">{data.stats.totalNodes} node · {data.stats.totalEdges} koneksi · Kepadatan {data.stats.density}%</p>
            </div>
            <div className="flex gap-2 items-center flex-wrap justify-end">
              {menu === 'graph' && <>
                <select value={colorBy} onChange={e => setColorBy(e.target.value)} className="text-xs px-3 py-2 rounded-lg font-semibold bg-slate-100 text-slate-600 border-none outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="dept">Warna: Dept</option>
                  <option value="level">Warna: Level</option>
                  <option value="influence">Warna: Pengaruh</option>
                </select>
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="text-xs px-3 py-2 rounded-lg font-semibold bg-slate-100 text-slate-600 border-none outline-none focus:ring-2 focus:ring-indigo-500">
                  {['SEMUA', ...data.depts].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </>}
              {highlight && <button onClick={() => setHL(null)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100">Reset</button>}
              <button onClick={exportReport} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">Ekspor Laporan</button>
              <button onClick={onBack} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100">Keluar</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl">
            {MENUS.map(m => (
              <button key={m.id} onClick={() => setMenu(m.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${menu === m.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">
        
        {/* ══ OVERVIEW ══ */}
        {menu === 'overview' && <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon="🔵" label="Total Nodes" value={data.stats.totalNodes} sub="Karyawan Aktif" color="indigo" />
            <KpiCard icon="🔗" label="Total Koneksi" value={data.stats.totalEdges} sub="Interaksi Terdaftar" color="purple" />
            <KpiCard icon="📊" label="Kepadatan" value={data.stats.density + '%'} sub={data.stats.density >= 20 ? '✅ Jaringan Padat' : '⚠️ Jaringan Jarang'} color="emerald" />
            <KpiCard icon="⭐" label="Rata-rata Koneksi" value={data.stats.avgDegree} sub="Per Karyawan" color="amber" />
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" ref={graphRef}>
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">Pratinjau Jaringan</h3>
                <button onClick={()=>setMenu('graph')} className="text-xs text-indigo-600 font-bold hover:text-indigo-800">Lihat Penuh →</button>
             </div>
             <NetworkGraph data={fData} W={gSize.w} H={400} highlight={highlight} onNodeClick={n=>setHL(h=>h===n.id?null:n.id)} colorBy="dept"/>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Distribusi Departemen</h3>
                <div className="space-y-3">
                   {data.depts.map(d=>{
                      const cnt=data.nodes.filter(n=>n.dept===d).length;
                      return <HBar key={d} label={d} value={cnt} max={data.stats.totalNodes} color={data.deptColor[d]} sub={`${Math.round(cnt/data.stats.totalNodes*100)}%`}/>
                   })}
                </div>
             </div>
             <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Kekuatan Koneksi (Tie Strength)</h3>
                <div className="space-y-3 mb-6">
                   {Object.entries(TIE_COLORS).map(([tie,col])=>{
                      const cnt=data.edges.filter(e=>e.tie===tie).length;
                      return <HBar key={tie} label={tie} value={cnt} max={data.edges.length} color={col} sub={`${Math.round(cnt/Math.max(data.edges.length,1)*100)}%`}/>
                   })}
                </div>
                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                  <p><span className="text-emerald-500 font-black">● Strong:</span> Kolaborasi rutin, kepercayaan tinggi</p>
                  <p><span className="text-amber-500 font-black">● Moderate:</span> Interaksi berkala, fungsional</p>
                  <p><span className="text-slate-300 font-black">● Weak:</span> Koneksi jarang, seringkali penjembatan antar silo</p>
                </div>
             </div>
          </div>
        </>}

        {/* ══ GRAPH VIEW ══ */}
        {menu === 'graph' && (
           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1" ref={graphRef}>
              <NetworkGraph data={fData} W={gSize.w} H={600} highlight={highlight} onNodeClick={n=>setHL(h=>h===n.id?null:n.id)} colorBy={colorBy}/>
           </div>
        )}

        {/* ══ INFLUENCERS ══ */}
        {menu === 'influencers' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {data.topInfluencers.slice(0, 9).map((n, i) => (
                <div key={n.id} onClick={()=>{setMenu('graph');setHL(n.id)}}
                     className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-6xl font-black">{i+1}</div>
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm" style={{background:data.deptColor[n.dept]}}>
                         {n.name.charAt(0)}
                      </div>
                      <div>
                         <h3 className="font-bold text-slate-800">{n.name}</h3>
                         <p className="text-xs text-slate-500">{n.role}</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-indigo-50 p-2 rounded-lg"><p className="text-[10px] text-indigo-400 font-bold uppercase">Score</p><p className="font-black text-indigo-600">{n.influence}</p></div>
                      <div className="bg-slate-50 p-2 rounded-lg"><p className="text-[10px] text-slate-400 font-bold uppercase">Degree</p><p className="font-bold text-slate-700">{n.degree}</p></div>
                      <div className="bg-slate-50 p-2 rounded-lg"><p className="text-[10px] text-slate-400 font-bold uppercase">Between</p><p className="font-bold text-slate-700">{n.betweenness}</p></div>
                   </div>
                </div>
              ))}
           </div>
        )}

        {/* ══ SILOS ══ */}
        {menu === 'silos' && (
           <>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard icon="🌉" label="Koneksi Lintas Dept" value={data.stats.crossDeptPct + '%'} sub={data.stats.crossDeptPct < 30 ? '⚠️ Risiko Silo' : '✅ Kolaboratif'} color={data.stats.crossDeptPct < 30 ? 'red' : 'emerald'} />
                <KpiCard icon="🏝️" label="Node Terisolasi" value={data.stats.isolatedCount} sub={data.stats.isolatedCount === 0 ? '✅ Tidak Ada' : '⚠️ Perlu Perhatian'} color={data.stats.isolatedCount > 0 ? 'red' : 'emerald'} />
             </div>
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                      <tr>
                         <th className="p-4 border-b border-slate-100">Departemen</th>
                         <th className="p-4 border-b border-slate-100">Total Karyawan</th>
                         <th className="p-4 border-b border-slate-100">Total Koneksi</th>
                         <th className="p-4 border-b border-slate-100">Koneksi Lintas Dept</th>
                         <th className="p-4 border-b border-slate-100">Rasio Lintas</th>
                         <th className="p-4 border-b border-slate-100">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {data.deptSilos.sort((a,b)=>a.crossRatio-b.crossRatio).map((d, i) => (
                         <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-semibold text-slate-800 flex items-center gap-2">
                               <div className="w-2.5 h-2.5 rounded-full" style={{background:data.deptColor[d.dept]}}/>{d.dept}
                            </td>
                            <td className="p-4 text-slate-600">{d.nodes}</td>
                            <td className="p-4 text-slate-600">{d.edges}</td>
                            <td className="p-4 text-slate-600">{d.crossEdges}</td>
                            <td className="p-4 font-bold text-indigo-600">{d.crossRatio}%</td>
                            <td className="p-4">
                               {d.isSilo 
                                  ? <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded text-xs font-bold">⚠️ SILO</span> 
                                  : <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-1 rounded text-xs font-bold">✅ Kolaboratif</span>}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           </>
        )}

        {/* ══ INDIVIDUALS ══ */}
        {menu === 'individuals' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...data.nodes].sort((a,b)=>b.influence-a.influence).map(n=>(
                 <div key={n.id} onClick={()=>{setMenu('graph');setHL(n.id)}} 
                      className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer flex items-center justify-between transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{background:data.deptColor[n.dept]}}>
                          {n.name.charAt(0)}
                       </div>
                       <div>
                          <p className="font-bold text-slate-800 text-sm leading-tight">{n.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.role}</p>
                          <p className="text-[10px] font-semibold text-indigo-400 mt-1">{n.dept}</p>
                       </div>
                    </div>
                    <div className="text-right bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Score</p>
                       <p className="font-black text-indigo-600 text-lg leading-none">{n.influence}</p>
                    </div>
                 </div>
              ))}
           </div>
        )}

      </div>
    </div>
  );
}