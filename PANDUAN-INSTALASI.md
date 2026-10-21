# Panduan Instalasi — Landing Page Portofolio Diri

Versi 1.0.0 · Oktober 2026

Panduan ini ditulis untuk Anda yang belum pernah memakai Apps Script, Google Cloud, atau GitHub. Ikuti urutannya dari atas ke bawah. Total waktu sekitar 45–60 menit.

---

## 0. Gambaran singkat

```
Pengunjung ──► GitHub Pages (index.html, admin.html, css/, js/)
                      │  fetch() JSON
                      ▼
               Google Apps Script (Kode.gs + Migrasi.gs) = REST API
                      │
        Google Sheets (database) · Google Drive (gambar) · Gmail (notifikasi)
```

- **Frontend** (tampilan) ada di GitHub Pages. Isinya publik dan **tidak memuat rahasia apa pun**.
- **Backend** (otak) ada di Google Apps Script milik Anda. Semua rahasia hanya tersimpan di **Script Properties**.
- Dashboard admin dibuka lewat **alamat rahasia**, lalu **login Google**. Tidak ada tombol login di situs publik.

### Isi paket

| Berkas | Dipakai di | Cara pakai |
|---|---|---|
| `Kode.gs` | Apps Script | Salin-tempel ke editor Apps Script |
| `Migrasi.gs` | Apps Script | Salin-tempel sebagai berkas kedua |
| `appsscript.json` | Apps Script | Opsional tetapi disarankan (izin minimum) |
| `portofolio-diri.zip` | GitHub Pages | Ekstrak, lalu folder hasil ekstrak **itulah** repository Anda |
| `PANDUAN-INSTALASI.md` | — | Panduan ini (juga ada di dalam ZIP) |

Isi folder `portofolio-diri` setelah diekstrak:

```
portofolio-diri/          ← folder ini yang nanti di-"git init"
├── index.html            ← landing page publik
├── admin.html            ← dashboard admin (terkunci)
├── README.md
├── PANDUAN-INSTALASI.md
├── .nojekyll
├── assets/favicon.svg
├── css/app.css
├── js/config.js          ← SATU-SATUNYA berkas yang Anda ubah
├── js/core.js
├── js/app.js
├── js/admin.js
├── js/admin-views.js
└── dev/                  ← bahan build CSS (tidak wajib disentuh)
```

---

## A. Backend — Google Apps Script

### A1. Buat proyek

1. Masuk ke **https://script.google.com** dengan akun Google yang akan menjadi **Super Admin** (akun ini juga pemilik Spreadsheet & folder Drive).
2. Klik **Proyek baru**. Ganti nama proyek (kiri atas) menjadi `Portofolio Diri API`.
3. Berkas `Code.gs` → klik titik tiga → **Ganti nama** → `Kode`. Hapus isinya, lalu tempel seluruh isi **Kode.gs**.
4. Klik **+** di samping "Berkas" → **Skrip** → beri nama `Migrasi` → tempel seluruh isi **Migrasi.gs**.
5. (Disarankan) Klik ⚙️ **Setelan Proyek** → centang **Tampilkan file manifes "appsscript.json" di editor** → kembali ke Editor → buka `appsscript.json` → ganti seluruh isinya dengan **appsscript.json** dari paket. Ini membatasi izin hanya pada yang dibutuhkan dan mengatur zona waktu ke Asia/Jakarta.
6. Klik 💾 **Simpan**.

### A2. Jalankan setup (sekali)

1. Di toolbar, pilih fungsi **`setupAppEnvironment`** → klik **▶ Jalankan**.
2. Muncul "Otorisasi diperlukan" → **Tinjau izin** → pilih akun Anda → bila muncul "Google belum memverifikasi aplikasi ini", klik **Lanjutan** → **Buka Portofolio Diri API (tidak aman)** → **Izinkan**. Ini normal untuk skrip milik sendiri.
3. Buka **Log eksekusi** di bawah. Anda akan melihat:

