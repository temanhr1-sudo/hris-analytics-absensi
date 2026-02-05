import React from 'react';
import { useUser, useClerk } from "@clerk/clerk-react";

const MenuDashboard = ({ onSelectTool }) => {
  const { user } = useUser();
  const { signOut } = useClerk();

  // Daftar Fitur (Visi Mas Ari)
  const tools = [
    {
      id: 'absensi',
      title: 'Absensi & Data Karyawan',
      desc: 'Dashboard Visual, & Laporan Absensi Otomatis.',
      icon: '📊',
      status: 'active', // Ini yang sudah jadi
      color: 'bg-blue-600'
    },
    {
      id: 'recruitment',
      title: 'Recruitment Analytics',
      desc: 'Analisa Turn over, Hitung Time to Hire & Efektivitas Channel Sourcing.',
      icon: '🤝',
      status: 'soon',
      color: 'bg-purple-600'
    },
    {
      id: 'payroll',
      title: 'Payroll Simulator',
      desc: 'Simulasi PPh 21 (TER) & Analisa Overtime Cost.',
      icon: '💰',
      status: 'soon',
      color: 'bg-green-600'
    },
    {
      id: 'performance',
      title: 'Performance Management',
      desc: 'Bell Curve Analysis & Distribusi KPI Karyawan.',
      icon: '📈',
      status: 'soon',
      color: 'bg-orange-600'
    },
    {
      id: 'manpower',
      title: 'Manpower Planning',
      desc: 'Kalkulator Beban Kerja & Jumlah Ideal Karyawan.',
      icon: 'users', // Ganti icon manual jika perlu atau pakai emoji 👥
      emoji: '👥',
      status: 'soon',
      color: 'bg-red-600'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* HEADER */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-blue-800">Teman<span className="text-black">HR</span></h1>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">App</span>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden md:block">Halo, {user?.firstName || 'HRD'}! 👋</span>
            <button 
                onClick={() => signOut()}
                className="text-sm text-red-600 font-bold hover:bg-red-50 px-3 py-2 rounded-lg transition"
            >
                Keluar
            </button>
        </div>
      </nav>

      {/* KONTEN MENU */}
      <main className="max-w-6xl mx-auto p-6 md:p-10">
        <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Mau kerjakan apa hari ini?</h2>
            <p className="text-gray-500">Pilih tools HRD yang Anda butuhkan untuk meningkatkan produktivitas.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
                <div 
                    key={tool.id}
                    onClick={() => {
                        if(tool.status === 'active') {
                            onSelectTool(tool.id);
                        } else {
                            alert('Fitur ini segera hadir di update berikutnya! 🚀');
                        }
                    }}
                    className={`relative bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group ${tool.status === 'soon' ? 'opacity-70 hover:opacity-100' : ''}`}
                >
                    {/* Badge Coming Soon */}
                    {tool.status === 'soon' && (
                        <span className="absolute top-4 right-4 bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                            Coming Soon
                        </span>
                    )}

                    {/* Icon */}
                    <div className={`w-14 h-14 ${tool.color} rounded-xl flex items-center justify-center text-3xl mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                        {tool.emoji || tool.icon}
                    </div>

                    <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition">
                        {tool.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        {tool.desc}
                    </p>

                    {/* Arrow for Active */}
                    {tool.status === 'active' && (
                        <div className="mt-6 flex items-center text-blue-600 font-bold text-sm">
                            Buka Tools <span className="ml-2 group-hover:translate-x-1 transition">→</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </main>

    </div>
  );
};

export default MenuDashboard;