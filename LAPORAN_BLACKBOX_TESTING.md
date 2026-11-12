# LAPORAN PENGUJIAN BLACKBOX TESTING SISTEM LUNARCHIVVE CRM & PORTAL PUBLIK

**Tanggal Pengujian:** 12 November 2026  
**Metodologi Pengujian:** Blackbox Testing (Equivalence Partitioning, Boundary Value Analysis, Negative Validation, Error Guessing, & End-to-End User Flow)  
**Target Sistem:** Lunarchivve Fanmerch Studio CRM & Multi-Portal Publik  
**Arsitektur Target:** Next.js RESTful Route Handlers (`app/api/**/route.ts`) + Drizzle ORM + PostgreSQL  
**Hasil Keseluruhan:** **40 Kasus Uji Dilakukan / 40 LULUS (100% Pass Rate)**

---

## 1. Ringkasan Eksekutif

Pengujian *Blackbox Testing* ini berfokus pada pengujian fungsionalitas sistem dari sudut pandang pengguna akhir (End-User), PIC Studio Admin, dan Konsumen Publik tanpa melihat struktur internal kode program (*opaque-box testing*).

Setiap skenario masukan (*input*) diuji terhadap spesifikasi kebutuhan (*expected outcome*), mencakup:
1. **Skenario Positif (Happy Path):** Masukan valid dengan alur bisnis normal.
2. **Skenario Negatif (Boundary & Invalid Inputs):** Masukan kosong, tipe data tidak sah, identifier tidak terdaftar, kredensial salah, dan duplikasi entitas unik.
3. **Kepatuhan Regulasi & Integritas:** Sensor data sensitif (PDP UU No. 27/2022) dan audit SLA penanganan pesanan serta keluhan.

---

## 2. Matriks Pengujian Blackbox (Tabel Utama)

