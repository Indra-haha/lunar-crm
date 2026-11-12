# DOKUMENTASI HAK AKSES PERAN (RBAC) & ALUR PENGGUNAAN FITUR
## SISTEM LUNARCHIVVE FANMERCH CRM & PORTAL PUBLIK

**Versi Sistem:** v2.4.0  
**Basis Teknologi:** Next.js 16 (Turbopack) • PostgreSQL • Drizzle ORM • Tailwind CSS  
**Target Pengguna:** Super Admin, Studio Admin (Staff Produksi), Support Staff (Customer Service), & Konsumen Publik

---

## 1. Definisi Peran Pengguna (User Roles)

Sistem Lunarchivve CRM membagi pengguna ke dalam 4 entitas peran:
1. **Super Admin (`SUPER_ADMIN`)**: Pimpinan Studio (*Studio Lead / Director*) dengan visibilitas bisnis, finansial menyeluruh, kontrol katalog & harga, serta jadwal promo PO.
2. **Studio Admin (`STUDIO_ADMIN`)**: Penanggung jawab operasional jalur produksi, vendor maklon, pergerakan kartu Kanban 5 tahap, dan inspeksi fisik Quality Control (QC).
3. **Support Staff (`SUPPORT_STAFF`)**: Customer Service (CS) yang menangani antrean prospek pesan WhatsApp (SLA <15 menit), penyelesaian tiket garansi (*Zero Hassle Reprints*), dan survei CSAT.
4. **Konsumen Publik (Public Users)**: Pelanggan eksternal yang melakukan transaksi mandiri di portal publik (`/pesan`, `/komplain`, `/survei`) tanpa perlu login ke akun CRM internal.

---

## 2. Matriks Perbandingan Hak Akses Fitur (Role-Based Access Control)

| Modul & Fitur | Super Admin | Studio Admin | Support Staff | Konsumen Publik | Catatan Teknis / Kebijakan |
|:---|:---:|:---:|:---:|:---:|:---|
| **Dashboard KPI & Omset Finansial** |  Penuh | ⚠️ Terbatas | ❌ Tidak Ada | ❌ Tidak Ada | Super Admin melihat omset Rp 48.7M, margin laba, dan AOV. Staff hanya melihat volume unit. |
| **Pilih Tanggal Jadwal Promo PO** |  Penuh | ❌ Tidak Ada | ❌ Tidak Ada | ❌ Tidak Ada | Menggunakan Custom Date Picker kalender untuk siaran promo terjadwal. |
| **Katalog Master: Tambah & Edit Produk** |  Penuh | ⚠️ Hanya Edit Stok | ❌ Hanya Lihat | ❌ Hanya Lihat | Super Admin menentukan harga dasar dan varian harga bertingkat. |
| **Katalog Master: Hapus Produk** |  Penuh | ❌ Tidak Ada | ❌ Tidak Ada | ❌ Tidak Ada | Tindakan destruktif dibatasi untuk Super Admin mencegah *orphaned orders*. |
| **Database Pelanggan: Lihat List & Segmentasi** |  Penuh |  Penuh |  Penuh | ❌ Tidak Ada | Nomor kontak disensor otomatis (misal: `0812****8821`) sesuai UU No. 27/2022 (PDP). |
| **Buka Sensor Kontak Asli (Unmasking PDP)** |  Penuh |  Saat Kirim Resi | ⚠️ Terbatas | ❌ Tidak Ada | Dibuka hanya jika PIC mengeksekusi cetak label resi atau investigasi khusus. |
| **Pipeline 5 Tahap Kanban** |  Penuh |  Penuh (PIC Utama) | ⚠️ Hanya Monitor | ❌ Tidak Ada | Studio Admin menggeser kartu dari Order Masuk hingga Selesai Kirim. |
| **Digital QC Checklist & Foto Inspeksi** |  Audit |  Penuh (Inspektor) | ⚠️ Hanya Lihat | ❌ Tidak Ada | 4 titik inspeksi fisik wajib disetujui sebelum status order berubah ke `QA_PACKING`. |
| **Leads WhatsApp & Rekam Waktu FRT** |  Audit SLA | ⚠️ Hanya Lihat |  Penuh (CS Utama) | ❌ Tidak Ada | CS wajib membalas pesan dalam $<15$ menit dan menekan tombol *Balas* untuk audit FRT. |
| **Buat & Kelola Template Balasan Cepat** |  Penuh | ⚠️ Hanya Gunakan |  Penuh | ❌ Tidak Ada | Mendukung placeholder dinamis `{nama}` dan kategorisasi katalog. |
| **Penyelesaian Tiket Komplain (CRT)** |  Audit & Otorisasi | ⚠️ Koordinasi Vendor |  Penuh (Resolusi) | ❌ Tidak Ada | CS mengeksekusi *Zero Hassle Reprints* dan mencatat durasi penutupan tiket. |
| **Portal Pemesanan Publik (`/pesan`)** | ❌ Akses CRM | ❌ Akses CRM | ❌ Akses CRM |  Penuh | Konsumen memesan mandiri, menerbitkan faktur faktual `#LUN-ORD-xxx`. |
| **Portal Pengaduan Publik (`/komplain`)** | ❌ Akses CRM | ❌ Akses CRM | ❌ Akses CRM |  Penuh | Konsumen menginput nomor PO valid + foto cacat; otomatis menerbitkan `#LUN-TK-xxx`. |
| **Pelacakan Tiket Publik Real-Time** | ❌ Akses CRM | ❌ Akses CRM | ❌ Akses CRM |  Penuh | Pelacakan progres status tiket via kode `#LUN-TK-xxx` tanpa perlu login. |
| **Portal Survei CSAT (`/survei`)** | ❌ Akses CRM | ❌ Akses CRM | ❌ Akses CRM |  Penuh | Validasi nomor PO aktif, pemberian bintang 1-5, terbit voucher `LUNAR-CSAT-15`. |
| **Live Global Search (⌘K)** |  Penuh |  Penuh |  Penuh | ❌ Tidak Ada | Pencarian instan melintasi pesanan, pelanggan, tiket, dan calon prospek leads. |
| **Audit SLA & Notifikasi Keterlambatan** |  Penuh |  Penuh |  Penuh | ❌ Tidak Ada | Deteksi pesanan macet $>3$ hari di tahap vendor dan tiket komplain menggantung. |

