import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ReferenceLine,
  CartesianGrid, AreaChart, Area
} from 'recharts';

/**
 * ============================================================================
 * DEI DASHBOARD SYSTEM v2.0 (FULL ENTERPRISE EDITION)
 * ============================================================================
 * * Modul ini mencakup 7 Pilar Analisa Diversity, Equity, & Inclusion:
 * 1. Overview (Scorecard & Demografi Utama)
 * 2. Pay Gap (Analisa Kesenjangan Gaji Gender & Departemen)
 * 3. Diversity (Sebaran Etnis, Usia, Disabilitas)
 * 4. Leadership (Representasi Wanita di Level Pimpinan)
 * 5. Pipeline (Jenjang Karir / Glass Ceiling Analysis)
 * 6. Hiring & Promo (Analisa Bias dalam Rekrutmen & Promosi)
 * 7. Inclusion (Analisa Skor Survei Kepuasan Karyawan)
 * * Design System: Slate/Indigo (Professional Clean Look)
 * Language: Bahasa Indonesia
 */

// ─── 1. KONSTANTA & CONFIG ──────────────────────────────────────────────────

const COLORS = {
  female: '#8b5cf6', // Violet
  male: '#3b82f6',   // Blue
  other: '#10b981',  // Emerald
  
  // Status Colors
  success: '#10b981', // Green
  warning: '#f59e0b', // Amber
  danger: '#ef4444',  // Red
  info: '#3b82f6',    // Blue
  
  // Chart Palette (Ethnicity/Age)
  palette: [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', 
    '#f97316', '#eab308', '#84cc16', '#10b981',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b'
  ]
};

// Definisi Level Jabatan untuk Pipeline Analysis
// Pastikan urutan array ini sesuai dengan hierarki perusahaan (Bawah -> Atas)
const CAREER_LEVELS = [
  'Junior', 
  'Staff',
  'Associate',
  'Senior', 
  'Lead',
  'Supervisor',
  'Assistant Manager',
  'Manager', 
  'Senior Manager',
  'Head',
  'GM',
  'Director', 
  'VP', 
  'C-Level'
];

// Kata kunci untuk mendeteksi status "Leader"
const LEADER_KEYWORDS = ['Manager', 'Manajer', 'Head', 'GM', 'General Manager', 'Director', 'Direktur', 'VP', 'Vice President', 'Chief', 'C-Level'];

// ─── 2. FUNGSI UTILITAS & KALKULASI ─────────────────────────────────────────

