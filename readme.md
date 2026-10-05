# Textured & Lit Object Playground — Praktikum 05

## Nama

| Nama                   | NRP        |
| ---------------------- | ---------- |
| Mario Napitupulu       | 5025241085 |
| Nathanael Oliver A. Y. | 5025241109 |

---

## Deskripsi Aplikasi

Aplikasi WebGL2 interaktif untuk mempelajari **lighting, shading, dan texture mapping** pada objek 3D.

Objek dapat diputar secara otomatis dan disinari oleh satu sumber **point light** menggunakan model **Phong Reflection** yang terdiri dari:

* Ambient lighting
* Diffuse lighting
* Specular lighting

Perhitungan lighting dilakukan **per-fragment** pada fragment shader.

Fitur utama aplikasi:

* 4 bentuk objek: Kubus, Bola, Torus, dan Torus Knot.
* Posisi cahaya dapat digeser melalui keyboard atau slider.
* Point light dapat mengorbit objek secara otomatis.
* Kamera dapat digerakkan menggunakan state-based camera control.
* Ambient strength dapat diatur.
* Komponen ambient, diffuse, dan specular dapat diaktifkan/nonaktifkan.
* Flat dan smooth shading.
* Uniform dan non-uniform scaling.
* Normal Matrix menggunakan inverse-transpose.
* Texture image dan procedural checkerboard.
* Texture filtering dan mipmap filtering.
* Texture wrapping.
* UV scale.
* Shininess control.
* HUD status secara real-time.
* Reset scene.

---

# Kontrol Keyboard

| Tombol    | Fungsi                                                    |
| --------- | --------------------------------------------------------- |
| `←` / `→` | Geser cahaya pada sumbu X                                 |
| `↑` / `↓` | Geser cahaya pada sumbu Y                                 |
| `W` / `S` | Geser cahaya pada sumbu Z (`W` = menjauh, `S` = mendekat) |
| `F`       | Toggle Flat / Smooth shading                              |
| `T`       | Toggle indikator Texture                                  |
| `L`       | Toggle Light Orbit                                        |
| `P`       | Pause / lanjutkan rotasi objek                            |
| `G`       | Ganti wrapping: `REPEAT` / `CLAMP_TO_EDGE`                |
| `[` / `]` | Perkecil / perbesar UV scale                              |
| `-` / `+` | Kurangi / tambah shininess                                |
| `A` / `Z` | Kurangi / tambah Ambient Strength                         |
| `N`       | Toggle Uniform / Non-Uniform Scale                        |
| `1`       | Toggle Ambient ON/OFF                                     |
| `2`       | Toggle Diffuse ON/OFF                                     |
| `3`       | Toggle Specular ON/OFF                                    |
| `C`       | Toggle / mengubah mode Camera Control                     |
| `M`       | Toggle Light Orbit Automatic / Manual                     |
| `R`       | Reset scene                                               |

---

# Jenis Shading

## Flat Shading

Pada mode **Flat Shading**, normal permukaan dihitung berdasarkan bidang segitiga.

Implementasinya menggunakan turunan posisi fragment:

```javascript
cross(dFdx(worldPos), dFdy(worldPos))
```

Normal tersebut menghasilkan satu arah normal untuk setiap permukaan segitiga sehingga permukaan terlihat lebih datar dan memiliki batas yang jelas.

## Smooth Shading

Pada mode **Smooth Shading**, normal disimpan pada vertex dan kemudian diinterpolasi oleh GPU menuju fragment shader.

Normal fragment kemudian dinormalisasi:

```glsl
normalize(v_normal)
```

Hasilnya adalah transisi pencahayaan yang lebih halus antar permukaan.

---

# Phong Reflection Model

Lighting menggunakan model Phong sederhana:

```text
Color = Ambient + Diffuse + Specular
```

### Ambient

```text
Ambient = ambientStrength × baseColor
```

### Diffuse

```text
Diffuse = max(dot(N, L), 0) × lightColor × baseColor
```

### Specular

