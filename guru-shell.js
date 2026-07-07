const STORAGE_KEY = 'zymata-guru-lux-v1';
const ROLE_CHOOSER_PATH = 'index.html?choose=1';

(function guardGuruShellRole(){
  try {
    const raw = sessionStorage.getItem('siakad_session_user') || localStorage.getItem('siakad_session_user') || '';
    if (!raw) return;
    const user = JSON.parse(raw);
    const role = String(user && user.role || '').toLowerCase().replace(/[\s_-]+/g, '');
    if (role === 'wali' || role === 'walimurid' || role === 'orangtua' || role === 'ortu') {
      window.location.replace('wali-shell.html');
    }
  } catch (_) {}
})();

const appState = {
  activeTab: 'home',
  attendanceDone: 24,
  attendanceTotal: 28,
  unreadMessages: 0,
  unreadAnnouncements: 0,
  showAnnouncements: false,
  notificationSound: true,
  notificationHaptic: true,
  agendaDone: false,
  syncMode: 'ui-draft',
  offlineDrafts: 4,
  lastSyncLabel: 'Belum tersambung database',
  moduleInputModes: {},
  jadwalSelectedDay: new Date().getDay(),
  toast: null,
  absenSiswaStatus: {},
  teacherAttendance: {
    status: 'Belum presensi',
    checkIn: '',
    checkOut: '',
    sesi: 'Hari Kerja Biasa',
    keterangan: '',
    isLate: false,
    lateMinutes: 0,
    note: 'Presensi guru belum dikirim hari ini.'
  }
};

const tabMeta = {
  home: {
    eyebrow: 'Dashboard',
    title: 'Selamat pagi, Bu Rani',
    subtitle: '',
    action: 'Mulai Absensi'
  },
  teacherAttendance: {
    eyebrow: 'Absensi Guru',
    title: 'Presensi guru hari ini',
    subtitle: 'Check-in dan check-out dibuat cepat agar kehadiran guru tercatat sebelum mengajar.',
    action: 'Check-in Sekarang'
  },
  class: {
    eyebrow: 'Kelas',
    title: 'Pantau kelas dengan jelas',
    subtitle: 'Data siswa, absensi, dan nilai dibuat ringkas agar guru bisa mengambil keputusan cepat.',
    action: 'Tambah Catatan'
  },
  schedule: {
    eyebrow: 'Jadwal',
    title: 'Agenda hari ini',
    subtitle: 'Pelajaran, rapat, dan pengingat kelas tersusun dalam timeline yang mudah dibaca.',
    action: 'Buat Agenda'
  },
  menu: {
    eyebrow: 'Menu',
    title: 'Semua fitur guru',
    subtitle: 'Pilih modul yang kamu butuhkan untuk pekerjaan kelas hari ini.',
    action: 'Buka Menu'
  },
  messages: {
    eyebrow: 'Chat',
    title: 'Chat',
    subtitle: '',
    action: ''
  },
  pesanLama: {
    eyebrow: 'Pesan',
    title: 'Komunikasi kelas',
    subtitle: 'Pesan wali murid dan sekolah diprioritaskan agar tidak ada tindak lanjut terlewat.',
    action: 'Balas Cepat'
  },
  profile: {
    eyebrow: 'Profil',
    title: 'Pengaturan guru',
    subtitle: 'Kelola identitas, sinkronisasi, dan preferensi aplikasi dari satu tempat.',
    action: 'Sinkronkan'
  }
};

const students = [];

// Jadwal per hari — key = 0 (Min) sampai 6 (Sab), pakai indeks getDay()
const JADWAL_MINGGUAN = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

function getTodaySchedules() {
  const day = new Date().getDay();
  return JADWAL_MINGGUAN[day] || [];
}

function getScheduleByDay(dayIdx) {
  return JADWAL_MINGGUAN[dayIdx] || [];
}

const schedules = getTodaySchedules();

const messages = [];

const announcements = [];

function loadUserAccessPages(){
  try {
    const raw = sessionStorage.getItem('siakad_session_user') || localStorage.getItem('siakad_session_user') || '';
    if(!raw) return [];
    const user = JSON.parse(raw);
    return Array.isArray(user.accessPages) ? user.accessPages : [];
  } catch(e){ return []; }
}

function buildGuruModules(){
  var accessPages = loadUserAccessPages();
  var modules = [
    { id: 'guru-absensi-guru', icon: '&#9711;', title: 'Absensi Guru', meta: 'Check-in/out harian', route: 'teacherAttendance', group: 'Presensi' },
    { id: 'guru-jadwal', icon: '&#9633;', title: 'Jadwal Mengajar', meta: 'Agenda & mapel hari ini', route: 'schedule', group: 'Akademik' },
    { id: 'guru-kalender', icon: '&#9671;', title: 'Kalender Akademik', meta: 'Agenda sekolah & libur', route: 'module:kalender-akademik', group: 'Akademik' },
    { id: 'guru-absensi-siswa', icon: '&#10003;', title: 'Absensi Siswa', meta: 'Kehadiran kelas', route: 'module:absensi-siswa', group: 'Input' },
    { id: 'guru-nilai', icon: '&#8599;', title: 'Nilai', meta: 'Input nilai siswa', route: 'module:nilai', group: 'Input' },
    { id: 'guru-jurnal-guru', icon: '&#9998;', title: 'Jurnal Guru', meta: 'Catatan kegiatan guru', route: 'module:jurnal-guru', group: 'Input' },
    { id: 'guru-jurnal-kelas', icon: '&#9776;', title: 'Jurnal Kelas', meta: 'Kegiatan belajar kelas', route: 'module:jurnal-kelas', group: 'Input' },
    { id: 'guru-hafalan', icon: '&#9790;', title: 'Hafalan', meta: 'Setoran Al-Quran', route: 'module:hafalan', group: 'Perkembangan' },
    { id: 'guru-membaca-quran', icon: '&#9825;', title: 'Membaca Quran', meta: 'Progress membaca Al-Quran', route: 'module:membaca-quran', group: 'Perkembangan' },
    { id: 'guru-ibadah', icon: '&#10022;', title: 'Ibadah', meta: 'Catatan ibadah siswa', route: 'module:ibadah', group: 'Perkembangan' },
    { id: 'guru-karakter', icon: '&#9671;', title: 'Karakter', meta: 'Sikap & akhlak', route: 'module:karakter', group: 'Perkembangan' },
    { id: 'guru-prestasi', icon: '&#9733;', title: 'Prestasi', meta: 'Capaian siswa', route: 'module:prestasi', group: 'Perkembangan' },
    { id: 'guru-ekskul', icon: '&#10041;', title: 'Ekstrakurikuler', meta: 'Ekskul & pembinaan', route: 'module:ekstrakurikuler', group: 'Perkembangan' },
    { id: 'guru-pelanggaran', icon: '&#33;', title: 'Pelanggaran', meta: 'Catatan disiplin', route: 'module:pelanggaran', group: 'Perkembangan' },
    { id: 'guru-mutabaah-quran', icon: '&#9826;', title: 'Mutabaah Quran', meta: 'Pantauan tilawah', route: 'module:mutabaah-quran', group: 'Shared' },
    { id: 'guru-mutabaah-rumah', icon: '&#8962;', title: 'Mutabaah Rumah', meta: 'Kebiasaan di rumah', route: 'module:mutabaah-rumah', group: 'Shared' },
    { id: 'guru-data-siswa', icon: '&#9677;', title: 'Data Siswa', meta: 'Siswa kelas binaan', route: 'class', group: 'Kelas' },
    { id: 'guru-catatan-siswa', icon: '&#9776;', title: 'Catatan Siswa', meta: 'Catatan wali kelas', route: 'module:catatan-siswa', group: 'Kelas' },
    { id: 'guru-pengumuman', icon: '&#9993;', title: 'Pengumuman', meta: 'Info sekolah', route: 'module:pengumuman', group: 'Komunikasi' },
    { id: 'guru-pesan-wali', icon: '&#9742;', title: 'Pesan Wali', meta: 'Komunikasi wali murid', route: 'pesanLama', group: 'Komunikasi' },
    { id: 'guru-surat-izin', icon: '&#9633;', title: 'Surat/Izin', meta: 'Izin & surat siswa', route: 'module:surat-izin', group: 'Komunikasi' },
    { id: 'guru-profil', icon: '&#9677;', title: 'Profil Guru', meta: 'Akun & preferensi', route: 'profile', group: 'Akun' }
  ];
  // Inject modul khusus berdasarkan access_pages
  if(accessPages.indexOf('keuangan') >= 0 || accessPages.indexOf('*') >= 0){
    modules.push({ id: 'guru-keuangan', icon: '&#9733;', title: 'Keuangan', meta: 'SPP, pemasukan & pengeluaran', route: 'module:keuangan', group: 'Keuangan' });
  }
  if(accessPages.indexOf('tabungan') >= 0 || accessPages.indexOf('*') >= 0 || appState.teacherRoleLabel === 'Wali kelas'){
    var __tabItem = { id: 'guru-tabungan', icon: '&#9829;', title: 'Tabungan Siswa', meta: 'Setor, tarik & riwayat tabungan', route: 'module:tabungan', group: 'Presensi' };
    var __idxAbsenGuru = modules.findIndex(function(m){ return m.id === 'guru-absensi-guru'; });
    if (__idxAbsenGuru >= 0) modules.splice(__idxAbsenGuru + 1, 0, __tabItem);
    else modules.push(__tabItem);
  }
  return modules;
}

const modulePlaceholders = {
  'absensi-siswa': {
    eyebrow: 'Input Presensi',
    title: 'Absensi Siswa',
    subtitle: 'Tandai hadir, izin, sakit, atau alpa untuk siswa kelas binaan.',
    stats: [],
    focus: []
  },
  nilai: {
    eyebrow: 'Input Akademik',
    title: 'Nilai',
    subtitle: 'Input nilai tulis, lisan, akhir, dan catatan per mapel.',
    stats: [],
    focus: []
  },
  'jurnal-guru': {
    eyebrow: 'Jurnal Harian',
    title: 'Jurnal Guru',
    subtitle: 'Catat kegiatan mengajar, kendala, dan tindak lanjut harian.',
    stats: [],
    focus: []
  },
  'jurnal-kelas': {
    eyebrow: 'Jurnal Kelas',
    title: 'Jurnal Kelas',
    subtitle: 'Catat materi, kegiatan belajar, kehadiran, dan tindak lanjut kelas per jam pelajaran.',
    stats: [],
    focus: []
  },
  'kalender-akademik': {
    eyebrow: 'Akademik',
    title: 'Kalender Akademik',
    subtitle: 'Agenda sekolah, libur, ujian, rapat, dan kegiatan kelas dalam satu timeline.',
    stats: [],
    focus: []
  },
  hafalan: {
    eyebrow: 'Perkembangan',
    title: 'Hafalan Al-Quran',
    subtitle: 'Pantau surah, juz, ayat, dan nilai hafalan.',
    stats: [],
    focus: []
  },
  'membaca-quran': {
    eyebrow: 'Perkembangan',
    title: 'Membaca Al-Quran',
    subtitle: 'Pantau progress membaca Al-Quran: surah, juz, dan nilai.',
    stats: [],
    focus: []
  },
  ibadah: {
    eyebrow: 'Perkembangan',
    title: 'Catatan Ibadah',
    subtitle: 'Pantau shalat, sunnah, puasa, sedekah, dan nilai kebiasaan.',
    stats: [],
    focus: []
  },
  karakter: {
    eyebrow: 'Perkembangan',
    title: 'Karakter Siswa',
    subtitle: 'Nilai disiplin, sopan santun, kejujuran, kerjasama, dan tanggung jawab.',
    stats: [],
    focus: []
  },
  prestasi: {
    eyebrow: 'Perkembangan',
    title: 'Prestasi',
    subtitle: 'Catat prestasi akademik dan non-akademik siswa.',
    stats: [],
    focus: []
  },
  ekstrakurikuler: {
    eyebrow: 'Perkembangan',
    title: 'Ekstrakurikuler',
    subtitle: 'Pantau kegiatan ekskul, pembina, jadwal, anggota, dan perkembangan siswa.',
    stats: [],
    focus: []
  },
  pelanggaran: {
    eyebrow: 'Perkembangan',
    title: 'Pelanggaran',
    subtitle: 'Catat pelanggaran, poin, status tindak lanjut, dan guru pencatat.',
    stats: [],
    focus: []
  },
  'mutabaah-quran': {
    eyebrow: 'Shared Module',
    title: 'Mutabaah Quran',
    subtitle: 'Pantau tilawah dan rutinitas Al-Quran yang dibagikan antar role.',
    stats: [],
    focus: []
  },
  'mutabaah-rumah': {
    eyebrow: 'Shared Module',
    title: 'Mutabaah Rumah',
    subtitle: 'Pantau kebiasaan harian siswa di rumah dari laporan wali murid.',
    stats: [],
    focus: []
  },
  'catatan-siswa': {
    eyebrow: 'Kelas',
    title: 'Catatan Siswa',
    subtitle: 'Catatan wali kelas untuk perkembangan dan tindak lanjut siswa.',
    stats: [],
    focus: []
  },
  pengumuman: {
    eyebrow: 'Komunikasi',
    title: 'Pengumuman',
    subtitle: 'Baca info sekolah dan pengumuman untuk kelas.',
    stats: [],
    focus: []
  },
  'surat-izin': {
    eyebrow: 'Komunikasi',
    title: 'Surat/Izin',
    subtitle: 'Kelola izin siswa, surat dari sekolah, dan status persetujuan wali kelas.',
    stats: [],
    focus: []
  },
  keuangan: {
    eyebrow: 'Keuangan',
    title: 'Keuangan Sekolah',
    subtitle: 'Pantau SPP, pemasukan, pengeluaran, dan laporan keuangan sekolah.',
    stats: [],
    focus: []
  },
  tabungan: {
    eyebrow: 'Keuangan',
    title: 'Tabungan Siswa',
    subtitle: 'Kelola setoran, penarikan, dan mutasi tabungan siswa per kelas.',
    stats: [],
    focus: []
  }
};

const databaseReadiness = [
  { label: 'guru_id', value: 'disiapkan dari akun guru' },
  { label: 'kelas_id', value: 'kelas binaan / jadwal mengajar' },
  { label: 'mapel_id', value: 'khusus nilai & jurnal' },
  { label: 'client_key', value: 'wajib ikut semua query' }
];

const headerEl = document.getElementById('appHeader');
const contentEl = document.getElementById('appContent');
const floatingEl = document.getElementById('appFloating');
const navEl = document.getElementById('appBottomNav');
let actionsBound = false;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    appState.activeTab = 'home';
    if (saved && saved.teacherAttendance) {
      appState.teacherAttendance = {
        ...appState.teacherAttendance,
        ...saved.teacherAttendance
      };
    }
    if (typeof saved.notificationSound === 'boolean') appState.notificationSound = saved.notificationSound;
    if (typeof saved.notificationHaptic === 'boolean') appState.notificationHaptic = saved.notificationHaptic;
  } catch (error) {
    console.warn('Failed to load guru lux state', error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    activeTab: appState.activeTab,
    notificationSound: appState.notificationSound,
    notificationHaptic: appState.notificationHaptic,
    teacherAttendance: appState.teacherAttendance
  }));
}

// ===== Cache data Supabase (stale-while-revalidate) =====
// Simpan snapshot data terakhir agar buka aplikasi berikutnya tampil INSTAN dari cache,
// lalu di-refresh diam-diam di belakang oleh hydrateGuruFromSupabase().
const DATA_CACHE_KEY = STORAGE_KEY + '_data';
function saveDataCache() {
  try {
    localStorage.setItem(DATA_CACHE_KEY, JSON.stringify({
      v: 1,
      ts: Date.now(),
      syncMode: appState.syncMode,
      teacherName: appState.teacherName,
      teacherNip: appState.teacherNip,
      teacherPhotoUrl: appState.teacherPhotoUrl,
      teacherClass: appState.teacherClass,
      teacherRoleLabel: appState.teacherRoleLabel,
      guruKelasList: appState.guruKelasList,
      guruMapelList: appState.guruMapelList,
      attendanceTotal: appState.attendanceTotal,
      attendanceDone: appState.attendanceDone,
      lastSyncLabel: appState.lastSyncLabel,
      supabaseModules: appState.supabaseModules,
      students: students,
      siswaPerKelas: SISWA_PER_KELAS
    }));
  } catch (_) {}
}
function loadDataCache() {
  try {
    const raw = localStorage.getItem(DATA_CACHE_KEY);
    if (!raw) return false;
    const c = JSON.parse(raw);
    if (!c || c.v !== 1) return false;
    if (c.syncMode) appState.syncMode = c.syncMode;
    if (c.teacherName) appState.teacherName = c.teacherName;
    if (c.teacherNip) appState.teacherNip = c.teacherNip;
    if (typeof c.teacherPhotoUrl === 'string') appState.teacherPhotoUrl = c.teacherPhotoUrl;
    if (c.teacherClass) appState.teacherClass = c.teacherClass;
    if (c.teacherRoleLabel) appState.teacherRoleLabel = c.teacherRoleLabel;
    if (Array.isArray(c.guruKelasList)) appState.guruKelasList = c.guruKelasList;
    if (Array.isArray(c.guruMapelList)) appState.guruMapelList = c.guruMapelList;
    if (typeof c.attendanceTotal === 'number') appState.attendanceTotal = c.attendanceTotal;
    if (typeof c.attendanceDone === 'number') appState.attendanceDone = c.attendanceDone;
    if (c.lastSyncLabel) appState.lastSyncLabel = c.lastSyncLabel;
    if (c.supabaseModules && typeof c.supabaseModules === 'object') appState.supabaseModules = c.supabaseModules;
    if (Array.isArray(c.students)) students.splice(0, students.length, ...c.students);
    if (c.siswaPerKelas && typeof c.siswaPerKelas === 'object') {
      Object.keys(SISWA_PER_KELAS).forEach(function(k){ delete SISWA_PER_KELAS[k]; });
      Object.keys(c.siswaPerKelas).forEach(function(k){ if (Array.isArray(c.siswaPerKelas[k])) SISWA_PER_KELAS[k] = c.siswaPerKelas[k].slice(); });
      if (Array.isArray(KELAS_LIST)) { KELAS_LIST.length = 0; Object.keys(SISWA_PER_KELAS).sort().forEach(function(k){ KELAS_LIST.push(k); }); }
    }
    // Pulihkan judul tab dari cache (hindari teks empty-state berkedip)
    if (appState.teacherClass && appState.teacherClass !== 'Kelas belum terhubung') {
      tabMeta.class.eyebrow = 'Kelas ' + appState.teacherClass;
      tabMeta.class.title = 'Kelas ' + appState.teacherClass;
    }
    tabMeta.home.title = 'Selamat datang, ' + (appState.teacherName || 'Guru');
    return true;
  } catch (_) { return false; }
}

function getHomeSubtitle() {
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const cls = (typeof appState !== 'undefined' && appState.teacherClass) ? appState.teacherClass : '';
  return cls ? `${today} &middot; ${cls}` : `${today}`;
}

function renderHeader() {
  const moduleId = appState.activeTab.startsWith('module:') ? appState.activeTab.replace('module:', '') : '';
  const moduleDetail = moduleId ? modulePlaceholders[moduleId] : null;
  const isModule   = Boolean(moduleId);
  const isHome     = appState.activeTab === 'home';
  const meta = tabMeta[appState.activeTab] || {
    eyebrow: moduleDetail?.eyebrow || 'Menu Guru',
    title: moduleDetail?.title || 'Modul',
    subtitle: moduleDetail?.subtitle || ''
  };

  if (isHome) {
    // Home = TANPA top app bar (nama & lonceng dipindah ke dalam card hero,
    // supaya tidak bentrok dengan status bar HP: jaringan, baterai, dll)
    headerEl.innerHTML = '';
    return;
  }

  if (isModule) {
    // Module page = top app bar dengan back arrow + title
    headerEl.innerHTML = `
      <div class="top-app-bar">
        <button type="button" class="tab-back-btn" data-action="backToMenu" aria-label="Kembali ke menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="top-bar-title">${meta.title}</span>
        <div style="width:40px"></div>
      </div>`;
    return;
  }

  // Tab lain = top app bar standar dengan judul tengah
  headerEl.innerHTML = `
    <div class="top-app-bar">
      <span class="top-bar-title">${meta.title || tabMeta[appState.activeTab]?.title || ''}</span>
      <div class="tab-actions">
        <button type="button" class="tab-icon-btn" data-action="toggleAnnouncements" aria-label="Pengumuman">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          ${appState.unreadAnnouncements ? '<span class="tib-dot"></span>' : ''}
        </button>
      </div>
    </div>`;
}