---

## 3. Alur Penggunaan Tiap Fitur (Step-by-Step Workflows)

### Alur 1: Autentikasi & Masuk Sesi Kerja Admin
1. Pengguna membuka peramban ke halaman `/login`.
2. Memasukkan kredensial:
   - **Super Admin:** `admin@lunarchivve.com` / `admin123`.
   - **Studio Admin:** `staff@lunarchivve.com` / `staff123`.
3. Klik tombol **"Masuk ke Studio CRM"**. Sistem menerbitkan *cookie* sesi terenkripsi `lunar_session` dan mengarahkan ke dashboard.
4. Untuk keluar, klik ikon profil di Topbar atau tombol **"Keluar"** di Sidebar.

### Alur 2: Manajemen Master Produk & Varian Katalog
1. Buka menu **"Master Produk & Varian"** (`/products`).
2. Klik tombol **"+ Tambah Produk Baru"** di kanan atas.
3. Isi data: nama produk, kategori, harga dasar, vendor maklon, dan batch PO.
4. Klik **"+ Tambah Varian"** untuk variasi bertingkat (misal: *1 Sisi Doff 3mm*, *Glitter Sparkle Sandwich +Rp 15.000*).
5. Klik **"Simpan Produk"**. Sistem menerbitkan kode unik (misal: `PRD-009`) dan otomatis terhubung ke katalog publik `/pesan`.

### Alur 3: Manajemen Pelanggan & Kepatuhan UU PDP
1. Buka menu **"Database Pelanggan"** (`/customers`).
2. Seluruh nomor telepon disamarkan otomatis (misal: `0812****8821`) sesuai UU No. 27/2022 (PDP).
3. Filter berdasarkan segmen (*VIP Loyal*, *Regular*, *Dormant/Pasif*).
4. Klik salah satu baris pelanggan untuk membuka panel *Drawer* detail:
   - PIC berwenang dapat melihat nomor kontak asli guna pencetakan label resi pengiriman.
   - Panel menampilkan total belanja (*Total Spend*), rata-rata belanja (*AOV*), dan riwayat pesanan.

### Alur 4: Pemesanan Mandiri Pembeli Publik (`/pesan`)
1. Konsumen membuka URL publik `/pesan`.
2. Memilih produk dan varian finishing yang diinginkan.
3. Mengisi data kontak: nama lengkap, nomor WhatsApp, handle medsos, dan kota domisili.
4. Memilih metode pembayaran: *Down Payment (DP 50%)* atau *Langsung Lunas*.
5. Klik **"Kirim Formulir Pre-Order"**.
6. Faktur resmi terbit (misal: `#LUN-ORD-129`), dan kartu pesanan otomatis masuk ke kolom *Order Masuk* di CRM.

