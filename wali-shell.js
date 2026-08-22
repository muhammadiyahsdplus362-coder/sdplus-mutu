const STORAGE_KEY = 'zymata-wali-shell-v1';
const ROLE_CHOOSER_PATH = 'index.html?choose=1';
// Ubah ke true hanya setelah QRIS production DOKU berstatus ACTIVE.
const QRIS_PAYMENT_ENABLED = false;

(function guardWaliShellRole(){
  try {
    const raw = sessionStorage.getItem('siakad_session_user') || localStorage.getItem('siakad_session_user') || '';
    if (!raw) return;
    const user = JSON.parse(raw);
    const role = String(user && user.role || '').toLowerCase().replace(/[\s_-]+/g, '');
    if (role === 'guru' || role === 'walikelas') {
      window.location.replace('guru-shell.html');
    }
  } catch (_) {}
})();

const appState = {
  activeTab: 'home',
  childName: '',
  childClass: '',
  unreadAnnouncements: 0,
  unreadNotes: 0,
  // [BADGE MODUL] jumlah item baru per modul untuk titik merah di beranda.
  unreadModules: { nilai: 0, mutabaah: 0, perkembangan: 0, calistung: 0 },
  seenAnnouncements: [],
  seenNotes: [],
  // [BADGE MODUL] kunci item yang sudah dibaca per modul.
  seenModules: {},
  // [BADGE MODUL] baris calistung ringkas (id/row_uid) untuk hitung badge.
  waliCalistungRows: [],
  showAnnouncements: false,
  notificationSound: true,
  notificationHaptic: true,
  announcementPriority: true,
  noteAlerts: true,
  compactMode: false,
  selectedChild: '',
  // Keuangan
  financeDue: '-',
  financeAmount: 'Rp0',
  financeStatus: 'belum',        // 'lunas' | 'belum' | 'terlambat'
  financeBulan: 0,               // [LABEL TAGIHAN SPP] jumlah bulan belum lunas
  financeNote: '-',              // [LABEL TAGIHAN SPP] keterangan bawah kartu
  infaqAmount: 10000,            // Prototype UI saja; belum membuat transaksi
  infaqPreviewOpen: false,
  tabunganSaldo: 'Rp0',
  tabunganUpdate: '-',
  tabunganUmumSaldo: 'Rp0',
  tabunganUmumUpdate: '-',
  // Akademik
  homeMutabaahProgress: 0,
  homeAttendanceRate: 0,
  homeScoreAverage: 0,
  homeDevelopmentHighlight: '',
  // Absensi hari ini
  todayAttendance: 'belum',      // 'hadir' | 'izin' | 'sakit' | 'alpa' | 'belum'
  todayCheckIn: '',
  todayCheckInIsDefault: false,
  // Hafalan
  hafalanSurah: '-',
  hafalanProgress: '',
  hafalanTanzil: '',
  hafalanHalaman: '',
  // Supabase
  syncMode: 'idle',
  supabaseModules: {}
};

const tabMeta = {
  home: {
    eyebrow: 'Beranda',
    title: 'Pantau perkembangan anak dengan tenang',
    subtitle: '',
    action: 'Lihat Perkembangan'
  },
  child: {
    eyebrow: 'Data Anak',
    title: 'Profil dan data dasar anak',
    subtitle: 'Profil lengkap dan data sekolah anak.',
    action: 'Buka Profil'
  },
  academic: {
    eyebrow: 'Akademik',
    title: 'Menu',
    subtitle: 'Nilai, absensi, dan perkembangan anak.',
    action: 'Buka Akademik'
  },
  mutabaah: {
    eyebrow: 'Mutabaah',
    title: 'Pantau ibadah dan kebiasaan rumah',
    subtitle: 'Pantau hafalan dan ibadah harian anak.',
    action: 'Isi Mutabaah Rumah'
  },
  more: {
    eyebrow: 'Lainnya',
    title: 'Info sekolah dan administrasi',
    subtitle: 'Surat, pengumuman, dan pengaturan akun.',
    action: 'Buka Lainnya'
  },
  chat: {
    eyebrow: 'Chat',
    title: 'Chat Kelas',
    subtitle: '',
    action: ''
  },
  profile: {
    eyebrow: 'Akun',
    title: 'Pengaturan akun wali',
    subtitle: 'Akun, notifikasi, dan preferensi.',
    action: 'Sinkronkan'
  }
};

const childProfile = {
  fullName: '',
  nickName: '',
  nis: '',
  className: '',
  homeroom: '',
  father: '',
  mother: '',
  wali: '',
  phone: '',
  address: '',
  emergency: '',
  photoUrl: ''
};

const moduleGroups = {
  academic: [
    ['Viewer cepat', 'Absensi dan nilai dibuat ringkas untuk dipindai cepat.'],
    ['Agregat progres', 'Perkembangan anak jadi ringkasan lintas modul.'],
    ['Catatan terpisah', 'Catatan anak tidak dicampur dengan progres.']
  ],
  mutabaah: [
    ['Input ringan', 'Wali cukup isi poin rumah yang paling penting.'],
    ['Progress pekanan', 'Arah kebiasaan rumah tetap mudah dibaca.']
  ],
  more: [
    ['Administrasi', 'Surat/izin dan keuangan dibuat jelas dan ringan.'],
    ['Viewer-only info', 'Pengumuman sekolah tidak bercampur dengan pesan anak.'],
    ['Akun singkat', 'Status akun dan preferensi tetap mudah dijangkau.']
  ]
};

const academicHighlights = [];

const mutabaahHighlights = [];

const moreHighlights = [];

// SVG icons - 20x20 viewBox, stroke-based, minimalist
const ICONS = {
  absensi:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="12" height="16" rx="2"/><path d="M7 7h6M7 10h6M7 13h4"/></svg>`,
  nilai:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14l4-4 3 3 5-6"/><rect x="2" y="2" width="16" height="16" rx="2"/></svg>`,
  tumbuh:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17V8"/><path d="M6 12c0-3 4-7 4-7s4 4 4 7a4 4 0 01-8 0z"/></svg>`,
  catatan:    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12v9H4z" rx="1"/><path d="M4 13l3 4h6l3-4"/><path d="M8 9h4"/></svg>`,
  rumah:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L10 3l7 6.5"/><path d="M5 9v8h4v-4h2v4h4V9"/></svg>`,
  quran:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3h9a1 1 0 011 1v12a1 1 0 01-1 1H5a2 2 0 01-2-2V4a1 1 0 011-1z"/><path d="M14 3v14"/><path d="M7 8h4M7 11h3"/></svg>`,
  keuangan:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="16" height="12" rx="2"/><path d="M2 9h16"/><circle cx="6" cy="13" r="1" fill="currentColor" stroke="none"/></svg>`,
  pengumuman: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13V8a6 6 0 1112 0v5"/><path d="M2 13h16"/><path d="M8 13v1a2 2 0 004 0v-1"/></svg>`,
  surat:      `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="16" height="12" rx="2"/><path d="M2 7l8 6 8-6"/></svg>`,
  akun:       `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>`
};

const academicModules = [
  { id: 'absensi-anak',     icon: ICONS.absensi,    title: 'Absensi',       meta: 'Hadir, izin, sakit, dan rekap',            route: 'module:absensi-anak',     group: 'Akademik' },
  { id: 'nilai-anak',       icon: ICONS.nilai,      title: 'Nilai',         meta: 'Ringkasan tugas, ujian, dan capaian',      route: 'module:nilai-anak',       group: 'Akademik' },
  { id: 'perkembangan-anak',icon: ICONS.tumbuh,     title: 'Perkembangan',  meta: 'Ibadah, karakter, prestasi',      route: 'module:perkembangan-anak',group: 'Akademik' },
  { id: 'catatan-anak',     icon: ICONS.catatan,    title: 'Catatan Anak',  meta: 'Pesan dan tindak lanjut dari sekolah',     route: 'module:catatan-anak',     group: 'Akademik' },
  { id: 'calistung-anak',   icon: ICONS.tumbuh,     title: 'Calistung',     meta: 'Literasi & numerasi anak',                 route: 'module:calistung-anak',   group: 'Akademik' }, // [CALISTUNG WALI]
  { id: 'jadwal-anak',      icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14"/><path d="M7 2v3"/><path d="M13 2v3"/></svg>`, title: 'Jadwal Pelajaran', meta: 'Jadwal mata pelajaran mingguan', route: 'module:jadwal-anak', group: 'Akademik' },
  { id: 'program-kegiatan', icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14"/><path d="M7 2v3"/><path d="M13 2v3"/><path d="M10 10.3l.62 1.28 1.4.2-1.02 1 .24 1.4-1.24-.66-1.24.66.24-1.4-1.02-1 1.4-.2z"/></svg>`, title: 'Program Kegiatan', meta: 'Agenda & kegiatan sekolah', route: 'module:program-kegiatan', group: 'Informasi' }
];

const mutabaahModules = [
  { id: 'mutabaah-rumah',  icon: ICONS.rumah,  title: 'Mutabaah Rumah',  meta: 'Input kebiasaan anak di rumah',               route: 'module:mutabaah-rumah',  group: 'Mutabaah' },
  { id: 'mutabaah-tahfidz', icon: ICONS.quran,  title: 'Mutabaah Tahfidz',  meta: 'Setoran hafalan anak & pantau setoran sekolah', route: 'module:mutabaah-tahfidz', group: 'Mutabaah' }
];

const moreModules = [
  { id: 'keuangan',       icon: ICONS.keuangan,   title: 'Keuangan',    meta: 'SPP, tabungan, dan tagihan lain',    route: 'module:keuangan',      group: 'Administrasi' },
  { id: 'pengumuman-wali',icon: ICONS.pengumuman, title: 'Pengumuman',  meta: 'Info sekolah dan agenda penting',    route: 'module:pengumuman-wali',group: 'Informasi'   },
  { id: 'program-kegiatan',icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14"/><path d="M7 2v3"/><path d="M13 2v3"/></svg>`, title: 'Program Kegiatan', meta: 'Agenda & kegiatan sekolah', route: 'module:program-kegiatan', group: 'Informasi' },
  { id: 'surat-wali',     icon: ICONS.surat,      title: 'Surat/Izin',  meta: 'Ajukan izin dan cek status surat',   route: 'module:surat-wali',    group: 'Administrasi' },
  { id: 'akun-wali',      icon: ICONS.akun,       title: 'Akun',        meta: 'Profil wali, notifikasi, dan preferensi', route: 'profile',           group: 'Akun'         }
];

const announcements = [];

const moduleDetails = {
  'jadwal-anak': {
    eyebrow: 'Akademik',
    title: 'Jadwal Pelajaran',
    subtitle: 'Lihat jadwal mata pelajaran mingguan anak sesuai kelasnya, langsung dari data sekolah.',
    stats: [["Jadwal", "Mingguan"]],
    focus: []
  },
  'absensi-anak': {
    eyebrow: 'Akademik',
    title: 'Absensi Anak',
    subtitle: 'Wali melihat status hadir, izin, sakit, alpa, dan rekap kehadiran anak tanpa perlu input berat.',
    stats: [["Belum", "0"]],
    focus: []
  },
  'nilai-anak': {
    eyebrow: 'Akademik',
    title: 'Nilai Anak',
    subtitle: 'Ringkasan nilai fokus pada progress anak: tugas, ulangan, ujian, dan catatan singkat guru.',
    stats: [["Belum", "0"]],
    focus: []
  },
  'perkembangan-anak': {
    eyebrow: 'Perkembangan',
    title: 'Perkembangan Anak',
    subtitle: 'Halaman agregat progres anak: ibadah, karakter, prestasi, pelanggaran, dan highlight mutabaah.',
    stats: [["Belum", "0"]],
    focus: [],
    modules: [
      ['Ibadah', 'Belum ada data'],
      ['Karakter', 'Belum ada data'],
      ['Prestasi', 'Belum ada data'],
      ['Pelanggaran', 'Tidak ada catatan baru'],
      ['Highlight Mutabaah', 'Rumah']
    ]
  },
  'catatan-anak': {
    eyebrow: 'Catatan',
    title: 'Catatan Anak',
    subtitle: 'Pesan langsung dari sekolah tetap dipisah dari perkembangan agar wali mudah membedakan progres dan catatan.',
    stats: [["Belum", "0"]],
    focus: []
  },
  'mutabaah-rumah': {
    eyebrow: 'Mutabaah',
    title: 'Mutabaah Rumah',
    subtitle: 'Input ringan sisi wali untuk kebiasaan harian anak di rumah. Desain tetap satu keluarga dengan role guru, tapi alurnya ringan.',
    stats: [["Belum", "0"]],
    focus: []
  },
  'mutabaah-tahfidz': {
    eyebrow: 'Mutabaah',
    title: 'Mutabaah Tahfidz',
    subtitle: 'Wali mengisi setoran hafalan anak (Ziyadah, Muroja\'ah, Tilawah) dan memantau setoran sekolah dari guru (hanya baca).',
    stats: [["Belum", "0"]],
    focus: []
  },
  keuangan: {
    eyebrow: 'Administrasi',
    title: 'Keuangan',
    subtitle: 'SPP, tabungan, dan tagihan lain dibuat ringkas agar wali cepat paham status dan jatuh tempo.',
    stats: [["Belum", "0"]],
    focus: []
  },
  'keuangan-spp': {
    eyebrow: 'Administrasi',
    title: 'Riwayat SPP',
    subtitle: 'Daftar tagihan SPP anak beserta status lunas/belum dan jatuh tempo.',
    stats: [],
    focus: []
  },
  'infaq-subuh': {
    eyebrow: 'Pembayaran',
    title: 'Infaq Subuh',
    subtitle: 'Pilih nominal infaq, lalu lanjutkan melalui QRIS saat layanan pembayaran sudah diaktifkan.',
    stats: [],
    focus: []
  },
  'keuangan-tabungan': {
    eyebrow: 'Administrasi',
    title: 'Tabungan Anak',
    subtitle: 'Mutasi setor dan tarik tabungan anak beserta saldo terkini.',
    stats: [],
    focus: []
  },
  'keuangan-umum': {
    eyebrow: 'Administrasi',
    title: 'Tabungan Umum',
    subtitle: 'Mutasi setoran dan penarikan tabungan umum anak.',
    stats: [],
    focus: []
  },
  'pengumuman-wali': {
    eyebrow: 'Informasi',
    title: 'Pengumuman',
    subtitle: 'Info sekolah tetap viewer-only dan mudah dibaca, tanpa campur dengan pesan pribadi.',
    stats: [["Belum", "0"]],
    focus: announcements
  },
  'program-kegiatan': {
    eyebrow: 'Informasi',
    title: 'Program Kegiatan Sekolah',
    subtitle: 'Daftar program & kegiatan sekolah beserta jadwal, tempat, dan status pelaksanaannya. Hanya untuk dilihat.',
    stats: [["Program", "Sekolah"]],
    focus: []
  },
  'surat-wali': {
    eyebrow: 'Administrasi',
    title: 'Surat/Izin',
    subtitle: 'Wali bisa ajukan izin ringan dan cek status surat sekolah dari satu halaman.',
    stats: [["Belum", "0"]],
    focus: []
  }
};

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
    if (saved && (tabMeta[saved.activeTab] || String(saved.activeTab || '').startsWith('module:'))) {
      appState.activeTab = saved.activeTab;
    }
    if (saved && saved.selectedChild) {
      appState.selectedChild = saved.selectedChild;
    }
    if (saved && typeof saved.showAnnouncements === 'boolean') {
      appState.showAnnouncements = saved.showAnnouncements;
    }
    if (typeof saved.notificationSound === 'boolean') {
      appState.notificationSound = saved.notificationSound;
    }
    if (typeof saved.notificationHaptic === 'boolean') {
      appState.notificationHaptic = saved.notificationHaptic;
    }
    if (typeof saved.announcementPriority === 'boolean') {
      appState.announcementPriority = saved.announcementPriority;
    }
    if (typeof saved.noteAlerts === 'boolean') {
      appState.noteAlerts = saved.noteAlerts;
    }
    if (typeof saved.compactMode === 'boolean') {
      appState.compactMode = saved.compactMode;
    }
    if (Array.isArray(saved.seenAnnouncements)) {
      appState.seenAnnouncements = saved.seenAnnouncements;
    }
    if (Array.isArray(saved.seenNotes)) {
      appState.seenNotes = saved.seenNotes;
    }
    if (saved.seenModules && typeof saved.seenModules === 'object') {
      appState.seenModules = saved.seenModules;
    }
  } catch (error) {
    console.warn('Failed to load wali shell state', error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    activeTab: appState.activeTab,
    selectedChild: appState.selectedChild,
    showAnnouncements: appState.showAnnouncements,
    notificationSound: appState.notificationSound,
    notificationHaptic: appState.notificationHaptic,
    announcementPriority: appState.announcementPriority,
    noteAlerts: appState.noteAlerts,
    compactMode: appState.compactMode,
    seenAnnouncements: (appState.seenAnnouncements || []).slice(-300),
    seenNotes: (appState.seenNotes || []).slice(-300),
    seenModules: (function(){
      var out = {}; var sm = appState.seenModules || {};
      Object.keys(sm).forEach(function(k){ out[k] = Array.isArray(sm[k]) ? sm[k].slice(-300) : []; });
      return out;
    })()
  }));
}

// ===== Cache data wali (stale-while-revalidate) =====
// Simpan snapshot data terakhir agar buka aplikasi berikutnya tampil INSTAN
// (SPP, tabungan, akademik) dari cache, lalu di-refresh diam-diam oleh
// hydrateWaliFromSupabase(). Meniru pola DATA_CACHE pada shell guru.
const WALI_DATA_CACHE_KEY = STORAGE_KEY + '_data';
function waliCacheOwner() {
  try {
    if (!window.ZymataMobileSupabase) return '';
    const s = window.ZymataMobileSupabase.readSession() || {};
    return String(s.username || s.siswa_id || s.nis_siswa || s.no_hp || s.hp || '').toLowerCase();
  } catch (_) { return ''; }
}
function saveWaliDataCache() {
  try {
    localStorage.setItem(WALI_DATA_CACHE_KEY, JSON.stringify({
      v: 1,
      ts: Date.now(),
      owner: waliCacheOwner(),
      syncMode: appState.syncMode,
      childName: appState.childName,
      childClass: appState.childClass,
      childNis: appState.childNis,
      waliTitle: appState.waliTitle,
      childProfile: childProfile,
      supabaseModules: appState.supabaseModules,
      announcements: announcements,
      waliCalistungRows: appState.waliCalistungRows
    }));
  } catch (_) {}
}
function loadWaliDataCache() {
  try {
    const raw = localStorage.getItem(WALI_DATA_CACHE_KEY);
    if (!raw) return false;
    const c = JSON.parse(raw);
    if (!c || c.v !== 1) return false;
    // Hanya pulihkan bila pemilik cache sama dengan sesi sekarang (cegah data
    // anak lain muncul di perangkat berbagi).
    const owner = waliCacheOwner();
    if (owner && c.owner && owner !== c.owner) return false;
    if (c.supabaseModules && typeof c.supabaseModules === 'object') appState.supabaseModules = filterWaliPengumuman(c.supabaseModules);
    if (c.syncMode) appState.syncMode = c.syncMode;
    if (c.childName) appState.childName = c.childName;
    if (c.childClass) appState.childClass = c.childClass;
    if (c.childNis) appState.childNis = c.childNis;
    if (c.waliTitle) appState.waliTitle = c.waliTitle;
    if (c.childProfile && typeof c.childProfile === 'object') {
      Object.keys(c.childProfile).forEach(function(k){ if (c.childProfile[k] != null && c.childProfile[k] !== '') childProfile[k] = c.childProfile[k]; });
    }
    if (Array.isArray(c.announcements)) { announcements.splice(0, announcements.length); c.announcements.forEach(function(a){ announcements.push(a); }); }
    if (Array.isArray(c.waliCalistungRows)) appState.waliCalistungRows = c.waliCalistungRows;
    try { computeWaliRecap(); } catch (_e) {}
    try { syncWaliFinanceState(); } catch (_e) {}
    try { recomputeWaliModuleBadges(); } catch (_e) {}
    return true;
  } catch (_) { return false; }
}

// Kunci unik per item untuk menandai "sudah dibaca" (badge notifikasi).
function waliItemKey(r) {
  if (!r) return '';
  return String(
    r.id || r.uuid || r.key ||
    ((r.tanggal || r.created_at || r.waktu || r.updated_at || '') + '|' +
     (r.judul || r.title || r.perihal || r.catatan || r.isi || r.pesan || r.deskripsi || ''))
  );
}

// Deteksi target sebuah pengumuman (semua / guru / wali) dari kolom target_type,
// label target, atau payload JSON. Dipakai untuk menyaring notif per role.
function _waliAnnTargetType(r){
  if(!r) return 'semua';
  var pl = {};
  try { if(r.payload) pl = (typeof r.payload==='string') ? JSON.parse(r.payload) : r.payload; } catch(_){}
  var type = String(r.target_type || pl.target_type || '').toLowerCase();
  var label = String(r.target || r.target_label || pl.target || pl.target_label || '').toLowerCase();
  if(!type) type = /wali|murid|orang tua|orangtua|ortu/.test(label) ? 'wali' : (/guru/.test(label) ? 'guru' : 'semua');
  return type;
}
// Aplikasi ini untuk WALI MURID: buang pengumuman ber-target Guru.
function filterWaliPengumuman(sm){
  try { if (sm && Array.isArray(sm.pengumuman)) sm.pengumuman = sm.pengumuman.filter(function(r){ return _waliAnnTargetType(r) !== 'guru'; }); } catch(_){}
  return sm;
}

// Tandai semua item kategori tertentu sebagai sudah dibaca, lalu simpan.
function markWaliSeen(kind) {
  try {
    var sm = appState.supabaseModules || {};
    if (kind === 'pengumuman') {
      var keysA = (sm.pengumuman || []).map(waliItemKey);
      appState.seenAnnouncements = Array.from(new Set((appState.seenAnnouncements || []).concat(keysA)));
      appState.unreadAnnouncements = 0;
    } else if (kind === 'catatan') {
      var keysC = (sm.catatan || []).map(waliItemKey);
      appState.seenNotes = Array.from(new Set((appState.seenNotes || []).concat(keysC)));
      appState.unreadNotes = 0;
    }
    saveState();
  } catch (_) {}
}

// [BADGE MODUL] Daftar baris "sumber" untuk tiap modul beranda yang punya badge.
// Semua data ini sudah ada di appState.supabaseModules setelah hydrate (kecuali
// calistung yang diisi terpisah ke appState.waliCalistungRows).
function waliModuleRows(modKey) {
  var sm = appState.supabaseModules || {};
  if (modKey === 'nilai') return Array.isArray(sm.nilai) ? sm.nilai : [];
  if (modKey === 'mutabaah') return [].concat(
    Array.isArray(sm.mutabaahRumah) ? sm.mutabaahRumah : [],
    Array.isArray(sm.mutabaahQuran) ? sm.mutabaahQuran : []
  );
  if (modKey === 'perkembangan') return [].concat(
    Array.isArray(sm.pelanggaran) ? sm.pelanggaran : [],
    Array.isArray(sm.karakter) ? sm.karakter : [],
    Array.isArray(sm.prestasi) ? sm.prestasi : [],
    Array.isArray(sm.ibadah) ? sm.ibadah : []
  );
  if (modKey === 'calistung') return Array.isArray(appState.waliCalistungRows) ? appState.waliCalistungRows : [];
  return [];
}

// [BADGE MODUL] Hitung ulang jumlah item baru (belum dibaca) untuk tiap modul.
function recomputeWaliModuleBadges() {
  try {
    appState.unreadModules = appState.unreadModules || {};
    appState.seenModules = appState.seenModules || {};
    ['nilai','mutabaah','perkembangan','calistung'].forEach(function(mod){
      var seen = Array.isArray(appState.seenModules[mod]) ? appState.seenModules[mod] : [];
      var rows = waliModuleRows(mod);
      var n = 0;
      rows.forEach(function(r){ if (seen.indexOf(waliItemKey(r)) === -1) n++; });
      appState.unreadModules[mod] = n;
    });
  } catch (_) {}
}

// [BADGE MODUL] Tandai semua item modul sebagai sudah dibaca (badge hilang).
function markWaliModuleSeen(mod) {
  try {
    if (!mod) return;
    appState.seenModules = appState.seenModules || {};
    var keys = waliModuleRows(mod).map(waliItemKey);
    appState.seenModules[mod] = Array.from(new Set((appState.seenModules[mod] || []).concat(keys)));
    appState.unreadModules = appState.unreadModules || {};
    appState.unreadModules[mod] = 0;
    saveState();
  } catch (_) {}
}


// ── palet slate premium ─────────────────────────────────────────
// aksen: violet #7c3aed (minimal). teks: #0f172a / #64748b.
// tidak ada hijau, tidak ada teal, tidak ada indigo campur-campur.
// ────────────────────────────────────────────────────────────────

// Daftar kelas & siswa untuk dropdown (tersinkron dari Supabase saat akun terhubung).
const KELAS_LIST = ['1A','1B','2A','2B','3A','3B','4A','4B','5A','5B','6A','6B'];
const SISWA_PER_KELAS = {};

function renderModuleForm(crudKey) {
  // Wali write whitelist: hanya 3 modul ini yang BOLEH input data
  var WALI_WRITE_ALLOWED = ['wali:mutabaah-rumah','wali:surat-wali'];
  if (WALI_WRITE_ALLOWED.indexOf(crudKey) === -1) return '';
  var schema = (window.ZymataMobileSupabase && window.ZymataMobileSupabase.MODULE_FORM_SCHEMA && window.ZymataMobileSupabase.MODULE_FORM_SCHEMA[crudKey]) || null;
  if (!schema) {
    return `
      <section class="section">
        <article class="input-panel">
          <label class="field-label">Input cepat</label>
          <textarea class="field-textarea" data-mobile-crud-text="${crudKey}" placeholder="Tulis data..."></textarea>
          <button type="button" class="save-draft-btn" data-mobile-crud-create="${crudKey}">Simpan ke Supabase</button>
        </article>
      </section>
    `;
  }
  var html = '<section class="section"><article class="input-panel"><span class="card-label">'+schema.title+'</span>';
  schema.fields.forEach(function(field) {
    if (field.type === 'textarea') {
      html += '<label class="field-label">'+field.label+'</label><textarea class="field-textarea" data-module-field="'+field.key+'" data-form-key="'+crudKey+'" placeholder="'+field.label+'..." rows="2"></textarea>';
    } else if (field.type === 'date') {
      html += '<label class="field-label">'+field.label+'</label><input type="date" class="field-input" data-module-field="'+field.key+'" data-form-key="'+crudKey+'">';
    } else if (field.type === 'number') {
      html += '<label class="field-label">'+field.label+'</label><input type="number" class="field-input" data-module-field="'+field.key+'" data-form-key="'+crudKey+'" placeholder="'+field.label+'">';
    } else if (field.type === 'siswa-select') {
      html += '<label class="field-label">'+field.label+'</label><select class="field-select" data-module-field="'+field.key+'" data-form-key="'+crudKey+'"><option value="">Pilih siswa</option>';
      KELAS_LIST.forEach(function(kls){
        var daftar = SISWA_PER_KELAS[kls] || [];
        if(!daftar.length) return;
        if(KELAS_LIST.length > 1) html += '<optgroup label="Kelas '+kls+'">';
        daftar.forEach(function(s){
          html += '<option value="'+s.nis+'">'+s.name+' ('+s.nis+')</option>';
        });
        if(KELAS_LIST.length > 1) html += '</optgroup>';
      });
      html += '</select>';
    } else if (field.options && field.options.length) {
      html += '<label class="field-label">'+field.label+'</label><select class="field-select" data-module-field="'+field.key+'" data-form-key="'+crudKey+'"><option value="">Pilih '+field.label+'</option>';
      field.options.forEach(function(option) { html += '<option value="'+option+'">'+option+'</option>'; });
      html += '</select>';
    } else {
      html += '<label class="field-label">'+field.label+'</label><input type="text" class="field-input" data-module-field="'+field.key+'" data-form-key="'+crudKey+'" placeholder="'+field.label+'">';
    }
  });
  html += '<button type="button" class="save-draft-btn" data-mobile-crud-create="'+crudKey+'" style="margin-top:12px">Simpan ke Supabase</button></article></section>';
  return html;
}

function getWaliHomeSubtitle() {
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return today + ' &middot; ' + appState.childClass;
}

function renderChildSwitcher() {
  var kids = Array.isArray(appState.children) ? appState.children : [];
  if (kids.length < 2) return '';
  var active = String(appState.activeChildId || '');
  var options = kids.map(function(k){
    var sel = (String(k.id) === active) ? ' selected' : '';
    var label = (k.nama || 'Anak') + (k.kelas ? (' \u00b7 ' + k.kelas) : '');
    return '<option value="'+k.id+'"'+sel+'>'+label+'</option>';
  }).join('');
  return '<div class="wali-child-switcher"><span class="wcs-label">Anak</span><div class="wcs-select-wrap"><select class="wcs-select" data-action="selectChildDropdown" aria-label="Pilih anak">'+options+'</select><svg class="wcs-caret" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div></div>';
}

function renderHeader() {
  const moduleId = appState.activeTab.startsWith('module:')
    ? appState.activeTab.replace('module:', '') : '';
  const moduleDetail = moduleId ? moduleDetails[moduleId] : null;
  const isHome = appState.activeTab === 'home';
  const isModule = Boolean(moduleId);
  const meta = tabMeta[appState.activeTab] || {
    eyebrow: moduleDetail?.eyebrow || 'Wali Murid',
    title:   moduleDetail?.title   || 'Menu',
    subtitle:moduleDetail?.subtitle|| '',
    action:  'Kembali'
  };

  if (isHome) {
    headerEl.innerHTML = renderChildSwitcher();
    return;
  }

  if (isModule) {
    headerEl.innerHTML = `
      <div class="top-app-bar">
        <button type="button" class="tab-back-btn" data-action="backToParent" aria-label="Kembali">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="top-bar-title">${meta.title}</span>
        <div style="width:40px"></div>
      </div>`;
    return;
  }

  headerEl.innerHTML = `
    <div class="top-app-bar">
      <span class="top-bar-title">${meta.title}</span>
      <div class="tab-actions">
        <button type="button" class="tab-icon-btn" data-action="toggleAnnouncements" aria-label="Pengumuman">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          ${appState.unreadAnnouncements ? '<span class="tib-dot"></span>' : ''}
        </button>
      </div>
    </div>${renderChildSwitcher()}`;
}

function getAttendanceStatusLabel(s) {
  return s==='hadir'?'Hadir ✅':s==='izin'?'Izin 📔':s==='sakit'?'Sakit 🥵':s==='alpa'?'Alpa ⚠️':'Belum tercatat ⏳';
}
function getAttendanceTone(s) {
  return s==='hadir'?'green':s==='izin'?'blue':s==='sakit'?'orange':'red';
}
function getFinanceStatusLabel(s) {
  return s==='lunas'?'Lunas ✅':s==='terlambat'?'Terlambat ⚠️':'Belum dibayar';
}
function getFinanceTone(s) {
  return s==='lunas'?'green':s==='terlambat'?'red':'orange';
}
// Baris SPP dihitung LUNAS bila: (a) status mengandung 'lunas' (bukan 'belum'),
// ATAU (b) baris tsb adalah bukti pembayaran/pemasukan (dari tabel keuangan /
// spp_pembayaran) yang ditandai jenis 'Masuk'/'Setor'/'Bayar'. Ini mencegah
// catatan pembayaran SPP tampil sebagai tagihan "Belum" di aplikasi wali.
function waliSppLunas(t) {
  if (!t) return false;
  var st = String(t.status || '');
  if (/lunas/i.test(st) && !/belum/i.test(st)) return true;
  if (/masuk|setor|bayar/i.test(String(t.jenis || ''))) return true;
  return false;
}
// Tanggal yang ditampilkan untuk baris SPP: bila LUNAS pakai tanggal pembayaran
// (tanggal_bayar/tanggal_lunas), bila BELUM pakai jatuh tempo.
// Jatuh tempo SPP untuk aplikasi wali = tanggal 10 pada bulan/tahun tagihan
// (kecuali data punya jatuh_tempo eksplisit).
function waliSppJatuhTempo(t){
  if(!t) return '';
  if(t.jatuh_tempo) return t.jatuh_tempo;
  var bm={januari:1,jan:1,februari:2,feb:2,maret:3,mar:3,april:4,apr:4,mei:5,juni:6,jun:6,juli:7,jul:7,agustus:8,agu:8,agt:8,ags:8,september:9,sep:9,oktober:10,okt:10,november:11,nov:11,desember:12,des:12};
  var mn=String(t.bulan||'').trim().toLowerCase(); var mo=bm[mn]||bm[mn.slice(0,3)];
  if(!mo && /^\d{1,2}$/.test(mn) && +mn>=1 && +mn<=12) mo=+mn;
  var yr=String(t.tahun||'').trim();
  if(mo && /^\d{4}$/.test(yr)) return yr+'-'+String(mo).padStart(2,'0')+'-10';
  return t.tanggal || '';
}
function waliSppTanggal(t){
  if(!t) return '';
  if(waliSppLunas(t)) return t.tanggal_bayar || t.tanggal_lunas || t.tanggal || waliSppJatuhTempo(t) || '';
  return waliSppJatuhTempo(t) || t.tanggal || t.tanggal_bayar || t.tanggal_lunas || '';
}
// Banner peringatan jatuh tempo SPP (tampilan profesional): merah bila terlambat,
// oranye bila jatuh tempo hari ini, kuning bila akan jatuh tempo.
function waliSppWarningBanner(belumBayar){
  if(!belumBayar || !belumBayar.length) return '';
  var due = belumBayar.map(function(t){ return waliSppJatuhTempo(t); }).filter(Boolean).sort(function(a,b){ return String(a).localeCompare(String(b)); })[0];
  if(!due) return '';
  var count = belumBayar.length;
  var total = belumBayar.reduce(function(s,t){ return s + Number(t.nominal||0); }, 0);
  var d = new Date(String(due).slice(0,10) + 'T00:00:00');
  var now = new Date(); var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var due0 = isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var diff = due0 ? Math.round((today.getTime() - due0.getTime())/86400000) : null;
  var bulanID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var dueLabel = due0 ? (due0.getDate() + ' ' + bulanID[due0.getMonth()] + ' ' + due0.getFullYear()) : String(due);
  var overdue = diff !== null && diff > 0;
  var dueToday = diff === 0;
  var accent = overdue ? '#ef4444' : (dueToday ? '#f97316' : '#f59e0b');
  var bg = overdue ? '#fef2f2' : (dueToday ? '#fff7ed' : '#fffbeb');
  var titleColor = overdue ? '#b91c1c' : (dueToday ? '#c2410c' : '#b45309');
  var textColor = overdue ? '#7f1d1d' : (dueToday ? '#7c2d12' : '#78350f');
  var icon = overdue ? '\u26a0\ufe0f' : (dueToday ? '\u23f0' : '\ud83d\udd14');
  var badge = overdue ? 'TERLAMBAT' : (dueToday ? 'HARI INI' : 'SEGERA');
  var title = overdue ? ('SPP Terlambat ' + diff + ' hari') : (dueToday ? 'SPP Jatuh Tempo Hari Ini' : 'SPP Akan Jatuh Tempo');
  var totalLabel = 'Rp ' + Number(total).toLocaleString('id-ID');
  var subject = count > 1 ? (count + ' tagihan SPP (' + totalLabel + ')') : ('Tagihan SPP ' + totalLabel);
  var msg = subject + ' jatuh tempo ' + dueLabel + (overdue ? '. Mohon segera lakukan pembayaran ke sekolah.' : '. Harap dibayar sebelum jatuh tempo.');
  return '<div class="wali-spp-alert" style="display:flex;align-items:flex-start;gap:12px;background:' + bg + ';border:1px solid ' + accent + '33;border-left:4px solid ' + accent + ';border-radius:14px;padding:13px 15px;margin:0 0 14px;box-shadow:0 1px 3px rgba(0,0,0,.05);">'
    + '<div style="font-size:20px;line-height:1.15;">' + icon + '</div>'
    + '<div style="flex:1;min-width:0;">'
    + '<div style="font-weight:800;color:' + titleColor + ';font-size:13px;letter-spacing:.2px;">' + title + '</div>'
    + '<div style="color:' + textColor + ';font-size:12px;margin-top:3px;line-height:1.5;">' + msg + '</div>'
    + '</div>'
    + '<span style="align-self:center;background:' + accent + ';color:#fff;font-size:10px;font-weight:800;padding:4px 9px;border-radius:999px;white-space:nowrap;letter-spacing:.4px;">' + badge + '</span>'
    + '</div>';
}