// Format Rupiah Juta (misal: Rp 12.5jt)
const fmtIDR = (num) => {
  if (num === undefined || num === null || isNaN(num)) return 'Rp 0';
  if (Math.abs(num) >= 1000000000) return `Rp ${(num / 1000000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000000) return `Rp ${(num / 1000000).toFixed(1)}jt`;
  return `Rp ${num.toLocaleString('id-ID')}`;
};

// Hitung Gap Persentase: (Ref - Target) / Ref * 100
const calcGap = (refVal, targetVal) => {
  if (!refVal || refVal === 0) return 0;
  return parseFloat(((refVal - targetVal) / refVal * 100).toFixed(1));
};

// Hitung Rata-rata Array
const calculateAverage = (arr) => {
  if (!arr || arr.length === 0) return 0;
  const sum = arr.reduce((acc, curr) => acc + curr, 0);
  return parseFloat((sum / arr.length).toFixed(2));
};

// Hitung Median Array
const calculateMedian = (arr) => {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Tentukan Warna Gap Gaji
const getGapColor = (gapPercentage) => {
  const absGap = Math.abs(gapPercentage);
  if (absGap <= 5) return COLORS.success; // 0-5% Aman
  if (absGap <= 15) return COLORS.warning; // 5-15% Warning
  return COLORS.danger; // >15% Bahaya
};

// Tentukan Warna Skor (0-100)
const getScoreColor = (score) => {
  if (score >= 80) return COLORS.success;
  if (score >= 60) return COLORS.warning;
  return COLORS.danger;
};

// ─── 3. LOGIKA PEMROSESAN DATA (CORE ENGINE) ────────────────────────────────

const processDEIData = (rawData) => {
  if (!rawData || rawData.length === 0) return null;

  // A. Data Cleaning & Standardization
  const employees = rawData.map((row, index) => {
    // Normalisasi Gender
    let genderRaw = (row['Gender'] || row['Jenis Kelamin'] || 'Unknown').toString().trim().toLowerCase();
    let gender = 'Other';
    if (['male', 'laki-laki', 'pria', 'm', 'l'].includes(genderRaw)) gender = 'Male';
    else if (['female', 'perempuan', 'wanita', 'f', 'p'].includes(genderRaw)) gender = 'Female';

    // Normalisasi Level
    let level = (row['Level'] || row['Jabatan'] || 'Staff').toString().trim();
    
    // Cek Leader Status
    const isLeader = LEADER_KEYWORDS.some(key => level.toLowerCase().includes(key.toLowerCase()));

    return {
      id: index,
      name: row['Nama Karyawan'] || row['Nama'] || row['Employee Name'] || `Emp-${index}`,
      gender: gender,
      ethnicity: (row['Etnis'] || row['Suku'] || row['Ethnicity'] || 'Lainnya').toString().trim(),
      dept: (row['Departemen'] || row['Divisi'] || row['Department'] || 'General').toString().trim(),
      grade: (row['Grade'] || row['Golongan'] || 'N/A').toString().trim(),
      level: level,
      salary: parseFloat(row['Gaji Tahunan'] || row['Annual Salary'] || 0),
      age: parseFloat(row['Usia'] || row['Age'] || 0),
      tenure: parseFloat(row['Masa Kerja'] || row['Tenure'] || 0),
      disability: ['ya', 'yes', 'y'].includes((row['Disabilitas'] || row['Disability'] || 'No').toString().toLowerCase()),
      hireYear: (row['Tahun Masuk'] || row['Hire Year'] || '').toString().trim(),
      promoYear: (row['Tahun Promosi'] || row['Last Promotion Year'] || '').toString().trim(),
      inclScore: parseFloat(row['Skor Inklusi'] || row['Inclusion Score'] || 0),
      perf: parseFloat(row['Rating Performa'] || row['Performance Rating'] || 0),
      isLeader: isLeader
    };
  });

  const totalEmp = employees.length;

  // B. Gender Analysis (Overview)
  const genderCounts = { Male: 0, Female: 0, Other: 0 };
  employees.forEach(e => { if (genderCounts[e.gender] !== undefined) genderCounts[e.gender]++; });
  
  const genderDistribution = [
    { name: 'Laki-laki', value: genderCounts.Male, pct: ((genderCounts.Male/totalEmp)*100).toFixed(1), color: COLORS.male },
    { name: 'Perempuan', value: genderCounts.Female, pct: ((genderCounts.Female/totalEmp)*100).toFixed(1), color: COLORS.female },
    // Only add 'Other' if exists
    ...(genderCounts.Other > 0 ? [{ name: 'Lainnya', value: genderCounts.Other, pct: ((genderCounts.Other/totalEmp)*100).toFixed(1), color: COLORS.other }] : [])
  ];

  // C. Ethnicity Analysis
  const ethnicityMap = {};
  employees.forEach(e => {
    ethnicityMap[e.ethnicity] = (ethnicityMap[e.ethnicity] || 0) + 1;
  });
  const ethnicityDistribution = Object.keys(ethnicityMap).map((key, idx) => ({
    name: key,
    value: ethnicityMap[key],
    pct: ((ethnicityMap[key]/totalEmp)*100).toFixed(1),
    color: COLORS.palette[idx % COLORS.palette.length]
  })).sort((a,b) => b.value - a.value);

  // D. Age Analysis (Generational)
  const ageBuckets = { '< 25': 0, '25 - 34': 0, '35 - 44': 0, '45 - 54': 0, '55+': 0 };
  employees.forEach(e => {
    if (e.age < 25) ageBuckets['< 25']++;
    else if (e.age <= 34) ageBuckets['25 - 34']++;
    else if (e.age <= 44) ageBuckets['35 - 44']++;
    else if (e.age <= 54) ageBuckets['45 - 54']++;
    else ageBuckets['55+']++;
  });
  const ageDistribution = Object.keys(ageBuckets).map((key, idx) => ({
    name: key,
    value: ageBuckets[key],
    pct: ((ageBuckets[key]/totalEmp)*100).toFixed(1),
    color: COLORS.palette[idx]
  }));

  // E. Pay Gap Analysis (Global)
  const maleSalaries = employees.filter(e => e.gender === 'Male').map(e => e.salary);
  const femaleSalaries = employees.filter(e => e.gender === 'Female').map(e => e.salary);
  
  const avgMaleSalary = calculateAverage(maleSalaries);
  const avgFemaleSalary = calculateAverage(femaleSalaries);
  const globalPayGap = calcGap(avgMaleSalary, avgFemaleSalary);

  // F. Pay Gap by Department
  const deptMap = {};
  employees.forEach(e => {
    if (!deptMap[e.dept]) deptMap[e.dept] = { maleSal: [], femaleSal: [], count: 0 };
    if (e.gender === 'Male') deptMap[e.dept].maleSal.push(e.salary);
    if (e.gender === 'Female') deptMap[e.dept].femaleSal.push(e.salary);
    deptMap[e.dept].count++;
  });

  const deptPayAnalysis = Object.keys(deptMap).map(dept => {
    const mAvg = calculateAverage(deptMap[dept].maleSal);
    const fAvg = calculateAverage(deptMap[dept].femaleSal);
    return {
      dept: dept,
      maleAvg: mAvg,
      femaleAvg: fAvg,
      gap: calcGap(mAvg, fAvg),
      headcount: deptMap[dept].count
    };
  }).sort((a,b) => b.gap - a.gap); // Sort by biggest gap

  // G. Leadership Analysis
  const leaders = employees.filter(e => e.isLeader);
  const totalLeaders = leaders.length;
  const femaleLeaders = leaders.filter(e => e.gender === 'Female').length;
  const femaleLeaderPct = totalLeaders > 0 ? ((femaleLeaders / totalLeaders) * 100).toFixed(1) : 0;
  
  const leadershipChart = [
    { name: 'Laki-laki', value: totalLeaders - femaleLeaders, color: COLORS.male },
    { name: 'Perempuan', value: femaleLeaders, color: COLORS.female }
  ];

  // H. Pipeline / Glass Ceiling Analysis
  // Group employees by Level -> Calculate Female % per Level
  const pipelineAnalysis = [];
  // Use unique levels found in data if possible, or mapping to CAREER_LEVELS
  const uniqueLevels = [...new Set(employees.map(e => e.level))];
  
  // Sort levels based on CAREER_LEVELS index priority if possible
  uniqueLevels.sort((a, b) => {
    const idxA = CAREER_LEVELS.findIndex(l => a.includes(l));
    const idxB = CAREER_LEVELS.findIndex(l => b.includes(l));
    // If not found in preset, push to end
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  uniqueLevels.forEach(lvl => {
    const group = employees.filter(e => e.level === lvl);
    const fCount = group.filter(e => e.gender === 'Female').length;
    const mCount = group.filter(e => e.gender === 'Male').length;
    if (group.length > 0) {
      pipelineAnalysis.push({
        level: lvl,
        total: group.length,
        femalePct: parseFloat(((fCount / group.length) * 100).toFixed(1)),
        malePct: parseFloat(((mCount / group.length) * 100).toFixed(1))
      });
    }
  });

  // I. Hiring Trends Analysis
  const hiringMap = {};
  employees.forEach(e => {
    if (e.hireYear && e.hireYear.length === 4) {
      if (!hiringMap[e.hireYear]) hiringMap[e.hireYear] = { year: e.hireYear, male: 0, female: 0 };
      if (e.gender === 'Male') hiringMap[e.hireYear].male++;
      if (e.gender === 'Female') hiringMap[e.hireYear].female++;
    }
  });
  const hiringTrend = Object.values(hiringMap).sort((a,b) => a.year - b.year);

  // J. Inclusion Score Analysis
  const validInclusionScores = employees.filter(e => e.inclScore > 0).map(e => e.inclScore);
  const avgInclusionScore = calculateAverage(validInclusionScores);

  const inclusionByDept = Object.keys(deptMap).map(dept => {
    const scores = employees.filter(e => e.dept === dept && e.inclScore > 0).map(e => e.inclScore);
    return {
      dept: dept,
      score: calculateAverage(scores),
      respondents: scores.length
    };
  }).filter(d => d.respondents > 0).sort((a,b) => b.score - a.score);

  // K. DEI Scorecard Calculation (0-100)
  // Components: Gender Balance (25%), Leadership Equity (25%), Pay Equity (25%), Inclusion (25%)
  
  // 1. Gender Balance Score (Target 50%, tolerance +/- 10%)
  const genderRatio = genderCounts.Female / totalEmp;
  const genderScore = Math.max(0, 100 - Math.abs(0.5 - genderRatio) * 200); // Simple linear penalty

  // 2. Leadership Score (Target same as population ratio)
  const leaderRatio = femaleLeaders / (totalLeaders || 1);
  const leaderScore = Math.max(0, 100 - Math.abs(genderRatio - leaderRatio) * 200);

  // 3. Pay Equity Score (Target 0% gap)
  const payScore = Math.max(0, 100 - Math.abs(globalPayGap) * 2); // 1% gap = -2 points

  // 4. Inclusion Score (Target 5.0)
  const inclScore = (avgInclusionScore / 5) * 100;

  const overallScore = ((genderScore + leaderScore + payScore + inclScore) / 4).toFixed(0);

  const scorecard = [
    { metric: 'Keseimbangan Gender', score: genderScore.toFixed(0), weight: '25%', status: getScoreColor(genderScore) },
    { metric: 'Kesetaraan Pimpinan', score: leaderScore.toFixed(0), weight: '25%', status: getScoreColor(leaderScore) },
    { metric: 'Keadilan Gaji (Pay Gap)', score: payScore.toFixed(0), weight: '25%', status: getScoreColor(payScore) },
    { metric: 'Skor Inklusi', score: inclScore.toFixed(0), weight: '25%', status: getScoreColor(inclScore) },
  ];

  return {
    totalEmp,
    genderDistribution,
    ethnicityDistribution,
    ageDistribution,
    disabilityCount: employees.filter(e => e.disability).length,
    globalPayGap,
    avgMaleSalary,
    avgFemaleSalary,
    deptPayAnalysis,
    leadershipChart,
    femaleLeaderPct,
    totalLeaders,
    pipelineAnalysis,
    hiringTrend,
    avgInclusionScore,
    inclusionByDept,
    overallScore,
    scorecard,
    employees // Raw data for tables
  };
};

// ─── 4. TEMPLATE DOWNLOAD ───────────────────────────────────────────────────

const downloadTemplate = () => {
  const wb = XLSX.utils.book_new();
  
  // Header Row
  const headers = [
    'Nama Karyawan', 'Gender', 'Etnis', 'Departemen', 'Grade', 'Level', 
    'Gaji Tahunan', 'Usia', 'Masa Kerja', 'Disabilitas', 
    'Tahun Masuk', 'Tahun Promosi', 'Skor Inklusi', 'Rating Performa'
  ];

  // Dummy Data (20 Rows for Variety)
  const dummyData = [
    ['Budi Santoso', 'Laki-laki', 'Jawa', 'IT', 'G5', 'Senior Staff', 180000000, 32, 5, 'Tidak', 2019, 2022, 4.2, 4.0],
    ['Siti Aminah', 'Perempuan', 'Sunda', 'HR', 'G4', 'Staff', 120000000, 28, 3, 'Tidak', 2021, '', 4.5, 3.8],
    ['Joko Anwar', 'Laki-laki', 'Batak', 'Sales', 'G6', 'Manager', 300000000, 38, 8, 'Tidak', 2016, 2021, 3.8, 4.2],
    ['Dewi Lestari', 'Perempuan', 'Minang', 'Finance', 'G6', 'Manager', 280000000, 36, 7, 'Tidak', 2017, 2022, 4.0, 4.5],
    ['Andi Pratama', 'Laki-laki', 'Jawa', 'IT', 'G3', 'Junior', 96000000, 24, 1, 'Tidak', 2023, '', 3.5, 3.2],
    ['Rina Wati', 'Perempuan', 'Betawi', 'Marketing', 'G5', 'Senior Staff', 190000000, 33, 6, 'Tidak', 2018, 2023, 4.1, 4.0],
    ['Eko Kurniawan', 'Laki-laki', 'Jawa', 'Operations', 'G4', 'Staff', 130000000, 29, 4, 'Ya', 2020, '', 3.9, 3.5],
    ['Fajar Nugroho', 'Laki-laki', 'Sunda', 'IT', 'G7', 'VP', 500000000, 45, 12, 'Tidak', 2012, 2020, 3.5, 4.8],
    ['Gita Gutawa', 'Perempuan', 'Jawa', 'HR', 'G5', 'Senior Staff', 175000000, 31, 5, 'Tidak', 2019, 2023, 4.3, 4.1],
    ['Hendra Setiawan', 'Laki-laki', 'Tionghoa', 'Finance', 'G7', 'Director', 550000000, 48, 15, 'Tidak', 2010, 2019, 4.0, 4.6],
    ['Indah Permata', 'Perempuan', 'Melayu', 'Sales', 'G3', 'Junior', 90000000, 23, 1, 'Tidak', 2023, '', 4.0, 3.0],
    ['Kiki Amalia', 'Perempuan', 'Jawa', 'Marketing', 'G6', 'Manager', 290000000, 37, 9, 'Tidak', 2015, 2021, 3.8, 4.3],
    ['Lina Marlina', 'Perempuan', 'Sunda', 'Operations', 'G3', 'Junior', 85000000, 22, 0.5, 'Tidak', 2024, '', 3.6, 3.0],
    ['Maman Suherman', 'Laki-laki', 'Betawi', 'IT', 'G5', 'Lead', 220000000, 34, 6, 'Tidak', 2018, 2022, 3.7, 4.1],
    ['Nina Zatulini', 'Perempuan', 'Minang', 'Finance', 'G4', 'Staff', 140000000, 27, 3, 'Tidak', 2021, '', 4.2, 3.9],
    ['Oscar Lawalata', 'Laki-laki', 'Jawa', 'HR', 'G6', 'Manager', 295000000, 39, 10, 'Tidak', 2014, 2020, 4.0, 4.2],
    ['Putri Titian', 'Perempuan', 'Batak', 'Sales', 'G5', 'Lead', 210000000, 32, 5, 'Tidak', 2019, 2023, 3.9, 4.0],
    ['Qory Sandioriva', 'Perempuan', 'Aceh', 'Marketing', 'G4', 'Staff', 150000000, 28, 4, 'Tidak', 2020, '', 4.1, 3.7],
    ['Raffi Ahmad', 'Laki-laki', 'Sunda', 'Operations', 'G7', 'GM', 450000000, 42, 11, 'Tidak', 2013, 2019, 3.6, 4.7],
    ['Syahrini', 'Perempuan', 'Sunda', 'IT', 'G5', 'Senior Staff', 200000000, 35, 7, 'Ya', 2017, 2022, 4.4, 4.3]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dummyData]);
  ws['!cols'] = headers.map(() => ({ wch: 18 })); // Lebar kolom

  XLSX.utils.book_append_sheet(wb, ws, 'DATA_KARYAWAN');

  // Panduan Sheet
  const guide = [
    ['PANDUAN PENGISIAN DATA DEI DASHBOARD'],
    [''],
    ['1. Gender: Gunakan "Laki-laki" / "Male" atau "Perempuan" / "Female".'],
    ['2. Gaji Tahunan: Isi angka penuh tanpa titik/koma (cth: 120000000).'],
    ['3. Level: Gunakan istilah standar (Staff, Senior, Manager, Director, VP).'],
    ['   - Sistem akan otomatis mendeteksi level pimpinan berdasarkan kata kunci.'],
    ['4. Skor Inklusi: Skala 1 - 5 (opsional, jika ada data survei).'],
    ['5. Disabilitas: Isi "Ya" atau "Tidak".'],
    ['6. Etnis: Opsional, untuk analisa keberagaman budaya.'],
    [''],
    ['FITUR ANALISA:'],
    ['- Pay Gap: Menghitung selisih rata-rata gaji Pria vs Wanita.'],
    ['- Pipeline: Melihat proporsi wanita di setiap jenjang karir.'],
    ['- Leadership: Memantau representasi wanita di pucuk pimpinan.'],
    ['- Hiring: Tren rekrutmen berdasarkan gender dari tahun ke tahun.']
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guide);
  XLSX.utils.book_append_sheet(wb, wsGuide, 'PANDUAN');

  XLSX.writeFile(wb, 'Template_DEI_Dashboard.xlsx');
};

// ─── 5. KOMPONEN UI (CARD & CHART WRAPPERS) ─────────────────────────────────

const KPICard = ({ title, value, subtext, color = 'blue' }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500 opacity-5 rounded-full -mr-10 -mt-10`}></div>
    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
    <div className="text-3xl font-extrabold text-slate-800 mb-1">{value}</div>
    <p className={`text-xs font-medium text-${color}-600`}>{subtext}</p>
  </div>
);