```
✅ Setup selesai. Aman dijalankan ulang — data & rahasia yang ada tidak ditimpa.
📊 Spreadsheet  : https://docs.google.com/spreadsheets/d/…
📁 Folder aset  : https://drive.google.com/drive/folders/…
👤 ADMIN_EMAIL  : akun-anda@gmail.com

🔑 ALAMAT RAHASIA ADMIN (catat sekarang, jangan dibagikan):
   https://USERNAME.github.io/NAMA-REPO/#masuk=XXXXXXXXXXXXXXXXXXXXXXXX

🔐 AKSES DARURAT (hanya tampil SEKALI — ganti setelah login pertama):
   Nama pengguna : darurat
   Kata sandi    : XXXXXXXXXXXXXXXX
```

4. **Catat** alamat rahasia dan kata sandi darurat di tempat aman (misalnya pengelola kata sandi). Kata sandi darurat hanya tampil sekali.

Yang dibuat otomatis oleh setup:

- Folder Drive **Portofolio-Aset** berisi subfolder **Foto-Profil** dan **Gambar-Proyek**.
- Spreadsheet **🗃️ Database — Portofolio Diri** dengan sheet: Profil, Tentang, Keahlian, Portofolio, Testimoni, Kontak, Pesan, Statistik, Pengaturan, ditambah Statistik_Bulanan (arsip), Audit (catatan keamanan), dan AppConfig (catatan baca-saja).
- Data contoh berlabel **"Contoh"** (ID berawalan `demo-`) agar situs langsung terlihat hidup. Testimoni contoh **disembunyikan** — jangan tampilkan testimoni yang bukan asli.
- Tiga pemicu (trigger): `keepWarm` (tiap 5 menit), `tugasHarian` (pukul 02.00), `saatSheetDiedit` (saat spreadsheet diedit langsung).

> `setupAppEnvironment` **aman dijalankan ulang**: tidak membuat folder/sheet ganda, tidak menimpa data, dan tidak mengganti rahasia yang sudah ada.

### A3. Deploy sebagai Web App

1. Klik **Terapkan (Deploy)** → **Deployment baru**.
2. Ikon ⚙️ di samping "Pilih jenis" → **Aplikasi web**.
3. Isi:
   - **Deskripsi**: `v1.0.0`
   - **Jalankan sebagai**: **Saya** (akun Anda)
   - **Siapa yang memiliki akses**: **Siapa saja**
4. Klik **Terapkan** → salin **URL aplikasi web** (berakhiran `/exec`).
5. Uji di browser: buka `URL/exec?action=ping`. Harus tampil JSON seperti `{"success":true,"data":{"app":"Portofolio Diri","versi":"1.0.0"}…}`.

> URL `/exec` **bukan rahasia** — memang dipakai oleh browser pengunjung. Keamanan dijaga di server.

---

## B. Client ID Google (login admin dengan akun Google)

Dashboard memakai **Google Identity Services**. Anda perlu membuat Client ID sekali.

1. Buka **https://console.cloud.google.com** dengan akun yang sama → buat proyek baru, misalnya `portofolio-admin`.
2. Menu **Google Auth Platform** (dulu bernama "OAuth consent screen"):
   - **Branding**: isi nama aplikasi (mis. `Admin Portofolio`) dan email dukungan.
   - **Audience**: pilih **External**. Selama berstatus *Testing*, tambahkan email Anda di **Test users** — atau klik **Publish app** (login dasar email/nama tidak memerlukan verifikasi Google).
3. Menu **Clients** → **Create client** → jenis **Web application**.
4. Di **Authorized JavaScript origins** tambahkan alamat situs Anda **tanpa garis miring dan tanpa nama repo**:
   - `https://USERNAME.github.io`
   - (opsional, untuk uji lokal) `http://localhost:8080`