Arah pantulan dihitung menggunakan:

```text
R = reflect(-L, N)
```

Kemudian dibandingkan dengan arah kamera:

```text
specular = pow(max(dot(R, V), 0), shininess)
```

Dengan:

* `N` = normal
* `L` = arah menuju light
* `V` = arah menuju camera
* `R` = arah reflection
* `shininess` = tingkat kekilapan material

---

# Texture yang Digunakan

## 1. Checkerboard Texture

Texture prosedural berupa checkerboard berukuran:

```text
64 × 64
```

dengan pola:

```text
8 × 8 kotak
```

Warna yang digunakan:

```text
#f8fafc
#0ea5e9
```

Texture ini dibuat langsung menggunakan JavaScript sehingga tidak membutuhkan file eksternal.

---

# Filtering yang Tersedia

| Mode             | Min Filter               | Mag Filter |
| ---------------- | ------------------------ | ---------- |
| `LINEAR`         | `LINEAR`                 | `LINEAR`   |
| `NEAREST`        | `NEAREST`                | `NEAREST`  |
| `LINEAR_MIPMAP`  | `LINEAR_MIPMAP_LINEAR`   | `LINEAR`   |
| `NEAREST_MIPMAP` | `NEAREST_MIPMAP_NEAREST` | `NEAREST`  |

## LINEAR

Pixel texture diinterpolasi sehingga hasilnya lebih halus.

## NEAREST

GPU mengambil texel terdekat sehingga hasilnya lebih tajam dan dapat terlihat pixelated.

## Mipmap

Mipmap menyediakan texture dengan ukuran yang lebih kecil untuk digunakan ketika objek terlihat jauh dari kamera.

Filtering:

```text
LINEAR_MIPMAP_LINEAR
```

melakukan interpolasi antar level mipmap.

Sedangkan:

```text
NEAREST_MIPMAP_NEAREST
```

memilih level mipmap terdekat tanpa interpolasi.

---

# Wrapping yang Tersedia

Wrapping berlaku pada koordinat texture `S` dan `T`.

Pilihan yang tersedia:

```text
REPEAT
CLAMP_TO_EDGE
```

## REPEAT

Texture diulang ketika koordinat UV berada di luar rentang:

```text
0.0 → 1.0
```

## CLAMP_TO_EDGE

Texture diperpanjang menggunakan texel pada bagian tepi.

Efek wrapping paling mudah diamati dengan memperbesar UV scale.

---

# UV Scale

UV scale digunakan untuk memperbesar atau memperkecil frekuensi pengulangan texture.

Contoh:

```text
UV Scale = 1
```

Texture ditampilkan satu kali.

Sedangkan:

```text
UV Scale = 4
```

Texture dapat terlihat berulang sebanyak beberapa kali tergantung wrapping yang digunakan.

Kontrol:

```text
[  → memperkecil UV scale
]  → memperbesar UV scale
```

---

# Nilai Default

| Parameter        | Nilai Default |
| ---------------- | ------------: |
| Ambient Strength |        `0.18` |
| Shininess        |          `32` |
| UV Scale         |         `1.0` |
| Wrapping         |      `REPEAT` |
| Shading          |        `Flat` |
| Light Orbit      |         `OFF` |
| Object Rotation  |          `ON` |

---

# Normal Matrix

Normal tidak selalu dapat ditransformasikan menggunakan Model Matrix biasa.

Hal ini terutama penting ketika objek mengalami **non-uniform scaling**.

Contoh:

```text
Scale X = 2
Scale Y = 1
Scale Z = 0.5
```

Jika normal dikalikan langsung menggunakan Model Matrix, arah normal dapat menjadi tidak tegak lurus terhadap permukaan.

Karena itu digunakan **Normal Matrix**:

```text
Normal Matrix = transpose(inverse(Model Matrix))
```

Dalam implementasi, bagian 3×3 dari Model Matrix digunakan untuk membentuk:

```javascript
normalMatrixFromMat4(...)
```

