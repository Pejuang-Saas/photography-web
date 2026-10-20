# Deploy ke Dokploy (tanpa Docker Compose)

Setiap bagian sistem berdiri sendiri sebagai aplikasi Dokploy: API, worker, dan web, ditambah Postgres, Redis, dan penyimpanan gambar (S3). Tidak ada `docker-compose` di produksi. Semua Dockerfile sudah diuji: image dibangun, dijalankan terhadap Postgres, Redis, dan MinIO, dan seed serta login admin dicoba dari image yang sama.

## 1. Gambaran

| Layanan | Jenis di Dokploy | Folder (Build Path) | Build Stage | Port | Domain |
|---|---|---|---|---|---|
| **api** | Application (Git) | `apps/api` | kosong (bawaan) | 3000 | `api.example.com` |
| **worker** | Application (Git) | `apps/api` | `worker` | tidak ada | tidak perlu |
| **web** | Application (Git) | `apps/web` | kosong (bawaan) | 3000 | `example.com` |
| Postgres | Database, PostgreSQL | | | 5432 | tidak perlu |
| Redis | Database, Redis | | | 6379 | tidak perlu |
| Penyimpanan gambar | MinIO (Application dari image `quay.io/minio/minio`, command `server /data`) atau S3 lain | | | 9000 | `cdn.example.com` |

Pengaturan build tiap aplikasi: **Build Type = Dockerfile**, Dockerfile bernama `Dockerfile`, dan konteks build adalah **folder aplikasinya** (`apps/api` atau `apps/web`), bukan akar repo. Nama kolom bisa sedikit berbeda antar versi Dokploy, tapi aturannya sama: konteks = folder aplikasi.

API dan worker dibangun dari **Dockerfile yang sama**. Bedanya hanya `Build Stage`: kosong untuk API, `worker` untuk worker. Jadi buat dua aplikasi dari folder `apps/api`, dan isi `Build Stage` = `worker` pada yang kedua.

## 2. Urutan deploy

Urutan ini penting karena web membutuhkan alamat API saat dibangun.

1. **Buat Postgres dan Redis.** Catat nama host internal, user, password, dan nama database dari halaman masing-masing.
2. **Siapkan penyimpanan gambar.** Beri domain publik (misalnya `cdn.example.com`) yang menunjuk ke MinIO port 9000. Bucket dibuat otomatis oleh API saat pertama dipakai, lengkap dengan kebijakan baca publik, jadi tidak perlu dibuat manual. Kalau memakai S3 lain, pastikan akunnya boleh membuat bucket dan memasang kebijakan bucket.
3. **Deploy `api`.** Isi environment dari [`apps/api/.env.production.example`](../../apps/api/.env.production.example). Di log harus muncul `Applying Prisma migrations`, lalu `Database schema ready`, lalu `API is running`. Cek `https://api.example.com/ready`: semua `connected`.
4. **Isi data awal dari terminal aplikasi `api`** (tab Terminal di Dokploy, atau `docker exec`):
   ```sh
   node dist/seed/seed.js
   ADMIN_EMAIL=pemilik@example.com ADMIN_NAME="Pemilik" ADMIN_PASSWORD='minimal-12-karakter' node dist/seed/create-admin.cli.js
   ```
   Keduanya aman dijalankan ulang. Detail di bagian 5.
5. **Deploy `worker`** dengan environment yang sama persis dengan API (salin saja). Di log harus muncul `BullMQ worker is running`.
6. **Deploy `web`** dengan build argument dan environment dari [`apps/web/.env.production.example`](../../apps/web/.env.production.example). Bagian 4 menjelaskan bedanya.
7. **Cek:** buka `https://example.com` (katalog tampil), lalu `/login`, masuk dengan admin tadi.

## 3. Variabel environment

Daftar lengkap dengan penjelasan ada di `apps/api/.env.production.example`. Yang wajib diisi:

