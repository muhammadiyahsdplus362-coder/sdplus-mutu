(function(){
  'use strict';

  const SUPABASE_URL = 'https://hhcawtwbgfhivwfofdhx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_z0oKadub8giLFprCNmW6Rg_tUqajLDu';
  const SESSION_KEY = 'siakad_session_user';

  function clean(value){ return String(value == null ? '' : value).trim(); }
  function digits(value){ return clean(value).replace(/[^0-9]/g, ''); }
  function roleKey(value){ return clean(value).toLowerCase().replace(/[\s_-]+/g, ''); }
  function routeForRole(role){
    const r = roleKey(role);
    if(r === 'guru' || r === 'walikelas') return 'guru-shell.html';
    if(r === 'wali' || r === 'walimurid' || r === 'orangtua' || r === 'ortu') return 'wali-shell.html';
    return 'index.html?choose=1';
  }

  function getClient(){
    if(window.__ZYMATA_MOBILE_SUPA__) return window.__ZYMATA_MOBILE_SUPA__;
    if(!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabase SDK belum siap. Cek koneksi internet.');
    }
    window.__ZYMATA_MOBILE_SUPA__ = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return window.__ZYMATA_MOBILE_SUPA__;
  }

  async function select(table, options){
    const client = getClient();
    options = options || {};
    let q = client.from(table).select(options.select || '*');
    if(options.eq) Object.keys(options.eq).forEach((key) => q = q.eq(key, options.eq[key]));
    if(options.or) q = q.or(options.or);
    if(options.order) q = q.order(options.order, { ascending: options.ascending !== false });
    if(options.limit) q = q.limit(options.limit);
    const res = await q;
    return res;
  }

  async function first(table, options){
    const res = await select(table, Object.assign({}, options || {}, { limit: 1 }));
    if(res.error) throw res.error;
    return Array.isArray(res.data) ? (res.data[0] || null) : null;
  }

  function saveSession(user){
    const payload = {
      id: user.id || '',
      username: user.username || '',
      nama: user.nama || user.name || user.email || user.username || 'Pengguna',
      role: user.role || '',
      status: user.status || 'Aktif',
      loginAt: new Date().toISOString(),
      guru_id: user.guru_id || null,
      guru_nip: user.guru_nip || user.nip_guru || null,
      nama_guru: user.nama_guru || null,
      siswa_id: user.siswa_id || null,
      nis_siswa: user.nis_siswa || null,
      nama_siswa: user.nama_siswa || null,
      kelas_siswa: user.kelas_siswa || null,
      hubungan_siswa: user.hubungan_siswa || null
    };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload)); } catch(_) {}
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(payload)); } catch(_) {}
    return payload;
  }

  function readSession(){
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(_) { return null; }
  }

  function clearSession(){
    try { sessionStorage.removeItem(SESSION_KEY); } catch(_) {}
    try { localStorage.removeItem(SESSION_KEY); } catch(_) {}
  }

  function emailCandidates(username){
    const u = clean(username).toLowerCase();
    const d = digits(u);
    const base = Array.from(new Set([u, d].filter((x) => x && (x.includes('@') || x.length >= 3))));
    const emails = [];
    base.forEach((x) => {
      if(x.includes('@')) emails.push(x);
      else {
        emails.push(x + '@sekolah.id');
        emails.push(x + '@siakad.local');
      }
    });
    return Array.from(new Set(emails));
  }

  async function loadProfile(authUser, usernameFallback){
    let profile = null;
    if(authUser && authUser.id) profile = await first('profiles', { eq: { id: authUser.id } }).catch(() => null);
    if(!profile && usernameFallback) profile = await first('profiles', { eq: { username: clean(usernameFallback).toLowerCase() } }).catch(() => null);
    if(!profile && usernameFallback && digits(usernameFallback)) profile = await first('profiles', { eq: { username: digits(usernameFallback) } }).catch(() => null);
    return profile;
  }

  async function signIn(username, password){
    const client = getClient();
    const errors = [];
    for(const email of emailCandidates(username)){
      const res = await client.auth.signInWithPassword({ email, password });
      if(!res.error && res.data && res.data.user) {
        const profile = await loadProfile(res.data.user, username);
        if(!profile) throw new Error('Login berhasil, tapi profil pengguna belum ada di tabel profiles. Hubungi admin.');
        if(String(profile.status || 'Aktif').toLowerCase() === 'nonaktif') throw new Error('Akun Anda dinonaktifkan.');
        const user = saveSession(Object.assign({}, profile, { id: profile.id || res.data.user.id, email }));
        return { user, profile, authUser: res.data.user };
      }
      if(res.error) errors.push(res.error.message);
    }
    throw new Error(errors[0] || 'Username atau password salah.');
  }

  async function signOut(){
    clearSession();
    try { await getClient().auth.signOut(); } catch(_) {}
  }

  async function loadGuruContext(session){
    session = session || readSession();
    if(!session) return null;
    let guru = null;
    if(session.guru_id) guru = await first('guru', { eq: { id: session.guru_id } }).catch(() => null);
    if(!guru && session.guru_nip) guru = await first('guru', { eq: { nip: session.guru_nip } }).catch(() => null);
    if(!guru && session.username) {
      const hp = digits(session.username);
      if(hp) guru = await first('guru', { eq: { hp } }).catch(() => null);
    }
    if(!guru && session.nama_guru) guru = await first('guru', { eq: { nama: session.nama_guru } }).catch(() => null);
    if(!guru && session.nama) guru = await first('guru', { eq: { nama: session.nama } }).catch(() => null);

    let mengajar = [];
    if(guru && guru.nip) {
      const res = await select('guru_mengajar', { eq: { guru_nip: guru.nip }, limit: 100 });
      if(!res.error && Array.isArray(res.data)) mengajar = res.data;
    }
    return { session, guru, mengajar };
  }

  var ACTIVE_CHILD_KEY = 'zymata_wali_active_child';
  function getActiveChildId(){
    try { return localStorage.getItem(ACTIVE_CHILD_KEY) || sessionStorage.getItem(ACTIVE_CHILD_KEY) || ''; } catch(_) { return ''; }
  }
  function setActiveChildId(id){
    try { localStorage.setItem(ACTIVE_CHILD_KEY, String(id == null ? '' : id)); } catch(_) {}
    try { sessionStorage.setItem(ACTIVE_CHILD_KEY, String(id == null ? '' : id)); } catch(_) {}
  }
  async function loadWaliChildren(session){
    var ctx = await loadWaliContext(session);
    return (ctx && Array.isArray(ctx.children)) ? ctx.children : [];
  }

  async function loadWaliContext(session){
    session = session || readSession();
    if(!session) return null;
    let siswa = null;

    // BYPASS: Utamakan mencari siswa berdasarkan nomor HP login (data terbaru), abaikan data profil lama
    const rawLoginUser = session.username || session.hp || session.no_hp || session.phone || '';
    const hpLogin = digits(rawLoginUser);
    var children = [];
    if(hpLogin) {
      var rAll = await select('siswa', { eq: { hp: hpLogin }, order: 'nama', limit: 30 }).catch(() => null);
      if(rAll && !rAll.error && Array.isArray(rAll.data)) children = rAll.data;
      // Kalau tidak ketemu yang angkanya saja, coba format aslinya
      if(!children.length){
        var rAll2 = await select('siswa', { eq: { hp: clean(rawLoginUser) }, order: 'nama', limit: 30 }).catch(() => null);
        if(rAll2 && !rAll2.error && Array.isArray(rAll2.data)) children = rAll2.data;
      }
    }
    if(children.length){
      var _activeId = getActiveChildId();
      siswa = (_activeId ? children.find(function(c){ return String(c.id) === String(_activeId); }) : null) || children[0];
    }

    // Jika tidak ketemu via HP, baru pakai fallback dari profil (siswa_id / nis lama)
    if(!siswa && session.siswa_id) siswa = await first('siswa', { eq: { id: session.siswa_id } }).catch(() => null);
    if(!siswa && session.nis_siswa) siswa = await first('siswa', { eq: { nis: session.nis_siswa } }).catch(() => null);

    let relation = null;
    if(!siswa) {
      const relRes = await select('wali_murid_siswa', { limit: 20 });
      if(!relRes.error && Array.isArray(relRes.data)) {
        relation = relRes.data.find((r) => clean(r.user_id) === clean(session.id) || clean(r.wali_id) === clean(session.id) || clean(r.profile_id) === clean(session.id) || clean(r.username) === clean(session.username)) || null;
        if(relation) {
          if(relation.siswa_id) siswa = await first('siswa', { eq: { id: relation.siswa_id } }).catch(() => null);
          if(!siswa && relation.nis_siswa) siswa = await first('siswa', { eq: { nis: relation.nis_siswa } }).catch(() => null);
        }
      }
    }
    if(siswa && siswa.kelas && !siswa.wali_kelas){
      try {
        const guruRes = await first('guru',{ eq:{ wali_kelas: siswa.kelas } }).catch(()=>null);
        if(guruRes && (guruRes.nama||guruRes.nama_guru||guruRes.name))
          siswa.wali_kelas = guruRes.nama||guruRes.nama_guru||guruRes.name;
      } catch(_){}
    }
    const ctx = { session, siswa, relation, children: children };
    try { if (typeof window !== 'undefined') { window.__zymataWaliCtx = ctx; window.__zymataWaliChildren = children; } } catch(_) {}
    return ctx;
  }

  // --- Cache kolom-hilang: cegah query ULANG ke kolom yang tidak ada (error 42703 di log Supabase) ---
  var __zMissingCols = {};
  try { __zMissingCols = JSON.parse(localStorage.getItem('zymata_missing_cols_v1') || '{}') || {}; } catch(_) { __zMissingCols = {}; }
  function __colMissing(table, col){ return __zMissingCols[table + '::' + col] === true; }
  function __markColMissing(table, col){
    if(__zMissingCols[table + '::' + col]) return;
    __zMissingCols[table + '::' + col] = true;
    try { localStorage.setItem('zymata_missing_cols_v1', JSON.stringify(__zMissingCols)); } catch(_) {}
  }
  // Kolom-ALIAS siswa yang sering TIDAK ada di sebagian tabel (penyebab utama spam 42703 di log).
  // HANYA kolom-kolom ini yang boleh "dipangkas otomatis" berdasarkan daftar kolom resmi tabel.
  // Kolom lain (siswa_id, kelas, nama_siswa, dll) TIDAK PERNAH dipangkas -> filter valid tetap jalan.
  var __PROBE_ALIAS_COLS = ['id_siswa','siswa_nis','snapshot_nis','snapshot_kelas','nis','nis_siswa'];
  // Filter dianggap valid selama kolomnya BELUM terbukti tidak ada (dari error 42703 sebelumnya).
  function __eqValidForTable(table, eq){
    if(!eq || typeof eq !== 'object') return true;
    var __allow = (typeof WEB_ALLOWED_COLS !== 'undefined' && WEB_ALLOWED_COLS) ? WEB_ALLOWED_COLS[table] : null;
    return Object.keys(eq).every(function(col){
      if(__colMissing(table, col)) return false;
      // Cegah query (dan spam 42703) untuk kolom-alias yang jelas tak ada di tabel ini.
      if(__allow && __PROBE_ALIAS_COLS.indexOf(col) !== -1 && __allow.indexOf(col) === -1) return false;
      return true;
    });
  }
  // Deteksi error "column X.Y does not exist" lalu tandai kolomnya supaya tidak di-query lagi.
  function __noteErrorMissingCol(table, options, error){
    var msg = String((error && (error.message || error.msg || error.details || error.hint)) || error || '');
    if(!/does not exist|schema cache|could not find/i.test(msg)) return;
    var eq = options && options.eq;
    if(eq && typeof eq === 'object'){
      Object.keys(eq).forEach(function(col){
        if(msg.indexOf('.' + col) !== -1 || msg.indexOf("'" + col + "'") !== -1 || msg.indexOf('"' + col + '"') !== -1) __markColMissing(table, col);
      });
    }
  }

  async function safeList(table, options){
    try {
      const res = await select(table, options || { limit: 50 });
      if(res.error){ __noteErrorMissingCol(table, options, res.error); return []; }
      return Array.isArray(res.data) ? res.data : [];
    } catch(e) { __noteErrorMissingCol(table, options, e); return []; }
  }

  async function tryFilteredList(table, filters, limit, opts){
    // Buang filter yang kolomnya sudah terbukti tidak ada di tabel ini (cegah spam error 42703).
    filters = (filters || []).filter(function(eq){ return __eqValidForTable(table, eq); });
    opts = opts || {};
    const collected = [];
    const seen = {};
    for(const eq of filters){
      const rows = await safeList(table, { eq, limit: limit || 50 });
      for(const r of rows){
        const k = r && (r.id || JSON.stringify(r));
        if(!seen[k]){ seen[k] = true; collected.push(r); }
      }
      // strict: berhenti setelah dapat hasil dari filter pertama yang cocok (tidak tarik filter lain)
      if(opts.strict && collected.length) break;
    }
    if(collected.length) return collected;
    // STRICT MODE (wali): TIDAK fallback ambil semua data. Return kosong supaya tidak bocor data anak lain.
    if(opts.strict) return [];
    // Modul berbasis kelas (guru): JANGAN fallback ambil semua -> cegah kelas lain bocor ke riwayat.
    if(opts.noFallback) return [];
    // Default fallback: ambil data terbaru (untuk guru/role lain yang dilindungi RLS).
    return await safeList(table, { limit: limit || 50 });
  }

  function normalizeItem(row, fallbackTitle){
    row = row || {};
    const title = row.judul || row.title || row.nama || row.nama_siswa || row.snapshot_nama || row.materi || row.kegiatan || row.perihal || row.keterangan || fallbackTitle || 'Data';
    // Rangkai detail penting dari kolom yang terisi menjadi satu baris ringkas
    const detailDefs = [
      ['Kelas', row.kelas], ['Mapel', row.mapel], ['Semester', row.semester], ['Jenis', row.jenis],
      ['Surah', row.surat], ['Juz', row.juz], ['Ayat', row.ayat], ['Halaman', row.halaman], ['At-Tanzil', row.at_tanzil],
      ['Tulis', row.nilai_tugas], ['Ujian', row.nilai_ujian], ['Nilai', row.nilai],
      ['Bulan', row.bulan], ['Shalat', row.shalat], ['Sunnah', row.sunnah], ['Puasa', row.puasa], ['Sedekah', row.sedekah],
      ['Disiplin', row.disiplin], ['Sopan', row.sopan], ['Jujur', row.jujur], ['Kerja sama', row.kerja_keras], ['Tanggung jawab', row.tanggung_jawab],
      ['Lomba', row.lomba], ['Tingkat', row.tingkat], ['Peringkat', row.peringkat], ['Tahun', row.tahun],
      ['Pelanggaran', row.pelanggaran], ['Poin', row.poin], ['Tindak lanjut', row.tindak_lanjut],
      ['Tilawah', row.tilawah_rumah], ['Murojaah', row.murojaah_rumah], ['Ziyadah', row.ziyadah_sekolah], ['Setoran', row.status_setoran], ['Catatan guru', row.catatan_guru], ['Catatan wali', row.catatan_wali],
      ['Akhlak', row.akhlak], ['Belajar', row.belajar], ['Kendala', row.kendala], ['Shalat (x/5)', row.shalat_count], ['Review', row.status_review], ['Wali', row.nama_wali],
      ['Jam ke', row.jam_ke], ['Kategori', row.kategori], ['Target', row.target],
      ['Catatan', row.catatan]
    ];
    const seen = {};
    const details = [];
    for (let i = 0; i < detailDefs.length; i++) {
      const label = detailDefs[i][0];
      const val = detailDefs[i][1];
      if (val === undefined || val === null) continue;
      const sv = clean(String(val)).trim();
      if (sv === '' || seen[label]) continue;
      seen[label] = true;
      details.push(label + ': ' + sv);
    }
    const meta = details.length ? details.join(' \u2022 ') : clean(String(row.isi || row.deskripsi || row.status || 'Tersimpan'));
    let rawTime = row.tgl || row.tanggal || row.created_at || row.updated_at || row.jam || '';
    if(!row.tgl && !row.tanggal && row.tahun && row.bulan && row.hari){
      rawTime = String(row.tahun) + '-' + ('0' + row.bulan).slice(-2) + '-' + ('0' + row.hari).slice(-2);
    }
    const time = clean(String(rawTime)).slice(0, 16).replace('T', ' ');
    return { time: time || 'Data', title: clean(title), meta: meta, status: clean(row.status || 'Aktif'), tone: 'blue' };
  }

  const MODULE_TARGET_TABLE = {
    'guru:absensi-siswa': 'absensi_siswa',
    'guru:nilai': 'nilai_siswa',
    'guru:jurnal-guru': 'jurnal_guru',
    'guru:jurnal-kelas': 'jurnal_kelas',
    'guru:catatan-siswa': 'jurnal_siswa',
    'guru:hafalan': 'hafalan',
    'guru:membaca-quran': 'membaca_quran',
    'guru:ibadah': 'ibadah',
    'guru:surat-izin': 'surat',
    'guru:ekstrakurikuler': 'ekskul',
    'guru:karakter': 'karakter',
    'guru:prestasi': 'prestasi',
    'guru:pengumuman': 'pengumuman',
    'guru:pelanggaran': 'pelanggaran_siswa',
    'guru:kalender-akademik': 'kalender_events',
    'guru:mutabaah-quran': 'mutabaah_quran',
    'guru:ulangan-harian': 'ulangan_harian_nilai',
    'guru:ujian-semester': 'ujian_semester_nilai',
    'guru:mutabaah-rumah': 'mutabaah_rumah',
    'wali:absensi-anak': 'absensi_siswa',
    'wali:nilai-anak': 'nilai_siswa',
    'wali:catatan-anak': 'jurnal_siswa',
    'wali:mutabaah-quran': 'mutabaah_quran',
    'wali:mutabaah-rumah': 'mutabaah_rumah',
    'wali:membaca-quran': 'membaca_quran',
    'wali:surat-wali': 'surat',
    'wali:keuangan': 'keuangan',
    'guru:tabungan': 'tabungan_siswa',
    'wali:tabungan': 'tabungan_siswa',
    'wali:pengumuman-wali': 'pengumuman'
  };

  const MODULE_FORM_SCHEMA = {
    'guru:tabungan': { title:'Input Tabungan', fields:[
      {key:'kelas',label:'Kelas',type:'text'},
      {key:'siswa_id',label:'Siswa',type:'siswa-select'},
      {key:'jenis',label:'Jenis',type:'text',options:['Setoran','Penarikan']},
      {key:'nominal',label:'Nominal',type:'number'},
      {key:'metode',label:'Metode',type:'text',options:['Tunai','Transfer','QRIS']},
      {key:'keterangan',label:'Keterangan',type:'textarea'}
    ]},
    'guru:absensi-siswa': { title:'Input Absensi', fields:[
      {key:'tanggal',label:'Tanggal',type:'date'},
      {key:'kelas_id',label:'Kelas',type:'text'},
      {key:'siswa_id',label:'Siswa',type:'siswa-select'},
      {key:'status',label:'Status',type:'text',options:['Hadir','Sakit','Izin','Alpa']},
      {key:'keterangan',label:'Keterangan',type:'textarea'}
    ]},
    'guru:nilai': { title:'Input Nilai', fields:[
      {key:'siswa_id',label:'Siswa',type:'siswa-select'},
      {key:'kelas_id',label:'Kelas',type:'text'},
      {key:'mapel_id',label:'Mata Pelajaran',type:'text'},
      {key:'semester',label:'Semester',type:'text',options:['Semester 1','Semester 2']},
      {key:'jenis',label:'Jenis Nilai',type:'text',options:['UH','UTS','UAS','Tugas','Praktik']},
      {key:'tulis',label:'Nilai Tulis',type:'number'},
      {key:'lisan',label:'Nilai Lisan',type:'number'},
      {key:'catatan',label:'Catatan',type:'textarea'}
    ]},
    'guru:jurnal-guru': { title:'Jurnal Guru', fields:[
      {key:'tanggal',label:'Tanggal',type:'date'},
      {key:'guru_id',label:'Guru',type:'text'},
      {key:'kelas_id',label:'Kelas',type:'text'},
      {key:'mapel_id',label:'Mapel',type:'text'},
      {key:'jam_ke',label:'Jam Ke',type:'text'},
      {key:'metode',label:'Metode',type:'text',options:['Diskusi','Ceramah','Praktik','Proyek']},
      {key:'materi',label:'Materi',type:'textarea'},
      {key:'kegiatan',label:'Kegiatan',type:'textarea'},
      {key:'tindak_lanjut',label:'Tindak Lanjut',type:'text'},
      {key:'status',label:'Status',type:'text',options:['Draft','Disetor','Diverifikasi']}
    ]},
    'guru:jurnal-kelas': { title:'Jurnal Kelas', fields:[
      {key:'tanggal',label:'Tanggal',type:'date'},
      {key:'kelas_id',label:'Kelas',type:'text'},
      {key:'mapel_id',label:'Mapel',type:'text'},
      {key:'jam_ke',label:'Jam Ke',type:'text'},
      {key:'status',label:'Status',type:'text',options:['Disetor','Draft','Diverifikasi']},
      {key:'materi',label:'Materi Jurnal',type:'textarea'}
    ]},
    'guru:surat-izin': { title:'Buat Surat', fields:[
      {key:'tanggal',label:'Tanggal',type:'date'},
      {key:'jenis',label:'Jenis Surat',type:'text',options:['Surat Izin','Surat Sakit','Surat Aktif','Surat Terlambat','Surat Pulang','Surat Lomba','Surat Kegiatan','Surat Edaran','Surat Panggilan']},
      {key:'nomor',label:'No. Surat',type:'text'},
      {key:'perihal',label:'Perihal *',type:'text'},
      {key:'siswa_id',label:'Siswa',type:'siswa-select'},
      {key:'kelas_id',label:'Kelas',type:'text'},
      {key:'nisn',label:'NISN',type:'text'},
      {key:'nama_wali',label:'Nama Orang Tua/Wali',type:'text'},
      {key:'hp_wali',label:'No. HP Wali',type:'text'},
      {key:'pihak',label:'Ditujukan Kepada',type:'text'},
      {key:'tgl_mulai',label:'Tgl Mulai Izin',type:'date'},
      {key:'tgl_selesai',label:'Tgl Selesai Izin',type:'date'},
      {key:'status',label:'Status',type:'text',options:['Menunggu','Disetujui','Ditolak']},
      {key:'isi',label:'Alasan / Isi Surat *',type:'textarea'}
    ]},
    'guru:ulangan-harian': { title:'Ulangan Harian', fields:[
      {key:'kelas',label:'Kelas'},
      {key:'siswa_id',label:'Siswa',type:'siswa-select'},
      {key:'mapel',label:'Mata Pelajaran'},
      {key:'semester',label:'Semester',type:'text',options:['Semester 1','Semester 2']},
      {key:'tanggal',label:'Tanggal',type:'date'},
      {key:'nilai',label:'Nilai',type:'number'},
      {key:'nilai_akhir',label:'Nilai Akhir',type:'number'},
      {key:'kkm',label:'KKM',type:'number'},
      {key:'catatan',label:'Catatan',type:'textarea'}
    ]},
    'guru:ujian-semester': { title:'Ujian Semester', fields:[
      {key:'kelas',label:'Kelas'},
      {key:'siswa_id',label:'Siswa',type:'siswa-select'},
      {key:'mapel',label:'Mata Pelajaran'},
      {key:'semester',label:'Semester',type:'text',options:['Semester 1','Semester 2']},
      {key:'tanggal',label:'Tanggal',type:'date'},
      {key:'nilai',label:'Nilai',type:'number'},
      {key:'nilai_akhir',label:'Nilai Akhir',type:'number'},
      {key:'kkm',label:'KKM',type:'number'},
      {key:'catatan',label:'Catatan',type:'textarea'}
    ]},
    'guru:hafalan': { title:'Input Hafalan', fields:[
      {key:'kelas',label:'Kelas'},
      {key:'siswa_id',label:'Siswa ID',type:'siswa-select'},
      {key:'surat',label:'Surah',type:'text'},
      {key:'ayat',label:'Ayat',type:'text'},
      {key:'juz',label:'Juz',type:'number'},
      {key:'nilai',label:'Nilai',type:'text',options:['A','B','C']},
      {key:'catatan',label:'Catatan',type:'textarea'}
    ]},
    'guru:membaca-quran': { title:'Input Membaca Quran', fields:[
      {key:'kelas',label:'Kelas'},
      {key:'siswa_id',label:'Siswa ID',type:'siswa-select'},
      {key:'at_tanzil',label:'At-Tanzil',type:'text'},
      {key:'halaman',label:'Halaman',type:'text'},
      {key:'nilai',label:'Nilai',type:'text',options:['A','B','C']}
    ]},
    'guru:ibadah': { title:'Catatan Ibadah', fields:[
      {key:'kelas',label:'Kelas'},
      {key:'siswa_id',label:'Siswa ID',type:'siswa-select'},
      {key:'tanggal',label:'Bulan',type:'text'},
      {key:'shalat_5waktu',label:'Shalat 5 Waktu',type:'number'},
      {key:'puasa_sunnah',label:'Puasa Sunnah',type:'number'},
      {key:'sedekah',label:'Sedekah',type:'number'},
      {key:'catatan',label:'Catatan',type:'textarea'}
    ]},
    'guru:karakter': { title:'Penilaian Karakter', fields:[
      {key:'kelas',label:'Kelas'},
      {key:'siswa_id',label:'Siswa',type:'siswa-select'},
      {key:'smt',label:'Semester',type:'text',options:['Semester 1','Semester 2']},
      {key:'disiplin',label:'Disiplin',type:'text',options:['A','B','C','D']},
      {key:'sopan',label:'Sopan Santun',type:'text',options:['A','B','C','D']},
      {key:'jujur',label:'Kejujuran',type:'text',options:['A','B','C','D']},
      {key:'kerja',label:'Kerja Sama',type:'text',options:['A','B','C','D']},
      {key:'tjawab',label:'Tanggung Jawab',type:'text',options:['A','B','C','D']},
      {key:'catatan',label:'Catatan',type:'textarea'}
    ]},
    'guru:prestasi': { title:'Input Prestasi', fields:[
      {key:'kelas',label:'Kelas'},
      {key:'siswa_id',label:'Siswa ID',type:'siswa-select'},
      {key:'nama_lomba',label:'Nama Lomba',type:'text'},
      {key:'jenis_prestasi',label:'Jenis',type:'text',options:['Akademik','Non-Akademik','Olahraga','Seni','Keagamaan']},
      {key:'tingkat',label:'Tingkat',type:'text',options:['Sekolah','Kecamatan','Kabupaten','Provinsi','Nasional']},
      {key:'peringkat',label:'Peringkat',type:'text',options:['Juara 1','Juara 2','Juara 3','Harapan','Peserta']},
      {key:'tahun',label:'Tahun',type:'text'},
      {key:'tanggal',label:'Tanggal',type:'date'}
    ]},
    'guru:pelanggaran': { title:'Input Pelanggaran', fields:[
      {key:'kelas',label:'Kelas'},
      {key:'siswa_id',label:'Siswa ID',type:'siswa-select'},
      {key:'tanggal',label:'Tanggal',type:'date'},
      {key:'jenis',label:'Nama Pelanggaran',type:'text',options:['A - Terlambat ke Sekolah','B - Keluar Kelas Tanpa Izin','C - Atribut Tidak Lengkap','D - Tidak Membawa Perlengkapan Belajar','E - Buang Sampah Sembarangan','F - Makan dan Minum Berdiri','G - Makan di Dalam Kelas','H - Berbicara Kotor','I - Perundungan / Membully','J - Bertengkar / Berkelahi']},
      {key:'poin',label:'Poin',type:'number'},
      {key:'status',label:'Status',type:'text',options:['Tercatat','Diproses','Selesai']},
      {key:'tindak_lanjut',label:'Tindak Lanjut',type:'textarea'},
      {key:'catatan_guru',label:'Catatan Guru',type:'textarea'}
    ]},
    'guru:kalender-akademik': { title:'Input Agenda Kalender', fields:[
      {key:'nama',label:'Nama Agenda',type:'text'},
      {key:'tanggal',label:'Tanggal',type:'date'},
      {key:'kategori',label:'Kategori',type:'text',options:['Acara Sekolah','Libur','Ujian','Rapat','Kegiatan','Penilaian']}
    ]},
    'guru:mutabaah-quran': { title:'Setoran Sekolah (Guru)', fields:[
      {key:'kelas',label:'Kelas'},
      {key:'siswa_id',label:'Siswa',type:'siswa-select'},
      {key:'tanggal',label:'Tanggal',type:'date'},
      {key:'ziyadah_sekolah',label:'Ziyadah / Setoran Sekolah',type:'textarea'},
      {key:'status_setoran',label:'Status Setoran',type:'text',options:['Lancar','Cukup','Perlu Diulang','Belum setoran']},
      {key:'catatan_guru',label:'Catatan Guru',type:'textarea'}
    ]},
    'guru:ekstrakurikuler': { title:'Data Ekskul', fields:[
      {key:'nama',label:'Nama Ekskul *',type:'text'},
      {key:'pembina',label:'Pembina *',type:'text'},
      {key:'jadwal',label:'Jadwal *',type:'text'},
      {key:'tempat',label:'Tempat *',type:'text'},
      {key:'status',label:'Status',type:'text',options:['Aktif','Nonaktif']},
      {key:'tanggal',label:'Tanggal Update',type:'date'}
    ]},
    'guru:catatan-siswa': { title:'Catatan Siswa', fields:[
      {key:'siswa_id',label:'Siswa ID',type:'siswa-select'},
      {key:'kelas_id',label:'Kelas',type:'text'},
      {key:'tanggal',label:'Tanggal',type:'date'},
      {key:'kategori',label:'Kategori',type:'text',options:['Akademik','Sikap','Kehadiran','Lainnya']},
      {key:'isi',label:'Isi Catatan',type:'textarea'},
      {key:'tindak_lanjut',label:'Tindak Lanjut',type:'text'},
      {key:'kirim_wali',label:'Kirim ke Wali?',type:'text',options:['Ya','Tidak']}
    ]},
    'guru:pengumuman': { title:'Input Pengumuman', fields:[
      {key:'judul',label:'Judul',type:'text'},
      {key:'kategori',label:'Kategori',type:'text',options:['Akademik','Umum','Mendadak','Libur']},
      {key:'isi',label:'Isi',type:'textarea'},
      {key:'target',label:'Target',type:'text',options:['Semua','Guru','Wali Murid','Kelas']},
      {key:'prioritas',label:'Prioritas',type:'text',options:['Tinggi','Sedang','Rendah']},
      {key:'tanggal_mulai',label:'Tanggal Mulai',type:'date'},
      {key:'tanggal_selesai',label:'Tanggal Selesai',type:'date'}
    ]},
    'wali:mutabaah-rumah': { title:'Mutabaah Rumah', fields:[
      {key:'tanggal',label:'Tanggal',type:'date'},
      {key:'shalat_subuh',label:'Shalat Subuh',type:'text',options:['Ya','Tidak']},
      {key:'shalat_dzuhur',label:'Shalat Dzuhur',type:'text',options:['Ya','Tidak']},
      {key:'shalat_ashar',label:'Shalat Ashar',type:'text',options:['Ya','Tidak']},
      {key:'shalat_maghrib',label:'Shalat Maghrib',type:'text',options:['Ya','Tidak']},
      {key:'shalat_isya',label:'Shalat Isya',type:'text',options:['Ya','Tidak']},
      {key:'belajar',label:'Aktivitas belajar',type:'text'},
      {key:'akhlak',label:'Akhlak',type:'text',options:['Baik','Cukup','Perlu bimbingan']}
    ]},
    'wali:mutabaah-quran': { title:'Mutabaah Quran', fields:[
      {key:'tanggal',label:'Tanggal',type:'date'},
      {key:'tilawah_rumah',label:'Tilawah di rumah (ayat/halaman dibaca)',type:'textarea'},
      {key:'murojaah_rumah',label:'Murojaah di rumah (surah yang diulang)',type:'textarea'}
    ]},
    'wali:surat-wali': { title:'Pengajuan Surat / Izin', fields:[
      {key:'jenis',label:'Jenis',type:'text',options:['Izin','Sakit','Terlambat','Pulang Awal','Lainnya']},
      {key:'tanggal',label:'Tanggal mulai',type:'date'},
      {key:'tgl_selesai',label:'Tanggal selesai (opsional)',type:'date'},
      {key:'perihal',label:'Perihal singkat',type:'text'},
      {key:'isi',label:'Alasan / keterangan',type:'textarea'}
    ]},
        'wali:membaca-quran': { title:'Membaca Quran', fields:[
      {key:'siswa_id',label:'Siswa',type:'siswa-select'},
      {key:'at_tanzil',label:'At-Tanzil',type:'text'},
      {key:'halaman',label:'Halaman',type:'text'},
      {key:'nilai',label:'Nilai',type:'text',options:['A','B','C']},
      {key:'tanggal',label:'Tanggal',type:'date'}
    ]}
  };

  // Peta penyelaras: nama kolom di HP -> nama kolom ASLI tabel web (per tabel).
  const WEB_COLUMN_ALIAS = {
    absensi_siswa: { kelas_id: 'kelas' },
    nilai_siswa: { kelas_id: 'kelas', mapel_id: 'mapel', tulis: 'nilai_tugas', lisan: 'nilai_ujian' },
    jurnal_guru: { guru_id: 'guru', kelas_id: 'kelas', mapel_id: 'mapel' },
    jurnal_kelas: { kelas_id: 'kelas', mapel_id: 'mapel' },
    jurnal_siswa: { kelas_id: 'kelas', isi: 'catatan' },
    hafalan: { ayat_dari: 'ayat', tanggal: 'tgl' },
    ibadah: { shalat_5waktu: 'shalat', puasa_sunnah: 'puasa', tanggal: 'bulan' },
    karakter: { smt: 'semester', kerja: 'kerja_keras', tjawab: 'tanggung_jawab' },
    prestasi: { nama_lomba: 'lomba', jenis_prestasi: 'jenis' },
    membaca_quran: { at_tanzil: 'tanzil', tanggal: 'tgl' },
    pengumuman: { tanggal_mulai: 'tanggal' },
    surat: { kelas_id: 'kelas' },
    pelanggaran_siswa: { jenis: 'pelanggaran', catatan_guru: 'catatan' }
  };
  // Daftar kolom yang BENAR-BENAR ada di tabel web. Kolom lain dibuang agar insert tidak gagal.
  const WEB_ALLOWED_COLS = {
    absensi_siswa: ['siswa_id','kelas','tanggal','status','keterangan'],
    nilai_siswa: ['siswa_id','kelas','mapel','semester','nilai_tugas','nilai_ujian','nilai_akhir','catatan','jenis'],
    jurnal_guru: ['tanggal','guru','guru_nama','kelas','mapel','jam_ke','materi','kegiatan','catatan','metode','tindak_lanjut','status'],
    jurnal_kelas: ['tanggal','kelas','guru_nama','mapel','jam_ke','status','materi'],
    jurnal_siswa: ['tanggal','siswa_id','siswa_nis','siswa_nama','kelas','kategori','catatan','tindak_lanjut','status_visibilitas'],
    hafalan: ['siswa_id','nama_siswa','kelas','surat','juz','ayat','nilai','tgl','at_tanzil','halaman','ayat_ke','catatan'],
    ibadah: ['siswa_id','nama_siswa','kelas','bulan','tahun','shalat','sunnah','puasa','sedekah','catatan'],
    karakter: ['siswa_id','nama_siswa','kelas','semester','disiplin','sopan','jujur','kerja_keras','tanggung_jawab','catatan'],
    prestasi: ['siswa_id','nama_siswa','kelas','lomba','jenis','tingkat','peringkat','tahun','tanggal'],
    surat: ['nomor','perihal','jenis','pihak','tanggal','status','isi','siswa_id','kelas','nisn','nama_wali','hp_wali','tgl_mulai','tgl_selesai'],
    ekskul: ['nama','pembina','jadwal','tempat','peserta','status','tanggal'],
    pengumuman: ['judul','isi','kategori','tanggal','target','penulis','prioritas','tanggal_selesai'],
    membaca_quran: ['siswa_id','nis','nama','nama_siswa','kelas','tanzil','halaman','surat','juz','nilai','tgl','tanggal'],
    ulangan_harian_nilai: ['siswa_id','nama_siswa','kelas','mapel','semester','nilai','nilai_akhir','kkm','jenis','tanggal','catatan'],
    ujian_semester_nilai: ['siswa_id','nama_siswa','kelas','mapel','semester','nilai','nilai_akhir','kkm','jenis','tanggal','catatan'],
    tabungan_siswa: ['client_key','row_uid','siswa_id','nis','siswa_nis','nama_siswa','kelas','kelas_id','tahun_ajaran','semester','tanggal','jenis','nominal','debit','kredit','saldo','keterangan','catatan','petugas','metode','status'],
    pelanggaran_siswa: ['siswa_id','tanggal','kode','pelanggaran','poin','catatan','status','kategori','tindak_lanjut','snapshot_nis','snapshot_nama','snapshot_kelas','kelas'],
    kalender_events: ['hari','bulan','tahun','nama','kategori'],
    mutabaah_quran: ['siswa_id','nis','nama_siswa','kelas','tanggal','tahun_ajaran','tilawah_rumah','murojaah_rumah','catatan_wali','konfirmasi_wali','nama_wali','wali_username','waktu_submit_wali','status_review','ziyadah_sekolah','status_setoran','catatan_guru'],
    mutabaah_rumah: ['siswa_id','nis','nama_siswa','kelas','tanggal','shalat_subuh','shalat_dzuhur','shalat_ashar','shalat_maghrib','shalat_isya','shalat_count','tilawah_rumah','murojaah_rumah','belajar','akhlak','catatan_akhlak','kendala','catatan_wali','konfirmasi_wali','nama_wali','wali_username','waktu_submit','status_review']
  };

  function moduleTable(moduleKey){ return MODULE_TARGET_TABLE[moduleKey] || null; }

  function makeSpecificPayload(moduleKey, payload){
    payload = payload || {};
    const now = new Date().toISOString();
    const text = clean(payload.text || payload.title || payload.catatan || payload.keterangan || payload.isi || 'Data mobile');
    const role = clean(payload.role || '').toLowerCase();
    const base = { updated_at: now, client_key: 'default' };
    const table = moduleTable(moduleKey);

    if(payload.fields && typeof payload.fields === 'object'){
      const schema = MODULE_FORM_SCHEMA[moduleKey];
      const typeByKey = {};
      if(schema && Array.isArray(schema.fields)){
        schema.fields.forEach(function(fd){ typeByKey[fd.key] = fd.type; });
      }
      // 1) Ambil nilai mentah dari form (dengan koersi tipe number)
      const raw = {};
      Object.keys(payload.fields).forEach(function(k){
        let v = payload.fields[k];
        if(v === null || v === undefined) return;
        if(typeof v === 'string') v = v.trim();
        if(v === '') return; // buang field kosong agar tidak melanggar tipe/NOT NULL di tabel asli
        if(typeByKey[k] === 'number'){
          const n = Number(v);
          if(isNaN(n)) return;
          v = n;
        }
        raw[k] = v;
      });
      // 2) Ganti nama kolom HP -> nama kolom asli tabel web
      const alias = WEB_COLUMN_ALIAS[table] || {};
      const mapped = {};
      Object.keys(raw).forEach(function(k){
        const col = alias[k] || k;
        if(mapped[col] === undefined) mapped[col] = raw[k];
      });
      // 3) Lengkapi data siswa (nama_siswa, kelas, nis) dari pilihan siswa
      const sw = payload.__siswa || {};
      const fillers = { siswa_id: sw.id, id_siswa: sw.id, nama_siswa: sw.nama, nama: sw.nama, siswa_nama: sw.nama, kelas: sw.kelas, nis: sw.nis, siswa_nis: sw.nis, snapshot_nama: sw.nama, snapshot_kelas: sw.kelas, snapshot_nis: sw.nis };
      Object.keys(fillers).forEach(function(col){
        if(fillers[col] && (mapped[col] === undefined || mapped[col] === '')) mapped[col] = fillers[col];
      });
      // 3b) Kalender: pecah tanggal -> hari/bulan/tahun (kolom terpisah di tabel web)
      if(table === 'kalender_events'){
        const dStr = mapped.tanggal || mapped.tgl || '';
        if(dStr){
          const dt = new Date(dStr);
          if(!isNaN(dt.getTime())){
            mapped.hari = dt.getDate();
            mapped.bulan = dt.getMonth() + 1;
            mapped.tahun = dt.getFullYear();
          }
        }
        delete mapped.tanggal; delete mapped.tgl;
      }
      // 3c) nilai_siswa: web mengisi nilai_akhir = rata-rata tugas+ujian lewat patch db-nya.
      //     HP pakai klien Supabase sendiri (tanpa patch itu), jadi hitung sendiri agar nilai tampil di web & lolos NOT NULL.
      if(table === 'nilai_siswa' && (mapped.nilai_akhir === undefined || mapped.nilai_akhir === null || mapped.nilai_akhir === '')){
        if(mapped.nilai_tugas !== undefined || mapped.nilai_ujian !== undefined){
          mapped.nilai_akhir = Math.round((Number(mapped.nilai_tugas || 0) + Number(mapped.nilai_ujian || 0)) / 2);
        }
      }
      // 3d) Catatan siswa (jurnal_siswa): "Kirim ke Wali = Ya" -> status_visibilitas 'terkirim_wali' (sama seperti web).
      if(table === 'jurnal_siswa'){
        const kw = String(mapped.kirim_wali || '').toLowerCase();
        delete mapped.kirim_wali;
        if(kw === 'ya') mapped.status_visibilitas = 'terkirim_wali';
      }
      // 3f) Mutabaah Rumah: konversi Ya/Tidak -> boolean, hitung shalat_count, status_review, nama_wali
      if(table === 'mutabaah_rumah'){
        const sess = (payload.__session) || {};
        ['subuh','dzuhur','ashar','maghrib','isya'].forEach(function(k){
          const col = 'shalat_'+k;
          if(mapped[col] !== undefined){
            const v = String(mapped[col]).toLowerCase();
            mapped[col] = (v === 'ya' || v === 'true' || v === '1');
          }
        });
        let cnt = 0;
        ['subuh','dzuhur','ashar','maghrib','isya'].forEach(function(k){ if(mapped['shalat_'+k] === true) cnt++; });
        if(mapped.shalat_count === undefined) mapped.shalat_count = cnt;
        if(!mapped.tanggal) mapped.tanggal = now.slice(0,10);
        if(!mapped.nama_wali && sess.nama) mapped.nama_wali = sess.nama;
        if(!mapped.wali_username && sess.username) mapped.wali_username = sess.username;
        if(mapped.konfirmasi_wali === undefined) mapped.konfirmasi_wali = true;
        if(!mapped.status_review) mapped.status_review = (mapped.kendala && String(mapped.kendala).trim()) ? 'Perlu Tindak Lanjut' : 'Sudah Diisi';
        if(!mapped.waktu_submit) mapped.waktu_submit = now;
      }
      // 3g) Mutabaah Quran: status_review, konfirmasi_wali, nama_wali, tahun_ajaran, waktu_submit_wali
      if(table === 'mutabaah_quran'){
        const sess = (payload.__session) || {};
        if(!mapped.tanggal) mapped.tanggal = now.slice(0,10);
        if(!mapped.nama_wali && sess.nama) mapped.nama_wali = sess.nama;
        if(!mapped.wali_username && sess.username) mapped.wali_username = sess.username;
        if(mapped.konfirmasi_wali === undefined) mapped.konfirmasi_wali = true;
        if(!mapped.tahun_ajaran){
          const dt = new Date(mapped.tanggal);
          const y = dt.getFullYear(), m = dt.getMonth();
          mapped.tahun_ajaran = (m >= 6) ? (y + '/' + (y+1)) : ((y-1) + '/' + y);
        }
        if(!mapped.status_review) mapped.status_review = (mapped.catatan_wali && String(mapped.catatan_wali).trim()) ? 'Ada Catatan' : 'Sudah Diisi Wali';
        if(!mapped.waktu_submit_wali) mapped.waktu_submit_wali = now;
      }
            // 3e) Surat (wali izin): isi pihak/status/wali/anak dari context bila kosong.
      if(table === 'surat'){
        const sess = (payload.__session) || {};
        if(!mapped.siswa_id && sw.id) mapped.siswa_id = sw.id;
        if(!mapped.pihak) mapped.pihak = (String(payload.role||'').toLowerCase() === 'wali') ? 'Wali Murid' : 'Sekolah';
        if(!mapped.status) mapped.status = 'Diajukan';
        if(!mapped.nama_wali && sess.nama) mapped.nama_wali = sess.nama;
        if(!mapped.hp_wali && (sess.no_hp || sess.hp)) mapped.hp_wali = sess.no_hp || sess.hp;
        if(!mapped.nisn && sw.nis) mapped.nisn = sw.nis;
        if(!mapped.kelas && sw.kelas) mapped.kelas = sw.kelas;
        // tgl_mulai alias dari tanggal jika ada
        if(!mapped.tgl_mulai && mapped.tanggal) mapped.tgl_mulai = mapped.tanggal;
      }
      // 3h) Pelanggaran: turunkan kode & poin dari nama pelanggaran (10 kategori web admin)
      if(table === 'pelanggaran_siswa'){
        var PEL_KAT = [
          {kode:'A',nama:'A - Terlambat ke Sekolah',poin:5},
          {kode:'B',nama:'B - Keluar Kelas Tanpa Izin',poin:5},
          {kode:'C',nama:'C - Atribut Tidak Lengkap',poin:5},
          {kode:'D',nama:'D - Tidak Membawa Perlengkapan Belajar',poin:5},
          {kode:'E',nama:'E - Buang Sampah Sembarangan',poin:5},
          {kode:'F',nama:'F - Makan dan Minum Berdiri',poin:5},
          {kode:'G',nama:'G - Makan di Dalam Kelas',poin:5},
          {kode:'H',nama:'H - Berbicara Kotor',poin:10},
          {kode:'I',nama:'I - Perundungan / Membully',poin:10},
          {kode:'J',nama:'J - Bertengkar / Berkelahi',poin:10}
        ];
        // Cocokkan berdasarkan nama lengkap ATAU kode huruf saja (A/B/C...)
        var _pnm = String(mapped.jenis || mapped.pelanggaran || '').trim().toLowerCase();
        var _pk = PEL_KAT.filter(function(k){
          return k.nama.toLowerCase() === _pnm || k.kode.toLowerCase() === _pnm;
        })[0];
        if(_pk){
          if(!mapped.kode) mapped.kode = _pk.kode;
          if(mapped.poin === undefined || mapped.poin === null || mapped.poin === '') mapped.poin = _pk.poin;
          if(!mapped.kategori) mapped.kategori = (_pk.poin >= 10 ? 'Berat' : 'Ringan');
        }
        if(!mapped.tanggal) mapped.tanggal = now.slice(0,10);
        if(!mapped.status) mapped.status = 'Tercatat';
      }
            // 4) Hanya kirim kolom yang memang ada di tabel web (jika daftarnya diketahui)
      const allowed = WEB_ALLOWED_COLS[table];
      const out = { updated_at: now, client_key: 'default' };
      Object.keys(mapped).forEach(function(col){
        if(!allowed || allowed.indexOf(col) !== -1) out[col] = mapped[col];
      });
      return out;
    }

    if(table === 'pengumuman') return Object.assign(base, { judul: text.slice(0, 120), isi: text, kategori: role || 'mobile', status: 'Aktif' });
    if(table === 'jurnal_guru') return Object.assign(base, { tanggal: now.slice(0,10), kegiatan: text, materi: text, status: payload.status || 'Draft' });
    if(table === 'catatan_siswa') return Object.assign(base, { tanggal: now.slice(0,10), isi: text, catatan: text, kategori: role || 'mobile' });
    if(table === 'surat') return Object.assign(base, { tanggal: now.slice(0,10), jenis: role === 'wali' ? 'Izin Wali' : 'Catatan Guru', perihal: text.slice(0,120), isi: text, keterangan: text, pihak: role === 'wali' ? 'Wali Murid' : 'Sekolah', status: payload.status || 'Diajukan' });
    if(table === 'hafalan') return Object.assign(base, { tanggal: now.slice(0,10), catatan: text, keterangan: text, status: payload.status || 'Aktif' });
    if(table === 'membaca_quran') return Object.assign(base, { tanggal: now.slice(0,10), at_tanzil: '', halaman: 0, surat: '', juz: 1, nilai: payload.nilai || 'B', status: payload.status || 'Aktif' });
    if(table === 'ibadah') return Object.assign(base, { tanggal: now.slice(0,10), catatan: text, keterangan: text, status: payload.status || 'Aktif' });
    if(table === 'nilai_siswa') return Object.assign(base, { tanggal: now.slice(0,10), keterangan: text, catatan: text });
    if(table === 'absensi_siswa') return Object.assign(base, { tanggal: now.slice(0,10), status: payload.status || 'Hadir', keterangan: text });
    if(table === 'keuangan') return Object.assign(base, { tanggal: now.slice(0,10), keterangan: text, status: payload.status || 'Aktif' });
    if(table === 'tabungan_siswa') return Object.assign(base, { tanggal: now.slice(0,10), keterangan: text, catatan: text });
    return base;
  }

  // Tabel yang harus MERGE ke baris yang cocok (mis. wali sudah mengisi) alih-alih membuat baris baru.
  // Mutaba'ah Qur'an: wali mengisi tilawah/murojaah, guru mengisi ziyadah/setoran pada baris siswa+tanggal yang sama.
  const UPSERT_MATCH_COLS = {
    mutabaah_quran: ['siswa_id', 'tanggal'],
    mutabaah_rumah: ['siswa_id', 'tanggal']
  };

  async function createSpecificOrFallback(moduleKey, payload){
    const table = moduleTable(moduleKey);
    let lastError = null;
    if(table) {
      try {
        const body = makeSpecificPayload(moduleKey, payload);
        // Jika tabel ini perlu merge (gabung dengan isian wali), cari baris yang cocok dulu.
        const matchCols = UPSERT_MATCH_COLS[table];
        if(matchCols && matchCols.every(function(c){ return body[c] !== undefined && body[c] !== null && body[c] !== ''; })){
          let q = getClient().from(table).select('*');
          matchCols.forEach(function(c){ q = q.eq(c, body[c]); });
          const existing = await q.limit(1);
          if(existing && !existing.error && Array.isArray(existing.data) && existing.data.length){
            const upd = await getClient().from(table).update(body).eq('id', existing.data[0].id).select('*').single();
            if(!upd.error && upd.data) return { table, row: upd.data, fallback: false };
            lastError = (upd.error && upd.error.message) ? upd.error.message : lastError;
            console.warn('[MobileCRUD] merge update gagal, coba insert:', table, upd.error && upd.error.message);
          } else if(existing && existing.error){
            lastError = existing.error.message || lastError;
          }
        }
        const res = await getClient().from(table).insert(body).select('*').single();
        if(!res.error && res.data) return { table, row: res.data, fallback: false };
        lastError = (res.error && res.error.message) ? res.error.message : lastError;
        console.warn('[MobileCRUD] specific insert gagal, fallback:', table, res.error && res.error.message);
      } catch(error) {
        lastError = (error && error.message) ? error.message : String(error);
        console.warn('[MobileCRUD] specific insert exception, fallback:', table, lastError);
      }
    } else {
      lastError = 'Modul "' + moduleKey + '" tidak terhubung ke tabel Supabase.';
    }
    console.warn('[MobileCRUD] data tidak disimpan:', moduleKey, lastError);
    return { table: null, row: null, fallback: true, error: lastError };
  }

  async function loadAppModuleRows(moduleKey){
    // app_module_data tidak dipakai
    return [];
  }

  async function createAppModuleRow(moduleKey, payload){
    // app_module_data tidak dipakai
    return null;
  }

  async function updateAppModuleRow(id, payload){
    // app_module_data tidak dipakai
    return null;
  }

  async function deleteAppModuleRow(id){
    // app_module_data tidak dipakai
    return true;
  }

  function appRowsToItems(rows){
    return (Array.isArray(rows) ? rows : []).map((row) => {
      const payload = row.payload || {};
      return Object.assign({}, row, {
        __mobileCrud: true,
        title: payload.title || payload.text || payload.catatan || 'Data mobile',
        meta: payload.meta || payload.keterangan || 'Disimpan dari aplikasi mobile',
        status: payload.status || 'Mobile',
        tone: payload.tone || 'green'
      });
    });
  }

  async function loadGuruModuleData(context){
    const session = (context && context.session) || readSession() || {};
    const guru = (context && context.guru) || {};
    // Ambil semua kelas dari wali_kelas + seluruh kelas_diajar (bukan cuma index[0])
    const _kelasDiajar = Array.isArray(guru.kelas_diajar)
      ? guru.kelas_diajar
      : String(guru.kelas_diajar || '').split(/[,;|]/).map(function(s){ return s.trim(); }).filter(Boolean);
    const kelas = clean(guru.wali_kelas || _kelasDiajar[0] || '');
    const _kelasDiajarAll = _kelasDiajar.slice();
    if (guru.wali_kelas && _kelasDiajarAll.indexOf(clean(guru.wali_kelas)) < 0) _kelasDiajarAll.unshift(clean(guru.wali_kelas));
    const nip = clean(guru.nip || session.guru_nip || '');
    const commonGuruFilters = [
      nip ? { guru_nip: nip } : null,
      session.id ? { guru_id: session.id } : null,
      guru.nama ? { guru: guru.nama } : null,
      guru.nama ? { guru_nama: guru.nama } : null
    ].filter(Boolean);
    const classFilters = [kelas ? { kelas } : null].filter(Boolean);
    // Build allKelasFilters: semua kelas yang diajar guru (wali + guru mapel)
    const _mengajarRows = (context && context.mengajar) ? context.mengajar : [];
    const _allKelasArr = [];
    // PRIORITAS 1: kelasList yang sudah dihitung di hydrateGuruFromSupabase (paling lengkap)
    var _ctxKelasArr = Array.isArray(context && context.kelasList) ? context.kelasList : [];
    for (var _cki = 0; _cki < _ctxKelasArr.length; _cki++) {
      var _ck = clean(_ctxKelasArr[_cki]);
      if (_ck && _allKelasArr.indexOf(_ck) < 0) _allKelasArr.push(_ck);
    }
    // PRIORITAS 2: dari kolom kelas_diajar di tabel guru
    for (var _kdi = 0; _kdi < _kelasDiajarAll.length; _kdi++) {
      var _kd = _kelasDiajarAll[_kdi];
      if (_kd && _allKelasArr.indexOf(_kd) < 0) _allKelasArr.push(_kd);
    }
    // PRIORITAS 3: dari tabel guru_mengajar
    for (var _ki = 0; _ki < _mengajarRows.length; _ki++) {
      var _mk = clean(_mengajarRows[_ki].kelas || '');
      if (_mk && _allKelasArr.indexOf(_mk) < 0) _allKelasArr.push(_mk);
    }
    // FALLBACK: minimal 1 kelas dari var kelas
    if (_allKelasArr.length === 0 && kelas) _allKelasArr.push(kelas);
    const allKelasFilters = _allKelasArr.length
      ? _allKelasArr.reduce(function(a, k){ return a.concat([{ kelas: k }]); }, [])
      : classFilters;
    // Filter khusus pelanggaran_siswa — pakai snapshot_kelas karena kolom kelas mungkin belum ada
    const pelanggaranFilters = _allKelasArr.length
      ? _allKelasArr.reduce(function(a, k){ return a.concat([{ kelas: k }, { snapshot_kelas: k }]); }, [])
      : classFilters;
    const appPrefix = 'guru:';
    const mobile = {
      absensi: appRowsToItems(await loadAppModuleRows(appPrefix + 'absensi-siswa')),
      nilai: appRowsToItems(await loadAppModuleRows(appPrefix + 'nilai')),
      jurnal: appRowsToItems(await loadAppModuleRows(appPrefix + 'jurnal-guru')),
      catatan: appRowsToItems(await loadAppModuleRows(appPrefix + 'catatan-siswa')),
      hafalan: appRowsToItems(await loadAppModuleRows(appPrefix + 'hafalan')),
      membaca_quran: appRowsToItems(await loadAppModuleRows(appPrefix + 'membaca-quran')),
      ibadah: appRowsToItems(await loadAppModuleRows(appPrefix + 'ibadah')),
      surat: appRowsToItems(await loadAppModuleRows(appPrefix + 'surat-izin')),
      pengumuman: appRowsToItems(await loadAppModuleRows(appPrefix + 'pengumuman')),
      keuangan: appRowsToItems(await loadAppModuleRows(appPrefix + 'keuangan')),
      tabungan: appRowsToItems(await loadAppModuleRows(appPrefix + 'tabungan')),
      karakter: appRowsToItems(await loadAppModuleRows(appPrefix + 'karakter')),
      prestasi: appRowsToItems(await loadAppModuleRows(appPrefix + 'prestasi')),
      ekskul: appRowsToItems(await loadAppModuleRows(appPrefix + 'ekstrakurikuler')),
      pelanggaran: appRowsToItems(await loadAppModuleRows(appPrefix + 'pelanggaran')),
      kalender: appRowsToItems(await loadAppModuleRows(appPrefix + 'kalender-akademik')),
      mutabaahRumah: appRowsToItems(await loadAppModuleRows(appPrefix + 'mutabaah-rumah')),
      mutabaahQuran: appRowsToItems(await loadAppModuleRows(appPrefix + 'mutabaah-quran'))
    };
    return {
      presensiGuru: nip ? await tryFilteredList('absensi_guru', [{ nip }], 90, { strict: true }) : [],
      absensi: mobile.absensi.concat(await tryFilteredList('absensi_siswa', allKelasFilters, 120, { noFallback: true })),
      nilai: mobile.nilai
        .concat((await tryFilteredList('nilai_siswa', allKelasFilters, 120, { noFallback: true })).map(function(r){ return Object.assign({}, r, {__tipe:'nilai'}); }))
        .concat((await tryFilteredList('ulangan_harian_nilai', allKelasFilters, 120, { noFallback: true })).map(function(r){ return Object.assign({}, r, {__tipe:'ulangan-harian'}); }))
        .concat((await tryFilteredList('ujian_semester_nilai', allKelasFilters, 120, { noFallback: true })).map(function(r){ return Object.assign({}, r, {__tipe:'ujian-semester'}); })),
      jurnal: mobile.jurnal.concat(await tryFilteredList('jurnal_guru', commonGuruFilters, 50, { noFallback: true })),
      catatan: mobile.catatan.concat(await tryFilteredList('jurnal_siswa', allKelasFilters, 80, { noFallback: true })),
      hafalan: mobile.hafalan.concat(await tryFilteredList('hafalan', allKelasFilters, 80, { noFallback: true })),
      membaca_quran: mobile.membaca_quran.concat(await tryFilteredList('membaca_quran', allKelasFilters, 80, { noFallback: true })),
      ibadah: mobile.ibadah.concat(await tryFilteredList('ibadah', allKelasFilters, 80, { noFallback: true })),
      surat: mobile.surat.concat(await tryFilteredList('surat', allKelasFilters, 80, { noFallback: true })),
      pengumuman: mobile.pengumuman.concat(await safeList('pengumuman', { order: 'created_at', ascending: false, limit: 30 })),
      keuangan: mobile.keuangan.concat(await safeList('keuangan', { order: 'tanggal', ascending: false, limit: 80 })),
      tabungan: mobile.tabungan.concat(await tryFilteredList('tabungan_siswa', allKelasFilters, 80, { noFallback: true })),
      karakter: mobile.karakter.concat(await tryFilteredList('karakter', allKelasFilters, 80, { noFallback: true })),
      prestasi: mobile.prestasi.concat(await tryFilteredList('prestasi', allKelasFilters, 80, { noFallback: true })),
      ekskul: mobile.ekskul.concat(await safeList('ekskul', { limit: 50 })),
      pelanggaran: mobile.pelanggaran.concat(await tryFilteredList('pelanggaran_siswa', pelanggaranFilters, 80, { noFallback: true })),
      kalender: mobile.kalender.concat(await safeList('kalender_events', { order: 'tahun', ascending: false, limit: 80 })),
      mutabaahRumah: mobile.mutabaahRumah.concat(await tryFilteredList('mutabaah_rumah', allKelasFilters, 80, { noFallback: true })),
      mutabaahQuran: mobile.mutabaahQuran.concat(await tryFilteredList('mutabaah_quran', allKelasFilters, 80, { noFallback: true }))
    };
  }

  async function loadWaliModuleData(context){
    const session = (context && context.session) || readSession() || {};
    const siswa = (context && context.siswa) || {};
    const nis = clean(siswa.nis || session.nis_siswa || '');
    const siswaId = clean(siswa.id || session.siswa_id || '');
    const kelas = clean(siswa.kelas || session.kelas_siswa || '');
    const namaSiswa = clean(siswa.nama || session.nama_siswa || '');
    // STRICT: hanya filter by identitas anak (siswa_id/nis), JANGAN by kelas sendiri
    // (kelas akan menarik semua anak sekelas). Untuk tabel non-personal (pengumuman/kalender)
    // tidak pakai filter.
    const filters = [
      siswaId ? { siswa_id: siswaId } : null,
      siswaId ? { id_siswa: siswaId } : null,
      // FIX: beberapa tabel (karakter, hafalan, ibadah, prestasi, pelanggaran_siswa) tidak
      // punya kolom nis/siswa_nis sendiri - form guru menyimpan NIS siswa langsung ke
      // kolom siswa_id. Tanpa baris ini, data yang tersimpan sukses di Supabase tidak
      // pernah cocok saat wali membaca (siswa_id di baris = NIS, bukan id internal siswa).
      nis ? { siswa_id: nis } : null,
      nis ? { nis } : null,
      nis ? { siswa_nis: nis } : null,
      nis ? { snapshot_nis: nis } : null
    ].filter(Boolean);
    const nilaiFilters = filters.concat(
      (namaSiswa && kelas) ? [{ nama_siswa: namaSiswa, kelas: kelas }] : []
    );
    function belongsToChild(r){
      if(!r) return false;
      if(siswaId && (String(r.siswa_id||'') === String(siswaId) || String(r.id_siswa||'') === String(siswaId))) return true;
      // FIX: siswa_id pada beberapa tabel sebenarnya berisi NIS (lihat catatan di atas filters).
      if(nis && String(r.siswa_id||'') === String(nis)) return true;
      if(nis && (String(r.nis||'') === String(nis) || String(r.nis_siswa||'') === String(nis) || String(r.siswa_nis||'') === String(nis) || String(r.snapshot_nis||'') === String(nis))) return true;
      if(namaSiswa && kelas && String(r.nama_siswa||r.nama||'').toLowerCase()===namaSiswa.toLowerCase() && String(r.kelas||'').toLowerCase()===kelas.toLowerCase()) return true;
      // Baris tanpa identitas siswa: hanya tampilkan jika itu entri yang dibuat sendiri
      // lewat app (mobile CRUD). Baris tabel web tanpa identitas (mis. dana BOS /
      // keuangan sekolah) JANGAN dianggap milik anak ini -> cegah kebocoran ke semua wali.
      if(!r.siswa_id && !r.id_siswa && !r.nis && !r.nis_siswa && !r.snapshot_nis) return r.__mobileCrud === true;
      return false;
    }
    const appPrefix = 'wali:';
    const mobile = {
      absensi: appRowsToItems(await loadAppModuleRows(appPrefix + 'absensi-anak')),
      nilai: appRowsToItems(await loadAppModuleRows(appPrefix + 'nilai-anak')),
      catatan: appRowsToItems(await loadAppModuleRows(appPrefix + 'catatan-anak')),
      hafalan: [], // hafalan = input admin (tabel 'hafalan'); tidak ada modul app wali
      ibadah: [],  // ibadah = input admin (tabel 'ibadah'); tidak ada modul app wali
      mutabaahQuran: appRowsToItems(await loadAppModuleRows(appPrefix + 'mutabaah-quran')),
      mutabaahRumah: appRowsToItems(await loadAppModuleRows(appPrefix + 'mutabaah-rumah')),
      membaca_quran: appRowsToItems(await loadAppModuleRows(appPrefix + 'membaca-quran')),
      surat: appRowsToItems(await loadAppModuleRows(appPrefix + 'surat-wali')),
      keuangan: appRowsToItems(await loadAppModuleRows(appPrefix + 'keuangan')),
      tabungan: appRowsToItems(await loadAppModuleRows(appPrefix + 'tabungan')),
      pengumuman: appRowsToItems(await loadAppModuleRows(appPrefix + 'pengumuman-wali'))
    };
    const strict = { strict: true };
    const filterMine = function(arr){ return (arr||[]).filter(belongsToChild); };
    return {
      absensi: filterMine(mobile.absensi.concat(await tryFilteredList('absensi_siswa', filters, 80, strict))),
      nilai: filterMine(mobile.nilai
        .concat(await tryFilteredList('nilai_siswa', nilaiFilters, 80, strict))
        .concat(await tryFilteredList('ulangan_harian_nilai', nilaiFilters, 80, strict))
        .concat(await tryFilteredList('ujian_semester_nilai', nilaiFilters, 80, strict))),
      catatan: filterMine(mobile.catatan.concat(await tryFilteredList('jurnal_siswa', filters, 50, strict))),
      hafalan: filterMine(mobile.hafalan.concat(await tryFilteredList('hafalan', filters, 50, strict))),
      ibadah: filterMine(mobile.ibadah.concat(await tryFilteredList('ibadah', filters, 50, strict))),
      membaca_quran: filterMine(mobile.membaca_quran.concat(await tryFilteredList('membaca_quran', filters, 50, strict))),
      mutabaahRumah: filterMine((mobile.mutabaahRumah||[]).concat(await tryFilteredList('mutabaah_rumah', filters, 50, strict))),
      mutabaahQuran: filterMine((mobile.mutabaahQuran||[]).concat(await tryFilteredList('mutabaah_quran', filters, 50, strict))),
      karakter: filterMine(await tryFilteredList('karakter', filters, 50, strict)),
      prestasi: filterMine(await tryFilteredList('prestasi', filters, 50, strict)),
      pelanggaran: filterMine(await tryFilteredList('pelanggaran_siswa', filters, 50, strict)),
      surat: filterMine(mobile.surat.concat(await tryFilteredList('surat', filters, 50, strict))),
      keuangan: filterMine(mobile.keuangan.concat((await tryFilteredList('spp_pembayaran', filters, 30, strict)).concat(await tryFilteredList('tagihan_spp', filters, 30, strict)).concat(await tryFilteredList('keuangan', filters, 30, strict)))),
      tabungan: filterMine(mobile.tabungan.concat(await tryFilteredList('tabungan_siswa', filters, 30, strict))),
      tabunganUmum: filterMine(await tryFilteredList('tabungan_umum', filters, 30, strict)),
      ekskul: await safeList('ekskul', { limit: 50 }),
      pengumuman: mobile.pengumuman.concat(await safeList('pengumuman', { order: 'created_at', ascending: false, limit: 30 }))
    };
  }

  // Tulis langsung ke tabel web (dipakai mis. absensi guru yang bukan modul CRUD generik).
  async function upsert(table, body, onConflict){
    try {
      const client = getClient();
      // Merge manual: tidak bergantung pada unique index di DB (yang sering belum dibuat).
      if(onConflict){
        const cols = String(onConflict).split(',').map(function(c){ return c.trim(); }).filter(Boolean);
        const punyaSemua = cols.length && cols.every(function(c){ return body[c] !== undefined && body[c] !== null && body[c] !== ''; });
        if(punyaSemua){
          let q = client.from(table).select('*');
          cols.forEach(function(c){ q = q.eq(c, body[c]); });
          const existing = await q.limit(1);
          if(existing && !existing.error && Array.isArray(existing.data) && existing.data.length){
            return await client.from(table).update(body).eq('id', existing.data[0].id).select();
          }
          return await client.from(table).insert(body).select();
        }
      }
      return await client.from(table).upsert(body, onConflict ? { onConflict: onConflict } : undefined).select();
    } catch(error){
      return { error: error };
    }
  }
  async function insert(table, body){
    try {
      const client = getClient();
      const res = await client.from(table).insert(body).select();
      return res;
    } catch(error){
      return { error: error };
    }
  }

  /* ---------- Device token untuk push notification ---------- */
  async function saveDeviceToken(token, role, userId) {
    try {
      const client = getClient();
      var user = userId || '';
      // Baca session dari siakad_session_user (yg dipakai semua shell)
      try {
        var s = localStorage.getItem('siakad_session_user') || sessionStorage.getItem('siakad_session_user');
        if (s) { var p = JSON.parse(s); if (!user) user = p.id || p.username || ''; if (!role) role = p.role || ''; }
      } catch(e){}
      if (!role) { role = 'wali'; }
      
      // Cek apakah token sudah ada
      var existing = await client.from('device_tokens').select('id').eq('token', token).maybeSingle();
      if (existing && existing.data) {
        // Update existing
        await client.from('device_tokens').update({
          user_id: user,
          role: role,
          platform: 'android',
          app_version: '1.0.0',
          updated_at: new Date().toISOString()
        }).eq('id', existing.data.id);
      } else {
        // Insert new
        await client.from('device_tokens').insert({
          token: token,
          user_id: user,
          role: role,
          platform: 'android',
          app_version: '1.0.0'
        });
      }
    } catch(e) {
      console.warn('saveDeviceToken error:', e);
    }
  }

  // Upload PDF ke Supabase Storage
  async function uploadPdfFile(file, folder){
    const client = getClient();
    const ext = file.name.split('.').pop().toLowerCase();
    const fileName = (folder || 'jurnal-guru') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2,8) + '.' + ext;
    const { data, error } = await client.storage.from('jurnal-pdf').upload(fileName, file, {
      contentType: 'application/pdf',
      cacheControl: '3600'
    });
    if(error) throw error;
    const { publicUrl } = client.storage.from('jurnal-pdf').getPublicUrl(fileName).data;
    return { path: fileName, url: publicUrl, name: file.name, size: file.size };
  }

  // ===== R2 storage helper (chat lampiran) — mirror admin db.storage =====
  var R2_PUBLIC_BASE = 'https://cdn.zymata.my.id';
  var R2_FN_URL = SUPABASE_URL + '/functions/v1/r2-upload-url';
  function _maybeCompress(file) {
    return new Promise(function (resolve) {
      try {
        if (!file || !/^image\//.test(file.type) || /gif/i.test(file.type)) { resolve(file); return; }
        var img = new Image();
        var url = URL.createObjectURL(file);
        img.onload = function () {
          try {
            var max = 1280, w = img.width, h = img.height;
            if (w > max || h > max) { if (w > h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } }
            var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
            cv.getContext('2d').drawImage(img, 0, 0, w, h);
            cv.toBlob(function (blob) {
              try { URL.revokeObjectURL(url); } catch (e) {}
              if (blob && blob.size < file.size) {
                resolve(new File([blob], String(file.name || 'foto').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
              } else { resolve(file); }
            }, 'image/jpeg', 0.8);
          } catch (e) { try { URL.revokeObjectURL(url); } catch (_e) {} resolve(file); }
        };
        img.onerror = function () { try { URL.revokeObjectURL(url); } catch (e) {} resolve(file); };
        img.src = url;
      } catch (e) { resolve(file); }
    });
  }
  var OCI_PUBLIC_BASE = 'https://objectstorage.ap-batam-1.oraclecloud.com/n/ax9lkjvyjv7k/b/zymata/o';
  var OCI_FN_URL = SUPABASE_URL + '/functions/v1/oracle-upload-url';
  // Upload KHUSUS fitur chat -> Oracle Cloud (lewat Edge Function oracle-upload-url)
  async function _uploadOracleMobile(bucket, path, file) {
    try {
      var f = await _maybeCompress(file);
      var key = bucket + '/' + path;
      var fd = new FormData();
      fd.append('file', f); fd.append('key', key); fd.append('bucket', bucket); fd.append('path', path);
      var res = await fetch(OCI_FN_URL, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }, body: fd });
      var json = await res.json().catch(function () { return {}; });
      if (!res.ok || json.error) { return { data: null, error: (json && json.error) || ('Upload Oracle gagal (' + res.status + ')') }; }
      var url = (json && json.url) || (OCI_PUBLIC_BASE + '/' + encodeURIComponent(key));
      return { data: { key: key, path: path, url: url, provider: 'oracle' }, error: null };
    } catch (e) { return { data: null, error: e && e.message ? e.message : String(e) }; }
  }
  var storage = {
    R2_PUBLIC_BASE: R2_PUBLIC_BASE,
    FN_URL: R2_FN_URL,
    publicUrl: function (bucket, path) { if (bucket === 'chat') { return OCI_PUBLIC_BASE + '/' + encodeURIComponent('chat/' + path); } return R2_PUBLIC_BASE + '/' + encodeURI(bucket + '/' + path); },
    upload: async function (bucket, path, file) {
      if (bucket === 'chat') { return await _uploadOracleMobile(bucket, path, file); }
      try {
        var f = await _maybeCompress(file);
        var key = bucket + '/' + path;
        var fd = new FormData();
        fd.append('file', f); fd.append('key', key); fd.append('bucket', bucket); fd.append('path', path);
        var res = await fetch(R2_FN_URL, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }, body: fd });
        var json = await res.json().catch(function () { return {}; });
        if (!res.ok) { return { data: null, error: (json && json.error) || ('Upload gagal (' + res.status + ')') }; }
        var url = (json && (json.url || json.publicUrl)) || (R2_PUBLIC_BASE + '/' + encodeURI(key));
        return { data: { key: key, path: path, url: url, provider: 'r2' }, error: null };
      } catch (e) { return { data: null, error: e && e.message ? e.message : String(e) }; }
    }
  };

  window.ZymataMobileSupabase = {
    getClient, select, first, safeList, tryFilteredList, normalizeItem, upsert, insert,
    moduleTable, createSpecificOrFallback,
    loadAppModuleRows, createAppModuleRow, updateAppModuleRow, deleteAppModuleRow,
    signIn, signOut, readSession, saveSession, clearSession,
    routeForRole, roleKey, loadGuruContext, loadWaliContext, loadGuruModuleData, loadWaliModuleData,
    MODULE_FORM_SCHEMA, saveDeviceToken,
    uploadPdfFile, storage,
    getActiveChildId, setActiveChildId, loadWaliChildren
  };
})();