// ─── Absensi Guru constants ────────�����───────────────────────────────
const AG_CUTOFF = '06:55'; // batas tepat waktu
const AG_RADIUS_M = 50;
const AG_MAX_ACCURACY_M = 200;
const AG_LOKASI_KEY = 'sdplus_absensi_guru_lokasi_sekolah_v1';
const AG_SESI_LIST = ['Hari Kerja Biasa', 'Upacara', 'Rapat Dinas', 'Hari Besar'];
const AG_STATUS_LIST = [
  { value: 'hadir',     label: '&#10003; Hadir',    tone: 'green' },
  { value: 'terlambat', label: '&#9200; Terlambat', tone: 'orange' },
  { value: 'izin',      label: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6"/><path d="M9 16h4"/></svg> Izin',    tone: 'blue' },
  { value: 'sakit',     label: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><path d="M3 12h4l2-5 3 9 2-4h4"/></svg> Sakit',   tone: 'gold' },
  { value: 'dinas',     label: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/></svg> Dinas',   tone: 'indigo' },
  { value: 'alpa',      label: '&#10007; Alpa',     tone: 'red' }
];

function agMinOf(hhmm) {
  const parts = String(hhmm || '00:00').split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}
// Batas jam masuk wajar: 05:00 - 12:00. Di luar window ini tidak dihitung terlambat.
const AG_CHECKIN_MIN_HOUR = 5;  // sebelum jam 5 pagi = tidak normal
const AG_CHECKIN_MAX_HOUR = 12; // setelah jam 12 siang = bukan absen pagi
function agInCheckInWindow(hhmm) {
  var h = parseInt(String(hhmm || '').split(':')[0], 10);
  return h >= AG_CHECKIN_MIN_HOUR && h < AG_CHECKIN_MAX_HOUR;
}
function agLateMinutes(hhmm) {
  // Sepanjang hari: check-in setelah AG_CUTOFF selalu dihitung terlambat
  return Math.max(0, agMinOf(hhmm) - agMinOf(AG_CUTOFF));
}
function agIsLate(hhmm) { return agLateMinutes(hhmm) > 0; }
function agNowHHMM() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function agEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function agTodayISO() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function agFillSiswaOptions(selectEl, kelas) {
  if (!selectEl) return;
  var list = kelas ? (SISWA_PER_KELAS[kelas] || []) : [];
  var optHtml = '<option value="">' + (kelas ? 'Pilih siswa' : 'Pilih kelas dahulu') + '</option>';
  list.forEach(function(s){ optHtml += '<option value="' + s.nis + '">' + s.name + ' (' + s.nis + ')</option>'; });
  selectEl.innerHTML = optHtml;
  selectEl.value = '';
}
function agDigits(v){ return String(v == null ? '' : v).replace(/\D/g, ''); }
function agParseScan(raw){
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  // QR berisi JSON, mis. {"nis":"123"}
  try { var o = JSON.parse(s); if (o && (o.nis || o.nisn || o.id)) return String(o.nis || o.nisn || o.id).trim(); } catch(e){}
  // QR berformat pipa dari web admin, mis. "SISWA|74|240101002" (SISWA|<id>|<nis>)
  if (s.indexOf('|') !== -1) {
    var parts = s.split('|').map(function(p){ return p.trim(); }).filter(Boolean);
    if (parts.length) {
      if (/^siswa$/i.test(parts[0]) && parts.length >= 2) return parts[parts.length - 1];
      for (var pi = parts.length - 1; pi >= 0; pi--) { if (/^\d+$/.test(parts[pi])) return parts[pi]; }
      return parts[parts.length - 1];
    }
  }
  // QR berisi URL / query, mis. ...?nis=123 atau nisn:123
  var m = s.match(/(?:nisn|nis|id)\s*[=:\/]\s*([A-Za-z0-9]+)/i);
  if (m) return m[1];
  return s;
}
function agStudentCount(){
  var n = 0;
  (KELAS_LIST || []).forEach(function(k){ n += (SISWA_PER_KELAS[k] || []).length; });
  return n;
}
function agFindStudent(raw){
  var code = String(agParseScan(raw)).trim();
  if (!code) return null;
  var codeD = agDigits(code);
  var codeN = codeD.replace(/^0+/, '');
  var hit = null;
  (KELAS_LIST || []).some(function(kls){
    return (SISWA_PER_KELAS[kls] || []).some(function(s){
      var sn = String(s.nis == null ? '' : s.nis).trim();
      var sd = agDigits(sn);
      if (sn && sn.toLowerCase() === code.toLowerCase()) { hit = { nis: sn, name: s.name, kelas: kls }; return true; }
      if (codeD && sd && sd === codeD) { hit = { nis: sn, name: s.name, kelas: kls }; return true; }
      if (codeN && codeN.length >= 3 && sd.replace(/^0+/, '') === codeN) { hit = { nis: sn, name: s.name, kelas: kls }; return true; }
      return false;
    });
  });
  return hit;
}
function agScanNotFoundMsg(raw){
  var total = agStudentCount();
  if (!total) return 'Data siswa belum termuat. Buka modul Absensi dulu (untuk memuat data siswa) atau sambungkan Supabase, lalu scan lagi.';
  return 'Kode "' + raw + '" tidak cocok dengan ' + total + ' siswa yang termuat. Pastikan QR berisi NIS yang benar.';
}
function agFindKelasByNis(nis) {
  var hit = agFindStudent(nis);
  return hit ? hit.kelas : '';
}
function agAddStudentRow(row){
  if (!row || typeof row !== 'object') return null;
  var kelas = String(row.kelas || row.kelas_id || row.rombel || row.kelas_nama || 'Tanpa Kelas').trim() || 'Tanpa Kelas';
  var nama = String(row.nama || row.nama_siswa || row.name || 'Siswa').trim();
  var nis = String(row.nis || row.nisn || row.id || '').trim();
  if (!SISWA_PER_KELAS[kelas]) SISWA_PER_KELAS[kelas] = [];
  if (!SISWA_PER_KELAS[kelas].some(function(s){ return String(s.nis) === nis; })) {
    SISWA_PER_KELAS[kelas].push({ nis: nis, name: nama });
  }
  if (typeof KELAS_LIST !== 'undefined' && Array.isArray(KELAS_LIST) && KELAS_LIST.indexOf(kelas) === -1) KELAS_LIST.push(kelas);
  return { nis: nis, name: nama, kelas: kelas };
}
// Cari siswa: LANGSUNG ke Supabase (akses semua siswa, tidak terbatas roster lokal). Lokal hanya fallback saat offline.
async function agResolveStudent(raw){
  var code = String(agParseScan(raw)).trim();
  try {
    var _S = window.ZymataMobileSupabase;
    if (code && _S && _S.select) {
      // Pakai pola eq yang sudah terbukti jalan (hindari filter or/ilike yang bisa memicu 400).
      var row = null;
      var res = await _S.select('siswa', { eq: { nis: code }, limit: 1 });
      if (res && !res.error && Array.isArray(res.data) && res.data.length) row = res.data[0];
      if (!row) {
        var res2 = await _S.select('siswa', { eq: { nisn: code }, limit: 1 });
        if (res2 && !res2.error && Array.isArray(res2.data) && res2.data.length) row = res2.data[0];
      }
      // Cadangan: kalau beda nol di depan, coba versi tanpa nol depan
      if (!row) {
        var alt = code.replace(/^0+/, '');
        if (alt && alt !== code) {
          var res3 = await _S.select('siswa', { eq: { nis: alt }, limit: 1 });
          if (res3 && !res3.error && Array.isArray(res3.data) && res3.data.length) row = res3.data[0];
        }
      }
      if (row) {
        var added = agAddStudentRow(row);
        try { saveDataCache(); } catch(e){}
        return added || agFindStudent(raw);
      }
    }
  } catch (e) {}
  // Fallback ke roster lokal (mis. saat offline / Supabase tak tersedia)
  return agFindStudent(raw);
}
// Apakah kelas siswa termasuk kelas yang diajar guru? (untuk modul yang sengaja dibatasi)
function agIsTaughtClass(kelas){
  var list = (appState.guruKelasList && appState.guruKelasList.length) ? appState.guruKelasList : null;
  if (!list) return true; // belum ada data kelas guru -> jangan blokir
  var target = String(kelas || '').trim().toLowerCase();
  return list.some(function(k){ return String(k).trim().toLowerCase() === target; });
}
function agTodayLabel() {
  return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function agStatusLabel(value) {
  const found = AG_STATUS_LIST.find(s => s.value === value);
  return found ? found.label : value;
}
function agStatusTone(value) {
  const found = AG_STATUS_LIST.find(s => s.value === value);
  return found ? found.tone : 'blue';
}

function agCanUseGps() {
  return location.protocol.startsWith('https') || location.hostname === 'localhost' || location.protocol === 'capacitor:';
}

function agReadLokasiLocal() {
  try {
    const raw = localStorage.getItem(AG_LOKASI_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng, radius: Number(data.radius || AG_RADIUS_M), source: data.source || 'local' };
    }
  } catch (_) {}
  return null;
}

function agSaveLokasiLocal(data) {
  if (!data || !Number.isFinite(Number(data.lat)) || !Number.isFinite(Number(data.lng))) return;
  try {
    localStorage.setItem(AG_LOKASI_KEY, JSON.stringify({
      lat: Number(data.lat),
      lng: Number(data.lng),
      radius: Number(data.radius || AG_RADIUS_M),
      source: data.source || 'supabase',
      syncedAt: new Date().toISOString()
    }));
  } catch (_) {}
}

async function agGetLokasiSekolah() {
  if (window._agLokasiSekolah && Number.isFinite(Number(window._agLokasiSekolah.lat)) && Number.isFinite(Number(window._agLokasiSekolah.lng))) {
    return window._agLokasiSekolah;
  }
  try {
    const _agDb = window.db || window.ZymataMobileSupabase;
    if (_agDb && typeof _agDb.select === 'function') {
      const res = await _agDb.select('pengaturan_sekolah', { eq: { client_key: 'default' }, limit: 1 });
      const row = Array.isArray(res?.data) ? res.data[0] : (Array.isArray(res) ? res[0] : null);
      const lat = Number(row?.gps_lat || row?.gpsLat);
      const lng = Number(row?.gps_lng || row?.gpsLng);
      const radius = Number(row?.gps_radius || row?.gpsRadius || AG_RADIUS_M);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        window._agLokasiSekolah = { lat, lng, radius: Number.isFinite(radius) ? radius : AG_RADIUS_M, source: 'supabase' };
        agSaveLokasiLocal(window._agLokasiSekolah);
        return window._agLokasiSekolah;
      }
    }
  } catch (error) {
    console.warn('Gagal membaca GPS sekolah dari Supabase', error);
  }
  const local = agReadLokasiLocal();
  if (local) {
    window._agLokasiSekolah = local;
    return local;
  }
  return null;
}

function agGetGeoPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Perangkat belum mendukung GPS/lokasi.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      let message = 'Gagal membaca lokasi.';
      if (error && error.code === 1) message = 'Akses lokasi ditolak. Izinkan lokasi/GPS untuk absen.';
      if (error && error.code === 2) message = 'Lokasi tidak tersedia. Aktifkan GPS/Location lalu coba lagi.';
      if (error && error.code === 3) message = 'Membaca lokasi terlalu lama. Coba lagi di area terbuka.';
      reject(new Error(message));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}

function agDistanceMeter(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function agValidateGpsForCheckIn() {
  if (!agCanUseGps()) throw new Error('GPS hanya bisa berjalan di HTTPS, localhost, atau aplikasi native.');
  const sekolah = await agGetLokasiSekolah();
  if (!sekolah) throw new Error('Titik GPS sekolah belum tersedia. Set lokasi di web Zymata terlebih dulu, lalu sinkronkan Supabase.');
  const pos = await agGetGeoPosition();
  const coords = pos.coords || {};
  const accuracy = Math.round(Number(coords.accuracy || 9999));
  if (accuracy > AG_MAX_ACCURACY_M) {
    throw new Error(`Akurasi GPS kurang baik (${accuracy} m). Aktifkan GPS akurasi tinggi lalu coba lagi.`);
  }
  const distance = Math.round(agDistanceMeter(Number(coords.latitude), Number(coords.longitude), Number(sekolah.lat), Number(sekolah.lng)));
  const radius = Number(sekolah.radius || AG_RADIUS_M);
  if (distance > radius) {
    throw new Error(`Anda berada ${distance} m dari titik sekolah. Absen ditolak karena radius maksimal ${radius} m.`);
  }
  return { distance, accuracy, radius, source: sekolah.source || 'pengaturan' };
}

function getTeacherAttendancePrimaryLabel() {
  if (!appState.teacherAttendance.checkIn) return 'Check-in Sekarang';
  if (!appState.teacherAttendance.checkOut) return 'Check-out Sekarang';
  return 'Presensi Selesai';
}

function getDashboardPriorities() {
  const pct = appState.attendanceTotal ? Math.round((appState.attendanceDone / appState.attendanceTotal) * 100) : 0;
  const drafts = appState.offlineDrafts || 0;
  const msgs = appState.unreadMessages || 0;
  const items = [];
  if (!appState.attendanceTotal) items.push({ icon: '✓', label: 'Belum ada data absensi', meta: 'Data kelas akan tampil setelah Supabase terhubung', route: 'module:absensi-siswa', tone: 'blue' });
  else if (pct < 100) items.push({ icon: '✓', label: 'Absensi belum selesai', meta: `${appState.attendanceDone}/${appState.attendanceTotal} siswa tercatat`, route: 'module:absensi-siswa', tone: 'orange' });
  else items.push({ icon: '✓', label: 'Absensi sudah lengkap', meta: `${appState.attendanceTotal}/${appState.attendanceTotal} siswa tercatat`, route: 'module:absensi-siswa', tone: 'green' });
  if (drafts > 0) items.push({ icon: '📄', label: `${drafts} draft menunggu sinkron`, meta: 'Tersimpan lokal · akan sync saat online', route: 'menu', tone: 'gold' });
  if (msgs > 0) items.push({ icon: '✉', label: `${msgs} pesan wali belum dibaca`, meta: 'Ada pertanyaan dari orang tua siswa', route: 'messages', tone: 'blue' });
  return items;
}

function renderHome() {
  const now = new Date();
  const today = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' });
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : 'Selamat sore';
  const pct = appState.attendanceTotal ? Math.round((appState.attendanceDone / appState.attendanceTotal) * 100) : 0;
  const todaySched = getTodaySchedules();
  const agendaCount = todaySched.length;
  const dayIdx = now.getDay();
  const isWeekend = dayIdx === 0 || dayIdx === 6;
  const priorities = getDashboardPriorities();

  // Sesi berikutnya
  const nowMin = hour * 60 + now.getMinutes();
  const nextSesi = todaySched.find(s => {
    const [h,m] = s.time.split(':').map(Number);
    return (h * 60 + m) > nowMin;
  }) || todaySched[todaySched.length - 1];

  return `
    <style id="guru-hdr-fix">
      /* Background disamain dengan warna halaman agar status bar nyambung natural */
      html, body { background: #0a1020 !important; }
    </style>
    <!-- Hero Guru premium -->
    <div class="guru-dash-hero">
      <div class="gdh-top">
        <span class="gdh-greeting">${greeting} ✨</span>
        <div class="gdh-top-right">
          <span class="gdh-date">${today}</span>
          <button type="button" class="gdh-bell" data-action="toggleAnnouncements" aria-label="Pengumuman">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            ${appState.unreadAnnouncements ? '<span class="tib-dot"></span>' : ''}
          </button>
        </div>
      </div>
      <div class="gdh-identity">
        ${teacherAvatarHtml('gdh-photo')}
        <h2 class="gdh-name">${appState.syncMode === 'supabase-empty' ? 'Guru' : (appState.teacherName || 'Guru')}</h2>
      </div>
      <div class="gdh-chip-row">
        <span>${appState.teacherClass || (appState.attendanceTotal ? 'Kelas terhubung' : 'Kelas belum terhubung')}</span>
        <span>${appState.teacherRoleLabel || (appState.attendanceTotal ? 'Wali kelas' : 'Menunggu Supabase')}</span>
        <span class="${isWeekend ? 'chip-rest' : 'chip-active'}">${isWeekend ? '🏠 Hari libur' : '● Aktif mengajar'}</span>
      </div>
      ${nextSesi && !isWeekend ? `
      <div class="gdh-next-sesi">
        <span class="gdh-next-label">Sesi berikutnya</span>
        <div class="gdh-next-body">
          <strong>${nextSesi.time}</strong>
          <span>${nextSesi.title}</span>
          <span class="status-pill ${nextSesi.tone}">${nextSesi.status}</span>
        </div>
      </div>` : ''}
    </div>

    <!-- Metric strip -->
    <section class="section section--tight">
      <div class="dash-metric-strip">
        <article class="dms-card indigo">
          <strong>${appState.attendanceDone}/${appState.attendanceTotal}</strong>
          <span>Hadir</span>
          <div class="dms-bar"><div style="width:${pct}%"></div></div>
        </article>
        <article class="dms-card gold">
          <strong>${agendaCount}</strong>
          <span>Agenda</span>
        </article>
        <article class="dms-card ${appState.unreadMessages > 0 ? 'red' : 'green'}">
          <strong>${appState.unreadMessages}</strong>
          <span>Pesan</span>
        </article>
        <article class="dms-card orange">
          <strong>${appState.offlineDrafts}</strong>
          <span>Draft</span>
        </article>
      </div>
    </section>

    <!-- Akses cepat scan QR siswa -->
    <section class="section section--tight">
      <div style="display:flex;gap:10px">
        <button type="button" data-dash-scan="pelanggaran" style="flex:1;display:flex;align-items:center;gap:10px;padding:13px 14px;border:1px solid #1e2740;border-radius:14px;background:#0e1424;cursor:pointer;box-shadow:0 1px 3px rgba(16,24,40,.05)">
          <span style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#fee2e2,#fecaca);font-size:18px;flex:0 0 auto">&#128247;</span>
          <span style="text-align:left;line-height:1.25">
            <strong style="display:block;font-size:13px;color:#fcfcfc;font-weight:700">Pelanggaran</strong>
            <small style="font-size:11px;color:#9a9a92">Scan kartu siswa</small>
          </span>
        </button>
        <button type="button" data-dash-scan="catatan" style="flex:1;display:flex;align-items:center;gap:10px;padding:13px 14px;border:1px solid #1e2740;border-radius:14px;background:#0e1424;cursor:pointer;box-shadow:0 1px 3px rgba(16,24,40,.05)">
          <span style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);font-size:18px;flex:0 0 auto">&#128247;</span>
          <span style="text-align:left;line-height:1.25">
            <strong style="display:block;font-size:13px;color:#fcfcfc;font-weight:700">Catatan Siswa</strong>
            <small style="font-size:11px;color:#9a9a92">Scan kartu siswa</small>
          </span>
        </button>
      </div>
    </section>

    <!-- Prioritas smart -->
    <section class="section section--tight">
      ${sectionHead('Prioritas hari ini', String(priorities.length))}
      <div class="dash-priority-list">
        ${priorities.map(p => `
          <article class="dpl-row" data-module-route="${p.route}">
            <span class="dpl-icon ${p.tone}">${p.icon}</span>
            <div class="dpl-body">
              <strong>${p.label}</strong>
              <p>${p.meta}</p>
            </div>
            <svg class="dpl-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 4 13 10 7 16"/></svg>
          </article>`).join('')}
      </div>
    </section>

    <!-- Jadwal hari ini ringkas -->
    <section class="section section--tight">
      ${sectionHead('Jadwal hari ini', `<span data-tab="schedule" style="cursor:pointer;color:#00ffdb;font-size:11px;font-weight:800">Lihat semua</span>`)}
      ${isWeekend ? `<p class="card-meta" style="text-align:center;padding:18px 0">Hari libur — tidak ada jadwal mengajar.</p>` : `
      <div class="dash-sched-list">
        ${todaySched.map((s,i) => `
          <div class="dsl-row ${i===0?'is-first':''}">
            <span class="dsl-time">${s.time}</span>
            <div class="dsl-body">
              <span class="dsl-title">${s.title}</span>
              <span class="dsl-meta">${s.meta}</span>
            </div>
            <span class="status-pill ${s.tone}">${s.status}</span>
          </div>`).join('')}
      </div>`}
    </section>
  `;
}

function getTodayTeacherAttendanceRow() {
  var today = agTodayISO();
  var nip = String(appState.teacherNip || '').trim();
  var rows = (appState.supabaseModules && appState.supabaseModules.presensiGuru) ? appState.supabaseModules.presensiGuru : [];
  rows = Array.isArray(rows) ? rows : [];
  return rows.find(function(r){
    if (!r) return false;
    var sameDate = guruRowDate(r) === today;
    var rowNip = String(r.nip || r.nip_guru || r.NIP || '').trim();
    return sameDate && (!nip || !rowNip || rowNip === nip);
  }) || null;
}

function syncTeacherAttendanceFromTodayRow(row) {
  if (!row) return false;
  var att = appState.teacherAttendance || (appState.teacherAttendance = {});
  att.status = row.status || att.status || 'hadir';
  att.checkIn = row.jam_masuk || row.checkIn || row.masuk || att.checkIn || '';
  att.checkOut = row.jam_pulang || row.checkOut || row.pulang || att.checkOut || '';
  att.sesi = row.sesi || att.sesi || 'Hari Kerja Biasa';
  att.keterangan = row.keterangan || row.ket || att.keterangan || '';
  att.note = 'Presensi guru hari ini sudah tersimpan dan dikunci.';
  att.lockedToday = true;
  att.lockedDate = agTodayISO();
  return true;
}

function isTeacherAttendanceLockedToday() {
  if (appState.teacherAttendance && appState.teacherAttendance.lockedToday && appState.teacherAttendance.lockedDate === agTodayISO()) return true;
  return !!getTodayTeacherAttendanceRow();
}

function resetTeacherAttendanceIfNewDay() {
  var att = appState.teacherAttendance || (appState.teacherAttendance = {});
  if (att.lockedDate && att.lockedDate !== agTodayISO()) {
    appState.teacherAttendance = {
      status: 'hadir',
      checkIn: '',
      checkOut: '',
      sesi: att.sesi || 'Hari Kerja Biasa',
      keterangan: '',
      isLate: false,
      lateMinutes: 0,
      note: 'Silakan lakukan presensi hari ini.',
      lockedToday: false,
      lockedDate: ''
    };
  }
}

function renderTeacherAttendance() {
  resetTeacherAttendanceIfNewDay();
  const todayRow = getTodayTeacherAttendanceRow();
  if (todayRow) syncTeacherAttendanceFromTodayRow(todayRow);
  const att = appState.teacherAttendance;
  const lockedToday = isTeacherAttendanceLockedToday();
  const isCheckedIn  = Boolean(att.checkIn) || lockedToday;
  const isCheckedOut = Boolean(att.checkOut) || lockedToday;
  const checkInText  = att.checkIn  || '--:--';
  const checkOutText = att.checkOut || '--:--';

  // hitung status otomatis berdasarkan jam masuk
  const lateMin   = att.checkIn ? agLateMinutes(att.checkIn) : 0;
  const isLate    = lateMin > 0;
  const autoStatus = isCheckedIn
    ? (isLate ? 'terlambat' : (att.status === 'hadir' || att.status === 'terlambat' ? att.status : att.status || 'hadir'))
    : (att.status || 'Belum presensi');
  const statusTone = isCheckedIn
    ? (isLate ? 'orange' : agStatusTone(autoStatus))
    : 'orange';

  const lateInfo = isLate
    ? `<div class="ag-late-banner">&#9200; Terlambat ${lateMin} menit dari batas check-in <strong>${AG_CUTOFF}</strong></div>`
    : (isCheckedIn ? `<div class="ag-ontime-banner">&#10003; Tepat waktu &mdash; check-in sebelum ${AG_CUTOFF}</div>` : '');

  return `
    <!-- === SECTION 1: Status Presensi Hari Ini === -->
    <section class="section">
      <article class="teacher-attendance-card ag-main-card">
        <div class="ag-card-top">
          <span class="attendance-status ${lockedToday ? 'green' : statusTone}">${lockedToday ? 'Sudah presensi' : (isCheckedIn ? agStatusLabel(autoStatus) : 'Belum presensi')}</span>
          <span class="ag-date-chip">${agTodayLabel()}</span>
        </div>
        <h3 class="attendance-title">${appState.syncMode === 'supabase-empty' ? 'Presensi Guru' : ('Presensi ' + (appState.teacherName || 'Guru'))}</h3>
        ${lateInfo}

        <!-- Sesi hari ini -->
        <div class="ag-field-row">
          <span class="ag-field-label">Sesi</span>
          <div class="ag-sesi-pills">
            ${AG_SESI_LIST.map(sesi => `
              <button type="button"
                class="ag-sesi-btn ${att.sesi === sesi ? 'active' : ''}"
                data-ag-sesi="${sesi}"
                ${isCheckedIn ? 'disabled' : ''}>
                ${sesi}
              </button>`).join('')}
          </div>
        </div>

        <!-- Jam masuk & pulang -->
        <div class="ag-time-row">
          <div class="ag-time-box ${isCheckedIn ? 'filled' : ''}">
            <span class="ag-time-label">Jam Masuk</span>
            <strong class="ag-time-value">${checkInText}</strong>
            ${isCheckedIn && isLate ? '<span class="ag-time-note red">terlambat</span>' : ''}
            ${isCheckedIn && !isLate ? '<span class="ag-time-note green">tepat waktu</span>' : ''}
          </div>
          <div class="ag-time-box ${isCheckedOut ? 'filled' : ''}">
            <span class="ag-time-label">Jam Pulang</span>
            <strong class="ag-time-value">${checkOutText}</strong>
          </div>
        </div>

        <!-- Status pilihan (izin/sakit/dinas/alpa) -->
        ${!isCheckedIn ? `
          <div class="ag-field-row">
            <span class="ag-field-label">Status kehadiran</span>
            <div class="ag-status-pills">
              ${AG_STATUS_LIST.filter(s => !['terlambat'].includes(s.value)).map(s => `
                <button type="button"
                  class="ag-status-btn ${att.status === s.value || (!att.status && s.value === 'hadir') ? 'active' : ''}"
                  data-ag-status="${s.value}">${s.label}</button>`).join('')}
            </div>
          </div>` : ''}

        <!-- Keterangan opsional -->
        ${!isCheckedIn || att.keterangan ? `
          <div class="ag-field-row">
            <span class="ag-field-label">Keterangan <span class="ag-optional">(opsional)</span></span>
            ${!isCheckedIn
              ? `<textarea class="ag-keterangan-input" data-ag-keterangan rows="2" placeholder="Tulis keterangan bila perlu (mis. alasan izin/sakit)">${agEsc(att.keterangan || '')}</textarea>`
              : `<div class="ag-keterangan-wrap">${att.keterangan
                ? `<span class="ag-ket-value">${agEsc(att.keterangan)}</span>`
                : `<span class="ag-ket-empty">Tidak ada keterangan</span>`
              }</div>`
            }
          </div>` : ''}

        <!-- Tombol aksi -->
        <div class="ag-actions">
          ${lockedToday ? `
            <div class="ag-done-chip">&#10003; Presensi guru hari ini sudah tersimpan dan dikunci</div>
            <p class="ag-cutoff-note">Input ulang untuk tanggal yang sama tidak diperbolehkan.</p>` : ''}
          ${!lockedToday && !isCheckedIn ? `
            <button type="button" class="primary-btn" data-attendance-action="checkIn">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:7px"><path d="M4 8.5a2 2 0 0 1 2-2h1.6l1-1.5a1 1 0 0 1 .8-.4h5.2a1 1 0 0 1 .8.4l1 1.5H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.2"/></svg>Check-in &mdash; catat jam masuk sekarang
            </button>
            <p class="ag-cutoff-note">Batas tepat waktu: <strong>${AG_CUTOFF} WIB</strong>. Check-in setelah jam ini otomatis tercatat <em>Terlambat</em>.</p>` : ''}
          ${!lockedToday && isCheckedIn && !isCheckedOut ? `
            <button type="button" class="ghost-btn dark" data-attendance-action="checkOut">
              Check-out &mdash; catat jam pulang
            </button>` : ''}
          ${!lockedToday && isCheckedOut ? `
            <div class="ag-done-chip">&#10003; Presensi hari ini selesai</div>` : ''}
        </div>
      </article>
    </section>

    <!-- === SECTION 2: Rekap cepat === -->
    <section class="section">
      <div class="stat-grid">
        ${statCard('Check-in', checkInText, isLate ? `terlambat ${lateMin} mnt` : 'jam masuk', isLate ? 'orange' : 'green')}
        ${statCard('Check-out', checkOutText, 'jam pulang', 'indigo')}
        ${statCard('Sesi', att.sesi || 'Hari Kerja', 'tipe hari ini', 'gold')}
        ${statCard('Status', isCheckedIn ? (isLate ? 'Terlambat' : 'Tepat Waktu') : 'Menunggu', 'rekap otomatis', isLate ? 'orange' : 'green')}
      </div>
    </section>

    <!-- === SECTION 3: Riwayat presensi === -->
    ${renderTeacherAttendanceRiwayat()}

    <!-- === SECTION 4: Aturan absensi === -->
    <section class="section">
      <article class="ag-rules-card">
        <span class="card-label">Aturan presensi guru</span>
        <ul class="ag-rules-list">
          <li>Batas check-in tepat waktu: <strong>${AG_CUTOFF} WIB</strong></li>
          <li>Masuk setelah ${AG_CUTOFF} &rarr; otomatis <em>Terlambat</em></li>
          <li>Status <em>Alpa</em> tidak dipotong dari gaji; izin dan sakit tidak dipotong</li>
          <li>Status <em>Dinas</em> untuk keperluan luar sekolah resmi</li>
          <li>Check-in hanya bisa dilakukan di hari yang sama</li>
          <li>Keterangan wajib diisi jika status bukan Hadir</li>
        </ul>
      </article>
    </section>
  `;
}

function renderClass() {
  var kelasList = (appState.guruKelasList && appState.guruKelasList.length) ? appState.guruKelasList.slice() : (appState.teacherClass ? [appState.teacherClass] : []);
  // Default kelas terpilih = wali kelas / kelas pertama
  if (!appState.selectedKelas || kelasList.indexOf(appState.selectedKelas) < 0) {
    appState.selectedKelas = appState.teacherClass || kelasList[0] || '';
  }
  var selKelas = appState.selectedKelas;
  // Sinkronkan judul header dengan kelas yang dipilih
  if (selKelas && tabMeta && tabMeta.class) {
    tabMeta.class.title = 'Kelas ' + selKelas;
    tabMeta.class.eyebrow = 'Kelas ' + selKelas;
  }
  // Jumlah siswa per kelas terpilih (dari data Supabase yang sudah di-hydrate)
  var siswaKelas = (typeof getSiswaByKelas === 'function' ? getSiswaByKelas(selKelas) : []) || [];
  var totalSiswa = siswaKelas.length;
  // attendanceDone hanya akurat untuk kelas utama (data hydrate)
  var doneSiswa = (selKelas === appState.teacherClass) ? (appState.attendanceDone || 0) : 0;
  var sisaSiswa = Math.max(0, totalSiswa - doneSiswa);
  var pct = totalSiswa ? Math.round((doneSiswa / totalSiswa) * 100) : 0;
  // Jadwal hari ini khusus kelas terpilih (meta diawali "Kelas <selKelas>")
  var todayJadwal = (typeof getTodaySchedules === 'function' ? getTodaySchedules() : []) || [];
  var jadwalKelas = todayJadwal.filter(function(s){ return String(s.meta || '').indexOf('Kelas ' + selKelas) === 0; });
  // Strip chip pemilih kelas (hanya tampil bila guru mengajar >1 kelas)
  var kelasStripHtml = '';
  if (kelasList.length > 1) {
    kelasStripHtml = '<section class="section section--tight"><div class="kelas-pick-strip">'
      + kelasList.map(function(k){ return '<button type="button" class="kelas-pick-chip' + (k === selKelas ? ' is-active' : '') + '" data-kelas-pick="' + k + '">' + k + '</button>'; }).join('')
      + '</div></section>';
  }
  return `
    ${kelasStripHtml}
    <section class="section">
      <article class="card">
        <div class="progress-row">
          <div>
            <span class="card-label">Kehadiran${selKelas ? ' · ' + selKelas : ''}</span>
            <h3 class="card-title">${totalSiswa ? (doneSiswa + ' siswa sudah aman') : 'Belum ada data siswa'}</h3>
            <p class="card-meta">${totalSiswa ? ('Sisa ' + sisaSiswa + ' siswa perlu dipastikan.') : 'Data siswa akan tampil setelah Supabase terhubung.'}</p>
          </div>
          <div class="progress-ring" style="--value: ${pct}">${pct}%</div>
        </div>
      </article>
    </section>

    <section class="section">
      <div class="class-section-head">
        ${sectionHead('Jadwal kelas hari ini', selKelas || 'Agenda')}
      </div>
      <div class="timeline">
        ${jadwalKelas.length ? jadwalKelas.map(scheduleCard).join('') : premiumEmptyState('Belum ada jadwal', 'Belum ada sesi mengajar untuk ' + (selKelas || 'kelas ini') + ' hari ini.')}
      </div>
    </section>
  `;
}

function renderSchedule() {
  const now = new Date();
  const todayIdx = now.getDay();
  const selectedDay = appState.jadwalSelectedDay !== undefined ? appState.jadwalSelectedDay : todayIdx;
  const daySchedule = getScheduleByDay(selectedDay);
  const isWeekend = selectedDay === 0 || selectedDay === 6;
  const DAYS = [
    { idx:1, label:'Sen' }, { idx:2, label:'Sel' }, { idx:3, label:'Rab' },
    { idx:4, label:'Kam' }, { idx:5, label:'Jum' }
  ];
  const DAY_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const selectedDayName = DAY_NAMES[selectedDay];
  const mapelCount = daySchedule.filter(s => s.status === 'Mapel' || s.status === 'Ujian').length;
  const agendaCount = daySchedule.length;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  function sesiState(sesi, idx) {
    if (selectedDay !== todayIdx) return '';
    const [h, m] = sesi.time.split(':').map(Number);
    const sesiMin = h * 60 + m;
    const nextSesi = daySchedule[idx + 1];
    const nextMin = nextSesi
      ? (() => { const [nh,nm] = nextSesi.time.split(':').map(Number); return nh*60+nm; })()
      : sesiMin + 90;
    if (nowMin >= sesiMin && nowMin < nextMin) return 'is-now';
    if (nowMin >= nextMin) return 'is-done';
    return 'is-upcoming';
  }
  return `
    <section class="section section--tight">
      <div class="dash-metric-strip">
        <article class="dms-card indigo"><strong>${agendaCount || '—'}</strong><span>Agenda</span></article>
        <article class="dms-card blue"><strong>${mapelCount || '—'}</strong><span>Jam mengajar</span></article>
        <article class="dms-card gold"><strong>${selectedDay === todayIdx ? 'Hari ini' : selectedDayName}</strong><span>Tampil</span></article>
        <article class="dms-card green dms-card--kelas">${(function(){
          var ks = (appState.guruKelasList && appState.guruKelasList.length) ? appState.guruKelasList.slice() : (appState.teacherClass ? [appState.teacherClass] : []);
          if (!ks.length) return '<strong>—</strong>';
          var shown = ks.slice(0, 4);
          if (ks.length > 4) { shown = ks.slice(0, 3); shown.push('+' + (ks.length - 3)); }
          return '<div class="dms-kelas-grid">' + shown.map(function(k){ return '<span class="dms-kelas-chip">' + k + '</span>'; }).join('') + '</div>';
        })()}<span>Kelas diajar</span></article>
      </div>
    </section>
    <section class="section section--tight">
      ${sectionHead('Pilih hari', selectedDayName)}
      <div class="jadwal-day-picker">
        ${DAYS.map(d => `
          <button type="button" class="jdp-btn${d.idx === selectedDay ? ' is-active' : ''}${d.idx === todayIdx ? ' is-today' : ''}" data-jadwal-day="${d.idx}">
            <span class="jdp-label">${d.label}</span>
            ${d.idx === todayIdx ? '<span class="jdp-dot"></span>' : ''}
          </button>`).join('')}
      </div>
    </section>
    <section class="section section--tight">
      ${sectionHead('Timeline — ' + selectedDayName, agendaCount + ' sesi')}
      ${isWeekend || agendaCount === 0 ? `
        <article class="jadwal-empty-day">
          <span>🏠</span>
          <p>Tidak ada jadwal mengajar</p>
          <small>${selectedDayName} adalah hari libur.</small>
        </article>` : `
      <div class="jadwal-timeline">
        ${daySchedule.map((sesi, idx) => {
          const state = sesiState(sesi, idx);
          return `
          <article class="jadwal-sesi-card ${state}">
            <div class="jadwal-sesi-time">
              <strong>${sesi.time}</strong>
              ${state === 'is-now' ? '<span class="jsc-live-dot"></span>' : ''}
              <span class="status-pill ${sesi.tone}">${sesi.status}</span>
            </div>
            <div class="jadwal-sesi-body">
              <h3 class="jadwal-sesi-title">${sesi.title}</h3>
              <p class="jadwal-sesi-meta">${sesi.meta}</p>
              ${state !== 'is-done' ? `
              <div class="jadwal-quick-actions">
                <button type="button" class="jq-btn" data-module-route="module:absensi-siswa">✓ Absensi</button>
                <button type="button" class="jq-btn" data-module-route="module:jurnal-guru">✎ Jurnal</button>
                <button type="button" class="jq-btn" data-module-route="module:nilai">↗ Nilai</button>
              </div>` : '<p class="jsc-done-label">Sesi selesai</p>'}
            </div>
          </article>`;
        }).join('')}
      </div>`}
    </section>
  `;
}

function renderMenu() {
  var modules = buildGuruModules();
  return `
    <section class="section">
      <div class="menu-summary">
        <span class="card-label">Role Guru</span>
        <h3 class="menu-summary-title">${modules.length} modul kerja guru</h3>
        <p class="card-meta">Fokus ke presensi, input kelas, perkembangan siswa, komunikasi, dan kesiapan database.</p>
      </div>
    </section>

    <section class="section">
      <div class="guru-menu-grid">
        ${modules.map(guruModuleCard).join('')}
      </div>
    </section>
  `;
}

function renderKeuanganGuruModule(moduleId, detail){
  // Ambil data asli dari localStorage (disinkron desktop → Supabase)
  var keuData = [];
  try {
    var raw = localStorage.getItem('keuanganData');
    if(raw){ var arr = JSON.parse(raw); if(Array.isArray(arr)) keuData = arr; }
  } catch(e){}
  // Hitung statistik
  var masuk=0, keluar=0;
  keuData.forEach(function(t){
    var n = Number(t.nominal||0);
    if(/masuk/i.test(t.jenis||'')) masuk += n;
    else keluar += n;
  });
  var saldo = masuk - keluar;
  var list = keuData.slice(0, 20);
  return `
    <section class="section">
      <article class="module-detail-card">
        <button type="button" class="back-chip" data-action="menu">‹ Menu</button>
        <span class="card-label">Keuangan</span>
        <h3 class="module-detail-title">Keuangan Sekolah</h3>
        <p class="module-detail-copy">SPP, pemasukan, pengeluaran, dan laporan keuangan.</p>
      </article>
    </section>
    <section class="section">
      <div class="module-stat-grid" style="grid-template-columns:1fr 1fr;">
        ${statCard('Pemasukan', 'Rp ' + Number(masuk).toLocaleString('id-ID'), 'Total transaksi masuk', 'green')}
        ${statCard('Pengeluaran', 'Rp ' + Number(keluar).toLocaleString('id-ID'), 'Total transaksi keluar', 'red')}
      </div>
      <div class="module-stat-grid">
        ${statCard('Saldo', 'Rp ' + Number(saldo).toLocaleString('id-ID'), 'Pemasukan - Pengeluaran', saldo >= 0 ? 'green' : 'red')}
      </div>
    </section>
    <section class="section">
      ${sectionHead('Transaksi', list.length ? list.length + ' item' : 'Belum ada')}
      <div class="timeline">
        ${list.length
          ? list.map(function(t){
              var isIn = /masuk/i.test(t.jenis||'');
              return scheduleCard({
                time: t.tanggal || '-',
                title: (t.keterangan || t.jenis || 'Transaksi'),
                meta: (t.kategori||'') + ' · ' + (t.petugas||'Admin') + ' · ' + (isIn ? '+' : '-') + ' Rp' + Number(t.nominal||0).toLocaleString('id-ID'),
                status: t.jenis || 'Masuk',
                tone: isIn ? 'green' : 'red'
              });
            }).join('')
          : premiumEmptyState('Belum ada transaksi', 'Data akan tampil setelah keuangan diinput di desktop atau melalui Supabase.')
        }
      </div>
    </section>
  `;
}

function renderTabunganGuruModule(moduleId, detail){
  // Ambil data asli dari localStorage (disinkron desktop → Supabase)
  var tabData = [];
  try {
    var raw = localStorage.getItem('sdplus_tabungan_v1');
    if(raw){ var arr = JSON.parse(raw); if(Array.isArray(arr)) tabData = arr; }
  } catch(e){}
  var setor=0, tarik=0, siswaUnik={};
  tabData.forEach(function(t){
    var n = Number(t.nominal||0);
    if(/setor|masuk/i.test(t.jenis||'')){ setor += n; }
    else { tarik += n; }
    var key = t.namaSiswa || t.nama || t.siswa_id || '';
    if(key) siswaUnik[key] = true;
  });
  var saldo = setor - tarik;
  var jmlSiswa = Object.keys(siswaUnik).length;
  var list = tabData.slice(0, 20);
  return `
    <section class="section">
      <article class="module-detail-card">
        <button type="button" class="back-chip" data-action="menu">‹ Menu</button>
        <span class="card-label">Keuangan</span>
        <h3 class="module-detail-title">Tabungan Siswa</h3>
        <p class="module-detail-copy">Setoran, penarikan & mutasi tabungan siswa per kelas.</p>
      </article>
    </section>
    ${moduleScanBlock('tabungan')}
    <section class="section">
      <div class="module-stat-grid" style="grid-template-columns:1fr 1fr;">
        ${statCard('Penabung', String(jmlSiswa), 'Jumlah siswa unik', 'blue')}
        ${statCard('Saldo Total', 'Rp ' + Number(saldo).toLocaleString('id-ID'), 'Setor - Tarik', 'green')}
      </div>
      <div class="module-stat-grid" style="grid-template-columns:1fr 1fr;">
        ${statCard('Total Setor', 'Rp ' + Number(setor).toLocaleString('id-ID'), 'Akumulasi setoran', 'green')}
        ${statCard('Total Tarik', 'Rp ' + Number(tarik).toLocaleString('id-ID'), 'Akumulasi penarikan', 'red')}
      </div>
    </section>
    <section class="section">
      ${sectionHead('Mutasi', list.length ? list.length + ' item' : 'Belum ada')}
      <div class="timeline">
        ${list.length
          ? list.map(function(t){
              var isIn = /setor|masuk/i.test(t.jenis||'');
              return scheduleCard({
                time: t.tanggal || t.tgl || '-',
                title: (t.namaSiswa || t.nama || 'Siswa') + ' · ' + (t.kelasSiswa || t.kelas || ''),
                meta: (t.jenis||'Setoran') + ' · Rp' + Number(t.nominal||0).toLocaleString('id-ID') + (t.petugas ? ' · ' + t.petugas : ''),
                status: isIn ? 'Setor' : 'Tarik',
                tone: isIn ? 'green' : 'red'
              });
            }).join('')
          : premiumEmptyState('Belum ada mutasi', 'Data akan tampil setelah tabungan diinput di desktop atau melalui Supabase.')
        }
      </div>
    </section>
  `;
}

function guruModuleDataKey(moduleId) {
  const map = {
    'absensi-siswa': 'absensi',
    'nilai': 'nilai',
    'jurnal-guru': 'jurnal',
    // Jurnal Kelas harus baca key sendiri. Sebelumnya ikut 'jurnal' (jurnal_guru),
    // akibatnya data masuk tabel jurnal_kelas tapi riwayat modul Jurnal Kelas kosong.
    'jurnal-kelas': 'jurnalKelas',
    'catatan-siswa': 'catatan',
    'hafalan': 'hafalan',
    'ibadah': 'ibadah',
    'surat-izin': 'surat',
    'pengumuman': 'pengumuman',
    'mutabaah-quran': 'mutabaahQuran',
    'mutabaah-rumah': 'mutabaahRumah',
    'membaca-quran': 'membaca_quran',
    'keuangan': 'keuangan',
    'tabungan': 'tabungan',
    'karakter': 'karakter',
    'prestasi': 'prestasi',
    'ekstrakurikuler': 'ekskul',
    'pelanggaran': 'pelanggaran',
    'kalender-akademik': 'kalender'
  };
  return map[moduleId] || '';
}

const READONLY_GURU_MODULES = { 'mutabaah-rumah': true, 'mutabaah-quran': true };
function renderSupabaseGuruDataModule(detail, rows, moduleId) {
  const helper = window.ZymataMobileSupabase;
  // Modul nilai: gunakan jenis input yang dipilih (nilai / ulangan-harian / ujian-semester)
  var _nilaiJenis = (moduleId === 'nilai') ? (appState.nilaiInputJenis || 'ulangan-harian') : null;
  // Filter list berdasarkan tipe yang dipilih (agar riwayat juga terpisah per tipe)
  const list = (function(){
    var _r = Array.isArray(rows) ? rows : [];
    if (_nilaiJenis) _r = _r.filter(function(r){ return (r.__tipe || 'nilai') === _nilaiJenis; });
    // Pengaman kelas: buang baris dari kelas yang TIDAK diajar guru (cegah riwayat tampil beda kelas).
    _r = _r.filter(function(r){
      if (!r) return false;
      var k = String(r.kelas || r.kelas_id || r.snapshot_kelas || r.rombel || '').trim();
      return !k || agIsTaughtClass(k);
    });
    return _r;
  })();
  const crudKey = _nilaiJenis ? ('guru:' + _nilaiJenis) : ('guru:' + moduleId);
  const headerHtml = `
    <section class="section">
      <article class="module-detail-card">
        <button type="button" class="back-chip" data-action="menu">‹ Menu</button>
        <span class="card-label">${detail.eyebrow || 'Supabase'}</span>
        <h3 class="module-detail-title">${detail.title || 'Data Supabase'}</h3>
        <p class="module-detail-copy">${list.length ? (list.length + ' data terbaca dari Supabase.') : 'Belum ada data di Supabase untuk modul ini.'}</p>
      </article>
    </section>`;
  // Picker tipe input khusus modul nilai
  var nilaiPickerHtml = '';
  if (moduleId === 'nilai') {
    var _nilaiTypes = [
      {key:'ulangan-harian',label:'Ulangan Harian'},
      {key:'ujian-semester',label:'Ujian Semester'}
    ];
    nilaiPickerHtml = '<section class="section section--tight"><div class="kelas-pick-strip">'
      + _nilaiTypes.map(function(t){
          return '<button type="button" class="kelas-pick-chip' + ((_nilaiJenis === t.key) ? ' is-active' : '') + '" data-nilai-jenis="' + t.key + '">' + t.label + '</button>';
        }).join('')
      + '</div></section>';
  }
  const formHtml = READONLY_GURU_MODULES[moduleId]
    ? (moduleId === 'mutabaah-quran'
        ? '<section class="section"><article class="input-panel"><span class="card-label">Data dari wali (baca saja)</span><p class="module-detail-copy">Laporan tilawah &amp; murojaah rumah diisi wali murid. Guru memeriksa lalu mengisi <b>Ziyadah/Setoran Sekolah</b>, <b>Status Setoran</b>, dan <b>Catatan Guru</b> pada tiap laporan di bawah.</p></article></section>'
        : '<section class="section"><article class="input-panel"><span class="card-label">Data dari wali (baca saja)</span><p class="module-detail-copy">Laporan mutabaah rumah diisi wali murid di rumah. Guru memeriksa lalu memberi <b>Problem/Kendala</b> dan <b>Konfirmasi Wali</b> pada tiap laporan di bawah.</p></article></section>')
    : (nilaiPickerHtml + renderModuleForm(moduleId, crudKey));
  let listHtml;
  if (moduleId === 'kalender-akademik') {
    listHtml = `
    <section class="section">
      <div class="timeline">
        ${list.length
          ? list.slice(0, 30).map(row => {
              const item = helper && helper.normalizeItem ? helper.normalizeItem(row, detail.title) : { time:'Data', title: detail.title, meta:'Supabase', status:'Aktif', tone:'blue' };
              const actions = row.__mobileCrud && row.id ? `<div class="field-chip-row"><button type="button" class="field-chip" data-mobile-crud-update="${row.id}" data-mobile-crud-key="${crudKey}">Tandai selesai</button><button type="button" class="field-chip" data-mobile-crud-delete="${row.id}" data-mobile-crud-key="${crudKey}">Hapus</button></div>` : '';
              return scheduleCard(item) + actions;
            }).join('')
          : premiumEmptyState('Belum ada data', 'Data real akan tampil otomatis setelah tabel Supabase berisi data terkait akun ini.')}
      </div>
    </section>`;
  } else if (moduleId === 'mutabaah-rumah') {
    listHtml = renderMutabaahRumahPenilaian(list, detail, crudKey);
  } else if (moduleId === 'mutabaah-quran') {
    listHtml = renderMutabaahQuranPenilaian(list, detail, crudKey);
  } else {
    listHtml = renderModuleRiwayat(moduleId, list, detail, crudKey);
  }
  return headerHtml + formHtml + listHtml;
}

function renderModulePlaceholder(moduleId) {
  const detail = modulePlaceholders[moduleId];
  if (!detail) return renderMenu();
  const dataKey = guruModuleDataKey(moduleId);
  if (appState.syncMode === 'supabase-live' && moduleId === 'absensi-siswa') return renderStudentAttendanceModule(detail);
  if (appState.syncMode === 'supabase-live' && dataKey) return renderSupabaseGuruDataModule(detail, appState.supabaseModules && appState.supabaseModules[dataKey], moduleId);
  if (appState.syncMode === 'supabase-empty') return renderSupabaseEmptyGuruModule(detail, 'Data modul akan tampil setelah akun guru terhubung ke Supabase.');
  if (moduleId === 'absensi-siswa') return renderStudentAttendanceModule(detail);
  if (moduleId === 'nilai') return renderScoreModule(detail);
  if (moduleId === 'jurnal-guru' || moduleId === 'jurnal-kelas') return renderJournalModule(moduleId, detail);
  if (moduleId === 'surat-izin') return renderLetterPermissionModule(detail);
  if (moduleId === 'hafalan') return renderHafalanModule(detail);
  if (moduleId === 'membaca-quran') return renderMembacaQuranModule(detail);
  if (moduleId === 'ibadah') return renderIbadahModule(detail);
  if (moduleId === 'karakter') return renderKarakterModule(detail);
  if (moduleId === 'prestasi') return renderPrestasiModule(detail);
  if (moduleId === 'pelanggaran') return renderPelanggaranModule(detail);
  if (moduleId === 'ekstrakurikuler') return renderEkstrakulikulerModule(detail);
  if (moduleId === 'kalender-akademik') return renderKalenderAkademikModule(detail);
  if (moduleId === 'catatan-siswa') return renderCatatanSiswaModule(detail);
  if (moduleId === 'pengumuman') return renderPengumumanGuruModule(detail);
  if (moduleId === 'mutabaah-quran') return renderMutabaahQuranGuruModule(detail);
  if (moduleId === 'mutabaah-rumah') return renderMutabaahRumahGuruModule(detail);
  if (moduleId === 'keuangan') return renderKeuanganGuruModule(moduleId, detail);
  if (moduleId === 'tabungan') return renderTabunganGuruModule(moduleId, detail);
  return `
    <section class="section">
      <article class="module-detail-card">
        <button type="button" class="back-chip" data-action="menu">‹ Menu</button>
        <span class="card-label">${detail.eyebrow}</span>
        <h3 class="module-detail-title">${detail.title}</h3>
        <p class="module-detail-copy">${detail.subtitle}</p>
        <div class="module-stat-grid">
          ${detail.stats.map(([label, value]) => statCard(label, value, 'ringkasan modul', label === 'KKM' ? 'gold' : 'indigo')).join('')}
        </div>
      </article>
    </section>

    <section class="section">
      ${sectionHead('Fokus modul', 'Draft')}
      <div class="timeline">
        ${detail.focus.map((item, index) => scheduleCard({
          time: `0${index + 1}`,
          title: item,
          meta: 'Placeholder mobile - siap disambungkan ke Supabase',
          status: index === 0 ? 'Prioritas' : 'Antrian',
          tone: index === 0 ? 'gold' : 'blue'
        })).join('')}
      </div>
    </section>
  `;
}

function renderSupabaseEmptyGuruModule(detail, message) {
  return `
    <section class="section">
      <article class="module-detail-card">
        <button type="button" class="back-chip" data-action="menu">‹ Menu</button>
        <span class="card-label">${detail.eyebrow || 'Modul'}</span>
        <h3 class="module-detail-title">${detail.title || 'Belum ada data'}</h3>
        <p class="module-detail-copy">${message}</p>
      </article>
    </section>
    <section class="section">
      ${premiumEmptyState('Belum ada data', 'Data real akan dimuat dari Supabase setelah login dan relasi akun aktif.')}
    </section>
  `;
}

function renderStudentAttendanceModule(detail) {
  const as = getAbsenSiswaState();
  const siswaDiKelas = getSiswaByKelas(as.kelas);
  const statusMap = appState.absenSiswaStatus || {};
  const todayMap = getTodayAbsensiMap(as.kelas);
  const combinedStatusMap = Object.assign({}, statusMap);
  Object.keys(todayMap).forEach(function(nis){ combinedStatusMap[nis] = todayStatusToCode(todayMap[nis].status); });
  const filled = siswaDiKelas.filter(s => combinedStatusMap[s.nis]).length;
  const hadir = siswaDiKelas.filter(s => combinedStatusMap[s.nis] === 'H').length;
  const izinSakit = siswaDiKelas.filter(s => ['I','S'].includes(combinedStatusMap[s.nis])).length;
  const alpa = siswaDiKelas.filter(s => combinedStatusMap[s.nis] === 'A').length;
  const alreadyToday = Object.keys(todayMap).length;
  const isCompleteToday = siswaDiKelas.length > 0 && alreadyToday >= siswaDiKelas.length;
  return `
    ${moduleIntro(detail)}

    <section class="section section--tight">
      <article class="module-summary premium">
        <div>
          <span class="module-summary-kicker">Absensi Kelas ${as.kelas}</span>
          <h3>${filled}/${siswaDiKelas.length || 0} siswa tercatat</h3>
          <p>${alreadyToday ? ('Hari ini sudah tersimpan ' + alreadyToday + ' siswa &middot; ') : ''}Hadir ${hadir} &middot; Izin/Sakit ${izinSakit} &middot; Alpa ${alpa}</p>
          ${isCompleteToday ? '<p class="absen-locked-note">✓ Absensi kelas ini sudah lengkap hari ini. Input ulang dikunci.</p>' : ''}
        </div>
        <div class="summary-ring" style="--pct:${siswaDiKelas.length ? Math.round((filled/siswaDiKelas.length)*100) : 0}%">
          <span>${siswaDiKelas.length ? Math.round((filled/siswaDiKelas.length)*100) : 0}%</span>
        </div>
      </article>
    </section>

    <section class="section">
      <article class="input-panel premium-panel">
        <span class="card-label">Alur input absensi</span>
        ${studentAttendanceFlowBody()}
      </article>
    </section>

    <section class="section">
      <details class="riwayat-absen-toggle" data-riwayat-toggle ${appState.riwayatAbsenOpen ? 'open' : ''}>
        <summary class="riwayat-absen-summary">
          <span class="riwayat-absen-title">&#128197; Riwayat Absen</span>
          <span class="riwayat-absen-hint">Lihat detail per tanggal &rsaquo;</span>
        </summary>
        <div class="riwayat-absen-body">
          ${renderRiwayatAbsenBody(as.kelas)}
        </div>
      </details>
    </section>

    <div class="absen-bottom-spacer"></div>
    ${(function(){ appState._absenDock = { kelas: as.kelas, filled: filled, total: (siswaDiKelas.length||0), locked: isCompleteToday, savedToday: alreadyToday }; return ''; })()}
  `;
}

function getTodayAbsensiMap(kelas) {
  var all = (appState.supabaseModules && appState.supabaseModules.absensi) ? appState.supabaseModules.absensi : [];
  var today = agTodayISO();
  var map = {};
  (Array.isArray(all) ? all : []).forEach(function(r){
    if (!r) return;
    var tg = absensiRowDate(r);
    var rk = String(r.kelas || r.kelas_id || '').trim();
    var nis = String(r.siswa_id || r.nis || r.nis_siswa || r.siswa_nis || '').trim();
    if (tg === today && nis && (!kelas || rk === kelas)) map[nis] = r;
  });
  return map;
}

function todayStatusToCode(status) {
  var st = String(status || '').trim().toLowerCase();
  if (st === 'h' || st === 'hadir') return 'H';
  if (st === 'i' || st === 'izin') return 'I';
  if (st === 's' || st === 'sakit') return 'S';
  if (st === 'a' || st === 'alpa' || st === 'alpha') return 'A';
  return st ? st.charAt(0).toUpperCase() : '';
}

function updateAbsenStatusWithoutFullRender(nis) {
  // FIX anti-kedip Absensi Siswa: jangan render ulang 1 halaman saat klik H/I/S/A.
  // Cukup ganti 1 baris siswa + dock simpan agar layar tidak flash/kedip.
  try {
    var as = getAbsenSiswaState();
    var siswaKelas = getSiswaByKelas(as.kelas) || [];
    var student = siswaKelas.find(function(s){ return String(s.nis) === String(nis); });
    if (student) {
      var btn = document.querySelector('[data-absen-nis="' + String(nis).replace(/"/g, '\"') + '"]');
      var row = btn && btn.closest ? btn.closest('.premium-att-row') : null;
      if (row) row.outerHTML = premiumAttendanceRow(student, (appState.absenSiswaStatus || {})[student.nis]);
    }
    var statusMap = appState.absenSiswaStatus || {};
    var todayMap = getTodayAbsensiMap(as.kelas);
    var combined = Object.assign({}, statusMap);
    Object.keys(todayMap).forEach(function(k){ combined[k] = todayStatusToCode(todayMap[k].status); });
    var filled = siswaKelas.filter(function(s){ return combined[s.nis]; }).length;
    var total = siswaKelas.length || 0;
    var alreadyToday = Object.keys(todayMap).length;
    var isCompleteToday = total > 0 && alreadyToday >= total;
    appState._absenDock = { kelas: as.kelas, filled: filled, total: total, locked: isCompleteToday, savedToday: alreadyToday };
    renderFloating();

    // Update ringkasan angka tanpa rebuild halaman.
    var summary = document.querySelector('.module-summary.premium');
    if (summary) {
      var h3 = summary.querySelector('h3');
      var p = summary.querySelector('p');
      var hadir = siswaKelas.filter(function(s){ return combined[s.nis] === 'H'; }).length;
      var izinSakit = siswaKelas.filter(function(s){ return ['I','S'].indexOf(combined[s.nis]) >= 0; }).length;
      var alpa = siswaKelas.filter(function(s){ return combined[s.nis] === 'A'; }).length;
      if (h3) h3.textContent = filled + '/' + total + ' siswa tercatat';
      if (p) p.innerHTML = (alreadyToday ? ('Hari ini sudah tersimpan ' + alreadyToday + ' siswa · ') : '') + 'Hadir ' + hadir + ' · Izin/Sakit ' + izinSakit + ' · Alpa ' + alpa;
      var ring = summary.querySelector('.summary-ring');
      var pct = total ? Math.round((filled / total) * 100) : 0;
      if (ring) { ring.style.setProperty('--pct', pct + '%'); var sp = ring.querySelector('span'); if (sp) sp.textContent = pct + '%'; }
    }
  } catch (e) {
    console.warn('[Absensi] update ringan gagal, fallback render:', e && e.message ? e.message : e);
    render();
  }
}

const MAPEL_LIST = ['Matematika','Bahasa Indonesia','IPA','IPS','PKn','PAI','PJOK','SBdP','Fiqih','Quran Hadits','Akidah Akhlak','SKI','Bahasa Arab'];
const NILAI_JENIS = ['Ulangan Harian','PTS','PAS','Tugas','Praktik'];
const NILAI_SEMESTER = ['Ganjil','Genap'];

// ─���─ UI helpers ──────────────��───────────────────────���────────────────���─────
// Dropdown native bergaya mobile - untuk list panjang (mapel, kategori, dll)
function selectField(label, value, options, dataAttr, hint) {
  return `
    <div class="mf-field">
      <label class="mf-label">${label}${hint ? ` <span class="mf-hint">${hint}</span>` : ''}</label>
      <div class="mf-select-wrap">
        <select class="mf-select" data-select="${dataAttr}">
          ${options.map(o => `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`).join('')}
        </select>
        <span class="mf-chevron">&#8250;</span>
      </div>
    </div>`;
}

// Chip group kecil - untuk ≤ 5 pilihan pendek
function chipGroup(options, active, dataAttr, full) {
  return `<div class="chip-group ${full ? 'full' : ''}">
    ${options.map(o => `<button type="button" class="chip ${o === active ? 'on' : ''}" data-${dataAttr}="${o}">${o}</button>`).join('')}
  </div>`;
}

// Textarea bergaya mobile (preview klik)
function textareaField(label, placeholder, dataAttr, hint) {
  return `
    <div class="mf-field">
      <label class="mf-label">${label}${hint ? ` <span class="mf-hint">${hint}</span>` : ''}</label>
      <div class="mf-textarea" data-textarea="${dataAttr}">${placeholder}</div>
    </div>`;
}

// Row label + nilai info
function contextPill(items) {
  return `<div class="ctx-strip">${items.map(([k,v])=>`<span><span class="ctx-key">${k}</span> <strong>${v}</strong></span>`).join('')}</div>`;
}

function premiumEmptyState(title, text, action) {
  return `
    <article class="premium-empty-state">
      <span class="empty-orb">&#128218;</span>
      <h3>${title}</h3>
      <p>${text}</p>
      ${action ? `<span class="empty-action-chip">${action}</span>` : ''}
    </article>`;
}

function stickyActionBar(label, meta, attr, extraClass) {
  return `
    <div class="sticky-action-bar ${extraClass || ''}">
      <div>
        <strong>${label}</strong>
        <span>${meta}</span>
      </div>
      <button type="button" class="sticky-save-btn" ${attr || 'data-draft-save'}>${label.includes('Simpan') ? 'Simpan' : 'Lanjut'}</button>
    </div>`;
}

function premiumAttendanceRow(student, activeStatus) {
  const labels = { H:'Hadir', I:'Izin', S:'Sakit', A:'Alpa' };
  const as = getAbsenSiswaState();
  const todayMap = getTodayAbsensiMap(as.kelas);
  const savedToday = todayMap[String(student.nis)] || null;
  const finalStatus = savedToday ? todayStatusToCode(savedToday.status) : activeStatus;
  return `
    <article class="premium-att-row ${finalStatus ? 'is-filled' : ''} ${savedToday ? 'is-saved-today' : ''}">
      <div class="pa-student">
        <span class="sp-avatar">${initalsOf(student.name)}</span>
        <div>
          <strong>${student.name}</strong>
          <small>NIS ${student.nis}${finalStatus ? ' &middot; '+(labels[finalStatus] || finalStatus) : ''}${savedToday ? ' &middot; sudah diabsen hari ini' : ''}</small>
        </div>
      </div>
      <div class="pa-status-group">
        ${['H','I','S','A'].map(st => `
          <button type="button" class="absen-chip ${st.toLowerCase()} ${finalStatus===st?'active':''}" data-absen-status="${st}" data-absen-nis="${student.nis}" ${savedToday ? 'disabled aria-disabled="true" title="Sudah diabsen hari ini"' : ''} aria-label="${labels[st]} ${student.name}">${st}</button>`).join('')}
      </div>
      ${savedToday ? '<span class="absen-saved-badge">✓ Sudah absen hari ini</span>' : ''}
    </article>`;
}

function getNilaiState() {
  return appState.nilaiFilter || (appState.nilaiFilter = { mapel: 'Fiqih', jenis: 'Ulangan Harian', semester: 'Ganjil', kkm: 70 });
}

function moduleScanBlock(moduleId){
  var sel = (appState.moduleScanStudent && appState.moduleScanStudent[moduleId]) || null;
  return `
    <section class="section section--tight" data-module-scan-wrap="${moduleId}">
      <button type="button" data-module-scan="${moduleId}" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#00ffdb,#34e8cf);color:#06231f;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 6px 16px rgba(0,255,219,.28)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06231f" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px;margin-right:2px"><path d="M4 8.5a2 2 0 0 1 2-2h1.6l1-1.5a1 1 0 0 1 .8-.4h5.2a1 1 0 0 1 .8.4l1 1.5H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.2"/></svg>Scan QR / Barcode Siswa
      </button>
      ${sel ? `
      <article style="display:flex;align-items:center;gap:12px;margin-top:10px;padding:12px 14px;border-radius:14px;background:#131a2b;border:1px solid #e0e7ff">
        <span style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:#00ffdb;color:#fff;font-weight:700;flex:0 0 auto">${initalsOf(sel.name)}</span>
        <div style="flex:1;line-height:1.3">
          <strong style="display:block;font-size:14px;color:#fcfcfc">${sel.name}</strong>
          <small style="font-size:12px;color:#9a9a92">NIS ${sel.nis} &middot; Kelas ${sel.kelas} &middot; via scan QR</small>
        </div>
        <button type="button" data-module-scan-clear="${moduleId}" style="border:none;background:transparent;color:#8a8a82;font-size:22px;line-height:1;cursor:pointer;padding:0 4px" aria-label="Hapus pilihan">&times;</button>
      </article>` : ''}
    </section>`;
}

function renderScoreModule(detail) {
  const f = getNilaiState();
  const nilaiRows = [];
  const filled   = nilaiRows.filter(r => r.nilai !== null).length;
  const empty    = nilaiRows.length - filled;
  const remedial = nilaiRows.filter(r => r.nilai !== null && r.nilai < f.kkm).length;
  const avg      = filled ? Math.round(nilaiRows.filter(r=>r.nilai!==null).reduce((s,r)=>s+r.nilai,0)/filled) : 0;

  return `
    ${moduleIntro(detail)}
    ${moduleScanBlock('nilai')}

    <!-- Filter konteks -->
    <section class="section">
      <article class="mf-card">
        <span class="card-label">Filter nilai</span>
        <div class="mf-grid">
          <!-- MAPEL_LIST -->
          ${selectField('Mata Pelajaran', f.mapel, MAPEL_LIST, 'nf-mapel')}
          ${selectField('Jenis Penilaian', f.jenis, NILAI_JENIS, 'nf-jenis')}
        </div>
        <div class="mf-row-inline">
          <span class="mf-label">Semester</span>
          ${chipGroup(NILAI_SEMESTER, f.semester, 'nf-semester')}
        </div>
        ${contextPill([['Kelas','5A'],['KKM',f.kkm],['Mapel',f.mapel],['Jenis',f.jenis]])}
      </article>
    </section>

    <!-- Stat ringkasan -->
    <section class="section">
      <div class="stat-grid">
        ${statCard('Terisi', filled, 'dari '+nilaiRows.length+' siswa', 'indigo')}
        ${statCard('Kosong', empty, 'belum diisi', 'gold')}
        ${statCard('Rata-rata', avg||'--', 'nilai kelas', 'green')}
        ${statCard('Di bawah KKM', remedial, 'perlu remedial', 'red')}
      </div>
    </section>

    <!-- Daftar input nilai per siswa -->
    <section class="section">
      ${sectionHead('Input nilai siswa', 'Simpan Draft')}
      <div class="nilai-list">
        ${nilaiRows.map(row => `
          <article class="nilai-row-card">
            <div class="nilai-student-info">
              <span class="student-avatar">${row.name.split(' ').map(p=>p[0]).slice(0,2).join('')}</span>
              <div>
                <strong class="student-name">${row.name}</strong>
                <small class="student-meta">NIS ${row.nis}</small>
              </div>
            </div>
            <div class="nilai-input-side">
              <div class="nilai-box ${row.nilai===null?'empty':row.nilai<f.kkm?'remedial':'ok'}">
                ${row.nilai !== null ? row.nilai : '--'}
              </div>
              <span class="nilai-status-badge ${row.status==='Aman'?'green':row.status==='Remedial'?'red':'gold'}">
                ${row.status}
              </span>
            </div>
          </article>`).join('')}
      </div>
    </section>

    <!-- Tombol simpan -->
    <section class="section">
      <button type="button" class="save-draft-btn" data-draft-save>Simpan Draft Nilai</button>
    </section>

    ${databaseDraftPanel('nilai_siswa', ['siswa_id','kelas_id','mapel_id','jenis_penilaian','semester','nilai_akhir','kkm'])}
  `;
}

const JAM_KE_LIST = ['1-2','3-4','5-6','7-8'];
const METODE_LIST = ['Diskusi','Ceramah','Praktik','Demonstrasi','Tanya Jawab','Penugasan'];
const JKELAS_STATUS = ['Draft','Disetor','Diverifikasi'];

function getJurnalGuruState() {
  return appState.jurnalGuruForm || (appState.jurnalGuruForm = {
    kelas: '5A', mapel: 'Fiqih', jamKe: '1-2', metode: 'Diskusi',
    materi: '', kegiatan: '', kendala: '', tindakLanjut: '', saved: false,
    pdfFiles: []
  });
}
function getJurnalKelasState() {
  return appState.jurnalKelasForm || (appState.jurnalKelasForm = {
    kelas: '5A', mapel: 'Fiqih', jamKe: '1-2', status: 'Draft', materi: '', saved: false
  });
}

function renderJournalModule(moduleId, detail) {
  const isKelas = moduleId === 'jurnal-kelas';
  const today   = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  if (isKelas) {
    const f = getJurnalKelasState();
    const draftItems = [];
    return `
      ${moduleIntro(detail)}
      <section class="section">
        <article class="mf-card">
          <span class="card-label">Form Jurnal Kelas</span>
          <div class="jf-date-strip">${today}</div>

          ${selectField('Mata Pelajaran', f.mapel, MAPEL_LIST, 'jk-mapel')}

          <div class="mf-row-inline">
            <span class="mf-label">Jam Ke</span>
            ${chipGroup(JAM_KE_LIST, f.jamKe, 'jk-jam')}
          </div>

          <div class="mf-row-inline">
            <span class="mf-label">Status</span>
            ${chipGroup(JKELAS_STATUS, f.status, 'jk-status')}
          </div>

          ${textareaField('Ringkasan Materi', f.materi || 'Ketuk untuk mengisi ringkasan materi yang diajarkan di kelas...', 'jk-materi')}

          <div class="jf-upload-strip">
            <span class="jf-upload-icon">&#128196;</span>
            <div>
              <strong>Upload PDF Jurnal Kelas</strong>
              <small>Guru setor jurnal kelas dalam bentuk PDF. Tersimpan lokal dulu, upload ke Supabase Storage saat database aktif.</small>
            </div>
            <span class="status-pill ${f.status==='Disetor'?'green':'gold'}">${f.status}</span>
          </div>

          <button type="button" class="save-draft-btn" data-draft-save>Simpan &amp; Setor Jurnal Kelas</button>
        </article>
      </section>

      <section class="section">
        ${sectionHead('Riwayat jurnal kelas', 'Semua')}
        <div class="timeline">${draftItems.map(scheduleCard).join('')}</div>
      </section>
      ${databaseDraftPanel('jurnal_kelas',['tanggal','kelas_id','mapel_id','jam_ke','status','materi'])}
    `;
  }

  // Jurnal Guru
  const f = getJurnalGuruState();
  const draftItems = [];
  return `
    ${moduleIntro(detail)}
    <section class="section">
      <article class="mf-card">
        <span class="card-label">Form Jurnal Guru</span>
        <div class="jf-date-strip">${today}</div>

        ${selectField('Mata Pelajaran', f.mapel, MAPEL_LIST, 'jg-mapel')}

        <div class="mf-row-inline">
          <span class="mf-label">Jam Ke</span>
          ${chipGroup(JAM_KE_LIST, f.jamKe, 'jg-jam')}
        </div>

        ${selectField('Metode Mengajar', f.metode, METODE_LIST, 'jg-metode')}

        ${textareaField('Materi yang diajarkan', f.materi || 'Ketuk untuk mengisi materi pokok yang diajarkan...', 'jg-materi')}

        ${textareaField('Kegiatan / Tugas / Kendala', f.kegiatan || 'Kegiatan pembelajaran, tugas yang diberikan, kendala yang ditemui...', 'jg-kegiatan')}

        ${textareaField('Tindak Lanjut', f.tindakLanjut || 'Tindak lanjut untuk pertemuan berikutnya atau pembinaan siswa...', 'jg-tindak')}

        <div class="jf-upload-strip">
          <span class="jf-upload-icon">&#128196;</span>
          <div>
            <strong>Upload PDF Jurnal Guru</strong>
            <small>Pilih file PDF sebagai lampiran bukti mengajar. Tersimpan lokal, sinkron ke Supabase Storage saat database aktif.</small>
          </div>
        </div>

        <div class="jf-pdf-input-area">
          <label class="jf-pdf-pick-btn" for="jg-pdf-input">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Pilih File PDF</span>
          </label>
          <input type="file" id="jg-pdf-input" accept="application/pdf" multiple hidden data-jg-pdf-input />
          <small class="jf-pdf-hint">Format PDF saja \u2022 Maks 5MB per file</small>
        </div>

        <div class="jf-pdf-list" data-jg-pdf-list>
          ${(f.pdfFiles || []).map((file, idx) => `
            <div class="jf-pdf-item">
              <div class="jf-pdf-item-icon">&#128196;</div>
              <div class="jf-pdf-item-info">
                <strong>${file.name}</strong>
                <small>${(file.size / 1024).toFixed(0)} KB</small>
              </div>
              <button type="button" class="jf-pdf-item-remove" data-jg-pdf-remove="${idx}" aria-label="Hapus file">&times;</button>
            </div>
          `).join('')}
        </div>

        <div class="jf-actions">
          <button type="button" class="save-draft-btn" data-draft-save>Simpan Draft</button>
          <button type="button" class="ghost-btn dark">Kirim Jurnal</button>
        </div>
      </article>
    </section>

    <section class="section">
      ${sectionHead('Draft jurnal guru', '3 item')}
      <div class="timeline">${draftItems.map(scheduleCard).join('')}</div>
    </section>
    ${databaseDraftPanel('jurnal_guru',['tanggal','guru_id','kelas_id','mapel_id','jam_ke','metode','materi','kegiatan','tindak_lanjut'])}
  `;
}

function renderLetterPermissionModule(detail) {
  const permissionItems = [];
  return `
    ${moduleIntro(detail)}
    ${moduleScanBlock('surat-izin')}
    <section class="section">
      <article class="input-panel">
        <span class="card-label">Kategori Surat/Izin</span>
        <div class="segmented-row three">
          <button type="button" class="segment active">Izin Siswa</button>
          <button type="button" class="segment">Surat Sekolah</button>
          <button type="button" class="segment">Persetujuan</button>
        </div>
      </article>
    </section>
    <section class="section">
      ${sectionHead('Antrian surat & izin', 'Review')}
      <div class="timeline">
        ${permissionItems.map((item) => scheduleCard({ time: item.type, title: item.title, meta: item.meta, status: item.status, tone: item.tone })).join('')}
      </div>
    </section>
    ${databaseDraftPanel('surat', ['jenis', 'siswa_id', 'kelas_id', 'status', 'catatan_wali_kelas'])}
  `;
}

function renderHafalanModule(detail) {
  const hafalanStudents = [];
  return `
    ${moduleIntro(detail)}
    ${moduleScanBlock('hafalan')}
    ${developmentInputFlow('hafalan', {
      label: 'Form input hafalan',
      aspect: 'Surah / Juz',
      score: 'Nilai kelancaran 1-100',
      note: 'Surah, ayat, juz, dan nilai',
      status: 'Setoran / Murojaah / Perlu cek',
      followUp: 'Target setoran berikutnya'
    })}
    <section class="section">
      <article class="input-panel">
        <span class="card-label">Mode Hafalan</span>
        <div class="segmented-row three">
          <button type="button" class="segment active">Setoran</button>
          <button type="button" class="segment">Murojaah</button>
          <button type="button" class="segment">Rekap</button>
        </div>
      </article>
    </section>
    <section class="section">
      ${sectionHead('Daftar siswa hafalan', 'Cek semua')}
      <div class="timeline">
        ${hafalanStudents.map(studentCard).join('')}
      </div>
    </section>
    <section class="section">
      <div class="stat-grid">
        ${statCard('Setoran', '8', 'minggu ini', 'indigo')}
        ${statCard('Murojaah', '3', 'perlu ditinjau', 'gold')}
      </div>
    </section>
    ${databaseDraftPanel('hafalan', ['siswa_id','surah','ayat_dari','ayat_ke','juz','nilai','catatan'])}
  `;
}

function renderMembacaQuranModule(detail) {
  const siswa = [];
  return `
    ${moduleIntro(detail)}
    ${moduleScanBlock('membaca-quran')}
    ${developmentInputFlow('membaca-quran', {
      label: 'Form input membaca Al-Quran',
      aspect: 'Surah / Juz',
      score: 'Nilai A/B/C',
      note: 'Surah, juz, dan nilai',
      status: 'Lancar / Terbaca / Perlu bimbingan',
      followUp: 'Target surah berikutnya'
    })}
    <section class="section">
      ${sectionHead('Daftar siswa membaca Al-Quran', 'Cek semua')}
      <div class="timeline">
        ${siswa.map(studentCard).join('')}
      </div>
    </section>
    <section class="section">
      <div class="stat-grid">
        ${statCard('Total', '3', 'catatan', 'indigo')}
        ${statCard('Nilai A', '1', 'Mumtaz', 'green')}
      </div>
    </section>
    ${databaseDraftPanel('membaca_quran', ['siswa_id','surat','juz','nilai'])}
  `;
}

function renderIbadahModule(detail) {
  const ibadahItems = [];
  return `
    ${moduleIntro(detail)}
    ${moduleScanBlock('ibadah')}
    ${developmentInputFlow('ibadah', {
      label: 'Form input ibadah',
      aspect: 'Shalat / Puasa / Sedekah',
      score: 'Poin kebiasaan 1-5',
      note: 'Catatan kebiasaan dan penguatan',
      status: 'Lengkap / Pantau / Kosong',
      followUp: 'Pengingat atau pembinaan ringan'
    })}
    <section class="section">
      <article class="input-panel">
        <span class="card-label">Ringkasan Ibadah</span>
        <div class="stat-grid">
          ${statCard('Lengkap', '21', 'catatan siap direkap', 'indigo')}
          ${statCard('Kosong', '7', 'perlu input lanjutan', 'gold')}
        </div>
      </article>
    </section>
    <section class="section">
      ${sectionHead('Catatan ibadah siswa', 'Review')}
      <div class="timeline">
        ${ibadahItems.map(scheduleCard).join('')}
      </div>
    </section>
    ${databaseDraftPanel('ibadah', ['siswa_id', 'tanggal', 'shalat_5waktu', 'puasa_sunnah', 'sedekah', 'catatan'])}
  `;
}

function renderKarakterModule(detail) {
  const karakterAspects = [];
  const priorityStudents = [];
  return `
    ${moduleIntro(detail)}
    ${moduleScanBlock('karakter')}
    ${developmentInputFlow('karakter', {
      label: 'Form input karakter',
      aspect: 'Disiplin / Kejujuran / Tanggung jawab',
      score: 'Nilai karakter 1-5',
      note: 'Observasi singkat guru',
      status: 'Aman / Pantau / Prioritas',
      followUp: 'Tindak lanjut wali kelas'
    })}
    <section class="section">
      ${sectionHead('Aspek karakter', 'Rekap')}
      <div class="timeline">
        ${karakterAspects.map(scheduleCard).join('')}
      </div>
    </section>
    <section class="section">
      ${sectionHead('Siswa prioritas pantau', '2 siswa')}
      <div class="timeline">
        ${priorityStudents.map(scheduleCard).join('')}
      </div>
    </section>
    ${databaseDraftPanel('karakter', ['siswa_id', 'aspek', 'nilai', 'catatan'])}
  `;
}

function renderPrestasiModule(detail) {
  const prestasiItems = [];
  return `
    ${moduleIntro(detail)}
    ${moduleScanBlock('prestasi')}
    ${developmentInputFlow('prestasi', {
      label: 'Form input prestasi',
      aspect: 'Akademik / Non-akademik',
      score: 'Tingkat prestasi',
      note: 'Deskripsi prestasi dan bukti',
      status: 'Draft / Validasi / Selesai',
      followUp: 'Upload sertifikat atau verifikasi'
    })}
    <section class="section">
      <article class="input-panel">
        <span class="badge gold">2 prestasi baru</span>
        <h3 class="card-title">Pantau validasi capaian siswa</h3>
        <p class="card-meta">Prioritaskan bukti sertifikat dan dokumen pendukung sebelum sinkron database.</p>
      </article>
    </section>
    <section class="section">
      ${sectionHead('Daftar prestasi', 'Tambah')}
      <div class="timeline">
        ${prestasiItems.map(scheduleCard).join('')}
      </div>
    </section>
    ${databaseDraftPanel('prestasi', ['siswa_id', 'jenis_prestasi', 'tingkat', 'deskripsi', 'tanggal', 'verifikasi'])}
  `;
}

function renderPelanggaranModule(detail) {
  const pelanggaranItems = [];
  const scan = appState.pelanggaranScan;
  return `
    ${moduleIntro(detail)}
    ${scan ? `
    <section class="section section--tight">
      <article style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:14px;background:linear-gradient(135deg,#131a2b,#fce7f3);border:1px solid #e9d5ff">
        <span style="display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:#00ffdb;color:#fff;font-weight:700">${initalsOf(scan.name)}</span>
        <div style="flex:1">
          <strong style="display:block;font-size:14px;color:#fcfcfc">${scan.name}</strong>
          <small style="font-size:12px;color:#9a9a92">NIS ${scan.nis} &middot; Kelas ${scan.kelas} &middot; via scan QR</small>
        </div>
      </article>
    </section>` : ''}
    ${renderModuleForm('pelanggaran', 'guru:pelanggaran')}
  `;
}

function renderEkstrakulikulerModule(detail) {
  const ekskulItems = [];
  return `
    ${moduleIntro(detail)}
    ${moduleScanBlock('ekstrakurikuler')}
    ${developmentInputFlow('ekstrakurikuler', {
      label: 'Form input ekstrakurikuler',
      aspect: 'Ekskul / Kegiatan',
      score: 'Kehadiran / progres',
      note: 'Catatan pembina',
      status: 'Aktif / Target / Lomba',
      followUp: 'Target latihan berikutnya'
    })}
    <section class="section">
      ${sectionHead('Ekskul aktif', 'Lihat jadwal')}
      <div class="timeline">
        ${ekskulItems.map(scheduleCard).join('')}
      </div>
    </section>
    <section class="section">
      <div class="stat-grid">
        ${statCard('Ekskul', '5', 'program aktif', 'indigo')}
        ${statCard('Siswa', '18', 'anggota aktif', 'gold')}
      </div>
    </section>
    ${databaseDraftPanel('ekstrakurikuler', ['ekskul_id', 'siswa_id', 'kehadiran', 'catatan_pembina'])}
  `;
}

function renderKalenderAkademikModule(detail) {
  const agendaItems = [];
  return `
    ${moduleIntro(detail)}
    <section class="section">
      <article class="input-panel">
        <span class="card-label">Filter agenda</span>
        <div class="segmented-row three">
          <button type="button" class="segment active">Harian</button>
          <button type="button" class="segment">Mingguan</button>
          <button type="button" class="segment">Bulanan</button>
        </div>
      </article>
    </section>
    <section class="section">
      ${sectionHead('Timeline agenda', '4 agenda')}
      <div class="timeline">
        ${agendaItems.map(scheduleCard).join('')}
      </div>
    </section>
  `;
}

const CATATAN_KATEGORI = ['Akademik','Sikap','Kedisiplinan','Hafalan','Ibadah','Kesehatan','Perkembangan Positif','Perlu Perhatian','Komunikasi Wali','Lainnya'];

// Data awal siswa per kelas (tersinkron dari Supabase saat akun guru terhubung).
const KELAS_LIST = ['1A','1B','2A','2B','3A','3B','4A','4B','5A','5B','6A','6B'];
const SISWA_PER_KELAS = {};
function getSiswaByKelas(kelas) {
  return SISWA_PER_KELAS[kelas] || [];
}
function rebuildSiswaFromRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return;
  Object.keys(SISWA_PER_KELAS).forEach(function(k){ delete SISWA_PER_KELAS[k]; });
  rows.forEach(function(row){
    var kelas = String(row.kelas || row.kelas_id || row.rombel || row.kelas_nama || 'Tanpa Kelas').trim() || 'Tanpa Kelas';
    var nama = String(row.nama || row.nama_siswa || row.name || 'Siswa').trim();
    var nis = String(row.nis || row.nisn || row.id || '').trim();
    if (!SISWA_PER_KELAS[kelas]) SISWA_PER_KELAS[kelas] = [];
    SISWA_PER_KELAS[kelas].push({ nis: nis, name: nama });
  });
  if (typeof KELAS_LIST !== 'undefined' && Array.isArray(KELAS_LIST)) {
    KELAS_LIST.length = 0;
    Object.keys(SISWA_PER_KELAS).sort().forEach(function(k){ KELAS_LIST.push(k); });
  }
}
function dedupeModules(mods) {
  if (!mods || typeof mods !== 'object') return mods;
  var out = {};
  Object.keys(mods).forEach(function(k){
    var arr = mods[k];
    if (!Array.isArray(arr)) { out[k] = arr; return; }
    var seen = {};
    out[k] = arr.filter(function(item){
      if (!item || typeof item !== 'object') return true;
      var sig = String(item.id || item.url || ((item.title||'') + '|' + (item.time||'') + '|' + (item.meta||'')));
      if (seen[sig]) return false;
      seen[sig] = true;
      return true;
    });
  });
  return out;
}
function initalsOf(name) {
  return name.split(' ').map(p=>p[0]).slice(0,2).join('');
}

// Avatar guru: pakai foto dari Supabase jika ada, kalau tidak fallback ke inisial
function teacherAvatarHtml(extraClass) {
  var cls = 'teacher-photo' + (extraClass ? (' ' + extraClass) : '');
  var url = appState.teacherPhotoUrl || '';
  var nama = appState.teacherName || 'Guru';
  if (url) {
    return '<span class="' + cls + ' has-photo"><img src="' + url + '" alt="Foto ' + nama + '" onerror="this.parentNode.classList.remove(\'has-photo\');this.parentNode.textContent=\'' + initalsOf(nama) + '\';" /></span>';
  }
  return '<span class="' + cls + '">' + initalsOf(nama) + '</span>';
}

function getCatatanState() {
  return appState.catatanForm || (appState.catatanForm = {
    kelas: '5A', siswa: null, kategori: 'Akademik', kirimWali: false
  });
}

function renderCatatanSiswaModule(detail) {
  const f = getCatatanState();
  const siswaDiKelas = getSiswaByKelas(f.kelas);
  const catatanItems = [];

  return `
    ${moduleIntro(detail)}

    <!-- Form tambah catatan -->
    <section class="section">
      <article class="mf-card">
        <span class="card-label">Tambah Catatan Siswa</span>

        <!-- Step 1: Filter Kelas -->
        <div class="catatan-step">
          <span class="catatan-step-label"><span class="step-badge">1</span> Pilih Kelas</span>
          <div class="kelas-grid">
            ${KELAS_LIST.map(k => `
              <button type="button"
                class="kelas-btn ${f.kelas===k?'on':''}"
                data-catatan-kelas="${k}">${k}
              </button>`).join('')}
          </div>
        </div>

        <!-- Step 2: Pilih Siswa dari kelas terpilih -->
        <div class="catatan-step">
          <span class="catatan-step-label">
            <span class="step-badge">2</span> Pilih Siswa
            <span class="kelas-badge">${f.kelas}</span>
            <small class="mf-hint">${siswaDiKelas.length} siswa</small>
          </span>
          ${siswaDiKelas.length > 0 ? `
            <div class="siswa-pick-grid">
              ${siswaDiKelas.map(s => `
                <button type="button"
                  class="siswa-pick-btn ${f.siswa===s.nis?'on':''}"
                  data-catatan-siswa="${s.nis}">
                  <span class="sp-avatar">${initalsOf(s.name)}</span>
                  <span class="sp-name">${s.name}</span>
                  <span class="sp-nis">${s.nis}</span>
                </button>`).join('')}
            </div>` : `
            <div class="kelas-empty">
              Data siswa kelas ${f.kelas} belum tersedia &mdash; akan terisi dari Supabase saat database aktif.
            </div>`}
        </div>

        ${f.siswa ? `
          <!-- Step 3: Form catatan (muncul setelah siswa dipilih) -->
          <div class="catatan-step">
            <span class="catatan-step-label"><span class="step-badge">3</span> Tulis Catatan</span>

            ${selectField('Kategori Catatan', f.kategori, CATATAN_KATEGORI, 'catatan-kat')}

            ${textareaField('Isi Catatan', 'Tulis observasi singkat, tindak lanjut, atau hal penting yang perlu dicatat...', 'catatan-isi')}

            ${textareaField('Tindak Lanjut', 'Langkah konkret: hubungi wali, pantau pekan depan, laporkan ke BK, dll.', 'catatan-tindak')}

            <div class="jf-toggle-row">
              <div>
                <strong>Kirim ke Wali Murid</strong>
                <small>Catatan masuk ke notifikasi wali murid siswa ini</small>
              </div>
              <button type="button" class="toggle-btn ${f.kirimWali?'on':''}" data-catatan-toggle-wali>
                ${f.kirimWali?'Ya':'Tidak'}
              </button>
            </div>

            <button type="button" class="save-draft-btn" data-draft-save>Simpan Catatan</button>
          </div>` : `
          <div class="catatan-hint">
            &#x2191; Pilih siswa untuk mulai mengisi catatan
          </div>`}

      </article>
    </section>

    <!-- Catatan terbaru -->
    <section class="section">
      ${sectionHead('Catatan terbaru', '3 item')}
      <div class="timeline">${catatanItems.map(scheduleCard).join('')}</div>
    </section>

    ${databaseDraftPanel('catatan_siswa',['siswa_id','kelas_id','kategori','isi','tindak_lanjut','kirim_wali','tanggal'])}
  `;
}

const PENG_KATEGORI = ['PENTING','UMUM','PRESTASI','LIBUR','KEGIATAN'];
const PENG_TONE = { PENTING:'red', UMUM:'blue', PRESTASI:'green', LIBUR:'gold', KEGIATAN:'indigo' };

function getPengState() {
  return appState.pengForm || (appState.pengForm = { filter: 'Semua', showForm: false, kategori: 'UMUM', prioritas: false });
}

function renderPengumumanGuruModule(detail) {
  const f = getPengState();
  const filtered = f.filter === 'Semua' ? announcements
    : announcements.filter(a => a.status.toUpperCase().includes(f.filter.toUpperCase()));

  return `
    ${moduleIntro(detail)}

    <!-- Filter baca -->
    <section class="section">
      <article class="input-panel">
        <span class="card-label">Filter pengumuman</span>
        <div class="jf-chips">
          ${['Semua','Penting','Akademik','Kegiatan'].map(k=>`
            <button type="button" class="jf-chip ${f.filter===k?'active':''}" data-peng-filter="${k}">${k}</button>`).join('')}
        </div>
      </article>
    </section>

    <!-- Daftar pengumuman -->
    <section class="section">
      ${sectionHead('Pengumuman masuk', filtered.length+' item')}
      <div class="timeline">${filtered.map(scheduleCard).join('')}</div>
    </section>

    <!-- Form buat pengumuman kelas -->
    <section class="section">
      <article class="mf-card">
        <div class="jf-toggle-row">
          <div>
            <strong>Buat Pengumuman Kelas</strong>
            <small>Guru dapat membuat pengumuman khusus untuk kelas binaan</small>
          </div>
          <button type="button" class="jf-chip ${f.showForm?'active':''}" data-peng-toggle-form>
            ${f.showForm ? 'Tutup' : '+ Buat'}
          </button>
        </div>

        ${f.showForm ? `
          ${selectField('Kategori', f.kategori, PENG_KATEGORI, 'peng-kat')}

          ${textareaField('Judul', 'Misal: Persiapan PTS Pekan Depan', 'peng-judul')}

          ${textareaField('Isi Pengumuman', 'Tulis isi pengumuman yang akan dibaca oleh guru dan wali murid kelas 5A...', 'peng-isi')}

          <div class="jf-toggle-row">
            <div>
              <strong>Tandai Penting</strong>
              <small>Pengumuman muncul di bagian atas</small>
            </div>
            <button type="button" class="toggle-btn ${f.prioritas?'on':''}" data-peng-toggle-prio>
              ${f.prioritas?'Ya':'Tidak'}
            </button>
          </div>

          <button type="button" class="save-draft-btn" data-draft-save>Kirim Pengumuman Kelas</button>
        ` : ''}
      </article>
    </section>

    ${databaseDraftPanel('pengumuman',['judul','kategori','isi','target','prioritas','tanggal_mulai','tanggal_selesai'])}
  `;
}

function renderMutabaahQuranGuruModule(detail) {
  const progressItems = [];
  return `
    ${moduleIntro(detail)}
    ${moduleScanBlock('mutabaah-quran')}
    ${developmentInputFlow('mutabaah-quran', {
      label: 'Form input mutabaah Quran',
      aspect: 'Tilawah / Murojaah / Hafalan',
      score: 'Progress halaman/juz',
      note: 'Catatan bacaan dan konsistensi',
      status: 'Stabil / Review / Pantau',
      followUp: 'Target Quran berikutnya'
    })}
    <section class="section">
      <article class="input-panel">
        <span class="card-label">Mode Mutabaah Quran</span>
        <div class="segmented-row three">
          <button type="button" class="segment active">Input Guru</button>
          <button type="button" class="segment">Review</button>
          <button type="button" class="segment">Rekap</button>
        </div>
      </article>
    </section>
    <section class="section">
      ${sectionHead('Progress tilawah siswa', 'Pantau')}
      <div class="timeline">
        ${progressItems.map(scheduleCard).join('')}
      </div>
    </section>
  `;
}

function renderMutabaahQuranPenilaian(list, detail, crudKey) {
  var rows = Array.isArray(list) ? list : [];
  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  if (!rows.length) {
    return '<section class="section">' + premiumEmptyState('Belum ada laporan wali', 'Laporan tilawah & murojaah rumah dari wali murid akan tampil di sini untuk dinilai guru.') + '</section>';
  }
  var STAT = ['Lancar','Cukup','Perlu Diulang','Belum setoran'];
  var isDinilai = function(r){ return !!String(r.status_setoran||'').trim() || !!String(r.ziyadah_sekolah||'').trim() || !!String(r.catatan_guru||'').trim() || /dinilai/i.test(String(r.status_review||'')); };
  var sorted = rows.slice().sort(function(a,b){ var da=isDinilai(a)?1:0, db=isDinilai(b)?1:0; if(da!==db) return da-db; return String(b.tanggal||'').localeCompare(String(a.tanggal||'')); });
  var belum = sorted.filter(function(r){ return !isDinilai(r); }).length;
  var cards = sorted.slice(0, 80).map(function(r){
    var nama = esc(r.nama_siswa || r.nama || r.siswa || 'Siswa');
    var kelas = esc(r.kelas || '-');
    var tgl = esc(String(r.tanggal || r.tgl || '').slice(0,10) || '-');
    var rowId = esc(r.id || '');
    var siswaId = esc(r.siswa_id || r.siswaId || '');
    var stat = String(r.status_setoran||'').trim();
    var dinilai = isDinilai(r);
    var statusPill = dinilai ? '<span class="status-pill '+(/lancar/i.test(stat)?'green':'orange')+'">'+(stat?esc(stat):'Sudah dinilai')+'</span>' : '<span class="status-pill blue">Belum dinilai</span>';
    var opts = STAT.slice();
    if (stat && opts.indexOf(stat) === -1) opts.unshift(stat);
    var optHtml = '<option value="">-- Pilih status --</option>' + opts.map(function(o){ return '<option value="'+esc(o)+'"'+(stat===o?' selected':'')+'>'+esc(o)+'</option>'; }).join('');
    return '<details class="mutabaah-item" style="margin-bottom:10px;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden">'
      + '<summary style="list-style:none;cursor:pointer;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px">'
      +   '<span style="display:flex;flex-direction:column;gap:2px"><b style="font-size:14px">'+nama+'</b><span class="card-label">'+kelas+' &middot; '+tgl+'</span></span>'
      +   statusPill
      + '</summary>'
      + '<article class="input-panel" style="margin:0;border-radius:0;border:0;border-top:1px solid rgba(255,255,255,0.08)">'
      +   '<span class="card-label">Data dari wali (baca saja)</span>'
      +   '<p class="module-detail-copy" style="margin:6px 0 2px"><b>Tilawah di rumah:</b> '+(r.tilawah_rumah?esc(r.tilawah_rumah):'-')+'</p>'
      +   '<p class="module-detail-copy" style="margin:2px 0"><b>Murojaah di rumah:</b> '+(r.murojaah_rumah?esc(r.murojaah_rumah):'-')+'</p>'
      +   (r.catatan_wali ? '<p class="module-detail-copy" style="margin:2px 0"><b>Catatan wali:</b> '+esc(r.catatan_wali)+'</p>' : '')
      +   '<div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:10px;padding-top:10px">'
      +     '<span class="card-label">Penilaian Guru</span>'
      +     '<label class="field-label">Ziyadah / Setoran Sekolah</label>'
      +     '<textarea class="field-textarea" data-mqn-field="ziyadah_sekolah" rows="2" placeholder="Catat ziyadah / setoran di sekolah...">'+esc(r.ziyadah_sekolah||'')+'</textarea>'
      +     '<label class="field-label">Status Setoran</label>'
      +     '<select class="field-select" data-mqn-field="status_setoran">'+optHtml+'</select>'
      +     '<label class="field-label">Catatan Guru</label>'
      +     '<textarea class="field-textarea" data-mqn-field="catatan_guru" rows="2" placeholder="Catatan / masukan untuk siswa ini...">'+esc(r.catatan_guru||'')+'</textarea>'
      +     '<button type="button" class="save-draft-btn" style="margin-top:12px" data-mqn-save data-mqn-id="'+rowId+'" data-mqn-siswa="'+siswaId+'" data-mqn-tanggal="'+tgl+'">Simpan Penilaian</button>'
      +   '</div>'
      + '</article>'
      + '</details>';
  }).join('');
  var head = sectionHead('Laporan mutabaah quran dari wali', (belum ? belum+' belum dinilai' : 'Semua sudah dinilai')+' - '+rows.length+' data');
  return '<section class="section">'+head+cards+'</section>';
}

function renderMutabaahRumahPenilaian(list, detail, crudKey) {
  var rows = Array.isArray(list) ? list : [];
  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  if (!rows.length) {
    return '<section class="section">' + premiumEmptyState('Belum ada laporan wali', 'Laporan mutabaah rumah dari wali murid akan tampil di sini untuk dinilai guru.') + '</section>';
  }
  var ya = function(v){ return /^(ya|1|true|hadir|sudah)$/i.test(String(v==null?'':v).trim()); };
  var isKonf = function(r){ return (r.konfirmasi_wali === true || r.konfirmasi_wali === 'true' || r.konfirmasi_wali === 1 || r.konfirmasi_wali === '1'); };
  var isDinilai = function(r){ return isKonf(r) || !!String(r.kendala||'').trim() || /dinilai|tindak lanjut/i.test(String(r.status_review||'')); };
  var sorted = rows.slice().sort(function(a,b){ var da=isDinilai(a)?1:0, db=isDinilai(b)?1:0; if(da!==db) return da-db; return String(b.tanggal||'').localeCompare(String(a.tanggal||'')); });
  var belum = sorted.filter(function(r){ return !isDinilai(r); }).length;
  var cards = sorted.slice(0, 80).map(function(r){
    var nama = esc(r.nama_siswa || r.nama || r.siswa || 'Siswa');
    var kelas = esc(r.kelas || '-');
    var tgl = esc(String(r.tanggal || r.tgl || '').slice(0,10) || '-');
    var rowId = esc(r.id || '');
    var siswaId = esc(r.siswa_id || r.siswaId || '');
    var shalat = [['Subuh',r.shalat_subuh],['Dzuhur',r.shalat_dzuhur],['Ashar',r.shalat_ashar],['Maghrib',r.shalat_maghrib],['Isya',r.shalat_isya]];
    var shalatHtml = shalat.map(function(s){ var ok = ya(s[1]); return '<span class="status-pill '+(ok?'green':'orange')+'">'+s[0]+': '+(ok?'Ya':(s[1]?esc(s[1]):'Tidak'))+'</span>'; }).join(' ');
    var konfBool = isKonf(r);
    var dinilai = isDinilai(r);
    var statusPill = konfBool ? '<span class="status-pill green">Dikonfirmasi</span>' : (dinilai ? '<span class="status-pill orange">Sudah dinilai</span>' : '<span class="status-pill blue">Belum dinilai</span>');
    var optHtml = '<option value="Dikonfirmasi"'+(konfBool?' selected':'')+'>Dikonfirmasi</option>'
      + '<option value="Belum"'+(!konfBool?' selected':'')+'>Belum dikonfirmasi</option>';
    var extra = '';
    if (r.tilawah_rumah) extra += '<p class="module-detail-copy" style="margin:2px 0"><b>Tilawah:</b> '+esc(r.tilawah_rumah)+'</p>';
    if (r.murojaah_rumah) extra += '<p class="module-detail-copy" style="margin:2px 0"><b>Murojaah:</b> '+esc(r.murojaah_rumah)+'</p>';
    if (r.catatan_wali) extra += '<p class="module-detail-copy" style="margin:2px 0"><b>Catatan wali:</b> '+esc(r.catatan_wali)+'</p>';
    return '<details class="mutabaah-item" style="margin-bottom:10px;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden">'
      + '<summary style="list-style:none;cursor:pointer;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px">'
      +   '<span style="display:flex;flex-direction:column;gap:2px"><b style="font-size:14px">'+nama+'</b><span class="card-label">'+kelas+' &middot; '+tgl+'</span></span>'
      +   statusPill
      + '</summary>'
      + '<article class="input-panel" style="margin:0;border-radius:0;border:0;border-top:1px solid rgba(255,255,255,0.08)">'
      +   '<span class="card-label">Data dari wali (baca saja)</span>'
      +   '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">'+shalatHtml+'</div>'
      +   '<p class="module-detail-copy" style="margin:2px 0"><b>Belajar:</b> '+(r.belajar?esc(r.belajar):'-')+'</p>'
      +   '<p class="module-detail-copy" style="margin:2px 0"><b>Akhlak:</b> '+(r.akhlak?esc(r.akhlak):'-')+'</p>'
      +   extra
      +   '<div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:10px;padding-top:10px">'
      +     '<span class="card-label">Penilaian Guru</span>'
      +     '<label class="field-label">Problem / Kendala</label>'
      +     '<textarea class="field-textarea" data-mrn-field="kendala" rows="2" placeholder="Catat kendala / masukan untuk siswa ini...">'+esc(r.kendala||'')+'</textarea>'
      +     '<label class="field-label">Konfirmasi Wali</label>'
      +     '<select class="field-select" data-mrn-field="konfirmasi_wali">'+optHtml+'</select>'
      +     '<button type="button" class="save-draft-btn" style="margin-top:12px" data-mrn-save data-mrn-id="'+rowId+'" data-mrn-siswa="'+siswaId+'" data-mrn-tanggal="'+tgl+'">Simpan Penilaian</button>'
      +   '</div>'
      + '</article>'
      + '</details>';
  }).join('');
  var head = sectionHead('Laporan mutabaah rumah dari wali', (belum ? belum+' belum dinilai' : 'Semua sudah dinilai')+' - '+rows.length+' data');
  return '<section class="section">'+head+cards+'</section>';
}

function renderMutabaahRumahGuruModule(detail) {
  const laporanItems = [];
  return `
    ${moduleIntro(detail)}
    <section class="section">
      <article class="input-panel">
        <span class="card-label">Laporan wali masuk</span>
        <div class="stat-grid">
          ${statCard('Masuk', '19', 'laporan sudah diterima', 'indigo')}
          ${statCard('Belum', '9', 'menunggu kiriman wali', 'gold')}
        </div>
      </article>
    </section>
    <section class="section">
      ${sectionHead('Kategori laporan rumah', '3 kategori')}
      <div class="timeline">
        ${laporanItems.map(scheduleCard).join('')}
      </div>
    </section>
  `;
}

function renderPesanLama() {
  // Detail view
  if (appState.activeMessageIdx != null && messages[appState.activeMessageIdx]) {
    const m = messages[appState.activeMessageIdx];
    const r = m.raw || {};
    var payload = {};
    try { if (r.payload) payload = (typeof r.payload === 'string') ? JSON.parse(r.payload) : r.payload; } catch(_) {}
    var siswa = payload.siswa || payload.nama_siswa || r.nama_siswa || '-';
    var kelas = payload.kelas || r.kelas || '-';
    var jenis = r.jenis || payload.jenis || 'Pesan';
    var nomor = r.nomor || '-';
    var tanggal = (r.tanggal || '').slice(0,10) || '-';
    var perihal = r.perihal || payload.perihal || '-';
    var isi = r.isi || payload.isi || payload.keterangan || m.preview || '-';
    var status = r.status || (m.unread ? 'Baru' : 'Tersimpan');
    var waliNo = payload.no_hp || payload.kontak || payload.wa || r.kontak || '';
    return `
      <section class="section">
        <article class="module-detail-card">
          <button type="button" class="back-chip" data-message-back>‹ Kembali ke daftar pesan</button>
          <span class="card-label">${jenis}</span>
          <h3 class="module-detail-title">${m.sender}</h3>
          <p class="module-detail-copy">Siswa: <b>${siswa}</b> &middot; Kelas: <b>${kelas}</b><br/>Tanggal: ${tanggal} &middot; Nomor: ${nomor}</p>
          <p class="module-detail-copy"><span class="status-pill ${m.unread ? 'orange' : 'green'}">${status}</span></p>
        </article>
      </section>
      <section class="section">
        <article class="input-panel">
          <span class="card-label">Perihal</span>
          <h4 class="module-detail-title" style="font-size:15px;margin-top:4px">${perihal}</h4>
          <p class="module-detail-copy" style="white-space:pre-wrap;margin-top:8px">${isi}</p>
        </article>
      </section>
      ${m.balasan ? `
      <section class="section">
        <article class="reply-bubble">
          <span class="card-label">✓ Balasan Anda</span>
          <p class="module-detail-copy" style="white-space:pre-wrap;margin-top:6px">${m.balasan}</p>
        </article>
      </section>` : ''}
      <section class="section">
        <article class="input-panel">
          <span class="card-label">${m.balasan ? 'Perbarui balasan' : 'Tulis balasan'}</span>
          <textarea id="reply-input" class="reply-textarea" rows="3" placeholder="Tulis balasan untuk ${m.sender}...">${m.balasan || ''}</textarea>
          <button type="button" class="primary-btn reply-send-btn" data-message-send="${appState.activeMessageIdx}">Kirim Balasan</button>
        </article>
      </section>
      <section class="section">
        <div class="field-chip-row">
          <button type="button" class="field-chip" data-message-mark-read="${appState.activeMessageIdx}">✓ Tandai dibaca</button>
          <button type="button" class="field-chip" data-message-back>Tutup</button>
        </div>
      </section>
    `;
  }
  return `
    <section class="section">
      <div class="stat-grid">
        ${statCard('Belum dibaca', appState.unreadMessages, 'butuh balasan', 'gold')}
        ${statCard('Total pesan', messages.length, 'percakapan tersimpan', 'indigo')}
      </div>
    </section>

    <section class="section">
      ${sectionHead('Pesan masuk', '')}
      <div class="timeline">
        ${messages.length ? messages.map(function(m,i){ return messageCard(m,i); }).join('') : premiumEmptyState('Belum ada pesan', 'Pesan dari wali murid dan sekolah akan tampil di sini.')}
      </div>
    </section>
  `;
}

function renderProfile() {
  return `
    <section class="section">
      <article class="profile-card profile-hero">
        ${teacherAvatarHtml('profile-avatar')}
        <h3 class="profile-name">${appState.syncMode === 'supabase-empty' ? 'Guru' : (appState.teacherName || 'Guru')}</h3>
        <p class="profile-meta">${appState.syncMode === 'supabase-empty' ? 'Akun belum terhubung · SD Plus Zymata' : ((appState.teacherRoleLabel || 'Guru') + ' · ' + (appState.teacherClass || 'SD Plus Zymata'))}</p>
      </article>
    </section>

    <section class="section">
      <div class="profile-grid">
        ${statCard('Presensi', appState.teacherAttendance.checkIn || '--:--', appState.teacherAttendance.status, 'indigo')}
        ${statCard('Sinkron', '98%', 'data tersimpan', 'indigo')}
        ${statCard('Akses', 'Guru', 'mode aktif', 'gold')}
      </div>
    </section>

    <section class="section">
      <div class="timeline">
        ${settingAction('Absensi Guru', 'Check-in, check-out, dan riwayat presensi', 'teacherAttendance')}
        ${settingRow('Bunyi notifikasi', 'Suara pendek saat toast/pesan penting masuk', appState.notificationSound, 'notificationSound')}
        ${settingRow('Getar notifikasi', 'Getar ringan/tegas untuk aksi penting', appState.notificationHaptic, 'notificationHaptic')}
        ${settingRow('Notifikasi prioritas', 'Pesan wali dan admin muncul di atas', true)}
        ${settingRow('Mode minimalis', 'Tampilan dibuat lebih bersih untuk mobile', true)}
        ${settingRow('Backup otomatis', 'Data draft disimpan di perangkat', true)}
      </div>
    </section>

    <section class="section">
      <button type="button" class="ghost-btn profile-logout" data-action="openRoleChooser">Keluar / Ganti Role</button>
    </section>
  `;
}

function attendanceTime(label, value, active) {
  return `
    <article class="attendance-time ${active ? 'active' : ''}">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function renderTeacherAttendanceRiwayat(){
  if (!appState.riwayatModulOpen) appState.riwayatModulOpen = {};
  if (!appState.riwayatModulTanggal) appState.riwayatModulTanggal = {};
  var moduleId = 'presensi-guru';
  var isOpen = appState.riwayatModulOpen[moduleId];
  var raw = (appState.supabaseModules && appState.supabaseModules.presensiGuru) ? appState.supabaseModules.presensiGuru : [];
  var rows = (Array.isArray(raw) ? raw : []).filter(function(r){ return r && guruRowDate(r); });
  function toneOf(st){
    var s = String(st || '').toLowerCase();
    if (s.indexOf('terlambat') >= 0) return 'orange';
    if (s.indexOf('alpa') >= 0) return 'red';
    if (s.indexOf('dinas') >= 0) return 'indigo';
    if (s.indexOf('izin') >= 0 || s.indexOf('sakit') >= 0) return 'blue';
    if (s.indexOf('hadir') >= 0 || s.indexOf('tepat') >= 0) return 'green';
    return 'blue';
  }
  function rowToItem(r){
    var masuk = r.jam_masuk || r.checkIn || '--:--';
    var pulang = r.jam_pulang || r.checkOut || '--:--';
    var ket = r.keterangan ? (' · ' + r.keterangan) : '';
    var label = (typeof agStatusLabel === 'function') ? (agStatusLabel(r.status) || r.status || 'Hadir') : (r.status || 'Hadir');
    var sesi = r.sesi ? (r.sesi + ' · ') : '';
    return { time: formatTanggalID(guruRowDate(r)), title: label, meta: sesi + 'Masuk ' + (masuk || '--:--') + ' · Pulang ' + (pulang || '--:--') + ket, status: 'Tercatat', tone: toneOf(r.status) };
  }
  var bodyHtml;
  if (!rows.length) {
    bodyHtml = '<div class="timeline">' + teacherAttendanceHistory().map(scheduleCard).join('') + '</div>';
  } else {
    var dateSet = {};
    rows.forEach(function(r){ dateSet[guruRowDate(r)] = true; });
    var dates = Object.keys(dateSet).sort().reverse();
    var selected = (appState.riwayatModulTanggal[moduleId] && dateSet[appState.riwayatModulTanggal[moduleId]]) ? appState.riwayatModulTanggal[moduleId] : dates[0];
    var rowsTgl = rows.filter(function(r){ return guruRowDate(r) === selected; });
    var inner = '';
    inner += '<label class="mf-label">Pilih tanggal</label>';
    inner += '<div class="mf-select-wrap"><select class="mf-select" data-select="riwayat-modul-tanggal" data-riwayat-modul="' + moduleId + '">';
    dates.forEach(function(d){ inner += '<option value="' + d + '"' + (d === selected ? ' selected' : '') + '>' + formatTanggalID(d) + '</option>'; });
    inner += '</select><span class="mf-chevron">&#8250;</span></div>';
    inner += '<p class="riwayat-absen-count">' + rowsTgl.length + ' presensi tercatat · ' + dates.length + ' tanggal</p>';
    inner += '<div class="timeline">';
    rowsTgl.forEach(function(r){ inner += scheduleCard(rowToItem(r)); });
    inner += '</div>';
    bodyHtml = inner;
  }
  return '<section class="section">'
    + '<details class="riwayat-absen-toggle" data-riwayat-modul-toggle="' + moduleId + '"' + (isOpen ? ' open' : '') + '>'
    + '<summary class="riwayat-absen-summary"><span class="riwayat-absen-title">&#128197; Riwayat Presensi</span><span class="riwayat-absen-hint">Lihat detail per tanggal &rsaquo;</span></summary>'
    + '<div class="riwayat-absen-body">' + bodyHtml + '</div>'
    + '</details>'
    + '</section>';
}

function teacherAttendanceHistory() {
  const today = appState.teacherAttendance;
  return [
    { time: 'Hari ini', title: today.status, meta: `Masuk ${today.checkIn || '--:--'} &middot; Pulang ${today.checkOut || '--:--'}`, status: today.checkIn ? 'Tercatat' : 'Menunggu', tone: today.checkIn ? 'green' : 'orange' },
    { time: 'Kemarin', title: 'Hadir tepat waktu', meta: 'Masuk 06:47 &middot; Pulang 14:12', status: 'Selesai', tone: 'green' },
    { time: 'Senin', title: 'Hadir', meta: 'Masuk 06:51 &middot; Pulang 14:08', status: 'Selesai', tone: 'green' }
  ];
}

function statCard(label, value, meta, variant = '') {
  return `
    <article class="stat-card ${variant}">
      <span class="card-label">${label}</span>
      <span class="stat-number">${value}</span>
      <p class="card-meta">${meta}</p>
    </article>
  `;
}

function moduleIntro(detail) {
  return `
    <section class="section">
      <article class="module-detail-card">
        <button type="button" class="back-chip" data-action="menu">&#8249; Kembali</button>
        <span class="card-label">${detail.eyebrow}</span>
        <h3 class="module-detail-title">${detail.title}</h3>
        <p class="module-detail-copy">${detail.subtitle}</p>
        <div class="module-stat-grid">
          ${detail.stats.map(([label, value]) => statCard(label, value, 'ringkasan modul', label === 'KKM' ? 'gold' : 'indigo')).join('')}
        </div>
      </article>
    </section>
  `;
}

function studentAttendanceRow(student, index) {
  const statuses = ['H', 'I', 'S', 'A'];
  return `
    <article class="attendance-row-card">
      <div class="student-info">
        <h3 class="student-name">${student.name}</h3>
        <p class="student-meta">${student.meta}</p>
      </div>
      <div class="status-buttons">
        ${statuses.map((status, statusIndex) => `<button type="button" class="status-button ${statusIndex === index ? 'active' : ''}">${status}</button>`).join('')}
      </div>
    </article>
  `;
}

function scoreRow(student, index) {
  const scores = [];
  return `
    <article class="score-row-card">
      <div class="student-info">
        <h3 class="student-name">${student.name}</h3>
        <p class="student-meta">Nilai akhir &middot; ${scores[index] || 'belum diisi'}</p>
      </div>
      <span class="score-box">${scores[index] || '--'}</span>
    </article>
  `;
}

function getModuleInputMode(moduleId, fallback = 'qr') {
  return appState.moduleInputModes[moduleId] || fallback;
}

function flowModeButtons(moduleId, activeMode, firstLabel, secondLabel) {
  const currentMode = getModuleInputMode(moduleId, activeMode);
  const secondMode = moduleId === 'absensi-siswa' ? 'manual' : 'select';
  return `
    <div class="input-choice-row" role="group" aria-label="Pilihan input ${moduleId}">
      <button type="button" class="input-choice ${currentMode === 'qr' ? 'active' : ''}" data-flow-mode="qr" data-flow-module="${moduleId}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M4 8.5a2 2 0 0 1 2-2h1.6l1-1.5a1 1 0 0 1 .8-.4h5.2a1 1 0 0 1 .8.4l1 1.5H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.2"/></svg> ${firstLabel}</button>
      <button type="button" class="input-choice ${currentMode === secondMode ? 'active' : ''}" data-flow-mode="${secondMode}" data-flow-module="${moduleId}">&#128203; ${secondLabel}</button>
    </div>
  `;
}

function getAbsenSiswaState() {
  if (!appState.absenSiswaManual) {
    var __defKelas = (appState.guruKelasList && appState.guruKelasList.length) ? appState.guruKelasList[0] : ((KELAS_LIST && KELAS_LIST.length) ? KELAS_LIST[0] : '5A');
    appState.absenSiswaManual = { kelas: __defKelas };
  }
  return appState.absenSiswaManual;
}

function absensiRowDate(row){
  var d = row && (row.tanggal || row.tgl || row.created_at || '');
  return String(d || '').slice(0, 10);
}

function formatTanggalID(d){
  var s = String(d || '').slice(0, 10);
  var parts = s.split('-');
  if (parts.length !== 3) return s || '-';
  var bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  var m = parseInt(parts[1], 10);
  return parseInt(parts[2], 10) + ' ' + (bln[m - 1] || parts[1]) + ' ' + parts[0];
}

function guruRowDate(row){
  var d = row && (row.tanggal || row.tgl || row.date || row.created_at || row.createdAt || row.waktu || '');
  return String(d || '').slice(0, 10);
}

function renderModuleRiwayat(moduleId, list, detail, crudKey){
  var helper = window.ZymataMobileSupabase;
  var title = (detail && detail.title) ? detail.title : 'Data';
  var arr = Array.isArray(list) ? list : [];
  var rows = arr.filter(function(r){ return r && guruRowDate(r); });
  var noDate = arr.filter(function(r){ return r && !guruRowDate(r); });
  if (!appState.riwayatModulOpen) appState.riwayatModulOpen = {};
  if (!appState.riwayatModulTanggal) appState.riwayatModulTanggal = {};
  var isOpen = appState.riwayatModulOpen[moduleId];
  function entryHtml(row){
    var item = helper && helper.normalizeItem ? helper.normalizeItem(row, title) : { time:'Data', title:title, meta:'Supabase', status:'Aktif', tone:'blue' };
    var actions = row.__mobileCrud && row.id ? '<div class="field-chip-row"><button type="button" class="field-chip" data-mobile-crud-update="' + row.id + '" data-mobile-crud-key="' + crudKey + '">Tandai selesai</button><button type="button" class="field-chip" data-mobile-crud-delete="' + row.id + '" data-mobile-crud-key="' + crudKey + '">Hapus</button></div>' : '';
    return scheduleCard(item) + actions;
  }
  var bodyHtml;
  if (!rows.length && !noDate.length) {
    bodyHtml = premiumEmptyState('Belum ada riwayat', 'Data ' + title.toLowerCase() + ' yang sudah disimpan akan tampil di sini per tanggal.');
  } else {
    var inner = '';
    if (rows.length) {
      var dateSet = {};
      rows.forEach(function(r){ dateSet[guruRowDate(r)] = true; });
      var dates = Object.keys(dateSet).sort().reverse();
      var selected = (appState.riwayatModulTanggal[moduleId] && dateSet[appState.riwayatModulTanggal[moduleId]]) ? appState.riwayatModulTanggal[moduleId] : dates[0];
      var rowsTgl = rows.filter(function(r){ return guruRowDate(r) === selected; });
      inner += '<label class="mf-label">Pilih tanggal</label>';
      inner += '<div class="mf-select-wrap"><select class="mf-select" data-select="riwayat-modul-tanggal" data-riwayat-modul="' + moduleId + '">';
      dates.forEach(function(d){ inner += '<option value="' + d + '"' + (d === selected ? ' selected' : '') + '>' + formatTanggalID(d) + '</option>'; });
      inner += '</select><span class="mf-chevron">&#8250;</span></div>';
      inner += '<p class="riwayat-absen-count">' + rowsTgl.length + ' data tercatat \u00b7 ' + dates.length + ' tanggal</p>';
      inner += '<div class="timeline">';
      rowsTgl.slice(0, 50).forEach(function(r){ inner += entryHtml(r); });
      inner += '</div>';
    }
    if (noDate.length) {
      inner += '<p class="riwayat-absen-count">Tanpa tanggal \u00b7 ' + noDate.length + ' data</p>';
      inner += '<div class="timeline">';
      noDate.slice(0, 30).forEach(function(r){ inner += entryHtml(r); });
      inner += '</div>';
    }
    bodyHtml = inner;
  }
  return '<section class="section">'
    + '<details class="riwayat-absen-toggle" data-riwayat-modul-toggle="' + moduleId + '"' + (isOpen ? ' open' : '') + '>'
    + '<summary class="riwayat-absen-summary"><span class="riwayat-absen-title">&#128197; Riwayat ' + title + '</span><span class="riwayat-absen-hint">Lihat detail per tanggal &rsaquo;</span></summary>'
    + '<div class="riwayat-absen-body">' + bodyHtml + '</div>'
    + '</details>'
    + '</section>';
}

function renderRiwayatAbsenBody(kelas){
  var all = (appState.supabaseModules && appState.supabaseModules.absensi) ? appState.supabaseModules.absensi : [];
  var rows = all.filter(function(r){
    if (!r) return false;
    var rk = String(r.kelas || r.kelas_id || '').trim();
    var st = String(r.status || '').trim();
    var tg = absensiRowDate(r);
    return tg && st && (!kelas || rk === kelas);
  });
  if (!rows.length) {
    return premiumEmptyState('Belum ada riwayat absen', 'Absensi kelas ' + kelas + ' yang sudah disimpan akan tampil di sini per tanggal.', 'Simpan absensi dulu');
  }
  var dateSet = {};
  rows.forEach(function(r){ dateSet[absensiRowDate(r)] = true; });
  var dates = Object.keys(dateSet).sort().reverse();
  var selected = (appState.riwayatAbsenTanggal && dateSet[appState.riwayatAbsenTanggal]) ? appState.riwayatAbsenTanggal : dates[0];
  var rowsTgl = rows.filter(function(r){ return absensiRowDate(r) === selected; });
  var labelFull = { Hadir:'Hadir', Izin:'Izin', Sakit:'Sakit', Alpa:'Alpa' };
  var toneClass = { Hadir:'h', Izin:'i', Sakit:'s', Alpa:'a' };
  var sumH = rowsTgl.filter(function(r){ return r.status === 'Hadir'; }).length;
  var html = '';
  html += '<label class="mf-label">Pilih tanggal</label>';
  html += '<div class="mf-select-wrap"><select class="mf-select" data-select="riwayat-tanggal">';
  dates.forEach(function(d){ html += '<option value="' + d + '"' + (d === selected ? ' selected' : '') + '>' + formatTanggalID(d) + '</option>'; });
  html += '</select><span class="mf-chevron">&#8250;</span></div>';
  html += '<p class="riwayat-absen-count">' + rowsTgl.length + ' siswa tercatat \u00b7 ' + sumH + ' hadir</p>';
  html += '<div class="riwayat-absen-list">';
  rowsTgl.forEach(function(r){
    var nis = String(r.siswa_id || r.nis || '').trim();
    var nama = r.nama_siswa || r.nama || '';
    if (!nama && nis) { (SISWA_PER_KELAS[kelas] || []).some(function(s){ if (String(s.nis) === nis) { nama = s.name; return true; } return false; }); }
    if (!nama) nama = nis || 'Siswa';
    var st = String(r.status || '').trim();
    var tone = toneClass[st] || 'h';
    html += '<article class="riwayat-row">'
      + '<div class="pa-student"><span class="sp-avatar">' + initalsOf(nama) + '</span><div><strong>' + nama + '</strong><small>NIS ' + (nis || '-') + '</small></div></div>'
      + '<span class="riwayat-badge ' + tone + '">' + (labelFull[st] || st) + '</span>'
      + '</article>';
  });
  html += '</div>';
  return html;
}

function studentAttendanceFlowBody() {
  {
    const as = getAbsenSiswaState();
    const siswaDiKelas = getSiswaByKelas(as.kelas);
    return `
      <div class="flow-card manual-flow">
        <span class="flow-icon">&#128203;</span>
        <div>
          <h3 class="card-title">Manual dari daftar siswa</h3>
          <p class="card-meta">Pilih kelas, lalu tap siswa dan tandai statusnya.</p>
        </div>
      </div>

      <!-- Dropdown filter kelas -->
      <div class="absen-kelas-row">
        <label class="mf-label">Kelas</label>
        <div class="mf-select-wrap">
          <select class="mf-select" data-select="absen-kelas">
            ${((appState.guruKelasList && appState.guruKelasList.length) ? appState.guruKelasList : KELAS_LIST).map(k => `<option value="${k}" ${k === as.kelas ? 'selected' : ''}>${k}</option>`).join('')}
          </select>
          <span class="mf-chevron">&#8250;</span>
        </div>
      </div>

      <p class="absen-today-date">&#128197; Tanggal absen hari ini: <strong>${formatTanggalID(agTodayISO())}</strong></p>

      <!-- Tombol scan QR/Barcode siswa -->
      ${siswaDiKelas.length > 0 ? `
      <button type="button" data-absen-scan="1" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin:6px 0 12px;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#00ffdb,#34e8cf);color:#06231f;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 6px 16px rgba(0,255,219,.28)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06231f" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px;margin-right:2px"><path d="M4 8.5a2 2 0 0 1 2-2h1.6l1-1.5a1 1 0 0 1 .8-.4h5.2a1 1 0 0 1 .8.4l1 1.5H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.2"/></svg>Scan QR / Barcode Siswa
      </button>
      ` : ''}

      <!-- Daftar siswa kelas terpilih -->
      ${siswaDiKelas.length > 0 ? `
        <div class="absen-siswa-list compact-premium">
          ${siswaDiKelas.map(s => premiumAttendanceRow(s, appState.absenSiswaStatus?.[s.nis])).join('')}
        </div>
      ` : `
        ${premiumEmptyState('Data siswa belum tersedia', `Kelas ${as.kelas} belum memiliki daftar siswa.`, 'Pilih kelas lain')}
      `}
    `;
  }
}

function developmentInputFlow(moduleId, config) {
  return `
    <section class="section">
      <article class="input-panel development-flow-panel">
        <span class="card-label">Alur input perkembangan</span>
        ${studentSelectFlow(moduleId)}
        <div class="form-preview-grid single input-form-preview">
          ${fieldPreview('Siswa', 'Pilih siswa dari daftar kelas')}
          ${fieldPreview('Aspek/Jenis', config.aspect)}
          ${fieldPreview('Nilai/Poin', config.score)}
          ${fieldPreview('Catatan', config.note)}
          ${fieldPreview('Status', config.status)}
          ${fieldPreview('Tindak Lanjut', config.followUp)}
        </div>
        <button type="button" class="save-draft-btn" data-draft-save>Simpan Draft</button>
      </article>
    </section>
  `;
}

function studentSelectFlow(moduleId) {
  return `
    <div class="flow-card manual-flow">
      <span class="flow-icon">&#128203;</span>
      <div>
        <h3 class="card-title">Pilih siswa dari daftar</h3>
        <p class="card-meta">Dipakai kalau kartu QR tidak terbawa atau kamera belum tersedia.</p>
      </div>
    </div>
    <div class="student-pick-list compact">
      ${students.map((student, index) => studentPickButton(student, index, moduleId)).join('')}
    </div>
  `;
}

function studentPickButton(student, index) {
  return `
    <button type="button" class="student-pick ${index === 0 ? 'active' : ''}">
      <span class="student-avatar">${student.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
      <span>
        <strong>${student.name}</strong>
        <small>${student.meta}</small>
      </span>
    </button>
  `;
}

function fieldPreview(label, value) {
  return `
    <div class="field-preview">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function databaseDraftPanel(tableName, fields) {
  return `
    <section class="section">
      <article class="db-ready-card">
        <span class="card-label">Siap Database Real</span>
        <h3 class="card-title">Mapping tabel: ${tableName}</h3>
        <p class="card-meta">Belum query Supabase. Struktur UI disiapkan dulu agar nanti tinggal sambung CRUD.</p>
        <div class="field-chip-row">
          ${fields.map((field) => `<span class="field-chip">${field}</span>`).join('')}
        </div>
      </article>
    </section>
  `;
}

function openQrScanner(onResult){
  if (typeof Html5Qrcode === 'undefined') {
    showError('Pemindai belum siap (modul kamera gagal dimuat). Cek koneksi internet lalu coba lagi.');
    return;
  }
  // FIX: pakai ID unik setiap sesi scan agar Html5Qrcode tidak bentrok
  // dengan instance sebelumnya yang masih terdaftar di registry internal library.
  var qrUniqueId = 'qrReader_' + Date.now();
  var overlay = document.createElement('div');
  overlay.className = 'qr-overlay';
  overlay.innerHTML = '<style>'
    + '.qr-overlay{background:#111!important;padding:0!important;align-items:center!important;justify-content:center!important}'
    + '.qrs-wrap{width:100%;max-width:420px;display:flex;flex-direction:column}'
    + '.qrs-topbar{display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px)+14px) 16px 12px}'
    + '.qrs-ttl{color:#fff;font-size:15px;font-weight:700;letter-spacing:.2px}'
    + '.qrs-xbtn{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:20px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}'
    + '.qrs-vidwrap{position:relative;width:100%;background:#000}'
    + '#'+qrUniqueId+'{width:100%!important}'
    + '#'+qrUniqueId+' video{width:100%!important;display:block!important}'
    + '.qrs-frame{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:220px;height:220px;pointer-events:none;z-index:5}'
    + '.qrs-c{position:absolute;width:26px;height:26px;border-color:#fff;border-style:solid;border-width:0}'
    + '.qrs-c.tl{top:0;left:0;border-top-width:3px;border-left-width:3px;border-radius:5px 0 0 0}'
    + '.qrs-c.tr{top:0;right:0;border-top-width:3px;border-right-width:3px;border-radius:0 5px 0 0}'
    + '.qrs-c.bl{bottom:0;left:0;border-bottom-width:3px;border-left-width:3px;border-radius:0 0 0 5px}'
    + '.qrs-c.br{bottom:0;right:0;border-bottom-width:3px;border-right-width:3px;border-radius:0 0 5px 0}'
    + '.qrs-ln{position:absolute;left:5px;right:5px;height:2px;background:linear-gradient(90deg,transparent,#22c55e,#4ade80,#22c55e,transparent);box-shadow:0 0 8px rgba(34,197,94,.8);border-radius:2px;animation:qscan 1.8s ease-in-out infinite}'
    + '@keyframes qscan{0%,100%{top:3px;opacity:.6}50%{top:calc(100% - 3px);opacity:1}}'
    + '.qrs-hint{color:rgba(255,255,255,.75);font-size:13px;text-align:center;padding:14px 24px calc(env(safe-area-inset-bottom,0px)+14px);margin:0}'
    + '</style>'
    + '<div class="qrs-wrap">'
    + '<div class="qrs-topbar"><div style="width:36px"></div><span class="qrs-ttl">Scan QR / Barcode</span><button type="button" class="qrs-xbtn qr-close" aria-label="Tutup">&times;</button></div>'
    + '<div class="qrs-vidwrap"><div id="'+qrUniqueId+'"></div><div class="qrs-frame"><span class="qrs-c tl"></span><span class="qrs-c tr"></span><span class="qrs-c bl"></span><span class="qrs-c br"></span><div class="qrs-ln"></div></div></div>'
    + '<p class="qrs-hint">Posisikan QR code di dalam kotak &bull; Otomatis terdeteksi</p>'
    + '</div>';
  document.body.appendChild(overlay);
  window.__qrScannerOpen = true;
  var scanner = new Html5Qrcode(qrUniqueId);
  var stopped = false;
  function cleanup(){
    window.__qrScannerOpen = false;
    if (stopped) { if (overlay.parentNode) overlay.remove(); return; }
    stopped = true;
    scanner.stop().then(function(){ try { scanner.clear(); } catch(_) {} }).catch(function(){}).finally(function(){ if (overlay.parentNode) overlay.remove(); });
  }
  overlay.querySelector('.qr-close').addEventListener('click', cleanup);
  var qrConfig = { fps: 10, qrbox: function(vw, vh){ var s = Math.min(vw, vh, 260) - 20; return { width: s, height: s }; } };
  function onScanSuccess(decodedText){
    if (stopped) return;
    var v = String(decodedText || '').trim();
    cleanup();
    if (v) onResult(v);
  }
  function onScanFrameError(){ /* abaikan error per-frame */ }
  function failScan(err){
    window.__qrScannerOpen = false;
    if (overlay.parentNode) overlay.remove();
    var raw = (err && err.message) ? err.message : String(err || '');
    var msg;
    if (/not\s*found|notfound|requested device/i.test(raw)) msg = 'Kamera tidak terdeteksi di perangkat ini. Coba buka di HP yang ada kameranya.';
    else if (/permission|denied|notallowed/i.test(raw)) msg = 'Izin kamera ditolak. Aktifkan izin kamera lalu coba lagi.';
    else if (/https|secure/i.test(raw)) msg = 'Kamera butuh akses HTTPS. Jangan buka via file://, gunakan https:// atau lewat aplikasi.';
    else msg = 'Tidak bisa membuka kamera: ' + raw;
    showError(msg);
  }
  function startWith(constraint){ return scanner.start(constraint, qrConfig, onScanSuccess, onScanFrameError); }
  // Deteksi kamera dulu (lebih andal): pilih kamera belakang bila ada, kalau tidak pakai yang tersedia.
  // Jika enumerasi kamera tidak didukung, fallback ke facingMode 'environment' (string; { ideal } ditolak).
  if (typeof Html5Qrcode !== 'undefined' && Html5Qrcode.getCameras) {
    Html5Qrcode.getCameras().then(function(cams){
      if (!cams || !cams.length) { return failScan(new Error('Tidak ada kamera terdeteksi di perangkat ini')); }
      var back = cams.filter(function(c){ return /back|belakang|rear|environment/i.test(c.label || ''); });
      var camId = (back[0] || cams[cams.length - 1]).id;
      startWith(camId).catch(function(){ startWith(cams[0].id).catch(failScan); });
    }).catch(function(){
      startWith({ facingMode: 'environment' }).catch(failScan);
    });
  } else {
    startWith({ facingMode: 'environment' }).catch(failScan);
  }
}

function renderModuleForm(moduleId, crudKey) {
  var schema = (window.ZymataMobileSupabase && window.ZymataMobileSupabase.MODULE_FORM_SCHEMA && window.ZymataMobileSupabase.MODULE_FORM_SCHEMA[crudKey]) || null;
  if (!schema) {
    return `
      <section class="section">
        <article class="input-panel">
          <label class="field-label">Input cepat</label>
          <textarea class="field-textarea" data-mobile-crud-text="${crudKey}" placeholder="Tulis data..."></textarea>
          <button type="button" class="save-draft-btn" data-mobile-crud-create="${crudKey}">Simpan</button>
        </article>
      </section>
    `;
  }

  var hasScan = schema.fields.some(function(f){ return f.type === 'siswa-select' || /nis|nisn|nomor|kode|barcode|id/i.test(f.key); });
  var scanTop = hasScan ? '<button type="button" class="scan-top-btn" data-qr-scan="'+crudKey+'" data-qr-module="1" title="Scan QR / Barcode" aria-label="Scan QR / Barcode"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M4 8.5a2 2 0 0 1 2-2h1.6l1-1.5a1 1 0 0 1 .8-.4h5.2a1 1 0 0 1 .8.4l1 1.5H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.2"/></svg></button>' : '';
  var html = `<section class="section"><article class="input-panel"><div class="input-panel-head"><span class="card-label">${schema.title}</span>${scanTop}</div>`;
  var __orderedFields = schema.fields.slice();
  (function(){
    var si = -1, ki = -1, i;
    for (i = 0; i < __orderedFields.length; i++) {
      if (si === -1 && __orderedFields[i].type === 'siswa-select') si = i;
      if (ki === -1 && (__orderedFields[i].key === 'kelas_id' || __orderedFields[i].key === 'kelas')) ki = i;
    }
    if (si > -1 && ki > si) { var kf = __orderedFields.splice(ki, 1)[0]; __orderedFields.splice(si, 0, kf); }
  })();
  __orderedFields.forEach(function(field) {
    if (field.type === 'textarea') {
      html += `<label class="field-label">${field.label}</label><textarea class="field-textarea" data-module-field="${field.key}" data-form-key="${crudKey}" placeholder="${field.label}..." rows="2"></textarea>`;
    } else if (field.type === 'date') {
      html += `<label class="field-label">${field.label}</label><input type="date" class="field-input" data-module-field="${field.key}" data-form-key="${crudKey}" value="${agTodayISO()}">`;
    } else if (field.type === 'number') {
      html += `<label class="field-label">${field.label}</label><input type="number" class="field-input" data-module-field="${field.key}" data-form-key="${crudKey}" placeholder="${field.label}">`;
    } else if (field.type === 'siswa-select') {
      var soloKelas = (KELAS_LIST && KELAS_LIST.length === 1) ? KELAS_LIST[0] : '';
      // FIX: pre-fill siswa dari pelanggaranScan jika modul pelanggaran
      var _pelScan = (crudKey === 'guru:pelanggaran') ? appState.pelanggaranScan : null;
      html += '<label class="field-label">'+field.label+'</label><select class="field-select" data-qr-target="1" data-siswa-select="1" data-module-field="'+field.key+'" data-form-key="'+crudKey+'">';
      if (_pelScan && _pelScan.nis) {
        // Siswa dari scan QR — langsung tampilkan sebagai opsi terpilih
        html += '<option value="'+_pelScan.nis+'" selected>'+_pelScan.name+' ('+_pelScan.nis+')</option>';
      } else if (soloKelas) {
        html += '<option value="">Pilih siswa</option>';
        (SISWA_PER_KELAS[soloKelas] || []).forEach(function(s){
          html += '<option value="'+s.nis+'">'+s.name+' ('+s.nis+')</option>';
        });
      } else {
        html += '<option value="">Pilih kelas dahulu</option>';
      }
      html += '</select>';
    } else if (field.key === 'kelas_id' || field.key === 'kelas') {
      // Semua modul pakai guruKelasList (kelas yang diajar guru); fallback ke KELAS_LIST
      var __kelasOpts = (appState.guruKelasList && appState.guruKelasList.length) ? appState.guruKelasList : (KELAS_LIST || []);
      var soloKelasK = (__kelasOpts && __kelasOpts.length === 1) ? __kelasOpts[0] : '';
      // FIX: pre-fill kelas dari pelanggaranScan jika modul pelanggaran
      var _pelScanKls = (crudKey === 'guru:pelanggaran' && appState.pelanggaranScan) ? appState.pelanggaranScan.kelas : '';
      var _selectedKls = _pelScanKls || soloKelasK;
      html += '<label class="field-label">'+field.label+'</label><select class="field-select" data-kelas-select="1" data-module-field="'+field.key+'" data-form-key="'+crudKey+'"><option value="">Pilih kelas</option>';
      // Kalau kelas dari scan tidak ada di guruKelasList, tambahkan sebagai opsi
      if (_pelScanKls && !__kelasOpts.includes(_pelScanKls)) {
        html += '<option value="'+_pelScanKls+'" selected>'+_pelScanKls+'</option>';
      }
      __kelasOpts.forEach(function(kls){ html += '<option value="'+kls+'"'+(kls===_selectedKls?' selected':'')+'>'+kls+'</option>'; });
      html += '</select>';
    } else if ((field.key === 'guru_id' || field.key === 'guru') && moduleId === 'jurnal-guru') {
      // Kolom Guru: otomatis terisi nama guru yang login (readonly) - KHUSUS jurnal-guru
      var __guruNama = appState.teacherName || '';
      html += '<label class="field-label">'+field.label+'</label><input type="text" class="field-input" data-module-field="'+field.key+'" data-form-key="'+crudKey+'" value="'+__guruNama+'" readonly style="background:#141b2c;color:#b6b8b1;font-weight:700;cursor:not-allowed;">';
    } else if (field.key === 'mapel_id' || field.key === 'mapel' || field.key === 'mata_pelajaran') {
      // Semua modul: dropdown mapel terintegrasi dengan mapel yang DIAJAR guru; fallback ke MAPEL_LIST
      var __mapelOpts = (appState.guruMapelList && appState.guruMapelList.length) ? appState.guruMapelList : (typeof MAPEL_LIST !== 'undefined' ? MAPEL_LIST : []);
      if (__mapelOpts.length) {
        html += '<label class="field-label">'+field.label+'</label><select class="field-select" data-module-field="'+field.key+'" data-form-key="'+crudKey+'"><option value="">Pilih Mata Pelajaran</option>';
        __mapelOpts.forEach(function(mp){ html += '<option value="'+mp+'">'+mp+'</option>'; });
        html += '</select>';
      } else {
        html += '<label class="field-label">'+field.label+'</label><input type="text" class="field-input" data-module-field="'+field.key+'" data-form-key="'+crudKey+'" placeholder="'+field.label+'">';
      }
    } else if (field.options && field.options.length) {
      html += `<label class="field-label">${field.label}</label><select class="field-select" data-module-field="${field.key}" data-form-key="${crudKey}"><option value="">Pilih ${field.label}</option>`;
      field.options.forEach(function(option) { html += `<option value="${option}">${option}</option>`; });
      html += '</select>';
    } else {
      var codeAttr = /nis|nisn|nomor|kode|barcode|id/i.test(field.key) ? ' data-qr-target="1"' : '';
      html += '<label class="field-label">'+field.label+'</label><input type="text" class="field-input"'+codeAttr+' data-module-field="'+field.key+'" data-form-key="'+crudKey+'" placeholder="'+field.label+'">';
    }
  });
  html += `<button type="button" class="save-draft-btn" data-mobile-crud-create="${crudKey}" style="margin-top:12px">Simpan</button>`;
  // Jurnal Guru: tambahkan input PDF di form Supabase
  if (moduleId === 'jurnal-guru') {
    html += `
      <div class="jf-upload-strip" style="margin-top:12px">
        <span class="jf-upload-icon">&#128196;</span>
        <div>
          <strong>Upload PDF Jurnal Guru</strong>
          <small>Pilih file PDF sebagai lampiran bukti mengajar.</small>
        </div>
      </div>
      <div class="jf-pdf-input-area">
        <label class="jf-pdf-pick-btn" for="jg-pdf-input">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Pilih File PDF</span>
        </label>
        <input type="file" id="jg-pdf-input" accept="application/pdf" multiple hidden data-jg-pdf-input />
        <small class="jf-pdf-hint">Format PDF saja \u2022 Maks 5MB per file</small>
      </div>
      <div class="jf-pdf-list" data-jg-pdf-list></div>
    `;
  }
  html += `</article></section>`;
  return html;
}

function quickActionButton(title, meta, icon, route) {
  return `
    <button type="button" class="action-card home-action-card" data-module-route="${route}">
      <span class="action-icon">${icon}</span>
      <span class="action-copy">
        <strong>${title}</strong>
        <small>${meta}</small>
      </span>
    </button>
  `;
}

function guruModuleCard(item) {
  return `
    <button type="button" class="guru-module-card" data-module-route="${item.route}" data-module-id="${item.id}">
      <span class="guru-module-icon">${item.icon}</span>
      <span class="guru-module-group">${item.group}</span>
      <h3 class="guru-module-title">${item.title}</h3>
      <p class="guru-module-meta">${item.meta}</p>
    </button>
  `;
}

function studentCard(student) {
  const safeName = String(student.name || '').replace(/"/g,'&quot;');
  const safeMeta = String(student.meta || '').replace(/"/g,'&quot;');
  const safeStatus = String(student.status || '').replace(/"/g,'&quot;');
  return `
    <article class="student-card" data-student-open data-st-name="${safeName}" data-st-meta="${safeMeta}" data-st-status="${safeStatus}" style="cursor:pointer">
      <span class="student-avatar">${student.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
      <div class="student-info">
        <h3 class="student-name">${student.name}</h3>
        <p class="student-meta">${student.meta}</p>
      </div>
      <span class="status-pill ${student.tone}">${student.status}</span>
    </article>
  `;
}

function scheduleCard(item) {
  return `
    <article class="schedule-card">
      <div class="schedule-time">${item.time}</div>
      <div class="student-info">
        <h3 class="schedule-title">${item.title}</h3>
        <p class="schedule-meta">${item.meta}</p>
      </div>
      <span class="status-pill ${item.tone}">${item.status}</span>
    </article>
  `;
}

function messageCard(item, idx) {
  return `
    <article class="message-card ${item.unread ? 'unread' : ''}" data-message-open="${idx}" style="cursor:pointer">
      <span class="student-avatar">${item.unread ? '<span class="msg-unread-dot"></span>' : ''}${item.sender.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
      <div class="message-info">
        <h3 class="message-title">${item.sender}</h3>
        <p class="message-preview">${item.preview}</p>
        <div class="message-actions">
          ${item.replied ? '<span class="status-pill green">✓ Dibalas</span>' : (item.unread ? '<span class="status-pill orange">● Belum dibaca</span>' : '<span class="status-pill blue">✓ Dibaca</span>')}
          <button type="button" class="message-reply-btn" data-message-open="${idx}">Buka &amp; Balas</button>
        </div>
      </div>
      <span class="message-time">${item.time}${item.jam ? '<span class="message-jam">' + item.jam + '</span>' : ''}</span>
    </article>
  `;
}

function announcementItem(item, idx) {
  const safeTitle = String(item.title || '').replace(/"/g,'&quot;');
  const safeMeta  = String(item.meta  || '').replace(/"/g,'&quot;');
  return `
    <article class="announcement-item" data-announcement-open data-ann-title="${safeTitle}" data-ann-meta="${safeMeta}" style="cursor:pointer">
      <div class="announcement-time">${item.time}</div>
      <div class="announcement-copy">
        <h4>${item.title}</h4>
        <p>${item.meta}</p>
      </div>
      <span class="status-pill ${item.tone}">${item.status}</span>
    </article>
  `;
}

function settingRow(title, meta, active, settingKey = '') {
  const toggle = settingKey
    ? `<button type="button" class="toggle ${active ? 'on' : ''}" data-setting-toggle="${settingKey}" aria-pressed="${active ? 'true' : 'false'}"><span>${active ? 'Aktif' : 'Mati'}</span></button>`
    : (active ? '<span class="toggle on" aria-hidden="true"></span>' : '');
  return `
    <article class="setting-row">
      <div>
        <h3 class="card-title">${title}</h3>
        <p class="card-meta">${meta}</p>
      </div>
      ${toggle}
    </article>
  `;
}

function settingAction(title, meta, target) {
  return `
    <button type="button" class="setting-row setting-action" data-action="${target}">
      <div>
        <h3 class="card-title">${title}</h3>
        <p class="card-meta">${meta}</p>
      </div>
      <span class="attendance-arrow">›</span>
    </button>
  `;
}

function sectionHead(title, action, actionTarget = '') {
  const actionHtml = actionTarget
    ? `<button type="button" class="section-link" data-action="${actionTarget}">${action}</button>`
    : (action ? `<span class="section-link" style="opacity:.55;cursor:default">${action}</span>` : '');
  return `
    <div class="section-head">
      <h2 class="section-title">${title}</h2>
      ${actionHtml}
    </div>
  `;
}

function ensureAnnStyles(){
  if(document.getElementById('ann-pro-styles')) return;
  var st = document.createElement('style');
  st.id = 'ann-pro-styles';
  st.textContent = '#appFloating .floating-backdrop{position:fixed;inset:0;background:rgba(2,6,23,.55);backdrop-filter:blur(2px);z-index:1000}#appFloating .announcement-popover{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:calc(100% - 28px);max-width:440px;max-height:82vh;overflow:auto;background:#ffffff !important;color:#0f172a !important;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 20px 52px rgba(2,6,23,.5);padding:16px;z-index:1001}#appFloating .announcement-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px}#appFloating .announcement-popover .card-label{color:#0f8394 !important;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}#appFloating .announcement-popover .announcement-title{color:#0f172a !important;font-size:16px;font-weight:800;margin:2px 0 0}#appFloating .close-chip{border:none;background:#f1f5f9;color:#475569;width:30px;height:30px;border-radius:50%;font-size:18px;line-height:1;cursor:pointer;flex:none}#appFloating .announcement-list{display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow:auto}#appFloating .announcement-item{display:flex;align-items:center;gap:10px;background:#f8fafc !important;border:1px solid #eef2f7;border-radius:12px;padding:10px 12px}#appFloating .announcement-item .announcement-time{font-size:11px;font-weight:800;color:#0f8394;flex:none;min-width:44px}#appFloating .announcement-item .announcement-copy{flex:1;min-width:0}#appFloating .announcement-item .announcement-copy h4{margin:0;font-size:13px;font-weight:800;color:#0f172a}#appFloating .announcement-item .announcement-copy p{margin:2px 0 0;font-size:12px;color:#64748b}#appFloating .announcement-footnote{margin:12px 2px 0;font-size:11px;color:#94a3b8;text-align:center}';
  (document.head || document.documentElement).appendChild(st);
}

function ensureAbsenTodayStyles(){
  if(document.getElementById('absen-today-lock-styles')) return;
  var st = document.createElement('style');
  st.id = 'absen-today-lock-styles';
  st.textContent = '#appFloating .premium-att-row.is-saved-today{border-color:#16a34a;background:linear-gradient(135deg,rgba(22,163,74,.10),rgba(15,23,42,.02))}#appFloating .premium-att-row.is-saved-today .absen-chip:disabled,#appFloating .absen-save-dock.is-locked .sticky-save-btn:disabled{opacity:.55;cursor:not-allowed;filter:grayscale(.25)}#appFloating .absen-saved-badge{display:inline-flex;align-items:center;gap:4px;margin:8px 0 0 52px;padding:5px 9px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-weight:800}#appFloating .absen-locked-note{margin-top:6px;color:#166534;font-weight:800}';
  (document.head || document.documentElement).appendChild(st);
}

function renderFloating() {
  ensureAbsenTodayStyles();
  const toastHtml = appState.toast ? `
    <div class="premium-snackbar ${appState.toast.tone || 'success'}" role="status">
      <span class="snack-icon">${appState.toast.icon || '&#10003;'}</span>
      <span class="snack-text">${appState.toast.text}</span>
    </div>` : '';

  const _dock = appState._absenDock;
  const dockHtml = _dock ? `
    <div class="sticky-action-bar is-floating absen-save-dock ${_dock.locked ? 'is-locked' : ''}">
      <div>
        <strong>${_dock.locked ? 'Absensi Hari Ini Selesai' : ('Simpan Absensi Kelas ' + _dock.kelas)}</strong>
        <span>${_dock.filled}/${_dock.total} siswa tercatat${_dock.savedToday ? ' · sudah tersimpan hari ini' : ''}</span>
      </div>
      <button type="button" class="sticky-save-btn" data-save-absensi ${_dock.locked ? 'disabled aria-disabled="true"' : ''}>${_dock.locked ? 'Sudah Absen' : 'Simpan'}</button>
    </div>` : '';

  if (!appState.showAnnouncements) {
    floatingEl.hidden = !(toastHtml || dockHtml);
    floatingEl.innerHTML = dockHtml + toastHtml;
    return;
  }

  floatingEl.hidden = false;
  ensureAnnStyles();
  const _pengRows = (appState.supabaseModules && appState.supabaseModules.pengumuman) || [];
  const _annHelper = window.ZymataMobileSupabase;
  let _annList;
  if (appState.syncMode === 'supabase-live') {
    _annList = (_pengRows.length && _annHelper && _annHelper.normalizeItem)
      ? _pengRows.slice(0, 5).map(r => { const it = _annHelper.normalizeItem(r, 'Pengumuman'); return announcementItem({ time: it.time, title: it.title, meta: it.meta, status: it.status, tone: it.tone }); }).join('')
      : '<p class="announcement-footnote" style="padding:10px 4px">Belum ada pengumuman.</p>';
  } else {
    _annList = announcements.slice(0, 5).map(announcementItem).join('');
  }
  floatingEl.innerHTML = `
    <div class="floating-backdrop" data-action="closeAnnouncements"></div>
    <article class="announcement-popover" role="dialog" aria-label="Pengumuman terbaru">
      <div class="announcement-head">
        <div>
          <span class="card-label">Pengumuman</span>
          <h3 class="announcement-title">Info terbaru</h3>
        </div>
        <button type="button" class="close-chip" data-action="closeAnnouncements" aria-label="Tutup pengumuman">×</button>
      </div>
      <div class="announcement-list">
        ${_annList}
      </div>
      <p class="announcement-footnote">Maksimal 5 pengumuman. Pesan wali tetap di tab Pesan.</p>
    </article>
    ${toastHtml}
  `;
}

// Helper: konversi dataUrl ke File object untuk upload ke Supabase
function dataUrlToFile(dataUrl, fileName) {
  var arr = dataUrl.split(',');
  var mime = arr[0].match(/:(.*?);/)[1];
  var bstr = atob(arr[1]);
  var n = bstr.length;
  var u8arr = new Uint8Array(n);
  while (n--) { u8arr[n] = bstr.charCodeAt(n); }
  return new File([u8arr], fileName, { type: mime });
}

function showError(msg) { showToast(msg || 'Terjadi kesalahan.', 'error', '&#9888;'); }

function showToast(text, tone = 'success', icon = '&#10003;') {
  appState.toast = { text, tone, icon };
  renderFloating();
  notifyFeedback(tone);
  clearTimeout(window.__ZYMATA_TOAST_TIMER__);
  window.__ZYMATA_TOAST_TIMER__ = setTimeout(() => {
    appState.toast = null;
    renderFloating();
  }, 2200);
}

function renderMessages() {
  return '<div id="zchat-host" class="zchat-host"></div>';
}

function mountGuruChat() {
  if (!window.ZymataChat) return;
  var rooms = [];
  var isWali = (appState.teacherRoleLabel === 'Wali kelas');
  var kelasUtama = String(appState.teacherClass || '').replace(/^kelas\s+/i, '').trim();
  // Grup kelas = SEMUA kelas yang diajar + wali kelas (bukan cuma wali kelas).
  // appState.guruKelasList sudah berisi: wali kelas + kelas_diajar + kelas dari jadwal mengajar.
  var daftarKelasGuru = Array.isArray(appState.guruKelasList) ? appState.guruKelasList.slice() : [];
  if (!daftarKelasGuru.length && kelasUtama) daftarKelasGuru = [kelasUtama];
  var seenKelas = {};
  daftarKelasGuru.forEach(function(k){
    var kk = String(k || '').replace(/^kelas\s+/i, '').trim();
    if (!kk || kk === 'Kelas belum terhubung' || kk === '-') return;
    var nk = kk.toUpperCase().replace(/\s+/g, '');
    if (seenKelas[nk]) return; seenKelas[nk] = 1;
    rooms.push({ key: kk, label: 'Kelas ' + kk });
  });
  rooms.push({ key: '__GURU__', label: 'Grup Guru' });
  var ses = window.ZymataMobileSupabase ? window.ZymataMobileSupabase.readSession() : null;
  var user = {
    id: String((ses && (ses.id || ses.username)) || appState.teacherName || 'guru'),
    nama: (ses && ses.nama) || appState.teacherName || 'Guru',
    peran: isWali ? 'Wali Kelas' : (appState.teacherJabatan || (ses && ses.role) || 'guru')
  };
  window.ZymataChat.mount({ hostId: 'zchat-host', rooms: rooms, user: user, defaultRoom: rooms[0].key });
}

function renderContent() {
  appState._absenDock = null;
  if (contentEl) contentEl.classList.remove('zchat-active');
  if (appState.activeTab.startsWith('module:')) {
    contentEl.innerHTML = renderModulePlaceholder(appState.activeTab.replace('module:', ''));
    return;
  }
  const renderers = {
    home: renderHome,
    teacherAttendance: renderTeacherAttendance,
    class: renderClass,
    schedule: renderSchedule,
    menu: renderMenu,
    messages: renderMessages,
    pesanLama: renderPesanLama,
    profile: renderProfile
  };
  contentEl.innerHTML = (renderers[appState.activeTab] || renderHome)();
  if (appState.activeTab === 'messages') { if (contentEl) contentEl.classList.add('zchat-active'); try { mountGuruChat(); } catch (e) { console.warn('[GuruChat]', e); } }
}

function renderNav() {
  const activeTab = appState.activeTab;
  const navTab = activeTab.startsWith('module:') ? 'menu'
    : activeTab === 'teacherAttendance' ? 'home'
    : activeTab;
  navEl.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === navTab);
  });
}

// === MODUL GURU: Navigasi Role Guru ===
function navigateTo(nextTab, opts = {}) {
  if (!(tabMeta[nextTab] || nextTab.startsWith('module:'))) return false;
  const changed = appState.activeTab !== nextTab || appState.showAnnouncements;
  appState.showAnnouncements = false;
  appState.activeTab = nextTab;
  render();
  if (changed) animateContent();
  if (!opts.skipHistory && window.history && window.history.pushState) {
    window.history.pushState({ tab: nextTab }, '', '#'+nextTab.replace(':','-'));
  }
  return true;
}

function goBackNative() {
  if (appState.showAnnouncements) {
    appState.showAnnouncements = false;
    render();
    return true;
  }
  if (appState.activeTab.startsWith('module:')) {
    navigateTo('menu', { skipHistory: true });
    return true;
  }
  if (appState.activeTab !== 'home') {
    navigateTo('home', { skipHistory: true });
    return true;
  }
  return false;
}

function guruNav(sectionId) {
  const routeMap = {
    beranda: 'home',
    'guru-menu': 'menu',
    menu: 'menu',
    'guru-jadwal': 'schedule',
    jadwal: 'schedule',
    'guru-pesan': 'messages',
    pesan: 'messages',
    'guru-profil': 'profile',
    profil: 'profile',
    'guru-kelas': 'class',
    'guru-data-siswa': 'class',
    kelas: 'class',
    'guru-absensi-guru': 'teacherAttendance',
    'absensi-guru': 'teacherAttendance'
  };
  const nextTab = routeMap[sectionId] || sectionId;
  if (tabMeta[nextTab] || nextTab.startsWith('module:')) {
    navigateTo(nextTab);
  }
  updateGuruBottomNav(sectionId);
}

// === MODUL GURU: Bottom Nav Active State ===
function updateGuruBottomNav(sectionId) {
  const activeTab = sectionId === 'beranda'
    ? 'home'
    : sectionId === 'guru-kelas' || sectionId === 'kelas'
      ? 'class'
    : sectionId === 'guru-jadwal'
      ? 'schedule'
      : sectionId === 'guru-pesan'
        ? 'messages'
        : sectionId === 'guru-profil'
          ? 'profile'
          : sectionId === 'home' || sectionId === 'class' || sectionId === 'schedule' || sectionId === 'messages' || sectionId === 'profile'
            ? sectionId
            : '';
  navEl.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === activeTab);
  });
}

window.guruNav = guruNav;
window.updateGuruBottomNav = updateGuruBottomNav;

function setActiveInSameGroup(button, selector, activeClass) {
  if (!button) return;
  activeClass = activeClass || 'on';
  var parent = button.closest('.chip-group, .ag-sesi-pills, .ag-status-pills, .kelas-pick-strip, .field-chip-row') || button.parentElement;
  var scope = parent || document;
  Array.prototype.forEach.call(scope.querySelectorAll(selector), function(el){
    el.classList.toggle(activeClass, el === button);
  });
}

function saveOnlyNoRender() {
  // Untuk pilihan kecil (chip/select) DOM browser sudah berubah sendiri.
  // Jangan panggil render() penuh karena itu membongkar appContent dan terlihat kedip.
  saveState();
}

function updateModuleScanNoRender(moduleId) {
  // Modul perkembangan (hafalan, ibadah, karakter, prestasi, dll):
  // update hanya kartu hasil scan supaya fungsi sama tapi layar tidak kedip.
  try {
    var wrap = document.querySelector('[data-module-scan-wrap="' + String(moduleId).replace(/"/g, '\"') + '"]');
    if (wrap) {
      var html = moduleScanBlock(moduleId);
      var tmp = document.createElement('div');
      tmp.innerHTML = html.trim();
      var fresh = tmp.firstElementChild;
      if (fresh) wrap.replaceWith(fresh);
    } else {
      // Kalau modul lama belum punya wrapper, fallback render agar fungsi tetap jalan.
      render();
    }
    saveState();
  } catch (e) {
    console.warn('[ModuleScan] update ringan gagal, fallback render:', e && e.message ? e.message : e);
    render();
  }
}

function bindActions() {
  if (actionsBound) return;
  actionsBound = true;

  document.addEventListener('click', async (event) => {
    const tabButton = event.target.closest('[data-tab]');
    if (tabButton) {
      const nextTab = tabButton.dataset.tab;
      if (tabMeta[nextTab] && (appState.activeTab !== nextTab || appState.showAnnouncements)) {
        navigateTo(nextTab);
      }
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
      const target = actionButton.dataset.action;
      if (target === 'toggleAnnouncements') {
        appState.showAnnouncements = !appState.showAnnouncements;
        render();
        return;
      }
      if (target === 'closeAnnouncements') {
        appState.showAnnouncements = false;
        render();
        return;
      }
      if (target === 'openRoleChooser') {
        try { if (window.ZymataMobileSupabase) await window.ZymataMobileSupabase.signOut(); }
        catch (_) { try { sessionStorage.removeItem('siakad_session_user'); localStorage.removeItem('siakad_session_user'); } catch(_e) {} }
        window.location.href = ROLE_CHOOSER_PATH;
        return;
      }
      if (target === 'backToMenu') {
        navigateTo('menu');
        return;
      }
      if ((tabMeta[target] || target.startsWith('module:')) && appState.activeTab !== target) {
        navigateTo(target);
      }
      return;
    }

    const flowButton = event.target.closest('[data-flow-mode]');
    if (flowButton) {
      appState.showAnnouncements = false;
      appState.moduleInputModes[flowButton.dataset.flowModule] = flowButton.dataset.flowMode;
      render();
      return;
    }

    const moduleScanBtn = event.target.closest('[data-module-scan]');
    if (moduleScanBtn) {
      const mid = moduleScanBtn.dataset.moduleScan;
      openQrScanner(async function(code){
        var raw = String(code || '').trim();
        if (!raw) { showError('Kode QR kosong / tidak terbaca.'); return; }
        var hit = await agResolveStudent(raw);
        if (!hit) { showToast(agScanNotFoundMsg(raw), 'error', '&#9888;'); return; }
        if (!agIsTaughtClass(hit.kelas)) { showToast(hit.name + ' (kelas ' + hit.kelas + ') di luar kelas yang Anda ajar.', 'error', '&#9888;'); return; }
        if (!appState.moduleScanStudent) appState.moduleScanStudent = {};
        appState.moduleScanStudent[mid] = { nis: hit.nis, kelas: hit.kelas, name: hit.name };
        updateModuleScanNoRender(mid);
        showToast(hit.name + ' (' + hit.kelas + ') terpilih', 'success', '&#10003;');
      });
      return;
    }
    const moduleScanClearBtn = event.target.closest('[data-module-scan-clear]');
    if (moduleScanClearBtn) {
      const midc = moduleScanClearBtn.dataset.moduleScanClear;
      if (appState.moduleScanStudent) delete appState.moduleScanStudent[midc];
      updateModuleScanNoRender(midc);
      return;
    }

    const dashScanBtn = event.target.closest('[data-dash-scan]');
    if (dashScanBtn) {
      const dest = dashScanBtn.dataset.dashScan;
      openQrScanner(async function(code){
        var raw = String(code || '').trim();
        if (!raw) { showError('Kode QR kosong / tidak terbaca.'); return; }
        var hit = await agResolveStudent(raw);
        if (!hit) { showToast(agScanNotFoundMsg(raw), 'error', '&#9888;'); return; }
        var kelas = hit.kelas, nama = hit.name, nis = hit.nis;
        if (dest === 'catatan') {
          if (!agIsTaughtClass(kelas)) { showToast(nama + ' (kelas ' + kelas + ') di luar kelas yang Anda ajar.', 'error', '&#9888;'); return; }
          var cs = getCatatanState();
          cs.kelas = kelas;
          cs.siswa = nis;
          navigateTo('module:catatan-siswa');
          showToast('Catatan untuk ' + nama + ' (' + kelas + ')', 'success', '&#10003;');
        } else if (dest === 'pelanggaran') {
          appState.pelanggaranScan = { nis: nis, kelas: kelas, name: nama };
          navigateTo('module:pelanggaran');
          showToast('Pelanggaran untuk ' + nama + ' (' + kelas + ')', 'success', '&#10003;');
        }
      });
      return;
    }

    const moduleButton = event.target.closest('[data-module-route]');
    if (moduleButton) {
      appState.showAnnouncements = false;
      navigateTo(moduleButton.dataset.moduleRoute);
      return;
    }

    const jadwalDayBtn = event.target.closest('[data-jadwal-day]');
    if (jadwalDayBtn) {
      appState.jadwalSelectedDay = parseInt(jadwalDayBtn.dataset.jadwalDay, 10);
      render();
      return;
    }

    const kelasPickBtn = event.target.closest('[data-kelas-pick]');
    if (kelasPickBtn) {
      const k = kelasPickBtn.dataset.kelasPick || '';
      if (k && k !== appState.selectedKelas) {
        appState.selectedKelas = k;
        if (tabMeta && tabMeta.class) {
          tabMeta.class.title = 'Kelas ' + k;
          tabMeta.class.eyebrow = 'Kelas ' + k;
        }
        render();
      }
      return;
    }

    const nilaiJenisBtn = event.target.closest('[data-nilai-jenis]');
    if (nilaiJenisBtn) {
      const j = nilaiJenisBtn.dataset.nilaiJenis || 'nilai';
      if (j !== (appState.nilaiInputJenis || 'nilai')) {
        appState.nilaiInputJenis = j;
        render();
      }
      return;
    }

    const annOpen = event.target.closest('[data-announcement-open]');
    if (annOpen) {
      const t = annOpen.dataset.annTitle || 'Pengumuman';
      const m = annOpen.dataset.annMeta  || '';
      showToast(t + (m ? ' · ' + m : ''), 'info', 'i');
      return;
    }
    const studentOpen = event.target.closest('[data-student-open]');
    if (studentOpen) {
      const nm = studentOpen.dataset.stName   || 'Siswa';
      const mt = studentOpen.dataset.stMeta   || '';
      const ss = studentOpen.dataset.stStatus || '';
      showToast(nm + (mt ? ' · ' + mt : '') + (ss ? ' · ' + ss : ''), 'info', 'i');
      return;
    }
    const msgBack = event.target.closest('[data-message-back]');
    if (msgBack) {
      appState.activeMessageIdx = null;
      render();
      return;
    }
    const msgOpen = event.target.closest('[data-message-open]');
    if (msgOpen) {
      const idx = parseInt(msgOpen.dataset.messageOpen, 10);
      if (!isNaN(idx) && messages[idx]) {
        appState.activeMessageIdx = idx;
        // mark as read locally
        messages[idx].unread = false;
        appState.unreadMessages = messages.filter(function(m){ return m.unread; }).length;
        render();
      }
      return;
    }
    const msgMarkRead = event.target.closest('[data-message-mark-read]');
    if (msgMarkRead) {
      const idx = parseInt(msgMarkRead.dataset.messageMarkRead, 10);
      if (!isNaN(idx) && messages[idx]) {
        messages[idx].unread = false;
        appState.unreadMessages = messages.filter(function(m){ return m.unread; }).length;
        // Simpan status dibaca ke Supabase (API hanya punya upsert)
        try {
          const r = messages[idx].raw;
          const db = window.db || window.ZymataMobileSupabase;
          if (r && r.id && db && typeof db.upsert === 'function') {
            db.upsert('surat', { id: r.id, status: 'Dibaca' }).catch(function(){});
            r.status = 'Dibaca';
          }
        } catch(_) {}
        saveDataCache();
        saveState();
        render();
        showToast('Pesan ditandai dibaca', 'success', '✓');
      }
      return;
    }
    const msgSend = event.target.closest('[data-message-send]');
    if (msgSend) {
      const idx = parseInt(msgSend.dataset.messageSend, 10);
      const ta = document.getElementById('reply-input');
      const text = ta ? String(ta.value || '').trim() : '';
      if (!text) { showToast('Tulis balasan dulu', 'warning', '✏️'); if (ta) ta.focus(); return; }
      if (!isNaN(idx) && messages[idx]) {
        messages[idx].unread = false;
        messages[idx].replied = true;
        messages[idx].balasan = text;
        appState.unreadMessages = messages.filter(function(m){ return m.unread; }).length;
        // Kirim balasan ke Supabase (disimpan di payload JSON + status Dibalas)
        try {
          const r = messages[idx].raw;
          const db = window.db || window.ZymataMobileSupabase;
          if (r && r.id && db && typeof db.upsert === 'function') {
            var pl = {};
            try { pl = r.payload ? ((typeof r.payload === 'string') ? JSON.parse(r.payload) : r.payload) : {}; } catch(_) {}
            pl.balasan_guru = text;
            pl.dibalas_at = new Date().toISOString();
            db.upsert('surat', { id: r.id, payload: JSON.stringify(pl), status: 'Dibalas' }).catch(function(){});
            r.payload = pl;
            r.status = 'Dibalas';
          }
        } catch(_) {}
        saveDataCache();
        saveState();
        render();
        showToast('Balasan terkirim', 'success', '✓');
      }
      return;
    }

    const primaryButton = event.target.closest('[data-primary-action]');
    if (primaryButton) {
      appState.showAnnouncements = false;
      if (appState.activeTab === 'home') {
        navigateTo('teacherAttendance');
        return;
      }
      else if (appState.activeTab === 'teacherAttendance') {
        const updated = await updateTeacherAttendance(appState.teacherAttendance.checkIn ? 'checkOut' : 'checkIn');
        if (!updated) {
          saveState();
          render();
          return;
        }
      }
      else if (appState.activeTab.startsWith('module:')) {
        navigateTo('menu');
        return;
      }
      else if (appState.activeTab === 'class') appState.attendanceDone = Math.min(appState.attendanceTotal, appState.attendanceDone + 1);
      else if (appState.activeTab === 'messages') appState.unreadMessages = 0;
      else if (appState.activeTab === 'schedule') appState.agendaDone = true;
      render();
      return;
    }

    const saveAbsensi = event.target.closest('[data-save-absensi]');
    if (saveAbsensi) {
      const as = getAbsenSiswaState();
      const siswaKelas = getSiswaByKelas(as.kelas);
      const total = siswaKelas.length;
      const statusMap = appState.absenSiswaStatus || {};
      const todayMap = getTodayAbsensiMap(as.kelas);
      const tandai = siswaKelas.filter(function(s){ return statusMap[s.nis] && !todayMap[String(s.nis)]; });
      const sudahHariIni = siswaKelas.filter(function(s){ return todayMap[String(s.nis)]; }).length;
      if (sudahHariIni >= total && total > 0) { showToast('Absensi kelas ' + as.kelas + ' sudah dilakukan hari ini.', 'error', '&#9888;'); return; }
      if (!tandai.length) { showToast(sudahHariIni ? 'Siswa yang dipilih sudah diabsen hari ini.' : 'Tandai status minimal satu siswa dulu.', 'error', '&#9888;'); return; }
      // Mode Supabase: simpan setiap siswa yang sudah ditandai ke tabel absensi_siswa sekaligus
      if (appState.syncMode === 'supabase-live' && window.ZymataMobileSupabase && window.ZymataMobileSupabase.createSpecificOrFallback) {
        const labelMap = { H:'Hadir', I:'Izin', S:'Sakit', A:'Alpa' };
        showToast('Menyimpan absensi ' + as.kelas + ' \u2026', 'success', '&#8987;');
        var okCount = 0, gagalCount = 0;
        for (var ai = 0; ai < tandai.length; ai++) {
          var sis = tandai[ai];
          var statusLabel = labelMap[statusMap[sis.nis]] || 'Hadir';
          var absenPayload = {
            text: statusLabel,
            status: statusLabel,
            role: 'Guru',
            module: appState.activeTab,
            fields: { tanggal: agTodayISO(), kelas_id: as.kelas, siswa_id: sis.nis, status: statusLabel },
            __siswa: { nama: sis.name, kelas: as.kelas, nis: sis.nis }
          };
          try { await window.ZymataMobileSupabase.createSpecificOrFallback('guru:absensi-siswa', absenPayload); okCount++; }
          catch (errSave) { gagalCount++; console.warn('[Absensi] gagal simpan', sis.nis, errSave && errSave.message ? errSave.message : errSave); }
        }
        appState.absenSiswaStatus = {};
        appState.riwayatAbsenTanggal = null;
        appState.riwayatAbsenOpen = true;
        await hydrateGuruFromSupabase();
        if (gagalCount) showToast('Absensi ' + as.kelas + ' tersimpan ' + okCount + ', gagal ' + gagalCount + '.', 'error', '&#9888;');
        else showToast('Absensi ' + as.kelas + ' tersimpan \u00b7 ' + okCount + ' siswa' + (sudahHariIni ? ' · ' + sudahHariIni + ' sudah ada' : ''), 'success', '&#10003;');
        return;
      }
      // Mode lokal (tanpa Supabase): simpan draft seperti semula
      const filled = tandai.length;
      appState.offlineDrafts += 1;
      appState.lastSyncLabel = `Absensi kelas ${as.kelas} tersimpan (${filled}/${total})`;
      render();
      showToast(`Absensi ${as.kelas} tersimpan · ${filled}/${total} siswa`, 'success', '&#10003;');
      return;
    }

    const absenStatusBtn = event.target.closest('[data-absen-status]');
    if (absenStatusBtn) {
      if (absenStatusBtn.disabled || absenStatusBtn.getAttribute('aria-disabled') === 'true') {
        showToast('Siswa ini sudah diabsen hari ini.', 'error', '&#9888;');
        return;
      }
      appState.absenSiswaStatus = appState.absenSiswaStatus || {};
      appState.absenSiswaStatus[absenStatusBtn.dataset.absenNis] = absenStatusBtn.dataset.absenStatus;
      updateAbsenStatusWithoutFullRender(absenStatusBtn.dataset.absenNis);
      saveState();
      return;
    }

    const absenScanBtn = event.target.closest('[data-absen-scan]');
    if (absenScanBtn) {
      openQrScanner(function(code){
        var nis = String(agParseScan(code) || '').trim();
        if (!nis) { showError('Kode QR kosong / tidak terbaca.'); return; }
        var as = getAbsenSiswaState();
        var siswaKelas = getSiswaByKelas(as.kelas) || [];
        var found = siswaKelas.find(function(s){ return String(s.nis) === nis; });
        if (!found) {
          showToast('NIS "' + nis + '" tidak ada di kelas ' + as.kelas + '.', 'error', '&#9888;');
          return;
        }
        if (getTodayAbsensiMap(as.kelas)[String(found.nis)]) {
          showToast(found.name + ' sudah diabsen hari ini.', 'error', '&#9888;');
          return;
        }
        appState.absenSiswaStatus = appState.absenSiswaStatus || {};
        appState.absenSiswaStatus[found.nis] = 'H';
        updateAbsenStatusWithoutFullRender(found.nis);
        saveState();
        showToast(found.name + ' ditandai Hadir', 'success', '&#10003;');
      });
      return;
    }

    const scanBtn = event.target.closest('[data-qr-scan]');
    if (scanBtn) {
      const sKey = scanBtn.dataset.qrScan;
      openQrScanner(function(code){
        code = String(agParseScan(code) || '').trim();
        if (!code) { showError('Kode QR kosong / tidak terbaca.'); return; }
        const el = document.querySelector('[data-form-key="'+sKey+'"][data-qr-target]')
          || document.querySelector('[data-form-key="'+sKey+'"][data-module-field]');
        if (!el) { showError('Kolom input tidak ditemukan.'); return; }
        if (el.tagName === 'SELECT') {
          if (sKey === 'guru:pelanggaran' && window.ZymataMobileSupabase) {
            // Langsung query Supabase — siswa pelanggaran bisa dari kelas mana pun
            // FIX: simpan selector string, bukan referensi el — karena render() bisa
            // mengganti DOM saat menunggu async Supabase, membuat el jadi stale/detached.
            var pelSelectorBase = '[data-form-key="'+sKey+'"]';
            showToast('Mencari siswa...', 'info', '&#128269;');
            window.ZymataMobileSupabase.select('siswa', { eq: { nis: code.trim() }, limit: 1 })
              .then(function(res) {
                // Re-query DOM setelah async selesai agar tidak pakai elemen stale
                var elFresh = document.querySelector(pelSelectorBase+'[data-qr-target]')
                  || document.querySelector(pelSelectorBase+'[data-module-field]');
                if (!elFresh) { showToast('Form tidak ditemukan, coba scan ulang.', 'error', '&#9888;'); return; }
                if (res && !res.error && Array.isArray(res.data) && res.data.length) {
                  var s = res.data[0];
                  var sNis = String(s.nis || s.nisn || '').trim();
                  var sNama = String(s.nama || s.nama_siswa || s.name || 'Siswa').trim();
                  var sKelas = String(s.kelas || s.kelas_id || '').trim();
                  // Cek apakah option sudah ada, kalau belum baru tambah
                  var existOpt = Array.from(elFresh.options).find(function(o){ return o.value === sNis; });
                  if (!existOpt) {
                    var newOpt = document.createElement('option');
                    newOpt.value = sNis;
                    newOpt.textContent = sNama + ' (' + sNis + ')';
                    elFresh.appendChild(newOpt);
                  }
                  elFresh.value = sNis;
                  // FIX: untuk pelanggaran, kelas siswa bisa dari kelas mana pun
                  // — tambahkan option kelas jika belum ada di dropdown, lalu set value
                  var kelasEl = document.querySelector(pelSelectorBase+'[data-module-field="kelas"]');
                  if (kelasEl && sKelas) {
                    var kelasExist = Array.from(kelasEl.options).find(function(o){ return o.value === sKelas; });
                    if (!kelasExist) {
                      var newKelasOpt = document.createElement('option');
                      newKelasOpt.value = sKelas;
                      newKelasOpt.textContent = sKelas;
                      kelasEl.appendChild(newKelasOpt);
                    }
                    kelasEl.value = sKelas;
                  }
                  if (sKelas) {
                    if (!SISWA_PER_KELAS[sKelas]) SISWA_PER_KELAS[sKelas] = [];
                    if (!SISWA_PER_KELAS[sKelas].find(function(x){ return String(x.nis) === sNis; })) SISWA_PER_KELAS[sKelas].push({ nis: sNis, name: sNama });
                  }
                  showToast('Ditemukan: ' + sNama + ' – Kelas ' + sKelas, 'success', '&#10003;');
                } else {
                  elFresh.value = '';
                  showToast('"'+code+'" tidak ditemukan di data siswa.', 'error', '&#9888;');
                }
              })
              .catch(function(){
                var elFresh = document.querySelector(pelSelectorBase+'[data-qr-target]')
                  || document.querySelector(pelSelectorBase+'[data-module-field]');
                if (elFresh) elFresh.value = '';
                showToast('Gagal mencari siswa. Periksa koneksi.', 'error', '&#9888;');
              });
          } else {
            if (el.hasAttribute('data-siswa-select')) {
              var kelasScan = agFindKelasByNis(code.trim());
              if (kelasScan) {
                agFillSiswaOptions(el, kelasScan);
                var kelasSelScan = document.querySelector('select[data-form-key="'+sKey+'"][data-kelas-select]');
                if (kelasSelScan) kelasSelScan.value = kelasScan;
              }
            }
            var needle = code.toLowerCase();
            var opts = Array.from(el.options);
            var opt = opts.find(function(o){ return o.value && o.value.toLowerCase() === needle; })
              || opts.find(function(o){ return (o.textContent || '').toLowerCase().replace(/\s*\(.*\)\s*$/, '').trim() === needle; })
              || opts.find(function(o){ return (o.textContent || '').toLowerCase().indexOf(needle) !== -1; });
            if (opt) { el.value = opt.value; showToast('Siswa terpilih: '+opt.textContent, 'success', '&#10003;'); }
            else { el.value = ''; showToast('"'+code+'" tidak cocok dengan daftar siswa.', 'error', '&#9888;'); }
          }
        } else {
          el.value = code; showToast('Terisi: '+code, 'success', '&#10003;');
        }
      });
      return;
    }

    // === Mutabaah Rumah: guru memberi penilaian (problem/kendala + konfirmasi wali) ke data wali ===
    const mrnSaveBtn = event.target.closest('[data-mrn-save]');
    if (mrnSaveBtn) {
      var _Sm = window.ZymataMobileSupabase;
      if (!_Sm || !_Sm.upsert) { showError('Koneksi Supabase belum siap.'); return; }
      var mrnCard = mrnSaveBtn.closest('article');
      var mrnKendalaEl = mrnCard ? mrnCard.querySelector('[data-mrn-field="kendala"]') : null;
      var mrnKonfEl = mrnCard ? mrnCard.querySelector('[data-mrn-field="konfirmasi_wali"]') : null;
      var mrnKendala = mrnKendalaEl ? String(mrnKendalaEl.value||'').trim() : '';
      var mrnKonf = mrnKonfEl ? String(mrnKonfEl.value||'').trim() : '';
      var mrnId = mrnSaveBtn.getAttribute('data-mrn-id') || '';
      var mrnSiswa = mrnSaveBtn.getAttribute('data-mrn-siswa') || '';
      var mrnTgl = mrnSaveBtn.getAttribute('data-mrn-tanggal') || '';
      try {
        var mrnBody = { kendala: mrnKendala, konfirmasi_wali: (mrnKonf === 'Dikonfirmasi') };
        mrnBody.status_review = mrnKendala ? 'Perlu Tindak Lanjut' : 'Sudah dinilai';
        var mrnRes;
        if (mrnId) {
          mrnBody.id = mrnId;
          mrnRes = await _Sm.upsert('mutabaah_rumah', mrnBody, 'id');
        } else if (mrnSiswa && mrnTgl) {
          mrnBody.siswa_id = mrnSiswa;
          mrnBody.tanggal = mrnTgl;
          mrnRes = await _Sm.upsert('mutabaah_rumah', mrnBody, 'siswa_id,tanggal');
        } else {
          showToast('Data ini belum punya ID untuk dinilai.', 'error', '&#9888;');
          return;
        }
        if (mrnRes && mrnRes.error) throw mrnRes.error;
        showToast('Penilaian tersimpan.', 'success', '&#10003;');
        await hydrateGuruFromSupabase();
      } catch (error) { showError(error && error.message ? error.message : 'Gagal menyimpan penilaian.'); }
      return;
    }

    // === Mutabaah Quran: guru menilai (ziyadah sekolah + status setoran + catatan guru) data wali ===
    const mqnSaveBtn = event.target.closest('[data-mqn-save]');
    if (mqnSaveBtn) {
      var _SmQ = window.ZymataMobileSupabase;
      if (!_SmQ || !_SmQ.upsert) { showError('Koneksi Supabase belum siap.'); return; }
      var mqnCard = mqnSaveBtn.closest('article');
      var mqnZiyEl = mqnCard ? mqnCard.querySelector('[data-mqn-field="ziyadah_sekolah"]') : null;
      var mqnStatEl = mqnCard ? mqnCard.querySelector('[data-mqn-field="status_setoran"]') : null;
      var mqnCatEl = mqnCard ? mqnCard.querySelector('[data-mqn-field="catatan_guru"]') : null;
      var mqnZiy = mqnZiyEl ? String(mqnZiyEl.value||'').trim() : '';
      var mqnStat = mqnStatEl ? String(mqnStatEl.value||'').trim() : '';
      var mqnCat = mqnCatEl ? String(mqnCatEl.value||'').trim() : '';
      var mqnId = mqnSaveBtn.getAttribute('data-mqn-id') || '';
      var mqnSiswa = mqnSaveBtn.getAttribute('data-mqn-siswa') || '';
      var mqnTgl = mqnSaveBtn.getAttribute('data-mqn-tanggal') || '';
      try {
        var mqnBody = { ziyadah_sekolah: mqnZiy, status_setoran: mqnStat, catatan_guru: mqnCat };
        if (mqnStat) mqnBody.status_review = 'Sudah dinilai';
        var mqnRes;
        if (mqnId) {
          mqnBody.id = mqnId;
          mqnRes = await _SmQ.upsert('mutabaah_quran', mqnBody, 'id');
        } else if (mqnSiswa && mqnTgl) {
          mqnBody.siswa_id = mqnSiswa;
          mqnBody.tanggal = mqnTgl;
          mqnRes = await _SmQ.upsert('mutabaah_quran', mqnBody, 'siswa_id,tanggal');
        } else {
          showToast('Data ini belum punya ID untuk dinilai.', 'error', '&#9888;');
          return;
        }
        if (mqnRes && mqnRes.error) throw mqnRes.error;
        showToast('Penilaian tersimpan.', 'success', '&#10003;');
        await hydrateGuruFromSupabase();
      } catch (error) { showError(error && error.message ? error.message : 'Gagal menyimpan penilaian.'); }
      return;
    }

    // === Tabungan Siswa: simpan dengan hitung debit/kredit/saldo (paritas web admin) ===
    const tabunganSaveBtn = event.target.closest('[data-mobile-crud-create="guru:tabungan"]');
    if (tabunganSaveBtn) {
      var _tv = function(fk){ var el = document.querySelector('[data-form-key="guru:tabungan"][data-module-field="'+fk+'"]'); return el ? String(el.value||'').trim() : ''; };
      var selNis = _tv('siswa_id');
      var kelasSel = _tv('kelas');
      var jenis = _tv('jenis') || 'Setoran';
      var nominal = Number(String(_tv('nominal')).replace(/[^0-9.-]/g,'')) || 0;
      var metode = _tv('metode') || 'Tunai';
      var keterangan = _tv('keterangan');
      if (!selNis) { showToast('Pilih siswa dulu.', 'error', '&#9888;'); return; }
      if (!(nominal > 0)) { showToast('Nominal harus lebih dari 0.', 'error', '&#9888;'); return; }
      var _S = window.ZymataMobileSupabase;
      if (!_S || !_S.select || !_S.upsert) { showError('Koneksi Supabase belum siap.'); return; }
      var isSetor = /setor|masuk/i.test(jenis);
      // Nama & kelas siswa dari roster lokal
      var namaSiswa = '', kelasSiswa = kelasSel || '';
      (function(){
        var kandidat = kelasSel ? [kelasSel] : (KELAS_LIST || []);
        kandidat.some(function(kls){
          var f = (SISWA_PER_KELAS[kls]||[]).find(function(s){ return String(s.nis) === selNis; });
          if (f) { namaSiswa = f.name; kelasSiswa = kls; return true; }
          return false;
        });
      })();
      try {
        // Ambil siswa_id resmi dari tabel siswa agar pengelompokan saldo di web admin konsisten
        var siswaId = '';
        try {
          var rSis = await _S.select('siswa', { eq: { nis: selNis }, limit: 1 });
          if (rSis && !rSis.error && Array.isArray(rSis.data) && rSis.data.length) {
            var sisRow = rSis.data[0];
            siswaId = String(sisRow.id || sisRow.siswa_id || '');
            if (!namaSiswa) namaSiswa = sisRow.nama || sisRow.nama_siswa || '';
            if (!kelasSiswa) kelasSiswa = sisRow.kelas || '';
          }
        } catch(e){}
        // Hitung saldo berjalan siswa (sum debit - kredit) sama seperti recalc/saldoMap web admin
        var saldoBerjalan = 0;
        var existing = [];
        if (siswaId) {
          var rEx = await _S.select('tabungan_siswa', { eq: { siswa_id: siswaId }, limit: 3000 });
          if (rEx && !rEx.error && Array.isArray(rEx.data)) existing = rEx.data;
        }
        if (!existing.length && selNis) {
          var rEx2 = await _S.select('tabungan_siswa', { eq: { nis: selNis }, limit: 3000 });
          if (rEx2 && !rEx2.error && Array.isArray(rEx2.data)) existing = rEx2.data;
        }
        existing.forEach(function(r){
          var d = Number(r.debit||0) || 0, k = Number(r.kredit||0) || 0;
          if (!d && !k) { var nn = Number(r.nominal||0) || 0; if (/tarik|keluar|penarikan/i.test(r.jenis||'')) k = nn; else d = nn; }
          saldoBerjalan += d - k;
        });
        if (!isSetor && nominal > saldoBerjalan) {
          showToast('Saldo tidak cukup. Saldo saat ini: Rp ' + Number(saldoBerjalan).toLocaleString('id-ID'), 'error', '&#9888;');
          return;
        }
        var debit = isSetor ? nominal : 0;
        var kredit = isSetor ? 0 : nominal;
        var saldoBaru = saldoBerjalan + debit - kredit;
        var rowUid = 'tab-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
        var payload = {
          client_key: 'default',
          row_uid: rowUid,
          siswa_id: siswaId || null,
          nis: selNis || null,
          nama_siswa: namaSiswa || null,
          kelas: kelasSiswa || null,
          jenis: isSetor ? 'Setoran' : 'Penarikan',
          nominal: nominal,
          debit: debit,
          kredit: kredit,
          saldo: saldoBaru,
          keterangan: keterangan || null,
          tanggal: agTodayISO(),
          petugas: appState.teacherName || 'Guru',
          metode: metode || 'Tunai'
        };
        var resTab = await _S.upsert('tabungan_siswa', payload, 'row_uid');
        if (resTab && resTab.error) throw resTab.error;
        ['nominal','keterangan'].forEach(function(fk){ var el = document.querySelector('[data-form-key="guru:tabungan"][data-module-field="'+fk+'"]'); if (el) el.value=''; });
        showToast((isSetor?'Setoran':'Penarikan')+' Rp '+Number(nominal).toLocaleString('id-ID')+' tersimpan. Saldo: Rp '+Number(saldoBaru).toLocaleString('id-ID'), 'success', '&#10003;');
        await hydrateGuruFromSupabase();
      } catch (error) { showError(error && error.message ? error.message : 'Gagal menyimpan tabungan.'); }
      return;
    }

    const createCrud = event.target.closest('[data-mobile-crud-create]');
    if (createCrud) {
      const key = createCrud.dataset.mobileCrudCreate;
      const fields = Array.from(document.querySelectorAll(`[data-form-key="${key}"][data-module-field]`));
      const fieldPayload = {};
      fields.forEach(function(field) {
        fieldPayload[field.dataset.moduleField] = String(field.value || '').trim();
      });
      const schemaDef = (window.ZymataMobileSupabase && window.ZymataMobileSupabase.MODULE_FORM_SCHEMA && window.ZymataMobileSupabase.MODULE_FORM_SCHEMA[key]) || null;
      if (schemaDef && Array.isArray(schemaDef.fields)) {
        const missing = schemaDef.fields.filter(function(f){
          const req = (f.label && f.label.indexOf('*') !== -1) || f.type === 'siswa-select' || f.required;
          return req && !String(fieldPayload[f.key] || '').trim();
        });
        if (missing.length) {
          showToast('Lengkapi dulu: ' + missing.map(function(f){ return String(f.label||f.key).replace('*','').trim(); }).join(', '), 'error', '&#9888;');
          return;
        }
      }
      const input = document.querySelector(`[data-mobile-crud-text="${key}"]`);
      const text = String(input?.value || Object.values(fieldPayload).filter(Boolean).join(' · ') || '').trim();
      if (!text) { showToast('Isi data dulu sebelum simpan.', 'error', '&#9888;'); return; }
      try {
        const payload = { text, status: 'Aktif', role: 'Guru', module: appState.activeTab };
        // Kirim identitas guru agar Jurnal Guru/Jurnal Kelas tampil nama guru di web admin.
        payload.__guru = {
          nama: appState.teacherName || '',
          nip: appState.teacherNip || '',
          jabatan: appState.teacherJabatan || ''
        };
        if (fields.length) payload.fields = fieldPayload;
        // Lengkapi nama & kelas siswa terpilih agar datanya tampil benar di aplikasi web
        try {
          const siswaField = (schemaDef && Array.isArray(schemaDef.fields)) ? schemaDef.fields.find(function(f){ return f.type === 'siswa-select'; }) : null;
          const selNis = siswaField ? String(fieldPayload[siswaField.key] || '').trim() : '';
          if (selNis) {
            (KELAS_LIST || []).some(function(kls){
              const found = (SISWA_PER_KELAS[kls] || []).find(function(s){ return String(s.nis) === selNis; });
              if (found) { payload.__siswa = { nama: found.name, kelas: kls, nis: found.nis }; return true; }
              return false;
            });
          }
        } catch (e) {}
        // Upload PDF ke Supabase Storage jika ada file PDF terlampir
        var pdfFileInput = document.querySelector('[data-jg-pdf-input]');
        var pdfFiles = pdfFileInput && pdfFileInput.files && pdfFileInput.files.length ? Array.from(pdfFileInput.files) : [];
        // Cek juga dari state lokal (yang sudah dipilih sebelumnya)
        var jgState = getJurnalGuruState();
        if (jgState.pdfFiles && jgState.pdfFiles.length) {
          // Sudah ada di state lokal, konversi dataUrl ke Blob
          jgState.pdfFiles.forEach(function(pf){
            if (pf.dataUrl) {
              try { pdfFiles.push(dataUrlToFile(pf.dataUrl, pf.name)); } catch(e) {}
            }
          });
        }
        if (pdfFiles.length && window.ZymataMobileSupabase && window.ZymataMobileSupabase.uploadPdfFile) {
          var uploadedUrls = [];
          for (var pi = 0; pi < pdfFiles.length; pi++) {
            try {
              var upRes = await window.ZymataMobileSupabase.uploadPdfFile(pdfFiles[pi], 'jurnal-guru');
              uploadedUrls.push(upRes.url);
            } catch(uploadErr) {
              console.warn('Upload PDF gagal:', uploadErr);
              showToast('Upload PDF gagal: ' + (uploadErr.message || 'error'), 'error', '⚠');
            }
          }
          if (uploadedUrls.length) payload.pdf_files = uploadedUrls;
        }
        const saved = await window.ZymataMobileSupabase.createSpecificOrFallback(key, payload);
        if (input) input.value = '';
        fields.forEach(function(field) { field.value = ''; });
        showToast('Data berhasil disimpan', 'success', '&#10003;');
        await hydrateGuruFromSupabase();
      } catch (error) { showError(error && error.message ? error.message : 'Gagal menyimpan data.'); }
      return;
    }

    const updateCrud = event.target.closest('[data-mobile-crud-update]');
    if (updateCrud) {
      try {
        await window.ZymataMobileSupabase.updateAppModuleRow(updateCrud.dataset.mobileCrudUpdate, { status: 'Selesai' });
        showToast('Data diperbarui', 'success', '&#10003;');
        await hydrateGuruFromSupabase();
      } catch (error) { showError(error && error.message ? error.message : 'Gagal update data.'); }
      return;
    }

    const deleteCrud = event.target.closest('[data-mobile-crud-delete]');
    if (deleteCrud) {
      try {
        await window.ZymataMobileSupabase.deleteAppModuleRow(deleteCrud.dataset.mobileCrudDelete);
        showToast('Data dihapus', 'success', '&#10003;');
        await hydrateGuruFromSupabase();
      } catch (error) { showError(error && error.message ? error.message : 'Gagal hapus data.'); }
      return;
    }

    const draftButton = event.target.closest('[data-draft-save]');
    if (draftButton) {
      appState.showAnnouncements = false;
      appState.offlineDrafts += 1;
      appState.lastSyncLabel = `Draft lokal bertambah (${appState.offlineDrafts})`;
      render();
      showToast('Draft berhasil disimpan', 'success', '&#10003;');
      return;
    }

    // Filter Nilai
    const nfSmt = event.target.closest('[data-nf-semester]');
    if (nfSmt) { getNilaiState().semester = nfSmt.dataset.nfSemester; setActiveInSameGroup(nfSmt, '[data-nf-semester]', 'on'); saveOnlyNoRender(); return; }

    // Jurnal Guru chips
    const jgJam = event.target.closest('[data-jg-jam]');
    if (jgJam) { getJurnalGuruState().jamKe = jgJam.dataset.jgJam; setActiveInSameGroup(jgJam, '[data-jg-jam]', 'on'); saveOnlyNoRender(); return; }

    // Jurnal Kelas chips
    const jkJam = event.target.closest('[data-jk-jam]');
    if (jkJam) { getJurnalKelasState().jamKe = jkJam.dataset.jkJam; setActiveInSameGroup(jkJam, '[data-jk-jam]', 'on'); saveOnlyNoRender(); return; }
    const jkStatus = event.target.closest('[data-jk-status]');
    if (jkStatus) { getJurnalKelasState().status = jkStatus.dataset.jkStatus; setActiveInSameGroup(jkStatus, '[data-jk-status]', 'on'); saveOnlyNoRender(); return; }

    // Catatan Siswa - filter kelas + pilih siswa
    const catatanKelas = event.target.closest('[data-catatan-kelas]');
    if (catatanKelas) {
      const cs = getCatatanState();
      cs.kelas = catatanKelas.dataset.catatanKelas;
      cs.siswa = null;
      render(); return;
    }
    const catatanSiswa = event.target.closest('[data-catatan-siswa]');
    if (catatanSiswa) { getCatatanState().siswa = catatanSiswa.dataset.catatanSiswa; setActiveInSameGroup(catatanSiswa, '[data-catatan-siswa]', 'active'); saveOnlyNoRender(); return; }
    const catatanWali = event.target.closest('[data-catatan-toggle-wali]');
    if (catatanWali) { const cs = getCatatanState(); cs.kirimWali = !cs.kirimWali; render(); return; }

    // Pengumuman
    const pengFilter = event.target.closest('[data-peng-filter]');
    if (pengFilter) { getPengState().filter = pengFilter.dataset.pengFilter; setActiveInSameGroup(pengFilter, '[data-peng-filter]', 'on'); saveOnlyNoRender(); return; }
    const pengToggleForm = event.target.closest('[data-peng-toggle-form]');
    if (pengToggleForm) { const ps = getPengState(); ps.showForm = !ps.showForm; render(); return; }
    const pengPrio = event.target.closest('[data-peng-toggle-prio]');
    if (pengPrio) { const ps = getPengState(); ps.prioritas = !ps.prioritas; render(); return; }

    const settingToggle = event.target.closest('[data-setting-toggle]');
    if (settingToggle) {
      const key = settingToggle.dataset.settingToggle;
      if (key === 'notificationSound' || key === 'notificationHaptic') {
        appState[key] = !appState[key];
        saveState();
        render();
        showToast(`${key === 'notificationSound' ? 'Bunyi' : 'Getar'} notifikasi ${appState[key] ? 'aktif' : 'mati'}`, 'success', '&#10003;');
      }
      return;
    }

    // Absensi Guru: pilih sesi
    const agSesiBtn = event.target.closest('[data-ag-sesi]');
    if (agSesiBtn && !agSesiBtn.disabled) {
      appState.showAnnouncements = false;
      appState.teacherAttendance.sesi = agSesiBtn.dataset.agSesi;
      setActiveInSameGroup(agSesiBtn, '[data-ag-sesi]', 'active');
      saveOnlyNoRender();
      return;
    }

    // Absensi Guru: pilih status (hadir/izin/sakit/dinas/alpa)
    const agStatusBtn = event.target.closest('[data-ag-status]');
    if (agStatusBtn) {
      appState.showAnnouncements = false;
      appState.teacherAttendance.status = agStatusBtn.dataset.agStatus;
      setActiveInSameGroup(agStatusBtn, '[data-ag-status]', 'active');
      saveOnlyNoRender();
      return;
    }

    // Absensi Guru: check-in / check-out
    const attendanceButton = event.target.closest('[data-attendance-action]');
    if (attendanceButton) {
      appState.showAnnouncements = false;
      if (isTeacherAttendanceLockedToday()) {
        showToast('Presensi guru hari ini sudah tersimpan dan dikunci.', 'error', '&#9888;');
        syncTeacherAttendanceFromTodayRow(getTodayTeacherAttendanceRow());
        render();
        return;
      }
      const updated = await updateTeacherAttendance(attendanceButton.dataset.attendanceAction);
      saveState();
      render();
      if (!updated) return;
      return;
    }
  });

  document.addEventListener('change', (event) => {
    // Jurnal Guru: input file PDF
    const jgPdfInput = event.target.closest('[data-jg-pdf-input]');
    if (jgPdfInput) {
      const files = jgPdfInput.files;
      if (files && files.length) {
        const f = getJurnalGuruState();
        if (!f.pdfFiles) f.pdfFiles = [];
        let added = 0;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type !== 'application/pdf') {
            showToast('"' + file.name + '" bukan PDF, dilewati.', 'error', '&#9888;');
            continue;
          }
          if (file.size > 5 * 1024 * 1024) {
            showToast('"' + file.name + '" lebih dari 5MB, dilewati.', 'error', '&#9888;');
            continue;
          }
          const reader = new FileReader();
          reader.onload = (function (theFile) {
            return function (e) {
              f.pdfFiles.push({
                name: theFile.name,
                size: theFile.size,
                dataUrl: e.target.result,
                uploadedAt: new Date().toISOString()
              });
            };
          })(file);
          reader.readAsDataURL(file);
          added++;
        }
        if (added) {
          setTimeout(function () {
            render();
            showToast(added + ' file PDF ditambahkan', 'success', '&#10003;');
          }, 300);
        }
        jgPdfInput.value = '';
      }
      return;
    }

    const siswaSelEl = event.target.closest('select[data-qr-target][data-module-field][data-form-key]');
    if (siswaSelEl) {
      const fk = siswaSelEl.getAttribute('data-form-key');
      const nis = String(siswaSelEl.value || '').trim();
      if (fk && nis) {
        let kelasFound = '';
        (KELAS_LIST || []).some(function(kls){
          if ((SISWA_PER_KELAS[kls] || []).some(function(s){ return String(s.nis) === nis; })) { kelasFound = kls; return true; }
          return false;
        });
        if (kelasFound) {
          const kelasSel = document.querySelector('[data-form-key="'+fk+'"][data-kelas-select]');
          if (kelasSel) kelasSel.value = kelasFound;
        }
      }
    }
    const kelasSelEl = event.target.closest('select[data-kelas-select][data-form-key]');
    if (kelasSelEl) {
      const kfk = kelasSelEl.getAttribute('data-form-key');
      const kelasVal = String(kelasSelEl.value || '').trim();
      const siswaTarget = kfk ? document.querySelector('select[data-form-key="'+kfk+'"][data-siswa-select]') : null;
      if (siswaTarget) agFillSiswaOptions(siswaTarget, kelasVal);
    }
    const selectEl = event.target.closest('[data-select]');
    if (selectEl && selectEl.tagName === 'SELECT') {
      const key = selectEl.dataset.select;
      const val = selectEl.value;
      if (key === 'nf-mapel') { getNilaiState().mapel = val; saveOnlyNoRender(); return; }
      if (key === 'nf-jenis') { getNilaiState().jenis = val; saveOnlyNoRender(); return; }
      if (key === 'jg-mapel') { getJurnalGuruState().mapel = val; saveOnlyNoRender(); return; }
      if (key === 'jg-metode') { getJurnalGuruState().metode = val; saveOnlyNoRender(); return; }
      if (key === 'jk-mapel') { getJurnalKelasState().mapel = val; saveOnlyNoRender(); return; }
      if (key === 'catatan-kat') { getCatatanState().kategori = val; saveOnlyNoRender(); return; }
      if (key === 'peng-kat') { getPengState().kategori = val; saveOnlyNoRender(); return; }
      if (key === 'absen-kelas') {
        const as = getAbsenSiswaState();
        as.kelas = val;
        appState.riwayatAbsenTanggal = null;
        render();
        return;
      }
      if (key === 'riwayat-tanggal') { appState.riwayatAbsenTanggal = val; render(); return; }
      if (key === 'riwayat-modul-tanggal') { const m = selectEl.getAttribute('data-riwayat-modul'); if (m) { appState.riwayatModulTanggal = appState.riwayatModulTanggal || {}; appState.riwayatModulTanggal[m] = val; render(); } return; }
    }
  });

  document.addEventListener('toggle', (event) => {
    if (event.target && event.target.matches && event.target.matches('[data-riwayat-toggle]')) {
      appState.riwayatAbsenOpen = !!event.target.open;
    }
    if (event.target && event.target.matches && event.target.matches('[data-riwayat-modul-toggle]')) {
      const m = event.target.getAttribute('data-riwayat-modul-toggle');
      if (m) { appState.riwayatModulOpen = appState.riwayatModulOpen || {}; appState.riwayatModulOpen[m] = !!event.target.open; }
    }
  }, true);

  document.addEventListener('input', (event) => {
    const ketEl = event.target.closest('[data-ag-keterangan]');
    if (ketEl) {
      appState.teacherAttendance.keterangan = ketEl.value;
    }
  });
}

// Kirim presensi guru ke Supabase (tabel absensi_guru) agar tampil di web.
// Kolom & match key disamakan dengan web: tanggal,sesi,nip + status,jam_masuk,jam_pulang,keterangan.
async function saveTeacherAttendanceToSupabase() {
  const att = appState.teacherAttendance || {};
  const nip = String(appState.teacherNip || '').trim();
  if (!nip) {
    console.warn('[AbsenGuru HP] NIP guru kosong - presensi belum bisa tampil di web. Pastikan akun guru punya NIP.');
    showToast('Presensi tersimpan, tapi NIP guru kosong sehingga belum tampil di web.', 'error', '&#9888;');
    return false;
  }
  var existingToday = getTodayTeacherAttendanceRow();
  if (existingToday && !att.__allowInitialSave) {
    syncTeacherAttendanceFromTodayRow(existingToday);
    showToast('Presensi guru hari ini sudah tersimpan dan dikunci.', 'error', '&#9888;');
    return false;
  }
  const isAlpa = att.status === 'alpa';
  const payload = {
    tanggal: agTodayISO(),
    sesi: att.sesi || 'Hari Kerja Biasa',
    nip: nip,
    status: att.status || 'hadir',
    jam_masuk: isAlpa ? '' : (att.checkIn || ''),
    jam_pulang: isAlpa ? '' : (att.checkOut || ''),
    keterangan: att.keterangan || att.ket || att.note || '',
    client_key: 'default'  // wajib agar web bisa baca (web filter: WHERE client_key = 'default')
  };
  try {
    let res = null;
    if (window.db && typeof window.db.upsert === 'function') {
      res = await window.db.upsert('absensi_guru', payload, 'tanggal,sesi,nip');
    } else if (window.db && typeof window.db.insert === 'function') {
      res = await window.db.insert('absensi_guru', payload);
    } else if (window.ZymataMobileSupabase && typeof window.ZymataMobileSupabase.upsert === 'function') {
      res = await window.ZymataMobileSupabase.upsert('absensi_guru', payload, 'tanggal,sesi,nip');
    } else if (window.ZymataMobileSupabase && typeof window.ZymataMobileSupabase.insert === 'function') {
      res = await window.ZymataMobileSupabase.insert('absensi_guru', payload);
    } else {
      console.warn('[AbsenGuru HP] Tidak ada metode upsert/insert (window.db / ZymataMobileSupabase).');
      showToast('Presensi tersimpan lokal; sinkron ke web belum tersedia.', 'error', '&#9888;');
      return false;
    }
    if (res && res.error) {
      console.warn('[AbsenGuru HP] gagal simpan Supabase:', res.error.message || res.error);
      showToast('Presensi tersimpan lokal, gagal sinkron ke web: ' + (res.error.message || 'error'), 'error', '&#9888;');
      return false;
    }
    console.log('[AbsenGuru HP] tersimpan ke Supabase:', payload.tanggal, '|', payload.sesi, '|', payload.nip, '|', payload.status);
    return true;
  } catch (e) {
    console.warn('[AbsenGuru HP] error simpan Supabase:', e && e.message);
    showToast('Presensi tersimpan lokal, gagal sinkron ke web.', 'error', '&#9888;');
    return false;
  }
}

async function updateTeacherAttendance(type) {
  if (isTeacherAttendanceLockedToday()) {
    syncTeacherAttendanceFromTodayRow(getTodayTeacherAttendanceRow());
    showToast('Presensi guru hari ini sudah tersimpan dan dikunci.', 'error', '&#9888;');
    return false;
  }
  const hhmm = agNowHHMM();
  if (type === 'checkIn' && !appState.teacherAttendance.checkIn) {
    const prevStatus = appState.teacherAttendance.status;
    const nonHadir   = ['izin','sakit','dinas','alpa'].includes(prevStatus);
    let gps = null;
    // Absen HADIR wajib GPS valid dalam radius sekolah; ditolak bila GPS belum siap.
    // Status izin/sakit/dinas/alpa TIDAK perlu GPS.
    if (!nonHadir) {
      try {
        gps = await agValidateGpsForCheckIn();
      } catch (error) {
        const message = error?.message || String(error);
        appState.teacherAttendance.note = message;
        showToast(message, 'error', '&#9888;');
        return false;
      }
    }
    const lateMin = agLateMinutes(hhmm);
    const isLate  = lateMin > 0;
    appState.teacherAttendance.checkIn     = hhmm;
    appState.teacherAttendance.isLate      = isLate;
    appState.teacherAttendance.lateMinutes = lateMin;
    if (!nonHadir) {
      appState.teacherAttendance.status = isLate ? 'terlambat' : 'hadir';
    }
    appState.teacherAttendance.gps = gps;
    if (nonHadir) {
      const stLabel = agStatusLabel(prevStatus);
      appState.teacherAttendance.note = `Presensi ${stLabel} pukul ${hhmm} \u2014 tanpa verifikasi GPS (sesuai aturan ${stLabel}).`;
      showToast(`Presensi ${stLabel} tercatat ${hhmm}`, 'success', '&#10003;');
    } else {
      appState.teacherAttendance.note = isLate
        ? `Check-in ${hhmm} \u2014 terlambat ${lateMin} menit dari batas ${AG_CUTOFF}. GPS valid ${gps.distance} m dari sekolah.`
        : `Check-in ${hhmm} \u2014 tepat waktu sebelum batas ${AG_CUTOFF}. GPS valid ${gps.distance} m dari sekolah.`;
      showToast(`Check-in valid radius ${gps.distance} m`, 'success', '&#10003;');
    }
    var saved = await saveTeacherAttendanceToSupabase();
    if (saved) {
      appState.teacherAttendance.lockedToday = true;
      appState.teacherAttendance.lockedDate = agTodayISO();
      appState.teacherAttendance.note = 'Presensi guru hari ini sudah tersimpan dan dikunci.';
    }
    return true;
  }
  if (type === 'checkOut' && appState.teacherAttendance.checkIn && !appState.teacherAttendance.checkOut) {
    appState.teacherAttendance.checkOut = hhmm;
    appState.teacherAttendance.note = `Presensi selesai. Pulang pukul ${hhmm}.`;
    await saveTeacherAttendanceToSupabase();
    return true;
  }
  return false;
}

function render() {
  renderHeader();
  renderContent();
  renderFloating();
  renderNav();
  bindActions();
  saveState();
}

// ─── Status bar clock ────��──────────────���───────────�����─────────────────────
function updateStatusBarClock() {
  // Di HP/Capacitor: sembunyikan STATUS BAR PALSU (androidStatusBar) supaya
  // Guru memakai status bar OS asli -> jam/sinyal ikut warna OS (putih).
  const isCapacitor = !!(window.Capacitor || window.cordova || window.PhoneGap);
  const isMobile = isCapacitor || window.innerWidth <= 479;
  const bar = document.getElementById('androidStatusBar');
  if (bar && isMobile) {
    bar.style.cssText = 'height:0!important;min-height:0!important;overflow:hidden!important;visibility:hidden!important;padding:0!important;margin:0!important;';
    return;
  }
  const el = document.getElementById('sbTime');
  if (!el) return;
  const d = new Date();
  el.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
setInterval(updateStatusBarClock, 10000);
updateStatusBarClock();

// ─── Haptic feedback (delegated ke native-enhance.js — hanya bottom-nav) ───
function nativeHaptic(_kind) {}

function getAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!window.__ZYMATA_AUDIO_CTX__) window.__ZYMATA_AUDIO_CTX__ = new AudioCtx();
    return window.__ZYMATA_AUDIO_CTX__;
  } catch (_) {
    return null;
  }
}

function playNotificationSound(tone = 'success') {
  if (!appState.notificationSound) return;
  const audioContext = getAudioContext();
  if (!audioContext) return;
  if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function') {
    audioContext.resume().catch(() => {});
  }
  const now = audioContext.currentTime;
  const sequence = tone === 'error'
    ? [{ f: 260, t: 0, d: 0.09 }, { f: 190, t: 0.11, d: 0.12 }]
    : tone === 'warning' || tone === 'orange' || tone === 'gold'
      ? [{ f: 440, t: 0, d: 0.08 }, { f: 330, t: 0.10, d: 0.08 }]
      : [{ f: 660, t: 0, d: 0.07 }, { f: 880, t: 0.08, d: 0.09 }];
  sequence.forEach(({ f, t, d }) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(f, now + t);
    gain.gain.setValueAtTime(0.0001, now + t);
    gain.gain.exponentialRampToValueAtTime(0.055, now + t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now + t);
    oscillator.stop(now + t + d + 0.02);
  });
}

function notifyFeedback(tone = 'success') {
  const feedbackTone = tone === 'red' ? 'error' : tone === 'orange' || tone === 'gold' ? 'warning' : tone;
  playNotificationSound(feedbackTone);
}

// ─���─ Ripple effect engine ────────��────────────�����───────────────────────────
(function initRipple() {
  document.addEventListener('pointerdown', function(e) {
    const target = e.target.closest('button, .nav-item, .siswa-pick-btn, .kelas-btn, .absen-chip, .jadwal-sesi-card, .jq-btn');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-wave';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
    // pastikan target punya position relative / overflow hidden
    const pos = getComputedStyle(target).position;
    if (pos === 'static') target.style.position = 'relative';
    target.style.overflow = 'hidden';
    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
})();

// ��── Android/iOS back handling ──────���────────��───────────���────────────����──
function bindNativeBack() {
  if (window.__ZYMATA_GURU_BACK_BOUND__) return;
  window.__ZYMATA_GURU_BACK_BOUND__ = true;

  // Ekspos logika back Guru ke handler tombol Back OS di native-enhance.js.
  // goBackNative() -> true bila berhasil mundur (pengumuman/modul->menu->home),
  // false bila sudah di home (baru boleh konfirmasi keluar app).
  window.zHandleBack = goBackNative;

  if (window.history && window.history.replaceState) {
    window.history.replaceState({ tab: appState.activeTab || 'home' }, '', '#'+String(appState.activeTab || 'home').replace(':','-'));
  }

  window.addEventListener('popstate', function() {
    const handled = goBackNative();
    if (handled && window.history && window.history.pushState) {
      window.history.pushState({ tab: appState.activeTab }, '', '#'+String(appState.activeTab).replace(':','-'));
    }
  });

  document.addEventListener('backbutton', function(e) {
    const handled = goBackNative();
    if (handled) e.preventDefault();
  }, false);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') goBackNative();
  });
}

// ─── Page transition ──────────────────────────────────────────────────────
function animateContent() {
  // Transisi dipanggil hanya oleh navigasi halaman besar (navigateTo / initial load).
  // Implementasi visualnya dibungkus di guru-shell.html agar bisa pilih sheet/fade.
  return;
}

function applyGuruEmptyStateData() {
  appState.attendanceDone = 0;
  appState.attendanceTotal = 0;
  appState.unreadMessages = 0;
  appState.unreadAnnouncements = 0;
  appState.agendaDone = false;
  appState.syncMode = 'supabase-empty';
  appState.offlineDrafts = 0;
  appState.lastSyncLabel = 'Menunggu data Supabase';
  appState.absenSiswaStatus = {};
  appState.teacherAttendance = {
    status: 'Belum ada data',
    checkIn: '',
    checkOut: '',
    sesi: 'Belum terjadwal',
    keterangan: '',
    isLate: false,
    lateMinutes: 0,
    note: 'Presensi guru akan tampil setelah akun terhubung ke Supabase.'
  };
  tabMeta.home.title = 'Selamat datang';
  tabMeta.home.action = 'Hubungkan Akun';
  tabMeta.class.eyebrow = 'Kelas belum terhubung';
  tabMeta.class.title = 'Data kelas belum tersedia';
  tabMeta.schedule.title = 'Jadwal belum tersedia';
  tabMeta.messages.title = 'Belum ada pesan';
  tabMeta.profile.title = 'Akun guru';

  students.splice(0, students.length);
  messages.splice(0, messages.length);
  announcements.splice(0, announcements.length);
  Object.keys(JADWAL_MINGGUAN).forEach((key) => { JADWAL_MINGGUAN[key].splice(0, JADWAL_MINGGUAN[key].length); });
  Object.keys(modulePlaceholders).forEach((key) => {
    const item = modulePlaceholders[key];
    item.stats = [];
    item.focus = [];
  });
}



async function loadMessagesFromSupabase(kelasUtama) {
  const db = window.db || window.ZymataMobileSupabase;
  if (!db || typeof db.select !== 'function') return;
  try {
    // Ambil surat/pesan dari wali murid untuk kelas ini (max 50, terbaru dulu)
    const res = await db.select('surat', { order: 'tanggal', ascending: false, limit: 50 });
    const rows = Array.isArray(res && res.data) ? res.data : (Array.isArray(res) ? res : []);
    // Filter: surat yang berasal dari wali murid, atau yang terkait kelas guru
    const filtered = rows.filter(function(r) {
      if (!r) return false;
      // Cek payload jika ada (format wali murid)
      var payload = {};
      try { if (r.payload) payload = (typeof r.payload === 'string') ? JSON.parse(r.payload) : r.payload; } catch(_) {}
      var suratKelas = payload.kelas || r.kelas || r.pihak || '';
      var isWaliMurid = (payload.sumber === 'WaliMurid') || /wali/i.test(r.sumber || '') || /izin|sakit|terlambat/i.test(r.jenis || '');
      // Tampilkan semua jika tidak ada kelasUtama, atau filter berdasarkan kelas
      if (kelasUtama) {
        return isWaliMurid && (suratKelas === kelasUtama || !suratKelas);
      }
      return isWaliMurid;
    });
    messages.splice(0, messages.length, ...filtered.map(function(r) {
      var payload = {};
      try { if (r.payload) payload = (typeof r.payload === 'string') ? JSON.parse(r.payload) : r.payload; } catch(_) {}
      var sender = payload.nama_wali || r.pihak || 'Wali Murid';
      var siswa  = payload.siswa || payload.nama_siswa || r.nama_siswa || '';
      var preview = r.perihal || r.isi || payload.isi || 'Pesan dari wali murid';
      if (siswa) preview = '(' + siswa + ') ' + preview;
      // Format tanggal + jam
      var tgl = r.tanggal || r.created_at || r.waktu || r.timestamp || '';
      var timeLabel = '';
      var jamLabel = '';
      if (tgl) {
        var d = new Date(tgl);
        if (!isNaN(d)) {
          var now = new Date();
          var diffDay = Math.floor((now - d) / 86400000);
          if (diffDay === 0) timeLabel = 'Hari ini';
          else if (diffDay === 1) timeLabel = 'Kemarin';
          else timeLabel = String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
          // Jam: hanya kalau ada komponen waktu (bukan 00:00:00 dari tanggal-saja)
          if (d.getHours() || d.getMinutes() || d.getSeconds()) {
            jamLabel = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
          }
        }
      }
      // Fallback jam dari kolom terpisah bila ada
      if (!jamLabel) {
        var jamRaw = String(r.jam || r.waktu || payload.jam || '').trim();
        var jamMatch = jamRaw.match(/(\d{1,2}):(\d{2})/);
        if (jamMatch) jamLabel = jamMatch[1].padStart(2,'0') + ':' + jamMatch[2];
      }
      var balasan = payload.balasan_guru || payload.balasan || r.balasan || '';
      var sudahDibalas = !!balasan || r.status === 'Dibalas';
      var statusBelum = !sudahDibalas && (!r.status || r.status === 'Baru' || r.status === 'Belum');
      return {
        sender: sender,
        preview: preview.slice(0, 80) + (preview.length > 80 ? '...' : ''),
        time: timeLabel || tgl.slice(0,10) || '-',
        jam: jamLabel,
        unread: statusBelum,
        replied: sudahDibalas,
        balasan: balasan,
        tone: statusBelum ? 'orange' : 'green',
        raw: r
      };
    }));
    appState.unreadMessages = messages.filter(function(m){ return m.unread; }).length;
    console.log('[Pesan HP] loaded', messages.length, 'pesan,', appState.unreadMessages, 'belum dibaca');
  } catch(e) {
    console.warn('[Pesan HP] gagal load:', e);
  }
}

async function rebuildJadwalFromSupabase(kelasArg, teacherName) {
  // kelasArg boleh string (1 kelas) atau array (semua kelas yang diajar guru mapel)
  var classes = Array.isArray(kelasArg) ? kelasArg.filter(Boolean) : (kelasArg ? [kelasArg] : []);
  // buang duplikat
  classes = classes.filter(function(k, i){ return classes.indexOf(k) === i; });
  if (!classes.length) return;
  const db = window.db || window.ZymataMobileSupabase;
  if (!db || typeof db.select !== 'function') return;
  const JAM_LABELS = ['07:00-07:35','07:35-08:10','08:10-08:45','08:45-09:20','Istirahat','09:35-10:10','10:10-10:45','10:45-11:20','11:20-11:55'];
  const HARI_TO_GETDAY = { 0:1, 1:2, 2:3, 3:4, 4:5, 5:6 };
  const normName = function(s){ return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  const teacherKey = normName(teacherName);
  try {
    // Ambil jadwal dari SEMUA kelas yang diajar guru ini
    var allRows = [];
    for (var ci = 0; ci < classes.length; ci++) {
      var kelasNama = classes[ci];
      var res = await db.select('jadwal_pelajaran', { eq: { kelas: kelasNama }, limit: 200 });
      var rws = Array.isArray(res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      rws.forEach(function(r){ if (r && !r.kelas) r.kelas = kelasNama; if (r) allRows.push(r); });
    }
    if (!allRows.length) { console.log('[Jadwal HP] tidak ada data untuk kelas', classes.join(', ')); return; }
    // Untuk guru mapel: tampilkan HANYA sesi yang diajar guru ini (cocokkan nama guru) bila kolom guru tersedia.
    var hasGuruCol = allRows.some(function(r){ return r.guru || r.nama_guru || r.guru_nama; });
    var rows = allRows;
    if (teacherKey && hasGuruCol) {
      var mine = allRows.filter(function(r){ return normName(r.guru || r.nama_guru || r.guru_nama) === teacherKey; });
      if (mine.length) rows = mine;
    }
    Object.keys(JADWAL_MINGGUAN).forEach(function(k) {
      JADWAL_MINGGUAN[k].splice(0, JADWAL_MINGGUAN[k].length);
    });
    var byHari = {};
    rows.forEach(function(r) {
      var hi = parseInt(r.hari_index);
      if (isNaN(hi)) return;
      if (!byHari[hi]) byHari[hi] = [];
      byHari[hi].push(r);
    });
    Object.keys(byHari).forEach(function(hiStr) {
      var hi = parseInt(hiStr);
      var dayIdx = HARI_TO_GETDAY[hi];
      if (!dayIdx) return;
      var sorted = byHari[hi].slice().sort(function(a,b){
        var d = parseInt(a.jam_index||0) - parseInt(b.jam_index||0);
        if (d !== 0) return d;
        return String(a.kelas||'').localeCompare(String(b.kelas||''));
      });
      sorted.forEach(function(r) {
        var ji = parseInt(r.jam_index);
        var jamLabel = (ji >= 0 && ji < JAM_LABELS.length) ? JAM_LABELS[ji] : ('Jam '+(ji+1));
        var mapel = r.mapel || '-';
        if (mapel === '-' || /istirahat/i.test(mapel)) return;
        var entry = {
          time: jamLabel.split('-')[0] || jamLabel,
          title: mapel,
          meta: 'Kelas ' + (r.kelas || '-') + (r.guru ? ' · ' + r.guru : ''),
          status: 'Mapel',
          tone: 'blue'
        };
        if (!JADWAL_MINGGUAN[dayIdx]) JADWAL_MINGGUAN[dayIdx] = [];
        JADWAL_MINGGUAN[dayIdx].push(entry);
      });
    });
    var todaySchedule = getTodaySchedules();
    schedules.splice(0, schedules.length, ...todaySchedule);
    console.log('[Jadwal HP] rebuilt', schedules.length, 'jadwal hari ini dari', classes.length, 'kelas:', classes.join(', '));
  } catch(e) {
    console.warn('[Jadwal HP] gagal load:', e);
  }
}

async function hydrateGuruFromSupabase() {
  if (!window.ZymataMobileSupabase) return;
  const session = window.ZymataMobileSupabase.readSession();
  if (!session) return;
  try {
    const ctx = await window.ZymataMobileSupabase.loadGuruContext(session);
    if (!ctx) return;
    const guru = ctx.guru || {};
    const kelasDiajarRaw = Array.isArray(guru.kelas_diajar) ? guru.kelas_diajar : String(guru.kelas_diajar || '').split(/[,;|]/).map(s => s.trim()).filter(Boolean);
    const waliKelas = String(guru.wali_kelas || '').trim();
    const kelasFromMengajar = (ctx.mengajar || []).map(r => r.kelas).filter(Boolean);
    const kelasList = Array.from(new Set([waliKelas].concat(kelasDiajarRaw, kelasFromMengajar).filter(Boolean)));
    const kelasUtama = waliKelas || kelasList[0] || '';
    // Simpan daftar kelas mengajar guru agar dropdown kelas menampilkan SEMUA kelas (bukan cuma yang ada siswanya)
    appState.guruKelasList = kelasList.slice();
    // Daftar MAPEL yang diajar guru (integrasi dari data mengajar) untuk dropdown mapel Jurnal Guru
    const mapelDiajarRaw = Array.isArray(guru.mapel) ? guru.mapel : String(guru.mapel || guru.mapel_diajar || guru.mata_pelajaran || guru.mapel_ajar || '').split(/[,;|]/).map(s => s.trim()).filter(Boolean);
    const mapelFromMengajar = (ctx.mengajar || []).map(r => r.mapel || r.mata_pelajaran || r.nama_mapel).filter(Boolean);
    const mapelList = Array.from(new Set([].concat(mapelDiajarRaw, mapelFromMengajar).filter(Boolean)));
    appState.guruMapelList = mapelList.slice();

    appState.syncMode = 'supabase-live';
    appState.teacherName = guru.nama || session.nama || session.nama_guru || session.username || 'Guru';
    appState.teacherNip = String(guru.nip || guru.nip_guru || guru.NIP || session.nip || session.nip_guru || '').trim();
    // Foto guru dari data Supabase (cek berbagai kemungkinan nama kolom)
    appState.teacherPhotoUrl = String(guru.foto || guru.foto_url || guru.photo || guru.photo_url || guru.avatar || guru.avatar_url || guru.foto_guru || guru.url_foto || '').trim();
    appState.teacherClass = kelasUtama || 'Kelas belum terhubung';
    appState.teacherRoleLabel = waliKelas ? 'Wali kelas' : 'Guru';
    appState.teacherJabatan = String(guru.jabatan || guru.jabatan_guru || '').trim();
    appState.lastSyncLabel = 'Tersambung Supabase';
    appState.unreadAnnouncements = 0;
    appState.unreadMessages = 0;
    // FIX: pulihkan judul tab dari teks empty-state setelah data Supabase termuat
    tabMeta.class.eyebrow = (appState.teacherClass && appState.teacherClass !== 'Kelas belum terhubung') ? ('Kelas ' + appState.teacherClass) : 'Kelas';
    tabMeta.class.title = (appState.teacherClass && appState.teacherClass !== 'Kelas belum terhubung') ? ('Kelas ' + appState.teacherClass) : 'Pantau kelas dengan jelas';
    tabMeta.home.title = 'Selamat datang, ' + (appState.teacherName || 'Guru');
    tabMeta.home.action = 'Mulai Absensi';
    tabMeta.schedule.title = 'Agenda hari ini';
    tabMeta.messages.title = 'Chat';
    tabMeta.profile.title = 'Pengaturan guru';

    // ===== PARALEL: jalankan semua permintaan Supabase bersamaan agar load pertama jauh lebih cepat =====
    const kelasUntukSiswa = (kelasList && kelasList.length) ? kelasList : (kelasUtama ? [kelasUtama] : []);
    const siswaQuery = kelasUntukSiswa.length
      ? { or: kelasUntukSiswa.map(function(k){ return 'kelas.eq.' + k; }).join(','), limit: 500 }
      : { limit: 500 };
    ctx.kelasList = kelasList.slice();
    const _S = window.ZymataMobileSupabase;
    const [resUtama, siswaAll, , , modulesData] = await Promise.all([
      kelasUtama ? _S.select('siswa', { eq: { kelas: kelasUtama }, limit: 200 }).catch(function(){ return null; }) : Promise.resolve(null),
      _S.select('siswa', siswaQuery).catch(function(){ return null; }),
      rebuildJadwalFromSupabase((appState.guruKelasList && appState.guruKelasList.length) ? appState.guruKelasList : kelasUtama, appState.teacherName).catch(function(){ return null; }),
      loadMessagesFromSupabase(kelasUtama).catch(function(){ return null; }),
      _S.loadGuruModuleData(ctx).catch(function(){ return null; })
    ]);
    // Terapkan hasil berurutan (tanpa race condition)
    if (resUtama && !resUtama.error && Array.isArray(resUtama.data)) {
      appState.attendanceTotal = resUtama.data.length;
      appState.attendanceDone = 0;
      students.splice(0, students.length, ...resUtama.data.slice(0, 8).map((row) => ({
        name: row.nama || row.nama_siswa || row.name || 'Siswa',
        meta: (row.nis ? ('NIS ' + row.nis) : 'Data Supabase') + (row.kelas ? (' · ' + row.kelas) : ''),
        status: 'Terhubung',
        tone: 'green',
        progress: 0
      })));
    }
    if (siswaAll && !siswaAll.error && Array.isArray(siswaAll.data)) rebuildSiswaFromRows(siswaAll.data);
    // Fallback: kalau roster kosong (mis. format kelas guru beda dgn tabel siswa), muat semua siswa tanpa filter kelas
    if (agStudentCount() === 0) {
      try {
        var _allSiswa = await _S.select('siswa', { limit: 1000 });
        if (_allSiswa && !_allSiswa.error && Array.isArray(_allSiswa.data)) rebuildSiswaFromRows(_allSiswa.data);
      } catch (_eAll) {}
    }
    if (modulesData) appState.supabaseModules = dedupeModules(modulesData);
    syncTeacherAttendanceFromTodayRow(getTodayTeacherAttendanceRow());
    if (kelasUtama && appState.supabaseModules && appState.supabaseModules.absensi) {
      appState.attendanceDone = Object.keys(getTodayAbsensiMap(kelasUtama)).length;
    }
    saveDataCache();
    saveState();
    if (!window.__qrScannerOpen) render(); // skip render saat kamera terbuka
  } catch (error) {
    console.warn('[MobileGuru] gagal load Supabase:', error && error.message ? error.message : error);
  }
}

loadState();
applyGuruEmptyStateData();
// Tampilkan data terakhir dari cache INSTAN (stale-while-revalidate), lalu hydrate refresh di belakang
loadDataCache();
appState.activeTab = 'home';
appState.showAnnouncements = false;
bindNativeBack();
saveState();
render();
hydrateGuruFromSupabase();
animateContent();

// ===== Auto-refresh data saat app dibuka kembali =====
// Di aplikasi native (APK) webview hanya "resume", tidak reload, sehingga data
// dari Supabase tidak ter-update otomatis. Listener ini menarik data terbaru
// tiap app kembali aktif / terlihat.
(function setupGuruAutoRefresh(){
  var _busy = false, _last = Date.now();
  function refreshNow(){
    if(window.__qrScannerOpen) return; // jangan re-render saat kamera scanner terbuka
    if(_busy) return;
    if(Date.now() - _last < 3000) return; // throttle 3 detik
    _busy = true; _last = Date.now();
    Promise.resolve(hydrateGuruFromSupabase())
      .catch(function(){})
      .then(function(){ _busy = false; });
  }
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible') refreshNow();
  });
  window.addEventListener('focus', refreshNow);
  try {
    var Cap = window.Capacitor;
    if(Cap && Cap.Plugins && Cap.Plugins.App && Cap.Plugins.App.addListener){
      Cap.Plugins.App.addListener('resume', refreshNow);
      Cap.Plugins.App.addListener('appStateChange', function(s){ if(s && s.isActive) refreshNow(); });
    }
  } catch(_){}
  window.zGuruRefresh = refreshNow;
})();
