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
    { id: 'guru-perangkat-pembelajaran', icon: '&#9636;', title: 'Perangkat Pembelajaran', meta: 'Prota, modul ajar & media', route: 'module:perangkat-pembelajaran', group: 'Akademik' },
    { id: 'guru-absensi-siswa', icon: '&#10003;', title: 'Absensi Siswa', meta: 'Kehadiran kelas', route: 'module:absensi-siswa', group: 'Input' },
    { id: 'guru-nilai', icon: '&#8599;', title: 'Nilai', meta: 'Input nilai siswa', route: 'module:nilai', group: 'Input' },
    { id: 'guru-jurnal-guru', icon: '&#9998;', title: 'Jurnal Guru', meta: 'Catatan kegiatan guru', route: 'module:jurnal-guru', group: 'Input' },
    { id: 'guru-jurnal-kelas', icon: '&#9776;', title: 'Jurnal Kelas', meta: 'Kegiatan belajar kelas', route: 'module:jurnal-kelas', group: 'Input' },
    { id: 'guru-kelola-halaqah', icon: '&#9782;', title: 'Kelola Halaqah', meta: 'Kelompok tahfidz binaan', route: 'module:kelola-halaqah', group: 'Perkembangan' },
    { id: 'guru-mutabaah-tahfidz', icon: '&#9789;', title: "Mutaba'ah Tahfidz", meta: 'Setoran hafalan sekolah', route: 'module:mutabaah-tahfidz', group: 'Perkembangan' },
    { id: 'guru-program-sekolah', icon: '&#9745;', title: 'Program Sekolah', meta: 'Program & kegiatan sekolah', route: 'module:program-sekolah', group: 'Perkembangan' },
    { id: 'guru-ibadah', icon: '&#10022;', title: 'Ibadah', meta: 'Catatan ibadah siswa', route: 'module:ibadah', group: 'Perkembangan' },
    { id: 'guru-karakter', icon: '&#9671;', title: 'Karakter', meta: 'Sikap & akhlak', route: 'module:karakter', group: 'Perkembangan' },
    { id: 'guru-prestasi', icon: '&#9733;', title: 'Prestasi', meta: 'Capaian siswa', route: 'module:prestasi', group: 'Perkembangan' },
    { id: 'guru-ekskul', icon: '&#10041;', title: 'Ekstrakurikuler', meta: 'Ekskul & pembinaan', route: 'module:ekstrakurikuler', group: 'Perkembangan' },
    { id: 'guru-pelanggaran', icon: '&#33;', title: 'Pelanggaran', meta: 'Catatan disiplin', route: 'module:pelanggaran', group: 'Perkembangan' },
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
const AG_RADIUS_M = 75;
const AG_MAX_ACCURACY_M = 100;
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
// [ZYMATA] Anti-manipulasi jam: format epoch ms -> "HH:MM" pada zona Asia/Jakarta
function agHHMMFromMs(ms) {
  try {
    return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
  } catch (e) {
    const d = new Date(ms);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
}
// [ZYMATA] Ambil jam server Supabase (RPC public.get_server_time). Null bila offline/belum dibuat.
async function agServerNowMs() {
  try {
    if (!window.ZymataMobileSupabase || typeof window.ZymataMobileSupabase.getClient !== 'function') return null;
    var client = window.ZymataMobileSupabase.getClient();
    if (!client || typeof client.rpc !== 'function') return null;
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve({ __timeout: true }); }, 4000); });
    var res = await Promise.race([client.rpc('get_server_time'), timeout]);
    if (!res || res.__timeout || res.error || !res.data) return null;
    var ms = new Date(res.data).getTime();
    return isNaN(ms) ? null : ms;
  } catch (e) { return null; }
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
    var sidAg = String(row.id || row.siswa_id || '').trim();
    SISWA_PER_KELAS[kelas].push({ nis: nis, name: nama, id: sidAg });
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

function agDbStatus(value) {
  // UI boleh menampilkan 'terlambat', tapi CHECK constraint tabel absensi_guru
  // biasanya hanya menerima: hadir, izin, sakit, dinas, alpa.
  // Jadi terlambat disimpan sebagai hadir; detail terlambat masuk keterangan.
  const st = String(value || '').trim().toLowerCase();
  if (st === 'terlambat') return 'hadir';
  if (['hadir','izin','sakit','dinas','alpa'].includes(st)) return st;
  return 'hadir';
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
  const isWeekend = dayIdx === 0;
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

    ${appState.unreadMessages > 0 ? `
    <!-- Notifikasi Pesan Wali (merah) -->
    <section class="section section--tight">
      <button type="button" data-tab="pesanLama" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid #7f1d1d;border-radius:16px;background:linear-gradient(135deg,#b91c1c,#7f1d1d);cursor:pointer;box-shadow:0 6px 18px rgba(185,28,28,.38)">
        <span style="position:relative;display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,.16);font-size:20px;flex:0 0 auto">
          &#9993;
          <span style="position:absolute;top:-7px;right:-7px;min-width:21px;height:21px;padding:0 5px;display:flex;align-items:center;justify-content:center;border-radius:999px;background:#fff;color:#b91c1c;font-size:11px;font-weight:800;border:2px solid #b91c1c;box-shadow:0 1px 3px rgba(0,0,0,.25)">${appState.unreadMessages}</span>
        </span>
        <span style="text-align:left;line-height:1.3;flex:1">
          <strong style="display:block;font-size:14px;color:#fff;font-weight:800">Pesan Wali</strong>
          <small style="font-size:12px;color:#fecaca">${appState.unreadMessages} pesan belum dibuka · ketuk untuk membaca</small>
        </span>
        <span style="color:#fecaca;font-size:20px;flex:0 0 auto">›</span>
      </button>
    </section>` : ''}

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
  var done = !!att.checkOut;
  att.note = done ? 'Presensi guru hari ini sudah selesai dan dikunci.' : 'Check-in sudah tersimpan. Silakan check-out saat pulang.';
  att.lockedToday = done;
  att.lockedDate = done ? agTodayISO() : '';
  return true;
}

function isTeacherAttendanceLockedToday() {
  if (appState.teacherAttendance && appState.teacherAttendance.lockedToday && appState.teacherAttendance.lockedDate === agTodayISO()) return true;
  var r = getTodayTeacherAttendanceRow();
  return !!(r && (r.jam_pulang || r.checkOut || r.pulang));
}

function hasTeacherCheckInToday() {
  var r = getTodayTeacherAttendanceRow();
  if (r && (r.jam_masuk || r.checkIn || r.masuk)) return true;
  return !!(appState.teacherAttendance && appState.teacherAttendance.checkIn);
}

function resetTeacherAttendanceIfNewDay() {
  var att = appState.teacherAttendance || (appState.teacherAttendance = {});
  var stamp = att.lockedDate || att.activeDate || '';
  if (stamp && stamp !== agTodayISO()) {
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
      lockedDate: '',
      activeDate: ''
    };
  }
}

