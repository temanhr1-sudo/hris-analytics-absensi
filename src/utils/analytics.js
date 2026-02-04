// Helper functions untuk analisis data

export const parseTime = (timeStr) => {
  if (!timeStr || timeStr === '0' || timeStr === '') return 0;
  if (typeof timeStr === 'number') {
    return Math.round(timeStr * 24 * 60);
  }
  const parts = String(timeStr).split(':');
  const hours = parseInt(parts[0]) || 0;
  const mins = parseInt(parts[1]) || 0;
  return hours * 60 + mins;
};

export const timeToHours = (minutes) => {
  return (minutes / 60).toFixed(2);
};

export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

// --- HELPER: PARSING TANGGAL AMAN (FIX TIMEZONE) ---
export const parseDateLocal = (dateStr) => {
  if (!dateStr) return null;
  try {
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
  } catch (e) {
    return null;
  }
};

// --- LOGIC DEFINITIONS ---

const WORKING_EXCEPTIONS = ['trip', 'dinas', 'bleave', 'wfh', 'work from home', 'tugas luar', 'personal'];

// Pisahkan kategori untuk handling yang berbeda
const SICK_UNPAID_EXCEPTIONS = ['sick', 'sakit', 'unpaid']; // Dihitung sebagai ABSENT
const OTHER_NON_WORKING_EXCEPTIONS = ['leave', 'cuti', 'izin', 'libur']; // TIDAK dihitung (dikurangi dari denominator)

const NON_WORKING_EXCEPTIONS = [...SICK_UNPAID_EXCEPTIONS, ...OTHER_NON_WORKING_EXCEPTIONS];

// Helper internal untuk cek apakah ada pengecualian teks apapun
const hasAnyException = (row) => {
  const exc = row.Pengecualian;
  return exc && String(exc).trim() !== '' && String(exc) !== '0' && String(exc) !== '-';
};

const isWorkingException = (row) => {
  const exception = row.Pengecualian ? row.Pengecualian.toLowerCase() : '';
  return WORKING_EXCEPTIONS.some(ex => exception.includes(ex));
};

// Cek apakah Sick/Unpaid (dihitung sebagai Absent)
const isSickOrUnpaid = (row) => {
  const exc = row.Pengecualian ? row.Pengecualian.toLowerCase() : '';
  return SICK_UNPAID_EXCEPTIONS.some(ex => exc.includes(ex));
};

// --- HELPER: HITUNG LEMBUR OTOMATIS ---
const calculateOvertimeMinutes = (row) => {
  const manualOvertime = parseTime(row.Lembur);
  if (manualOvertime > 0) return manualOvertime;

  const scanPulang = parseTime(row['Scan Pulang']);
  const jamPulang = parseTime(row['Jam Pulang']);

  if (scanPulang > 0 && jamPulang > 0 && scanPulang > jamPulang) {
    return scanPulang - jamPulang;
  }

  return 0;
};

// Export validate function
export const validateAttendance = (row) => {
  const scanMasuk = row['Scan Masuk'];
  const scanPulang = row['Scan Pulang'];
  const jmlKehadiran = row['Jml Kehadiran'];
   
  const hasScanMasuk = scanMasuk && scanMasuk.trim() !== '' && scanMasuk !== '0';
  const hasScanPulang = scanPulang && scanPulang.trim() !== '' && scanPulang !== '0';
  const isSpecialWork = isWorkingException(row);
  
  // PERBAIKAN: Sick/Unpaid tidak boleh dihitung sebagai present meskipun ada Jml Kehadiran
  const isSickUnpaidCase = isSickOrUnpaid(row);

  return {
    hasScanMasuk,
    hasScanPulang,
    isSpecialWork, 
    isPartial: (hasScanMasuk !== hasScanPulang) && !isSpecialWork && !isSickUnpaidCase,
    isPresent: !isSickUnpaidCase && (hasScanMasuk || hasScanPulang || String(jmlKehadiran) === '1' || isSpecialWork)
  };
};

