import React from 'react';
import { useUser, useClerk } from "@clerk/clerk-react";

const MenuDashboard = ({ onSelectTool }) => {
  const { user } = useUser();
  const { signOut } = useClerk();

  // DAFTAR ALAT (ROADMAP LENGKAP)
  const tools = [
    // --- 1. OPERATIONAL (FOUNDATION) ---
    {
      id: 'absensi',
      title: 'Absensi & Data',
      desc: 'Dashboard Kehadiran & Database Karyawan.',
      icon: '📊',
      status: 'active',
      color: 'bg-blue-600',
      category: 'Operational'
    },
    {
      id: 'recruitment',
      title: 'Recruitment Analytics',
      desc: 'Analisa Turnover & Efektivitas Channel.',
      icon: '🤝',
      status: 'active',
      color: 'bg-purple-600',
      category: 'Operational'
    },
    {
      id: 'payroll',
      title: 'Payroll Simulator',
      desc: 'Analisa CTC, Pajak TER, & Cashflow.',
      icon: '💰',
      status: 'active',
      color: 'bg-green-600',
      category: 'Operational'
    },
    {
      id: 'performance',
      title: 'Performance Mgmt',
      desc: '9-Box Grid & Bell Curve Analysis.',
      icon: '📈',
      status: 'active',
      color: 'bg-orange-600',
      category: 'Operational'
    },

    // --- 2. STRATEGIC & PLANNING (NEXT LEVEL) ---
    {
      id: 'manpower',
      title: 'Manpower Planning',
      desc: 'Kalkulator Beban Kerja (FTE) & Headcount.',
      icon: '👥',
      status: 'active',
      color: 'bg-red-600',
      category: 'Strategic'
    },
    {
      id: 'retention',
      title: 'Retention & Attrition',
      desc: 'Flight Risk Predictor: Deteksi potensi resign.',
      icon: '🔥',
      status: 'active',
      color: 'bg-rose-500',
      category: 'Strategic'
    },
    {
      id: 'compben',
      title: 'Comp & Ben Fairness',
      desc: 'Compa-Ratio: Analisa keadilan gaji internal.',
      icon: '⚖️',
      status: 'active',
      color: 'bg-teal-600',
      category: 'Strategic'
    },
    {
      id: 'dei',
      title: 'DEI Dashboard',
      desc: 'Gender Pay Gap & Diversity Tracking.',
      icon: '🌍',
      status: 'active',
      color: 'bg-indigo-500',
      category: 'Strategic'
    },
    {
      id: 'ld',
      title: 'L&D Analytics',
      desc: 'Training ROI & Skill Matrix Heatmap.',
      icon: '🧠',
      status: 'active',
      color: 'bg-yellow-500',
      category: 'Strategic'
    },
    {
      id: 'ona',
      title: 'Org. Network Analysis',
      desc: 'Collaboration Graph: Peta influencer kantor.',
      icon: '🕸️',
      status: 'active',
      color: 'bg-slate-600',
      category: 'Strategic'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* HEADER */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-blue-800 tracking-tight">Teman<span className="text-slate-900">HR</span></h1>
            <span className="bg-blue-100 text-blue-800 text-[10px] uppercase px-2 py-0.5 rounded-full font-bold tracking-wider">Enterprise</span>
        </div>
        <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-700">{user?.firstName || 'HR Professional'}</span>
                <span className="text-[10px] text-slate-400">Head of Human Capital</span>
            </div>
            <button 
                onClick={() => signOut()}
                className="text-xs text-red-600 font-bold hover:bg-red-50 px-3 py-2 rounded-lg transition border border-transparent hover:border-red-100"
            >
                Keluar
            </button>
        </div>
      </nav>

      {/* KONTEN MENU */}
      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-3">HR Command Center</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">Platform analitik SDM terintegrasi untuk keputusan berbasis data, mulai dari operasional hingga strategis.</p>
        </div>

        {/* GRUP 1: OPERATIONAL TOOLS */}
        <div className="mb-10">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-slate-300"></span> Core Operations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {tools.filter(t => t.category === 'Operational').map((tool) => (
                    <MenuCard key={tool.id} tool={tool} onSelectTool={onSelectTool} />
                ))}
            </div>
        </div>

        {/* GRUP 2: STRATEGIC TOOLS */}
        <div className="mb-16">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-slate-300"></span> Strategic Intelligence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tools.filter(t => t.category === 'Strategic').map((tool) => (
                    <MenuCard key={tool.id} tool={tool} onSelectTool={onSelectTool} />
                ))}
            </div>
        </div>

        {/* --- BAGIAN BARU: FEEDBACK & PARTNERSHIP --- */}
        <div className="mt-16 border-t border-slate-200 pt-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Kartu Kritik & Saran */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-3xl shrink-0">
                💡
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Bantu Kami Berkembang</h3>
                <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                  Punya ide fitur analitik baru atau menemukan kendala? Berikan kritik, saran, dan masukan Anda agar TemanHR menjadi lebih baik.
                </p>
                <a 
                  href="mailto:feedback@temanhr.com?subject=Feedback untuk TemanHR" 
                  className="inline-block bg-white border-2 border-blue-600 text-blue-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors"
                >
                  Kirim Masukan
                </a>
              </div>
            </div>

            {/* Kartu Partnership */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700 shadow-lg flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left hover:shadow-xl transition-shadow relative overflow-hidden">
              {/* Efek Glow di Background */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
              
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl shrink-0 border border-indigo-500/30 relative z-10">
                🤝
              </div>
              <div className="flex-1 relative z-10">
                <h3 className="text-xl font-bold text-white mb-2">Peluang Kemitraan Bisnis</h3>
                <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                  Tertarik mengintegrasikan sistem HR perusahaan Anda dengan analitik kami? Atau ingin berkolaborasi? Mari bangun masa depan HR bersama.
                </p>
                <a 
                  href="mailto:partner@temanhr.com?subject=Peluang Kolaborasi Bisnis TemanHR" 
                  className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-500 transition-colors shadow-md"
                >
                  Hubungi Kami
                </a>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
};

// Sub-component untuk Card agar kodenya lebih rapi
const MenuCard = ({ tool, onSelectTool }) => {
    return (
        <div 
            onClick={() => {
                if(tool.status === 'active') {
                    onSelectTool(tool.id);
                } else {
                    alert(`Fitur "${tool.title}" sedang dalam pengembangan! 🚀\n\nFungsi: ${tool.desc}`);
                }
            }}
            className={`relative bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between h-full ${tool.status === 'soon' ? 'opacity-80 hover:opacity-100' : ''}`}
        >
            <div>
                {/* Header Card */}
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 ${tool.color} rounded-xl flex items-center justify-center text-2xl shadow-md text-white group-hover:scale-110 transition-transform duration-300`}>
                        {tool.icon}
                    </div>
                    {tool.status === 'soon' && (
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                            Soon
                        </span>
                    )}
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                    {tool.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                    {tool.desc}
                </p>
            </div>

            {/* Footer Action (Only for Active) */}
            {tool.status === 'active' && (
                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center text-blue-600 font-bold text-xs uppercase tracking-wide">
                    Buka Dashboard <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
            )}
        </div>
    );
};

export default MenuDashboard;