dan kemudian dikirim ke shader sebagai:

```glsl
uniform mat3 u_normalMatrix;
```

---

# Challenge yang Dikerjakan

## Challenge A — Image Texture

Image texture ditambahkan melalui:

```text
assets/texture.png
```

Texture dimuat menggunakan objek `Image`:

```javascript
const image = new Image();

image.onload = () => {
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
    );
};
```

Image berasal dari project/local server yang sama agar tidak terkena masalah CORS.

Jika image gagal dimuat, aplikasi menggunakan fallback texture.

**Status: [x] Selesai**

---

## Challenge B — Ambient Control

Keyboard:

```text
A / Z
```

digunakan untuk mengubah nilai:

```text
Ambient Strength
```

Nilai ambient ditampilkan pada HUD sehingga perubahan dapat diamati secara langsung.

Ambient yang lebih tinggi membuat objek terlihat lebih terang meskipun tidak mendapatkan diffuse atau specular yang kuat.

**Status: [x] Selesai**

---

## Challenge C — Camera Control

Aplikasi memiliki state-based camera movement.

Perubahan posisi kamera dapat diamati secara langsung terhadap:

* diffuse lighting;
* specular lighting;
* arah view;
* posisi highlight.

Hal yang paling terlihat adalah perubahan **specular highlight**.

Meskipun posisi light tetap, highlight dapat berubah ketika kamera bergerak karena specular lighting bergantung pada hubungan antara arah reflection dan arah menuju kamera.

**Status: [x] Selesai**

---

## Challenge D — Non-Uniform Scale Mode

Keyboard:

```text
N
```

digunakan untuk berpindah antara:

```text
Uniform Scale
```

dan:

```text
Non-Uniform Scale
```

Mode non-uniform scale memberikan nilai scale berbeda pada sumbu X, Y, dan Z.

Challenge ini digunakan untuk menunjukkan pentingnya **Normal Matrix**.

Tanpa inverse-transpose, normal dapat berubah arah secara tidak benar ketika objek mengalami non-uniform scaling.

**Status: [x] Selesai**

---

## Challenge E — Light Orbit

Point light dapat bergerak mengorbit objek.

Posisi light dihitung menggunakan:

```javascript
light.position[0] =
    Math.cos(time) * radius;

light.position[2] =
    Math.sin(time) * radius;
```

Dengan demikian light bergerak pada bidang X-Z mengelilingi objek.

Terdapat mode:

```text
Automatic
Manual
```

Pada mode Automatic, posisi light diperbarui berdasarkan waktu.

Pada mode Manual, posisi light dapat dikontrol menggunakan keyboard atau slider.

**Status: [x] Selesai**

---

## Challenge F — Lighting Components Toggle

Masing-masing komponen lighting dapat diaktifkan atau dinonaktifkan.

| Tombol | Komponen        |
| ------ | --------------- |
| `1`    | Ambient ON/OFF  |
| `2`    | Diffuse ON/OFF  |
| `3`    | Specular ON/OFF |

Challenge ini digunakan untuk mengamati kontribusi setiap komponen terhadap hasil akhir.

Contohnya:

```text
Ambient OFF
Diffuse ON
Specular OFF
```

akan menunjukkan kontribusi diffuse saja.

**Status: [x] Selesai**

---

## Challenge G — Mipmap Filtering

Aplikasi menyediakan eksplorasi filtering menggunakan mipmap:

```text
LINEAR_MIPMAP_LINEAR
```

dan:

```text
NEAREST_MIPMAP_NEAREST
```

Keduanya dibandingkan dengan filtering tanpa mipmap:

```text
LINEAR
NEAREST
```

Perbedaan terutama diamati ketika texture berada jauh dari kamera.

Mipmap dapat membantu mengurangi aliasing dan menghasilkan sampling texture yang lebih sesuai pada objek yang jauh.

**Status: [x] Selesai**

---

# Pertanyaan Pemahaman

## 1. Apa fungsi normal dalam lighting?

