/* =====================================================================
   native-enhance.js  —  Zymata SD Plus (Capacitor)
   Satu modul untuk "feel native" + profesional. Self-contained:
   - Inject CSS sendiri (skeleton, offline banner, tab transition, keyboard)
   - Semua fitur feature-detected: kalau plugin Capacitor belum di-sync,
     otomatis no-op (aman, tidak error).

   Plugin Capacitor yang dipakai (install via npm, lihat CARA-PAKAI):
     @capacitor/status-bar @capacitor/splash-screen @capacitor/haptics
     @capacitor/keyboard @capacitor/app @capacitor/network @capacitor/dialog
     @capacitor/filesystem @capacitor/share   (untuk simpan foto/dokumen/video)
   ===================================================================== */
(function () {
  'use strict';

  var Cap = window.Capacitor || null;
  function plugin(name) {
    return (Cap && Cap.Plugins && Cap.Plugins[name]) || null;
  }
  function isNative() {
    try {
      if (Cap && typeof Cap.isNativePlatform === 'function') return Cap.isNativePlatform();
      return !!(Cap && Cap.isNative);
    } catch (e) { return false; }
  }

  // Cadangan: pastikan mockup desktop (bingkai HP + dynamic island palsu) mati total
  // saat native, kalau-kalau script inline di <head> belum sempat jalan duluan.
  try {
    if ((isNative() || window.cordova) && document.documentElement) {
      document.documentElement.classList.add('cap-native');
    }
  } catch (e) {}

  /* ---------- Inject CSS ---------- */
  function injectStyles() {
    if (document.getElementById('z-native-style')) return;
    var css = [
      /* Skeleton loader */
      '.z-skeleton{position:relative;overflow:hidden;background:rgba(45,53,97,.08);border-radius:14px;min-height:14px}',
      '.z-skeleton::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);animation:z-shimmer 1.15s infinite}',
      '@keyframes z-shimmer{100%{transform:translateX(100%)}}',
      '.z-skel-stack>.z-skeleton{margin-bottom:10px}',
      /* Tab transition (hanya saat ganti tab, bukan tiap render) */
      '.z-tab-anim{animation:z-fade-up .26s cubic-bezier(.22,.61,.36,1)}',
      '@keyframes z-fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
      /* Offline banner */
      '.z-offline-banner{position:fixed;left:0;right:0;bottom:-72px;z-index:99999;background:#b91c1c;color:#fff;text-align:center;font-size:13px;font-weight:800;letter-spacing:-.01em;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));box-shadow:0 -4px 16px rgba(0,0,0,.18);transition:bottom .32s cubic-bezier(.22,.61,.36,1)}',
      '.z-offline-banner.show{bottom:0}',
      /* Pressed feedback global */
      '.z-pressed{transform:scale(.97)!important;filter:brightness(.96)!important;transition:transform .08s ease,filter .08s ease}',
      /* Keyboard open: angkat bottom nav supaya tidak menutupi input */
      'body.z-kb-open .bottom-nav,body.z-kb-open .wali-shell .bottom-nav{transform:translateY(140%)!important;transition:transform .2s ease}',
      /* FIX bottom-nav hilang di halaman panjang (mis. tab Menu / 22 modul):
         Saat native, body ikut scroll (mockup-frame jadi display:contents, body height:auto),
         sehingga .bottom-nav yang position:absolute tergulung ke dasar dokumen & keluar layar.
         Pakai position:fixed HANYA saat native supaya nav selalu menempel di dasar layar.
         Di preview desktop (tanpa .cap-native) tetap absolute, jadi bingkai HP tidak rusak. */
      'html.cap-native .bottom-nav,html.cap-native .wali-shell .bottom-nav{position:fixed!important;left:0!important;right:0!important;bottom:0!important}',
      /* FIX tombol Simpan (dock absensi) ikut "tenggelam" di halaman panjang:
         #appFloating .absen-save-dock ter-set position:absolute (menimpa is-floating),
         jadi ikut scroll & nyangkut di dasar dokumen. Saat native, paksa fixed supaya
         dock selalu melayang tepat di ATAS bottom-nav (offset bottom lama ~96px sudah
         mengosongkan tinggi nav). Selector dibuat lebih spesifik + !important agar menang. */
      'html.cap-native #appFloating .absen-save-dock,html.cap-native .sticky-action-bar.is-floating{position:fixed!important}'
    ].join('');
    var st = document.createElement('style');
    st.id = 'z-native-style';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------- 1. Splash + StatusBar (Capacitor) ---------- */
  function initChrome() {
    var sp = plugin('SplashScreen');
    if (sp && sp.hide) { try { sp.hide(); } catch (e) {} }
    var sb = plugin('StatusBar');
    if (sb) {
      try {
        // Warna status bar mengikuti tema role:
        //  - Guru (dark)          -> latar #070c19, ikon terang (Style.DARK)
        //  - Wali / login (terang) -> latar putih,   ikon gelap  (Style.LIGHT)
        // PERMINTAAN USER: DI DALAM aplikasi, bar MENGIKUTI TEMA APP (gelap/navy) TAPI
        // jam/ikon harus PUTIH agar jelas. Karena app Guru selalu bertema gelap di dalam,
        // isDark dipaksa true (bar navy + ikon putih). Hanya Wali yang terang.
        // Deteksi role DETERMINISTIK: pakai nama file halaman (selalu ada sejak awal,
        // tidak bergantung kapan class 'wali-shell' dipasang ke <body>). Fallback ke
        // class body kalau perlu. Wali = tema TERANG (ikon gelap), selain itu = gelap.
        var isDark = true;
        try {
          var path = (location.pathname || '').toLowerCase();
          var b = document.body;
          var isWaliPage = /wali-shell/.test(path) || (b && b.classList.contains('wali-shell'));
          if (isWaliPage) {
            isDark = false; // Wali = tema TERANG (ikon status bar gelap)
          }
        } catch (e2) {}
        // overlay:false -> status bar SOLID (bukan transparan). Ini WAJIB supaya
        // setBackgroundColor() beneran ngaruh di Android — kalau overlay:true,
        // Android mengabaikan setBackgroundColor sepenuhnya (limitasi plugin resmi),
        // makanya sebelumnya bar selalu keliatan hitam walau warnanya sudah di-set.
        // Capacitor: Style.DARK = ikon TERANG/putih ; Style.LIGHT = ikon GELAP.
        // Guru = tema gelap -> ikon putih -> 'DARK'. Wali = terang -> 'LIGHT'.
        var wantStyle = isDark ? 'DARK' : 'LIGHT';
        var barColor  = isDark ? '#070c19' : '#FBF8F1';
        function zApplyStatusBar() {
          try { sb.setOverlaysWebView && sb.setOverlaysWebView({ overlay: false }); } catch (e) {}
          try { sb.setBackgroundColor && sb.setBackgroundColor({ color: barColor }); } catch (e) {}
          try { sb.setStyle && sb.setStyle({ style: wantStyle }); } catch (e) {}
          try { sb.show && sb.show(); } catch (e) {}
        }
        zApplyStatusBar();
        // Re-apply beberapa kali (load/redirect) + tiap app balik aktif (resume).
        setTimeout(zApplyStatusBar, 300);
        setTimeout(zApplyStatusBar, 900);
        setTimeout(zApplyStatusBar, 1800);
        try { document.addEventListener('visibilitychange', function () { if (!document.hidden) zApplyStatusBar(); }); } catch (e) {}
        try {
          var appPlugin = plugin('App');
          appPlugin && appPlugin.addListener && appPlugin.addListener('appStateChange', function (s) { if (s && s.isActive) zApplyStatusBar(); });
        } catch (e) {}
        // Navigation bar (bawah) ikut tema role. Butuh plugin navigation-bar; no-op kalau belum di-install.
        var nb = plugin('NavigationBar');
        if (nb) {
          var navColor = isDark ? '#070c19' : '#F6F7FB';
          if (nb.setColor) { nb.setColor({ color: navColor, darkButtons: !isDark }); }
          else if (nb.setNavigationBarColor) { nb.setNavigationBarColor({ color: navColor, darkButtons: !isDark }); }
        }
      } catch (e) {}
    }
  }

  /* ---------- 2. Haptics ---------- */
  var Haptics = plugin('Haptics');
  function hapticLight() {
    if (!Haptics) return;
    try { Haptics.impact && Haptics.impact({ style: 'LIGHT' }); } catch (e) {}
  }
  function hapticMedium() {
    if (!Haptics) return;
    try { Haptics.impact && Haptics.impact({ style: 'MEDIUM' }); } catch (e) {}
  }
  function hapticSuccess() {
    if (!Haptics) return;
    try { Haptics.notification ? Haptics.notification({ type: 'SUCCESS' }) : Haptics.impact && Haptics.impact({ style: 'LIGHT' }); } catch (e) {}
  }
  window.zHaptic = hapticLight;
  window.zHapticMedium = hapticMedium;
  window.zHapticSuccess = hapticSuccess;

  /* ---------- 3. Toast (pakai showToast app kalau ada; else native Toast) ---------- */
  window.zToast = function (text, tone) {
    try {
      if (typeof window.showToast === 'function') { window.showToast(text, tone || 'success'); return; }
    } catch (e) {}
    var Toast = plugin('Toast');
    if (Toast && Toast.show) { try { Toast.show({ text: String(text), duration: 'short' }); return; } catch (e) {} }
    /* fallback web */
    try { console.log('[toast]', text); } catch (e) {}
  };

  /* ---------- 4. Native confirm (async) ---------- */
  window.zConfirm = function (message, title) {
    var Dialog = plugin('Dialog');
    if (Dialog && Dialog.confirm) {
      return Dialog.confirm({
        title: title || 'Konfirmasi',
        message: String(message),
        okButtonTitle: 'Ya',
        cancelButtonTitle: 'Batal'
      }).then(function (r) { return !!(r && r.value); });
    }
    return Promise.resolve(window.confirm ? window.confirm(message) : true);
  };

  /* ---------- Global tap feedback: haptic hanya bottom-nav, pressed animation tetap semua ---------- */
  var CLICKABLE = '[data-action],[data-tab],[data-route],[data-module-route],[data-setting-toggle],[data-mobile-crud-create],[data-mobile-crud-update],button,.nav-btn,.clickable';
  document.addEventListener('pointerdown', function (ev) {
    var el = ev.target && ev.target.closest && ev.target.closest(CLICKABLE);
    if (!el) return;
    /* haptic hanya di bottom-nav */
    if (el.closest('.bottom-nav')) { hapticLight(); }
    el.classList.add('z-pressed');
  }, true);
  function clearPressed() {
    var list = document.querySelectorAll('.z-pressed');
    for (var i = 0; i < list.length; i++) list[i].classList.remove('z-pressed');
  }
  document.addEventListener('pointerup', clearPressed, true);
  document.addEventListener('pointercancel', clearPressed, true);

  /* ---------- Tab transition (hanya saat ganti tab) ---------- */
  document.addEventListener('click', function (ev) {
    var tabBtn = ev.target && ev.target.closest && ev.target.closest('[data-tab]');
    if (!tabBtn) return;
    var content = document.getElementById('appContent') || document.querySelector('.app-content');
    if (!content) return;
    requestAnimationFrame(function () {
      content.classList.remove('z-tab-anim');
      void content.offsetWidth;
      content.classList.add('z-tab-anim');
    });
  }, true);

  /* ---------- 5. Back button (Android, Capacitor App plugin) ---------- */
  var App = plugin('App');
  if (App && App.addListener) {
    try {
      App.addListener('backButton', function () {
        hapticLight();
        /* a) tutup overlay/modal kalau terbuka */
        var closer = document.querySelector('[data-action="closeAnnouncements"], .qr-close, .close-chip, [data-action="backToParent"]');
        var overlayOpen = document.querySelector('.floating-backdrop, .qr-overlay, .modal-backdrop');
        if (closer && overlayOpen) { closer.click(); return; }
        /* b) DELEGASI ke logika back milik shell (guru/wali):
              kembali ke HALAMAN SEBELUMNYA (modul -> halaman induk), BUKAN keluar app.
              window.zHandleBack() dikembalikan true bila berhasil mundur satu halaman. */
        try {
          if (typeof window.zHandleBack === 'function') {
            if (window.zHandleBack()) return;
            /* false -> sudah di halaman paling awal -> baru konfirmasi keluar */
            window.zConfirm('Keluar dari aplikasi?', 'Keluar').then(function (ok) {
              if (ok && App.exitApp) { try { App.exitApp(); } catch (e) {} }
            });
            return;
          }
        } catch (e) {}
        /* c) fallback lama kalau shell belum siap */
        var homeTab = document.querySelector('[data-tab="home"]');
        var activeNonHome = document.querySelector('.nav-btn.active:not([data-tab="home"]), .nav-item.active:not([data-tab="home"])');
        if (homeTab && activeNonHome) { homeTab.click(); return; }
        window.zConfirm('Keluar dari aplikasi?', 'Keluar').then(function (ok) {
          if (ok && App.exitApp) { try { App.exitApp(); } catch (e) {} }
        });
      });
    } catch (e) {}
  }

  /* ---------- 6. Keyboard ---------- */
  var Keyboard = plugin('Keyboard');
  if (Keyboard && Keyboard.addListener) {
    try {
      Keyboard.addListener('keyboardWillShow', function () { document.body.classList.add('z-kb-open'); });
      Keyboard.addListener('keyboardWillHide', function () { document.body.classList.remove('z-kb-open'); });
    } catch (e) {}
  }

  /* ---------- 7. Network status banner ---------- */
  function setOffline(off) {
    var b = document.getElementById('z-offline-banner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'z-offline-banner';
      b.className = 'z-offline-banner';
      b.textContent = 'Tidak ada koneksi internet';
      (document.body || document.documentElement).appendChild(b);
    }
    b.classList.toggle('show', !!off);
  }
  var Network = plugin('Network');
  if (Network) {
    try {
      Network.getStatus && Network.getStatus().then(function (s) { setOffline(!s.connected); });
      Network.addListener && Network.addListener('networkStatusChange', function (s) {
        setOffline(!s.connected);
        if (s.connected) window.zToast('Koneksi tersambung kembali', 'success');
      });
    } catch (e) {}
  } else {
    window.addEventListener('offline', function () { setOffline(true); });
    window.addEventListener('online', function () { setOffline(false); });
  }

  /* ---------- Skeleton helper ---------- */
  window.zSkeleton = function (target, count) {
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    var n = count || 4, html = '<div class="z-skel-stack">';
    for (var i = 0; i < n; i++) html += '<div class="z-skeleton" style="height:' + (i % 3 === 0 ? 64 : 44) + 'px"></div>';
    el.innerHTML = html + '</div>';
  };

  /* ---------- 8. Simpan file native (foto / dokumen / video) ---------- */
  // Ambil nama file dari URL (mis. .../foto-123.jpg?token=... -> foto-123.jpg)
  function fileNameFromUrl(url, fallback) {
    try {
      var clean = String(url).split('?')[0].split('#')[0];
      var base = clean.substring(clean.lastIndexOf('/') + 1);
      if (base && /\.[a-z0-9]{2,5}$/i.test(base)) return decodeURIComponent(base);
    } catch (e) {}
    return fallback || ('file-' + Date.now());
  }

  // Simpan file ke perangkat lalu buka share sheet (pilih Galeri / WA / Files).
  // Aman untuk file besar (video) bila Filesystem.downloadFile tersedia.
  window.zSaveFile = async function (url, filename) {
    filename = filename || fileNameFromUrl(url);
    var Filesystem = plugin('Filesystem');
    var Share = plugin('Share');
    // Bukan di aplikasi native (browser biasa) -> biar browser yang tangani
    if (!isNative() || !Filesystem) { try { window.open(url, '_blank'); } catch (e) {} return; }
    try {
      window.zToast && window.zToast('Menyimpan ' + filename + '\u2026', 'success');
      var fileUri = null;
      // Jalur hemat memori (video besar): unduh langsung ke file
      if (typeof Filesystem.downloadFile === 'function') {
        try {
          var dl = await Filesystem.downloadFile({ url: url, path: filename, directory: 'DOCUMENTS' });
          fileUri = (dl && (dl.uri || dl.path)) || null;
        } catch (eDl) { fileUri = null; }
      }
      // Jalur cadangan: fetch -> base64 -> tulis
      if (!fileUri) {
        var res = await fetch(url);
        var blob = await res.blob();
        var base64 = await new Promise(function (ok, err) {
          var r = new FileReader();
          r.onloadend = function () { ok(String(r.result).split(',')[1]); };
          r.onerror = err;
          r.readAsDataURL(blob);
        });
        await Filesystem.writeFile({ path: filename, data: base64, directory: 'DOCUMENTS' });
        var got = await Filesystem.getUri({ directory: 'DOCUMENTS', path: filename });
        fileUri = got && got.uri;
      }
      if (fileUri && Share && Share.share) {
        await Share.share({ title: filename, text: filename, url: fileUri });
        window.zHapticSuccess && window.zHapticSuccess();
      } else {
        window.zToast && window.zToast('Tersimpan: ' + filename, 'success');
      }
    } catch (e) {
      try { window.open(url, '_blank'); } catch (e2) {}
      window.zToast && window.zToast('Gagal menyimpan, dibuka di browser', 'error');
    }
  };

  // Ekstensi file yang boleh disimpan
  var SAVABLE_RE = /\.(jpg|jpeg|png|gif|webp|bmp|heic|pdf|mp4|mov|m4v|3gp|mkv|webm|mp3|wav|m4a|doc|docx|xls|xlsx|ppt|pptx|zip)(\?|#|$)/i;
  function isSavableUrl(u) {
    if (!u) return false;
    if (SAVABLE_RE.test(u)) return true;
    if (/\/storage\/v1\/object\//i.test(u)) return true; // Supabase Storage
    return false;
  }

  // a) Klik link ke file -> simpan (jangan lari ke browser)
  document.addEventListener('click', function (ev) {
    if (!isNative()) return;
    var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('http') !== 0) return;   // hanya URL absolut (file di server)
    if (!isSavableUrl(href)) return;          // hanya file yang bisa disimpan
    ev.preventDefault();
    ev.stopPropagation();
    window.zSaveFile(href, fileNameFromUrl(href, a.getAttribute('download') || null));
  }, true);

  // b) Tekan-lama pada gambar -> tawarkan simpan
  var _lpTimer = null, _lpImg = null;
  document.addEventListener('pointerdown', function (ev) {
    if (!isNative()) return;
    var img = ev.target && ev.target.closest && ev.target.closest('img[src^="http"]');
    if (!img) return;
    _lpImg = img;
    _lpTimer = setTimeout(function () {
      _lpTimer = null;
      var src = _lpImg && _lpImg.getAttribute('src');
      if (!src) return;
      hapticMedium();
      window.zConfirm('Simpan gambar ini ke perangkat?', 'Simpan Gambar').then(function (ok) {
        if (ok) window.zSaveFile(src, fileNameFromUrl(src, 'foto-' + Date.now() + '.jpg'));
      });
    }, 550);
  }, true);
  function cancelLongPress() { if (_lpTimer) { clearTimeout(_lpTimer); _lpTimer = null; } }
  document.addEventListener('pointerup', cancelLongPress, true);
  document.addEventListener('pointermove', cancelLongPress, true);
  document.addEventListener('pointercancel', cancelLongPress, true);

  /* ---------- Init ---------- */
  injectStyles();

  if (isNative()) initChrome();
  document.addEventListener('deviceready', initChrome, false); /* cordova-compat, harmless */
  document.addEventListener('DOMContentLoaded', function () { injectStyles(); initChrome(); });
  window.addEventListener('load', initChrome);
})();
