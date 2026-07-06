/* =====================================================================
   native-pro.js  —  Zymata SD Plus (Capacitor) FITUR PRO
   Push Notification (FCM) + Crash Report (Sentry) + Biometric + Share.

   Semua feature-detected: kalau plugin belum di-install/sync atau config
   belum diisi, otomatis no-op (aman). Isi PRO_CONFIG di bawah.

   Plugin (install via npm, lihat SETUP-PRO.txt):
     @capacitor/push-notifications  @capacitor/share
     capacitor-native-biometric
   Sentry di-load via CDN (browser SDK) kalau sentryDsn diisi.
   ===================================================================== */
(function () {
  'use strict';

  /* ============ ISI BAGIAN INI SESUAI AKUN BAPAK ============ */
  var PRO_CONFIG = {
    sentryDsn: '',                  // <- DSN dari sentry.io (kosong = Sentry nonaktif)
    sentryRelease: 'zymata@2230',
    enablePush: true,               // butuh setup Firebase (google-services.json)
    enableBiometric: true,
    enableShare: true,
    biometricServer: 'ai.zymata.guru'
  };
  /* ========================================================== */

  var Cap = window.Capacitor || null;
  function plugin(n) { return (Cap && Cap.Plugins && Cap.Plugins[n]) || null; }
  function isNative() {
    try {
      if (Cap && typeof Cap.isNativePlatform === 'function') return Cap.isNativePlatform();
      return !!(Cap && Cap.isNative);
    } catch (e) { return false; }
  }
  function toast(msg, tone) { try { if (window.zToast) { window.zToast(msg, tone); } else { alert('[Zymata] ' + msg); } } catch (e) { try { alert('[Zymata] ' + msg); } catch (_) {} } }

  /* ===================================================================
     1) CRASH REPORT — Sentry (browser SDK via CDN)
     =================================================================== */
  function initSentry() {
    if (!PRO_CONFIG.sentryDsn) return;
    function doInit() {
      try {
        window.Sentry.init({
          dsn: PRO_CONFIG.sentryDsn,
          release: PRO_CONFIG.sentryRelease,
          tracesSampleRate: 0.2,
          environment: isNative() ? 'android-app' : 'web'
        });
      } catch (e) {}
    }
    if (window.Sentry && window.Sentry.init) { doInit(); return; }
    var s = document.createElement('script');
    s.src = 'https://browser.sentry-cdn.com/7.120.3/bundle.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = doInit;
    (document.head || document.documentElement).appendChild(s);
  }
  window.zCaptureError = function (err, ctx) {
    try { if (window.Sentry && window.Sentry.captureException) window.Sentry.captureException(err, ctx ? { extra: ctx } : undefined); } catch (e) {}
  };
  window.addEventListener('error', function (ev) { window.zCaptureError(ev.error || ev.message); });
  window.addEventListener('unhandledrejection', function (ev) { window.zCaptureError(ev.reason); });

  /* ===================================================================
     2) SHARE — rapor / laporan (@capacitor/share)
     =================================================================== */
  window.zShare = function (opts) {
    opts = opts || {};
    var S = plugin('Share');
    if (S && S.share) {
      return S.share({
        title: opts.title || 'Zymata SD Plus',
        text: opts.text || '',
        url: opts.url || undefined,
        dialogTitle: opts.dialogTitle || 'Bagikan'
      }).then(function () { return true; }).catch(function () { return false; });
    }
    if (navigator.share) {
      return navigator.share({ title: opts.title, text: opts.text, url: opts.url }).then(function () { return true; }).catch(function () { return false; });
    }
    try {
      var blob = ((opts.text || '') + ' ' + (opts.url || '')).trim();
      navigator.clipboard && navigator.clipboard.writeText(blob);
      toast('Disalin ke clipboard', 'info');
    } catch (e) {}
    return Promise.resolve(false);
  };
  /* Auto-wire: elemen ber-atribut data-share akan otomatis bisa dibagikan.
     Contoh: <button data-share data-share-title="Rapor Malik"
               data-share-text="..." data-share-url="https://...">Bagikan</button> */
  if (PRO_CONFIG.enableShare) {
    document.addEventListener('click', function (ev) {
      var el = ev.target && ev.target.closest && ev.target.closest('[data-share]');
      if (!el) return;
      ev.preventDefault();
      window.zShare({
        title: el.getAttribute('data-share-title') || 'Zymata SD Plus',
        text: el.getAttribute('data-share-text') || el.getAttribute('data-share') || '',
        url: el.getAttribute('data-share-url') || ''
      });
    }, false);
  }

  /* ===================================================================
     3) BIOMETRIC LOGIN (capacitor-native-biometric)
     =================================================================== */
  window.zBiometric = {
    available: function () {
      var B = plugin('NativeBiometric');
      if (!B || !B.isAvailable) return Promise.resolve({ isAvailable: false });
      return B.isAvailable().catch(function () { return { isAvailable: false }; });
    },
    verify: function (reason) {
      var B = plugin('NativeBiometric');
      if (!B || !B.verifyIdentity) return Promise.reject(new Error('biometric-unavailable'));
      return B.verifyIdentity({
        reason: reason || 'Masuk ke Zymata',
        title: 'Verifikasi',
        subtitle: 'Gunakan sidik jari / wajah',
        description: ''
      });
    },
    save: function (username, password) {
      var B = plugin('NativeBiometric');
      if (!B || !B.setCredentials) return Promise.resolve(false);
      return B.setCredentials({ username: username, password: password, server: PRO_CONFIG.biometricServer })
        .then(function () { try { localStorage.setItem('zymata_biometric_enrolled', '1'); } catch (e) {} return true; })
        .catch(function () { return false; });
    },
    get: function () {
      var B = plugin('NativeBiometric');
      if (!B || !B.getCredentials) return Promise.reject(new Error('biometric-unavailable'));
      return B.getCredentials({ server: PRO_CONFIG.biometricServer });
    },
    remove: function () {
      var B = plugin('NativeBiometric');
      try { localStorage.removeItem('zymata_biometric_enrolled'); } catch (e) {}
      if (!B || !B.deleteCredentials) return Promise.resolve();
      return B.deleteCredentials({ server: PRO_CONFIG.biometricServer }).catch(function () {});
    },
    isEnrolled: function () {
      try { return localStorage.getItem('zymata_biometric_enrolled') === '1'; } catch (e) { return false; }
    },
    enabled: PRO_CONFIG.enableBiometric
  };

  /* ===================================================================
     4) PUSH NOTIFICATION — FCM (@capacitor/push-notifications)
     =================================================================== */
  function savePushToken(token) {
    try { localStorage.setItem('zymata_push_token', token); } catch (e) {}
    // toast('Token FCM diterima: ' + String(token).slice(0, 10) + '…', 'info'); // disembunyikan
    try {
      if (window.ZymataMobileSupabase && typeof window.ZymataMobileSupabase.saveDeviceToken === 'function') {
        var role = '', userId = '';
        try { var s = localStorage.getItem('siakad_session_user') || sessionStorage.getItem('siakad_session_user'); if (s) { var p = JSON.parse(s); role = p.role || ''; userId = p.id || ''; } } catch(e){}
        Promise.resolve(window.ZymataMobileSupabase.saveDeviceToken(token, role, userId))
          .then(function () { /* token tersimpan — tidak perlu toast */ })
          .catch(function (err) { toast('Gagal simpan token: ' + (err && err.message ? err.message : err), 'error'); });
      } else {
        toast('saveDeviceToken tidak tersedia', 'error');
      }
    } catch (e) { toast('Error simpan token: ' + (e && e.message ? e.message : e), 'error'); }
  }
  window.zPushToken = function () { try { return localStorage.getItem('zymata_push_token') || ''; } catch (e) { return ''; } };
  window.zPush = {
    init: function () {
      if (!PRO_CONFIG.enablePush) return;
      var P = plugin('PushNotifications');
      if (!P) { toast('Plugin PushNotifications tidak ada di build ini', 'error'); return; }
      try {
        P.addListener('registration', function (t) { if (t && t.value) savePushToken(t.value); });
        P.addListener('registrationError', function (e) { toast('Registrasi FCM gagal: ' + (e && (e.error || e.message) ? (e.error || e.message) : JSON.stringify(e)), 'error'); window.zCaptureError(e, { where: 'push-register' }); });
        P.addListener('pushNotificationReceived', function (n) {
          toast((n && (n.title || n.body)) || 'Notifikasi baru', 'info');
        });
        P.addListener('pushNotificationActionPerformed', function (a) {
          try {
            var data = a && a.notification && a.notification.data;
            if (data && data.route && window.location) {
              /* shell bisa baca ?route= untuk buka modul tertentu */
              localStorage.setItem('zymata_push_route', data.route);
            }
          } catch (e) {}
        });
        P.checkPermissions().then(function (perm) {
          if (perm && (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale')) {
            return P.requestPermissions();
          }
          return perm;
        }).then(function (perm) {
          if (perm && perm.receive === 'granted') { P.register(); }
          else { toast('Izin notifikasi BELUM diberikan (' + (perm && perm.receive) + '). Aktifkan di Setelan HP.', 'error'); }
        }).catch(function (e) { toast('Error izin push: ' + (e && e.message ? e.message : e), 'error'); window.zCaptureError(e, { where: 'push-perm' }); });
      } catch (e) { window.zCaptureError(e, { where: 'push-init' }); }
    }
  };

  /* ===================== INIT ===================== */
  initSentry();
  if (isNative()) {
    /* daftar push saat app native jalan (token tersimpan utk targeting) */
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      window.zPush.init();
    } else {
      document.addEventListener('DOMContentLoaded', function () { window.zPush.init(); });
    }
  }
})();