| Variabel | Isi |
|---|---|
| `DATABASE_URL`, `REDIS_URL` | alamat internal dari Dokploy |
| `BETTER_AUTH_URL`, `API_URL` | alamat publik API, `https://api.example.com` |
| `WEB_URL` | alamat publik web **persis seperti di browser** (apakah `www`, https, tanpa garis miring di akhir) |
| `AUTH_COOKIE_DOMAIN` | `.example.com` bila web dan API beda subdomain |
| `BETTER_AUTH_SECRET` | acak, minimal 32 karakter (`openssl rand -hex 32`) |
| `PAYMENT_CONFIG_ENCRYPTION_KEY` | acak (`openssl rand -hex 32`). **Simpan cadangannya**: tanpa kunci ini kunci gateway pembayaran yang tersimpan tidak bisa dibaca lagi |
| `S3_ENDPOINT`, `S3_PUBLIC_URL`, `S3_BUCKET`, `S3_PRIVATE_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | penyimpanan gambar |
| `WEB_REVALIDATE_URL`, `WEB_REVALIDATE_SECRET` | agar web menyegarkan diri setelah admin mengedit |

Worker membutuhkan variabel yang sama dengan API. Variabel khusus auth (`BETTER_AUTH_*`, `AUTH_COOKIE_DOMAIN`) tidak dipakai worker, tapi tidak apa-apa bila ikut tersalin.

Email dan WhatsApp mati secara bawaan di produksi: `OUTBOX_DELIVERY_MODE` bernilai `disabled` sampai kamu mengisinya `live` dan mengisi SMTP. Tanpa itu, pelanggan tidak menerima email apa pun.

## 4. Web: build argument berbeda dari environment

Next.js menanam beberapa nilai ke dalam hasil build. Di Dokploy, isi ini di bagian **Build-time Arguments**, bukan Environment:

| Build argument | Isi |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://example.com` |
| `NEXT_PUBLIC_API_URL` | `https://api.example.com` |
| `S3_PUBLIC_URL` | sama dengan `S3_PUBLIC_URL` di API |
| `NEXT_PUBLIC_GALLERY_BASE_URL` | opsional |

**Mengubah salah satunya butuh Deploy ulang (build lagi), bukan sekadar restart.** Gejala kalau salah: tombol login memanggil `localhost`, atau gambar tidak muncul.

Environment biasa (dibaca saat server jalan): `API_INTERNAL_URL` (alamat privat API, `http://<nama-aplikasi-api>:3000`, opsional) dan `REVALIDATE_SECRET` (sama dengan `WEB_REVALIDATE_SECRET` di API).

## 5. Seed dan admin pertama

**Seed** (`node dist/seed/seed.js`) mengisi data awal: paket dan add-on sesuai price list, kategori paket, FAQ, galeri contoh, testimoni contoh, marquee kampus, kategori CRM, dan template WhatsApp. Aturannya:

- **Aman dijalankan berkali-kali.** Baris yang sudah ada tidak ditimpa, jadi hasil editan admin tetap.
- Butuh penyimpanan gambar yang sudah bisa dijangkau API, karena foto galeri dan testimoni contoh diunggah ke bucket. Kalau gagal di tengah, perbaiki S3 dan jalankan ulang.
- **Hanya harga dan paket yang dari price list.** Testimoni, FAQ, dan teks halaman adalah **contoh**. Ganti atau sembunyikan sebelum situs dibuka ke publik, terutama testimoni (berisi nama orang) dan teks FAQ yang menyebut layanan atau waktu tertentu.
- Bagian price list saja: `node dist/seed/pricelist.cli.js`.

**Admin pertama** (`node dist/seed/create-admin.cli.js`) membaca `ADMIN_EMAIL`, `ADMIN_NAME`, dan `ADMIN_PASSWORD` (minimal 12 karakter), atau opsi `--email`, `--name`, `--password`. Kalau pengguna itu sudah ada, ia dijadikan admin dan **passwordnya tidak diubah**. Ketik password hanya di terminal Dokploy, jangan simpan di environment aplikasi.

## 6. Domain, HTTPS, dan login admin

Pola yang diuji: web di `example.com` dan API di `api.example.com`.

