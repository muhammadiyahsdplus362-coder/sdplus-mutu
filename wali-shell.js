const STORAGE_KEY = 'zymata-wali-shell-v1';
const ROLE_CHOOSER_PATH = 'index.html?choose=1';

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
  seenAnnouncements: [],
  seenNotes: [],
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
  { id: 'jadwal-anak',      icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14"/><path d="M7 2v3"/><path d="M13 2v3"/></svg>`, title: 'Jadwal Pelajaran', meta: 'Jadwal mata pelajaran mingguan', route: 'module:jadwal-anak', group: 'Akademik' }
];

const mutabaahModules = [
  { id: 'mutabaah-rumah',  icon: ICONS.rumah,  title: 'Mutabaah Rumah',  meta: 'Input kebiasaan anak di rumah',               route: 'module:mutabaah-rumah',  group: 'Mutabaah' },
  { id: 'mutabaah-tahfidz', icon: ICONS.quran,  title: 'Mutabaah Tahfidz',  meta: 'Setoran hafalan anak & pantau setoran sekolah', route: 'module:mutabaah-tahfidz', group: 'Mutabaah' }
];

const moreModules = [
  { id: 'keuangan',       icon: ICONS.keuangan,   title: 'Keuangan',    meta: 'SPP, tabungan, dan tagihan lain',    route: 'module:keuangan',      group: 'Administrasi' },
  { id: 'pengumuman-wali',icon: ICONS.pengumuman, title: 'Pengumuman',  meta: 'Info sekolah dan agenda penting',    route: 'module:pengumuman-wali',group: 'Informasi'   },
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
    seenNotes: (appState.seenNotes || []).slice(-300)
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
      announcements: announcements
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
    try { computeWaliRecap(); } catch (_e) {}
    try { syncWaliFinanceState(); } catch (_e) {}
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

function syncWaliFinanceState(){
  var anakNama = appState.childName || '';
  var _smF = appState.supabaseModules || {};
  var tagihanList = Array.isArray(_smF.keuangan) ? _smF.keuangan.slice() : [];
  var tabData = Array.isArray(_smF.tabungan) ? _smF.tabungan.slice() : [];
  if(!tagihanList.length){ try { var rawTag = localStorage.getItem('zymata_tagihan_spp_v1'); if(rawTag){ var arrTg = JSON.parse(rawTag); if(Array.isArray(arrTg)) tagihanList = arrTg; } } catch(e){} }
  if(!tabData.length){ try { var rawTab = localStorage.getItem('sdplus_tabungan_v1'); if(rawTab){ var arrTb = JSON.parse(rawTab); if(Array.isArray(arrTb)) tabData = arrTb; } } catch(e){} }
  var tagihanAnak = tagihanList.filter(function(t){ var nm=String(t.nama_siswa||t.nama||'').toLowerCase(); return !anakNama || (nm && nm.indexOf(anakNama.toLowerCase())>=0); });
  var tabAnak = tabData.filter(function(t){ var nm=String(t.nama_siswa||t.namaSiswa||t.nama||'').toLowerCase(); return !anakNama || (nm && nm.indexOf(anakNama.toLowerCase())>=0); });
  var belumBayar = tagihanAnak.filter(function(t){ var st=String(t.status||''); return !(/lunas/i.test(st) && !/belum/i.test(st)); });
  var totalTagihan = belumBayar.reduce(function(s,t){ return s + Number(t.nominal||0); }, 0);
  var setorTab = 0, tarikTab = 0;
  tabAnak.forEach(function(t){ var deb=Number(t.debit||0), kre=Number(t.kredit||0); if(deb||kre){ setorTab+=deb; tarikTab+=kre; } else { var n=Number(t.nominal||0); if(/setor|masuk/i.test(t.jenis||'')) setorTab+=n; else tarikTab+=n; } });
  var saldoTab = setorTab - tarikTab;
  var tabUmumData = Array.isArray(_smF.tabunganUmum) ? _smF.tabunganUmum.slice() : [];
  if(!tabUmumData.length){ try { var rawTU = localStorage.getItem('sdplus_tabungan_umum_v1'); if(rawTU){ var arrTU = JSON.parse(rawTU); if(Array.isArray(arrTU)) tabUmumData = arrTU; } } catch(e){} }
  var tabUmumAnak = tabUmumData.filter(function(t){ var nm=String(t.nama_siswa||t.namaSiswa||t.nama||'').toLowerCase(); return !anakNama || (nm && nm.indexOf(anakNama.toLowerCase())>=0); });
  var setorUmum = 0, tarikUmum = 0;
  tabUmumAnak.forEach(function(t){ var deb=Number(t.debit||0), kre=Number(t.kredit||0); if(deb||kre){ setorUmum+=deb; tarikUmum+=kre; } else { var n=Number(t.nominal||0); if(/setor|masuk/i.test(t.jenis||'')) setorUmum+=n; else tarikUmum+=n; } });
  var saldoUmum = setorUmum - tarikUmum;
  if(appState.syncMode === 'supabase-empty') return;
  if(tagihanAnak.length > 0){
    appState.financeAmount = 'Rp ' + Number(totalTagihan).toLocaleString('id-ID');
    appState.financeDue = belumBayar.length ? (belumBayar[0].tanggal || belumBayar[0].jatuh_tempo || '-') : '-';
    appState.financeStatus = belumBayar.length ? 'belum' : 'lunas';
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
  var items = list.map(function(r){
    var ji = parseInt(r.jam_index);
    var jam = (ji >= 0 && ji < JAM_LABELS.length) ? JAM_LABELS[ji] : (isNaN(ji) ? '-' : ('Jam ' + (ji + 1)));
    var mapel = r.mapel || r.mata_pelajaran || '-';
    var jamStart = (jam.split('-')[0] || jam);
    return '<div class="lux-tl-item"><span class="lux-tl-dot blue"></span>' +
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
    { r:'module:nilai-anak', t:'Nilai', g:'g-violet', ic:'<path d="M4 19l16 0"/><path d="M4 15l4 -6l4 2l4 -5l4 4"/>' },
    { r:'module:catatan-anak', t:'Catatan', g:'g-pink', badge: appState.unreadNotes>0?appState.unreadNotes:0, ic:'<path d="M8 9h8"/><path d="M8 13h6"/><path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3z"/>' },
    { r:'module:surat-wali', t:'Kirim Surat', g:'g-amber', ic:'<path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/><path d="M3 7l9 6l9 -6"/>' },
    { r:'mutabaah', t:'Mutabaah', g:'g-emerald', ic:'<path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/>' },
    { r:'module:perkembangan-anak', t:'Pelanggaran', g:'g-pink', ic:'<path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/>' },
    { r:'module:keuangan', t:'Keuangan', g:'g-sun', ic:'<path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3"/><path d="M3 5v12a2 2 0 0 0 2 2h13a1 1 0 0 0 1 -1v-3"/><path d="M20 12v4h-4a2 2 0 0 1 0 -4z"/>' },
    { r:'__more__', t:'Lainnya', g:'g-slate', ic:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>' }
  ];
  const qaHtml = qa.map(function(q){
    const route = (q.r === '__more__' || q.a) ? '' : ` data-module-route="${q.r}"`;
    const more = q.r === '__more__' ? ' data-action="goMore"' : (q.a ? ` data-action="${q.a}"` : '');
    const badge = q.badge ? `<span class="lux-q-badge">${q.badge}</span>` : '';
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
          <span class="lux-fin-lbl">SPP Bulan Ini</span>
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
              tt = (r.bulan ? r.bulan + ' ' : '') + 'Shalat ' + (r.shalat || 0) + ', Sunnah ' + (r.sunnah || 0);
            }
            if (!tt) tt = area + ' anak';
            var mt = r.nilai ? ('Nilai ' + r.nilai) : (r.juz ? ('Juz ' + r.juz) : (r.kategori || r.status_review || r.keterangan || r.catatan || '-'));
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
  // Tab Mutabaah HANYA menampilkan data mutabaah asli (mutabaah_rumah & mutabaah_quran).
  // hafalan & ibadah adalah input admin pada tabel terpisah, jadi tidak diikutkan di sini.
  var rumahRows = Array.isArray(sm.mutabaahRumah)?sm.mutabaahRumah.slice():[];
  var quranRows = [];
  var _wkAgo = Date.now()-7*24*3600*1000;
  var _inWeek = function(r){ var d=Date.parse(r.tanggal||r.created_at||''); return !isNaN(d) && d>=_wkAgo; };
  var rumahWeek = rumahRows.filter(_inWeek).length;
  var quranWeek = quranRows.filter(_inWeek).length;
  var updates = rumahRows.concat(quranRows).slice().sort(function(a,b){ return String(b.tanggal||b.created_at||'').localeCompare(String(a.tanggal||a.created_at||'')); }).slice(0,8).map(function(r){
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
    <!-- Keuangan langsung di atas -->
    <section class="section section--tight">
      ${sectionHead('Keuangan', `<span data-module-route="module:keuangan" style="cursor:pointer;color:#4f46e5;font-size:11px;font-weight:800">Detail</span>`)}
      <div class="wali-finance-row">
        <article class="wfi-card ${getFinanceTone(finStt)}" data-module-route="module:keuangan">
          <span class="wfi-label">SPP Bulan Ini</span>
          <strong class="wfi-amount">${appState.financeAmount}</strong>
          <div class="wfi-status">
            <span class="wfi-badge ${getFinanceTone(finStt)}">${getFinanceStatusLabel(finStt)}</span>
            <span class="wfi-due">Jatuh tempo ${appState.financeDue}</span>
          </div>
        </article>
        <article class="wfi-card green" data-module-route="module:keuangan">
          <span class="wfi-label">Tabungan Anak</span>
          <strong class="wfi-amount">${appState.tabunganSaldo}</strong>
          <div class="wfi-status">
            <span class="wfi-badge green">Aman ✅</span>
            <span class="wfi-due">Update ${appState.tabunganUpdate}</span>
          </div>
        </article>
      </div>
      <div class="wali-finance-row" style="grid-template-columns:1fr; margin-top:-4px;">
        <article class="wfi-card green" data-module-route="module:keuangan">
          <span class="wfi-label">Tabungan Umum</span>
          <strong class="wfi-amount">${appState.tabunganUmumSaldo}</strong>
          <div class="wfi-status">
            <span class="wfi-badge green">Aman ✅</span>
            <span class="wfi-due">Update ${appState.tabunganUmumUpdate}</span>
          </div>
        </article>
      </div>
    </section>

    <section class="section section--tight">
      ${sectionHead('Info & administrasi', '')}
      <div class="guru-menu-grid">
        ${moreModules.map(roleModuleCard).join('')}
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
  const list = Array.isArray(rows) ? rows : [];
  const moduleId = appState.activeTab.replace('module:', '');
  const crudKey = 'wali:' + moduleId;
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
      <div class="timeline">
        ${list.length
          ? list.slice(0, 30).map(row => {
              const item = helper && helper.normalizeItem ? helper.normalizeItem(row, detail.title) : { time:'Data', title:detail.title, meta:'Supabase', status:'Aktif', tone:'blue' };
              const actions = row.__mobileCrud && row.id ? `<div class="field-chip-row"><button type="button" class="field-chip" data-mobile-crud-update="${row.id}" data-mobile-crud-key="${crudKey}">Tandai selesai</button><button type="button" class="field-chip" data-mobile-crud-delete="${row.id}" data-mobile-crud-key="${crudKey}">Hapus</button></div>` : '';
              return scheduleCard(item) + actions;
            }).join('')
          : scheduleCard({ time: 'Info', title: 'Belum ada data', meta: 'Data akan otomatis tampil dari Supabase.', status: 'Kosong', tone: 'blue' })}
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
// Riwayat generik berbasis tanggal untuk daftar yang sudah punya builder kartu sendiri
// (mis. Tagihan SPP & Mutasi Tabungan di modul Keuangan).
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
  arr.forEach(function(r){ var d=String(dateOf(r)||'').slice(0,10); if(d && d!=='-'){ (groups[d]=groups[d]||[]).push(r); } else { noDate.push(r); } });
  var dates = Object.keys(groups).sort().reverse();
  var inner = '';
  dates.forEach(function(d){
    var rows = groups[d];
    inner += '<p class="riwayat-absen-count" style="font-weight:800;color:#4f46e5;margin:12px 0 6px">'+waliRiwayatFormatTanggal(d)+' \u00b7 '+rows.length+' data</p><div class="timeline">'+rows.map(function(r){ return scheduleCard(itemOf(r)); }).join('')+'</div>';
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
  arr.forEach(function(r){ var d=waliRiwayatRowDate(r); if(d){ (groups[d]=groups[d]||[]).push(r); } else { noDate.push(r); } });
  var dates = Object.keys(groups).sort().reverse();
  var inner = '';
  dates.forEach(function(d){
    var rows = groups[d];
    inner += '<p class="riwayat-absen-count" style="font-weight:800;color:#4f46e5;margin:12px 0 6px">'+waliRiwayatFormatTanggal(d)+' \u00b7 '+rows.length+' data</p><div class="timeline">'+rows.slice(0,50).map(entryHtml).join('')+'</div>';
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
  var cards = sorted.slice(0,60).map(function(r){
    var tgl = esc(String(r.tanggal||r.tgl||'').slice(0,10) || '-');
    var shalat = [['Subuh',r.shalat_subuh],['Dzuhur',r.shalat_dzuhur],['Ashar',r.shalat_ashar],['Maghrib',r.shalat_maghrib],['Isya',r.shalat_isya]];
    var shalatHtml = shalat.map(function(s){ var ok = ya(s[1]); return '<span class="status-pill '+(ok?'green':'orange')+'">'+s[0]+'</span>'; }).join(' ');
    var konfBool = (r.konfirmasi_wali === true || r.konfirmasi_wali === 'true' || r.konfirmasi_wali === 1 || r.konfirmasi_wali === '1');
    var sudahDinilai = konfBool || /dinilai|tindak lanjut|ada kendala/i.test(String(r.status_review||'')) || !!String(r.kendala||'').trim();
    var konfPill = konfBool
      ? '<span class="status-pill green">Dikonfirmasi guru</span>'
      : (sudahDinilai
          ? '<span class="status-pill orange">Sudah dinilai guru</span>'
          : '<span class="status-pill blue">Belum dinilai guru</span>');
    var kendalaHtml = String(r.kendala||'').trim() ? '<p class="card-meta" style="margin:6px 0 0"><b>Problem / Kendala (dari guru):</b> '+esc(r.kendala)+'</p>' : '';
    return '<article class="db-ready-card" style="margin-bottom:10px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 class="card-title" style="font-size:14px;margin:0">'+tgl+'</h3>'+konfPill+'</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">'+shalatHtml+'</div>'
      + '<p class="card-meta" style="margin:2px 0"><b>Belajar:</b> '+(r.belajar?esc(r.belajar):'-')+' &middot; <b>Akhlak:</b> '+(r.akhlak?esc(r.akhlak):'-')+'</p>'
      + kendalaHtml
      + '</article>';
  }).join('');
  return '<section class="section"><details class="riwayat-absen-toggle" open style="border:1px solid #e5e7eb;border-radius:14px;padding:10px 14px;background:#fff">'
    + sumOpen + '<span class="riwayat-absen-title">'+head+'</span><span class="riwayat-absen-hint" style="font-size:11px;color:#94a3b8;font-weight:700">'+arr.length+' entri \u203A</span></summary>'
    + '<div class="riwayat-absen-body" style="padding-top:8px">'+cards+'</div></details></section>';
}

// renderWaliMutabaahQuranRiwayat dihapus — modul Mutabaah Quran sudah tidak dipakai.
function renderWaliMutabaahQuranRiwayat(list){
  var arr = Array.isArray(list) ? list : [];
  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var sumOpen = '<summary class="riwayat-absen-summary" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800;list-style:none;-webkit-tap-highlight-color:transparent">';
  var head = '\uD83D\uDCC5 Riwayat';
  if(!arr.length){
    return '<section class="section"><details class="riwayat-absen-toggle" style="border:1px solid #e5e7eb;border-radius:14px;padding:10px 14px;background:#fff">'
      + sumOpen + '<span class="riwayat-absen-title">'+head+'</span><span class="riwayat-absen-hint" style="font-size:11px;color:#94a3b8;font-weight:700">Lihat detail \u203A</span></summary>'
      + '<div class="riwayat-absen-body" style="padding-top:10px"><div class="timeline">'
      + scheduleCard({ time:'Info', title:'Belum ada data', meta:'Data mutabaah quran yang sudah disimpan akan tampil di sini beserta penilaian guru.', status:'Kosong', tone:'blue' })
      + '</div></div></details></section>';
  }
  var sorted = arr.slice().sort(function(a,b){ return String(b.tanggal||b.tgl||'').localeCompare(String(a.tanggal||a.tgl||'')); });
  var cards = sorted.slice(0,60).map(function(r){
    var tgl = esc(String(r.tanggal||r.tgl||'').slice(0,10) || '-');
    var stat = String(r.status_setoran||'').trim();
    var statPill = stat
      ? '<span class="status-pill '+(/lancar/i.test(stat)?'green':(/ulang|belum/i.test(stat)?'orange':'blue'))+'">Setoran: '+esc(stat)+'</span>'
      : '<span class="status-pill blue">Belum dinilai guru</span>';
    var ziyHtml = String(r.ziyadah_sekolah||'').trim() ? '<p class="card-meta" style="margin:6px 0 0"><b>Ziyadah/Setoran sekolah (guru):</b> '+esc(r.ziyadah_sekolah)+'</p>' : '';
    var catHtml = String(r.catatan_guru||'').trim() ? '<p class="card-meta" style="margin:4px 0 0"><b>Catatan guru:</b> '+esc(r.catatan_guru)+'</p>' : '';
    return '<article class="db-ready-card" style="margin-bottom:10px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 class="card-title" style="font-size:14px;margin:0">'+tgl+'</h3>'+statPill+'</div>'
      + '<p class="card-meta" style="margin:6px 0 0"><b>Tilawah rumah:</b> '+(r.tilawah_rumah?esc(r.tilawah_rumah):'-')+'</p>'
      + '<p class="card-meta" style="margin:2px 0 0"><b>Murojaah rumah:</b> '+(r.murojaah_rumah?esc(r.murojaah_rumah):'-')+'</p>'
      + ziyHtml
      + catHtml
      + '</article>';
  }).join('');
  return '<section class="section"><details class="riwayat-absen-toggle" open style="border:1px solid #e5e7eb;border-radius:14px;padding:10px 14px;background:#fff">'
    + sumOpen + '<span class="riwayat-absen-title">'+head+'</span><span class="riwayat-absen-hint" style="font-size:11px;color:#94a3b8;font-weight:700">'+arr.length+' entri \u203A</span></summary>'
    + '<div class="riwayat-absen-body" style="padding-top:8px">'+cards+'</div></details></section>';
}

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
  for (var i = 0; i < tries.length; i++) {
    try {
      var res = await helper.select('jadwal_pelajaran', { eq: { kelas: tries[i] }, limit: 300 });
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
    var items = list.length ? list.map(function(r){
      var ji = parseInt(r.jam_index);
      var jam = (ji >= 0 && ji < JAM_LABELS.length) ? JAM_LABELS[ji] : (isNaN(ji) ? '-' : ('Jam ' + (ji + 1)));
      var mapel = r.mapel || r.mata_pelajaran || '-';
      return scheduleCard({ time: (jam.split('-')[0] || jam), title: mapel, meta: r.guru ? ('Guru: ' + r.guru) : '', status: 'Mapel', tone: 'blue' });
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

function renderModule(moduleId) {
  const detail = moduleDetails[moduleId];
  if (!detail) return renderAcademic();
  if (moduleId === 'jadwal-anak') return renderJadwalAnak(detail);
  if (moduleId === 'mutabaah-tahfidz') return renderMutabaahTahfidzWaliModule(detail);
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
        ${sectionHead('Riwayat kehadiran', 'Terbaru')}
        <div class="timeline">
          ${absRows.length
            ? absRows.slice(0, 20).map(function(r){
                var st = _absSt(r);
                var tone = /hadir|masuk/.test(st) ? 'green' : (/izin/.test(st) ? 'blue' : (/sakit/.test(st) ? 'gold' : 'red'));
                var label = /hadir|masuk/.test(st) ? 'Hadir' : (/izin/.test(st) ? 'Izin' : (/sakit/.test(st) ? 'Sakit' : (/alpa|alfa|tanpa|bolos/.test(st) ? 'Alpa' : (r.status||'-'))));
                return scheduleCard({
                  time: _absDate(r) || '-',
                  title: label + (r.mapel ? ' \u00b7 ' + r.mapel : ''),
                  meta: r.keterangan || r.catatan || '',
                  status: label,
                  tone: tone
                });
              }).join('')
            : scheduleCard({ time: 'Info', title: 'Belum ada data absensi', meta: 'Data kehadiran akan muncul setelah sekolah input absensi.', status: 'Kosong', tone: 'blue' })
          }
        </div>
      </section>
    `;
  }

  if (moduleId === 'nilai-anak') {
    var _smN = appState.supabaseModules || {};
    var nilaiRows = Array.isArray(_smN.nilai) ? _smN.nilai.slice() : [];
    function _nVal(r){ return Number(r.nilai||r.nilai_akhir||r.nilai_rapor||r.nilai_angka||r.rata_rata||r.skor||r.nilai_ujian||r.nilai_tugas||0); }
    function _nDate(r){ return String(r.tanggal||r.tgl||r.created_at||'').slice(0,10); }
    nilaiRows.sort(function(a,b){ return String(_nDate(b)).localeCompare(String(_nDate(a))); });
    var avg = appState.homeScoreAverage;
    var tertinggi = null;
    nilaiRows.forEach(function(r){ if(!tertinggi || _nVal(r) > _nVal(tertinggi)) tertinggi = r; });
    return `
      ${moduleIntro(detail, moduleParentTab(moduleId))}
      <section class="section">
        <article class="db-ready-card">
          <span class="status-pill gold">${nilaiRows.length ? 'Rata-rata ' + avg : 'Belum ada nilai'}</span>
          <h3 class="card-title">${tertinggi ? 'Nilai tertinggi: ' + (tertinggi.mapel || tertinggi.mata_pelajaran || 'Mapel') + ' \u00b7 ' + _nVal(tertinggi) : 'Nilai anak belum tersedia'}</h3>
          <p class="card-meta">Daftar nilai diambil langsung dari data sekolah di Supabase.</p>
        </article>
      </section>
      <section class="section">
        ${sectionHead('Ringkasan nilai', nilaiRows.length ? nilaiRows.length + ' entri' : 'Belum ada')}
        <article class="input-panel">
          <div class="form-preview-grid">
            ${fieldPreview('Rata-rata', String(avg))}
            ${fieldPreview('Jumlah nilai', String(nilaiRows.length))}
            ${fieldPreview('Tertinggi', tertinggi ? String(_nVal(tertinggi)) : '-')}
            ${fieldPreview('Mapel teratas', tertinggi ? (tertinggi.mapel || tertinggi.mata_pelajaran || '-') : '-')}
          </div>
        </article>
      </section>
      <section class="section">
        ${sectionHead('Detail per mapel', 'Terbaru')}
        <div class="timeline">
          ${nilaiRows.length
            ? nilaiRows.slice(0, 20).map(function(r){
                var n = _nVal(r);
                var tone = n >= 85 ? 'green' : (n >= 70 ? 'blue' : 'orange');
                return scheduleCard({
                  time: _nDate(r) || '-',
                  title: (r.mapel || r.mata_pelajaran || 'Mapel') + ' \u00b7 ' + (n || '-'),
                  meta: (r.jenis || r.kategori || '') + (r.keterangan ? ' \u00b7 ' + r.keterangan : ''),
                  status: r.jenis || (n ? 'Nilai' : '-'),
                  tone: tone
                });
              }).join('')
            : scheduleCard({ time: 'Info', title: 'Belum ada nilai', meta: 'Nilai akan muncul setelah sekolah input penilaian.', status: 'Kosong', tone: 'blue' })
          }
        </div>
      </section>
    `;
  }

  if (moduleId === 'perkembangan-anak') {
    // Ambil data real dari Supabase
    const sm = appState.supabaseModules || {};
    const hafalanRows = [];
    const membacaRows = [];
    const ibadahRows = Array.isArray(sm.ibadah) ? sm.ibadah : [];
    const karakterRows = Array.isArray(sm.karakter) ? sm.karakter : [];
    const prestasiRows = Array.isArray(sm.prestasi) ? sm.prestasi : [];
    // Sorotan paling baru per area
    function latest(arr, fmtFn){
      if(!arr.length) return '-';
      const r = arr.slice().sort(function(a,b){ return String(b.tanggal||b.tgl||b.waktu||'').localeCompare(String(a.tanggal||a.tgl||a.waktu||'')); })[0];
      try { return fmtFn(r) || '-'; } catch(_) { return '-'; }
    }
    const sorotanHafalan = latest(hafalanRows, r => (r.surat || r.title || '') + (r.juz ? ' · Juz ' + r.juz : ''));
    const sorotanMembaca = latest(membacaRows, r => (r.surat || r.tilawah_rumah || '') + (r.juz ? ' · Juz ' + r.juz : ''));
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
    var anySorotan = !!(hafalanRows.length || membacaRows.length || ibadahRows.length || karakterRows.length || prestasiRows.length);
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

  if (moduleId === 'catatan-anak') {
    var _smC = appState.supabaseModules || {};
    var catatanRows = (Array.isArray(_smC.catatan) ? _smC.catatan.slice() : []).filter(function(r){ var v=String(r.status_visibilitas||r.visibilitas||'').toLowerCase(); return v!=='ditarik' && v!=='internal'; });
    function _cDate(r){ return String(r.tanggal||r.tgl||r.created_at||'').slice(0,10); }
    catatanRows.sort(function(a,b){ return String(_cDate(b)).localeCompare(String(_cDate(a))); });
    var baruCount = catatanRows.filter(function(r){ var st=String(r.status||'').toLowerCase(); return !st || /baru|belum|aktif|terkirim/.test(st); }).length;
    return `
      ${moduleIntro(detail, moduleParentTab(moduleId))}
      <section class="section">
        <article class="db-ready-card">
          <span class="status-pill ${baruCount ? 'orange' : 'green'}">${baruCount ? baruCount + ' catatan baru' : 'Tidak ada catatan baru'}</span>
          <h3 class="card-title">${catatanRows.length ? 'Ada ' + catatanRows.length + ' catatan dari sekolah' : 'Belum ada catatan dari sekolah'}</h3>
          <p class="card-meta">Catatan dari sekolah ditampilkan langsung dari data Supabase.</p>
        </article>
      </section>
      <section class="section">
        ${sectionHead('Riwayat catatan', catatanRows.length ? catatanRows.length + ' item' : 'Terbaru')}
        <div class="timeline">
          ${catatanRows.length
            ? catatanRows.slice(0, 20).map(function(r){
                var st = String(r.status||'').toLowerCase();
                var baru = !st || /baru|belum|aktif|terkirim/.test(st);
                return scheduleCard({
                  time: _cDate(r) || '-',
                  title: r.judul || r.catatan || r.isi || r.keterangan || 'Catatan',
                  meta: (r.kategori || r.jenis || '') + (r.tindak_lanjut ? ' \u00b7 ' + r.tindak_lanjut : ''),
                  status: baru ? 'Baru' : (r.status || 'Selesai'),
                  tone: baru ? 'orange' : 'green'
                });
              }).join('')
            : scheduleCard({ time: 'Info', title: 'Belum ada catatan', meta: 'Catatan dari sekolah akan muncul di sini.', status: 'Kosong', tone: 'blue' })
          }
        </div>
      </section>
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
      // Bila NIS tersedia di kedua sisi: hanya terima yang COCOK (tolak NIS beda = cegah bocor data siswa lain).
      if(anakNis && rowNis) return rowNis === anakNis;
      // Cadangan: cocokkan nama bila baris tidak punya NIS.
      var nm = String(t.nama_siswa || t.namaSiswa || t.nama || '').toLowerCase();
      if(anakNama && anakNama !== 'belum terhubung'){
        return nm ? (nm.indexOf(anakNama) >= 0) : true; // baris tanpa nama dianggap sudah lolos filter strict Supabase
      }
      return true;
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
    var belumBayar = tagihanAnak.filter(function(t){ var st=String(t.status||''); return !(/lunas/i.test(st) && !/belum/i.test(st)); });
    var totalTagihan = belumBayar.reduce(function(s,t){ return s + Number(t.nominal||0); }, 0);
    var setorTab = 0, tarikTab = 0;
    tabAnak.forEach(function(t){ if(t.debit||t.kredit){ setorTab+=Number(t.debit||0); tarikTab+=Number(t.kredit||0); } else { var n=Number(t.nominal||0); if(/setor|masuk/i.test(t.jenis||'')) setorTab+=n; else tarikTab+=n; } });
    var saldoTab = setorTab - tarikTab;
    var jatuhTempo = belumBayar.length ? (belumBayar[0].tanggal || belumBayar[0].jatuh_tempo || '-') : '-';
    if (moduleId === 'keuangan-spp') {
      return `
        ${moduleIntro(detail, moduleParentTab(moduleId))}
        <section class="section">
          <div class="module-stat-grid" style="grid-template-columns:1fr 1fr;">
            ${statCard('Tagihan SPP', 'Rp ' + Number(totalTagihan).toLocaleString('id-ID'), belumBayar.length + ' belum lunas', totalTagihan > 0 ? 'orange' : 'green')}
            ${statCard('Jatuh Tempo', jatuhTempo, 'Tagihan terdekat', 'blue')}
          </div>
        </section>
        ${renderWaliRiwayatList('Tagihan SPP', tagihanAnak, function(t){ return t.tanggal || t.jatuh_tempo || ''; }, function(t){
          var lunas = (function(){ var st=String(t.status||''); return /lunas/i.test(st) && !/belum/i.test(st); })();
          return { time: t.tanggal || t.jatuh_tempo || '-', title: (t.keterangan || t.deskripsi || 'SPP') + ' - Rp' + Number(t.nominal||0).toLocaleString('id-ID'), meta: (appState.childName || '') + (t.kelas ? ' \u00b7 ' + t.kelas : '') + (t.tahun_ajaran ? ' \u00b7 ' + t.tahun_ajaran : ''), status: lunas ? 'Lunas' : 'Belum', tone: lunas ? 'green' : 'orange' };
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
      <div id="fin-sec-spp">${renderWaliRiwayatList('Tagihan SPP', tagihanAnak, function(t){ return t.tanggal || t.jatuh_tempo || ''; }, function(t){
        var lunas = (function(){ var st=String(t.status||''); return /lunas/i.test(st) && !/belum/i.test(st); })();
        return {
          time: t.tanggal || t.jatuh_tempo || '-',
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
  if (['keuangan-spp', 'keuangan-tabungan', 'keuangan-umum'].includes(moduleId)) return 'home';
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
  return `
    <article class="announcement-item">
      <div class="announcement-time">${item.time}</div>
      <div class="announcement-copy">
        <h4>${item.title}</h4>
        <p>${item.meta}</p>
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
    var perkMonthSel = event.target && event.target.closest && event.target.closest('select[data-select="perk-month"]');
    if (perkMonthSel) {
      var c = perkMonthSel.getAttribute('data-perk-cat');
      if (c) { appState.perkembanganMonth = appState.perkembanganMonth || {}; appState.perkembanganMonth[c] = perkMonthSel.value; appState.perkembanganLimit = appState.perkembanganLimit || {}; appState.perkembanganLimit[c] = 10; updatePerkembanganSectionNoRender(c); }
    }
  });

  document.addEventListener('click', async (event) => {
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
        notifyFeedback('success');
        waliShowSaveOk('Tersimpan ke Supabase.');
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
function studentAvatarHtml(extraClass) {
  var cls = 'teacher-photo' + (extraClass ? (' ' + extraClass) : '');
  var url = childProfile.photoUrl || '';
  var nama = childProfile.fullName || childProfile.nickName || 'Siswa';
  if (url) {
    return '<span class="' + cls + ' has-photo"><img src="' + url + '" alt="Foto ' + nama + '" onerror="this.parentNode.classList.remove(\'has-photo\');this.parentNode.textContent=\'' + initials(nama) + '\';" /></span>';
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
  // Kartu Hafalan di dashboard menu (renderAcademic / renderChild) membaca nilai
  // precompute ini. Sebelumnya tidak pernah diisi -> selalu "Belum ada data".
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

async function hydrateWaliFromSupabase() {
  if (!window.ZymataMobileSupabase) return;
  const session = window.ZymataMobileSupabase.readSession();
  if (!session) return;
  try {
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
    syncWaliFinanceState();
    saveState();
    saveWaliDataCache();
    render();
  } catch (error) {
    console.warn('[MobileWali] gagal load Supabase:', error && error.message ? error.message : error);
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
render();
hydrateWaliFromSupabase();
animateWaliContent();

// ===== Auto-refresh data saat app dibuka kembali =====
// Di aplikasi native (APK) webview hanya "resume", tidak reload, sehingga data
// dari Supabase tidak ter-update otomatis. Listener ini menarik data terbaru
// (pelanggaran, nilai, membaca quran, dll) tiap app kembali aktif / terlihat.
(function setupWaliAutoRefresh(){
  var _busy = false, _last = Date.now();
  function refreshNow(){
    if(_busy) return;
    if(Date.now() - _last < 3000) return; // throttle 3 detik
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
      const ctx = await window.ZymataMobileSupabase.loadWaliContext(session);
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
      // Update module cache hanya untuk finance
      if(Array.isArray(sppRows) || Array.isArray(tagihanRows) || Array.isArray(keuRows)) {
        _smF.keuangan = [].concat(
          Array.isArray(sppRows) ? sppRows : [],
          Array.isArray(tagihanRows) ? tagihanRows : [],
          Array.isArray(keuRows) ? keuRows : []
        );
      }
      if(Array.isArray(tabRows)) _smF.tabungan = tabRows;
      if(Array.isArray(tabUmumRows)) _smF.tabunganUmum = tabUmumRows;
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
      var _sig = _finSig(_smF.keuangan) + '#' + _finSig(_smF.tabungan) + '#' + _finSig(_smF.tabunganUmum);
      if(_lastSig === ''){
        // Poll pertama: set baseline saja, JANGAN render (data sudah tampil dari load awal).
        _lastSig = _sig;
      } else if(_sig !== _lastSig){
        _lastSig = _sig;
        if(appState.activeTab === 'home') render();
      }
    } catch(_){}
    _last = Date.now();
  }
  // Poll ringan tiap 60 detik (hemat Disk I/O Supabase). Sebelumnya 15 detik.
  setInterval(pollFinance, 60000); // 60 detik
  // Juga pas visibility/focus
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible' && Date.now() - _last > 5000) pollFinance();
  });
  window.addEventListener('focus', function(){
    if(Date.now() - _last > 5000) pollFinance();
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

  var CATS_WALI = ["Ziyadah","Muroja'ah","Tilawah"];
  var CATS_SEKOLAH = ["Ziyadah","Muroja'ah","Tilawah"];

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;'); }
  function nowISO(){ return new Date().toISOString(); }
  function curSemester(){ var m=new Date().getMonth()+1; return (m>=7&&m<=12)?'Ganjil':'Genap'; }
  function curTA(){ var d=new Date(),y=d.getFullYear(),m=d.getMonth()+1; return (m>=7)?(y+'/'+(y+1)):((y-1)+'/'+y); }
  function todayStr(){ var d=new Date(); var mm=String(d.getMonth()+1); if(mm.length<2)mm='0'+mm; var dd=String(d.getDate()); if(dd.length<2)dd='0'+dd; return d.getFullYear()+'-'+mm+'-'+dd; }
  function SB(){ return window.ZymataMobileSupabase; }
  function activeTahfidz(){ return appState.activeTab==='module:mutabaah-tahfidz'; }
  function childNis(){ return String(appState.childNis||(childProfile&&childProfile.nis)||''); }
  function childNama(){ return String((childProfile&&childProfile.fullName)||appState.childName||'Anak'); }
  function childKelas(){ return String(appState.childClass||(childProfile&&childProfile.className)||''); }
  function toast(msg,type){ try{ if(typeof waliToast==='function'){ waliToast(msg,type); return; } }catch(e){} }

  var WT = { tab:'wali_murid', wali:{}, sekolah:{}, riwayat:[], riwayatSekolah:[], loading:false, loadedNis:null };

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
      try{ if(api&&nis){ var rr=await api.select('mutabaah_tahfidz_riwayat',{ eq:{ siswa_id:String(nis), konteks:'wali_murid' }, order:'tanggal', ascending:false, limit:150 }); WT.riwayat=(rr&&rr.data)?rr.data:[]; } else { WT.riwayat=[]; } }catch(e){ WT.riwayat=[]; }
      try{ if(api&&nis){ var rs=await api.select('mutabaah_tahfidz_riwayat',{ eq:{ siswa_id:String(nis), konteks:'sekolah' }, order:'tanggal', ascending:false, limit:150 }); WT.riwayatSekolah=(rs&&rs.data)?rs.data:[]; } else { WT.riwayatSekolah=[]; } }catch(e){ WT.riwayatSekolah=[]; }
    }catch(e){ WT.wali={}; WT.sekolah={}; WT.riwayat=[]; WT.riwayatSekolah=[]; }
    WT.loading=false;
    if(activeTahfidz()) render();
  }

  window.zwTf = {
    setTab: function(t){ WT.tab=(t==='sekolah')?'sekolah':'wali_murid'; render(); },
    recalc: function(idx){
      var sEl=document.getElementById('zwtf-surah-'+idx), aEl=document.getElementById('zwtf-ayat-'+idx), pEl=document.getElementById('zwtf-prog-'+idx);
      if(!sEl||!aEl||!pEl) return;
      var r=computeProgres(sEl.value, aEl.value);
      pEl.textContent = r.juz ? ('Juz '+r.juz+' - '+r.pct+'%') : 'Belum ada';
    },
    save: async function(){
      var api=SB(); if(!api){ toast('Supabase belum siap','error'); return; }
      var nis=childNis(); if(!nis){ toast('Data anak belum termuat','error'); return; }
      var nama=childNama(), kelas=childKelas();
      var tglEl=document.getElementById('zwtf-tanggal'); var tgl=(tglEl&&tglEl.value)?tglEl.value:todayStr();
      var ta=curTA(), sem=curSemester(), saved=0, failed=0, filled=0, logs=[];
      for(var i=0;i<CATS_WALI.length;i++){
        var kat=CATS_WALI[i];
        var sEl=document.getElementById('zwtf-surah-'+i), aEl=document.getElementById('zwtf-ayat-'+i), cEl=document.getElementById('zwtf-cat-'+i);
        var surah_no=parseInt(sEl&&sEl.value,10)||0;
        if(!surah_no) continue;
        filled++;
        var ayat=parseInt(aEl&&aEl.value,10)||0;
        var prog=computeProgres(surah_no,ayat);
        var snama=(SURAH[surah_no-1]?SURAH[surah_no-1][0]:'');
        var cat=(cEl?cEl.value:'')||'';
        var body={ client_key:'default', konteks:'wali_murid', siswa_id:String(nis), nis:String(nis), nama_siswa:nama, kelas:kelas, kategori:kat, surah_no:surah_no, surah_nama:snama, ayat:ayat, juz:prog.juz, progres:prog.pct, catatan:cat, tahun_ajaran:ta, semester:sem, updated_at:nowISO() };
        var res=await api.upsert('mutabaah_tahfidz',body,'client_key,siswa_id,konteks,kategori,tahun_ajaran,semester');
        if(res&&res.error) failed++; else saved++;
        logs.push({ client_key:'default', konteks:'wali_murid', siswa_id:String(nis), nis:String(nis), nama_siswa:nama, kelas:kelas, kategori:kat, surah_no:surah_no, surah_nama:snama, ayat:ayat, juz:prog.juz, progres:prog.pct, catatan:cat, tanggal:tgl, tahun_ajaran:ta, semester:sem, guru_nip:'', guru_nama:('Wali - '+nama) });
      }
      if(!filled){ toast('Isi minimal 1 kategori','error'); return; }
      if(logs.length){ try{ await api.insert('mutabaah_tahfidz_riwayat', logs); }catch(e){} }
      if(saved){ toast('Tersimpan '+saved+' kategori','success'); WT.loadedNis=null; loadTahfidz(nis); }
      else toast('Gagal menyimpan','error');
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
      +'.zwtf-note{text-align:center;color:#64748b;font-size:12px;font-weight:700;margin:10px 0}'
      +'</style>';
  }

  function surahOptions(selNo){
    var out='<option value="">Pilih surah</option>';
    for(var k=0;k<SURAH.length;k++){ var no=k+1; var sel=(String(selNo||'')===String(no))?' selected':''; out+='<option value="'+no+'"'+sel+'>'+no+'. '+esc(SURAH[k][0])+'</option>'; }
    return out;
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
    arr.forEach(function(r){ var d=String(r.tanggal||r.tgl||'').slice(0,10)||'-'; (groups[d]=groups[d]||[]).push(r); });
    var dates=Object.keys(groups).sort().reverse();
    var inner='';
    dates.forEach(function(d){
      var rows=groups[d];
      var cards=rows.map(function(r){
        var judul=(r.surah_nama||('Surah '+r.surah_no))+(r.ayat?' : ayat '+r.ayat:'');
        var meta=(r.juz?'Juz '+r.juz+' \u00b7 '+(r.progres||0)+'%':'')+(r.catatan?(' \u00b7 '+esc(r.catatan)):'');
        return '<article class="db-ready-card" style="margin-bottom:8px">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 class="card-title" style="font-size:14px;margin:0">'+esc(r.kategori||'-')+'</h3><span class="status-pill green">'+(r.progres||0)+'%</span></div>'
          +'<p class="card-meta" style="margin:6px 0 0"><b>'+esc(judul)+'</b></p>'
          +(meta?'<p class="card-meta" style="margin:2px 0 0">'+meta+'</p>':'')
          +'</article>';
      }).join('');
      inner += '<p class="riwayat-absen-count" style="font-weight:800;color:#0f766e;margin:12px 0 6px">'+esc(d)+' \u00b7 '+rows.length+' data</p>'+cards;
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
        var kat=CATS_WALI[i]; var rec=WT.wali[kat]||{};
        var progText=rec.juz?('Juz '+rec.juz+' - '+(rec.progres||0)+'%'):'Belum ada';
        cards+='<div class="zwtf-cat">'
          +'<div class="zwtf-cat-head"><span class="zwtf-cat-title">'+esc(kat)+'</span><span class="zwtf-chip" id="zwtf-prog-'+i+'">'+progText+'</span></div>'
          +'<label class="field-label">Surah</label><select class="field-select" id="zwtf-surah-'+i+'" onchange="window.zwTf.recalc('+i+')">'+surahOptions(rec.surah)+'</select>'
          +'<label class="field-label">Ayat terakhir</label><input type="number" inputmode="numeric" class="field-input" id="zwtf-ayat-'+i+'" value="'+(rec.ayat!=null&&rec.ayat!==''?esc(rec.ayat):'')+'" oninput="window.zwTf.recalc('+i+')" placeholder="mis. 10">'
          +'<label class="field-label">Catatan</label><input type="text" class="field-input" id="zwtf-cat-'+i+'" value="'+(rec.catatan?esc(rec.catatan):'')+'" placeholder="Catatan (opsional)">'
          +'</div>';
      }
      var tglField='<label class="field-label">Tanggal</label><input type="date" class="field-input" id="zwtf-tanggal" value="'+todayStr()+'" style="margin-bottom:12px">';
      body='<section class="section"><article class="input-panel">'+tglField+cards
        +'<button type="button" class="save-draft-btn" style="margin-top:12px" onclick="window.zwTf.save()">Simpan Mutabaah Tahfidz</button>'
        +'</article></section>'+riwayatHtml(WT.riwayat, 'Mutabaah Tahfidz');
    } else {
      var items='';
      for(var j=0;j<CATS_SEKOLAH.length;j++){
        var k2=CATS_SEKOLAH[j]; var r2=WT.sekolah[k2];
        if(!r2){ items+='<div class="zwtf-ro"><div class="zwtf-ro-head"><span class="zwtf-ro-title">'+esc(k2)+'</span><span class="zwtf-chip" style="background:#e2e8f0;color:#64748b">Belum diisi</span></div><div class="zwtf-ro-meta">Guru belum mengisi setoran untuk kategori ini.</div></div>'; continue; }
        var judul=(r2.surah_nama||('Surah '+r2.surah))+(r2.ayat?' : ayat '+r2.ayat:'');
        var meta=(r2.juz?'Juz '+r2.juz+' \u00b7 '+(r2.progres||0)+'%':'')+(r2.catatan?(' \u00b7 '+esc(r2.catatan)):'');
        items+='<div class="zwtf-ro"><div class="zwtf-ro-head"><span class="zwtf-ro-title">'+esc(k2)+'</span><span class="zwtf-chip">'+(r2.progres||0)+'%</span></div><div class="zwtf-ro-meta"><b>'+esc(judul)+'</b></div>'+(meta?'<div class="zwtf-ro-meta">'+meta+'</div>':'')+'</div>';
      }
      body='<section class="section">'+((typeof sectionHead==='function')?sectionHead('Setoran sekolah (dari guru)','Hanya baca'):'')+items+'</section>'+riwayatHtml(WT.riwayatSekolah, 'Setoran Sekolah');
    }
    return intro + styleTag() + childHtml + tabsHtml + noteHtml + body + '<div style="height:120px"></div>';
  };
})();