Normal menunjukkan arah tegak lurus terhadap permukaan. Informasi ini digunakan untuk menentukan bagaimana cahaya mengenai permukaan objek.

## 2. Apa perbedaan face normal dan vertex normal?

Face normal mewakili arah normal untuk satu bidang/face. Vertex normal berada pada vertex dan biasanya merupakan hasil penggabungan atau rata-rata normal dari beberapa face yang bertemu pada vertex tersebut.

## 3. Apa perbedaan flat shading dan smooth shading?

Flat shading menggunakan normal yang sama untuk suatu face sehingga permukaan terlihat datar. Smooth shading menggunakan normal vertex yang diinterpolasi sehingga perubahan pencahayaan antar permukaan terlihat lebih halus.

## 4. Mengapa normal harus dinormalisasi?

Normal perlu memiliki panjang satu agar perhitungan dot product dan lighting tidak dipengaruhi oleh panjang vektor.

## 5. Mengapa normal perlu ikut ditransformasikan?

Karena ketika objek dipindahkan, diputar, atau di-scale, orientasi permukaannya berubah. Normal harus mengikuti perubahan orientasi tersebut agar lighting tetap benar.

## 6. Mengapa normal tidak selalu cukup dikalikan Model Matrix biasa?

Model Matrix dapat mengubah panjang dan arah normal secara tidak benar, terutama pada non-uniform scaling. Akibatnya normal tidak lagi tegak lurus terhadap permukaan.

## 7. Apa fungsi Normal Matrix?

Normal Matrix digunakan untuk mentransformasikan normal dengan benar setelah objek mengalami transformasi model, terutama ketika terdapat non-uniform scaling.

## 8. Apa yang dimaksud inverse-transpose secara konseptual?

Inverse-transpose adalah operasi yang digunakan agar normal tetap mempertahankan hubungan tegak lurusnya terhadap permukaan setelah transformasi objek.

Secara sederhana:

```text
Normal Matrix = transpose(inverse(Model Matrix))
```

## 9. Apa fungsi ambient lighting?

Ambient lighting memberikan pencahayaan dasar pada objek sehingga bagian yang tidak terkena cahaya langsung tidak menjadi sepenuhnya hitam.

## 10. Mengapa ambient sederhana bukan global illumination?

Ambient sederhana hanya memberikan cahaya dasar secara pendekatan. Ia tidak menghitung pantulan cahaya antar permukaan, indirect lighting, atau interaksi cahaya kompleks seperti global illumination.

## 11. Apa fungsi diffuse lighting?

Diffuse lighting menggambarkan cahaya yang mengenai permukaan secara langsung dan menyebar berdasarkan orientasi permukaan terhadap sumber cahaya.

## 12. Apa arti `dot(N,L)`?

`dot(N,L)` menunjukkan seberapa sejajar arah normal permukaan dengan arah cahaya.

Nilai mendekati:

```text
1
```

berarti permukaan menghadap cahaya.

Nilai:

```text
0
```

berarti cahaya datang dari arah yang tegak lurus terhadap normal.

## 13. Mengapa digunakan `max(dot(N,L),0)`?

Karena permukaan yang membelakangi cahaya tidak boleh menghasilkan diffuse lighting negatif.

## 14. Apa fungsi light direction?

Light direction menunjukkan arah dari permukaan menuju sumber cahaya dan digunakan untuk menghitung diffuse serta specular lighting.

## 15. Apa fungsi view direction?

View direction menunjukkan arah dari permukaan menuju kamera. Vektor ini digunakan terutama dalam perhitungan specular lighting.

## 16. Apa fungsi reflection direction?

Reflection direction menunjukkan arah pantulan cahaya dari permukaan. Vektor ini digunakan untuk menentukan seberapa dekat arah pantulan dengan arah kamera.

## 17. Apa fungsi specular lighting?

Specular lighting menghasilkan highlight atau pantulan cahaya pada permukaan yang terlihat mengkilap.

## 18. Apa pengaruh shininess?

Shininess menentukan seberapa tajam highlight specular.