5. **Authorized redirect URIs** biarkan kosong (tidak diperlukan).
6. Klik **Create** → salin **Client ID** (berakhiran `.apps.googleusercontent.com`).
7. Simpan Client ID dengan salah satu cara:
   - **Cara 1 (Script Properties):** Apps Script → ⚙️ Setelan Proyek → **Properti skrip** → **Tambahkan properti** → nama `OAUTH_CLIENT_ID`, nilai = Client ID → Simpan.
   - **Cara 2 (dashboard):** masuk dengan **akses darurat** (lihat D2) → Pengaturan → Keamanan → isi Client ID → Simpan.

---

## C. Frontend — GitHub Pages

Langkah ini dikerjakan lewat terminal. Jangan memakai tombol "Upload files" di web GitHub, karena struktur folder `css/` dan `js/` akan rusak dan situs tampil tanpa gaya.

### C1. Isi alamat backend (WAJIB sebelum push)

Buka `portofolio-diri/js/config.js` dengan Notepad/VS Code, ganti nilai `GAS_URL` dengan URL `/exec` dari langkah A3:

```js
window.APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycb...panjang.../exec',
  VERSI: '1.0.0'
};
```

### C2. Install Git & buat akun GitHub

- **Windows**: unduh dari https://git-scm.com/download/win, install dengan pilihan bawaan, lalu buka **PowerShell**.
- **Mac**: buka Terminal, ketik `git --version` (macOS menawarkan instalasi bila belum ada).
- Daftar di **https://github.com**. Nama pengguna Anda akan menjadi bagian alamat situs: `USERNAME.github.io`.

Atur identitas Git (sekali saja per komputer):

```bash
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```

### C3. Buat repository

Di GitHub: tombol **+** → **New repository** → nama, misalnya `portofolio` → pilih **Public** → **jangan** centang README/.gitignore/license → **Create repository**.

### C4. Masuk ke folder yang BENAR

Folder kerjanya adalah folder hasil ekstrak ZIP: **`portofolio-diri`** — folder yang di dalamnya langsung terlihat `index.html`. Jangan naik satu level, jangan masuk lebih dalam.

Cara cepat di Windows: buka folder `portofolio-diri` di File Explorer → klik address bar → ketik `powershell` → Enter.

Periksa isinya:

```powershell
dir
```

Harus terlihat `index.html`, `admin.html`, folder `css`, folder `js`. Kalau yang terlihat justru folder `portofolio-diri` lagi, jalankan `cd portofolio-diri` dulu. **Jangan lanjut sebelum `index.html` terlihat di daftar.**

### C5. Push pertama kali (satu per satu)

```bash
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/portofolio.git
git push -u origin main
```

- Ada **titik** di akhir `git add .`.
- Saat diminta **Password**, tempelkan **Personal Access Token**, bukan kata sandi akun. Layar memang tidak menampilkan apa pun saat Anda menempel — itu normal, tekan Enter.
- Membuat token: https://github.com/settings/tokens → **Generate new token (classic)** → centang **repo** → **Generate** → salin token `ghp_…` (hanya tampil sekali).
- Berhasil bila muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

### C6. Aktifkan GitHub Pages

Repository → **Settings** → **Pages**:

| Kolom | Nilai |
|---|---|
| Source | Deploy from a branch |
| Branch | `main` · `/ (root)` |
| Enforce HTTPS | ✅ |

Klik **Save**, tunggu 1–2 menit. Situs Anda: `https://USERNAME.github.io/portofolio/`

### C7. Memperbarui situs nanti

```bash
git add .
git commit -m "Perbarui konten"
git push
```

Bila browser masih menampilkan versi lama, tekan **Ctrl+Shift+R**.

> Konten (teks, foto, proyek) **tidak perlu** push ulang — cukup ubah dari dashboard admin. Push hanya diperlukan bila Anda mengubah berkas kode.

---

## D. Masuk dashboard admin pertama kali

### D1. Login Google

1. Buka alamat rahasia dari log setup, ganti `USERNAME/NAMA-REPO` dengan milik Anda, misalnya:
   `https://USERNAME.github.io/portofolio/#masuk=XXXXXXXXXXXXXXXXXXXXXXXX`
2. Halaman berpindah ke `admin.html` → klik **Masuk dengan Google** → pilih akun Super Admin.
3. Dashboard terbuka. Kunci rahasia otomatis dihapus dari address bar dan riwayat browser.

