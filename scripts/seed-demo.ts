#!/usr/bin/env tsx
/**
 * seed-demo.ts
 * Creates a minimal easy_bible.db with Yohanes (John) 1–3 from TB (Terjemahan Baru)
 * so developers can test the UI without a real Yuku Bible file.
 *
 * Usage:  tsx scripts/seed-demo.ts
 */

import Database from 'better-sqlite3'
import { readFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'

const DB_PATH = resolve('./data/easy_bible.db')
const SCHEMA_PATH = resolve('./packages/db/src/schema.sql')

if (!existsSync(dirname(DB_PATH))) mkdirSync(dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('foreign_keys = ON')

const schema = readFileSync(SCHEMA_PATH, 'utf-8')
db.exec(schema)

// --- Version ---
db.prepare(`
  INSERT OR IGNORE INTO bible_versions(code, name, language, direction, is_default)
  VALUES ('TB','Terjemahan Baru','id','ltr',1)
`).run()
const versionId = (db.prepare('SELECT id FROM bible_versions WHERE code = ?').get('TB') as { id: number }).id

// --- Book: Yohanes (number=43) ---
db.prepare(`
  INSERT OR IGNORE INTO books(version_id, number, code, name, name_abbr, testament, total_chapters)
  VALUES (?,43,'JHN','Yohanes','Yoh','NT',21)
`).run(versionId)
const bookId = (db.prepare('SELECT id FROM books WHERE version_id=? AND number=43').get(versionId) as { id: number }).id

// Demo data: Yohanes 1:1-14, 3:1-21
const CHAPTERS: Record<number, Array<{ v: number; t: string }>> = {
  1: [
    { v: 1,  t: 'Pada mulanya adalah Firman; Firman itu bersama-sama dengan Allah dan Firman itu adalah Allah.' },
    { v: 2,  t: 'Ia pada mulanya bersama-sama dengan Allah.' },
    { v: 3,  t: 'Segala sesuatu dijadikan oleh Dia dan tanpa Dia tidak ada suatu pun yang telah jadi dari segala yang telah dijadikan.' },
    { v: 4,  t: 'Dalam Dia ada hidup dan hidup itu adalah terang manusia.' },
    { v: 5,  t: 'Terang itu bercahaya di dalam kegelapan dan kegelapan itu tidak menguasainya.' },
    { v: 6,  t: 'Datanglah seorang yang diutus Allah, namanya Yohanes;' },
    { v: 7,  t: 'ia datang sebagai saksi untuk memberi kesaksian tentang terang itu, supaya oleh dia semua orang menjadi percaya.' },
    { v: 8,  t: 'Ia bukan terang itu, tetapi ia harus memberi kesaksian tentang terang itu.' },
    { v: 9,  t: 'Terang yang sesungguhnya, yang menerangi setiap orang, sedang datang ke dalam dunia.' },
    { v: 10, t: 'Ia telah ada di dalam dunia dan dunia dijadikan oleh-Nya, tetapi dunia tidak mengenal-Nya.' },
    { v: 11, t: 'Ia datang kepada milik kepunyaan-Nya, tetapi orang-orang kepunyaan-Nya itu tidak menerima-Nya.' },
    { v: 12, t: 'Tetapi semua orang yang menerima-Nya diberi-Nya kuasa supaya menjadi anak-anak Allah, yaitu mereka yang percaya dalam nama-Nya;' },
    { v: 13, t: 'orang-orang yang diperanakkan bukan dari darah atau dari daging, bukan pula secara jasmani oleh keinginan seorang laki-laki, melainkan dari Allah.' },
    { v: 14, t: 'Firman itu telah menjadi manusia, dan diam di antara kita, dan kita telah melihat kemuliaan-Nya, yaitu kemuliaan yang diberikan kepada-Nya sebagai Anak Tunggal Bapa, penuh kasih karunia dan kebenaran.' },
  ],
  3: [
    { v: 1,  t: 'Adalah seorang Farisi yang bernama Nikodemus, seorang pemimpin agama Yahudi.' },
    { v: 2,  t: 'Ia datang pada waktu malam kepada Yesus dan berkata: "Rabi, kami tahu, bahwa Engkau datang sebagai guru yang diutus Allah; sebab tidak ada seorang pun yang dapat mengadakan tanda-tanda yang Engkau adakan itu, jika Allah tidak menyertainya."' },
    { v: 3,  t: 'Yesus menjawab, kata-Nya: "Aku berkata kepadamu, sesungguhnya jika seorang tidak dilahirkan kembali, ia tidak dapat melihat Kerajaan Allah."' },
    { v: 4,  t: 'Kata Nikodemus kepada-Nya: "Bagaimanakah mungkin seorang dilahirkan, kalau ia sudah tua? Dapatkah ia masuk kembali ke dalam rahim ibunya dan dilahirkan lagi?"' },
    { v: 5,  t: 'Jawab Yesus: "Aku berkata kepadamu, sesungguhnya jika seorang tidak dilahirkan dari air dan Roh, ia tidak dapat masuk ke dalam Kerajaan Allah."' },
    { v: 6,  t: 'Apa yang dilahirkan dari daging, adalah daging, dan apa yang dilahirkan dari Roh, adalah roh.' },
    { v: 7,  t: 'Janganlah engkau heran, karena Aku berkata kepadamu: Kamu harus dilahirkan kembali.' },
    { v: 8,  t: 'Angin bertiup ke mana ia mau, dan engkau mendengar bunyinya, tetapi engkau tidak tahu dari mana ia datang atau ke mana ia pergi. Demikianlah halnya dengan tiap-tiap orang yang lahir dari Roh.' },
    { v: 9,  t: 'Nikodemus menjawab, katanya: "Bagaimanakah mungkin hal itu terjadi?"' },
    { v: 10, t: 'Jawab Yesus: "Engkau adalah pengajar Israel, dan engkau tidak mengerti hal-hal itu?"' },
    { v: 11, t: '"Aku berkata kepadamu, sesungguhnya kami berkata-kata tentang apa yang kami ketahui dan kami bersaksi tentang apa yang kami lihat, tetapi kamu tidak menerima kesaksian kami."' },
    { v: 12, t: '"Kamu tidak percaya, waktu Aku berkata-kata dengan kamu tentang hal-hal duniawi; bagaimana kamu akan percaya, kalau Aku berkata-kata dengan kamu tentang hal-hal sorgawi?"' },
    { v: 13, t: '"Tidak ada seorang pun yang telah naik ke sorga, selain dari pada Dia yang telah turun dari sorga, yaitu Anak Manusia."' },
    { v: 14, t: '"Dan sama seperti Musa meninggikan ular di padang gurun, demikian juga Anak Manusia harus ditinggikan,"' },
    { v: 15, t: '"supaya setiap orang yang percaya kepada-Nya beroleh hidup yang kekal."' },
    { v: 16, t: 'Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal, supaya setiap orang yang percaya kepada-Nya tidak binasa, melainkan beroleh hidup yang kekal.' },
    { v: 17, t: 'Sebab Allah mengutus Anak-Nya ke dalam dunia bukan untuk menghakimi dunia, melainkan untuk menyelamatkannya oleh Dia.' },
    { v: 18, t: 'Barangsiapa percaya kepada-Nya, ia tidak akan dihukum; barangsiapa tidak percaya, ia telah berada di bawah hukuman, sebab ia tidak percaya dalam nama Anak Tunggal Allah.' },
    { v: 19, t: 'Dan inilah hukuman itu: Terang telah datang ke dalam dunia, tetapi manusia lebih menyukai kegelapan dari pada terang, sebab perbuatan-perbuatan mereka jahat.' },
    { v: 20, t: 'Sebab barangsiapa berbuat jahat, membenci terang dan tidak datang kepada terang itu, supaya perbuatan-perbuatannya yang jahat itu tidak nampak;' },
    { v: 21, t: 'tetapi barangsiapa melakukan yang benar, ia datang kepada terang, supaya menjadi nyata, bahwa perbuatan-perbuatannya dilakukan dalam Allah.' },
  ],
}

const insertChapter = db.prepare(`INSERT OR IGNORE INTO chapters(book_id, number) VALUES (?,?)`)
const insertVerse   = db.prepare(`INSERT OR REPLACE INTO ayat(chapter_id, verse_number, text) VALUES (?,?,?)`)
const updateCount   = db.prepare(`UPDATE chapters SET total_verses=(SELECT COUNT(*) FROM ayat WHERE chapter_id=chapters.id) WHERE id=?`)

const seed = db.transaction(() => {
  for (const [chNum, verses] of Object.entries(CHAPTERS)) {
    insertChapter.run(bookId, Number(chNum))
    const ch = db.prepare('SELECT id FROM chapters WHERE book_id=? AND number=?').get(bookId, Number(chNum)) as { id: number }
    for (const { v, t } of verses) insertVerse.run(ch.id, v, t)
    updateCount.run(ch.id)
  }
})
seed()

db.exec(`INSERT INTO ayat_fts(ayat_fts) VALUES('rebuild')`)
db.prepare(`UPDATE books SET total_chapters=(SELECT COUNT(*) FROM chapters WHERE book_id=books.id)`).run()

const count = (db.prepare('SELECT COUNT(*) AS c FROM ayat').get() as { c: number }).c
db.close()

console.log(`[demo] Seeded ${count} demo verses → ${DB_PATH}`)
console.log('[demo] Run: pnpm db:seed --source ./data/TB.db --version TB --name "Terjemahan Baru" --rebuild')
console.log('[demo] to replace with the full Yuku Bible.')
