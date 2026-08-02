/* =========================================================================
   Zymata Chat (mobile shared module) — dipakai guru-shell & wali-shell
   - Full-page chat, realtime, lampiran Foto / Dokumen / Video (maks 1 menit)
   - Tabel: chat_kelas | Storage: R2 lewat ZymataMobileSupabase.storage
   ========================================================================= */
(function () {
  if (window.ZymataChat) return;

  var TABLE = 'chat_kelas';
  var GURU_ROOM = '__GURU__';
  var MAX_VIDEO_SEC = 60.9;
  var MAX_FILE_MB = 100;

  var s = {
    hostId: 'zchat-host',
    rooms: [],
    user: { id: '', nama: '', peran: '' },
    cur: '',
    rows: [],
    channel: null,
    sending: false
  };
  var pendingFile = null;
  var pendingType = '';

  /* ==================================================================
   * [PERBAIKAN GRUP KELAS] Nama kelas ditulis berbeda-beda antar sisi:
   * HP guru memakai bentuk dari data guru ('V-B'), HP wali memakai bentuk
   * dari data siswa ('5B' / 'Kelas V B'). Karena pesan dicari dengan
   * pencocokan huruf per huruf, keduanya tidak pernah bertemu. Grup Guru
   * selamat karena kuncinya tetap '__GURU__' di semua sisi.
   *
   * Solusi: samakan bentuk nama kelas sebelum dicocokkan (abaikan spasi,
   * tanda hubung, besar-kecil huruf, awalan 'Kelas', dan angka Romawi vs
   * angka biasa), lalu ambil semua kemungkinan penulisannya saat memuat.
   * ================================================================== */
  var ROMAWI = { I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6' };
  function normKelas(v) {
    var t = String(v == null ? '' : v).replace(/^\s*kelas\s*/i, '').replace(/[^a-z0-9]/gi, '').toUpperCase();
    var m = t.match(/^(VI|IV|III|II|V|I)([A-Z0-9]*)$/);
    if (m && ROMAWI[m[1]]) t = ROMAWI[m[1]] + m[2];
    return t;
  }
  function cocokRuang(nilai) {
    if (s.cur === GURU_ROOM) return String(nilai || '') === GURU_ROOM;
    return !!normKelas(nilai) && normKelas(nilai) === normKelas(s.cur);
  }
  function variasiKelas(key) {
    var out = {};
    function add(v) { if (v) out[String(v)] = 1; }
    add(key);
    var n = normKelas(key);
    add(n);
    var m = n.match(/^(\d+)(.*)$/);
    var arab = m ? m[1] : '';
    var sisa = m ? m[2] : n;
    var ROM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
    var basis = [];
    if (arab) { basis.push(arab); if (+arab <= 6) basis.push(ROM[+arab]); }
    if (!basis.length) basis.push(n);
    basis.forEach(function (b) {
      ['', '-', ' '].forEach(function (sep) {
        var v = sisa ? (b + sep + sisa) : b;
        add(v);
        add(v.toLowerCase());
        add(sisa ? (b + sep + sisa.toLowerCase()) : v.toLowerCase());
        add('Kelas ' + v);
        add('kelas ' + v);
      });
    });
    return Object.keys(out);
  }

  function S() { try { return window.ZymataMobileSupabase; } catch (e) { return null; } }
  function client() { try { var m = S(); return m && m.getClient ? m.getClient() : null; } catch (e) { return null; } }
  function storage() { var m = S(); return m && m.storage ? m.storage : null; }
  function host() { return document.getElementById(s.hostId); }
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function fmtTime(iso) {
    try { var d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
    catch (e) { return ''; }
  }
  function fmtDay(iso) {
    try { return new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  }
  function roleLabel(r) {
    r = String(r || '').toLowerCase();
    if (r.indexOf('wali') >= 0 && r.indexOf('kelas') < 0) return 'Wali';
    if (r.indexOf('kelas') >= 0) return 'Wali Kelas';
    if (r.indexOf('guru') >= 0) return 'Guru';
    if (r.indexOf('admin') >= 0 || r.indexOf('staf') >= 0 || r.indexOf('pegawai') >= 0) return 'Admin';
    return r ? r.charAt(0).toUpperCase() + r.slice(1) : '';
  }
  function roleKey(r) {
    r = String(r || '').toLowerCase();
    if (r.indexOf('wakil') >= 0) return 'wakasek';
    if (r.indexOf('kepala') >= 0 && r.indexOf('sekolah') >= 0) return 'kepsek';
    if (r.indexOf('bendahara') >= 0) return 'bendahara';
    if (r.indexOf('guru') >= 0 && r.indexOf('mapel') >= 0) return 'gurumapel';
    if (r.indexOf('guru') >= 0 && r.indexOf('kelas') >= 0) return 'gurukelas';
    if (r.indexOf('guru') >= 0) return 'guru';
    if (r.indexOf('wali') >= 0 && r.indexOf('kelas') >= 0) return 'walikelas';
    if (r.indexOf('wali') >= 0) return 'wali';
    if (r.indexOf('kelas') >= 0) return 'walikelas';
    if (r.indexOf('admin') >= 0 || r.indexOf('staf') >= 0 || r.indexOf('pegawai') >= 0 || r.indexOf('tata') >= 0 || r.indexOf('operator') >= 0 || r === 'tu') return 'admin';
    return '';
  }
  function roleBadge(r) {
    var k = roleKey(r);
    if (!k) { var lbl = roleLabel(r); return lbl ? (' <span class="zchat-badge zchat-badge-other">' + esc(lbl) + '</span>') : ''; }
    var map = { kepsek: 'Kepala Sekolah', wakasek: 'Wakil Kepala', bendahara: 'Bendahara', walikelas: 'Wali Kelas', gurukelas: 'Guru Kelas', gurumapel: 'Guru Mapel', guru: 'Guru', wali: 'Wali Murid', admin: 'Admin' };
    return ' <span class="zchat-badge zchat-badge-' + k + '">' + esc(map[k]) + '</span>';
  }

  function injectStyle() {
    if (document.getElementById('zchat-style')) return;
    var st = document.createElement('style');
    st.id = 'zchat-style';
    st.textContent = [
      '.app-content.zchat-active{padding:6px 10px 92px !important;overflow:hidden !important;}',
      '.zchat-wrap{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;gap:8px;}',
      /* [PAPAN KETIK HP] Tinggi diatur dari kode saat papan ketik muncul. */
      '.zchat-wrap.zchat-kb{height:auto;}',
      '.app-content.zchat-active.zchat-kb-open{padding-bottom:8px !important;}',
      '.zchat-rooms{display:flex;gap:6px;overflow-x:auto;flex-shrink:0;padding:2px;scrollbar-width:none;}',
      '.zchat-rooms::-webkit-scrollbar{display:none;}',
      /* [DROPDOWN RUANG] Pengganti deretan tombol kelas yang memanjang. */
      '.zchat-roombar{display:flex;align-items:center;gap:6px;flex-shrink:0;padding:2px 2px 6px;}',
      '.zchat-roombar .zchat-room-select{flex:1;min-width:0;}',
      '.zchat-roombar .zchat-room{flex-shrink:0;padding:11px 14px;border-radius:12px;}',
      '.zchat-room-select{width:100%;appearance:none;-webkit-appearance:none;border:1px solid #e2e8f0;background:#fff;color:#1A1F36;font-weight:800;font-size:14px;padding:11px 38px 11px 14px;border-radius:12px;cursor:pointer;background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%2364748b\'%3E%3Cpath d=\'M7 10l5 5 5-5z\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;background-size:20px;}',
      '.zchat-room-select:focus{outline:none;border-color:#1A1F36;}',
      '.zchat-room{flex-shrink:0;border:1px solid #e2e8f0;background:#fff;color:#475569;font-weight:700;font-size:13px;padding:7px 14px;border-radius:999px;cursor:pointer;}',
      '.zchat-room.is-active{background:linear-gradient(135deg,#1A1F36,#232a4d);color:#fff;border-color:transparent;}',
      '.zchat-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:6px 2px;}',
      '.zchat-list::-webkit-scrollbar{width:0;}',
      '.zchat-loading,.zchat-empty{margin:auto;color:#94a3b8;font-size:13px;text-align:center;padding:24px;}',
      '.zchat-daysep{text-align:center;margin:6px 0;}',
      '.zchat-daysep span{background:rgba(148,163,184,.18);color:#475569;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;}',
      '.zchat-row{display:flex;}',
      '.zchat-row.me{justify-content:flex-end;}',
      '.zchat-row.them{justify-content:flex-start;}',
      '.zchat-bubble{max-width:78%;padding:8px 11px;border-radius:16px;font-size:14px;line-height:1.45;box-shadow:0 1px 2px rgba(15,23,42,.06);word-wrap:break-word;overflow-wrap:anywhere;}',
      '.zchat-row.them .zchat-bubble{background:#fff;border:1px solid #eef2f7;border-bottom-left-radius:5px;color:#0f172a;}',
      '.zchat-row.me .zchat-bubble{background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border-bottom-right-radius:5px;}',
      '.zchat-name{font-size:11px;font-weight:800;color:#6366f1;margin-bottom:2px;}',
      '.zchat-badge{display:inline-block;font-size:9px;font-weight:800;line-height:1.4;padding:1px 6px;border-radius:999px;margin-left:4px;vertical-align:middle;letter-spacing:.02em;text-transform:uppercase;}',
      '.zchat-badge-walikelas{background:#dcfce7;color:#15803d;}',
      '.zchat-badge-guru{background:#e0f2fe;color:#0369a1;}',
      '.zchat-badge-gurukelas{background:#dbeafe;color:#1d4ed8;}',
      '.zchat-badge-gurumapel{background:#e0e7ff;color:#4338ca;}',
      '.zchat-badge-bendahara{background:#fef9c3;color:#a16207;}',
      '.zchat-badge-wali{background:#ffedd5;color:#c2410c;}',
      '.zchat-badge-admin{background:#ede9fe;color:#6d28d9;}',
      '.zchat-badge-kepsek{background:#fee2e2;color:#b91c1c;}',
      '.zchat-badge-wakasek{background:#ccfbf1;color:#0f766e;}',
      '.zchat-badge-other{background:#f1f5f9;color:#475569;}',
      '.zchat-txt{white-space:pre-wrap;}',
      '.zchat-time{font-size:10px;opacity:.6;margin-top:3px;text-align:right;}',
      '.zchat-img{max-width:200px;max-height:240px;border-radius:10px;display:block;margin-bottom:4px;}',
      '.zchat-vid{max-width:220px;border-radius:10px;display:block;margin-bottom:4px;}',
      '.zchat-file{display:inline-block;padding:6px 10px;border-radius:8px;font-weight:600;margin-bottom:4px;background:rgba(255,255,255,.18);color:inherit;text-decoration:none;}',
      '.zchat-row.them .zchat-file{background:#eef2ff;color:#4f46e5;}',
      '.zchat-bar{flex-shrink:0;display:flex;align-items:flex-end;gap:6px;background:#fff;border:1px solid #e8edf3;border-radius:22px;padding:5px 6px;box-shadow:0 4px 16px rgba(15,23,42,.06);}',
      '.zchat-input{flex:1;border:none;outline:none;resize:none;max-height:96px;font-size:14px;padding:8px 4px;font-family:inherit;background:transparent;color:#0f172a;}',
      '.zchat-attach{width:38px;height:38px;flex-shrink:0;border:none;border-radius:50%;background:#f1f5f9;color:#475569;font-size:22px;line-height:1;cursor:pointer;}',
      '.zchat-send{width:40px;height:40px;flex-shrink:0;border:none;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;font-size:16px;cursor:pointer;}',
      '.zchat-send:disabled{opacity:.5;}',
      '.zchat-attach-menu{position:absolute;bottom:58px;left:6px;background:#fff;border:1px solid #e8edf3;border-radius:14px;box-shadow:0 10px 30px rgba(15,23,42,.14);padding:6px;display:flex;flex-direction:column;gap:2px;z-index:40;}',
      '.zchat-attach-menu[hidden]{display:none;}',
      '.zchat-attach-menu button{border:none;background:transparent;text-align:left;padding:9px 14px;border-radius:9px;font-size:14px;font-weight:600;color:#0f172a;white-space:nowrap;cursor:pointer;}',
      '.zchat-attach-menu button:active{background:#f1f5f9;}',
      '.zchat-preview{position:absolute;bottom:60px;left:6px;right:6px;background:#eef2ff;color:#4f46e5;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:600;display:flex;justify-content:space-between;align-items:center;gap:8px;z-index:41;}',
      '.zchat-preview button{border:none;background:transparent;color:#4f46e5;font-size:15px;font-weight:800;cursor:pointer;}',
      /* ====== Tema WhatsApp-grup profesional (override) ====== */
      '.app-content.zchat-active{background:#0b141a !important;}',
      '.zchat-wrap{gap:6px;}',
      '.zchat-list{background:#0b141a;background-image:radial-gradient(circle at 18% 12%,rgba(0,168,132,.07),transparent 42%),radial-gradient(circle at 82% 88%,rgba(83,189,235,.06),transparent 42%);border-radius:14px;padding:10px 8px;gap:1px;}',
      '.zchat-room{background:rgba(255,255,255,.06);color:#c9d3d9;border:1px solid rgba(255,255,255,.10);}',
      '.zchat-room-select{background-color:rgba(255,255,255,.06);color:#e9edef;border:1px solid rgba(255,255,255,.12);background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%2300a884\'%3E%3Cpath d=\'M7 10l5 5 5-5z\'/%3E%3C/svg%3E");}',
      '.zchat-room-select option{background:#111b21;color:#e9edef;}',
      '.zchat-room-select:focus{border-color:#00a884;}',
      '.zchat-room.is-active{background:linear-gradient(135deg,#00a884,#009e77);color:#fff;border-color:transparent;}',
      '.zchat-loading,.zchat-empty{color:#8aa0ab;}',
      '.zchat-daysep{margin:12px 0 8px;}',
      '.zchat-daysep span{background:rgba(30,42,49,.92);color:#cdd6db;font-weight:600;box-shadow:0 1px 1px rgba(0,0,0,.2);}',
      '.zchat-row{align-items:flex-end;margin:0;}',
      '.zchat-row.head{margin-top:8px;}',
      '.zchat-ava{width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;margin-right:6px;align-self:flex-end;margin-bottom:2px;box-shadow:0 1px 2px rgba(0,0,0,.25);}',
      '.zchat-ava-blank{background:transparent !important;box-shadow:none !important;}',
      '.zchat-bubble{position:relative;max-width:82%;padding:6px 9px 5px;border-radius:9px;box-shadow:0 1px 1px rgba(0,0,0,.22);}',
      '.zchat-row.them .zchat-bubble{background:#202c33;border:none;color:#e9edef;border-bottom-left-radius:9px;}',
      '.zchat-row.me .zchat-bubble{background:#005c4b;color:#e9edef;border-bottom-right-radius:9px;}',
      '.zchat-row.them.head .zchat-bubble{border-top-left-radius:0;}',
      '.zchat-row.me.head .zchat-bubble{border-top-right-radius:0;}',
      '.zchat-row.them.head .zchat-bubble::before{content:"";position:absolute;top:0;left:-7px;width:0;height:0;border-top:8px solid #202c33;border-left:7px solid transparent;}',
      '.zchat-row.me.head .zchat-bubble::before{content:"";position:absolute;top:0;right:-7px;width:0;height:0;border-top:8px solid #005c4b;border-right:7px solid transparent;}',
      '.zchat-name{font-size:12.5px;font-weight:700;margin-bottom:2px;}',
      '.zchat-txt{color:#e9edef;}',
      '.zchat-time{font-size:10.5px;color:rgba(233,237,239,.5);margin-top:2px;display:flex;gap:3px;justify-content:flex-end;align-items:center;}',
      '.zchat-tick{color:#53bdeb;font-size:11px;letter-spacing:-2px;font-weight:900;}',
      '.zchat-img{max-width:220px;max-height:260px;border-radius:8px;}',
      '.zchat-vid{max-width:240px;border-radius:8px;}',
      '.zchat-file{background:rgba(255,255,255,.14);color:#e9edef;}',
      '.zchat-row.them .zchat-file{background:rgba(255,255,255,.08);color:#8fd0ff;}',
      '.zchat-bar{background:#1e2a30;border:1px solid rgba(255,255,255,.07);box-shadow:0 4px 16px rgba(0,0,0,.28);}',
      '.zchat-input{color:#e9edef;}',
      '.zchat-input::placeholder{color:#8aa0ab;}',
      '.zchat-attach{background:transparent;color:#8aa0ab;}',
      '.zchat-send{background:#00a884;color:#fff;}',
      '.zchat-ic{display:inline-flex;align-items:center;margin-right:9px;}',
      '.zchat-ic svg{width:19px;height:19px;}',
      '.zchat-attach-menu{background:#233138;border:1px solid rgba(255,255,255,.08);box-shadow:0 12px 32px rgba(0,0,0,.4);}',
      '.zchat-attach-menu button{color:#e9edef;display:flex;align-items:center;}',
      '.zchat-attach-menu button:active{background:rgba(255,255,255,.06);}',
      '.zchat-preview{background:#233138;color:#e9edef;}',
      '.zchat-preview button{color:#e9edef;}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ==================================================================
   * [PAPAN KETIK HP] Saat papan ketik muncul, layar yang terlihat menyusut
   * tapi tinggi halaman tetap setinggi layar penuh. Akibatnya seluruh isi
   * chat terdorong naik dan kotak ketik ikut melompat ke atas.
   *
   * Solusi: ikuti tinggi layar yang benar-benar terlihat, tahan halaman
   * supaya tidak ikut tergeser, dan jaga pesan terakhir tetap di bawah.
   * ================================================================== */
  var vvTerpasang = false;

  function keBawah() {
    try {
      var h = host();
      var list = h && h.querySelector('#zchat-list');
      if (list) list.scrollTop = list.scrollHeight;
    } catch (e) {}
  }

  function sesuaikanTinggi() {
    try {
      var h = host();
      if (!h) return;
      var wrap = h.querySelector('.zchat-wrap');
      if (!wrap) return;
      var vv = window.visualViewport;
      var tampak = vv ? vv.height : window.innerHeight;
      var geser = vv ? vv.offsetTop : 0;
      var kbBuka = !!vv && (window.innerHeight - vv.height) > 120;

      var induk = h.closest ? h.closest('.app-content') : null;
      if (induk) induk.classList.toggle('zchat-kb-open', kbBuka);

      // Saat papan ketik terbuka, bilah menu bawah ikut tertutup, jadi ruang
      // yang perlu disisakan di bawah jauh lebih kecil.
      var sisaBawah = kbBuka ? 8 : 96;
      var atas = wrap.getBoundingClientRect().top - geser;
      var tinggi = Math.max(220, Math.round(tampak - atas - sisaBawah));

      wrap.classList.add('zchat-kb');
      wrap.style.height = tinggi + 'px';

      // Tahan halaman supaya tidak ikut tergeser ke atas oleh papan ketik.
      if (kbBuka) {
        try { window.scrollTo(0, 0); } catch (e) {}
        if (induk && induk.scrollTop) induk.scrollTop = 0;
      }
    } catch (e) {}
  }

  function pasangViewport() {
    if (vvTerpasang) return;
    vvTerpasang = true;
    var jalan = function () { sesuaikanTinggi(); };
    try {
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function () { jalan(); keBawah(); });
        window.visualViewport.addEventListener('scroll', jalan);
      }
    } catch (e) {}
    try {
      window.addEventListener('resize', jalan);
      window.addEventListener('orientationchange', function () { setTimeout(jalan, 250); });
    } catch (e) {}
  }

  function build() {
    injectStyle();
    var h = host();
    if (!h) return;
    if (h.parentElement) h.parentElement.classList.add('zchat-active');
    if (!s.rooms.length) {
      h.innerHTML = '<div class="zchat-empty">Belum terhubung ke kelas.<br>Chat akan aktif setelah data kelas tersambung.</div>';
      return;
    }
    if (!s.cur || !s.rooms.some(function (r) { return r.key === s.cur; })) s.cur = s.rooms[0].key;
    // [DROPDOWN RUANG] Daftar kelas dibuat sebagai dropdown, bukan deretan
    // tombol memanjang, supaya guru yang mengajar banyak kelas tidak perlu
    // menggeser-geser layar untuk mencari kelasnya.
    // Hanya daftar KELAS yang jadi dropdown. Grup Guru tetap berupa tombol
    // tersendiri di sebelahnya supaya sekali sentuh langsung terbuka.
    var kelasRooms = s.rooms.filter(function (r) { return r.key !== GURU_ROOM; });
    var guruRoom = null;
    s.rooms.forEach(function (r) { if (r.key === GURU_ROOM) guruRoom = r; });
    var tabs = '';
    if (s.rooms.length > 1) {
      var selHtml = kelasRooms.length
        ? '<select class="zchat-room-select field-select" id="zchat-room-select" aria-label="Pilih kelas">' +
            '<option value=""' + (s.cur === GURU_ROOM ? ' selected' : '') + '>Pilih kelas\u2026</option>' +
            kelasRooms.map(function (r) {
              return '<option value="' + esc(r.key) + '"' + (r.key === s.cur ? ' selected' : '') + '>' + esc(r.label) + '</option>';
            }).join('') +
          '</select>'
        : '';
      var guruHtml = guruRoom
        ? '<button type="button" class="zchat-room' + (s.cur === GURU_ROOM ? ' is-active' : '') + '" data-zchat-room="' + esc(GURU_ROOM) + '">' + esc(guruRoom.label) + '</button>'
        : '';
      if (selHtml || guruHtml) tabs = '<div class="zchat-roombar">' + selHtml + guruHtml + '</div>';
    }
    h.innerHTML =
      '<div class="zchat-wrap">' +
        tabs +
        '<div class="zchat-list" id="zchat-list"><div class="zchat-loading">Memuat pesan\u2026</div></div>' +
        '<input type="file" id="zchat-foto" accept="image/*" hidden />' +
        '<input type="file" id="zchat-kamera" accept="image/*" capture="environment" hidden />' +
        '<input type="file" id="zchat-doc" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar" hidden />' +
        '<input type="file" id="zchat-video" accept="video/*" hidden />' +
        '<div class="zchat-preview" id="zchat-preview" hidden></div>' +
        '<div class="zchat-replybar" id="zchat-replybar" hidden></div>' +
        '<div class="zchat-msgmenu" id="zchat-msgmenu" hidden></div>' +
        '<div class="zchat-attach-menu" id="zchat-attach-menu" hidden>' +
          '<button type="button" data-zchat-pick="zchat-kamera"><span class="zchat-ic"><svg viewBox="0 0 24 24" fill="#ffffff"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.7 3.8l-1.1 1.6H5A1.8 1.8 0 0 0 3.2 7.2v9.6A1.8 1.8 0 0 0 5 18.6h14a1.8 1.8 0 0 0 1.8-1.8V7.2A1.8 1.8 0 0 0 19 5.4h-2.6l-1.1-1.6H8.7zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zm0 1.7a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4z"/></svg></span>Kamera</button>' +
          '<button type="button" data-zchat-pick="zchat-foto"><span class="zchat-ic"><svg viewBox="0 0 24 24" fill="#ffffff"><path d="M8 3h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" opacity="0.5"/><path d="M5 7h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/></svg></span>Foto</button>' +
          '<button type="button" data-zchat-pick="zchat-doc"><span class="zchat-ic"><svg viewBox="0 0 24 24" fill="#ffffff"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 3.5A1.8 1.8 0 0 0 5.2 5.3v13.4A1.8 1.8 0 0 0 7 20.5h10a1.8 1.8 0 0 0 1.8-1.8V8.3L14 3.5H7zm1 8.5a0.9 0.9 0 0 0 0 1.8h8a0.9 0.9 0 0 0 0-1.8H8zm0 3.6a0.9 0.9 0 0 0 0 1.8h5a0.9 0.9 0 0 0 0-1.8H8z"/></svg></span>Dokumen</button>' +
          '<button type="button" data-zchat-pick="zchat-video"><span class="zchat-ic"><svg viewBox="0 0 24 24" fill="#ffffff"><path d="M4 6.6A1.8 1.8 0 0 1 5.8 4.8h7A1.8 1.8 0 0 1 14.6 6.6v10.8A1.8 1.8 0 0 1 12.8 19.2h-7A1.8 1.8 0 0 1 4 17.4V6.6z"/><path d="M16.4 9.4l3.3-2.2a0.8 0.8 0 0 1 1.3 0.7v8.2a0.8 0.8 0 0 1-1.3 0.7l-3.3-2.2V9.4z"/></svg></span>Video</button>' +
        '</div>' +
        '<div class="zchat-bar">' +
          '<button type="button" class="zchat-attach" id="zchat-attach-btn" aria-label="Lampiran">+</button>' +
          '<textarea id="zchat-input" class="zchat-input" rows="1" placeholder="Tulis pesan\u2026"></textarea>' +
          '<button type="button" class="zchat-send" id="zchat-send" aria-label="Kirim">\u27A4</button>' +
        '</div>' +
      '</div>';
    bind();
    // [PAPAN KETIK HP] Ikuti tinggi layar yang benar-benar terlihat.
    pasangViewport();
    sesuaikanTinggi();
    setTimeout(sesuaikanTinggi, 120);
  }

  function bind() {
    var h = host();
    if (!h) return;
    // [DROPDOWN RUANG] Pindah grup lewat dropdown.
    // [BALAS & HAPUS] Tekan lama / klik kanan / ketuk dua kali pada pesan.
    pasangTekanLama(h.querySelector('#zchat-list'));
    var roomSel = h.querySelector('#zchat-room-select');
    if (roomSel) roomSel.addEventListener('change', function () { if (roomSel.value) pick(roomSel.value); });
    h.querySelectorAll('[data-zchat-room]').forEach(function (b) {
      b.addEventListener('click', function () { pick(b.getAttribute('data-zchat-room')); });
    });
    var menu = h.querySelector('#zchat-attach-menu');
    var attachBtn = h.querySelector('#zchat-attach-btn');
    if (attachBtn) attachBtn.addEventListener('click', function () { if (menu) menu.hidden = !menu.hidden; });
    h.querySelectorAll('[data-zchat-pick]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (menu) menu.hidden = true;
        var inp = h.querySelector('#' + b.getAttribute('data-zchat-pick'));
        if (inp) inp.click();
      });
    });
    ['zchat-foto', 'zchat-kamera', 'zchat-doc', 'zchat-video'].forEach(function (id) {
      var inp = h.querySelector('#' + id);
      if (inp) inp.addEventListener('change', function () { onPick(inp, id); });
    });
    var sendBtn = h.querySelector('#zchat-send');
    if (sendBtn) sendBtn.addEventListener('click', send);
    var input = h.querySelector('#zchat-input');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
      });
      // [PAPAN KETIK HP] Begitu kotak ketik disentuh, tinggi disesuaikan lalu
      // pesan terakhir digeser ke bawah supaya tidak tertutup papan ketik.
      input.addEventListener('focus', function () {
        setTimeout(function () { sesuaikanTinggi(); keBawah(); }, 60);
        setTimeout(function () { sesuaikanTinggi(); keBawah(); }, 350);
      });
      input.addEventListener('blur', function () {
        setTimeout(function () { sesuaikanTinggi(); }, 120);
      });
      input.addEventListener('input', function () {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 96) + 'px';
        keBawah();
      });
    }
  }

  function compressImg(file){
    return new Promise(function(resolve){
      try{
        if(!file || (file.type||'').indexOf('image/')!==0 || (file.type||'').indexOf('gif')>=0){ resolve(file); return; }
        var img=new Image();
        img.onload=function(){
          try{
            var max=1280, w=img.width, h=img.height;
            if(w>max||h>max){ if(w>=h){ h=Math.round(h*max/w); w=max; } else { w=Math.round(w*max/h); h=max; } }
            var cv=document.createElement('canvas'); cv.width=w; cv.height=h;
            cv.getContext('2d').drawImage(img,0,0,w,h);
            try{ URL.revokeObjectURL(img.src); }catch(e){}
            cv.toBlob(function(blob){
              if(!blob || blob.size>=file.size){ resolve(file); return; }
              try{ resolve(new File([blob], (String(file.name||'foto').replace(/\.[^.]+$/,'')||'foto')+'.jpg', {type:'image/jpeg'})); }catch(e){ resolve(file); }
            },'image/jpeg',0.7);
          }catch(e){ resolve(file); }
        };
        img.onerror=function(){ try{ URL.revokeObjectURL(img.src); }catch(e){} resolve(file); };
        img.src=URL.createObjectURL(file);
      }catch(e){ resolve(file); }
    });
  }

  function onPick(inp, id) {
    var f = inp.files && inp.files[0];
    if (!f) return;
    var type = (id === 'zchat-foto' || id === 'zchat-kamera') ? 'image' : (id === 'zchat-video' ? 'video' : 'file');
    if (f.size > MAX_FILE_MB * 1024 * 1024) { alert('Ukuran file maksimal ' + MAX_FILE_MB + 'MB'); inp.value = ''; return; }
    if (type === 'video') {
      checkVideo(f, function (ok) {
        if (!ok) { alert('Durasi video maksimal 1 menit'); inp.value = ''; return; }
        setPending(f, type);
      });
    } else {
      setPending(f, type);
    }
  }
  function checkVideo(file, cb) {
    try {
      var v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = function () { var d = v.duration; try { URL.revokeObjectURL(v.src); } catch (e) {} cb(!(d > MAX_VIDEO_SEC)); };
      v.onerror = function () { try { URL.revokeObjectURL(v.src); } catch (e) {} cb(true); };
      v.src = URL.createObjectURL(file);
    } catch (e) { cb(true); }
  }
  function setPending(f, type) {
    pendingFile = f; pendingType = type;
    var p = host().querySelector('#zchat-preview');
    if (p) {
      p.hidden = false;
      p.innerHTML = '<span>' + (type === 'image' ? '\uD83D\uDCF7 ' : type === 'video' ? '\uD83C\uDFAC ' : '\uD83D\uDCCE ') + esc(f.name) + '</span><button type="button" id="zchat-clear">\u2715</button>';
      var c = p.querySelector('#zchat-clear');
      if (c) c.addEventListener('click', clearPending);
    }
  }
  /* ==================================================================
   * [BALAS & HAPUS] Tekan lama sebuah pesan untuk membalas, menyalin, atau
   * menghapus (menghapus hanya untuk pesan sendiri).
   * ================================================================== */
  function tutupMenu() {
    s.menuId = null;
    var h = host();
    if (!h) return;
    var menu = h.querySelector('#zchat-msgmenu');
    if (menu) { menu.hidden = true; menu.innerHTML = ''; }
    var bd = h.querySelector('#zchat-backdrop');
    if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
    h.querySelectorAll('.zchat-row.is-pilih').forEach(function (r) { r.classList.remove('is-pilih'); });
  }

  function bukaMenu(id, mine) {
    var h = host();
    if (!h) return;
    var m = cariPesan(id);
    if (!m) return;
    tutupMenu();
    s.menuId = id;

    var baris = h.querySelector('[data-zchat-msg="' + String(id).replace(/"/g, '') + '"]');
    if (baris) baris.classList.add('is-pilih');

    var bd = document.createElement('div');
    bd.className = 'zchat-backdrop';
    bd.id = 'zchat-backdrop';
    bd.addEventListener('click', tutupMenu);
    h.appendChild(bd);

    var menu = h.querySelector('#zchat-msgmenu');
    if (!menu) return;
    menu.innerHTML =
      '<button type="button" data-zchat-aksi="balas">\u21A9\uFE0F Balas</button>' +
      '<button type="button" data-zchat-aksi="salin">\uD83D\uDCCB Salin teks</button>' +
      (mine ? '<button type="button" class="danger" data-zchat-aksi="hapus">\uD83D\uDDD1\uFE0F Hapus pesan</button>' : '') +
      '<button type="button" data-zchat-aksi="batal">Batal</button>';
    menu.hidden = false;
    menu.querySelectorAll('[data-zchat-aksi]').forEach(function (b) {
      b.addEventListener('click', function () {
        var aksi = b.getAttribute('data-zchat-aksi');
        var pid = s.menuId;
        tutupMenu();
        if (aksi === 'balas') mulaiBalas(pid);
        else if (aksi === 'salin') salinPesan(pid);
        else if (aksi === 'hapus') hapusPesan(pid);
      });
    });
  }

  function salinPesan(id) {
    var m = cariPesan(id);
    if (!m) return;
    var teks = uraiPesan(m.pesan).isi || m.lampiran_url || '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks);
    } catch (e) {}
  }

  function gambarBilahBalas() {
    var h = host();
    if (!h) return;
    var bar = h.querySelector('#zchat-replybar');
    if (!bar) return;
    if (!s.balasKe) { bar.hidden = true; bar.innerHTML = ''; return; }
    bar.innerHTML =
      '<div class="zchat-quote"><b>' + esc(s.balasKe.nama || 'Pesan') + '</b><span>' + esc(s.balasKe.kutip) + '</span></div>' +
      '<button type="button" id="zchat-batal-balas" aria-label="Batal balas">\u2715</button>';
    bar.hidden = false;
    var x = bar.querySelector('#zchat-batal-balas');
    if (x) x.addEventListener('click', batalBalas);
    sesuaikanTinggi();
  }

  function mulaiBalas(id) {
    var m = cariPesan(id);
    if (!m) return;
    s.balasKe = {
      id: String(m.id == null ? '' : m.id),
      nama: bersih(m.pengirim_nama || 'Tanpa nama', 40),
      kutip: ringkasIsi(m)
    };
    gambarBilahBalas();
    var h = host();
    var input = h && h.querySelector('#zchat-input');
    if (input) input.focus();
  }

  function batalBalas() {
    s.balasKe = null;
    gambarBilahBalas();
  }

  async function hapusPesan(id) {
    var m = cariPesan(id);
    if (!m) return;
    if (!window.confirm('Hapus pesan ini untuk semua orang?')) return;
    var c = client();
    if (!c) return;
    try {
      var res = await c.from(TABLE).delete().eq('id', m.id);
      if (res && res.error) throw res.error;
      for (var i = 0; i < s.rows.length; i++) {
        if (String(s.rows[i].id) === String(m.id)) { s.rows.splice(i, 1); break; }
      }
      if (s.balasKe && String(s.balasKe.id) === String(m.id)) batalBalas();
      paint();
    } catch (e) {
      console.warn('[ZymataChat] hapus error', e);
      alert('Pesan gagal dihapus. Coba lagi.');
    }
  }

  function pasangTekanLama(list) {
    if (!list) return;
    var timer = null, mulaiY = 0, batal = false;

    function targetDari(ev) {
      var t = ev.target;
      var baris = t && t.closest ? t.closest('[data-zchat-msg]') : null;
      if (!baris) return null;
      var id = baris.getAttribute('data-zchat-msg');
      if (!id || id.indexOf('tmp_') === 0) return null; // pesan yang belum tersimpan
      return { id: id, mine: baris.getAttribute('data-zchat-mine') === '1' };
    }

    list.addEventListener('touchstart', function (ev) {
      var tg = targetDari(ev);
      if (!tg) return;
      batal = false;
      mulaiY = (ev.touches && ev.touches[0]) ? ev.touches[0].clientY : 0;
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (batal) return;
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
        bukaMenu(tg.id, tg.mine);
      }, 450);
    }, { passive: true });

    list.addEventListener('touchmove', function (ev) {
      var y = (ev.touches && ev.touches[0]) ? ev.touches[0].clientY : 0;
      if (Math.abs(y - mulaiY) > 10) { batal = true; clearTimeout(timer); }
    }, { passive: true });

    ['touchend', 'touchcancel'].forEach(function (n) {
      list.addEventListener(n, function () { batal = true; clearTimeout(timer); }, { passive: true });
    });

    // Klik kanan untuk pemakaian di komputer.
    list.addEventListener('contextmenu', function (ev) {
      var tg = targetDari(ev);
      if (!tg) return;
      ev.preventDefault();
      bukaMenu(tg.id, tg.mine);
    });

    // Ketuk dua kali untuk langsung membalas, seperti pintasan di WhatsApp.
    var tapTerakhir = 0, idTerakhir = '';
    list.addEventListener('click', function (ev) {
      var tg = targetDari(ev);
      if (!tg) return;
      var kini = Date.now();
      if (tg.id === idTerakhir && (kini - tapTerakhir) < 320) {
        mulaiBalas(tg.id);
        tapTerakhir = 0; idTerakhir = '';
        return;
      }
      tapTerakhir = kini; idTerakhir = tg.id;
    });
  }

  function clearPending() {
    pendingFile = null; pendingType = '';
    ['zchat-foto', 'zchat-kamera', 'zchat-doc', 'zchat-video'].forEach(function (id) { var inp = host().querySelector('#' + id); if (inp) inp.value = ''; });
    var p = host().querySelector('#zchat-preview');
    if (p) { p.hidden = true; p.innerHTML = ''; }
  }

  function pick(key) {
    if (key === s.cur) return;
    teardown();
    s.cur = key;
    var h = host();
    if (h) h.querySelectorAll('[data-zchat-room]').forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-zchat-room') === key); });
    // [DROPDOWN RUANG] Samakan pilihan dropdown bila perpindahan datang dari kode lain.
    try {
      var _sel = h && h.querySelector('#zchat-room-select');
      if (_sel) {
        var _v = (key === GURU_ROOM) ? '' : key;
        if (_sel.value !== _v) _sel.value = _v;
      }
    } catch (_e) {}
    clearPending();
    load();
  }

  async function load() {
    var c = client();
    var h = host();
    var list = h && h.querySelector('#zchat-list');
    if (!list) return;
    if (!c) { list.innerHTML = '<div class="zchat-empty">Koneksi belum siap.</div>'; return; }
    list.innerHTML = '<div class="zchat-loading">Memuat pesan\u2026</div>';
    try {
      // [PERBAIKAN GRUP KELAS] Ambil semua kemungkinan penulisan nama kelas,
      // lalu saring lagi di sini supaya yang tampil benar-benar kelas ini.
      var q = c.from(TABLE).select('*');
      q = (s.cur === GURU_ROOM) ? q.eq('kelas', GURU_ROOM) : q.in('kelas', variasiKelas(s.cur));
      var res = await q.order('created_at', { ascending: true }).limit(500);
      if (res && res.error) throw res.error;
      s.rows = ((res && res.data) || []).filter(function (r) { return cocokRuang(r && r.kelas); });
      paint();
      subscribe();
    } catch (e) {
      console.warn('[ZymataChat] load error', e);
      list.innerHTML = '<div class="zchat-empty">Gagal memuat pesan.</div>';
    }
  }

  function isMine(m) {
    var u = s.user || {};
    return (m.pengirim_id && String(m.pengirim_id) === String(u.id)) ||
           (!m.pengirim_id && m.pengirim_nama && m.pengirim_nama === u.nama);
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    var a = parts[0].charAt(0);
    var b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (a + b).toUpperCase();
  }
  var NAME_COLORS = ['#53bdeb', '#e542a3', '#ffab00', '#06cf9c', '#ff8a65', '#a78bfa', '#4ec9b0', '#f97316', '#38bdf8', '#f472b6', '#84cc16', '#facc15'];
  function nameColor(name) {
    var str = String(name || ''), hsh = 0;
    for (var i = 0; i < str.length; i++) { hsh = (hsh * 31 + str.charCodeAt(i)) & 0x7fffffff; }
    return NAME_COLORS[hsh % NAME_COLORS.length];
  }
  function bubble(m, mine, head) {
    var att = '';
    if (m.lampiran_url) {
      if (m.lampiran_tipe === 'image' || (m.lampiran_tipe && m.lampiran_tipe.indexOf('image/') === 0)) att = '<a href="' + esc(m.lampiran_url) + '" target="_blank" rel="noopener"><img class="zchat-img" src="' + esc(m.lampiran_url) + '" alt="foto"/></a>';
      else if (m.lampiran_tipe === 'video' || (m.lampiran_tipe && m.lampiran_tipe.indexOf('video/') === 0)) att = '<video class="zchat-vid" src="' + esc(m.lampiran_url) + '" controls preload="metadata"></video>';
      else att = '<a class="zchat-file" href="' + esc(m.lampiran_url) + '" target="_blank" rel="noopener">\uD83D\uDCCE Lihat lampiran</a>';
    }
    var txt = m.pesan ? '<div class="zchat-txt">' + esc(m.pesan) + '</div>' : '';
    var name = '', avatar = '';
    if (!mine) {
      if (head) {
        var col = nameColor(m.pengirim_nama);
        avatar = '<div class="zchat-ava" style="background:' + col + '">' + esc(initials(m.pengirim_nama)) + '</div>';
        name = '<div class="zchat-name" style="color:' + col + '">' + esc(m.pengirim_nama || 'Tanpa nama') + roleBadge(m.pengirim_peran) + '</div>';
      } else {
        avatar = '<div class="zchat-ava zchat-ava-blank"></div>';
      }
    }
    var ticks = mine ? '<span class="zchat-tick">\u2713\u2713</span>' : '';
    var bub = '<div class="zchat-bubble">' + name + att + txt + '<div class="zchat-time">' + fmtTime(m.created_at) + ticks + '</div></div>';
    return '<div class="zchat-row ' + (mine ? 'me' : 'them') + (head ? ' head' : ' cont') + '">' + avatar + bub + '</div>';
  }

  function paint() {
    var h = host();
    var list = h && h.querySelector('#zchat-list');
    if (!list) return;
    if (!s.rows.length) { list.innerHTML = '<div class="zchat-empty">Belum ada pesan. Mulai percakapan \uD83D\uDC4B</div>'; return; }
    var html = '';
    var lastDay = '';
    var prevSender = null;
    var prevTime = 0;
    s.rows.forEach(function (m) {
      var day = fmtDay(m.created_at);
      if (day && day !== lastDay) { html += '<div class="zchat-daysep"><span>' + esc(day) + '</span></div>'; lastDay = day; prevSender = null; }
      var mine = isMine(m);
      var sender = mine ? '__me__' : (m.pengirim_id ? ('id:' + m.pengirim_id) : ('nm:' + (m.pengirim_nama || '')));
      var t = 0; try { t = new Date(m.created_at).getTime(); } catch (e) {}
      var head = (sender !== prevSender) || (t - prevTime > 300000);
      html += bubble(m, mine, head);
      prevSender = sender; prevTime = t;
    });
    list.innerHTML = html;
    list.scrollTop = list.scrollHeight;
  }

  function subscribe() {
    var c = client();
    if (!c) return;
    teardown();
    try {
      s.channel = c.channel('zchat_' + s.cur)
        // [PERBAIKAN GRUP KELAS] Tanpa saringan nama kelas di server, karena
        // penulisannya berbeda-beda. Penyaringan dilakukan di bawah ini.
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, function (payload) {
          var row = payload && payload.new;
          if (!row) return;
          if (!cocokRuang(row.kelas)) return;
          var idx = -1;
          for (var i = 0; i < s.rows.length; i++) {
            if ((row.client_key && s.rows[i].client_key === row.client_key) || (row.id && s.rows[i].id === row.id)) { idx = i; break; }
          }
          if (idx >= 0) s.rows[idx] = row; else s.rows.push(row);
          paint();
        })
        // [BALAS & HAPUS] Pesan yang dihapus di satu HP ikut hilang di HP lain.
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: TABLE }, function (payload) {
          var lama = payload && payload.old;
          if (!lama || lama.id == null) return;
          var berubah = false;
          for (var i = s.rows.length - 1; i >= 0; i--) {
            if (String(s.rows[i].id) === String(lama.id)) { s.rows.splice(i, 1); berubah = true; }
          }
          if (berubah) paint();
        })
        .subscribe();
    } catch (e) { console.warn('[ZymataChat] subscribe error', e); }
  }
  function teardown() {
    try {
      if (s.channel) { var c = client(); if (c && c.removeChannel) c.removeChannel(s.channel); s.channel = null; }
    } catch (e) {}
  }

  async function send() {
    if (s.sending) return;
    var h = host();
    var input = h && h.querySelector('#zchat-input');
    var text = input ? String(input.value || '').trim() : '';
    if (!text && !pendingFile) return;
    if (!s.cur) return;
    s.sending = true;
    var sendBtn = h.querySelector('#zchat-send');
    if (sendBtn) sendBtn.disabled = true;
    var ckey = 'm' + Date.now() + Math.random().toString(36).slice(2, 8);
    var u = s.user || {};
    var lampUrl = '', lampTipe = '';
    var fileToSend = pendingFile, typeToSend = pendingType;
    try {
      if (fileToSend) {
        if (typeToSend === 'image') { fileToSend = await compressImg(fileToSend); }
        var st = storage();
        if (!st || !st.upload) { alert('Fitur upload belum siap.'); throw new Error('no storage'); }
        var safe = (s.cur || 'umum').replace(/[^a-zA-Z0-9_-]/g, '_');
        var ext = (String(fileToSend.name || '').split('.').pop() || 'bin').toLowerCase();
        var _pfx = typeToSend === 'video' ? 'video/' : (typeToSend === 'image' ? 'foto/' : 'dok/');
        var path = _pfx + safe + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
        var up = await st.upload('chat', path, fileToSend);
        if (up.error) { alert('Upload gagal: ' + up.error); throw new Error(up.error); }
        lampUrl = up.data.url; lampTipe = typeToSend;
      }
      // [BALAS & HAPUS] Sisipkan penanda balasan di awal isi pesan.
      if (s.balasKe) {
        text = '[balas|' + s.balasKe.id + '|' + bersih(s.balasKe.nama, 40) + '|' + bersih(s.balasKe.kutip) + ']\n' + text;
      }
      var row = {
        kelas: s.cur,
        pengirim_id: String(u.id || ''),
        pengirim_nama: u.nama || '',
        pengirim_peran: u.peran || '',
        pesan: text,
        lampiran_url: lampUrl,
        lampiran_tipe: lampTipe,
        client_key: ckey
      };
      var optimistic = {};
      for (var k in row) optimistic[k] = row[k];
      optimistic.id = 'tmp_' + ckey;
      optimistic.created_at = new Date().toISOString();
      s.rows.push(optimistic);
      paint();
      if (input) { input.value = ''; input.style.height = 'auto'; }
      clearPending();
      batalBalas(); // [BALAS & HAPUS] kutipan dilepas setelah terkirim
      var c = client();
      var ins = await c.from(TABLE).insert(row).select().single();
      if (ins.error) throw ins.error;
      for (var j = 0; j < s.rows.length; j++) { if (s.rows[j].client_key === ckey) { s.rows[j] = ins.data; break; } }
      paint();
    } catch (e) {
      console.warn('[ZymataChat] send error', e);
    } finally {
      s.sending = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  function mount(opts) {
    opts = opts || {};
    s.hostId = opts.hostId || 'zchat-host';
    s.rooms = Array.isArray(opts.rooms) ? opts.rooms : [];
    s.user = opts.user || { id: '', nama: '', peran: '' };
    s.rows = [];
    s.cur = opts.defaultRoom || (s.rooms[0] && s.rooms[0].key) || '';
    pendingFile = null; pendingType = '';
    teardown();
    build();
    if (s.rooms.length) load();
  }

  window.ZymataChat = { mount: mount, teardown: teardown, GURU_ROOM: GURU_ROOM };
})();