Tanpa alamat rahasia, `admin.html` hanya mengembalikan pengunjung ke landing page. Akun Google lain akan melihat **"Akses ditolak"**.

### D2. Akses darurat (bila login Google belum siap)

Di halaman login klik **Gunakan akses darurat** → nama pengguna `darurat` + kata sandi dari log setup. Setelah masuk:

1. **Pengaturan → Keamanan** → isi **Client ID OAuth** (bila belum).
2. **Ganti kata sandi darurat** (minimal 12 karakter, huruf + angka). Kata sandi awal tercatat di riwayat log Apps Script, jadi wajib diganti.
3. Akses darurat terkunci 15 menit setelah 5 kali salah. Anda bisa menonaktifkannya setelah login Google berjalan.

### D3. Ganti data contoh

Item berlabel **Contoh** adalah data awal. Ubah atau hapus dari menu Profil, Tentang, Keahlian, Portofolio, Kontak & Sosial. Unggah foto Anda di **Profil** — gambar dikompres otomatis (≤ 2 MB) lalu disimpan di folder Drive **Foto-Profil**.

Atau pindahkan data dari app lama lewat **Migrasi Data** (bagian G).

### D4. Pratinjau tautan (WhatsApp/LinkedIn)

Pratinjau tautan dibaca dari tag statis di bagian `<head>` `index.html` (`<title>`, `og:title`, `og:description`). Samakan dengan profil Anda lalu push ulang. Judul tab dan meta deskripsi di browser mengikuti **Pengaturan → Situs** secara otomatis.

---

## E. Keamanan & Script Properties

### E1. Apa yang disimpan di mana

