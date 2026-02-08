import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';
import { jsPDF } from "jspdf"; 
import autoTable from 'jspdf-autotable';
import './RecruitmentStyle.css';

// ============================================================================
// UI SUB-COMPONENTS
// ============================================================================

const StatCard = ({ label, value, sub, color, note }) => (
  <div className={`bg-white p-5 rounded-2xl border-l-4 border-${color}-500 shadow-sm text-left hover:shadow-md transition relative group`}>
    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
    <div className="mt-2 text-2xl font-bold text-gray-800">{value}</div>
    {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    
    {/* Tooltip Note - Updated */}
    {note && (
        <div className="absolute top-2 right-2 text-gray-300 group-hover:text-gray-500 cursor-help" title={note}>
            <span className="text-xs border border-gray-300 rounded-full px-1.5 py-0.5 font-bold">?</span>
        </div>
    )}
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

// --- TABEL DENGAN PAGINATION ---
const PaginatedTable = ({ title, data, columns, filter }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  useEffect(() => setCurrentPage(1), [data]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  if (!data || data.length === 0) return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-6 text-center text-gray-400">
        <p>Tidak ada data untuk ditampilkan.</p>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-800 font-bold text-sm uppercase tracking-wide">{title}</h3>
        {filter} {/* Slot untuk tombol filter */}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-4 py-3">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50 transition">
                {columns.map((col, cIdx) => (
                  <td key={cIdx} className="px-4 py-3">
                    {col.render ? col.render(item) : item[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 border-t pt-4">
          <span className="text-xs text-gray-500">Halaman {currentPage} dari {totalPages} (Total: {data.length})</span>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">← Prev</button>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const RecruitmentTool = ({ onBack }) => {
  
  const [view, setView] = useState('upload');
  const [loading, setLoading] = useState(false);
  
  // DATA STATE
  const [rawData, setRawData] = useState([]);
  const [bankData, setBankData] = useState([]); 
  const [analytics, setAnalytics] = useState(null);
  
  const [activePhase, setActivePhase] = useState('overview');
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('All');
  
  // FILTER STATE (PLANNING)
  const [planningFilter, setPlanningFilter] = useState('All'); // All, Join, Proses, Batal

  const chartRefs = useRef({});

  // UTILS
  const parseDate = (input) => {
    if (!input) return null;
    if (input instanceof Date && !isNaN(input)) return input;
    if (typeof input === 'number') return new Date(Math.round((input - 25569) * 86400 * 1000));
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  };

  const calculateDays = (startRaw, endRaw) => {
    const start = parseDate(startRaw);
    const end = parseDate(endRaw);
    if (!start || !end) return 0;
    start.setHours(0,0,0,0); end.setHours(0,0,0,0);
    const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  const formatDate = (dateRaw) => {
      const d = parseDate(dateRaw);
      return d ? d.toLocaleDateString('id-ID') : '-';
  };

  // --- PDF GUIDE GENERATOR (RESTORED) ---
  const downloadGuidePDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(41, 128, 185);
      doc.text("PANDUAN PENGISIAN DATA REKRUTMEN", 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Gunakan panduan ini untuk mengisi Template Excel.", 14, 28);

      const columns = [{ header: 'Kolom', dataKey: 'col' }, { header: 'Fungsi', dataKey: 'func' }];
      const data = [
        { col: 'No Request', func: 'Total Request.' },
        { col: 'Status', func: 'Wajib isi: Join, Proses, atau Batal.' },
        { col: 'Tanggal Request', func: 'Start Time to Fill.' },
        { col: 'Tanggal Closed', func: 'End Time to Fill.' },
        { col: 'Tanggal Apply', func: 'Start Time to Hire.' },
        { col: 'Tanggal Join', func: 'End Time to Hire.' },
        { col: 'Lulus Probation', func: 'Quality of Hire.' },
        { col: 'Tanggal Resign', func: 'Turnover Rate.' },
        { col: 'Biaya Rekrutmen', func: 'Cost per Hire.' },
        { col: 'SLA Terpenuhi', func: 'SLA Compliance.' },
        { col: 'Sesuai SOP', func: 'Audit.' },
      ];

      autoTable(doc, {
        head: [columns.map(c => c.header)],
        body: data.map(r => [r.col, r.func]),
        startY: 35,
        styles: { fontSize: 10 },
      });

      doc.save("Panduan_Rekrutmen.pdf");
    } catch (error) { alert("Gagal download PDF. Pastikan library terinstall."); }
  };

  // --- TEMPLATE DOWNLOAD ---
  const downloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // SHEET 1: MASTER DATA
      const masterData = [
        ['No Request', 'Departemen', 'Tanggal Request', 'Tanggal Closed', 'Posisi', 'Status', 'Tanggal Apply', 'Tanggal Join', 'Lulus Probation', 'Tanggal Resign', 'Biaya Rekrutmen', 'Sumber Kandidat', 'SLA Terpenuhi', 'Total Offer', 'Offer Diterima', 'Kepuasan User', 'Sesuai SOP'],
        ['REQ001', 'IT', '2024-01-05', '2024-02-15', 'Software Engineer', 'Join', '2024-01-10', '2024-02-20', 'Y', '', 2000000, 'Job Portal', 'Y', 1, 1, 4.5, 'Y']
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(masterData);
      ws1['!cols'] = Array(17).fill({ wch: 15 });
      XLSX.utils.book_append_sheet(wb, ws1, 'MASTER_DATA');

      // SHEET 2: BANK DATA
      const bankDataHeader = [
        ['Nama Kandidat', 'Posisi Dilamar', 'Departemen', 'Sumber', 'Skor Interview (0-100)', 'Ranking', 'Status Terakhir', 'Skillset', 'Kontak (Email/WA)'],
        ['Budi Santoso', 'Sales Executive', 'Sales', 'LinkedIn', 85, 'A', 'Disimpan (Cadangan)', 'Negotiation, English', '08123456789']
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(bankDataHeader);
      ws2['!cols'] = Array(9).fill({ wch: 20 });
      XLSX.utils.book_append_sheet(wb, ws2, 'BANK_DATA');

      XLSX.writeFile(wb, 'Template_Recruitment_V4.xlsx');
    } catch (error) { alert("Gagal download Template."); }
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
        
        const sheetName1 = workbook.SheetNames[0]; 
        const jsonData1 = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName1], { cellDates: true, defval: "" });

        let jsonData2 = [];
        if (workbook.SheetNames.length > 1) {
            const sheetName2 = workbook.SheetNames[1]; 
            jsonData2 = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName2], { cellDates: true, defval: "" });
        }

        if (jsonData1.length === 0) { alert('⚠️ File kosong'); setLoading(false); return; }

        const deptList = [...new Set(jsonData1.map(item => item['Departemen'] || 'Unassigned'))].sort();
        setDepartments(['All', ...deptList]);
        
        setRawData(jsonData1);
        setBankData(jsonData2);
        setView('dashboard');
      } catch (error) { alert('❌ Error: ' + error.message); } 
      finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- EXPORT REPORT ---
  const exportReport = () => {
    try {
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(rawData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Tracking Data');
      if(bankData.length > 0){
          const ws2 = XLSX.utils.json_to_sheet(bankData);
          XLSX.utils.book_append_sheet(wb, ws2, 'Bank Kandidat');
      }
      XLSX.writeFile(wb, `Recruitment_Report_${selectedDept}.xlsx`);
    } catch (error) { alert("Gagal Export Report."); }
  };

  // --- CALCULATION LOGIC ---
  useEffect(() => {
    if(rawData.length > 0) {
      const filteredData = selectedDept === 'All' 
        ? rawData 
        : rawData.filter(item => (item['Departemen'] || 'Unassigned') === selectedDept);
      
      const joinedData = filteredData.filter(r => r.Status === 'Join');
      const closedData = filteredData.filter(r => r['Tanggal Closed']);
      
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

      let totalTTF = 0, countTTF = 0;
      closedData.forEach(r => {
        if (r['Tanggal Request'] && r['Tanggal Closed']) {
            const days = calculateDays(r['Tanggal Request'], r['Tanggal Closed']);
            totalTTF += days; countTTF++; 
        }
      });
      const avgTTF = countTTF > 0 ? (totalTTF / countTTF).toFixed(1) : '0';

      let totalTTH = 0, countTTH = 0;
      joinedData.forEach(r => {
        if (r['Tanggal Apply'] && r['Tanggal Join']) {
            const days = calculateDays(r['Tanggal Apply'], r['Tanggal Join']);
            totalTTH += days; countTTH++; 
        }
      });
      const avgTTH = countTTH > 0 ? (totalTTH / countTTH).toFixed(1) : '0';

      const slaCount = filteredData.filter(r => r['SLA Terpenuhi'] === 'Y').length;
      const slaRate = totalRequest > 0 ? ((slaCount / totalRequest) * 100).toFixed(1) : '0';
      const acceptanceRate = 85; 
      const costPerHire = joinedData.length > 0 ? Math.round(totalBudget / joinedData.length) : 0;
      
      const channels = {};
      filteredData.forEach(r => { const ch = r['Sumber Kandidat'] || 'Lainnya'; channels[ch] = (channels[ch] || 0) + 1; });

      const probationPassed = joinedData.filter(r => r['Lulus Probation'] === 'Y').length;
      const probationRate = joinedData.length > 0 ? ((probationPassed / joinedData.length) * 100).toFixed(1) : '0';
      const turnoverCount = joinedData.filter(r => r['Tanggal Resign']).length;
      const turnoverRate = joinedData.length > 0 ? ((turnoverCount / joinedData.length) * 100).toFixed(1) : '0';
      const validSatisfaction = filteredData.filter(r => parseFloat(r['Kepuasan User']) > 0);
      const avgSatisfaction = validSatisfaction.length > 0 ? (validSatisfaction.reduce((s, r) => s + parseFloat(r['Kepuasan User']), 0) / validSatisfaction.length).toFixed(1) : '0';

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

      if (activePhase === 'process' || activePhase === 'overview') {
         const ctxChannel = document.getElementById('channelChart');
         if(ctxChannel && analytics.process.channels) {
            chartRefs.current.channel = new Chart(ctxChannel, {
                type: 'bar',
                data: {
                    labels: Object.keys(analytics.process.channels),
                    datasets: [{ label: 'Kandidat', data: Object.values(analytics.process.channels), backgroundColor: '#6366f1', borderRadius: 4 }]
                },
                options: commonOptions
            });
         }
      }

      if (activePhase === 'planning') {
        const ctxStatus = document.getElementById('statusChart');
        if (ctxStatus) {
          chartRefs.current.status = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
              labels: ['Done', 'On Process', 'New', 'Canceled'],
              datasets: [{ data: [analytics.planning.done, analytics.planning.onProcess, analytics.planning.newReq, analytics.planning.canceled], backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'] }]
            },
            options: { ...commonOptions, plugins: { legend: { position: 'right' } } }
          });
        }
      }

      if (activePhase === 'process') {
        const ctxTime = document.getElementById('timeChart');
        if(ctxTime) {
            chartRefs.current.time = new Chart(ctxTime, {
                type: 'bar',
                data: {
                    labels: ['TTF Actual', 'TTF Target', 'TTH Actual', 'TTH Target'],
                    datasets: [{ label: 'Hari', data: [parseFloat(analytics.process.avgTTF), 30, parseFloat(analytics.process.avgTTH), 25], backgroundColor: ['#3b82f6', '#94a3b8', '#8b5cf6', '#94a3b8'], borderRadius: 6 }]
                },
                options: { ...commonOptions, plugins: { legend: { display: false } } }
            });
        }
      }

      if (activePhase === 'posthiring') {
        const ctxQuality = document.getElementById('qualityChart');
        if(ctxQuality) {
            chartRefs.current.quality = new Chart(ctxQuality, {
                type: 'polarArea',
                data: {
                    labels: ['Probation Pass', 'Retention', 'Satisfaction'],
                    datasets: [{ data: [parseFloat(analytics.postHiring.probationRate), parseFloat(analytics.postHiring.retentionRate), (parseFloat(analytics.postHiring.avgSatisfaction)/5)*100], backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b'] }]
                },
                options: commonOptions
            });
        }
      }
    }, 100);

    return () => { Object.values(chartRefs.current).forEach(c => c?.destroy()); };
  }, [view, activePhase, analytics]);

  // ============================================================================
  // RENDER UI
  // ============================================================================

  if (view === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <button onClick={onBack} className="fixed top-6 left-6 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:bg-gray-50 transition">← Kembali</button>
        <div className="max-w-4xl w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-12 border border-white/20 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg text-5xl">📊</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-3">Recruitment Analytics V4</h1>
            <p className="text-lg text-gray-600 mb-8">System Update: Bank Data Kandidat & Multi-Table View</p>
            <div className="border-2 border-dashed border-blue-300 rounded-2xl p-10 bg-blue-50/50">
               {loading ? <div className="spinner mx-auto border-blue-600"></div> : (
                 <div className="flex flex-col gap-4">
                    <div className="flex justify-center gap-4">
                        <label className="cursor-pointer px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition flex items-center gap-2">
                            <span className="text-xl">📂</span> <input type="file" onChange={handleFileUpload} accept=".xlsx,.xls" className="hidden" /> Upload Excel
                        </label>
                        <button onClick={downloadTemplate} className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg transition flex items-center gap-2">
                            <span className="text-xl">📥</span> Template V4
                        </button>
                    </div>
                    <button onClick={downloadGuidePDF} className="text-sm text-blue-600 font-semibold hover:underline">📖 Download Panduan PDF</button>
                 </div>
               )}
               <p className="text-xs text-gray-400 mt-6">*Gunakan Template V4 (Sekarang support 2 Sheets: Data & Bank Kandidat).</p>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* HEADER */}
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
                  <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="bg-white text-gray-800 text-sm font-semibold rounded px-3 py-1 outline-none border-none cursor-pointer hover:bg-gray-50 transition">
                      {departments.map(dept => <option key={dept} value={dept}>{dept === 'All' ? 'Semua Dept' : dept}</option>)}
                  </select>
              </div>
              <button onClick={exportReport} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-xs font-bold transition">Export</button>
              <button onClick={() => setView('upload')} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm">Keluar</button>
            </div>
          </div>
          {/* TABS NAVIGATION */}
          <div className="flex gap-1 mt-6 overflow-x-auto pb-1">
            {[
              { id: 'overview', label: '📊 Overview' }, 
              { id: 'planning', label: '📋 Planning' }, 
              { id: 'process', label: '⚙️ Process' }, 
              { id: 'posthiring', label: '✅ Monitoring' },
              { id: 'bankdata', label: '🗂️ Bank Data' }
            ].map(p => (
              <button key={p.id} onClick={() => setActivePhase(p.id)} 
                className={`px-5 py-2.5 rounded-t-lg font-bold text-xs transition-all whitespace-nowrap ${activePhase === p.id ? 'bg-gray-50 text-blue-600 shadow-lg translate-y-1' : 'bg-white/10 text-white hover:bg-white/20'}`}>
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
                    💡 <strong>Insight:</strong> Lihat menu 'Bank Data' untuk kandidat potensial yang belum ter-hired.
                </div>
             </div>
          </div>
        )}

        {/* === TAB 2: PLANNING === */}
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
            </div>
            
            {/* TABEL LIST POSISI (DENGAN FILTER) */}
            <div className="col-span-12">
                <PaginatedTable 
                    title="Daftar Permintaan Posisi" 
                    filter={
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                            {['All', 'Join', 'Proses', 'Batal'].map(f => (
                                <button key={f} onClick={() => setPlanningFilter(f)}
                                    className={`px-3 py-1 text-xs font-bold rounded transition ${planningFilter === f ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}>
                                    {f === 'Join' ? 'Done' : f}
                                </button>
                            ))}
                        </div>
                    }
                    data={rawData.filter(item => {
                        const deptMatch = selectedDept === 'All' || item['Departemen'] === selectedDept;
                        const statusMatch = planningFilter === 'All' || item.Status === planningFilter;
                        return deptMatch && statusMatch;
                    })}
                    columns={[
                        { header: 'No Request', accessor: 'No Request' },
                        { header: 'Posisi', accessor: 'Posisi' },
                        { header: 'Dept', accessor: 'Departemen' },
                        { header: 'Tgl Request', render: (row) => formatDate(row['Tanggal Request']) },
                        { header: 'Status', render: (row) => (
                            <span className={`px-2 py-1 rounded text-xs font-bold ${row.Status === 'Join' ? 'bg-green-100 text-green-700' : row.Status === 'Proses' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {row.Status}
                            </span>
                        )} 
                    ]}
                />
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

            {/* TABEL ON PROCESS (DENGAN TANGGAL MULAI) */}
            <div className="col-span-12">
                <PaginatedTable 
                    title="Lowongan Sedang Diproses (On Progress)" 
                    data={rawData.filter(item => item.Status === 'Proses' && (selectedDept === 'All' || item['Departemen'] === selectedDept))}
                    columns={[
                        { header: 'No Request', accessor: 'No Request' },
                        { header: 'Posisi', accessor: 'Posisi' },
                        { header: 'Tgl Mulai', render: (row) => formatDate(row['Tanggal Request']) }, // Updated: Add Start Date
                        { header: 'Durasi Open', render: (row) => {
                            const days = calculateDays(row['Tanggal Request'], new Date());
                            return <span className={days > 45 ? 'text-red-600 font-bold' : 'text-gray-600'}>{days} Hari</span>
                        }},
                        { header: 'Sumber', accessor: 'Sumber Kandidat' },
                    ]}
                />
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
              
              {/* CARD RETENTION (BARU) */}
              <StatCard 
                label="Retention Rate" 
                value={analytics.postHiring.retentionRate + '%'} 
                sub="Karyawan Bertahan > 6 Bulan" 
                color="blue"
                note="Rumus: 100% - Turnover Rate. Data diambil dari jumlah karyawan join dikurangi yang resign sebelum 6 bulan."
              />
            </div>
            <div className="col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-gray-800 font-bold mb-4 text-sm uppercase">Quality of Hire & Retention</h3>
              <div className="flex-1 min-h-[250px] relative">
                <canvas id="qualityChart"></canvas>
              </div>
            </div>
          </div>
        )}

        {/* === TAB 5: BANK DATA (ADA PANDUAN KECIL) === */}
        {activePhase === 'bankdata' && (
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                    <div className="bg-purple-600 p-8 rounded-2xl shadow-lg text-white mb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold">🗂️ Bank Data Kandidat Potensial</h2>
                                <p className="text-purple-100 mt-1">Database kandidat yang pernah melamar, diwawancarai, atau disimpan.</p>
                            </div>
               <div className="bg-white/20 p-3 rounded-lg text-xs max-w-sm backdrop-blur-sm border border-white/30">
                                ℹ️ <strong>Info Skoring:</strong> Nilai 0-100 didapat dari hasil rata-rata Interview User & HR. Gunakan{' '}
                                <a 
                                    href="toko.html" 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="underline font-bold text-yellow-300 hover:text-white transition cursor-pointer"
                                    title="Klik untuk membeli Template Scorecard"
                                >
                                    Template "Interview Scorecard"
                                </a>{' '}
                                untuk standarisasi penilaian.
                            </div>
                        </div>
                    </div>
                    
                    <PaginatedTable 
                        title="Talent Pool Database"
                        data={bankData}
                        columns={[
                            { header: 'Nama Kandidat', accessor: 'Nama Kandidat' },
                            { header: 'Posisi Dilamar', accessor: 'Posisi Dilamar' },
                            { header: 'Skor (0-100)', render: (row) => {
                                const score = row['Skor Interview (0-100)'];
                                let color = score >= 80 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
                                return <span className={`px-2 py-1 rounded font-bold text-xs ${color}`}>{score}</span>
                            }},
                            { header: 'Ranking', render: (row) => <span className="font-bold text-blue-600">{row['Ranking']}</span> },
                            { header: 'Skillset', accessor: 'Skillset' },
                            { header: 'Status Terakhir', accessor: 'Status Terakhir' },
                            { header: 'Kontak', accessor: 'Kontak (Email/WA)' }
                        ]}
                    />
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default RecruitmentTool;