- Aktifkan HTTPS (Let's Encrypt) di kedua domain. Dengan `BETTER_AUTH_URL` berawalan `https`, cookie login otomatis berstatus `Secure`.
- **`AUTH_COOKIE_DOMAIN=.example.com` wajib** untuk pola ini. Cookie login dibuat oleh API, sedangkan penjaga `/admin` di web membacanya di domain web. Tanpa domain induk, web tidak pernah melihat cookie itu dan `/admin` terus mengarahkan ke login.
- `WEB_URL` harus sama persis dengan alamat web di browser. Pilih satu (apex atau `www`) dan alihkan yang lain ke situ.
- `TRUST_PROXY_HOPS` bawaannya 1 (satu proxy, Traefik Dokploy), pas untuk pola di atas. Isi 2 bila ada Cloudflare di depan Traefik. Tanpa pengaturan ini, batas laju menghitung semua pengunjung sebagai satu klien.

## 7. Migrasi database

API menerapkan migrasi sendiri setiap kali start (`prisma migrate deploy`), dan berhenti dengan galat setelah 30 percobaan (sekitar 1 menit) bila database tidak terjangkau atau migrasinya gagal, jadi deploy yang rusak terlihat gagal. Worker tidak pernah menjalankan migrasi. **Deploy API dulu, lalu worker.**

Riwayat migrasi dimulai dari satu migrasi dasar (`20261020150000_baseline`) yang dibuat dari `schema.prisma`, dan sudah diuji dari database kosong (41 tabel, tanpa selisih dengan skema). Migrasi lama sebelumnya tidak bisa dijalankan dari database kosong, karena dev memakai `db push`. Isinya diarsipkan di `apps/api/prisma/legacy-migrations/` (tidak dibaca Prisma).

Membuat migrasi untuk perubahan skema berikutnya (di dev, sekali awal untuk database dev yang dibuat dengan `db push`):

```sh
docker compose exec api npx prisma migrate resolve --applied 20261020150000_baseline   # sekali saja
docker compose exec api npx prisma migrate dev --name nama_perubahan
```

Commit folder migrasi yang terbentuk. Pada deploy berikutnya, API menerapkannya otomatis.

## 8. Lockfile

Image dibangun dengan `npm ci` dari `package-lock.json` di folder tiap aplikasi, agar build bisa diulang. Setelah menambah atau mengubah dependensi, perbarui lockfile aplikasinya:

```sh
sh scripts/refresh-lock.sh api    # atau: web
```

Lockfile API sempat basi (tidak memuat `pdfkit`, `ioredis@6`, dan lainnya), dan itu diperbarui saat Dockerfile ini dibuat. `npm ci` gagal dengan pesan jelas bila package.json dan lockfile tidak sinkron.

## 9. Cek kesehatan

- API: `GET /ready` memeriksa database, Redis, dan antrean. Dockerfile sudah memasang HEALTHCHECK ke `/ready` lewat `127.0.0.1` (bukan `localhost`: di Alpine itu diselesaikan ke IPv6 dulu dan ditolak).
- Web: `GET /login`.
- Worker: tidak punya port, jadi tidak punya healthcheck. Pantau lewat log (`BullMQ worker is running`) dan lewat angka antrean di `/ready` API.

## 10. Setelah deploy: yang perlu diisi

Lewat panel admin:

1. **Pengaturan, Profil Studio:** nomor WhatsApp, alamat, tautan peta, Instagram, jam buka, jaminan, dan ketentuan umum reservasi.
2. **Pengaturan, Metode Pembayaran:** rekening manual atau gateway.
3. **Pengaturan, Otomasi WhatsApp** dan **Notifikasi Email:** bila dipakai (butuh `WAHA_*` dan `SMTP_*` di environment).
4. **Konten Halaman dan CMS:** ganti testimoni, FAQ, dan foto contoh dengan yang asli.
5. **Paket, Kategori Paket, dan Add-on:** sesuaikan harga bila berubah.

## 11. Pencadangan

- **Postgres:** gunakan fitur backup Dokploy (jadwal ke S3) pada database.
- **Penyimpanan gambar:** cadangkan volume MinIO.
- **Dua rahasia yang tidak boleh hilang:** `PAYMENT_CONFIG_ENCRYPTION_KEY` dan `BETTER_AUTH_SECRET`. Yang pertama membuka kunci gateway tersimpan, yang kedua dipakai untuk sesi login.

## 12. Gejala dan penyebabnya

| Gejala | Kemungkinan penyebab |
|---|---|
| Login berhasil lalu kembali ke halaman login | `AUTH_COOKIE_DOMAIN` kosong atau salah, atau `WEB_URL` tidak sama persis dengan alamat di browser |
| Tombol login tidak berbuat apa-apa, atau galat jaringan di konsol | `NEXT_PUBLIC_API_URL` salah atau belum diisi sebagai build argument. Perbaiki, lalu Deploy ulang web |
| Gambar tidak tampil atau diblokir | `S3_PUBLIC_URL` beda antara API dan web, atau bukan build argument di web, atau bucket tidak publik |
| Landing kosong atau katalog "tidak dapat dimuat" | Server web tidak bisa menjangkau API: periksa `API_INTERNAL_URL` (nama aplikasi API harus benar) atau `NEXT_PUBLIC_API_URL` |
| Semua pengunjung kena `429` bersamaan | `TRUST_PROXY_HOPS` 0, atau jumlah proxy tidak cocok |
| API terus restart dengan `Giving up after 30 attempts` | `DATABASE_URL` salah, atau Postgres belum jalan. Lihat log baris di atas pesan itu |
| Seed gagal dengan galat S3 | `S3_ENDPOINT` atau kuncinya salah, atau MinIO belum jalan |
| Email atau WhatsApp tidak terkirim | `OUTBOX_DELIVERY_MODE` masih `disabled`, atau `SMTP_*` kosong, atau worker belum berjalan |
| `npm ci` gagal saat build | Lockfile tidak sinkron dengan package.json: jalankan `sh scripts/refresh-lock.sh <app>` |

## 13. Memperbarui

- Deploy ulang aplikasi yang berubah. Bila API dan worker berubah bersama, deploy **API dulu**.
- Mengubah `NEXT_PUBLIC_*` atau `S3_PUBLIC_URL` di web butuh build ulang.
- Rollback: Dokploy menyimpan deployment sebelumnya. Migrasi database tidak dibatalkan otomatis, jadi tulis migrasi yang kompatibel mundur (tambah kolom dulu, hapus belakangan).