| No | Fitur | Yang Dicoba | Hasil yang Diharapkan | Berhasil? (Ya/Tidak) |
|:--:|:---|:---|:---|:---:|
| 1 | **Login Admin** | Masukkan akun admin valid (`identifier: "admin"`, `password: "admin123"`) | Berhasil masuk ke dashboard admin, profil PIC dikembalikan, dan sesi aman dibuat | **Ya** |
| 2 | **Validasi Kata Sandi** | Masukkan username benar (`admin`) dengan kata sandi salah (`passwordSalah123!`) | Ditolak dengan HTTP 401 Unauthorized dan muncul notifikasi *"Kata sandi tidak sesuai"* | **Ya** |
| 3 | **Validasi Akun Terdaftar** | Masukkan identifier email yang tidak terdaftar (`user_fiktif_unknown@lunarchivve.com`) | Ditolak dengan HTTP 401 Unauthorized dan muncul notifikasi *"Akun admin tidak ditemukan"* | **Ya** |
| 4 | **Validasi Form Kosong Login** | Mengosongkan field identifier dan kata sandi pada form login | Ditolak dengan HTTP 400 Bad Request dan validasi *"Email / Username dan kata sandi wajib diisi"* | **Ya** |
| 5 | **Logout Sesi** | Menekan tombol keluar / request pengakhiran sesi admin | HTTP 200 OK, cookie sesi admin dihapus secara aman dan diarahkan ke halaman login | **Ya** |
| 6 | **Katalog Produk** | Membuka katalog produk tanpa filter pencarian | HTTP 200 OK, daftar produk aktif beserta varian dan stok tampil lengkap | **Ya** |
| 7 | **Validasi Nama Produk Wajib** | Menambahkan produk baru dengan field nama produk dikosongkan | Ditolak dengan HTTP 400 Bad Request *"Nama produk tidak boleh kosong"* | **Ya** |
| 8 | **Pembuatan Produk & Varian** | Input produk baru lengkap beserta 2 varian harga bertingkat | HTTP 201 Created, terbit kode unik produk (misal: `PRD-009`) dan varian tersimpan | **Ya** |
| 9 | **Integritas Unik Kode Produk** | Input produk baru menggunakan kode produk yang sudah ada di database | Ditolak dengan HTTP 409 Conflict *"Kode produk sudah digunakan"* | **Ya** |
| 10 | **Detail Produk Tidak Ada** | Membuka detail produk dengan UUID fiktif yang tidak ada di database | Ditolak dengan HTTP 404 Not Found *"Produk tidak ditemukan"* | **Ya** |
| 11 | **Hapus Produk** | Menghapus item produk uji dari katalog sistem | HTTP 200 OK, produk berhasil dihapus dan tidak muncul lagi di katalog | **Ya** |
| 12 | **Masking Nomor Telepon (PDP)** | Membuka daftar pelanggan pada tabel utama CRM | HTTP 200 OK, digit tengah nomor telepon disamarkan (contoh: `0812****8899`) sesuai UU PDP | **Ya** |
| 13 | **Validasi Mandatory Pelanggan** | Mendaftarkan pelanggan baru tanpa mengisi nama dan tanpa nomor telepon | Ditolak dengan HTTP 400 Bad Request *"Nama lengkap dan nomor WhatsApp wajib diisi"* | **Ya** |
| 14 | **Normalisasi Data Pelanggan Baru** | Mendaftarkan pelanggan dengan handle media sosial tanpa awalan `@` | HTTP 201 Created, sistem otomatis menambahkan prefix `@` dan menerbitkan ID `CUST-xxx` | **Ya** |
| 15 | **Otorisasi Akses Nomor Asli** | Membuka detail pelanggan oleh admin berwenang untuk pengiriman resi | HTTP 200 OK, nomor telepon asli terbuka untuk PIC dan metrik belanja terhitung | **Ya** |
| 16 | **Integritas 5 Kolom Kanban** | Membuka papan Kanban pesanan produksi studio | HTTP 200 OK, kartu terdistribusi presisi ke 5 kolom pipeline produksi | **Ya** |
| 17 | **Validasi Pesanan Kosong** | Membuat pesanan baru tanpa memilih pelanggan dan tanpa nama produk | Ditolak dengan HTTP 400 Bad Request *"Pelanggan dan nama produk wajib diisi"* | **Ya** |
| 18 | **Pembuatan Pesanan Baru** | Input pesanan lengkap dengan spesifikasi merch, nominal DP, dan batch PO | HTTP 201 Created, terbit kode faktur `#LUN-ORD-xxx` dan masuk kolom `ORDER_MASUK` | **Ya** |
| 19 | **Transisi Tahap Pipeline & Bayar** | Memindahkan kartu pesanan ke kolom produksi dan mengubah status ke `PAID` | HTTP 200 OK, posisi kartu dan status pelunasan tersimpan permanen | **Ya** |
| 20 | **Update Pesanan ID Fiktif** | Memperbarui status pesanan menggunakan ID order yang tidak ada di database | Ditolak dengan HTTP 404 Not Found *"Pesanan tidak ditemukan"* | **Ya** |
| 21 | **QC Digital & Bukti Foto** | Submit 4 poin checklist fisik (dimensi, akrilik, ballchain, print) + tautan foto | HTTP 200 OK, status order otomatis naik ke tahap `QA_PACKING` | **Ya** |
| 22 | **Tiket Komplain Kategori A** | Menerbitkan komplain cacat akrilik retak dengan estimasi nilai garansi | HTTP 201 Created, terbit kode tiket `#LUN-TK-xxx` dengan SLA penanganan 24 jam | **Ya** |
| 23 | **Validasi Deskripsi Keluhan** | Menerbitkan tiket keluhan dengan rincian masalah dikosongkan | Ditolak dengan HTTP 400 Bad Request *"Rincian masalah wajib diisi"* | **Ya** |
| 24 | **Resolusi Tiket & Audit CRT** | Menyelesaikan keluhan konsumen dengan mencatat tindakan cetak ulang | HTTP 200 OK, Customer Resolution Time (CRT) terhitung dan status menjadi `RESOLVED` | **Ya** |
| 25 | **Pelacakan Tiket Publik Real-Time** | Konsumen melacak tiket keluhan via URL publik menggunakan kode tiket valid | HTTP 200 OK, rincian status tiket, solusi, dan tanggal penyelesaian tampil transparan | **Ya** |
| 26 | **Pelacakan Kode Tiket Palsu** | Memasukkan kode tiket acak/fiktif (`#LUN-TK-FAKENUMBER`) pada portal publik | Ditolak dengan HTTP 404 Not Found tanpa memicu *crash* / error 500 | **Ya** |
| 27 | **Klasifikasi SLA Badge Leads** | Membuka antrean calon pembeli (leads) WhatsApp | HTTP 200 OK, setiap kontak dilabeli badge SLA (*Overdue* / *Perlu Respon* / *Terjawab*) | **Ya** |
| 28 | **Perekaman Waktu Respon (FRT)** | PIC mengklik tombol jawab pesan WhatsApp calon pelanggan | HTTP 200 OK, timestamp respon pertama tercatat otomatis untuk evaluasi First Response Time | **Ya** |
| 29 | **Validasi Template Balasan Kosong** | Membuat template balasan WhatsApp dengan judul dan teks pesan kosong | Ditolak dengan HTTP 400 Bad Request *"Judul dan konten template wajib diisi"* | **Ya** |
| 30 | **Pembuatan Template Pesan Cepat** | Input template balasan baru lengkap dengan variabel nama dinamis `{nama}` | HTTP 201 Created, template tersimpan dan siap digunakan untuk CS WhatsApp | **Ya** |
| 31 | **Pemesanan Pembeli Publik (/pesan)** | Konsumen memesan merchandise fanmerch secara mandiri di formulir publik | HTTP 201 Created, akun pembeli dibuat otomatis dan faktur `#LUN-ORD-xxx` terbit | **Ya** |
| 32 | **Validasi Kontak Form Publik** | Mengirim pesanan publik tanpa mengisi nama pemesan dan nomor WhatsApp | Ditolak dengan HTTP 400 Bad Request *"Nama, nomor WhatsApp, dan produk wajib diisi"* | **Ya** |
| 33 | **Pengajuan Komplain (/komplain)** | Konsumen mengajukan komplain barang cacat disertai foto bukti & nomor invoice | HTTP 201 Created, tiket keluhan baru `#LUN-TK-xxx` otomatis masuk ke dashboard CRM | **Ya** |
| 34 | **Verifikasi Nomor PO Survei** | Memasukkan nomor pesanan aktif pada formulir kepuasan survei CSAT | HTTP 200 OK, pesanan diverifikasi dan nama merchandise yang dibeli ditampilkan | **Ya** |
| 35 | **Pencegahan Survei PO Fiktif** | Memasukkan nomor pesanan fiktif (`#LUN-ORD-999999`) pada formulir survei | Ditolak dengan HTTP 404 Not Found, mencegah pengisian survei tanpa transaksi sah | **Ya** |
| 36 | **Pengiriman Survei CSAT & Kupon** | Mengirimkan ulasan bintang 5 dan testimoni kepuasan pelanggan | HTTP 201 Created, rating tersimpan dan voucher diskon `LUNAR-CSAT-15` otomatis terbit | **Ya** |
| 37 | **Pilih Tanggal Jadwal Promo PO** | Memilih tanggal spesifik siaran promo WhatsApp melalui Date Picker kalender | HTTP 200 OK, sistem menjadwalkan siaran sesuai tanggal yang dipilih dalam kalender | **Ya** |
| 38 | **Live Global Search (⌘K)** | Mengetikkan kata kunci pencarian (misal: `"akrilik"`) pada dialog pencarian cepat | HTTP 200 OK, hasil pencarian pesanan, pelanggan, tiket, dan leads muncul simultan | **Ya** |
| 39 | **Penanganan Search Tak Ditemukan** | Mengetikkan kata kunci acak fiktif (`"xyz_non_existent_key_9999"`) | HTTP 200 OK, sistem mengembalikan hasil kosong tanpa error atau kegagalan UI | **Ya** |
| 40 | **Audit SLA Otomatis & Notifikasi** | Memicu pemindaian kepatuhan waktu layanan secara terjadwal / otomatis | HTTP 200 OK, sistem mendeteksi order tertahan >3 hari dan tiket keluhan *open* | **Ya** |

---

## 3. Kesimpulan Hasil Pengujian

Berdasarkan eksekusi 40 skenario pengujian *Blackbox Testing* yang mencakup alur positif, batas masukan (*boundary analysis*), penolakan data tidak sah (*negative cases*), dan penanganan error:

1. **Stabilitas Server & Database:** Seluruh endpoint Next.js Route Handlers (`app/api/**/route.ts`) bersama Drizzle ORM berjalan stabil dengan tingkat kelulusan **100% (40 dari 40 skenario lulus)**.
2. **Keamanan & Kepatuhan Data:** Mekanisme penyamaran nomor telepon pelanggan telah aktif melindungi privasi data sesuai standar regulasi PDP.
3. **Penyajian Error yang Informatif:** Tidak ditemukan adanya respon *crash* atau *unhandled 500 error* saat diberikan masukan fiktif, string kosong, maupun kode duplikat.
4. **Kesiapan Produksi:** Seluruh modul CRM admin dan tiga portal publik (`/pesan`, `/komplain`, `/survei`) telah terverifikasi siap digunakan pada tahap produksi (*Production-Ready*).
