# Landing Page Portofolio Diri

CV digital satu halaman + dashboard admin tersembunyi.
Frontend statis (GitHub Pages) · Backend Google Apps Script sebagai REST API · Database Google Sheets · Gambar di Google Drive.

## Mulai cepat

1. Pasang backend (`Kode.gs`, `Migrasi.gs`, `appsscript.json`) di Apps Script → jalankan `setupAppEnvironment` → deploy sebagai Web App.
2. Isi `GAS_URL` di **`js/config.js`** dengan URL `/exec`.
3. Push folder ini ke GitHub → aktifkan Pages (branch `main`, folder root).
4. Buka alamat rahasia dari log setup (`…/#masuk=KUNCI`) → login Google.

Langkah lengkap: **[PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md)**.

## Struktur

| Berkas | Isi |
|---|---|
| `index.html` + `js/app.js` | Landing page publik (F1–F9) |
| `admin.html` + `js/admin.js` + `js/admin-views.js` | Dashboard admin (A1–A11 + Migrasi Data) |
| `js/core.js` | API ke Apps Script, cache lokal, pengukur kinerja, utilitas aman |
| `js/config.js` | **Satu-satunya** berkas yang diubah: URL `/exec` |
| `css/app.css` | Tailwind CSS yang sudah dikompilasi |
| `dev/` | Sumber CSS & konfigurasi Tailwind (hanya bila ingin membangun ulang) |

Tidak ada rahasia di repository ini. Token, kata sandi, alamat rahasia admin, dan Client ID hanya tersimpan di **Script Properties** Apps Script.

## Membangun ulang CSS (opsional)

Hanya diperlukan bila Anda menambah class Tailwind baru di HTML/JS:

```bash
npx tailwindcss@3.4.17 -c dev/tailwind.config.js -i dev/app.src.css -o css/app.css --minify
```

Ikon memakai Material Symbols dengan subset ikon yang dipakai saja (daftar di `dev/ikon-terpakai.txt`, URL font di `<head>` kedua halaman).
