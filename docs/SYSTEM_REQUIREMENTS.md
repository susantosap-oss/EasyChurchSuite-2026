# EasyPresenter — Spesifikasi Sistem

Spesifikasi PC untuk **menjalankan** EasyPresenter saat ibadah (bukan untuk development).
Aplikasi berbasis Electron 33 (Chromium 130) + server lokal Next.js + SQLite.

## Ringkasan

| | **Minimum** | **Disarankan** | **Pro / 4K** |
|---|---|---|---|
| Pemakaian | 1 output (proyektor), lirik & Alkitab, video ≤ 1080p | 2 output bersamaan, video 1080p, animasi teks & background | 2 output 1080p–4K, banyak video, (nanti) NDI / streaming |
| OS | Windows 10 64-bit 22H2 | Windows 11 64-bit | Windows 11 64-bit |
| CPU | Intel Core i3 gen 7 (mis. i3-7100U) / AMD Ryzen 3 2200U — 2 core / 4 thread | Intel Core i5 gen 10+ / AMD Ryzen 5 4500U+ — 4 core / 8 thread | Intel Core i7 gen 11+ / AMD Ryzen 7 5000+ |
| GPU | Integrated Intel HD/UHD 620 / AMD Vega 3 — DirectX 12, decode H.264 hardware | Intel Iris Xe / UHD 730 / AMD Radeon Vega 7+ | NVIDIA GTX 1650 / RTX 3050 ke atas (NVENC) |
| RAM | **8 GB** | **16 GB** | 16–32 GB |
| Penyimpanan | SSD, 10 GB kosong | SSD 256 GB+, 30 GB kosong | NVMe SSD 512 GB+ |
| Layar operator | 1366×768 | 1920×1080 | 1920×1080 atau lebih |
| Output | 1× HDMI / DisplayPort / VGA (1080p) | 2× output (HDMI + HDMI/DP) | 2× output, kartu SDI (Blackmagic) bila perlu |
| Setting yang dianjurkan | **Mode Spek Rendah ON**, video maks 720p–1080p / 6 Mbps / 30 fps | Default (1080p / 12 Mbps / 30 fps) | 4K / 25 Mbps / 60 fps bila semua layar 4K |

> RAM 4 GB **tidak didukung**: Windows sendiri ±2,5 GB, sisa tidak cukup untuk jendela operator + output + server lokal.

## Dari mana angka RAM-nya

Perkiraan pemakaian saat ibadah (1080p):

| Komponen | RAM |
|---|---|
| Windows 10/11 + antivirus | 2,5 – 3 GB |
| Jendela operator (Electron) | 400 – 700 MB |
| Tiap jendela output (Display 1 / 2) | 200 – 350 MB |
| Server lokal (Next.js + SQLite) | 250 – 400 MB |
| Decode video 1080p H.264 (per layar yang memutar) | 100 – 300 MB |
| **Total 1 output** | **±4 – 5 GB** |
| **Total 2 output + video** | **±5 – 6 GB** |

Karena itu minimum 8 GB, disarankan 16 GB (GPU terintegrasi juga memakai RAM sistem sebagai VRAM).

## Video: format & konversi otomatis

- **Diputar langsung (ringan, hardware decode):** H.264 (MP4/MOV/M4V), VP8/VP9 (WebM).
- **Dikonversi otomatis saat upload** ke MP4 H.264 bila: resolusi > batas, bitrate > batas, fps > batas,
  codec berat (HEVC/H.265, ProRes, AV1, MPEG-4 lama), atau kontainer yang tidak bisa diputar
  (AVI, MKV, WMV, MPG, FLV, 3GP, TS). Batas diatur di **Settings ⚙ → Performa**.
- Konversi berjalan satu per satu di latar belakang dan memakai encoder hardware bila ada:
  NVIDIA NVENC → Intel Quick Sync → AMD AMF → CPU (libx264).

### FFmpeg

Konversi butuh FFmpeg. Urutan pencarian:

1. Variabel lingkungan `FFMPEG_PATH`
2. FFmpeg yang dibundel installer: `resources/ffmpeg/ffmpeg.exe` (di-set otomatis oleh Electron)
3. `ffmpeg` di `PATH` (mis. `winget install Gyan.FFmpeg`)

Tanpa FFmpeg aplikasi tetap jalan; hanya konversi video yang nonaktif (Settings menampilkan statusnya).
**Untuk installer gereja:** sertakan `ffmpeg.exe` (build "essentials" dari gyan.dev, ±80 MB) di
`extraResources` electron-builder → `ffmpeg/ffmpeg.exe`.

## Tips untuk PC spek rendah

1. Aktifkan **Settings ⚙ → Performa → Mode PC Spek Rendah**.
2. Set video maksimum **720p / 6 Mbps / 30 fps**.
3. Pakai background **gambar / solid / gradient**; batasi background video (setiap layar yang
   menampilkannya men-decode video sendiri).
4. Pakai 1 output saja (Display 2 nonaktif) bila tidak diperlukan.
5. Bila output berkedip atau hitam di GPU lama: matikan **Hardware acceleration** lalu restart.
6. Tutup browser / aplikasi lain selama ibadah; pastikan Windows power plan = *High performance*
   dan laptop tersambung charger.