const SectionTitle = ({ title, desc }) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold text-slate-800">{title}</h2>
    <p className="text-sm text-slate-500">{desc}</p>
  </div>
);

// ─── 6. MAIN COMPONENT ──────────────────────────────────────────────────────

const DEIDashboard = ({ onBack }) => {
  const [view, setView] = useState('upload');
  const [data, setData] = useState(null);
  const [activeMenu, setActiveMenu] = useState('overview');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        
        if (jsonData.length === 0) throw new Error("File Kosong");
        
        const processed = processDEIData(jsonData);
        setData(processed);
        setView('dashboard');
      } catch (err) {
        alert("Gagal memproses file: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Navigasi Menu
  const MENUS = [
    { id: 'overview', label: 'Ringkasan' },
    { id: 'paygap', label: 'Celah Gaji' },
    { id: 'diversity', label: 'Keberagaman' },
    { id: 'leadership', label: 'Kepemimpinan' },
    { id: 'pipeline', label: 'Jenjang Karir' },
    { id: 'hiring', label: 'Rekrutmen' },
    { id: 'inclusion', label: 'Inklusi' }
  ];

  // ─── RENDER: UPLOAD VIEW ────────────────────────────────────────────────
  if (view === 'upload') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <button onClick={onBack} className="fixed top-6 left-6 px-4 py-2 bg-white text-slate-700 rounded-lg shadow-sm hover:bg-slate-100 transition z-50 font-bold text-sm">
          ← Kembali
        </button>
        
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-slate-200">
          {/* Left Side */}
          <div className="w-full md:w-5/12 p-10 flex flex-col justify-center items-center text-center bg-indigo-50 border-r border-indigo-100">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 text-5xl shadow-md">🌍</div>
            <h1 className="text-3xl font-extrabold text-slate-800 mb-2">DEI Dashboard</h1>
            <p className="text-slate-500 mb-8 text-sm">Diversity, Equity & Inclusion Analytics</p>
            
            <div className="w-full space-y-3">
              <label className="cursor-pointer block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg transition transform hover:-translate-y-1 text-sm">
                <span>📂 Upload Data Excel</span>
                <input type="file" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
              </label>
              <button onClick={downloadTemplate} className="block w-full bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-600 py-3 rounded-xl font-bold transition text-sm">
                📥 Download Template
              </button>
            </div>
            {loading && <p className="mt-4 text-indigo-600 font-bold animate-pulse text-xs">Sedang Menganalisa...</p>}
          </div>

          {/* Right Side */}
          <div className="w-full md:w-7/12 p-10 bg-white flex flex-col justify-center">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Fitur Analisa Lengkap (v1.3)</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="block font-bold text-slate-800 mb-1">⚖️ Pay Gap</span>
                Deteksi kesenjangan gaji gender & departemen.
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="block font-bold text-slate-800 mb-1">🪜 Pipeline</span>
                Analisa "Glass Ceiling" & rasio promosi.
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="block font-bold text-slate-800 mb-1">👑 Leadership</span>
                Monitoring representasi wanita di level atas.
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="block font-bold text-slate-800 mb-1">🤝 Inklusi</span>
                Skor survei & demografi karyawan.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: DASHBOARD VIEW ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar */}
      <div className="bg-white border-b sticky top-0 z-30 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">DEI Analytics</h1>
              <p className="text-xs text-slate-500 font-medium">{data.totalEmp} Karyawan • Skor DEI: {data.overallScore}/100</p>
            </div>
            <button onClick={() => setView('upload')} className="text-red-600 text-xs font-bold hover:bg-red-50 px-3 py-2 rounded-lg transition">
              Keluar / Upload Ulang
            </button>
          </div>
          
          {/* Menu Navigasi (Teks Saja, Rapi) */}
          <div className="flex flex-wrap gap-2">
            {MENUS.map(m => (
              <button 
                key={m.id} 
                onClick={() => setActiveMenu(m.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeMenu === m.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8 pb-20">
        
        {/* 1. OVERVIEW */}
        {activeMenu === 'overview' && (
          <div className="animate-fade-in space-y-6">
            <SectionTitle title="Ringkasan Eksekutif" desc="Kartu skor DEI dan demografi utama perusahaan." />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <KPICard title="Skor DEI" value={data.overallScore} subtext="Target: 80+" color={data.overallScore >= 80 ? 'emerald' : 'indigo'} />
              <KPICard title="Gender Gap (Gaji)" value={`${data.globalPayGap}%`} subtext={data.globalPayGap <= 5 ? '✅ Sehat (<5%)' : '⚠️ Perlu Perhatian'} color={data.globalPayGap <= 5 ? 'emerald' : 'red'} />
              <KPICard title="Rasio Wanita" value={`${data.genderDistribution.find(x=>x.name==='Perempuan')?.pct || 0}%`} subtext="Target: 40-50%" color="purple" />
              <KPICard title="Wanita di Pimpinan" value={`${data.femaleLeaderPct}%`} subtext={`${data.totalLeaders} Total Leaders`} color="pink" />
            </div>

            {/* Scorecard Detailed */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">Kartu Skor DEI Detail</h3>
              <div className="space-y-4">
                {data.scorecard.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="w-48 text-sm font-semibold text-slate-600">{item.metric}</span>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.score}%`, backgroundColor: item.status }} />
                    </div>
                    <span className="w-12 text-right font-bold text-sm" style={{ color: item.status }}>{item.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Gender Chart */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4">Distribusi Gender</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.genderDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name, pct}) => `${name} ${pct}%`}>
                          {data.genderDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               {/* Ethnicity Chart */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4">Distribusi Etnis/Suku</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.ethnicityDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({pct}) => `${pct}%`}>
                          {data.ethnicityDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* 2. PAY GAP */}
        {activeMenu === 'paygap' && (
          <div className="animate-fade-in space-y-6">
            <SectionTitle title="Analisa Kesenjangan Gaji" desc="Perbandingan rata-rata gaji antara laki-laki dan perempuan." />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-slate-400 text-xs font-bold uppercase">Rata-rata Pria</p>
                <p className="text-2xl font-black text-blue-600 mt-2">{fmtIDR(data.avgMaleSalary)}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-slate-400 text-xs font-bold uppercase">Rata-rata Wanita</p>
                <p className="text-2xl font-black text-purple-600 mt-2">{fmtIDR(data.avgFemaleSalary)}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center relative overflow-hidden">
                 <div className={`absolute top-0 left-0 w-1 h-full bg-${data.globalPayGap <= 5 ? 'emerald' : 'red'}-500`}></div>
                <p className="text-slate-400 text-xs font-bold uppercase">Gap Gaji (Unadjusted)</p>
                <p className={`text-4xl font-black mt-2 ${data.globalPayGap <= 5 ? 'text-emerald-600' : 'text-red-600'}`}>{data.globalPayGap}%</p>
                <p className="text-xs text-slate-500 mt-1">{data.globalPayGap <= 5 ? 'Dalam batas wajar' : 'Perlu investigasi'}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6">Gap Gaji per Departemen</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.deptPayAnalysis} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(val) => `${val}%`} />
                    <YAxis dataKey="dept" type="category" width={100} tick={{fontSize: 12}} />
                    <Tooltip formatter={(val) => `${val}% Gap`} />
                    <Legend />
                    <Bar dataKey="gap" name="Gap Gaji (%)" fill="#6366f1" radius={[0, 4, 4, 0]}>
                      {data.deptPayAnalysis.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getGapColor(entry.gap)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 3. DIVERSITY */}
        {activeMenu === 'diversity' && (
          <div className="animate-fade-in space-y-6">
            <SectionTitle title="Analisa Keberagaman" desc="Sebaran demografi karyawan berdasarkan usia, etnis, dan disabilitas." />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Generasi / Usia</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.ageDistribution}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 11}} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Jumlah" radius={[4, 4, 0, 0]}>
                        {data.ageDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
                 <div className="text-center">
                    <div className="text-6xl mb-4">♿</div>
                    <h3 className="text-4xl font-black text-slate-800">{data.disabilityCount}</h3>
                    <p className="text-slate-500 font-medium">Karyawan Penyandang Disabilitas</p>
                    <div className="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-xs text-slate-600">
                      {(data.disabilityCount / data.totalEmp * 100).toFixed(1)}% dari total populasi
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. LEADERSHIP */}
        {activeMenu === 'leadership' && (
          <div className="animate-fade-in space-y-6">
            <SectionTitle title="Analisa Kepemimpinan" desc="Representasi gender di level manajemen ke atas." />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-slate-800 mb-4">Gender Leaders</h3>
                 <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.leadershipChart} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({value}) => value}>
                          <Cell fill={COLORS.male} />
                          <Cell fill={COLORS.female} />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
               </div>
               
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-center">
                  <h3 className="font-bold text-slate-500 uppercase text-xs mb-2">Persentase Pimpinan Wanita</h3>
                  <div className="text-5xl font-black text-indigo-600 mb-2">{data.femaleLeaderPct}%</div>
                  <p className="text-sm text-slate-600">Dari total {data.totalLeaders} posisi pimpinan</p>
                  <div className="mt-6 w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${data.femaleLeaderPct}%` }}></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-400">
                    <span>0%</span>
                    <span>Target: 40-50%</span>
                    <span>100%</span>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* 5. PIPELINE (JENJANG KARIR) */}
        {activeMenu === 'pipeline' && (
          <div className="animate-fade-in space-y-6">
            <SectionTitle title="Jenjang Karir (Pipeline)" desc="Analisa kebocoran bakat wanita di setiap kenaikan level (Glass Ceiling)." />
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6">Komposisi Gender per Level Jabatan</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.pipelineAnalysis} layout="vertical" margin={{ left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="level" type="category" width={100} tick={{fontSize: 11}} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="femalePct" name="Wanita %" stackId="a" fill={COLORS.female} />
                    <Bar dataKey="malePct" name="Pria %" stackId="a" fill={COLORS.male} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-200">
                <strong>💡 Insight:</strong> Jika persentase wanita (ungu) mengecil drastis di level atas (VP/Director), ini indikasi adanya "Glass Ceiling".
              </div>
            </div>
          </div>
        )}

        {/* 6. HIRING & PROMO */}
        {activeMenu === 'hiring' && (
          <div className="animate-fade-in space-y-6">
            <SectionTitle title="Rekrutmen & Promosi" desc="Tren penerimaan karyawan baru berdasarkan tahun." />
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6">Tren Rekrutmen (Tahun Masuk)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hiringTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="male" name="Laki-laki" fill={COLORS.male} />
                    <Bar dataKey="female" name="Perempuan" fill={COLORS.female} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 7. INCLUSION */}
        {activeMenu === 'inclusion' && (
          <div className="animate-fade-in space-y-6">
            <SectionTitle title="Analisa Inklusi" desc="Berdasarkan skor survei kepuasan dan rasa memiliki karyawan." />
            
            {data.avgInclusionScore > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col justify-center items-center">
                   <h3 className="text-slate-400 font-bold uppercase text-xs mb-4">Skor Inklusi Rata-rata</h3>
                   <div className="text-6xl font-black text-slate-800 mb-2">{data.avgInclusionScore.toFixed(1)}</div>
                   <div className="text-sm text-slate-500 mb-6">Skala 1 - 5</div>
                   <span className={`px-4 py-2 rounded-full font-bold text-sm ${data.avgInclusionScore >= 4 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                      {data.avgInclusionScore >= 4 ? 'Budaya Inklusif Kuat' : 'Perlu Perbaikan'}
                   </span>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4">Skor Inklusi per Departemen</h3>
                  <div className="space-y-4">
                    {data.inclusionByDept.map((dept, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-semibold text-slate-700">{dept.dept}</span>
                          <span className="font-bold text-indigo-600">{dept.score.toFixed(1)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full">
                          <div className="h-full bg-indigo-500 rounded-full" style={{width: `${(dept.score/5)*100}%`}}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="font-bold text-slate-800 text-lg">Data Survei Tidak Tersedia</h3>
                <p className="text-slate-500 mt-2">Silakan lengkapi kolom "Skor Inklusi" (1-5) pada file Excel Anda untuk melihat analisa ini.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default DEIDashboard;