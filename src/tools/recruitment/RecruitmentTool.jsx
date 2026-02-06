import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';
import { jsPDF } from "jspdf"; 
import autoTable from 'jspdf-autotable';
import './RecruitmentStyle.css';

// --- UI COMPONENTS ---
const StatCard = ({ label, value, sub, color }) => (
  <div className={`bg-white p-5 rounded-2xl border-l-4 border-${color}-500 shadow-sm text-left hover:shadow-md transition`}>
    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
    <div className="mt-2 text-2xl font-bold text-gray-800">{value}</div>
    {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
  </div>
);

const MiniCard = ({ title, value, unit, isGood, target }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:border-blue-200 transition">
    <div>
      <h3 className="text-xs font-bold text-gray-400 uppercase">{title}</h3>
      <div className="mt-1 text-xl font-bold text-gray-800">
        {value} <span className="text-xs font-normal text-gray-500">{unit}</span>
      </div>
    </div>
    {target && (
      <div className={`text-xs px-2 py-1 rounded font-bold ${isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {target}
      </div>
    )}
  </div>
);

const ChartContainer = ({ title, children, height = 'h-64' }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
    <h3 className="text-gray-800 font-bold mb-4 text-sm uppercase tracking-wide">{title}</h3>
    <div className={`relative w-full ${height}`}>{children}</div>
  </div>
);

// --- MAIN COMPONENT ---
const RecruitmentTool = ({ onBack }) => {
  
  const [view, setView] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activePhase, setActivePhase] = useState('overview');
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('All');

  const chartRefs = useRef({});

  // ============================================================================
  // 🔧 SMART DATE UTILS (ANTI-ERROR)
  // ============================================================================
  
  // Fungsi Helper: Parse Tanggal dari segala format (Excel Serial / String / Date Object)
  const parseDate = (input) => {
    if (!input) return null;
    
    // 1. Jika sudah Date Object (karena cellDates: true)
    if (input instanceof Date && !isNaN(input)) return input;

    // 2. Jika Excel Serial Number (Angka, misal 45305)
    if (typeof input === 'number') {
       // Konversi angka Excel ke Date JS
       return new Date(Math.round((input - 25569) * 86400 * 1000));
    }

    // 3. Jika String 'YYYY-MM-DD'
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  };

  // Hitung selisih hari (Absolut)
  const calculateDays = (startRaw, endRaw) => {
    const start = parseDate(startRaw);
    const end = parseDate(endRaw);

    if (!start || !end) return 0;

    // Reset jam ke 00:00:00 agar hitungan murni hari
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    const diffTime = end - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Minimal 0 hari (jika closed di hari yang sama, jangan minus)
    return Math.max(0, diffDays);
  };

  const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  // ============================================================================
  // 📖 PDF GUIDE GENERATOR
  // ============================================================================
  const downloadGuidePDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(41, 128, 185);
      doc.text("PANDUAN PENGISIAN DATA REKRUTMEN", 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Dokumen ini menjelaskan fungsi setiap kolom pada Template Excel.", 14, 28);

      const columns = [
        { header: 'Nama Kolom', dataKey: 'col' },
        { header: 'Penjelasan & Cara Isi', dataKey: 'desc' },
        { header: 'Fungsi di Dashboard', dataKey: 'func' },
      ];

      const data = [
        { col: 'No Request', desc: 'Nomor unik permintaan (Contoh: REQ-001).', func: 'Hitung Total Request.' },
        { col: 'Departemen', desc: 'Divisi peminta (IT, Sales, HR, dll).', func: 'Filter Data per Dept.' },
        { col: 'Tanggal Request', desc: 'Tgl user mengajukan permintaan (YYYY-MM-DD).', func: 'Start Time to Fill (TTF).' },
        { col: 'Tanggal Closed', desc: 'Tgl kandidat tanda tangan kontrak / posisi ditutup.', func: 'Finish Time to Fill (TTF).' },
        { col: 'Posisi', desc: 'Judul lowongan kerja.', func: 'Arsip data.' },
        { col: 'Status', desc: 'Isi salah satu: Join, Proses, atau Batal.', func: 'Kategori status.' },
        { col: 'Tanggal Apply', desc: 'Tgl kandidat melamar/mengirim CV.', func: 'Start Time to Hire (TTH).' },
        { col: 'Tanggal Join', desc: 'Tgl hari pertama kerja.', func: 'Finish Time to Hire (TTH).' },
        { col: 'Lulus Probation', desc: 'Isi "Y" jika lulus, "N" jika tidak/resign.', func: 'Probation Pass Rate.' },
        { col: 'Tanggal Resign', desc: 'Isi jika keluar < 6 bulan. Kosongkan jika aktif.', func: 'Turnover & Retention.' },
        { col: 'Biaya Rekrutmen', desc: 'Total biaya (Angka saja tanpa titik/koma).', func: 'Cost per Hire.' },
        { col: 'Sumber Kandidat', desc: 'Asal pelamar (LinkedIn, JobStreet, dll).', func: 'Pie Chart Channel.' },
        { col: 'SLA Terpenuhi', desc: 'Isi "Y" jika sesuai deadline, "N" jika telat.', func: 'SLA Compliance %.' },
        { col: 'Total Offer', desc: 'Jumlah offering letter yang dikirim.', func: 'Offer Acceptance Rate.' },
        { col: 'Offer Diterima', desc: 'Jumlah offer yang deal (Biasanya 1).', func: 'Offer Acceptance Rate.' },
        { col: 'Kepuasan User', desc: 'Rating dari User Manager (Angka 1 - 5).', func: 'User Satisfaction.' },
        { col: 'Sesuai SOP', desc: 'Isi "Y" jika proses sesuai prosedur.', func: 'Compliance Rate.' },
      ];

      autoTable(doc, {
        head: [columns.map(c => c.header)],
        body: data.map(r => [r.col, r.desc, r.func]),
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold' }, 1: { cellWidth: 75 }, 2: { cellWidth: 'auto' } }
      });

      doc.save("Panduan_Kolom_Rekrutmen.pdf");
    } catch (error) {
      alert("Gagal download PDF. Pastikan library terinstall: npm install jspdf jspdf-autotable");
    }
  };

  // --- TEMPLATE DOWNLOAD ---
  const downloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const masterData = [
        ['No Request', 'Departemen', 'Tanggal Request', 'Tanggal Closed', 'Posisi', 'Status', 'Tanggal Apply', 'Tanggal Join', 'Lulus Probation', 'Tanggal Resign', 'Biaya Rekrutmen', 'Sumber Kandidat', 'SLA Terpenuhi', 'Total Offer', 'Offer Diterima', 'Kepuasan User', 'Sesuai SOP'],
        ['REQ001', 'IT', '2024-01-05', '2024-02-15', 'Software Engineer', 'Join', '2024-01-10', '2024-02-20', 'Y', '', 2000000, 'Job Portal', 'Y', 1, 1, 4.5, 'Y']
      ];
      const ws = XLSX.utils.aoa_to_sheet(masterData);
      ws['!cols'] = Array(17).fill({ wch: 15 });
      XLSX.utils.book_append_sheet(wb, ws, 'MASTER_DATA');
      XLSX.writeFile(wb, 'Template_Recruitment_Analytics_Dept.xlsx');
    } catch (error) {
      alert("Gagal download Template. Pastikan library terinstall: npm install xlsx");
    }
  };

  // --- FILE UPLOAD ---
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
        
        // PENTING: cellDates: true agar Excel Serial Number otomatis jadi JS Date
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { cellDates: true, defval: "" });

        if (jsonData.length === 0) { alert('⚠️ File kosong'); setLoading(false); return; }

        const deptList = [...new Set(jsonData.map(item => item['Departemen'] || 'Unassigned'))].sort();
        setDepartments(['All', ...deptList]);
        setRawData(jsonData);
        setView('dashboard');
      } catch (error) { alert('❌ Error processing: ' + error.message); } 
      finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- EXPORT REPORT ---
  const exportReport = () => {
    if (!analytics || !rawData) return;
    try {
      const wb = XLSX.utils.book_new();
      const summary = [['Report Recruitment'], ['Date:', new Date().toLocaleDateString()], ['Dept:', selectedDept]];
      const ws1 = XLSX.utils.aoa_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
      const ws2 = XLSX.utils.json_to_sheet(rawData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Raw Data');
      XLSX.writeFile(wb, `Recruitment_Report_${selectedDept}.xlsx`);
    } catch (error) {
      alert("Gagal Export Report: " + error.message);
    }
  };

  // --- CALCULATION LOGIC (FIXED) ---
  useEffect(() => {
    if(rawData.length > 0) {
      const filteredData = selectedDept === 'All' 
        ? rawData 
        : rawData.filter(item => (item['Departemen'] || 'Unassigned') === selectedDept);
      
      const joinedData = filteredData.filter(r => r.Status === 'Join');
      const closedData = filteredData.filter(r => r['Tanggal Closed']);
      
      // PLANNING
      const totalRequest = filteredData.length; 
      const donePositions = closedData.length;
      const inProcess = filteredData.filter(r => !r['Tanggal Closed'] && r.Status !== 'Batal').length;
      const canceled = filteredData.filter(r => r.Status === 'Batal').length;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const newRequests = filteredData.filter(r => {
          const d = parseDate(r['Tanggal Request']);
          if(!d) return false;
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length;

      const totalBudget = filteredData.reduce((s, r) => s + (parseFloat(r['Biaya Rekrutmen']) || 0), 0);
      const avgBudget = totalRequest > 0 ? totalBudget / totalRequest : 0;

      // PROCESS (FIXED TTF & TTH)
      let totalTTF = 0, countTTF = 0;
      closedData.forEach(r => {
        // Hanya hitung jika kedua tanggal ada
        if (r['Tanggal Request'] && r['Tanggal Closed']) {
            const days = calculateDays(r['Tanggal Request'], r['Tanggal Closed']);
            totalTTF += days; 
            countTTF++; 
        }
      });
      const avgTTF = countTTF > 0 ? (totalTTF / countTTF).toFixed(1) : '0';

      let totalTTH = 0, countTTH = 0;
      joinedData.forEach(r => {
        if (r['Tanggal Apply'] && r['Tanggal Join']) {
            const days = calculateDays(r['Tanggal Apply'], r['Tanggal Join']);
            totalTTH += days; 
            countTTH++; 
        }
      });
      const avgTTH = countTTH > 0 ? (totalTTH / countTTH).toFixed(1) : '0';

      // Other Metrics
      const slaCount = filteredData.filter(r => r['SLA Terpenuhi'] === 'Y').length;
      const slaRate = totalRequest > 0 ? ((slaCount / totalRequest) * 100).toFixed(1) : '0';

      const totalOffer = filteredData.reduce((s, r) => s + (parseFloat(r['Total Offer']) || 0), 0);
      const offerAccepted = filteredData.reduce((s, r) => s + (parseFloat(r['Offer Diterima']) || 0), 0);
      const acceptanceRate = totalOffer > 0 ? ((offerAccepted / totalOffer) * 100).toFixed(1) : '0';

      const costPerHire = joinedData.length > 0 ? Math.round(totalBudget / joinedData.length) : 0;
      
      const channels = {};
      filteredData.forEach(r => { 
          const ch = r['Sumber Kandidat'] || 'Lainnya'; 
          channels[ch] = (channels[ch] || 0) + 1; 
      });

      // POST-HIRING
      const probationPassed = joinedData.filter(r => r['Lulus Probation'] === 'Y').length;
      const probationRate = joinedData.length > 0 ? ((probationPassed / joinedData.length) * 100).toFixed(1) : '0';
      const turnoverCount = joinedData.filter(r => r['Tanggal Resign']).length;
      const turnoverRate = joinedData.length > 0 ? ((turnoverCount / joinedData.length) * 100).toFixed(1) : '0';
      
      const validSatisfactionData = filteredData.filter(r => parseFloat(r['Kepuasan User']) > 0);
      const avgSatisfaction = validSatisfactionData.length > 0 
        ? (validSatisfactionData.reduce((s, r) => s + parseFloat(r['Kepuasan User']), 0) / validSatisfactionData.length).toFixed(1) 
        : '0';

      setAnalytics({
        overview: { totalRequest, totalJoined: joinedData.length, avgTTF, avgTTH, costPerHire, probationRate, turnoverRate },
        planning: { mppTotal: totalRequest, onProcess: inProcess, done: donePositions, canceled, newReq: newRequests, budget: totalBudget, avgBudget },
        process: { avgTTF, avgTTH, slaRate, acceptanceRate, costPerHire, inProcess, channels },
        postHiring: { probationRate, turnoverRate, avgSatisfaction, retentionRate: (100-parseFloat(turnoverRate)).toFixed(1), probationPassed, turnoverCount }
      });
    }
  }, [selectedDept, rawData]);

  // --- CHART RENDERING ---
  useEffect(() => {
    if (view !== 'dashboard' || !analytics) return;
    Object.values(chartRefs.current).forEach(c => c?.destroy());

    setTimeout(() => {
      const commonOptions = { responsive: true, maintainAspectRatio: false };

      // OVERVIEW & PROCESS CHANNEL
      if (activePhase === 'process' || activePhase === 'overview') {
         const ctxChannel = document.getElementById('channelChart');
         if(ctxChannel && analytics.process.channels) {
            chartRefs.current.channel = new Chart(ctxChannel, {
                type: 'bar',
                data: {
                    labels: Object.keys(analytics.process.channels),
                    datasets: [{
                        label: 'Kandidat',
                        data: Object.values(analytics.process.channels),
                        backgroundColor: '#6366f1',
                        borderRadius: 4
                    }]
                },
                options: commonOptions
            });
         }
      }

      // PLANNING STATUS
      if (activePhase === 'planning') {
        const ctxStatus = document.getElementById('statusChart');
        if (ctxStatus) {
          chartRefs.current.status = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
              labels: ['Done', 'On Process', 'New', 'Canceled'],
              datasets: [{
                data: [analytics.planning.done, analytics.planning.onProcess, analytics.planning.newReq, analytics.planning.canceled],
                backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444']
              }]
            },
            options: { ...commonOptions, plugins: { legend: { position: 'right' } } }
          });
        }
      }

      // PROCESS TIME
      if (activePhase === 'process') {
        const ctxTime = document.getElementById('timeChart');
        if(ctxTime) {
            chartRefs.current.time = new Chart(ctxTime, {
                type: 'bar',
                data: {
                    labels: ['TTF Actual', 'TTF Target', 'TTH Actual', 'TTH Target'],
                    datasets: [{
                        label: 'Hari',
                        data: [parseFloat(analytics.process.avgTTF), 30, parseFloat(analytics.process.avgTTH), 25],
                        backgroundColor: ['#3b82f6', '#94a3b8', '#8b5cf6', '#94a3b8'],
                        borderRadius: 6
                    }]
                },
                options: { ...commonOptions, plugins: { legend: { display: false } } }
            });
        }
      }

      // POST HIRING QUALITY
      if (activePhase === 'posthiring') {
        const ctxQuality = document.getElementById('qualityChart');
        if(ctxQuality) {
            chartRefs.current.quality = new Chart(ctxQuality, {
                type: 'polarArea',
                data: {
                    labels: ['Probation Pass', 'Retention', 'Satisfaction'],
                    datasets: [{
                        data: [parseFloat(analytics.postHiring.probationRate), parseFloat(analytics.postHiring.retentionRate), (parseFloat(analytics.postHiring.avgSatisfaction)/5)*100],
                        backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b']
                    }]
                },
                options: commonOptions
            });
        }
      }
    }, 100);

    return () => { Object.values(chartRefs.current).forEach(c => c?.destroy()); };
  }, [view, activePhase, analytics]);

  // --- RENDER UI ---
  if (view === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <button onClick={onBack} className="fixed top-6 left-6 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:bg-gray-50 transition">← Kembali</button>
        <div className="max-w-4xl w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-12 border border-white/20 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg text-5xl">📊</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-3">Recruitment Analytics</h1>
            <p className="text-lg text-gray-600 mb-8">3-Phase Lifecycle Analysis (Planning - Process - Monitoring)</p>
            <div className="border-2 border-dashed border-blue-300 rounded-2xl p-10 bg-blue-50/50">
               {loading ? <div className="spinner mx-auto border-blue-600"></div> : (
                 <div className="flex flex-col gap-6">
                    <div className="flex justify-center gap-4">
                        <label className="cursor-pointer px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition flex items-center gap-2">
                            <span className="text-xl">📂</span> <input type="file" onChange={handleFileUpload} accept=".xlsx,.xls" className="hidden" /> Upload Excel
                        </label>
                        <button onClick={downloadTemplate} className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg transition flex items-center gap-2">
                            <span className="text-xl">📥</span> Template Excel
                        </button>
                    </div>
                    <button onClick={downloadGuidePDF} className="text-sm text-blue-600 hover:text-blue-800 font-semibold underline decoration-dotted underline-offset-4">
                        📖 Download Buku Panduan (PDF)
                    </button>
                 </div>
               )}
               <p className="text-xs text-gray-400 mt-6">*Gunakan template Excel yang disediakan agar analisa akurat.</p>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Recruitment Analytics</h1>
              <p className="text-blue-100 text-xs">Strategic Dashboard & Monitoring</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-lg backdrop-blur-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-100 ml-2">Dept:</span>
                  <select 
                      value={selectedDept} 
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="bg-white text-gray-800 text-sm font-semibold rounded px-3 py-1 outline-none border-none cursor-pointer hover:bg-gray-50 transition"
                  >
                      {departments.map(dept => <option key={dept} value={dept}>{dept === 'All' ? 'Semua Dept' : dept}</option>)}
                  </select>
              </div>
              <button onClick={exportReport} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-xs font-bold transition">Export</button>
              <button onClick={() => setView('upload')} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm">Keluar</button>
            </div>
          </div>
          <div className="flex gap-1 mt-6 overflow-x-auto pb-1">
            {[{ id: 'overview', label: '📊 Overview' }, { id: 'planning', label: '📋 Planning (MPP)' }, { id: 'process', label: '🔄 Process' }, { id: 'posthiring', label: '✅ Monitoring' }].map(p => (
              <button key={p.id} onClick={() => setActivePhase(p.id)} 
                className={`px-6 py-2.5 rounded-t-lg font-bold text-xs transition-all whitespace-nowrap ${activePhase === p.id ? 'bg-gray-50 text-blue-600 shadow-lg translate-y-1' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full animate-fade-in">
        
        {/* === TAB 1: OVERVIEW === */}
        {activePhase === 'overview' && analytics && (
          <div className="grid grid-cols-12 gap-6">
             <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Request" value={analytics.overview.totalRequest} sub="Posisi" color="blue" />
                <StatCard label="Joined" value={analytics.overview.totalJoined} sub="Kandidat" color="green" />
                <StatCard label="Avg Time to Fill" value={analytics.overview.avgTTF + ' Hari'} sub="Target: ≤30" color="indigo" />
                <StatCard label="Turnover Rate" value={analytics.overview.turnoverRate + '%'} sub="Target: ≤10%" color={parseFloat(analytics.overview.turnoverRate) <= 10 ? 'green' : 'red'} />
             </div>
             <div className="col-span-12 md:col-span-8">
                <ChartContainer title="Sumber Kandidat (Channel Efficiency)">
                    <canvas id="channelChart"></canvas>
                </ChartContainer>
             </div>
             <div className="col-span-12 md:col-span-4 space-y-4">
                <MiniCard title="Cost per Hire" value={formatRupiah(analytics.overview.costPerHire)} unit="" isGood={analytics.overview.costPerHire <= 2000000} target="≤ 2jt" />
                <MiniCard title="Probation Pass" value={analytics.overview.probationRate + '%'} unit="" isGood={parseFloat(analytics.overview.probationRate) >= 85} target="≥ 85%" />
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                    💡 <strong>Insight:</strong> Fokus pada channel recruitment yang paling efektif untuk mengurangi Cost per Hire.
                </div>
             </div>
          </div>
        )}

        {/* === TAB 2: PLANNING (MPP) === */}
        {activePhase === 'planning' && analytics && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 mb-2 flex justify-between items-center border-b pb-2">
                <h2 className="text-xl font-bold text-gray-800">Status Pemenuhan MPP ({selectedDept})</h2>
                <span className="text-sm bg-gray-200 px-3 py-1 rounded-full text-gray-600 font-semibold">{new Date().getFullYear()}</span>
            </div>
            <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Kebutuhan MPP" value={analytics.planning.mppTotal} sub="Total Tahun Ini" color="blue" />
                <StatCard label="Sedang Proses" value={analytics.planning.onProcess} sub="Open / In Progress" color="yellow" />
                <StatCard label="Selesai (Done)" value={analytics.planning.done} sub="Closed / Join" color="green" />
                <div className="bg-indigo-600 p-5 rounded-2xl shadow-md text-white relative overflow-hidden hover:scale-105 transition-transform">
                    <div className="absolute right-0 top-0 p-4 opacity-20 text-6xl">🔥</div>
                    <p className="text-xs font-bold uppercase opacity-80">Permintaan Baru</p>
                    <h3 className="text-4xl font-extrabold mt-2">{analytics.planning.newReq}</h3>
                    <p className="text-xs mt-2 opacity-90">Masuk Bulan Ini</p>
                </div>
            </div>
            <div className="col-span-12 md:col-span-8">
                <ChartContainer title="Grafik Status Pemenuhan">
                    <canvas id="statusChart"></canvas>
                </ChartContainer>
            </div>
            <div className="col-span-12 md:col-span-4 space-y-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">Estimasi Budget Terpakai</h3>
                    <p className="text-3xl font-bold text-gray-800">{formatRupiah(analytics.planning.budget)}</p>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400 uppercase">Avg Cost / Posisi</p>
                        <p className="text-xl font-bold text-blue-600">{formatRupiah(analytics.planning.avgBudget)}</p>
                    </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-800">
                    ⚠️ Pastikan status "On Process" tidak melebihi SLA 45 hari agar MPP tercapai tepat waktu.
                </div>
            </div>
          </div>
        )}

        {/* === TAB 3: PROCESS === */}
        {activePhase === 'process' && analytics && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 grid grid-cols-4 gap-4">
              <MiniCard title="SLA Compliance" value={analytics.process.slaRate} unit="%" isGood={parseFloat(analytics.process.slaRate)>=90} target="≥ 90%" />
              <MiniCard title="Offer Acceptance" value={analytics.process.acceptanceRate} unit="%" isGood={parseFloat(analytics.process.acceptanceRate)>=80} target="≥ 80%" />
              <MiniCard title="Cost per Hire" value={formatRupiah(analytics.process.costPerHire)} unit="" isGood={analytics.process.costPerHire<=2000000} target="≤ 2jt" />
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase">In Process</h3>
                <div className="text-2xl font-bold text-gray-800 mt-1">{analytics.process.inProcess} <span className="text-xs font-normal text-gray-500">Kandidat</span></div>
              </div>
            </div>
            <div className="col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-gray-800 font-bold mb-4 text-sm uppercase">Time Efficiency Analysis</h3>
              <div className="h-64 relative"><canvas id="timeChart"></canvas></div>
            </div>
            <div className="col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-gray-800 font-bold mb-4 text-sm uppercase">Channel Source</h3>
              <div className="h-48 relative flex justify-center"><canvas id="channelChart"></canvas></div>
            </div>
          </div>
        )}

        {/* === TAB 4: POST-HIRING === */}
        {activePhase === 'posthiring' && analytics && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4 space-y-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">User Satisfaction</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-yellow-500">{analytics.postHiring.avgSatisfaction}</span>
                  <span className="text-sm text-gray-400">/ 5.0</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Feedback Hiring Manager</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">Lulus Probation</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-green-600">{analytics.postHiring.probationPassed}</span>
                  <span className="text-sm text-gray-400">Karyawan</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${analytics.postHiring.probationRate}%`}}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{analytics.postHiring.probationRate}% Success Rate</p>
              </div>
            </div>
            <div className="col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-gray-800 font-bold mb-4 text-sm uppercase">Quality of Hire & Retention</h3>
              <div className="flex-1 min-h-[250px] relative">
                <canvas id="qualityChart"></canvas>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RecruitmentTool;