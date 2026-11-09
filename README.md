# Lunar CRM — Studio & Custom Merchandise CRM

Lunar CRM adalah sistem manajemen hubungan pelanggan (CRM) dan pelacak alur pesanan (order pipeline) modern untuk studio merchandise kreatif, dibangun menggunakan **Next.js 16 (Turbopack)**, **React 19**, **Tailwind CSS**, dan **Drizzle ORM** dengan database **PostgreSQL**.

---

## 🗄️ Database & Drizzle ORM

Proyek ini telah dikonfigurasi penuh menggunakan **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) dengan driver native `postgres`.

### Struktur File Database

* **`drizzle.config.ts`**: Konfigurasi Drizzle Kit (skema, direktori output migrasi, kredensial database).
* **`lib/schema.ts`**: Definisi skema tabel, tipe relasi (`relations`), tipe data TypeScript (`$inferSelect`, `$inferInsert`), serta indeks performa.
* **`lib/db.ts`**: Inisialisasi koneksi klien PostgreSQL & instance Drizzle ORM (`db`).
* **`models/`**: Export model individual dan tipe data entitas untuk kemudahan import (`Customer`, `Order`, `Lead`, `Product`, `SupportTicket`, dll).
* **`drizzle/`**: Berkas migrasi SQL yang dihasilkan oleh Drizzle Kit.
* **`scripts/seed.ts`**: Skrip seeding data awal yang realistis dan sesuai standar UU PDP.
* **`scripts/migrate.ts`**: Skrip eksekusi migrasi Drizzle secara programatis.

---

## 🚀 Perintah Drizzle ORM

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run db:generate` | Menghasilkan file migrasi SQL baru di folder `drizzle/` berdasarkan perubahan di `lib/schema.ts` |
| `npm run db:migrate` | Menjalankan migrasi Drizzle ke PostgreSQL dan mencatat statusnya di tabel `__drizzle_migrations` |
| `npm run db:push` | Menerapkan skema Drizzle langsung ke database secara cepat tanpa file migrasi (cocok untuk prototyping) |
| `npm run db:studio` | Membuka antarmuka GUI visual Drizzle Studio di browser (`https://local.drizzle.team`) |
| `npm run db:seed` | Mengisi database dengan data awal realistis (20+ pelanggan, 10 pesanan, lead, tiket, template, audit log) |

---

## ⚙️ Variabel Lingkungan (`.env`)

Pastikan berkas `.env` telah disetel:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/lunar_crm
SESSION_SECRET=your-secret-session-key
```

---

## 💻 Menjalankan Aplikasi

1. **Jalankan database PostgreSQL** lokal atau remote.
2. **Jalankan migrasi database**:
   ```bash
   npm run db:migrate
   ```
3. **Isi data awal (opsional)**:
   ```bash
   npm run db:seed
   ```
4. **Jalankan development server**:
   ```bash
   npm run dev
   ```
5. Buka [http://localhost:3000](http://localhost:3000) di browser.
