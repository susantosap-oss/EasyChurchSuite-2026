// Words that worship lyrics use but the Bible text (TB / KJV) lacks or rarely uses:
// modern spellings, lyric contractions and common modern vocabulary.
// Everything here counts as correct; the higher the weight, the more it is preferred as a suggestion.

const ID_WORDS = `
aku kamu engkau kau dikau dia ia kita kami mereka mu ku nya
slalu s'lalu tlah t'lah tuk 'tuk kan 'kan smua s'mua sgala s'gala sbab s'bab skarang s'karang sperti s'perti
brikan b'rikan trima t'rima trimakasih terimakasih sbelum slama s'lama slamanya s'lamanya slamat s'lamat
sluruh s'luruh smakin s'makin spenuh s'penuh sjak s'jak strus trus terus sungguh sunguh tak takkan tiada
ajaib mukjizat mujizat tahta takhta haleluya hosana amin maranatha immanuel imanuel
yesus kristus roh kudus sorga surga yerusalem sion golgota kalvari betlehem
pujian puji pujilah memuji sembah sembahlah menyembah penyembahan bersyukur syukur ucapan
kemuliaan mulia muliakan termulia anugerah anugrah kasih kasihmu kasihnya pengasih penyayang
penolong penebus penebusan juruselamat juru selamat pemulih pemulihan penghibur gembala
hadirat hadiratmu kuasa kuasamu berkuasa mahakuasa mahatinggi mahakudus kekal abadi selamanya
setia kesetiaan sempurna berharga indah terindah cinta rindu merindu kerinduan harapan berharap
damai sejahtera sukacita bahagia kebahagiaan pengampunan ampuni pulihkan sembuhkan kesembuhan
berkat berkati memberkati diberkati pertolongan perlindungan kemenangan menang pemenang
hidupku hatiku jiwaku diriku hidupmu hatimu namamu nama-mu firman firmanmu janji janjimu
salib darah darahmu kubur bangkit kebangkitan surgawi sorgawi kerajaan raja rajaku
lagu nyanyian bernyanyi menyanyi nyanyikan bersorak sorak tepuk tangan menari tarian
dunia bumi langit cakrawala laut samudra gunung lembah badai ombak api terang gelap
perlu butuh mau ingin bisa dapat boleh harus mampu sanggup percaya iman beriman
tetap selalu senantiasa sampai hingga sebab karena walau meski namun tetapi saat ketika
tes oke yah ya yuk ayo mari hai halo
baru pembaharuan perubahan berubah pulih penuh dipenuhi kepenuhan urapan mengurapi diurapi
`

const EN_WORDS = `
i'm i'll i've i'd you're you'll you've we're we'll we've they're it's that's there's what's
don't won't can't couldn't shouldn't wouldn't isn't aren't wasn't weren't ain't let's
gonna wanna gotta yeah oh ooh whoa woah hey ok okay
forever everlasting everything everyone everybody anything anyone nothing nobody something someone
amazing awesome beautiful wonderful marvelous glorious victorious powerful faithful faithfulness
savior saviour redeemer redeemed redemption salvation hallelujah alleluia hosanna amen emmanuel immanuel
jesus christ messiah lord god father spirit holy almighty majesty majestic worthy kingdom throne
worship worshipping worshiping praise praising sing singing song songs dance dancing shout shouting
cross calvary grave risen resurrection alive overcome overcomer overcame overflow breakthrough
freedom free chains broken healing healer heal restore restored restoration revival
grace mercy mercies goodness kindness love loving loved lover beloved heart hearts soul souls
endless reckless relentless unfailing unchanging unshakable unstoppable unending
ocean oceans mountain mountains valley valleys storm storms fire light darkness shine shining
hope faith trust believe believer surrender surrendered devotion presence glory
wretch sweet sound amazing blessed blessing blessings
tonight today tomorrow yesterday heaven heavens heavenly earth world nations generation
`

function parse(list: string): string[] {
  return list.split(/\s+/).map(w => w.trim().toLowerCase()).filter(Boolean)
}

export const EXTRA_WORDS: Record<'id' | 'en', string[]> = {
  id: parse(ID_WORDS),
  en: parse(EN_WORDS),
}

/** Weight of an extra word when ranking suggestions (Bible frequencies run 1 … 10 000+) */
export const EXTRA_WEIGHT = 50