export const isWorkingDay = (row) => {
  if (row['Akhir Pekan'] === '1' || row['Akhir Pekan'] === 'True') return false;
  if (row['Hari Libur'] === '1' || row['Hari Libur'] === 'True') return false;
   
  const exception = row.Pengecualian;
  if (exception && exception.trim() !== '' && exception !== '0') {
    const exc = exception.toLowerCase();
    
    // Sick/Unpaid TETAP dihitung sebagai hari kerja (tapi absent)
    // Hanya Cuti/Leave/Libur yang dikurangi dari denominator
    if (OTHER_NON_WORKING_EXCEPTIONS.some(ex => exc.includes(ex))) return false;
  }
  
  // BARU: Cek apakah tidak ada scan DAN tidak ada jam kerja (dianggap OFF)
  const hasScanMasuk = row['Scan Masuk'] && row['Scan Masuk'].trim() !== '' && row['Scan Masuk'] !== '0';
  const hasScanPulang = row['Scan Pulang'] && row['Scan Pulang'].trim() !== '' && row['Scan Pulang'] !== '0';
  const hasJamMasuk = row['Jam Masuk'] && row['Jam Masuk'].trim() !== '' && row['Jam Masuk'] !== '0';
  const hasJamPulang = row['Jam Pulang'] && row['Jam Pulang'].trim() !== '' && row['Jam Pulang'] !== '0';
  
  // Jika tidak ada scan DAN tidak ada jam kerja yang dijadwalkan, maka OFF
  if (!hasScanMasuk && !hasScanPulang && !hasJamMasuk && !hasJamPulang) {
    // Kecuali ada pengecualian working (trip, dinas, wfh, dll)
    if (!isWorkingException(row)) {
      return false;
    }
  }
   
  if (row.Tanggal) {
    try {
      const date = parseDateLocal(row.Tanggal);
      if (date) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) return false; 
      }
    } catch (e) {}
  }
   
  return true;
};