Nilai rendah menghasilkan highlight yang lebih lebar dan lembut.

Nilai tinggi menghasilkan highlight yang lebih kecil dan tajam.

## 19. Apa yang dimaksud Phong Reflection Model sederhana?

Phong Reflection Model sederhana adalah model pencahayaan yang menggabungkan:

```text
Ambient + Diffuse + Specular
```

untuk menghasilkan warna akhir suatu permukaan.

## 20. Apa perbedaan per-vertex dan per-fragment lighting?

Per-vertex lighting menghitung lighting pada vertex kemudian hasilnya diinterpolasi ke fragment.

Per-fragment lighting menghitung lighting langsung pada setiap fragment sehingga dapat menghasilkan detail pencahayaan yang lebih baik.

## 21. Apa fungsi UV coordinate?

UV coordinate menentukan posisi pengambilan warna dari texture untuk setiap titik pada permukaan objek.

## 22. Apa fungsi texture sampler?

Texture sampler digunakan shader untuk mengambil warna dari texture berdasarkan koordinat UV.

## 23. Apa yang dimaksud texture sampling?

Texture sampling adalah proses mengambil atau menginterpolasi nilai warna texture berdasarkan koordinat UV.

## 24. Apa perbedaan pixel dan texel?

Pixel adalah elemen gambar pada layar. Texel adalah elemen data pada texture.

## 25. Apa perbedaan `NEAREST` dan `LINEAR`?

`NEAREST` mengambil texel terdekat sehingga hasilnya lebih tajam/pixelated.

`LINEAR` melakukan interpolasi beberapa texel sehingga hasilnya lebih halus.

## 26. Apa fungsi wrapping?

Wrapping menentukan apa yang dilakukan ketika koordinat UV berada di luar rentang normal `0–1`.

## 27. Apa perbedaan `REPEAT` dan `CLAMP_TO_EDGE`?

`REPEAT` mengulang texture ketika UV melewati batas.

`CLAMP_TO_EDGE` mempertahankan warna dari texel yang berada di tepi texture.

## 28. Mengapa UV scale diperlukan untuk mudah melihat wrapping?

Karena UV scale yang lebih besar membuat koordinat UV melewati rentang `0–1` lebih sering sehingga pola wrapping terlihat jelas.

## 29. Mengapa texture dapat digunakan sebagai base color?

Texture dapat menyimpan informasi warna permukaan pada setiap koordinat UV. Warna tersebut kemudian dapat digunakan sebagai warna dasar material.

## 30. Bagaimana lighting dan texture digabungkan?

Texture menyediakan base color, sedangkan lighting menentukan intensitas pencahayaan.

Secara sederhana:

```text
Final Color =
Texture Color × Lighting
```

dengan lighting terdiri dari ambient, diffuse, dan specular.

---

# Pertanyaan Analisis

## A — Normal

### Geometry cube sama tetapi normal diubah dari face normal menjadi smooth normal. Mengapa hasil shading berubah?

Karena normal menentukan bagaimana cahaya berinteraksi dengan permukaan.

Face normal membuat setiap face cube mempunyai arah normal yang tetap sehingga batas antar permukaan terlihat tajam.

Smooth normal membuat normal pada vertex diinterpolasi sehingga arah normal berubah secara bertahap antar vertex. Akibatnya lighting juga berubah secara bertahap dan cube dapat terlihat lebih halus atau membulat.

---

## B — Diffuse

### Jika `dot(N,L) = 1`, apa artinya secara geometris?

Artinya normal permukaan dan arah menuju cahaya memiliki arah yang sama.

Secara geometris, permukaan sedang menghadap langsung ke sumber cahaya sehingga menerima diffuse lighting maksimum.

---

## C — Specular

### Mengapa highlight dapat berubah ketika camera bergerak walaupun light position tetap?

Karena specular lighting bergantung pada arah menuju kamera.

Walaupun posisi light tidak berubah, perubahan posisi kamera mengubah:

```text
V = view direction
```

