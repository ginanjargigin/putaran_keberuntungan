# Putaran Keberuntungan

Versi awal aplikasi roda pemilih nama tanpa iklan.

## Teknologi

- HTML5
- CSS3
- Vanilla JavaScript
- Canvas API
- localStorage
- Web Crypto API (dengan fallback Math.random)
- Web App Manifest

Tidak membutuhkan PHP, database, build tool, framework, atau backend.

## Struktur

```text
putaran-keberuntungan/
├── index.html
├── style.css
├── script.js
├── manifest.webmanifest
├── favicon.svg
└── README.md
```

## Menjalankan lokal

Bisa dibuka langsung melalui `index.html`.

Untuk hasil yang lebih mendekati deployment:

```bash
python -m http.server 8080
```

Lalu buka:

```text
http://localhost:8080
```

## Deploy

Folder ini adalah static site. Bisa dideploy langsung ke:

- Vercel
- Netlify
- GitHub Pages
- hosting static lainnya

Tidak ada command build.

## Catatan

Data nama, riwayat, dan pengaturan disimpan di browser pengguna menggunakan localStorage. Data tidak dikirim ke server.

Pemilihan pemenang dipisahkan dari animasi roda. Index pemenang dipilih terlebih dahulu, kemudian animasi dihitung agar sektor pemenang berhenti di pointer.