export const calculateAnalytics = (filteredData) => {
  if (filteredData.length === 0) return null;
   
  const workingDays = filteredData.filter(row => isWorkingDay(row));
   
  const totalEmployees = new Set(filteredData.map(row => row['Emp No.'])).size;
  const totalRecords = workingDays.length; 
   
  // --- HITUNG KEHADIRAN ---
  // Sick/Unpaid TIDAK dihitung sebagai Present
  const attendanceCount = workingDays.filter(row => {
    if (isSickOrUnpaid(row)) return false; // Sick/Unpaid = Absent
    return validateAttendance(row).isPresent;
  }).length;
   
  // --- HITUNG ALPHA ---
  // Termasuk Sick/Unpaid sebagai Absent
  const absentCount = workingDays.filter(row => {
    const status = validateAttendance(row);
    const isAbsentFlag = row.Absent === 'True';
    const isSickUnpaidFlag = isSickOrUnpaid(row);
    
    return isAbsentFlag || isSickUnpaidFlag || !status.isPresent;
  }).length;
   
  // --- PARTIAL & SCAN COUNTS ---
  const partialRecords = workingDays.filter(row => {
    if (isSickOrUnpaid(row)) return false; // Sick/Unpaid tidak bisa parsial
    return validateAttendance(row).isPartial;
  });
   
  const onlyMasuk = partialRecords.filter(row => {
    const v = validateAttendance(row);
    return v.hasScanMasuk && !v.hasScanPulang;
  }).length;
   
  const onlyPulang = partialRecords.filter(row => {
    const v = validateAttendance(row);
    return !v.hasScanMasuk && v.hasScanPulang;
  }).length;
   
  // --- KETERLAMBATAN ---
  const lateRecords = workingDays.filter(row => {
    if (hasAnyException(row)) return false; 
    
    const scanMasuk = parseTime(row['Scan Masuk']);
    const jamMasuk = parseTime(row['Jam Masuk']);
    return scanMasuk > 0 && jamMasuk > 0 && scanMasuk > jamMasuk;
  });
   
  const totalLateMinutes = lateRecords.reduce((sum, row) => {
    const late = parseTime(row['Scan Masuk']) - parseTime(row['Jam Masuk']);
    return sum + (late > 0 ? late : 0);
  }, 0);
   
  // --- PULANG CEPAT ---
  const earlyLeaveRecords = workingDays.filter(row => {
    if (hasAnyException(row)) return false;

    const scanPulang = parseTime(row['Scan Pulang']);
    const jamPulang = parseTime(row['Jam Pulang']);
    return scanPulang > 0 && jamPulang > 0 && scanPulang < jamPulang;
  });
   
  const totalEarlyLeaveMinutes = earlyLeaveRecords.reduce((sum, row) => {
    const early = parseTime(row['Jam Pulang']) - parseTime(row['Scan Pulang']);
    return sum + (early > 0 ? early : 0);
  }, 0);
   
  // --- LEMBUR ---
  const overtimeRecords = filteredData.filter(row => calculateOvertimeMinutes(row) > 0);
  const totalOvertimeMinutes = filteredData.reduce((sum, row) => sum + calculateOvertimeMinutes(row), 0);
   
  // --- JAM KERJA ---
  const workHoursData = workingDays.filter(row => !isSickOrUnpaid(row)).map(row => {
    let actual = parseTime(row['Jml Jam Kerja']);
    const standard = 510; 
    if (actual === 0 && isWorkingException(row)) actual = standard;
    return { actual, standard };
  }).filter(h => h.actual > 0);
   
  const totalActualHours = workHoursData.reduce((sum, h) => sum + h.actual, 0);
  const totalStandardHours = workHoursData.reduce((sum, h) => sum + h.standard, 0);
  const avgWorkHours = totalActualHours / (workHoursData.length || 1);
   
  // --- LEAVE TYPES ---
  const countException = (keyword) => filteredData.filter(row => 
    row.Pengecualian && row.Pengecualian.toLowerCase().includes(keyword)
  ).length;

  const leaveTypes = {
    sick: countException('sick') + countException('sakit'),
    leave: countException('leave') + countException('cuti'),
    businessTrip: countException('trip') + countException('dinas') + countException('tugas'),
    unpaidLeave: countException('unpaid'),
    wfh: countException('wfh')
  };
   
  // --- MATRIX KPI ---
  const totalWorkDays = totalRecords;
  
  const attendanceRate = totalWorkDays > 0 ? ((attendanceCount / totalWorkDays) * 100).toFixed(2) : '0.00';
  const onTimeCount = Math.max(0, attendanceCount - lateRecords.length);
  const punctualityRate = attendanceCount > 0 ? ((onTimeCount / attendanceCount) * 100).toFixed(2) : '0.00';
  const lateRate = attendanceCount > 0 ? ((lateRecords.length / attendanceCount) * 100).toFixed(2) : '0.00';
  const earlyLeaveRate = attendanceCount > 0 ? ((earlyLeaveRecords.length / attendanceCount) * 100).toFixed(2) : '0.00';
  const overtimeRate = totalWorkDays > 0 ? ((overtimeRecords.length / totalWorkDays) * 100).toFixed(2) : '0.00';
  const alphaRate = totalWorkDays > 0 ? ((absentCount / totalWorkDays) * 100).toFixed(2) : '0.00';
  const complianceScore = ((parseFloat(attendanceRate) * 0.6) + (parseFloat(punctualityRate) * 0.4)).toFixed(2);
   
  let effectiveWorkHours = totalStandardHours > 0 ? ((totalActualHours / totalStandardHours) * 100) : 0;
  effectiveWorkHours = Math.min(effectiveWorkHours, 100).toFixed(2);
   
  return {
    totalEmployees, totalRecords, attendanceCount, absentCount,
    partialAttendanceCount: partialRecords.length, onlyMasukCount: onlyMasuk, onlyPulangCount: onlyPulang,
    lateRecords: lateRecords.length, totalLateHours: timeToHours(totalLateMinutes),
    earlyLeaveRecords: earlyLeaveRecords.length, totalEarlyLeaveHours: timeToHours(totalEarlyLeaveMinutes),
    overtimeRecords: overtimeRecords.length, totalOvertimeHours: timeToHours(totalOvertimeMinutes),
    avgWorkHours: timeToHours(avgWorkHours), leaveTypes,
    attendanceRate, punctualityRate, lateRate, earlyLeaveRate, overtimeRate, alphaRate,
    complianceScore, effectiveWorkHours
  };
};

