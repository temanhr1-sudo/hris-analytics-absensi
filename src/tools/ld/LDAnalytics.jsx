import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ScatterChart, Scatter, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, CartesianGrid
} from 'recharts';

// ─── KONSTANTA WARNA (Style Unified) ──────────────────────────────────────────
const PALETTE = ['#6366f1', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];

const SKILL_COLORS = { 
    5: '#10b981', // Expert (Hijau)
    4: '#84cc16', // Advanced (Lime)
    3: '#f59e0b', // Intermediate (Kuning/Oranye)
    2: '#f97316', // Basic (Oranye)
    1: '#ef4444', // Novice (Merah)
    0: '#e5e7eb'  // None (Abu)
};

const SKILL_LABELS = { 
    5: 'Ahli', 4: 'Mahir', 3: 'Menengah', 2: 'Dasar', 1: 'Pemula', 0: 'Tidak Ada' 
};

// ─── FUNGSI BANTUAN ──────────────────────────────────────────────────────────
const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
const fmtIDR = n => `Rp ${(n/1e6).toFixed(1)}jt`;
const getScoreColor = s => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';

// Phillips ROI
const calcROI = (benefit, cost) => cost > 0 ? +((benefit-cost)/cost*100).toFixed(1) : 0;

// Kirkpatrick Score
const calcKirkpatrick = (l1, l2pre, l2post, l3, l4) => {
  const scores = [];
  if (l1 != null)                        scores.push((l1/5)*100);
  if (l2pre != null && l2post != null)   scores.push(Math.min(100, Math.max(0, (l2post-l2pre)*2)));
  if (l3 != null)                        scores.push(l3);
  if (l4 != null)                        scores.push(l4);
  return scores.length ? +avg(scores).toFixed(1) : null;
};

// TEI Score
const calcTEI = (roi, kScore, compPct) => {
  const roiN = Math.min(100, Math.max(0, roi > 0 ? Math.min(roi/3, 100) : 0));
  const ks   = kScore  ?? 70;
  const cp   = compPct ?? 100;
  return +(roiN*0.4 + ks*0.4 + cp*0.2).toFixed(1);
};

// ─── PEMROSESAN DATA TRAINING ────────────────────────────────────────────────
const processTraining = (raw) => {
  const trainings = raw.map(r => {
    const cost    = parseFloat(r['Training Cost (IDR)'])     || 0;
    const benefit = parseFloat(r['Monetary Benefit (IDR)'])  || 0;
    const l1      = r['L1 Reaction (1-5)']    != null ? parseFloat(r['L1 Reaction (1-5)'])    : null;
    const l2pre   = r['L2 Pre-Test']           != null ? parseFloat(r['L2 Pre-Test'])           : null;
    const l2post  = r['L2 Post-Test']          != null ? parseFloat(r['L2 Post-Test'])          : null;
    const l3      = r['L3 Behavior (0-100)']   != null ? parseFloat(r['L3 Behavior (0-100)'])   : null;
    const l4      = r['L4 Results (0-100)']    != null ? parseFloat(r['L4 Results (0-100)'])    : null;
    const enrolled  = parseFloat(r['Enrolled'])  || 1;
    const completed = parseFloat(r['Completed']) || 0;
    
    const roi     = calcROI(benefit, cost);
    const kScore  = calcKirkpatrick(l1, l2pre, l2post, l3, l4);
    const compPct = +(completed/enrolled*100).toFixed(1);
    const tei     = calcTEI(roi, kScore, compPct);
    
    return {
      program:  r['Training Program']    || '—',
      category: r['Category']            || '—',
      dept:     r['Target Department']   || 'Semua',
      trainer:  r['Trainer / Vendor']    || '—',
      month:    (r['Month'] || '').toString(),
      year:     r['Year'] || new Date().getFullYear(),
      mode:     r['Mode'] || '—',
      mandatory:(r['Mandatory']||'No').toString().trim(),
      hours:    parseFloat(r['Training Hours']) || 0,
      cost, benefit, roi, enrolled, completed, compPct, l1, l2pre, l2post, l3, l4, kScore, tei,
    };
  });

  const total        = trainings.length;
  const totalCost    = trainings.reduce((s,t)=>s+t.cost,0);
  const totalBenefit = trainings.reduce((s,t)=>s+t.benefit,0);
  const totalROI     = calcROI(totalBenefit, totalCost);
  const avgTEI       = +avg(trainings.map(t=>t.tei)).toFixed(1);
  const avgCompletion= +avg(trainings.map(t=>t.compPct)).toFixed(1);

  const catMap = {};
  trainings.forEach(t=>{
    if (!catMap[t.category]) catMap[t.category]={programs:0,cost:0,benefit:0,enrolled:0,completed:0,teis:[]};
    const c = catMap[t.category];
    c.programs++; c.cost+=t.cost; c.benefit+=t.benefit;
    c.enrolled+=t.enrolled; c.completed+=t.completed; c.teis.push(t.tei);
  });
  
  const byCategory = Object.entries(catMap).map(([cat,d],i)=>({
    category:cat, programs:d.programs, cost:d.cost, benefit:d.benefit,
    roi:calcROI(d.benefit,d.cost),
    compPct:+(d.completed/d.enrolled*100).toFixed(1),
    avgTEI:+avg(d.teis).toFixed(1), color:PALETTE[i%PALETTE.length],
  }));

  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mMap={};
  trainings.forEach(t=>{
    if (!mMap[t.month]) mMap[t.month]={month:t.month,cost:0,benefit:0,programs:0};
    mMap[t.month].cost+=t.cost; mMap[t.month].benefit+=t.benefit; mMap[t.month].programs++;
  });
  const monthlyTrend = Object.values(mMap).sort((a,b)=>MONTHS.indexOf(a.month)-MONTHS.indexOf(b.month));

  const kirkData = [
    { level:'L1 Reaksi', score: trainings.filter(t=>t.l1).length ? +avg(trainings.filter(t=>t.l1).map(t=>(t.l1/5)*100)).toFixed(1) : null },
    { level:'L2 Belajar', score: trainings.filter(t=>t.l2pre&&t.l2post).length ? +avg(trainings.filter(t=>t.l2pre&&t.l2post).map(t=>Math.min(100,(t.l2post-t.l2pre)*2))).toFixed(1) : null },
    { level:'L3 Perilaku', score: trainings.filter(t=>t.l3).length ? +avg(trainings.filter(t=>t.l3).map(t=>t.l3)).toFixed(1) : null },
    { level:'L4 Hasil',  score: trainings.filter(t=>t.l4).length ? +avg(trainings.filter(t=>t.l4).map(t=>t.l4)).toFixed(1)  : null },
  ].filter(k=>k.score!=null);

  const modeMap={};
  trainings.forEach(t=>{ modeMap[t.mode]=(modeMap[t.mode]||0)+1; });
  const modeData=Object.entries(modeMap).map(([m,c],i)=>({name:m,value:c,color:PALETTE[i]}));

  const sortedROI = [...trainings].sort((a,b)=>b.roi-a.roi);

  return {
    trainings, total, totalCost, totalBenefit, totalROI, avgTEI, avgCompletion,
    byCategory, monthlyTrend, kirkData, modeData,
    topROI: sortedROI.slice(0,5), bottomROI: sortedROI.slice(-5).reverse(),
    allCategories: ['SEMUA',...Object.keys(catMap)],
  };
};

