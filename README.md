# hitungsehat

Aplikasi Web Penghitung & Pelacak Kalori Berbasis AI Vision dengan standar desain antarmuka anti-slop (Taste Skill).

## 🚀 Ringkasan Produk

**Hitung Sehat** adalah platform pelacak nutrisi pintar yang memungkinkan pengguna menghitung jumlah kalori dan makronutrisi (karbohidrat, protein, lemak) hanya dengan memfoto makanan mereka.

### 🎯 Prinsip Utama Data (The Decision Gate)
Pemindaian (*scan*) bersifat **eksploratif**. Data kalori dari foto yang di-*scan* **tidak akan masuk** ke dalam grafik atau riwayat harian pengguna kecuali pengguna menekan tombol konfirmasi (**"Catat Makanan Ini" / Accept**).
* **`SCANNED_ONLY`:** Status awal saat foto dianalisis AI (belum masuk perhitungan harian). Pengguna bebas menyesuaikan porsi, mengganti kuah/minyak, atau membatalkan scan.
* **`ACCEPTED`:** Status setelah pengguna mengonfirmasi konsumsi makanan. Data langsung memperbarui progres harian, indikator makro, dan tren kalori 7 hari.

---

## ✨ Fitur Utama

1. **Pemindai AI Vision:**
   * Akses kamera langsung di browser (`MediaDevices API`) & unggah berkas (`JPG`, `PNG`, `WEBP`).
   * Kompresi foto sisi klien (*client-side canvas compression*) di bawah 200ms sebelum inferensi.
   * Rincian komponen piringan makanan lokal (misal: Nasi Putih, Rendang Daging, Gulai Daun Singkong, Sambal Ijo).
   * Penyesuaian kuah & santan kuliner lokal (*Tiris / Kuah Sedikit* vs *Kuah Standar* vs *Banyak Santan*).
   * Pengatur porsi ($0.5\times$ s/d $2.0\times$).
   * Penanganan *edge case* (benda bukan makanan & foto buram).

2. **Dashboard & Analitik:**
   * Cincin progres kalori harian (*progress ring*) & indikator sisa kuota kalori.
   * Batang progres makronutrisi harian (Karbohidrat, Protein, Lemak).
   * Grafik tren kalori 7 hari (hanya mengakumulasi makanan yang telah di-*accept*).
   * Jurnal makanan hari ini lengkap dengan opsi hapus/undo.

3. **Autentikasi Multi-Channel & Profil:**
   * Dukungan login Google, Apple ID, WhatsApp/HP (OTP), dan Email.
   * Target kalori harian yang dapat disesuaikan.
   * Dukungan kunci Google Gemini API (opsional) untuk inferensi Gemini 2.5 Flash langsung.

---

## 🛠️ Cara Menjalankan

Aplikasi ini menggunakan JavaScript murni modern tanpa dependensi build berat.

```bash
# 1. Jalankan server lokal
npm start
# atau
node server.mjs

# 2. Buka di peramban
http://localhost:3000
```

---

## 🎨 Standar Desain
Dibangun menggunakan standar **`design-taste-frontend` (Taste Skill v2)** dengan gaya *Editorial Greeting*:
* Tipografi: `Instrument Serif` + `Instrument Sans`
* Palet Warna: Ground `#fafaf8`, Accent `#194a3f`
* Lulus linter anti-slop: `0 FAIL, 0 WARN`.