export const calculateDepartmentStats = (filteredData) => {
  const deptAnalysis = {};
   
  filteredData.forEach(row => {
    const dept = row.Departemen || 'Unknown';
    const isWorking = isWorkingDay(row);
    const status = validateAttendance(row);
    
    if (!deptAnalysis[dept]) {
      deptAnalysis[dept] = {
        total: 0, present: 0, late: 0, lateMinutes: 0,
        earlyLeave: 0, earlyLeaveMinutes: 0, absent: 0,
        overtime: 0, overtimeMinutes: 0,
        sick: 0, leave: 0, businessTrip: 0, unpaidLeave: 0,
        employees: new Set(), actualHours: 0, standardHours: 0
      };
    }
    
    deptAnalysis[dept].employees.add(row['Emp No.']);

    const otMinutes = calculateOvertimeMinutes(row);
    if (otMinutes > 0) {
      deptAnalysis[dept].overtime++;
      deptAnalysis[dept].overtimeMinutes += otMinutes;
    }

    const exc = row.Pengecualian ? row.Pengecualian.toLowerCase() : '';
    if (exc.includes('sick') || exc.includes('sakit')) deptAnalysis[dept].sick++;
    if (exc.includes('leave') || exc.includes('cuti')) deptAnalysis[dept].leave++;
    if (exc.includes('trip') || exc.includes('dinas')) deptAnalysis[dept].businessTrip++;
    if (exc.includes('unpaid')) deptAnalysis[dept].unpaidLeave++;

    if (isWorking) {
      deptAnalysis[dept].total++;
      
      // Sick/Unpaid tidak dihitung sebagai Present
      if (!isSickOrUnpaid(row) && status.isPresent) {
        deptAnalysis[dept].present++;
        let hours = parseTime(row['Jml Jam Kerja']);
        if (hours === 0 && status.isSpecialWork) hours = 510;
        deptAnalysis[dept].actualHours += hours;
        deptAnalysis[dept].standardHours += 510;
      } else {
        deptAnalysis[dept].absent++;
      }

      if (!hasAnyException(row)) {
         const scanMasuk = parseTime(row['Scan Masuk']);
         const jamMasuk = parseTime(row['Jam Masuk']);
         if (scanMasuk > jamMasuk && jamMasuk > 0) {
            deptAnalysis[dept].late++;
            deptAnalysis[dept].lateMinutes += (scanMasuk - jamMasuk);
         }
         const scanPulang = parseTime(row['Scan Pulang']);
         const jamPulang = parseTime(row['Jam Pulang']);
         if (scanPulang < jamPulang && scanPulang > 0) {
            deptAnalysis[dept].earlyLeave++;
            deptAnalysis[dept].earlyLeaveMinutes += (jamPulang - scanPulang);
         }
      }
    }
  });
   
  return Object.keys(deptAnalysis).map(dept => {
    const d = deptAnalysis[dept];
    const attRate = d.total > 0 ? ((d.present / d.total) * 100).toFixed(1) : '0.0';
    const onTime = Math.max(0, d.present - d.late);
    const punctRate = d.present > 0 ? ((onTime / d.present) * 100).toFixed(1) : '0.0';
    const compScore = ((parseFloat(attRate) * 0.6) + (parseFloat(punctRate) * 0.4)).toFixed(1);
    let effHours = d.standardHours > 0 ? ((d.actualHours / d.standardHours) * 100) : 0;
    effHours = Math.min(effHours, 100).toFixed(1);
    
    return {
      name: dept, employees: d.employees.size, attendance: attRate, punctuality: punctRate,
      lateCount: d.late, lateTotalHours: timeToHours(d.lateMinutes),
      lateRate: d.total > 0 ? ((d.late / d.total) * 100).toFixed(1) : '0.0',
      earlyLeaveCount: d.earlyLeave, earlyLeaveTotalHours: timeToHours(d.earlyLeaveMinutes),
      earlyLeaveRate: d.total > 0 ? ((d.earlyLeave / d.total) * 100).toFixed(1) : '0.0',
      overtimeCount: d.overtime, overtimeTotalHours: timeToHours(d.overtimeMinutes),
      overtimeRate: d.total > 0 ? ((d.overtime / d.total) * 100).toFixed(1) : '0.0',
      sick: d.sick, leave: d.leave, businessTrip: d.businessTrip, unpaidLeave: d.unpaidLeave,
      complianceScore: compScore, effectiveHours: effHours
    };
  });
};