Hubungan antara arah pantulan `R` dan arah kamera `V` juga berubah.

Akibatnya nilai:

```text
dot(R,V)
```

berubah sehingga posisi atau intensitas highlight specular ikut berubah.

---

## D — Texture

### Mengapa texture memberi detail visual tanpa menambah triangle?

Texture menyimpan informasi warna pada image sehingga detail dapat ditampilkan melalui UV mapping.

GPU mengambil warna dari texture pada setiap fragment tanpa perlu membuat geometry tambahan.

Dengan demikian sebuah permukaan dapat memiliki detail visual yang kompleks tanpa harus menambah jumlah triangle.

---

## E — Normal Matrix

### Mengapa non-uniform scaling menjadi kasus penting untuk transformasi normal?

Karena non-uniform scaling mengubah ukuran masing-masing sumbu dengan faktor berbeda.

Jika normal ditransformasikan menggunakan Model Matrix secara langsung, arah normal dapat menjadi tidak tegak lurus terhadap permukaan.

Normal Matrix menggunakan inverse-transpose sehingga hubungan tegak lurus antara normal dan permukaan tetap dipertahankan.

---

# Refleksi Praktikum

Selama praktikum, saya memahami bahwa **flat shading** mempertahankan normal setiap face sehingga permukaan terlihat lebih tajam, sedangkan **smooth shading** melakukan interpolasi normal sehingga permukaan terlihat lebih halus. Komponen lighting yang paling mudah dipahami adalah **diffuse**, karena intensitasnya dapat langsung dilihat dari hubungan antara normal permukaan dan arah cahaya melalui **dot product**. Saya juga memahami bahwa nilai **shininess** memengaruhi ukuran dan ketajaman highlight specular, di mana nilai yang lebih tinggi menghasilkan highlight yang lebih kecil dan tajam. Pada texture filtering, `NEAREST` menghasilkan tampilan yang lebih tajam/pixelated sedangkan `LINEAR` menghasilkan transisi yang lebih halus, sementara mipmap membantu ketika texture terlihat dari jarak jauh. Salah satu hal penting yang dipahami adalah penggunaan **Normal Matrix** pada non-uniform scaling agar arah normal tetap benar dan lighting tidak mengalami distorsi.

---

# Catatan Debugging

## Normal pada Non-Uniform Scale

Normal tidak boleh ditransformasikan langsung menggunakan Model Matrix ketika objek menggunakan non-uniform scale.

Solusinya adalah menggunakan inverse-transpose dari matriks 3×3:

```text
Normal Matrix =
transpose(inverse(Model Matrix))
```

Normal Matrix kemudian dikirim ke shader sebagai:

```glsl
uniform mat3 u_normalMatrix;
```

---

## Flat Shading Tanpa Normal Per-Face

Geometry dibuat non-indexed sehingga vertex dapat berdiri sendiri.

Normal flat dihitung langsung di fragment shader menggunakan:

```glsl
cross(
    dFdx(worldPos),
    dFdy(worldPos)
)
```

Pendekatan ini memungkinkan face normal dihitung berdasarkan posisi fragment tanpa harus menyimpan normal face secara eksplisit.

---

## Normal Cube untuk Smooth Shading

Normal cube dibuat berdasarkan posisi vertex yang dinormalisasi.

Akibatnya, pada mode smooth shading, cube dapat terlihat lebih membulat.

Sedangkan pada flat shading, setiap permukaan tetap terlihat datar.

---

## Urutan Upload Texture

`generateMipmap()` harus dipanggil setelah texture image berhasil di-upload.

Contoh alurnya:

```text
Image selesai dimuat
        ↓
texImage2D()
        ↓
generateMipmap()
        ↓
applyTextureParams()
```

Jika mipmap dibuat sebelum image berhasil di-upload, texture dapat menggunakan data yang belum sesuai.

---

## Placeholder Texture

Image texture menggunakan placeholder texture berukuran 1×1 selama image masih dalam proses loading.

