# Textured & Lit Object Playground — Praktikum 05

## Nama

| Nama | NRP |
|---|---|
| Mario Napitupulu | 5025241085 |
| Nathanael Oliver A. Y. | 5025241109 |

Teknik Informatika — Institut Teknologi Sepuluh Nopember (ITS) Surabaya

## Deskripsi Aplikasi

Aplikasi WebGL2 interaktif untuk mempelajari **lighting, shading, dan texture mapping** pada objek 3D. Objek berputar otomatis dan disinari satu sumber cahaya titik dengan model **Phong** (ambient + diffuse + specular) yang dihitung per fragmen di fragment shader.

Fitur utama:

- 4 bentuk objek: Kubus, Bola, Torus, Torus Knot.
- Posisi cahaya bisa digeser lewat slider atau keyboard, dan bisa mengorbit otomatis.
- Komponen ambient, diffuse, dan specular bisa dihidupkan/dimatikan satu per satu.
- Non-uniform scale (X, Y, Z) dengan **normal matrix** agar pencahayaan tetap benar.
- Pengaturan texture: sumber, filtering, wrapping, dan skala UV.
- Orbit kamera, HUD status real-time, dan tombol reset.

## Kontrol Keyboard

| Tombol | Fungsi |
|---|---|
| `←` / `→` | Geser cahaya sumbu X |
| `↑` / `↓` | Geser cahaya sumbu Y |
| `W` / `S` | Geser cahaya sumbu Z (W = menjauh, S = mendekat) |
| `F` | Toggle Flat / Smooth shading |
| `T` | Toggle tombol Texture (indikator) |
| `L` | Toggle Light Orbit |
| `P` | Pause / lanjutkan rotasi objek |
| `G` | Ganti wrapping (REPEAT / CLAMP_TO_EDGE) |
| `[` / `]` | Perkecil / perbesar skala UV (0.25 – 5.0) |
| `-` / `+` | Kurangi / tambah shininess (2 – 128) |
| `R` | Reset scene |

## Jenis Shading

- **Flat shading** (default): normal dihitung per segitiga di fragment shader dengan `cross(dFdx(worldPos), dFdy(worldPos))`, jadi setiap permukaan datar terlihat satu warna.
- **Smooth shading**: normal per vertex diinterpolasi antar fragmen (`normalize(v_normal)`), sehingga permukaan tampak halus.

Model pencahayaan yang dipakai adalah **Phong**: specular dihitung dari vektor pantul `R = reflect(-L, N)` dan vektor arah kamera `V`, yaitu `pow(max(dot(R, V), 0), shininess)`.

## Texture yang Digunakan

1. **Checkerboard** (prosedural): canvas 64×64 dengan 8×8 kotak, warna putih `#f8fafc` dan biru `#0ea5e9`.
2. **Image Texture**: memuat `./assets/texture.png`. Jika file tidak ditemukan, aplikasi memakai fallback berupa gradien warna 256×256 dengan grid dan label arah U/V.

## Filtering yang Tersedia

| Mode | Min filter | Mag filter |
|---|---|---|
| `LINEAR` (default) | `LINEAR` | `LINEAR` |
| `NEAREST` | `NEAREST` | `NEAREST` |
| `LINEAR_MIPMAP` | `LINEAR_MIPMAP_LINEAR` | `LINEAR` |

## Wrapping yang Tersedia

- `REPEAT` (default)
- `CLAMP_TO_EDGE`

Wrapping berlaku pada sumbu S dan T. Efeknya paling terlihat saat skala UV diubah dengan `[` / `]`.

## Nilai Ambient Default

**0.18**

## Nilai Shininess Default

**32**

## Challenge yang Dikerjakan

> Sesuaikan dengan daftar challenge pada soal praktikum. Berikut fitur tambahan yang sudah ada di kode:

- [x] Pilihan 4 bentuk objek (kubus, bola, torus, torus knot)
- [x] Toggle komponen ambient / diffuse / specular
- [x] Non-uniform scale dengan normal matrix (inverse-transpose)
- [x] Light orbit otomatis dan Camera orbit
- [x] Pilihan texture, filtering, wrapping, dan skala UV
- [x] Flat vs Smooth shading
- [ ] Challenge lain: _(isi sesuai soal)_

## Cara Menjalankan

Proyek memakai ES module (`import ... from "./math3d.js"`), jadi **tidak bisa dibuka langsung lewat `file://`**. Jalankan lewat server lokal.

Struktur folder:

```
praktikum05/
├── index.html
├── style.css
├── main.js
├── math3d.js
└── assets/
    └── texture.png   (opsional)
```

Langkah:

1. Buka terminal di folder `praktikum05`.
2. Jalankan salah satu:
   - `python -m http.server 8000`
   - atau `npx serve`
   - atau pakai ekstensi **Live Server** di VS Code.
3. Buka `http://localhost:8000` di browser yang mendukung WebGL2 (Chrome, Edge, Firefox).

## Catatan Debugging

- **Normal pada non-uniform scale.** Normal tidak boleh dikalikan langsung dengan matriks model karena akan miring saat objek di-scale tidak seragam. Solusinya memakai `normalMatrixFromMat4`, yaitu inverse-transpose dari bagian 3×3 matriks model, dikirim sebagai `u_normalMatrix` (`mat3`).
- **Flat shading tanpa normal per face.** Geometri dibuat non-indexed (`buildGeometry` membuka indeks menjadi vertex terpisah), tetapi normal flat dihitung di fragment shader dengan `dFdx`/`dFdy` supaya tidak perlu menyimpan normal per face.
- **Normal kubus untuk smooth shading.** Normal kubus dibuat dari posisi vertex yang dinormalisasi, sehingga mode Smooth membuat kubus tampak membulat. Ini sesuai karakter smooth shading, sedangkan tampilan tajam didapat dari mode Flat.
- **Urutan upload texture.** `generateMipmap` harus dipanggil setelah gambar diunggah, dan parameter filtering/wrapping dipasang ulang (`applyTextureParams`) setelah gambar selesai dimuat. Tanpa itu, mode `LINEAR_MIPMAP` tidak bekerja.
- **Placeholder texture.** Image texture memakai placeholder 1×1 piksel merah selama gambar dimuat, supaya WebGL tidak memberi warning texture incomplete.
- **Gambar tidak ditemukan.** Jika `assets/texture.png` tidak ada, `onerror` membuat fallback gradien sehingga mode Image Texture tetap bisa dicoba.
- **Module gagal dimuat.** Jika layar kosong dan console menampilkan error CORS, penyebabnya halaman dibuka lewat `file://`. Gunakan server lokal.
- **Keterbatasan yang diketahui.** Tombol Texture (`T`) saat ini hanya mengubah indikator tampilan. Sumber texture sebenarnya dipilih lewat dropdown Texture Source.