export const calculateEmployeeStats = (filteredData) => {
  const employeeStats = {};
   
  filteredData.forEach(row => {
    const empNo = row['Emp No.'];
    const name = row.Nama;
    const isWorking = isWorkingDay(row);
    const status = validateAttendance(row);
    
    if (!employeeStats[empNo]) {
      employeeStats[empNo] = {
        name, dept: row.Departemen,
        totalDays: 0, present: 0, late: 0, lateMinutes: 0,
        earlyLeave: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0,
        sick: 0, leave: 0, businessTrip: 0, unpaidLeave: 0,
        actualHours: 0, standardHours: 0, partialCount: 0
      };
    }
    
    const emp = employeeStats[empNo];

    const otMinutes = calculateOvertimeMinutes(row);
    if (otMinutes > 0) emp.overtimeMinutes += otMinutes;
    
    const exc = row.Pengecualian ? row.Pengecualian.toLowerCase() : '';
    if (exc.includes('sick') || exc.includes('sakit')) emp.sick++;
    if (exc.includes('leave') || exc.includes('cuti')) emp.leave++;
    if (exc.includes('trip') || exc.includes('dinas')) emp.businessTrip++;
    if (exc.includes('unpaid')) emp.unpaidLeave++;

    if (isWorking) {
      emp.totalDays++;
      
      // Sick/Unpaid tidak dihitung sebagai Present
      if (!isSickOrUnpaid(row) && status.isPresent) {
        emp.present++;
        let hours = parseTime(row['Jml Jam Kerja']);
        if (hours === 0 && status.isSpecialWork) hours = 510;
        emp.actualHours += hours;
        emp.standardHours += 510;
      }
      
      if (!isSickOrUnpaid(row) && status.isPartial) emp.partialCount++;

      if (!hasAnyException(row)) {
         const scanMasuk = parseTime(row['Scan Masuk']);
         const jamMasuk = parseTime(row['Jam Masuk']);
         if (scanMasuk > jamMasuk && jamMasuk > 0) {
            emp.late++;
            emp.lateMinutes += (scanMasuk - jamMasuk);
         }
         const scanPulang = parseTime(row['Scan Pulang']);
         const jamPulang = parseTime(row['Jam Pulang']);
         if (scanPulang < jamPulang && scanPulang > 0) {
            emp.earlyLeave++;
            emp.earlyLeaveMinutes += (jamPulang - scanPulang);
         }
      }
    }
  });
   
  return Object.keys(employeeStats).map(empNo => {
    const emp = employeeStats[empNo];
    const attRate = emp.totalDays > 0 ? (emp.present / emp.totalDays * 100).toFixed(1) : '0.0';
    const onTime = Math.max(0, emp.present - emp.late);
    const punctRate = emp.present > 0 ? ((onTime / emp.present) * 100).toFixed(1) : '0.0';
    const compScore = ((parseFloat(attRate) * 0.6) + (parseFloat(punctRate) * 0.4)).toFixed(1);
    let effHours = emp.standardHours > 0 ? ((emp.actualHours / emp.standardHours) * 100) : 0;
    effHours = Math.min(effHours, 100).toFixed(1);
    
    return {
      empNo, ...emp,
      attendanceRate: attRate, punctualityRate: punctRate, complianceScore: compScore,
      lateTotalHours: timeToHours(emp.lateMinutes),
      earlyLeaveTotalHours: timeToHours(emp.earlyLeaveMinutes),
      overtimeTotalHours: timeToHours(emp.overtimeMinutes),
      effectiveHours: effHours
    };
  }).sort((a, b) => parseFloat(b.complianceScore) - parseFloat(a.complianceScore));
};