Hal ini mencegah WebGL memiliki texture yang incomplete ketika rendering sudah dimulai.

---

## Image Texture Tidak Ditemukan

Jika:

```text
assets/texture.png
```

tidak ditemukan, aplikasi menggunakan fallback texture.

Fallback memungkinkan fitur texture tetap dapat diuji tanpa menghentikan aplikasi.

---

## Module Gagal Dimuat

Project menggunakan ES Module seperti:

```javascript
import ... from "./math3d.js";
```

Karena itu project tidak sebaiknya dibuka menggunakan:

```text
file://
```

Gunakan local server.

---

## CORS

Image texture sebaiknya berasal dari origin yang sama dengan project.

Contoh:

```text
http://localhost:8000/
```

dan:

```text
http://localhost:8000/assets/texture.png
```

Dengan demikian browser tidak mengalami masalah CORS akibat origin yang berbeda.

---

## Texture Filtering

Untuk menggunakan mipmap filtering:

```text
LINEAR_MIPMAP_LINEAR
```

atau:

```text
NEAREST_MIPMAP_NEAREST
```

texture harus memiliki mipmap.

Karena itu:

```javascript
gl.generateMipmap(gl.TEXTURE_2D);
```

harus dilakukan setelah image berhasil di-upload.

---

## Placeholder dan Fallback

Terdapat dua kondisi yang berbeda:

1. **Placeholder** digunakan ketika image masih loading.
2. **Fallback** digunakan ketika image gagal ditemukan atau gagal dimuat.

Keduanya membuat rendering tetap dapat berjalan.

---

# Struktur Folder

```text
praktikum05/
│
├── index.html
├── style.css
├── main.js
├── math3d.js
│
└── assets/
    └── texture.png
```

---

# Cara Menjalankan

## Github.io

Halaman dapat dibuka melalui URL github.io: https://kenzy-tc.github.io/Grafkom-5/

## VS Code Live Server

Project juga dapat dijalankan menggunakan extension:

```text
Live Server
```

Kemudian buka halaman melalui URL yang diberikan oleh Live Server.

Browser yang direkomendasikan:

* Google Chrome
* Microsoft Edge
* Mozilla Firefox

Browser harus mendukung **WebGL2**.

---

# Ringkasan Konsep Praktikum

Secara keseluruhan, praktikum ini menggabungkan beberapa konsep utama computer graphics:

```text
Geometry
    ↓
Model Transform
    ↓
Normal Transform
    ↓
Normal Matrix
    ↓
World Position + Normal
    ↓
Lighting
    ├── Ambient
    ├── Diffuse
    └── Specular
    ↓
Texture Sampling
    ↓
Final Fragment Color
    ↓
Display
```

Konsep utama yang dipelajari:

* Normal dan normal transformation
* Flat dan smooth shading
* Ambient lighting
* Diffuse lighting
* Specular lighting
* Phong Reflection Model
* View direction
* Reflection direction
* UV coordinate
* Texture sampling
* Texture filtering
* Texture wrapping
* Mipmap
* Normal Matrix
* Non-uniform scaling
* Camera movement
* Light orbit
* Per-fragment lighting

---

# Kesimpulan

Praktikum ini menunjukkan bagaimana **geometry, normal, lighting, camera, dan texture** bekerja secara bersama-sama untuk menghasilkan tampilan objek 3D yang realistis. Penggunaan normal yang tepat sangat penting untuk menghasilkan lighting yang benar, terutama ketika objek mengalami non-uniform scaling sehingga diperlukan Normal Matrix. Selain itu, ambient, diffuse, dan specular memberikan kontribusi visual yang berbeda dan dapat diamati dengan mematikannya secara individual. Texture menambahkan detail warna pada permukaan tanpa harus menambah jumlah geometry, sementara filtering dan mipmap menentukan bagaimana texture ditampilkan pada berbagai jarak. Melalui berbagai challenge, konsep-konsep tersebut dapat diamati secara langsung dan interaktif pada aplikasi WebGL2.
