/*!
 * app.js — Landing page publik (F1–F9)
 * Render instan dari cache lokal (SWR) → ambil data segar → render ulang hanya bila berubah.
 * Semua data di-escape sebelum masuk DOM. Tidak ada tombol login (PRD 3): pintu admin lewat alamat rahasia.
 */
(function (w, d) {
  'use strict';
  const { api, beacon, Store, SStore, U, KONFIG_OK, warm } = w.PF;
  const $ = (s, r) => (r || d).querySelector(s);
  const $$ = (s, r) => Array.from((r || d).querySelectorAll(s));
  const KEY = 'pf_pub_v1';
  const st = { data: null, rendered: false, skill: 'all', port: 'all', portGrid: false, t0: Date.now() };
  const reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // =============== 0. Gerbang admin tersembunyi (#masuk=KUNCI) ===============
  function gerbang() {
    const m = /(?:[#&?])masuk=([A-Za-z0-9]{10,64})/.exec(location.hash + '&' + location.search);
    if (!m) return;
    history.replaceState(null, '', location.pathname);           // kunci dihapus dari address bar & riwayat
    const bar = d.createElement('div'); bar.className = 'topbar'; d.body.appendChild(bar);
    api('auth.gate', { key: m[1] }).then((r) => {
      if (r.success) { SStore.set('pf_gate', r.data); location.replace('admin.html'); }
      else bar.remove();                                            // diam: tampil landing biasa
    }).catch(() => bar.remove());
  }
  gerbang();
  w.addEventListener('hashchange', gerbang);                       // alamat ditempel di tab yang sudah terbuka

  // =============== 1. Statistik (berkelompok, sendBeacon) ===============
  const Track = {
    q: [], tm: 0,
    add(j, t) { this.q.push({ j, t: String(t || '').slice(0, 80), p: U.device() }); clearTimeout(this.tm); this.tm = setTimeout(() => this.flush(), 4000); },
    flush() { if (!this.q.length) return; beacon('track', { fp: U.fp(), events: this.q.splice(0, 30) }); }
  };
  d.addEventListener('visibilitychange', () => { if (d.visibilityState === 'hidden') Track.flush(); });
  w.addEventListener('pagehide', () => Track.flush());
  d.addEventListener('click', (e) => {
    const a = e.target.closest('[data-trk]');
    if (a) Track.add(a.dataset.trk, a.dataset.t || '');
  });
  function catatKunjungan() {
    if (SStore.get('pf_vis')) return;
    SStore.set('pf_vis', 1);
    let src = '(langsung)';
    try {
      const u = new URL(location.href), utm = u.searchParams.get('utm_source');
      if (utm) src = utm.slice(0, 40);
      else if (d.referrer) { const r = new URL(d.referrer); if (r.host !== location.host) src = r.host.replace(/^www\./, ''); }
    } catch (e) { /* abaikan */ }
    Track.add('kunjungan', src);
  }

  // =============== 2. Helper render ===============
  const SPARK = '<path d="M12 0L14.5 8.5L23 11L14.5 13.5L12 22L9.5 13.5L1 11L9.5 8.5L12 0Z"/>';
  const ext = (u) => /^https:/i.test(u) ? ' target="_blank" rel="noopener noreferrer"' : '';
  const kontakItems = (D) => (D.kontak || []).filter((k) => U.href(k.url) !== '#');
  const rv = (i) => ' reveal' + (st.rendered ? ' in' : '') + '" style="--d:' + Math.min(i || 0, 8) * 60 + 'ms';

  function renderInfoBar(D) {
    const P = D.pengaturan, on = P.info_bar_aktif !== 'tidak';
    $('#infobar').hidden = !on;
    d.documentElement.style.setProperty('--hdr', on ? '7.5rem' : '5rem');
    if (!on) return;
    const em = P.info_bar_email, tel = P.info_bar_telepon;
    $('#ib-left').innerHTML =
      (em ? '<a class="flex items-center gap-space-xs hover:text-yellow-accent truncate" href="mailto:' + U.esc(em) + '" data-trk="klik_kontak" data-t="Email (info bar)">' + U.ic('mail', 'text-[16px] text-yellow-accent') + '<span class="truncate">' + U.esc(em) + '</span></a>' : '') +
      (tel ? '<a class="hidden sm:flex items-center gap-space-xs hover:text-yellow-accent" href="tel:' + U.esc(tel.replace(/[^\d+]/g, '')) + '" data-trk="klik_kontak" data-t="Telepon (info bar)">' + U.ic('call', 'text-[16px] text-yellow-accent') + '<span>' + U.esc(tel) + '</span></a>' : '');
    const sos = kontakItems(D).filter((k) => /^https:/i.test(k.url)).slice(0, 4);
    $('#ib-right').innerHTML =
      (P.info_bar_jam ? '<span class="hidden md:inline-flex items-center gap-space-xs bg-white/10 px-space-sm py-0.5 rounded-full text-light-blue-tint"><span class="w-1.5 h-1.5 rounded-full bg-yellow-accent animate-pulse"></span>' + U.esc(P.info_bar_jam) + '</span>' : '') +
      '<div class="flex items-center gap-space-sm">' + sos.map((k) => '<a class="hover:text-yellow-accent transition-colors" href="' + U.esc(U.href(k.url)) + '"' + ext(k.url) + ' aria-label="' + U.esc(k.label) + '" data-trk="klik_kontak" data-t="' + U.esc(k.label) + '">' + U.ic(k.ikon || 'link', 'text-[18px]') + '</a>').join('') + '</div>';
  }

  function renderHeader(D) {
    const p = D.profil, nama = p.nama_lengkap || 'Portofolio';
    $('#logo-name').textContent = nama.split(' ')[0];
    $('#logo-mark').firstChild.nodeValue = U.initials(nama).charAt(0);
    $('#foot-mark').textContent = U.initials(nama).charAt(0);
    const av = $('#hdr-avatar'), fb = U.avatar(nama);
    av.dataset.fb = fb; av.dataset.fbDone = ''; av.src = U.img(p.url_foto) || fb; av.alt = 'Foto ' + nama;
  }

  function renderHero(D) {
    const p = D.profil, nama = p.nama_lengkap || '';
    const th = Number(p.tahun_pengalaman) || 0, fb = U.avatar(nama, '#2563EB');
    const head = U.esc(p.headline || nama).replace(/\*([^*]{1,40})\*/, (m0, kata) =>
      '<span class="relative inline-block"><span class="relative z-10 font-hand text-accent-orange text-[1.18em] font-bold lowercase tracking-normal -rotate-2 inline-block">' + kata + '</span>' +
      '<svg class="absolute -top-1 -right-6 sm:-right-8 w-6 h-6 sm:w-8 sm:h-8 text-yellow-accent rotate-12" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">' + SPARK + '</svg>' +
      '<svg class="absolute -bottom-2 -left-6 w-4 h-4 text-bright-blue" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">' + SPARK + '</svg></span>');
    $('#hero').innerHTML =
      '<div class="lg:col-span-7 flex flex-col items-start z-10">' +
        (p.profesi ? '<div class="inline-flex items-center gap-space-xs bg-surface-white shadow-pill px-space-md py-1.5 rounded-full mb-space-md' + rv(0) + '"><span class="w-2 h-2 rounded-full bg-brand-blue animate-pulse"></span><span class="font-label-caps text-label-caps text-brand-navy uppercase">' + U.esc(p.profesi) + '</span></div>' : '') +
        '<h1 class="text-display-hero-mobile lg:text-display-hero text-brand-navy mb-space-md' + rv(1) + '">' + head + '</h1>' +
        (p.deskripsi_singkat ? '<p class="font-body-lg text-body-lg text-text-secondary leading-relaxed max-w-xl mb-space-xl' + rv(2) + '">' + U.esc(p.deskripsi_singkat) + '</p>' : '') +
        '<div class="flex flex-wrap items-center gap-space-md mb-space-lg' + rv(3) + '">' +
          '<a href="#portofolio" class="btn-primary" data-trk="klik_cta" data-t="lihat_portofolio"><span>' + U.esc(p.teks_tombol_1 || 'Lihat Portofolio') + '</span>' + U.ic('arrow_downward', 'text-[18px]') + '</a>' +
          '<a href="#tentang" class="btn-light" data-trk="klik_cta" data-t="tentang_saya"><span>' + U.esc(p.teks_tombol_2 || 'Tentang Saya') + '</span>' + U.ic('person', 'text-[18px]') + '</a>' +
          (U.href(p.url_video_intro) !== '#' ? '<a href="' + U.esc(U.href(p.url_video_intro)) + '" target="_blank" rel="noopener noreferrer" class="btn-ghost px-4 py-3" data-trk="klik_cta" data-t="video_intro">' + U.ic('play_circle', 'text-[22px]') + '<span>Video perkenalan</span></a>' : '') +
        '</div>' +
        (p.tagline_tulisan ? '<div class="flex items-center gap-space-sm text-text-secondary' + rv(4) + '"><svg class="w-8 h-8 text-yellow-accent -rotate-12 shrink-0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 40 40" aria-hidden="true"><path d="M8 12 C18 6, 28 20, 32 30 M32 30 L24 28 M32 30 L31 21"/></svg><span class="font-hand text-[22px] text-brand-navy font-bold tracking-wide">' + U.esc(p.tagline_tulisan) + '</span></div>' : '') +
      '</div>' +
      '<div class="lg:col-span-5 relative flex justify-center items-center py-6' + rv(2) + '">' +
        '<div class="absolute w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] bg-yellow-accent blob rotate-6 shadow-[0_20px_50px_rgba(255,195,0,0.25)]" aria-hidden="true"></div>' +
        '<div class="absolute -bottom-6 -right-4 w-40 h-40 bg-bright-blue/20 rounded-full blur-2xl" aria-hidden="true"></div>' +
        '<div class="relative z-10 w-[280px] h-[330px] sm:w-[370px] sm:h-[420px] overflow-hidden rounded-[2.5rem] bg-surface-white/20 shadow-2xl">' +
          '<img src="' + U.esc(U.img(p.url_foto) || fb) + '" data-fb="' + U.esc(fb) + '" alt="' + U.esc(nama + (p.profesi ? ' — ' + p.profesi : '')) + '" class="w-full h-full object-cover object-top scale-105 transition-transform duration-500 hover:scale-110" width="370" height="420" fetchpriority="high" decoding="async">' +
        '</div>' +
        (th > 0 ? '<div class="absolute -top-2 right-0 sm:right-6 z-20 bg-surface-white shadow-lift p-space-md rounded-[20px] flex items-center gap-space-sm transition-transform hover:-translate-y-1"><div class="w-12 h-12 rounded-2xl bg-light-blue-tint flex items-center justify-center text-brand-blue font-bold text-headline-sm">' + th + '+</div><div><div class="flex items-center gap-1"><span class="font-label-ui text-label-ui font-bold text-brand-navy">Tahun</span>' + U.ic('favorite', 'text-[16px] text-brand-blue', true) + '</div><p class="font-caption text-caption text-text-secondary leading-none">Pengalaman</p></div></div>' : '') +
        (p.label_status ? '<div class="absolute -bottom-1 left-0 sm:left-4 z-20 bg-surface-white shadow-lift px-space-md py-space-sm rounded-full flex items-center gap-space-xs"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span class="font-label-ui text-[13px] font-semibold text-brand-navy">' + U.esc(p.label_status) + '</span></div>' : '') +
        '<svg class="absolute -left-2 sm:-left-6 top-1/4 w-10 h-10 text-brand-blue opacity-80" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3" viewBox="0 0 50 50" aria-hidden="true"><path d="M5 25 Q15 10 25 25 T45 25"/></svg>' +
        '<div class="absolute right-2 -bottom-4 flex gap-1 opacity-60" aria-hidden="true"><span class="w-2 h-2 rounded-full bg-brand-navy"></span><span class="w-2 h-2 rounded-full bg-brand-navy"></span><span class="w-2 h-2 rounded-full bg-brand-navy"></span></div>' +
      '</div>';
  }

  const JENIS = {
    pendidikan: { label: 'Pendidikan', ikon: 'school', biru: true },
    pengalaman: { label: 'Pengalaman', ikon: 'work', biru: false },
    minat: { label: 'Fokus & Minat', ikon: 'interests', biru: true },
    tujuan_karier: { label: 'Tujuan Karier', ikon: 'rocket_launch', biru: false }
  };
  function renderAbout(D) {
    const p = D.profil, P = D.pengaturan;
    $('#about-h').innerHTML = U.accent(P.judul_tentang || 'Tentang Saya', 'font-hand text-brand-blue text-[1.15em]');
    const cards = (D.tentang || []).map((t, i) => {
      const J = JENIS[t.jenis] || JENIS.minat;
      const detail = [t.periode, t.deskripsi].filter(Boolean).map(U.esc).join(' • ');
      return '<div class="card p-space-lg card-lift' + rv(i) + '">' +
        '<div class="w-12 h-12 rounded-2xl ' + (J.biru ? 'bg-light-blue-tint text-brand-blue' : 'bg-soft-yellow text-tertiary-container') + ' flex items-center justify-center mb-space-md">' + U.ic(J.ikon, 'text-[26px]') + '</div>' +
        '<span class="font-label-caps text-label-caps uppercase ' + (J.biru ? 'text-brand-blue' : 'text-tertiary') + '">' + J.label + '</span>' +
        '<h3 class="text-[18px] leading-snug text-brand-navy font-bold mt-1 mb-space-xs">' + U.esc(t.judul) + '</h3>' +
        (t.instansi ? '<p class="font-body-sm text-body-sm text-brand-navy font-semibold">' + U.esc(t.instansi) + '</p>' : '') +
        (detail ? '<p class="font-caption text-caption text-text-secondary mt-1 leading-relaxed">' + detail + '</p>' : '') +
      '</div>';
    }).join('');
    $('#about').innerHTML =
      '<div class="lg:col-span-5 space-y-space-md text-text-secondary font-body-md text-body-md leading-[1.8]' + rv(0) + '">' +
        U.md(p.ringkasan_tentang || p.deskripsi_singkat || '') +
        (p.filosofi ? '<div class="p-space-lg bg-surface-white rounded-[20px] shadow-card mt-space-lg"><div class="flex items-center gap-space-sm mb-space-xs">' + U.ic('lightbulb', 'text-brand-blue') + '<span class="font-headline-sm text-headline-sm text-brand-navy">Filosofi Desain</span></div><p class="font-body-sm text-body-sm text-text-secondary leading-relaxed">“' + U.esc(p.filosofi) + '”</p></div>' : '') +
      '</div>' +
      '<div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-space-lg">' + (cards || '<p class="text-text-secondary">Belum ada data.</p>') + '</div>';
  }

  function renderSkills(D) {
    const P = D.pengaturan, list = D.keahlian || [];
    $('#skills-h').innerHTML = U.accent(P.judul_keahlian || 'Keahlian Saya', 'font-hand text-brand-blue text-[1.15em]');
    const kat = []; list.forEach((k) => { if (k.kategori && kat.indexOf(k.kategori) === -1) kat.push(k.kategori); });
    if (st.skill !== 'all' && kat.indexOf(st.skill) === -1) st.skill = 'all';
    const pill = (v, l) => '<button type="button" data-f="' + U.esc(v) + '" aria-pressed="' + (st.skill === v) + '" class="shrink-0 whitespace-nowrap px-space-md py-2 rounded-full font-label-ui text-label-ui transition-all ' + (st.skill === v ? 'pill-on' : 'pill-off') + '">' + U.esc(l) + '</button>';
    $('#skill-filters').innerHTML = kat.length > 1 ? pill('all', 'Semua') + kat.map((k) => pill(k, k)).join('') : '';
    $('#skill-filters').hidden = kat.length < 2;
    const vis = list.filter((k) => st.skill === 'all' || k.kategori === st.skill);
    $('#skills').innerHTML = vis.map((k, i) => {
      const biru = i % 2 === 0, lv = Math.max(0, Math.min(100, Number(k.level) || 0));
      return '<div class="card p-4 sm:p-space-lg flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-md' + rv(i) + '">' +
        '<div><div class="flex items-center justify-between mb-space-md"><div class="w-12 h-12 rounded-2xl ' + (biru ? 'bg-light-blue-tint text-brand-blue' : 'bg-soft-yellow text-tertiary-container') + ' flex items-center justify-center">' + U.ic(k.ikon || 'star') + '</div>' +
        '<span class="text-[17px] sm:text-headline-sm text-brand-navy font-bold">' + lv + '%</span></div>' +
        '<h3 class="text-[15px] sm:text-[16px] leading-5 sm:leading-6 text-brand-navy font-semibold mb-space-xs">' + U.esc(k.nama_skill) + '</h3>' +
        (k.deskripsi ? '<p class="hidden sm:block font-caption text-caption text-text-secondary mb-space-md">' + U.esc(k.deskripsi) + '</p>' : '') + '<div class="sm:hidden mb-3"></div></div>' +
        '<div class="w-full bg-border-subtle h-2.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow="' + lv + '" aria-valuemin="0" aria-valuemax="100" aria-label="Tingkat ' + U.esc(k.nama_skill) + '"><div class="bar ' + (biru ? 'bg-brand-blue' : 'bg-yellow-accent') + ' h-full rounded-full transition-[width] duration-700 ease-out" data-w="' + lv + '" style="width:' + (st.rendered || reduce ? lv : 0) + '%"></div></div>' +
      '</div>';
    }).join('') || '<p class="text-text-secondary">Belum ada keahlian.</p>';
    if (!st.rendered && !reduce) observeBars();
  }

  function renderPortfolio(D) {
    const P = D.pengaturan, list = D.portofolio || [];
    $('#port-h').innerHTML = U.accent(P.judul_portofolio || 'Karya terbaru', 'font-hand text-brand-blue text-[1.15em]');
    $('#port-sub').textContent = P.sub_portofolio || '';
    const kat = []; list.forEach((k) => { if (k.kategori && kat.indexOf(k.kategori) === -1) kat.push(k.kategori); });
    if (st.port !== 'all' && kat.indexOf(st.port) === -1) st.port = 'all';
    const chip = (v, l) => '<button type="button" data-f="' + U.esc(v) + '" aria-pressed="' + (st.port === v) + '" class="chip ' + (st.port === v ? 'chip-on' : 'chip-off') + '">' + U.esc(l) + '</button>';
    $('#port-chips').innerHTML = kat.length > 1 ? chip('all', 'Semua') + kat.map((k) => chip(k, k)).join('') : '';
    const vis = list.filter((k) => st.port === 'all' || k.kategori === st.port);
    const W = 'w-[85%] sm:w-[70%] md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]';
    const tr = $('#port-track');
    tr.classList.toggle('is-grid', st.portGrid);
    tr.innerHTML = vis.map((k, i) => {
      const fb = U.cover(k.judul, i), href = U.href(k.url_tautan), tech = String(k.teknologi || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 4);
      const link = href !== '#';
      return '<article class="' + W + ' card overflow-hidden flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl' + rv(i) + '">' +
        '<div class="relative w-full aspect-[16/10] ' + (i % 2 ? 'bg-soft-yellow' : 'bg-light-blue-tint') + ' overflow-hidden">' +
          '<img src="' + U.esc(U.img(k.url_gambar) || fb) + '" data-fb="' + U.esc(fb) + '" alt="Tampilan proyek ' + U.esc(k.judul) + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="' + (i < 3 ? 'eager' : 'lazy') + '" decoding="async" width="640" height="400">' +
          (k.kategori ? '<span class="absolute top-3 left-3 bg-brand-navy/80 backdrop-blur-md text-surface-white font-caption text-caption px-space-sm py-1 rounded-full font-semibold">' + U.esc(k.kategori) + '</span>' : '') +
        '</div>' +
        '<div class="p-space-lg flex-1 flex flex-col justify-between">' +
          '<div>' + (tech.length ? '<div class="flex flex-wrap items-center gap-x-space-xs text-brand-blue font-label-caps text-label-caps uppercase mb-1">' + tech.map(U.esc).join(' <span aria-hidden="true">•</span> ') + '</div>' : '') +
            '<h3 class="font-headline-sm text-headline-sm text-brand-navy group-hover:text-brand-blue transition-colors">' + (link ? '<a href="' + U.esc(href) + '"' + ext(href) + ' data-trk="klik_proyek" data-t="' + U.esc(k.id) + '">' + U.esc(k.judul) + '</a>' : U.esc(k.judul)) + '</h3>' +
            '<p class="font-body-sm text-body-sm text-text-secondary mt-space-xs leading-relaxed line-clamp-3">' + U.esc(k.deskripsi_singkat) + '</p></div>' +
          '<div class="flex items-center justify-between mt-space-lg pt-space-md border-t border-border-subtle/70">' +
            '<span class="font-label-ui text-label-ui text-text-secondary font-medium">' + (link ? 'Buka proyek' : 'Segera hadir') + '</span>' +
            (link ? '<a href="' + U.esc(href) + '"' + ext(href) + ' class="circle-arrow group-hover:scale-110" aria-label="Buka proyek ' + U.esc(k.judul) + '" data-trk="klik_proyek" data-t="' + U.esc(k.id) + '">' + U.ic('arrow_outward', 'text-[20px]') + '</a>' : '<span class="w-12 h-12 rounded-full bg-border-subtle text-text-secondary flex items-center justify-center">' + U.ic('schedule', 'text-[20px]') + '</span>') +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('') || '<p class="text-text-secondary py-10">Belum ada proyek di kategori ini.</p>';
    const btn = $('#port-all');
    btn.hidden = vis.length <= 3;
    btn.setAttribute('aria-pressed', st.portGrid);
    btn.firstElementChild.textContent = st.portGrid ? 'Tampilkan Ringkas' : 'Lihat Semua Proyek';
    $('#port-arrows').classList.toggle('md:flex', !st.portGrid && vis.length > 3);
    tr.scrollLeft = 0;
    dots(tr, $('#port-dots'), !st.portGrid);
  }

  function renderTesti(D) {
    const P = D.pengaturan, list = D.testimoni || [], sec = $('#testimoni');
    sec.hidden = !list.length;
    if (!list.length) return;
    $('#testi-h').innerHTML = U.accent(P.judul_testimoni || 'Testimoni', 'font-hand text-brand-blue text-[1.18em] lowercase');
    $('#testi-sub').textContent = P.sub_testimoni || '';
    $('#testi-track').innerHTML = list.map((t, i) => {
      const fb = U.avatar(t.nama, i % 2 ? '#3B9BFF' : '#2563EB'), r = Math.max(1, Math.min(5, Number(t.rating) || 5));
      return '<figure class="w-[88%] md:w-[calc(50%-0.75rem)] bg-surface-bright rounded-[20px] p-space-lg sm:p-space-xl shadow-card flex flex-col justify-between' + rv(i) + '">' +
        '<div><div class="flex items-center justify-between mb-space-md"><div class="flex items-center gap-1 text-yellow-accent" aria-label="Rating ' + r + ' dari 5">' + Array.from({ length: 5 }, (_, j) => U.ic('star', 'text-[20px]' + (j < r ? '' : ' text-border-subtle'), j < r)).join('') + '</div>' + U.ic('format_quote', 'text-[36px] text-brand-blue/30') + '</div>' +
        '<blockquote class="font-body-lg text-body-lg text-brand-navy leading-relaxed italic mb-space-xl">“' + U.esc(t.isi) + '”</blockquote></div>' +
        '<figcaption class="flex items-center gap-space-md pt-space-md border-t border-border-subtle"><img src="' + U.esc(U.img(t.url_foto) || fb) + '" data-fb="' + U.esc(fb) + '" alt="" class="w-12 h-12 rounded-full object-cover bg-brand-navy/10 shrink-0" loading="lazy" width="48" height="48">' +
        '<div><div class="text-[16px] text-brand-navy font-bold leading-tight">' + U.esc(t.nama) + '</div><div class="font-caption text-caption text-text-secondary mt-0.5">' + U.esc(t.jabatan_instansi) + '</div></div></figcaption>' +
      '</figure>';
    }).join('');
    $('#testi-arrows').hidden = list.length < 3 && w.innerWidth >= 768 ? true : list.length < 2;
  }

  function renderContact(D) {
    const P = D.pengaturan;
    $('#contact-note').textContent = P.kontak_catatan ? '“' + P.kontak_catatan + '” ❤️' : '';
    $('#contact-status').textContent = P.status_proyek || '';
    $('#contact-h').textContent = P.kontak_judul || 'Punya Proyek atau Peluang Kerja Sama?';
    $('#contact-desc').textContent = P.kontak_deskripsi || '';
    $('#contact-links').innerHTML = kontakItems(D).map((k) => {
      const h = U.href(k.url), lbl = /^mailto:/i.test(h) ? h.slice(7) : k.label;
      return '<a class="inline-flex items-center gap-2 bg-surface-white/15 hover:bg-surface-white/25 text-surface-white font-label-ui text-label-ui px-space-md py-2 rounded-full transition-colors" href="' + U.esc(h) + '"' + ext(h) + ' data-trk="klik_kontak" data-t="' + U.esc(k.label) + '">' + U.ic(k.ikon || 'link', 'text-[16px]') + '<span>' + U.esc(lbl) + '</span></a>';
    }).join('');
  }

  function renderFooter(D) {
    const p = D.profil, P = D.pengaturan, nama = p.nama_lengkap || '';
    $('#foot-name').textContent = nama.split(' ')[0] || nama;
    $('#foot-tagline').textContent = P.footer_tagline || '';
    $('#foot-status').textContent = P.status_proyek || '';
    $('#foot-status-ket').textContent = P.status_proyek_ket || '';
    $('#foot-copy').textContent = '© ' + new Date().getFullYear() + ' ' + nama + '. Seluruh hak cipta dilindungi.';
    const li = (ic, html) => '<li class="flex items-center gap-space-xs">' + U.ic(ic, 'text-[18px] text-bright-blue') + html + '</li>';
    $('#foot-contact').innerHTML =
      (P.info_bar_email ? li('mail', '<a class="hover:text-surface-white" href="mailto:' + U.esc(P.info_bar_email) + '" data-trk="klik_kontak" data-t="Email (footer)">' + U.esc(P.info_bar_email) + '</a>') : '') +
      (P.info_bar_telepon ? li('call', '<a class="hover:text-surface-white" href="tel:' + U.esc(P.info_bar_telepon.replace(/[^\d+]/g, '')) + '" data-trk="klik_kontak" data-t="Telepon (footer)">' + U.esc(P.info_bar_telepon) + '</a>') : '') +
      (P.footer_lokasi ? li('location_on', '<span>' + U.esc(P.footer_lokasi) + '</span>') : '');
  }

  function renderMaint(D) {
    const P = D.pengaturan || {};
    $('#maint').hidden = false;
    $('#maint-h').textContent = (D.profil && D.profil.nama_lengkap ? D.profil.nama_lengkap + ' — ' : '') + 'Sedang diperbarui';
    $('#maint-msg').textContent = P.pesan_maintenance || '';
    if (P.info_bar_email) { const a = $('#maint-mail'); a.hidden = false; a.href = 'mailto:' + P.info_bar_email; }
    d.title = P.judul_situs || d.title;
  }

  function setMeta(D) {
    const P = D.pengaturan;
    if (P.judul_situs) d.title = U.plain(P.judul_situs);
    const m = $('meta[name="description"]'); if (m && P.meta_deskripsi) m.setAttribute('content', P.meta_deskripsi);
    U.brand(P.warna_utama);
  }

  // =============== 3. Animasi & interaksi ===============
  let io = null;
  function initReveal() {
    const els = $$('.reveal:not(.in)');
    if (reduce || !('IntersectionObserver' in w)) { els.forEach((e) => e.classList.add('in')); return; }
    io = io || new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((e) => io.observe(e));
  }
  function observeBars() {
    if (!('IntersectionObserver' in w)) { $$('#skills .bar').forEach((b) => { b.style.width = b.dataset.w + '%'; }); return; }
    const o = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.style.width = e.target.dataset.w + '%'; o.unobserve(e.target); } }), { threshold: 0.3 });
    $$('#skills .bar').forEach((b) => o.observe(b));
  }
  function dots(track, box, on) {
    if (!box) return;
    const upd = () => {
      if (!on) { box.innerHTML = ''; return; }
      const cw = Math.max(1, track.clientWidth), maxS = Math.max(0, track.scrollWidth - cw);
      const pages = maxS < 8 ? 1 : Math.ceil((track.scrollWidth - 8) / cw);
      const cur = pages < 2 ? 0 : Math.min(pages - 1, Math.round(track.scrollLeft / maxS * (pages - 1)));
      box.innerHTML = pages < 2 ? '' : Array.from({ length: pages }, (_, i) => '<span class="h-2.5 rounded-full transition-all ' + (i === cur ? 'w-8 bg-brand-blue' : 'w-2.5 bg-border-subtle') + '"></span>').join('');
    };
    track._dots = upd;
    requestAnimationFrame(upd);
  }
  function scrollTrack(track, dir) { track.scrollBy({ left: dir * Math.max(260, track.clientWidth * 0.9), behavior: reduce ? 'auto' : 'smooth' }); }

  function bindOnce() {
    // filter keahlian & portofolio (instan, tanpa server)
    $('#skill-filters').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b || !st.data) return; st.skill = b.dataset.f; renderSkills(st.data); $$('#skills .bar').forEach((x) => { x.style.width = x.dataset.w + '%'; }); $$('#skills .reveal').forEach((x) => x.classList.add('in')); });
    $('#port-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b || !st.data) return; st.port = b.dataset.f; renderPortfolio(st.data); $$('#port-track .reveal').forEach((x) => x.classList.add('in')); });
    $('#port-all').addEventListener('click', () => { st.portGrid = !st.portGrid; renderPortfolio(st.data); $$('#port-track .reveal').forEach((x) => x.classList.add('in')); if (!st.portGrid) $('#portofolio').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); });
    $('#port-arrows').addEventListener('click', (e) => { const b = e.target.closest('[data-dir]'); if (b) scrollTrack($('#port-track'), +b.dataset.dir); });
    $('#testi-arrows').addEventListener('click', (e) => { const b = e.target.closest('[data-dir]'); if (b) scrollTrack($('#testi-track'), +b.dataset.dir); });
    let raf = 0;
    $('#port-track').addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => this._dots && this._dots()); }, { passive: true });
    w.addEventListener('resize', U.debounce(() => { const t = $('#port-track'); if (t._dots) t._dots(); }, 150));
    // menu ponsel
    const mb = $('#menu-btn'), mn = $('#mnav');
    const tutup = () => { mn.classList.add('hidden'); mb.setAttribute('aria-expanded', 'false'); mb.firstElementChild.textContent = 'menu'; mb.setAttribute('aria-label', 'Buka menu'); };
    mb.addEventListener('click', () => { const buka = mn.classList.contains('hidden'); mn.classList.toggle('hidden', !buka); mb.setAttribute('aria-expanded', String(buka)); mb.firstElementChild.textContent = buka ? 'close' : 'menu'; mb.setAttribute('aria-label', buka ? 'Tutup menu' : 'Buka menu'); });
    mn.addEventListener('click', (e) => { if (e.target.closest('a')) tutup(); });
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') tutup(); });
    // scrollspy
    if ('IntersectionObserver' in w) {
      const links = $$('.nav-link');
      const spy = new IntersectionObserver((ents) => ents.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => { const on = a.dataset.nav === e.target.id; a.classList.toggle('!text-brand-blue', on); a.classList.toggle('font-bold', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      }), { rootMargin: '-45% 0px -50% 0px' });
      ['beranda', 'tentang', 'keahlian', 'portofolio', 'kontak'].forEach((id) => { const s = d.getElementById(id); if (s) spy.observe(s); });
    }
    // dialog privasi
    d.addEventListener('click', (e) => {
      const o = e.target.closest('[data-open]'); if (o) { const dl = d.getElementById(o.dataset.open); if (dl && dl.showModal) dl.showModal(); }
      const c = e.target.closest('[data-close]'); if (c) c.closest('dialog').close();
      if (e.target.tagName === 'DIALOG') e.target.close();
    });
    $('#load-retry').addEventListener('click', () => muat(true));
    bindForm();
  }

  // =============== 4. Formulir kontak (F8) ===============
  function bindForm() {
    const f = $('#contact-form'), msg = $('#c-pesan'), cnt = $('#c-count'), btn = $('#c-submit');
    const formT0 = Date.now();
    msg.addEventListener('input', () => { cnt.textContent = msg.value.length + ' / 1000'; });
    const tampil = (ok, teks) => { $('#c-err').hidden = ok; $('#c-ok').hidden = !ok; $(ok ? '#c-ok-msg' : '#c-err-msg').textContent = teks; };
    const tandai = (el, salah) => { el.classList.toggle('is-invalid', salah); el.setAttribute('aria-invalid', String(salah)); };
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      $('#c-err').hidden = true; $('#c-ok').hidden = true;
      const nama = $('#c-nama').value.trim(), email = $('#c-email').value.trim(), pesan = msg.value.trim();
      const errs = [];
      tandai($('#c-nama'), nama.length < 2); if (nama.length < 2) errs.push('nama');
      const emOk = /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}$/i.test(email); tandai($('#c-email'), !emOk); if (!emOk) errs.push('email');
      tandai(msg, pesan.length < 5); if (pesan.length < 5) errs.push('pesan');
      if (errs.length) { tampil(false, 'Format email tidak valid atau kolom masih belum lengkap.'); f.querySelector('.is-invalid').focus(); return; }
      if (/<\s*\/?\s*[a-z!][^>]*>|javascript\s*:/i.test(nama + pesan)) { tampil(false, 'Pesan tidak boleh berisi kode HTML atau skrip.'); return; }
      const asli = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = U.ic('progress_activity', 'text-[20px] spin') + '<span>Mengirim...</span>';
      try {
        const r = await api('pesan.kirim', { nama, email, pesan, hp: $('#c-web').value, t: Date.now() - formT0, fp: U.fp() });
        if (r.success) { tampil(true, r.message || 'Pesan terkirim!'); f.reset(); cnt.textContent = '0 / 1000'; }
        else tampil(false, r.message || 'Pesan gagal dikirim.');
      } catch (err) { tampil(false, err.message); }
      finally { btn.disabled = false; btn.innerHTML = asli; }
    });
  }

  // =============== 5. Muat data (SWR) ===============
  function render(D) {
    if (D.maintenance) { renderMaint(D); return; }
    $('#maint').hidden = true;
    setMeta(D); renderInfoBar(D); renderHeader(D); renderHero(D); renderAbout(D); renderSkills(D); renderPortfolio(D); renderTesti(D); renderContact(D); renderFooter(D);
    if (!st.rendered) { st.rendered = true; requestAnimationFrame(initReveal); }
    else $$('.reveal:not(.in)').forEach((e) => e.classList.add('in'));
  }
  async function muat(manual) {
    $('#load-err').hidden = true;
    if (!KONFIG_OK) {
      const wv = $('#cfg-warn'); wv.hidden = false;
      wv.textContent = '⚙️ Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL /exec dari Apps Script, lalu push ulang.';
      if (!st.data) gagal('Backend belum terhubung (GAS_URL belum diisi).');
      return;
    }
    try {
      const r = await api('public', {}, { get: true, read: true });
      if (!r.success) throw new Error(r.message || 'Gagal memuat konten.');
      const D = r.data;
      if (!st.data || st.data.h !== D.h) { st.data = D; render(D); }
      Store.set(KEY, D);
      catatKunjungan();
    } catch (e) {
      if (!st.data) gagal(e.message);
      else if (manual) U.toast(e.message, 'error');
    }
  }
  function gagal(pesan) { $('#load-err').hidden = false; $('#load-err-msg').textContent = 'Konten belum bisa dimuat. ' + pesan; }

  // =============== 6. Mulai ===============
  bindOnce();
  const cached = Store.get(KEY);
  if (cached && cached.h && (cached.profil || cached.maintenance)) { st.data = cached; render(cached); }
  muat();
  w.PF.app = { st, Track };
})(window, document);