| Nilai | Kelas | Siapa mengisi | Tempat |
|---|---|---|---|
| `SESSION_SECRET` | Rahasia | Otomatis (setup) | Script Properties |
| `ADMIN_PATH_KEY` (alamat rahasia) | Rahasia | Otomatis | Script Properties |
| `EMERGENCY_USER`, `EMERGENCY_PASS_HASH`, `EMERGENCY_SALT` | Rahasia | Otomatis (sandi disimpan sebagai hash) | Script Properties |
| `ADMIN_EMAIL` | Identitas | Otomatis = akun pemilik | Script Properties (ubah manual bila perlu) |
| `OAUTH_CLIENT_ID` | Identitas (publik saat login) | Anda | Script Properties / dashboard |
| `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, `FOLDER_FOTO_ID`, `FOLDER_PROYEK_ID` | Identitas | Otomatis | Script Properties (dicatat juga di sheet AppConfig) |
| Judul, warna, teks bagian, info bar, batas pesan | Pengaturan biasa | Dashboard | Sheet Pengaturan |
| URL `/exec` | Publik | Anda | `js/config.js` |

Melihat/mengubah manual: Apps Script → ⚙️ **Setelan Proyek** → **Properti skrip**.

### E2. Lapisan perlindungan

- **Alamat rahasia** menyembunyikan pintu masuk (bisa diganti dari Pengaturan → Keamanan, alamat baru tampil sekali).
- **Verifikasi Google di server**: token Google dicek ke Google, `aud` harus sama dengan Client ID Anda, email wajib terverifikasi dan sama dengan `ADMIN_EMAIL`.
- **Token sesi bertanda tangan HMAC** — berlaku 2 jam, diperpanjang otomatis selama Anda aktif (maks. 12 jam), dikirim di body POST. Setiap fungsi tulis memeriksa token. "Keluar dari semua perangkat" mencabut semua sesi seketika.
- **Formulir publik**: validasi, tolak HTML/skrip, jebakan bot (honeypot + waktu isi), batas 5 pesan/jam/perangkat, perlindungan formula-injection di Sheets.
- **Unggah gambar**: hanya JPG/PNG/WEBP/GIF, ukuran ≤ 2 MB, isi berkas diperiksa (bukan sekadar nama).
- **Content-Security-Policy** di kedua halaman membatasi skrip hanya dari sumber tepercaya.
- **Sheet Audit** mencatat login, percobaan gagal, dan setiap perubahan — tanpa pernah mencatat sandi atau token.

### E3. Rotasi bila curiga bocor

| Rahasia | Cara | Dampak |
|---|---|---|
| Alamat rahasia | Dashboard → Keamanan → Buat alamat baru (atau fungsi `gantiAlamatAdmin`) | Alamat lama mati |
| Kata sandi darurat | Dashboard → Keamanan, atau fungsi `resetAksesDarurat` | Sesi darurat lama dicabut |
| Semua sesi | Dashboard → Keluar dari semua perangkat, atau fungsi `rotasiSecretSesi` | Semua orang harus login ulang |
| Client ID | Buat client baru di Google Cloud → simpan → hapus yang lama | Login berikutnya memakai yang baru |

> ⚠️ Siapa pun yang punya akses **edit** ke proyek Apps Script dapat melihat Script Properties. Jangan menambah editor sembarangan, dan jangan bagikan spreadsheet database sebagai editor.

---

## F. Performa — mengapa terasa instan

| Lapisan | Yang terjadi |
|---|---|
| Kunjungan ulang | Konten tampil seketika dari salinan di browser, lalu diperbarui diam-diam bila ada perubahan |
| Server | Semua konten publik dikemas jadi satu JSON di cache selama 6 jam (dipecah otomatis bila > 100 KB). Pengunjung hampir tidak pernah membuat Sheets dibaca |
| Simpan dari dashboard | Layar berubah lebih dulu, server menyusul berurutan. Cache publik dibersihkan otomatis sehingga perubahan langsung tampil |
| Edit langsung di Sheets | Pemicu `saatSheetDiedit` membersihkan cache otomatis |
| Pindah menu admin | Semua data sudah di memori → tanpa panggilan server |
| Email notifikasi | Dikirim setelah respons (antrean), jadi pengunjung tidak menunggu Gmail |
| Pemanasan | `keepWarm` tiap 5 menit menjaga cache tetap terisi; halaman login juga memanaskan data dashboard |
| Statistik | Klik dikumpulkan lalu dikirim berkelompok dengan `sendBeacon` |

Pemanasan menjamin **cache** selalu terisi, bukan menjamin mesin Google selalu hangat — panggilan pertama setelah lama sepi bisa sedikit lebih lambat.

**Kuota:** pemicu `keepWarm` memakai ±10–20 menit dari kuota pemicu harian (akun gmail ±90 menit/hari). Matikan dengan fungsi `matikanKeepWarm` atau dari Pengaturan → Sistem & Performa. Email notifikasi dibatasi ±90/hari agar kuota Gmail aman.

Ingin melihat angka? Buka dashboard → tekan **F12** → tab **Console** → ketik `Perf.table()`.

---

## G. Migrasi data dari app lama

Menu **Migrasi Data** memindahkan data dari spreadsheet app portofolio lama Anda (atau dari berkas cadangan JSON). App lama hanya **dibaca**, tidak pernah diubah.

1. Pastikan spreadsheet lama milik **akun Google yang sama**, sehingga ID gambar Drive lama tetap terbaca (gambar tidak disalin ulang).
2. Tempel URL/ID spreadsheet lama → centang data yang ingin dipindah → klik **Pindai (dry-run)**. Anda melihat jumlah yang akan ditambah, diperbarui, dan dilewati — belum ada yang ditulis.
3. Klik **Jalankan import**.
4. Tepat sebelum mengumumkan alamat baru, **jalankan import sekali lagi** untuk menangkap data yang masuk ke app lama selama masa transisi (delta sync).

Yang perlu Anda ketahui:

- Kolom dicocokkan berdasarkan **nama header** (Indonesia/Inggris, mis. `Skill`, `Percent`, `Image`, `Link`), bukan urutan kolom.
- Import **aman diulang**: menjalankan dua kali tidak membuat data dobel.
- Opsi **Ganti data contoh bawaan** menghapus baris "Contoh" hanya pada jenis data yang ada di sumber.
- Opsi **Timpa data yang sudah ada** biarkan mati agar perubahan di app baru tidak tertimpa.
- Rahasia (token, sandi) dan sesi login tidak pernah ikut dipindahkan.
- Data sangat besar (> ±20.000 baris per sheet) sebaiknya dipindah bertahap per jenis data karena batas eksekusi Apps Script 6 menit.

**Cadangan:** di halaman yang sama, **Ekspor konten** mengunduh berkas JSON (tanpa rahasia). Berkas ini bisa dipulihkan ke instalasi baru lewat sumber **Berkas cadangan JSON**.

---

## H. Memperbarui kode backend

1. Cadangkan kode lama (salin ke Dokumen Google).
2. Tempel `Kode.gs` / `Migrasi.gs` versi baru → Simpan.
3. **Terapkan → Kelola deployment** → ikon ✏️ **Edit** → **Versi: Versi baru** → **Terapkan**.

Jangan pilih **Deployment baru** — itu menghasilkan URL `/exec` berbeda dan situs kehilangan koneksi. Pemicu selalu menjalankan kode yang **tersimpan** (bukan versi deployment).

---

## I. Fungsi yang bisa dijalankan dari editor

| Fungsi | Kegunaan |
|---|---|
| `setupAppEnvironment` | Menyiapkan / memperbaiki struktur (aman diulang) |
| `lihatAlamatAdmin` | Menampilkan alamat rahasia di log |
| `gantiAlamatAdmin` | Membuat alamat rahasia baru |
| `resetAksesDarurat` | Membuat kata sandi darurat baru (bila lupa) |
| `rotasiSecretSesi` | Mengeluarkan semua sesi admin |
| `bersihkanCache` | Membersihkan & memanaskan cache |
| `cekPerforma` | Laporan cache, pemicu, antrean email, ukuran Script Properties |
| `matikanKeepWarm` / `nyalakanKeepWarm` | Mengatur pemicu pemanasan |

---

## J. Hasil pengujian

Diuji sebelum diserahkan dengan **simulator Apps Script** (Sheets, Cache dengan batas 100 KB, Script Properties, Lock, Gmail, Drive tiruan) dan **browser Chromium sungguhan** di ukuran laptop, tablet, dan ponsel. Login Google memakai tombol tiruan — login dengan akun Google asli baru bisa diuji setelah Anda membuat Client ID.

| Area | Skenario PRD 8.3 | Hasil |
|---|---|---|
| Publik | Laptop, tablet, ponsel tanpa scroll horizontal | ✅ |
| Publik | Klik menu → gulir halus ke bagian yang benar | ✅ |
| Publik | Formulir valid → konfirmasi, masuk sheet Pesan, email terkirim | ✅ |
| Publik | Formulir kosong / berisi skrip → ditolak | ✅ |
| Publik | Kirim berulang → dibatasi setelah 5×/jam | ✅ |
| Admin | Tanpa alamat rahasia → hanya landing | ✅ |
| Admin | Akun Google bukan admin → "Akses ditolak" | ✅ |
| Admin | Akun admin → dashboard terbuka | ✅ |
| Admin | Fungsi tulis tanpa token → ditolak server | ✅ |
| Admin | Ubah konten → langsung tampil di landing | ✅ |
| Admin | Gambar > 2 MB → dikompres (PNG 21,5 MB → 902 KB) | ✅ |
| Laporan | Unduh Excel & PDF sesuai filter | ✅ |
| Performa | Landing dengan cache aktif < 3 detik | ✅ |

Ringkasan: **143 uji backend** dan **52 uji browser** lulus, termasuk keamanan (token dipalsukan/kedaluwarsa, logout, pencabutan sesi, penguncian akses darurat, tidak ada rahasia di respons API, audit, maupun browser) dan migrasi (dry-run, idempoten, delta sync, angka 0 di depan tetap utuh, ID Drive lama tetap).

Angka terukur di lingkungan uji:

| Pengukuran | Hasil |
|---|---|
| Kunjungan pertama dengan server dibuat lambat (800 ms) | konten tampil ±1,3 dtk |
| Kunjungan ulang dengan server dibuat sangat lambat (3 dtk) | konten tampil ±0,5 dtk dari cache lokal |
| Pindah 10 menu admin | maks. ±30 ms per menu, 0 panggilan server |
| Paket publik dari cache server | 0 baca Sheets |
| Dashboard admin dari cache server | 0 baca Sheets |

---

## K. Penyesuaian dari referensi desain & PRD

- **Kontras warna (PRD 7.5, WCAG AA):** pita kontak memakai biru `#1F74DB` (bukan `#3B9BFF`) dan aksen tulisan tangan memakai oranye `#C96F00` (bukan `#FF9E00`), agar teks tetap terbaca. `#3B9BFF` tetap dipakai untuk aksen dekoratif.
- **Tautan "Admin Panel"** di footer referensi tidak dipakai, sesuai PRD: tidak ada pintu login di situs publik.
- **Sesi admin** memakai token bertanda tangan HMAC (bukan token acak di CacheService). Tujuannya sama — sesi singkat ±2 jam — tetapi tidak ikut hilang ketika cache Google dikosongkan.
- **Akses darurat** dan menu **Migrasi Data** ditambahkan sebagai jaring pengaman.
- **Kontak** boleh berawalan `mailto:` dan `tel:` selain `https://`, agar tautan email dan telepon berfungsi.
- **Testimoni contoh disembunyikan** dan diberi label "(contoh)". Tampilkan hanya testimoni asli dengan izin pemberinya.
- **Kolom tambahan** (di belakang kolom PRD): Profil → `ringkasan_tentang`, `filosofi`, `tagline_tulisan`, `label_status`; Keahlian → `deskripsi`; Testimoni → `urutan`; Pesan → `id`.
- **Tailwind CSS sudah dikompilasi** (`css/app.css`, 55 KB) — tidak memakai Tailwind CDN yang lambat di browser.