function renderTeacherAttendance() {
  resetTeacherAttendanceIfNewDay();
  const todayRow = getTodayTeacherAttendanceRow();
  if (todayRow) syncTeacherAttendanceFromTodayRow(todayRow);
  // Skeleton saat status presensi masih dimuat pertama kali — hindari flash "Belum presensi" palsu
  if (appState._agAttnLoading && !appState._agAttnLoaded && !hasTeacherCheckInToday() && !isTeacherAttendanceLockedToday()) {
    return renderTeacherAttendanceSkeleton();
  }
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
          <li>Status <em>Alpa</em> dipotong dari gaji; izin dan sakit tidak dipotong</li>
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
  const isWeekend = selectedDay === 0;
  const DAYS = [
    { idx:1, label:'Sen' }, { idx:2, label:'Sel' }, { idx:3, label:'Rab' },
    { idx:4, label:'Kam' }, { idx:5, label:'Jum' }, { idx:6, label:'Sab' }
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
          <small>${isWeekend ? selectedDayName + ' adalah hari libur.' : 'Belum ada jadwal untuk ' + selectedDayName + '.'}</small>
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
                <button type="button" class="jq-btn" data-module-route="module:jurnal-kelas">☰ Jurnal Kelas</button>
                <button type="button" class="jq-btn" data-module-route="module:catatan-siswa">✎ Catatan Siswa</button>
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

/* ---------- Tabungan Siswa: input sekelas sekaligus (bulk per kelas) ---------- */
function tabEsc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function tabState(){ if(!appState.tabInput) appState.tabInput={ kelas:'', jenis:'Setoran', metode:'Tunai', tanggal:'', loadingSaldo:false, saldoMap:null, rows:null, loadedKelas:'' }; return appState.tabInput; }
function tabKelasOptions(){ var wk=appState.teacherClass; if(wk && wk!=='Kelas belum terhubung') return [wk]; return (appState.guruKelasList && appState.guruKelasList.length) ? appState.guruKelasList : (typeof KELAS_LIST!=='undefined'?KELAS_LIST:[]); }
function tabDelta(r){ var d=Number(r.debit||0)||0,k=Number(r.kredit||0)||0; if(!d&&!k){ var nn=Number(r.nominal||0)||0; if(/tarik|keluar|penarikan/i.test(r.jenis||'')) k=nn; else d=nn; } return {d:d,k:k}; }
async function loadTabunganData(kelas){
  var S=tabState(); S.loadingSaldo=true; S.saldoMap=null; S.rows=null; S.loadedKelas=kelas;
  if(appState.activeTab==='module:tabungan') render();
  var map={}, rows=[];
  try{
    var api=window.ZymataMobileSupabase;
    if(api&&api.select&&kelas){
      var res=await api.select('tabungan_siswa',{ eq:{ kelas:kelas }, limit:5000 });
      if(res&&!res.error&&Array.isArray(res.data)) rows=res.data;
      rows.forEach(function(r){ var x=tabDelta(r); var delta=x.d-x.k; var kn=String(r.nis||''),ks=String(r.siswa_id||''); if(kn) map['nis:'+kn]=(map['nis:'+kn]||0)+delta; if(ks) map['sid:'+ks]=(map['sid:'+ks]||0)+delta; });
    }
  }catch(e){}
  if(S.loadedKelas===kelas){ S.saldoMap=map; S.rows=rows; S.loadingSaldo=false; if(appState.activeTab==='module:tabungan') render(); }
}
function renderTabunganInputGuruModule(moduleId, detail){
  var S=tabState();
  var kelasOpts=tabKelasOptions();
  if(!S.kelas && kelasOpts.length===1) S.kelas=kelasOpts[0];
  if(!S.tanggal) S.tanggal=agTodayISO();
  var siswa=S.kelas?(getSiswaByKelas(S.kelas)||[]):[];
  if(S.kelas && S.loadedKelas!==S.kelas && !S.loadingSaldo){ loadTabunganData(S.kelas); }
  var camSvg='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5a2 2 0 0 1 2-2h1.6l1-1.5a1 1 0 0 1 .8-.4h5.2a1 1 0 0 1 .8.4l1 1.5H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.2"/></svg>';
  var html='<style id="tabin-style">'
    +'.tabin-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}'
    +'.tabin-scan{flex:0 0 auto;width:42px;height:42px;border-radius:12px;border:none;cursor:pointer;background:linear-gradient(135deg,#2dd4bf,#14b8a6);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(45,212,191,.3)}'
    +'.tabin-scan:active{transform:scale(.94)}'
    +'.tabin-ctrl{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}'
    +'.tabin-empty,.tabin-note{color:#94a3b8;font-size:13px;padding:6px 2px}'
    +'.tabin-list{display:flex;flex-direction:column;gap:10px}'
    +'.tabin-row{border:1px solid rgba(148,163,184,.16);border-radius:12px;padding:10px 12px;background:rgba(148,163,184,.05)}'
    +'.tabin-nm{font-weight:600;font-size:14px;color:#e8ebf2}'
    +'.tabin-mt{font-size:12px;color:#94a3b8;margin-top:2px}'
    +'.tabin-mt b{color:#5eead4}'
    +'.tabin-in{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}'
    +'@media(max-width:520px){.tabin-in{grid-template-columns:1fr}}'
    +'</style>';
  html+='<section class="section"><article class="module-detail-card"><button type="button" class="back-chip" data-action="menu">\u2039 Menu</button><span class="card-label">Keuangan</span><h3 class="module-detail-title">Tabungan Siswa</h3><p class="module-detail-copy">Input tabungan sekelas sekaligus &mdash; isi nominal per siswa, simpan sekali jalan.</p></article></section>';
  if(S.kelas){
    var tSetor0=0,tTarik0=0; (Array.isArray(S.rows)?S.rows:[]).forEach(function(r){ var x=tabDelta(r); tSetor0+=x.d; tTarik0+=x.k; });
    var saldo0=tSetor0-tTarik0;
    var subK=(S.loadingSaldo && !Array.isArray(S.rows))?'Memuat\u2026':('Kelas '+S.kelas);
    html+='<section class="section"><div class="module-stat-grid" style="grid-template-columns:1fr 1fr 1fr;">';
    html+=statCard('Setor','Rp '+Number(tSetor0).toLocaleString('id-ID'),subK,'green');
    html+=statCard('Tarik','Rp '+Number(tTarik0).toLocaleString('id-ID'),subK,'red');
    html+=statCard('Saldo','Rp '+Number(saldo0).toLocaleString('id-ID'),subK,'blue');
    html+='</div></section>';
  }
  html+='<section class="section"><article class="input-panel">';
  html+='<div class="tabin-head"><span class="card-label">Input Tabungan</span><button type="button" class="tabin-scan" onclick="window.zTab.scan()" title="Scan QR / Barcode" aria-label="Scan QR / Barcode">'+camSvg+'</button></div>';
  html+='<div class="tabin-ctrl">';
  html+='<div><label class="field-label">Kelas</label><select class="field-select" onchange="window.zTab.setKelas(this.value)"><option value="">Pilih kelas</option>'+kelasOpts.map(function(k){ return '<option value="'+tabEsc(k)+'"'+(k===S.kelas?' selected':'')+'>'+tabEsc(k)+'</option>'; }).join('')+'</select></div>';
  html+='<div><label class="field-label">Tanggal</label><input type="date" id="tabin-tgl" class="field-input" value="'+tabEsc(S.tanggal)+'" onchange="window.zTab.setField(\'tanggal\',this.value)"></div>';
  html+='<div><label class="field-label">Jenis</label><select id="tabin-jenis" class="field-select" onchange="window.zTab.setField(\'jenis\',this.value)"><option value="Setoran"'+(S.jenis==='Setoran'?' selected':'')+'>Setoran</option><option value="Penarikan"'+(S.jenis==='Penarikan'?' selected':'')+'>Penarikan</option></select></div>';
  html+='<div><label class="field-label">Metode</label><select id="tabin-metode" class="field-select" onchange="window.zTab.setField(\'metode\',this.value)"><option value="Tunai"'+(S.metode==='Tunai'?' selected':'')+'>Tunai</option><option value="Transfer"'+(S.metode==='Transfer'?' selected':'')+'>Transfer</option><option value="QRIS"'+(S.metode==='QRIS'?' selected':'')+'>QRIS</option></select></div>';
  html+='</div>';
  if(!S.kelas){
    html+='<p class="tabin-empty">Pilih kelas dulu untuk menampilkan semua siswa.</p>';
  } else if(!siswa.length){
    html+='<p class="tabin-empty">Belum ada data siswa di kelas '+tabEsc(S.kelas)+'. Buka modul Absensi dulu untuk memuat siswa, atau pastikan Supabase tersambung.</p>';
  } else {
    if(S.loadingSaldo) html+='<p class="tabin-note">Memuat saldo siswa\u2026</p>';
    html+='<div class="tabin-list">';
    html+=siswa.map(function(s){
      var nis=String(s.nis||'');
      var saldo=(S.saldoMap && typeof S.saldoMap['nis:'+nis]==='number')?S.saldoMap['nis:'+nis]:null;
      var saldoTxt=S.loadingSaldo?'\u2026':('Rp '+Number(saldo||0).toLocaleString('id-ID'));
      return '<div class="tabin-row">'
        +'<div class="tabin-si"><div class="tabin-nm">'+tabEsc(s.name||'Siswa')+'</div><div class="tabin-mt">NIS '+tabEsc(nis||'-')+' &middot; Saldo <b>'+saldoTxt+'</b></div></div>'
        +'<div class="tabin-in"><input type="text" inputmode="numeric" class="field-input tabin-nom" data-tab-nis="'+tabEsc(nis)+'" data-tab-nama="'+tabEsc(s.name||'')+'" placeholder="Nominal" oninput="window.zTab.fmtNom(this)"><input type="text" class="field-input tabin-ket" data-tab-ket="'+tabEsc(nis)+'" placeholder="Keterangan (opsional)"></div>'
        +'</div>';
    }).join('');
    html+='</div>';
    appState._tabDock={ kelas:S.kelas };
  }
  html+='</article></section>';
  if(S.kelas && Array.isArray(S.rows)){
    var riwayatRows=S.rows.map(function(r){ var x=tabDelta(r); var isIn=x.d>0 || (!x.k && /setor|masuk/i.test(r.jenis||'')); var amt=Number(r.nominal||x.d||x.k||0); var sal=Number(r.saldo||0); var extra=(isIn?'Setoran':'Penarikan')+' Rp '+amt.toLocaleString('id-ID')+' \u2022 Saldo Rp '+sal.toLocaleString('id-ID'); var ket=String(r.keterangan||'').trim(); return Object.assign({}, r, { catatan: extra+(ket?(' \u2022 '+ket):'') }); });
    html+=renderModuleRiwayat('tabungan', riwayatRows, detail, 'guru:tabungan');
  }
  html+='<div class="absen-bottom-spacer"></div>';
  return html;
}
window.zTab = {
  setKelas: function(v){ var S=tabState(); S.kelas=String(v||''); S.saldoMap=null; S.rows=null; S.loadedKelas=''; render(); },
  setField: function(f,v){ var S=tabState(); if(f==='jenis') S.jenis=String(v||'Setoran'); else if(f==='metode') S.metode=String(v||'Tunai'); else if(f==='tanggal') S.tanggal=String(v||''); },
  fmtNom: function(el){ if(!el) return; var d=String(el.value||'').replace(/\D/g,''); el.value = d ? Number(d).toLocaleString('id-ID') : ''; },
  scan: function(){
    openQrScanner(async function(code){
      var raw=String(code||'').trim();
      if(!raw){ showError('Kode QR kosong / tidak terbaca.'); return; }
      var hit=await agResolveStudent(raw);
      if(!hit){ showToast(agScanNotFoundMsg(raw),'error','&#9888;'); return; }
      var S=tabState();
      if(hit.kelas && hit.kelas!==S.kelas){ S.kelas=hit.kelas; S.saldoMap=null; S.rows=null; S.loadedKelas=''; }
      render();
      showToast('Kelas '+(hit.kelas||'')+' dimuat \u00b7 isi nominal '+hit.name,'success','&#10003;');
    });
  },
  saveAll: async function(){
    var S=tabState();
    var api=window.ZymataMobileSupabase;
    if(!api || !api.select || !api.upsert){ showError('Koneksi Supabase belum siap.'); return; }
    if(!S.kelas){ showToast('Pilih kelas dulu.','error','&#9888;'); return; }
    var jenisEl=document.getElementById('tabin-jenis'), metodeEl=document.getElementById('tabin-metode'), tglEl=document.getElementById('tabin-tgl');
    var jenis=(jenisEl&&jenisEl.value)||S.jenis||'Setoran';
    var metode=(metodeEl&&metodeEl.value)||S.metode||'Tunai';
    var tanggal=(tglEl&&tglEl.value)||S.tanggal||agTodayISO();
    var isSetor=/setor|masuk/i.test(jenis);
    S.jenis=jenis; S.metode=metode; S.tanggal=tanggal;
    var noms=Array.prototype.slice.call(document.querySelectorAll('.tabin-nom[data-tab-nis]'));
    var entries=[];
    noms.forEach(function(el){ var nis=el.getAttribute('data-tab-nis'); var nama=el.getAttribute('data-tab-nama')||''; var nominal=Number(String(el.value||'').replace(/\D/g,''))||0; if(nominal>0){ var ketEl=document.querySelector('.tabin-ket[data-tab-ket="'+nis+'"]'); var ket=ketEl?String(ketEl.value||'').trim():''; entries.push({ nis:nis, nama:nama, nominal:nominal, ket:ket }); } });
    if(!entries.length){ showToast('Isi nominal minimal 1 siswa.','error','&#9888;'); return; }
    showToast('Menyimpan '+entries.length+' data\u2026','info','&#128190;');
    var sisMap={};
    try{ var rS=await api.select('siswa',{ eq:{ kelas:S.kelas }, limit:5000 }); if(rS&&!rS.error&&Array.isArray(rS.data)){ rS.data.forEach(function(row){ var nn=String(row.nis||''); if(nn) sisMap[nn]={ id:String(row.id||row.siswa_id||''), nama:row.nama||row.nama_siswa||'' }; }); } }catch(e){}
    var saldoByNis={}, saldoBySid={};
    try{ var rT=await api.select('tabungan_siswa',{ eq:{ kelas:S.kelas }, limit:5000 }); if(rT&&!rT.error&&Array.isArray(rT.data)){ rT.data.forEach(function(r){ var x=tabDelta(r); var delta=x.d-x.k; var kn=String(r.nis||''),ks=String(r.siswa_id||''); if(kn) saldoByNis[kn]=(saldoByNis[kn]||0)+delta; if(ks) saldoBySid[ks]=(saldoBySid[ks]||0)+delta; }); } }catch(e){}
    var saved=0, failed=0, skipped=[];
    for(var i=0;i<entries.length;i++){
      var e=entries[i]; var info=sisMap[e.nis]||{}; var siswaId=info.id||''; var namaSiswa=e.nama||info.nama||'';
      var saldoBerjalan=(siswaId && typeof saldoBySid[siswaId]==='number')?saldoBySid[siswaId]:(saldoByNis[e.nis]||0);
      if(!isSetor && e.nominal>saldoBerjalan){ skipped.push(namaSiswa||e.nis); continue; }
      var debit=isSetor?e.nominal:0, kredit=isSetor?0:e.nominal; var saldoBaru=saldoBerjalan+debit-kredit;
      var rowUid='tab-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)+'-'+i;
      var payload={ client_key:'default', row_uid:rowUid, siswa_id:siswaId||null, nis:e.nis||null, nama_siswa:namaSiswa||null, kelas:S.kelas||null, jenis:isSetor?'Setoran':'Penarikan', nominal:e.nominal, debit:debit, kredit:kredit, saldo:saldoBaru, keterangan:e.ket||null, tanggal:tanggal, petugas:appState.teacherName||'Guru', metode:metode||'Tunai' };
      try{ var res=await api.upsert('tabungan_siswa', payload, 'row_uid'); if(res&&res.error){ failed++; } else { saved++; if(siswaId) saldoBySid[siswaId]=saldoBaru; if(e.nis) saldoByNis[e.nis]=saldoBaru; } }catch(err){ failed++; }
    }
    var msg=(isSetor?'Setoran':'Penarikan')+': '+saved+' tersimpan'+(failed?(', '+failed+' gagal'):'');
    if(skipped.length) msg+=' \u00b7 saldo kurang: '+skipped.join(', ');
    showToast(msg,(failed||skipped.length)?'error':'success',(failed||skipped.length)?'&#9888;':'&#10003;');
    S.saldoMap=null; S.rows=null; S.loadedKelas=''; render();
    try{ await hydrateGuruFromSupabase(); }catch(e){}
  }
};

function guruModuleDataKey(moduleId) {
  const map = {
    'absensi-siswa': 'absensi',
    'nilai': 'nilai',
    'jurnal-guru': 'jurnal',
    // Jurnal Kelas harus baca key sendiri. Sebelumnya ikut 'jurnal' (jurnal_guru),
    // akibatnya data masuk tabel jurnal_kelas tapi riwayat modul Jurnal Kelas kosong.
    'jurnal-kelas': 'jurnalKelas',
    'catatan-siswa': 'catatan',
    'ibadah': 'ibadah',
    'surat-izin': 'surat',
    'pengumuman': 'pengumuman',
    'mutabaah-rumah': 'mutabaahRumah',
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

const READONLY_GURU_MODULES = { 'mutabaah-rumah': true };
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
    ? '<section class="section"><article class="input-panel"><span class="card-label">Data dari wali (baca saja)</span><p class="module-detail-copy">Laporan mutabaah rumah diisi wali murid di rumah. Guru memeriksa lalu memberi <b>Problem/Kendala</b> dan <b>Konfirmasi Wali</b> pada tiap laporan di bawah.</p></article></section>'
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
  } else {
    listHtml = renderModuleRiwayat(moduleId, list, detail, crudKey);
  }
  return headerHtml + formHtml + listHtml;
}

function renderModulePlaceholder(moduleId) {
  const detail = modulePlaceholders[moduleId];
  if (!detail) return renderMenu();
  if (moduleId === 'kelola-halaqah') return window.renderKelolaHalaqahGuruModule(detail);
  if (moduleId === 'mutabaah-tahfidz') return window.renderMutabaahTahfidzGuruModule(detail);
  if (moduleId === 'program-sekolah') return window.renderProgramSekolahGuruModule(detail);
  if (moduleId === 'perangkat-pembelajaran') return window.renderPerangkatPembelajaranGuruModule(detail);
  if (moduleId === 'tabungan') return renderTabunganInputGuruModule(moduleId, detail);
  const dataKey = guruModuleDataKey(moduleId);
  /* Modul nilai: selalu pakai UI baru NH-1..NH-6, bypass Supabase generic form */
  if (moduleId === 'nilai') return renderScoreModule(detail);
  if (appState.syncMode === 'supabase-live' && moduleId === 'absensi-siswa') return renderStudentAttendanceModule(detail);
  if (appState.syncMode === 'supabase-live' && dataKey) return renderSupabaseGuruDataModule(detail, appState.supabaseModules && appState.supabaseModules[dataKey], moduleId);
  if (appState.syncMode === 'supabase-empty') return renderSupabaseEmptyGuruModule(detail, 'Data modul akan tampil setelah akun guru terhubung ke Supabase.');
  if (moduleId === 'absensi-siswa') return renderStudentAttendanceModule(detail);
  if (moduleId === 'jurnal-guru' || moduleId === 'jurnal-kelas') return renderJournalModule(moduleId, detail);
  if (moduleId === 'surat-izin') return renderLetterPermissionModule(detail);
  if (moduleId === 'ibadah') return renderIbadahModule(detail);
  if (moduleId === 'karakter') return renderKarakterModule(detail);
  if (moduleId === 'prestasi') return renderPrestasiModule(detail);
  if (moduleId === 'pelanggaran') return renderPelanggaranModule(detail);
  if (moduleId === 'ekstrakurikuler') return renderEkstrakulikulerModule(detail);
  if (moduleId === 'kalender-akademik') return renderKalenderAkademikModule(detail);
  if (moduleId === 'catatan-siswa') return renderCatatanSiswaModule(detail);
  if (moduleId === 'pengumuman') return renderPengumumanGuruModule(detail);
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
// Daftar mapel sekolah dari tabel master_mapel (sumber sama dgn web admin). Fallback ke MAPEL_LIST bila belum termuat.
function fullMapelList(){ try { return (appState && Array.isArray(appState.masterMapelList) && appState.masterMapelList.length) ? appState.masterMapelList : MAPEL_LIST; } catch(e){ return MAPEL_LIST; } }
// Muat daftar mapel resmi sekolah dari Supabase (master_mapel) lalu render ulang agar dropdown ikut ter-update.
async function loadMasterMapel(){
  try {
    var db = window.db || window.ZymataMobileSupabase;
    if (!db || typeof db.select !== 'function') return;
    var r = await db.select('master_mapel', { limit: 1000 });
    if (r && !r.error && Array.isArray(r.data)) {
      var set = {}, out = [];
      r.data.forEach(function(m){ var v = String((m && (m.nama || m.mapel || m.kode)) || '').trim(); if (v && !set[v.toLowerCase()]) { set[v.toLowerCase()] = 1; out.push(v); } });
      if (out.length) { appState.masterMapelList = out; try { saveState(); } catch(_){} try { render(); } catch(_){} }
    }
  } catch(e) { console.warn('[Mapel HP] gagal load master_mapel:', e); }
}
// Opsi mapel untuk dropdown.
// - Guru mengajar mapel spesifik => tampilkan mapel itu saja.
// - Guru berlabel generik 'Guru Kelas'/'Wali Kelas' atau data kosong => tampilkan seluruh mapel sekolah (master_mapel).
function guruMapelOpts(){
  try {
    var base = fullMapelList();
    var list = (appState && Array.isArray(appState.guruMapelList)) ? appState.guruMapelList.filter(Boolean) : [];
    var onlyGeneric = list.length > 0 && list.every(function(m){ return /guru\s*kelas|wali\s*kelas|^kelas$|semua|umum/i.test(String(m || '').trim()); });
    if (!list.length || onlyGeneric) return base;
    return list;
  } catch(e) { return MAPEL_LIST; }
}
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
  if (!appState.nilaiFilter) {
    var defKelas = (appState.guruKelasList && appState.guruKelasList.length) ? appState.guruKelasList[0] :
                   (typeof KELAS_LIST!=='undefined' && KELAS_LIST.length ? KELAS_LIST[0] : '');
    appState.nilaiFilter = { kelas: defKelas||'', mapel: '', jenis: 'Ulangan Harian', semester: 'Ganjil', kkm: 70 };
  }
  return appState.nilaiFilter;
}
/* Store NH per siswa: key = nis+'||'+mapel+'||'+sem+'||'+jenis */
function nhKey(nis,f){ return nis+'||'+f.mapel+'||'+f.semester+'||'+f.jenis; }
function nhStore(){ if(!appState.nilaiNhStore) appState.nilaiNhStore={}; return appState.nilaiNhStore; }
function nhGet(nis,f){ var k=nhKey(nis,f); if(!nhStore()[k]) nhStore()[k]={nh:[0,0,0,0,0,0],catatan:'',kkm:0}; var r=nhStore()[k]; if(!Array.isArray(r.nh)){r.nh=[r.nilai||0,0,0,0,0,0];} while(r.nh.length<6)r.nh.push(0); return r; }
function nhAvgVal(nhArr){ var fil=nhArr.filter(function(v){return v>0;}); if(!fil.length)return 0; return Math.round(fil.reduce(function(a,b){return a+b;},0)/fil.length); }
function nhFilled(nis,f){ var r=nhStore()[nhKey(nis,f)]; if(!r)return false; return (Array.isArray(r.nh)&&r.nh.some(function(v){return v>0;}))||!!(r.catatan); }
// Simpan nilai ke Supabase tabel nilai_siswa agar web admin bisa membaca.
// Schema nilai_siswa: siswa_id=text, kelas=text, mapel=text, semester=text,
//   nilai_tugas=smallint, nilai_ujian=smallint, nilai_akhir=numeric, catatan=text, jenis=text
async function saveNilaiSiswa(nf, nhStoreData, siswaList) {
  var bridge = window.ZymataMobileSupabase || window.db;
  if (!bridge) throw new Error('Bridge tidak tersedia');
  var client = typeof bridge.getClient === 'function' ? bridge.getClient() : null;
  if (!client || !client.from) throw new Error('Supabase client tidak siap');
  var rows = [];
  (siswaList || []).forEach(function(s) {
    // siswa_id di DB adalah TEXT — kirim sebagai string
    var siswa_id = String(s._id || s.id || s.siswa_id || s.nis || '').trim();
    if (!siswa_id) return;
    var key = s.nis + '||' + (nf.mapel||'') + '||' + (nf.semester||'') + '||' + (nf.jenis||'');
    var nd = nhStoreData[key];
    if (!nd) return;
    var nh = Array.isArray(nd.nh) ? nd.nh.map(Number) : [];
    var filled = nh.filter(function(v){ return v > 0; });
    if (!filled.length && !nd.catatan) return; // skip siswa yang belum diisi sama sekali
    var avg = filled.length ? Math.round(filled.reduce(function(a,b){return a+b;},0)/filled.length) : 0;
    rows.push({
      siswa_id:    siswa_id,                        // text
      kelas:       String(nf.kelas    || ''),        // text, NOT NULL
      mapel:       String(nf.mapel    || ''),        // text, NOT NULL
      semester:    String(nf.semester || 'Ganjil'),  // text, NOT NULL, default 'Ganjil'
      jenis:       String(nf.jenis    || ''),        // text
      nilai_tugas: Math.round(Number(nh[0]) || 0),  // smallint
      nilai_ujian: Math.round(Number(nh[1]) || 0),  // smallint
      nilai_akhir: avg,                              // numeric
      catatan:     String(nd.catatan  || ''),        // text
      nis:         String(s.nis       || ''),        // text (opsional tapi berguna)
      nama_siswa:  String(s.name || s.nama || ''),  // text (opsional)
      client_key:  'default'                         // WAJIB: web admin filter WHERE client_key='default'
    });
  });
  if (!rows.length) return { saved: 0, total: 0, errors: ['0 baris diproses — ' + (siswaList||[]).length + ' siswa, mapel=' + (nf.mapel||'-') + ' sem=' + (nf.semester||'-')] };
  var saved = 0, errors = [];
  for (var i = 0; i < rows.length; i++) {
    try {
      // Cek apakah baris sudah ada (SELECT dulu, hindari masalah onConflict unique constraint)
      var existing = await client.from('nilai_siswa')
        .select('id')
        .eq('siswa_id', rows[i].siswa_id)
        .eq('mapel',    rows[i].mapel)
        .eq('semester', rows[i].semester)
        .limit(1);
      var existId = existing && !existing.error && existing.data && existing.data[0] ? existing.data[0].id : null;
      var res;
      if (existId) {
        // UPDATE baris yang sudah ada
        res = await client.from('nilai_siswa').update(rows[i]).eq('id', existId).select();
      } else {
        // INSERT baris baru
        res = await client.from('nilai_siswa').insert(rows[i]).select();
      }
      if (res && !res.error) saved++;
      else errors.push((res && res.error && (res.error.message || res.error.details || JSON.stringify(res.error))) || 'db error');
    } catch(e) { errors.push(e && e.message ? e.message : String(e)); }
  }
  return { saved: saved, total: rows.length, errors: errors };
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
  const kelasList = (appState.guruKelasList && appState.guruKelasList.length) ? appState.guruKelasList
                  : (typeof KELAS_LIST!=='undefined' ? KELAS_LIST : []);
  const siswaList = f.kelas ? (SISWA_PER_KELAS[f.kelas] || []).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),'id')) : [];
  const isUH = /ulangan\s*harian/i.test(f.jenis);
  const kkm = Number(f.kkm) || 70;

  // Stat hitung dari nilaiNhStore
  let total=siswaList.length, filled=0, tuntas=0, remedial=0, sumAvg=0;
  siswaList.forEach(function(s){
    if(nhFilled(s.nis,f)){
      filled++;
      var avg=nhAvgVal(nhGet(s.nis,f).nh);
      sumAvg+=avg;
      if(avg>=kkm) tuntas++; else remedial++;
    }
  });
  var avgKelas = filled ? Math.round(sumAvg/filled) : 0;

  // Baris per siswa
  function studentCard(s, idx) {
    var r = nhGet(s.nis, f);
    var avg = nhAvgVal(r.nh);
    var isFilled = nhFilled(s.nis, f);
    var isTuntas = isFilled && avg >= kkm;
    var badgeHtml = !isFilled
      ? '<span class="ns-badge" style="background:#2a2a3a;color:#9a9a92">Belum</span>'
      : (isTuntas ? '<span class="ns-badge" style="background:#0f3d2a;color:#34d399">Tuntas</span>'
                  : '<span class="ns-badge" style="background:#3d1a1a;color:#f87171">Remedial</span>');
    var inits = String(s.name||'?').split(' ').map(function(p){return p[0]||'';}).slice(0,2).join('').toUpperCase();
    var nhInputs = '';
    if (isUH) {
      nhInputs = '<div class="ns-nh-grid">';
      for (var j=0;j<6;j++) {
        nhInputs += '<div class="ns-nh-cell">'
          + '<label class="ns-nh-label">NH-'+(j+1)+'</label>'
          + '<input class="ns-nh-inp" type="number" inputmode="numeric" min="0" max="100" '
          + 'data-nh-nis="'+s.nis+'" data-nh-idx="'+j+'" value="'+(r.nh[j]||0)+'" placeholder="0">'
          + '</div>';
      }
      nhInputs += '</div>';
      nhInputs += '<div class="ns-avg-row">Rata-rata: <strong class="ns-avg-val" data-nh-avg="'+s.nis+'" style="color:'+(isFilled?(isTuntas?'#34d399':'#f87171'):'#9a9a92')+'">'+(avg||'—')+'</strong></div>';
    } else {
      nhInputs = '<div class="ns-single-row">'
        + '<label class="ns-nh-label">Nilai</label>'
        + '<input class="ns-nh-inp" type="number" inputmode="numeric" min="0" max="100" '
        + 'data-nh-nis="'+s.nis+'" data-nh-idx="0" value="'+(r.nh[0]||0)+'" placeholder="0">'
        + '<label class="ns-nh-label" style="margin-left:12px">KKM</label>'
        + '<input class="ns-nh-inp" type="number" inputmode="numeric" min="0" max="100" '
        + 'data-nh-kkm="'+s.nis+'" value="'+(r.kkm||kkm)+'" placeholder="'+kkm+'">'
        + '</div>';
    }
    return '<article class="ns-card" data-nis="'+s.nis+'">' +
      '<div class="ns-card-head">' +
        '<span class="ns-avatar" style="background:'+(isFilled?(isTuntas?'#0f3d2a':'#3d1a1a'):'#1a1f2e')+'">' + inits + '</span>' +
        '<div class="ns-info">' +
          '<strong class="ns-name">' + (s.name||'—') + '</strong>' +
          '<small class="ns-meta">NIS ' + (s.nis||'—') + '</small>' +
        '</div>' +
        badgeHtml +
      '</div>' +
      '<div class="ns-card-body">' + nhInputs + '</div>' +
    '</article>';
  }

  var studentCards = siswaList.length
    ? siswaList.map(studentCard).join('')
    : '<div class="ns-empty">' + (f.kelas && f.mapel ? 'Belum ada data siswa untuk kelas ini.' : 'Pilih kelas dan mata pelajaran terlebih dahulu.') + '</div>';

  return `
    ${moduleIntro(detail)}
    ${moduleScanBlock('nilai')}

    <style>
      .ns-primary{display:flex;gap:10px;flex-wrap:wrap;padding:0 16px 8px;}
      .ns-pfield{flex:1;min-width:140px;}
      .ns-pfield label{display:block;font-size:11px;font-weight:700;color:#9a9a92;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px;}
      .ns-pfield select{width:100%;padding:10px 12px;background:#131a2b;border:1.5px solid #2a3352;border-radius:10px;color:#fcfcfc;font-size:14px;font-weight:600;-webkit-appearance:none;}
      .ns-adv{margin:0 16px 8px;}
      .ns-adv summary{font-size:12px;color:#9a9a92;cursor:pointer;padding:6px 0;list-style:none;}
      .ns-adv summary::-webkit-details-marker{display:none;}
      .ns-adv-body{display:flex;gap:10px;flex-wrap:wrap;padding:8px 0 4px;}
      .ns-adv-body .ns-pfield select,.ns-adv-body .ns-pfield input{background:#0e1320;border-color:#1e2845;font-size:13px;}
      .ns-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:0 16px 12px;}
      .ns-stat{background:#0e1320;border-radius:10px;padding:10px 8px;text-align:center;}
      .ns-stat-val{font-size:20px;font-weight:800;color:#fcfcfc;line-height:1.1;}
      .ns-stat-lbl{font-size:10px;color:#9a9a92;margin-top:2px;}
      .ns-card{background:#0e1320;border:1px solid #1e2845;border-radius:14px;margin:0 16px 10px;overflow:hidden;}
      .ns-card-head{display:flex;align-items:center;gap:10px;padding:12px 14px;}
      .ns-avatar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#fcfcfc;flex:0 0 auto;}
      .ns-info{flex:1;min-width:0;}
      .ns-name{display:block;font-size:14px;font-weight:700;color:#fcfcfc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .ns-meta{font-size:11px;color:#9a9a92;}
      .ns-badge{padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;flex:0 0 auto;}
      .ns-card-body{padding:0 14px 12px;}
      .ns-nh-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px;}
      .ns-nh-cell{display:flex;flex-direction:column;gap:3px;}
      .ns-nh-label{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;}
      .ns-nh-inp{width:100%;padding:8px 6px;background:#131a2b;border:1.5px solid #2a3352;border-radius:8px;color:#fcfcfc;font-size:15px;font-weight:700;text-align:center;box-sizing:border-box;}
      .ns-nh-inp:focus{border-color:#00ffdb;outline:none;}
      .ns-avg-row{font-size:12px;color:#9a9a92;text-align:right;margin-top:4px;}
      .ns-avg-val{font-size:15px;font-weight:800;margin-left:6px;}
      .ns-single-row{display:flex;align-items:center;gap:8px;}
      .ns-single-row .ns-nh-inp{width:70px;flex:0 0 auto;}
      .ns-empty{text-align:center;color:#9a9a92;padding:32px 16px;font-size:14px;}
      .ns-save-btn{width:calc(100% - 32px);margin:4px 16px 16px;padding:14px;background:linear-gradient(135deg,#00ffdb,#34e8cf);border:none;border-radius:12px;color:#06231f;font-size:15px;font-weight:800;cursor:pointer;}
      .ns-section-title{font-size:12px;font-weight:700;color:#9a9a92;text-transform:uppercase;letter-spacing:.5px;padding:12px 16px 6px;}
    </style>

    <!-- Selector Utama: Kelas & Mapel -->
    <div class="ns-primary">
      <div class="ns-pfield">
        <label>Kelas</label>
        <select data-select="nf-kelas">
          <option value="">${kelasList.length?'Pilih kelas':'Belum ada kelas'}</option>
          ${kelasList.map(k=>`<option value="${k}"${k===f.kelas?' selected':''}>${k}</option>`).join('')}
        </select>
      </div>
      <div class="ns-pfield">
        <label>Mata Pelajaran</label>
        <select data-select="nf-mapel">
          <option value="">${guruMapelOpts().length?'Pilih mapel':'—'}</option>
          ${guruMapelOpts().map(m=>`<option value="${m}"${m===f.mapel?' selected':''}>${m}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- Pengaturan Lanjutan: Semester, Jenis, KKM -->
    <details class="ns-adv">
      <summary>&#9881; Pengaturan &mdash; ${f.semester} &middot; ${f.jenis} &middot; KKM ${kkm}</summary>
      <div class="ns-adv-body">
        <div class="ns-pfield">
          <label>Semester</label>
          <select data-select="nf-semester">
            ${NILAI_SEMESTER.map(s=>`<option value="${s}"${s===f.semester?' selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="ns-pfield">
          <label>Jenis Penilaian</label>
          <select data-select="nf-jenis">
            ${NILAI_JENIS.map(j=>`<option value="${j}"${j===f.jenis?' selected':''}>${j}</option>`).join('')}
          </select>
        </div>
        <div class="ns-pfield">
          <label>KKM Default</label>
          <input type="number" inputmode="numeric" min="0" max="100" data-select="nf-kkm" value="${kkm}" placeholder="70">
        </div>
      </div>
    </details>

    <!-- Stat ringkasan -->
    <div class="ns-stats">
      <div class="ns-stat"><div class="ns-stat-val">${total}</div><div class="ns-stat-lbl">Total</div></div>
      <div class="ns-stat"><div class="ns-stat-val" style="color:#34d399">${tuntas}</div><div class="ns-stat-lbl">Tuntas</div></div>
      <div class="ns-stat"><div class="ns-stat-val" style="color:#f87171">${remedial}</div><div class="ns-stat-lbl">Remedial</div></div>
      <div class="ns-stat"><div class="ns-stat-val" style="color:#60a5fa">${avgKelas||'—'}</div><div class="ns-stat-lbl">Rata-rata</div></div>
    </div>

    <!-- List siswa -->
    <div class="ns-section-title">${isUH?'Input NH-1 s/d NH-6':'Input Nilai'} &mdash; ${f.kelas||'pilih kelas'}</div>
    <div id="ns-student-list">
      ${studentCards}
    </div>

    <!-- Tombol Simpan -->
    ${siswaList.length ? `<button type="button" class="ns-save-btn" data-save-nilai>&#128190; Simpan Nilai</button>` : ''}
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

          ${selectField('Mata Pelajaran', f.mapel, guruMapelOpts(), 'jk-mapel')}

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

        ${selectField('Mata Pelajaran', f.mapel, guruMapelOpts(), 'jg-mapel')}

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
    var nis = String(row.nis || row.nisn || '').trim() || String(row.id || '').trim();
    var sid = String(row.id || row.siswa_id || '').trim();
    if (!SISWA_PER_KELAS[kelas]) SISWA_PER_KELAS[kelas] = [];
    SISWA_PER_KELAS[kelas].push({ nis: nis, name: nama, id: sid });
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
          <p class="module-detail-copy"><span class="status-pill ${/tolak|reject/i.test(status) ? 'red' : (/setuj|disetuj|approv|terima/i.test(status) ? 'green' : (m.unread ? 'orange' : 'green'))}">${status}</span></p>
        </article>
      </section>
      <section class="section">
        <article class="input-panel">
          <span class="card-label">Perihal</span>
          <h4 class="module-detail-title" style="font-size:15px;margin-top:4px">${perihal}</h4>
          <p class="module-detail-copy" style="white-space:pre-wrap;margin-top:8px">${isi}</p>
        </article>
      </section>
      <section class="section">
        <span class="card-label">Keputusan wali kelas</span>
        <div class="field-chip-row" style="margin-top:6px">
          <button type="button" class="field-chip" style="background:#DCFCE7;color:#166534;font-weight:700;border-color:#86EFAC" data-message-approve="${appState.activeMessageIdx}">✓ Setujui</button>
          <button type="button" class="field-chip" style="background:#FEE2E2;color:#991B1B;font-weight:700;border-color:#FCA5A5" data-message-reject="${appState.activeMessageIdx}">✕ Tolak</button>
        </div>
        <div class="field-chip-row" style="margin-top:8px">
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
      <p style="font-size:11px;color:#64748B;margin-top:6px">[srt v4] ${appState._suratDbg || 'belum sinkron'}</p>
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
          ${(function(){ var s = String(item.status || ''); if (/setuj|disetuj|approv|terima/i.test(s)) return '<span class="status-pill green">✓ Disetujui</span>'; if (/tolak|reject/i.test(s)) return '<span class="status-pill red">✕ Ditolak</span>'; return item.unread ? '<span class="status-pill orange">● Belum dibaca</span>' : '<span class="status-pill blue">✓ Dibaca</span>'; })()}
          <button type="button" class="message-reply-btn" data-message-open="${idx}">Buka</button>
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
  const _tab = appState._tabDock;
  const dockHtml = _dock ? `
    <div class="sticky-action-bar is-floating absen-save-dock ${_dock.locked ? 'is-locked' : ''}">
      <div>
        <strong>${_dock.locked ? 'Absensi Hari Ini Selesai' : ('Simpan Absensi Kelas ' + _dock.kelas)}</strong>
        <span>${_dock.filled}/${_dock.total} siswa tercatat${_dock.savedToday ? ' · sudah tersimpan hari ini' : ''}</span>
      </div>
      <button type="button" class="sticky-save-btn" data-save-absensi ${_dock.locked ? 'disabled aria-disabled="true"' : ''}>${_dock.locked ? 'Sudah Absen' : 'Simpan'}</button>
    </div>` : _tab ? `
    <div class="sticky-action-bar is-floating">
      <div>
        <strong>Simpan Tabungan Kelas ${_tab.kelas}</strong>
        <span>Isi nominal siswa lalu simpan sekaligus</span>
      </div>
      <button type="button" class="sticky-save-btn" data-save-tabungan>Simpan Semua</button>
    </div>` : '';

  if (!appState.showAnnouncements) {
    floatingEl.hidden = !(toastHtml || dockHtml);
    floatingEl.innerHTML = dockHtml + toastHtml;
    return;
  }

  floatingEl.hidden = false;
  ensureAnnStyles();
  const _annTargetType = function(r){
    if(!r) return 'semua';
    var pl = {};
    try { if(r.payload) pl = (typeof r.payload==='string') ? JSON.parse(r.payload) : r.payload; } catch(_){}
    var type = String(r.target_type || pl.target_type || '').toLowerCase();
    var label = String(r.target || r.target_label || pl.target || pl.target_label || '').toLowerCase();
    if(!type) type = /wali|murid|orang tua|orangtua|ortu/.test(label) ? 'wali' : (/guru/.test(label) ? 'guru' : 'semua');
    return type;
  };
  // Aplikasi ini untuk GURU: sembunyikan pengumuman ber-target Wali Murid.
  const _pengRows = ((appState.supabaseModules && appState.supabaseModules.pengumuman) || []).filter(function(r){ return _annTargetType(r) !== 'wali'; });
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
  appState._tabDock = null;
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
  if (nextTab === 'teacherAttendance' && !appState._agAttnLoaded) { try { hydrateTeacherAttendanceFast(); } catch(_){} }
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
    // Setujui / Tolak surat -> tutup detail langsung + simpan status ke Supabase (UPDATE eksplisit + fallback upsert)
    const msgDecision = event.target.closest('[data-message-approve],[data-message-reject]');
    if (msgDecision) {
      const isApprove = msgDecision.hasAttribute('data-message-approve');
      const idx = parseInt(isApprove ? msgDecision.dataset.messageApprove : msgDecision.dataset.messageReject, 10);
      if (!isNaN(idx) && messages[idx]) {
        const newStatus = isApprove ? 'Disetujui' : 'Ditolak';
        const r = messages[idx].raw || {};
        const db = window.db || window.ZymataMobileSupabase;
        messages[idx].unread = false;
        messages[idx].status = newStatus;
        appState.unreadMessages = messages.filter(function(m){ return m.unread; }).length;
        appState.activeMessageIdx = null; // langsung tutup detail & kembali ke daftar (UX profesional)
        render();
        showToast(isApprove ? 'Surat disetujui' : 'Surat ditolak', isApprove ? 'success' : 'warning', isApprove ? '✓' : '✕');
        (async function(){
          try {
            if (r.id === undefined || r.id === null || r.id === '') { showToast('Surat tanpa ID, status hanya tersimpan lokal', 'warning', '!'); return; }
            var pl = {};
            try { pl = r.payload ? ((typeof r.payload === 'string') ? JSON.parse(r.payload) : r.payload) : {}; } catch(_) {}
            pl.keputusan_guru = newStatus;
            pl.keputusan_oleh = appState.teacherName || '';
            pl.keputusan_at = new Date().toISOString();
            var okSaved = false, errMsg = '';
            try {
              var client = (db && typeof db.getClient === 'function') ? db.getClient() : null;
              if (client && client.from) {
                var up = await client.from('surat').update({ status: newStatus, payload: pl }).eq('id', r.id);
                if (up && !up.error) okSaved = true; else errMsg = (up && up.error && (up.error.message || up.error.details)) || '';
              }
            } catch(e1) { errMsg = (e1 && e1.message) ? e1.message : String(e1); }
            if (!okSaved && db && typeof db.upsert === 'function') {
              try {
                var us = await db.upsert('surat', { id: r.id, status: newStatus, payload: JSON.stringify(pl) });
                if (us && !us.error) okSaved = true; else errMsg = (us && us.error && (us.error.message || us.error)) || errMsg;
              } catch(e2) { errMsg = (e2 && e2.message) ? e2.message : String(e2); }
            }
            r.status = newStatus; r.payload = pl;
            saveDataCache(); saveState();
            if (!okSaved) showToast('Gagal sinkron ke server: ' + (errMsg || 'tidak diketahui'), 'warning', '!');
          } catch(eAll) { showToast('Error simpan: ' + ((eAll && eAll.message) ? eAll.message : eAll), 'warning', '!'); }
        })();
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

    const saveTab = event.target.closest('[data-save-tabungan]');
    if (saveTab) { if (window.zTab && window.zTab.saveAll) window.zTab.saveAll(); return; }

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

    const saveNilaiBtn = event.target.closest('[data-save-nilai]');
    if (saveNilaiBtn) {
      var nf = getNilaiState();
      var siswaKelas = nf.kelas ? (SISWA_PER_KELAS[nf.kelas]||[]) : [];
      var count = siswaKelas.filter(function(s){ return nhFilled(s.nis,nf); }).length;
      saveOnlyNoRender();
      /* Coba simpan ke Supabase jika tersedia */
      (async function(){
        var ok = false; var _errMsg = '';
        try{
          var _svRes = await saveNilaiSiswa(nf, nhStore(), siswaKelas);
          ok = _svRes && _svRes.saved > 0;
          if (_svRes && _svRes.errors && _svRes.errors.length) console.warn('[Nilai] simpan errors:', _svRes.errors);
        }catch(e){ console.warn('[Nilai] Supabase error:',e); _errMsg = e && e.message ? e.message : String(e); }
        if (!_errMsg && _svRes && _svRes.errors && _svRes.errors.length) _errMsg = _svRes.errors[0];
        showToast((ok?'✓ Tersimpan: '+count+' siswa.':'⚠ '+(_errMsg||'tidak ada siswa terisi')), ok?'success':'warning', ok?'&#10003;':'&#9888;');
        appState.offlineDrafts = ok ? appState.offlineDrafts : (appState.offlineDrafts||0)+1;
        appState.lastSyncLabel = ok ? 'Nilai tersimpan' : `Draft lokal bertambah (${appState.offlineDrafts})`;
        render();
      })();
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
      if (key === 'nf-kelas') { getNilaiState().kelas = val; render(); return; }
      if (key === 'nf-mapel') { getNilaiState().mapel = val; render(); return; }
      if (key === 'nf-jenis') { getNilaiState().jenis = val; render(); return; }
      if (key === 'nf-semester') { getNilaiState().semester = val; render(); return; }
      if (key === 'nf-kkm') { getNilaiState().kkm = Number(val)||70; render(); return; }
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
    /* NH input handler */
    const nhInp = event.target.closest('[data-nh-nis]');
    if (nhInp) {
      const nis = nhInp.getAttribute('data-nh-nis');
      const f = getNilaiState();
      const r = nhGet(nis, f);
      const idxAttr = nhInp.getAttribute('data-nh-idx');
      const kkmAttr = nhInp.getAttribute('data-nh-kkm');
      const v = Math.min(100, Math.max(0, parseInt(nhInp.value||'0',10)||0));
      if (idxAttr !== null) {
        r.nh[parseInt(idxAttr,10)] = v;
        r.nilai = nhAvgVal(r.nh); /* kompatibilitas */
      } else if (kkmAttr !== null) {
        r.kkm = v;
      }
      /* Update badge & avg inline tanpa full render */
      var card = nhInp.closest('[data-nis]');
      if (card) {
        var kkm = Number(f.kkm)||70;
        var avg = nhAvgVal(r.nh);
        var isFilled = r.nh.some(function(x){return x>0;});
        var isTuntas = isFilled && avg >= kkm;
        var badge = card.querySelector('.ns-badge');
        if (badge) {
          badge.textContent = !isFilled ? 'Belum' : (isTuntas ? 'Tuntas' : 'Remedial');
          badge.style.background = !isFilled ? '#2a2a3a' : (isTuntas ? '#0f3d2a' : '#3d1a1a');
          badge.style.color = !isFilled ? '#9a9a92' : (isTuntas ? '#34d399' : '#f87171');
        }
        var avgEl = card.querySelector('[data-nh-avg]');
        if (avgEl) { avgEl.textContent = avg||'—'; avgEl.style.color = isFilled?(isTuntas?'#34d399':'#f87171'):'#9a9a92'; }
        var av = card.querySelector('.ns-avatar');
        if (av) av.style.background = isFilled?(isTuntas?'#0f3d2a':'#3d1a1a'):'#1a1f2e';
      }
      saveOnlyNoRender();
    }
  });
}

// Kirim presensi guru ke Supabase (tabel absensi_guru) agar tampil di web.
// Kolom & match key disamakan dengan web: tanggal,sesi,nip + status,jam_masuk,jam_pulang,keterangan.
async function saveTeacherAttendanceToSupabase(allowExistingUpdate) {
  const att = appState.teacherAttendance || {};
  const nip = String(appState.teacherNip || '').trim();
  if (!nip) {
    console.warn('[AbsenGuru HP] NIP guru kosong - presensi belum bisa tampil di web. Pastikan akun guru punya NIP.');
    showToast('Presensi tersimpan, tapi NIP guru kosong sehingga belum tampil di web.', 'error', '&#9888;');
    return false;
  }
  var existingToday = getTodayTeacherAttendanceRow();
  if (existingToday && !allowExistingUpdate && !att.__allowInitialSave) {
    syncTeacherAttendanceFromTodayRow(existingToday);
    showToast('Check-in guru hari ini sudah tersimpan. Lanjutkan dengan check-out saat pulang.', 'error', '&#9888;');
    return false;
  }
  const dbStatus = agDbStatus(att.status || 'hadir');
  const isAlpa = dbStatus === 'alpa';
  const lateKet = (att.status === 'terlambat' || att.isLate)
    ? ('Terlambat' + (att.lateMinutes ? (' ' + att.lateMinutes + ' menit') : '') + (att.checkIn ? ('; check-in ' + att.checkIn) : ''))
    : '';
  const payload = {
    tanggal: agTodayISO(),
    sesi: att.sesi || 'Hari Kerja Biasa',
    nip: nip,
    status: dbStatus,
    jam_masuk: isAlpa ? '' : (att.checkIn || ''),
    jam_pulang: isAlpa ? '' : (att.checkOut || ''),
    keterangan: [att.keterangan || att.ket || '', lateKet, att.note || ''].filter(Boolean).join(' | '),
    client_key: 'default'  // wajib agar web bisa baca (web filter: WHERE client_key = 'default')
  };
  try {
    if (existingToday && allowExistingUpdate && window.ZymataMobileSupabase && typeof window.ZymataMobileSupabase.getClient === 'function') {
      var client = window.ZymataMobileSupabase.getClient();
      var upd = null;
      if (existingToday.id) {
        upd = await client.from('absensi_guru').update(payload).eq('id', existingToday.id).select();
      } else {
        upd = await client.from('absensi_guru').update(payload).eq('tanggal', payload.tanggal).eq('nip', payload.nip).select();
      }
      if (upd && upd.error) {
        console.warn('[AbsenGuru HP] gagal update checkout:', upd.error.message || upd.error);
        showToast('Check-out tersimpan lokal, gagal sinkron ke web: ' + (upd.error.message || 'error'), 'error', '&#9888;');
        return false;
      }
      console.log('[AbsenGuru HP] checkout/update tersimpan ke Supabase:', payload.tanggal, '|', payload.nip);
      return true;
    }
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
  var todayRow = getTodayTeacherAttendanceRow();
  if (todayRow) syncTeacherAttendanceFromTodayRow(todayRow);
  if (type === 'checkIn' && hasTeacherCheckInToday()) {
    showToast('Check-in guru hari ini sudah tersimpan. Tidak bisa check-in dua kali.', 'error', '&#9888;');
    return false;
  }
  if (type === 'checkOut' && isTeacherAttendanceLockedToday()) {
    showToast('Check-out guru hari ini sudah tersimpan dan dikunci.', 'error', '&#9888;');
    return false;
  }
  // [ZYMATA] LAPIS 2 (anti-manipulasi): pakai jam server bila online; tolak bila jam HP menyimpang > 5 menit.
  var __serverMs = await agServerNowMs();
  if (__serverMs != null) {
    var __devMin = Math.abs(__serverMs - Date.now()) / 60000;
    if (__devMin > 5) {
      var __msg = 'Jam HP kamu tidak sinkron dengan server (selisih ~' + Math.round(__devMin) + ' menit). Aktifkan "Tanggal & waktu otomatis" di pengaturan HP, lalu coba lagi.';
      appState.teacherAttendance.note = __msg;
      showToast(__msg, 'error', '&#9888;');
      return false;
    }
  }
  const hhmm = (__serverMs != null) ? agHHMMFromMs(__serverMs) : agNowHHMM();
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
    appState.teacherAttendance.activeDate  = agTodayISO();
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
    var saved = await saveTeacherAttendanceToSupabase(false);
    if (saved) {
      appState.teacherAttendance.lockedToday = false;
      appState.teacherAttendance.lockedDate = '';
      appState.teacherAttendance.note = 'Check-in tersimpan. Silakan check-out saat pulang.';
    }
    return true;
  }
  if (type === 'checkOut' && appState.teacherAttendance.checkIn && !appState.teacherAttendance.checkOut) {
    // [ZYMATA] LAPIS 1 (guard logika, jalan walau offline): jam pulang tidak boleh <= jam masuk.
    if (agMinOf(hhmm) <= agMinOf(appState.teacherAttendance.checkIn)) {
      var __m2 = 'Jam pulang (' + hhmm + ') tidak boleh lebih awal atau sama dengan jam masuk (' + appState.teacherAttendance.checkIn + '). Cek jam HP kamu.';
      appState.teacherAttendance.note = __m2;
      showToast(__m2, 'error', '&#9888;');
      return false;
    }
    appState.teacherAttendance.checkOut = hhmm;
    appState.teacherAttendance.note = `Presensi selesai. Pulang pukul ${hhmm}.`;
    var savedOut = await saveTeacherAttendanceToSupabase(true);
    if (savedOut) {
      appState.teacherAttendance.lockedToday = true;
      appState.teacherAttendance.lockedDate = agTodayISO();
      appState.teacherAttendance.note = 'Presensi guru hari ini sudah selesai dan dikunci.';
    }
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
    // Normalisasi nama kelas agar cocok walau beda spasi/kapital/awalan "Kelas" atau pemisah (-, /, spasi)
    var _normKelas = function(v){ return String(v == null ? '' : v).replace(/^kelas\s*/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase(); };
    // Daftar kelas guru (wali kelas + kelas yang diajar) untuk pencocokan
    var _kelasGuru = (Array.isArray(appState.guruKelasList) && appState.guruKelasList.length) ? appState.guruKelasList.slice() : (kelasUtama ? [kelasUtama] : []);
    var _kelasGuruNorm = _kelasGuru.map(_normKelas).filter(Boolean);
    // Filter: surat dari wali murid, diarahkan ke WALI KELAS dari kelas siswa tersebut
    const filtered = rows.filter(function(r) {
      if (!r) return false;
      var payload = {};
      try { if (r.payload) payload = (typeof r.payload === 'string') ? JSON.parse(r.payload) : r.payload; } catch(_) {}
      var sis = payload.__siswa || payload.siswa || {};
      var f = payload.fields || {};
      // Sumber kelas surat (JANGAN pakai r.pihak yang berisi "Wali Murid")
      var suratKelas = r.kelas || payload.kelas || sis.kelas || f.kelas || '';
      // Deteksi surat yang berasal dari wali murid seluas mungkin
      var isWaliMurid = (payload.sumber === 'WaliMurid')
        || /wali/i.test(String(payload.role || ''))
        || /wali/i.test(String(r.sumber || ''))
        || /surat-?wali|wali/i.test(String(payload.module || ''))
        || !!(r.nama_siswa || sis.nama || payload.nama_siswa || f.nama_siswa)
        || !!(r.siswa_id || sis.id)
        || !!(r.nama_wali || payload.nama_wali)
        || /izin|sakit|terlambat|pulang|dispensasi|orang tua|wali/i.test(String(r.jenis || '') + ' ' + String(r.perihal || '') + ' ' + String(r.pihak || ''));
      if (!isWaliMurid) return false;
      // Arahkan ke wali kelas: tampil jika surat tak berkelas, guru tak punya daftar kelas,
      // atau kelas surat cocok dengan salah satu kelas guru (ternormalisasi).
      if (!suratKelas || !_kelasGuruNorm.length) return true;
      return _kelasGuruNorm.indexOf(_normKelas(suratKelas)) !== -1;
    });
    try { appState._suratDbg = 'db=' + rows.length + ' tampil=' + filtered.length + ' kelasGuru=' + (_kelasGuru.join(',') || '-'); } catch(_) {}
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
      // Belum dibaca = surat wali yang BELUM ditangani (belum dibaca/disetujui/ditolak/dibalas).
      // Status seperti 'Menunggu', 'Baru', 'Belum', 'Terkirim', atau kosong => dianggap belum dibaca.
      var _st = String(r.status || '').toLowerCase();
      var sudahDitangani = sudahDibalas || /disetuj|setuj|tolak|ditolak|dibaca|selesai|approv|reject|batal/.test(_st);
      var statusBelum = !sudahDitangani;
      return {
        sender: sender,
        preview: preview.slice(0, 80) + (preview.length > 80 ? '...' : ''),
        time: timeLabel || tgl.slice(0,10) || '-',
        jam: jamLabel,
        unread: statusBelum,
        replied: sudahDibalas,
        balasan: balasan,
        tone: statusBelum ? 'orange' : 'green',
        status: r.status || '',
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
      var teacherNipKey = String((typeof appState !== 'undefined' && appState.teacherNip) || '').trim();
      var mine = allRows.filter(function(r){
        // Cocokkan via NIP (paling andal) - dukung co-teaching: nip dipisah / , & atau "dan"
        var gnip = String(r.guru_nip || r.nip_guru || r.nip || '').trim();
        if (teacherNipKey && gnip) {
          if (gnip.split(/\s*(?:\/|,|&|\bdan\b)\s*/).map(function(x){ return x.trim(); }).indexOf(teacherNipKey) !== -1) return true;
        }
        // Cocokkan via nama - dukung co-teaching: nama bisa dipisah / , & atau "dan"
        var g = normName(r.guru || r.nama_guru || r.guru_nama);
        if (!g) return false;
        if (g === teacherKey) return true;
        return g.split(/\s*(?:\/|,|&|\bdan\b)\s*/).map(function(x){ return x.trim(); }).indexOf(teacherKey) !== -1;
      });
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
        // FIX: utamakan jam_label asli dari database (jam per-hari), jangan pakai daftar jam lama.
        var rawLabel = (r.jam_label != null && String(r.jam_label).trim()) ? String(r.jam_label).trim() : ((ji >= 0 && ji < JAM_LABELS.length) ? JAM_LABELS[ji] : ('Jam '+(ji+1)));
        var mapel = r.mapel || '-';
        if (mapel === '-' || /istirahat/i.test(mapel) || /istirahat/i.test(rawLabel)) return;
        // Waktu mulai untuk logika status butuh format HH:MM, jadi titik diubah jadi titik dua.
        var startPart = (String(rawLabel).split('-')[0] || rawLabel).trim().replace(/\./g, ':');
        var entry = {
          time: startPart || rawLabel,
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

// ===== [FIX PRESENSI] Gaya untuk indikator sync + skeleton =====
function ensureAgFixStyles() {
  try {
    if (document.getElementById('ag-fix-style')) return;
    var st = document.createElement('style');
    st.id = 'ag-fix-style';
    st.textContent = '#ag-sync-chip{position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:50%;transform:translateX(-50%) translateY(-16px);z-index:99999;display:flex;align-items:center;gap:7px;background:rgba(17,24,39,.93);color:#fff;font-size:12.5px;font-weight:600;padding:7px 13px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.28);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease}#ag-sync-chip.show{opacity:1;transform:translateX(-50%) translateY(0)}#ag-sync-chip .ag-sync-dot{width:11px;height:11px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:agSyncSpin .7s linear infinite}@keyframes agSyncSpin{to{transform:rotate(360deg)}}.ag-skel{background:linear-gradient(90deg,rgba(148,163,184,.16) 25%,rgba(148,163,184,.34) 37%,rgba(148,163,184,.16) 63%);background-size:400% 100%;animation:agSkel 1.3s ease infinite;border-radius:10px;display:block}.ag-skel-wrap{display:flex;flex-direction:column;gap:12px;margin:16px 0 8px}.ag-skel-line{height:16px;width:65%}.ag-skel-time{height:58px;width:100%}.ag-skel-btn{height:46px;width:100%}@keyframes agSkel{0%{background-position:100% 50%}100%{background-position:0 50%}}';
    document.head.appendChild(st);
  } catch (_) {}
}
function showSyncIndicator() {
  try {
    ensureAgFixStyles();
    var el = document.getElementById('ag-sync-chip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ag-sync-chip';
      el.innerHTML = '<span class="ag-sync-dot"></span> Menyegarkan data\u2026';
      document.body.appendChild(el);
    }
    requestAnimationFrame(function(){ el.classList.add('show'); });
  } catch (_) {}
}
function hideSyncIndicator() {
  try { var el = document.getElementById('ag-sync-chip'); if (el) el.classList.remove('show'); } catch (_) {}
}
// Gabungkan baris presensi guru tanpa duplikat (kunci: tanggal|sesi|nip)
function mergePresensiGuruRows(existing, incoming) {
  var out = Array.isArray(existing) ? existing.slice() : [];
  if (!Array.isArray(incoming)) return out;
  function keyOf(r){ return [String((r&&r.tanggal)||''), String((r&&r.sesi)||''), String((r&&(r.nip||r.nip_guru||r.NIP))||'')].join('|'); }
  incoming.forEach(function(row){
    if (!row) return;
    var k = keyOf(row);
    var idx = out.findIndex(function(r){ return keyOf(r) === k; });
    if (idx >= 0) out[idx] = row; else out.push(row);
  });
  return out;
}
// Skeleton kartu presensi saat status masih dimuat pertama kali
function renderTeacherAttendanceSkeleton() {
  ensureAgFixStyles();
  return `
    <section class="section">
      <article class="teacher-attendance-card ag-main-card">
        <div class="ag-card-top">
          <span class="attendance-status gray">Memuat\u2026</span>
          <span class="ag-date-chip">${agTodayLabel()}</span>
        </div>
        <h3 class="attendance-title">Memuat status presensi\u2026</h3>
        <div class="ag-skel-wrap">
          <span class="ag-skel ag-skel-line"></span>
          <span class="ag-skel ag-skel-time"></span>
          <span class="ag-skel ag-skel-btn"></span>
        </div>
        <p class="ag-cutoff-note">Mengambil data presensi hari ini dari server\u2026</p>
      </article>
    </section>`;
}
// ===== FAST: tarik HANYA status presensi guru (query kecil) agar layar Absen tampil <1 detik =====
// Tidak menunggu hydrate berat (siswa, jadwal, chat, modul). Dipanggil saat boot, buka tab Absen, & resume.
async function hydrateTeacherAttendanceFast() {
  var _S = window.ZymataMobileSupabase;
  if (!_S) return;
  var session = _S.readSession();
  if (!session) return;
  var nip = String(appState.teacherNip || session.guru_nip || session.nip || session.nip_guru || '').trim();
  if (!nip) return; // tanpa NIP tidak bisa ambil baris presensi
  appState._agAttnLoading = true;
  if (appState.activeTab === 'teacherAttendance' && !window.__qrScannerOpen) { try { render(); } catch (_) {} }
  try {
    var res = await _S.select('absensi_guru', { eq: { nip: nip }, order: 'tanggal', ascending: false, limit: 8 });
    if (res && !res.error && Array.isArray(res.data)) {
      var mod = appState.supabaseModules || (appState.supabaseModules = {});
      mod.presensiGuru = mergePresensiGuruRows(mod.presensiGuru, res.data);
      syncTeacherAttendanceFromTodayRow(getTodayTeacherAttendanceRow());
      appState._agAttnLoaded = true;
      try { saveState(); } catch (_) {}
    }
  } catch (_) {
  } finally {
    appState._agAttnLoading = false;
    if (!window.__qrScannerOpen) { try { render(); } catch (_) {} }
  }
}

async function hydrateGuruFromSupabase() {
  if (!window.ZymataMobileSupabase) return;
  const session = window.ZymataMobileSupabase.readSession();
  if (!session) return;
  try {
    showSyncIndicator();
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
    loadMasterMapel(); // muat daftar mapel resmi sekolah (master_mapel) di latar belakang

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
    appState._agAttnLoaded = true;
    syncTeacherAttendanceFromTodayRow(getTodayTeacherAttendanceRow());
    if (kelasUtama && appState.supabaseModules && appState.supabaseModules.absensi) {
      appState.attendanceDone = Object.keys(getTodayAbsensiMap(kelasUtama)).length;
    }
    saveDataCache();
    saveState();
    if (!window.__qrScannerOpen) render(); // skip render saat kamera terbuka
  } catch (error) {
    console.warn('[MobileGuru] gagal load Supabase:', error && error.message ? error.message : error);
  } finally {
    hideSyncIndicator();
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
ensureAgFixStyles();
render();
hydrateTeacherAttendanceFast();
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
    try { hydrateTeacherAttendanceFast(); } catch(_){}
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


/* ===== ZYMATA HP TAHFIDZ MODULES v1 (Kelola Halaqah + Mutaba'ah Tahfidz) ===== */
(function(){
  if (window.__ZYMATA_HP_TAHFIDZ_V1__) return;
  window.__ZYMATA_HP_TAHFIDZ_V1__ = true;

  var SURAH = [
    ["Al-Fatihah",7],["Al-Baqarah",286],["Ali 'Imran",200],["An-Nisa",176],["Al-Ma'idah",120],
    ["Al-An'am",165],["Al-A'raf",206],["Al-Anfal",75],["At-Taubah",129],["Yunus",109],
    ["Hud",123],["Yusuf",111],["Ar-Ra'd",43],["Ibrahim",52],["Al-Hijr",99],
    ["An-Nahl",128],["Al-Isra",111],["Al-Kahf",110],["Maryam",98],["Ta-Ha",135],
    ["Al-Anbiya",112],["Al-Hajj",78],["Al-Mu'minun",118],["An-Nur",64],["Al-Furqan",77],
    ["Asy-Syu'ara",227],["An-Naml",93],["Al-Qasas",88],["Al-'Ankabut",69],["Ar-Rum",60],
    ["Luqman",34],["As-Sajdah",30],["Al-Ahzab",73],["Saba",54],["Fatir",45],
    ["Ya-Sin",83],["As-Saffat",182],["Sad",88],["Az-Zumar",75],["Ghafir",85],
    ["Fussilat",54],["Asy-Syura",53],["Az-Zukhruf",89],["Ad-Dukhan",59],["Al-Jasiyah",37],
    ["Al-Ahqaf",35],["Muhammad",38],["Al-Fath",29],["Al-Hujurat",18],["Qaf",45],
    ["Az-Zariyat",60],["At-Tur",49],["An-Najm",62],["Al-Qamar",55],["Ar-Rahman",78],
    ["Al-Waqi'ah",96],["Al-Hadid",29],["Al-Mujadilah",22],["Al-Hasyr",24],["Al-Mumtahanah",13],
    ["As-Saff",14],["Al-Jumu'ah",11],["Al-Munafiqun",11],["At-Tagabun",18],["At-Talaq",12],
    ["At-Tahrim",12],["Al-Mulk",30],["Al-Qalam",52],["Al-Haqqah",52],["Al-Ma'arij",44],
    ["Nuh",28],["Al-Jinn",28],["Al-Muzzammil",20],["Al-Muddassir",56],["Al-Qiyamah",40],
    ["Al-Insan",31],["Al-Mursalat",50],["An-Naba",40],["An-Nazi'at",46],["'Abasa",42],
    ["At-Takwir",29],["Al-Infitar",19],["Al-Mutaffifin",36],["Al-Insyiqaq",25],["Al-Buruj",22],
    ["At-Tariq",17],["Al-A'la",19],["Al-Gasyiyah",26],["Al-Fajr",30],["Al-Balad",20],
    ["Asy-Syams",15],["Al-Lail",21],["Ad-Duha",11],["Asy-Syarh",8],["At-Tin",8],
    ["Al-'Alaq",19],["Al-Qadr",5],["Al-Bayyinah",8],["Az-Zalzalah",8],["Al-'Adiyat",11],
    ["Al-Qari'ah",11],["At-Takasur",8],["Al-'Asr",3],["Al-Humazah",9],["Al-Fil",5],
    ["Quraisy",4],["Al-Ma'un",7],["Al-Kausar",3],["Al-Kafirun",6],["An-Nasr",3],
    ["Al-Masad",5],["Al-Ikhlas",4],["Al-Falaq",5],["An-Nas",6]
  ];
  var JUZ_START = [
    [1,1],[2,142],[2,253],[3,93],[4,24],[4,148],[5,82],[6,111],[7,88],[8,41],
    [9,93],[11,6],[12,53],[15,1],[17,1],[18,75],[21,1],[23,1],[25,21],[27,56],
    [29,46],[33,31],[36,28],[39,32],[41,47],[46,1],[51,31],[58,1],[67,1],[78,1]
  ];
  var PREFIX = [0];
  for (var i=0;i<SURAH.length;i++){ PREFIX[i+1] = PREFIX[i] + SURAH[i][1]; }
  var TOTAL_AYAT = PREFIX[SURAH.length];
  function absIndex(s,a){ return PREFIX[s-1] + a; }
  var JABS = [0];
  for (var j=0;j<JUZ_START.length;j++){ JABS[j+1] = absIndex(JUZ_START[j][0], JUZ_START[j][1]); }
  function juzEndAbs(jz){ return jz<30 ? (JABS[jz+1]-1) : TOTAL_AYAT; }
  function juzOf(s,a){ var x=absIndex(s,a); for(var z=30;z>=1;z--){ if(x>=JABS[z]) return z; } return 1; }
  function computeProgres(surah, ayat){
    surah=parseInt(surah,10); ayat=parseInt(ayat,10);
    if(!surah||surah<1||surah>114) return {pct:0,juz:0};
    var maxA=SURAH[surah-1][1];
    if(!ayat||ayat<1) ayat=1;
    if(ayat>maxA) ayat=maxA;
    var jz=juzOf(surah,ayat), pct;
    if(jz===29||jz===30){
      var startSurah=(jz===29)?67:78, count=(jz===29)?11:37;
      var done=(surah-startSurah)+(ayat/maxA); pct=(done/count)*100;
    } else { var st=JABS[jz], en=juzEndAbs(jz); pct=((absIndex(surah,ayat)-st+1)/(en-st+1))*100; }
    if(pct<0)pct=0; if(pct>100)pct=100;
    return { pct:Math.round(pct), juz:jz };
  }

  var CATS_SEKOLAH = ["Ziyadah","Muroja'ah","Tilawah"];
  var CATS_WALI = ["Ziadah","Tilawah","Muroja'ah"];

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function nowISO(){ return new Date().toISOString(); }
  function curSemester(){ var m=new Date().getMonth()+1; return (m>=7&&m<=12)?'Ganjil':'Genap'; }
  function curTA(){ var d=new Date(),y=d.getFullYear(),m=d.getMonth()+1; return (m>=7)?(y+'/'+(y+1)):((y-1)+'/'+y); }
  function todayStr(){ var d=new Date(); var mm=String(d.getMonth()+1); if(mm.length<2)mm='0'+mm; var dd=String(d.getDate()); if(dd.length<2)dd='0'+dd; return d.getFullYear()+'-'+mm+'-'+dd; }
  function guruNip(){ return String(appState.teacherNip||'').trim(); }
  function guruNama(){ return String(appState.teacherName||'Guru').trim(); }
  function SB(){ return window.ZymataMobileSupabase; }
  function activeMtf(){ return appState.activeTab==='module:mutabaah-tahfidz'; }

  function allSiswa(){
    var out=[];
    try{ Object.keys(SISWA_PER_KELAS||{}).forEach(function(k){ (SISWA_PER_KELAS[k]||[]).forEach(function(s){ out.push({ nis:String(s.nis||''), name:String(s.name||s.nama||'Siswa'), kelas:k }); }); }); }catch(e){}
    return out;
  }
  function findSiswa(nis){ nis=String(nis); var a=allSiswa(); for(var i=0;i<a.length;i++){ if(a[i].nis===nis) return a[i]; } return null; }

  var ST = { halaqah:null, halaqahLoading:false, addKelas:'', addGolongan:'', mtfSiswaId:'', mtfGolongan:'', mtfTab:'sekolah', mtfDraft:{}, mtfWali:{}, mtfLoading:false, riwayat:null, riwayatWali:null, riwayatLoading:false, riwayatOpen:false, riwayatTgl:'' };

  function halMembers(){ return Array.isArray(ST.halaqah)?ST.halaqah:[]; }
  function inHalaqah(nis){ nis=String(nis); return halMembers().some(function(r){ return String(r.siswa_id||r.nis||'')===nis; }); }
  function memberById(nis){ nis=String(nis); var m=halMembers(); for(var i=0;i<m.length;i++){ if(String(m[i].siswa_id||m[i].nis||'')===nis) return m[i]; } return null; }

  async function loadHalaqah(){
    if(ST.halaqahLoading) return;
    ST.halaqahLoading=true;
    var nip=guruNip();
    try{
      var api=SB();
      if(!nip || !api){ ST.halaqah=[]; }
      else { var res=await api.select('halaqah_tahfidz',{ eq:{ guru_nip:nip }, limit:3000 }); ST.halaqah=(res&&res.data)?res.data:[]; }
    }catch(e){ ST.halaqah=[]; }
    ST.halaqahLoading=false;
    if(appState.activeTab==='module:kelola-halaqah'||appState.activeTab==='module:mutabaah-tahfidz') render();
  }

  async function loadMtfForSiswa(nis){
    ST.mtfLoading=true;
    if(activeMtf()) render();
    try{
      var api=SB(); var rows=[];
      if(api){ var res=await api.select('mutabaah_tahfidz',{ eq:{ siswa_id:String(nis) }, limit:400 }); rows=(res&&res.data)?res.data:[]; }
      var ta=curTA(), sem=curSemester(), ds={}, dw={};
      rows.forEach(function(r){
        if(String(r.tahun_ajaran||'')!==ta||String(r.semester||'')!==sem) return;
        var rec={ surah:r.surah_no, ayat:r.ayat, catatan:r.catatan, juz:r.juz, progres:r.progres };
        if(String(r.konteks||'')==='wali_murid') dw[r.kategori]=rec; else if(String(r.konteks||'')==='sekolah') ds[r.kategori]=rec;
      });
      ST.mtfDraft=ds; ST.mtfWali=dw;
    }catch(e){ ST.mtfDraft={}; ST.mtfWali={}; }
    ST.mtfLoading=false;
    if(activeMtf()) render();
  }

  async function loadRiwayat(nis){
    ST.riwayatLoading=true;
    if(activeMtf()) render();
    try{
      var api=SB(); var rows=[];
      if(api){ var res=await api.select('mutabaah_tahfidz_riwayat',{ eq:{ siswa_id:String(nis), konteks:'sekolah' }, order:'tanggal', ascending:false, limit:120 }); rows=(res&&res.data)?res.data:[]; }
      ST.riwayat=rows;
    }catch(e){ ST.riwayat=[]; }
    try{
      var api2=SB(); var rw=[];
      if(api2){ var res2=await api2.select('mutabaah_tahfidz_riwayat',{ eq:{ siswa_id:String(nis), konteks:'wali_murid' }, order:'tanggal', ascending:false, limit:120 }); rw=(res2&&res2.data)?res2.data:[]; }
      ST.riwayatWali=rw;
    }catch(e){ ST.riwayatWali=[]; }
    ST.riwayatLoading=false;
    if(activeMtf()) render();
  }

  /* ---------- handlers ---------- */
  window.zHal = {
    setKelas:function(v){ ST.addKelas=v; render(); },
    setGolongan:function(v){ ST.addGolongan=v; },
    scan: function(){
      openQrScanner(async function(code){
        var raw=String(code||'').trim();
        if(!raw){ showError('Kode QR kosong / tidak terbaca.'); return; }
        var hit=await agResolveStudent(raw);
        if(!hit){ showToast(agScanNotFoundMsg(raw),'error','&#9888;'); return; }
        if(inHalaqah(hit.nis)){ showToast(hit.name+' sudah ada di halaqah','error','&#9888;'); return; }
        window.zHal.add(hit.nis);
      });
    },
    add: async function(nis){
      var api=SB(); if(!api){ showToast('Supabase belum siap','error','&#9888;'); return; }
      var s=findSiswa(nis); if(!s){ showToast('Siswa tidak ditemukan','error','&#9888;'); return; }
      if(inHalaqah(s.nis)){ showToast('Sudah ada di halaqah','error','&#9888;'); return; }
      if(!guruNip()){ showToast('Identitas guru belum termuat','error','&#9888;'); return; }
      var body={ client_key:'default', siswa_id:s.nis, nis:s.nis, nama_siswa:s.name, kelas:s.kelas, golongan:(ST.addGolongan||''), guru_nip:guruNip(), guru_nama:guruNama(), updated_at:nowISO() };
      var res=await api.insert('halaqah_tahfidz',body);
      if(res&&res.error){ showToast('Gagal menambah siswa','error','&#9888;'); return; }
      var row=(res&&res.data&&res.data[0])?res.data[0]:body;
      if(!Array.isArray(ST.halaqah)) ST.halaqah=[];
      ST.halaqah.push(row);
      showToast(s.name+' masuk halaqah','success','&#10003;');
      render();
    },
    remove: async function(id, nis){
      var api=SB(); if(!api){ showToast('Supabase belum siap','error','&#9888;'); return; }
      var ok=true;
      try{
        var client=api.getClient();
        if(id){ var r=await client.from('halaqah_tahfidz').delete().eq('id',id); if(r&&r.error) ok=false; }
        else { var r2=await client.from('halaqah_tahfidz').delete().eq('guru_nip',guruNip()).eq('siswa_id',String(nis)); if(r2&&r2.error) ok=false; }
      }catch(e){ ok=false; }
      if(!ok){ showToast('Gagal menghapus','error','&#9888;'); return; }
      ST.halaqah=halMembers().filter(function(r){ return id ? String(r.id)!==String(id) : String(r.siswa_id||r.nis||'')!==String(nis); });
      showToast('Dihapus dari halaqah','success','&#10003;');
      render();
    }
  };

  window.zMtf = {
    setTab: function(t){ ST.mtfTab=(t==='wali_murid')?'wali_murid':'sekolah'; render(); },
    setGolongan: function(v){ ST.mtfGolongan=String(v||''); ST.mtfSiswaId=''; ST.mtfDraft={}; ST.mtfWali={}; ST.riwayat=null; ST.riwayatWali=null; ST.riwayatTgl=''; render(); },
    scan: function(){
      openQrScanner(async function(code){
        var raw=String(code||'').trim();
        if(!raw){ showError('Kode QR kosong / tidak terbaca.'); return; }
        var hit=await agResolveStudent(raw);
        if(!hit){ showToast(agScanNotFoundMsg(raw),'error','&#9888;'); return; }
        var nis=String(hit.nis||'');
        var m=halMembers().filter(function(r){ return String(r.nis||'')===nis || String(r.siswa_id||'')===nis; })[0];
        if(!m){ showToast(hit.name+' belum masuk halaqah Anda. Tambahkan di Kelola Halaqah dulu.','error','&#9888;'); return; }
        ST.mtfTab='sekolah';
        window.zMtf.selectSiswa(String(m.siswa_id||m.nis||nis));
        showToast(hit.name+' terpilih','success','&#10003;');
      });
    },
    selectSiswa: function(nis){ ST.mtfSiswaId=String(nis||''); ST.mtfDraft={}; ST.mtfWali={}; ST.riwayat=null; ST.riwayatWali=null; ST.riwayatTgl=''; render(); if(ST.mtfSiswaId){ loadMtfForSiswa(ST.mtfSiswaId); loadRiwayat(ST.mtfSiswaId); } },
    toggleRiwayat: function(){ ST.riwayatOpen=!ST.riwayatOpen; render(); },
    setRiwayatTgl: function(v){ ST.riwayatTgl=String(v||''); render(); },
    recalc: function(idx){
      var sEl=document.getElementById('ztf-mtf-surah-'+idx), aEl=document.getElementById('ztf-mtf-ayat-'+idx), pEl=document.getElementById('ztf-mtf-prog-'+idx);
      if(!sEl||!aEl||!pEl) return;
      var r=computeProgres(sEl.value, aEl.value);
      pEl.textContent = r.juz ? ('Juz '+r.juz+' - '+r.pct+'%') : 'Belum ada';
    },
    save: async function(){
      var api=SB(); if(!api){ showToast('Supabase belum siap','error','&#9888;'); return; }
      if(!ST.mtfSiswaId){ showToast('Pilih siswa dulu','error','&#9888;'); return; }
      var s=memberById(ST.mtfSiswaId); if(!s){ showToast('Siswa tidak ditemukan','error','&#9888;'); return; }
      var tglEl=document.getElementById('ztf-mtf-tgl'); var tgl=(tglEl&&tglEl.value)?tglEl.value:todayStr();
      var ta=curTA(), sem=curSemester(), saved=0, failed=0, filled=0, logs=[];
      for(var i=0;i<CATS_SEKOLAH.length;i++){
        var kat=CATS_SEKOLAH[i];
        var sEl=document.getElementById('ztf-mtf-surah-'+i), aEl=document.getElementById('ztf-mtf-ayat-'+i), cEl=document.getElementById('ztf-mtf-cat-'+i);
        var surah_no=parseInt(sEl&&sEl.value,10)||0;
        if(!surah_no) continue;
        filled++;
        var ayat=parseInt(aEl&&aEl.value,10)||0;
        var prog=computeProgres(surah_no,ayat);
        var snama=(SURAH[surah_no-1]?SURAH[surah_no-1][0]:'');
        var cat=(cEl?cEl.value:'')||'';
        var body={ client_key:'default', konteks:'sekolah', siswa_id:String(ST.mtfSiswaId), nis:String(s.nis||ST.mtfSiswaId), nama_siswa:s.nama_siswa||s.name||'', kelas:s.kelas||'', kategori:kat, surah_no:surah_no, surah_nama:snama, ayat:ayat, juz:prog.juz, progres:prog.pct, catatan:cat, tahun_ajaran:ta, semester:sem, updated_at:nowISO() };
        var res=await api.upsert('mutabaah_tahfidz',body,'client_key,siswa_id,konteks,kategori,tahun_ajaran,semester');
        if(res&&res.error) failed++; else saved++;
        logs.push({ client_key:'default', konteks:'sekolah', siswa_id:String(ST.mtfSiswaId), nis:String(s.nis||ST.mtfSiswaId), nama_siswa:s.nama_siswa||s.name||'', kelas:s.kelas||'', kategori:kat, surah_no:surah_no, surah_nama:snama, ayat:ayat, juz:prog.juz, progres:prog.pct, catatan:cat, tanggal:tgl, tahun_ajaran:ta, semester:sem, guru_nip:guruNip(), guru_nama:guruNama() });
      }
      if(!filled){ showToast('Isi minimal 1 kategori','error','&#9888;'); return; }
      if(logs.length){ try{ await api.insert('mutabaah_tahfidz_riwayat', logs); }catch(e){} }
      if(saved){ showToast('Tersimpan '+saved+' kategori','success','&#10003;'); loadMtfForSiswa(ST.mtfSiswaId); loadRiwayat(ST.mtfSiswaId); }
      else showToast('Gagal menyimpan','error','&#9888;');
    }
  };

  /* ---------- shared UI ---------- */
  function styleTag(){
    return '<style id="ztf-hp-style">'
      +'.ztf-wrap{padding:0 2px}'
      +'.ztf-panel{background:#161d2e;border:1px solid rgba(148,163,184,.16);border-radius:16px;padding:14px;margin-bottom:12px;box-shadow:0 1px 2px rgba(0,0,0,.2)}'
      +'.ztf-lbl{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;display:block}'
      +'.ztf-sel,.ztf-inp{width:100%;box-sizing:border-box;border:1px solid rgba(148,163,184,.22);border-radius:10px;padding:10px 12px;font-size:14px;background:#0f1629;color:#e8ebf2}.ztf-inp::placeholder{color:#7381a0}'
      +'.ztf-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid rgba(148,163,184,.12)}'
      +'.ztf-row:last-child{border-bottom:none}'
      +'.ztf-name{font-weight:600;font-size:14px;color:#e8ebf2}'
      +'.ztf-meta{font-size:12px;color:#94a3b8;margin-top:2px}'
      +'.ztf-btn{border:none;border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer}'
      +'.ztf-btn-add{background:rgba(31,199,180,.22);color:var(--indigo)}'
      +'.ztf-btn-del{background:rgba(239,68,68,.16);color:#fca5a5}'
      +'.ztf-panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}'
      +'.ztf-scan-btn{flex:0 0 auto;width:42px;height:42px;border-radius:12px;border:none;cursor:pointer;background:linear-gradient(135deg,var(--indigo) 0%,var(--indigo-dark) 100%);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(31,199,180,.3)}'
      +'.ztf-scan-btn:active{transform:scale(.94)}'
      +'.ztf-check{color:var(--indigo);font-weight:700;font-size:13px;white-space:nowrap}'
      +'.ztf-row.on{opacity:.9}'
      +'.ztf-btn-save{background:linear-gradient(135deg,var(--indigo) 0%,var(--indigo-dark) 100%);color:#fff;width:100%;padding:13px;font-size:15px;border-radius:12px;margin-top:4px}'
      +'.ztf-chip{display:inline-block;background:rgba(31,199,180,.22);color:var(--indigo);border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700}'
      +'.ztf-cat-card{border:1px solid rgba(148,163,184,.14);border-radius:14px;padding:12px;margin-bottom:10px;background:#131a2b}'
      +'.ztf-cat-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}'
      +'.ztf-cat-title{font-weight:700;font-size:14px;color:#e8ebf2}'
      +'.ztf-prog{font-size:12px;font-weight:700;color:var(--indigo)}'
      +'.ztf-grid2{display:grid;grid-template-columns:1fr 90px;gap:8px}'
      +'.ztf-empty{color:#94a3b8;font-size:13px;line-height:1.5;padding:6px 2px}'
      +'.ztf-tabs{display:flex;gap:8px;margin-bottom:12px}'
      +'.ztf-tab{flex:1;text-align:center;border:1px solid rgba(148,163,184,.22);background:transparent;color:#cbd5e1;border-radius:12px;padding:10px;font-size:13px;font-weight:700;cursor:pointer}'
      +'.ztf-tab.on{background:linear-gradient(135deg,var(--indigo) 0%,var(--indigo-dark) 100%);color:#fff;border-color:var(--indigo-dark)}'
      +'.ztf-static{background:#0f1629;border:1px solid rgba(148,163,184,.14);border-radius:10px;padding:10px 12px;font-size:14px;color:#e8ebf2;min-height:20px}'
      +'.ztf-note{background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.32);color:#fcd34d;border-radius:12px;padding:12px;font-size:13px;line-height:1.5;margin-top:4px}'
      +'.ztf-rw{border:1px solid rgba(148,163,184,.14);border-radius:12px;padding:10px 12px;margin-bottom:8px;background:#131a2b}'
      +'.ztf-rw-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}'
      +'.ztf-rw-kat{font-weight:700;font-size:13px;color:var(--indigo)}'
      +'.ztf-rw-date{font-size:12px;color:#94a3b8}'
      +'.ztf-rw-body{font-size:13px;color:#e8ebf2}'
      +'.ztf-rw-prog{color:var(--indigo);font-weight:700;font-size:12px}'
      +'.ztf-rw-note{font-size:12px;color:#94a3b8;margin-top:4px}'
      +'.ztf-sum-grid{display:flex;flex-direction:column;gap:8px;margin-top:4px}'
      +'.ztf-sum-item{background:#131a2b;border:1px solid rgba(148,163,184,.14);border-radius:12px;padding:10px 12px}'
      +'.ztf-sum-top{display:flex;justify-content:space-between;align-items:center}'
      +'.ztf-sum-kat{font-weight:700;font-size:13px;color:#e8ebf2}'
      +'.ztf-sum-prog{font-size:12px;font-weight:700;color:var(--indigo)}'
      +'.ztf-sum-surah{font-size:12px;color:#94a3b8;margin-top:3px}'
      +'</style>';
  }
  function headerCard(detail, sub){
    return '<section class="section"><article class="module-detail-card">'
      +'<button type="button" class="back-chip" data-action="menu">\u2039 Menu</button>'
      +'<span class="card-label">'+esc(detail.eyebrow||'Tahfidz')+'</span>'
      +'<h3 class="module-detail-title">'+esc(detail.title||'')+'</h3>'
      +'<p class="module-detail-copy">'+(sub||'')+'</p></article></section>';
  }
  function loadingShell(detail,msg){ return headerCard(detail, esc(msg||'Memuat...')); }

  function surahOptions(sel){
    var o='<option value="">- Pilih surah -</option>';
    for(var i=0;i<SURAH.length;i++){ var no=i+1; o+='<option value="'+no+'"'+(String(sel)===String(no)?' selected':'')+'>'+no+'. '+esc(SURAH[i][0])+'</option>'; }
    return o;
  }

  function ringkasanProgresHtml(){
    var cards=CATS_SEKOLAH.map(function(kat){
      var d=ST.mtfDraft[kat]||{};
      var p=computeProgres(d.surah||0, d.ayat||0);
      var surahTxt=d.surah?((SURAH[d.surah-1]?SURAH[d.surah-1][0]:'')+' : ayat '+(d.ayat!=null?d.ayat:'-')):'Belum ada';
      var progTxt=p.juz?('Juz '+p.juz+' &middot; '+p.pct+'%'):'-';
      return '<div class="ztf-sum-item"><div class="ztf-sum-top"><span class="ztf-sum-kat">'+esc(kat)+'</span><span class="ztf-sum-prog">'+progTxt+'</span></div><div class="ztf-sum-surah">'+esc(surahTxt)+'</div></div>';
    }).join('');
    return '<div class="ztf-panel"><span class="ztf-lbl">Ringkasan progres tersimpan</span><div class="ztf-sum-grid">'+cards+'</div></div>';
  }

  function riwayatHtml(rows, title){
    rows=Array.isArray(rows)?rows:[];
    title=title||'Mutaba\'ah';
    var open=ST.riwayatOpen?' open':'';
    var body;
    if(ST.riwayatLoading){
      body='<p class="riwayat-absen-count">Memuat riwayat...</p>';
    } else if(!rows.length){
      body=(typeof premiumEmptyState==='function')?premiumEmptyState('Belum ada riwayat','Riwayat setoran per tanggal akan tampil di sini.'):'<p class="ztf-empty">Belum ada riwayat.</p>';
    } else {
      var dateSet={}; rows.forEach(function(r){ var d=String(r.tanggal||'').slice(0,10); if(d) dateSet[d]=true; });
      var dates=Object.keys(dateSet).sort().reverse();
      var sel=(ST.riwayatTgl && dateSet[ST.riwayatTgl])?ST.riwayatTgl:dates[0];
      var rowsTgl=rows.filter(function(r){ return String(r.tanggal||'').slice(0,10)===sel; });
      body='<label class="mf-label">Pilih tanggal</label>';
      body+='<div class="mf-select-wrap"><select class="mf-select" onchange="window.zMtf.setRiwayatTgl(this.value)">';
      body+=dates.map(function(d){ var lbl=(typeof formatTanggalID==='function')?formatTanggalID(d):d; return '<option value="'+esc(d)+'"'+(d===sel?' selected':'')+'>'+esc(lbl)+'</option>'; }).join('');
      body+='</select><span class="mf-chevron">&#8250;</span></div>';
      body+='<p class="riwayat-absen-count">'+rowsTgl.length+' setoran tercatat \u00b7 '+dates.length+' tanggal</p>';
      body+=rowsTgl.map(function(r){
        var snama=r.surah_nama||(r.surah_no&&SURAH[r.surah_no-1]?SURAH[r.surah_no-1][0]:'');
        var surah=r.surah_no?(snama+' : ayat '+(r.ayat!=null?r.ayat:'-')):'-';
        var prog=(r.surah_no)?('Juz '+(r.juz!=null?r.juz:'-')+' &middot; '+(r.progres!=null?r.progres:'-')+'%'):'';
        return '<div class="ztf-rw"><div class="ztf-rw-top"><span class="ztf-rw-kat">'+esc(r.kategori||'-')+'</span>'+(prog?('<span class="ztf-rw-prog">'+prog+'</span>'):'')+'</div><div class="ztf-rw-body">'+esc(surah)+'</div>'+(r.catatan?('<div class="ztf-rw-note">'+esc(r.catatan)+'</div>'):'')+'</div>';
      }).join('');
    }
    return '<section class="section">'
      +'<details class="riwayat-absen-toggle"'+open+'>'
      +'<summary class="riwayat-absen-summary" onclick="event.preventDefault();window.zMtf.toggleRiwayat();"><span class="riwayat-absen-title">&#128197; Riwayat '+title+'</span><span class="riwayat-absen-hint">Lihat detail per tanggal &rsaquo;</span></summary>'
      +'<div class="riwayat-absen-body">'+body+'</div>'
      +'</details></section>';
  }

  /* ---------- Kelola Halaqah ---------- */
  window.renderKelolaHalaqahGuruModule = function(detail){
    if(ST.halaqah===null){ if(!ST.halaqahLoading) loadHalaqah(); return loadingShell(detail,'Memuat data halaqah...'); }
    var nip=guruNip();
    var members=halMembers();
    var kelasList=Object.keys(SISWA_PER_KELAS||{}).sort();
    if(!ST.addKelas && kelasList.length) ST.addKelas=kelasList[0];
    var cand=(getSiswaByKelas(ST.addKelas)||[]);

    var html = styleTag() + headerCard(detail, members.length ? ('<span class="ztf-chip">'+members.length+' siswa</span> di halaqah '+esc(guruNama())) : 'Belum ada siswa di halaqah Anda.');
    html += '<section class="section"><div class="ztf-wrap">';

    if(!nip){
      html += '<div class="ztf-panel"><p class="ztf-empty">Identitas guru belum termuat. Buka ulang aplikasi setelah login guru agar NIP terbaca.</p></div>';
    } else {
      html += '<div class="ztf-panel">';
      html += '<div class="ztf-panel-head"><span class="ztf-lbl">Tambah siswa ke halaqah</span><button class="ztf-scan-btn" onclick="window.zHal.scan()" title="Scan QR / Barcode" aria-label="Scan QR / Barcode"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5a2 2 0 0 1 2-2h1.6l1-1.5a1 1 0 0 1 .8-.4h5.2a1 1 0 0 1 .8.4l1 1.5H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.2"/></svg></button></div>';
      html += '<div class="ztf-grid2" style="grid-template-columns:1fr 1fr;margin-bottom:10px">';
      html += '<div><select class="ztf-sel" onchange="window.zHal.setKelas(this.value)">'+kelasList.map(function(k){ return '<option value="'+esc(k)+'"'+(k===ST.addKelas?' selected':'')+'>'+esc(k)+'</option>'; }).join('')+'</select></div>';
      html += '<div><select class="ztf-sel" onchange="window.zHal.setGolongan(this.value)"><option value="">- Golongan -</option><option value="Atas"'+(ST.addGolongan==='Atas'?' selected':'')+'>Atas</option><option value="Bawah"'+(ST.addGolongan==='Bawah'?' selected':'')+'>Bawah</option></select></div>';
      html += '</div>';
      if(!cand.length){ html += '<p class="ztf-empty">Belum ada data siswa di kelas '+esc(ST.addKelas||'-')+'.</p>'; }
      else {
        html += cand.map(function(s){ var added=inHalaqah(s.nis); var act=added?'<span class="ztf-check">&#10003; Ditambahkan</span>':'<button class="ztf-btn ztf-btn-add" onclick="window.zHal.add(\''+esc(s.nis)+'\')">+ Tambah</button>'; return '<div class="ztf-row'+(added?' on':'')+'"><div><div class="ztf-name">'+esc(s.name)+'</div><div class="ztf-meta">'+esc(ST.addKelas)+' &middot; NIS '+esc(s.nis||'-')+'</div></div>'+act+'</div>'; }).join('');
      }
      html += '</div>';

      html += '<div class="ztf-panel">';
      html += '<span class="ztf-lbl">Anggota halaqah ('+members.length+')</span>';
      if(!members.length){ html += '<p class="ztf-empty">Belum ada anggota. Pilih siswa di atas untuk menambah.</p>'; }
      else {
        html += members.map(function(r){
          var id=r.id?esc(r.id):'';
          var sid=esc(r.siswa_id||r.nis||'');
          var gol=r.golongan?(' &middot; '+esc(r.golongan)):'';
          return '<div class="ztf-row"><div><div class="ztf-name">'+esc(r.nama_siswa||'Siswa')+'</div><div class="ztf-meta">'+esc(r.kelas||'-')+gol+'</div></div><button class="ztf-btn ztf-btn-del" onclick="window.zHal.remove(\''+id+'\',\''+sid+'\')">Hapus</button></div>';
        }).join('');
      }
      html += '</div>';
    }
    html += '</div></section>';
    return html;
  };

  /* ---------- Mutaba'ah Tahfidz (Sekolah + Wali Murid read-only) ---------- */
  window.renderMutabaahTahfidzGuruModule = function(detail){
    if(ST.halaqah===null){ if(!ST.halaqahLoading) loadHalaqah(); return loadingShell(detail,'Memuat halaqah...'); }
    var members=halMembers();
    var html = styleTag() + headerCard(detail, esc(curTA())+' &middot; '+esc(curSemester()));
    html += '<section class="section"><div class="ztf-wrap">';
    if(!members.length){
      html += '<div class="ztf-panel"><p class="ztf-empty">Belum ada anggota halaqah. Buka <b>Kelola Halaqah</b> dulu untuk menambahkan siswa binaan, lalu isi mutaba\'ah di sini.</p></div>';
      html += '</div></section>';
      return html;
    }
    if(ST.mtfSiswaId && !memberById(ST.mtfSiswaId)) ST.mtfSiswaId='';

    html += '<div class="ztf-tabs">'
      +'<button class="ztf-tab'+(ST.mtfTab==='wali_murid'?' on':'')+'" onclick="window.zMtf.setTab(\'wali_murid\')">Wali Murid</button>'
      +'<button class="ztf-tab'+(ST.mtfTab==='sekolah'?' on':'')+'" onclick="window.zMtf.setTab(\'sekolah\')">Sekolah</button>'
      +'</div>';

    var golSel=(ST.mtfTab==='sekolah')?String(ST.mtfGolongan||''):'';
    var membersView=golSel?members.filter(function(r){ return String(r.golongan||'')===golSel; }):members;
    html += '<div class="ztf-panel">';
    if(ST.mtfTab==='sekolah'){
      html += '<div class="ztf-panel-head"><span class="ztf-lbl">Golongan</span><button class="ztf-scan-btn" onclick="window.zMtf.scan()" title="Scan QR / Barcode" aria-label="Scan QR / Barcode"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5a2 2 0 0 1 2-2h1.6l1-1.5a1 1 0 0 1 .8-.4h5.2a1 1 0 0 1 .8.4l1 1.5H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.2"/></svg></button></div>';
      html += '<select class="ztf-sel" style="margin-bottom:12px" onchange="window.zMtf.setGolongan(this.value)">'
        +'<option value="">Semua Golongan</option>'
        +'<option value="Atas"'+(golSel==='Atas'?' selected':'')+'>Atas</option>'
        +'<option value="Bawah"'+(golSel==='Bawah'?' selected':'')+'>Bawah</option>'
        +'</select>';
    }
    html += '<span class="ztf-lbl">Pilih siswa</span>';
    html += '<select class="ztf-sel" onchange="window.zMtf.selectSiswa(this.value)">';
    html += '<option value="">- Pilih siswa halaqah -</option>';
    html += membersView.map(function(r){ var sid=esc(r.siswa_id||r.nis||''); var gol=r.golongan?(' &middot; '+esc(r.golongan)):''; return '<option value="'+sid+'"'+(String(ST.mtfSiswaId)===String(r.siswa_id||r.nis||'')?' selected':'')+'>'+esc(r.nama_siswa||'Siswa')+' ('+esc(r.kelas||'-')+')'+gol+'</option>'; }).join('');
    html += '</select></div>';

    if(!ST.mtfSiswaId){
      html += '<div class="ztf-panel"><p class="ztf-empty">Pilih siswa untuk '+(ST.mtfTab==='wali_murid'?'melihat setoran dari wali murid.':'mulai mengisi setoran Ziyadah, Muroja\'ah, dan Tilawah.')+'</p></div>';
      html += '</div></section>';
      return html;
    }

    if(ST.mtfLoading){
      html += '<div class="ztf-panel"><p class="ztf-empty">Memuat data setoran...</p></div>';
      html += '</div></section>';
      return html;
    }

    if(ST.mtfTab==='wali_murid'){
      var anyWali=false;
      var cards=CATS_WALI.map(function(kat){
        var d=ST.mtfWali[kat]||{};
        if(d.surah) anyWali=true;
        var surahTxt=d.surah?(d.surah+'. '+(SURAH[d.surah-1]?SURAH[d.surah-1][0]:'')+' : ayat '+(d.ayat!=null?d.ayat:'-')):'-';
        var progTxt=(d.surah)?('Juz '+(d.juz!=null?d.juz:'-')+' &middot; '+(d.progres!=null?d.progres:'-')+'%'):'Belum ada';
        return '<div class="ztf-cat-card"><div class="ztf-cat-head"><span class="ztf-cat-title">'+esc(kat)+'</span><span class="ztf-prog">'+progTxt+'</span></div>'
          +'<div class="ztf-static">'+esc(surahTxt)+'</div>'
          +(d.catatan?('<div class="ztf-static" style="margin-top:8px">'+esc(d.catatan)+'</div>'):'')
          +'</div>';
      }).join('');
      if(!anyWali){
        html += '<div class="ztf-panel"><p class="ztf-empty">Belum ada setoran dari wali murid untuk siswa ini di semester berjalan.</p></div>';
      } else {
        html += cards;
      }
      html += '<div class="ztf-note">Data ini diisi wali murid lewat aplikasi mereka. Guru hanya melihat (read-only).</div>';
    } else {
      html += ringkasanProgresHtml();
      html += '<div class="ztf-cat-card"><span class="ztf-lbl">Tanggal setoran</span><input class="ztf-inp" type="date" id="ztf-mtf-tgl" value="'+todayStr()+'"></div>';
      html += CATS_SEKOLAH.map(function(kat,idx){
        var d=ST.mtfDraft[kat]||{};
        var prog=computeProgres(d.surah||0, d.ayat||0);
        var progTxt=prog.juz?('Juz '+prog.juz+' &middot; '+prog.pct+'%'):'Belum ada';
        return '<div class="ztf-cat-card">'
          +'<div class="ztf-cat-head"><span class="ztf-cat-title">'+esc(kat)+'</span><span class="ztf-prog" id="ztf-mtf-prog-'+idx+'">'+progTxt+'</span></div>'
          +'<div class="ztf-grid2">'
          +'<select class="ztf-sel" id="ztf-mtf-surah-'+idx+'" onchange="window.zMtf.recalc('+idx+')">'+surahOptions(d.surah||'')+'</select>'
          +'<input class="ztf-inp" id="ztf-mtf-ayat-'+idx+'" type="number" min="0" placeholder="Ayat" value="'+(d.ayat?esc(d.ayat):'')+'" oninput="window.zMtf.recalc('+idx+')">'
          +'</div>'
          +'<input class="ztf-inp" id="ztf-mtf-cat-'+idx+'" style="margin-top:8px" placeholder="Catatan (opsional)" value="'+esc(d.catatan||'')+'">'
          +'</div>';
      }).join('');
      html += '<button class="ztf-btn ztf-btn-save" onclick="window.zMtf.save()">Simpan Mutaba\'ah</button>';
    }
    html += '</div></section>';
    if(ST.mtfSiswaId && !ST.mtfLoading){ html += (ST.mtfTab==='wali_murid') ? riwayatHtml(ST.riwayatWali, 'Wali Murid') : riwayatHtml(ST.riwayat, "Mutaba'ah"); }
    return html;
  };

  /* ---------- register modul ---------- */
  modulePlaceholders['kelola-halaqah'] = { eyebrow:'Tahfidz', title:'Kelola Halaqah', subtitle:'Kelompok tahfidz binaan Anda.', stats:[], focus:[] };
  modulePlaceholders['mutabaah-tahfidz'] = { eyebrow:'Tahfidz', title:"Mutaba'ah Tahfidz", subtitle:'Setoran hafalan siswa di sekolah.', stats:[], focus:[] };
})();


/* ================= MODUL: PROGRAM SEKOLAH (GURU MOBILE) v1 ================= */
(function(){
  'use strict';
  if(window.__ZY_PROGRAM_SEKOLAH_GURU_V1__) return;
  window.__ZY_PROGRAM_SEKOLAH_GURU_V1__ = true;

  var TABLE = 'program_sekolah';
  var PS = { rows:null, loading:false };

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function SB(){ return window.ZymataMobileSupabase; }
  function activePS(){ try { return appState && appState.activeTab==='module:program-sekolah'; } catch(e){ return false; } }
  function isDone(r){ return r.selesai===true || r.selesai==='true' || r.selesai===1; }
  function findRow(id){ var a=PS.rows||[]; for(var i=0;i<a.length;i++){ if(String(a[i].id)===String(id)) return a[i]; } return null; }

  function styleTag(){
    return '<style id="psg-style">'
      + '.psg-wrap{padding:0 2px}'
      + '.psg-sum{display:flex;gap:10px;margin-bottom:12px}'
      + '.psg-sum .psg-stat{flex:1;background:#161d2e;border:1px solid rgba(148,163,184,.16);border-radius:14px;padding:12px 14px}'
      + '.psg-stat b{display:block;font-size:22px;color:#e8ebf2;font-weight:800;line-height:1.1}'
      + '.psg-stat small{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}'
      + '.psg-card{background:#161d2e;border:1px solid rgba(148,163,184,.16);border-radius:16px;padding:14px;margin-bottom:12px;box-shadow:0 1px 2px rgba(0,0,0,.2)}'
      + '.psg-card.done{border-color:rgba(31,199,180,.45);background:rgba(31,199,180,.12)}'
      + '.psg-top{display:flex;align-items:flex-start;gap:11px}'
      + '.psg-no{flex:none;min-width:26px;height:26px;border-radius:8px;background:#0f1629;color:#94a3b8;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}'
      + '.psg-head{flex:1;min-width:0}'
      + '.psg-title{font-weight:700;font-size:15px;color:#e8ebf2;line-height:1.3}'
      + '.psg-card.done .psg-title{text-decoration:line-through;color:#8aa0b6}'
      + '.psg-pel{font-size:12px;color:#94a3b8;margin-top:3px}'
      + '.psg-pel b{color:#c7d2e5;font-weight:600}'
      + '.psg-check{flex:none;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.03em}'
      + '.psg-check input{width:24px;height:24px;accent-color:var(--indigo)}'
      + '.psg-badge{font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;background:#0f1629;color:#94a3b8;border:1px solid rgba(148,163,184,.22);white-space:nowrap}'
      + '.psg-badge.done{background:rgba(31,199,180,.15);color:var(--indigo);border-color:rgba(31,199,180,.45)}'
      + '.psg-field{margin-top:10px}'
      + '.psg-lbl{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#94a3b8;margin-bottom:5px;display:block}'
      + '.psg-inp{width:100%;box-sizing:border-box;border:1px solid rgba(148,163,184,.22);border-radius:10px;padding:9px 11px;font-size:14px;background:#0f1629;color:#e8ebf2}'
      + '.psg-inp::placeholder{color:#7381a0}'
      + '.psg-note{font-size:12px;color:#9fb0c6;line-height:1.5;margin-top:2px;padding:11px 13px;background:#0f1629;border:1px solid rgba(148,163,184,.14);border-radius:12px}'
      + '.psg-note b{color:#e8ebf2}'
      + '</style>';
  }
  function headerCard(detail, sub){
    detail = detail || {};
    return '<section class="section"><article class="module-detail-card">'
      + '<button type="button" class="back-chip" data-action="menu">\u2039 Menu</button>'
      + '<span class="card-label">'+esc(detail.eyebrow||'Sekolah')+'</span>'
      + '<h3 class="module-detail-title">'+esc(detail.title||'Program Sekolah')+'</h3>'
      + '<p class="module-detail-copy">'+(sub||'')+'</p></article></section>';
  }

  async function loadPS(){
    if(PS.loading) return;
    PS.loading=true;
    try{
      var api=SB();
      if(!api){ PS.rows=[]; }
      else { var res=await api.select(TABLE, { order:'no', ascending:true, limit:500 }); PS.rows=(res&&res.data)?res.data:[]; }
    }catch(e){ PS.rows=[]; }
    PS.loading=false;
    if(activePS() && typeof render==='function') render();
  }

  function fullPayload(r){
    return { id:r.id, no:r.no, program:r.program, selesai:isDone(r), pelaksana:r.pelaksana, penanggung_jawab:r.penanggung_jawab, keterangan:r.keterangan };
  }
  async function save(r){
    var api=SB(); if(!api) return;
    try{ await api.upsert(TABLE, fullPayload(r), 'id'); if(typeof showToast==='function') showToast('Tersimpan','success','&#10003;'); }
    catch(e){ if(typeof showToast==='function') showToast('Gagal menyimpan','error','&#9888;'); }
  }
  async function psToggle(id, checked){ var r=findRow(id); if(!r) return; r.selesai=!!checked; save(r); if(typeof render==='function') render(); }
  async function psEdit(id, field, value){ var r=findRow(id); if(!r) return; r[field]=value; save(r); }

  /* Event delegation (dipasang sekali) supaya bertahan setiap kali app re-render */
  document.addEventListener('change', function(e){
    var el=e.target; if(!el || !el.getAttribute) return;
    var id=el.getAttribute('data-ps-id'); if(!id) return;
    if(el.type==='checkbox'){ /* dinonaktifkan utk guru: status Selesai hanya via admin web */ return; }
    else { var f=el.getAttribute('data-ps-field'); if(f) psEdit(id, f, el.value); }
  }, true);

  window.renderProgramSekolahGuruModule = function(detail){
    if(PS.rows===null){ if(!PS.loading) loadPS(); return styleTag()+headerCard(detail,'Memuat program sekolah...'); }
    var rows=PS.rows||[];
    var done=rows.filter(isDone).length;
    var html=styleTag()+headerCard(detail, esc(String(rows.length))+' program &middot; '+done+' terlaksana');
    html+='<section class="section"><div class="psg-wrap">';
    html+='<div class="psg-sum"><div class="psg-stat"><b>'+rows.length+'</b><small>Total Program</small></div><div class="psg-stat"><b>'+done+'</b><small>Terlaksana</small></div></div>';
    if(!rows.length){
      html+='<div class="psg-card"><p class="psg-pel">Belum ada program. Daftar program ditambahkan oleh admin lewat aplikasi desktop.</p></div>';
    } else {
      html+=rows.map(function(r){
        var checked=isDone(r);
        var id=esc(r.id);
        var pel=r.pelaksana?('<div class="psg-pel">Pelaksana: <b>'+esc(r.pelaksana)+'</b></div>'):'';
        return '<div class="psg-card'+(checked?' done':'')+'">'
          +'<div class="psg-top">'
          +'<span class="psg-no">'+(r.no!=null?esc(String(r.no)):'-')+'</span>'
          +'<div class="psg-head"><div class="psg-title">'+esc(r.program||'-')+'</div>'+pel+'</div>'
          +'<span class="psg-check">'+(checked?'<span class="psg-badge done">&#10003; Selesai</span>':'<span class="psg-badge">Belum</span>')+'</span>'
          +'</div>'
          +'<div class="psg-field"><span class="psg-lbl">Penanggung Jawab</span><input class="psg-inp" data-ps-id="'+id+'" data-ps-field="penanggung_jawab" value="'+esc(r.penanggung_jawab||'')+'" placeholder="Isi nama penanggung jawab"></div>'
          +'<div class="psg-field"><span class="psg-lbl">Keterangan</span><input class="psg-inp" data-ps-id="'+id+'" data-ps-field="keterangan" value="'+esc(r.keterangan||'')+'" placeholder="Isi keterangan"></div>'
          +'</div>';
      }).join('');
      html+='<div class="psg-note">Anda dapat mengisi <b>Penanggung Jawab</b> dan <b>Keterangan</b>. Status <b>Selesai</b> hanya dapat dicentang oleh admin lewat web. Nama program &amp; pelaksana dikelola oleh admin.</div>';
    }
    html+='</div></section>';
    return html;
  };

  modulePlaceholders['program-sekolah'] = { eyebrow:'Sekolah', title:'Program Sekolah', subtitle:'Daftar program & kegiatan sekolah.', stats:[], focus:[] };
  console.log('[Zymata Guru] Modul Program Sekolah v1 aktif');
})();

/* ============ MODUL: PERANGKAT PEMBELAJARAN (GURU MOBILE) v1 ============
 * Guru dapat upload & kelola Prota-Promes, Modul Ajar, Media Pembelajaran.
 * Data & file konsisten dgn versi desktop (tabel perangkat_pembelajaran,
 * bucket R2 'dokumen', jenis sama). Upload lewat edge function r2-upload-url,
 * hapus file lewat r2-delete-url. Tema warna: emerald hijau (sesuai app).
 * ===================================================================== */
(function(){
  'use strict';
  if(window.__ZY_PERANGKAT_PEMBELAJARAN_GURU_V1__) return;
  window.__ZY_PERANGKAT_PEMBELAJARAN_GURU_V1__ = true;

  var TABLE='perangkat_pembelajaran';
  var BUCKET='dokumen';
  var R2_PUBLIC_BASE='https://cdn.zymata.my.id';
  var CATS=[
    { jenis:'prota-promes',      label:'Prota-Promes', icon:'\u229E' },
    { jenis:'modul-ajar',        label:'Modul Ajar',   icon:'\u2630' },
    { jenis:'media-pembelajaran',label:'Media',        icon:'\u25BA' }
  ];
  var PP={ jenis:'prota-promes', rows:null, loading:false, uploading:false, pendingFile:null };

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function SB(){ return window.ZymataMobileSupabase; }
  function client(){ try{ var api=SB(); return (api&&typeof api.getClient==='function')?api.getClient():null; }catch(e){ return null; } }
  function activePP(){ try{ return appState && appState.activeTab==='module:perangkat-pembelajaran'; }catch(e){ return false; } }
  function guruId(){ try{ return String(appState.teacherNip||appState.teacherName||'guru'); }catch(e){ return 'guru'; } }
  function guruName(){ try{ return String(appState.teacherName||'Guru'); }catch(e){ return 'Guru'; } }
  function catLabel(j){ for(var i=0;i<CATS.length;i++){ if(CATS[i].jenis===j) return CATS[i].label; } return j; }
  function todayISO(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function fmtSize(n){ n=Number(n||0); if(!n) return ''; if(n<1024) return n+' B'; if(n<1048576) return (n/1024).toFixed(0)+' KB'; return (n/1048576).toFixed(1)+' MB'; }
  function publicUrl(key){ return R2_PUBLIC_BASE+'/'+String(key).split('/').map(encodeURIComponent).join('/'); }
  function ppFixUrl(u){ u=String(u||''); return u.replace(/^https?:\/\/pub-49fe6ea9488240aeb39b45dd5c83d344\.r2\.dev/i, R2_PUBLIC_BASE); }
  function ppViewUrl(u,r){ u=String(u||''); var n=String((r&&r.file_name)||u).toLowerCase(); var ext=((n.split('?')[0].match(/\.([a-z0-9]+)$/)||[])[1])||''; if(['xls','xlsx','doc','docx','ppt','pptx'].indexOf(ext)>=0) return 'https://view.officeapps.live.com/op/view.aspx?src='+encodeURIComponent(u); return u; }
  function toast(msg,tone,icon){ if(typeof showToast==='function') showToast(msg, tone||'success', icon||'&#10003;'); }

  function ppGetKelas(r){ if(r&&r.kelas!=null&&String(r.kelas).trim()!=='') return String(r.kelas).trim(); var m=String((r&&r.keterangan)||'').match(/\[kelas:([^\]]*)\]/i); return m?String(m[1]).trim():''; }
  function ppCleanKet(r){ return String((r&&r.keterangan)||'').replace(/\s*\[kelas:[^\]]*\]/ig,'').trim(); }
  function ppKelasOpts(){ var out=[],seen={}; function add(k){ k=String(k==null?'':k).trim(); if(k&&!seen[k.toLowerCase()]){ seen[k.toLowerCase()]=1; out.push(k); } } try{ if(appState&&Array.isArray(appState.guruKelasList)) appState.guruKelasList.forEach(add); }catch(e){} try{ if(typeof KELAS_LIST!=='undefined'&&Array.isArray(KELAS_LIST)) KELAS_LIST.forEach(add); }catch(e){} try{ (PP.rows||[]).forEach(function(r){ add(ppGetKelas(r)); }); }catch(e){} return out; }
  function ppDefaultKelas(){ try{ if(appState&&appState.teacherClass&&appState.teacherClass!=='Kelas belum terhubung') return String(appState.teacherClass).trim(); if(appState&&Array.isArray(appState.guruKelasList)&&appState.guruKelasList.length) return String(appState.guruKelasList[0]).trim(); }catch(e){} return ''; }
  function ppKelasSelectHtml(up){ var opts=ppKelasOpts(); var def=ppDefaultKelas(); var low=opts.map(function(x){ return String(x).toLowerCase(); }); if(def && low.indexOf(def.toLowerCase())<0){ opts.unshift(def); } var h='<select class="ppg-inp" id="ppg-kelas"'+(up?' disabled':'')+'>'; h+='<option value="">Pilih kelas</option>'; h+=opts.map(function(k){ var sel=(def && String(k).toLowerCase()===def.toLowerCase())?' selected':''; return '<option value="'+esc(k)+'"'+sel+'>'+esc(k)+'</option>'; }).join(''); h+='</select>'; return h; }
  function ppMapelOpts(){ var out=[],seen={}; function add(m){ m=String(m==null?'':m).trim(); if(m&&!seen[m.toLowerCase()]){ seen[m.toLowerCase()]=1; out.push(m); } } try{ if(appState&&Array.isArray(appState.guruMapelList)) appState.guruMapelList.forEach(add); }catch(e){} return out; }
  function ppMapelSelectHtml(up){ var opts=ppMapelOpts(); var h='<select class="ppg-inp" id="ppg-mapel"'+(up?' disabled':'')+'>'; h+='<option value="">Pilih mata pelajaran</option>'; h+=opts.map(function(m){ return '<option value="'+esc(m)+'">'+esc(m)+'</option>'; }).join(''); h+='</select>'; return h; }

  function styleTag(){
    return '<style id="ppg-style">'
      + '.ppg-wrap{padding:0 2px}'
      + '.ppg-tabs{display:flex;gap:8px;margin-bottom:12px;overflow-x:auto;padding-bottom:2px}'
      + '.ppg-tab{flex:1;min-width:96px;text-align:center;background:#161d2e;border:1px solid rgba(148,163,184,.16);border-radius:12px;padding:10px 8px;color:#94a3b8;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:.15s}'
      + '.ppg-tab .i{display:block;font-size:18px;margin-bottom:3px}'
      + '.ppg-tab.active{background:linear-gradient(135deg,var(--indigo) 0%,var(--indigo-dark) 100%);color:#fff;border-color:transparent;box-shadow:0 6px 16px rgba(31,199,180,.28)}'
      + '.ppg-form{background:#161d2e;border:1px solid rgba(148,163,184,.16);border-radius:16px;padding:14px;margin-bottom:14px}'
      + '.ppg-lbl{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#94a3b8;margin-bottom:5px;display:block}'
      + '.ppg-inp{width:100%;box-sizing:border-box;border:1px solid rgba(148,163,184,.22);border-radius:10px;padding:9px 11px;font-size:14px;background:#0f1629;color:#e8ebf2;margin-bottom:10px}'
      + '.ppg-inp:focus{outline:none;border-color:var(--indigo);box-shadow:0 0 0 3px rgba(31,199,180,.15)}'
      + '.ppg-inp::placeholder{color:#7381a0}'
      + '.ppg-file{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}'
      + '.ppg-pick{display:flex;align-items:center;gap:11px;background:#0f1629;border:1.5px dashed rgba(31,199,180,.42);border-radius:12px;padding:12px 13px;margin-bottom:10px;cursor:pointer;transition:.15s}'
      + '.ppg-pick:active{background:#0c1220}'
      + '.ppg-pick.dis{opacity:.55;pointer-events:none}'
      + '.ppg-pick-ic{flex:none;width:36px;height:36px;border-radius:10px;background:rgba(31,199,180,.15);color:var(--indigo);display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800}'
      + '.ppg-pick-main{display:flex;flex-direction:column;min-width:0;flex:1}'
      + '.ppg-pick-main b{font-size:13.5px;color:#e8ebf2}'
      + '.ppg-fname{font-size:11.5px;color:#94a3b8;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.ppg-fname.has{color:var(--indigo);font-weight:600}'
      + '.ppg-btn{width:100%;border:none;border-radius:11px;padding:12px;font-size:14px;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--indigo) 0%,var(--indigo-dark) 100%);cursor:pointer;box-shadow:0 8px 18px rgba(31,199,180,.28)}'
      + '.ppg-btn[disabled]{opacity:.6;cursor:default;box-shadow:none}'
      + '.ppg-card{background:#161d2e;border:1px solid rgba(148,163,184,.16);border-radius:14px;padding:12px 13px;margin-bottom:10px}'
      + '.ppg-top{display:flex;align-items:flex-start;gap:10px}'
      + '.ppg-ic{flex:none;width:34px;height:34px;border-radius:9px;background:rgba(31,199,180,.12);color:var(--indigo);display:flex;align-items:center;justify-content:center;font-size:16px}'
      + '.ppg-info{flex:1;min-width:0}'
      + '.ppg-name{font-weight:700;font-size:14px;color:#e8ebf2;word-break:break-word;line-height:1.3}'
      + '.ppg-meta{font-size:11.5px;color:#94a3b8;margin-top:2px}'
      + '.ppg-ket{font-size:12.5px;color:#c7d2e5;margin-top:6px;line-height:1.45}'
      + '.ppg-actions{display:flex;gap:8px;margin-top:10px}'
      + '.ppg-open{flex:1;text-align:center;text-decoration:none;background:rgba(31,199,180,.12);border:1px solid rgba(31,199,180,.35);color:var(--indigo);border-radius:9px;padding:8px;font-size:12.5px;font-weight:700}'
      + '.ppg-del{flex:none;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.4);color:#fca5a5;border-radius:9px;padding:8px 12px;font-size:12.5px;font-weight:700;cursor:pointer}'
      + '.ppg-empty{background:#161d2e;border:1px dashed rgba(148,163,184,.3);border-radius:14px;padding:22px 14px;text-align:center;color:#94a3b8;font-size:13px}'
      + '.ppg-note{font-size:11.5px;color:#8aa0b6;margin:2px 2px 10px;line-height:1.5}'
      + '</style>';
  }
  function headerCard(detail){
    detail=detail||{};
    return '<section class="section"><article class="module-detail-card">'
      + '<button type="button" class="back-chip" data-action="menu">\u2039 Menu</button>'
      + '<span class="card-label">'+esc(detail.eyebrow||'Akademik')+'</span>'
      + '<h3 class="module-detail-title">'+esc(detail.title||'Perangkat Pembelajaran')+'</h3>'
      + '<p class="module-detail-copy">Upload & kelola perangkat pembelajaran Anda.</p></article></section>';
  }
  function tabsHtml(){
    var t=CATS.map(function(c){
      return '<div class="ppg-tab'+(c.jenis===PP.jenis?' active':'')+'" data-pp-jenis="'+c.jenis+'"><span class="i">'+c.icon+'</span>'+esc(c.label)+'</div>';
    }).join('');
    return '<div class="ppg-tabs">'+t+'</div>';
  }
  function formHtml(){
    var up=PP.uploading;
    return '<div class="ppg-form">'
      + '<span class="ppg-lbl">Keterangan</span>'
      + '<input class="ppg-inp" id="ppg-ket" placeholder="mis. Prota Kelas V Semester 1"'+(up?' disabled':'')+'>'
      + (PP.jenis==='media-pembelajaran' ? ('<span class="ppg-lbl">Kelas yang Diajarkan</span>'
        + ppKelasSelectHtml(up)
        + '<span class="ppg-lbl">Mata Pelajaran</span>'
        + ppMapelSelectHtml(up)) : '')
      + '<span class="ppg-lbl">Berkas (PDF / gambar / dokumen)</span>'
      + '<label class="ppg-pick'+(up?' dis':'')+'" for="ppg-file">'
      +   '<span class="ppg-pick-ic">\u2191</span>'
      +   '<span class="ppg-pick-main"><b>Pilih berkas</b><span class="ppg-fname'+(PP.pendingFile?' has':'')+'" id="ppg-fname">'+(PP.pendingFile?esc(PP.pendingFile.name):'Ketuk untuk memilih dari perangkat')+'</span></span>'
      + '</label>'
      + '<input id="ppg-file" class="ppg-file" type="file"'+(up?' disabled':'')+'>'
      + '<button type="button" class="ppg-btn" data-pp-action="upload"'+(up?' disabled':'')+'>'+(up?'Mengupload\u2026':'Upload Berkas')+'</button>'
      + '</div>';
  }

  async function loadPP(){
    if(PP.loading) return; PP.loading=true;
    try{
      var c=client(); var res=null;
      if(c){ res=await c.from(TABLE).select('*').eq('jenis',PP.jenis).order('created_at',{ascending:false}).limit(300); }
      else if(SB()&&typeof SB().select==='function'){ res=await SB().select(TABLE,{ eq:{jenis:PP.jenis}, order:'created_at', ascending:false, limit:300 }); }
      PP.rows=(res&&res.data)?res.data:[];
    }catch(e){ PP.rows=[]; }
    PP.loading=false;
    if(activePP() && typeof render==='function') render();
  }

  async function doUpload(){
    if(PP.uploading) return;
    var fileEl=document.getElementById('ppg-file');
    var ketEl=document.getElementById('ppg-ket');
    var file=(fileEl&&fileEl.files&&fileEl.files[0])||PP.pendingFile||null;
    var ket=(ketEl&&ketEl.value||'').trim();
    var kelasEl=document.getElementById('ppg-kelas');
    var kelasVal=(PP.jenis==='media-pembelajaran' && kelasEl)?(kelasEl.value||'').trim():'';
    var mapelEl=document.getElementById('ppg-mapel');
    var mapelVal=(PP.jenis==='media-pembelajaran' && mapelEl)?(mapelEl.value||'').trim():'';
    var ketFinal=mapelVal?(mapelVal+(ket?' - '+ket:'')):ket;
    if(!file){ toast('Pilih berkas dulu','error','&#9888;'); return; }
    var c=client();
    if(!c||!c.functions){ toast('Koneksi belum siap, coba lagi','error','&#9888;'); return; }
    PP.uploading=true; if(typeof render==='function') render();
    try{
      var safe=(file.name||'file').replace(/[^a-z0-9_.-]+/gi,'_');
      var id='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
      var path=PP.jenis+'/default/'+id+'-'+safe;
      var key=BUCKET+'/'+path;
      var fd=new FormData();
      fd.append('file',file); fd.append('key',key); fd.append('bucket',BUCKET); fd.append('path',path);
      var up=await c.functions.invoke('r2-upload-url',{ body:fd });
      if(up.error){
        var detail=''; try{ if(up.error.context&&up.error.context.json){ var j=await up.error.context.json(); detail=j&&j.error?(': '+j.error):''; } }catch(e){}
        PP.uploading=false; if(typeof render==='function') render();
        toast('Upload gagal'+detail,'error','&#9888;'); return;
      }
      var url=ppFixUrl((up.data&&up.data.url)||publicUrl(key));
      var row={ id:id, jenis:PP.jenis, keterangan:ketFinal, tanggal:todayISO(), file_url:url, file_key:key,
                file_name:file.name||safe, file_type:file.type||'', file_size:file.size||0,
                guru_id:guruId(), guru_nama:guruName(), client_key:'default' };
      if(kelasVal) row.kelas=kelasVal;
      var ins=await c.from(TABLE).insert(row).select();
      if(ins&&ins.error&&row.kelas&&/kelas|column|schema|not exist|does not|unknown|schema cache/i.test(String((ins.error&&ins.error.message)||''))){
        var _kv=row.kelas; delete row.kelas; row.keterangan=((row.keterangan||'')+' [kelas:'+_kv+']').trim(); ins=await c.from(TABLE).insert(row).select();
      }
      if(ins&&ins.error){ PP.uploading=false; if(typeof render==='function') render(); toast('Tersimpan ke R2, gagal simpan data: '+(ins.error.message||''),'error','&#9888;'); return; }
      PP.uploading=false;
      if(fileEl) fileEl.value=''; PP.pendingFile=null; if(ketEl) ketEl.value='';
      var kelClr=document.getElementById('ppg-kelas'); if(kelClr) kelClr.value='';
      var mpClr=document.getElementById('ppg-mapel'); if(mpClr) mpClr.value='';
      toast('Berkas terupload','success','&#10003;');
      PP.rows=null; loadPP();
    }catch(e){
      PP.uploading=false; if(typeof render==='function') render();
      toast('Upload gagal: '+(e&&e.message||e),'error','&#9888;');
    }
  }

  async function doDelete(id,key){
    var c=client(); if(!c){ toast('Koneksi belum siap','error','&#9888;'); return; }
    try{
      var del=await c.from(TABLE).delete().eq('id',id);
      if(del&&del.error){ toast('Gagal hapus: '+(del.error.message||''),'error','&#9888;'); return; }
      if(key){ try{ await c.functions.invoke('r2-delete-url',{ body:{ key:key } }); }catch(e){} }
      toast('Berkas dihapus','success','&#10003;');
      PP.rows=null; loadPP();
    }catch(e){ toast('Gagal hapus','error','&#9888;'); }
  }

  /* Klik: tab kategori / upload / hapus (delegation dipasang sekali) */
  document.addEventListener('click', function(e){
    var el=e.target; if(!el||!el.closest) return;
    var tab=el.closest('[data-pp-jenis]');
    if(tab){ var j=tab.getAttribute('data-pp-jenis'); if(j&&j!==PP.jenis){ PP.jenis=j; PP.rows=null; loadPP(); if(typeof render==='function') render(); } return; }
    var upBtn=el.closest('[data-pp-action="upload"]'); if(upBtn){ e.preventDefault(); doUpload(); return; }
    var delBtn=el.closest('[data-pp-del]');
    if(delBtn){ e.preventDefault(); var id=delBtn.getAttribute('data-pp-del'); var key=delBtn.getAttribute('data-pp-key')||''; if(window.confirm('Hapus berkas ini? File juga akan dihapus dari penyimpanan.')) doDelete(id,key); return; }
  }, false);

  /* Change: tampilkan nama berkas terpilih tanpa re-render */
  document.addEventListener('change', function(e){
    var el=e.target; if(!el||el.id!=='ppg-file') return;
    var f=el.files&&el.files[0];
    var lbl=document.getElementById('ppg-fname');
    if(!lbl) return;
    PP.pendingFile=f||null;
    if(f){ lbl.textContent=f.name; lbl.classList.add('has'); }
    else { lbl.textContent='Ketuk untuk memilih dari perangkat'; lbl.classList.remove('has'); }
  }, false);

  window.renderPerangkatPembelajaranGuruModule = function(detail){
    var head=styleTag()+headerCard(detail);
    var wrapOpen='<section class="section"><div class="ppg-wrap">'+tabsHtml()+formHtml();
    var wrapClose='</div></section>';
    if(PP.rows===null){ if(!PP.loading) loadPP(); return head+wrapOpen+'<div class="ppg-empty">Memuat berkas\u2026</div>'+wrapClose; }
    var rows=PP.rows||[];
    var body;
    if(!rows.length){
      body='<div class="ppg-note">Kategori: <b>'+esc(catLabel(PP.jenis))+'</b></div><div class="ppg-empty">Belum ada berkas di kategori ini. Upload berkas pertama Anda di atas.</div>';
    } else {
      body='<div class="ppg-note">'+rows.length+' berkas &middot; kategori <b>'+esc(catLabel(PP.jenis))+'</b></div>';
      body+=rows.map(function(r){
        var own=String(r.guru_id||'')===guruId();
        var meta=[]; var _kel=ppGetKelas(r); if(PP.jenis==='media-pembelajaran'&&_kel) meta.push('Kelas '+esc(_kel)); if(r.tanggal) meta.push(esc(String(r.tanggal))); if(r.guru_nama) meta.push(esc(r.guru_nama)); var sz=fmtSize(r.file_size); if(sz) meta.push(sz);
        var del=own?('<button type="button" class="ppg-del" data-pp-del="'+esc(r.id)+'" data-pp-key="'+esc(r.file_key||'')+'">Hapus</button>'):'';
        var open=r.file_url?('<a class="ppg-open" href="'+esc(ppViewUrl(ppFixUrl(r.file_url),r))+'" target="_blank" rel="noopener">Buka berkas</a>'):'<span class="ppg-open">Tanpa berkas</span>';
        return '<div class="ppg-card"><div class="ppg-top"><span class="ppg-ic">\u25AB</span><div class="ppg-info">'
          +'<div class="ppg-name">'+esc(r.file_name||ppCleanKet(r)||'Berkas')+'</div>'
          +'<div class="ppg-meta">'+meta.join(' &middot; ')+'</div>'
          +(ppCleanKet(r)?('<div class="ppg-ket">'+esc(ppCleanKet(r))+'</div>'):'')
          +'</div></div>'
          +'<div class="ppg-actions">'+open+del+'</div></div>';
      }).join('');
    }
    return head+wrapOpen+body+wrapClose;
  };

  if(typeof modulePlaceholders!=='undefined'){
    modulePlaceholders['perangkat-pembelajaran']={ eyebrow:'Akademik', title:'Perangkat Pembelajaran', subtitle:'Prota, modul ajar & media pembelajaran.', stats:[], focus:[] };
  }
  console.log('[Zymata Guru] Modul Perangkat Pembelajaran v1 aktif');
})();