// ─── PEMROSESAN DATA SKILL MATRIX ────────────────────────────────────────────
const processSkillMatrix = (raw) => {
  if (!raw.length) return null;
  const FIXED = ['Employee Name','Department','Position','Grade'];
  const allKeys  = Object.keys(raw[0]);
  const skillCols = allKeys.filter(k=>!FIXED.includes(k) && !k.startsWith('Target_'));
  
  if (!skillCols.length) return null;
  
  const employees = raw.map(r=>{
    const skills={}, gaps={};
    skillCols.forEach(sk=>{
      const actual = parseFloat(r[sk])||0;
      const target = parseFloat(r[`Target_${sk}`])||0;
      skills[sk]=actual; gaps[sk]=Math.max(0,target-actual);
    });
    return {
      name:     r['Employee Name']||'—',
      dept:     r['Department']||'—',
      position: r['Position']||'—',
      grade:    r['Grade']||'—',
      skills, gaps,
      totalGap: Object.values(gaps).reduce((s,g)=>s+g,0),
      avgSkill: +avg(Object.values(skills).filter(v=>v>0)).toFixed(1),
    };
  });

  const skillGapSummary = skillCols.map(sk=>{
    const actuals = employees.map(e=>e.skills[sk]).filter(v=>v>0);
    const targets = raw.map(r=>parseFloat(r[`Target_${sk}`])||0).filter(v=>v>0);
    const avgActual = +avg(actuals).toFixed(1);
    const avgTarget = targets.length ? +avg(targets).toFixed(1) : 0;
    return {
      skill:sk, avgActual, avgTarget, avgGap:+(avgTarget-avgActual).toFixed(1),
      coverage:+(actuals.filter(v=>v>=3).length/employees.length*100).toFixed(0),
    };
  }).sort((a,b)=>b.avgGap-a.avgGap);

  const deptMap={};
  employees.forEach(e=>{ if(!deptMap[e.dept]) deptMap[e.dept]=[]; deptMap[e.dept].push(e); });
  const deptSkillMap = Object.entries(deptMap).map(([dept,emps])=>({
    dept, count:emps.length,
    avgSkill:+avg(emps.map(e=>e.avgSkill)).toFixed(1),
    totalGap:emps.reduce((s,e)=>s+e.totalGap,0),
  }));

  return { employees, skillCols, skillGapSummary, deptSkillMap,
    allDepts:['SEMUA',...Object.keys(deptMap)] };
};

