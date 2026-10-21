/*!
 * core.js — fondasi bersama landing page & dashboard admin
 * - API ke Google Apps Script (fetch text/plain → tanpa CORS preflight)
 * - Dedupe baca in-flight + epoch tulis (gas-scale-turbo 4.2)
 * - Cache lokal SWR, warmup server, antrean email (drain), pengukur Perf
 * - Utilitas aman: escape HTML, validasi URL, aksen tulisan tangan
 */
(function (w, d) {
  'use strict';
  const CFG = w.APP_CONFIG || {};
  const GAS_URL = String(CFG.GAS_URL || '').trim();
  const KONFIG_OK = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(GAS_URL) && !/GANTI|XXXX/i.test(GAS_URL);

  // ---------------- Penyimpanan lokal (aman di mode privat) ----------------
  const mkStore = (area) => ({
    get(k, def) { try { const v = w[area].getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { w[area].setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { w[area].removeItem(k); } catch (e) { /* abaikan */ } }
  });
  const Store = mkStore('localStorage');
  const SStore = mkStore('sessionStorage');

  // ---------------- Pengukur kinerja (ketik Perf.table() di Console) ----------------
  const Perf = {
    log: [],
    add(r) { this.log.push(r); if (this.log.length > 300) this.log.shift(); },
    table() { console.table(this.log.map((r) => ({ aksi: r.action, 'total ms': r.total, 'server ms': r.server, 'jaringan ms': r.net, 'cache✓': r.cache ? '✓' : '', ok: r.ok ? '✓' : '✗' }))); },
    summary() {
      const g = {};
      this.log.forEach((r) => { (g[r.action] = g[r.action] || []).push(r); });
      console.table(Object.keys(g).map((a) => ({ aksi: a, jumlah: g[a].length, 'rata-rata ms': Math.round(g[a].reduce((s, r) => s + r.total, 0) / g[a].length), 'server rata-rata': Math.round(g[a].reduce((s, r) => s + r.server, 0) / g[a].length) })));
    }
  };

  class ApiError extends Error { constructor(msg, code) { super(msg); this.code = code || 'ERR'; } }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function call(action, data, opts) {
    opts = opts || {};
    if (!KONFIG_OK) throw new ApiError('Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL /exec dari Apps Script.', 'CONFIG');
    const t0 = performance.now();
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const tm = ctrl ? setTimeout(() => ctrl.abort(), opts.timeout || 30000) : 0;
    let res, json;
    try {
      if (opts.get) {
        const q = new URLSearchParams(Object.assign({ action }, data || {})).toString();
        res = await fetch(GAS_URL + '?' + q, { method: 'GET', signal: ctrl && ctrl.signal, credentials: 'omit', cache: 'no-store' });
      } else {
        res = await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },            // WAJIB text/plain (hindari preflight)
          body: JSON.stringify({ action, token: opts.token || undefined, data: data || {} }),
          signal: ctrl && ctrl.signal, credentials: 'omit', redirect: 'follow'
        });
      }
      const txt = await res.text();
      try { json = JSON.parse(txt); } catch (e) {
        throw new ApiError(res.ok ? 'Respons server tidak dikenali. Pastikan Web App di-deploy dengan akses "Anyone".' : 'Server mengembalikan galat ' + res.status + '.', 'BAD_RESPONSE');
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(e && e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 'NETWORK');
    } finally { if (tm) clearTimeout(tm); }
    const total = Math.round(performance.now() - t0), server = Number(json.ms) || 0;
    Perf.add({ action, total, server, net: Math.max(0, total - server), cache: !!(json.data && json.data.cached), ok: !!json.success, at: Date.now() });
    if (json.nq) scheduleDrain(json.nq);
    return json;
  }
  async function request(action, data, opts) {
    try { return await call(action, data, opts); }
    catch (e) {
      if (opts && opts.retry && e.code === 'NETWORK') { await sleep(800); return call(action, data, opts); }
      throw e;
    }
  }
  // Dedupe baca identik yang sedang berjalan; epoch mencegah baca setelah simpan menumpang data lama.
  const inflight = {};
  let writeEpoch = 0;
  function api(action, data, opts) {
    opts = opts || {};
    if (!opts.read) { writeEpoch++; return request(action, data, opts); }
    const k = writeEpoch + '|' + action + '|' + String(opts.token || '').slice(-16) + '|' + JSON.stringify(data || {});
    if (inflight[k]) return inflight[k];
    const p = request(action, data, Object.assign({ retry: true }, opts));
    inflight[k] = p;
    p.then(() => { delete inflight[k]; }, () => { delete inflight[k]; });
    return p;
  }
  /** Kirim tanpa menunggu (statistik). Tetap terkirim walau tab ditutup. */
  function beacon(action, data) {
    if (!KONFIG_OK) return false;
    const body = JSON.stringify({ action, data });
    try { if (navigator.sendBeacon && navigator.sendBeacon(GAS_URL, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return true; } catch (e) { /* lanjut */ }
    try { fetch(GAS_URL, { method: 'POST', mode: 'no-cors', keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body }); return true; } catch (e) { return false; }
  }
  /** Panaskan server (cache) lebih dulu — maks. 1×/4 menit per lingkup. */
  function warm(scope) {
    if (!KONFIG_OK) return;
    const k = 'pf_warm_' + scope;
    if (Date.now() - SStore.get(k, 0) < 4 * 60e3) return;
    SStore.set(k, Date.now());
    try { fetch(GAS_URL + '?w=' + encodeURIComponent(scope), { mode: 'no-cors', credentials: 'omit', keepalive: true }); } catch (e) { /* abaikan */ }
  }
  /** Antrean email server: dikirim setelah respons → pengguna tidak menunggu. */
  let drainT = 0;
  function scheduleDrain(n) {
    if (!n) return;
    clearTimeout(drainT);
    drainT = setTimeout(async function run(tries) {
      tries = tries || 0;
      try { const r = await call('drain', {}); if (r.success && r.data && r.data.left > 0 && tries < 3) setTimeout(() => run(tries + 1), 600); } catch (e) { /* trigger keepWarm akan mengirim */ }
    }, 400);
  }

  // ---------------- Utilitas aman ----------------
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
  const U = {
    esc: (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"'`]/g, (c) => ESC[c]),
    /** URL tautan: hanya https:, mailto:, tel:, atau #anchor */
    href(u) { u = String(u || '').trim(); return /^(https:\/\/|mailto:|tel:|#)/i.test(u) && !/[\s"'<>`]/.test(u) ? u : '#'; },
    /** URL gambar: hanya https: atau data:image/ */
    img(u) { u = String(u || '').trim(); return /^https:\/\/[^\s"'<>`]+$/i.test(u) || /^data:image\/(svg\+xml|png|jpe?g|webp|gif)[;,]/i.test(u) ? u : ''; },
    /** *kata* → aksen tulisan tangan (aman: di-escape dulu) */
    accent(s, cls) { return U.esc(s).replace(/\*([^*]{1,60})\*/g, '<span class="' + (cls || 'font-hand') + '">$1</span>'); },
    plain(s) { return String(s || '').replace(/\*+/g, ''); },
    /** **tebal** + paragraf */
    md(s, pcls) {
      return String(s || '').split(/\n{2,}/).map((p) => '<p' + (pcls ? ' class="' + pcls + '"' : '') + '>' + U.esc(p.trim()).replace(/\*\*([^*]{1,80})\*\*/g, '<strong class="font-bold text-brand-navy">$1</strong>').replace(/\n/g, '<br>') + '</p>').join('');
    },
    ic: (name, cls, fill) => '<span class="ms' + (fill ? ' ms-fill' : '') + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + (/^[a-z0-9_]{2,40}$/.test(name) ? name : 'star') + '</span>',
    num: (n) => new Intl.NumberFormat('id-ID').format(Number(n) || 0),
    pct: (n, dg) => (Number(n) || 0).toLocaleString('id-ID', { maximumFractionDigits: dg === undefined ? 1 : dg }) + '%',
    date(iso, o) { const t = new Date(iso); return isNaN(t) ? '-' : t.toLocaleDateString('id-ID', o || { day: 'numeric', month: 'short', year: 'numeric' }); },
    dateTime(iso) { const t = new Date(iso); return isNaN(t) ? '-' : t.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); },
    rel(iso) {
      const t = new Date(iso).getTime(); if (!t) return '-';
      const s = Math.round((Date.now() - t) / 1000);
      if (s < 60) return 'baru saja'; if (s < 3600) return Math.floor(s / 60) + ' menit yang lalu';
      if (s < 86400) return Math.floor(s / 3600) + ' jam yang lalu';
      if (s < 172800) return 'Kemarin, ' + new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      return U.dateTime(iso);
    },
    hash(str) { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); },
    device() { const wd = w.innerWidth || 1024; const ua = navigator.userAgent || ''; return /iPad|Tablet/i.test(ua) || (wd >= 768 && wd < 1024 && 'ontouchstart' in w) ? 'tablet' : wd < 768 || /Mobi|Android/i.test(ua) ? 'mobile' : 'desktop'; },
    fp() {
      let f = Store.get('pf_fp');
      if (!f) { const a = new Uint8Array(12); (w.crypto || {}).getRandomValues ? w.crypto.getRandomValues(a) : a.forEach((_, i) => { a[i] = Math.random() * 256; }); f = Array.from(a, (b) => (b % 36).toString(36)).join(''); Store.set('pf_fp', f); }
      return f;
    },
    debounce(fn, ms) { let t; return function () { const a = arguments, s = this; clearTimeout(t); t = setTimeout(() => fn.apply(s, a), ms); }; },
    initials(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase() || '?'; },
    avatar(name, bg) {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + (bg || '#2563EB') + '"/><stop offset="1" stop-color="#0B1F3A"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><text x="60" y="76" font-family="Arial,sans-serif" font-size="44" font-weight="700" fill="#fff" text-anchor="middle">' + U.esc(U.initials(name)) + '</text></svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    },
    /** Ilustrasi sampul proyek bila gambar kosong/gagal dimuat */
    cover(title, i) {
      const pal = [['#EAF3FF', '#2563EB', '#FFC300'], ['#FFF6D4', '#0B1F3A', '#2563EB'], ['#EAF3FF', '#0B1F3A', '#3B9BFF'], ['#FDF8F0', '#2563EB', '#FFC300']][(i || 0) % 4];
      const t = U.esc(String(title || 'Proyek').slice(0, 28));
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="' + pal[0] + '"/>' +
        '<circle cx="560" cy="60" r="120" fill="' + pal[2] + '" opacity=".25"/><circle cx="60" cy="380" r="90" fill="' + pal[1] + '" opacity=".12"/>' +
        '<rect x="70" y="60" width="500" height="290" rx="22" fill="#fff"/><rect x="70" y="60" width="500" height="40" rx="22" fill="' + pal[1] + '"/><rect x="70" y="80" width="500" height="20" fill="' + pal[1] + '"/>' +
        '<circle cx="98" cy="80" r="6" fill="#fff" opacity=".7"/><circle cx="118" cy="80" r="6" fill="#fff" opacity=".5"/><circle cx="138" cy="80" r="6" fill="#fff" opacity=".35"/>' +
        '<rect x="100" y="130" width="180" height="16" rx="8" fill="#0B1F3A" opacity=".85"/><rect x="100" y="158" width="260" height="10" rx="5" fill="#5B6472" opacity=".35"/>' +
        '<rect x="100" y="196" width="130" height="120" rx="14" fill="' + pal[0] + '"/><rect x="246" y="196" width="130" height="120" rx="14" fill="' + pal[0] + '"/><rect x="392" y="196" width="148" height="120" rx="14" fill="' + pal[2] + '" opacity=".5"/>' +
        '<path d="M115 296 L145 260 L170 276 L215 222" stroke="' + pal[1] + '" stroke-width="6" fill="none" stroke-linecap="round"/>' +
        '<rect x="262" y="276" width="18" height="30" rx="4" fill="' + pal[1] + '"/><rect x="290" y="252" width="18" height="54" rx="4" fill="' + pal[1] + '" opacity=".7"/><rect x="318" y="236" width="18" height="70" rx="4" fill="' + pal[1] + '" opacity=".5"/>' +
        '<text x="320" y="382" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="' + pal[1] + '" text-anchor="middle" opacity=".8">' + t + '</text></svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    },
    /** Terapkan warna utama dari Pengaturan (CSS variable) */
    brand(hex) {
      const m = /^#([0-9a-f]{6})$/i.exec(String(hex || ''));
      const root = d.documentElement.style;
      if (!m || m[1].toLowerCase() === '2563eb') { ['--c-brand', '--c-brand-dark', '--c-bright', '--c-band'].forEach((v) => root.removeProperty(v)); return; }
      const n = parseInt(m[1], 16), rgb = [n >> 16 & 255, n >> 8 & 255, n & 255];
      const mix = (c, t, p) => c.map((x, i) => Math.round(x + (t[i] - x) * p));
      root.setProperty('--c-brand', rgb.join(' '));
      root.setProperty('--c-brand-dark', mix(rgb, [0, 0, 0], 0.18).join(' '));
      root.setProperty('--c-bright', mix(rgb, [255, 255, 255], 0.22).join(' '));
      root.setProperty('--c-band', mix(rgb, [0, 0, 0], 0.08).join(' '));
    },
    toast(msg, type) {
      d.querySelectorAll('.toast').forEach((t) => t.remove());
      const el = d.createElement('div');
      el.className = 'toast ' + (type === 'error' ? 'bg-error text-surface-white' : type === 'warn' ? 'bg-yellow-accent text-brand-navy' : 'bg-brand-navy text-surface-white');
      el.setAttribute('role', type === 'error' ? 'alert' : 'status');
      el.innerHTML = U.ic(type === 'error' ? 'error' : type === 'warn' ? 'warning' : 'check_circle', 'text-[20px]') + '<span>' + U.esc(msg) + '</span>';
      d.body.appendChild(el);
      setTimeout(() => el.remove(), type === 'error' ? 6000 : 3200);
    }
  };

  // Gambar gagal dimuat → pakai cadangan (data-fb). Satu pendengar global (aman untuk CSP).
  d.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.dataset && t.dataset.fb && !t.dataset.fbDone) { t.dataset.fbDone = '1'; t.src = t.dataset.fb; }
  }, true);

  w.PF = { CFG, GAS_URL, KONFIG_OK, Store, SStore, Perf, api, beacon, warm, scheduleDrain, ApiError, U, sleep };
  w.Perf = Perf;
})(window, document);
