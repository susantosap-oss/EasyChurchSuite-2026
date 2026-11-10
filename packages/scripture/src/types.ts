export type Testament = 'OT' | 'NT'
export type TextDirection = 'ltr' | 'rtl'

export interface BibleVersion {
  code: string
  name: string
  language: string
  direction: TextDirection
  isDefault: boolean
}

export interface BibleBook {
  number: number
  code: string
  name: string
  nameAbbr: string
  testament: Testament
  totalChapters: number
}

export interface ParsedVerse {
  bookNumber: number
  bookCode: string
  chapterNumber: number
  verseNumber: number
  text: string
  textRaw?: string
}

export interface YukuParseOptions {
  versionCode: string
  versionName: string
  language: string
  direction?: TextDirection
}

// Canonical Indonesian Bible book data (66 books)
export const CANONICAL_BOOKS: BibleBook[] = [
  // Old Testament
  { number: 1,  code: 'GEN', name: 'Kejadian',       nameAbbr: 'Kej',  testament: 'OT', totalChapters: 50 },
  { number: 2,  code: 'EXO', name: 'Keluaran',       nameAbbr: 'Kel',  testament: 'OT', totalChapters: 40 },
  { number: 3,  code: 'LEV', name: 'Imamat',         nameAbbr: 'Im',   testament: 'OT', totalChapters: 27 },
  { number: 4,  code: 'NUM', name: 'Bilangan',       nameAbbr: 'Bil',  testament: 'OT', totalChapters: 36 },
  { number: 5,  code: 'DEU', name: 'Ulangan',        nameAbbr: 'Ul',   testament: 'OT', totalChapters: 34 },
  { number: 6,  code: 'JOS', name: 'Yosua',          nameAbbr: 'Yos',  testament: 'OT', totalChapters: 24 },
  { number: 7,  code: 'JDG', name: 'Hakim-hakim',    nameAbbr: 'Hak',  testament: 'OT', totalChapters: 21 },
  { number: 8,  code: 'RUT', name: 'Rut',            nameAbbr: 'Rut',  testament: 'OT', totalChapters: 4  },
  { number: 9,  code: '1SA', name: '1 Samuel',       nameAbbr: '1Sam', testament: 'OT', totalChapters: 31 },
  { number: 10, code: '2SA', name: '2 Samuel',       nameAbbr: '2Sam', testament: 'OT', totalChapters: 24 },
  { number: 11, code: '1KI', name: '1 Raja-raja',    nameAbbr: '1Raj', testament: 'OT', totalChapters: 22 },
  { number: 12, code: '2KI', name: '2 Raja-raja',    nameAbbr: '2Raj', testament: 'OT', totalChapters: 25 },
  { number: 13, code: '1CH', name: '1 Tawarikh',     nameAbbr: '1Taw', testament: 'OT', totalChapters: 29 },
  { number: 14, code: '2CH', name: '2 Tawarikh',     nameAbbr: '2Taw', testament: 'OT', totalChapters: 36 },
  { number: 15, code: 'EZR', name: 'Ezra',           nameAbbr: 'Ezr',  testament: 'OT', totalChapters: 10 },
  { number: 16, code: 'NEH', name: 'Nehemia',        nameAbbr: 'Neh',  testament: 'OT', totalChapters: 13 },
  { number: 17, code: 'EST', name: 'Ester',          nameAbbr: 'Est',  testament: 'OT', totalChapters: 10 },
  { number: 18, code: 'JOB', name: 'Ayub',           nameAbbr: 'Ayb',  testament: 'OT', totalChapters: 42 },
  { number: 19, code: 'PSA', name: 'Mazmur',         nameAbbr: 'Mzm',  testament: 'OT', totalChapters: 150},
  { number: 20, code: 'PRO', name: 'Amsal',          nameAbbr: 'Ams',  testament: 'OT', totalChapters: 31 },
  { number: 21, code: 'ECC', name: 'Pengkhotbah',    nameAbbr: 'Pkh',  testament: 'OT', totalChapters: 12 },
  { number: 22, code: 'SNG', name: 'Kidung Agung',   nameAbbr: 'Kid',  testament: 'OT', totalChapters: 8  },
  { number: 23, code: 'ISA', name: 'Yesaya',         nameAbbr: 'Yes',  testament: 'OT', totalChapters: 66 },
  { number: 24, code: 'JER', name: 'Yeremia',        nameAbbr: 'Yer',  testament: 'OT', totalChapters: 52 },
  { number: 25, code: 'LAM', name: 'Ratapan',        nameAbbr: 'Rat',  testament: 'OT', totalChapters: 5  },
  { number: 26, code: 'EZK', name: 'Yehezkiel',      nameAbbr: 'Yeh',  testament: 'OT', totalChapters: 48 },
  { number: 27, code: 'DAN', name: 'Daniel',         nameAbbr: 'Dan',  testament: 'OT', totalChapters: 12 },
  { number: 28, code: 'HOS', name: 'Hosea',          nameAbbr: 'Hos',  testament: 'OT', totalChapters: 14 },
  { number: 29, code: 'JOL', name: 'Yoel',           nameAbbr: 'Yoel', testament: 'OT', totalChapters: 3  },
  { number: 30, code: 'AMO', name: 'Amos',           nameAbbr: 'Am',   testament: 'OT', totalChapters: 9  },
  { number: 31, code: 'OBA', name: 'Obaja',          nameAbbr: 'Ob',   testament: 'OT', totalChapters: 1  },
  { number: 32, code: 'JON', name: 'Yunus',          nameAbbr: 'Yun',  testament: 'OT', totalChapters: 4  },
  { number: 33, code: 'MIC', name: 'Mikha',          nameAbbr: 'Mi',   testament: 'OT', totalChapters: 7  },
  { number: 34, code: 'NAH', name: 'Nahum',          nameAbbr: 'Nah',  testament: 'OT', totalChapters: 3  },
  { number: 35, code: 'HAB', name: 'Habakuk',        nameAbbr: 'Hab',  testament: 'OT', totalChapters: 3  },
  { number: 36, code: 'ZEP', name: 'Zefanya',        nameAbbr: 'Zef',  testament: 'OT', totalChapters: 3  },
  { number: 37, code: 'HAG', name: 'Hagai',          nameAbbr: 'Hag',  testament: 'OT', totalChapters: 2  },
  { number: 38, code: 'ZEC', name: 'Zakharia',       nameAbbr: 'Za',   testament: 'OT', totalChapters: 14 },
  { number: 39, code: 'MAL', name: 'Maleakhi',       nameAbbr: 'Mal',  testament: 'OT', totalChapters: 4  },
  // New Testament
  { number: 40, code: 'MAT', name: 'Matius',         nameAbbr: 'Mat',  testament: 'NT', totalChapters: 28 },
  { number: 41, code: 'MRK', name: 'Markus',         nameAbbr: 'Mrk',  testament: 'NT', totalChapters: 16 },
  { number: 42, code: 'LUK', name: 'Lukas',          nameAbbr: 'Luk',  testament: 'NT', totalChapters: 24 },
  { number: 43, code: 'JHN', name: 'Yohanes',        nameAbbr: 'Yoh',  testament: 'NT', totalChapters: 21 },
  { number: 44, code: 'ACT', name: 'Kisah Para Rasul',nameAbbr: 'Kis',  testament: 'NT', totalChapters: 28 },
  { number: 45, code: 'ROM', name: 'Roma',            nameAbbr: 'Rom',  testament: 'NT', totalChapters: 16 },
  { number: 46, code: '1CO', name: '1 Korintus',      nameAbbr: '1Kor', testament: 'NT', totalChapters: 16 },
  { number: 47, code: '2CO', name: '2 Korintus',      nameAbbr: '2Kor', testament: 'NT', totalChapters: 13 },
  { number: 48, code: 'GAL', name: 'Galatia',         nameAbbr: 'Gal',  testament: 'NT', totalChapters: 6  },
  { number: 49, code: 'EPH', name: 'Efesus',          nameAbbr: 'Ef',   testament: 'NT', totalChapters: 6  },
  { number: 50, code: 'PHP', name: 'Filipi',          nameAbbr: 'Flp',  testament: 'NT', totalChapters: 4  },
  { number: 51, code: 'COL', name: 'Kolose',          nameAbbr: 'Kol',  testament: 'NT', totalChapters: 4  },
  { number: 52, code: '1TH', name: '1 Tesalonika',    nameAbbr: '1Tes', testament: 'NT', totalChapters: 5  },
  { number: 53, code: '2TH', name: '2 Tesalonika',    nameAbbr: '2Tes', testament: 'NT', totalChapters: 3  },
  { number: 54, code: '1TI', name: '1 Timotius',      nameAbbr: '1Tim', testament: 'NT', totalChapters: 6  },
  { number: 55, code: '2TI', name: '2 Timotius',      nameAbbr: '2Tim', testament: 'NT', totalChapters: 4  },
  { number: 56, code: 'TIT', name: 'Titus',           nameAbbr: 'Tit',  testament: 'NT', totalChapters: 3  },
  { number: 57, code: 'PHM', name: 'Filemon',         nameAbbr: 'Flm',  testament: 'NT', totalChapters: 1  },
  { number: 58, code: 'HEB', name: 'Ibrani',          nameAbbr: 'Ibr',  testament: 'NT', totalChapters: 13 },
  { number: 59, code: 'JAS', name: 'Yakobus',         nameAbbr: 'Yak',  testament: 'NT', totalChapters: 5  },
  { number: 60, code: '1PE', name: '1 Petrus',        nameAbbr: '1Pet', testament: 'NT', totalChapters: 5  },
  { number: 61, code: '2PE', name: '2 Petrus',        nameAbbr: '2Pet', testament: 'NT', totalChapters: 3  },
  { number: 62, code: '1JN', name: '1 Yohanes',       nameAbbr: '1Yoh', testament: 'NT', totalChapters: 5  },
  { number: 63, code: '2JN', name: '2 Yohanes',       nameAbbr: '2Yoh', testament: 'NT', totalChapters: 1  },
  { number: 64, code: '3JN', name: '3 Yohanes',       nameAbbr: '3Yoh', testament: 'NT', totalChapters: 1  },
  { number: 65, code: 'JUD', name: 'Yudas',           nameAbbr: 'Yud',  testament: 'NT', totalChapters: 1  },
  { number: 66, code: 'REV', name: 'Wahyu',           nameAbbr: 'Why',  testament: 'NT', totalChapters: 22 },
]