// ─── TEMPLATE EXCEL ──────────────────────────────────────────────────────────
const downloadTemplate = () => {
  const wb = XLSX.utils.book_new();
  const t1rows = [
    ['Training Program','Category','Target Department','Trainer / Vendor','Month','Year',
     'Training Cost (IDR)','Monetary Benefit (IDR)','Enrolled','Completed',
     'Training Hours','Mode','Mandatory',
     'L1 Reaction (1-5)','L2 Pre-Test','L2 Post-Test','L3 Behavior (0-100)','L4 Results (0-100)'],
    ['Leadership Essentials','Leadership','Engineering','Internal','Jan',2024,15000000,45000000,20,18,16,'Offline','Yes',4.2,55,78,72,80],
    ['Advanced Excel','Technical','Finance','Vendor A','Feb',2024,8000000,24000000,15,15,8,'Online','No',4.5,60,85,68,75],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(t1rows);
  ws1['!cols'] = t1rows[0].map((_,i)=>({wch:i===0?24:i<=3?16:10}));
  XLSX.utils.book_append_sheet(wb, ws1, 'DATA_TRAINING');

  const skills = ['Leadership','Communication','Data Analysis','Project Mgmt','Excel','Python'];
  const header2 = ['Employee Name','Department','Position','Grade',...skills,...skills.map(s=>`Target_${s}`)];
  const sm = [
    header2,
    ['Andi Pratama','Engineering','Senior Engineer','G5',  3,4,4,3,4,3,  4,5,5,4,5,4],
    ['Budi Santoso','Engineering','Tech Lead','G6',        4,3,3,5,3,4,  5,4,4,5,4,5],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(sm);
  ws2['!cols'] = header2.map((_,i)=>({wch:i===0?18:i<4?16:10}));
  XLSX.utils.book_append_sheet(wb, ws2, 'SKILL_MATRIX');

  const guide = [
    ['PANDUAN L&D ANALYTICS (Bahasa Indonesia)'],
    [''],
    ['SHEET 1: DATA_TRAINING (18 kolom)'],
    ['Training Program       → Nama program pelatihan'],
    ['Category               → Kategori (Leadership, Technical, Soft Skill, dll)'],
    ['Month                  → Jan/Feb/Mar/...'],
    ['Training Cost (IDR)    → Biaya pelatihan'],
    ['Monetary Benefit (IDR) → Estimasi nilai manfaat bisnis'],
    ['L1 - L4                → Skor evaluasi Kirkpatrick'],
    [''],
    ['SHEET 2: SKILL_MATRIX'],
    ['Kolom Wajib: Nama Karyawan, Departemen, Posisi, Grade'],
    ['Kolom Skill: Nama skill bebas (contoh: Excel, Python)'],
    ['Kolom Target: Prefix "Target_" + nama skill (contoh: Target_Excel)'],
    ['Nilai Skill: 0=Tidak Ada, 1=Pemula, 2=Dasar, 3=Menengah, 4=Mahir, 5=Ahli'],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(guide);
  ws3['!cols']=[{wch:70}];
  XLSX.utils.book_append_sheet(wb, ws3, 'PANDUAN');

  XLSX.writeFile(wb, 'Template_LD_Analytics_ID.xlsx');
};

// ─── KOMPONEN UTAMA ───────────────────────────────────────────────────────────
export default function LDAnalytics({ onBack }) {
  const [view,         setView]         = useState('upload');
  const [loading,      setLoading]      = useState(false);
  const [trainingData, setTrainingData] = useState(null);
  const [skillData,    setSkillData]    = useState(null);
  const [activeMenu,   setActiveMenu]   = useState('overview');
  const [filterCat,    setFilterCat]    = useState('SEMUA');
  const [skillDept,    setSkillDept]    = useState('SEMUA');

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), {type:'array'});
        let td=null, sd=null;
        wb.SheetNames.forEach(name=>{
          const json = XLSX.utils.sheet_to_json(wb.Sheets[name]);
          if (!json.length) return;
          const keys = Object.keys(json[0]);
          if (keys.includes('Training Program') || keys.includes('Training Cost (IDR)')) {
            td = processTraining(json);
          } else if (keys.includes('Employee Name') && keys.some(k=>k.startsWith('Target_'))) {
            sd = processSkillMatrix(json);
          }
        });
        if (!td && !sd) { alert('Format file tidak dikenali. Gunakan template.'); return; }
        if (td) setTrainingData(td);
        if (sd) setSkillData(sd);
        setView('dashboard');
        setActiveMenu(td ? 'overview' : 'skillmatrix');
      } catch(err) { alert('Error: '+err.message); }
      finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportReport = () => {
    const wb = XLSX.utils.book_new();
    let hasData = false;

    if (trainingData) {
        const sum = [
            ['LAPORAN L&D (TRAINING)'],['Tanggal:', new Date().toLocaleString('id-ID')],[''],
            ['Total Program', trainingData.total],['Total Biaya', fmtIDR(trainingData.totalCost)],
            ['Total Manfaat', fmtIDR(trainingData.totalBenefit)],['ROI Keseluruhan', trainingData.totalROI + '%'],
            ['Avg TEI', trainingData.avgTEI],['Tingkat Penyelesaian', trainingData.avgCompletion + '%']
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sum), 'Ringkasan Training');
        
        const rows = trainingData.trainings.map(t => ({
            Program: t.program, Kategori: t.category, Biaya: t.cost, Manfaat: t.benefit,
            'ROI%': t.roi, TEI: t.tei, 'Selesai%': t.compPct, 'Skor Kirkpatrick': t.kScore
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Detail Program');
        hasData = true;
    }

    if (skillData) {
        const skillRows = skillData.employees.map(e => {
            const row = { Nama: e.name, Dept: e.dept, Posisi: e.position, 'Avg Skill': e.avgSkill, 'Total Gap': e.totalGap };
            Object.keys(e.skills).forEach(key => { row[key] = e.skills[key]; });
            return row;
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(skillRows), 'Detail Skill Matrix');
        hasData = true;
    }

    if (hasData) {
        XLSX.writeFile(wb, `Laporan_LD_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
        alert("Tidak ada data untuk diekspor.");
    }
  };

  const KpiCard = ({icon, label, value, sub, dark, accent}) => (
    <div className={`rounded-2xl p-6 shadow-sm relative overflow-hidden ${dark?'text-white':'bg-white border border-slate-100'}`}
         style={dark?{background:accent}:{}}>
      {dark&&<div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 80% 20%,white,transparent 60%)'}}/>}
      <span className="text-3xl block mb-3">{icon}</span>
      <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${dark?'text-white/70':'text-slate-400'}`}>{label}</p>
      <p className={`text-2xl font-black mb-1 ${dark?'text-white':'text-slate-800'}`}>{value}</p>
      {sub&&<p className={`text-xs ${dark?'text-white/60':'text-slate-500'}`}>{sub}</p>}
    </div>
  );

  const RoiBadge = ({roi}) => {
    const c = roi>=100 ? '#10b981' : roi>=50 ? '#f59e0b' : roi>=0 ? '#f97316' : '#ef4444';
    const bg = roi>=100 ? '#dcfce7' : roi>=50 ? '#fef3c7' : roi>=0 ? '#ffedd5' : '#fee2e2';
    return <span className="px-2 py-0.5 rounded-full text-xs font-black" style={{color:c, background:bg}}>{roi}%</span>;
  };

  const CTip = ({active,payload,label}) => {
    if(!active||!payload?.length) return null;
    return <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p,i)=><p key={i} style={{color:p.color}} className="font-semibold">{p.name}: {p.value}</p>)}
    </div>;
  };

  const filteredTrainings = useMemo(()=>{
    if (!trainingData) return [];
    return trainingData.trainings.filter(t=>filterCat==='SEMUA'||t.category===filterCat);
  },[trainingData,filterCat]);

  const filteredEmployees = useMemo(()=>{
    if (!skillData) return [];
    return skillData.employees.filter(e=>skillDept==='SEMUA'||e.dept===skillDept);
  },[skillData,skillDept]);

  const MENUS = [
    ...(trainingData ? [
      {id:'overview',   label:'Ringkasan'},
      {id:'roi',        label:'Analisa ROI'},
      {id:'kirkpatrick',label:'Kirkpatrick'},
      {id:'programs',   label:'Program'},
      {id:'trends',     label:'Tren Bulanan'},
    ] : []),
    ...(skillData ? [
      {id:'skillmatrix',label:'Matriks Skill'},
      {id:'skillgap',   label:'Kesenjangan Skill'},
    ] : []),
  ];

  if (view==='upload') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans relative">
      {onBack&&<button onClick={onBack} className="absolute top-6 left-6 z-50 px-4 py-2 bg-white text-slate-700 rounded-lg shadow-sm font-bold text-sm border border-slate-200 hover:bg-slate-100 transition">← Kembali</button>}
      
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6">
        {/* Left Side - Upload Form */}
        <div className="flex-1 bg-white rounded-3xl shadow-xl p-10 text-center border border-slate-200 flex flex-col justify-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm text-indigo-600">🧠</div>
          <h1 className="text-4xl font-black text-slate-800 mb-2">L&D Analytics</h1>
          <p className="text-slate-500 mb-8 text-sm">Dashboard Pembelajaran & Pengembangan Karyawan</p>
          
          {loading ? (
            <div className="py-8"><p className="text-indigo-600 font-bold animate-pulse text-lg">Sedang menganalisa data...</p></div>
          ):(
            <>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Mulai Analisa</h3>
                <p className="text-xs mb-6 text-slate-500">Gunakan format Excel (.xlsx) sesuai template yang disediakan.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <label className="cursor-pointer flex-1">
                    <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden"/>
                    <span className="block w-full px-6 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-transform transform hover:-translate-y-1">📂 Upload Data</span>
                  </label>
                  <button onClick={downloadTemplate}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-sm bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition">
                    📥 Unduh Template
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">Pastikan file berisi sheet DATA_TRAINING atau SKILL_MATRIX.</p>
            </>
          )}
        </div>

        {/* Right Side - Guide Panel */}
        <div className="w-full md:w-80 bg-white rounded-3xl shadow-lg border border-slate-200 p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <span className="text-2xl">📖</span>
            <h2 className="text-lg font-bold text-slate-800">Panduan Fitur</h2>
          </div>
          
          <div className="space-y-5 overflow-y-auto flex-1 pr-2" style={{maxHeight: '400px'}}>
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"/> ROI Pelatihan</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Menghitung tingkat pengembalian investasi (Return on Investment) dari biaya pelatihan dibandingkan dengan estimasi manfaat bisnis yang dihasilkan.</p>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"/> Model Kirkpatrick</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Evaluasi efektivitas 4 tahap: Reaksi (L1), Pembelajaran/Pre-Post Test (L2), Perubahan Perilaku (L3), dan Dampak Bisnis (L4).</p>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"/> Matriks Skill</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Peta (Heatmap) kompetensi karyawan berdasarkan level 0 (Tidak Ada) hingga 5 (Ahli).</p>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"/> Kesenjangan Skill</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Mendeteksi jarak (gap) antara target kompetensi jabatan dengan level skill aktual karyawan untuk merencanakan pelatihan selanjutnya.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!trainingData && !skillData) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="bg-white border-b sticky top-0 z-30 px-8 py-4 shadow-sm">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">L&D Analytics</h1>
              <p className="text-xs text-slate-500 font-medium">
                {trainingData && `${trainingData.total} Program · ROI: ${trainingData.totalROI}%`}
                {trainingData && skillData && ' · '}
                {skillData && `${skillData.employees.length} Karyawan · ${skillData.skillCols.length} Skills`}
              </p>
            </div>
            <div className="flex gap-2">
              {activeMenu==='programs' && trainingData && (
                <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
                  className="text-xs px-3 py-2 rounded-lg font-semibold bg-slate-100 text-slate-600 border-none focus:ring-2 focus:ring-indigo-500">
                  {trainingData.allCategories.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {(activeMenu==='skillmatrix'||activeMenu==='skillgap') && skillData && (
                <select value={skillDept} onChange={e=>setSkillDept(e.target.value)}
                  className="text-xs px-3 py-2 rounded-lg font-semibold bg-slate-100 text-slate-600 border-none focus:ring-2 focus:ring-indigo-500">
                  {skillData.allDepts.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              )}
              <button onClick={exportReport} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition">Ekspor Laporan</button>
              <button onClick={()=>setView('upload')} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition">Keluar</button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl">
            {MENUS.map(m=>(
              <button key={m.id} onClick={()=>setActiveMenu(m.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeMenu===m.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">
        
        {/* ════ OVERVIEW ════ */}
        {activeMenu==='overview' && trainingData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <KpiCard icon="💰" label="ROI Keseluruhan" value={`${trainingData.totalROI}%`}
                sub={trainingData.totalROI>=100?'✅ Luar Biasa':trainingData.totalROI>=50?'⚠️ Bagus':'🔴 Perlu Evaluasi'}
                accent="#f59e0b" dark/>
              <KpiCard icon="🏆" label="Skor Efektivitas (TEI)" value={`${trainingData.avgTEI}/100`}
                sub={trainingData.avgTEI>=80?'✅ Efektif':trainingData.avgTEI>=60?'⚠️ Sedang':'🔴 Rendah'}
                accent="#d97706" dark/>
              <KpiCard icon="✅" label="Tingkat Penyelesaian" value={`${trainingData.avgCompletion}%`}
                sub={`${trainingData.trainings.reduce((s,t)=>s+t.completed,0)} dari ${trainingData.trainings.reduce((s,t)=>s+t.enrolled,0)} peserta`}/>
              <KpiCard icon="🎓" label="Total Program" value={trainingData.total}
                sub={`${trainingData.allCategories.length-1} kategori`}/>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <KpiCard icon="💸" label="Total Investasi" value={fmtIDR(trainingData.totalCost)} sub="Biaya pelatihan"/>
              <KpiCard icon="📈" label="Total Manfaat" value={fmtIDR(trainingData.totalBenefit)} sub="Estimasi dampak bisnis"/>
              <KpiCard icon="⏱️" label="Total Jam" value={`${trainingData.trainings.reduce((s,t)=>s+t.hours,0)} jam`} sub="Akumulasi durasi"/>
              <KpiCard icon="🥇" label="Program ROI Tertinggi" value={(trainingData.topROI[0]?.program||'—').slice(0,14)} sub={`${trainingData.topROI[0]?.roi||0}% ROI`}/>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-1">ROI per Kategori</h3>
              <p className="text-xs text-slate-400 mb-5">Garis hijau = target ROI 100% (Balik Modal)</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={trainingData.byCategory} margin={{right:20,top:5,bottom:30,left:10}}>
                  <XAxis dataKey="category" tick={{fontSize:10}} angle={-20} textAnchor="end" interval={0}/>
                  <YAxis tick={{fontSize:10}} unit="%"/>
                  <Tooltip content={<CTip/>}/>
                  <ReferenceLine y={100} stroke="#10b981" strokeDasharray="4 2" label={{value:'100%',fill:'#10b981',fontSize:10}}/>
                  <Bar dataKey="roi" name="ROI %" radius={[6,6,0,0]}>
                    {trainingData.byCategory.map((c,i)=><Cell key={i} fill={c.roi>=100?'#10b981':c.roi>=50?'#f59e0b':'#ef4444'}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4">Mode Pelatihan</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={trainingData.modeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                         label={({name,value})=>`${name} (${value})`}>
                      {trainingData.modeData.map((m,i)=><Cell key={i} fill={m.color}/>)}
                    </Pie>
                    <Tooltip formatter={v=>[v,'Program']}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4">Tingkat Penyelesaian (Completion Rate)</h3>
                <div className="space-y-3">
                  {trainingData.byCategory.map((c,i)=>(
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{background:c.color}}/>
                      <p className="text-sm font-semibold text-slate-700 w-28 flex-shrink-0 truncate">{c.category}</p>
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full" style={{width:`${c.compPct}%`,background:c.compPct>=90?'#10b981':c.compPct>=70?'#f59e0b':'#ef4444'}}/>
                      </div>
                      <span className="text-xs font-black w-10 text-right" style={{color:c.compPct>=90?'#10b981':c.compPct>=70?'#f59e0b':'#ef4444'}}>{c.compPct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ════ ROI ANALYSIS ════ */}
        {activeMenu==='roi' && trainingData && (
          <>
            <div>
              <h2 className="text-2xl font-black text-slate-800">Analisa ROI Pelatihan</h2>
              <p className="text-sm text-slate-500 mt-1">Metode Phillips ROI: (Manfaat − Biaya) ÷ Biaya × 100</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4">🏆 Top 5 Program ROI Tertinggi</h3>
                <div className="space-y-3">
                  {trainingData.topROI.map((t,i)=>(
                    <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{t.program}</p>
                        <p className="text-xs text-slate-500">{t.category} · {fmtIDR(t.cost)}</p>
                      </div>
                      <RoiBadge roi={t.roi}/>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4">⚠️ 5 Program ROI Terendah</h3>
                <div className="space-y-3">
                  {trainingData.bottomROI.map((t,i)=>(
                    <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{t.program}</p>
                        <p className="text-xs text-slate-500">{t.category} · {fmtIDR(t.cost)}</p>
                      </div>
                      <RoiBadge roi={t.roi}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-1">Sebaran Biaya vs Manfaat</h3>
              <p className="text-xs text-slate-400 mb-5">Titik di atas garis diagonal artinya ROI positif (Untung)</p>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{right:20,top:10,bottom:20,left:10}}>
                  <XAxis dataKey="cost"    type="number" tick={{fontSize:10}} tickFormatter={v=>fmtIDR(v)} name="Biaya"/>
                  <YAxis dataKey="benefit" type="number" tick={{fontSize:10}} tickFormatter={v=>fmtIDR(v)} name="Manfaat"/>
                  <Tooltip content={({active,payload})=>{
                    if(!active||!payload?.length) return null;
                    const d=payload[0]?.payload;
                    if(!d) return null;
                    return <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
                      <p className="font-bold text-slate-800 mb-1">{d.program}</p>
                      <p>Biaya: {fmtIDR(d.cost)}</p><p>Manfaat: {fmtIDR(d.benefit)}</p>
                      <p className="font-black" style={{color:d.roi>=100?'#10b981':d.roi>=50?'#f59e0b':'#ef4444'}}>ROI: {d.roi}%</p>
                    </div>;
                  }}/>
                  <Scatter data={trainingData.trainings} name="Programs">
                    {trainingData.trainings.map((t,i)=>(
                      <Cell key={i} fill={t.roi>=100?'#10b981':t.roi>=50?'#f59e0b':'#ef4444'}/>
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50"><h3 className="font-bold text-slate-800">Detail ROI Semua Program</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50">
                    {['Program','Kategori','Biaya','Manfaat','ROI','TEI','Selesai','Mode'].map(h=>(
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {trainingData.trainings.sort((a,b)=>b.roi-a.roi).map((t,i)=>(
                      <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{t.program}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-bold">{t.category}</span></td>
                        <td className="px-4 py-3 text-slate-600">{fmtIDR(t.cost)}</td>
                        <td className="px-4 py-3 text-slate-600">{fmtIDR(t.benefit)}</td>
                        <td className="px-4 py-3"><RoiBadge roi={t.roi}/></td>
                        <td className="px-4 py-3 font-black text-sm" style={{color:getScoreColor(t.tei)}}>{t.tei}</td>
                        <td className="px-4 py-3 font-semibold text-xs" style={{color:t.compPct>=90?'#10b981':t.compPct>=70?'#f59e0b':'#ef4444'}}>{t.compPct}%</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{t.mode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ════ KIRKPATRICK ════ */}
        {activeMenu==='kirkpatrick' && trainingData && (
          <>
            <div>
              <h2 className="text-2xl font-black text-slate-800">Model Evaluasi Kirkpatrick</h2>
              <p className="text-sm text-slate-500 mt-1">4 level evaluasi efektivitas pelatihan</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                {lv:'L1',name:'Reaksi',icon:'😊',desc:'Kepuasan peserta',formula:'Survei 1-5',color:'#3b82f6',
                 score:trainingData.kirkData.find(k=>k.level==='L1 Reaksi')?.score},
                {lv:'L2',name:'Belajar',icon:'📚',desc:'Peningkatan ilmu',formula:'(Post - Pre) x 2',color:'#8b5cf6',
                 score:trainingData.kirkData.find(k=>k.level==='L2 Belajar')?.score},
                {lv:'L3',name:'Perilaku',icon:'⚙️',desc:'Penerapan di kerja',formula:'Penilaian Manajer',color:'#f59e0b',
                 score:trainingData.kirkData.find(k=>k.level==='L3 Perilaku')?.score},
                {lv:'L4',name:'Hasil',icon:'📈',desc:'Dampak bisnis',formula:'Metrik Kinerja',color:'#10b981',
                 score:trainingData.kirkData.find(k=>k.level==='L4 Hasil')?.score},
              ].map((lv,i)=>(
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
                  <div className="flex items-center gap-2 mb-4 justify-center">
                    <span className="text-2xl">{lv.icon}</span>
                    <span className="font-black text-xs px-2 py-0.5 rounded-full text-white" style={{background:lv.color}}>{lv.lv}</span>
                    <p className="font-black text-slate-800">{lv.name}</p>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{lv.desc}</p>
                  {lv.score!=null ? (
                    <>
                      <div className="relative w-24 h-24 mx-auto mb-3">
                        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="8"/>
                          <circle cx="40" cy="40" r="32" fill="none" strokeWidth="8"
                            stroke={lv.color} strokeDasharray={`${lv.score/100*201} 201`} strokeLinecap="round"/>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-black text-xl" style={{color:lv.color}}>{lv.score}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">{lv.formula}</p>
                    </>
                  ):<div className="py-6 text-slate-400"><p className="text-2xl mb-1">—</p><p className="text-xs">Data tidak tersedia</p></div>}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">Radar Kirkpatrick per Kategori</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {trainingData.byCategory.slice(0,4).map((cat,i)=>{
                  const progs=trainingData.trainings.filter(t=>t.category===cat.category);
                  const radarData=[
                    {subject:'L1',A:+avg(progs.filter(t=>t.l1).map(t=>(t.l1/5)*100)).toFixed(0)||0},
                    {subject:'L2',A:+avg(progs.filter(t=>t.l2pre&&t.l2post).map(t=>Math.min(100,(t.l2post-t.l2pre)*2))).toFixed(0)||0},
                    {subject:'L3',A:+avg(progs.filter(t=>t.l3).map(t=>t.l3)).toFixed(0)||0},
                    {subject:'L4',A:+avg(progs.filter(t=>t.l4).map(t=>t.l4)).toFixed(0)||0},
                    {subject:'TEI',A:+avg(progs.map(t=>t.tei)).toFixed(0)||0},
                  ];
                  return (
                    <div key={i}>
                      <p className="font-bold text-sm text-center text-slate-700 mb-2">{cat.category}</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart data={radarData}>
                          <PolarGrid/><PolarAngleAxis dataKey="subject" tick={{fontSize:10}}/>
                          <Radar dataKey="A" stroke={cat.color} fill={cat.color} fillOpacity={0.25} strokeWidth={2}/>
                          <Tooltip formatter={v=>[v,'Skor']}/>
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ════ PROGRAMS ════ */}
        {activeMenu==='programs' && trainingData && (
          <>
            <div>
              <h2 className="text-2xl font-black text-slate-800">Direktori Program</h2>
              <p className="text-sm text-slate-500 mt-1">{filteredTrainings.length} program {filterCat!=='SEMUA'?` — Kategori: ${filterCat}`:''}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTrainings.map((t,i)=>(
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white mb-2 inline-block"
                            style={{background:PALETTE[trainingData.allCategories.indexOf(t.category)%PALETTE.length]||'#6b7280'}}>
                        {t.category}
                      </span>
                      <h3 className="font-black text-slate-900 leading-tight mt-1">{t.program}</h3>
                      <p className="text-xs text-slate-500 mt-1">{t.trainer} · {t.month} {t.year}</p>
                    </div>
                    <RoiBadge roi={t.roi}/>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                    <div className="bg-slate-50 rounded-lg p-2.5"><p className="text-slate-400 mb-0.5">Biaya</p><p className="font-black text-slate-900">{fmtIDR(t.cost)}</p></div>
                    <div className="bg-slate-50 rounded-lg p-2.5"><p className="text-slate-400 mb-0.5">Manfaat</p><p className="font-black text-green-700">{fmtIDR(t.benefit)}</p></div>
                    <div className="bg-slate-50 rounded-lg p-2.5"><p className="text-slate-400 mb-0.5">Peserta</p><p className="font-black text-slate-900">{t.completed}/{t.enrolled} ({t.compPct}%)</p></div>
                    <div className="bg-slate-50 rounded-lg p-2.5"><p className="text-slate-400 mb-0.5">Skor TEI</p><p className="font-black" style={{color:getScoreColor(t.tei)}}>{t.tei}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ════ TRENDS ════ */}
        {activeMenu==='trends' && trainingData && (
          <>
            <h2 className="text-2xl font-black text-slate-800">Tren Pelatihan Bulanan</h2>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-1">Biaya vs Manfaat per Bulan</h3>
              <p className="text-xs text-slate-400 mb-5">Investasi pelatihan vs estimasi nilai bisnis</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trainingData.monthlyTrend} margin={{right:20,top:5,bottom:5,left:10}}>
                  <XAxis dataKey="month" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:10}} tickFormatter={v=>fmtIDR(v)}/>
                  <Tooltip content={<CTip/>}/>
                  <Legend iconSize={8} wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="cost"    name="Biaya"   fill="#f59e0b" radius={[4,4,0,0]}/>
                  <Bar dataKey="benefit" name="Manfaat" fill="#10b981" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ════ SKILL MATRIX ════ */}
        {activeMenu==='skillmatrix' && skillData && (
          <>
            <div>
              <h2 className="text-2xl font-black text-slate-800">Matriks Kompetensi (Heatmap)</h2>
              <p className="text-sm text-slate-500 mt-1">{filteredEmployees.length} karyawan · Level: 0 (Tidak Ada) s.d 5 (Ahli)</p>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
               <table className="w-full text-sm text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                     <th className="p-3 border-b border-slate-100 sticky left-0 bg-slate-50">Nama Karyawan</th>
                     <th className="p-3 border-b border-slate-100">Posisi</th>
                     {skillData.skillCols.map(sk=>(
                       <th key={sk} className="p-3 border-b border-slate-100 text-center w-24">{sk}</th>
                     ))}
                     <th className="p-3 border-b border-slate-100 text-center">Rata-rata</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredEmployees.map((e,i)=>(
                     <tr key={i} className="hover:bg-slate-50 border-b border-slate-50 last:border-0">
                       <td className="p-3 font-bold text-slate-800 sticky left-0 bg-white">{e.name}</td>
                       <td className="p-3 text-slate-500 text-xs">{e.position}</td>
                       {skillData.skillCols.map(sk=>{
                         const val = e.skills[sk];
                         return (
                           <td key={sk} className="p-1 text-center">
                             <div className="w-full h-8 rounded flex items-center justify-center text-white font-bold text-xs"
                                  style={{background:SKILL_COLORS[Math.round(val)]}}>
                               {val}
                             </div>
                           </td>
                         );
                       })}
                       <td className="p-3 text-center font-bold text-indigo-600">{e.avgSkill}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>

            <div className="flex gap-4 flex-wrap mt-4 justify-center">
               {Object.entries(SKILL_LABELS).reverse().map(([val, label])=>(
                 <div key={val} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{background:SKILL_COLORS[val]}}></div>
                    <span className="text-xs text-slate-600">{val} - {label}</span>
                 </div>
               ))}
            </div>
          </>
        )}

        {/* ════ SKILL GAP ════ */}
        {activeMenu==='skillgap' && skillData && (
          <>
             <h2 className="text-2xl font-black text-slate-800">Analisa Kesenjangan Skill (Gap Analysis)</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                   <h3 className="font-bold text-slate-800 mb-4">Skill Paling 'Kurang' (Gap Tertinggi)</h3>
                   <div className="space-y-4">
                     {skillData.skillGapSummary.slice(0,5).map((s,i)=>(
                       <div key={i}>
                         <div className="flex justify-between text-sm mb-1">
                           <span className="font-semibold text-slate-700">{s.skill}</span>
                           <span className="text-red-600 font-bold">Gap: -{s.avgGap}</span>
                         </div>
                         <div className="w-full bg-slate-100 rounded-full h-2">
                           <div className="bg-slate-300 h-2 rounded-full relative" style={{width: '100%'}}>
                             <div className="absolute top-0 left-0 h-2 bg-indigo-500 rounded-full" 
                                  style={{width: `${(s.avgActual/5)*100}%`}}></div>
                             <div className="absolute top-0 h-4 w-0.5 bg-red-500 -mt-1" 
                                  style={{left: `${(s.avgTarget/5)*100}%`}}></div>
                           </div>
                         </div>
                         <div className="flex justify-between text-xs text-slate-400 mt-1">
                           <span>Aktual: {s.avgActual}</span>
                           <span>Target: {s.avgTarget}</span>
                         </div>
                       </div>
                     ))}
                   </div>
                   <div className="mt-4 text-xs text-slate-500 flex gap-2 items-center">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full"></div> Aktual
                      <div className="w-0.5 h-3 bg-red-500 mx-1"></div> Target
                   </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                   <h3 className="font-bold text-slate-800 mb-4">Kesiapan Skill (% Karyawan ≥ Level 3)</h3>
                   <ResponsiveContainer width="100%" height={300}>
                     <BarChart data={skillData.skillGapSummary} layout="vertical" margin={{left:20}}>
                       <XAxis type="number" domain={[0,100]} hide/>
                       <YAxis type="category" dataKey="skill" width={100} tick={{fontSize:11}}/>
                       <Tooltip formatter={v=>[`${v}%`,'Kesiapan']}/>
                       <Bar dataKey="coverage" fill="#10b981" radius={[0,4,4,0]} barSize={20}>
                          {skillData.skillGapSummary.map((s,i)=>(
                            <Cell key={i} fill={s.coverage>=80?'#10b981':s.coverage>=50?'#f59e0b':'#ef4444'}/>
                          ))}
                       </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </>
        )}

      </div>
    </div>
  );
}