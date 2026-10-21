/*!
 * admin-views.js — 11 modul dashboard (A1–A11) + Migrasi Data
 * Semua tampilan dirender dari state di memori → pindah menu instan.
 * Perubahan diterapkan ke layar lebih dulu (optimistis) lalu disimpan berurutan ke server.
 */
(function (w, d) {
  'use strict';
  const PF = w.PF, U = PF.U, esc = U.esc, ic = U.ic;
  let C = null;                                     // konteks dari admin.js
  const $ = (s, r) => (r || d).querySelector(s);
  const $$ = (s, r) => Array.from((r || d).querySelectorAll(s));
  const H = {};                                     // handler klik: data-v="nama"
  const F = {};                                     // handler submit: data-form="nama"
  const INP = 'field !rounded-[10px] px-4 py-2.5';
  const LBL = 'block font-label-ui text-label-ui text-brand-navy mb-1.5';
  const HELP = 'font-caption text-caption text-text-secondary mt-1';
  const LIST = { Tentang: 'tentang', Keahlian: 'keahlian', Portofolio: 'portofolio', Testimoni: 'testimoni', Kontak: 'kontak' };
  const PREFIX = { Tentang: 'ttg', Keahlian: 'skl', Portofolio: 'prj', Testimoni: 'tst', Kontak: 'ktk' };
  const CHART = ['#2563EB', '#E5A100', '#7C5CD6'];          // palet kategori tervalidasi (CVD aman)
  /*ICONS*/const ICON_SET = ['design_services', 'psychology', 'code', 'terminal', 'cloud_sync', 'devices', 'bar_chart', 'insights', 'palette', 'brush', 'draw', 'edit',
    'photo_camera', 'analytics', 'database', 'api', 'data_object', 'web', 'smartphone', 'language', 'campaign', 'school', 'groups', 'handshake',
    'lightbulb', 'auto_awesome', 'bolt', 'build', 'settings', 'storage', 'table_chart', 'functions', 'animation', 'layers', 'dashboard', 'search',
    'speed', 'security', 'public', 'translate', 'record_voice_over', 'movie', 'music_note', 'storefront', 'shopping_cart', 'account_tree', 'hub',
    'integration_instructions', 'smart_toy', 'extension', 'rocket_launch', 'work', 'star', 'link', 'chat', 'mail', 'call', 'share', 'forum',
    'video_library', 'article', 'rss_feed', 'travel_explore', 'favorite', 'interests', 'verified', 'trending_up', 'location_on', 'calendar_today', 'payments'];
  const rnd = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
  const newId = (sheet) => PREFIX[sheet] + '-' + Date.now().toString(36) + rnd(5);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const S = () => C.A.S;
  const K = () => S().konten;
  const isDemo = (id) => String(id || '').indexOf('demo-') === 0;
  const demoBadge = (id) => isDemo(id) ? '<span class="font-caption text-[11px] px-2 py-0.5 rounded-full bg-soft-yellow text-tertiary font-bold">Contoh</span>' : '';
  const ui = { range: Number(PF.Store.get('pf_adm_range', 30)) || 30, pesan: { f: 'semua', q: '', sel: {}, n: 50 }, stat: { r: 30, dari: '', sampai: '', tab: 'log', q: '', jenis: '', n: 50 }, set: 'situs', mig: null, migBusy: false };
  const STATS = {};                                   // cache memori admin.stats per rentang

  // ===================================================================
  // KOMPONEN DASAR
  // ===================================================================
  function head(title, sub, actions) {
    return '<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-white p-space-md sm:p-space-lg rounded-[20px] shadow-sm">' +
      '<div class="min-w-0"><h1 class="font-headline-md text-[22px] sm:text-headline-md leading-tight text-text-primary">' + title + '</h1>' + (sub ? '<p class="font-body-sm text-body-sm text-text-secondary mt-0.5">' + sub + '</p>' : '') + '</div>' +
      (actions ? '<div class="flex items-center gap-space-sm flex-wrap">' + actions + '</div>' : '') + '</div>';
  }
  const page = (inner) => '<div class="flex flex-col w-full gap-space-md sm:gap-space-lg">' + inner + '</div>';
  const box = (inner, cls) => '<div class="bg-surface-white p-space-md sm:p-space-lg rounded-[20px] shadow-sm ' + (cls || '') + '">' + inner + '</div>';
  function empty(icon, title, text, action) {
    return '<div class="text-center py-10 px-4"><div class="w-14 h-14 mx-auto rounded-2xl bg-light-blue-tint text-brand-blue flex items-center justify-center mb-3">' + ic(icon, 'text-[28px]') + '</div>' +
      '<p class="font-label-ui text-label-ui text-brand-navy">' + title + '</p>' + (text ? '<p class="font-body-sm text-body-sm text-text-secondary mt-1 max-w-sm mx-auto">' + text + '</p>' : '') + (action || '') + '</div>';
  }
  function sw(on, attrs, label) {
    return '<button type="button" role="switch" aria-checked="' + !!on + '"' + (label ? ' aria-label="' + esc(label) + '"' : '') + ' ' + attrs + ' class="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ' + (on ? 'bg-brand-blue' : 'bg-surface-dim') + '"><span class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-surface-white shadow transition-transform ' + (on ? 'translate-x-5' : '') + '"></span></button>';
  }
  const iconBtn = (icon, v, attrs, label, cls) => '<button type="button" data-v="' + v + '" ' + (attrs || '') + ' class="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-light-blue-tint hover:text-brand-blue transition-colors ' + (cls || '') + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">' + ic(icon, 'text-[20px]') + '</button>';
  function inp(name, label, val, o) {
    o = o || {};
    const id = 'f-' + name;
    const ctl = o.area ? '<textarea id="' + id + '" name="' + name + '" rows="' + (o.rows || 3) + '" class="' + INP + ' !rounded-[12px]"' + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.req ? ' required' : '') + ' placeholder="' + esc(o.ph || '') + '">' + esc(val) + '</textarea>'
      : o.sel ? '<select id="' + id + '" name="' + name + '" class="' + INP + '">' + o.sel.map((x) => '<option value="' + esc(x[0]) + '"' + (String(val) === String(x[0]) ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select>'
      : '<input id="' + id + '" name="' + name + '" type="' + (o.type || 'text') + '" value="' + esc(val) + '" class="' + INP + '"' + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.min !== undefined ? ' min="' + o.min + '"' : '') + (o.maxv !== undefined ? ' max="' + o.maxv + '"' : '') + (o.req ? ' required' : '') + (o.list ? ' list="' + o.list + '"' : '') + (o.mode ? ' inputmode="' + o.mode + '"' : '') + ' placeholder="' + esc(o.ph || '') + '" autocomplete="off">';
    return '<div class="' + (o.cls || '') + '"><label for="' + id + '" class="' + LBL + '">' + esc(label) + (o.req ? ' *' : '') + '</label>' + ctl + (o.help ? '<p class="' + HELP + '">' + o.help + '</p>' : '') + '</div>';
  }
  function loading() {
    return page('<div class="sk h-24 rounded-[20px]"></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">' + '<div class="sk h-36 rounded-[20px]"></div>'.repeat(4) + '</div><div class="grid lg:grid-cols-12 gap-space-md"><div class="sk h-80 rounded-[20px] lg:col-span-7"></div><div class="sk h-80 rounded-[20px] lg:col-span-5"></div></div>');
  }
  function errorBox(msg) {
    return box(empty('cloud_off', 'Data dashboard belum bisa dimuat', esc(msg), '<button type="button" data-v="retry" class="btn-primary btn-sm mt-4">Coba lagi</button>'));
  }
  H.retry = () => C.bootData(true);

  // ---------- Modal & konfirmasi ----------
  function modal(o) {
    const dl = $('#dlg');
    dl.className = 'dlg' + (o.wide ? ' !w-[min(760px,calc(100vw-2rem))]' : '');
    dl.innerHTML = '<form method="dialog" class="flex flex-col max-h-[calc(100dvh-2rem)]" novalidate>' +
      '<div class="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-border-subtle"><h2 class="font-headline-sm text-headline-sm text-brand-navy">' + o.title + '</h2>' +
      '<button type="button" data-close class="w-9 h-9 rounded-full hover:bg-light-blue-tint flex items-center justify-center" aria-label="Tutup">' + ic('close') + '</button></div>' +
      '<div class="px-5 sm:px-6 py-5 overflow-y-auto space-y-4">' + o.body + '</div>' +
      (o.submit === false ? '' : '<div class="flex justify-end gap-2 px-5 sm:px-6 py-4 border-t border-border-subtle bg-input-bg rounded-b-[24px]"><button type="button" data-close class="btn-ghost btn-sm">Batal</button><button type="submit" value="ok" class="btn-primary btn-sm !py-2.5">' + (o.submit || 'Simpan') + '</button></div>') +
      '</form>';
    const f = dl.querySelector('form');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const bad = $$('[required]', f).find((x) => !String(x.value).trim());
      if (bad) { bad.classList.add('is-invalid'); bad.focus(); return; }
      const res = o.onSubmit(f, dl);
      if (res !== false) dl.close();
    });
    dl.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dl.close()));
    dl.addEventListener('click', (e) => { if (e.target === dl) dl.close(); }, { once: true });
    dl.showModal();
    if (o.onOpen) o.onOpen(f, dl);
    const first = f.querySelector('input:not([type=hidden]):not([type=file]),textarea,select'); if (first && !o.noFocus) first.focus();
    return dl;
  }
  function confirmBox(o) {
    return new Promise((res) => {
      const dl = $('#dlg2');
      dl.innerHTML = '<div class="p-6"><div class="w-12 h-12 rounded-2xl ' + (o.danger ? 'bg-error-container text-error' : 'bg-light-blue-tint text-brand-blue') + ' flex items-center justify-center mb-4">' + ic(o.danger ? 'warning' : 'help') + '</div>' +
        '<h2 class="font-headline-sm text-headline-sm text-brand-navy mb-1">' + esc(o.title) + '</h2><p class="font-body-sm text-body-sm text-text-secondary">' + (o.html || esc(o.text || '')) + '</p>' +
        '<div class="flex justify-end gap-2 mt-6"><button type="button" data-r="0" class="btn-ghost btn-sm">Batal</button><button type="button" data-r="1" class="btn btn-sm ' + (o.danger ? 'bg-error text-surface-white hover:brightness-110' : 'bg-brand-blue text-surface-white hover:bg-primary') + '">' + esc(o.ok || 'Ya') + '</button></div></div>';
      let done = false;
      const fin = (v) => { if (done) return; done = true; dl.close(); res(v); };
      dl.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => fin(b.dataset.r === '1')));
      dl.addEventListener('close', () => fin(false), { once: true });
      dl.showModal(); dl.querySelector('[data-r="1"]').focus();
    });
  }

  // ---------- Unggah gambar (kompres di browser, ≤ 2 MB) ----------
  function bacaGambar(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => res({ im, url }); im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Berkas bukan gambar yang bisa dibaca.')); };
      im.src = url;
    });
  }
  async function kompres(file, maxDim) {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('Format harus JPG, PNG, WEBP, atau GIF.');
    const toB64 = (blob) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
    const { im, url } = await bacaGambar(file);
    const besar = Math.max(im.naturalWidth, im.naturalHeight);
    if (file.type === 'image/gif') { if (file.size > 2 * 1024 * 1024) throw new Error('GIF melebihi 2 MB.'); return { data: await toB64(file), mime: file.type, url, size: file.size }; }
    if ((file.type === 'image/png' || file.type === 'image/webp') && file.size <= 1.5 * 1024 * 1024 && besar <= maxDim) return { data: await toB64(file), mime: file.type, url, size: file.size };
    let skala = Math.min(1, maxDim / besar), q = 0.86, blob = null;
    for (let i = 0; i < 8; i++) {
      const cv = d.createElement('canvas'); cv.width = Math.round(im.naturalWidth * skala); cv.height = Math.round(im.naturalHeight * skala);
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0, cv.width, cv.height);
      blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', q));
      if (blob && blob.size <= 1.9 * 1024 * 1024) break;
      if (q > 0.62) q -= 0.08; else skala *= 0.8;
    }
    if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('Gambar terlalu besar walau sudah dikompres. Pilih gambar lain.');
    return { data: await toB64(blob), mime: 'image/jpeg', url, size: blob.size };
  }
  /** Pasang unggahan pada elemen: input[type=file][data-up=jenis] → isi input[name=target] */
  function pasangUnggah(root) {
    $$('input[type=file][data-up]', root).forEach((fi) => {
      fi.addEventListener('change', async () => {
        const file = fi.files && fi.files[0]; if (!file) return;
        const tgt = root.querySelector('[name="' + fi.dataset.target + '"]'), prev = root.querySelector(fi.dataset.preview), st = root.querySelector(fi.dataset.status);
        const lapor = (t, cls) => { if (st) { st.textContent = t; st.className = 'font-caption text-caption ' + (cls || 'text-text-secondary'); } };
        try {
          lapor('Mengompres gambar…');
          const k = await kompres(file, fi.dataset.up === 'foto' ? 1200 : 1600);
          if (prev) prev.src = k.url;
          lapor('Mengunggah ' + Math.round(k.size / 1024) + ' KB ke Google Drive…', 'text-brand-blue');
          const sub = root.querySelector('[type=submit]'); if (sub) sub.disabled = true;
          const r = await C.adm('unggah.gambar', { jenis: fi.dataset.up, nama: file.name, mime: k.mime, data: k.data });
          if (sub) sub.disabled = false;
          if (!r.success) throw new Error(r.message);
          if (tgt) { tgt.value = r.data.url; tgt.dispatchEvent(new Event('input', { bubbles: true })); }
          lapor(r.data.publik ? 'Terunggah ✓ — jangan lupa simpan.' : r.message, r.data.publik ? 'text-success' : 'text-tertiary');
        } catch (e) { lapor(e.message, 'text-error'); const sub = root.querySelector('[type=submit]'); if (sub) sub.disabled = false; }
        fi.value = '';
      });
    });
  }
  function unggahUI(jenis, name, val, lbl, bulat) {
    const fb = jenis === 'foto' ? U.avatar(K().profil.nama_lengkap) : U.cover(lbl || 'Gambar', 0);
    return '<div class="flex flex-col ' + (bulat ? '' : 'sm:flex-row ') + 'gap-4 items-start">' +
      '<img id="prev-' + name + '" src="' + esc(U.img(val) || fb) + '" data-fb="' + esc(fb) + '" alt="Pratinjau" class="' + (bulat ? 'w-28 h-32 rounded-[20px]' : 'w-full sm:w-48 aspect-[16/10] rounded-2xl') + ' object-cover bg-light-blue-tint shrink-0">' +
      '<div class="flex-1 w-full space-y-2">' +
        '<label class="btn-light btn-sm !py-2.5 cursor-pointer">' + ic('upload', 'text-[18px]') + '<span>Unggah gambar</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="sr-only" data-up="' + jenis + '" data-target="' + name + '" data-preview="#prev-' + name + '" data-status="#st-' + name + '"></label>' +
        '<p id="st-' + name + '" class="font-caption text-caption text-text-secondary">JPG/PNG/WEBP, otomatis dikompres ≤ 2 MB.</p>' +
        '<input name="' + name + '" value="' + esc(val) + '" class="' + INP + '" placeholder="atau tempel URL https:// / link berbagi Google Drive" data-imgurl="#prev-' + name + '">' +
      '</div></div>';
  }

  // ---------- Pustaka ekspor (dimuat saat dibutuhkan) ----------
  const libs = {};
  function muatLib(url, cek) {
    if (cek()) return Promise.resolve();
    if (libs[url]) return libs[url];
    libs[url] = new Promise((res, rej) => { const s = d.createElement('script'); s.src = url; s.async = true; s.onload = () => res(); s.onerror = () => { delete libs[url]; rej(new Error('Pustaka ekspor gagal dimuat. Periksa koneksi.')); }; d.head.appendChild(s); });
    return libs[url];
  }
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const AUTOTABLE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
  async function eksporXlsx(nama, sheets) {
    U.toast('Menyiapkan berkas Excel…');
    await muatLib(XLSX_URL, () => !!w.XLSX);
    const wb = w.XLSX.utils.book_new();
    sheets.forEach((s) => { const ws = w.XLSX.utils.aoa_to_sheet(s.rows); ws['!cols'] = (s.rows[0] || []).map((_, i) => ({ wch: Math.min(60, Math.max(10, ...s.rows.slice(0, 200).map((r) => String(r[i] === undefined ? '' : r[i]).length + 2))) })); w.XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31)); });
    w.XLSX.writeFile(wb, nama + '.xlsx');
  }
  async function eksporPdf(nama, o) {
    U.toast('Menyiapkan berkas PDF…');
    await muatLib(JSPDF_URL, () => !!(w.jspdf && w.jspdf.jsPDF));
    await muatLib(AUTOTABLE_URL, () => !!(w.jspdf && w.jspdf.jsPDF && w.jspdf.jsPDF.API.autoTable));
    const doc = new w.jspdf.jsPDF({ orientation: o.landscape ? 'l' : 'p', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(11, 31, 58); doc.rect(0, 0, W, 64, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(o.title, 36, 30);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(o.subtitle || '', 36, 48);
    let y = 86;
    (o.kpi || []).forEach((k, i) => {
      const x = 36 + (i % 4) * ((W - 72) / 4);
      if (i && i % 4 === 0) y += 58;
      doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.roundedRect(x, y, (W - 72) / 4 - 8, 48, 6, 6, 'FD');
      doc.setTextColor(91, 100, 114); doc.setFontSize(8); doc.text(String(k[0]), x + 8, y + 16);
      doc.setTextColor(11, 31, 58); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(String(k[1]), x + 8, y + 36); doc.setFont('helvetica', 'normal');
    });
    if (o.kpi && o.kpi.length) y += 68;
    (o.tables || []).forEach((t) => {
      doc.setTextColor(11, 31, 58); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(t.title, 36, y); doc.setFont('helvetica', 'normal');
      doc.autoTable({ startY: y + 8, head: [t.head], body: t.body.length ? t.body : [[{ content: 'Tidak ada data', colSpan: t.head.length }]], margin: { left: 36, right: 36 }, styles: { fontSize: 8.5, cellPadding: 4, overflow: 'linebreak' }, headStyles: { fillColor: [37, 99, 235], textColor: 255 }, alternateRowStyles: { fillColor: [248, 250, 252] }, columnStyles: t.colStyles || {} });
      y = doc.lastAutoTable.finalY + 26;
      if (y > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); y = 50; }
    });
    const n = doc.internal.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(115, 118, 134); doc.text('Dibuat ' + new Date().toLocaleString('id-ID') + ' · halaman ' + i + '/' + n, 36, doc.internal.pageSize.getHeight() - 20); }
    doc.save(nama + '.pdf');
  }
  const tglFile = () => new Date().toISOString().slice(0, 10);

  // ===================================================================
  // GRAFIK (SVG digambar sesuai lebar asli → teks tajam, ada tooltip)
  // ===================================================================
  function niceMax(v) { if (v <= 5) return 5; const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  const kompak = (n) => n >= 1e6 ? (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : n >= 1000 ? (n / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' rb' : String(n);
  function monoPath(p) {
    const n = p.length; if (!n) return ''; if (n === 1) return 'M' + p[0][0] + ',' + p[0][1];
    const dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = p[i + 1][0] - p[i][0]; m[i] = (p[i + 1][1] - p[i][1]) / (dx[i] || 1); }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) { if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; } const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b; if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; } }
    let s = 'M' + p[0][0].toFixed(1) + ',' + p[0][1].toFixed(1);
    for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3; s += ' C' + (p[i][0] + h).toFixed(1) + ',' + (p[i][1] + t[i] * h).toFixed(1) + ' ' + (p[i + 1][0] - h).toFixed(1) + ',' + (p[i + 1][1] - t[i + 1] * h).toFixed(1) + ' ' + p[i + 1][0].toFixed(1) + ',' + p[i + 1][1].toFixed(1); }
    return s;
  }
  /** Grafik garis + area satu seri dengan crosshair & tooltip. rows: [{d:'2026-10-01', v, v2}] */
  function lineChart(el, rows, o) {
    o = o || {};
    if (!el) return;
    const draw = () => {
      const Wd = Math.max(260, el.clientWidth), Hd = o.h || 250, L = 40, R = 14, T = 16, B = 28;
      const n = rows.length, vals = rows.map((r) => r.v), max = niceMax(Math.max(1, ...vals));
      const x = (i) => L + (n < 2 ? (Wd - L - R) / 2 : i * (Wd - L - R) / (n - 1)), y = (v) => T + (Hd - T - B) * (1 - v / max);
      const pts = rows.map((r, i) => [x(i), y(r.v)]);
      const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
      const xl = []; const step = Math.max(1, Math.ceil(n / (Wd < 480 ? 4 : 6)));
      for (let i = 0; i < n; i += step) xl.push(i);
      if (n > 1 && xl[xl.length - 1] !== n - 1) { if (x(n - 1) - x(xl[xl.length - 1]) < 64) xl.pop(); xl.push(n - 1); }
      const fmt = (iso) => U.date(iso + 'T00:00:00', { day: '2-digit', month: 'short' });
      const line = monoPath(pts), gid = 'g' + Math.random().toString(36).slice(2, 7);
      const last = pts[n - 1];
      el.innerHTML = '<div class="relative"><svg width="' + Wd + '" height="' + Hd + '" viewBox="0 0 ' + Wd + ' ' + Hd + '" role="img" aria-label="' + esc(o.label || 'Grafik') + '" class="block overflow-visible">' +
        '<defs><linearGradient id="' + gid + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="rgb(var(--c-brand))" stop-opacity=".22"/><stop offset="1" stop-color="rgb(var(--c-brand))" stop-opacity="0"/></linearGradient></defs>' +
        ticks.map((tv) => '<line x1="' + L + '" x2="' + (Wd - R) + '" y1="' + y(tv) + '" y2="' + y(tv) + '" stroke="#E2E8F0" stroke-width="1"/><text x="' + (L - 8) + '" y="' + (y(tv) + 4) + '" text-anchor="end" font-size="11" fill="#5B6472">' + kompak(tv) + '</text>').join('') +
        (n ? '<path d="' + line + ' L' + last[0] + ',' + y(0) + ' L' + pts[0][0] + ',' + y(0) + ' Z" fill="url(#' + gid + ')"/><path d="' + line + '" fill="none" stroke="rgb(var(--c-brand))" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' : '') +
        xl.map((i) => '<text x="' + x(i) + '" y="' + (Hd - 6) + '" text-anchor="' + (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '" font-size="11" fill="#5B6472">' + fmt(rows[i].d) + '</text>').join('') +
        (n ? '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="5" fill="rgb(var(--c-brand))" stroke="#fff" stroke-width="2"/><text x="' + Math.min(last[0], Wd - R) + '" y="' + Math.max(12, last[1] - 12) + '" text-anchor="end" font-size="12" font-weight="700" fill="#0B1F3A">' + U.num(rows[n - 1].v) + '</text>' : '') +
        '<g class="hov" style="display:none"><line class="hx" y1="' + T + '" y2="' + y(0) + '" stroke="rgb(var(--c-brand))" stroke-width="1"/><circle class="hc" r="6" fill="#FFC300" stroke="#0B1F3A" stroke-width="2.5"/></g>' +
        '<rect x="' + L + '" y="0" width="' + (Wd - L - R) + '" height="' + Hd + '" fill="transparent" class="hit" style="cursor:crosshair"/></svg>' +
        '<div class="tip hidden absolute pointer-events-none bg-brand-navy text-surface-white px-3.5 py-2.5 rounded-xl shadow-lg font-caption text-caption whitespace-nowrap z-10"></div></div>';
      const svg = el.querySelector('svg'), hov = svg.querySelector('.hov'), tip = el.querySelector('.tip');
      const show = (cx) => {
        if (!n) return;
        const i = Math.max(0, Math.min(n - 1, Math.round((cx - L) / ((Wd - L - R) / Math.max(1, n - 1)))));
        hov.style.display = ''; hov.querySelector('.hx').setAttribute('x1', x(i)); hov.querySelector('.hx').setAttribute('x2', x(i));
        hov.querySelector('.hc').setAttribute('cx', x(i)); hov.querySelector('.hc').setAttribute('cy', y(rows[i].v));
        tip.innerHTML = '<div class="text-outline-variant mb-1">' + U.date(rows[i].d + 'T00:00:00', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + '</div><div class="flex gap-4"><div><div class="text-outline-variant">' + esc(o.n1 || 'Kunjungan') + '</div><div class="font-label-ui text-label-ui font-bold">' + U.num(rows[i].v) + '</div></div>' +
          (o.n2 ? '<div class="w-px bg-surface-white/20"></div><div><div class="text-outline-variant">' + esc(o.n2) + '</div><div class="font-label-ui text-label-ui font-bold text-yellow-accent">' + U.num(rows[i].v2 || 0) + '</div></div>' : '') + '</div>';
        tip.classList.remove('hidden');
        const tw = tip.offsetWidth; let lx = x(i) - tw / 2; lx = Math.max(0, Math.min(Wd - tw, lx));
        tip.style.left = lx + 'px'; tip.style.top = Math.max(0, y(rows[i].v) - tip.offsetHeight - 14) + 'px';
      };
      const hit = svg.querySelector('.hit');
      hit.addEventListener('pointermove', (e) => { const b = svg.getBoundingClientRect(); show(e.clientX - b.left); });
      hit.addEventListener('pointerdown', (e) => { const b = svg.getBoundingClientRect(); show(e.clientX - b.left); });
      hit.addEventListener('pointerleave', () => { hov.style.display = 'none'; tip.classList.add('hidden'); });
    };
    draw();
    if ('ResizeObserver' in w) { let lw = el.clientWidth; const ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - lw) > 8 && d.body.contains(el)) { lw = el.clientWidth; draw(); } else if (!d.body.contains(el)) ro.disconnect(); }); ro.observe(el); }
  }
  /** Batang horizontal satu warna (warna mengikuti entitas, bukan peringkat). items: [[label, nilai, sub?]] */
  function hbars(items, o) {
    o = o || {};
    if (!items.length) return empty(o.ic || 'bar_chart', o.kosong || 'Belum ada data', o.kosongSub || '');
    const max = Math.max(1, ...items.map((x) => x[1])), tot = items.reduce((a, x) => a + x[1], 0) || 1;
    return '<div class="flex flex-col gap-space-md">' + items.map((x, i) => '<div class="flex flex-col gap-1.5" title="' + esc(x[0]) + ': ' + U.num(x[1]) + '">' +
      '<div class="flex items-center justify-between gap-2"><span class="font-label-ui text-label-ui text-text-primary truncate">' + (o.rank ? (i + 1) + '. ' : '') + esc(x[0]) + '</span>' +
      '<span class="flex items-center gap-2 shrink-0"><span class="font-label-ui text-label-ui text-text-primary font-bold">' + U.num(x[1]) + '</span><span class="text-caption font-caption px-1.5 py-0.5 rounded bg-light-blue-tint text-brand-blue font-bold">' + U.pct(x[1] / tot * 100) + '</span></span></div>' +
      '<div class="w-full bg-surface-container-low h-3 rounded-full overflow-hidden"><div class="h-full rounded-r-[4px] ' + (o.kuning ? 'bg-yellow-accent' : 'bg-brand-blue') + '" style="width:' + Math.max(2, x[1] / max * 100) + '%"></div></div></div>').join('') + '</div>';
  }
  /** Donat dengan celah 2px + legenda berlabel (identitas tidak bergantung warna saja). */
  function donut(items) {
    const tot = items.reduce((a, x) => a + x[1], 0);
    if (!tot) return empty('devices', 'Belum ada data perangkat');
    const R = 52, Cc = 2 * Math.PI * R; let off = 0;
    const seg = items.map((x, i) => { const len = x[1] / tot * Cc, gap = items.length > 1 ? 2 : 0; const s = '<circle r="' + R + '" cx="70" cy="70" fill="none" stroke="' + CHART[i % 3] + '" stroke-width="18" stroke-dasharray="' + Math.max(0, len - gap).toFixed(2) + ' ' + (Cc - Math.max(0, len - gap)).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 70 70)"><title>' + esc(x[0]) + ': ' + U.num(x[1]) + ' (' + U.pct(x[1] / tot * 100) + ')</title></circle>'; off += len; return s; }).join('');
    return '<div class="flex flex-col sm:flex-row items-center gap-6"><svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Proporsi perangkat">' + seg + '<text x="70" y="68" text-anchor="middle" font-size="20" font-weight="800" fill="#0B1F3A">' + kompak(tot) + '</text><text x="70" y="86" text-anchor="middle" font-size="11" fill="#5B6472">kunjungan</text></svg>' +
      '<ul class="flex-1 w-full space-y-2">' + items.map((x, i) => '<li class="flex items-center justify-between gap-3 font-body-sm text-body-sm"><span class="flex items-center gap-2 text-text-primary"><span class="w-3 h-3 rounded-full" style="background:' + CHART[i % 3] + '"></span>' + esc(x[0]) + '</span><span class="font-semibold text-text-primary">' + U.num(x[1]) + ' <span class="text-text-secondary font-normal">(' + U.pct(x[1] / tot * 100) + ')</span></span></li>').join('') + '</ul></div>';
  }
  const LABEL_DEV = { mobile: 'Ponsel', desktop: 'Laptop / PC', tablet: 'Tablet' };
  const sortObj = (o, n) => Object.keys(o || {}).map((k) => [k, o[k]]).sort((a, b) => b[1] - a[1]).slice(0, n || 99);
  function namaProyek(id) { const p = (K().portofolio || []).find((x) => x.id === id); return p ? p.judul : (id ? id + ' (dihapus)' : '(tanpa label)'); }

  // ===================================================================
  // CRUD KONTEN GENERIK (optimistis + urutan tulis terjamin)
  // ===================================================================
  function simpanItem(sheet, item, pesan) {
    const key = LIST[sheet], list = K()[key], snap = clone(list);
    const i = list.findIndex((x) => x.id === item.id);
    if (i > -1) list[i] = Object.assign({}, list[i], item); else { item.urutan = item.urutan || (Math.max(0, ...list.map((x) => Number(x.urutan) || 0)) + 1); list.push(item); }
    C.render({ bg: true }); C.persist();
    C.Writer.run('konten.simpan', { sheet, item }, {
      label: 'Simpan', pesan: pesan || 'Tersimpan.',
      ok: (r) => { const j = K()[key].findIndex((x) => x.id === item.id); if (j > -1 && r.data && r.data.item) { K()[key][j] = r.data.item; C.render({ bg: true }); } },
      fail: () => { K()[key] = snap; C.render({ bg: true }); }
    });
  }
  async function hapusItem(sheet, id) {
    const key = LIST[sheet], it = K()[key].find((x) => x.id === id);
    if (!it || !(await confirmBox({ title: 'Hapus data ini?', text: '"' + (it.judul || it.nama_skill || it.nama || it.label) + '" akan dihapus dari situs.', ok: 'Hapus', danger: true }))) return;
    const snap = clone(K()[key]);
    K()[key] = K()[key].filter((x) => x.id !== id); C.render({ bg: true });
    C.Writer.run('konten.hapus', { sheet, id }, { label: 'Hapus', pesan: 'Dihapus.', fail: () => { K()[key] = snap; C.render({ bg: true }); } });
  }
  function geserItem(sheet, id, arah, filter) {
    const key = LIST[sheet], list = K()[key];
    const grup = filter ? list.filter(filter) : list.slice();
    const i = grup.findIndex((x) => x.id === id), j = i + arah;
    if (i < 0 || j < 0 || j >= grup.length) return;
    const snap = clone(list);
    [grup[i], grup[j]] = [grup[j], grup[i]];
    const semua = filter ? list.filter((x) => !filter(x)).concat(grup) : grup;
    const urut = filter ? list.slice().sort((a, b) => a.urutan - b.urutan).map((x) => x.id) : semua.map((x) => x.id);
    if (filter) { const ids = grup.map((x) => x.id); let k = 0; for (let n = 0; n < urut.length; n++) if (ids.indexOf(urut[n]) > -1) urut[n] = ids[k++]; }
    urut.forEach((uid, n) => { const it = list.find((x) => x.id === uid); if (it) it.urutan = n + 1; });
    list.sort((a, b) => a.urutan - b.urutan);
    C.render({ bg: true });
    C.Writer.run('konten.urut', { sheet, ids: urut }, { label: 'Urutan', pesan: false, fail: () => { K()[key] = snap; C.render({ bg: true }); } });
  }
  function toggleTampil(sheet, id) {
    const it = K()[LIST[sheet]].find((x) => x.id === id); if (!it) return;
    simpanItem(sheet, { id, tampil: !it.tampil }, !it.tampil ? 'Ditampilkan di situs.' : 'Disembunyikan dari situs.');
  }
  H.edit = (b) => FORMS[b.dataset.sheet](b.dataset.id);
  H.add = (b) => FORMS[b.dataset.sheet](null, b.dataset.jenis);
  H.del = (b) => hapusItem(b.dataset.sheet, b.dataset.id);
  H.up = (b) => geserItem(b.dataset.sheet, b.dataset.id, -1, b.dataset.jenis ? (x) => x.jenis === b.dataset.jenis : null);
  H.down = (b) => geserItem(b.dataset.sheet, b.dataset.id, 1, b.dataset.jenis ? (x) => x.jenis === b.dataset.jenis : null);
  H.tampil = (b) => toggleTampil(b.dataset.sheet, b.dataset.id);
  const aksiItem = (sheet, it, i, n, jenis) => '<div class="flex items-center gap-0.5 shrink-0">' +
    iconBtn('arrow_upward', 'up', 'data-sheet="' + sheet + '" data-id="' + esc(it.id) + '"' + (jenis ? ' data-jenis="' + jenis + '"' : '') + (i === 0 ? ' disabled' : ''), 'Naikkan', i === 0 ? 'opacity-30 pointer-events-none' : '') +
    iconBtn('arrow_downward', 'down', 'data-sheet="' + sheet + '" data-id="' + esc(it.id) + '"' + (jenis ? ' data-jenis="' + jenis + '"' : '') + (i === n - 1 ? ' disabled' : ''), 'Turunkan', i === n - 1 ? 'opacity-30 pointer-events-none' : '') +
    iconBtn('edit', 'edit', 'data-sheet="' + sheet + '" data-id="' + esc(it.id) + '"', 'Ubah') +
    iconBtn('delete', 'del', 'data-sheet="' + sheet + '" data-id="' + esc(it.id) + '"', 'Hapus', 'hover:!bg-error-container hover:!text-error') + '</div>';
  function iconPicker(name, val) {
    return '<div><span class="' + LBL + '">Ikon</span><input type="hidden" name="' + name + '" value="' + esc(val || 'star') + '">' +
      '<input type="search" class="' + INP + ' mb-2" placeholder="Cari ikon… (mis. code, mail)" data-iconsearch>' +
      '<div class="grid grid-cols-8 sm:grid-cols-10 gap-1 max-h-44 overflow-y-auto p-1 rounded-xl bg-input-bg" data-icongrid="' + name + '">' +
      ICON_SET.map((x) => '<button type="button" data-icon="' + x + '" title="' + x + '" class="aspect-square rounded-lg flex items-center justify-center ' + (x === val ? 'bg-brand-blue text-surface-white' : 'text-brand-navy hover:bg-light-blue-tint') + '">' + ic(x, 'text-[22px]') + '</button>').join('') + '</div></div>';
  }
  function pasangPicker(root) {
    const g = root.querySelector('[data-icongrid]'); if (!g) return;
    const hid = root.querySelector('[name="' + g.dataset.icongrid + '"]');
    g.addEventListener('click', (e) => { const b = e.target.closest('[data-icon]'); if (!b) return; hid.value = b.dataset.icon; $$('[data-icon]', g).forEach((x) => { const on = x === b; x.classList.toggle('bg-brand-blue', on); x.classList.toggle('text-surface-white', on); x.classList.toggle('text-brand-navy', !on); }); });
    const s = root.querySelector('[data-iconsearch]');
    s.addEventListener('input', () => { const q = s.value.trim().toLowerCase(); $$('[data-icon]', g).forEach((x) => { x.hidden = q && x.dataset.icon.indexOf(q) === -1; }); });
  }
  const val = (f, n) => (f.elements[n] ? String(f.elements[n].value).trim() : '');
  const urlOk = (u, kontak) => !u || /^https:\/\/[^\s<>"'`]+\.[^\s<>"'`]+/i.test(u) || (kontak && /^(mailto:[^\s@]+@[^\s@]+\.[a-z]{2,}|tel:\+?[\d\s-]{6,})$/i.test(u));
  function tandaiSalah(f, n, pesan) { const el = f.elements[n]; el.classList.add('is-invalid'); el.focus(); U.toast(pesan, 'error'); return false; }

  // ---------- Formulir per jenis konten ----------
  const JENIS = { pendidikan: ['Pendidikan', 'school'], pengalaman: ['Pengalaman', 'work'], minat: ['Fokus & Minat', 'interests'], tujuan_karier: ['Tujuan Karier', 'rocket_launch'] };
  const FORMS = {
    Tentang(id, jenis) {
      const it = id ? K().tentang.find((x) => x.id === id) : { jenis: jenis || 'pendidikan' };
      modal({ title: id ? 'Ubah Riwayat' : 'Tambah ' + JENIS[it.jenis][0], body:
        inp('jenis', 'Jenis', it.jenis, { sel: Object.keys(JENIS).map((k) => [k, JENIS[k][0]]) }) +
        inp('judul', 'Judul', it.judul || '', { req: true, max: 120, ph: 'Contoh: Universitas Indonesia / Lead Product Designer' }) +
        inp('instansi', 'Instansi / Jurusan', it.instansi || '', { max: 120, ph: 'Contoh: Sistem Informasi / Studio Kreatif Digital' }) +
        inp('periode', 'Periode', it.periode || '', { max: 60, ph: 'Contoh: 2018 — 2022' }) +
        inp('deskripsi', 'Keterangan', it.deskripsi || '', { area: true, max: 1000, ph: 'Contoh: Predikat Sangat Memuaskan' }),
      onSubmit: (f) => { simpanItem('Tentang', { id: id || newId('Tentang'), jenis: val(f, 'jenis'), judul: val(f, 'judul'), instansi: val(f, 'instansi'), periode: val(f, 'periode'), deskripsi: val(f, 'deskripsi') }); } });
    },
    Keahlian(id) {
      const it = id ? K().keahlian.find((x) => x.id === id) : { level: 80, tampil: true, ikon: 'code' };
      const kat = Array.from(new Set(K().keahlian.map((x) => x.kategori).filter(Boolean)));
      modal({ title: id ? 'Ubah Keahlian' : 'Tambah Keahlian', wide: true, body:
        '<div class="grid sm:grid-cols-2 gap-4">' + inp('nama_skill', 'Nama keahlian', it.nama_skill || '', { req: true, max: 80, ph: 'Contoh: Figma & Design Systems' }) +
        inp('kategori', 'Kategori', it.kategori || '', { max: 50, list: 'dl-kat', ph: 'Design / Programming / Data & Tools', help: 'Kategori menjadi tombol filter di situs.' }) + '</div>' +
        '<datalist id="dl-kat">' + kat.map((k) => '<option value="' + esc(k) + '">').join('') + '</datalist>' +
        '<div><label class="' + LBL + '" for="f-level">Tingkat penguasaan: <b data-lvl>' + (it.level || 0) + '%</b></label><input id="f-level" name="level" type="range" min="0" max="100" step="1" value="' + (it.level || 0) + '" class="w-full accent-[rgb(var(--c-brand))]"></div>' +
        inp('deskripsi', 'Deskripsi singkat', it.deskripsi || '', { max: 200, ph: 'Contoh: Tokenisasi, auto-layout kompleks, reusable components.' }) +
        iconPicker('ikon', it.ikon) +
        '<label class="flex items-center gap-3"><input type="checkbox" name="tampil" class="w-5 h-5 accent-[rgb(var(--c-brand))]"' + (it.tampil !== false ? ' checked' : '') + '><span class="font-label-ui text-label-ui text-brand-navy">Tampilkan di situs</span></label>',
      onOpen: (f) => { pasangPicker(f); f.elements.level.addEventListener('input', () => { f.querySelector('[data-lvl]').textContent = f.elements.level.value + '%'; }); },
      onSubmit: (f) => { simpanItem('Keahlian', { id: id || newId('Keahlian'), nama_skill: val(f, 'nama_skill'), kategori: val(f, 'kategori'), level: Number(f.elements.level.value), deskripsi: val(f, 'deskripsi'), ikon: val(f, 'ikon') || 'star', tampil: f.elements.tampil.checked }); } });
    },
    Portofolio(id) {
      const it = id ? K().portofolio.find((x) => x.id === id) : { tampil: true };
      const kat = Array.from(new Set(K().portofolio.map((x) => x.kategori).filter(Boolean)));
      modal({ title: id ? 'Ubah Proyek' : 'Tambah Proyek', wide: true, body:
        unggahUI('proyek', 'url_gambar', it.url_gambar || '', it.judul) +
        '<div class="grid sm:grid-cols-2 gap-4">' + inp('judul', 'Judul proyek', it.judul || '', { req: true, max: 120 }) +
        inp('kategori', 'Kategori', it.kategori || '', { max: 50, list: 'dl-pkat', ph: 'Web Development / UI/UX Design', help: 'Dipakai sebagai label & filter.' }) + '</div>' +
        '<datalist id="dl-pkat">' + kat.map((k) => '<option value="' + esc(k) + '">').join('') + '</datalist>' +
        inp('deskripsi_singkat', 'Deskripsi singkat', it.deskripsi_singkat || '', { area: true, max: 500, rows: 3 }) +
        '<div class="grid sm:grid-cols-2 gap-4">' + inp('teknologi', 'Teknologi', it.teknologi || '', { max: 200, ph: 'Next.js, Tailwind, GAS API', help: 'Pisahkan dengan koma.' }) +
        inp('url_tautan', 'Tautan proyek', it.url_tautan || '', { max: 1000, type: 'url', ph: 'https://…', help: 'Wajib diawali https://' }) + '</div>' +
        '<label class="flex items-center gap-3"><input type="checkbox" name="tampil" class="w-5 h-5 accent-[rgb(var(--c-brand))]"' + (it.tampil !== false ? ' checked' : '') + '><span class="font-label-ui text-label-ui text-brand-navy">Tampilkan di situs</span></label>',
      onOpen: (f) => { pasangUnggah(f); pasangUrlGambar(f); },
      onSubmit: (f) => {
        if (!urlOk(val(f, 'url_tautan'))) return tandaiSalah(f, 'url_tautan', 'Tautan harus diawali https://');
        if (!urlOk(val(f, 'url_gambar'))) return tandaiSalah(f, 'url_gambar', 'URL gambar harus diawali https://');
        simpanItem('Portofolio', { id: id || newId('Portofolio'), judul: val(f, 'judul'), kategori: val(f, 'kategori'), deskripsi_singkat: val(f, 'deskripsi_singkat'), teknologi: val(f, 'teknologi'), url_tautan: val(f, 'url_tautan'), url_gambar: val(f, 'url_gambar'), tampil: f.elements.tampil.checked });
      } });
    },
    Testimoni(id) {
      const it = id ? K().testimoni.find((x) => x.id === id) : { rating: 5, tampil: true };
      modal({ title: id ? 'Ubah Testimoni' : 'Tambah Testimoni', wide: true, body:
        '<div class="p-3 rounded-xl bg-soft-yellow text-brand-navy font-caption text-caption">' + ic('info', 'text-[16px] mr-1') + 'Tampilkan hanya testimoni asli dan sudah mendapat izin dari pemberinya.</div>' +
        '<div class="grid sm:grid-cols-2 gap-4">' + inp('nama', 'Nama', it.nama || '', { req: true, max: 80 }) + inp('jabatan_instansi', 'Jabatan & instansi', it.jabatan_instansi || '', { max: 120, ph: 'CEO di TechNusantara' }) + '</div>' +
        inp('isi', 'Isi testimoni', it.isi || '', { area: true, req: true, max: 1000, rows: 4 }) +
        inp('rating', 'Rating', it.rating || 5, { sel: [[5, '★★★★★ (5)'], [4, '★★★★ (4)'], [3, '★★★ (3)'], [2, '★★ (2)'], [1, '★ (1)']] }) +
        '<div><span class="' + LBL + '">Foto (opsional)</span>' + unggahUI('foto', 'url_foto', it.url_foto || '', it.nama, true) + '</div>' +
        '<label class="flex items-center gap-3"><input type="checkbox" name="tampil" class="w-5 h-5 accent-[rgb(var(--c-brand))]"' + (it.tampil !== false ? ' checked' : '') + '><span class="font-label-ui text-label-ui text-brand-navy">Tampilkan di situs</span></label>',
      onOpen: (f) => { pasangUnggah(f); pasangUrlGambar(f); },
      onSubmit: (f) => {
        if (!urlOk(val(f, 'url_foto'))) return tandaiSalah(f, 'url_foto', 'URL foto harus diawali https://');
        simpanItem('Testimoni', { id: id || newId('Testimoni'), nama: val(f, 'nama'), jabatan_instansi: val(f, 'jabatan_instansi'), isi: val(f, 'isi'), rating: Number(val(f, 'rating')), url_foto: val(f, 'url_foto'), tampil: f.elements.tampil.checked });
      } });
    },
    Kontak(id) {
      const it = id ? K().kontak.find((x) => x.id === id) : { tampil: true, ikon: 'link' };
      const preset = [['Email', 'mail', 'mailto:'], ['WhatsApp', 'chat', 'https://wa.me/62'], ['LinkedIn', 'link', 'https://linkedin.com/in/'], ['GitHub', 'code', 'https://github.com/'], ['Instagram', 'photo_camera', 'https://instagram.com/'], ['Telepon', 'call', 'tel:+62']];
      modal({ title: id ? 'Ubah Kontak' : 'Tambah Kontak / Sosial', wide: true, body:
        (id ? '' : '<div><span class="' + LBL + '">Isi cepat</span><div class="flex flex-wrap gap-2">' + preset.map((p) => '<button type="button" class="chip chip-off border border-border-subtle" data-preset="' + esc(JSON.stringify(p)) + '">' + ic(p[1], 'text-[16px] mr-1') + esc(p[0]) + '</button>').join('') + '</div></div>') +
        '<div class="grid sm:grid-cols-2 gap-4">' + inp('label', 'Label', it.label || '', { req: true, max: 60, ph: 'LinkedIn' }) +
        inp('url', 'Tautan', it.url || '', { req: true, max: 1000, ph: 'https://… / mailto:… / tel:…', help: 'Boleh https://, mailto:, atau tel:' }) + '</div>' +
        iconPicker('ikon', it.ikon) +
        '<label class="flex items-center gap-3"><input type="checkbox" name="tampil" class="w-5 h-5 accent-[rgb(var(--c-brand))]"' + (it.tampil !== false ? ' checked' : '') + '><span class="font-label-ui text-label-ui text-brand-navy">Tampilkan di situs</span></label>',
      onOpen: (f) => {
        pasangPicker(f);
        f.addEventListener('click', (e) => { const b = e.target.closest('[data-preset]'); if (!b) return; const p = JSON.parse(b.dataset.preset); f.elements.label.value = p[0]; f.elements.url.value = p[2]; f.elements.url.focus(); const ib = f.querySelector('[data-icon="' + p[1] + '"]'); if (ib) ib.click(); });
      },
      onSubmit: (f) => { if (!urlOk(val(f, 'url'), true)) return tandaiSalah(f, 'url', 'Tautan harus diawali https://, mailto:, atau tel:'); simpanItem('Kontak', { id: id || newId('Kontak'), label: val(f, 'label'), url: val(f, 'url'), ikon: val(f, 'ikon') || 'link', tampil: f.elements.tampil.checked }); } });
    }
  };
  function pasangUrlGambar(root) {
    $$('[data-imgurl]', root).forEach((i) => i.addEventListener('change', () => { const p = root.querySelector(i.dataset.imgurl); const u = U.img(i.value.replace(/drive\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]{20,})[^\s]*/, 'drive.google.com/thumbnail?id=$1&sz=w1600')); if (p && u) { p.dataset.fbDone = ''; p.src = u; } }));
  }

  // ===================================================================
  // A1 — BERANDA (dashboard)
  // ===================================================================
  function ringkas(range) {
    const D = S().dashboard; if (!D || !D.harian) return null;
    const h = D.harian, cur = h.slice(-range), prev = range * 2 <= h.length ? h.slice(-range * 2, -range) : null;
    const sum = (a, k) => a.reduce((s, x) => s + (x[k] || 0), 0);
    const J = D.jendela[range] || D.jendela[30];
    const tot = { k: sum(cur, 'k'), p: sum(cur, 'p'), c: sum(cur, 'c'), a: sum(cur, 'a') };
    const ptot = prev ? { k: sum(prev, 'k'), p: sum(prev, 'p'), c: sum(prev, 'c'), a: sum(prev, 'a') } : null;
    return { cur, tot, ptot, J, at: D.at };
  }
  function delta(a, b) {
    if (b === null || b === undefined) return '';
    if (!b) return a ? '<span class="inline-flex items-center gap-0.5 text-brand-blue bg-light-blue-tint font-caption text-caption font-semibold px-2 py-0.5 rounded-full">' + ic('trending_up', 'text-[14px]') + 'baru</span>' : '';
    const p = (a - b) / b * 100, naik = p >= 0;
    return '<span class="inline-flex items-center gap-0.5 ' + (naik ? 'text-brand-blue bg-light-blue-tint' : 'text-on-error-container bg-error-container') + ' font-caption text-caption font-semibold px-2 py-0.5 rounded-full">' + ic(naik ? 'trending_up' : 'trending_down', 'text-[14px]') + (naik ? '+' : '') + U.pct(p) + '</span>';
  }
  function kpi(label, icon, nilai, sub, iconCls) {
    return '<div class="bg-surface-white p-3.5 sm:p-space-md rounded-[20px] shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform duration-200 min-w-0">' +
      '<div class="flex items-start sm:items-center justify-between gap-2"><span class="font-label-ui text-[13px] sm:text-label-ui text-text-secondary leading-snug">' + label + '</span><div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ' + (iconCls || 'bg-light-blue-tint text-brand-blue') + '">' + ic(icon, 'text-[20px] sm:text-[22px]') + '</div></div>' +
      '<div class="mt-3 sm:mt-4"><div class="text-[28px] sm:text-headline-lg font-bold text-text-primary tracking-tight leading-none">' + nilai + '</div><div class="flex items-center flex-wrap gap-1.5 mt-2">' + sub + '</div></div></div>';
  }
  const RANGE_LBL = { 7: '7 Hari', 30: '30 Hari', 90: '90 Hari' };
  const views = {};
  views.beranda = {
    render() {
      const r = ringkas(ui.range), P = K().pengaturan, ps = S().pesan || { list: [], baru: 0 }, sys = S().sistem || {};
      const dari = r ? U.date(r.cur[0].d + 'T00:00:00', { day: 'numeric', month: 'short' }) : '', sampai = r ? U.date(r.cur[r.cur.length - 1].d + 'T00:00:00') : '';
      const aktif = P.situs_aktif !== 'tidak';
      const hariIni = new Date().toDateString(), baruHariIni = ps.list.filter((m) => new Date(m.timestamp).toDateString() === hariIni).length;
      const proyek = r ? sortObj(r.J.proyek, 4).map((x) => [namaProyek(x[0]), x[1]]) : [];
      const kontakTop = r ? sortObj(r.J.kontak, 2).map((x) => x[0]).join(' & ') : '';
      const rata = r ? Math.round(r.tot.k / ui.range) : 0;
      const kosong = r && !r.tot.k && !r.tot.p && !r.tot.c;
      const top3 = r ? sortObj(r.J.proyek, 3) : [];
      return page(
        head('Ringkasan Performa Portofolio', 'Interaksi pengunjung, ketertarikan pada proyek, dan lalu lintas kontak.',
          '<span class="inline-flex items-center gap-1.5 px-3 py-1 ' + (aktif ? 'bg-surface-container-low' : 'bg-soft-yellow') + ' rounded-full"><span class="relative flex h-2.5 w-2.5">' + (aktif ? '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-bright-blue opacity-75"></span>' : '') + '<span class="relative inline-flex rounded-full h-2.5 w-2.5 ' + (aktif ? 'bg-brand-blue' : 'bg-yellow-accent') + '"></span></span><span class="font-caption text-caption text-text-primary font-semibold">' + (aktif ? 'Situs aktif & terhubung ke Sheets' : 'Mode perawatan aktif') + '</span></span>' +
          '<label class="flex items-center gap-2 bg-light-blue-tint/70 pl-3.5 pr-2 py-1.5 rounded-full text-brand-navy">' + ic('calendar_today', 'text-brand-blue text-[18px]') + '<span class="sr-only">Rentang waktu</span><select data-c="range" class="bg-transparent font-label-ui text-label-ui focus:outline-none cursor-pointer">' + [7, 30, 90].map((n) => '<option value="' + n + '"' + (n === ui.range ? ' selected' : '') + '>' + n + ' Hari Terakhir' + (n === ui.range && r ? ': ' + dari + ' – ' + sampai : '') + '</option>').join('') + '</select></label>' +
          '<button type="button" data-v="dashPdf" class="btn-navy btn-sm !py-2">' + ic('download', 'text-[18px]') + '<span>Unduh Ringkasan</span></button>') +
        (!r ? box(empty('hourglass_top', 'Statistik sedang disiapkan', 'Data akan muncul setelah sinkronisasi pertama.')) :
        '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-space-md">' +
          kpi('Total Kunjungan (' + ui.range + ' Hari)', 'visibility', U.num(r.tot.k), delta(r.tot.k, r.ptot && r.ptot.k) + '<span class="font-caption text-caption text-text-secondary">vs periode sebelumnya</span>') +
          kpi('Total Klik Proyek', 'ads_click', U.num(r.tot.p), delta(r.tot.p, r.ptot && r.ptot.p) + '<span class="font-caption text-caption text-text-secondary">' + (r.tot.k ? U.pct(r.tot.p / r.tot.k * 100) + ' per kunjungan' : 'belum ada kunjungan') + '</span>', 'bg-warm-cream text-tertiary') +
          kpi('Pesan Masuk Baru', 'mail', U.num(ps.baru), '<span class="inline-flex items-center gap-1 text-brand-blue bg-primary-fixed/50 font-caption text-caption font-semibold px-2 py-0.5 rounded-full">' + ic('mark_email_unread', 'text-[14px]') + '+' + baruHariIni + ' hari ini</span><span class="font-caption text-caption text-text-secondary">' + U.num(ps.total || 0) + ' total</span>', 'bg-secondary-container/50 text-brand-navy') +
          kpi('Klik Tautan Kontak', 'contact_page', U.num(r.tot.c), delta(r.tot.c, r.ptot && r.ptot.c) + '<span class="font-caption text-caption text-text-secondary truncate max-w-[150px]">' + esc(kontakTop || 'WhatsApp, Email, dll.') + '</span>', 'bg-surface-container-high text-primary') +
        '</div>' +
        '<div class="grid grid-cols-1 lg:grid-cols-12 gap-space-md">' +
          box('<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm"><div><div class="flex items-center gap-2 flex-wrap"><h2 class="font-headline-sm text-headline-sm text-text-primary">Tren Kunjungan Harian</h2><span class="px-2 py-0.5 rounded-full bg-light-blue-tint text-brand-blue font-caption text-caption font-semibold">' + ui.range + ' Hari Terakhir</span></div>' +
            '<p class="font-body-sm text-body-sm text-text-secondary mt-0.5">Rata-rata: <span class="font-semibold text-text-primary">' + U.num(rata) + ' kunjungan/hari</span></p></div>' +
            '<div class="inline-flex p-1 bg-surface-container-low rounded-full self-start sm:self-auto" role="group" aria-label="Rentang grafik">' + [7, 30, 90].map((n) => '<button type="button" data-v="range" data-n="' + n + '" aria-pressed="' + (n === ui.range) + '" class="px-3 py-1 font-caption text-caption rounded-full ' + (n === ui.range ? 'bg-brand-blue text-surface-white font-semibold shadow-sm' : 'text-text-secondary hover:text-text-primary') + '">' + RANGE_LBL[n] + '</button>').join('') + '</div></div>' +
            (kosong ? empty('insights', 'Belum ada kunjungan tercatat', 'Bagikan tautan portofolio Anda di CV, LinkedIn, dan media sosial — grafik akan terisi otomatis.') : '<div id="ch-line" class="w-full pt-2"></div>'), 'lg:col-span-7') +
          box('<div class="flex items-center justify-between gap-2"><h2 class="font-headline-sm text-headline-sm text-text-primary">Klik per Proyek Terpopuler</h2><span class="font-caption text-caption font-bold text-brand-blue bg-light-blue-tint px-2.5 py-0.5 rounded-full shrink-0">Top 4</span></div>' +
            '<p class="font-body-sm text-body-sm text-text-secondary mt-0.5 mb-5">Sebaran ketertarikan rekruter & calon klien pada proyek.</p>' +
            hbars(proyek, { rank: true, ic: 'touch_app', kosong: 'Belum ada klik proyek', kosongSub: 'Klik pada kartu proyek di situs akan tercatat di sini.' }) +
            '<div class="pt-5 flex items-center justify-between text-text-secondary font-caption text-caption"><span class="flex items-center gap-1">' + ic('touch_app', 'text-[16px]') + 'Total: <strong class="text-text-primary">' + U.num(r.tot.p) + ' klik</strong></span><a href="#/statistik" data-go="statistik" class="font-label-ui text-label-ui text-brand-blue hover:underline">Detail statistik →</a></div>', 'lg:col-span-5 flex flex-col') +
        '</div>') +
        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-space-md">' +
          box('<div class="flex items-center justify-between gap-2 mb-space-sm flex-wrap"><div class="flex items-center gap-2"><h2 class="font-headline-sm text-headline-sm text-text-primary">Pesan Masuk Terbaru</h2>' + (ps.baru ? '<span class="bg-yellow-accent text-brand-navy font-caption text-caption font-bold px-2 py-0.5 rounded-full">' + ps.baru + ' Belum Dibaca</span>' : '') + '</div>' +
            '<a href="#/pesan" data-go="pesan" class="font-label-ui text-label-ui text-brand-blue hover:text-brand-navy flex items-center gap-1">Lihat semua' + ic('arrow_forward', 'text-[16px]') + '</a></div>' +
            '<p class="font-body-sm text-body-sm text-text-secondary mb-space-md">Calon klien yang menghubungi lewat formulir situs.</p>' +
            (ps.list.length ? '<div class="flex flex-col gap-2.5">' + ps.list.slice(0, 3).map(barisPesanMini).join('') + '</div>' : empty('inbox', 'Belum ada pesan', 'Pesan dari formulir kontak akan muncul di sini dan dikirim ke email Anda.'))) +
          box('<div class="flex items-center justify-between gap-2 mb-space-sm flex-wrap"><div class="flex items-center gap-2"><h2 class="font-headline-sm text-headline-sm text-text-primary">Proyek Teratas & Konversi</h2><span class="bg-light-blue-tint text-brand-blue font-caption text-caption font-bold px-2 py-0.5 rounded-full">Rasio klik</span></div>' +
            '<a href="#/portofolio" data-go="portofolio" class="font-label-ui text-label-ui text-brand-blue hover:text-brand-navy flex items-center gap-1">Kelola' + ic('arrow_forward', 'text-[16px]') + '</a></div>' +
            '<p class="font-body-sm text-body-sm text-text-secondary mb-space-md">Klik proyek dibanding total kunjungan pada rentang ini.</p>' +
            (r && top3.length ? '<div class="flex flex-col gap-3">' + top3.map((x, i) => barisProyekTop(x, i, r.tot.k)).join('') + '</div>' : empty('grid_view', 'Belum ada data konversi', 'Data muncul setelah pengunjung mengeklik proyek Anda.'))) +
        '</div>' +
        '<div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-space-md py-3.5 bg-surface-white rounded-[20px] shadow-sm text-text-secondary">' +
          '<div class="flex items-center gap-x-space-md gap-y-2 flex-wrap font-caption text-caption">' +
            '<span class="flex items-center gap-2">' + ic('memory', 'text-[18px] text-brand-blue') + 'Google Apps Script: <strong class="text-text-primary">' + (sys.cachePublik ? 'cache publik hangat' : 'cache dingin') + '</strong></span>' +
            '<span class="flex items-center gap-2">' + ic('cached', 'text-[18px] text-brand-blue') + 'keepWarm: <strong class="text-text-primary">' + (sys.keepWarm ? 'aktif (5 mnt)' : sys.keepWarmMati ? 'dimatikan' : 'belum terpasang') + '</strong></span>' +
            '<span class="flex items-center gap-2">' + ic('mail', 'text-[18px] text-brand-blue') + 'Kuota email: <strong class="text-text-primary">' + (sys.kuotaEmail >= 0 ? sys.kuotaEmail + '/hari' : '-') + '</strong></span>' +
            '<span class="flex items-center gap-2">' + ic('cloud_done', 'text-[18px] text-brand-blue') + 'Terhubung ke Google Drive & Sheets</span></div>' +
          '<div class="flex items-center gap-2 font-caption text-caption"><span class="w-2 h-2 rounded-full bg-brand-blue"></span><span>Statistik diperbarui ' + (r ? U.rel(r.at) : '-') + '</span><button type="button" data-v="segarkan" class="ml-1 w-8 h-8 rounded-full hover:bg-light-blue-tint text-brand-blue flex items-center justify-center" aria-label="Segarkan data" title="Segarkan data">' + ic('refresh', 'text-[18px]') + '</button></div>' +
        '</div>');
    },
    mount() {
      const r = ringkas(ui.range);
      if (r) lineChart($('#ch-line'), r.cur.map((x) => ({ d: x.d, v: x.k, v2: x.p })), { label: 'Kunjungan harian ' + ui.range + ' hari', n1: 'Kunjungan', n2: 'Klik proyek' });
      const s = $('[data-c="range"]'); if (s) s.addEventListener('change', () => setRange(Number(s.value)));
    }
  };
  function setRange(n) { ui.range = n; PF.Store.set('pf_adm_range', n); C.render({ bg: true }); }
  H.range = (b) => setRange(Number(b.dataset.n));
  H.segarkan = async (b) => {
    b.querySelector('.ms').classList.add('spin');
    try { const r = await C.read('admin.boot', { _fresh: true }); if (r.success) { C.A.S = r.data; C.A.fetchedAt = Date.now(); C.persist(); C.navHtml(); C.render({ bg: true }); U.toast('Data disegarkan.'); } }
    catch (e) { U.toast(e.message, 'error'); }
  };
  function barisPesanMini(m) {
    const baru = m.status === 'baru';
    return '<div class="flex items-start justify-between gap-space-sm p-3.5 rounded-2xl ' + (baru ? 'bg-light-blue-tint/50 hover:bg-light-blue-tint' : 'bg-surface-container-low/60 hover:bg-surface-container-low') + ' transition-colors">' +
      '<div class="flex items-start gap-3 min-w-0"><div class="w-10 h-10 rounded-full ' + (baru ? 'bg-brand-blue' : 'bg-secondary') + ' text-surface-white shrink-0 flex items-center justify-center font-label-ui text-label-ui font-bold">' + esc(U.initials(m.nama)) + '</div>' +
      '<div class="min-w-0"><div class="flex items-center gap-2 flex-wrap"><span class="font-label-ui text-label-ui text-text-primary ' + (baru ? 'font-bold' : '') + '">' + esc(m.nama) + '</span><span class="font-caption text-caption text-text-secondary truncate max-w-[160px]">' + esc(m.email) + '</span>' +
      '<span class="' + (baru ? 'bg-primary-fixed text-brand-blue font-bold' : 'bg-surface-variant text-text-secondary font-semibold') + ' font-caption text-caption px-2 rounded-full">' + (baru ? 'Baru' : 'Dibaca') + '</span></div>' +
      '<p class="font-body-sm text-body-sm text-text-secondary truncate mt-0.5">“' + esc(m.pesan.slice(0, 140)) + '”</p><span class="font-caption text-caption text-outline font-medium">' + U.rel(m.timestamp) + '</span></div></div>' +
      '<button type="button" data-v="bukaPesan" data-id="' + esc(m.id) + '" class="px-3.5 py-1.5 rounded-full bg-surface-white ' + (baru ? 'text-brand-blue hover:bg-brand-blue hover:text-surface-white' : 'text-text-secondary hover:bg-surface-dim') + ' font-label-ui text-label-ui shadow-sm transition-colors self-center shrink-0">' + (baru ? 'Baca' : 'Buka') + '</button></div>';
  }
  function barisProyekTop(x, i, kunj) {
    const p = (K().portofolio || []).find((y) => y.id === x[0]) || { judul: namaProyek(x[0]), kategori: '' };
    const fb = U.cover(p.judul, i);
    return '<div class="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low/70 hover:bg-light-blue-tint/50 transition-colors gap-2">' +
      '<div class="flex items-center gap-3 min-w-0"><div class="w-8 h-8 rounded-full ' + (i === 0 ? 'bg-yellow-accent text-brand-navy' : 'bg-surface-dim text-text-primary') + ' flex items-center justify-center font-extrabold shrink-0">' + (i + 1) + '</div>' +
      '<img src="' + esc(U.img(p.url_gambar) || fb) + '" data-fb="' + esc(fb) + '" alt="" class="w-14 h-12 rounded-xl object-cover bg-surface-dim shrink-0 hidden sm:block" loading="lazy">' +
      '<div class="min-w-0"><div class="font-label-ui text-label-ui text-text-primary font-bold truncate">' + esc(p.judul) + '</div><div class="font-caption text-caption"><span class="text-brand-blue font-semibold">' + esc(p.kategori || '-') + '</span><span class="text-text-secondary"> • ' + U.num(x[1]) + ' klik</span></div></div></div>' +
      '<div class="flex flex-col items-end shrink-0 pl-2"><span class="font-label-ui text-label-ui text-text-primary font-bold">' + (kunj ? U.pct(x[1] / kunj * 100) : '-') + '</span><span class="font-caption text-caption text-text-secondary">dari kunjungan</span></div></div>';
  }
  H.dashPdf = async () => {
    const r = ringkas(ui.range); if (!r) return;
    const ps = S().pesan;
    try {
      await eksporPdf('ringkasan-portofolio-' + tglFile(), {
        title: 'Ringkasan Performa Portofolio', subtitle: K().profil.nama_lengkap + ' · ' + ui.range + ' hari terakhir (' + U.date(r.cur[0].d) + ' – ' + U.date(r.cur[r.cur.length - 1].d) + ')',
        kpi: [['Total kunjungan', U.num(r.tot.k)], ['Klik proyek', U.num(r.tot.p)], ['Pesan baru', U.num(ps.baru)], ['Klik kontak', U.num(r.tot.c)]],
        tables: [
          { title: 'Klik per proyek', head: ['Proyek', 'Klik', 'Rasio dari kunjungan'], body: sortObj(r.J.proyek).map((x) => [namaProyek(x[0]), U.num(x[1]), r.tot.k ? U.pct(x[1] / r.tot.k * 100) : '-']) },
          { title: 'Klik tautan kontak', head: ['Tautan', 'Klik'], body: sortObj(r.J.kontak).map((x) => [x[0], U.num(x[1])]) },
          { title: 'Kunjungan harian', head: ['Tanggal', 'Kunjungan', 'Klik proyek', 'Klik kontak', 'Klik tombol'], body: r.cur.slice().reverse().map((x) => [U.date(x.d), x.k, x.p, x.c, x.a]) }
        ]
      });
    } catch (e) { U.toast(e.message, 'error'); }
  };

  // ===================================================================
  // A2 — PROFIL
  // ===================================================================
  views.profil = {
    render() {
      const p = K().profil;
      return page(head('Profil', 'Identitas utama di bagian Hero & About. Gunakan <b>*kata*</b> pada headline untuk aksen tulisan tangan.') +
        '<form data-form="profil" class="grid grid-cols-1 lg:grid-cols-3 gap-space-md" novalidate>' +
          box('<h2 class="font-headline-sm text-headline-sm text-brand-navy mb-4">Foto profil</h2>' + unggahUI('foto', 'url_foto', p.url_foto, p.nama_lengkap, true) +
            '<div class="mt-6 p-4 rounded-2xl bg-light-blue-tint/60"><p class="font-label-caps text-label-caps uppercase text-brand-blue mb-2">Pratinjau headline</p><p id="pv-head" class="text-[24px] leading-tight font-extrabold text-brand-navy">' + U.accent(p.headline, 'font-hand text-accent-orange text-[1.15em]') + '</p></div>', 'lg:col-span-1 h-fit') +
          box('<div class="grid sm:grid-cols-2 gap-4">' +
            inp('nama_lengkap', 'Nama lengkap', p.nama_lengkap, { req: true, max: 80 }) + inp('profesi', 'Profesi', p.profesi, { max: 80, ph: 'UI/UX Designer & Web Developer' }) +
            inp('headline', 'Headline', p.headline, { max: 200, cls: 'sm:col-span-2', help: 'Contoh: Membantu Bisnis Bertumbuh Lewat Desain & Web yang *berdampak*' }) +
            inp('deskripsi_singkat', 'Deskripsi singkat', p.deskripsi_singkat, { area: true, max: 500, cls: 'sm:col-span-2' }) +
            inp('tahun_pengalaman', 'Tahun pengalaman', p.tahun_pengalaman, { type: 'number', min: 0, maxv: 80, help: 'Tampil sebagai badge "X+ Tahun". Isi 0 untuk menyembunyikan.' }) +
            inp('label_status', 'Label status', p.label_status, { max: 40, ph: 'Open to Projects' }) +
            inp('teks_tombol_1', 'Teks tombol utama', p.teks_tombol_1, { max: 40, ph: 'Lihat Portofolio' }) + inp('teks_tombol_2', 'Teks tombol kedua', p.teks_tombol_2, { max: 40, ph: 'Tentang Saya' }) +
            inp('tagline_tulisan', 'Catatan tulisan tangan', p.tagline_tulisan, { max: 120, cls: 'sm:col-span-2', ph: 'Ayo bangun sesuatu yang keren bersama! ✨' }) +
            inp('url_video_intro', 'URL video perkenalan (opsional)', p.url_video_intro, { max: 1000, type: 'url', cls: 'sm:col-span-2', ph: 'https://youtu.be/…' }) +
            inp('ringkasan_tentang', 'Ringkasan diri (bagian About)', p.ringkasan_tentang, { area: true, rows: 6, max: 2000, cls: 'sm:col-span-2', help: 'Pisahkan paragraf dengan baris kosong. **teks** = tebal.' }) +
            inp('filosofi', 'Filosofi desain', p.filosofi, { area: true, max: 400, cls: 'sm:col-span-2' }) +
          '</div>' + simpanBar(), 'lg:col-span-2') +
        '</form>');
    },
    mount() {
      const f = $('[data-form="profil"]'); pasangUnggah(f); pasangUrlGambar(f); pasangDirty(f, 'profil');
      f.elements.headline.addEventListener('input', () => { $('#pv-head').innerHTML = U.accent(f.elements.headline.value, 'font-hand text-accent-orange text-[1.15em]'); });
    }
  };
  const simpanBar = (extra) => '<div class="sticky bottom-20 lg:bottom-4 mt-6 flex items-center justify-end gap-3 bg-surface-white/95 backdrop-blur py-2"><span data-dirty-note hidden class="font-caption text-caption text-tertiary mr-auto">Ada perubahan yang belum disimpan</span>' + (extra || '') + '<button type="submit" class="btn-primary !py-3">' + ic('save', 'text-[18px]') + '<span>Simpan perubahan</span></button></div>';
  function pasangDirty(f, view) {
    const note = f.querySelector('[data-dirty-note]');
    const set = () => { C.A.dirty[view] = true; if (note) note.hidden = false; };
    f.addEventListener('input', set); f.addEventListener('change', set);
  }
  F.profil = (f) => {
    const p = {}; ['nama_lengkap', 'profesi', 'headline', 'deskripsi_singkat', 'url_foto', 'teks_tombol_1', 'teks_tombol_2', 'tahun_pengalaman', 'url_video_intro', 'ringkasan_tentang', 'filosofi', 'tagline_tulisan', 'label_status'].forEach((k) => { p[k] = val(f, k); });
    if (!p.nama_lengkap) return tandaiSalah(f, 'nama_lengkap', 'Nama lengkap wajib diisi.');
    if (!urlOk(p.url_foto)) return tandaiSalah(f, 'url_foto', 'URL foto harus diawali https://');
    if (!urlOk(p.url_video_intro)) return tandaiSalah(f, 'url_video_intro', 'URL video harus diawali https://');
    const snap = clone(K().profil);
    Object.assign(K().profil, p); C.A.dirty.profil = false; C.header(); C.render({ bg: true });
    C.Writer.run('profil.simpan', { profil: p }, { label: 'Profil', ok: (r) => { K().profil = r.data.profil; }, fail: () => { K().profil = snap; C.render({ bg: true }); } });
  };

  // ===================================================================
  // A3 — TENTANG
  // ===================================================================
  views.tentang = {
    render() {
      const L = K().tentang;
      return page(head('Tentang', 'Kartu Pendidikan, Pengalaman, Fokus & Minat, serta Tujuan Karier di bagian About.', '<button type="button" data-v="add" data-sheet="Tentang" class="btn-primary btn-sm !py-2.5">' + ic('add', 'text-[18px]') + 'Tambah</button>') +
        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-space-md">' + Object.keys(JENIS).map((j) => {
          const g = L.filter((x) => x.jenis === j);
          return box('<div class="flex items-center justify-between mb-3"><div class="flex items-center gap-2"><span class="w-9 h-9 rounded-xl bg-light-blue-tint text-brand-blue flex items-center justify-center">' + ic(JENIS[j][1], 'text-[20px]') + '</span><h2 class="font-headline-sm text-headline-sm text-brand-navy">' + JENIS[j][0] + '</h2></div>' +
            '<button type="button" data-v="add" data-sheet="Tentang" data-jenis="' + j + '" class="btn-ghost btn-sm">' + ic('add', 'text-[18px]') + 'Tambah</button></div>' +
            (g.length ? '<ul class="divide-y divide-border-subtle">' + g.map((it, i) => '<li class="py-3 flex items-center gap-3"><div class="min-w-0 flex-1"><div class="flex items-center gap-2 flex-wrap"><span class="font-label-ui text-label-ui text-brand-navy">' + esc(it.judul) + '</span>' + demoBadge(it.id) + '</div>' +
              '<p class="font-caption text-caption text-text-secondary truncate">' + esc([it.instansi, it.periode, it.deskripsi].filter(Boolean).join(' • ')) + '</p></div>' + aksiItem('Tentang', it, i, g.length, j) + '</li>').join('') + '</ul>' : '<p class="font-body-sm text-body-sm text-text-secondary py-4">Belum ada data.</p>'));
        }).join('') + '</div>');
    }
  };

  // ===================================================================
  // A4 — KEAHLIAN
  // ===================================================================
  views.keahlian = {
    render() {
      const L = K().keahlian;
      return page(head('Keahlian', 'Kartu skill dengan ikon dan indikator level. Kategori otomatis menjadi tombol filter di situs.', '<button type="button" data-v="add" data-sheet="Keahlian" class="btn-primary btn-sm !py-2.5">' + ic('add', 'text-[18px]') + 'Tambah Keahlian</button>') +
        box(L.length ? '<ul class="divide-y divide-border-subtle">' + L.map((it, i) => '<li class="py-3 flex flex-wrap sm:flex-nowrap items-center gap-3">' +
          '<span class="w-11 h-11 rounded-2xl ' + (i % 2 ? 'bg-soft-yellow text-tertiary-container' : 'bg-light-blue-tint text-brand-blue') + ' flex items-center justify-center shrink-0">' + ic(it.ikon || 'star') + '</span>' +
          '<div class="min-w-0 flex-1"><div class="flex items-center gap-2 flex-wrap"><span class="font-label-ui text-label-ui text-brand-navy">' + esc(it.nama_skill) + '</span>' + (it.kategori ? '<span class="font-caption text-caption px-2 py-0.5 rounded-full bg-surface-container-low text-text-secondary">' + esc(it.kategori) + '</span>' : '') + demoBadge(it.id) + '</div>' +
          '<div class="flex items-center gap-2 mt-1.5"><div class="flex-1 max-w-[240px] h-2 rounded-full bg-border-subtle overflow-hidden"><div class="h-full rounded-full bg-brand-blue" style="width:' + it.level + '%"></div></div><span class="font-caption text-caption font-bold text-brand-navy">' + it.level + '%</span></div></div>' +
          '<div class="flex items-center gap-2"><span class="font-caption text-caption text-text-secondary hidden sm:inline">' + (it.tampil ? 'Tampil' : 'Disembunyikan') + '</span>' + sw(it.tampil, 'data-v="tampil" data-sheet="Keahlian" data-id="' + esc(it.id) + '"', 'Tampilkan ' + it.nama_skill) + '</div>' +
          aksiItem('Keahlian', it, i, L.length) + '</li>').join('') + '</ul>' : empty('psychology', 'Belum ada keahlian', '', '<button type="button" data-v="add" data-sheet="Keahlian" class="btn-primary btn-sm mt-4">Tambah keahlian</button>')));
    }
  };

  // ===================================================================
  // A5 — PORTOFOLIO
  // ===================================================================
  views.portofolio = {
    render() {
      const L = K().portofolio, D = S().dashboard, J = D && D.jendela ? D.jendela[30].proyek : {};
      return page(head('Portofolio', 'Kartu proyek di bagian Portfolio. Gambar diunggah ke Google Drive dan dikompres otomatis.', '<button type="button" data-v="add" data-sheet="Portofolio" class="btn-primary btn-sm !py-2.5">' + ic('add', 'text-[18px]') + 'Tambah Proyek</button>') +
        (L.length ? '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-md">' + L.map((it, i) => {
          const fb = U.cover(it.judul, i);
          return '<article class="bg-surface-white rounded-[20px] shadow-sm overflow-hidden flex flex-col ' + (it.tampil ? '' : 'opacity-70') + '">' +
            '<div class="relative aspect-[16/10] bg-light-blue-tint"><img src="' + esc(U.img(it.url_gambar) || fb) + '" data-fb="' + esc(fb) + '" alt="" class="w-full h-full object-cover" loading="lazy">' +
            '<div class="absolute top-3 left-3 flex gap-1.5">' + (it.kategori ? '<span class="bg-brand-navy/80 text-surface-white font-caption text-caption px-2 py-1 rounded-full font-semibold">' + esc(it.kategori) + '</span>' : '') + demoBadge(it.id) + '</div>' +
            (!it.tampil ? '<span class="absolute top-3 right-3 bg-surface-white/90 text-text-secondary font-caption text-caption px-2 py-1 rounded-full font-semibold flex items-center gap-1">' + ic('visibility_off', 'text-[14px]') + 'Disembunyikan</span>' : '') + '</div>' +
            '<div class="p-4 flex-1 flex flex-col gap-2"><h3 class="font-label-ui text-[16px] text-brand-navy font-bold">' + esc(it.judul) + '</h3><p class="font-body-sm text-body-sm text-text-secondary line-clamp-2">' + esc(it.deskripsi_singkat) + '</p>' +
            '<div class="flex items-center gap-2 font-caption text-caption text-text-secondary mt-auto pt-2">' + ic('ads_click', 'text-[16px] text-brand-blue') + U.num(J[it.id] || 0) + ' klik (30 hari)</div></div>' +
            '<div class="px-3 pb-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-2"><div class="flex items-center gap-2">' + sw(it.tampil, 'data-v="tampil" data-sheet="Portofolio" data-id="' + esc(it.id) + '"', 'Tampilkan ' + it.judul) + '<span class="font-caption text-caption text-text-secondary">' + (it.tampil ? 'Tampil' : 'Tersembunyi') + '</span></div>' + aksiItem('Portofolio', it, i, L.length) + '</div></article>';
        }).join('') + '</div>' : box(empty('grid_view', 'Belum ada proyek', 'Tambahkan proyek pertama Anda.', '<button type="button" data-v="add" data-sheet="Portofolio" class="btn-primary btn-sm mt-4">Tambah proyek</button>'))));
    }
  };

  // ===================================================================
  // A6 — TESTIMONI
  // ===================================================================
  views.testimoni = {
    render() {
      const L = K().testimoni, on = K().pengaturan.tampil_testimoni !== 'tidak', aktif = L.filter((x) => x.tampil).length;
      return page(head('Testimoni', 'Bagian ini hanya tampil di situs bila ada testimoni yang diaktifkan.', '<button type="button" data-v="add" data-sheet="Testimoni" class="btn-primary btn-sm !py-2.5">' + ic('add', 'text-[18px]') + 'Tambah Testimoni</button>') +
        box('<div class="flex items-center justify-between gap-4"><div><p class="font-label-ui text-label-ui text-brand-navy">Tampilkan bagian Testimoni</p><p class="font-caption text-caption text-text-secondary">' + aktif + ' testimoni aktif · ' + (on && aktif ? 'terlihat di situs' : 'tidak terlihat di situs') + '</p></div>' + sw(on, 'data-v="testiOn"', 'Tampilkan bagian testimoni') + '</div>') +
        (L.length ? '<div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">' + L.map((it, i) => box('<div class="flex items-start justify-between gap-3"><div class="flex items-center gap-1 text-yellow-accent" aria-label="Rating ' + it.rating + '">' + Array.from({ length: 5 }, (_, j) => ic('star', 'text-[18px]' + (j < it.rating ? '' : ' text-border-subtle'), j < it.rating)).join('') + '</div>' + demoBadge(it.id) + '</div>' +
          '<p class="font-body-md text-body-md text-brand-navy italic my-3 line-clamp-3">“' + esc(it.isi) + '”</p>' +
          '<div class="flex items-center justify-between gap-2 pt-3 border-t border-border-subtle"><div class="min-w-0"><p class="font-label-ui text-label-ui text-brand-navy truncate">' + esc(it.nama) + '</p><p class="font-caption text-caption text-text-secondary truncate">' + esc(it.jabatan_instansi) + '</p></div>' +
          '<div class="flex items-center gap-1">' + sw(it.tampil, 'data-v="tampil" data-sheet="Testimoni" data-id="' + esc(it.id) + '"', 'Tampilkan testimoni ' + it.nama) + aksiItem('Testimoni', it, i, L.length) + '</div></div>', it.tampil ? '' : 'opacity-75')).join('') + '</div>' : box(empty('format_quote', 'Belum ada testimoni'))));
    }
  };
  H.testiOn = () => simpanSetting({ tampil_testimoni: K().pengaturan.tampil_testimoni === 'tidak' ? 'ya' : 'tidak' });

  // ===================================================================
  // A7 — KONTAK & SOSIAL
  // ===================================================================
  views.kontak = {
    render() {
      const L = K().kontak, J = S().dashboard && S().dashboard.jendela ? S().dashboard.jendela[30].kontak : {};
      return page(head('Kontak & Sosial', 'Tautan di pita kontak, info bar atas, dan footer. Boleh https://, mailto:, atau tel:.', '<button type="button" data-v="add" data-sheet="Kontak" class="btn-primary btn-sm !py-2.5">' + ic('add', 'text-[18px]') + 'Tambah Tautan</button>') +
        box(L.length ? '<ul class="divide-y divide-border-subtle">' + L.map((it, i) => '<li class="py-3 flex flex-wrap sm:flex-nowrap items-center gap-3"><span class="w-10 h-10 rounded-xl bg-light-blue-tint text-brand-blue flex items-center justify-center shrink-0">' + ic(it.ikon || 'link') + '</span>' +
          '<div class="min-w-0 flex-1"><div class="flex items-center gap-2"><span class="font-label-ui text-label-ui text-brand-navy">' + esc(it.label) + '</span>' + demoBadge(it.id) + '</div><a href="' + esc(U.href(it.url)) + '" target="_blank" rel="noopener noreferrer" class="font-caption text-caption text-brand-blue hover:underline truncate block max-w-[60vw] sm:max-w-md">' + esc(it.url) + '</a></div>' +
          '<span class="font-caption text-caption text-text-secondary">' + U.num(J[it.label] || 0) + ' klik</span>' + sw(it.tampil, 'data-v="tampil" data-sheet="Kontak" data-id="' + esc(it.id) + '"', 'Tampilkan ' + it.label) + aksiItem('Kontak', it, i, L.length) + '</li>').join('') + '</ul>' : empty('alternate_email', 'Belum ada tautan kontak')));
    }
  };

  // ===================================================================
  // A8 — PESAN MASUK
  // ===================================================================
  function pesanTersaring() {
    const P = ui.pesan, q = P.q.toLowerCase();
    return (S().pesan.list || []).filter((m) => (P.f === 'semua' || m.status === P.f) && (!q || (m.nama + ' ' + m.email + ' ' + m.pesan).toLowerCase().indexOf(q) > -1));
  }
  views.pesan = {
    render() {
      const ps = S().pesan || { list: [], baru: 0, total: 0 }, P = ui.pesan, L = pesanTersaring(), sel = Object.keys(P.sel).filter((k) => P.sel[k]);
      const tab = (k, l, n) => '<button type="button" data-v="pf" data-f="' + k + '" aria-pressed="' + (P.f === k) + '" class="px-3.5 py-1.5 rounded-full font-label-ui text-label-ui ' + (P.f === k ? 'bg-brand-navy text-surface-white' : 'text-text-secondary hover:text-brand-navy') + '">' + l + ' <span class="opacity-70">' + n + '</span></button>';
      return page(head('Pesan Masuk', 'Pesan dari formulir kontak. Setiap pesan baru juga dikirim ke email notifikasi Anda.', '<button type="button" data-v="pesanXlsx" class="btn-light btn-sm !py-2.5">' + ic('table_view', 'text-[18px]') + 'Unduh Excel</button>') +
        box('<div class="flex flex-col lg:flex-row lg:items-center gap-3 justify-between mb-4"><div class="inline-flex p-1 bg-surface-container-low rounded-full self-start flex-wrap">' + tab('semua', 'Semua', ps.list.length) + tab('baru', 'Baru', ps.baru) + tab('dibaca', 'Dibaca', ps.list.length - ps.baru) + '</div>' +
          '<label class="relative block lg:w-80"><span class="sr-only">Cari pesan</span>' + ic('search', 'absolute left-3 top-2.5 text-text-secondary text-[20px]') + '<input type="search" data-c="pq" value="' + esc(P.q) + '" placeholder="Cari nama, email, atau isi…" class="' + INP + ' !pl-10"></label></div>' +
          (sel.length ? '<div class="flex flex-wrap items-center gap-2 mb-3 p-2.5 rounded-xl bg-light-blue-tint"><span class="font-label-ui text-label-ui text-brand-navy px-2">' + sel.length + ' dipilih</span><button type="button" data-v="pStatus" data-s="dibaca" class="btn-ghost btn-sm">' + ic('mark_email_read', 'text-[18px]') + 'Tandai dibaca</button><button type="button" data-v="pStatus" data-s="baru" class="btn-ghost btn-sm">' + ic('mark_email_unread', 'text-[18px]') + 'Tandai baru</button><button type="button" data-v="pDel" class="btn btn-sm text-error hover:bg-error-container">' + ic('delete', 'text-[18px]') + 'Hapus</button><button type="button" data-v="pClear" class="btn-ghost btn-sm ml-auto">Batal</button></div>' : '') +
          (L.length ? '<ul class="md:hidden divide-y divide-border-subtle -mx-1">' + L.slice(0, P.n).map((m) => '<li class="flex items-start gap-3 py-3 px-1" data-v="bukaPesan" data-id="' + esc(m.id) + '"><input type="checkbox" data-c="psel" data-id="' + esc(m.id) + '" data-stop class="w-5 h-5 mt-2.5 accent-[rgb(var(--c-brand))] shrink-0" aria-label="Pilih pesan ' + esc(m.nama) + '"' + (P.sel[m.id] ? ' checked' : '') + '>' +
              '<div class="min-w-0 flex-1 cursor-pointer"><div class="flex items-center justify-between gap-2"><span class="font-label-ui text-label-ui text-brand-navy truncate ' + (m.status === 'baru' ? 'font-bold' : '') + '">' + esc(m.nama) + '</span><span class="font-caption text-caption text-text-secondary shrink-0">' + U.rel(m.timestamp) + '</span></div>' +
              '<div class="font-caption text-caption text-text-secondary truncate">' + esc(m.email) + '</div><p class="font-body-sm text-body-sm text-text-secondary line-clamp-2 mt-1">' + esc(m.pesan) + '</p>' +
              '<span class="inline-block mt-1.5 font-caption text-caption px-2 py-0.5 rounded-full ' + (m.status === 'baru' ? 'bg-soft-yellow text-tertiary font-bold' : 'bg-success-container text-success') + '">' + (m.status === 'baru' ? 'Baru' : 'Dibaca') + '</span></div></li>').join('') + '</ul>' +
            '<div class="hidden md:block overflow-x-auto -mx-2"><table class="w-full min-w-[640px] text-left"><thead><tr class="bg-input-bg font-label-caps text-label-caps uppercase text-text-secondary"><th class="p-3 w-10"><input type="checkbox" data-c="pall" aria-label="Pilih semua" class="w-4 h-4 accent-[rgb(var(--c-brand))]"' + (L.length && L.slice(0, P.n).every((m) => P.sel[m.id]) ? ' checked' : '') + '></th><th class="p-3">Pengirim</th><th class="p-3">Pesan</th><th class="p-3 w-36">Waktu</th><th class="p-3 w-24">Status</th></tr></thead><tbody class="divide-y divide-border-subtle">' +
            L.slice(0, P.n).map((m) => '<tr class="hover:bg-light-blue-tint/40 cursor-pointer ' + (m.status === 'baru' ? 'font-semibold' : '') + '" data-v="bukaPesan" data-id="' + esc(m.id) + '"><td class="p-3" data-stop><input type="checkbox" data-c="psel" data-id="' + esc(m.id) + '" class="w-4 h-4 accent-[rgb(var(--c-brand))]" aria-label="Pilih pesan ' + esc(m.nama) + '"' + (P.sel[m.id] ? ' checked' : '') + '></td>' +
              '<td class="p-3"><div class="flex items-center gap-2.5"><span class="w-9 h-9 rounded-full ' + (m.status === 'baru' ? 'bg-brand-blue' : 'bg-secondary') + ' text-surface-white text-[13px] font-bold flex items-center justify-center shrink-0">' + esc(U.initials(m.nama)) + '</span><div class="min-w-0"><div class="font-label-ui text-label-ui text-brand-navy truncate max-w-[180px]">' + esc(m.nama) + '</div><div class="font-caption text-caption text-text-secondary font-normal truncate max-w-[180px]">' + esc(m.email) + '</div></div></div></td>' +
              '<td class="p-3 font-body-sm text-body-sm text-text-secondary font-normal"><span class="line-clamp-2 max-w-[420px]">' + esc(m.pesan) + '</span></td><td class="p-3 font-caption text-caption text-text-secondary font-normal">' + U.rel(m.timestamp) + '</td>' +
              '<td class="p-3"><span class="font-caption text-caption px-2 py-0.5 rounded-full ' + (m.status === 'baru' ? 'bg-soft-yellow text-tertiary font-bold' : 'bg-success-container text-success') + '">' + (m.status === 'baru' ? 'Baru' : 'Dibaca') + '</span></td></tr>').join('') + '</tbody></table></div>' +
            (L.length > P.n ? '<div class="text-center mt-4"><button type="button" data-v="pMore" class="btn-light btn-sm">Muat lebih banyak (' + (L.length - P.n) + ')</button></div>' : '')
          : empty('inbox', P.q || P.f !== 'semua' ? 'Tidak ada pesan yang cocok' : 'Belum ada pesan masuk', P.q ? 'Coba kata kunci lain.' : 'Pesan dari formulir kontak situs akan muncul di sini.'))));
    },
    mount() {
      const q = $('[data-c="pq"]');
      if (q) q.addEventListener('input', U.debounce(() => { ui.pesan.q = q.value.trim(); ui.pesan.n = 50; const pos = q.selectionStart; C.render({ bg: true }); const nq = $('[data-c="pq"]'); nq.focus(); nq.setSelectionRange(pos, pos); }, 180));
      $$('[data-c="psel"]').forEach((c) => c.addEventListener('change', () => { ui.pesan.sel[c.dataset.id] = c.checked; C.render({ bg: true }); }));
      const all = $('[data-c="pall"]'); if (all) all.addEventListener('change', () => { pesanTersaring().slice(0, ui.pesan.n).forEach((m) => { ui.pesan.sel[m.id] = all.checked; }); C.render({ bg: true }); });
    }
  };
  H.pf = (b) => { ui.pesan.f = b.dataset.f; ui.pesan.n = 50; C.render({ bg: true }); };
  H.pMore = () => { ui.pesan.n += 50; C.render({ bg: true }); };
  H.pClear = () => { ui.pesan.sel = {}; C.render({ bg: true }); };
  function ubahStatus(ids, st) {
    const ps = S().pesan, snap = clone(ps);
    let ubah = 0; ps.list.forEach((m) => { if (ids.indexOf(m.id) > -1 && m.status !== st) { m.status = st; ubah++; } });
    if (!ubah) return;
    ps.baru = ps.list.filter((m) => m.status === 'baru').length;
    C.navHtml(); C.render({ bg: true });
    C.Writer.run('pesan.status', { ids, status: st }, { label: 'Status pesan', pesan: false, fail: () => { S().pesan = snap; C.navHtml(); C.render({ bg: true }); } });
  }
  H.pStatus = (b) => { const ids = Object.keys(ui.pesan.sel).filter((k) => ui.pesan.sel[k]); ui.pesan.sel = {}; ubahStatus(ids, b.dataset.s); };
  H.pDel = async () => {
    const ids = Object.keys(ui.pesan.sel).filter((k) => ui.pesan.sel[k]);
    if (!ids.length || !(await confirmBox({ title: 'Hapus ' + ids.length + ' pesan?', text: 'Pesan akan dihapus permanen dari sheet Pesan.', ok: 'Hapus', danger: true }))) return;
    const ps = S().pesan, snap = clone(ps);
    ps.list = ps.list.filter((m) => ids.indexOf(m.id) === -1); ps.total = Math.max(0, ps.total - ids.length); ps.baru = ps.list.filter((m) => m.status === 'baru').length;
    ui.pesan.sel = {}; C.navHtml(); C.render({ bg: true });
    C.Writer.run('pesan.hapus', { ids }, { label: 'Hapus pesan', fail: () => { S().pesan = snap; C.navHtml(); C.render({ bg: true }); } });
  };
  H.bukaPesan = (b, e) => {
    if (e && e.target.closest('[data-stop]')) return;
    const m = S().pesan.list.find((x) => x.id === b.dataset.id); if (!m) return;
    modal({ title: 'Pesan dari ' + esc(m.nama), submit: false, wide: true, noFocus: true, body:
      '<div class="flex items-center gap-3"><span class="w-12 h-12 rounded-full bg-brand-blue text-surface-white font-bold flex items-center justify-center">' + esc(U.initials(m.nama)) + '</span><div><p class="font-label-ui text-label-ui text-brand-navy">' + esc(m.nama) + '</p><a class="font-body-sm text-body-sm text-brand-blue hover:underline" href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a><p class="font-caption text-caption text-text-secondary">' + U.dateTime(m.timestamp) + '</p></div></div>' +
      '<div class="p-4 rounded-2xl bg-input-bg font-body-md text-body-md text-brand-navy whitespace-pre-wrap break-words">' + esc(m.pesan) + '</div>' +
      '<div class="flex flex-wrap gap-2 justify-end"><a class="btn-primary btn-sm !py-2.5" href="mailto:' + esc(m.email) + '?subject=' + encodeURIComponent('Re: Pesan dari situs portofolio') + '">' + ic('reply', 'text-[18px]') + 'Balas lewat email</a>' +
      '<button type="button" class="btn-light btn-sm !py-2.5" data-copy="' + esc(m.email) + '">' + ic('content_copy', 'text-[18px]') + 'Salin email</button></div>' });
    $('#dlg [data-copy]').addEventListener('click', (ev) => { navigator.clipboard && navigator.clipboard.writeText(ev.currentTarget.dataset.copy).then(() => U.toast('Email disalin.')); });
    if (m.status === 'baru') ubahStatus([m.id], 'dibaca');
  };
  H.pesanXlsx = async () => {
    const L = pesanTersaring();
    try { await eksporXlsx('pesan-masuk-' + tglFile(), [{ name: 'Pesan', rows: [['Waktu', 'Nama', 'Email', 'Pesan', 'Status']].concat(L.map((m) => [U.dateTime(m.timestamp), m.nama, m.email, m.pesan, m.status])) }]); } catch (e) { U.toast(e.message, 'error'); }
  };

  // ===================================================================
  // A9 — STATISTIK & LAPORAN
  // ===================================================================
  const JENIS_EV = { kunjungan: 'Kunjungan', klik_proyek: 'Klik proyek', klik_kontak: 'Klik kontak', klik_cta: 'Klik tombol' };
  const isoHari = (t) => { const x = new Date(t); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  function rentangStat() {
    const s = ui.stat;
    if (s.r === 'x' && s.dari && s.sampai) return { dari: s.dari, sampai: s.sampai };
    const n = Number(s.r) || 30, now = Date.now();
    return { dari: isoHari(now - (n - 1) * 86400e3), sampai: isoHari(now) };
  }
  function muatStat(fresh) {
    const R = rentangStat(), k = R.dari + '|' + R.sampai;
    if (STATS[k] && !fresh) return STATS[k];
    STATS[k] = { loading: true };
    C.read('admin.stats', Object.assign({}, R, fresh ? { _fresh: true } : {})).then((r) => {
      STATS[k] = r.success ? r.data : { error: r.message };
      if (C.A.view === 'statistik') C.render({ bg: true });
    }).catch((e) => { STATS[k] = { error: e.message }; if (C.A.view === 'statistik') C.render({ bg: true }); });
    return STATS[k];
  }
  function agregat(log, R) {
    const hari = {}, out = { proyek: {}, kontak: {}, cta: {}, perangkat: {}, sumber: {}, tot: { k: 0, p: 0, c: 0, a: 0 } };
    for (let t = new Date(R.dari + 'T00:00:00').getTime(); t <= new Date(R.sampai + 'T00:00:00').getTime(); t += 86400e3) hari[isoHari(t)] = { d: isoHari(t), v: 0, v2: 0 };
    log.forEach((r) => {
      const dk = isoHari(r[0]), j = r[1], t = r[2] || '(tanpa label)';
      if (j === 'kunjungan') { out.tot.k++; if (hari[dk]) hari[dk].v++; out.perangkat[r[3]] = (out.perangkat[r[3]] || 0) + 1; out.sumber[t] = (out.sumber[t] || 0) + 1; }
      else if (j === 'klik_proyek') { out.tot.p++; if (hari[dk]) hari[dk].v2++; out.proyek[t] = (out.proyek[t] || 0) + 1; }
      else if (j === 'klik_kontak') { out.tot.c++; out.kontak[t] = (out.kontak[t] || 0) + 1; }
      else if (j === 'klik_cta') { out.tot.a++; out.cta[t] = (out.cta[t] || 0) + 1; }
    });
    out.harian = Object.keys(hari).sort().map((k) => hari[k]);
    return out;
  }
  views.statistik = {
    render() {
      const s = ui.stat, R = rentangStat(), st = muatStat(), siap = st && st.log;
      const A = siap ? agregat(st.log, R) : null;
      const rb = (v, l) => '<button type="button" data-v="sr" data-r="' + v + '" aria-pressed="' + (String(s.r) === String(v)) + '" class="px-3 py-1.5 rounded-full font-caption text-caption ' + (String(s.r) === String(v) ? 'bg-brand-blue text-surface-white font-semibold' : 'text-text-secondary hover:text-text-primary') + '">' + l + '</button>';
      const sk = '<div class="sk h-48 rounded-2xl"></div>';
      const logF = siap ? st.log.filter((r) => (!s.jenis || r[1] === s.jenis) && (!s.q || (r[2] + ' ' + r[3]).toLowerCase().indexOf(s.q.toLowerCase()) > -1)) : [];
      const pesanR = (S().pesan.list || []).filter((m) => { const t = isoHari(m.timestamp); return t >= R.dari && t <= R.sampai && (!s.q || (m.nama + m.email + m.pesan).toLowerCase().indexOf(s.q.toLowerCase()) > -1); });
      return page(head('Statistik & Laporan', 'Grafik dan tabel interaksi pengunjung. Unduh sebagai Excel atau PDF sesuai filter.',
          '<button type="button" data-v="statXlsx" class="btn-light btn-sm !py-2.5"' + (siap ? '' : ' disabled') + '>' + ic('table_view', 'text-[18px]') + 'Unduh Excel</button><button type="button" data-v="statPdf" class="btn-navy btn-sm !py-2.5"' + (siap ? '' : ' disabled') + '>' + ic('picture_as_pdf', 'text-[18px]') + 'Unduh PDF</button>') +
        box('<div class="flex flex-col lg:flex-row lg:items-center gap-3 justify-between"><div class="inline-flex p-1 bg-surface-container-low rounded-full flex-wrap self-start" role="group" aria-label="Rentang">' + rb(7, '7 hari') + rb(30, '30 hari') + rb(90, '90 hari') + rb(180, '180 hari') + rb('x', 'Pilih tanggal') + '</div>' +
          (s.r === 'x' ? '<div class="flex items-center gap-2 flex-wrap"><input type="date" data-c="sd" value="' + esc(s.dari || R.dari) + '" class="' + INP + ' !w-auto"><span class="text-text-secondary">–</span><input type="date" data-c="ss" value="' + esc(s.sampai || R.sampai) + '" class="' + INP + ' !w-auto"><button type="button" data-v="srApply" class="btn-primary btn-sm !py-2.5">Terapkan</button></div>' : '<p class="font-body-sm text-body-sm text-text-secondary">' + U.date(R.dari) + ' – ' + U.date(R.sampai) + '</p>') + '</div>') +
        (st && st.error ? box(empty('cloud_off', 'Statistik gagal dimuat', esc(st.error), '<button type="button" data-v="statRetry" class="btn-primary btn-sm mt-4">Coba lagi</button>')) :
        '<div class="grid grid-cols-2 lg:grid-cols-4 gap-space-md">' + [['Kunjungan', 'visibility', A && A.tot.k], ['Klik proyek', 'ads_click', A && A.tot.p], ['Klik kontak', 'contact_page', A && A.tot.c], ['Klik tombol', 'touch_app', A && A.tot.a]].map((x) => '<div class="bg-surface-white rounded-[20px] shadow-sm p-4"><div class="flex items-center gap-2 text-text-secondary font-label-ui text-label-ui">' + ic(x[1], 'text-[18px] text-brand-blue') + x[0] + '</div><div class="text-[28px] font-bold text-brand-navy mt-1">' + (A ? U.num(x[2]) : '<span class="sk inline-block h-7 w-20 align-middle"></span>') + '</div></div>').join('') + '</div>' +
        '<div class="grid grid-cols-1 lg:grid-cols-12 gap-space-md">' +
          box('<h2 class="font-headline-sm text-headline-sm text-text-primary mb-1">Kunjungan per hari</h2><p class="font-caption text-caption text-text-secondary mb-2">Arahkan kursor/ketuk grafik untuk detail.</p>' + (A ? (A.tot.k ? '<div id="ch-stat"></div>' : empty('insights', 'Belum ada kunjungan di rentang ini')) : sk), 'lg:col-span-8') +
          box('<h2 class="font-headline-sm text-headline-sm text-text-primary mb-4">Proporsi perangkat</h2>' + (A ? donut(sortObj(A.perangkat).map((x) => [LABEL_DEV[x[0]] || x[0], x[1]])) : sk), 'lg:col-span-4') +
          box('<h2 class="font-headline-sm text-headline-sm text-text-primary mb-4">Klik per proyek</h2>' + (A ? hbars(sortObj(A.proyek, 8).map((x) => [namaProyek(x[0]), x[1]]), { kosong: 'Belum ada klik proyek' }) : sk), 'lg:col-span-6') +
          box('<h2 class="font-headline-sm text-headline-sm text-text-primary mb-4">Klik tautan kontak</h2>' + (A ? hbars(sortObj(A.kontak, 8), { kuning: true, ic: 'contact_page', kosong: 'Belum ada klik kontak' }) : sk), 'lg:col-span-6') +
          box('<h2 class="font-headline-sm text-headline-sm text-text-primary mb-4">Sumber kunjungan</h2>' + (A ? hbars(sortObj(A.sumber, 6), { ic: 'travel_explore', kosong: 'Belum ada data sumber' }) : sk), 'lg:col-span-6') +
          box('<h2 class="font-headline-sm text-headline-sm text-text-primary mb-4">Klik tombol ajakan (CTA)</h2>' + (A ? hbars(sortObj(A.cta, 6).map((x) => [x[0].replace(/_/g, ' '), x[1]]), { ic: 'touch_app', kosong: 'Belum ada klik tombol' }) : sk), 'lg:col-span-6') +
        '</div>' +
        box('<div class="flex flex-col lg:flex-row lg:items-center gap-3 justify-between mb-4"><div class="inline-flex p-1 bg-surface-container-low rounded-full self-start"><button type="button" data-v="stab" data-t="log" class="px-3.5 py-1.5 rounded-full font-label-ui text-label-ui ' + (s.tab === 'log' ? 'bg-brand-navy text-surface-white' : 'text-text-secondary') + '">Log statistik</button><button type="button" data-v="stab" data-t="pesan" class="px-3.5 py-1.5 rounded-full font-label-ui text-label-ui ' + (s.tab === 'pesan' ? 'bg-brand-navy text-surface-white' : 'text-text-secondary') + '">Pesan masuk</button>' + (st && st.arsip && st.arsip.length ? '<button type="button" data-v="stab" data-t="arsip" class="px-3.5 py-1.5 rounded-full font-label-ui text-label-ui ' + (s.tab === 'arsip' ? 'bg-brand-navy text-surface-white' : 'text-text-secondary') + '">Arsip bulanan</button>' : '') + '</div>' +
          '<div class="flex flex-wrap items-center gap-2">' + (s.tab === 'log' ? '<select data-c="sj" class="' + INP + ' !w-auto"><option value="">Semua jenis</option>' + Object.keys(JENIS_EV).map((k) => '<option value="' + k + '"' + (s.jenis === k ? ' selected' : '') + '>' + JENIS_EV[k] + '</option>').join('') + '</select>' : '') +
          '<input type="search" data-c="sq" value="' + esc(s.q) + '" placeholder="Cari…" class="' + INP + ' !w-56"></div></div>' +
          (s.tab === 'log' ? (siap ? tabel(['Waktu', 'Jenis', 'Target', 'Perangkat'], logF.slice(0, s.n).map((r) => [U.dateTime(r[0]), JENIS_EV[r[1]] || r[1], r[1] === 'klik_proyek' ? namaProyek(r[2]) : (r[2] || '-'), LABEL_DEV[r[3]] || r[3]]), logF.length, s.n) + (st.terpotong ? '<p class="' + HELP + '">Menampilkan 5.000 kejadian terbaru pada rentang ini.</p>' : '') : sk)
            : s.tab === 'pesan' ? tabel(['Waktu', 'Nama', 'Email', 'Pesan', 'Status'], pesanR.slice(0, s.n).map((m) => [U.dateTime(m.timestamp), m.nama, m.email, m.pesan.slice(0, 120), m.status]), pesanR.length, s.n)
            : tabel(['Bulan', 'Jenis', 'Target', 'Perangkat', 'Jumlah'], (st.arsip || []).map((a) => [a.bulan, JENIS_EV[a.jenis_event] || a.jenis_event, a.target, a.perangkat, U.num(a.jumlah)]), (st.arsip || []).length, 9999)))));
    },
    mount() {
      const st = muatStat();
      if (st && st.log) { const A = agregat(st.log, rentangStat()); if (A.tot.k) lineChart($('#ch-stat'), A.harian, { label: 'Kunjungan per hari', n1: 'Kunjungan', n2: 'Klik proyek' }); }
      const q = $('[data-c="sq"]'); if (q) q.addEventListener('input', U.debounce(() => { ui.stat.q = q.value.trim(); ui.stat.n = 50; const p = q.selectionStart; C.render({ bg: true }); const n = $('[data-c="sq"]'); n.focus(); n.setSelectionRange(p, p); }, 200));
      const j = $('[data-c="sj"]'); if (j) j.addEventListener('change', () => { ui.stat.jenis = j.value; ui.stat.n = 50; C.render({ bg: true }); });
    }
  };
  function tabel(head, rows, total, n) {
    if (!rows.length) return empty('table_view', 'Tidak ada data pada filter ini');
    return '<div class="overflow-x-auto -mx-2"><table class="w-full min-w-[560px] text-left"><thead><tr class="bg-input-bg font-label-caps text-label-caps uppercase text-text-secondary">' + head.map((h) => '<th class="p-3">' + h + '</th>').join('') + '</tr></thead><tbody class="divide-y divide-border-subtle font-body-sm text-body-sm text-brand-navy">' +
      rows.map((r) => '<tr class="hover:bg-light-blue-tint/40">' + r.map((c) => '<td class="p-3 align-top">' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
      (total > n ? '<div class="text-center mt-4"><button type="button" data-v="sMore" class="btn-light btn-sm">Muat lebih banyak (' + U.num(total - n) + ')</button></div>' : '') +
      '<p class="' + HELP + '">' + U.num(Math.min(n, total)) + ' dari ' + U.num(total) + ' baris</p>';
  }
  H.sr = (b) => { ui.stat.r = b.dataset.r === 'x' ? 'x' : Number(b.dataset.r); ui.stat.n = 50; C.render({ bg: true }); };
  H.srApply = () => { const a = $('[data-c="sd"]').value, b = $('[data-c="ss"]').value; if (!a || !b || a > b) { U.toast('Rentang tanggal tidak valid.', 'error'); return; } ui.stat.dari = a; ui.stat.sampai = b; C.render({ bg: true }); };
  H.stab = (b) => { ui.stat.tab = b.dataset.t; ui.stat.n = 50; C.render({ bg: true }); };
  H.sMore = () => { ui.stat.n += 100; C.render({ bg: true }); };
  H.statRetry = () => { muatStat(true); C.render({ bg: true }); };
  function dataLaporan() {
    const s = ui.stat, R = rentangStat(), st = muatStat(); if (!st || !st.log) return null;
    const A = agregat(st.log, R);
    const log = st.log.filter((r) => (!s.jenis || r[1] === s.jenis) && (!s.q || (r[2] + ' ' + r[3]).toLowerCase().indexOf(s.q.toLowerCase()) > -1));
    const pesan = (S().pesan.list || []).filter((m) => { const t = isoHari(m.timestamp); return t >= R.dari && t <= R.sampai; });
    return { R, A, log, pesan, arsip: st.arsip || [] };
  }
  H.statXlsx = async () => {
    const L = dataLaporan(); if (!L) return;
    try {
      await eksporXlsx('statistik-' + L.R.dari + '_' + L.R.sampai, [
        { name: 'Ringkasan', rows: [['Rentang', L.R.dari + ' s.d. ' + L.R.sampai], ['Kunjungan', L.A.tot.k], ['Klik proyek', L.A.tot.p], ['Klik kontak', L.A.tot.c], ['Klik tombol', L.A.tot.a], [], ['Tanggal', 'Kunjungan', 'Klik proyek']].concat(L.A.harian.map((x) => [x.d, x.v, x.v2])) },
        { name: 'Klik per proyek', rows: [['Proyek', 'Klik']].concat(sortObj(L.A.proyek).map((x) => [namaProyek(x[0]), x[1]])) },
        { name: 'Klik kontak', rows: [['Tautan', 'Klik']].concat(sortObj(L.A.kontak)) },
        { name: 'Perangkat & sumber', rows: [['Perangkat', 'Kunjungan']].concat(sortObj(L.A.perangkat).map((x) => [LABEL_DEV[x[0]] || x[0], x[1]])).concat([[], ['Sumber', 'Kunjungan']]).concat(sortObj(L.A.sumber)) },
        { name: 'Log statistik', rows: [['Waktu', 'Jenis', 'Target', 'Perangkat']].concat(L.log.map((r) => [U.dateTime(r[0]), JENIS_EV[r[1]] || r[1], r[1] === 'klik_proyek' ? namaProyek(r[2]) : r[2], r[3]])) },
        { name: 'Pesan masuk', rows: [['Waktu', 'Nama', 'Email', 'Pesan', 'Status']].concat(L.pesan.map((m) => [U.dateTime(m.timestamp), m.nama, m.email, m.pesan, m.status])) }
      ].concat(L.arsip.length ? [{ name: 'Arsip bulanan', rows: [['Bulan', 'Jenis', 'Target', 'Perangkat', 'Jumlah']].concat(L.arsip.map((a) => [a.bulan, a.jenis_event, a.target, a.perangkat, a.jumlah])) }] : []));
    } catch (e) { U.toast(e.message, 'error'); }
  };
  H.statPdf = async () => {
    const L = dataLaporan(); if (!L) return;
    try {
      await eksporPdf('laporan-statistik-' + L.R.dari + '_' + L.R.sampai, {
        title: 'Laporan Statistik Portofolio', subtitle: K().profil.nama_lengkap + ' · ' + U.date(L.R.dari) + ' – ' + U.date(L.R.sampai) + (ui.stat.jenis ? ' · filter: ' + JENIS_EV[ui.stat.jenis] : ''),
        kpi: [['Kunjungan', U.num(L.A.tot.k)], ['Klik proyek', U.num(L.A.tot.p)], ['Klik kontak', U.num(L.A.tot.c)], ['Pesan masuk', U.num(L.pesan.length)]],
        tables: [
          { title: 'Klik per proyek', head: ['Proyek', 'Klik'], body: sortObj(L.A.proyek).map((x) => [namaProyek(x[0]), U.num(x[1])]) },
          { title: 'Perangkat', head: ['Perangkat', 'Kunjungan'], body: sortObj(L.A.perangkat).map((x) => [LABEL_DEV[x[0]] || x[0], U.num(x[1])]) },
          { title: 'Klik tautan kontak', head: ['Tautan', 'Klik'], body: sortObj(L.A.kontak).map((x) => [x[0], U.num(x[1])]) },
          { title: 'Pesan masuk', head: ['Waktu', 'Nama', 'Email', 'Pesan'], body: L.pesan.map((m) => [U.dateTime(m.timestamp), m.nama, m.email, m.pesan.slice(0, 160)]), colStyles: { 3: { cellWidth: 220 } } },
          { title: 'Log statistik (maks. 1.000 baris)', head: ['Waktu', 'Jenis', 'Target', 'Perangkat'], body: L.log.slice(0, 1000).map((r) => [U.dateTime(r[0]), JENIS_EV[r[1]] || r[1], r[1] === 'klik_proyek' ? namaProyek(r[2]) : r[2], LABEL_DEV[r[3]] || r[3]]) }
        ]
      });
    } catch (e) { U.toast(e.message, 'error'); }
  };

  // ===================================================================
  // MIGRASI DATA (gas-migrasi-database)
  // ===================================================================
  const MIG_SHEETS = [['Profil', true], ['Pengaturan', true], ['Tentang', true], ['Keahlian', true], ['Portofolio', true], ['Testimoni', true], ['Kontak', true], ['Pesan', true], ['Statistik', false]];
  views.migrasi = {
    render() {
      const m = ui.mig;
      return page(head('Migrasi Data', 'Pindahkan data dari app portofolio lama atau pulihkan dari berkas cadangan. Aman diulang — data tidak akan dobel.') +
        '<div class="grid grid-cols-1 xl:grid-cols-5 gap-space-md">' +
          box('<form data-form="mig" class="space-y-5" novalidate>' +
            '<div><span class="' + LBL + '">Sumber data</span><div class="inline-flex p-1 bg-surface-container-low rounded-full"><label class="cursor-pointer"><input type="radio" name="tipe" value="sheet" class="sr-only peer" checked><span class="block px-3.5 py-1.5 rounded-full font-label-ui text-label-ui text-text-secondary peer-checked:bg-brand-navy peer-checked:text-surface-white">Spreadsheet app lama</span></label><label class="cursor-pointer"><input type="radio" name="tipe" value="json" class="sr-only peer"><span class="block px-3.5 py-1.5 rounded-full font-label-ui text-label-ui text-text-secondary peer-checked:bg-brand-navy peer-checked:text-surface-white">Berkas cadangan JSON</span></label></div></div>' +
            '<div data-src="sheet">' + inp('sid', 'URL atau ID spreadsheet app lama', '', { ph: 'https://docs.google.com/spreadsheets/d/…', help: ic('lock', 'text-[14px] align-[-2px]') + ' Hanya <b>dibaca</b> — app lama tidak diubah. Harus milik akun Google yang sama dengan app ini.' }) + '</div>' +
            '<div data-src="json" hidden><label class="' + LBL + '" for="f-jf">Berkas cadangan (.json)</label><input id="f-jf" name="jf" type="file" accept="application/json,.json" class="block w-full font-body-sm text-body-sm file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-light-blue-tint file:text-brand-blue file:font-semibold"><p class="' + HELP + '">Dibuat dari tombol "Ekspor cadangan" di bawah.</p></div>' +
            '<fieldset><legend class="' + LBL + '">Data yang dipindahkan</legend><div class="grid grid-cols-2 sm:grid-cols-3 gap-2">' + MIG_SHEETS.map((x) => '<label class="flex items-center gap-2 p-2.5 rounded-xl bg-input-bg cursor-pointer"><input type="checkbox" name="sh" value="' + x[0] + '" class="w-4 h-4 accent-[rgb(var(--c-brand))]"' + (x[1] ? ' checked' : '') + '><span class="font-body-sm text-body-sm text-brand-navy">' + x[0] + (x[0] === 'Statistik' ? ' <span class="text-text-secondary">(log)</span>' : '') + '</span></label>').join('') + '</div></fieldset>' +
            '<div class="space-y-2"><label class="flex items-start gap-3"><input type="checkbox" name="ganti" checked class="w-4 h-4 mt-1 accent-[rgb(var(--c-brand))]"><span><span class="font-label-ui text-label-ui text-brand-navy">Ganti data contoh bawaan</span><span class="block ' + HELP + '">Baris berlabel "Contoh" dihapus hanya pada data yang ada di sumber.</span></span></label>' +
            '<label class="flex items-start gap-3"><input type="checkbox" name="timpa" class="w-4 h-4 mt-1 accent-[rgb(var(--c-brand))]"><span><span class="font-label-ui text-label-ui text-brand-navy">Timpa data yang sudah ada</span><span class="block ' + HELP + '">Biarkan mati agar perubahan yang Anda buat di app baru tidak tertimpa.</span></span></label></div>' +
            '<div class="flex flex-wrap gap-2"><button type="submit" value="scan" class="btn-light !py-3"' + (ui.migBusy ? ' disabled' : '') + '>' + ic('search', 'text-[18px]') + 'Pindai (dry-run)</button><button type="submit" value="run" class="btn-primary !py-3"' + (ui.migBusy ? ' disabled' : '') + '>' + ic(ui.migBusy ? 'progress_activity' : 'move_up', 'text-[18px]' + (ui.migBusy ? ' spin' : '')) + 'Jalankan import</button></div>' +
          '</form>', 'xl:col-span-3') +
          box('<h2 class="font-headline-sm text-headline-sm text-brand-navy mb-3">Langkah pindah (cutover)</h2><ol class="space-y-3 font-body-sm text-body-sm text-text-secondary list-decimal pl-5">' +
            '<li><b class="text-brand-navy">Pindai</b> untuk melihat jumlah data yang akan ditambah, diperbarui, atau dilewati — belum ada yang ditulis.</li>' +
            '<li><b class="text-brand-navy">Jalankan import</b>, lalu periksa Profil, Portofolio, gambar, dan Pengaturan.</li>' +
            '<li>Tepat sebelum pindah alamat, <b class="text-brand-navy">jalankan import sekali lagi</b> untuk menangkap data baru dari app lama (delta).</li>' +
            '<li>Bagikan alamat baru. Biarkan app lama tetap ada sebagai arsip.</li></ol>' +
            '<div class="mt-5 p-3 rounded-xl bg-light-blue-tint/60 font-caption text-caption text-brand-navy space-y-1"><p>• Kolom dicocokkan berdasarkan <b>nama header</b> (Indonesia/Inggris), bukan urutan.</p><p>• ID file Google Drive lama tetap dipakai — gambar tidak disalin ulang.</p><p>• Rahasia (token, sandi) tidak pernah ikut dipindahkan. Sesi login tidak ikut pindah.</p></div>' +
            '<h2 class="font-headline-sm text-headline-sm text-brand-navy mt-6 mb-2">Cadangan</h2><p class="font-body-sm text-body-sm text-text-secondary mb-3">Unduh salinan konten (tanpa rahasia) untuk berjaga-jaga.</p>' +
            '<div class="flex flex-wrap gap-2"><button type="button" data-v="backup" class="btn-light btn-sm !py-2.5">' + ic('download', 'text-[18px]') + 'Ekspor konten</button><button type="button" data-v="backup" data-pesan="1" class="btn-ghost btn-sm !py-2.5">+ dengan pesan</button></div>', 'xl:col-span-2') +
        '</div>' + (m ? hasilMigrasi(m) : ''));
    },
    mount() {
      const f = $('[data-form="mig"]');
      f.addEventListener('change', (e) => { if (e.target.name === 'tipe') { $$('[data-src]', f).forEach((x) => { x.hidden = x.dataset.src !== e.target.value; }); } });
    }
  };
  function hasilMigrasi(m) {
    const L = m.laporan || {};
    return box('<div class="flex items-center justify-between flex-wrap gap-2 mb-4"><div><h2 class="font-headline-sm text-headline-sm text-brand-navy">' + (m.dryRun ? 'Hasil pindai (belum ditulis)' : 'Hasil import') + '</h2><p class="font-caption text-caption text-text-secondary">Sumber: ' + esc(m.sumber.nama) + ' · ' + U.num(m.ms) + ' ms</p></div>' +
      '<span class="font-caption text-caption px-2.5 py-1 rounded-full font-bold ' + (m.dryRun ? 'bg-soft-yellow text-tertiary' : 'bg-success-container text-success') + '">' + (m.dryRun ? 'DRY-RUN' : 'SELESAI') + '</span></div>' +
      tabel(['Data', 'Di sumber', 'Ditambah', 'Diperbarui', 'Dilewati', 'Contoh dihapus'], Object.keys(L).map((k) => [k + (L[k].tidakAda ? ' (tidak ada)' : ''), U.num(L[k].sumber), U.num(L[k].ditambah), U.num(L[k].diperbarui), U.num(L[k].dilewati), U.num(L[k].contohDihapus || 0)]), Object.keys(L).length, 99) +
      (m.peringatan && m.peringatan.length ? '<div class="mt-4 p-4 rounded-2xl bg-soft-yellow"><p class="font-label-ui text-label-ui text-brand-navy mb-2 flex items-center gap-1">' + ic('warning', 'text-[18px] text-tertiary') + 'Peringatan</p><ul class="list-disc pl-5 space-y-1 font-body-sm text-body-sm text-brand-navy">' + m.peringatan.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : ''));
  }
  F.mig = async (f, e) => {
    const run = e.submitter && e.submitter.value === 'run';
    const tipe = f.querySelector('[name=tipe]:checked').value, sheets = $$('[name=sh]:checked', f).map((x) => x.value);
    if (!sheets.length) { U.toast('Pilih minimal satu data.', 'error'); return; }
    let sumber;
    if (tipe === 'sheet') { const id = val(f, 'sid'); if (!id) return tandaiSalah(f, 'sid', 'Tempel URL atau ID spreadsheet app lama.'); sumber = { tipe: 'sheet', id }; }
    else {
      const file = f.elements.jf.files[0]; if (!file) { U.toast('Pilih berkas cadangan JSON.', 'error'); return; }
      try { sumber = { tipe: 'json', data: JSON.parse(await file.text()) }; } catch (x) { U.toast('Berkas JSON tidak valid.', 'error'); return; }
    }
    if (run && !(await confirmBox({ title: 'Jalankan import sekarang?', text: 'Data dari sumber akan ditulis ke spreadsheet app ini. Proses aman diulang dan tidak membuat data dobel.', ok: 'Jalankan' }))) return;
    ui.migBusy = true; C.render({ bg: true });
    try {
      const r = await C.adm('impor.jalankan', { sumber, sheets, dryRun: !run, timpa: f.elements.timpa.checked, gantiContoh: f.elements.ganti.checked }, { timeout: 330000 });
      if (!r.success) throw new Error(r.message);
      ui.mig = r.data; U.toast(r.message);
      if (run) await C.bootData(true);
    } catch (x) { U.toast(x.message, 'error'); }
    finally {
      ui.migBusy = false;
      const keep = { sid: (($('[data-form="mig"]') || {}).elements || {}).sid };
      C.render({ bg: true });
      if (tipe === 'sheet' && keep.sid) { const nf = $('[data-form="mig"]'); if (nf) nf.elements.sid.value = sumber.id; }
    }
  };
  H.backup = async (b) => {
    try {
      const r = await C.adm('cadangan.ekspor', { pesan: !!b.dataset.pesan }, { read: true });
      if (!r.success) throw new Error(r.message);
      const blob = new Blob([JSON.stringify(r.data, null, 1)], { type: 'application/json' }), a = d.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'cadangan-portofolio-' + tglFile() + '.json'; d.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      U.toast('Cadangan diunduh.');
    } catch (e) { U.toast(e.message, 'error'); }
  };

  // ===================================================================
  // A10 — PENGATURAN
  // ===================================================================
  const SET_UI = {
    situs: { label: 'Situs', ic: 'public', f: [
      ['judul_situs', 'Judul situs (tab & SEO)', { max: 120 }], ['meta_deskripsi', 'Meta deskripsi (SEO)', { area: true, max: 300, help: 'Pratinjau tautan di WhatsApp/LinkedIn membaca tag di index.html — samakan juga di sana.' }],
      ['warna_utama', 'Warna utama', { color: true }], ['situs_aktif', 'Status situs', { sel: [['ya', 'Aktif — tampil normal'], ['tidak', 'Nonaktif — tampil halaman perawatan']] }],
      ['pesan_maintenance', 'Pesan halaman perawatan', { area: true, max: 300 }]] },
    teks: { label: 'Teks Bagian', ic: 'article', f: [
      ['judul_tentang', 'Judul About', { max: 80 }], ['judul_keahlian', 'Judul Skills', { max: 80 }], ['judul_portofolio', 'Judul Portfolio', { max: 80, help: 'Gunakan *kata* untuk aksen tulisan tangan.' }],
      ['sub_portofolio', 'Subjudul Portfolio', { area: true, max: 300 }], ['judul_testimoni', 'Judul Testimoni', { max: 80 }], ['sub_testimoni', 'Subjudul Testimoni', { area: true, max: 300 }],
      ['kontak_judul', 'Judul pita kontak', { max: 100 }], ['kontak_deskripsi', 'Deskripsi pita kontak', { area: true, max: 400 }], ['kontak_catatan', 'Catatan tulisan tangan', { max: 80 }],
      ['status_proyek', 'Status ketersediaan', { max: 60 }], ['status_proyek_ket', 'Keterangan ketersediaan', { max: 200 }], ['footer_tagline', 'Tagline footer', { area: true, max: 300 }], ['footer_lokasi', 'Lokasi', { max: 80 }]] },
    infobar: { label: 'Info Bar & Notifikasi', ic: 'notifications', f: [
      ['info_bar_aktif', 'Info bar di atas navigasi', { sel: [['ya', 'Tampilkan'], ['tidak', 'Sembunyikan']] }], ['info_bar_email', 'Email publik', { type: 'email', max: 120 }],
      ['info_bar_telepon', 'Telepon (opsional)', { max: 30, mode: 'tel' }], ['info_bar_jam', 'Keterangan jam respons', { max: 60 }],
      ['email_notifikasi', 'Email penerima notifikasi pesan', { type: 'email', max: 120, help: 'Kosongkan untuk memakai ADMIN_EMAIL.' }],
      ['batas_pesan_per_jam', 'Batas pesan per perangkat per jam', { type: 'number', min: 1, maxv: 50 }], ['simpan_log_hari', 'Simpan log statistik (hari)', { type: 'number', min: 180, maxv: 1095, help: 'Log lebih lama dirangkum ke sheet Statistik_Bulanan setiap malam.' }]] },
    keamanan: { label: 'Keamanan', ic: 'shield' },
    sistem: { label: 'Sistem & Performa', ic: 'speed' }
  };
  const PRESET_WARNA = ['#2563EB', '#0EA5E9', '#7C3AED', '#DB2777', '#059669', '#EA580C', '#0B1F3A'];
  views.pengaturan = {
    render() {
      if (C.A.extra && C.A.extra.tab) { ui.set = C.A.extra.tab; C.A.extra = null; }
      const t = SET_UI[ui.set] ? ui.set : 'situs', P = K().pengaturan;
      const tabs = '<div class="flex gap-1 overflow-x-auto hide-scrollbar bg-surface-white p-1.5 rounded-full shadow-sm">' + Object.keys(SET_UI).map((k) => '<button type="button" data-v="setTab" data-t="' + k + '" aria-pressed="' + (k === t) + '" class="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-label-ui text-label-ui ' + (k === t ? 'bg-brand-navy text-surface-white' : 'text-text-secondary hover:text-brand-navy') + '">' + ic(SET_UI[k].ic, 'text-[18px]') + SET_UI[k].label + '</button>').join('') + '</div>';
      let isi;
      if (t === 'keamanan') isi = keamananHtml();
      else if (t === 'sistem') isi = sistemHtml();
      else isi = box('<form data-form="set" class="grid sm:grid-cols-2 gap-4" novalidate>' + SET_UI[t].f.map((x) => {
        const o = Object.assign({}, x[2]);
        if (o.area || o.help || o.color) o.cls = 'sm:col-span-2';
        if (o.color) return '<div class="sm:col-span-2"><span class="' + LBL + '">Warna utama</span><div class="flex flex-wrap items-center gap-3"><input type="color" name="warna_utama" value="' + esc(P.warna_utama) + '" class="w-12 h-12 rounded-xl border border-border-subtle cursor-pointer bg-surface-white p-1"><input data-hex class="' + INP + ' !w-36" value="' + esc(P.warna_utama) + '" maxlength="7" aria-label="Kode warna hex">' +
          PRESET_WARNA.map((c) => '<button type="button" data-warna="' + c + '" class="w-8 h-8 rounded-full ring-2 ring-offset-2 ' + (c.toLowerCase() === String(P.warna_utama).toLowerCase() ? 'ring-brand-navy' : 'ring-transparent') + '" style="background:' + c + '" aria-label="Pilih warna ' + c + '"></button>').join('') + '</div><p class="' + HELP + '">Dipakai untuk tombol & aksen di situs dan dashboard. Warna lain menyesuaikan otomatis.</p></div>';
        return inp(x[0], x[1], P[x[0]], o);
      }).join('') + '<div class="sm:col-span-2">' + simpanBar() + '</div></form>');
      return page(head('Pengaturan', 'Tampilan situs, teks bagian, notifikasi, keamanan, dan performa server.') + tabs + isi);
    },
    mount() {
      const f = $('[data-form="set"]');
      if (f) {
        pasangDirty(f, 'pengaturan');
        const col = f.elements.warna_utama, hex = f.querySelector('[data-hex]');
        if (col) {
          const pakai = (v) => { col.value = v; hex.value = v; U.brand(v); C.A.dirty.pengaturan = true; f.querySelector('[data-dirty-note]').hidden = false; };
          col.addEventListener('input', () => pakai(col.value));
          hex.addEventListener('change', () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) pakai(hex.value); else hex.classList.add('is-invalid'); });
          f.addEventListener('click', (e) => { const b = e.target.closest('[data-warna]'); if (b) pakai(b.dataset.warna); });
        }
      }
    }
  };
  H.setTab = (b) => {
    if (C.A.dirty.pengaturan && !w.confirm('Perubahan belum disimpan. Pindah tab?')) return;
    C.A.dirty.pengaturan = false; U.brand(K().pengaturan.warna_utama); ui.set = b.dataset.t; C.render({ bg: true });
    if (ui.set === 'sistem') segarkanSistem(false);
  };
  function simpanSetting(nilai) {
    const snap = clone(K().pengaturan);
    Object.assign(K().pengaturan, nilai); C.A.dirty.pengaturan = false; C.header(); C.render({ bg: true });
    C.Writer.run('pengaturan.simpan', { nilai }, { label: 'Pengaturan', fail: () => { K().pengaturan = snap; C.header(); C.render({ bg: true }); } });
  }
  F.set = (f) => {
    const P = K().pengaturan, nilai = {};
    SET_UI[ui.set].f.forEach((x) => { const v = val(f, x[0]); if (String(P[x[0]]) !== v) nilai[x[0]] = v; });
    if (nilai.warna_utama && !/^#[0-9a-f]{6}$/i.test(nilai.warna_utama)) return tandaiSalah(f, 'warna_utama', 'Kode warna tidak valid.');
    for (const k of ['info_bar_email', 'email_notifikasi']) if (nilai[k] && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(nilai[k])) return tandaiSalah(f, k, 'Format email tidak valid.');
    if (!Object.keys(nilai).length) { C.A.dirty.pengaturan = false; U.toast('Tidak ada perubahan.'); return; }
    simpanSetting(nilai);
  };

  function keamananHtml() {
    const k = S().keamanan || {}, me = C.A.me || {};
    const alamat = location.origin + location.pathname.replace(/admin\.html$/, '') + '#masuk=';
    return '<div class="grid grid-cols-1 lg:grid-cols-2 gap-space-md">' +
      box('<h2 class="font-headline-sm text-headline-sm text-brand-navy flex items-center gap-2">' + ic('account_circle', 'text-brand-blue') + 'Login Google (OAuth 2.0)</h2>' +
        '<div class="mt-4 space-y-4"><div><span class="' + LBL + '">Email Super Admin</span><p class="font-body-md text-body-md text-brand-navy">' + esc(k.adminEmail || '-') + '</p><p class="' + HELP + '">Demi keamanan, hanya bisa diganti lewat Apps Script → Setelan Proyek → Script Properties (<code>ADMIN_EMAIL</code>).</p></div>' +
        '<form data-form="cid" class="space-y-2" novalidate><label class="' + LBL + '" for="f-cid">Client ID OAuth</label><div class="flex flex-col sm:flex-row gap-2"><input id="f-cid" name="cid" type="password" autocomplete="off" class="' + INP + '" placeholder="' + esc(k.clientIdAda ? k.clientIdSamar + ' (tersimpan)' : '1234567890-xxxx.apps.googleusercontent.com') + '"><button type="submit" class="btn-primary btn-sm !py-2.5 shrink-0">Simpan</button></div>' +
        '<p class="' + HELP + '">Status: ' + (k.clientIdAda ? '<b class="text-success">terisi</b>' : '<b class="text-error">belum diisi</b>') + '. Disimpan di Script Properties dan hanya ditampilkan tersamar.</p></form></div>') +
      box('<h2 class="font-headline-sm text-headline-sm text-brand-navy flex items-center gap-2">' + ic('vpn_key', 'text-brand-blue') + 'Alamat rahasia admin</h2>' +
        '<p class="font-body-sm text-body-sm text-text-secondary mt-2">Pintu masuk dashboard: <code class="break-all">' + esc(alamat) + esc(k.alamatSamar || '••••') + '</code></p>' +
        '<p class="' + HELP + '">Alamat ini hanya menyembunyikan pintu. Keamanan sebenarnya ada pada verifikasi Google di server.</p>' +
        '<button type="button" data-v="gantiAlamat" class="btn-light btn-sm !py-2.5 mt-4">' + ic('autorenew', 'text-[18px]') + 'Buat alamat rahasia baru</button>') +
      box('<div class="flex items-center justify-between gap-3"><h2 class="font-headline-sm text-headline-sm text-brand-navy flex items-center gap-2">' + ic('key', 'text-brand-blue') + 'Akses darurat</h2>' + sw(k.daruratAktif, 'data-v="darurat"', 'Akses darurat') + '</div>' +
        '<p class="font-body-sm text-body-sm text-text-secondary mt-2">Cadangan bila login Google bermasalah. Dikunci 15 menit setelah 5× salah. ' + (k.daruratTerkunci ? '<b class="text-error">Sedang terkunci.</b>' : '') + '</p>' +
        '<form data-form="darurat" class="mt-4 grid sm:grid-cols-2 gap-3" novalidate autocomplete="off"><div><label class="' + LBL + '" for="f-sb">Kata sandi baru</label><input id="f-sb" name="sb" type="password" autocomplete="new-password" class="' + INP + '" minlength="12"></div><div><label class="' + LBL + '" for="f-sk">Ulangi kata sandi</label><input id="f-sk" name="sk" type="password" autocomplete="new-password" class="' + INP + '"></div>' +
        '<p class="sm:col-span-2 ' + HELP + '">Minimal 12 karakter, memuat huruf dan angka. Nama pengguna tetap <code>darurat</code>.</p><div class="sm:col-span-2"><button type="submit" class="btn-navy btn-sm !py-2.5">' + ic('lock_reset', 'text-[18px]') + 'Ganti kata sandi darurat</button></div></form>') +
      box('<h2 class="font-headline-sm text-headline-sm text-brand-navy flex items-center gap-2">' + ic('devices', 'text-brand-blue') + 'Sesi</h2>' +
        '<p class="font-body-sm text-body-sm text-text-secondary mt-2">Masuk sebagai <b class="text-brand-navy">' + esc(me.darurat ? 'Akses Darurat' : me.email || '-') + '</b>. Sesi berlaku ' + (k.sesiJam || 2) + ' jam dan diperpanjang otomatis saat Anda aktif (maks. ' + (k.sesiMaksJam || 12) + ' jam).</p>' +
        (k.sesiBerakhir ? '<p class="' + HELP + '">Berakhir sekitar ' + U.dateTime(k.sesiBerakhir) + '.</p>' : '') +
        '<button type="button" data-v="keluarSemua" class="btn btn-sm !py-2.5 mt-4 bg-error-container text-on-error-container hover:brightness-95">' + ic('logout', 'text-[18px]') + 'Keluar dari semua perangkat</button>') +
    '</div>';
  }
  F.cid = (f) => {
    const v = val(f, 'cid');
    if (!/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(v)) return tandaiSalah(f, 'cid', 'Format: 1234567890-xxxx.apps.googleusercontent.com');
    f.elements.cid.value = '';
    C.Writer.run('rahasia.simpan', { kunci: 'OAUTH_CLIENT_ID', nilai: v }, { label: 'Client ID', ok: (r) => { S().keamanan.clientIdAda = r.data.ada; S().keamanan.clientIdSamar = r.data.samar; C.render({ bg: true }); } });
  };
  H.gantiAlamat = async () => {
    if (!(await confirmBox({ title: 'Buat alamat rahasia baru?', text: 'Alamat lama langsung tidak berlaku. Sesi yang sedang aktif tetap berjalan.', ok: 'Buat baru' }))) return;
    try {
      const r = await C.adm('keamanan.gantiAlamat', {});
      if (!r.success) throw new Error(r.message);
      S().keamanan.alamatSamar = r.data.samar; C.persist();
      const url = location.origin + location.pathname.replace(/admin\.html$/, '') + '#masuk=' + r.data.kunci;
      modal({ title: 'Alamat rahasia baru', submit: false, noFocus: true, body: '<p class="font-body-sm text-body-sm text-text-secondary">Simpan sekarang (mis. di pengelola kata sandi). Alamat ini <b>tidak akan ditampilkan lagi</b>.</p>' +
        '<div class="p-3 rounded-xl bg-input-bg font-mono text-[13px] break-all select-all text-brand-navy">' + esc(url) + '</div><button type="button" class="btn-primary btn-sm !py-2.5" data-copy>' + ic('content_copy', 'text-[18px]') + 'Salin alamat</button>' });
      $('#dlg [data-copy]').addEventListener('click', () => { navigator.clipboard && navigator.clipboard.writeText(url).then(() => U.toast('Alamat disalin.')); });
      C.render({ bg: true });
    } catch (e) { U.toast(e.message, 'error'); }
  };
  H.darurat = () => {
    const k = S().keamanan, aktif = !k.daruratAktif;
    C.Writer.run('keamanan.darurat', { aktif }, { label: 'Akses darurat', pesan: aktif ? 'Akses darurat diaktifkan.' : 'Akses darurat dinonaktifkan.', ok: (r) => { k.daruratAktif = r.data.daruratAktif; C.render({ bg: true }); } });
  };
  F.darurat = async (f) => {
    const a = f.elements.sb.value, b = f.elements.sk.value;
    if (a.length < 12 || !/[A-Za-z]/.test(a) || !/\d/.test(a)) return tandaiSalah(f, 'sb', 'Minimal 12 karakter, berisi huruf dan angka.');
    if (a !== b) return tandaiSalah(f, 'sk', 'Kata sandi tidak sama.');
    f.reset();
    const r = await C.Writer.run('keamanan.sandiDarurat', { sandiBaru: a, konfirmasi: b }, { label: 'Sandi darurat' });
    if (r && r.data && r.data.keluar) C.sesiBerakhir('Kata sandi darurat diganti. Masuk lagi dengan sandi baru.');
  };
  H.keluarSemua = async () => {
    if (!(await confirmBox({ title: 'Keluar dari semua perangkat?', text: 'Semua sesi admin — termasuk perangkat ini — dicabut. Anda perlu membuka alamat rahasia lagi untuk masuk.', ok: 'Keluar semua', danger: true }))) return;
    try { const r = await C.adm('keamanan.keluarSemua', {}); if (r.success) C.sesiBerakhir('Semua sesi telah dicabut.'); } catch (e) { if (e.code !== 'AUTH') U.toast(e.message, 'error'); }
  };

  function sistemHtml() {
    const s = S().sistem || {}, perf = {};
    PF.Perf.log.forEach((r) => { (perf[r.action] = perf[r.action] || []).push(r); });
    const kartu = (icn, l, v, sub, ok) => '<div class="p-4 rounded-2xl bg-input-bg"><div class="flex items-center gap-2 font-caption text-caption text-text-secondary">' + ic(icn, 'text-[18px] ' + (ok === false ? 'text-error' : 'text-brand-blue')) + l + '</div><div class="font-label-ui text-[16px] text-brand-navy mt-1">' + v + '</div>' + (sub ? '<div class="font-caption text-caption text-text-secondary">' + sub + '</div>' : '') + '</div>';
    return box('<div class="flex items-center justify-between gap-2 flex-wrap mb-4"><h2 class="font-headline-sm text-headline-sm text-brand-navy">Status server</h2><div class="flex gap-2"><button type="button" data-v="sysRefresh" class="btn-ghost btn-sm">' + ic('refresh', 'text-[18px]') + 'Periksa ulang</button><button type="button" data-v="sysWarm" class="btn-light btn-sm">' + ic('bolt', 'text-[18px]') + 'Bersihkan & panaskan cache</button></div></div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">' +
        kartu('memory', 'Versi backend', esc(s.versi || '-'), 'frontend ' + esc((PF.CFG.VERSI) || '-')) +
        kartu('cached', 'Cache konten publik', s.cachePublik ? 'HANGAT' : 'dingin', 'TTL 6 jam, dibersihkan saat Anda menyimpan', s.cachePublik) +
        kartu('mail', 'Antrean email', U.num(s.antrean || 0), 'sisa kuota hari ini: ' + (s.kuotaEmail >= 0 ? s.kuotaEmail : '-')) +
        kartu('database', 'Script Properties', (s.propsKB || 0) + ' KB', 'dari batas 500 KB') +
      '</div>' +
      '<div class="mt-4 flex items-center justify-between gap-4 p-4 rounded-2xl border border-border-subtle"><div><p class="font-label-ui text-label-ui text-brand-navy">keepWarm — pemicu tiap 5 menit</p><p class="font-caption text-caption text-text-secondary">Menjaga cache tetap terisi & mengirim sisa antrean email. Memakai ±10–20 menit kuota pemicu per hari. ' + (s.warmLast ? 'Terakhir: ' + U.rel(s.warmLast.at) + ' (' + esc(s.warmLast.scope) + ', ' + s.warmLast.ms + ' ms).' : '') + '</p></div>' + sw(s.keepWarm, 'data-v="keepWarm"', 'keepWarm') + '</div>' +
      '<div class="mt-4 grid sm:grid-cols-2 gap-3 font-body-sm text-body-sm">' + Object.keys(s.baris || {}).map((n) => '<div class="flex justify-between p-3 rounded-xl bg-input-bg"><span class="text-text-secondary">Baris ' + esc(n) + '</span><b class="text-brand-navy">' + U.num(s.baris[n]) + '</b></div>').join('') + '</div>' +
      '<div class="mt-4 flex flex-wrap gap-2">' + (s.spreadsheetUrl ? '<a class="btn-light btn-sm" target="_blank" rel="noopener" href="' + esc(U.href(s.spreadsheetUrl)) + '">' + ic('table_chart', 'text-[18px]') + 'Buka spreadsheet</a>' : '') + (s.folderUrl ? '<a class="btn-light btn-sm" target="_blank" rel="noopener" href="' + esc(U.href(s.folderUrl)) + '">' + ic('folder', 'text-[18px]') + 'Buka folder Drive</a>' : '') + '</div>' +
      '<p class="' + HELP + ' mt-3">Diperiksa ' + (s.at ? U.rel(s.at) : '-') + ' · Pemicu terpasang: ' + esc((s.triggers || []).join(', ') || '-') + '</p>') +
      box('<h2 class="font-headline-sm text-headline-sm text-brand-navy mb-1">Kecepatan dari browser ini</h2><p class="font-caption text-caption text-text-secondary mb-3">Diukur langsung selama sesi ini (ketik <code>Perf.table()</code> di Console untuk detail).</p>' +
        tabel(['Aksi', 'Panggilan', 'Rata-rata total', 'Rata-rata server'], Object.keys(perf).map((a) => [a, perf[a].length, Math.round(perf[a].reduce((x, r) => x + r.total, 0) / perf[a].length) + ' ms', Math.round(perf[a].reduce((x, r) => x + r.server, 0) / perf[a].length) + ' ms']), Object.keys(perf).length, 99), 'mt-space-md');
  }
  async function segarkanSistem(fresh) {
    try { const r = await C.read('sistem.status', fresh ? { _fresh: true } : {}); if (r.success) { S().sistem = r.data; C.persist(); if (C.A.view === 'pengaturan' && ui.set === 'sistem') C.render({ bg: true }); } } catch (e) { U.toast(e.message, 'error'); }
  }
  H.sysRefresh = () => segarkanSistem(true);
  H.sysWarm = async (b) => {
    b.disabled = true;
    try { const r = await C.adm('sistem.segarkan', {}); if (!r.success) throw new Error(r.message); S().sistem = r.data.sistem; U.toast(r.message); C.render({ bg: true }); } catch (e) { U.toast(e.message, 'error'); b.disabled = false; }
  };
  H.keepWarm = () => {
    const on = !(S().sistem || {}).keepWarm;
    C.Writer.run('sistem.keepWarm', { aktif: on }, { label: 'keepWarm', pesan: on ? 'keepWarm aktif.' : 'keepWarm dimatikan.', ok: (r) => { S().sistem = r.data.sistem; C.render({ bg: true }); } });
  };

  // ===================================================================
  // PENGIKAT EVENT GLOBAL (delegasi pada #view)
  // ===================================================================
  function bindGlobal() {
    const v = $('#view');
    v.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]');
      if (!b || !v.contains(b) || b.disabled) return;
      if (e.target.closest('[data-stop]') && (b.tagName === 'TR' || b.tagName === 'LI')) return;
      const fn = H[b.dataset.v]; if (fn) { e.preventDefault(); fn(b, e); }
    });
    v.addEventListener('submit', (e) => {
      const f = e.target.closest('[data-form]'); if (!f) return;
      e.preventDefault();
      const fn = F[f.dataset.form]; if (fn) fn(f, e);
    });
    v.addEventListener('input', (e) => { if (e.target.classList.contains('is-invalid')) e.target.classList.remove('is-invalid'); });
    d.addEventListener('click', (e) => { const b = e.target.closest('#dlg [data-v="bukaPesan"]'); if (b) H.bukaPesan(b, e); });
  }

  w.AdminViews = { init(c) { C = c; bindGlobal(); }, views, loading, errorBox, confirmBox, modal, ui };
})(window, document);