// [KUNCI NIS KARTU KEUANGAN] Penyaring baris milik anak untuk kartu dashboard.
// NIS didahulukan; nama hanya dipakai bila baris memang tidak punya NIS, dan
// harus SAMA PERSIS (bukan sekadar mengandung) supaya nama mirip seperti
// AFIFAH vs AFIFAH ZAHRA tidak saling tercampur.
function waliNormNama(v){ return String(v || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function waliRowMilikAnak(t){
  if(!t) return false;
  var anakNama = waliNormNama(appState.childName);
  var anakNis  = String(appState.childNis || '').trim();
  var rowNis   = String(t.nis || t.nis_siswa || t.siswa_nis || t.snapshot_nis || '').trim();
  var rowNama  = waliNormNama(t.nama_siswa || t.namaSiswa || t.nama);
  if(!anakNama || anakNama === 'belum terhubung') return true;
  // NIS ada di kedua sisi -> NIS yang menentukan, nama tidak boleh menolong.
  if(anakNis && rowNis) return rowNis === anakNis;
  // Baris tanpa nama dan tanpa NIS: biarkan lewat (perilaku lama dipertahankan).
  if(!rowNama) return true;
  return rowNama === anakNama;
}

function syncWaliFinanceState(){
  var anakNama = appState.childName || '';
  var _smF = appState.supabaseModules || {};
  var tagihanList = Array.isArray(_smF.keuangan) ? _smF.keuangan.slice() : [];
  var tabData = Array.isArray(_smF.tabungan) ? _smF.tabungan.slice() : [];
  if(!tagihanList.length){ try { var rawTag = localStorage.getItem('zymata_tagihan_spp_v1'); if(rawTag){ var arrTg = JSON.parse(rawTag); if(Array.isArray(arrTg)) tagihanList = arrTg; } } catch(e){} }
  if(!tabData.length){ try { var rawTab = localStorage.getItem('sdplus_tabungan_v1'); if(rawTab){ var arrTb = JSON.parse(rawTab); if(Array.isArray(arrTb)) tabData = arrTb; } } catch(e){} }
  var tagihanAnak = tagihanList.filter(waliRowMilikAnak); // [KUNCI NIS KARTU KEUANGAN]
  var tabAnak = tabData.filter(waliRowMilikAnak);         // [KUNCI NIS KARTU KEUANGAN]
  var belumBayar = tagihanAnak.filter(function(t){ return !waliSppLunas(t); });
  var totalTagihan = belumBayar.reduce(function(s,t){ return s + Number(t.nominal||0); }, 0);
  var setorTab = 0, tarikTab = 0;
  tabAnak.forEach(function(t){ var deb=Number(t.debit||0), kre=Number(t.kredit||0); if(deb||kre){ setorTab+=deb; tarikTab+=kre; } else { var n=Number(t.nominal||0); if(/setor|masuk/i.test(t.jenis||'')) setorTab+=n; else tarikTab+=n; } });
  var saldoTab = setorTab - tarikTab;
  var tabUmumData = Array.isArray(_smF.tabunganUmum) ? _smF.tabunganUmum.slice() : [];
  if(!tabUmumData.length){ try { var rawTU = localStorage.getItem('sdplus_tabungan_umum_v1'); if(rawTU){ var arrTU = JSON.parse(rawTU); if(Array.isArray(arrTU)) tabUmumData = arrTU; } } catch(e){} }
  var tabUmumAnak = tabUmumData.filter(waliRowMilikAnak); // [KUNCI NIS KARTU KEUANGAN]
  var setorUmum = 0, tarikUmum = 0;
  tabUmumAnak.forEach(function(t){ var deb=Number(t.debit||0), kre=Number(t.kredit||0); if(deb||kre){ setorUmum+=deb; tarikUmum+=kre; } else { var n=Number(t.nominal||0); if(/setor|masuk/i.test(t.jenis||'')) setorUmum+=n; else tarikUmum+=n; } });
  var saldoUmum = setorUmum - tarikUmum;
  if(appState.syncMode === 'supabase-empty') return;
  if(tagihanAnak.length > 0){
    appState.financeAmount = 'Rp ' + Number(totalTagihan).toLocaleString('id-ID');
    appState.financeDue = belumBayar.length ? (waliSppJatuhTempo(belumBayar[0]) || '-') : '-';
    appState.financeStatus = belumBayar.length ? 'belum' : 'lunas';
    // [LABEL TAGIHAN SPP] kartu menjumlah SEMUA tagihan belum lunas, bukan hanya bulan berjalan
    var _jmlBlm = belumBayar.length;
    appState.financeBulan = _jmlBlm;
    appState.financeNote = _jmlBlm > 1
      ? (_jmlBlm + ' bulan belum lunas')
      : (_jmlBlm === 1 ? ('Jatuh tempo ' + (appState.financeDue || '-')) : 'Semua lunas');
  }
  if(tabAnak.length > 0){
    appState.tabunganSaldo = 'Rp ' + Number(saldoTab).toLocaleString('id-ID');
    appState.tabunganUpdate = tabAnak.length ? (tabAnak[0].tanggal || tabAnak[0].tgl || '-') : '-';
  }
  if(tabUmumAnak.length > 0){
    appState.tabunganUmumSaldo = 'Rp ' + Number(saldoUmum).toLocaleString('id-ID');
    appState.tabunganUmumUpdate = tabUmumAnak.length ? (tabUmumAnak[0].tanggal || tabUmumAnak[0].tgl || '-') : '-';
  }
}


// [JADWAL ISTIRAHAT PISAH] Baris rehat pada daftar jam sekolah bukan jam pelajaran,
// jadi tidak boleh dipakai sebagai label jam sebuah mapel. Helper di bawah memberi
// jam sebenarnya untuk kartu mapel, dan menyediakan baris pemisah Istirahat sendiri.
var WALI_JAM_LABELS = ['07:00-07:35', '07:35-08:10', '08:10-08:45', '08:45-09:20', 'Istirahat', '09:35-10:10', '10:10-10:45', '10:45-11:20', '11:20-11:55'];
function waliSlotIstirahat(labels){
  var out = [];
  (labels || []).forEach(function(l, i){ if (/istirahat|rehat/i.test(String(l || ''))) out.push(i); });
  return out;
}
function waliJamIstirahat(labels, i){
  labels = labels || WALI_JAM_LABELS;
  var sebelum = '', sesudah = '';
  for (var a = i - 1; a >= 0; a--) {
    var la = String(labels[a] || '');
    if (la && !/istirahat|rehat/i.test(la)) { sebelum = la.split('-')[1] || ''; break; }
  }
  for (var b = i + 1; b < labels.length; b++) {
    var lb = String(labels[b] || '');
    if (lb && !/istirahat|rehat/i.test(lb)) { sesudah = lb.split('-')[0] || ''; break; }
  }
  return (sebelum && sesudah) ? (sebelum + '-' + sesudah) : (sebelum || sesudah || '');
}
function waliJamJadwal(r, ji, labels){
  labels = labels || WALI_JAM_LABELS;
  var l = String((r && (r.jam_label || r.jam)) || '').trim();
  if (!l && ji >= 0 && ji < labels.length) l = String(labels[ji] || '');
  if (/istirahat|rehat/i.test(l)) l = waliJamIstirahat(labels, ji);
  if (!l) l = isNaN(ji) ? '-' : ('Jam ' + (ji + 1));
  return l;
}
function waliBarisIstirahatHtml(jam){
  return '<p class="card-meta" style="margin:8px 2px;text-align:center;font-weight:800;color:#b45309;background:#fff7ed;border:1px dashed #fdba74;border-radius:12px;padding:7px 8px">\u2615 Istirahat'
    + (jam ? (' \u00b7 ' + jam) : '') + '</p>';
}
function waliBarisIstirahatTimeline(jam){
  return '<div class="lux-tl-item"><span class="lux-tl-dot gold"></span>'
    + '<div class="lux-tl-body"><span class="lux-tl-title">Istirahat</span><span class="lux-tl-meta">' + (jam || 'Waktu rehat') + '</span></div>'
    + '<span class="lux-tl-pill gold">Rehat</span></div>';
}
/* [ISTIRAHAT DARI JEDA WAKTU] Baris istirahat TIDAK ada di database; yang ada hanya
   jam pelajaran. Istirahat = jeda waktu antara jam selesai satu mapel dan jam mulai
   mapel berikutnya. Dulu posisinya dihitung dari indeks tetap JAM_LABELS sehingga
   sering salah tempat (mapel setelah istirahat malah tampil di atas garis istirahat).
   Sekarang istirahat disisipkan tepat di antara dua mapel yang punya jeda waktu. */
function _waliMenit(t){
  var m = String(t == null ? '' : t).trim().replace(/\./g, ':').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function _waliNormJam(t){
  var s = String(t == null ? '' : t).trim().replace(/\./g, ':');
  var m = s.match(/^(\d{1,2}):(\d{2})/);
  return m ? (m[1].padStart(2, '0') + ':' + m[2]) : s;
}
// Kembalikan label jam istirahat "HH:MM-HH:MM" bila ADA jeda antara mapel prev & cur,
// atau '' bila tidak ada jeda (jam nyambung) / data tidak lengkap.
function waliIstirahatAntar(prev, cur, labels){
  var pj = waliJamJadwal(prev, parseInt(prev.jam_index), labels);
  var cj = waliJamJadwal(cur, parseInt(cur.jam_index), labels);
  var pEnd = (String(pj).split('-')[1] || '').trim();
  var cStart = (String(cj).split('-')[0] || '').trim();
  var pe = _waliMenit(pEnd), cs = _waliMenit(cStart);
  if (pe == null || cs == null) return '';
  if (cs > pe) return _waliNormJam(pEnd) + '-' + _waliNormJam(cStart);
  return '';
}

function renderJadwalHariIniCard() {
  var kelasNow = String(childProfile.className || appState.childClass || '').replace(/^kelas\s+/i, '').trim();
  if (!appState.waliJadwalLoaded || appState.waliJadwalKelas !== kelasNow) {
    loadWaliJadwal().then(function(){ if (appState.activeTab === 'home') render(); });
    return '<div class="lux-section-head"><span>Jadwal hari ini</span></div>' +
      '<div class="lux-timeline"><div class="lux-tl-item"><span class="lux-tl-dot blue"></span>' +
      '<div class="lux-tl-body"><span class="lux-tl-title">Memuat jadwal\u2026</span><span class="lux-tl-meta">Kelas ' + (kelasNow || '-') + '</span></div></div></div>';
  }
  var rows = Array.isArray(appState.waliJadwal) ? appState.waliJadwal.slice() : [];
  var JAM_LABELS = ['07:00-07:35', '07:35-08:10', '08:10-08:45', '08:45-09:20', 'Istirahat', '09:35-10:10', '10:10-10:45', '10:45-11:20', '11:20-11:55'];
  var HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var jsDay = new Date().getDay();
  var todayHari = jsDay === 0 ? -1 : jsDay - 1;
  var todayLabel = todayHari >= 0 ? HARI[todayHari] : 'Minggu';
  var head = '<div class="lux-section-head"><span>Jadwal hari ini \u00b7 ' + todayLabel + '</span><span class="lux-link" data-module-route="module:jadwal-anak">Lihat semua</span></div>';
  if (todayHari < 0) {
    return head + '<div class="lux-timeline"><div class="lux-tl-item"><span class="lux-tl-dot gold"></span><div class="lux-tl-body"><span class="lux-tl-title">Hari ini libur</span><span class="lux-tl-meta">Tidak ada jadwal pelajaran</span></div></div></div>';
  }
  var list = rows.filter(function(r){ return parseInt(r.hari_index) === todayHari; }).sort(function(a, b){ return (parseInt(a.jam_index) || 0) - (parseInt(b.jam_index) || 0); });
  if (!list.length) {
    return head + '<div class="lux-timeline"><div class="lux-tl-item"><span class="lux-tl-dot blue"></span><div class="lux-tl-body"><span class="lux-tl-title">' + (rows.length ? 'Tidak ada jadwal hari ini' : 'Jadwal belum tersedia') + '</span><span class="lux-tl-meta">' + (rows.length ? ('Kelas ' + (kelasNow || '-')) : 'Sekolah belum mengisi jadwal kelas ini') + '</span></div></div></div>';
  }
  // [JADWAL ISTIRAHAT PISAH] Istirahat = jeda waktu antar mapel, disisipkan di antara
  // dua kartu yang punya selisih jam (bukan dari indeks tetap yang bisa salah posisi).
  var _prevRow = null;
  var items = list.map(function(r){
    var ji = parseInt(r.jam_index);
    var pemisah = '';
    if (_prevRow) {
      var _jamIst = waliIstirahatAntar(_prevRow, r, JAM_LABELS);
      if (_jamIst) pemisah = waliBarisIstirahatTimeline(_jamIst);
    }
    _prevRow = r;
    var jam = waliJamJadwal(r, ji, JAM_LABELS);
    var mapel = r.mapel || r.mata_pelajaran || '-';
    var jamStart = (String(jam).split('-')[0] || jam);
    return pemisah + '<div class="lux-tl-item"><span class="lux-tl-dot blue"></span>' +
      '<div class="lux-tl-body"><span class="lux-tl-title">' + mapel + '</span><span class="lux-tl-meta">' + jam + (r.guru ? (' &middot; ' + r.guru) : '') + '</span></div>' +
      '<span class="lux-tl-pill blue">' + jamStart + '</span></div>';
  }).join('');
  return head + '<div class="lux-timeline">' + items + '</div>';
}

function renderHome() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : 'Selamat Sore';
  const att = appState.todayAttendance;
  const finStt = appState.financeStatus;
  const qa = [
    { r:'module:absensi-anak', t:'Absensi', g:'g-aqua', ic:'<path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/><path d="M11 15l1 1l2 -2"/>' },
    { r:'module:nilai-anak', t:'Nilai', g:'g-violet', dot: (appState.unreadModules && appState.unreadModules.nilai>0), ic:'<path d="M4 19l16 0"/><path d="M4 15l4 -6l4 2l4 -5l4 4"/>' },
    { r:'module:catatan-anak', t:'Catatan', g:'g-pink', dot: (appState.unreadNotes>0), ic:'<path d="M8 9h8"/><path d="M8 13h6"/><path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3z"/>' },
    { r:'module:surat-wali', t:'Kirim Surat', g:'g-amber', ic:'<path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/><path d="M3 7l9 6l9 -6"/>' },
    { r:'mutabaah', t:'Mutabaah', g:'g-emerald', dot: (appState.unreadModules && appState.unreadModules.mutabaah>0), ic:'<path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/>' },
    { r:'module:perkembangan-anak', t:'Pelanggaran', g:'g-pink', dot: (appState.unreadModules && appState.unreadModules.perkembangan>0), ic:'<path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/>' },
    /* Slot ini dulu Keuangan. Keuangan tetap bisa dibuka lewat tab bawah dan
       kartu saldo di beranda, jadi slotnya dipakai Calistung agar tidak dobel. */
    { r:'module:calistung-anak', t:'Calistung', g:'g-sun', dot: (appState.unreadModules && appState.unreadModules.calistung>0), ic:'<path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6l0 13"/><path d="M12 6l0 13"/><path d="M21 6l0 13"/>' },
    { r:'__more__', t:'Lainnya', g:'g-slate', ic:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>' }
  ];
  const qaHtml = qa.map(function(q){
    const route = (q.r === '__more__' || q.a) ? '' : ` data-module-route="${q.r}"`;
    const more = q.r === '__more__' ? ' data-action="goMore"' : (q.a ? ` data-action="${q.a}"` : '');
    // [BADGE MODUL] Titik merah bila ada item baru; badge angka lama hanya utk Catatan.
    const badge = q.badge ? `<span class="lux-q-badge">${q.badge}</span>` : (q.dot ? `<span class="lux-q-dot"></span>` : '');
    return `<button type="button" class="lux-q"${route}${more}>
      <span class="lux-q-ic ${q.g}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${q.ic}</svg>${badge}</span>
      <span class="lux-q-t">${q.t}</span>
    </button>`;
  }).join('');

  return `
    <style id="wali-hdr-fix">
      /* Background disamain dengan warna halaman agar status bar nyambung natural */
      html, body { background: #f9fafb !important; }
      /* Desktop mockup: pakai offset 26px untuk fake statusbar */
      .wali-shell .lux-wrap > .lux-hero{
        margin-top: calc(-1 * (env(safe-area-inset-top,0px) + 26px)) !important;
        padding-top: max(calc(env(safe-area-inset-top,0px) + 74px), 92px) !important;
        border-radius: 0 0 28px 28px !important;
      }
      .wali-shell .lux-child{
        margin:14px 0 22px !important; padding:16px !important;
        background:#fff !important; border:1px solid rgba(26,31,54,.07) !important;
        border-radius:20px !important; box-shadow:0 14px 30px -12px rgba(26,31,54,0.28) !important;
        position:relative !important; z-index:2 !important;
        display:flex !important; align-items:center !important; gap:14px !important;
      }
      /* Mobile/HP nyata: fake statusbar disembunyikan, hapus offset 26px */
      @media (max-width: 479px) {
        /* ── Hero posisi simetris tanpa kepotong ── */
        .wali-shell .lux-wrap > .lux-hero{
          margin-top: calc(-1 * (env(safe-area-inset-top,0px) + 30px)) !important;
          padding-top: max(calc(env(safe-area-inset-top,0px) + 82px), 94px) !important;
          padding-bottom: 24px !important;
        }
        /* ── Child card profesional ── */
        .wali-shell .lux-child{
          margin: 16px 16px 20px !important;
          padding: 16px !important;
          border-radius: 20px !important;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1) !important;
          background: #fff !important;
          align-items: center !important;
          gap: 14px !important;
          min-height: 85px !important;
        }
        /* Avatar bulat gradient */
        .lux-child-orb {
          width:52px !important; height:52px !important; border-radius:50% !important;
          background: linear-gradient(135deg,#2563eb 0%,#7c3aed 100%) !important;
          color:#fff !important; font-weight:700 !important; font-size:18px !important;
          display:flex !important; align-items:center !important; justify-content:center !important;
          flex-shrink:0 !important; margin-top:0 !important;
          box-shadow: 0 4px 12px rgba(37,99,235,0.25) !important;
        }
        /* Body kanan orb */
        .lux-child-body { flex:1 !important; min-width:0 !important; display:flex !important; flex-direction:column !important; justify-content:center !important; }
        /* Baris atas: nama + badge hadir */
        .lux-child-toprow {
          display:flex !important; align-items:flex-start !important;
          justify-content:space-between !important; gap:8px !important;
        }
        .lux-child-name {
          font-weight:700 !important; font-size:16px !important;
          color:#0f172a !important; line-height:1.3 !important;
          display:-webkit-box !important; -webkit-line-clamp:2 !important; -webkit-box-orient:vertical !important; overflow:hidden !important;
          margin-bottom:2px !important;
        }
        /* Kelas */
        .lux-child-kelas {
          display:block !important; font-size:13px !important;
          color:#64748b !important; font-weight:500 !important;
        }
        /* Pills wali murid & wali kelas */
        .lux-child-pills {
          display:flex !important; flex-wrap:wrap !important;
          gap:6px !important; margin-top:8px !important;
        }
        .lux-cpill {
          display:inline-flex !important; align-items:center !important; gap:4px !important;
          padding:4px 8px !important; border-radius:6px !important;
          font-size:11px !important; font-weight:600 !important; line-height:1 !important;
          white-space:nowrap !important; max-width:140px !important;
          overflow:hidden !important; text-overflow:ellipsis !important;
        }
        .lux-cpill--wali {
          background:#f1f5f9 !important; color:#475569 !important;
          border:1px solid #e2e8f0 !important;
        }
        .lux-cpill--guru {
          background:#f0fdf4 !important; color:#166534 !important;
          border:1px solid #bbf7d0 !important;
        }
      }
    </style>
    <div class="lux-wrap">
      <!-- HERO (disamakan dengan role guru) -->
      <div class="guru-dash-hero">
        <div class="gdh-top">
          <span class="gdh-greeting">${greeting} ✨</span>
          <div class="gdh-top-right">
            <span class="gdh-date">${now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'})}</span>
            <button type="button" class="gdh-bell" data-action="toggleAnnouncements" aria-label="Pengumuman">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              ${appState.unreadAnnouncements ? '<span class="tib-dot"></span>' : ''}
            </button>
          </div>
        </div>
        <div class="gdh-identity">
          ${studentAvatarHtml('gdh-photo')}
          <h2 class="gdh-name">${childProfile.fullName || childProfile.nickName || 'Nama Siswa'}</h2>
        </div>
        <div class="gdh-chip-row">
          ${childProfile.className && childProfile.className !== '-' ? `<span>${String(childProfile.className).indexOf('Kelas')>=0?childProfile.className:('Kelas '+childProfile.className)}</span>` : ''}
          ${childProfile.homeroom && childProfile.homeroom !== '-' ? `<span>Wali kelas: ${childProfile.homeroom}</span>` : ''}
          <span class="${getAttendanceTone(att)==='green'?'chip-active':'chip-rest'}">${getAttendanceStatusLabel(att)}</span>
        </div>
      </div>

      
<!-- QUICK ACTIONS -->
      <div class="lux-quick">${qaHtml}</div>

      <!-- FINANCE (layout pertama + ikon) -->
      <style>
        .lfin-ic{width:40px;height:40px;border-radius:13px;display:flex;align-items:center;justify-content:center;margin-bottom:2px;}
        .lfin-ic svg{width:21px;height:21px;stroke-width:1.85;}
        .lfin-ic.orange{background:linear-gradient(135deg,#fff1e6,#ffe3cf);color:#ea580c;}
        .lfin-ic.green{background:linear-gradient(135deg,#e7fbf1,#d3f5e2);color:#059669;}
        .lfin-ic.indigo{background:linear-gradient(135deg,#eef0ff,#e1e6ff);color:#4f46e5;}
      </style>
      <div class="lux-fin-row">
        <button type="button" class="lux-fin" data-module-route="module:keuangan-spp">
          <span class="lfin-ic orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg></span>
          <span class="lux-fin-lbl">Tagihan SPP</span>
          <span class="lux-fin-val">${appState.financeAmount || '-'}</span>
          <span class="lux-chip ${getFinanceTone(finStt)}">${getFinanceStatusLabel(finStt)}</span>
        </button>
        <button type="button" class="lux-fin" data-module-route="module:keuangan-tabungan">
          <span class="lfin-ic green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15 11l0 .01"/><path d="M5.173 8.378a3 3 0 1 1 4.656 -1.377"/><path d="M16 4v3.803a6.019 6.019 0 0 1 2.658 3.197h1.341a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-1.342c-.336 .95 -.907 1.8 -1.658 2.473v2.027a1.5 1.5 0 0 1 -3 0v-.583a6.04 6.04 0 0 1 -1 .083h-4a6.04 6.04 0 0 1 -1 -.083v.583a1.5 1.5 0 0 1 -3 0v-2.027a6 6 0 0 1 3.5 -10.973h2.5l4.5 -3z"/></svg></span>
          <span class="lux-fin-lbl">Tabungan Anak</span>
          <span class="lux-fin-val grad">${appState.tabunganSaldo}</span>
          <span class="lux-fin-sub">Update ${appState.tabunganUpdate}</span>
        </button>
      </div>
      <div class="lux-fin-row" style="grid-template-columns:1fr; margin-top:-18px;">
        <button type="button" class="lux-fin" data-module-route="module:keuangan-umum">
          <span class="lfin-ic indigo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8V5a1 1 0 0 0 -1 -1H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1H5a2 2 0 0 1 -2 -2V6"/><path d="M16 12l0 .01"/></svg></span>
          <span class="lux-fin-lbl">Tabungan Umum</span>
          <span class="lux-fin-val grad">${appState.tabunganUmumSaldo}</span>
          <span class="lux-fin-sub">Update ${appState.tabunganUmumUpdate}</span>
        </button>
      </div>

      <!-- JADWAL HARI INI -->
      <div id="waliJadwalHariIni">${renderJadwalHariIniCard()}</div>

      <!-- RECAP -->
      <div class="lux-section-head"><span>Rekap pekan ini</span></div>
      <div class="lux-recap">
        <button type="button" class="lux-stat" data-module-route="module:absensi-anak">
          <span class="lux-stat-val grad-aqua">${appState.homeAttendanceRate}%</span>
          <span class="lux-stat-lbl">Kehadiran</span>
        </button>
        <button type="button" class="lux-stat" data-module-route="module:nilai-anak">
          <span class="lux-stat-val grad-violet">${appState.homeScoreAverage}</span>
          <span class="lux-stat-lbl">Rata nilai</span>
        </button>
        <button type="button" class="lux-stat" data-module-route="mutabaah">
          <span class="lux-stat-val grad-emerald">${appState.homeMutabaahProgress}%</span>
          <span class="lux-stat-lbl">Mutabaah</span>
        </button>
      </div>

      ${(function(){
        var sm = appState.supabaseModules || {};
        var updates = [];
        function pushFrom(arr, area, tone){
          (arr || []).slice(0, 3).forEach(function(r){
            var dt = r.tanggal || r.tgl || r.created_at || r.updated_at || r.waktu_submit || r.waktu_submit_wali || '';
            var tt = r.surat || r.judul || r.title || r.lomba || r.kegiatan || r.perihal || r.tilawah_rumah || r.materi || '';
            if (!tt && area === 'Karakter') {
              var ks = [r.disiplin,r.sopan,r.jujur,r.kerja_keras,r.tanggung_jawab].filter(Boolean);
              tt = r.semester ? r.semester : '';
              if (ks.length) tt += (tt ? ' - ' : '') + ks.join(', ');
            }
            if (!tt && area === 'Mutabaah Rumah') {
              var shalatCount = r.shalat_count;
              if (shalatCount === undefined || shalatCount === null || shalatCount === '') {
                shalatCount = ['subuh','dzuhur','ashar','maghrib','isya'].reduce(function(total, key){
                  var value = r['shalat_' + key];
                  return total + ((value === true || value === 1 || value === '1' || /^ya|true$/i.test(String(value || ''))) ? 1 : 0);
                }, 0);
              }
              // Mutabaah Rumah tidak memiliki field sunnah. Jangan tampilkan
              // angka 0 dari skema ibadah lama seolah-olah itu nilai wali.
              tt = 'Shalat ' + Number(shalatCount || 0) + '/5';
            }
            if (!tt) tt = area + ' anak';
            var mt = r.nilai ? ('Nilai ' + r.nilai) : (r.juz ? ('Juz ' + r.juz) : (r.kategori || r.status_review || r.keterangan_guru || r.kendala_wali || '-'));
            updates.push({
              time: String(dt).slice(0,10) || area, area: area,
              title: tt,
              meta: mt,
              status: r.nilai || r.status || r.status_review || 'Update', tone: tone
            });
          });
        }
        pushFrom(sm.mutabaahRumah, 'Mutabaah Rumah', 'green');
        pushFrom(sm.karakter, 'Karakter', 'blue');
        pushFrom(sm.prestasi, 'Prestasi', 'green');
        pushFrom(sm.pelanggaran, 'Pelanggaran', 'red');
        pushFrom(sm.nilai, 'Nilai', 'blue');
        updates.sort(function(a,b){ return String(b.time).localeCompare(String(a.time)); });
        updates = updates.slice(0, 5);
        if (!updates.length) return '';
        return '<div class="lux-section-head"><span>Update perkembangan</span><span class="lux-link" data-module-route="module:perkembangan-anak">Lihat semua</span></div>' +
          '<div class="lux-timeline">' +
          updates.map(function(u){
            return `<div class="lux-tl-item"><span class="lux-tl-dot ${u.tone}"></span>
              <div class="lux-tl-body"><span class="lux-tl-title">${u.title}</span><span class="lux-tl-meta">${u.area} &middot; ${u.time}</span></div>
              <span class="lux-tl-pill ${u.tone}">${u.status}</span></div>`;
          }).join('') + '</div>';
      })()}

      <div style="height:140px"></div>
    </div>
  `;
}


const CHILD_ICONS = {
  name:      `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="3"/><path d="M3 16c0-3 2.7-5 6-5s6 2 6 5"/></svg>`,
  father:    `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="3"/><path d="M3 16c0-3 2.7-5 6-5s6 2 6 5"/><path d="M9 10v3M7.5 11.5h3"/></svg>`,
  mother:    `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="3"/><path d="M3 16c0-3 2.7-5 6-5s6 2 6 5"/><path d="M7 12c1 1.5 4 1.5 4 0"/></svg>`,
  phone:     `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="1" width="8" height="16" rx="2"/><circle cx="9" cy="14" r="0.8" fill="currentColor" stroke="none"/></svg>`,
  address:   `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1C6.2 1 4 3.2 4 6c0 4 5 11 5 11s5-7 5-11c0-2.8-2.2-5-5-5z"/><circle cx="9" cy="6" r="1.5"/></svg>`,
  emergency: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="14" height="14" rx="3"/><path d="M9 6v3M9 11v.5"/></svg>`
};

function childInfoRow(svgIcon, label, value) {
  return `
    <div class="child-info-row">
      <span class="child-info-icon" aria-hidden="true">${svgIcon}</span>
      <div class="child-info-text">
        <span class="child-info-label">${label}</span>
        <span class="child-info-value">${value}</span>
      </div>
    </div>
  `;
}

function renderChild() {
  const att = appState.todayAttendance;
  const attTone = getAttendanceTone(att);
  const attLabel = getAttendanceStatusLabel(att);
  return `
    <!-- Status anak hari ini - paling besar -->
    <div class="wali-child-status-hero">
      <span class="wcsh-orb">${initials(childProfile.fullName)}</span>
      <div class="wcsh-main">
        <h2>${childProfile.fullName}</h2>
        <p>${childProfile.className} &middot; ${childProfile.homeroom}</p>
        <span class="wcsh-att-pill ${attTone}">${attLabel}</span>
      </div>
    </div>

    <!-- Rekap cepat -->
    <section class="section section--tight">
      ${sectionHead('Rekap hari ini', '')}
      <div class="wali-recap-grid">
        <article class="wrc-card" data-module-route="module:absensi-anak">
          <span class="wrc-val ${attTone}">${att === 'hadir' ? appState.todayCheckIn : '-'}</span>
          <span class="wrc-lbl">Jam masuk</span>
          <span class="wrc-sub">${att === 'hadir' ? 'Tepat waktu' : attLabel}</span>
        </article>
        <article class="wrc-card" data-module-route="module:nilai-anak">
          <span class="wrc-val green">${appState.homeScoreAverage}</span>
          <span class="wrc-lbl">Nilai rata-rata</span>
          <span class="wrc-sub">Semua mapel</span>
        </article>
        <article class="wrc-card" data-module-route="mutabaah">
          <span class="wrc-val gold">${appState.homeMutabaahProgress}%</span>
          <span class="wrc-lbl">Mutabaah</span>
          <span class="wrc-sub">Pekan ini</span>
        </article>
      </div>
    </section>

    <!-- Data profil anak (tetap ada, di bawah) -->
    <section class="section section--tight">
      ${sectionHead('Data profil', '')}
      <article class="wali-info-list">
        ${childInfoRow(CHILD_ICONS.name,      'Nama panggilan', childProfile.nickName)}
        ${childInfoRow(CHILD_ICONS.father,    'Wali',           childProfile.wali)}
        ${childInfoRow(CHILD_ICONS.phone,     'No. HP',         childProfile.phone)}
        ${childInfoRow(CHILD_ICONS.address,   'Tempat lahir',   childProfile.address)}
      </article>
    </section>
  `;
}

function renderAcademic() {
  const att = appState.todayAttendance;
  return `
    <!-- Status hari ini strip -->
    <div class="wali-acad-banner ${getAttendanceTone(att)}">
      <span class="wab-icon">${att==='hadir'?'✅':att==='izin'?'📔':att==='sakit'?'🥵':'⚠️'}</span>
      <div>
        <strong>${childProfile.nickName} - ${getAttendanceStatusLabel(att)}</strong>
        <p>${att==='hadir' ? (appState.todayCheckInIsDefault ? `Masuk ${appState.todayCheckIn} · tidak ada catatan gerbang` : `Masuk ${appState.todayCheckIn}`) : 'Konfirmasi kehadiran dari sekolah.'}</p>
      </div>
    </div>

    <section class="section section--tight">
      <div class="wali-recap-grid">
        <article class="wrc-card" data-module-route="module:absensi-anak">
          <span class="wrc-val indigo">${appState.homeAttendanceRate}%</span>
          <span class="wrc-lbl">Kehadiran</span>
          <span class="wrc-sub">Bulan ini</span>
        </article>
        <article class="wrc-card" data-module-route="module:nilai-anak">
          <span class="wrc-val green">${appState.homeScoreAverage}</span>
          <span class="wrc-lbl">Rata-rata nilai</span>
          <span class="wrc-sub">Semua mapel</span>
        </article>
        <article class="wrc-card" data-module-route="module:catatan-anak">
          <span class="wrc-val orange">${appState.catatanBaru || 0}</span>
          <span class="wrc-lbl">Catatan baru</span>
          <span class="wrc-sub">Dari sekolah</span>
        </article>
      </div>
    </section>

    <section class="section section--tight">
      ${sectionHead('Pilih modul', '')}
      <div class="guru-menu-grid">
        ${academicModules.map(roleModuleCard).join('')}
      </div>
    </section>
  `;
}

function renderMutabaah() {
  var sm = appState.supabaseModules || {};
  /* Tab Mutabaah HANYA menampilkan mutabaah_rumah.
     Catatan: komentar lama menyebut "mutabaah_rumah & mutabaah_quran", padahal
     ada `quranRows = []` (array kosong literal) di sini sehingga mutabaah_quran tidak
     pernah tampil. Variabel itu beserta `quranWeek` sudah dihapus. Tabel
     `mutabaah_quran` juga TIDAK ADA di database (REST balas 404 PGRST205) dan sudah
     tidak ditarik lagi saat hydrate.
     hafalan & ibadah adalah input admin pada tabel terpisah, jadi tidak diikutkan di sini. */
  var rumahRows = Array.isArray(sm.mutabaahRumah)?sm.mutabaahRumah.slice():[];
  var _wkAgo = Date.now()-7*24*3600*1000;
  var _inWeek = function(r){ var d=Date.parse(r.tanggal||r.created_at||''); return !isNaN(d) && d>=_wkAgo; };
  var rumahWeek = rumahRows.filter(_inWeek).length;
  var updates = rumahRows.slice().sort(function(a,b){ return String(b.tanggal||b.created_at||'').localeCompare(String(a.tanggal||a.created_at||'')); }).slice(0,8).map(function(r){
    var title = r.tilawah_rumah || r.murojaah_rumah || r.surat || r.shalat || r.kegiatan || r.keterangan || r.catatan || r.catatan_wali || 'Mutabaah';
    var st = r.status_setoran || r.status_review || r.status || '-';
    return { time: (r.tanggal||r.created_at||'-'), title: String(title), meta: [r.kelas, r.juz?('Juz '+r.juz):''].filter(Boolean).join(' \u00b7 ')||'-', status: String(st), tone: /baik|lunas|tuntas|tercapai|selesai|sudah/i.test(String(st))?'green':'blue' };
  });
  return `
    <section class="section">
      <div class="wali-stat-row">
        <div class="wali-stat-item">
          <span class="wali-stat-val">${appState.homeMutabaahProgress}%</span>
          <span class="wali-stat-lbl">Progress</span>
        </div>
        <div class="wali-stat-div"></div>
        <div class="wali-stat-item">
          <span class="wali-stat-val">${rumahWeek}</span>
          <span class="wali-stat-lbl">Rumah</span>
        </div>
      </div>
    </section>
    <section class="section">
      ${sectionHead('Modul mutabaah', '')}
      <div class="guru-menu-grid">
        ${mutabaahModules.map(roleModuleCard).join('')}
      </div>
    </section>
    <section class="section">
      ${sectionHead('Update pekan ini', '')}
      <div class="timeline">
        ${updates.length
          ? updates.map(scheduleCard).join('')
          : scheduleCard({ time: 'Info', title: 'Belum ada data', meta: 'Data mutabaah akan otomatis tampil dari Supabase.', status: 'Kosong', tone: 'blue' })}
      </div>
    </section>
  `;
}

function renderMore() {
  const finStt = appState.financeStatus;
  return `
    <!-- Pembayaran -->
    <section class="section section--tight">
      ${sectionHead('Pembayaran', '')}
      <div class="wali-finance-row">
        <button type="button" class="wfi-card ${getFinanceTone(finStt)} wali-fin-action" data-module-route="module:keuangan-spp">
          <span class="wfi-label">Tagihan SPP</span>
          <strong class="wfi-amount">${appState.financeAmount}</strong>
          <div class="wfi-status">
            <span class="wfi-badge ${getFinanceTone(finStt)}">${getFinanceStatusLabel(finStt)}</span>
            <span class="wfi-due">${appState.financeNote || ('Jatuh tempo ' + appState.financeDue)}</span>
          </div>
        </button>
        <button type="button" class="wfi-card blue wali-fin-action" data-module-route="module:infaq-subuh">
          <span class="wfi-label">Infaq Subuh</span>
          <strong class="wfi-amount">Sukarela</strong>
          <div class="wfi-status">
            <span class="wfi-badge blue">Segera hadir</span>
            <span class="wfi-due">Aktivasi DOKU berlangsung</span>
          </div>
        </button>
      </div>
    </section>

    <!-- Simpanan -->
    <section class="section section--tight">
      ${sectionHead('Simpanan', '')}
      <div class="wali-finance-row">
        <button type="button" class="wfi-card green wali-fin-action" data-module-route="module:keuangan-tabungan">
          <span class="wfi-label">Tabungan Anak</span>
          <strong class="wfi-amount">${appState.tabunganSaldo}</strong>
          <div class="wfi-status">
            <span class="wfi-badge green">Aman ✅</span>
            <span class="wfi-due">Update ${appState.tabunganUpdate}</span>
          </div>
        </button>
        <button type="button" class="wfi-card green wali-fin-action" data-module-route="module:keuangan-umum">
          <span class="wfi-label">Tabungan Umum</span>
          <strong class="wfi-amount">${appState.tabunganUmumSaldo}</strong>
          <div class="wfi-status">
            <span class="wfi-badge green">Aman ✅</span>
            <span class="wfi-due">Update ${appState.tabunganUmumUpdate}</span>
          </div>
        </button>
      </div>
    </section>

    <section class="section section--tight">
      ${sectionHead('Layanan lainnya', '')}
      <div class="guru-menu-grid">
        ${moreModules.filter(function(item){ return item.id !== 'keuangan'; }).map(roleModuleCard).join('')}
      </div>
    </section>
  `;
}

function renderProfile() {
  return `
    <section class="section">
      <article class="wali-child-hero">
        <span class="wali-child-avatar" aria-hidden="true">WM</span>
        <div class="wali-child-info">
          <h3 class="wali-child-name">Wali ${childProfile.nickName}</h3>
          <p class="wali-child-sub">Role WaliMurid &middot; ${childProfile.className}</p>
          <div class="wali-child-chips">
            <span>1 anak terhubung</span>
            <span>Notifikasi aktif</span>
          </div>
        </div>
      </article>
    </section>
    <section class="section">
      ${sectionHead('Data akun', '')}
      <article class="wali-info-list">
        ${childInfoRow(CHILD_ICONS.name,     'Anak aktif',     childProfile.fullName)}
        ${childInfoRow(CHILD_ICONS.phone,    'Kontak utama',   childProfile.phone)}
        ${childInfoRow(CHILD_ICONS.address,  'Tempat lahir',   childProfile.address)}
      </article>
    </section>
    <section class="section">
      ${sectionHead('Preferensi', '')}
      <div class="timeline">
        ${settingRow('Bunyi notifikasi', 'Suara pendek saat pengumuman/pesan penting masuk', appState.notificationSound, 'notificationSound')}
        ${settingRow('Getar notifikasi', 'Getar ringan untuk aksi dan notifikasi penting', appState.notificationHaptic, 'notificationHaptic')}
        ${settingRow('Pengumuman prioritas', 'Info penting muncul di atas', appState.announcementPriority, 'announcementPriority')}
        ${settingRow('Notifikasi catatan',   'Alert jika ada catatan baru', appState.noteAlerts, 'noteAlerts')}
        ${settingRow('Mode ringkas',         'Tampilan baca cepat',         appState.compactMode, 'compactMode')}
      </div>
    </section>
    <section class="section">
      <button type="button" class="ghost-btn profile-logout" data-action="openRoleChooser">Keluar / Ganti Role</button>
    </section>
  `;
}

function waliModuleDataKey(moduleId) {
  const map = {
    'absensi-anak': 'absensi',
    'nilai-anak': 'nilai',
    'catatan-anak': 'catatan',
    'perkembangan-anak': 'catatan',
    'mutabaah-rumah': 'mutabaahRumah',
    'keuangan': 'keuangan',
    'pengumuman-wali': 'pengumuman',
    'surat-wali': 'surat'
  };
  return map[moduleId] || '';
}

function renderSupabaseWaliDataModule(detail, rows) {
  const helper = window.ZymataMobileSupabase;
  function _rowDate(r){ return String((r && (r.tanggal||r.tgl||r.created_at||r.waktu||r.date||r.bulan))||'').slice(0,10); }
  const list = (Array.isArray(rows) ? rows.slice() : []).sort(function(a,b){ return _rowDate(b).localeCompare(_rowDate(a)); });
  const moduleId = appState.activeTab.replace('module:', '');
  const crudKey = 'wali:' + moduleId;
  // [RIWAYAT BULAN] Jalur data Supabase wali: saring bulan dulu, baru tanggal.
  var _dtSet = {}, _dtList = [];
  list.forEach(function(r){ var d = _rowDate(r); if (d && !_dtSet[d]) { _dtSet[d] = 1; _dtList.push(d); } });
  _dtList.sort().reverse();
  var _uiD = _dtList.length ? waliRiwayatFilterBulanUI((detail && detail.title) || moduleId, _dtList) : { html:'', bulan:'', tglBulan:[], jmlBulan:0 };
  var _dtBulan = {};
  (_uiD.tglBulan || []).forEach(function(d){ _dtBulan[d] = 1; });
  var _pilihD = _dtList.length ? list.filter(function(r){ return !!_dtBulan[_rowDate(r)]; }) : list;
  return `
    ${moduleIntro(detail, moduleParentTab(moduleId))}
    <section class="section">
      <article class="db-ready-card">
        <span class="status-pill ${list.length ? 'green' : 'blue'}">${list.length ? 'Supabase' : 'Belum ada data'}</span>
        <h3 class="card-title">${list.length ? (list.length + ' data terbaca') : 'Data real belum tersedia'}</h3>
        <p class="card-meta">${list.length ? 'Data ini dibaca langsung dari Supabase sesuai akun wali.' : 'Konten modul ini akan tampil setelah tabel Supabase berisi data anak terkait.'}</p>
      </article>
    </section>
    <section class="section">
      ${_uiD.html}
      <div class="timeline">
        ${_pilihD.length
          ? _pilihD.slice(0, 60).map(row => {
              const item = helper && helper.normalizeItem ? helper.normalizeItem(row, detail.title) : { time:'Data', title:detail.title, meta:'Supabase', status:'Aktif', tone:'blue' };
              const actions = row.__mobileCrud && row.id ? `<div class="field-chip-row"><button type="button" class="field-chip" data-mobile-crud-update="${row.id}" data-mobile-crud-key="${crudKey}">Tandai selesai</button><button type="button" class="field-chip" data-mobile-crud-delete="${row.id}" data-mobile-crud-key="${crudKey}">Hapus</button></div>` : '';
              return scheduleCard(item) + actions;
            }).join('')
          : scheduleCard({ time: 'Info', title: (_dtList.length ? 'Tidak ada data pada bulan ini' : 'Belum ada data'), meta: (_dtList.length ? 'Pilih bulan lain di atas.' : 'Data akan otomatis tampil dari Supabase.'), status: 'Kosong', tone: 'blue' })}
      </div>
    </section>
  `;
}

function renderSupabaseEmptyWaliModule(detail) {
  return `
    ${moduleIntro(detail, moduleParentTab(appState.activeTab.replace('module:', '')))}
    <section class="section">
      <article class="db-ready-card">
        <span class="status-pill blue">Belum ada data</span>
        <h3 class="card-title">Data real belum terhubung</h3>
        <p class="card-meta">Konten modul ini akan tampil dari Supabase setelah akun wali tersambung ke data siswa.</p>
      </article>
    </section>
  `;
}

function waliNilaiEsc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
  });
}

function waliNilaiNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  var number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function waliNilaiRow(row) {
  row = row || {};
  var tugas = waliNilaiNumber(row.nilai_tugas);
  var ujian = waliNilaiNumber(row.nilai_ujian);
  var candidates = [row.nilai_akhir, row.nilai, row.nilai_rapor, row.nilai_angka, row.rata_rata, row.skor];
  var score = null;
  for (var i = 0; i < candidates.length; i++) {
    score = waliNilaiNumber(candidates[i]);
    if (score !== null) break;
  }
  if (score === null && tugas !== null && ujian !== null) score = (tugas + ujian) / 2;
  else if (score === null) score = tugas !== null ? tugas : ujian;
  var subject = String(row.mapel || row.mata_pelajaran || row.nama_mapel || 'Mata pelajaran').trim();
  var type = String(row.jenis || row.judul || row.kategori || 'Penilaian').replace(/[-_]+/g, ' ').trim();
  type = type.replace(/\b\w/g, function(char){ return char.toUpperCase(); });
  return {
    id: row.id || row.uuid || row.key || '',
    subject: subject,
    semester: String(row.semester || 'Tanpa semester').trim(),
    type: type,
    score: score,
    tugas: tugas,
    ujian: ujian,
    kkm: waliNilaiNumber(row.kkm),
    date: String(row.tanggal || row.tgl || row.created_at || '').slice(0, 10),
    note: String(row.catatan || row.keterangan || '').trim()
  };
}

function waliNilaiFormat(score) {
  if (score === null || !Number.isFinite(score)) return '-';
  return Number.isInteger(score) ? String(score) : score.toFixed(1).replace('.', ',');
}

function renderNilaiAnak(detail, sourceRows) {
  var rows = (Array.isArray(sourceRows) ? sourceRows : []).map(waliNilaiRow).filter(function(row){
    return row.score !== null;
  }).sort(function(a, b){ return b.date.localeCompare(a.date); });
  var semesters = [];
  var subjects = [];
  rows.forEach(function(row){
    if (semesters.indexOf(row.semester) === -1) semesters.push(row.semester);
    if (subjects.indexOf(row.subject) === -1) subjects.push(row.subject);
  });
  subjects.sort(function(a, b){ return a.localeCompare(b, 'id'); });

  var selectedSemester = appState.waliNilaiSemester || (rows[0] && rows[0].semester) || '__all';
  if (selectedSemester !== '__all' && semesters.indexOf(selectedSemester) === -1) selectedSemester = '__all';
  var semesterRows = selectedSemester === '__all' ? rows : rows.filter(function(row){ return row.semester === selectedSemester; });
  var semesterSubjects = [];
  semesterRows.forEach(function(row){ if (semesterSubjects.indexOf(row.subject) === -1) semesterSubjects.push(row.subject); });
  semesterSubjects.sort(function(a, b){ return a.localeCompare(b, 'id'); });
  var selectedSubject = appState.waliNilaiMapel || '__all';
  if (selectedSubject !== '__all' && semesterSubjects.indexOf(selectedSubject) === -1) selectedSubject = '__all';
  var visibleRows = selectedSubject === '__all' ? semesterRows : semesterRows.filter(function(row){ return row.subject === selectedSubject; });

  var total = 0;
  var highest = null;
  var needsAttention = 0;
  visibleRows.forEach(function(row){
    total += row.score;
    if (!highest || row.score > highest.score) highest = row;
    if (row.score < (row.kkm !== null ? row.kkm : 70)) needsAttention++;
  });
  var average = visibleRows.length ? total / visibleRows.length : null;
  var averageTone = average === null ? 'neutral' : (average >= 85 ? 'strong' : (average >= 70 ? 'steady' : 'watch'));
  var summary = visibleRows.length
    ? visibleRows.length + ' penilaian' + (selectedSemester !== '__all' ? ' pada semester ' + waliNilaiEsc(selectedSemester) : '')
    : 'Belum ada penilaian pada filter ini';

  var semesterOptions = '<option value="__all"' + (selectedSemester === '__all' ? ' selected' : '') + '>Semua semester</option>' +
    semesters.map(function(value){ return '<option value="' + waliNilaiEsc(value) + '"' + (value === selectedSemester ? ' selected' : '') + '>' + waliNilaiEsc(value) + '</option>'; }).join('');
  var subjectOptions = '<option value="__all"' + (selectedSubject === '__all' ? ' selected' : '') + '>Semua pelajaran</option>' +
    semesterSubjects.map(function(value){ return '<option value="' + waliNilaiEsc(value) + '"' + (value === selectedSubject ? ' selected' : '') + '>' + waliNilaiEsc(value) + '</option>'; }).join('');

  var grouped = {};
  visibleRows.forEach(function(row){
    if (!grouped[row.subject]) grouped[row.subject] = [];
    grouped[row.subject].push(row);
  });
  var groupNames = Object.keys(grouped).sort(function(a, b){ return a.localeCompare(b, 'id'); });
  var listHtml = groupNames.map(function(subject, groupIndex){
    var subjectRows = grouped[subject];
    var subjectAverage = subjectRows.reduce(function(sum, row){ return sum + row.score; }, 0) / subjectRows.length;
    return '<section class="wali-nilai-subject">' +
      '<div class="wali-nilai-subject-head"><div><h3>' + waliNilaiEsc(subject) + '</h3><p>' + subjectRows.length + ' penilaian tercatat</p></div><span>Rata-rata ' + waliNilaiFormat(subjectAverage) + '</span></div>' +
      '<div class="wali-nilai-list">' + subjectRows.map(function(row){
        var target = row.kkm !== null ? row.kkm : 70;
        var status = row.score >= 90 ? 'Sangat baik' : (row.score >= target ? 'Tuntas' : 'Perlu perhatian');
        var tone = row.score >= 90 ? 'strong' : (row.score >= target ? 'steady' : 'watch');
        var components = [];
        if (row.tugas !== null) components.push('<span>Tugas <strong>' + waliNilaiFormat(row.tugas) + '</strong></span>');
        if (row.ujian !== null) components.push('<span>Ujian <strong>' + waliNilaiFormat(row.ujian) + '</strong></span>');
        components.push('<span>KKM <strong>' + waliNilaiFormat(target) + '</strong></span>');
        return '<article class="wali-nilai-row ' + tone + '">' +
          '<div class="wali-nilai-row-main"><div class="wali-nilai-copy"><span class="wali-nilai-type">' + waliNilaiEsc(row.type) + '</span><h4>' + waliNilaiEsc(subject) + '</h4><p>' + (row.date ? waliNilaiEsc(waliRiwayatFormatTanggal(row.date)) : 'Tanggal belum tersedia') + '</p></div>' +
          '<div class="wali-nilai-score"><strong>' + waliNilaiFormat(row.score) + '</strong><span>' + status + '</span></div></div>' +
          '<div class="wali-nilai-components">' + components.join('') + '</div>' +
          (row.note ? '<p class="wali-nilai-note"><span>Catatan guru</span>' + waliNilaiEsc(row.note) + '</p>' : '') +
          '</article>';
      }).join('') + '</div></section>';
  }).join('');

  return '<section class="section wali-nilai-page">' +
    '<article class="wali-nilai-hero ' + averageTone + '"><div class="wali-nilai-hero-copy"><span class="wali-nilai-eyebrow">Capaian akademik</span><h2>Nilai ' + waliNilaiEsc(childProfile.nickName || childProfile.fullName || appState.childName || 'anak') + '</h2><p>' + summary + '</p></div>' +
    '<div class="wali-nilai-average"><span>Rata-rata</span><strong>' + waliNilaiFormat(average) + '</strong></div></article>' +
    '<div class="wali-nilai-kpis">' +
      '<article><span>Nilai tertinggi</span><strong>' + (highest ? waliNilaiFormat(highest.score) : '-') + '</strong><small>' + (highest ? waliNilaiEsc(highest.subject) : 'Belum ada data') + '</small></article>' +
      '<article><span>Mata pelajaran</span><strong>' + semesterSubjects.length + '</strong><small>Dalam periode ini</small></article>' +
      '<article class="' + (needsAttention ? 'watch' : '') + '"><span>Perlu perhatian</span><strong>' + needsAttention + '</strong><small>Di bawah KKM / 70</small></article>' +
    '</div>' +
    '<div class="wali-nilai-toolbar"><label><span>Semester</span><select data-select="wali-nilai-semester">' + semesterOptions + '</select></label><label><span>Mata pelajaran</span><select data-select="wali-nilai-mapel">' + subjectOptions + '</select></label></div>' +
    '<div class="wali-nilai-section-head"><div><h2>Rincian penilaian</h2><p>' + visibleRows.length + ' hasil ditemukan</p></div></div>' +
    (listHtml || '<article class="wali-nilai-empty"><div>' + ICONS.nilai + '</div><h3>Belum ada nilai</h3><p>Nilai akan tampil di sini setelah sekolah menginput penilaian atau ketika filter lain dipilih.</p></article>') +
    '</section>';
}

function waliCatatanRow(row) {
  row = row || {};
  var visibility = String(row.status_visibilitas || row.visibilitas || '').toLowerCase();
  var category = String(row.kategori || row.jenis || 'Catatan umum').replace(/[-_]+/g, ' ').trim();
  category = category.replace(/\b\w/g, function(char){ return char.toUpperCase(); });
  return {
    id: row.id || row.uuid || row.key || '',
    visible: visibility !== 'ditarik' && visibility !== 'internal',
    date: String(row.tanggal || row.tgl || row.created_at || '').slice(0, 10),
    category: category,
    subject: String(row.mapel || row.mata_pelajaran || '').trim(),
    message: String(row.catatan || row.isi || row.pesan || row.deskripsi || row.keterangan || '').trim(),
    followUp: String(row.tindak_lanjut || '').trim(),
    status: String(row.status || '').toLowerCase()
  };
}

function renderCatatanAnak(detail, sourceRows) {
  var rows = (Array.isArray(sourceRows) ? sourceRows : []).map(waliCatatanRow).filter(function(row){
    return row.visible && row.message;
  }).sort(function(a, b){ return b.date.localeCompare(a.date); });
  var categories = [];
  var months = [];
  rows.forEach(function(row){
    if (categories.indexOf(row.category) === -1) categories.push(row.category);
    var month = row.date.slice(0, 7);
    if (month && months.indexOf(month) === -1) months.push(month);
  });
  categories.sort(function(a, b){ return a.localeCompare(b, 'id'); });
  months.sort().reverse();

  var selectedMonth = appState.waliCatatanBulan || (months[0] || '__all');
  if (selectedMonth !== '__all' && months.indexOf(selectedMonth) === -1) selectedMonth = '__all';
  var monthRows = selectedMonth === '__all' ? rows : rows.filter(function(row){ return row.date.slice(0, 7) === selectedMonth; });
  var monthCategories = [];
  monthRows.forEach(function(row){ if (monthCategories.indexOf(row.category) === -1) monthCategories.push(row.category); });
  monthCategories.sort(function(a, b){ return a.localeCompare(b, 'id'); });
  var selectedCategory = appState.waliCatatanKategori || '__all';
  if (selectedCategory !== '__all' && monthCategories.indexOf(selectedCategory) === -1) selectedCategory = '__all';
  var visibleRows = selectedCategory === '__all' ? monthRows : monthRows.filter(function(row){ return row.category === selectedCategory; });

  var followUpCount = visibleRows.filter(function(row){
    return row.followUp && !/selesai|tuntas|sudah/.test(row.status);
  }).length;
  var latest = visibleRows[0] || null;
  var latestDateLabel = '-';
  var latestDateMeta = 'Belum ada data';
  if (latest && latest.date) {
    var latestParts = latest.date.split('-');
    var latestMonthIndex = parseInt(latestParts[1], 10) - 1;
    var latestMonthShort = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][latestMonthIndex] || latestParts[1];
    latestDateLabel = String(Number(latestParts[2])) + ' ' + latestMonthShort;
    latestDateMeta = latestParts[0] || 'Catatan terbaru';
  }
  var monthOptions = '<option value="__all"' + (selectedMonth === '__all' ? ' selected' : '') + '>Semua periode</option>' +
    months.map(function(value){ return '<option value="' + waliNilaiEsc(value) + '"' + (value === selectedMonth ? ' selected' : '') + '>' + waliNilaiEsc(waliLabelBulan(value)) + '</option>'; }).join('');
  var categoryOptions = '<option value="__all"' + (selectedCategory === '__all' ? ' selected' : '') + '>Semua kategori</option>' +
    monthCategories.map(function(value){ return '<option value="' + waliNilaiEsc(value) + '"' + (value === selectedCategory ? ' selected' : '') + '>' + waliNilaiEsc(value) + '</option>'; }).join('');

  var cards = visibleRows.map(function(row, index){
    var needsFollowUp = !!row.followUp && !/selesai|tuntas|sudah/.test(row.status);
    var icon = needsFollowUp
      ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v8"/><path d="M10 15.5v.5"/><circle cx="10" cy="10" r="8"/></svg>'
      : '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12v10H8l-4 3V4z"/><path d="M7 8h6M7 11h4"/></svg>';
    return '<article class="wali-catatan-card' + (needsFollowUp ? ' needs-follow-up' : '') + '">' +
      '<header class="wali-catatan-card-head"><div class="wali-catatan-icon">' + icon + '</div><div class="wali-catatan-head-copy"><span>' + waliNilaiEsc(row.category) + '</span><time>' + (row.date ? waliNilaiEsc(waliRiwayatFormatTanggal(row.date)) : 'Tanggal belum tersedia') + '</time></div>' +
      (index === 0 ? '<span class="wali-catatan-latest">Terbaru</span>' : '') + '</header>' +
      (row.subject ? '<p class="wali-catatan-subject">' + waliNilaiEsc(row.subject) + '</p>' : '') +
      '<p class="wali-catatan-message">' + waliNilaiEsc(row.message) + '</p>' +
      (row.followUp ? '<div class="wali-catatan-follow"><span>Tindak lanjut</span><p>' + waliNilaiEsc(row.followUp) + '</p></div>' : '') +
      '</article>';
  }).join('');

  return '<section class="section wali-catatan-page">' +
    '<article class="wali-catatan-hero"><div class="wali-catatan-hero-icon">' + ICONS.catatan + '</div><div><span>Komunikasi sekolah</span><h2>Catatan ' + waliNilaiEsc(childProfile.nickName || childProfile.fullName || appState.childName || 'anak') + '</h2><p>Pesan dan arahan guru tersusun dalam satu tempat.</p></div></article>' +
    '<div class="wali-catatan-kpis">' +
      '<article><span>Total catatan</span><strong>' + visibleRows.length + '</strong><small>Pada filter saat ini</small></article>' +
      '<article class="' + (followUpCount ? 'attention' : '') + '"><span>Perlu ditindaklanjuti</span><strong>' + followUpCount + '</strong><small>' + (followUpCount ? 'Perlu perhatian wali' : 'Tidak ada arahan aktif') + '</small></article>' +
      '<article><span>Catatan terakhir</span><strong class="date">' + waliNilaiEsc(latestDateLabel) + '</strong><small>' + waliNilaiEsc(latestDateMeta) + '</small></article>' +
    '</div>' +
    '<div class="wali-catatan-toolbar"><label><span>Periode</span><select data-select="wali-catatan-bulan">' + monthOptions + '</select></label><label><span>Kategori</span><select data-select="wali-catatan-kategori">' + categoryOptions + '</select></label></div>' +
    '<div class="wali-catatan-section-head"><div><h2>Pesan dari sekolah</h2><p>' + visibleRows.length + ' catatan ditemukan</p></div></div>' +
    '<div class="wali-catatan-list">' + (cards || '<article class="wali-catatan-empty"><div>' + ICONS.catatan + '</div><h3>Belum ada catatan</h3><p>Pesan dari guru atau sekolah akan tampil di sini ketika tersedia atau saat filter lain dipilih.</p></article>') + '</div>' +
    '</section>';
}

// ===== Riwayat modul wali (gaya seperti panel Riwayat di shell guru) =====
// Data tersimpan dikelompokkan per tanggal di dalam panel collapsible <details>.
function waliRiwayatRowDate(r){
  if(!r) return '';
  var d = r.tanggal || r.tgl || r.created_at || r.waktu || r.date || r.bulan || '';
  return String(d).slice(0,10);
}
function waliRiwayatFormatTanggal(d){
  try { var dt = new Date(d); if(!isNaN(dt.getTime())) return dt.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); } catch(e){}
  return d || 'Tanpa tanggal';
}
/* ==================================================================
 * [RIWAYAT BULAN] Riwayat wali dipisah dua tingkat: pilih bulan dulu,
 * baru pilih tanggal di dalam bulan itu. Bawaannya bulan berjalan dan
 * tanggal hari ini bila datanya ada.
 * ================================================================== */
var WALI_NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function waliBulanDariTgl(t){ return String(t == null ? '' : t).slice(0, 7); }
function waliLabelBulan(ym){
  var p = String(ym || '').split('-');
  if (p.length < 2) return ym || '-';
  var i = parseInt(p[1], 10) - 1;
  return (WALI_NAMA_BULAN[i] || p[1]) + ' ' + p[0];
}
function waliHariIniISO(){
  var d = new Date();
  var b = d.getMonth() + 1, t = d.getDate();
  return d.getFullYear() + '-' + (b < 10 ? '0' : '') + b + '-' + (t < 10 ? '0' : '') + t;
}
function waliKunciRiwayat(title){ return String(title || 'riwayat').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'riwayat'; }
// [RIWAYAT BULAN] Gaya penyaring bulan/tanggal, senada tema hangat aplikasi wali.
function ensureWaliRiwayatFilterStyles(){
  if (document.getElementById('wali-riwayat-filter-css')) return;
  var st = document.createElement('style');
  st.id = 'wali-riwayat-filter-css';
  var panah = 'url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 20 20%27 fill=%27none%27 stroke=%27%23ea580c%27 stroke-width=%272.2%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M5 8l5 5 5-5%27/%3E%3C/svg%3E")';
  st.textContent = ''
    + '.wrf-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 12px;padding:10px 12px;background:#fff;border:1px solid #f3e3d3;border-radius:16px;box-shadow:0 2px 10px rgba(124,45,18,.06)}'
    + '.wrf-lbl{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#9a7b62}'
    + '.wrf-field{position:relative;flex:1 1 150px;min-width:0}'
    + '.wrf-field::after{content:"";position:absolute;right:10px;top:50%;width:16px;height:16px;margin-top:-8px;pointer-events:none;background:' + panah + ' no-repeat center/16px 16px}'
    + '.wrf-select{-webkit-appearance:none;-moz-appearance:none;appearance:none;width:100%;background:#fff7ed;border:1.5px solid #ffe0c2;border-radius:12px;padding:10px 32px 10px 12px;font-size:13px;font-weight:800;color:#7c2d12;line-height:1.25;box-shadow:inset 0 1px 2px rgba(124,45,18,.04);text-overflow:ellipsis;-webkit-tap-highlight-color:transparent}'
    + '.wrf-select:focus{outline:none;border-color:#ea580c;background:#fff;box-shadow:0 0 0 3px rgba(234,88,12,.16)}'
    + '.wrf-select:active{transform:scale(.995)}'
    + '.wrf-select option{color:#0f172a;font-weight:600}'
    + '@media (max-width:420px){.wrf-field{flex:1 1 100%}}';
  document.head.appendChild(st);
}
function waliRiwayatFilterUI(title, dates){
  try { ensureWaliRiwayatFilterStyles(); } catch(e){ console.warn('[RIWAYAT BULAN] gagal pasang gaya', e); }
  var kunci = waliKunciRiwayat(title);
  appState.waliRiwayatBulan = appState.waliRiwayatBulan || {};
  appState.waliRiwayatTgl = appState.waliRiwayatTgl || {};
  var bulanIsi = {}, bulanUrut = [];
  (dates || []).forEach(function(d){
    var b = waliBulanDariTgl(d);
    if (!bulanIsi[b]) { bulanIsi[b] = []; bulanUrut.push(b); }
    bulanIsi[b].push(d);
  });
  bulanUrut.sort().reverse();
  var hariIni = waliHariIniISO(), bulanIni = waliBulanDariTgl(hariIni);
  var bulan = appState.waliRiwayatBulan[kunci];
  if (!bulan || !bulanIsi[bulan]) bulan = bulanIsi[bulanIni] ? bulanIni : bulanUrut[0];
  appState.waliRiwayatBulan[kunci] = bulan;
  var tglBulan = (bulanIsi[bulan] || []).slice().sort().reverse();
  var sel = appState.waliRiwayatTgl[kunci];
  if (!sel || tglBulan.indexOf(sel) < 0) sel = (tglBulan.indexOf(hariIni) >= 0) ? hariIni : tglBulan[0];
  var html = '<div class="wrf-bar">';
  html += '<span class="wrf-lbl">Bulan</span>';
  html += '<span class="wrf-field"><select class="wrf-select" data-select="wali-riwayat-bulan" data-wali-kunci="' + kunci + '">';
  bulanUrut.forEach(function(b){
    html += '<option value="' + b + '"' + (b === bulan ? ' selected' : '') + '>' + waliLabelBulan(b) + (b === bulanIni ? ' (bulan ini)' : '') + ' \u00b7 ' + bulanIsi[b].length + ' tanggal</option>';
  });
  html += '</select></span>';
  html += '<span class="wrf-lbl">Tanggal</span>';
  html += '<span class="wrf-field"><select class="wrf-select" data-select="wali-riwayat-tanggal" data-wali-kunci="' + kunci + '">';
  tglBulan.forEach(function(d){
    html += '<option value="' + d + '"' + (d === sel ? ' selected' : '') + '>' + waliRiwayatFormatTanggal(d) + (d === hariIni ? ' (hari ini)' : '') + '</option>';
  });
  html += '</select></span></div>';
  return { html: html, selected: sel, bulan: bulan, jmlBulan: bulanUrut.length, jmlTanggal: tglBulan.length, kunci: kunci };
}

// Riwayat generik berbasis tanggal untuk daftar yang sudah punya builder kartu sendiri
// (mis. Tagihan SPP & Mutasi Tabungan di modul Keuangan).
// [RIWAYAT SEBULAN PENUH] Penyaring bulan saja, tanpa dropdown tanggal.
// Seluruh tanggal dalam bulan terpilih ditampilkan sekaligus (dikelompokkan per
// tanggal), sedangkan antar bulan tetap dipisah lewat dropdown Bulan.
function waliRiwayatFilterBulanUI(title, dates){
  try { ensureWaliRiwayatFilterStyles(); } catch(e){ console.warn('[RIWAYAT SEBULAN PENUH] gagal pasang gaya', e); }
  var kunci = waliKunciRiwayat(title);
  appState.waliRiwayatBulan = appState.waliRiwayatBulan || {};
  var bulanIsi = {}, bulanUrut = [];
  (dates || []).forEach(function(d){
    var b = waliBulanDariTgl(d);
    if (!bulanIsi[b]) { bulanIsi[b] = []; bulanUrut.push(b); }
    bulanIsi[b].push(d);
  });
  bulanUrut.sort().reverse();
  var bulanIni = waliBulanDariTgl(waliHariIniISO());
  var bulan = appState.waliRiwayatBulan[kunci];
  if (!bulan || !bulanIsi[bulan]) bulan = bulanIsi[bulanIni] ? bulanIni : (bulanUrut[0] || bulanIni);
  appState.waliRiwayatBulan[kunci] = bulan;
  var tglBulan = (bulanIsi[bulan] || []).slice().sort().reverse();
  var html = '<div class="wrf-bar">';
  html += '<span class="wrf-lbl">Bulan</span>';
  html += '<span class="wrf-field"><select class="wrf-select" data-select="wali-riwayat-bulan" data-wali-kunci="' + kunci + '">';
  bulanUrut.forEach(function(b){
    html += '<option value="' + b + '"' + (b === bulan ? ' selected' : '') + '>' + waliLabelBulan(b) + (b === bulanIni ? ' (bulan ini)' : '') + ' \u00b7 ' + bulanIsi[b].length + ' tanggal</option>';
  });
  html += '</select></span></div>';
  return { html: html, bulan: bulan, tglBulan: tglBulan, jmlBulan: bulanUrut.length, kunci: kunci };
}

function renderWaliRiwayatList(title, arr, dateOf, itemOf, emptyTitle, emptyMeta){
  arr = Array.isArray(arr) ? arr : [];
  var sumOpen = '<summary class="riwayat-absen-summary" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800;list-style:none;-webkit-tap-highlight-color:transparent">';
  var head = '\uD83D\uDCC5 Riwayat ' + title;
  if(!arr.length){
    return '<section class="section"><details class="riwayat-absen-toggle" style="border:1px solid #e5e7eb;border-radius:14px;padding:10px 14px;background:#fff">'
      + sumOpen + '<span class="riwayat-absen-title">'+head+'</span><span class="riwayat-absen-hint" style="font-size:11px;color:#94a3b8;font-weight:700">Lihat detail \u203A</span></summary>'
      + '<div class="riwayat-absen-body" style="padding-top:10px"><div class="timeline">'
      + scheduleCard({ time:'Info', title:(emptyTitle||'Belum ada data'), meta:(emptyMeta||''), status:'Kosong', tone:'blue' })
      + '</div></div></details></section>';
  }
  var groups = {}, noDate = [];
  arr = arr.slice().sort(function(a,b){ return String(dateOf(b)||'').slice(0,10).localeCompare(String(dateOf(a)||'').slice(0,10)); });
  arr.forEach(function(r){ var d=String(dateOf(r)||'').slice(0,10); if(d && d!=='-'){ (groups[d]=groups[d]||[]).push(r); } else { noDate.push(r); } });
  var dates = Object.keys(groups).sort().reverse();
  // [RIWAYAT SEBULAN PENUH] Pilih bulan saja; semua tanggal di bulan itu langsung tampil.
  var ui = waliRiwayatFilterBulanUI(title, dates);
  var inner = ui.html;
  var totalBulan = 0;
  ui.tglBulan.forEach(function(d){ totalBulan += (groups[d] || []).length; });
  inner += '<p class="riwayat-absen-count" style="font-weight:800;color:#4f46e5;margin:12px 0 6px">'+waliLabelBulan(ui.bulan)+' \u00b7 '+totalBulan+' data \u00b7 '+ui.tglBulan.length+' tanggal</p>';
  if(!ui.tglBulan.length){
    inner += '<div class="timeline">'+scheduleCard({ time:'Info', title:'Belum ada data di bulan ini', meta:'Pilih bulan lain pada daftar di atas.', status:'Kosong', tone:'blue' })+'</div>';
  }
  ui.tglBulan.forEach(function(d){
    var rowsHari = groups[d] || [];
    inner += '<p class="riwayat-absen-count" style="font-weight:800;color:#7c2d12;margin:10px 0 6px">'+waliRiwayatFormatTanggal(d)+' \u00b7 '+rowsHari.length+' data</p>'
      + '<div class="timeline">'+rowsHari.map(function(r){ return scheduleCard(itemOf(r)); }).join('')+'</div>';
  });
  if(noDate.length){
    inner += '<p class="riwayat-absen-count" style="font-weight:800;color:#64748b;margin:12px 0 6px">Tanpa tanggal \u00b7 '+noDate.length+' data</p><div class="timeline">'+noDate.map(function(r){ return scheduleCard(itemOf(r)); }).join('')+'</div>';
  }
  return '<section class="section"><details class="riwayat-absen-toggle" open style="border:1px solid #e5e7eb;border-radius:14px;padding:10px 14px;background:#fff">'
    + sumOpen + '<span class="riwayat-absen-title">'+head+'</span><span class="riwayat-absen-hint" style="font-size:11px;color:#94a3b8;font-weight:700">'+arr.length+' entri \u00b7 '+dates.length+' tanggal \u203A</span></summary>'
    + '<div class="riwayat-absen-body" style="padding-top:8px">'+inner+'</div></details></section>';
}

function renderWaliModuleRiwayat(list, title, crudKey){
  var helper = window.ZymataMobileSupabase;
  var arr = Array.isArray(list) ? list : [];
  function entryHtml(r){
    var item = (helper && helper.normalizeItem) ? helper.normalizeItem(r, title) : { time: waliRiwayatRowDate(r)||'Data', title:title, meta:'Supabase', status:'Aktif', tone:'blue' };
    var actions = (r.__mobileCrud && r.id) ? '<div class="field-chip-row"><button type="button" class="field-chip" data-mobile-crud-update="'+r.id+'" data-mobile-crud-key="'+crudKey+'">Tandai selesai</button><button type="button" class="field-chip" data-mobile-crud-delete="'+r.id+'" data-mobile-crud-key="'+crudKey+'">Hapus</button></div>' : '';
    return scheduleCard(item) + actions;
  }
  var sumOpen = '<summary class="riwayat-absen-summary" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800;list-style:none;-webkit-tap-highlight-color:transparent">';
  var head = '\uD83D\uDCC5 Riwayat ' + title;
  if(!arr.length){
    return '<section class="section"><details class="riwayat-absen-toggle" style="border:1px solid #e5e7eb;border-radius:14px;padding:10px 14px;background:#fff">'
      + sumOpen + '<span class="riwayat-absen-title">'+head+'</span><span class="riwayat-absen-hint" style="font-size:11px;color:#94a3b8;font-weight:700">Lihat detail \u203A</span></summary>'
      + '<div class="riwayat-absen-body" style="padding-top:10px"><div class="timeline">'
      + scheduleCard({ time:'Info', title:'Belum ada riwayat', meta:'Data '+String(title).toLowerCase()+' yang sudah disimpan akan tampil di sini per tanggal.', status:'Kosong', tone:'blue' })
      + '</div></div></details></section>';
  }
  var groups = {}, noDate = [];
  arr = arr.slice().sort(function(a,b){ return String(waliRiwayatRowDate(b)||'').localeCompare(String(waliRiwayatRowDate(a)||'')); });
  arr.forEach(function(r){ var d=waliRiwayatRowDate(r); if(d){ (groups[d]=groups[d]||[]).push(r); } else { noDate.push(r); } });
  var dates = Object.keys(groups).sort().reverse();
  // [RIWAYAT SEBULAN PENUH] Pilih bulan saja; semua tanggal di bulan itu langsung tampil.
  var ui = waliRiwayatFilterBulanUI(title, dates);
  var inner = ui.html;
  var totalBulan = 0;
  ui.tglBulan.forEach(function(d){ totalBulan += (groups[d] || []).length; });
  inner += '<p class="riwayat-absen-count" style="font-weight:800;color:#4f46e5;margin:12px 0 6px">'+waliLabelBulan(ui.bulan)+' \u00b7 '+totalBulan+' data \u00b7 '+ui.tglBulan.length+' tanggal</p>';
  if(!ui.tglBulan.length){
    inner += '<div class="timeline">'+scheduleCard({ time:'Info', title:'Belum ada data di bulan ini', meta:'Pilih bulan lain pada daftar di atas.', status:'Kosong', tone:'blue' })+'</div>';
  }
  ui.tglBulan.forEach(function(d){
    var rowsHari = groups[d] || [];
    inner += '<p class="riwayat-absen-count" style="font-weight:800;color:#7c2d12;margin:10px 0 6px">'+waliRiwayatFormatTanggal(d)+' \u00b7 '+rowsHari.length+' data</p>'
      + '<div class="timeline">'+rowsHari.map(entryHtml).join('')+'</div>';
  });
  if(noDate.length){
    inner += '<p class="riwayat-absen-count" style="font-weight:800;color:#64748b;margin:12px 0 6px">Tanpa tanggal \u00b7 '+noDate.length+' data</p><div class="timeline">'+noDate.slice(0,30).map(entryHtml).join('')+'</div>';
  }
  return '<section class="section"><details class="riwayat-absen-toggle" open style="border:1px solid #e5e7eb;border-radius:14px;padding:10px 14px;background:#fff">'
    + sumOpen + '<span class="riwayat-absen-title">'+head+'</span><span class="riwayat-absen-hint" style="font-size:11px;color:#94a3b8;font-weight:700">'+arr.length+' entri \u00b7 '+dates.length+' tanggal \u203A</span></summary>'
    + '<div class="riwayat-absen-body" style="padding-top:8px">'+inner+'</div></details></section>';
}

function renderWaliMutabaahRumahRiwayat(list){
  var arr = Array.isArray(list) ? list : [];
  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var sumOpen = '<summary class="riwayat-absen-summary" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800;list-style:none;-webkit-tap-highlight-color:transparent">';
  var head = '\uD83D\uDCC5 Riwayat Mutabaah Rumah';
  if(!arr.length){
    return '<section class="section"><details class="riwayat-absen-toggle" style="border:1px solid #e5e7eb;border-radius:14px;padding:10px 14px;background:#fff">'
      + sumOpen + '<span class="riwayat-absen-title">'+head+'</span><span class="riwayat-absen-hint" style="font-size:11px;color:#94a3b8;font-weight:700">Lihat detail \u203A</span></summary>'
      + '<div class="riwayat-absen-body" style="padding-top:10px"><div class="timeline">'
      + scheduleCard({ time:'Info', title:'Belum ada data', meta:'Data mutabaah rumah yang sudah disimpan akan tampil di sini beserta penilaian guru.', status:'Kosong', tone:'blue' })
      + '</div></div></details></section>';
  }
  var ya = function(v){ return /^(ya|1|true|hadir|sudah)$/i.test(String(v==null?'':v).trim()); };
  var sorted = arr.slice().sort(function(a,b){ return String(b.tanggal||b.tgl||'').localeCompare(String(a.tanggal||a.tgl||'')); });
  // [RIWAYAT BULAN] Bulan dulu, baru tanggal.
  var _adaTgl = {};
  sorted.forEach(function(r){ var d=String(r.tanggal||r.tgl||'').slice(0,10); if(d) _adaTgl[d]=true; });
  var _ui = waliRiwayatFilterBulanUI('Mutabaah Rumah', Object.keys(_adaTgl).sort().reverse());
  var _tglSet = {};
  (_ui.tglBulan || []).forEach(function(d){ _tglSet[d] = 1; });
  var _pilih = sorted.filter(function(r){ return !!_tglSet[String(r.tanggal||r.tgl||'').slice(0,10)]; });
  var cards = _ui.html
    + '<p class="riwayat-absen-count" style="font-weight:800;color:#4f46e5;margin:12px 0 6px">'+waliLabelBulan(_ui.bulan)+' \u00b7 '+_pilih.length+' data \u00b7 '+(_ui.tglBulan||[]).length+' tanggal</p>'
    + (_pilih.length ? '' : '<div class="timeline">'+scheduleCard({ time:'Info', title:'Belum ada data di bulan ini', meta:'Pilih bulan lain pada daftar di atas.', status:'Kosong', tone:'blue' })+'</div>')
    + _pilih.slice(0,200).map(function(r){
    var tgl = esc(String(r.tanggal||r.tgl||'').slice(0,10) || '-');
    var shalat = [['Subuh',r.shalat_subuh],['Dzuhur',r.shalat_dzuhur],['Ashar',r.shalat_ashar],['Maghrib',r.shalat_maghrib],['Isya',r.shalat_isya]];
    var shalatHtml = shalat.map(function(s){ var ok = ya(s[1]); return '<span class="status-pill '+(ok?'green':'orange')+'">'+s[0]+'</span>'; }).join(' ');
    var konfBool = (r.konfirmasi_wali === true || r.konfirmasi_wali === 'true' || r.konfirmasi_wali === 1 || r.konfirmasi_wali === '1');
     var sudahDinilai = konfBool || /dinilai|tindak lanjut|ada kendala/i.test(String(r.status_review||'')) || !!String(r.keterangan_guru||'').trim();
    var konfPill = konfBool
      ? '<span class="status-pill green">Dikonfirmasi guru</span>'
       : (sudahDinilai
           ? '<span class="status-pill orange">Sudah dinilai guru</span>'
           : '<span class="status-pill blue">Menunggu Review Guru</span>');
     var kendalaHtml = String(r.kendala_wali||'').trim() ? '<p class="card-meta" style="margin:6px 0 0"><b>Problem / Kendala wali:</b> '+esc(r.kendala_wali)+'</p>' : '';
     var guruNoteHtml = String(r.keterangan_guru||'').trim() ? '<p class="card-meta" style="margin:6px 0 0"><b>Penilaian guru:</b> '+esc(r.keterangan_guru)+'</p>' : '';
    return '<article class="db-ready-card" style="margin-bottom:10px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 class="card-title" style="font-size:14px;margin:0">'+tgl+'</h3>'+konfPill+'</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">'+shalatHtml+'</div>'
       + '<p class="card-meta" style="margin:2px 0"><b>Belajar:</b> '+(r.belajar?esc(r.belajar):'-')+' &middot; <b>Akhlak:</b> '+(r.akhlak?esc(r.akhlak):'-')+'</p>'
       + (String(r.catatan||'').trim() ? '<p class="card-meta" style="margin:2px 0"><b>Keterangan:</b> '+esc(r.catatan)+'</p>' : '')
       + kendalaHtml + guruNoteHtml
      + '</article>';
  }).join('');
  return '<section class="section"><details class="riwayat-absen-toggle" open style="border:1px solid #e5e7eb;border-radius:14px;padding:10px 14px;background:#fff">'
    + sumOpen + '<span class="riwayat-absen-title">'+head+'</span><span class="riwayat-absen-hint" style="font-size:11px;color:#94a3b8;font-weight:700">'+arr.length+' entri \u203A</span></summary>'
    + '<div class="riwayat-absen-body" style="padding-top:8px">'+cards+'</div></details></section>';
}

/* [DIHAPUS] renderWaliMutabaahQuranRiwayat() dihapus di sini.
   Fungsi itu punya NOL pemanggil (sudah dicari di seluruh hpnative: yang muncul hanya
   komentar penanda dan definisinya sendiri). Modul Mutabaah Quran memang sudah tidak
   dipakai, dan tabel `mutabaah_quran` juga TIDAK ADA di database (REST balas 404
   PGRST205), jadi fungsi ini tidak mungkin punya data untuk dirender.

   Alasan dihapus, bukan dibiarkan: fungsi ini membaca 7 kolom (status_setoran,
   ziyadah_sekolah, catatan_guru, tilawah_rumah, murojaah_rumah, tanggal, tgl).
   Selama ia masih ada, audit "kolom apa yang dibaca UI" akan menyimpulkan ketujuh
   kolom itu wajib dipertahankan — padahal kodenya mati. Itu sudah sempat
   menyesatkan sekali saat pembatasan kolom jalur wali.

   Versi lengkapnya ada di `wali-shell.js.backup_bersih_komentar_20260821` bila
   suatu saat modul Mutabaah Quran dihidupkan kembali. */

function renderSupabaseWaliFormModule(detail, rows, moduleId, crudKey) {
  const helper = window.ZymataMobileSupabase;
  const list = Array.isArray(rows) ? rows : [];
  return `
    ${moduleIntro(detail, moduleParentTab(moduleId))}
    <section class="section">
      <article class="db-ready-card">
        <span class="status-pill ${list.length ? 'green' : 'blue'}">${list.length ? 'Supabase' : 'Belum ada data'}</span>
        <h3 class="card-title">${list.length ? (list.length + ' data terbaca') : 'Data real belum tersedia'}</h3>
        <p class="card-meta">${list.length ? 'Data ini dibaca langsung dari Supabase sesuai akun wali.' : 'Isi form di bawah untuk menyimpan data ke Supabase.'}</p>
      </article>
    </section>
    ${renderModuleForm(crudKey)}
    ${moduleId === 'mutabaah-rumah' ? renderWaliMutabaahRumahRiwayat(list) : renderWaliModuleRiwayat(list, detail.title, crudKey)}
  `;
}

async function loadWaliJadwal() {
  appState.waliJadwalLoaded = false;
  var helper = window.ZymataMobileSupabase;
  var raw = String(childProfile.className || appState.childClass || '').trim();
  var stripped = raw.replace(/^kelas\s+/i, '').trim();
  appState.waliJadwalKelas = stripped || raw;
  if (!helper || typeof helper.select !== 'function' || !stripped || stripped === '-') {
    appState.waliJadwal = [];
    appState.waliJadwalLoaded = true;
    return;
  }
  var tries = [];
  [stripped, 'Kelas ' + stripped, raw].forEach(function(v){ v = String(v || '').trim(); if (v && tries.indexOf(v) === -1) tries.push(v); });
  var rows = [];
  // [EGRESS KOLOM WALI] renderJadwalAnak hanya memakai: hari_index, jam_index,
  // jam_label/jam (lihat waliJamJadwal), mapel, guru. Tabel jadwal_pelajaran punya
  // 19 kolom termasuk `payload` yang tidak dipakai sama sekali di aplikasi wali.
  // Terukur: 300 baris select=* = 124 KB; difilter kelas + kolom seperlunya jauh lebih kecil.
  var _KOL_JADWAL = 'hari_index,jam_index,jam_label,jam,mapel,guru';
  for (var i = 0; i < tries.length; i++) {
    try {
      var res = await helper.select('jadwal_pelajaran', { eq: { kelas: tries[i] }, select: _KOL_JADWAL, limit: 300 });
      var rws = Array.isArray(res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      if (rws.length) { rows = rws; break; }
    } catch (e) { console.warn('[Jadwal Wali] gagal load:', e); }
  }
  appState.waliJadwal = rows;
  appState.waliJadwalLoaded = true;
}

function renderJadwalAnak(detail) {
  var kelasNow = String(childProfile.className || appState.childClass || '').replace(/^kelas\s+/i, '').trim();
  if (!appState.waliJadwalLoaded || appState.waliJadwalKelas !== kelasNow) {
    loadWaliJadwal().then(function(){ if (appState.activeTab === 'module:jadwal-anak') render(); });
    return `
      ${moduleIntro(detail, moduleParentTab('jadwal-anak'))}
      <section class="section">
        <article class="db-ready-card">
          <h3 class="card-title">Memuat jadwal\u2026</h3>
          <p class="card-meta">Mengambil jadwal pelajaran kelas ${kelasNow || '-'} dari sekolah.</p>
        </article>
      </section>
    `;
  }
  var rows = Array.isArray(appState.waliJadwal) ? appState.waliJadwal.slice() : [];
  var HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var JAM_LABELS = ['07:00-07:35', '07:35-08:10', '08:10-08:45', '08:45-09:20', 'Istirahat', '09:35-10:10', '10:10-10:45', '10:45-11:20', '11:20-11:55'];
  var kelasLabel = appState.waliJadwalKelas || '-';
  var byHari = {};
  rows.forEach(function(r){
    var hi = parseInt(r.hari_index);
    if (isNaN(hi)) return;
    (byHari[hi] = byHari[hi] || []).push(r);
  });
  var jsDay = new Date().getDay();
  var todayHari = jsDay === 0 ? -1 : jsDay - 1;
  var daysHtml = HARI.map(function(nama, hi){
    var list = (byHari[hi] || []).slice().sort(function(a, b){ return (parseInt(a.jam_index) || 0) - (parseInt(b.jam_index) || 0); });
    var isToday = hi === todayHari;
    // [JADWAL ISTIRAHAT PISAH] Istirahat = jeda waktu antar mapel (bukan indeks tetap).
    var _prevR = null;
    var items = list.length ? list.map(function(r){
      var ji = parseInt(r.jam_index);
      var pemisah = '';
      if (_prevR) {
        var _jamIst = waliIstirahatAntar(_prevR, r, JAM_LABELS);
        if (_jamIst) pemisah = waliBarisIstirahatHtml(_jamIst);
      }
      _prevR = r;
      var jam = waliJamJadwal(r, ji, JAM_LABELS);
      var mapel = r.mapel || r.mata_pelajaran || '-';
      return pemisah + scheduleCard({ time: (String(jam).split('-')[0] || jam), title: mapel, meta: r.guru ? ('Guru: ' + r.guru) : '', status: 'Mapel', tone: 'blue' });
    }).join('') : '<p class="card-meta" style="padding:6px 2px;">Tidak ada jadwal.</p>';
    return `
      <section class="section section--tight">
        ${sectionHead(nama + (isToday ? ' \u00b7 Hari ini' : ''), list.length ? (list.length + ' mapel') : 'Libur')}
        <div class="timeline">${items}</div>
      </section>
    `;
  }).join('');
  return `
    ${moduleIntro(detail, moduleParentTab('jadwal-anak'))}
    <section class="section">
      <article class="db-ready-card">
        <span class="status-pill blue">Kelas ${kelasLabel}</span>
        <h3 class="card-title">${rows.length ? 'Jadwal pelajaran mingguan' : 'Jadwal belum tersedia'}</h3>
        <p class="card-meta">${rows.length ? 'Jadwal diambil langsung dari data sekolah di Supabase.' : 'Jadwal pelajaran untuk kelas ini belum diisi oleh sekolah.'}</p>
      </article>
    </section>
    ${rows.length ? daysHtml : ''}
  `;
}

async function loadWaliProgramKegiatan() {
  appState.waliProgramKegiatanLoaded = false;
  var helper = window.ZymataMobileSupabase;
  if (!helper || typeof helper.select !== 'function') {
    appState.waliProgramKegiatan = [];
    appState.waliProgramKegiatanLoaded = true;
    return;
  }
  var rows = [];
  try {
    var res = await helper.select('program_kegiatan', { order: 'no', ascending: true, limit: 100 });
    rows = Array.isArray(res && res.data) ? res.data : (Array.isArray(res) ? res : []);
  } catch (e) { console.warn('[Program Kegiatan Wali] gagal load:', e); }
  rows.sort(function(a, b){ return (parseInt(a.no) || 0) - (parseInt(b.no) || 0); });
  appState.waliProgramKegiatan = rows;
  appState.waliProgramKegiatanLoaded = true;
}

function renderProgramKegiatanWali(detail) {
  function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function fmtTgl(d){ d=String(d||'').slice(0,10); if(!d) return ''; var p=d.split('-'); if(p.length!==3) return d; return p[2]+'/'+p[1]+'/'+p[0]; }
  function isDone(r){ return r.selesai===true || r.selesai==='true' || r.selesai===1 || r.selesai==='__YES__'; }
  if (!appState.waliProgramKegiatanLoaded) {
    loadWaliProgramKegiatan().then(function(){ if (appState.activeTab === 'module:program-kegiatan') render(); });
    return `
      ${moduleIntro(detail, moduleParentTab('program-kegiatan'))}
      <section class="section">
        <article class="db-ready-card">
          <h3 class="card-title">Memuat program…</h3>
          <p class="card-meta">Mengambil program kegiatan sekolah dari data sekolah.</p>
        </article>
      </section>
    `;
  }
  var rows = Array.isArray(appState.waliProgramKegiatan) ? appState.waliProgramKegiatan.slice() : [];
  var total = rows.length;
  var done = rows.filter(isDone).length;
  var cards = total ? rows.map(function(r){
    var nm = esc(r.program || r.nama || '-');
    var tgl = fmtTgl(r.tanggal || r.tanggal_mulai);
    var tempat = esc(r.tempat || '');
    var pj = esc(r.penanggung_jawab || '');
    var ket = esc(r.keterangan || '');
    var done1 = isDone(r);
    var metaParts = [];
    if (tempat) metaParts.push('📍 ' + tempat);
    if (pj) metaParts.push('PJ: ' + pj);
    if (ket) metaParts.push(ket);
    return scheduleCard({ time: (tgl || '���'), title: nm, meta: metaParts.join(' · ') || '-', status: done1 ? 'Terlaksana' : 'Terjadwal', tone: done1 ? 'green' : 'blue' });
  }).join('') : '<p class="card-meta" style="padding:6px 2px;">Belum ada program kegiatan dari sekolah.</p>';
  return `
    ${moduleIntro(detail, moduleParentTab('program-kegiatan'))}
    <section class="section">
      <article class="db-ready-card">
        <span class="status-pill ${total ? 'green' : 'blue'}">${total ? 'Supabase' : 'Belum ada data'}</span>
        <h3 class="card-title">${total ? (total + ' program kegiatan') : 'Program belum tersedia'}</h3>
        <p class="card-meta">${total ? ('Terlaksana ' + done + ' dari ' + total + ' program. Data langsung dari sekolah.') : 'Program kegiatan sekolah belum diisi oleh sekolah.'}</p>
      </article>
    </section>
    ${total ? `
    <section class="section">
      ${sectionHead('Daftar program', total + ' program')}
      <div class="timeline">${cards}</div>
    </section>` : ''}
  `;
}

var dokuPaymentBusy = false;
function waliPaymentEsc(value){
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(char){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
  });
}
function waliDokuCheckoutUrlAllowed(value){
  try {
    var url = new URL(String(value || ''));
    return url.protocol === 'https:' && /(^|\.)doku\.com$/i.test(url.hostname);
  } catch(_) { return false; }
}
async function waliStartDokuPayment(options, button){
  if(dokuPaymentBusy) return;
  dokuPaymentBusy = true;
  var oldText = button ? button.textContent : '';
  if(button){ button.disabled=true; button.textContent='Menyiapkan QRIS...'; button.setAttribute('aria-busy','true'); }
  try {
    if(!window.ZymataMobileSupabase) throw new Error('Koneksi pembayaran belum siap.');
    var client = window.ZymataMobileSupabase.getClient();
    var authResult = await client.auth.getSession();
    var authSession = authResult && authResult.data && authResult.data.session;
    if(!authSession || !authSession.access_token) throw new Error('Sesi login berakhir. Silakan login ulang.');
    var ctx = window.__zymataWaliCtx || {};
    var siswaId = Number((ctx.siswa && ctx.siswa.id) || appState.activeChildId || 0);
    if(!Number.isSafeInteger(siswaId) || siswaId <= 0) throw new Error('Data anak belum terhubung.');
    var response = await fetch('https://hhcawtwbgfhivwfofdhx.functions.supabase.co/doku-payment/generate', {
      method:'POST',
      headers:{
        'Authorization':'Bearer ' + authSession.access_token,
        'Content-Type':'application/json',
        'x-device-id':window.ZymataMobileSupabase.getDeviceId()
      },
      body:JSON.stringify({
        paymentType:options.paymentType,
        siswaId:siswaId,
        referenceId:options.referenceId || null,
        amount:options.amount || null
      })
    });
    var data = await response.json().catch(function(){ return {}; });
    if(!response.ok || !data.ok) {
      if(data && data.code === 'QRIS_CHANNEL_INACTIVE') throw new Error('QRIS sandbox belum diaktifkan di akun DOKU. Aktifkan kanal QRIS pada DOKU Back Office.');
      throw new Error((data && data.error) || ('Gagal menyiapkan pembayaran ('+response.status+').'));
    }
    var checkoutUrl = data && data.transaction && data.transaction.checkout_url;
    if(!waliDokuCheckoutUrlAllowed(checkoutUrl)) throw new Error('URL Checkout DOKU tidak valid.');
    if(typeof window.loadJokulCheckout !== 'function') throw new Error('Komponen DOKU Checkout gagal dimuat. Periksa koneksi internet.');
    window.loadJokulCheckout(checkoutUrl);
    waliShowSaveOk('DOKU Checkout dibuka. Selesaikan pembayaran melalui QRIS.');
  } catch(error) {
    waliShowSaveError(error && error.message ? error.message : String(error));
  } finally {
    dokuPaymentBusy = false;
    if(button && button.isConnected){ button.disabled=false; button.textContent=oldText; button.removeAttribute('aria-busy'); }
  }
}

function renderWaliSppPayableList(rows){
  rows = (Array.isArray(rows) ? rows : []).filter(function(row){
    return row && row._zymata_source === 'tagihan_spp' && !waliSppLunas(row) && Number(row.nominal || 0) >= 1000 && row.id;
  });
  if(!rows.length) return '';
  var lockIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
  return '<section class="section spp-payment-section"><div class="spp-pay-head"><div><span class="card-label">Pembayaran SPP</span><h3>Tagihan yang belum lunas</h3><p>Pilih tagihan lalu selesaikan melalui QRIS.</p></div><span class="status-pill orange">'+rows.length+' aktif</span></div>'
    + '<div class="spp-pay-list">' + rows.map(function(row){
      var title = (row.keterangan || row.deskripsi || ('SPP '+(row.bulan||'')+' '+(row.tahun||''))).trim();
      var due = waliSppJatuhTempo(row) || '-';
      return '<article class="spp-pay-item">'
        + '<div class="spp-pay-main"><span class="spp-pay-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg></span>'
        + '<div class="spp-pay-copy"><strong>'+waliPaymentEsc(title)+'</strong><span>Jatuh tempo '+waliPaymentEsc(due)+'</span></div>'
        + '<span class="spp-pay-status">Belum lunas</span></div>'
        + '<div class="spp-pay-total"><span>Total pembayaran</span><b>Rp '+Number(row.nominal||0).toLocaleString('id-ID')+'</b></div>'
        + (QRIS_PAYMENT_ENABLED
          ? '<button type="button" class="payment-primary-button" data-doku-spp="'+waliPaymentEsc(row.id)+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3"/></svg><span>Bayar dengan QRIS</span></button>'
          : '<button type="button" class="payment-primary-button is-locked" disabled aria-disabled="true">'+lockIcon+'<span>QRIS dalam proses aktivasi</span></button>')
        + '<div class="payment-security-note">'+lockIcon+'<span>'+(QRIS_PAYMENT_ENABLED?'Diproses aman oleh DOKU':'Pendaftaran merchant DOKU sedang berlangsung')+'</span></div>'
        + '</article>';
    }).join('') + '</div></section>';
}

function renderInfaqSubuhWali(detail) {
  var amount = Number(appState.infaqAmount || 10000);
  if(!isFinite(amount) || amount < 1000) amount = 10000;
  var choices = [2000, 5000, 10000, 20000];
  var choiceHtml = choices.map(function(value){
    var active = amount === value;
    return '<button type="button" class="infaq-amount'+(active?' is-active':'')+'" data-infaq-amount="'+value+'">Rp'+Number(value).toLocaleString('id-ID')+'</button>';
  }).join('');
  var paymentRows = ((appState.supabaseModules && appState.supabaseModules.payments) || []).filter(function(row){
    return row && row.payment_type === 'infaq_subuh' && String(row.siswa_id || '') === String((window.__zymataWaliCtx && window.__zymataWaliCtx.siswa && window.__zymataWaliCtx.siswa.id) || appState.activeChildId || '');
  });
  var preview = appState.infaqPreviewOpen ? `
    <section class="section infaq-checkout-preview" aria-live="polite">
      <div class="infaq-checkout-head">
        <div>
          <span class="card-label">DOKU Checkout · Sandbox</span>
          <h3>Ringkasan pembayaran</h3>
        </div>
        <span class="status-pill orange">Sandbox</span>
      </div>
      <div class="infaq-checkout-row"><span>Tujuan</span><strong>Infaq Subuh</strong></div>
      <div class="infaq-checkout-row"><span>Atas nama</span><strong>${childProfile.fullName || appState.childName || 'Wali murid'}</strong></div>
      <div class="infaq-checkout-row total"><span>Total</span><strong>Rp ${amount.toLocaleString('id-ID')}</strong></div>
      <div class="infaq-doku-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01"/><circle cx="12" cy="12" r="9"/></svg>
        <span>DOKU akan membuat transaksi sandbox dan menampilkan QRIS pada popup Checkout resmi. Pembayaran ini tidak memengaruhi tagihan SPP.</span>
      </div>
      ${QRIS_PAYMENT_ENABLED
        ? '<button type="button" class="payment-primary-button" data-action="startDokuInfaq"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3"/></svg><span>Bayar dengan QRIS</span></button>'
        : '<button type="button" class="payment-primary-button is-locked" disabled aria-disabled="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>QRIS dalam proses aktivasi</span></button>'}
      <div class="payment-security-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>Checkout aman melalui DOKU</span></div>
      <button type="button" class="infaq-secondary" data-action="closeInfaqPreview">Ubah nominal</button>
    </section>` : '';
  return `
    <style>
      .infaq-hero{margin:0 0 14px;padding:18px;border-radius:16px;background:#fff;border:1px solid #e8edf3;display:flex;align-items:center;gap:14px;box-shadow:0 8px 24px rgba(15,23,42,.05)}
      .infaq-hero-icon{width:48px;height:48px;border-radius:14px;background:#ecfdf5;color:#047857;display:flex;align-items:center;justify-content:center;flex:none}.infaq-hero-icon svg{width:25px;height:25px}
      .infaq-hero h3{margin:0 0 3px;font-size:15px;color:#172033}.infaq-hero p{margin:0;color:#64748b;font-size:12px;line-height:1.5}
      .infaq-panel{background:#fff;border:1px solid #e8edf3;border-radius:16px;padding:16px;box-shadow:0 8px 24px rgba(15,23,42,.05)}
      .infaq-panel-title{margin:0 0 4px;font-size:14px;color:#172033}.infaq-panel-copy{margin:0 0 14px;font-size:12px;color:#64748b;line-height:1.5}
      .infaq-amount-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.infaq-amount{min-height:44px;border:1px solid #dce3eb;background:#fff;border-radius:10px;color:#334155;font:700 13px/1 inherit;cursor:pointer}.infaq-amount.is-active{border-color:#f97316;background:#fff7ed;color:#c2410c;box-shadow:0 0 0 2px rgba(249,115,22,.1)}
      .infaq-custom-wrap{margin-top:12px}.infaq-custom-wrap label{display:block;font-size:11px;font-weight:800;color:#64748b;margin-bottom:6px;text-transform:uppercase}.infaq-custom{width:100%;height:46px;border:1px solid #dce3eb;border-radius:10px;padding:0 13px;font:700 14px/1 inherit;color:#172033;background:#fff}
      .infaq-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid #eef2f6}.infaq-summary span{font-size:12px;color:#64748b}.infaq-summary strong{font-size:19px;color:#172033}
      .infaq-safe{display:flex;align-items:flex-start;gap:8px;margin:10px 2px 0;color:#64748b;font-size:11px;line-height:1.45}.infaq-safe svg{width:15px;height:15px;flex:none;margin-top:1px;color:#059669}
      .infaq-checkout-preview{background:#fff;border:1px solid #fed7aa;border-radius:16px;padding:17px;box-shadow:0 10px 28px rgba(15,23,42,.07)}.infaq-checkout-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px}.infaq-checkout-head h3{margin:4px 0 0;font-size:16px;color:#172033}.infaq-checkout-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #eef2f6;font-size:12px}.infaq-checkout-row span{color:#64748b}.infaq-checkout-row strong{text-align:right;color:#172033}.infaq-checkout-row.total{border-bottom:0;padding-top:14px}.infaq-checkout-row.total strong{font-size:19px;color:#c2410c}
      .infaq-doku-note{display:flex;gap:9px;margin:10px 0 14px;padding:11px;border-radius:10px;background:#fff7ed;color:#9a3412;font-size:11px;line-height:1.45}.infaq-doku-note svg{width:17px;height:17px;flex:none}.infaq-secondary{width:100%;height:42px;border:1px solid #dce3eb;border-radius:10px;background:#fff;color:#334155;font:700 13px/1 inherit;cursor:pointer;margin-top:9px}
      .wali-fin-action{width:100%;font-family:inherit;color:inherit}
    </style>
    ${moduleIntro(detail, moduleParentTab('infaq-subuh'))}
    <section class="section">
      <div class="infaq-hero">
        <span class="infaq-hero-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></span>
        <div><h3>Infaq ringan, tanpa kewajiban</h3><p>Nominal dipilih wali dan tidak memengaruhi tagihan SPP maupun saldo tabungan.</p></div>
      </div>
      <div class="infaq-panel">
        <h3 class="infaq-panel-title">Pilih nominal infaq</h3>
        <p class="infaq-panel-copy">Pembayaran diproses melalui QRIS DOKU Checkout sandbox.</p>
        <div class="infaq-amount-grid">${choiceHtml}</div>
        <div class="infaq-custom-wrap"><label for="infaqCustomAmount">Nominal lainnya</label><input id="infaqCustomAmount" class="infaq-custom" data-infaq-custom type="number" min="1000" step="1000" inputmode="numeric" placeholder="Masukkan nominal" value="${choices.indexOf(amount) < 0 ? amount : ''}"></div>
        <div class="infaq-summary"><span>Total infaq</span><strong>Rp ${amount.toLocaleString('id-ID')}</strong></div>
        ${QRIS_PAYMENT_ENABLED
          ? '<button type="button" class="payment-primary-button payment-preview-button" data-action="previewInfaqCheckout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg><span>Lanjut ke pembayaran</span></button>'
          : '<button type="button" class="payment-primary-button is-locked" disabled aria-disabled="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>QRIS dalam proses aktivasi</span></button>'}
        <div class="infaq-safe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>${QRIS_PAYMENT_ENABLED?'Kredensial DOKU tetap berada di server. Aplikasi hanya menerima URL Checkout yang aman.':'Pembayaran akan dibuka setelah proses pendaftaran DOKU selesai.'}</span></div>
      </div>
    </section>
    ${preview}
    ${renderWaliRiwayatList('Infaq Subuh', paymentRows, function(row){ return row.paid_at || row.created_at || ''; }, function(row){
      var status = String(row.status || 'pending').toLowerCase();
      var label = status === 'paid' ? 'Berhasil' : status === 'pending' ? 'Menunggu' : status === 'expired' ? 'Kedaluwarsa' : status === 'cancelled' ? 'Dibatalkan' : 'Gagal';
      var tone = status === 'paid' ? 'green' : status === 'pending' ? 'orange' : 'red';
      return { time:String(row.paid_at || row.created_at || '').slice(0,10) || '-', title:'Infaq Subuh - Rp'+Number(row.amount||0).toLocaleString('id-ID'), meta:'DOKU Checkout · '+String(row.invoice_number||'-'), status:label, tone:tone };
    }, 'Belum ada riwayat infaq', 'Infaq yang diproses melalui DOKU akan tampil di sini.')}
  `;
}

function renderModule(moduleId) {
  const detail = moduleDetails[moduleId];
  if (!detail) return renderAcademic();
  if (moduleId === 'jadwal-anak') return renderJadwalAnak(detail);
  if (moduleId === 'mutabaah-tahfidz') return renderMutabaahTahfidzWaliModule(detail);
  if (moduleId === 'calistung-anak') return window.renderCalistungWaliModule(detail); // [CALISTUNG WALI]
  if (moduleId === 'program-kegiatan') return renderProgramKegiatanWali(detail);
  if (moduleId === 'infaq-subuh') return renderInfaqSubuhWali(detail);
  if (moduleId === 'nilai-anak') return renderNilaiAnak(detail, appState.supabaseModules && appState.supabaseModules.nilai);
  if (moduleId === 'catatan-anak') return renderCatatanAnak(detail, appState.supabaseModules && appState.supabaseModules.catatan);
  const dataKey = waliModuleDataKey(moduleId);
  // Modul write wali (form input) tidak boleh ke-render read-only/empty generic; harus jatuh ke blok custom yang punya form.
  var __waliWriteModules = ['surat-wali','mutabaah-rumah'];
  var __isWaliWrite = __waliWriteModules.indexOf(moduleId) !== -1;
  if (appState.syncMode === 'supabase-live' && dataKey && moduleId !== 'keuangan' && moduleId !== 'perkembangan-anak' && !__isWaliWrite) return renderSupabaseWaliDataModule(detail, appState.supabaseModules && appState.supabaseModules[dataKey]);
  if (appState.syncMode === 'supabase-empty' && !__isWaliWrite) return renderSupabaseEmptyWaliModule(detail);

  if (moduleId === 'absensi-anak') {
    var _sm = appState.supabaseModules || {};
    var absRows = Array.isArray(_sm.absensi) ? _sm.absensi.slice() : [];
    function _absSt(r){ return String(r.status||r.kehadiran||r.keterangan||'').toLowerCase(); }
    function _absDate(r){ return String(r.tanggal||r.tgl||r.waktu||r.created_at||'').slice(0,10); }
    absRows.sort(function(a,b){ return String(_absDate(b)).localeCompare(String(_absDate(a))); });
    var rk = appState.waliAbsRekap || { hadir:0, izin:0, sakit:0, alpa:0, total:0 };
    var att = appState.todayAttendance;
    var attLabel = getAttendanceStatusLabel(att);
    var attTone = getAttendanceTone(att);
    // [RIWAYAT BULAN] Riwayat kehadiran disaring bulan dulu, baru tanggal.
    var _absDates = [], _absSeen = {};
    absRows.forEach(function(r){ var d=_absDate(r); if(d && !_absSeen[d]){ _absSeen[d]=1; _absDates.push(d); } });
    _absDates.sort().reverse();
    var _uiA = waliRiwayatFilterBulanUI('Absensi Anak', _absDates);
    var _absSetBulan = {};
    (_uiA.tglBulan || []).forEach(function(d){ _absSetBulan[d] = 1; });
    var _absPilih = absRows.filter(function(r){ return !!_absSetBulan[_absDate(r)]; });
    return `
      ${moduleIntro(detail, moduleParentTab(moduleId))}
      <section class="section">
        <article class="db-ready-card">
          <span class="status-pill ${attTone}">${attLabel}</span>
          <h3 class="card-title">Status kehadiran hari ini: ${attLabel}</h3>
          <p class="card-meta">Rekap kehadiran anak diambil langsung dari data sekolah di Supabase.</p>
          <div class="field-chip-row">
            <span class="field-chip">Hadir ${rk.hadir}</span>
            <span class="field-chip">Izin ${rk.izin}</span>
            <span class="field-chip">Sakit ${rk.sakit}</span>
            <span class="field-chip">Alpa ${rk.alpa}</span>
          </div>
        </article>
      </section>
      <section class="section">
        ${sectionHead('Rekap kehadiran', rk.total ? rk.total + ' hari tercatat' : 'Belum ada data')}
        <article class="input-panel">
          <div class="form-preview-grid single">
            ${fieldPreview('Kehadiran', appState.homeAttendanceRate + '%')}
            ${fieldPreview('Total hadir', rk.hadir + ' hari')}
            ${fieldPreview('Izin / Sakit', rk.izin + ' / ' + rk.sakit)}
          </div>
        </article>
      </section>
      <section class="section">
        ${sectionHead('Riwayat kehadiran', _absDates.length ? (_absPilih.length + ' data \u00b7 ' + (_uiA.tglBulan||[]).length + ' tanggal di ' + waliLabelBulan(_uiA.bulan)) : 'Belum ada data')}
        ${_uiA.html}
        <div class="timeline">
          ${_absPilih.length
            ? _absPilih.map(function(r){
                var st = _absSt(r);
                var tone = /hadir|masuk/.test(st) ? 'green' : (/izin/.test(st) ? 'blue' : (/sakit/.test(st) ? 'gold' : 'red'));
                var label = /hadir|masuk/.test(st) ? 'Hadir' : (/izin/.test(st) ? 'Izin' : (/sakit/.test(st) ? 'Sakit' : (/alpa|alfa|tanpa|bolos/.test(st) ? 'Alpa' : (r.status||'-'))));
                return scheduleCard({
                  time: (_absDate(r) ? waliRiwayatFormatTanggal(_absDate(r)) : '-'),
                  title: label + (r.mapel ? ' \u00b7 ' + r.mapel : ''),
                  meta: r.keterangan || r.catatan || '',
                  status: label,
                  tone: tone
                });
              }).join('')
            : scheduleCard({ time: 'Info', title: (_absDates.length ? 'Tidak ada absensi pada bulan ini' : 'Belum ada data absensi'), meta: (_absDates.length ? 'Pilih bulan lain di atas.' : 'Data kehadiran akan muncul setelah sekolah input absensi.'), status: 'Kosong', tone: 'blue' })
          }
        </div>
      </section>
    `;
  }

  if (moduleId === 'perkembangan-anak') {
    // Ambil data real dari Supabase
    const sm = appState.supabaseModules || {};
    /* [DIBERSIHKAN] Dulu di sini ada `hafalanRows = []` dan `membacaRows = []` (array
       kosong literal) plus `sorotanHafalan`/`sorotanMembaca` yang dihitung dari keduanya.
       Keempatnya buntu: kartu "Sorotan perkembangan" di bawah hanya menampilkan Ibadah,
       Karakter, dan Prestasi, jadi kedua sorotan itu dihitung lalu dibuang. Ikut dihapus
       dari `anySorotan` karena `[].length` selalu 0 — nilainya tidak berubah.
       Tabel `hafalan` & `membaca_quran` juga sudah tidak ditarik saat hydrate. */
    const ibadahRows = Array.isArray(sm.ibadah) ? sm.ibadah : [];
    const karakterRows = Array.isArray(sm.karakter) ? sm.karakter : [];
    const prestasiRows = Array.isArray(sm.prestasi) ? sm.prestasi : [];
    // Sorotan paling baru per area
    function latest(arr, fmtFn){
      if(!arr.length) return '-';
      const r = arr.slice().sort(function(a,b){ return String(b.tanggal||b.tgl||b.waktu||'').localeCompare(String(a.tanggal||a.tgl||a.waktu||'')); })[0];
      try { return fmtFn(r) || '-'; } catch(_) { return '-'; }
    }
    const sorotanIbadah = latest(ibadahRows, r => (r.bulan ? r.bulan + ' ' : '') + 'Shalat ' + (r.shalat || 0) + ', Sunnah ' + (r.sunnah || 0) + ', Puasa ' + (r.puasa || 0) + ', Sedekah ' + (r.sedekah || 0) + (r.catatan ? ' (' + r.catatan + ')' : ''));
    const sorotanKarakter = latest(karakterRows, r => { var s = [r.disiplin,r.sopan,r.jujur,r.kerja_keras,r.tanggung_jawab].filter(Boolean); return s.length ? (r.semester ? r.semester + ' - ' : '') + 'Disiplin: ' + s.join(', ') : (r.nilai ? 'Nilai ' + r.nilai : '-'); });
    const sorotanPrestasi = latest(prestasiRows, r => (r.lomba || r.prestasi || '') + (r.peringkat ? ' (Juara ' + r.peringkat + ')' : ''));
    const pelanggaranRows = Array.isArray(sm.pelanggaran) ? sm.pelanggaran : [];
    const ekskulRows = Array.isArray(sm.ekskul) ? sm.ekskul : [];
    var _v = function(x){ return (x === undefined || x === null || String(x).trim() === '') ? '-' : x; };
    var _date = function(r){ return _v(r.tanggal || r.tgl || r.waktu || r.created_at || ''); };
    var devTable = function(cols, rows, rowFn){
      var head = '<tr>' + cols.map(function(c){ return '<th>' + c + '</th>'; }).join('') + '</tr>';
      var body = rows.map(function(r){
        return '<tr>' + rowFn(r).map(function(c){ return '<td>' + _v(c) + '</td>'; }).join('') + '</tr>';
      }).join('');
      return '<div class="dev-table-wrap"><table class="dev-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
    };
    var sec = function(title, meta, tableHtml){ return '<section class="section">' + sectionHead(title, meta) + tableHtml + '</section>'; };
    if(!appState.perkembanganLimit) appState.perkembanganLimit = {};
    if(!appState.perkembanganMonth) appState.perkembanganMonth = {};
    var ensurePerkStyles = function(){
      if(document.getElementById('perk-pro-styles')) return;
      var st = document.createElement('style');
      st.id = 'perk-pro-styles';
      st.textContent = '.perk-toolbar{display:flex;align-items:center;gap:8px;margin:2px 0 12px}.perk-toolbar__label{font-size:12px;font-weight:800;color:#64748b;letter-spacing:.02em}.perk-select{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px;font-size:13px;font-weight:700;color:#0f172a;box-shadow:0 1px 2px rgba(15,23,42,.04);flex:1}.perk-group{border:1px solid #eef2f7;border-radius:14px;background:#fff;margin-bottom:10px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.05)}.perk-group>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;font-weight:800;color:#0f172a;-webkit-tap-highlight-color:transparent}.perk-group>summary::-webkit-details-marker{display:none}.perk-group__left{display:flex;align-items:center;gap:10px;min-width:0}.perk-group__dot{width:8px;height:8px;border-radius:50%;background:#6366f1;flex:none}.perk-group__right{display:flex;align-items:center;gap:8px;flex:none}.perk-group__count{font-size:11px;font-weight:800;color:#4f46e5;background:#eef2ff;border-radius:999px;padding:2px 9px;white-space:nowrap}.perk-group__chev{transition:transform .2s ease;color:#94a3b8;flex:none}.perk-group[open]>summary .perk-group__chev{transform:rotate(180deg)}.perk-group__body{padding:0 14px 12px}.perk-more{width:100%;margin-top:6px;padding:11px;border:1px dashed #c7d2fe;background:#f8faff;color:#4f46e5;font-weight:800;font-size:13px;border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}.perk-more:active{transform:scale(.99)}';
      (document.head || document.documentElement).appendChild(st);
    };
    ensurePerkStyles();
    var __MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    var __CHEV = '<svg class="perk-group__chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
    var __CHEV_DOWN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
    var perkMonthKey = function(r, dateFn){
      var s = String((dateFn ? dateFn(r) : '') || '').trim();
      if(!s) return '';
      var mm = s.match(/(\d{4})-(\d{2})/);
      if(mm) return mm[1] + '-' + mm[2];
      var d = Date.parse(s);
      if(!isNaN(d)){ var dt = new Date(d); return dt.getFullYear() + '-' + ('0' + (dt.getMonth()+1)).slice(-2); }
      return '';
    };
    var perkMonthLabel = function(key){ if(!key) return 'Tanpa tanggal'; var p = String(key).split('-'); return (__MONTHS_ID[parseInt(p[1],10)-1] || key) + ' ' + p[0]; };
    var perkMoreBtnHtml = function(catKey, remaining){ return remaining > 0 ? '<button type="button" class="perk-more" data-perk-more="' + catKey + '">' + __CHEV_DOWN + ' Muat 10 lagi (' + remaining + ' tersisa)</button>' : ''; };
    var perkCatMonthly = function(catKey, title, unitLabel, cols, allRows, rowFn, dateFn){
      var rows = allRows.slice().sort(function(a,b){ return String((dateFn?dateFn(b):'')||'').localeCompare(String((dateFn?dateFn(a):'')||'')); });
      var monthsSeen = [];
      rows.forEach(function(r){ var k = perkMonthKey(r, dateFn); if(monthsSeen.indexOf(k) === -1) monthsSeen.push(k); });
      var realMonths = monthsSeen.filter(function(k){ return !!k; });
      var sel = (appState.perkembanganMonth[catKey]) || 'all';
      if(sel !== 'all' && monthsSeen.indexOf(sel) === -1) sel = 'all';
      var filtered = sel === 'all' ? rows : rows.filter(function(r){ return perkMonthKey(r, dateFn) === sel; });
      var limit = appState.perkembanganLimit[catKey] || 10;
      var visible = filtered.slice(0, limit);
      var groups = []; var gmap = {};
      visible.forEach(function(r){ var k = perkMonthKey(r, dateFn); if(!gmap[k]){ gmap[k] = { key:k, rows:[] }; groups.push(gmap[k]); } gmap[k].rows.push(r); });
      var opts = '<option value="all"' + (sel==='all'?' selected':'') + '>Semua bulan</option>' + realMonths.map(function(k){ return '<option value="' + k + '"' + (sel===k?' selected':'') + '>' + perkMonthLabel(k) + '</option>'; }).join('');
      var filterHtml = (realMonths.length > 1) ? '<div class="perk-toolbar"><span class="perk-toolbar__label">Bulan</span><select class="perk-select" data-select="perk-month" data-perk-cat="' + catKey + '">' + opts + '</select></div>' : '';
      var groupsHtml = groups.map(function(g){
        return '<details class="perk-group" open>'
          + '<summary><span class="perk-group__left"><span class="perk-group__dot"></span>' + perkMonthLabel(g.key) + '</span><span class="perk-group__right"><span class="perk-group__count">' + g.rows.length + ' ' + unitLabel + '</span>' + __CHEV + '</span></summary>'
          + '<div class="perk-group__body">' + devTable(cols, g.rows, rowFn) + '</div></details>';
      }).join('');
      return '<section class="section" data-perk-section="' + catKey + '">' + sectionHead(title, allRows.length + ' ' + unitLabel) + filterHtml + groupsHtml + perkMoreBtnHtml(catKey, filtered.length - limit) + '</section>';
    };
    var perkCatSimple = function(catKey, title, unitLabel, cols, allRows, rowFn){
      var limit = appState.perkembanganLimit[catKey] || 10;
      var visible = allRows.slice(0, limit);
      return '<section class="section" data-perk-section="' + catKey + '">' + sectionHead(title, allRows.length + ' ' + unitLabel) + devTable(cols, visible, rowFn) + perkMoreBtnHtml(catKey, allRows.length - limit) + '</section>';
    };
    var anySorotan = !!(ibadahRows.length || karakterRows.length || prestasiRows.length);
    var anyData = anySorotan || pelanggaranRows.length || ekskulRows.length;
    if (!anyData) {
      return `
        ${moduleIntro(detail, moduleParentTab(moduleId))}
        <section class="section">
          <article class="db-ready-card">
            <span class="status-pill green">Belum ada catatan</span>
            <h3 class="card-title">Belum ada catatan perkembangan</h3>
            <p class="card-meta">Catatan ibadah, karakter, prestasi, dan kegiatan anak akan tampil di sini setelah sekolah mengisinya. \u2728</p>
          </article>
        </section>
      `;
    }
    return `
      ${moduleIntro(detail, moduleParentTab(moduleId))}
      ${anySorotan ? `<section class="section">
        ${sectionHead('Sorotan perkembangan', 'Terbaru')}
        <article class="input-panel">
          <div class="form-preview-grid">
            ${fieldPreview('Ibadah', sorotanIbadah)}
            ${fieldPreview('Karakter', sorotanKarakter)}
            ${fieldPreview('Prestasi', sorotanPrestasi)}
          </div>
        </article>
      </section>` : ''}
      ${ibadahRows.length ? perkCatMonthly('ibadah','Ibadah','entri',['Periode','Shalat','Sunnah','Puasa','Sedekah','Catatan'], ibadahRows, function(r){ return [ _v(r.bulan || _date(r)), r.shalat, r.sunnah, r.puasa, r.sedekah, r.catatan ]; }, function(r){ return r.tanggal || r.tgl || r.created_at || r.bulan || ''; }) : ''}
      ${karakterRows.length ? perkCatSimple('karakter','Karakter','entri',['Periode','Disiplin','Sopan','Jujur','Kerja sama','Tg. jawab'], karakterRows, function(r){ return [ _v(r.semester || _date(r)), r.disiplin, r.sopan, r.jujur, r.kerja_keras, r.tanggung_jawab ]; }) : ''}
      ${prestasiRows.length ? perkCatMonthly('prestasi','Prestasi','entri',['Tanggal','Lomba','Jenis','Tingkat','Peringkat'], prestasiRows, function(r){ return [ _v(r.tanggal || r.tahun), (r.lomba || r.prestasi), r.jenis, r.tingkat, (r.peringkat ? 'Juara ' + r.peringkat : '') ]; }, function(r){ return r.tanggal || r.tahun || r.created_at || ''; }) : ''}
      ${pelanggaranRows.length ? perkCatMonthly('pelanggaran','Pelanggaran','entri',['Tanggal','Pelanggaran','Poin','Tindak lanjut','Status'], pelanggaranRows, function(r){ return [ _date(r), (r.pelanggaran || r.jenis), r.poin, (r.tindak_lanjut || r.catatan), r.status ]; }, function(r){ return r.tanggal || r.tgl || r.waktu || r.created_at || ''; }) : ''}
      ${ekskulRows.length ? perkCatSimple('ekskul','Ekstrakurikuler','kegiatan',['Nama','Pembina','Jadwal','Tempat','Status'], ekskulRows, function(r){ return [ (r.nama || r.kegiatan || r.ekskul), r.pembina, r.jadwal, r.tempat, r.status ]; }) : ''}
    `;
  }

  if (moduleId === 'mutabaah-rumah') {
    if (appState.syncMode === 'supabase-live' && dataKey) return renderSupabaseWaliFormModule(detail, appState.supabaseModules && appState.supabaseModules[dataKey], moduleId, 'wali:mutabaah-rumah');
    return `
      ${moduleIntro(detail, moduleParentTab(moduleId))}
      <section class="section">
        <article class="db-ready-card">
          <span class="status-pill green">Rutinitas terbentuk</span>
          <h3 class="card-title">Input rumah dibuat singkat agar konsisten terisi</h3>
          <p class="card-meta">Fokusnya bukan form panjang, tapi ringkasan kebiasaan yang paling bermakna untuk guru dan orang tua.</p>
        </article>
      </section>
      ${renderModuleForm('wali:mutabaah-rumah')}
      <section class="section">
        ${sectionHead('Progress pekan ini', 'Detail')}
        <div class="timeline">
          ${detail.focus.map(scheduleCard).join('')}
        </div>
      </section>
    `;
  }

  if (moduleId === 'keuangan' || moduleId === 'keuangan-spp' || moduleId === 'keuangan-tabungan' || moduleId === 'keuangan-umum') {
    // Utamakan data Supabase (sudah difilter per anak); fallback ke localStorage
    var _smK = appState.supabaseModules || {};
    var tagihanList = Array.isArray(_smK.keuangan) ? _smK.keuangan.slice() : [];
    var tabData = Array.isArray(_smK.tabungan) ? _smK.tabungan.slice() : [];
    if(!tagihanList.length){ try { var rawTag = localStorage.getItem('zymata_tagihan_spp_v1'); if(rawTag){ var aTg = JSON.parse(rawTag); if(Array.isArray(aTg)) tagihanList = aTg; } } catch(e){} }
    if(!tabData.length){ try { var rawTab = localStorage.getItem('sdplus_tabungan_v1'); if(rawTab){ var aTb = JSON.parse(rawTab); if(Array.isArray(aTb)) tabData = aTb; } } catch(e){} }
    var tabUmumData = Array.isArray(_smK.tabunganUmum) ? _smK.tabunganUmum.slice() : [];
    if(!tabUmumData.length){ try { var rawTU = localStorage.getItem('sdplus_tabungan_umum_v1'); if(rawTU){ var aTU = JSON.parse(rawTU); if(Array.isArray(aTU)) tabUmumData = aTU; } } catch(e){} }
    // Filter per anak: KUNCI utama pakai NIS/siswa_id; nama hanya cadangan bila baris tak punya NIS.
    var anakNama = String(appState.childName || '').toLowerCase();
    var anakNis = String(appState.childNis || '').trim();
    function _milikAnak(t){
      var rowNis = String(t.nis || t.nis_siswa || t.snapshot_nis || '').trim();
      var nm = String(t.nama_siswa || t.namaSiswa || t.nama || '').toLowerCase();
      var nameMatch = (anakNama && anakNama !== 'belum terhubung') ? (nm ? (nm.indexOf(anakNama) >= 0) : true) : true;
      // NIS beda TIDAK langsung ditolak: data tagihan/keuangan bisa menyimpan NIS berbeda
      // dari profil anak (mis. SPP KHODIJAH). Terima bila NIS cocok ATAU nama cocok; tolak
      // hanya bila NIS beda DAN nama juga tak cocok (tetap cegah bocor data siswa lain).
      if(anakNis && rowNis){ if(rowNis === anakNis) return true; return nameMatch && !!nm; }
      return nameMatch;
    }
    var tagihanAnak = tagihanList.filter(_milikAnak);
    var tabAnak = tabData.filter(_milikAnak).map(function(t){
      var deb=Number(t.debit||0), kre=Number(t.kredit||0);
      var nominal=Number(t.nominal||0) || (deb||kre);
      var jenis=t.jenis || (deb>0?'Setor':(kre>0?'Tarik':''));
      return { jenis:jenis, nominal:nominal, debit:deb, kredit:kre, tanggal:t.tanggal||t.tgl||'-', keterangan:t.keterangan||'', petugas:t.petugas||'' };
    });
    var tabUmumAnak = tabUmumData.filter(_milikAnak).map(function(t){
      var deb=Number(t.debit||0), kre=Number(t.kredit||0);
      var nominal=Number(t.nominal||0) || (deb||kre);
      var jenis=t.jenis || (deb>0?'Setoran':(kre>0?'Penarikan':''));
      return { jenis:jenis, nominal:nominal, debit:deb, kredit:kre, tanggal:t.tanggal||t.tgl||'-', keterangan:t.keterangan||'', petugas:t.petugas||'', metode:t.metode||'' };
    });
    var setorUmum=0, tarikUmum=0;
    tabUmumAnak.forEach(function(t){ if(t.debit||t.kredit){ setorUmum+=Number(t.debit||0); tarikUmum+=Number(t.kredit||0); } else { var n=Number(t.nominal||0); if(/setor|masuk/i.test(t.jenis||'')) setorUmum+=n; else tarikUmum+=n; } });
    var saldoUmum = setorUmum - tarikUmum;
    var belumBayar = tagihanAnak.filter(function(t){ return !waliSppLunas(t); });
    var totalTagihan = belumBayar.reduce(function(s,t){ return s + Number(t.nominal||0); }, 0);
    var setorTab = 0, tarikTab = 0;
    tabAnak.forEach(function(t){ if(t.debit||t.kredit){ setorTab+=Number(t.debit||0); tarikTab+=Number(t.kredit||0); } else { var n=Number(t.nominal||0); if(/setor|masuk/i.test(t.jenis||'')) setorTab+=n; else tarikTab+=n; } });
    var saldoTab = setorTab - tarikTab;
    var jatuhTempo = belumBayar.length ? (waliSppJatuhTempo(belumBayar[0]) || '-') : '-';
    if (moduleId === 'keuangan-spp') {
      return `
        ${moduleIntro(detail, moduleParentTab(moduleId))}
        ${waliSppWarningBanner(belumBayar)}
        <section class="section">
          <div class="module-stat-grid" style="grid-template-columns:1fr 1fr;">
            ${statCard('Tagihan SPP', 'Rp ' + Number(totalTagihan).toLocaleString('id-ID'), belumBayar.length + ' belum lunas', totalTagihan > 0 ? 'orange' : 'green')}
            ${statCard('Jatuh Tempo', jatuhTempo, 'Tagihan terdekat', 'blue')}
          </div>
        </section>
        ${renderWaliSppPayableList(belumBayar)}
        ${renderWaliRiwayatList('Tagihan SPP', tagihanAnak, function(t){ return waliSppTanggal(t) || ''; }, function(t){
          var lunas = waliSppLunas(t);
          return { time: waliSppTanggal(t) || '-', title: (t.keterangan || t.deskripsi || 'SPP') + ' - Rp' + Number(t.nominal||0).toLocaleString('id-ID'), meta: (appState.childName || '') + (t.kelas ? ' \u00b7 ' + t.kelas : '') + (t.tahun_ajaran ? ' \u00b7 ' + t.tahun_ajaran : ''), status: lunas ? 'Lunas' : 'Belum', tone: lunas ? 'green' : 'orange' };
        }, 'Belum ada tagihan', 'Tagihan SPP akan muncul setelah diinput oleh sekolah.')}
      `;
    }
    if (moduleId === 'keuangan-tabungan') {
      return `
        ${moduleIntro(detail, moduleParentTab(moduleId))}
        <section class="section">
          <div class="module-stat-grid" style="grid-template-columns:1fr;">
            ${statCard('Saldo Tabungan', 'Rp ' + Number(saldoTab).toLocaleString('id-ID'), tabAnak.length + ' mutasi', 'green')}
          </div>
        </section>
        ${renderWaliRiwayatList('Mutasi Tabungan', tabAnak, function(t){ return t.tanggal || t.tgl || ''; }, function(t){
          var isIn = /setor|masuk/i.test(t.jenis||'');
          return { time: t.tanggal || t.tgl || '-', title: (isIn ? 'Setor' : 'Tarik') + ' Rp' + Number(t.nominal||0).toLocaleString('id-ID'), meta: (appState.childName || '') + (t.keterangan ? ' \u00b7 ' + t.keterangan : '') + (t.petugas ? ' \u00b7 ' + t.petugas : ''), status: isIn ? 'Setor' : 'Tarik', tone: isIn ? 'green' : 'red' };
        }, 'Belum ada mutasi', 'Data tabungan akan muncul setelah diinput oleh sekolah.')}
      `;
    }
    if (moduleId === 'keuangan-umum') {
      return `
        ${moduleIntro(detail, moduleParentTab(moduleId))}
        <section class="section">
          <div class="module-stat-grid" style="grid-template-columns:1fr;">
            ${statCard('Saldo Tabungan Umum', 'Rp ' + Number(saldoUmum).toLocaleString('id-ID'), tabUmumAnak.length + ' mutasi', 'green')}
          </div>
        </section>
        ${renderWaliRiwayatList('Tabungan Umum', tabUmumAnak, function(t){ return t.tanggal || t.tgl || ''; }, function(t){
          var isIn = /setor|masuk/i.test(t.jenis||'');
          return { time: t.tanggal || t.tgl || '-', title: (isIn ? 'Setoran' : 'Penarikan') + ' Rp' + Number(t.nominal||0).toLocaleString('id-ID'), meta: (appState.childName || '') + (t.metode ? ' \u00b7 ' + t.metode : '') + (t.keterangan ? ' \u00b7 ' + t.keterangan : '') + (t.petugas ? ' \u00b7 ' + t.petugas : ''), status: isIn ? 'Setoran' : 'Penarikan', tone: isIn ? 'green' : 'red' };
        }, 'Belum ada tabungan umum', 'Tabungan umum akan muncul setelah diinput oleh sekolah.')}
      `;
    }
    return `
      ${moduleIntro(detail, moduleParentTab(moduleId))}
      ${waliSppWarningBanner(belumBayar)}
      <section class="section">
        <div class="module-stat-grid" style="grid-template-columns:1fr 1fr;">
          ${statCard('Tagihan SPP', 'Rp ' + Number(totalTagihan).toLocaleString('id-ID'), belumBayar.length + ' belum lunas', totalTagihan > 0 ? 'orange' : 'green')}
          ${statCard('Jatuh Tempo', jatuhTempo, 'Tagihan terdekat', 'blue')}
        </div>
        <div class="module-stat-grid" style="grid-template-columns:1fr 1fr;">
          ${statCard('Saldo Tabungan', 'Rp ' + Number(saldoTab).toLocaleString('id-ID'), tabAnak.length + ' mutasi', 'green')}
          ${statCard('Total Tagihan', 'Rp ' + Number(totalTagihan).toLocaleString('id-ID'), tagihanAnak.length + ' item', totalTagihan > 0 ? 'orange' : 'green')}
        </div>
        <div class="module-stat-grid" style="grid-template-columns:1fr;">
          ${statCard('Saldo Tabungan Umum', 'Rp ' + Number(saldoUmum).toLocaleString('id-ID'), tabUmumAnak.length + ' mutasi', 'green')}
        </div>
      </section>
      <div id="fin-sec-spp">${renderWaliRiwayatList('Tagihan SPP', tagihanAnak, function(t){ return waliSppTanggal(t) || ''; }, function(t){
        var lunas = waliSppLunas(t);
        return {
          time: waliSppTanggal(t) || '-',
          title: (t.keterangan || t.deskripsi || 'SPP') + ' - Rp' + Number(t.nominal||0).toLocaleString('id-ID'),
          meta: (appState.childName || '') + (t.kelas ? ' · ' + t.kelas : '') + (t.tahun_ajaran ? ' · ' + t.tahun_ajaran : ''),
          status: lunas ? 'Lunas' : 'Belum',
          tone: lunas ? 'green' : 'orange'
        };
      }, 'Belum ada tagihan', 'Tagihan SPP akan muncul setelah diinput oleh sekolah.')}</div>
      <div id="fin-sec-tab">${renderWaliRiwayatList('Mutasi Tabungan', tabAnak, function(t){ return t.tanggal || t.tgl || ''; }, function(t){
        var isIn = /setor|masuk/i.test(t.jenis||'');
        return {
          time: t.tanggal || t.tgl || '-',
          title: (isIn ? 'Setor' : 'Tarik') + ' Rp' + Number(t.nominal||0).toLocaleString('id-ID'),
          meta: (appState.childName || '') + (t.keterangan ? ' · ' + t.keterangan : '') + (t.petugas ? ' · ' + t.petugas : ''),
          status: isIn ? 'Setor' : 'Tarik',
          tone: isIn ? 'green' : 'red'
        };
      }, 'Belum ada mutasi', 'Data tabungan akan muncul setelah diinput oleh sekolah.')}</div>
      <div id="fin-sec-umum">${renderWaliRiwayatList('Tabungan Umum', tabUmumAnak, function(t){ return t.tanggal || t.tgl || ''; }, function(t){
        var isIn = /setor|masuk/i.test(t.jenis||'');
        return {
          time: t.tanggal || t.tgl || '-',
          title: (isIn ? 'Setoran' : 'Penarikan') + ' Rp' + Number(t.nominal||0).toLocaleString('id-ID'),
          meta: (appState.childName || '') + (t.metode ? ' · ' + t.metode : '') + (t.keterangan ? ' · ' + t.keterangan : '') + (t.petugas ? ' · ' + t.petugas : ''),
          status: isIn ? 'Setoran' : 'Penarikan',
          tone: isIn ? 'green' : 'red'
        };
      }, 'Belum ada tabungan umum', 'Tabungan umum akan muncul setelah diinput oleh sekolah.')}</div>
    `;
  }

  if (moduleId === 'pengumuman-wali') {
    return `
      ${moduleIntro(detail, moduleParentTab(moduleId))}
      <section class="section">
        <article class="db-ready-card">
          <span class="status-pill blue">Viewer-only</span>
          <h3 class="card-title">Pengumuman sekolah dipisah dari pesan pribadi anak</h3>
          <p class="card-meta">Wali bisa baca cepat info umum sekolah tanpa tercampur dengan catatan akademik atau tindak lanjut anak.</p>
        </article>
      </section>
      <section class="section">
        ${sectionHead('Filter baca', 'Sederhana')}
        <article class="input-panel">
          <div class="segmented-row three">
            <button type="button" class="segment active">Semua</button>
            <button type="button" class="segment">Penting</button>
            <button type="button" class="segment">Akademik</button>
          </div>
          <div class="draft-note">Nanti bisa dipakai untuk filter kategori tanpa mengubah struktur visual dasar.</div>
        </article>
      </section>
      <section class="section">
        ${sectionHead('Daftar pengumuman', 'Terbaru')}
        <div class="timeline">
          ${detail.focus.map(scheduleCard).join('')}
        </div>
      </section>
    `;
  }

  if (moduleId === 'surat-wali') {
    var suratList = (appState.supabaseModules && appState.supabaseModules.surat) || [];
    var menunggu = 0, disetujui = 0, ditolak = 0;
    suratList.forEach(function(r){
      var st = String(r.status || '').toLowerCase();
      if (/setujui|disetuj|approved|terima/.test(st)) disetujui++;
      else if (/tolak|reject|ditolak/.test(st)) ditolak++;
      else menunggu++;
    });
    return `
      ${moduleIntro(detail, moduleParentTab(moduleId))}
      <section class="section">
        <article class="db-ready-card">
          <span class="status-pill blue">Pengajuan</span>
          <h3 class="card-title">Ajukan izin / surat untuk anak</h3>
          <p class="card-meta">Isi form di bawah untuk mengajukan izin, sakit, atau surat lain. Sekolah akan memproses dan status akan tampil di riwayat.</p>
        </article>
      </section>
      <section class="section">
        <div class="module-stat-grid" style="grid-template-columns:1fr 1fr 1fr;">
          ${statCard('Menunggu', menunggu, 'belum diproses', 'gold')}
          ${statCard('Disetujui', disetujui, 'sudah valid', 'green')}
          ${statCard('Ditolak', ditolak, 'butuh revisi', 'red')}
        </div>
      </section>
      ${renderModuleForm('wali:surat-wali')}
      ${renderWaliRiwayatList('Surat & Izin', suratList, function(r){ return r.tanggal || r.tgl_mulai || ''; }, function(r){
        var st = String(r.status || 'Menunggu');
        var tone = /setuj|approv|terima/i.test(st) ? 'green' : /tolak|reject/i.test(st) ? 'red' : 'gold';
        return {
          time: r.tanggal || r.tgl_mulai || '-',
          title: (r.jenis || 'Surat') + (r.perihal ? ' · ' + r.perihal : ''),
          meta: (r.isi || r.keterangan || 'Tanpa keterangan') + (r.tgl_selesai ? ' · s/d ' + r.tgl_selesai : ''),
          status: st,
          tone: tone
        };
      }, 'Belum ada pengajuan', 'Isi form di atas untuk membuat pengajuan pertama.')}
    `;
  }

  return `
    ${moduleIntro(detail, moduleParentTab(moduleId))}
    <section class="section">
      <article class="db-ready-card">
        <span class="status-pill blue">Ringkasan</span>
        <h3 class="card-title">Modul ini mengikuti bahasa visual role Guru</h3>
        <p class="card-meta">Yang dibedakan adalah isi dan prioritas informasi, bukan style dasar komponen.</p>
      </article>
    </section>
    <section class="section">
      ${sectionHead('Ringkasan modul', 'Detail')}
      <div class="timeline">
        ${detail.focus.map(scheduleCard).join('')}
      </div>
    </section>
  `;
}

function moduleParentTab(moduleId) {
  if (['keuangan', 'keuangan-spp', 'keuangan-tabungan', 'keuangan-umum', 'infaq-subuh'].includes(moduleId)) return 'more';
  if (['absensi-anak', 'nilai-anak', 'perkembangan-anak', 'catatan-anak', 'jadwal-anak'].includes(moduleId)) return 'academic';
  if (['mutabaah-rumah', 'mutabaah-tahfidz'].includes(moduleId)) return 'mutabaah';
  return 'more';
}

function moduleIntro(detail, backTarget) {
  return `
    <section class="section">
      <article class="module-detail-card">
        <button type="button" class="back-chip" data-action="${backTarget}">&#8249; Kembali</button>
        <span class="card-label">${detail.eyebrow}</span>
        <h3 class="module-detail-title">${detail.title}</h3>
        <p class="module-detail-copy">${detail.subtitle}</p>
        <div class="module-stat-grid" style="gap:14px;">
          ${detail.stats.map(([label, value], index) => statCard(label, value, 'ringkasan modul', index === 1 ? 'gold' : 'indigo')).join('')}
        </div>
      </article>
    </section>
  `;
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

function moduleShortcutCard(item) {
  return `
    <button type="button" class="guru-module-card" data-route="${item.route}">
      <span class="guru-module-icon">${item.icon}</span>
      <span class="guru-module-group">${item.group}</span>
      <h3 class="guru-module-title">${item.title}</h3>
      <p class="guru-module-meta">${item.meta}</p>
    </button>
  `;
}

function roleModuleCard(item) {
  return `
    <button type="button" class="guru-module-card" data-route="${item.route}">
      <span class="guru-module-icon">${item.icon}</span>
      <span class="guru-module-group">${item.group}</span>
      <h3 class="guru-module-title">${item.title}</h3>
      <p class="guru-module-meta">${item.meta}</p>
    </button>
  `;
}

function miniModuleCard(title, meta) {
  return `
    <article class="guru-module-card guru-module-card--static">
      <span class="guru-module-group">Perkembangan</span>
      <h3 class="guru-module-title">${title}</h3>
      <p class="guru-module-meta">${meta}</p>
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

function feedCard(item) {
  var timeStr = item.time || '';
  if(item.area && timeStr !== item.area && !timeStr.startsWith(item.area)) {
    timeStr = item.area + ' • ' + timeStr;
  }
  return `
    <article class="feed-card">
      <div class="feed-header">
        <span class="feed-time ${item.tone}">${timeStr}</span>
        ${item.status ? `<span class="feed-status ${item.tone}">${item.status}</span>` : ''}
      </div>
      <div class="feed-body">
        <h3 class="feed-title">${item.title}</h3>
        ${item.meta && item.meta !== '-' ? `<p class="feed-meta">${item.meta}</p>` : ''}
      </div>
    </article>
  `;
}


function sectionHead(title, action) {
  return `
    <div class="section-head">
      <h2 class="section-title">${title}</h2>
      <button type="button" class="section-link">${action}</button>
    </div>
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

function settingRow(title, meta, active, key = '') {
  const attr = key ? ` data-setting-toggle="${key}"` : '';
  return `
    <article class="setting-row"${attr}>
      <div>
        <h3 class="card-title">${title}</h3>
        <p class="card-meta">${meta}</p>
      </div>
      <span class="toggle${active ? ' on' : ''}"></span>
    </article>
  `;
}

function staticInfoRow(title, meta) {
  return `
    <article class="setting-row">
      <div>
        <h3 class="card-title">${title}</h3>
        <p class="card-meta">${meta}</p>
      </div>
    </article>
  `;
}

function renderFloating() {
  if (!appState.showAnnouncements) {
    floatingEl.hidden = true;
    floatingEl.innerHTML = '';
    return;
  }

  floatingEl.hidden = false;
  floatingEl.innerHTML = `
    <div class="floating-backdrop" data-action="closeAnnouncements"></div>
    <article class="announcement-popover" role="dialog" aria-label="Pengumuman terbaru">
      <div class="announcement-head">
        <div>
          <span class="card-label">Pengumuman</span>
          <h3 class="announcement-title">Info terbaru wali</h3>
        </div>
        <button type="button" class="close-chip" data-action="closeAnnouncements" aria-label="Tutup pengumuman">×</button>
      </div>
      <div class="announcement-list">
        ${announcements.slice(0, 5).map(announcementItem).join('')}
      </div>
      <p class="announcement-footnote">Maksimal 5 pengumuman. Catatan anak tetap tampil terpisah di area akademik.</p>
    </article>
  `;
}

function announcementItem(item) {
  /* [ISI PENGUMUMAN UTUH] CSS bawaan memotong isi jadi satu baris ber-elipsis.
     Paksa teks membungkus penuh supaya pengumuman terbaca semuanya. */
  const _wrapStyle = 'white-space:normal;overflow:visible;display:block;text-overflow:clip;-webkit-line-clamp:unset;word-break:break-word;line-height:1.45';
  return `
    <article class="announcement-item">
      <div class="announcement-time">${item.time}</div>
      <div class="announcement-copy" style="min-width:0">
        <h4 style="${_wrapStyle}">${item.title}</h4>
        <p style="${_wrapStyle}">${item.meta}</p>
      </div>
      <span class="status-pill ${item.tone}">${item.status}</span>
    </article>
  `;
}

function renderChatTab() {
  return '<div id="zchat-host" class="zchat-host"></div>';
}

function mountWaliChat() {
  if (!window.ZymataChat) return;
  var kelas = String(childProfile.className || appState.childClass || '').replace(/^kelas\s+/i, '').trim();
  var rooms = [];
  if (kelas && kelas !== '-') rooms.push({ key: kelas, label: 'Kelas ' + kelas });
  var ses = window.ZymataMobileSupabase ? window.ZymataMobileSupabase.readSession() : null;
  var user = {
    id: String((ses && (ses.id || ses.username)) || 'wali'),
    nama: (ses && ses.nama) || childProfile.wali || ('Wali ' + (childProfile.nickName || childProfile.fullName || '')),
    peran: 'wali'
  };
  window.ZymataChat.mount({ hostId: 'zchat-host', rooms: rooms, user: user, defaultRoom: rooms[0] && rooms[0].key });
}

function renderContent() {
  if (contentEl) contentEl.classList.remove('zchat-active');
  if (appState.activeTab.startsWith('module:')) {
    contentEl.innerHTML = renderModule(appState.activeTab.replace('module:', ''));
    return;
  }

  const renderers = {
    home: renderHome,
    child: renderChild,
    academic: renderAcademic,
    mutabaah: renderMutabaah,
    more: renderMore,
    chat: renderChatTab,
    profile: renderProfile
  };

  contentEl.innerHTML = (renderers[appState.activeTab] || renderHome)();
  if (appState.activeTab === 'chat') { if (contentEl) contentEl.classList.add('zchat-active'); try { mountWaliChat(); } catch (e) { console.warn('[WaliChat]', e); } }
}

function currentNavTab() {
  return appState.activeTab.startsWith('module:') ? moduleParentTab(appState.activeTab.replace('module:', '')) : appState.activeTab;
}

function renderNav() {
  const active = currentNavTab();
  navEl.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === active);
  });
}

function navigate(target) {
  if (!target) return;
  if (tabMeta[target] || target.startsWith('module:')) {
    // Simpan halaman saat ini ke stack utk tombol Back OS (kembali ke halaman sebelumnya).
    if (appState.activeTab && appState.activeTab !== target) {
      appState._navStack = appState._navStack || [];
      appState._navStack.push(appState.activeTab);
      if (appState._navStack.length > 40) appState._navStack.shift();
    }
    appState.showAnnouncements = false;
    appState.activeTab = target;
    // Hapus badge "belum dibaca" begitu modul terkait dibuka
    if (target === 'module:catatan-anak') { markWaliSeen('catatan'); }
    // [BADGE MODUL] Titik merah hilang begitu modul dibuka.
    if (target === 'module:nilai-anak') { markWaliModuleSeen('nilai'); }
    else if (target === 'mutabaah' || target === 'module:mutabaah-rumah' || target === 'module:mutabaah-tahfidz') { markWaliModuleSeen('mutabaah'); }
    else if (target === 'module:perkembangan-anak') { markWaliModuleSeen('perkembangan'); }
    else if (target === 'module:calistung-anak') { markWaliModuleSeen('calistung'); }
    render();
    animateWaliContent();
  }
}

// ===== Tombol Back OS (Capacitor): kembali ke halaman sebelumnya, BUKAN keluar app =====
// Dipanggil oleh handler backButton di native-enhance.js lewat window.zHandleBack.
// Return true bila berhasil mundur; false bila sudah di halaman paling awal (home).
function goBackNativeWali() {
  // 1) tutup panel pengumuman kalau terbuka
  if (appState.showAnnouncements) {
    appState.showAnnouncements = false;
    render();
    animateWaliContent();
    return true;
  }
  // 2) mundur ke halaman sebelumnya dari stack navigasi
  var stack = appState._navStack || [];
  if (stack.length) {
    var prev = stack.pop();
    appState.showAnnouncements = false;
    appState.activeTab = prev;
    render();
    animateWaliContent();
    return true;
  }
  // 3) belum di home -> ke home
  if (appState.activeTab !== 'home') {
    appState.activeTab = 'home';
    render();
    animateWaliContent();
    return true;
  }
  // 4) sudah di home & stack kosong -> biarkan app konfirmasi keluar
  return false;
}
window.zHandleBack = goBackNativeWali;

function animateWaliContent() {
  // Transisi dipanggil hanya oleh navigasi halaman besar (navigate / back / initial load).
  // Implementasi visualnya dibungkus di wali-shell.html agar bisa pilih sheet/fade.
  return;
}

function updateWaliClock() {
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
setInterval(updateWaliClock, 10000);

function updateWaliChromeOnly() {
  // Update header/floating/nav tanpa membongkar appContent.
  renderHeader();
  renderFloating();
  renderNav();
  saveState();
}

function updatePerkembanganSectionNoRender(catKey) {
  // Filter bulan / muat lagi di Perkembangan cukup ganti section terkait.
  // Jangan render() penuh karena itu membuat layar wali terlihat kedip.
  try {
    if (appState.activeTab !== 'module:perkembangan-anak') { render(); return; }
    var current = document.querySelector('[data-perk-section="' + String(catKey).replace(/"/g, '\"') + '"]');
    if (!current) { render(); return; }
    var html = renderModule('perkembangan-anak');
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var fresh = tmp.querySelector('[data-perk-section="' + String(catKey).replace(/"/g, '\"') + '"]');
    if (fresh) current.replaceWith(fresh);
    else render();
    saveState();
  } catch (e) {
    console.warn('[WaliPerkembangan] update ringan gagal, fallback render:', e && e.message ? e.message : e);
    render();
  }
}

function updateSettingToggleNoRender(button, key) {
  try {
    var t = button && button.querySelector ? button.querySelector('.toggle') : null;
    if (t) t.classList.toggle('on', !!appState[key]);
    saveState();
  } catch (_) { render(); }
}

function bindActions() {
  if (actionsBound) return;
  actionsBound = true;

  document.addEventListener('change', async (event) => {
    const childSelect = event.target.closest && event.target.closest('[data-action="selectChildDropdown"]');
    if (childSelect) {
      var cid = childSelect.value || '';
      if (cid && cid !== String(appState.activeChildId || '')) {
        appState.activeChildId = cid;
        try { if (window.ZymataMobileSupabase) window.ZymataMobileSupabase.setActiveChildId(cid); } catch(_) {}
        notifyFeedback('light');
        render();
        try { await hydrateWaliFromSupabase(); } catch(_) {}
        render();
      }
    }
  });

  document.addEventListener('change', function(event){
    var catatanBulan = event.target && event.target.closest && event.target.closest('select[data-select="wali-catatan-bulan"]');
    if (catatanBulan) {
      appState.waliCatatanBulan = catatanBulan.value || '__all';
      appState.waliCatatanKategori = '__all';
      render();
      return;
    }
    var catatanKategori = event.target && event.target.closest && event.target.closest('select[data-select="wali-catatan-kategori"]');
    if (catatanKategori) {
      appState.waliCatatanKategori = catatanKategori.value || '__all';
      render();
      return;
    }
    var nilaiSemester = event.target && event.target.closest && event.target.closest('select[data-select="wali-nilai-semester"]');
    if (nilaiSemester) {
      appState.waliNilaiSemester = nilaiSemester.value || '__all';
      appState.waliNilaiMapel = '__all';
      render();
      return;
    }
    var nilaiMapel = event.target && event.target.closest && event.target.closest('select[data-select="wali-nilai-mapel"]');
    if (nilaiMapel) {
      appState.waliNilaiMapel = nilaiMapel.value || '__all';
      render();
      return;
    }
    var infaqCustom = event.target && event.target.closest && event.target.closest('[data-infaq-custom]');
    if (infaqCustom) {
      var customAmount = Math.floor(Number(infaqCustom.value || 0));
      if (customAmount >= 1000) {
        appState.infaqAmount = customAmount;
        appState.infaqPreviewOpen = false;
        notifyFeedback('light');
        render();
      } else if (infaqCustom.value) {
        waliShowSaveError('Nominal infaq minimal Rp1.000.');
      }
      return;
    }
    // [RIWAYAT BULAN] Dropdown bulan & tanggal pada semua panel riwayat wali.
    var rwBulan = event.target && event.target.closest && event.target.closest('select[data-select="wali-riwayat-bulan"]');
    if (rwBulan) {
      var kb = rwBulan.getAttribute('data-wali-kunci') || '';
      appState.waliRiwayatBulan = appState.waliRiwayatBulan || {};
      appState.waliRiwayatTgl = appState.waliRiwayatTgl || {};
      if (kb) { appState.waliRiwayatBulan[kb] = rwBulan.value; appState.waliRiwayatTgl[kb] = ''; }
      render();
      return;
    }
    var rwTgl = event.target && event.target.closest && event.target.closest('select[data-select="wali-riwayat-tanggal"]');
    if (rwTgl) {
      var kt = rwTgl.getAttribute('data-wali-kunci') || '';
      appState.waliRiwayatTgl = appState.waliRiwayatTgl || {};
      if (kt) appState.waliRiwayatTgl[kt] = rwTgl.value;
      render();
      return;
    }
    var perkMonthSel = event.target && event.target.closest && event.target.closest('select[data-select="perk-month"]');
    if (perkMonthSel) {
      var c = perkMonthSel.getAttribute('data-perk-cat');
      if (c) { appState.perkembanganMonth = appState.perkembanganMonth || {}; appState.perkembanganMonth[c] = perkMonthSel.value; appState.perkembanganLimit = appState.perkembanganLimit || {}; appState.perkembanganLimit[c] = 10; updatePerkembanganSectionNoRender(c); }
    }
  });

  document.addEventListener('click', async (event) => {
    var sppPayButton = event.target && event.target.closest && event.target.closest('[data-doku-spp]');
    if (sppPayButton) {
      await waliStartDokuPayment({ paymentType:'spp', referenceId:sppPayButton.getAttribute('data-doku-spp') }, sppPayButton);
      return;
    }
    var infaqAmountButton = event.target && event.target.closest && event.target.closest('[data-infaq-amount]');
    if (infaqAmountButton) {
      var presetAmount = Number(infaqAmountButton.getAttribute('data-infaq-amount') || 0);
      if (presetAmount >= 1000) {
        appState.infaqAmount = presetAmount;
        appState.infaqPreviewOpen = false;
        notifyFeedback('light');
        render();
      }
      return;
    }
    var perkMoreBtn = event.target && event.target.closest && event.target.closest('[data-perk-more]');
    if (perkMoreBtn) {
      var pc = perkMoreBtn.getAttribute('data-perk-more');
      appState.perkembanganLimit = appState.perkembanganLimit || {};
      appState.perkembanganLimit[pc] = (appState.perkembanganLimit[pc] || 10) + 10;
      updatePerkembanganSectionNoRender(pc);
      return;
    }
    const tabButton = event.target.closest('[data-tab]');
    if (tabButton) {
      navigate(tabButton.dataset.tab);
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
      const target = actionButton.dataset.action;
      if (target === 'viewChildPhoto') {
        openChildPhotoViewer();
        return;
      }
      if (target === 'selectChild') {
        var cid = actionButton.dataset.childId || '';
        if (cid && cid !== String(appState.activeChildId || '')) {
          appState.activeChildId = cid;
          try { if (window.ZymataMobileSupabase) window.ZymataMobileSupabase.setActiveChildId(cid); } catch(_) {}
          notifyFeedback('light');
          render();
          try { await hydrateWaliFromSupabase(); } catch(_) {}
          render();
        }
        return;
      }
      if (target === 'toggleAnnouncements') {
        appState.showAnnouncements = !appState.showAnnouncements;
        if (appState.showAnnouncements) {
          markWaliSeen('pengumuman');
          notifyFeedback('success');
        } else {
          notifyFeedback('light');
        }
        updateWaliChromeOnly();
        return;
      }
      if (target === 'closeAnnouncements') {
        appState.showAnnouncements = false;
        notifyFeedback('light');
        updateWaliChromeOnly();
        return;
      }
      if (target === 'openRoleChooser') {
        try { if (window.ZymataMobileSupabase) await window.ZymataMobileSupabase.signOut(); }
        catch (_) { try { sessionStorage.removeItem('siakad_session_user'); localStorage.removeItem('siakad_session_user'); } catch(_e) {} }
        window.location.href = ROLE_CHOOSER_PATH;
        return;
      }
      if (target === 'backToParent') {
        navigate(moduleParentTab(appState.activeTab.replace('module:', '')));
        return;
      }
      if (target === 'goMore') {
        navigate('more');
        return;
      }
      if (target === 'goJadwalHariIni') {
        var __wasHome = appState.activeTab === 'home';
        if (!__wasHome) navigate('home');
        notifyFeedback('light');
        setTimeout(function(){ var el = document.getElementById('waliJadwalHariIni'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, __wasHome ? 0 : 160);
        return;
      }
      if (target === 'previewInfaqCheckout') {
        if (Number(appState.infaqAmount || 0) < 1000) {
          waliShowSaveError('Pilih nominal infaq minimal Rp1.000.');
          return;
        }
        appState.infaqPreviewOpen = true;
        notifyFeedback('success');
        render();
        setTimeout(function(){ var el=document.querySelector('.infaq-checkout-preview'); if(el&&el.scrollIntoView) el.scrollIntoView({behavior:'smooth',block:'start'}); },80);
        return;
      }
      if (target === 'startDokuInfaq') {
        await waliStartDokuPayment({ paymentType:'infaq_subuh', amount:Number(appState.infaqAmount || 0) }, actionButton);
        return;
      }
      if (target === 'closeInfaqPreview') {
        appState.infaqPreviewOpen = false;
        notifyFeedback('light');
        render();
        return;
      }
      navigate(target);
      return;
    }

    const settingToggle = event.target.closest('[data-setting-toggle]');
    if (settingToggle) {
      const key = settingToggle.dataset.settingToggle;
      if (key) {
        appState[key] = !appState[key];
        notifyFeedback(key === 'notificationSound' ? 'success' : 'light');
        try { saveState(); } catch (e) {}
        updateSettingToggleNoRender(settingToggle, key);
        return;
      }
    }

    const routeButton = event.target.closest('[data-route], [data-module-route]');
    if (routeButton) {
      var __finTarget = routeButton.dataset.finTarget || '';
      navigate(routeButton.dataset.route || routeButton.dataset.moduleRoute);
      if (__finTarget) {
        setTimeout(function(){
          var __sec = document.getElementById('fin-sec-' + __finTarget);
          if (__sec) {
            var __det = __sec.querySelector('details.riwayat-absen-toggle');
            if (__det) __det.open = true;
            if (__sec.scrollIntoView) __sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 240);
      }
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
      const input = document.querySelector(`[data-mobile-crud-text="${key}"]`);
      const text = String(input?.value || Object.values(fieldPayload).filter(Boolean).join(' · ') || '').trim();
      if (!text) { notifyFeedback('warning'); waliShowSaveError('Isi minimal satu kolom sebelum menyimpan.'); return; }
      try {
        const payload = { text, status: 'Aktif', role: 'Wali', module: appState.activeTab };
        if (fields.length) payload.fields = fieldPayload;
        // Inject context wali (siswa anak + session) supaya kolom siswa_id/nis/nama_siswa/kelas/nama_wali ikut tersimpan
        var _suratSis = null, _suratSes = null;
        var _isSuratKey = (key === 'wali:surat-wali' || key === 'surat-wali' || String(appState.activeTab||'') === 'surat-wali');
        try {
          const ctx = window.__zymataWaliCtx || {};
          if (ctx.siswa) {
            payload.__siswa = {
              id: ctx.siswa.id || '', nis: ctx.siswa.nis || childProfile.nis || '',
              nama: ctx.siswa.nama || childProfile.fullName || '',
              kelas: ctx.siswa.kelas || childProfile.className || appState.childClass || ''
            };
          } else if (childProfile.fullName) {
            payload.__siswa = { id: '', nis: childProfile.nis || '', nama: childProfile.fullName, kelas: childProfile.className || '' };
          }
          if (ctx.session) {
            payload.__session = {
              id: ctx.session.id || '', nama: ctx.session.nama || ctx.session.username || '',
              no_hp: ctx.session.no_hp || ctx.session.hp || '', username: ctx.session.username || ''
            };
          }
          _suratSis = payload.__siswa || null;
          _suratSes = payload.__session || null;
          // JALUR A: titip sebagai kolom bernama (bridge memetakan fields -> kolom sesuai nama, terbukti dari jenis/perihal).
          if (_isSuratKey && _suratSis) {
            payload.fields = payload.fields || {};
            var _setF = function(k, v){ if (v && !payload.fields[k]) payload.fields[k] = v; };
            _setF('nama_siswa', _suratSis.nama);
            _setF('kelas', _suratSis.kelas);
            _setF('nisn', _suratSis.nis);
            _setF('siswa_nis', _suratSis.nis);
            _setF('siswa_id', _suratSis.id);
            _setF('nama_wali', (_suratSes && _suratSes.nama) || childProfile.wali || '');
            _setF('hp_wali', (_suratSes && _suratSes.no_hp) || childProfile.phone || '');
          }
        } catch(_) {}
        const saved = await window.ZymataMobileSupabase.createSpecificOrFallback(key, payload);
        if (!saved || !saved.row) {
          var _emsg = (saved && saved.error) ? String(saved.error) : 'Data gagal disimpan ke Supabase (cek: siswa sudah terhubung & kolom wajib terisi).';
          console.warn('[MobileWaliCRUD] simpan gagal (fallback):', _emsg);
          notifyFeedback('error');
          waliShowSaveError('Gagal simpan: ' + _emsg);
          return;
        }
        // Kolom siswa (siswa_id, nama_siswa, siswa_nis, kelas, nisn, nama_wali, hp_wali) kini diisi
        // langsung oleh bridge saat insert (WEB_ALLOWED_COLS.surat sudah memuat nama_siswa & siswa_nis).
        // Tidak perlu penulisan ulang dari sini -> tidak ada risiko baris dobel.
        if (input) input.value = '';
        fields.forEach(function(field) { field.value = ''; });
        // [RIWAYAT LANGSUNG TAMPIL] Tampilkan kiriman baru di riwayat saat itu juga.
        try {
          var _mid = String(appState.activeTab || '').replace('module:', '');
          var _storeKey = waliModuleDataKey(_mid) || (_isSuratKey ? 'surat' : '');
          if (_storeKey) {
            waliCatatBarisBaru(_storeKey, saved.row);
            var _tglBaru = String(saved.row.tanggal || saved.row.tgl_mulai || saved.row.tgl || saved.row.created_at || '').slice(0, 10) || waliHariIniISO();
            appState.waliRiwayatBulan = appState.waliRiwayatBulan || {};
            var _kunciRiwayat = [];
            if (_isSuratKey) _kunciRiwayat.push('Surat & Izin');
            if (_mid === 'mutabaah-rumah') _kunciRiwayat.push('Mutabaah Rumah');
            _kunciRiwayat.push(_mid);
            _kunciRiwayat.forEach(function(t){ appState.waliRiwayatBulan[waliKunciRiwayat(t)] = waliBulanDariTgl(_tglBaru); });
          }
        } catch(_e) { console.warn('[RIWAYAT LANGSUNG TAMPIL] gagal tampilkan kiriman baru', _e); }
        notifyFeedback('success');
        waliShowSaveOk('Tersimpan ke Supabase.');
        try { render(); } catch(_e) {}
        await hydrateWaliFromSupabase();
      } catch (error) { var _emx = error && error.message ? error.message : String(error); console.warn('[MobileWaliCRUD] simpan gagal:', _emx); notifyFeedback('error'); waliShowSaveError('Gagal simpan: ' + _emx); }
      return;
    }

    const updateCrud = event.target.closest('[data-mobile-crud-update]');
    if (updateCrud) {
      try {
        await window.ZymataMobileSupabase.updateAppModuleRow(updateCrud.dataset.mobileCrudUpdate, { text: 'Data mobile', status: 'Selesai', role: 'Wali', module: appState.activeTab });
        notifyFeedback('success');
        await hydrateWaliFromSupabase();
      } catch (error) { console.warn('[MobileWaliCRUD] update gagal:', error && error.message ? error.message : error); notifyFeedback('error'); }
      return;
    }

    const deleteCrud = event.target.closest('[data-mobile-crud-delete]');
    if (deleteCrud) {
      try {
        await window.ZymataMobileSupabase.deleteAppModuleRow(deleteCrud.dataset.mobileCrudDelete);
        notifyFeedback('success');
        await hydrateWaliFromSupabase();
      } catch (error) { console.warn('[MobileWaliCRUD] hapus gagal:', error && error.message ? error.message : error); notifyFeedback('error'); }
      return;
    }

    const primaryButton = event.target.closest('[data-primary-action]');
    if (primaryButton) {
      const active = appState.activeTab;
      if (active === 'home') navigate('module:perkembangan-anak');
      else if (active === 'child') navigate('child');
      else if (active === 'academic') navigate('module:perkembangan-anak');
      else if (active === 'mutabaah') navigate('module:mutabaah-rumah');
      else if (active === 'more') navigate('module:pengumuman-wali');
      else if (active === 'profile') render();
      else navigate(moduleParentTab(active.replace('module:', '')));
    }
  });
}

function initials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

// Foto siswa untuk hero (meniru teacherAvatarHtml di role guru); fallback ke inisial.
function openChildPhotoViewer(){
  var url = String(childProfile.photoUrl || '').trim();
  if(!url) return;
  var nama = childProfile.fullName || childProfile.nickName || 'Foto';
  var old = document.getElementById('wali-photo-viewer');
  if(old && old.parentNode) old.parentNode.removeChild(old);
  var ov = document.createElement('div');
  ov.id = 'wali-photo-viewer';
  ov.setAttribute('role','dialog');
  ov.innerHTML = '<div class="wpv-backdrop"></div>'
    + '<button type="button" class="wpv-close" aria-label="Tutup">&times;</button>'
    + '<div class="wpv-inner">'
    + '<img class="wpv-img" src="' + url + '" alt="Foto ' + nama + '" />'
    + '<div class="wpv-name">' + nama + '</div>'
    + '</div>';
  function close(){
    ov.classList.remove('wpv-show');
    ov.classList.add('wpv-hide');
    setTimeout(function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 220);
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e){ if(e.key === 'Escape') close(); }
  ov.addEventListener('click', function(e){
    if(e.target && e.target.closest && e.target.closest('.wpv-img')) return;
    close();
  });
  document.body.appendChild(ov);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(function(){ ov.classList.add('wpv-show'); });
  try{ notifyFeedback('light'); }catch(_e){}
}

function studentAvatarHtml(extraClass) {
  var cls = 'teacher-photo' + (extraClass ? (' ' + extraClass) : '');
  var url = childProfile.photoUrl || '';
  var nama = childProfile.fullName || childProfile.nickName || 'Siswa';
  if (url) {
    return '<span class="' + cls + ' has-photo" data-action="viewChildPhoto" title="Lihat foto" style="cursor:pointer;"><img src="' + url + '" alt="Foto ' + nama + '" onerror="this.parentNode.classList.remove(\'has-photo\');this.parentNode.textContent=\'' + initials(nama) + '\';" /></span>';
  }
  return '<span class="' + cls + '">' + initials(nama) + '</span>';
}

function render() {
  renderHeader();
  renderContent();
  renderFloating();
  renderNav();
  bindActions();
  saveState();
}

function nativeHaptic(kind = 'light') {
  if (!appState.notificationHaptic) return;
  try {
    if (window.Capacitor?.Plugins?.Haptics) {
      const Haptics = window.Capacitor.Plugins.Haptics;
      if (kind === 'success' && Haptics.notification) Haptics.notification({ type: 'SUCCESS' });
      else if ((kind === 'error' || kind === 'warning') && Haptics.notification) Haptics.notification({ type: kind === 'error' ? 'ERROR' : 'WARNING' });
      else if (Haptics.impact) Haptics.impact({ style: kind === 'heavy' ? 'HEAVY' : 'LIGHT' });
      return;
    }
    if (navigator.vibrate) {
      if (kind === 'error') navigator.vibrate([80, 45, 120]);
      else if (kind === 'warning' || kind === 'heavy') navigator.vibrate([45, 35, 70]);
      else if (kind === 'success') navigator.vibrate([25, 20, 25]);
      else navigator.vibrate(12);
    }
  } catch (_) {}
}

function getAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!window.__ZYMATA_WALI_AUDIO_CTX__) window.__ZYMATA_WALI_AUDIO_CTX__ = new AudioCtx();
    return window.__ZYMATA_WALI_AUDIO_CTX__;
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

function waliToast(msg, type){
  try {
    var id = 'zwali-toast';
    var el = document.getElementById(id);
    if(!el){ el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
    el.textContent = String(msg||'');
    el.style.cssText = 'position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:99999;max-width:90%;padding:12px 16px;border-radius:12px;font-size:13px;font-weight:700;line-height:1.35;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.25);text-align:center;background:'+(type==='error'?'#dc2626':'#059669')+';';
    el.style.display = 'block';
    clearTimeout(el.__t);
    el.__t = setTimeout(function(){ el.style.display='none'; }, type==='error'?8000:2500);
  } catch(_){ if(type==='error'){ try{ window.alert(msg); }catch(__){} } }
}
function waliShowSaveError(msg){ waliToast(msg, 'error'); }
function waliShowSaveOk(msg){ waliToast(msg, 'ok'); }

function notifyFeedback(tone = 'success') {
  const important = tone === 'error' || tone === 'red' || tone === 'warning' || tone === 'orange' || tone === 'gold';
  const feedbackTone = tone === 'red' ? 'error' : tone === 'orange' || tone === 'gold' ? 'warning' : tone;
  playNotificationSound(feedbackTone);
  nativeHaptic(important ? feedbackTone : 'light');
}

function applyWaliEmptyStateData() {
  appState.childName = 'Belum terhubung';
  appState.childClass = '-';
  appState.unreadAnnouncements = 0;
  appState.unreadNotes = 0;
  appState.selectedChild = '';
  appState.financeDue = '-';
  appState.financeAmount = '-';
  appState.financeStatus = 'belum';
  appState.financeBulan = 0;      // [LABEL TAGIHAN SPP]
  appState.financeNote = '-';     // [LABEL TAGIHAN SPP]
  appState.tabunganSaldo = '-';
  appState.tabunganUpdate = '-';
  appState.homeMutabaahProgress = 0;
  appState.homeAttendanceRate = 0;
  appState.homeScoreAverage = 0;
  appState.homeDevelopmentHighlight = 'Data anak akan tampil setelah akun wali terhubung ke Supabase.';
  appState.todayAttendance = 'belum';
  appState.todayCheckIn = '--:--';
  appState.hafalanSurah = '-';
  appState.hafalanProgress = 'Belum ada data';
  appState.hafalanTanzil = '-';
  appState.hafalanHalaman = '-';
  appState.syncMode = 'supabase-empty';

  childProfile.fullName = 'Belum terhubung';
  childProfile.nickName = 'Anak';
  childProfile.nis = '-';
  childProfile.className = '-';
  childProfile.homeroom = '-';
  childProfile.father = '-';
  childProfile.mother = '-';
  childProfile.wali = '-';
  childProfile.phone = '-';
  childProfile.address = '-';
  childProfile.emergency = '-';

  academicHighlights.splice(0, academicHighlights.length,
    { label: 'Absensi', value: '-', tone: 'blue' },
    { label: 'Catatan', value: '-', tone: 'orange' },
    { label: 'Nilai', value: '-', tone: 'green' }
  );
  mutabaahHighlights.splice(0, mutabaahHighlights.length,
    { label: 'Rumah', value: '-', tone: 'green' },
    { label: 'Quran', value: '-', tone: 'blue' },
    { label: 'Review', value: '-', tone: 'gold' }
  );
  moreHighlights.splice(0, moreHighlights.length,
    { label: 'Keuangan', value: '-', tone: 'orange' },
    { label: 'Pengumuman', value: '-', tone: 'blue' },
    { label: 'Akun', value: 'Menunggu', tone: 'green' }
  );
  announcements.splice(0, announcements.length);
  Object.keys(moduleDetails).forEach((key) => {
    const detail = moduleDetails[key];
    if (detail.stats) detail.stats = [];
    if (detail.focus) detail.focus = [];
    if (detail.modules) detail.modules = [];
  });
}

function computeWaliRecap(){
  var sm = appState.supabaseModules || {};
  function _d(r){ return String(r.tanggal||r.tgl||r.waktu||r.created_at||'').slice(0,10); }
  var abs = Array.isArray(sm.absensi) ? sm.absensi : [];
  function _st(r){ return String(r.status||r.kehadiran||r.keterangan||'').toLowerCase(); }
  var hadir=0, izin=0, sakit=0, alpa=0, total=0;
  abs.forEach(function(r){ var s=_st(r);
    if(/hadir|masuk/.test(s)){ hadir++; total++; }
    else if(/izin/.test(s)){ izin++; total++; }
    else if(/sakit/.test(s)){ sakit++; total++; }
    else if(/alpa|alfa|tanpa|bolos/.test(s)){ alpa++; total++; }
  });
  appState.waliAbsRekap = { hadir:hadir, izin:izin, sakit:sakit, alpa:alpa, total:total };
  appState.homeAttendanceRate = total ? Math.round(hadir/total*100) : 0;
  var dN=new Date(); var today=dN.getFullYear()+'-'+String(dN.getMonth()+1).padStart(2,'0')+'-'+String(dN.getDate()).padStart(2,'0');
  var tRow=null; abs.forEach(function(r){ if(_d(r)===today) tRow=r; });
  if(tRow){ var s=_st(tRow); appState.todayAttendance = /hadir|masuk/.test(s)?'hadir':(/izin/.test(s)?'izin':(/sakit/.test(s)?'sakit':(/alpa|alfa|tanpa|bolos/.test(s)?'alpa':'belum')));
    // Jam masuk: pakai data gerbang bila ada; jika tidak ada tapi hadir, default tampilkan 07:00 (tampilan saja).
    var _jm = String(tRow.jam_masuk||tRow.jam||tRow.jam_datang||tRow.waktu_masuk||tRow.check_in||tRow.checkin||tRow.masuk||'').trim();
    if(/^\d{1,2}[:.]\d{2}/.test(_jm)){ appState.todayCheckIn = _jm.slice(0,5).replace('.',':'); appState.todayCheckInIsDefault = false; }
    else if(/hadir|masuk/.test(s)){ appState.todayCheckIn = '07:00'; appState.todayCheckInIsDefault = true; }
    else { appState.todayCheckIn = '--:--'; appState.todayCheckInIsDefault = false; }
  }
  else { appState.todayAttendance='belum'; appState.todayCheckIn='--:--'; }
  var nilai = Array.isArray(sm.nilai) ? sm.nilai : [];
  var sum=0, cnt=0;
  nilai.forEach(function(r){ var n=Number(r.nilai||r.nilai_akhir||r.nilai_rapor||r.nilai_angka||r.rata_rata||r.skor||r.nilai_ujian||r.nilai_tugas||0); if(n>0){ sum+=n; cnt++; } });
  appState.homeScoreAverage = cnt ? Math.round(sum/cnt) : 0;
  var mut=[].concat(Array.isArray(sm.mutabaahRumah)?sm.mutabaahRumah:[], Array.isArray(sm.ibadah)?sm.ibadah:[]);
  var weekAgo=Date.now()-7*24*3600*1000, recent=0;
  mut.forEach(function(r){ var d=Date.parse(_d(r)); if(!isNaN(d) && d>=weekAgo) recent++; });
  appState.homeMutabaahProgress = Math.min(100, Math.round((recent/7)*100));
  /* [BUNTU] Keempat field hafalan* di bawah TIDAK DIBACA SIAPA PUN.
     Komentar lama di sini mengklaim renderAcademic (baris 1194) dan renderChild
     (baris 1144) membacanya — itu TIDAK BENAR, keduanya tidak menyentuhnya.
     Sudah dicari di seluruh wali-shell.js + wali-shell.html: appState.hafalanSurah/
     hafalanProgress/hafalanTanzil/hafalanHalaman hanya DITULIS (baris 57-60,
     3189-3192, dan blok ini), nol tempat membacanya.
     Karena itu tabel `hafalan` sudah TIDAK ditarik lagi saat hydrate
     (lihat supabase-mobile.js, kunci `hafalan` di loadWaliModuleData), sehingga
     sm.hafalan selalu array kosong dan blok ini selalu masuk cabang else.
     Blok dibiarkan supaya field appState tetap punya nilai awal yang konsisten
     bila nanti kartu Hafalan benar-benar dibuat. Kalau memutuskan tidak akan
     dipakai, hapus juga baris 57-60 dan 3189-3192. */
  var hafArr = Array.isArray(sm.hafalan) ? sm.hafalan : [];
  if(hafArr.length){
    var hafSorted = hafArr.slice().sort(function(a,b){ return String(b.tanggal||b.tgl||b.created_at||'').localeCompare(String(a.tanggal||a.tgl||a.created_at||'')); });
    var hLast = hafSorted[0] || {};
    appState.hafalanSurah = String(hafArr.length) + ' entri';
    appState.hafalanProgress = String(hLast.surat || hLast.title || hLast.judul || 'Hafalan terbaru');
    appState.hafalanTanzil = hLast.juz ? ('Juz ' + hLast.juz) : '';
    appState.hafalanHalaman = hLast.nilai ? ('Nilai ' + hLast.nilai) : '';
  } else {
    appState.hafalanSurah = '-';
    appState.hafalanProgress = 'Belum ada data';
    appState.hafalanTanzil = '-';
    appState.hafalanHalaman = '-';
  }
  // Jumlah catatan dari sekolah untuk kartu "Catatan baru" di dashboard menu.
  // Independen dari status "sudah dibaca" supaya angkanya mencerminkan data yang ada,
  // bukan ikut jadi 0 setelah catatan dibuka.
  var catArr = (Array.isArray(sm.catatan) ? sm.catatan : []).filter(function(r){ var v=String(r.status_visibilitas||r.visibilitas||'').toLowerCase(); return v!=='ditarik' && v!=='internal'; });
  appState.catatanBaru = catArr.length;
}

// ===== [FIX WALI] Indikator "Menyegarkan data" + hemat beban server =====
function ensureWaliFixStyles() {
  try {
    if (document.getElementById('wali-fix-style')) return;
    var st = document.createElement('style');
    st.id = 'wali-fix-style';
    st.textContent = '#wali-sync-chip{position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:50%;transform:translateX(-50%) translateY(-16px);z-index:99999;display:flex;align-items:center;gap:7px;background:rgba(17,24,39,.93);color:#fff;font-size:12.5px;font-weight:600;padding:7px 13px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.28);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease}#wali-sync-chip.show{opacity:1;transform:translateX(-50%) translateY(0)}#wali-sync-chip .wali-sync-dot{width:11px;height:11px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:waliSyncSpin .7s linear infinite}@keyframes waliSyncSpin{to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
  } catch (_) {}
}
function showSyncIndicator() {
  try {
    ensureWaliFixStyles();
    var el = document.getElementById('wali-sync-chip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wali-sync-chip';
      el.innerHTML = '<span class="wali-sync-dot"></span> Menyegarkan data\u2026';
      document.body.appendChild(el);
    }
    requestAnimationFrame(function(){ el.classList.add('show'); });
  } catch (_) {}
}
function hideSyncIndicator() {
  try { var el = document.getElementById('wali-sync-chip'); if (el) el.classList.remove('show'); } catch (_) {}
}

// [RIWAYAT LANGSUNG TAMPIL] Baris yang baru dikirim wali (mis. surat/izin) dicatat
// sementara di sini, lalu selalu disisipkan ulang setiap data disegarkan. Ini bikin
// data baru langsung terlihat di riwayat tanpa perlu keluar-masuk modul, walau
// server atau cache jembatan belum mengembalikan baris tersebut.
var waliBarisBaru = [];
function waliSisipBarisBaru() {
  appState.supabaseModules = appState.supabaseModules || {};
  waliBarisBaru = waliBarisBaru.filter(function(x){ return x && (Date.now() - x.ts) < 600000; });
  waliBarisBaru.forEach(function(x){
    var arr = Array.isArray(appState.supabaseModules[x.storeKey]) ? appState.supabaseModules[x.storeKey] : [];
    var id = String((x.row && x.row.id) || '');
    var ada = arr.some(function(r){ return id && String((r && r.id) || '') === id; });
    if (!ada) appState.supabaseModules[x.storeKey] = [x.row].concat(arr);
  });
}
function waliCatatBarisBaru(storeKey, row) {
  if (!storeKey || !row) return;
  waliBarisBaru.push({ storeKey: storeKey, row: row, ts: Date.now() });
  waliSisipBarisBaru();
}

async function hydrateWaliFromSupabase() {
  if (!window.ZymataMobileSupabase) return;
  const session = window.ZymataMobileSupabase.readSession();
  if (!session) return;
  try {
    showSyncIndicator();
    const ctx = await window.ZymataMobileSupabase.loadWaliContext(session);
    try {
      var _kids = (ctx && Array.isArray(ctx.children)) ? ctx.children : [];
      appState.children = _kids.map(function(c){ return { id: String(c.id||''), nama: c.nama||c.nama_siswa||'', kelas: c.kelas||'' }; });
      if (ctx && ctx.siswa) appState.activeChildId = String(ctx.siswa.id||'');
    } catch(_) {}
    // Sync childProfile + appState dari konteks wali (anak yang terhubung)
    try {
      if (ctx && ctx.siswa) {
        const s = ctx.siswa;
        childProfile.fullName = s.nama || s.nama_lengkap || childProfile.fullName || '';
        childProfile.nickName = s.nama_panggilan || (s.nama ? String(s.nama).split(' ')[0] : childProfile.nickName) || '';
        childProfile.nis = s.nis || childProfile.nis || '';
        childProfile.className = s.kelas ? ('Kelas ' + s.kelas) : (childProfile.className || '');
        childProfile.homeroom = s.wali_kelas || s.guru_wali || childProfile.homeroom || '';
        childProfile.father = s.nama_ayah || childProfile.father || '';
        childProfile.mother = s.nama_ibu || childProfile.mother || '';
        childProfile.wali = s.nama_wali || s.wali || s.wali_murid || childProfile.wali || '';
        // Tidak pakai fallback childProfile.phone agar nomor lama tidak nyangkut
        var _newPhone = s.no_hp || s.hp || s.no_hp_ortu || s.hp_wali || s.telepon || s.telephone || '';
        if (_newPhone) childProfile.phone = _newPhone;
        childProfile.address = s.tempat_lahir || s.tempat_lahir_anak || s.ttl || s.alamat || childProfile.address || '';
        appState.childName = childProfile.fullName;
        appState.childClass = childProfile.className;
        appState.childNis = childProfile.nis;
      }
      if (ctx && ctx.session) {
        if (!childProfile.wali && ctx.session.nama) childProfile.wali = ctx.session.nama;
      }
    } catch(_) {}
    if (!ctx) return;
    const siswa = ctx.siswa || {};
    appState.syncMode = 'supabase-live';
    appState.waliTitle = session.nama ? ('Wali ' + session.nama) : 'Wali Murid';
    appState.childName = siswa.nama || siswa.nama_siswa || session.nama_siswa || 'Belum terhubung';
    appState.childClass = siswa.kelas || siswa.kelas_siswa || session.kelas_siswa || '-';
    appState.homeDevelopmentHighlight = siswa.id || session.siswa_id || session.nis_siswa ? 'Data anak terhubung ke Supabase.' : 'Akun wali belum punya relasi siswa.';

    childProfile.fullName = appState.childName;
    childProfile.nickName = appState.childName === 'Belum terhubung' ? 'Anak' : String(appState.childName).split(/\s+/)[0];
    childProfile.nis = siswa.nis || session.nis_siswa || '-';
    childProfile.className = appState.childClass;
    childProfile.homeroom = siswa.wali_kelas || siswa.nama_guru || '-';
    childProfile.father = siswa.nama_ayah || siswa.ayah || '-';
    childProfile.mother = siswa.nama_ibu || siswa.ibu || '-';
    childProfile.wali = siswa.nama_wali || siswa.wali || siswa.wali_murid || session.nama || '-';
    childProfile.phone = siswa.hp_wali || siswa.no_hp || siswa.hp || siswa.no_hp_ortu || siswa.telepon || siswa.telephone || '-';
    childProfile.address = siswa.tempat_lahir || siswa.tempat_lahir_anak || siswa.ttl || siswa.alamat || '-';
    childProfile.emergency = siswa.kontak_darurat || '-';
    childProfile.photoUrl = String(siswa.foto || siswa.foto_siswa || siswa.pas_foto || siswa.photo || siswa.foto_url || siswa.photo_url || siswa.avatar || siswa.avatar_url || siswa.url_foto || siswa.foto_anak || '').trim();

    appState.unreadAnnouncements = 0;
    appState.unreadNotes = 0;
    appState.supabaseModules = filterWaliPengumuman(await window.ZymataMobileSupabase.loadWaliModuleData(ctx));
    // [RIWAYAT LANGSUNG TAMPIL] Pastikan kiriman baru tidak hilang setelah penyegaran.
    try { waliSisipBarisBaru(); } catch(_e) { console.warn('[RIWAYAT LANGSUNG TAMPIL] gagal sisip ulang', _e); }
    try { computeWaliRecap(); } catch(_e) {}
    // Hitung notifikasi real dari Supabase
    try {
      const sm = appState.supabaseModules || {};
      var _seenN = appState.seenNotes || [];
      var _seenA = appState.seenAnnouncements || [];
      appState.unreadNotes = (sm.catatan || []).filter(function(r){ var st = String(r.status||'').toLowerCase(); var fresh = !st || /baru|belum|aktif|terkirim/.test(st); return fresh && _seenN.indexOf(waliItemKey(r)) === -1; }).length;
      appState.unreadAnnouncements = (sm.pengumuman || []).filter(function(r){ return _seenA.indexOf(waliItemKey(r)) === -1; }).length;
      // Isi panel lonceng & daftar pengumuman dari Supabase (focus modul = referensi array yg sama)
      announcements.splice(0, announcements.length);
      (sm.pengumuman || []).slice(0, 8).forEach(function(r){
        var _tgl = String(r.tanggal || r.created_at || r.waktu || r.tgl || '').slice(0,10);
        announcements.push({
          time: _tgl || 'Terbaru',
          title: r.judul || r.title || r.perihal || r.nama || 'Pengumuman',
          meta: r.isi || r.keterangan || r.deskripsi || r.konten || r.pesan || r.detail || '-',
          tone: 'blue',
          status: r.kategori || r.label || 'Info'
        });
      });
    } catch(_) {}
    // [BADGE MODUL] Muat baris calistung ringkas (hanya kolom kunci) untuk hitung
    // titik merah, lalu hitung ulang semua badge modul beranda.
    try {
      var _nisBadge = String(appState.childNis || (childProfile && childProfile.nis) || '').trim();
      if (_nisBadge && _nisBadge !== '-' && window.ZymataMobileSupabase && typeof window.ZymataMobileSupabase.select === 'function') {
        var _resCal = await window.ZymataMobileSupabase.select('calistung', {
          eq: { nis: _nisBadge }, select: 'id,row_uid,tanggal,updated_at', order: 'tanggal', ascending: false, limit: 200
        }).catch(function(){ return null; });
        var _calRows = (_resCal && Array.isArray(_resCal.data)) ? _resCal.data : (Array.isArray(_resCal) ? _resCal : []);
        appState.waliCalistungRows = _calRows;
      }
    } catch(_) {}
    try { recomputeWaliModuleBadges(); } catch(_) {}
    syncWaliFinanceState();
    appState._waliLastHydrateTs = Date.now();
    saveState();
    saveWaliDataCache();
    render();
  } catch (error) {
    console.warn('[MobileWali] gagal load Supabase:', error && error.message ? error.message : error);
  } finally {
    hideSyncIndicator();
  }
}

loadState();
applyWaliEmptyStateData();
// Pulihkan snapshot data terakhir agar SPP, tabungan, & akademik tampil INSTAN
// saat app dibuka, sebelum jaringan selesai. hydrateWaliFromSupabase() lalu
// menyegarkannya diam-diam di belakang.
try { loadWaliDataCache(); } catch (_e) {}
appState.activeTab = 'home';
appState.showAnnouncements = false;
updateWaliClock();
saveState();
ensureWaliFixStyles();
render();
hydrateWaliFromSupabase();
// [SESI TUNGGAL] Cek apakah HP ini masih perangkat aktif. Bila akun sudah login
// di HP lain, fungsi ini akan logout + arahkan ke pemilih peran.
try { if(window.ZymataMobileSupabase && window.ZymataMobileSupabase.checkActiveSession) window.ZymataMobileSupabase.checkActiveSession(); } catch(_){}
animateWaliContent();

// ===== Auto-refresh data saat app dibuka kembali =====
// Di aplikasi native (APK) webview hanya "resume", tidak reload, sehingga data
// dari Supabase tidak ter-update otomatis. Listener ini menarik data terbaru
// (pelanggaran, nilai, membaca quran, dll) tiap app kembali aktif / terlihat.
(function setupWaliAutoRefresh(){
  var _busy = false, _last = Date.now();
  function refreshNow(){
    // [SESI TUNGGAL] Cek lebih dulu sebelum throttle, agar tetap jalan tiap resume.
    try { if(window.ZymataMobileSupabase && window.ZymataMobileSupabase.checkActiveSession) window.ZymataMobileSupabase.checkActiveSession(); } catch(_){}
    if(_busy) return;
    if(Date.now() - _last < 3000) return; // throttle 3 detik
    // Hemat beban server: lewati refresh berat bila data baru saja disegarkan (< 90 detik).
    // Data keuangan (SPP/tabungan) tetap diperbarui oleh finance poll terpisah.
    if(Date.now() - (appState._waliLastHydrateTs || 0) < 90000) return;
    _busy = true; _last = Date.now();
    Promise.resolve(hydrateWaliFromSupabase())
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
  window.zWaliRefresh = refreshNow;
})();

// ===== Auto-refresh data SPP & Tabungan (tanpa reload semua modul) =====
(function setupWaliFinancePoll(){
  var _last = 0;
  var _lastSig = '';
  async function pollFinance(){
    if(!window.ZymataMobileSupabase) return;
    if(!appState.syncMode || appState.syncMode === 'supabase-empty') return;
    try {
      const session = window.ZymataMobileSupabase.readSession();
      if(!session) return;
      // Pakai ulang konteks wali yang sudah di-load hydrate (hemat query identitas anak).
      const ctx = (window.__zymataWaliCtx && window.__zymataWaliCtx.siswa) ? window.__zymataWaliCtx : await window.ZymataMobileSupabase.loadWaliContext(session);
      if(!ctx || !ctx.siswa) return;
      const siswaId = String(ctx.siswa.id || '');
      const nis = String(ctx.siswa.nis || '');
      const filters = [
        siswaId ? { siswa_id: siswaId } : null,
        nis ? { nis: nis } : null
      ].filter(Boolean);
      if(!filters.length) { _last = Date.now(); return; }
      var _smF = appState.supabaseModules || {};
      // Ambil data finance langsung dari Supabase
      var sppRows = await window.ZymataMobileSupabase.tryFilteredList('spp_pembayaran', filters, 20, { strict: true });
      var tagihanRows = await window.ZymataMobileSupabase.tryFilteredList('tagihan_spp', filters, 20, { strict: true });
      var keuRows = await window.ZymataMobileSupabase.tryFilteredList('keuangan', filters, 20, { strict: true });
      var tabRows = await window.ZymataMobileSupabase.tryFilteredList('tabungan_siswa', filters, 20, { strict: true });
      var tabUmumRows = await window.ZymataMobileSupabase.tryFilteredList('tabungan_umum', filters, 20, { strict: true });
      var payRes = await window.ZymataMobileSupabase.select('payment_transactions', { eq:{ siswa_id:siswaId }, select:'id,siswa_id,nis,payment_type,reference_id,invoice_number,amount,status,expires_at,paid_at,created_at', order:'created_at', ascending:false, limit:30 });
      // Update module cache hanya untuk finance
      if(Array.isArray(sppRows) || Array.isArray(tagihanRows) || Array.isArray(keuRows)) {
        _smF.keuangan = [].concat(
          Array.isArray(sppRows) ? sppRows.map(function(r){ return Object.assign({_zymata_source:'spp_pembayaran'},r); }) : [],
          Array.isArray(tagihanRows) ? tagihanRows.map(function(r){ return Object.assign({_zymata_source:'tagihan_spp'},r); }) : [],
          Array.isArray(keuRows) ? keuRows.map(function(r){ return Object.assign({_zymata_source:'keuangan'},r); }) : []
        );
      }
      if(Array.isArray(tabRows)) _smF.tabungan = tabRows;
      if(Array.isArray(tabUmumRows)) _smF.tabunganUmum = tabUmumRows;
      if(payRes && !payRes.error && Array.isArray(payRes.data)) _smF.payments = payRes.data;
      appState.supabaseModules = _smF;
      syncWaliFinanceState();
      // Kedip fix v2: render ulang HANYA jika data keuangan BENAR-BENAR berubah.
      // Signature dibuat TAHAN-URUTAN (tiap baris di-stringify lalu di-sort) supaya
      // urutan baris dari Supabase yang berubah-ubah TIDAK dianggap "berubah".
      // Tanpa ini, tiap poll 60 detik render() jalan -> layar kedip saat didiamkan.
      function _finSig(arr){
        try { return (Array.isArray(arr) ? arr : []).map(function(r){ return JSON.stringify(r); }).sort().join('|'); }
        catch(_e){ return ''; }
      }
      var _sig = _finSig(_smF.keuangan) + '#' + _finSig(_smF.tabungan) + '#' + _finSig(_smF.tabunganUmum) + '#' + _finSig(_smF.payments);
      if(_lastSig === ''){
        // Poll pertama: set baseline saja, JANGAN render (data sudah tampil dari load awal).
        _lastSig = _sig;
      } else if(_sig !== _lastSig){
        _lastSig = _sig;
        if(appState.activeTab === 'home' || appState.activeTab === 'more' || /^module:(keuangan|infaq-subuh)/.test(appState.activeTab)) render();
      }
    } catch(_){}
    _last = Date.now();
  }
  // EGRESS: poll berkala DIMATIKAN. Dulu tiap 60 detik = 1.440 tarikan/hari
  // per wali walau HP cuma didiamkan. Sekarang data ditarik saat wali
  // kembali membuka aplikasi (lihat visibilitychange/focus di bawah).
  // Juga pas visibility/focus
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible' && Date.now() - _last > 120000) pollFinance();
  });
  window.addEventListener('focus', function(){
    if(Date.now() - _last > 120000) pollFinance();
  });
})();



/* ===================== Mutaba'ah Tahfidz (Wali) ===================== */
;(function(){
  if (window.__ZYMATA_WALI_TAHFIDZ_V1__) return;
  window.__ZYMATA_WALI_TAHFIDZ_V1__ = true;

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
  // ===== URUTAN HAFALAN SEKOLAH: Juz 30 -> Juz 29 -> Juz 1..28 =====
  var JUZ_ORDER = [30,29].concat((function(){ var a=[]; for(var z=1;z<=28;z++) a.push(z); return a; })());
  function juzSeq(jz){ var i=JUZ_ORDER.indexOf(parseInt(jz,10)); return i<0?0:(i+1); }
  function surahListByJuz(jz){
    var out=[];
    for(var no=1;no<=114;no++){
      var awal=juzOf(no,1), akhir=juzOf(no,SURAH[no-1][1]);
      if(jz>=awal && jz<=akhir) out.push(no);
    }
    return out;
  }
  var SURAH_ORDER = (function(){
    var seen={}, out=[];
    JUZ_ORDER.forEach(function(jz){
      surahListByJuz(jz).forEach(function(no){ if(!seen[no]){ seen[no]=1; out.push({ no:no, juz:jz }); } });
    });
    for(var no=1;no<=114;no++){ if(!seen[no]){ seen[no]=1; out.push({ no:no, juz:juzOf(no,1) }); } }
    return out;
  })();
  function computeProgres(surah, ayat){
    surah=parseInt(surah,10); ayat=parseInt(ayat,10);
    if(!surah||surah<1||surah>114) return {pct:0,juz:0,seq:0,pctTotal:0};
    var maxA=SURAH[surah-1][1];
    if(!ayat||ayat<1) ayat=1;
    if(ayat>maxA) ayat=maxA;
    var jz=juzOf(surah,ayat), pct;
    if(jz===29||jz===30){
      var startSurah=(jz===29)?67:78, count=(jz===29)?11:37;
      var done=(surah-startSurah)+(ayat/maxA); pct=(done/count)*100;
    } else { var st=JABS[jz], en=juzEndAbs(jz); pct=((absIndex(surah,ayat)-st+1)/(en-st+1))*100; }
    if(pct<0)pct=0; if(pct>100)pct=100;
    var seq=juzSeq(jz);
    var pctTotal=seq?(((seq-1)+(pct/100))/JUZ_ORDER.length)*100:0;
    return { pct:Math.round(pct), juz:jz, seq:seq, pctTotal:Math.round(pctTotal) };
  }

  // ===== TILAWAH: At-Tanzil jilid 1-6 + halaman =====
  var TANZIL_HAL_DEFAULT = { 1:44, 2:44, 3:44, 4:44, 5:44, 6:44 };
  function tanzilHal(){
    var o=window.ZTF_TANZIL_HAL;
    if(o&&typeof o==='object'){ var out={}; for(var j=1;j<=6;j++){ out[j]=parseInt(o[j],10)||TANZIL_HAL_DEFAULT[j]; } return out; }
    return TANZIL_HAL_DEFAULT;
  }
  function isTilawahKat(kat){ return /tilawah/i.test(String(kat||'')); }
  function tanzilOptions(sel){
    var o='<option value="">- At-Tanzil -</option>';
    for(var t=1;t<=6;t++){ o+='<option value="'+t+'"'+(String(sel)===String(t)?' selected':'')+'>At-Tanzil '+t+'</option>'; }
    return o;
  }
  function tanzilNote(tanzil, halaman){
    var t=parseInt(tanzil,10)||0, h=parseInt(halaman,10)||0, parts=[];
    if(t) parts.push('At-Tanzil '+t);
    if(h) parts.push('Hal. '+h);
    if(!parts.length) return '';
    return '['+parts.join(' \u00b7 ')+']';
  }
  function stripTanzilNote(cat){ return String(cat==null?'':cat).replace(/\s*\[At-Tanzil[^\]]*\]\s*$/i,'').replace(/\s*\[Hal\.[^\]]*\]\s*$/i,''); }
  function parseTanzilNote(cat){
    // Ambil kemunculan TERAKHIR, karena catatan ringkasan bisa memuat beberapa surah.
    var raw=String(cat==null?'':cat), t=0, h=0, m;
    var reT=/At-Tanzil\s*(\d+)/gi; while((m=reT.exec(raw))!==null){ t=parseInt(m[1],10)||0; }
    var reH=/Hal\.?\s*(\d+)/gi; while((m=reH.exec(raw))!==null){ h=parseInt(m[1],10)||0; }
    return { tanzil:t, halaman:h };
  }
  function computeTanzilProgres(tanzil, halaman){
    var t=parseInt(tanzil,10)||0, h=parseInt(halaman,10)||0;
    if(t<1||t>6) return { tanzil:0, halaman:h, pct:0 };
    var HAL=tanzilHal(), total=0, sebelum=0;
    for(var j=1;j<=6;j++){ total+=HAL[j]; if(j<t) sebelum+=HAL[j]; }
    var maxH=HAL[t]||0;
    if(h<0) h=0; if(maxH&&h>maxH) h=maxH;
    var pct=total?(((sebelum+h)/total)*100):0;
    if(pct<0)pct=0; if(pct>100)pct=100;
    return { tanzil:t, halaman:h, pct:Math.round(pct) };
  }
  function tanzilProgText(tanzil, halaman, sep){
    sep=sep||' \u00b7 ';
    var p=computeTanzilProgres(tanzil, halaman);
    if(!p.tanzil) return '';
    return 'At-Tanzil '+p.tanzil+'/6'+(p.halaman?(sep+'Hal. '+p.halaman):'')+sep+p.pct+'%';
  }

  var CATS_WALI = ["Ziyadah","Muroja'ah","Tilawah"];
  var CATS_SEKOLAH = ["Ziyadah","Muroja'ah","Tilawah"];

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;'); }
  function nowISO(){ return new Date().toISOString(); }
  function curSemester(){ var m=new Date().getMonth()+1; return (m>=7&&m<=12)?'Ganjil':'Genap'; }
  function curTA(){ var d=new Date(),y=d.getFullYear(),m=d.getMonth()+1; return (m>=7)?(y+'/'+(y+1)):((y-1)+'/'+y); }
  function todayStr(){ var d=new Date(); var mm=String(d.getMonth()+1); if(mm.length<2)mm='0'+mm; var dd=String(d.getDate()); if(dd.length<2)dd='0'+dd; return d.getFullYear()+'-'+mm+'-'+dd; }
  function SB(){ return window.ZymataMobileSupabase; }
  function activeTahfidz(){ return appState.activeTab==='module:mutabaah-tahfidz'; }
  // [PERBAIKAN MUTABAAH WALI] Dulu fungsi ini bisa mengembalikan tanda '-', karena profil
  // anak memakai '-' sebagai isian kosong. Akibatnya wali menyimpan dan mencari data dengan
  // siswa_id '-', sehingga tidak pernah bertemu data guru, dan sebaliknya.
  function childNis(){
    var v = String(appState.childNis || (childProfile && childProfile.nis) || '').trim();
    if(!v || v === '-' || v === 'null' || v === 'undefined'){
      try{ v = String(window.__ZYMATA_CHILD_NIS || '').trim(); }catch(e){ v = ''; }
    }
    if(v === '-' || v === 'null' || v === 'undefined') v = '';
    return v;
  }
  function childNama(){ return String((childProfile&&childProfile.fullName)||appState.childName||'Anak'); }
  function childKelas(){ return String(appState.childClass||(childProfile&&childProfile.className)||''); }
  function toast(msg,type){ try{ if(typeof waliToast==='function'){ waliToast(msg,type); return; } }catch(e){} }

  // [LEMBAR 1 BULAN WALI] lembarBulan = bulan lembar yang sedang dilihat, 'YYYY-MM'
  var WT = { tab:'wali_murid', wali:{}, sekolah:{}, riwayat:[], riwayatSekolah:[], loading:false, loadedNis:null, tgl:todayStr(), cleared:false, draft:{}, lembarBulan:'' };

  // Isi form mengikuti TANGGAL yang dipilih: kalau tanggal itu belum ada setoran,
  // form dibiarkan kosong supaya wali tidak menyimpan ulang data lama.
  function rowsForTgl(kat){
    var tg=String(WT.tgl||'').slice(0,10);
    return (WT.riwayat||[]).filter(function(r){
      return String(r.kategori||'')===String(kat) && String(r.tanggal||r.tgl||'').slice(0,10)===tg;
    });
  }
  function isHariIni(){ return String(WT.tgl||'').slice(0,10)===todayStr(); }
  function recForKat(kat){
    if(WT.cleared) return {};
    var rows=rowsForTgl(kat);
    if(rows.length){
      var r=rows[rows.length-1];
      return { surah:r.surah_no, ayat:r.ayat, catatan:r.catatan, juz:r.juz, progres:r.progres, surah_nama:r.surah_nama };
    }
    // Khusus TANGGAL HARI INI: boleh terisi dari setoran terakhir sebagai acuan.
    if(isHariIni()) return WT.wali[kat]||{};
    return {};
  }
  function adaSetoranTgl(){
    for(var i=0;i<CATS_WALI.length;i++){ if(rowsForTgl(CATS_WALI[i]).length) return true; }
    return false;
  }
  function adaIsiForm(){
    if(WT.cleared) return false;
    for(var i=0;i<CATS_WALI.length;i++){ var rc=recForKat(CATS_WALI[i]); if(rc&&rc.surah) return true; }
    return false;
  }

  // MULTI-SURAH (wali): entri per kategori berupa ARRAY {surah,ayat,catatan,tanzil,halaman}
  function wEntriesForKat(kat){
    var d=WT.draft[kat];
    if(Array.isArray(d)) return d.length?d:[{}];
    if(WT.cleared) return [{}];
    var rows=rowsForTgl(kat);
    if(rows.length){
      return rows.map(function(r){
        var tz=parseTanzilNote(r.catatan||'');
        return { surah:r.surah_no, ayat:r.ayat, catatan:stripTanzilNote(r.catatan||''), tanzil:(tz.tanzil||''), halaman:(tz.halaman||'') };
      });
    }
    var rc=recForKat(kat);
    if(rc&&rc.surah){
      var tz2=parseTanzilNote(rc.catatan||'');
      return [{ surah:rc.surah, ayat:rc.ayat, catatan:stripTanzilNote(rc.catatan||''), tanzil:(tz2.tanzil||''), halaman:(tz2.halaman||'') }];
    }
    return [{}];
  }
  // Simpan isi input yang sedang diketik supaya tidak hilang saat tambah/hapus surah.
  function wSyncDraftFromDOM(){
    try{
      CATS_WALI.forEach(function(kat,c){
        var entries=wEntriesForKat(kat), arr=[];
        for(var r=0;r<entries.length;r++){
          var prev=entries[r]||{};
          var sEl=document.getElementById('zwtf-surah-'+c+'-'+r);
          var aEl=document.getElementById('zwtf-ayat-'+c+'-'+r);
          var cEl=document.getElementById('zwtf-cat-'+c+'-'+r);
          var tEl=document.getElementById('zwtf-tanzil-'+c+'-'+r);
          var hEl=document.getElementById('zwtf-hal-'+c+'-'+r);
          if(!sEl&&!aEl&&!cEl&&!tEl&&!hEl){ arr.push(prev); continue; }
          arr.push({ surah:(sEl?sEl.value:prev.surah), ayat:(aEl?aEl.value:prev.ayat), catatan:(cEl?cEl.value:prev.catatan), tanzil:(tEl?tEl.value:(prev.tanzil||'')), halaman:(hEl?hEl.value:(prev.halaman||'')) });
        }
        WT.draft[kat]=arr.length?arr:[{}];
      });
    }catch(e){}
  }
  function adaIsiDraft(){
    for(var i=0;i<CATS_WALI.length;i++){
      var kat=CATS_WALI[i], _isTil=isTilawahKat(kat);
      var ents=wEntriesForKat(kat);
      for(var r=0;r<ents.length;r++){
        if((parseInt(ents[r].surah,10)||0)>0) return true;
        // [TILAWAH TANPA SURAH] At-Tanzil/halaman saja juga dihitung sebagai isi.
        if(_isTil && ((parseInt(ents[r].tanzil,10)||0)>0 || (parseInt(ents[r].halaman,10)||0)>0)) return true;
      }
    }
    return false;
  }

  async function loadTahfidz(nis){
    if(WT.loading) return;
    WT.loading=true; WT.loadedNis=nis;
    try{
      var api=SB(); var rows=[];
      if(api && nis){ var res=await api.select('mutabaah_tahfidz',{ eq:{ siswa_id:String(nis) }, limit:400 }); rows=(res&&res.data)?res.data:[]; }
      var ta=curTA(), sem=curSemester(), dw={}, dsk={};
      rows.forEach(function(r){
        if(String(r.tahun_ajaran||'')!==ta||String(r.semester||'')!==sem) return;
        var rec={ surah:r.surah_no, ayat:r.ayat, catatan:r.catatan, juz:r.juz, progres:r.progres, surah_nama:r.surah_nama };
        if(String(r.konteks||'')==='wali_murid') dw[r.kategori]=rec; else if(String(r.konteks||'')==='sekolah') dsk[r.kategori]=rec;
      });
      WT.wali=dw; WT.sekolah=dsk;
      try{ if(api&&nis){ var rr=await api.select('mutabaah_tahfidz_riwayat',{ eq:{ siswa_id:String(nis), konteks:'wali_murid' }, order:'tanggal', ascending:false, limit:800 }); WT.riwayat=(rr&&rr.data)?rr.data:[]; } else { WT.riwayat=[]; } }catch(e){ WT.riwayat=[]; }
      try{ if(api&&nis){ var rs=await api.select('mutabaah_tahfidz_riwayat',{ eq:{ siswa_id:String(nis), konteks:'sekolah' }, order:'tanggal', ascending:false, limit:800 }); WT.riwayatSekolah=(rs&&rs.data)?rs.data:[]; } else { WT.riwayatSekolah=[]; } }catch(e){ WT.riwayatSekolah=[]; }
    }catch(e){ WT.wali={}; WT.sekolah={}; WT.riwayat=[]; WT.riwayatSekolah=[]; }
    WT.loading=false;
    if(activeTahfidz()) render();
  }

  window.zwTf = {
    setTab: function(t){ WT.tab=(t==='sekolah')?'sekolah':'wali_murid'; render(); },
    // [LEMBAR 1 BULAN WALI] geser bulan lembar
    geserLembarBulan: function(delta){
      var ym=WT.lembarBulan||zlbBulanIni(); var a=String(ym).split('-');
      var y=parseInt(a[0],10), m=parseInt(a[1],10)+(parseInt(delta,10)||0);
      if(m<1){ m=12; y--; } if(m>12){ m=1; y++; }
      WT.lembarBulan=y+'-'+zlbPad2(m); render();
    },
    setTanggal: function(v){ WT.tgl=String(v||'').slice(0,10)||todayStr(); WT.cleared=false; WT.draft={}; render(); },
    kosongkanForm: function(){ WT.cleared=true; WT.draft={}; render(); toast('Form dikosongkan.','info'); },
    recalc: function(c,r){
      var sEl=document.getElementById('zwtf-surah-'+c+'-'+r), aEl=document.getElementById('zwtf-ayat-'+c+'-'+r), pEl=document.getElementById('zwtf-prog-'+c+'-'+r);
      if(!pEl) return;
      var kat=CATS_WALI[c]||'';
      if(isTilawahKat(kat)){
        var tEl=document.getElementById('zwtf-tanzil-'+c+'-'+r), hEl=document.getElementById('zwtf-hal-'+c+'-'+r);
        var tp=computeTanzilProgres(tEl?tEl.value:'', hEl?hEl.value:'');
        if(tp.tanzil){ pEl.textContent='At-Tanzil '+tp.tanzil+'/6'+(tp.halaman?(' - Hal. '+tp.halaman):'')+' - '+tp.pct+'%'; return; }
        // [PROGRES TANPA ACUAN] Halaman tanpa At-Tanzil: jilid tak diketahui,
        // tampilkan halamannya saja, jangan "Belum ada" atau 0%.
        var _hOnly=parseInt(hEl?hEl.value:'',10)||0;
        if(_hOnly && !(parseInt(sEl?sEl.value:'',10)||0)){ pEl.textContent='Hal. '+_hOnly; return; }
      }
      if(!sEl||!aEl) return;
      var rp=computeProgres(sEl.value, aEl.value);
      pEl.textContent = rp.juz ? ('Juz '+rp.juz+' - '+rp.pct+'%'+(rp.seq?(' - tahap '+rp.seq+'/30'):'')) : 'Belum ada';
    },
    addSurah: function(c){ wSyncDraftFromDOM(); var kat=CATS_WALI[c]; if(!kat) return; var arr=wEntriesForKat(kat).slice(); arr.push({}); WT.cleared=false; WT.draft[kat]=arr; render(); },
    delSurah: function(c,r){ wSyncDraftFromDOM(); var kat=CATS_WALI[c]; if(!kat) return; var arr=wEntriesForKat(kat).slice(); arr.splice(r,1); if(!arr.length) arr=[{}]; WT.draft[kat]=arr; render(); },
    save: async function(){
      var api=SB(); if(!api){ toast('Supabase belum siap','error'); return; }
      var nis=childNis(); if(!nis){ toast('Data anak belum termuat','error'); return; }
      var nama=childNama(), kelas=childKelas();
      var tglEl=document.getElementById('zwtf-tanggal'); var tgl=(tglEl&&tglEl.value)?tglEl.value:(WT.tgl||todayStr()); WT.tgl=String(tgl).slice(0,10);
      var ta=curTA(), sem=curSemester(), saved=0, failed=0, filled=0, logs=[];
      wSyncDraftFromDOM();
      // Wajibkan kolom Ayat: surah dipilih tapi ayat kosong -> jangan simpan.
      for(var vc=0;vc<CATS_WALI.length;vc++){
        var vkat=CATS_WALI[vc], vents=wEntriesForKat(vkat);
        for(var vr=0;vr<vents.length;vr++){
          var vs=parseInt(vents[vr].surah,10)||0, va=parseInt(vents[vr].ayat,10)||0;
          if(vs && (!va||va<1)){
            toast('Isi jumlah ayat untuk '+vkat+' (surah '+(vr+1)+') dulu.','error');
            var vaEl=document.getElementById('zwtf-ayat-'+vc+'-'+vr);
            if(vaEl){ try{ vaEl.focus(); }catch(err){} }
            return;
          }
        }
      }
      for(var i=0;i<CATS_WALI.length;i++){
        var kat=CATS_WALI[i];
        // [TILAWAH TANPA SURAH] Dulu entri tanpa surah selalu dibuang, padahal
        // formnya punya input At-Tanzil + Halaman. Sekarang Tilawah boleh disimpan
        // hanya dengan At-Tanzil dan/atau Halaman — sama seperti jalur guru.
        var _isTil=isTilawahKat(kat);
        var entries=wEntriesForKat(kat).filter(function(en){
          if((parseInt(en.surah,10)||0)>0) return true;
          return _isTil && ((parseInt(en.tanzil,10)||0)>0 || (parseInt(en.halaman,10)||0)>0);
        });
        if(!entries.length) continue;
        filled++;
        var parts=[], combinedCat=[], last=null;
        for(var r=0;r<entries.length;r++){
          var en=entries[r];
          var surah_no=parseInt(en.surah,10)||0;
          var ayat=parseInt(en.ayat,10)||0;
          var prog=computeProgres(surah_no,ayat);
          var snama=(SURAH[surah_no-1]?SURAH[surah_no-1][0]:'');
          var cat=stripTanzilNote(en.catatan||'');
          var _progVal=prog.pct;
          if(_isTil){
            var _note=tanzilNote(en.tanzil, en.halaman);
            if(_note) cat = cat ? (cat+' '+_note) : _note;
            var _tzp=computeTanzilProgres(en.tanzil, en.halaman);
            if(_tzp.tanzil) _progVal=_tzp.pct;
            // [PROGRES TANPA ACUAN] Tilawah tanpa surah dan tanpa At-Tanzil:
            // jilid tak diketahui, persen tidak bisa dihitung. Simpan null,
            // jangan 0 yang tampil "0%" seolah tidak ada kemajuan.
            else if(!surah_no) _progVal=null;
          }
          // Riwayat: satu baris per surah.
          logs.push({ client_key:'default', konteks:'wali_murid', siswa_id:String(nis), nis:String(nis), nama_siswa:nama, kelas:kelas, kategori:kat, surah_no:surah_no, surah_nama:snama, ayat:ayat, juz:prog.juz, progres:_progVal, catatan:cat, tanggal:tgl, tahun_ajaran:ta, semester:sem, guru_nip:'', guru_nama:('Wali - '+nama) });
          // [TILAWAH TANPA SURAH] label ringkasan dari At-Tanzil/halaman bila surah kosong.
          parts.push(snama?(snama+' ('+ayat+' ayat)'):((tanzilNote(en.tanzil,en.halaman)||'').replace(/^\[/,'').replace(/\]$/,'')||'Tilawah'));
          if(cat) combinedCat.push(snama?snama+': '+cat:cat);
          last={ surah_no:surah_no, ayat:ayat, prog:prog, progVal:_progVal };
        }
        // Ringkasan: satu baris per kategori, nama surah digabung.
        // [PROGRES TANPA ACUAN] entri terakhir tanpa surah & tanpa progres terhitung
        // -> simpan null, bukan jatuh ke prog.pct yang bernilai 0.
        var _ringkasProg = (last.progVal!=null) ? last.progVal
                         : (last.surah_no ? last.prog.pct : null);
        var body={ client_key:'default', konteks:'wali_murid', siswa_id:String(nis), nis:String(nis), nama_siswa:nama, kelas:kelas, kategori:kat, surah_no:last.surah_no, surah_nama:parts.join(' \u00b7 '), ayat:last.ayat, juz:last.prog.juz, progres:_ringkasProg, catatan:combinedCat.join(' | '), tahun_ajaran:ta, semester:sem, updated_at:nowISO() };
        var res=await api.upsert('mutabaah_tahfidz',body,'client_key,siswa_id,konteks,kategori,tahun_ajaran,semester');
        if(res&&res.error) failed++; else saved++;
      }
      if(!filled){ toast('Isi minimal 1 kategori','error'); return; }
      // ANTI-DOBEL + KOREKSI RIWAYAT.
      //
      // [KOREKSI SETORAN] Dulu baris dengan kategori+surah+ayat+tanggal yang sama
      // selalu DILEWATI, dan sisanya ditulis dengan api.insert yang galatnya
      // ditelan `catch(e){}` kosong. Akibatnya wali tidak bisa mengoreksi setoran
      // tanggal sebelumnya (mis. menambahkan At-Tanzil yang tertinggal), dan bila
      // isian berubah, INSERT-nya ditolak unique index mtr_unik_v2 secara diam-diam
      // sementara ringkasan tetap ikut berubah — terlihat "tersimpan" padahal tidak.
      //
      // Sekarang: isi identik -> dilewati; kunci database sama tapi isi berubah ->
      // baris lama DI-UPDATE; benar-benar baru -> insert. Galat selalu ditampilkan.
      var skipDobel=0, dikoreksi=0, gagalRiwayat=0, tergabung=0;
      if(logs.length){
        // Tanda ISI: untuk membedakan "benar-benar sama" vs "berubah".
        var _sigOf=function(l){
          var _q=parseTanzilNote(l&&l.catatan||'');
          return [String(l.kategori||''),String(l.surah_no||''),String(l.ayat||''),
                  String(_q.tanzil||''),String(_q.halaman||''),
                  String(l.catatan==null?'':l.catatan).trim(),
                  String(l.progres==null?'':l.progres),
                  String(l.tanggal||'').slice(0,10)].join('|');
        };
        // Tanda KUNCI DATABASE: persis kolom unique index mtr_unik_v2.
        var _dbKeyOf=function(l){
          return [String(l.kategori||''),
                  String(parseInt(l.surah_no,10)||0),
                  String(parseInt(l.ayat,10)||0),
                  String(l.tanggal||'').slice(0,10)].join('|');
        };

        // 1) Kembar persis di dalam form.
        var _seen={}, _uniq=[];
        logs.forEach(function(l){ var sg=_sigOf(l); if(_seen[sg]){ skipDobel++; return; } _seen[sg]=1; _uniq.push(l); });
        logs=_uniq;

        // 2) Beda isi tapi kunci database sama (mis. dua Tilawah tanpa surah di
        //    tanggal sama) -> hanya satu yang bisa hidup di tabel. Pakai isian
        //    terakhir dan beri tahu, jangan buang diam-diam.
        var _byKey={}, _urut=[];
        logs.forEach(function(l){
          var k=_dbKeyOf(l);
          if(_byKey[k]===undefined){ _byKey[k]=_urut.length; _urut.push(l); }
          else { _urut[_byKey[k]]=l; tergabung++; }
        });
        logs=_urut;

        // 3) Bandingkan dengan yang sudah tersimpan pada tanggal ini.
        var _updates=[];
        try{
          var _ex=await api.select('mutabaah_tahfidz_riwayat',{ eq:{ siswa_id:String(nis), konteks:'wali_murid', tanggal:tgl }, limit:400 });
          if(_ex&&_ex.error) throw new Error(_ex.error.message||'gagal membaca riwayat');
          var _exRows=(_ex&&_ex.data)?_ex.data:[];
          if(_exRows.length){
            var _exByKey={};
            _exRows.forEach(function(r){ _exByKey[_dbKeyOf(r)]=r; });
            logs=logs.filter(function(l){
              var lama=_exByKey[_dbKeyOf(l)];
              if(!lama) return true;                                        // baru -> insert
              if(_sigOf(lama)===_sigOf(l)){ skipDobel++; return false; }   // sama -> lewati
              if(lama.id==null) return false;                               // tak ber-id -> tak bisa di-update
              _updates.push({ id:lama.id, row:l });                         // berubah -> KOREKSI
              return false;
            });
          }
        }catch(e){
          toast('Gagal memeriksa riwayat tanggal ini: '+String(e&&e.message||e),'error');
          return;
        }

        // 4) Koreksi dijalankan satu per satu dan hasilnya DIPERIKSA.
        if(_updates.length){
          var client=(api.getClient?api.getClient():null);
          if(!client||!client.from){
            toast('Tidak bisa menyimpan koreksi: koneksi Supabase belum siap.','error');
            return;
          }
          for(var u=0;u<_updates.length;u++){
            var _up=_updates[u];
            var _isi={ surah_nama:_up.row.surah_nama, juz:_up.row.juz, progres:_up.row.progres,
                       catatan:_up.row.catatan, nama_siswa:_up.row.nama_siswa, kelas:_up.row.kelas,
                       tahun_ajaran:_up.row.tahun_ajaran, semester:_up.row.semester };
            try{
              var _ur=await client.from('mutabaah_tahfidz_riwayat').update(_isi).eq('id',_up.id);
              if(_ur&&_ur.error) gagalRiwayat++; else dikoreksi++;
            }catch(e2){ gagalRiwayat++; }
          }
        }
      }
      // 5) Baris baru: hasilnya DIPERIKSA, bukan ditelan catch kosong.
      if(logs.length){
        try{
          var _ins=await api.insert('mutabaah_tahfidz_riwayat', logs);
          if(_ins&&_ins.error) gagalRiwayat+=logs.length;
        }catch(e){ gagalRiwayat+=logs.length; }
      }
      if(tergabung) toast(tergabung+' baris Tilawah di tanggal ini digabung jadi satu (isian terakhir yang dipakai).','info');
      if(skipDobel) toast(skipDobel+' data tidak berubah, dilewati.','info');
      if(gagalRiwayat){
        toast(gagalRiwayat+' baris riwayat GAGAL disimpan. Coba simpan ulang.','error');
      }
      if(saved||dikoreksi){
        if(!gagalRiwayat){
          toast(dikoreksi ? ('Tersimpan \u00b7 '+dikoreksi+' setoran dikoreksi') : ('Tersimpan '+saved+' kategori'),'success');
        }
        WT.cleared=false; WT.draft={}; WT.loadedNis=null; loadTahfidz(nis);
      }
      else if(!gagalRiwayat) toast('Gagal menyimpan','error');
    }
  };

  function styleTag(){
    return '<style id="zwtf-style">'
      +'.zwtf-tabs{display:flex;gap:8px;margin:2px 0 12px}'
      +'.zwtf-tab{flex:1;border:1px solid #e2e8f0;background:#fff;color:#475569;border-radius:12px;padding:10px;font-size:13px;font-weight:800;cursor:pointer;-webkit-tap-highlight-color:transparent}'
      +'.zwtf-tab.on{background:#0f766e;border-color:#0f766e;color:#fff;box-shadow:0 6px 16px rgba(15,118,110,.25)}'
      +'.zwtf-child{display:flex;align-items:center;gap:10px;margin-bottom:12px}'
      +'.zwtf-cat{border:1px solid #eef2f7;border-radius:14px;padding:12px;margin-bottom:10px;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.05)}'
      +'.zwtf-cat-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}'
      +'.zwtf-cat-title{font-weight:800;font-size:14px;color:#0f172a}'
      +'.zwtf-chip{display:inline-block;background:#ccfbf1;color:#0f766e;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:800}'
      +'.zwtf-ro{border:1px solid #eef2f7;border-radius:14px;padding:12px;margin-bottom:10px;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.05)}'
      +'.zwtf-ro-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}'
      +'.zwtf-ro-title{font-weight:800;font-size:14px;color:#0f172a}'
      +'.zwtf-ro-meta{font-size:12px;color:#64748b;margin-top:2px}'
      +'.zwtf-row-sep{border-top:1px dashed #e2e8f0;margin-top:12px;padding-top:12px}'
      +'.zwtf-row-head{display:flex;align-items:center;justify-content:space-between;margin:2px 0 6px}'
      +'.zwtf-row-no{font-size:12px;font-weight:800;color:#475569}'
      +'.zwtf-count{background:#e0f2fe;color:#0369a1}'
      +'.zwtf-add{width:100%;margin-top:10px;border:1px dashed #0f766e;background:#f0fdfa;color:#0f766e;border-radius:12px;padding:10px;font-size:13px;font-weight:800;cursor:pointer;-webkit-tap-highlight-color:transparent}'
      +'.zwtf-del{width:100%;margin-top:8px;border:1px solid #fecaca;background:#fff1f2;color:#b91c1c;border-radius:12px;padding:9px;font-size:12px;font-weight:800;cursor:pointer;-webkit-tap-highlight-color:transparent}'
      +'.zwtf-note{text-align:center;color:#64748b;font-size:12px;font-weight:700;margin:10px 0}'
      /* [LEMBAR 1 BULAN WALI] */
      +'.zlb-wrap{border:1px solid #e5e7eb;border-radius:14px;padding:12px;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.05)}'
      +'.zlb-ttl{font-weight:800;font-size:14px;color:#0f172a;margin:0 0 2px}'
      +'.zlb-sub{font-size:11.5px;color:#94a3b8;font-weight:700;margin:0}'
      +'.zlb-bar{display:flex;align-items:center;justify-content:center;gap:10px;margin:10px 0}'
      +'.zlb-nav{width:34px;height:34px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;color:#0f766e;font-size:16px;font-weight:800;cursor:pointer;-webkit-tap-highlight-color:transparent}'
      +'.zlb-nav:active{transform:scale(.94)}'
      +'.zlb-bln{font-size:14px;font-weight:800;color:#0f172a;min-width:130px;text-align:center}'
      +'.zlb-stat{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}'
      +'.zlb-chip{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:4px 9px;font-size:11.5px;color:#64748b;font-weight:700}'
      +'.zlb-chip b{color:#0f766e}'
      +'.zlb-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid #e5e7eb;border-radius:12px}'
      +'.zlb-tab{border-collapse:collapse;width:100%;min-width:520px;font-size:12px;background:#fff}'
      +'.zlb-tab th{background:#f8fafc;color:#475569;font-size:10.5px;letter-spacing:.03em;padding:8px 6px;border:1px solid #e5e7eb;text-align:center;white-space:nowrap;font-weight:800}'
      +'.zlb-tab td{padding:6px;border:1px solid #eef2f7;color:#0f172a;vertical-align:top;line-height:1.35}'
      +'.zlb-tab tr.on td{background:#f0fdfa}'
      +'.zlb-tgl{text-align:center;font-weight:800;width:38px;white-space:nowrap;color:#475569}'
      +'.zlb-tgl small{display:block;font-weight:700;color:#94a3b8;font-size:9.5px}'
      +'.zlb-cat{color:#64748b;font-size:11.5px;min-width:120px}'
      +'.zlb-pct{color:#0f766e;font-weight:800}'
      +'.zlb-d{color:#cbd5e1}'
      +'</style>';
  }

  function surahOptions(selNo){
    var out='<option value="">Pilih surah</option>';
    var curJuz=null;
    SURAH_ORDER.forEach(function(it){
      if(it.juz!==curJuz){
        if(curJuz!==null) out+='</optgroup>';
        curJuz=it.juz;
        out+='<optgroup label="Juz '+curJuz+'">';
      }
      var sel=(String(selNo||'')===String(it.no))?' selected':'';
      out+='<option value="'+it.no+'"'+sel+'>'+it.no+'. '+esc(SURAH[it.no-1][0])+'</option>';
    });
    if(curJuz!==null) out+='</optgroup>';
    return out;
  }

  /* ---------- [LEMBAR 1 BULAN WALI] lembar bulanan (ganti riwayat per tanggal) ---------- */
  var ZLB_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var ZLB_HARI  = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  function zlbPad2(n){ n=String(n); return n.length<2?('0'+n):n; }
  function zlbBulanIni(){ var d=new Date(); return d.getFullYear()+'-'+zlbPad2(d.getMonth()+1); }
  function zlbJmlHari(ym){ var a=String(ym||'').split('-'); return new Date(parseInt(a[0],10), parseInt(a[1],10), 0).getDate(); }
  function zlbIsiSel(r){
    var nm=String(r.surah_nama||((r.surah_no&&SURAH[r.surah_no-1])?SURAH[r.surah_no-1][0]:'')).trim();
    var ay=parseInt(r.ayat,10)||0;
    var inti = nm ? (/ayat/.test(nm)?nm:(nm+(ay>0?(' : '+ay):''))) : (ay>0?('ayat '+ay):'');
    var pct=null;
    if(isTilawahKat(r.kategori||'')){
      // At-Tanzil: setoran tilawah bisa tanpa surah, jadi labelnya dari catatan.
      var q=parseTanzilNote(r.catatan||'');
      var tt=tanzilProgText(q.tanzil, q.halaman);
      if(tt){ pct=computeTanzilProgres(q.tanzil,q.halaman).pct; if(!inti) inti='At-Tanzil '+q.tanzil+(q.halaman?(' \u00b7 Hal. '+q.halaman):''); }
    }
    if(pct===null){
      var pr=r.surah_no?computeProgres(r.surah_no, r.ayat):null;
      pct=(pr&&pr.juz)?pr.pct:((r.progres!=null&&r.progres!=='')?Math.round(Number(r.progres)||0):null);
    }
    // [PROGRES TANPA ACUAN] Tilawah tanpa surah dan tanpa At-Tanzil tidak punya
    // dasar hitung persen. Baris lama menyimpan 0 dan tampil "0%" padahal
    // halamannya maju — persennya disembunyikan saja.
    if(pct===0 && !(parseInt(r.surah_no,10)||0) && isTilawahKat(r.kategori||'') && !q2TanzilOf(r)) pct=null;
    if(!inti && (pct===null||isNaN(pct))) return '';
    return esc(inti)+((pct!==null&&!isNaN(pct))?(' <span class="zlb-pct">'+pct+'%</span>'):'');
  }
  // Pembantu kecil: At-Tanzil tercatat di catatan baris ini atau tidak.
  function q2TanzilOf(r){ return parseTanzilNote(r&&r.catatan||'').tanzil; }
  function lembarBulanHtml(srcArr, labelTitle){
    var rows = Array.isArray(srcArr) ? srcArr : [];
    var ym = WT.lembarBulan || zlbBulanIni(); WT.lembarBulan = ym;
    var th=parseInt(String(ym).split('-')[0],10), bl=parseInt(String(ym).split('-')[1],10);
    var head='<p class="zlb-ttl">\uD83D\uDCC5 Lembar 1 Bulan \u00b7 '+esc(labelTitle||'Mutabaah Tahfidz')+'</p>'
      +'<p class="zlb-sub">'+esc(childNama())+' \u00b7 '+esc(childKelas())+'</p>'
      +'<div class="zlb-bar">'
      +'<button type="button" class="zlb-nav" onclick="window.zwTf.geserLembarBulan(-1)">&lsaquo;</button>'
      +'<span class="zlb-bln">'+esc(ZLB_BULAN[bl-1]+' '+th)+'</span>'
      +'<button type="button" class="zlb-nav" onclick="window.zwTf.geserLembarBulan(1)">&rsaquo;</button>'
      +'</div>';
    var reT=/tilawah/i, reM=/muroja|muraja/i, reZ=/ziyad|ziad/i;
    var perTgl={}, unik={};
    rows.forEach(function(r){
      if(!r) return;
      var d=String(r.tanggal||r.tgl||r.created_at||'').slice(0,10);
      if(!d || d.slice(0,7)!==ym) return;
      var k=[d,String(r.kategori||''),String(r.surah_no==null?'':r.surah_no),String(r.ayat==null?'':r.ayat),String(r.catatan||'')].join('|');
      if(unik[k]) return; unik[k]=1;
      (perTgl[d]=perTgl[d]||[]).push(r);
    });
    var nd=zlbJmlHari(ym), trs='', adaTotal=0, isiT=0, isiM=0, isiZ=0;
    for(var d1=1; d1<=nd; d1++){
      var ds=ym+'-'+zlbPad2(d1), list=perTgl[ds]||[];
      var sel=function(re){
        return list.filter(function(r){ return re.test(String(r.kategori||'')); }).map(zlbIsiSel).filter(Boolean).join('<br>');
      };
      var cT=sel(reT), cM=sel(reM), cZ=sel(reZ);
      if(cT) isiT++; if(cM) isiM++; if(cZ) isiZ++;
      var cats=list.map(function(r){ return String(r.catatan||'').trim(); }).filter(Boolean);
      var cC=cats.length?esc(cats.join(' \u00b7 ')):'';
      var ada=!!(cT||cM||cZ||cC); if(ada) adaTotal++;
      var dt=new Date(th, bl-1, d1);
      trs+='<tr'+(ada?' class="on"':'')+'>'
        +'<td class="zlb-tgl">'+d1+'<small>'+ZLB_HARI[dt.getDay()]+'</small></td>'
        +'<td>'+(cT||'<span class="zlb-d">&ndash;</span>')+'</td>'
        +'<td>'+(cM||'<span class="zlb-d">&ndash;</span>')+'</td>'
        +'<td>'+(cZ||'<span class="zlb-d">&ndash;</span>')+'</td>'
        +'<td class="zlb-cat">'+cC+'</td></tr>';
    }
    var h=head;
    h+='<div class="zlb-stat">'
      +'<span class="zlb-chip">Hari terisi <b>'+adaTotal+'</b> / '+nd+'</span>'
      +'<span class="zlb-chip">Tilawah <b>'+isiT+'</b></span>'
      +'<span class="zlb-chip">Muroja\u2019ah <b>'+isiM+'</b></span>'
      +'<span class="zlb-chip">Ziyadah <b>'+isiZ+'</b></span>'
      +'</div>';
    h+='<div class="zlb-scroll"><table class="zlb-tab"><thead><tr>'
      +'<th>TGL</th><th>TILAWAH</th><th>MUROJA\u2019AH</th><th>ZIYADAH</th><th>CATATAN</th>'
      +'</tr></thead><tbody>'+trs+'</tbody></table></div>';
    if(WT.loading) h+='<p class="zwtf-note">Memuat lembar bulanan...</p>';
    else if(!adaTotal) h+='<p class="zwtf-note">Belum ada setoran pada bulan ini. Geser bulan dengan tombol &lsaquo; &rsaquo;.</p>';
    return '<section class="section"><div class="zlb-wrap">'+h+'</div></section>';
  }

  function riwayatHtml(srcArr, labelTitle){
    var arr = Array.isArray(srcArr) ? srcArr : [];
    var sumOpen = '<summary class="riwayat-absen-summary" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800;list-style:none;-webkit-tap-highlight-color:transparent">';
    var head = '\uD83D\uDCC5 Riwayat ' + (labelTitle||'Mutabaah Tahfidz');
    if(!arr.length){
      return '<section class="section"><details class="riwayat-absen-toggle" style="border:1px solid #e5e7eb;border-radius:14px;padding:10px 14px;background:#fff">'
        + sumOpen + '<span class="riwayat-absen-title">'+head+'</span><span class="riwayat-absen-hint" style="font-size:11px;color:#94a3b8;font-weight:700">Lihat detail \u203A</span></summary>'
        + '<div class="riwayat-absen-body" style="padding-top:10px"><div class="timeline">'
        + ((typeof scheduleCard==='function')?scheduleCard({ time:'Info', title:'Belum ada riwayat', meta:'Setoran tahfidz yang kamu simpan akan tampil di sini per tanggal.', status:'Kosong', tone:'blue' }):'')
        + '</div></div></details></section>';
    }
    var groups={};
    arr = arr.slice().sort(function(a,b){ return String(b.tanggal||b.tgl||'').slice(0,10).localeCompare(String(a.tanggal||a.tgl||'').slice(0,10)); });
    arr.forEach(function(r){ var d=String(r.tanggal||r.tgl||'').slice(0,10)||'-'; (groups[d]=groups[d]||[]).push(r); });
    var dates=Object.keys(groups).sort().reverse();
    // [RIWAYAT BULAN] Bulan dulu, baru tanggal.
    var _uiT = waliRiwayatFilterBulanUI('Mutabaah Tahfidz', dates);
    var inner = _uiT.html;
    var _tglTampil = (_uiT.tglBulan || []).filter(function(d){ return !!groups[d]; });
    _tglTampil.forEach(function(d){
      var rows=groups[d];
      var cards=rows.map(function(r){
        var judul=(r.surah_nama||('Surah '+r.surah_no))+(r.ayat?' : ayat '+r.ayat:'');
        // Progres dihitung ulang memakai urutan Juz 30 -> 29 -> 1..28; Tilawah memakai At-Tanzil.
        var _pr=r.surah_no?computeProgres(r.surah_no, r.ayat):null;
        var _pct=(_pr&&_pr.juz)?_pr.pct:(r.progres||0);
        var _meta=(_pr&&_pr.juz)?('Juz '+_pr.juz+' \u00b7 '+_pr.pct+'%'+(_pr.seq?(' \u00b7 tahap '+_pr.seq+'/30'):''))
          :(r.juz?('Juz '+r.juz+' \u00b7 '+(r.progres||0)+'%'):'');
        if(isTilawahKat(r.kategori||'')){
          var _q=parseTanzilNote(r.catatan||'');
          var _tt=tanzilProgText(_q.tanzil, _q.halaman);
          if(_tt){ _meta=_tt; _pct=computeTanzilProgres(_q.tanzil,_q.halaman).pct; }
        }
        var meta=_meta+(r.catatan?(' \u00b7 '+esc(r.catatan)):'');
        return '<article class="db-ready-card" style="margin-bottom:8px">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 class="card-title" style="font-size:14px;margin:0">'+esc(r.kategori||'-')+'</h3><span class="status-pill green">'+_pct+'%</span></div>'
          +'<p class="card-meta" style="margin:6px 0 0"><b>'+esc(judul)+'</b></p>'
          +(meta?'<p class="card-meta" style="margin:2px 0 0">'+meta+'</p>':'')
          +'</article>';
      }).join('');
      inner += '<p class="riwayat-absen-count" style="font-weight:800;color:#0f766e;margin:12px 0 6px">'+esc(waliRiwayatFormatTanggal(d))+' \u00b7 '+rows.length+' data \u00b7 '+_uiT.jmlTanggal+' tanggal di '+esc(waliLabelBulan(_uiT.bulan))+'</p>'+cards;
    });
    return '<section class="section"><details class="riwayat-absen-toggle" open style="border:1px solid #e5e7eb;border-radius:14px;padding:10px 14px;background:#fff">'
      + sumOpen + '<span class="riwayat-absen-title">'+head+'</span><span class="riwayat-absen-hint" style="font-size:11px;color:#94a3b8;font-weight:700">'+arr.length+' entri \u00b7 '+dates.length+' tanggal \u203A</span></summary>'
      + '<div class="riwayat-absen-body" style="padding-top:8px">'+inner+'</div></details></section>';
  }

  window.renderMutabaahTahfidzWaliModule = function(detail){
    var nis=childNis();
    var intro=(typeof moduleIntro==='function')?moduleIntro(detail, (typeof moduleParentTab==='function'?moduleParentTab('mutabaah-tahfidz'):'mutabaah')):'';
    if(nis && WT.loadedNis!==nis && !WT.loading){ loadTahfidz(nis); }
    var tab=WT.tab;
    var childHtml='<section class="section"><article class="db-ready-card">'
      +'<span class="status-pill '+(tab==='wali_murid'?'green':'gold')+'">'+(tab==='wali_murid'?'Input Wali Murid':'Setoran Sekolah (baca)')+'</span>'
      +'<h3 class="card-title">'+esc(childNama())+'</h3>'
      +'<p class="card-meta">'+esc(childKelas())+' &middot; Tahun '+esc(curTA())+' &middot; Semester '+esc(curSemester())+'</p>'
      +'</article></section>';
    var tabsHtml='<section class="section"><div class="zwtf-tabs">'
      +'<button type="button" class="zwtf-tab'+(tab==='wali_murid'?' on':'')+'" onclick="window.zwTf.setTab(\'wali_murid\')">Wali Murid</button>'
      +'<button type="button" class="zwtf-tab'+(tab==='sekolah'?' on':'')+'" onclick="window.zwTf.setTab(\'sekolah\')">Sekolah</button>'
      +'</div></section>';
    var noteHtml = WT.loading ? '<p class="zwtf-note">Memuat data\u2026</p>' : (!nis ? '<p class="zwtf-note">Data anak belum termuat.</p>' : '');
    var body='';
    if(tab==='wali_murid'){
      var cards='';
      for(var i=0;i<CATS_WALI.length;i++){
        var kat=CATS_WALI[i];
        var ents=wEntriesForKat(kat);
        var rowsHtml='';
        for(var r=0;r<ents.length;r++){
          var en=ents[r]||{};
          var _tzE=parseTanzilNote(en.catatan||'');
          var _tzv=(en.tanzil||_tzE.tanzil||''), _hlv=(en.halaman||_tzE.halaman||'');
          var _catVal=stripTanzilNote(en.catatan||'');
          var _pw=en.surah?computeProgres(en.surah, en.ayat):null;
          var progText=(_pw&&_pw.juz)?('Juz '+_pw.juz+' - '+_pw.pct+'%'+(_pw.seq?(' - tahap '+_pw.seq+'/30'):'')):'Belum ada';
          if(isTilawahKat(kat)){
            var _tt=tanzilProgText(_tzv, _hlv, ' - ');
            if(_tt) progText=_tt;
            // [PROGRES TANPA ACUAN] Halaman tanpa At-Tanzil & tanpa surah:
            // tampilkan halamannya saja.
            else if(!(parseInt(en.surah,10)||0) && _hlv) progText='Hal. '+_hlv;
          }
          var delBtn=(ents.length>1)?('<button type="button" class="zwtf-del" onclick="window.zwTf.delSurah('+i+','+r+')">Hapus surah '+(r+1)+'</button>'):'';
          rowsHtml+='<div class="zwtf-row'+(r>0?' zwtf-row-sep':'')+'">'
            +'<div class="zwtf-row-head"><span class="zwtf-row-no">Surah '+(r+1)+'</span><span class="zwtf-chip" id="zwtf-prog-'+i+'-'+r+'">'+progText+'</span></div>'
            +'<label class="field-label">Surah</label><select class="field-select" id="zwtf-surah-'+i+'-'+r+'" onchange="window.zwTf.recalc('+i+','+r+')">'+surahOptions(en.surah)+'</select>'
            +'<label class="field-label">Ayat terakhir</label><input type="number" inputmode="numeric" class="field-input" id="zwtf-ayat-'+i+'-'+r+'" value="'+(en.ayat!=null&&en.ayat!==''?esc(en.ayat):'')+'" oninput="window.zwTf.recalc('+i+','+r+')" placeholder="mis. 10">'
            +(isTilawahKat(kat)?('<label class="field-label">At-Tanzil</label><select class="field-select" id="zwtf-tanzil-'+i+'-'+r+'" onchange="window.zwTf.recalc('+i+','+r+')">'+tanzilOptions(_tzv)+'</select>'
              +'<label class="field-label">Halaman</label><input type="number" inputmode="numeric" class="field-input" id="zwtf-hal-'+i+'-'+r+'" value="'+(_hlv?esc(_hlv):'')+'" oninput="window.zwTf.recalc('+i+','+r+')" placeholder="mis. 12">'):'')
            +'<label class="field-label">Catatan</label><input type="text" class="field-input" id="zwtf-cat-'+i+'-'+r+'" value="'+esc(_catVal)+'" placeholder="Catatan (opsional)">'
            +delBtn
            +'</div>';
        }
        cards+='<div class="zwtf-cat">'
          +'<div class="zwtf-cat-head"><span class="zwtf-cat-title">'+esc(kat)+'</span><span class="zwtf-chip zwtf-count">'+ents.length+' surah</span></div>'
          +rowsHtml
          +'<button type="button" class="zwtf-add" onclick="window.zwTf.addSurah('+i+')">+ Tambah Surah</button>'
          +'</div>';
      }
      var _adaTgl=adaSetoranTgl(), _adaIsi=adaIsiDraft(), _hariIni=isHariIni();
      var tglField='<label class="field-label">Tanggal</label><input type="date" class="field-input" id="zwtf-tanggal" value="'+esc(WT.tgl||todayStr())+'" onchange="window.zwTf.setTanggal(this.value)" style="margin-bottom:12px">'
        +(_adaIsi
          ? ('<div style="border:1px solid #fde68a;background:#fffbeb;border-radius:12px;padding:10px;margin-bottom:12px">'
            +'<p style="margin:0 0 8px;font-size:12px;color:#92400e;font-weight:700">'+(_adaTgl?'Sudah ada setoran pada tanggal ini, jadi form terisi dari data tersimpan.':'Form terisi dari setoran terakhir sebagai acuan hari ini.')+' Ubah bila perlu — data yang sama tidak akan tercatat dua kali.</p>'
            +'<button type="button" class="zwtf-tab" style="width:100%" onclick="window.zwTf.kosongkanForm()">Kosongkan form</button>'
            +'</div>')
          : ('<p class="zwtf-note" style="margin:0 0 12px">'+(WT.cleared?'Form dikosongkan.':(_hariIni?'Belum ada setoran hari ini.':'Belum ada setoran pada tanggal ini.'))+'</p>'));
      body='<section class="section"><article class="input-panel">'+tglField+cards
        +'<button type="button" class="save-draft-btn" style="margin-top:12px" onclick="window.zwTf.save()">Simpan Mutabaah Tahfidz</button>'
        // [LEMBAR 1 BULAN WALI] riwayat per tanggal diganti lembar bulanan
        +'</article></section>'+lembarBulanHtml(WT.riwayat, 'Mutabaah Tahfidz');
    } else {
      var items='';
      for(var j=0;j<CATS_SEKOLAH.length;j++){
        var k2=CATS_SEKOLAH[j]; var r2=WT.sekolah[k2];
        if(!r2){ items+='<div class="zwtf-ro"><div class="zwtf-ro-head"><span class="zwtf-ro-title">'+esc(k2)+'</span><span class="zwtf-chip" style="background:#e2e8f0;color:#64748b">Belum diisi</span></div><div class="zwtf-ro-meta">Guru belum mengisi setoran untuk kategori ini.</div></div>'; continue; }
        var _snm=String(r2.surah_nama||'');
        // Format baru (multi-surah) sudah memuat "(X ayat)" di nama, jangan tambah ayat ganda.
        var judul=_snm?(/ayat/.test(_snm)?_snm:(_snm+(r2.ayat?' : ayat '+r2.ayat:''))):('Surah '+r2.surah+(r2.ayat?' : ayat '+r2.ayat:''));
        var _ps=r2.surah?computeProgres(r2.surah, r2.ayat):null;
        var _pctS=(_ps&&_ps.juz)?_ps.pct:(r2.progres||0);
        var _metaS=(_ps&&_ps.juz)?('Juz '+_ps.juz+' \u00b7 '+_ps.pct+'%'+(_ps.seq?(' \u00b7 tahap '+_ps.seq+'/30'):''))
          :(r2.juz?('Juz '+r2.juz+' \u00b7 '+(r2.progres||0)+'%'):'');
        if(isTilawahKat(k2)){
          var _qs=parseTanzilNote(r2.catatan||'');
          var _ts=tanzilProgText(_qs.tanzil, _qs.halaman);
          if(_ts){ _metaS=_ts; _pctS=computeTanzilProgres(_qs.tanzil,_qs.halaman).pct; }
        }
        var meta=_metaS+(r2.catatan?(' \u00b7 '+esc(r2.catatan)):'');
        items+='<div class="zwtf-ro"><div class="zwtf-ro-head"><span class="zwtf-ro-title">'+esc(k2)+'</span><span class="zwtf-chip">'+_pctS+'%</span></div><div class="zwtf-ro-meta"><b>'+esc(judul)+'</b></div>'+(meta?'<div class="zwtf-ro-meta">'+meta+'</div>':'')+'</div>';
      }
      body='<section class="section">'+((typeof sectionHead==='function')?sectionHead('Setoran sekolah (dari guru)','Hanya baca'):'')+items+'</section>'+lembarBulanHtml(WT.riwayatSekolah, 'Setoran Sekolah');
    }
    return intro + styleTag() + childHtml + tabsHtml + noteHtml + body + '<div style="height:120px"></div>';
  };
})();

/* ============ MODUL: CALISTUNG (WALI — BACA SAJA) v1 ============
 * [CALISTUNG WALI]
 * Wali melihat Laporan Perkembangan Literasi & Numerasi ANAKNYA SENDIRI.
 *
 * BACA SAJA: tidak ada tombol simpan / ubah / hapus sama sekali.
 * Data hanya bisa diubah oleh guru lewat modul Calistung di guru-shell.js.
 *
 * IKUT POLA WALI YANG SUDAH ADA:
 *   - Ambil data : SB().select(tabel, { eq, order, ascending, limit })
 *                  (sama dengan blok Mutabaah Tahfidz, bukan client langsung)
 *   - Identitas  : childNis() / childNama() / childKelas()
 *   - Riwayat    : renderWaliModuleRiwayat(list, title, crudKey)
 *   - Header     : moduleIntro(detail, moduleParentTab(moduleId))
 *
 * Penyaring anak: eq { nis: <nis anak> } — dikunci di query, bukan di tampilan.
 * ================================================================ */
(function(){
  'use strict';
  if(window.__ZY_CALISTUNG_WALI_V1__) return;
  window.__ZY_CALISTUNG_WALI_V1__ = true;

  var MODUL='calistung-anak';
  var TABEL='calistung';                      /* [CALISTUNG WALI] */

  var SKALA={ 'BB':'Belum Berkembang', 'MB':'Mulai Berkembang',
              'BSH':'Berkembang Sesuai Harapan', 'BSB':'Berkembang Sangat Baik' };

  var ASPEK_LITERASI=[
    ['membaca','Membaca'],
    ['menulis','Menulis'],
    ['menyimak_bicara','Menyimak & Berbicara']
  ];
  var ASPEK_NUMERASI=[
    ['berhitung','Berhitung']
  ];
  var SEMUA_ASPEK=ASPEK_LITERASI.concat(ASPEK_NUMERASI);

  var CW={ rows:null, loading:false, loadedNis:null, periode:'', bulan:'' };

  function esc(s){
    if(typeof window.esc==='function' && window.esc!==esc) { try{ return window.esc(s); }catch(e){} }
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function SB(){ return window.ZymataMobileSupabase || null; }

  /* identitas anak — pola sama dgn blok Mutabaah Tahfidz */
  function childNis(){
    var v = String((typeof appState!=='undefined' && appState.childNis) || (typeof childProfile!=='undefined' && childProfile && childProfile.nis) || '').trim();
    if(!v || v==='-' || v==='null' || v==='undefined'){
      try{ v = String(window.__ZYMATA_CHILD_NIS || '').trim(); }catch(e){ v=''; }
    }
    if(v==='-' || v==='null' || v==='undefined') v='';
    return v;
  }
  function childNama(){
    try{ return String((childProfile && childProfile.fullName) || appState.childName || 'Anak'); }catch(e){ return 'Anak'; }
  }
  function childKelas(){
    try{ return String(appState.childClass || (childProfile && childProfile.className) || ''); }catch(e){ return ''; }
  }

  function aktif(){
    try{ return String(appState.activeTab||'')==='module:'+MODUL; }catch(e){ return false; }
  }
  function ulang(){ try{ if(typeof render==='function') render(); }catch(e){} }

  function labelSkala(k){ return SKALA[String(k||'').toUpperCase()] || ''; }
  function fmtTgl(d){
    try{ if(typeof waliRiwayatFormatTanggal==='function') return waliRiwayatFormatTanggal(d); }catch(e){}
    return String(d||'');
  }

  /* ---------------- muat data (BACA SAJA) ---------------- */
  async function loadCW(nis){
    if(CW.loading) return;
    CW.loading=true; CW.loadedNis=nis;
    try{
      var api=SB(), rows=[];
      if(api && nis){
        /* penyaring anak dikunci di query: hanya baris milik NIS anak ini */
        var res=await api.select(TABEL, {
          eq:{ nis:String(nis) },
          order:'tanggal', ascending:false, limit:400
        });
        rows=(res&&res.data)?res.data:[];
      }
      CW.rows=rows;
    }catch(e){
      CW.rows=[];
    }
    CW.loading=false;
    // [BADGE MODUL] Sinkronkan baris calistung ke appState + tandai sudah dibaca,
    // karena user sedang membuka modul ini (titik merah harus hilang & tetap hilang).
    try {
      if (Array.isArray(CW.rows)) {
        appState.waliCalistungRows = CW.rows.map(function(r){ return { id:r.id, row_uid:r.row_uid, tanggal:r.tanggal, updated_at:r.updated_at }; });
        if (typeof markWaliModuleSeen === 'function') markWaliModuleSeen('calistung');
      }
    } catch(_) {}
    if(aktif()) ulang();
  }

  /* daftar periode yang tersedia, terbaru dulu.
     [CALISTUNG RIWAYAT] Baris dengan periode kosong TIDAK dibuang: kalau dibuang,
     baris itu tidak akan pernah muncul di kartu laporan (hanya di panel riwayat)
     dan wali mengira datanya hilang. Baris seperti itu dikelompokkan ke label
     khusus TANPA_PERIODE. */
  var TANPA_PERIODE='\u2014 Tanpa periode';

  function periodeBaris(r){
    var p=String((r&&r.periode)||'').trim();
    return p || TANPA_PERIODE;
  }

  function daftarPeriode(){
    var seen={}, out=[];
    (CW.rows||[]).forEach(function(r){
      var p=periodeBaris(r);
      if(!seen[p]){ seen[p]=1; out.push(p); }
    });
    return out;
  }

  function periodeAktif(){
    var d=daftarPeriode();
    if(CW.periode && d.indexOf(CW.periode)>=0) return CW.periode;
    return d.length ? d[0] : '';
  }

  function barisPeriode(p){
    var out=null;
    (CW.rows||[]).forEach(function(r){
      if(periodeBaris(r)===p && !out) out=r;
    });
    return out;
  }

  /* ---- pemilihan per bulan di dalam satu periode ----
     Satu semester bisa berisi banyak penilaian. Baris dikelompokkan per bulan
     memakai 7 huruf pertama tanggal (YYYY-MM). Baris tanpa tanggal masuk ''. */
  function ymBaris(r){ return String((r&&r.tanggal)||'').slice(0,7); }

  function labelBulan(ym){
    if(!ym) return 'Tanpa tanggal';
    try{ if(typeof waliLabelBulan==='function') return waliLabelBulan(ym); }catch(e){}
    var B=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    var bg=B[parseInt(ym.slice(5,7),10)-1];
    return bg ? (bg+' '+ym.slice(0,4)) : ym;
  }

  /* daftar bulan dalam satu periode, terbaru dulu (rows sudah urut tanggal desc) */
  function daftarBulan(p){
    var seen={}, out=[];
    (CW.rows||[]).forEach(function(r){
      if(periodeBaris(r)!==p) return;
      var ym=ymBaris(r);
      if(!seen.hasOwnProperty(ym)){ seen[ym]=1; out.push(ym); }
    });
    return out;
  }

  function bulanAktif(p){
    var d=daftarBulan(p);
    if(CW.bulan && d.indexOf(CW.bulan)>=0) return CW.bulan;
    return d.length ? d[0] : '';
  }

  /* [CALISTUNG RIWAYAT] SEMUA baris pada periode + bulan tertentu, terbaru dulu.
     Guru bisa menilai beberapa kali dalam satu bulan; wali harus melihat
     semuanya, bukan hanya yang terbaru. */
  function barisBulanSemua(p, ym){
    var out=[];
    (CW.rows||[]).forEach(function(r){
      if(periodeBaris(r)!==p) return;
      if(ymBaris(r)!==ym) return;
      out.push(r);
    });
    out.sort(function(a,b){ return String(b.tanggal||'').localeCompare(String(a.tanggal||'')); });
    return out;
  }

  /* berapa kali dinilai pada bulan itu */
  function jumlahBulan(p, ym){
    return barisBulanSemua(p, ym).length;
  }

  function adaNilai(r){
    if(!r) return false;
    var n=0;
    SEMUA_ASPEK.forEach(function(a){ if(String(r[a[0]]||'').trim()) n++; });
    return n>0;
  }

  /* ---------------- API global ---------------- */
  window.zwCal={
    /* ganti periode -> bulan direset supaya tidak menunjuk bulan milik periode lain */
    setPeriode: function(v){ CW.periode=v||''; CW.bulan=''; ulang(); },
    setBulan: function(v){ CW.bulan=v||''; ulang(); },
    muatUlang: function(){ CW.rows=null; CW.loadedNis=null; CW.bulan=''; ulang(); }
  };

  /* ---------------- gaya ---------------- */
  /* CSS selalu ikut disertakan di setiap render.
     JANGAN pasang penjaga getElementById di sini: render() membangun string
     HTML selagi isi lama masih di DOM, lalu menimpanya lewat innerHTML.
     Kalau CSS dilewati karena dikira "sudah ada", elemen style lama justru
     ikut terhapus dan tampilan jadi polos sesaat. */
  function styleTag(){
    return '<style id="zwcal-style">'
      /* Warna & radius memakai token :root aplikasi (--text, --muted, --line, dst).
         Nilai setelah koma adalah cadangan, dipakai kalau token tidak tersedia. */
      + '.zwcal-lap{background:var(--surface,#fff);border:1px solid rgba(228,231,236,.86);border-radius:var(--radius-sm,14px);padding:13px 14px;box-shadow:var(--shadow-sm,0 5px 15px rgba(31,41,55,.07))}'
      + '.zwcal-lap h4{font-size:12.5px;font-weight:900;color:var(--text,#101828);margin:0 0 3px;letter-spacing:-.02em}'
      + '.zwcal-id{font-size:11.5px;color:var(--muted,#6b7280);line-height:1.5;margin-bottom:9px;padding-bottom:8px;border-bottom:1px solid var(--line,#e4e7ec)}'
      + '.zwcal-id b{color:var(--text,#101828);font-weight:700}'
      /* [CALISTUNG RIWAYAT] penanda urutan penilaian dalam satu bulan */
      + '.zwcal-urut{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.03em;color:var(--indigo,#2D3561);background:var(--surface-2,#f8fafc);border-radius:999px;padding:2px 8px;margin-bottom:6px}'
      + '.zwcal-gap{height:10px}'
      + '.zwcal-sec{font-size:11px;font-weight:900;color:var(--indigo,#2D3561);margin:9px 0 2px;display:flex;align-items:center;gap:5px;letter-spacing:.02em}'
      + '.zwcal-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid var(--line,#e4e7ec)}'
      + '.zwcal-row:last-of-type{border-bottom:none}'
      + '.zwcal-row .nm{flex:1;min-width:0}'
      + '.zwcal-row .nm b{display:block;font-size:12.5px;color:var(--text,#101828);font-weight:800;letter-spacing:-.02em;line-height:1.3}'
      + '.zwcal-row .nm span{display:block;font-size:11px;color:var(--soft,#6b7280);line-height:1.3;margin-top:1px}'
      + '.zwcal-grp{max-width:460px}'
      + '.zwcal-pick{display:flex;gap:10px;flex-wrap:wrap;max-width:460px}'
      + '.zwcal-pick>div{flex:1 1 190px;min-width:0}'
      + '.zwcal-pick .zwcal-sel{max-width:none;margin-bottom:8px}'
      + '.zwcal-pick .zwcal-sel[disabled]{background:var(--surface-2,#f8fafc);color:var(--muted,#6b7280);cursor:default;opacity:1}'
      + '.zwcal-pil{flex:none;font-size:10.5px;font-weight:800;border-radius:999px;padding:3px 9px;white-space:nowrap;line-height:1.3}'
      + '.zwcal-pil.bb{background:var(--red-soft,#fef3f2);color:var(--red,#f04438)}'
      + '.zwcal-pil.mb{background:var(--orange-soft,#fffaeb);color:var(--orange,#f79009)}'
      + '.zwcal-pil.bsh{background:var(--blue-soft,#eff8ff);color:var(--blue,#2e90fa)}'
      + '.zwcal-pil.bsb{background:var(--green-soft,#ecfdf3);color:var(--green,#12b76a)}'
      + '.zwcal-pil.kosong{background:var(--surface-2,#f8fafc);color:var(--soft,#6b7280)}'
      + '.zwcal-ket{font-size:11px;color:var(--muted,#6b7280);line-height:1.4;margin-top:4px}'
      + '.zwcal-cat{margin-top:9px;max-width:460px;background:var(--surface-2,#f8fafc);border-left:3px solid var(--indigo,#2D3561);border-radius:0 9px 9px 0;padding:8px 11px}'
      + '.zwcal-cat .lb{font-size:10.5px;font-weight:900;color:var(--indigo,#2D3561);margin-bottom:2px}'
      + '.zwcal-cat .tx{font-size:12px;color:var(--text,#101828);line-height:1.45;font-style:italic}'
      + '.zwcal-sel{width:100%;max-width:460px;box-sizing:border-box;border:1px solid var(--line,#e4e7ec);border-radius:9px;padding:8px 11px;font-size:13px;background:var(--surface,#fff);color:var(--text,#101828);font-family:inherit;margin-bottom:9px}'
      + '.zwcal-lbl{font-size:10.5px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--soft,#6b7280);margin-bottom:4px;display:block}'
      + '.zwcal-ro{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:800;color:var(--muted,#6b7280);background:var(--surface-2,#f8fafc);border-radius:999px;padding:4px 10px}'
      + '.zwcal-leg{display:flex;gap:9px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--line,#e4e7ec);max-width:460px}'
      + '.zwcal-leg:last-child{border-bottom:none;padding-bottom:0}'
      + '.zwcal-leg .kd{flex:none;width:40px;text-align:center;font-size:10.5px;font-weight:900;border-radius:7px;padding:4px 0;line-height:1.3}'
      + '.zwcal-leg .tx{flex:1;min-width:0}'
      + '.zwcal-leg .tx b{display:block;font-size:12px;color:var(--text,#101828);font-weight:800;letter-spacing:-.02em;line-height:1.3}'
      + '.zwcal-leg .tx span{display:block;font-size:11px;color:var(--muted,#6b7280);line-height:1.35;margin-top:1px}'
      + '.zwcal-leg .tg{display:inline-block;font-size:9.5px;font-weight:800;color:var(--blue,#2e90fa);background:var(--blue-soft,#eff8ff);border-radius:999px;padding:1px 6px;margin-top:2px}'
      + '</style>';
  }

  /* ---------------- potongan UI ---------------- */
  function pilHtml(kode){
    var k=String(kode||'').trim().toUpperCase();
    if(!k) return '<span class="zwcal-pil kosong">Belum dinilai</span>';
    return '<span class="zwcal-pil '+k.toLowerCase()+'">'+esc(k)+'</span>';
  }

  function laporanHtml(r, urut, dari){
    var h='<article class="zwcal-lap">';
    h+='<h4>LAPORAN PERKEMBANGAN SISWA</h4>';
    /* [CALISTUNG RIWAYAT] Kalau satu bulan berisi beberapa penilaian, tiap kartu
       diberi nomor urut supaya wali tahu ini bukan data ganda. */
    if(dari>1){
      h+='<div class="zwcal-urut">Penilaian '+urut+' dari '+dari+' di bulan ini</div>';
    }
    h+='<div class="zwcal-id">Nama: <b>'+esc(r.nama_siswa||childNama())+'</b><br>'
      + 'Kelas: <b>'+esc(r.kelas||childKelas()||'-')+'</b> &nbsp;&middot;&nbsp; Periode: <b>'+esc(r.periode||'-')+'</b>'
      + (r.tanggal?('<br>Dinilai: '+esc(fmtTgl(String(r.tanggal).slice(0,10)))):'')
      + (r.guru?('<br>Guru: '+esc(r.guru)):'')
      + '</div>';

    /* satu aspek = SATU baris utuh: nama + keterangan di kiri, lencana di kanan.
       Jangan dipecah dua elemen, nanti garis pemisah jatuh di tengah pasangannya. */
    function barisAspek(a){
      var k=String(r[a[0]]||'').toUpperCase();
      return '<div class="zwcal-row">'
        + '<span class="nm"><b>'+esc(a[1])+'</b><span>'+esc(k?labelSkala(k):'Belum dinilai guru')+'</span></span>'
        + pilHtml(k)
        + '</div>';
    }

    h+='<div class="zwcal-grp">';
    h+='<div class="zwcal-sec">&#128214; LITERASI</div>';
    ASPEK_LITERASI.forEach(function(a){ h+=barisAspek(a); });

    h+='<div class="zwcal-sec">&#128290; NUMERASI</div>';
    ASPEK_NUMERASI.forEach(function(a){ h+=barisAspek(a); });
    h+='</div>';

    if(String(r.catatan||'').trim()){
      h+='<div class="zwcal-cat"><div class="lb">&#128221; Catatan Guru</div><div class="tx">\u201C'+esc(r.catatan)+'\u201D</div></div>';
    }
    h+='</article>';
    return h;
  }

  /* keterangan skala lengkap: kode + kepanjangan + arti */
  var LEGENDA=[
    ['BB','Belum Berkembang','Anak belum menunjukkan kemampuan ini, masih perlu bimbingan penuh.',''],
    ['MB','Mulai Berkembang','Sudah mulai bisa, namun masih sering dibantu.',''],
    ['BSH','Berkembang Sesuai Harapan','Sudah mampu mandiri sesuai target usianya.','Target yang diharapkan'],
    ['BSB','Berkembang Sangat Baik','Melampaui target, sudah konsisten tanpa dibantu.','']
  ];

  function legendHtml(){
    var h='<section class="section">';
    if(typeof sectionHead==='function'){
      try{ h+=sectionHead('Keterangan skala penilaian','4 tingkat'); }catch(e){}
    }
    h+='<article class="input-panel">';
    LEGENDA.forEach(function(x){
      h+='<div class="zwcal-leg">'
        + '<span class="kd zwcal-pil '+x[0].toLowerCase()+'">'+x[0]+'</span>'
        + '<span class="tx"><b>'+esc(x[1])+'</b><span>'+esc(x[2])+'</span>'
        + (x[3]?('<span class="tg">&#9733; '+esc(x[3])+'</span>'):'')
        + '</span></div>';
    });
    h+='<p class="zwcal-ket" style="margin:10px 0 0;padding-top:10px;border-top:1px solid #f1f5f9">Urutan tingkat: <b>BB</b> &rarr; <b>MB</b> &rarr; <b>BSH</b> &rarr; <b>BSB</b>. Skala ini dipakai untuk keempat aspek: membaca, menulis, menyimak &amp; berbicara, serta berhitung.</p>';
    h+='</article></section>';
    return h;
  }

  /* riwayat memakai komponen wali yang sudah ada */
  function riwayatHtml(){
    if(typeof renderWaliModuleRiwayat!=='function') return '';
    var list=(CW.rows||[]).map(function(r){
      var ring=[];
      SEMUA_ASPEK.forEach(function(a){
        var k=String(r[a[0]]||'').toUpperCase();
        if(k) ring.push(a[1].replace('Menyimak & Berbicara','Simak')+' '+k);
      });
      var salin={};
      Object.keys(r).forEach(function(k){ salin[k]=r[k]; });
      salin.judul=(r.periode||'Penilaian');
      salin.keterangan=ring.join(' \u00b7 ')+(r.catatan?(' \u2014 '+r.catatan):'');
      return salin;
    });
    try{ return renderWaliModuleRiwayat(list, 'Calistung', 'wali:'+MODUL); }
    catch(e){ return ''; }
  }

  /* ---------------- renderer modul ---------------- */
  window.renderCalistungWaliModule = function(detail){
    detail=detail||{};
    var nis=childNis();

    var intro='';
    try{
      intro=(typeof moduleIntro==='function')
        ? moduleIntro(detail, (typeof moduleParentTab==='function')?moduleParentTab(MODUL):'academic')
        : '';
    }catch(e){ intro=''; }

    /* muat sekali per anak (mengikuti pola loadedNis blok Tahfidz) */
    if(nis && CW.loadedNis!==nis && !CW.loading){ loadCW(nis); }

    var h=intro+styleTag();

    if(!nis){
      h+='<section class="section"><article class="db-ready-card">'
        + '<span class="status-pill blue">Belum terhubung</span>'
        + '<h3 class="card-title">Data anak belum termuat</h3>'
        + '<p class="card-meta">Laporan calistung akan tampil setelah akun wali tersambung ke data siswa.</p>'
        + '</article></section>';
      return h;
    }

    if(CW.rows===null || CW.loading){
      h+='<section class="section"><article class="db-ready-card">'
        + '<span class="status-pill blue">Memuat</span>'
        + '<h3 class="card-title">Memuat laporan calistung\u2026</h3>'
        + '<p class="card-meta">Mengambil data perkembangan '+esc(childNama())+' dari sekolah.</p>'
        + '</article></section>';
      return h;
    }

    var periodeList=daftarPeriode();

    if(!periodeList.length){
      h+='<section class="section"><article class="db-ready-card">'
        + '<span class="status-pill blue">Belum ada data</span>'
        + '<h3 class="card-title">Belum ada penilaian calistung</h3>'
        + '<p class="card-meta">Laporan literasi &amp; numerasi '+esc(childNama())+' akan tampil di sini setelah guru mengisinya.</p>'
        + '</article></section>';
      h+=legendHtml();
      /* panel Riwayat tetap tampil walau kosong, sama seperti modul wali lain */
      h+=riwayatHtml();
      h+='<div style="height:100px"></div>';
      return h;
    }

    var p=periodeAktif();
    var bulanList=daftarBulan(p);
    var ym=bulanAktif(p);
    /* [CALISTUNG RIWAYAT] semua penilaian pada bulan terpilih, terbaru dulu */
    var barisList=barisBulanSemua(p, ym);
    if(!barisList.length){
      var satu=barisPeriode(p);
      barisList = satu ? [satu] : [];
    }
    var baris=barisList.length ? barisList[0] : null;

    /* penanda baca-saja */
    h+='<section class="section">'
      + '<article class="db-ready-card">'
      + '<span class="status-pill green">'+periodeList.length+' periode</span>'
      + '<h3 class="card-title">'+esc(childNama())+'</h3>'
      + '<p class="card-meta">'+esc(childKelas()||'-')+' &middot; NIS '+esc(nis)+'</p>'
      + '<div class="field-chip-row" style="margin-top:8px"><span class="zwcal-ro">&#128274; Hanya baca &middot; diisi oleh guru</span></div>'
      + '</article></section>';

    /* Pemilih periode & bulan SELALU ditampilkan selama ada data.
       Jangan disembunyikan saat pilihannya cuma satu: wali jadi mengira
       fitur pilih bulan tidak ada. Cukup dikunci kalau memang tak ada pilihan lain. */
    if(periodeList.length){
      h+='<section class="section"><article class="input-panel">';
      h+='<div class="zwcal-pick">';

      h+='<div><label class="zwcal-lbl">Periode</label>'
        + '<select class="zwcal-sel" onchange="window.zwCal.setPeriode(this.value)"'
        + (periodeList.length<2?' disabled':'') + '>';
      periodeList.forEach(function(x){
        h+='<option value="'+esc(x)+'"'+(x===p?' selected':'')+'>'+esc(x)+'</option>';
      });
      h+='</select></div>';

      h+='<div><label class="zwcal-lbl">Bulan</label>'
        + '<select class="zwcal-sel" onchange="window.zwCal.setBulan(this.value)"'
        + (bulanList.length<2?' disabled':'') + '>';
      if(!bulanList.length){
        h+='<option>Belum ada</option>';
      } else {
        bulanList.forEach(function(x){
          var n=jumlahBulan(p,x);
          h+='<option value="'+esc(x)+'"'+(x===ym?' selected':'')+'>'
            + esc(labelBulan(x)) + (n>1?(' \u00b7 '+n+' penilaian'):'')
            + '</option>';
        });
      }
      h+='</select></div>';

      h+='</div>';
      h+='<p class="zwcal-ket" style="margin:0">'
        + (barisList.length>1
            ? 'Menampilkan <b>'+barisList.length+' penilaian</b> pada bulan yang dipilih, terbaru di atas.'
            : (bulanList.length>1
                ? 'Menampilkan penilaian pada bulan yang dipilih.'
                : 'Baru ada penilaian di <b>'+esc(labelBulan(ym))+'</b>. Pilihan bulan akan bertambah setelah guru mengisi di bulan berikutnya.'))
        + ' Seluruh riwayat tetap ada di panel bawah.</p>';
      h+='</article></section>';
    }

    h+='<section class="section">';
    if(typeof sectionHead==='function'){
      var meta;
      if(!barisList.length || !adaNilai(baris)) meta='Belum dinilai';
      else meta=(ym?labelBulan(ym):p) + (barisList.length>1?(' \u00b7 '+barisList.length+' penilaian'):'');
      try{ h+=sectionHead('Laporan perkembangan', esc(meta)); }catch(e){}
    }
    if(!barisList.length){
      h+=laporanHtml({ periode:p }, 1, 1);
    } else {
      barisList.forEach(function(r, i){
        if(i) h+='<div class="zwcal-gap"></div>';
        h+=laporanHtml(r, i+1, barisList.length);
      });
    }
    h+='</section>';

    /* keterangan skala lengkap */
    h+=legendHtml();

    h+=riwayatHtml();
    h+='<div style="height:100px"></div>';
    return h;
  };

  /* detail modul (dibaca renderModule) */
  if(typeof moduleDetails!=='undefined' && moduleDetails){
    moduleDetails[MODUL]={
      eyebrow:'Akademik',
      title:'Calistung',
      subtitle:'Laporan perkembangan literasi & numerasi anak: membaca, menulis, menyimak & berbicara, serta berhitung.',
      stats:[],
      focus:[]
    };
  }

  console.log('[Zymata Wali] Modul Calistung (baca saja) aktif');   /* [CALISTUNG WALI] */
})();
