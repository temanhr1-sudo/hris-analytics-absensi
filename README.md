# HRIS Analytics - Sistem Analisis Absensi Karyawan

Aplikasi web untuk analisis lengkap data absensi karyawan dengan KPI Matrix dan visualisasi interaktif.

## 🚀 Features

- ✅ Upload data absensi dari Excel (.xlsx, .xls, .csv)
- ✅ Download template Excel yang sudah terstruktur
- ✅ Analisis lengkap: Attendance Rate, Punctuality Rate, Compliance Score
- ✅ KPI Matrix dengan 6 indikator utama
- ✅ Visualisasi data dengan charts & graphs
- ✅ Filter berdasarkan departemen dan tanggal
- ✅ Analisis per departemen dan per karyawan
- ✅ Leave analytics (Sakit, Cuti, Dinas, Unpaid)
- ✅ Export report ke JSON

## 📦 Installation

```bash
# Clone repository
git clone <repository-url>
cd hris-analytics

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Deploy to Vercel

1. Push code ke GitHub
2. Import project di Vercel
3. Deploy otomatis!

## 📊 KPI Metrics

1. **Attendance Rate** = (Jumlah Hari Hadir / Total Hari Kerja) × 100%
2. **Punctuality Rate** = (Hari Hadir Tepat Waktu / Total Hari Hadir) × 100%
3. **Late Rate** = (Jumlah Hari Terlambat / Total Hari Kerja) × 100%
4. **Alpha Rate** = (Jumlah Alpha / Total Hari Kerja) × 100%
5. **Compliance Score** = (Attendance Rate × 60%) + (Punctuality Rate × 40%)
6. **Jam Kerja Efektif** = (Total Jam Kerja Aktual / Total Jam Kerja Standar) × 100%

## 📝 Template Excel

Download template Excel dari aplikasi yang berisi:
- Kolom wajib: Emp No., Nama, Tanggal, Departemen, Jam Masuk/Pulang, Jml Kehadiran
- Kolom opsional: Scan Masuk/Pulang, Terlambat, Plg. Cepat, Lembur, dll
- Instruksi lengkap pengisian
- Contoh data

## 🛠️ Tech Stack

- React 18
- Vite
- TailwindCSS
- Recharts (visualisasi)
- SheetJS (Excel parser)
- Lucide React (icons)

## 📄 License

MIT License