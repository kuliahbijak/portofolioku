/*!
 * admin.js — cangkang dashboard admin (SPA tanpa reload)
 * - Login: tiket alamat rahasia → Google Identity Services / akses darurat → token HMAC
 * - State di memori + cache lokal (SWR) → pindah menu 0 ms, tanpa panggilan server
 * - Tulis optimistis berurutan (Writer) + indikator sinkron; baca digabung (Batcher)
 * - Polling adaptif: hanya saat tab terlihat & admin aktif
 */
(function (w, d) {
  'use strict';
  const PF = w.PF, U = PF.U, Store = PF.Store, SStore = PF.SStore;
  const $ = (s, r) => (r || d).querySelector(s);
  const $$ = (s, r) => Array.from((r || d).querySelectorAll(s));
  const K = { tok: 'pf_adm_tok', state: 'pf_adm_state', gate: 'pf_gate' };
  const A = { token: '', exp: 0, me: null, S: null, view: 'beranda', fetchedAt: 0, dirty: {}, booted: false, gagalTulis: false };

  const MENU = [
    { id: 'beranda', label: 'Beranda', ic: 'dashboard' },
    { id: 'profil', label: 'Profil', ic: 'person' },
    { id: 'tentang', label: 'Tentang', ic: 'info' },
    { id: 'keahlian', label: 'Keahlian', ic: 'psychology' },
    { id: 'portofolio', label: 'Portofolio', ic: 'grid_view' },
    { id: 'testimoni', label: 'Testimoni', ic: 'format_quote' },
    { id: 'kontak', label: 'Kontak & Sosial', ic: 'alternate_email' },
    { id: 'pesan', label: 'Pesan Masuk', ic: 'mail', badge: true },
    { id: 'statistik', label: 'Statistik & Laporan', ic: 'bar_chart' },
    { id: 'migrasi', label: 'Migrasi Data', ic: 'move_up' },
    { id: 'pengaturan', label: 'Pengaturan', ic: 'settings' }
  ];
  const BOTTOM = [['beranda', 'Beranda', 'dashboard'], ['portofolio', 'Karya', 'grid_view'], ['pesan', 'Pesan', 'mail'], ['statistik', 'Statistik', 'bar_chart'], ['__more', 'Menu', 'apps']];

  // ===================== SESI =====================
  function tokenPayload(t) {
    try {
      let b = String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0))));
    } catch (e) { return null; }
  }
  function setToken(t, me) {
    const p = tokenPayload(t); if (!p) return;
    A.token = t; A.exp = p.x || 0;
    if (me) A.me = Object.assign({}, A.me || {}, me);
    Store.set(K.tok, { token: t, exp: A.exp, me: A.me });
  }
  function hapusSesiLokal() { A.token = ''; Store.del(K.tok); Store.del(K.state); }

  async function adm(action, data, opts) {
    const r = await PF.api(action, data, Object.assign({ token: A.token }, opts || {}));
    if (r.renew) setToken(r.renew);
    if (!r.success && r.code === 'AUTH') { sesiBerakhir(r.message); throw new PF.ApiError(r.message, 'AUTH'); }
    return r;
  }

  /** Penggabung baca: beberapa read dalam satu tik → 1 eksekusi server (aksi 'batch'). */
  const Batcher = {
    q: null,
    add(action, data) {
      return new Promise((res, rej) => {
        if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); }
        this.q.push({ action, data: data || {}, res, rej });
      });
    },
    async flush() {
      const q = this.q; this.q = null;
      const uniq = [], peta = {};
      q.forEach((it) => { const k = it.action + '|' + JSON.stringify(it.data); if (!peta[k]) { peta[k] = []; uniq.push({ action: it.action, data: it.data, k }); } peta[k].push(it); });
      try {
        if (uniq.length === 1) { const r = await adm(uniq[0].action, uniq[0].data, { read: true }); peta[uniq[0].k].forEach((it) => it.res(r)); return; }
        for (let i = 0; i < uniq.length; i += 10) {
          const ch = uniq.slice(i, i + 10);
          const r = await adm('batch', { calls: ch.map((u) => ({ action: u.action, data: u.data })) }, { read: true });
          if (!r.success) throw new PF.ApiError(r.message, r.code);
          r.data.results.forEach((res, j) => peta[ch[j].k].forEach((it) => it.res(res)));
        }
      } catch (e) { q.forEach((it) => it.rej(e)); }
    }
  };
  const read = (action, data) => Batcher.add(action, data);

  /** Penulis berurutan: UI sudah berubah lebih dulu (optimistis), server menyusul. */
  const Writer = {
    chain: Promise.resolve(), n: 0,
    run(action, data, o) {
      o = o || {};
      this.n++; setSync('saving');
      const p = this.chain.then(() => adm(action, data)).then((r) => {
        if (!r.success) throw new PF.ApiError(r.message, r.code);
        if (o.ok) o.ok(r);
        if (o.pesan !== false && (o.pesan || r.message)) U.toast(o.pesan || r.message);
        return r;
      }).catch((e) => {
        A.gagalTulis = true;
        if (o.fail) o.fail(e);
        if (e.code !== 'AUTH') U.toast((o.label ? o.label + ': ' : '') + e.message, 'error');
        return null;
      }).finally(() => {
        this.n--;
        if (!this.n) { setSync(A.gagalTulis ? 'error' : 'saved'); A.gagalTulis = false; persist(); }
      });
      this.chain = p;
      return p;
    }
  };
  function setSync(s) {
    const el = $('#sync'); if (!el) return;
    const m = { saved: ['bg-success-container text-success', 'cloud_done', 'Tersinkron'], saving: ['bg-light-blue-tint text-brand-blue', 'sync', 'Menyimpan…'], error: ['bg-error-container text-on-error-container', 'cloud_off', 'Gagal sinkron'], offline: ['bg-surface-container-high text-text-secondary', 'wifi_off', 'Offline'] }[s];
    el.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-caption text-caption ' + m[0];
    el.innerHTML = U.ic(m[1], 'text-[16px]' + (s === 'saving' ? ' spin' : '')) + '<span>' + m[2] + '</span>';
  }
  const persist = U.debounce(() => { if (A.S && A.token) Store.set(K.state, { S: A.S, at: A.fetchedAt, email: A.me && A.me.email }); }, 300);

  // ===================== LOGIN =====================
  function tampil(id) { ['boot', 'login', 'app'].forEach((x) => { $('#' + x).hidden = x !== id; }); }
  function pesanLogin(teks) { const m = $('#login-msg'); m.hidden = !teks; m.lastElementChild.textContent = teks || ''; }

  function showLogin(gate) {
    tampil('login');
    d.title = 'Masuk — Admin Portal';
    $('#login-hint').textContent = 'Gunakan akun Google pemilik situs' + (gate.petunjuk ? ' (' + gate.petunjuk + ').' : '.');
    PF.warm('admin');                                              // panaskan data dashboard sambil login
    const sisa = () => { const m = Math.max(0, Math.round((gate.exp - Date.now()) / 60000)); $('#login-ttl').textContent = m + ' menit lagi'; if (gate.exp < Date.now()) tiketHabis(); };
    sisa(); setInterval(sisa, 30000);
    $('#login-sep').hidden = !gate.darurat || !gate.clientId;
    $('#darurat-toggle').hidden = !gate.darurat || !gate.clientId;
    $('#darurat-form').hidden = !!gate.clientId || !gate.darurat;
    $('#login-noclient').hidden = !!gate.clientId;
    if (gate.clientId) muatGoogle(gate);
    $('#darurat-toggle').onclick = () => { const f = $('#darurat-form'); f.hidden = !f.hidden; if (!f.hidden) f.username.focus(); };
    $('#darurat-form').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target, b = f.querySelector('button'); b.disabled = true; pesanLogin('');
      try {
        const r = await PF.api('auth.darurat', { ticket: gate.ticket, username: f.username.value.trim(), password: f.password.value });
        f.password.value = '';
        if (!r.success) { pesanLogin(r.message); if (r.code === 'GATE') tiketHabis(); return; }
        masuk(r.data);
      } catch (err) { pesanLogin(err.message); } finally { b.disabled = false; }
    };
  }
  function muatGoogle(gate) {
    const s = d.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => {
      try {
        w.google.accounts.id.initialize({ client_id: gate.clientId, callback: (resp) => onGoogle(gate, resp), ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true, itp_support: true });
        w.google.accounts.id.renderButton($('#login-google'), { type: 'standard', theme: 'filled_blue', size: 'large', shape: 'pill', text: 'signin_with', logo_alignment: 'left', width: 300, locale: 'id' });
      } catch (e) { pesanLogin('Tombol Google gagal dimuat: ' + e.message); }
    };
    s.onerror = () => pesanLogin('Layanan Google Sign-In tidak bisa dimuat. Periksa koneksi atau gunakan akses darurat.');
    d.head.appendChild(s);
  }
  async function onGoogle(gate, resp) {
    pesanLogin('');
    const box = $('#login-google'); box.style.opacity = '0.5';
    try {
      const r = await PF.api('auth.google', { ticket: gate.ticket, credential: resp.credential });
      if (!r.success) { pesanLogin(r.message); if (r.code === 'GATE') tiketHabis(); return; }
      masuk(r.data);
    } catch (e) { pesanLogin(e.message); } finally { box.style.opacity = ''; }
  }
  function masuk(data) {
    const lama = Store.get(K.state);
    if (lama && lama.email && lama.email !== data.me.email) Store.del(K.state);
    setToken(data.token, data.me);
    SStore.del(K.gate);
    openApp();
  }
  function tiketHabis() {
    tampil('login');
    $('#login-google').innerHTML = ''; $('#darurat-form').hidden = true; $('#darurat-toggle').hidden = true; $('#login-sep').hidden = true; $('#login-noclient').hidden = true;
    pesanLogin('Tiket masuk sudah kedaluwarsa. Buka lagi alamat rahasia admin Anda.');
  }
  function sesiBerakhir(msg) {
    if (!A.token) return;
    hapusSesiLokal();
    const gate = SStore.get(K.gate);
    if (gate && gate.exp > Date.now()) { showLogin(gate); pesanLogin(msg || 'Sesi berakhir. Silakan masuk lagi.'); return; }
    tampil('login'); $('#login-google').innerHTML = ''; ['darurat-form', 'darurat-toggle', 'login-sep', 'login-noclient'].forEach((x) => { $('#' + x).hidden = true; });
    $('#login-hint').textContent = 'Demi keamanan, sesi admin berakhir otomatis.';
    pesanLogin((msg || 'Sesi berakhir.') + ' Buka lagi alamat rahasia admin Anda untuk masuk.');
  }

  // ===================== APLIKASI =====================
  function navHtml() {
    const baru = A.S && A.S.pesan ? A.S.pesan.baru : 0;
    $('#side-nav').innerHTML = MENU.map((m) => {
      const on = A.view === m.id;
      return '<a href="#/' + m.id + '" data-go="' + m.id + '" class="flex items-center ' + (m.badge ? 'justify-between ' : '') + 'gap-3 px-4 py-2.5 rounded-lg transition-colors ' + (on ? 'bg-brand-blue/20 text-surface-white border-l-4 border-yellow-accent pl-3' : 'text-outline-variant hover:bg-surface-white/5 hover:text-surface-white') + '"' + (on ? ' aria-current="page"' : '') + '>' +
        '<span class="flex items-center gap-3">' + U.ic(m.ic, 'text-[20px]') + '<span class="font-label-ui text-label-ui">' + m.label + '</span></span>' +
        (m.badge && baru ? '<span class="bg-yellow-accent text-brand-navy font-caption text-caption font-bold px-2 py-0.5 rounded-full">' + baru + '</span>' : '') + '</a>';
    }).join('');
    $('#bottom-nav').innerHTML = BOTTOM.map((b) => {
      const on = b[0] === A.view || (b[0] === '__more' && !BOTTOM.some((x) => x[0] === A.view));
      return '<button type="button" ' + (b[0] === '__more' ? 'data-act="drawer"' : 'data-go="' + b[0] + '"') + ' class="relative flex flex-col items-center justify-center gap-0.5 py-2 ' + (on ? 'text-brand-blue' : 'text-text-secondary') + '"' + (on ? ' aria-current="page"' : '') + '>' +
        U.ic(b[2], 'text-[22px]', on) + '<span class="text-[11px] font-semibold">' + b[1] + '</span>' +
        (b[0] === 'pesan' && baru ? '<span class="absolute top-1 right-[calc(50%-18px)] min-w-[18px] h-[18px] px-1 rounded-full bg-yellow-accent text-brand-navy text-[10px] font-bold flex items-center justify-center">' + baru + '</span>' : '') + '</button>';
    }).join('');
    $('#bell-dot').hidden = !baru;
    const m = MENU.find((x) => x.id === A.view);
    $('#crumb').textContent = m ? m.label : '';
    d.title = (m ? m.label + ' — ' : '') + 'Admin Portal';
  }
  function header() {
    const me = A.me || {}, p = A.S && A.S.konten ? A.S.konten.profil : {};
    $('#hello').textContent = (me.nama || p.nama_lengkap || 'Admin').split(' ')[0];
    $('#me-email').textContent = me.email === 'darurat' ? 'Akses darurat' : (me.email || '');
    $('#me-role').textContent = me.darurat ? 'Akses Darurat' : 'Super Admin';
    $('#me-role').className = 'font-caption text-caption font-bold tracking-wide ' + (me.darurat ? 'text-tertiary' : 'text-brand-blue');
    const im = $('#me-foto'), fb = U.avatar(me.nama || me.email || 'A');
    im.dataset.fb = fb; im.src = U.img(me.foto) || U.img(p.url_foto) || fb;
    $('#side-name').textContent = (p.nama_lengkap || 'Portofolio').split(' ')[0];
    const ban = $('#banner');
    ban.hidden = !me.darurat;
    if (me.darurat) ban.innerHTML = '<div class="mx-3 sm:mx-space-lg mt-space-md p-3 rounded-2xl bg-soft-yellow text-brand-navy flex flex-wrap items-center gap-2 font-body-sm text-body-sm">' + U.ic('warning', 'text-tertiary') + '<span class="flex-1 min-w-[200px]"><b>Anda masuk dengan akses darurat.</b> Isi Client ID OAuth dan ganti kata sandi darurat agar akun aman.</span><a href="#/pengaturan" data-go="pengaturan" data-tab="keamanan" class="btn-navy btn-sm">Buka Keamanan</a></div>';
    if (A.S && A.S.konten) U.brand(A.S.konten.pengaturan.warna_utama);
  }
  function render(opts) {
    opts = opts || {};
    const V = w.AdminViews;
    if (!A.S) { $('#view').innerHTML = V.loading(); return; }
    if (opts.bg && A.dirty[A.view]) return;                        // jangan timpa formulir yang sedang diedit
    const v = V.views[A.view] || V.views.beranda;
    const y = opts.bg ? w.scrollY : 0;
    $('#view').innerHTML = v.render();
    if (v.mount) v.mount();
    if (opts.bg) w.scrollTo(0, y);
  }
  function go(view, extra) {
    if (!w.AdminViews.views[view]) view = 'beranda';
    if (A.dirty[A.view] && A.view !== view && !w.confirm('Perubahan di halaman ini belum disimpan. Tinggalkan halaman?')) return;
    A.dirty[A.view] = false;
    A.view = view; A.extra = extra || {};
    if (location.hash !== '#/' + view) history.replaceState(null, '', '#/' + view);
    tutupLaci();
    navHtml(); render();
    w.scrollTo(0, 0);
    $('#view').focus({ preventScroll: true });
  }
  function bukaLaci() { $('#side').classList.remove('-translate-x-full'); $('#drawer-bg').classList.remove('hidden'); }
  function tutupLaci() { if (w.innerWidth < 1024) $('#side').classList.add('-translate-x-full'); $('#drawer-bg').classList.add('hidden'); }

  async function bootData(fresh) {
    try {
      const r = await read('admin.boot', fresh ? { _fresh: true } : {});
      if (!r.success) throw new PF.ApiError(r.message, r.code);
      const beda = !A.S || U.hash(JSON.stringify(A.S)) !== U.hash(JSON.stringify(r.data));
      A.S = r.data; A.fetchedAt = Date.now();
      if (r.data.me) A.me = Object.assign({}, A.me || {}, { email: r.data.me.email, darurat: r.data.me.darurat });
      persist();
      if (beda || !A.booted) { header(); navHtml(); render({ bg: A.booted }); }
      A.booted = true;
      setSync('saved');
    } catch (e) {
      if (e.code === 'AUTH') return;
      if (!A.S) $('#view').innerHTML = w.AdminViews.errorBox(e.message);
      else U.toast('Gagal menyegarkan data: ' + e.message, 'error');
      setSync(e.code === 'NETWORK' ? 'offline' : 'error');
    }
  }
  function openApp() {
    tampil('app');
    A.view = (location.hash.match(/^#\/([a-z]+)/) || [])[1] || 'beranda';
    const cache = Store.get(K.state);
    if (cache && cache.S && (!cache.email || !A.me || cache.email === A.me.email)) { A.S = cache.S; A.fetchedAt = cache.at || 0; }
    header(); navHtml(); render();
    bootData();
    if (!A.timer) A.timer = setInterval(tick, 15000);
  }

  // ===================== POLLING ADAPTIF =====================
  const Activity = {
    at: Date.now(), last: {},
    init() { ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach((ev) => w.addEventListener(ev, () => { this.at = Date.now(); }, { passive: true })); },
    idleMs() { return Date.now() - this.at; },
    due(key, activeMs, idleMs) {
      if (d.visibilityState !== 'visible') return false;
      if (this.idleMs() > 30 * 60e3) return false;                // >30 mnt diam → berhenti (sesi boleh kedaluwarsa, PRD ±2 jam)
      const gap = this.idleMs() > 120e3 ? idleMs : activeMs;
      if (Date.now() - (this.last[key] || 0) < gap - 500) return false;
      this.last[key] = Date.now(); return true;
    }
  };
  let tickBusy = false;
  async function tick() {
    if (!A.token || tickBusy) return;
    if (A.exp && A.exp < Date.now()) { sesiBerakhir('Sesi berakhir.'); return; }
    if (!A.S || Writer.n) return;
    tickBusy = true;
    try {
      const jobs = [];
      if (Activity.due('pesan', 60e3, 300e3)) jobs.push(read('admin.pesan').then((r) => {
        if (!r.success) return;
        const lama = A.S.pesan; A.S.pesan = r.data;
        if (!lama || lama.total !== r.data.total || lama.baru !== r.data.baru || (lama.list[0] && r.data.list[0] && lama.list[0].id !== r.data.list[0].id)) {
          if (lama && r.data.baru > lama.baru) U.toast('Pesan baru masuk (' + r.data.baru + ' belum dibaca)');
          navHtml(); if (['pesan', 'beranda'].indexOf(A.view) > -1) render({ bg: true });
        }
      }));
      if (Activity.due('dash', 300e3, 900e3)) jobs.push(read('admin.dashboard').then((r) => {
        if (!r.success) return;
        const beda = !A.S.dashboard || A.S.dashboard.at !== r.data.at; A.S.dashboard = r.data;
        if (beda && ['beranda', 'statistik'].indexOf(A.view) > -1) render({ bg: true });
      }));
      if (jobs.length) { await Promise.all(jobs); persist(); }
    } catch (e) { /* diam */ } finally { tickBusy = false; }
  }

  // ===================== AKSI GLOBAL =====================
  d.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g && !$('#app').hidden) { e.preventDefault(); go(g.dataset.go, g.dataset.tab ? { tab: g.dataset.tab } : null); return; }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'drawer') { e.preventDefault(); bukaLaci(); }
    if (a.dataset.act === 'logout') { e.preventDefault(); logout(); }
  });
  $('#drawer-bg') && $('#drawer-bg').addEventListener('click', tutupLaci);
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape') tutupLaci(); });
  w.addEventListener('hashchange', () => { const v = (location.hash.match(/^#\/([a-z]+)/) || [])[1]; if (v && v !== A.view && !$('#app').hidden) go(v); });
  w.addEventListener('online', () => { setSync('saved'); bootData(); });
  w.addEventListener('offline', () => setSync('offline'));
  w.addEventListener('beforeunload', (e) => { if (Writer.n || A.dirty[A.view]) { e.preventDefault(); e.returnValue = ''; } });
  w.addEventListener('resize', U.debounce(() => { if (w.innerWidth >= 1024) { $('#side').classList.remove('-translate-x-full'); $('#drawer-bg').classList.add('hidden'); } else $('#side').classList.add('-translate-x-full'); }, 150));

  async function logout() {
    const ok = await w.AdminViews.confirmBox({ title: 'Keluar dari dashboard?', text: 'Sesi di perangkat ini akan diakhiri dan salinan data lokal dihapus.', ok: 'Keluar', danger: true });
    if (!ok) return;
    const t = A.token;
    hapusSesiLokal(); SStore.del(K.gate);
    try { await PF.api('auth.logout', {}, { token: t, timeout: 6000 }); } catch (e) { /* tetap keluar */ }
    location.replace('./');
  }

  // ===================== MULAI =====================
  const ctx = { A, adm, read, Writer, go, render: (o) => render(o), navHtml, header, persist, bootData, setToken, setSync, $, $$, sesiBerakhir, logout };
  function start() {
    w.AdminViews.init(ctx);
    Activity.init();
    if (!PF.KONFIG_OK) { tampil('login'); ['darurat-form', 'darurat-toggle', 'login-sep', 'login-noclient'].forEach((x) => { $('#' + x).hidden = true; }); pesanLogin('Konfigurasi belum lengkap: isi GAS_URL di js/config.js.'); return; }
    const tok = Store.get(K.tok);
    if (tok && tok.token && tok.exp > Date.now() + 5000) { A.token = tok.token; A.exp = tok.exp; A.me = tok.me || null; openApp(); return; }
    if (tok) hapusSesiLokal();
    const gate = SStore.get(K.gate);
    if (gate && gate.ticket && gate.exp > Date.now()) { showLogin(gate); return; }
    location.replace('./');                                        // tanpa tiket & sesi → hanya landing page (PRD 8.3)
  }
  start();
  w.PF.admin = ctx;
})(window, document);
