#!/usr/bin/env node
// ============================================================================
//  bump-sw-version.js
//  Menaikkan CACHE_VERSION di file service worker secara OTOMATIS.
//  Jalankan ini SEBELUM build/`npx cap sync`, biar setiap rilis dapat versi
//  cache unik tanpa kamu edit manual.
//
//  Cara pakai:
//    node bump-sw-version.js <path-ke-sw.js>
//  Contoh:
//    node bump-sw-version.js guru-sw.js
//    node bump-sw-version.js www/guru-sw.js
//
//  Kalau path tidak diisi, default-nya ./guru-sw.js
// ============================================================================
const fs = require('fs');

const swPath = process.argv[2] || './guru-sw.js';

if (!fs.existsSync(swPath)) {
  console.error(`❌ File tidak ditemukan: ${swPath}`);
  console.error(`   Pastikan kamu menunjuk ke file service worker yang benar.`);
  process.exit(1);
}

// Buat cap waktu unik: vYYYYMMDD-HHMMSS (selalu naik tiap dijalankan)
const d = new Date();
const p = n => String(n).padStart(2, '0');
const stamp =
  `v${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
  `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;

let src = fs.readFileSync(swPath, 'utf8');
const re = /const CACHE_VERSION = '[^']*';/;

if (!re.test(src)) {
  console.error(`❌ Tidak menemukan baris CACHE_VERSION di ${swPath}`);
  console.error(`   Baris yang dicari: const CACHE_VERSION = '...';`);
  process.exit(1);
}

const before = src.match(re)[0];
src = src.replace(re, `const CACHE_VERSION = '${stamp}';`);
fs.writeFileSync(swPath, src);

console.log(`✅ Service worker diperbarui: ${swPath}`);
console.log(`   Sebelum : ${before}`);
console.log(`   Sesudah : const CACHE_VERSION = '${stamp}';`);