---

## L. Kendala umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| Situs menampilkan "Konfigurasi belum lengkap" | `GAS_URL` di `js/config.js` belum diisi | Isi URL `/exec` → `git add .` → `git commit -m "isi config"` → `git push` |
| "Respons server tidak dikenali" | Web App belum di-deploy dengan akses **Siapa saja** | Kelola deployment → Edit → akses Siapa saja → Versi baru |
| Halaman 404 di GitHub Pages | `git init` dijalankan di folder induk | Push ulang dari folder yang berisi `index.html` |
| Halaman tanpa gaya (teks polos) | Folder `css/`/`js/` rata karena upload lewat web | Push ulang lewat terminal dari folder yang benar |
| Tombol Google tidak muncul / "origin not allowed" | Alamat situs belum ada di Authorized JavaScript origins | Tambahkan `https://USERNAME.github.io` (tanpa path) di Google Cloud |
| Login Google: "Akses ditolak" | Email berbeda dengan `ADMIN_EMAIL` | Masuk dengan akun pemilik, atau ubah `ADMIN_EMAIL` di Script Properties |
| "Tiket masuk sudah kedaluwarsa" | Halaman login dibiarkan > 15 menit | Buka lagi alamat rahasia |
| Lupa alamat rahasia | — | Jalankan `lihatAlamatAdmin` di editor |
| Lupa kata sandi darurat | — | Jalankan `resetAksesDarurat` di editor |
| Edit langsung di Sheets belum tampil | Cache server | Tunggu beberapa detik (pemicu otomatis) atau Dashboard → Segarkan |
| Gambar dari Drive tidak tampil | Kebijakan akun membatasi berbagi publik | Pakai URL gambar dari tempat lain, atau izinkan berbagi "Siapa saja yang memiliki link" |
| Email notifikasi tidak masuk | Kuota harian habis / folder spam | Cek Pengaturan → Sistem; pesan tetap tersimpan di dashboard |
| Versi lama masih tampil setelah push | Cache browser | Ctrl+Shift+R atau jendela Incognito |
