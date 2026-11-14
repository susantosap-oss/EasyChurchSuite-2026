# Ide: Lagu Mandarin + Terjemahan (Ibadah Mandarin)

> Status: **catatan / belum dikerjakan** — dibahas 2026-11-14.

## Kebutuhan

Ibadah berbahasa Mandarin membutuhkan daftar lagu dengan lirik **Mandarin (汉字)** dan **terjemahannya**,
ditampilkan bersamaan di layar.

## Contoh tampilan per slide

```
        主啊，祢是我的力量          ← Mandarin (besar, utama)
     Zhǔ a, nǐ shì wǒ de lìliàng     ← Pinyin (kecil, opsional)
      Tuhan, Engkaulah kekuatanku    ← Terjemahan (sedang, warna beda)
```

Tiap baris punya gaya sendiri (ukuran, warna, miring) supaya jemaat mudah membedakan teks asli dan terjemahan.

## Pilihan cara

| | A. Tanpa fitur baru | B. Lagu dwibahasa (disarankan) |
|---|---|---|
| Cara | Ketik Mandarin ↵ terjemahan dalam satu slide | Kolom terpisah per slide: **Mandarin**, **Pinyin**, **Terjemahan** |
| Gaya per baris | Sama semua | Berbeda (ukuran / warna) |
| Pinyin | Diketik manual | **Otomatis** dari huruf Mandarin (offline), bisa dikoreksi |
| Display 2 / livestream | Ikut semua baris | Bisa diatur (mis. livestream hanya terjemahan) |
| Subtitle Chroma (ATEM) | Bisa terlalu banyak baris | Pilih baris yang tampil (mis. Mandarin + terjemahan) |
| Cari lagu | Judul saja | Judul Mandarin, **pinyin**, atau judul terjemahan |

Saran: **B**, karena ibadah Mandarin rutin dan jumlah lagunya banyak.

## Catatan teknis

- **Font Mandarin:** Windows 10/11 sudah menyertakan **Microsoft YaHei** — tidak perlu install apa pun di PC gereja.
- **Pinyin otomatis:** pakai library kecil yang jalan offline (mis. `pinyin-pro`); tetap bisa dikoreksi manual
  karena ada huruf dengan lebih dari satu cara baca (多音字).
- **Terjemahan otomatis:** tidak disarankan sebagai bawaan (butuh internet, kurang tepat untuk lirik rohani).
  Terjemahan sebaiknya disiapkan tim gereja.
- **Data:** tambahan kolom per slide di tabel `song_slides` (mis. `pinyin`, `translation`) + pengaturan per lagu
  baris mana yang tampil di Display 1 / Display 2 / subtitle Chroma.
- **Import:** kalau lagu sudah ada dalam file (Word / PowerPoint / EasyWorship / teks), buat import otomatis
  yang memasangkan baris Mandarin dengan terjemahannya.

## Pertanyaan yang perlu diputuskan

1. **Pinyin perlu ditampilkan?** Atau cukup Mandarin + terjemahan?
2. **Bahasa terjemahan:** Indonesia saja, atau Indonesia **dan** Inggris (tiga bahasa)?
3. **Sumber lagu:** sudah ada file lagu Mandarin? Format apa (Word, PPT, EasyWorship, teks)?
4. **Livestream / ATEM:** perlu tampilan berbeda dari proyektor? (mis. livestream hanya terjemahan)
5. **Contoh lagu:** siapkan 1–2 lagu (lirik Mandarin + terjemahan) sebagai bahan uji.