### Alur 5: Manajemen Pipeline 5 Tahap Kanban & Digital QC Checklist
1. Buka menu **"Pesanan & Pipeline"** (`/pipeline`).
2. Papan menampilkan 5 kolom Kanban: `ORDER_MASUK` $\rightarrow$ `DESAIN_APPROVAL` $\rightarrow$ `PRODUKSI_VENDOR` $\rightarrow$ `QA_PACKING` $\rightarrow$ `SELESAI`.
3. Gunakan tombol navigasi cepat pada kartu pesanan untuk memajukan tahap produksi.
4. **Verifikasi QC Digital (Sebelum Masuk Packing):**
   - Buka menu **"Tiket Keluhan & QA"** (`/support`).
   - Pada panel *Workbench Digital QC*, pilih pesanan dan centang 4 parameter fisik wajib:
     1. [x] Kesesuaian Brief & Ukuran.
     2. [x] Kesesuaian Kuantitas.
     3. [x] Bebas Cacat Cetak / Scratch Akrilik.
     4. [x] Lapisan Pelindung (*Peel-Off Film*) Utuh.
   - Masukkan tautan foto inspeksi fisik dan klik **"Simpan & Verifikasi QC"**.

### Alur 6: Pengajuan Komplain Publik (`/komplain`) & Garansi Zero Hassle Reprints
1. Konsumen membuka portal `/komplain`.
2. Memasukkan kode pesanan aktif (misal: `#LUN-ORD-001`) dan klik *Cari Pesanan*.
3. Memilih kategori: *Kategori A (Cacat Fisik / Pecah)*, *B (Keterlambatan)*, atau *C (Pertanyaan)*.
4. Melampirkan tautan bukti foto kerusakan dan rincian masalah, lalu klik **"Kirim Pengaduan Garansi"**.
5. Sistem menerbitkan tiket pengaduan `#LUN-TK-xxx` dengan target SLA 24 jam.
6. Support Staff membuka menu `/support`, memproses klaim cetak ulang prioritas *same-day*, dan menutup tiket (*Status: RESOLVED*).
7. Konsumen dapat melacak status tiket secara *real-time* di halaman `/komplain` cukup dengan menginputkan kode tiketnya.

### Alur 7: Penanganan Antrean Leads WhatsApp & First Response Time (FRT)
1. Buka menu **"Leads & Template WA"** (`/leads`).
2. Antrean calon pembeli diklasifikasikan dengan badge SLA (*Overdue*, *Perlu Respon*, *Terjawab*).
3. Pilih prospek, lalu klik **Template Balasan Cepat** di panel kanan (placeholder `{nama}` otomatis diganti dengan nama prospek).
4. Klik **"Salin Pesan"** atau **"Buka WhatsApp"** $\rightarrow$ Waktu *First Response Time* langsung terkunci di database untuk audit kecepatan layanan.
5. Jika prospek memutuskan memesan, klik tombol **"Konversi Menjadi Order"**.

### Alur 8: Survei Kepuasan CSAT Publik & Penerbitan Kupon (`/survei`)
1. Konsumen membuka portal `/survei`.
2. Memasukkan kode faktur (misal: `#LUN-ORD-129`). Jika kode fiktif, sistem menolak (HTTP 404).
3. Memberikan rating bintang 1 hingga 5, testimoni, dan mencentang izin publikasi testimoni ke medsos.
4. Klik **"Kirim Ulasan Kepuasan"**.
5. Kupon diskon loyalitas otomatis terbit: **`LUNAR-CSAT-15`** (diskon 15% untuk PO berikutnya).

### Alur 9: Jadwal Siaran Promo Pre-Order (Date Picker) & Dashboard KPI
1. Buka `/dashboard` sebagai Super Admin.
2. Tinjau performa finansial: omset Rp 48.7M, skor kepuasan CSAT 4.88, rasio retur 0.8%, dan pencapaian SLA 96.4%.
3. Pada kartu **"Penjadwalan Siaran Promo PO WhatsApp"**:
   - Pilih opsi **PILIH TANGGAL SPESIFIK (KALENDER)**.
   - Tentukan tanggal pelaksanaan pada *Date Picker* kalender (contoh: `2026-11-25`).
4. Klik tombol **"Jadwalkan Siaran Promo PO"**.
5. Sistem mengonfirmasi jadwal siaran WhatsApp dengan format tanggal lokal Indonesia (*Rabu, 25 November 2026*).

### Alur 10: Pencarian Cepat Global (⌘K) & Audit Notifikasi SLA
1. Tekan tombol **⌘K** (Mac) atau **Ctrl+K** (Windows) dari halaman mana saja, atau klik bilah pencarian Topbar.
2. Masukkan kata kunci (nama pelanggan, kode `#LUN-ORD`, `#LUN-TK`, atau produk).
3. Hasil pencarian multi-tabel muncul secara instan dalam 4 kategori (Pesanan, Pelanggan, Tiket, Leads).
4. Klik ikon **Lonceng Notifikasi** di Topbar untuk memeriksa audit otomatis pesanan yang tertahan vendor $>3$ hari.
