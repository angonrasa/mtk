/* Math Battle — mesin permainan (bundel). Digabung otomatis dari generator.js + game.js + peringkat.js,
   import/export dibuang supaya bisa dibuka langsung dari berkas (file://) tanpa server. Logika tidak diubah. */
(function (W) {
'use strict';
// apps/mathbattle/server/generator.js — generator soal (fungsi murni, rng bisa disuntik untuk tes).
// v2: kategori add, subtract, multiply, divide, percent, missing, mixed + square, root, power, fraction, pattern, gcd, lcm, average, geometry, remainder, paren.
// Kesulitan naik lewat JENIS soal per level, bukan lewat angka besar: operand kecil (umumnya <= 20, faktor <= 12).
// Jawaban selalu bilangan bulat 1..9999 (praktisnya kecil) agar cepat diketik. Soal "missing" memuat '?' (jawabannya nilai '?').

const int = (rng, min, maks) => min + Math.floor(rng() * (maks - min + 1));
const pilih = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const kelipatan = (rng, dari, sampai, k) => k * int(rng, Math.ceil(dari / k), Math.floor(sampai / k));

// ---------- pembangun per jenis soal (target: fondasi numerasi kelas 5 SD) ----------
// Format teks: "keterangan|ekspresi" (keterangan di atas, ekspresi besar) atau hanya ekspresi.
// Catatan: pembangun juga dipanggil dengan rng tetap (0.5) hanya untuk membaca kategori, jadi tanpa loop yang bergantung rng.
const add = (lo, hi) => (r) => { const a = int(r, lo, hi), b = int(r, lo, hi); return { kategori: 'add', teks: `${a} + ${b}`, jawab: a + b }; };
const sub = (aLo, aHi, bLo) => (r) => { const a = int(r, aLo, aHi), b = int(r, bLo, a - 1); return { kategori: 'subtract', teks: `${a} - ${b}`, jawab: a - b }; };
const mul = (aLo, aHi, bLo, bHi) => (r) => { const a = int(r, aLo, aHi), b = int(r, bLo, bHi); return { kategori: 'multiply', teks: `${a} × ${b}`, jawab: a * b }; };
const div = (bLo, bHi, qLo, qHi) => (r) => { const b = int(r, bLo, bHi), q = int(r, qLo, qHi); return { kategori: 'divide', teks: `${b * q} ÷ ${b}`, jawab: q }; };

const missKali = (aLo, aHi, xLo, xHi) => (r) => { const a = int(r, aLo, aHi), x = int(r, xLo, xHi); return { kategori: 'missing', teks: `${a} × ? = ${a * x}`, jawab: x }; };
const missTambah = (lo, hi) => (r) => { const a = int(r, lo, hi), x = int(r, lo, hi); return { kategori: 'missing', teks: r() < 0.5 ? `${a} + ? = ${a + x}` : `? + ${a} = ${a + x}`, jawab: x }; };
const missKurang = (lo, hi) => (r) => { const x = int(r, lo, hi), b = int(r, lo, hi); return { kategori: 'missing', teks: `? - ${b} = ${x}`, jawab: x + b }; };
const missBagi = (bLo, bHi, qLo, qHi) => (r) => { const b = int(r, bLo, bHi), q = int(r, qLo, qHi); return { kategori: 'missing', teks: `? ÷ ${b} = ${q}`, jawab: b * q }; };

// operasi campuran (urutan operasi: kurung, lalu × ÷, lalu + -)
const mixTambahKali = (aLo, aHi, bLo, bHi, cLo, cHi) => (r) => { const a = int(r, aLo, aHi), b = int(r, bLo, bHi), c = int(r, cLo, cHi); return { kategori: 'mixed', teks: `${a} + ${b} × ${c}`, jawab: a + b * c }; };
const mixKurangKali = (bLo, bHi, cLo, cHi, sisaMaks) => (r) => { const b = int(r, bLo, bHi), c = int(r, cLo, cHi), s = int(r, 1, sisaMaks); return { kategori: 'mixed', teks: `${b * c + s} - ${b} × ${c}`, jawab: s }; };
const mixBagiTambah = (bLo, bHi, qLo, qHi, cLo, cHi) => (r) => { const b = int(r, bLo, bHi), q = int(r, qLo, qHi), c = int(r, cLo, cHi); return { kategori: 'mixed', teks: `${b * q} ÷ ${b} + ${c}`, jawab: q + c }; };
const parTambah = (aLo, aHi, cLo, cHi) => (r) => { const a = int(r, aLo, aHi), b = int(r, aLo, aHi), c = int(r, cLo, cHi); return { kategori: 'paren', teks: `(${a} + ${b}) × ${c}`, jawab: (a + b) * c }; };
const parKurang = (aLo, aHi, cLo, cHi) => (r) => { const a = int(r, aLo, aHi), b = int(r, 1, a - 1), c = int(r, cLo, cHi); return { kategori: 'paren', teks: `(${a} - ${b}) × ${c}`, jawab: (a - b) * c }; };

// ----- pecahan, desimal, persen -----
const PEC = [[1, 2], [1, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [2, 3], [1, 10], [3, 10], [7, 10]];
const pecDari = (lo, hi) => (r) => { const [n, d] = pilih(r, PEC), b = kelipatan(r, lo, hi, d); return { kategori: 'pecahan', teks: `${n}/${d} dari ${b}`, jawab: (b / d) * n }; };
const pecSenilai = () => (r) => { const [n, d] = pilih(r, [[1, 2], [2, 3], [3, 4], [2, 5], [1, 4], [3, 5], [1, 3]]), k = int(r, 2, 6); return { kategori: 'pecahan', teks: `Pecahan senilai|${n}/${d} = ?/${d * k}`, jawab: n * k }; };
const pecTambah = () => (r) => {
  const [d1, d2] = pilih(r, [[2, 4], [2, 6], [2, 8], [3, 6], [4, 8], [5, 10], [2, 10], [4, 12]]), k = d2 / d1, a = int(r, 1, d1 - 1);
  if (r() < 0.5) { const b = int(r, 1, d2 - 1); return { kategori: 'pecahan', teks: `${a}/${d1} + ${b}/${d2} = ?/${d2}`, jawab: a * k + b }; }
  const b = int(r, 1, a * k - 1); return { kategori: 'pecahan', teks: `${a}/${d1} - ${b}/${d2} = ?/${d2}`, jawab: a * k - b };
};
const pecPersen = () => (r) => { const [n, d] = pilih(r, [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [7, 10], [9, 20], [3, 20], [7, 25], [13, 20], [17, 20]]); return { kategori: 'persen', teks: `${n}/${d} = ?%`, jawab: (n * 100) / d }; };
const desPersen = () => (r) => { const x = int(r, 1, 99); return { kategori: 'desimal', teks: `0,${x < 10 ? '0' + x : x} = ?%`, jawab: x }; };
const desKali = (lo, hi) => (r) => { const [lb, n, d] = pilih(r, [['0,5', 1, 2], ['0,25', 1, 4], ['0,75', 3, 4], ['1,5', 3, 2], ['2,5', 5, 2], ['0,2', 1, 5], ['0,1', 1, 10]]), b = kelipatan(r, lo, hi, d); return { kategori: 'desimal', teks: `${lb} × ${b}`, jawab: (b / d) * n }; };
const persenDari = (daftar, lo, hi) => (r) => { const p = pilih(r, daftar), b = kelipatan(r, lo, hi, 20); return { kategori: 'persen', teks: `${p}% dari ${b}`, jawab: (p * b) / 100 }; };
const persenPecahan = () => (r) => { const p = pilih(r, [50, 25, 20, 10]); return { kategori: 'persen', teks: `${p}% = 1/?`, jawab: 100 / p }; };

// ----- satuan: panjang, berat, volume, waktu -----
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}.${String(m % 60).padStart(2, '0')}`;
// [kategori, satuan besar, satuan kecil, faktor, n min, n maks]
const KONV = [
  ['panjang', 'km', 'm', 1000, 2, 9], ['panjang', 'm', 'cm', 100, 2, 50], ['panjang', 'cm', 'mm', 10, 3, 90],
  ['berat', 'kg', 'g', 1000, 2, 9], ['berat', 'ton', 'kg', 1000, 2, 9], ['berat', 'kg', 'ons', 10, 2, 60],
  ['volume', 'L', 'mL', 1000, 2, 9], ['waktu', 'jam', 'menit', 60, 2, 12], ['waktu', 'menit', 'detik', 60, 2, 30], ['waktu', 'hari', 'jam', 24, 2, 9],
];
const konv = () => (r) => {
  const t = pilih(r, KONV), n = int(r, t[4], t[5]);
  return r() < 0.5 ? { kategori: t[0], teks: `${n} ${t[1]} = ? ${t[2]}`, jawab: n * t[3] } : { kategori: t[0], teks: `${n * t[3]} ${t[2]} = ? ${t[1]}`, jawab: n };
};
// "2 m 50 cm = ? cm": [kategori, besar, kecil, faktor, langkah b, b min, b maks]
const KONV2 = [['panjang', 'm', 'cm', 100, 5, 5, 95], ['panjang', 'km', 'm', 1000, 50, 100, 900], ['berat', 'kg', 'g', 1000, 50, 100, 900], ['volume', 'L', 'mL', 1000, 50, 100, 900], ['waktu', 'jam', 'menit', 60, 5, 5, 55]];
const konvCampur = () => (r) => { const t = pilih(r, KONV2), a = int(r, 1, 9), b = kelipatan(r, t[5], t[6], t[4]); return { kategori: t[0], teks: `${a} ${t[1]} ${b} ${t[2]} = ? ${t[2]}`, jawab: a * t[3] + b }; };
// "3/4 jam = ? menit": [n, d, besar, kecil, faktor, kategori]
const KONV3 = [[1, 2, 'kg', 'g', 1000, 'berat'], [1, 4, 'kg', 'g', 1000, 'berat'], [3, 4, 'kg', 'g', 1000, 'berat'], [1, 2, 'L', 'mL', 1000, 'volume'], [1, 4, 'L', 'mL', 1000, 'volume'], [1, 2, 'jam', 'menit', 60, 'waktu'], [1, 4, 'jam', 'menit', 60, 'waktu'], [3, 4, 'jam', 'menit', 60, 'waktu'], [1, 2, 'm', 'cm', 100, 'panjang'], [1, 4, 'm', 'cm', 100, 'panjang'], [1, 5, 'km', 'm', 1000, 'panjang']];
const konvPecah = () => (r) => { const [n, d, b, k, f, kat] = pilih(r, KONV3); return { kategori: kat, teks: `${n}/${d} ${b} = ? ${k}`, jawab: (f / d) * n }; };
const waktuSelisih = () => (r) => { const mulai = 60 * int(r, 6, 20) + 15 * int(r, 0, 3), d = kelipatan(r, 20, 150, 5); return { kategori: 'waktu', teks: `Dari ${hhmm(mulai)} sampai ${hhmm(mulai + d)}|? menit`, jawab: d }; };

// ----- belanja & diskon (Rp) -----
const rp = (n) => 'Rp' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const BARANG = ['buku', 'pensil', 'penggaris', 'permen', 'roti', 'pulpen'];
const kembalian = () => (r) => { const h = kelipatan(r, 1500, 48500, 500), b = pilih(r, [5000, 10000, 20000, 50000, 100000].filter((x) => x > h)); return { kategori: 'belanja', teks: `Belanja ${rp(h)}, bayar ${rp(b)}|Kembalian Rp?`, jawab: b - h }; };
const totalBarang = () => (r) => { const n = int(r, 2, 8), h = kelipatan(r, 1500, 9500, 500), o = pilih(r, BARANG); return { kategori: 'belanja', teks: `${n} ${o} @ ${rp(h)}|Total Rp?`, jawab: n * h }; };
const totalTiga = () => (r) => { const a = kelipatan(r, 1000, 15000, 500), b = kelipatan(r, 1000, 15000, 500), c = kelipatan(r, 1000, 15000, 500); return { kategori: 'belanja', teks: `Belanja ${rp(a)}, ${rp(b)}, dan ${rp(c)}|Total Rp?`, jawab: a + b + c }; };
const hargaSatuan = () => (r) => { const n = int(r, 2, 8), u = kelipatan(r, 1500, 9500, 500), o = pilih(r, BARANG); return { kategori: 'belanja', teks: `${n} ${o} harganya ${rp(n * u)}|Harga 1 ${o} Rp?`, jawab: u }; };
const PERSEN_DISKON = [10, 20, 25, 50, 5, 15, 30, 40];
const diskonPotong = () => (r) => { const p = pilih(r, PERSEN_DISKON), h = kelipatan(r, 10000, 100000, 5000); return { kategori: 'diskon', teks: `Harga ${rp(h)}, diskon ${p}%|Potongan Rp?`, jawab: (h * p) / 100 }; };
const diskonAkhir = () => (r) => { const p = pilih(r, PERSEN_DISKON), h = kelipatan(r, 10000, 100000, 5000); return { kategori: 'diskon', teks: `Harga ${rp(h)}, diskon ${p}%|Bayar Rp?`, jawab: h - (h * p) / 100 }; };

// ----- soal cerita sehari-hari -----
const NAMA = ['Budi', 'Sari', 'Dimas', 'Rina', 'Andi', 'Lina', 'Raka', 'Nisa'];
const BENDA = ['apel', 'jeruk', 'kelereng', 'permen', 'kue', 'stiker'];
const cer = (fn) => (r) => { const [t, j] = fn(r, pilih(r, NAMA), pilih(r, BENDA)); return { kategori: 'cerita', teks: `${t}|Jawab: ?`, jawab: j }; };
const CERITA = [
  cer((r, n, o) => { const a = int(r, 25, 99), b = int(r, 15, 80); return [`${n} punya ${a} ${o}. Lalu diberi ${b} ${o} lagi. Berapa ${o} ${n} sekarang?`, a + b]; }),
  cer((r, n, o) => { const a = int(r, 40, 99), b = int(r, 10, a - 5); return [`${n} punya ${a} ${o}. Sebanyak ${b} ${o} diberikan kepada adik. Berapa sisanya?`, a - b]; }),
  cer((r, n, o) => { const a = int(r, 6, 24), b = int(r, 3, 12); return [`Satu kotak berisi ${a} ${o}. Ada ${b} kotak. Berapa jumlah ${o} seluruhnya?`, a * b]; }),
  cer((r, n, o) => { const b = int(r, 3, 9), q = int(r, 4, 15); return [`${b * q} ${o} dibagi sama banyak kepada ${b} anak. Berapa ${o} yang diterima tiap anak?`, q]; }),
  cer((r, n) => { const n1 = int(r, 2, 5), h1 = kelipatan(r, 1500, 5000, 500), n2 = int(r, 2, 4), h2 = kelipatan(r, 1500, 8000, 500); return [`${n} membeli ${n1} pensil @${rp(h1)} dan ${n2} buku @${rp(h2)}. Berapa total yang harus dibayar? (Rp)`, n1 * h1 + n2 * h2]; }),
  cer((r, n) => { const h = kelipatan(r, 3000, 15000, 500), m = kelipatan(r, 2000, 10000, 500), b = h + m < 20000 ? 20000 : 50000; return [`${n} membeli jajan ${rp(h)} dan minuman ${rp(m)}. Ia membayar ${rp(b)}. Berapa kembaliannya? (Rp)`, b - h - m]; }),
  cer((r) => { const p = pilih(r, [10, 20, 25, 50]), h = kelipatan(r, 20000, 200000, 10000); return [`Sepatu seharga ${rp(h)} didiskon ${p}%. Berapa harga yang harus dibayar? (Rp)`, h - (h * p) / 100]; }),
  cer((r) => { const m = int(r, 1, 9), c = pilih(r, [10, 20, 25, 50]); return [`Pita sepanjang ${m} m dipotong menjadi potongan ${c} cm. Berapa banyak potongan?`, (m * 100) / c]; }),
  cer((r, n) => { const a = int(r, 1, 5), c = pilih(r, [100, 200, 250, 500]); return [`${n} membeli ${a} kg gula, lalu dibagi ke dalam bungkus ${c} gram. Berapa bungkus?`, (a * 1000) / c]; }),
  cer((r) => { const a = int(r, 1, 3), b = kelipatan(r, 100, a * 1000 - 100, 50); return [`Sebuah botol berisi ${a} L air. Sebanyak ${b} mL diminum. Berapa mL air yang tersisa?`, a * 1000 - b]; }),
  cer((r) => { const mulai = 60 * int(r, 6, 20) + 15 * int(r, 0, 3), d = kelipatan(r, 30, 150, 5); return [`Les mulai pukul ${hhmm(mulai)} dan selesai pukul ${hhmm(mulai + d)}. Berapa menit lamanya les?`, d]; }),
  cer((r) => { const [n, d] = pilih(r, [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 8], [3, 10]]), t = kelipatan(r, 24, 120, d); return [`Dari ${t} kelereng, ${n}/${d} bagian berwarna merah. Berapa kelereng yang berwarna merah?`, (t / d) * n]; }),
  cer((r) => { const t = kelipatan(r, 20, 40, 20), p = pilih(r, [10, 25, 50, 75]); return [`Di kelas ada ${t} siswa. Sebanyak ${p}% siswa suka matematika. Berapa siswa yang suka matematika?`, (t * p) / 100]; }),
  cer((r) => { const p = int(r, 6, 20), l = int(r, 4, 12); return [`Kebun berbentuk persegi panjang dengan panjang ${p} m dan lebar ${l} m. Berapa luas kebun itu dalam m²?`, p * l]; }),
  cer((r) => { const p = int(r, 6, 20), l = int(r, 4, 12); return [`Sebuah lapangan berukuran ${p} m × ${l} m dikelilingi pagar. Berapa meter panjang pagar seluruhnya?`, 2 * (p + l)]; }),
  cer((r) => { const p = int(r, 3, 10), l = int(r, 2, 8), t = int(r, 2, 8); return [`Sebuah akuarium berbentuk balok berukuran ${p} dm × ${l} dm × ${t} dm. Berapa liter air yang dapat ditampung?`, p * l * t]; }),
  cer((r, n) => { const a = kelipatan(r, 20000, 60000, 1000), b = kelipatan(r, 5000, 30000, 500); return [`Ibu membawa ${rp(100000)}. Ibu membeli beras ${rp(a)} dan minyak ${rp(b)}. Berapa sisa uang Ibu? (Rp)`, 100000 - a - b]; }),
];

// ----- FPB, KPK, faktor -----
const FPB = (a, b) => (b ? FPB(b, a % b) : a);
const KPK = (a, b) => (a * b) / FPB(a, b);
const banyakFaktor = (n) => { let c = 0; for (let i = 1; i <= n; i++) if (n % i === 0) c++; return c; };
const fpb = () => (r) => { const [m, n] = pilih(r, [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [3, 7], [5, 6], [2, 7]]), g = int(r, 2, 12); return { kategori: 'fpb', teks: `Cari FPB dari|${g * m} dan ${g * n}`, jawab: g }; };
const kpk = () => (r) => { const [a, b] = pilih(r, [[4, 6], [6, 8], [3, 5], [4, 10], [6, 9], [8, 12], [5, 6], [4, 5], [6, 10], [9, 12], [3, 7], [5, 10], [8, 10], [12, 15], [10, 15], [6, 15], [12, 18], [15, 20]]); return { kategori: 'kpk', teks: `Cari KPK dari|${a} dan ${b}`, jawab: KPK(a, b) }; };
const kpk3 = () => (r) => { const [a, b, c] = pilih(r, [[2, 3, 4], [2, 3, 5], [3, 4, 6], [2, 4, 6], [2, 5, 10], [3, 5, 6], [4, 6, 8], [2, 3, 6], [3, 6, 9], [4, 5, 10]]); return { kategori: 'kpk', teks: `Cari KPK dari|${a}, ${b}, dan ${c}`, jawab: KPK(KPK(a, b), c) }; };
const faktor = () => (r) => { const n = pilih(r, [6, 8, 10, 12, 14, 15, 16, 18, 20, 24, 28, 30, 36, 40, 48]); return { kategori: 'faktor', teks: `Banyak faktor dari|${n} = ?`, jawab: banyakFaktor(n) }; };

// ----- bangun datar -----
const luasPP = (lo, hi) => (r) => { const a = int(r, lo, hi), b = int(r, lo, hi); return { kategori: 'luas', teks: `Luas persegi panjang|p=${a}, l=${b} → ?`, jawab: a * b }; };
const kelPP = (lo, hi) => (r) => { const a = int(r, lo, hi), b = int(r, lo, hi); return { kategori: 'keliling', teks: `Keliling persegi panjang|p=${a}, l=${b} → ?`, jawab: 2 * (a + b) }; };
const luasPersegi = (lo, hi) => (r) => { const a = int(r, lo, hi); return { kategori: 'luas', teks: `Luas persegi|sisi=${a} → ?`, jawab: a * a }; };
const kelPersegi = (lo, hi) => (r) => { const a = int(r, lo, hi); return { kategori: 'keliling', teks: `Keliling persegi|sisi=${a} → ?`, jawab: 4 * a }; };
const luasSegitiga = () => (r) => { const a = 2 * int(r, 3, 10), t = int(r, 3, 15); return { kategori: 'luas', teks: `Luas segitiga|alas=${a}, t=${t} → ?`, jawab: (a * t) / 2 }; };
const luasJajar = () => (r) => { const a = int(r, 4, 15), t = int(r, 3, 12); return { kategori: 'luas', teks: `Luas jajargenjang|alas=${a}, t=${t} → ?`, jawab: a * t }; };
const luasTrap = () => (r) => { const a = int(r, 4, 14), b = int(r, 4, 14), t = 2 * int(r, 2, 7); return { kategori: 'luas', teks: `Luas trapesium|sejajar ${a} & ${b}, t=${t} → ?`, jawab: ((a + b) * t) / 2 }; };
const luasBelah = () => (r) => { const a = 2 * int(r, 3, 9), b = int(r, 4, 14); return { kategori: 'luas', teks: `Luas belah ketupat|d1=${a}, d2=${b} → ?`, jawab: (a * b) / 2 }; };
const sisiDariLuas = () => (r) => { const a = int(r, 3, 15); return { kategori: 'luas', teks: `Luas persegi = ${a * a}|sisi = ?`, jawab: a }; };
const lebarDariLuas = () => (r) => { const p = int(r, 4, 20), l = int(r, 3, 12); return { kategori: 'luas', teks: `Luas persegi panjang = ${p * l}, p=${p}|l = ?`, jawab: l }; };

// ----- bangun ruang (kubus dan balok) -----
const volKubus = () => (r) => { const s = int(r, 2, 10); return { kategori: 'volume', teks: `Volume kubus|sisi=${s} → ?`, jawab: s ** 3 }; };
const volBalok = () => (r) => { const p = int(r, 3, 12), l = int(r, 2, 8), t = int(r, 2, 8); return { kategori: 'volume', teks: `Volume balok|${p} × ${l} × ${t} → ?`, jawab: p * l * t }; };
const sisiKubus = () => (r) => { const s = int(r, 2, 6); return { kategori: 'volume', teks: `Volume kubus = ${s ** 3}|sisi = ?`, jawab: s }; };
const tinggiBalok = () => (r) => { const p = int(r, 3, 10), l = int(r, 2, 8), t = int(r, 2, 8); return { kategori: 'volume', teks: `Volume balok = ${p * l * t}, p=${p}, l=${l}|t = ?`, jawab: t }; };

const PERSEN_B = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75];

// Level: 1 Hitung Dasar, 2 Hitung Campuran, 3 FPB & KPK, 4 Pecahan, Desimal & Persen, 5 Satuan & Pengukuran, 6 Bangun Datar, 7 Bangun Ruang, 8 Belanja & Diskon, 9 Soal Cerita
const BUAT = {
  1: [add(10, 90), sub(20, 99, 5), mul(2, 9, 2, 9), div(2, 9, 2, 9), missTambah(5, 50), missKali(2, 9, 2, 9)],
  2: [
    add(100, 900), sub(200, 999, 50), mul(12, 60, 3, 9), div(3, 9, 12, 99), mixTambahKali(5, 50, 2, 9, 2, 9), mixKurangKali(3, 9, 3, 9, 20),
    mixBagiTambah(3, 9, 3, 12, 5, 40), parTambah(2, 20, 2, 9), parKurang(10, 40, 2, 9), missKurang(10, 200), missBagi(3, 9, 12, 60),
  ],
  3: [fpb(), fpb(), kpk(), kpk(), kpk3(), faktor()],
  4: [pecDari(12, 120), pecDari(12, 120), pecSenilai(), pecTambah(), pecTambah(), pecPersen(), desPersen(), desKali(8, 120), persenDari(PERSEN_B, 20, 400), persenPecahan()],
  5: [konv(), konv(), konv(), konvCampur(), konvCampur(), konvPecah(), konvPecah(), waktuSelisih()],
  6: [luasPP(3, 20), kelPP(3, 20), luasPersegi(3, 15), kelPersegi(3, 25), luasSegitiga(), luasJajar(), luasTrap(), luasBelah(), sisiDariLuas(), lebarDariLuas()],
  7: [volKubus(), volBalok(), volKubus(), volBalok(), sisiKubus(), tinggiBalok()],
  8: [kembalian(), kembalian(), totalBarang(), totalTiga(), hargaSatuan(), diskonPotong(), diskonAkhir(), diskonAkhir()],
  9: CERITA,
};

const LEVEL_MAKS = Object.keys(BUAT).length;
const KATEGORI = ['add', 'subtract', 'multiply', 'divide', 'missing', 'mixed', 'paren', 'fpb', 'kpk', 'faktor', 'pecahan', 'desimal', 'persen', 'panjang', 'berat', 'volume', 'waktu', 'luas', 'keliling', 'belanja', 'diskon', 'cerita'];

// Daftar kategori yang muncul di tiap level (untuk tes dan tampilan).
function kategoriLevel(level) {
  const lv = Math.min(LEVEL_MAKS, Math.max(1, Math.floor(level) || 1));
  return [...new Set(BUAT[lv].map((f) => f(() => 0.5).kategori))];
}

const sah = (s) => Number.isInteger(s.jawab) && s.jawab >= 1 && s.jawab <= 999999; // ANGKA menerima sampai 6 digit (uang Rp)

/**
 * @param {{level?: number, rng?: () => number, recent?: string[], bobot?: Record<string, number>}} [opsi]
 *   bobot: pengali peluang per kategori (bawaan 1; 0 = matikan kategori itu bila level punya kategori lain).
 * @returns {{teks: string, jawab: number, level: number, kategori: string, digit: number}}
 */
function buatSoal({ level = 1, rng = Math.random, recent = [], bobot = {} } = {}) {
  const lv = Math.min(LEVEL_MAKS, Math.max(1, Math.floor(level) || 1));
  const daftar = BUAT[lv];
  // bobot per pembangun: bobot kategori; semua 0 -> abaikan bobot supaya soal tetap terbit
  let berat = daftar.map((f) => {
    const w = Number(bobot[f(() => 0.5).kategori]);
    return Number.isFinite(w) && w >= 0 ? w : 1;
  });
  if (!berat.some((w) => w > 0)) berat = daftar.map(() => 1);
  const total = berat.reduce((a, b) => a + b, 0);
  const ambil = () => {
    let x = rng() * total;
    for (let i = 0; i < daftar.length; i++) { x -= berat[i]; if (x < 0 && berat[i] > 0) return daftar[i]; }
    return daftar[daftar.length - 1];
  };

  let soal = null;
  for (let i = 0; i < 40; i++) {
    const kandidat = ambil()(rng);
    if (!sah(kandidat)) continue;
    soal = kandidat;
    if (!recent.includes(soal.teks)) break; // tidak mengulang soal yang baru keluar
  }
  if (!soal) soal = add(3, 25)(rng); // pengaman; tidak seharusnya terjadi
  return { ...soal, level: lv, digit: String(soal.jawab).length };
}
// apps/mathbattle/server/game.js — mesin permainan Math Battle (M1: mode Classic).
// Murni: waktu dan rng disuntik, tidak ada timer di sini (plugin memanggil tick()).
// Timer sesi LIVE: start({ sesiMs }) -> hitung mundur; follow/share/gift menambah waktu; habis -> berhenti di ujung ronde.
//
// Alur: idle -> ready -> question -> reveal -> ready (ronde berikut) ... sampai host menghentikan.
// Satu jawaban per penonton per soal: jawaban angka pertama yang dihitung (benar/salah).
// Komentar yang bukan angka diabaikan dan tidak memakai kesempatan.


const BAWAAN = Object.freeze({
  levelAwal: 1,      // level terendah rentang bila host tidak memilih
  rondePerLevel: 5, // satu babak = N ronde; tiap babak level naik satu, dari level terendah ke tertinggi rentang, lalu BERPUTAR kembali ke terendah (host bisa mengunci level: setLevel)
  bobot: {}, // pengali peluang per kategori, mis. { percent: 2, mixed: 0.5 } (bawaan 1 semua)
  siapMs: 2000,
  revealMs: 3000,
  // Mode santai (anak SD): tanpa timer soal. Soal terbuka sampai dijawab (atau dilewati); poin = dasar x combo, tanpa bonus kecepatan.
  tanpaWaktu: false,
  durasiMs: { 1: 12000, 2: 15000, 3: 20000, 4: 20000, 5: 20000, 6: 20000, 7: 20000, 8: 20000, 9: 20000 },
  poinDasar: { 1: 100, 2: 150, 3: 200, 4: 250, 5: 300, 6: 350, 7: 400, 8: 450, 9: 500 }, // benar = dasar + bonus kecepatan (0..dasar), lalu x combo
  comboMaks: 5, // pengali combo maksimum (benar beruntun: x1, x2, ... x comboMaks)
  // M3 (aturan awal sesuai blueprint; angka bisa disetel)
  likeTarget: 200,     // like terkumpul sebanyak ini -> bonus waktu bersama
  likeBonusMs: 3000,
  followBonusMs: 3000, // sekali per penonton per sesi
  superRondeMult: 2,     // ronde terakhir tiap babak (mis. 5/5) = Super Round: poin x2
  tantanganTarget: 8,    // ronde ke-3 tiap babak: tantangan bersama, N jawaban benar...
  tantanganBonusMs: 10000, // ...= bonus waktu untuk soal berikutnya
  shareBonusMs: 5000,  // share: sekali per penonton per sesi
  sapaMs: 5000,        // lama ucapan terima kasih follow/share ada di snapshot
  superMs: 20000,      // gift -> Super Points selama ini
  superMult: 3,
  // Target bersama (Gift = total diamond, Follow = penonton unik, Tap = total like): tiap target tercapai -> Super Points, lalu lanjut dari sisa.
  giftTarget: 500,
  followTarget: 50,
  tapTarget: 2000,
  // Anti-curang (blueprint §16). Penonton melihat soal setelah jeda siaran; jawaban yang tiba sebelum jeda + waktu baca minimal mustahil jujur.
  latensiMs: 3500,   // perkiraan jeda siaran LIVE -> layar penonton, sengaja di bawah batas bawah yang teramati (4-6 dtk); host bisa menyetel
  bacaMs: 1000,      // waktu manusia minimal sejak soal terlihat sampai komentar terkirim
  diniToleransi: 2,  // jawaban dini ke-1..N dalam sesi hanya dapat poin dasar; ke-N+1 dst. nol poin
  likeMaksMenit: 300, // like per penonton per menit yang dihitung ke target/bonus waktu; selebihnya diabaikan (anti auto-clicker)
  maksGifter: 20, // daftar top gift yang dikirim ke tampilan (urut terbanyak dulu); tampilan menampilkan sebagian dan menggesernya otomatis
  maksFeed: 8,
  maksTop: 10,
  maksPemenang: 5,
  riwayatSoal: 20,
  // Babak = tiap rondePerLevel ronde; di ujung babak 3 teratas babak itu diumumkan (overlay juara) selama juaraMs.
  // Putaran = satu kali jalan dari level terendah sampai tertinggi rentang; di ujung putaran yang diumumkan 3 teratas SELURUH putaran (menggantikan juara babak terakhir).
  juaraMs: 7000,
  // Menu host membuka = game dijeda. Bila halaman host hilang saat dijeda, game lanjut sendiri setelah jedaMaksMs.
  jedaMaksMs: 180000,
  // Timer sesi LIVE (hitung mundur). sesiMs: 0 = tanpa batas (Live time hitung maju). Host bisa memilih durasi saat Mulai.
  // Waktu habis -> sesi berhenti sendiri di ujung ronde yang sedang berjalan (ronde tidak terpotong), lalu tampil juara sesi.
  // Follow, share, dan gift menambah waktu sesi (di luar tambahan waktu soal yang sudah ada).
  sesiMs: 3600000,          // 60 menit
  sesiFollowMs: 30000,      // follow: +30 dtk (sekali per penonton per sesi)
  sesiShareMs: 60000,       // share: +60 dtk (sekali per penonton per sesi)
  sesiGiftMs: 3000,         // gift: +3 dtk per diamond...
  sesiGiftMaksMs: 300000,   // ...maksimal +5 menit untuk satu gift
  sesiTambahMaksMs: 3600000, // batas total tambahan dari follow/share/gift dalam satu sesi (+60 menit)
  giftAlertMs: 5000, // lama kartu "terima kasih" gift tampil di layar
  // Keistimewaan donatur (total diamond gift dalam satu sesi). mult = pengali poin jawaban benar (tidak dini).
  tierDonatur: [
    { min: 1, nama: 'Supporter', lencana: '\u2B50', mult: 1 },
    { min: 10, nama: 'VIP', lencana: '\uD83D\uDC8E', mult: 1.25 },
    { min: 50, nama: 'Sultan', lencana: '\uD83D\uDC51', mult: 1.5 },
  ],
});

const ANGKA = /^\d{1,6}$/;
const TANPA_BATAS = 4e15; // tenggat "tak terhingga" yang tetap bilangan biasa (aman untuk penjumlahan lama jeda)

/** Rentang level sah: bilangan bulat 1..LEVEL_MAKS dan dari <= sampai. */
const rentangSah = (min, maks) =>
  Number.isInteger(min) && Number.isInteger(maks) && min >= 1 && maks <= LEVEL_MAKS && min <= maks;

/** Pra-saring murah di jalur panas: mayoritas komentar LIVE adalah obrolan, bukan jawaban. */
const mungkinJawaban = (teks) => typeof teks === 'string' && teks.length <= 40 && ANGKA.test(teks.trim());

class MathBattle {
  constructor({ now = Date.now, rng = Math.random, config = {} } = {}) {
    this.now = now;
    this.rng = rng;
    this.cfg = { ...BAWAAN, ...config };
    this.counters = { commentsSeen: 0, answersAccepted: 0 };
    this._reset();
  }

  _reset() {
    this.status = 'idle'; // idle | ready | question | reveal
    this.round = 0;
    this.q = null;
    this.mulaiAt = 0;
    this.akhirAt = 0;
    this.answers = new Map(); // userId -> { nama, ok, poin, ms }
    this.feed = [];
    this.skor = new Map(); // userId -> { nama, skor, benar }
    this.riwayat = [];
    this.levelTetap = 0; // 0 = otomatis; 1..LEVEL_MAKS = dikunci host
    this.lv = { min: this.cfg.levelAwal, maks: LEVEL_MAKS, mulai: 0 }; // rentang otomatis; mulai = indeks babak tempat putaran ini dimulai
    this.lvTunda = null; // rentang baru yang menunggu awal babak berikutnya
    this.topBeku = []; // Top 10 yang tampil selama soal berjalan (hasil ronde baru terbuka saat reveal)
    this.likes = 0;
    this.bankMs = 0; // bonus waktu yang datang di luar fase soal, dipakai di soal berikutnya
    this.superUntil = 0;
    this.gifts = new Map(); // userId -> { nama, nilai }
    this.followed = new Set();
    this.shared = new Set();
    this.sapaLog = []; // ucapan terima kasih follow/share terbaru (maks 6)
    this.sapaSeq = 0;
    this.hari = new Map(); // userId -> streak hari berturut-turut (untuk lencana 🔥 bila >= 3)
    this.misiHasil = null;  // hasil tantangan bersama ronde terakhir { round, n, target, ok }
    this.sesiAt = 0; // kapan sesi dimulai (untuk Live time di layar)
    this.sesiMs = 0;       // durasi awal timer sesi (0 = tanpa batas)
    this.sesiAkhirAt = 0;  // kapan timer sesi habis (0 = tanpa batas); bergeser maju saat follow/share/gift
    this.sesiTambahMs = 0; // total tambahan waktu sesi yang sudah diberikan
    this.sesiUsai = false; // true bila sesi berhenti karena waktu habis (bukan dihentikan host)
    this.goal = { gift: 0, follow: 0, tap: 0 };
    this.curiga = new Map(); // userId -> { nama, dini } : penjawab yang berkali-kali tiba sebelum lantai respons
    this.nDini = 0;          // jawaban dini pada ronde ini (tidak ikut dihitung di "answered")
    this.likeUser = new Map(); // userId -> { m: menit, n } : jatah like per menit
    // M5: statistik sesi (tampil setelah sesi berhenti) dan hasil ronde yang menunggu dicatat peringkat.
    this.stat = { rondeSelesai: 0, benar: 0, salah: 0, tercepat: null, comboTertinggi: null, poinTertinggi: null, dini: 0 };
    this._hasil = null;
    this._topC = null; // cache Top N (dibuang tiap skor/gift berubah): snapshot berulang tidak mengurutkan ulang semua pemain
    this._giftC = null;
    // Jeda (menu host terbuka), babak, juara, gift terakhir.
    this.paused = false;
    this.pauseAt = 0;
    this.superSisa = 0; // sisa Super Points yang dibekukan selama jeda
    this.babakSkor = new Map(); // userId -> { id, nama, skor, benar, avatar? } : skor babak berjalan
    this.putaranSkor = new Map(); // skor babak-babak yang sudah selesai di putaran berjalan
    this.juara = null;      // pengumuman juara babak (tampil selama fase ready di ujung babak)
    this.juaraSesi = null;  // pengumuman juara sesi (tampil setelah sesi berhenti)
    this.giftSeq = 0;
    this.giftTerakhir = null;
  }

  /** Mulai sesi baru (skor direset). */
  start({ level, levelMaks, sesiMs } = {}) {
    this._reset();
    this.counters = { commentsSeen: 0, answersAccepted: 0 };
    const a = Number(level), b = Number(levelMaks);
    const min = Number.isInteger(a) && a >= 1 && a <= LEVEL_MAKS ? a : this.cfg.levelAwal;
    const maks = Number.isInteger(b) && b >= 1 && b <= LEVEL_MAKS ? Math.max(min, b) : LEVEL_MAKS;
    this.lv = { min, maks, mulai: 0 };
    this.sesiAt = this.now();
    const d = typeof sesiMs === 'number' || (typeof sesiMs === 'string' && sesiMs.trim() !== '') ? Math.round(Number(sesiMs)) : NaN; // null/kosong = pakai bawaan
    this.sesiMs = Number.isFinite(d) && d >= 0 ? Math.min(d, 12 * 3600000) : this.cfg.sesiMs;
    this.sesiAkhirAt = this.sesiMs > 0 ? this.sesiAt + this.sesiMs : 0;
    this._keSiap();
  }

  /** Hentikan sesi; skor terakhir tetap tampil sampai sesi berikutnya. */
  stop(opsi) {
    // Ronde yang terpotong saat soal berjalan tetap dicatat (skor sesi sudah menghitungnya).
    if (this.status === 'question') this._tutupRonde();
    const juaraSesi = this._susunTop(3);
    this.paused = false;
    this.pauseAt = 0;
    this.superSisa = 0;
    this.status = 'idle';
    this.q = null;
    this.juara = null;
    this.sesiUsai = !!(opsi && opsi.otomatis === true);
    this.juaraSesi = juaraSesi.length ? { id: 's' + this.sesiAt, jenis: 'sesi', daftar: juaraSesi } : null;
  }

  /** Jeda: menu host terbuka. Timer, soal, dan Super Points dibekukan; jawaban tidak diterima. */
  jeda() {
    if (this.status === 'idle') return { ok: false, reason: 'berhenti' };
    if (this.paused) return { ok: true };
    const t = this.now();
    this.paused = true;
    this.pauseAt = t;
    this.superSisa = this.superUntil ? Math.max(0, this.superUntil - t) : 0;
    this.superUntil = 0;
    return { ok: true };
  }

  /** Lanjut dari jeda: semua tenggat digeser sebesar lama jeda, sehingga sisa waktu tetap utuh. */
  lanjut() {
    if (!this.paused) return { ok: true };
    const t = this.now();
    const d = Math.max(0, t - this.pauseAt);
    this.akhirAt += d;
    this.mulaiAt += d; // lama jeda tidak dihitung sebagai waktu menjawab
    if (this.superSisa > 0) this.superUntil = t + this.superSisa;
    this.superSisa = 0;
    this.paused = false;
    this.pauseAt = 0;
    return { ok: true };
  }

  _superRonde() { return this.round > 0 && this.round % this.cfg.rondePerLevel === 0; }
  _tantanganRonde() { return this.cfg.rondePerLevel >= 3 && this.round > 0 && (this.round - 1) % this.cfg.rondePerLevel === 2; }

  /** Kumpulkan hasil ronde untuk peringkat; dipanggil sekali per ronde (reveal atau stop). */
  _tutupRonde() {
    this.stat.rondeSelesai++;
    const peserta = [];
    for (const [userId, a] of this.answers) {
      const s = this.skor.get(userId);
      // ms = waktu efektif (sejak soal terlihat); jawaban dini tidak boleh memecahkan rekor atau dihitung benar di peringkat.
      peserta.push({ userId, nama: a.nama, ok: a.ok && !a.dini, poin: a.poin, ms: a.efek, combo: a.combo, skorSesi: s ? s.skor : 0 });
    }
    this._hasil = { round: this.round, level: this.q.level, peserta };
    if (this._tantanganRonde()) {
      const n = peserta.reduce((a, p) => a + (p.ok ? 1 : 0), 0), ok = n >= this.cfg.tantanganTarget;
      this.misiHasil = { round: this.round, n, target: this.cfg.tantanganTarget, ok };
      if (ok) { this.bankMs += this.cfg.tantanganBonusMs; this._sapa('misi', '', '', '', { bonus: Math.round(this.cfg.tantanganBonusMs / 1000) }); }
    }
  }

  /** Hasil ronde terakhir yang belum diambil (sekali saja), atau null. */
  ambilHasilRonde() {
    const h = this._hasil;
    this._hasil = null;
    return h;
  }

  /** Ringkasan sesi untuk layar setelah berhenti. Pemain dihitung dari yang menjawab. */
  statistik() {
    const { benar, salah, tercepat, comboTertinggi, poinTertinggi, rondeSelesai } = this.stat;
    const total = benar + salah;
    return {
      ronde: rondeSelesai,
      pemain: this.skor.size,
      jawaban: total,
      akurasi: total ? Math.round((benar / total) * 100) : 0,
      tercepat: tercepat && { ...tercepat },
      comboTertinggi: comboTertinggi && { ...comboTertinggi },
      poinTertinggi: poinTertinggi && { ...poinTertinggi },
    };
  }

  /**
   * Host mengunci level (0 = kembali otomatis). Bila soal ronde ini belum tampil (fase ready) langsung berlaku,
   * selain itu mulai ronde berikutnya. berlaku: 'sekarang' | 'ronde_berikutnya' | 'berhenti'.
   */
  setLevel(n) {
    const lv = Math.floor(Number(n));
    if (lv !== 0 && (!Number.isInteger(lv) || lv < 1 || lv > LEVEL_MAKS)) return { ok: false, reason: 'level_tidak_sah' };
    if (this.status === 'idle') return { ok: true, level: lv, berlaku: 'berhenti' }; // tidak ada sesi: tidak ada yang dikunci (start mereset kunci)
    this.levelTetap = lv;
    const berlaku = this._ulangSoalSiap() ? 'sekarang' : 'ronde_berikutnya';
    return { ok: true, level: lv, berlaku };
  }

  /**
   * Host mengganti rentang otomatis (dari..sampai). Berlaku di awal babak berikutnya dengan putaran baru
   * mulai dari level terendah; bila ronde ini baru mulai babak dan soalnya belum tampil, langsung berlaku.
   */
  setRentang(min, maks) {
    const a = Number(min), b = Number(maks);
    if (!rentangSah(a, b)) return { ok: false, reason: 'rentang_tidak_sah' };
    if (this.status === 'idle') return { ok: true, min: a, maks: b, berlaku: 'berhenti' };
    this.lvTunda = { min: a, maks: b };
    if (this.status === 'ready' && (this.round - 1) % this.cfg.rondePerLevel === 0) {
      this._terapkanTunda();
      this._ulangSoalSiap();
      return { ok: true, min: a, maks: b, berlaku: 'sekarang' };
    }
    return { ok: true, min: a, maks: b, berlaku: 'babak_berikutnya' };
  }

  /** Terapkan rentang tertunda; hanya di awal babak (putaran baru mulai dari level terendah). */
  _terapkanTunda() {
    if (!this.lvTunda || (this.round - 1) % this.cfg.rondePerLevel !== 0) return;
    this.lv = { ...this.lvTunda, mulai: Math.floor((this.round - 1) / this.cfg.rondePerLevel) };
    this.lvTunda = null;
    this.putaranSkor = new Map();
  }

  /** Level otomatis untuk ronde r: naik satu per babak dari min ke maks, lalu kembali ke min. */
  _levelAuto(r) {
    const { min, maks, mulai } = this.lv;
    const span = maks - min + 1;
    return min + ((Math.floor((r - 1) / this.cfg.rondePerLevel) - mulai) % span);
  }

  _levelRonde(r) {
    return this.levelTetap || this._levelAuto(r);
  }

  /** Soal ronde ini sudah dibuat di awal fase ready tetapi belum tampil: ganti bila levelnya berubah. @returns {boolean} true bila diganti */
  _ulangSoalSiap() {
    if (this.status !== 'ready' || !this.q) return false;
    const lv = this._levelRonde(this.round);
    if (lv === this.q.level) return false;
    if (this.riwayat[this.riwayat.length - 1] === this.q.teks) this.riwayat.pop();
    this.q = buatSoal({ level: lv, rng: this.rng, recent: this.riwayat, bobot: this.cfg.bobot });
    this.riwayat.push(this.q.teks);
    return true;
  }

  _keSiap() {
    const sebelum = this.round;
    const lvSebelum = this.q ? this.q.level : 0; // level ronde yang baru selesai (sebelum soal diganti)
    this.round++;
    // Ujung babak: umumkan juara (babak, atau putaran bila level terakhir rentang baru selesai), lalu hitung skor dari nol.
    this.juara = null;
    let tambahan = 0;
    if (sebelum > 0 && sebelum % this.cfg.rondePerLevel === 0) tambahan = this._akhirBabak(sebelum, lvSebelum);
    this._terapkanTunda();
    this.q = buatSoal({ level: this._levelRonde(this.round), rng: this.rng, recent: this.riwayat, bobot: this.cfg.bobot });
    this.riwayat.push(this.q.teks);
    if (this.riwayat.length > this.cfg.riwayatSoal) this.riwayat.shift();
    this.answers = new Map();
    this.nDini = 0;
    this.feed = [];
    this.status = 'ready';
    this.akhirAt = this.now() + this.cfg.siapMs + tambahan;
  }

  /** Tutup babak yang berakhir di ronde `sebelum`. @returns {number} tambahan ms masa tampil juara */
  _akhirBabak(sebelum, lvSebelum) {
    const idx = sebelum / this.cfg.rondePerLevel - 1; // indeks babak yang baru selesai
    const { min, maks, mulai } = this.lv;
    const span = maks - min + 1;
    const rel = idx - mulai;
    const terkunci = lvSebelum !== this._levelAuto(sebelum);
    for (const [id, b] of this.babakSkor) { // babak ini ikut skor putaran
      const p = this.putaranSkor.get(id) || { id, nama: b.nama, skor: 0, benar: 0 };
      p.nama = b.nama;
      if (b.avatar) p.avatar = b.avatar;
      p.skor += b.skor;
      p.benar += b.benar;
      this.putaranSkor.set(id, p);
    }
    const ujungPutaran = span > 1 && rel % span === span - 1;
    let juara = null;
    if (ujungPutaran && !terkunci) {
      const daftar = this._susunSkor(this.putaranSkor, 3);
      if (daftar.length) juara = { id: 'p' + this.sesiAt + ':' + sebelum, jenis: 'putaran', nomor: Math.floor(rel / span) + 1, dari: min, sampai: maks, daftar };
    } else {
      const daftar = this._susunSkor(this.babakSkor, 3);
      if (daftar.length) juara = { id: 'b' + this.sesiAt + ':' + sebelum, jenis: 'babak', nomor: sebelum / this.cfg.rondePerLevel, level: lvSebelum, terkunci, daftar };
    }
    if (ujungPutaran) this.putaranSkor = new Map();
    this.babakSkor = new Map();
    this.juara = juara;
    return juara ? this.cfg.juaraMs : 0;
  }

  /** Majukan fase bila waktunya habis. @returns {boolean} true bila fase berubah */
  tick() {
    const t = this.now();
    let berubah = false;
    if (this.paused) { // dibekukan; kalau halaman host hilang, lanjut sendiri
      if (this._sesiHabis(t)) { this.stop({ otomatis: true }); return true; } // jam LIVE tidak ikut berhenti saat menu terbuka
      if (t - this.pauseAt >= this.cfg.jedaMaksMs) { this.lanjut(); return true; }
      return false;
    }
    if (this.superUntil && t >= this.superUntil) { this.superUntil = 0; berubah = true; }
    if (this.status === 'idle') return berubah;
    if (t < this.akhirAt) return berubah;
    if (this.status === 'ready') {
      if (this._sesiHabis(t)) { this.stop({ otomatis: true }); return true; } // waktu LIVE habis: tidak membuka soal baru
      this.status = 'question';
      this.juara = null;
      this.mulaiAt = t;
      this.akhirAt = this.cfg.tanpaWaktu ? TANPA_BATAS : t + this.cfg.durasiMs[this.q.level] + this.bankMs;
      this.bankMs = 0;
      this.topBeku = this.top();
    } else if (this.status === 'question') {
      this._tutupRonde();
      this.status = 'reveal';
      this.akhirAt = t + this.cfg.revealMs;
    } else {
      if (this._sesiHabis(t)) { this.stop({ otomatis: true }); return true; } // ronde terakhir selesai (reveal tuntas): sesi berhenti
      this._keSiap();
    }
    return true;
  }

  /** Timer sesi sudah habis? (selalu dihitung dari jam, jadi gift/follow/share di detik terakhir bisa menyelamatkan sesi) */
  _sesiHabis(t = this.now()) {
    return this.sesiAkhirAt > 0 && t >= this.sesiAkhirAt;
  }

  /** Tambah waktu sesi (ms), dibatasi sisa jatah sesiTambahMaksMs. @returns {number} ms yang benar-benar ditambahkan */
  _tambahSesi(ms) {
    if (!this.sesiAkhirAt || this.status === 'idle') return 0;
    const m = Math.min(Math.floor(Number(ms)) || 0, this.cfg.sesiTambahMaksMs - this.sesiTambahMs);
    if (!(m > 0)) return 0;
    this.sesiAkhirAt += m;
    this.sesiTambahMs += m;
    return m;
  }

  /** Target bersama: tiap target tercapai -> Super Points selama superMs; penghitung lanjut dari sisa. */
  _isiTarget(jenis, jml) {
    const target = this.cfg[jenis + 'Target'];
    this.goal[jenis] += jml;
    while (target > 0 && this.goal[jenis] >= target) {
      this.goal[jenis] -= target;
      this._setSuper();
      this._sapa('target', '', '', '', { kind: jenis });
    }
  }

  /** Nyalakan Super Points (selama jeda, hitungan baru dibekukan dan mulai berjalan saat lanjut). */
  _setSuper() {
    if (this.paused) this.superSisa = this.cfg.superMs;
    else this.superUntil = this.now() + this.cfg.superMs;
  }

  /** Tingkat donatur dari total diamond sesi ini (null bila belum pernah gift). */
  _tier(userId) {
    const g = this.gifts.get(userId);
    if (!g) return null;
    let t = null;
    for (const x of this.cfg.tierDonatur) if (g.nilai >= x.min) t = x;
    return t;
  }
  _lencana(userId) {
    const t = this._tier(userId);
    const l = (t ? t.lencana : '') + ((this.hari.get(userId) || 0) >= 3 ? '\uD83D\uDD25' : '');
    return l ? { lencana: l } : {};
  }

  _tambahWaktu(ms) {
    if (this.status === 'question') this.akhirAt += ms;
    else if (this.status !== 'idle') this.bankMs += ms;
  }

  /** Like dari penonton: tiap likeTarget terkumpul -> bonus waktu bersama. Per penonton dibatasi likeMaksMenit per menit (anti auto-clicker). */
  addLike(n = 1, userId = '') {
    let jml = Math.min(1000, Math.floor(Number(n)));
    if (!(jml >= 1) || this.status === 'idle') return { ok: false, reason: 'invalid' };
    if (userId && this.cfg.likeMaksMenit > 0) {
      const m = Math.floor(this.now() / 60000);
      let j = this.likeUser.get(userId);
      if (!j) { j = { m, n: 0 }; this.likeUser.set(userId, j); } else if (j.m !== m) { j.m = m; j.n = 0; }
      jml = Math.min(jml, Math.max(0, this.cfg.likeMaksMenit - j.n));
      j.n += jml;
      if (jml < 1) return { ok: false, reason: 'jatah_like' };
      if (this.likeUser.size > 5000) this.likeUser.clear(); // batas memori; jatah dihitung ulang dari nol
    }
    this.likes += jml;
    this._isiTarget('tap', jml);
    let target = 0;
    while (this.likes >= this.cfg.likeTarget) {
      this.likes -= this.cfg.likeTarget;
      this._tambahWaktu(this.cfg.likeBonusMs);
      target++;
    }
    return { ok: true, tercapai: target };
  }

  /** Gift: Super Points (pengali poin) selama superMs + dicatat di Top Gift + keistimewaan donatur (lencana, pengali poin). */
  gift({ userId, username, nilai = 1, avatar } = {}) {
    if (!userId || this.status === 'idle') return { ok: false, reason: 'invalid' };
    const v = Math.max(1, Math.floor(Number(nilai)) || 1);
    this._setSuper();
    const sebelum = this._tier(userId);
    const g = this.gifts.get(userId) || { id: userId, nama: username, nilai: 0 };
    g.nama = username || g.nama;
    g.nilai += v;
    if (avatar) g.avatar = avatar;
    this.gifts.set(userId, g);
    this._giftC = null;
    this._topC = null; // lencana ikut berubah di Top 10
    this._isiTarget('gift', v);
    const tambahSesi = this._tambahSesi(Math.min(this.cfg.sesiGiftMaksMs, v * this.cfg.sesiGiftMs));
    const sesudah = this._tier(userId);
    this.giftTerakhir = {
      seq: ++this.giftSeq, at: this.now(), nama: g.nama, nilai: v, total: g.nilai,
      lencana: sesudah ? sesudah.lencana : '', tier: sesudah ? sesudah.nama : '', mult: sesudah ? sesudah.mult : 1,
      naik: !!sesudah && (!sebelum || sebelum.nama !== sesudah.nama),
      ...(tambahSesi > 0 ? { sesi: Math.round(tambahSesi / 1000) } : {}),
      ...(g.avatar ? { avatar: g.avatar } : {}),
    };
    return { ok: true };
  }

  _sapa(jenis, userId, username, avatar, extra = {}) {
    const nama = username || userId || '';
    const t = userId ? this._lencana(userId) : {};
    this.sapaLog.push({ seq: ++this.sapaSeq, at: this.now(), jenis, nama, ...t, ...(avatar ? { avatar } : {}), ...extra });
    if (this.sapaLog.length > 6) this.sapaLog.shift();
  }

  /** Penonton tercatat hadir (dari peringkat.catatHadir): lencana 🔥 bila streak >= 3; sapaan khusus bila kembali di hari baru. */
  sambut({ userId, username, avatar, kembali, streak, total } = {}) {
    if (!userId || !(streak >= 1)) return;
    const lama = this.hari.get(userId) || 0;
    this.hari.set(userId, streak);
    if ((lama >= 3) !== (streak >= 3)) { this._topC = null; this._giftC = null; }
    if (kembali) this._sapa('kembali', userId, username, avatar, { streak, total });
  }

  /** Follow: bantuan waktu, sekali per penonton per sesi. */
  follow({ userId, username, avatar } = {}) {
    if (!userId || this.status === 'idle') return { ok: false, reason: 'invalid' };
    if (this.followed.has(userId)) return { ok: false, reason: 'already_followed' };
    this.followed.add(userId);
    this._tambahWaktu(this.cfg.followBonusMs);
    this._isiTarget('follow', 1);
    const ms = this._tambahSesi(this.cfg.sesiFollowMs);
    this._sapa('follow', userId, username, avatar, ms > 0 ? { sesi: Math.round(ms / 1000) } : {});
    return { ok: true };
  }

  /** Share: bantuan waktu, sekali per penonton per sesi. */
  share({ userId, username, avatar } = {}) {
    if (!userId || this.status === 'idle') return { ok: false, reason: 'invalid' };
    if (this.shared.has(userId)) return { ok: false, reason: 'already_shared' };
    this.shared.add(userId);
    this._tambahWaktu(this.cfg.shareBonusMs);
    const ms = this._tambahSesi(this.cfg.sesiShareMs);
    this._sapa('share', userId, username, avatar, ms > 0 ? { sesi: Math.round(ms / 1000) } : {});
    return { ok: true };
  }

  topGift(n = this.cfg.maksGifter) {
    if (this._giftC && this._giftC.n === n) return this._giftC.v;
    const v = [...this.gifts.values()].sort((a, b) => b.nilai - a.nilai).slice(0, n).map((g) => ({ nama: g.nama, nilai: g.nilai, ...this._lencana(g.id), ...(g.avatar ? { avatar: g.avatar } : {}) }));
    this._giftC = { n, v };
    return v;
  }

  /** @param {{userId: string, username: string, text: string} | null} jawab */
  handleComment(jawab) {
    if (!jawab) return { ok: false, reason: 'invalid' };
    this.counters.commentsSeen++;
    if (this.status !== 'question') return { ok: false, reason: 'not_open' };
    if (this.paused) return { ok: false, reason: 'paused' };
    const t = this.now();
    if (t >= this.akhirAt) return { ok: false, reason: 'late' };
    const teks = jawab.text.trim();
    if (!ANGKA.test(teks)) return { ok: false, reason: 'not_a_number' };
    if (this.answers.has(jawab.userId)) return { ok: false, reason: 'already_answered' };

    const ms = t - this.mulaiAt;
    const durasi = this.cfg.durasiMs[this.q.level];
    const benar = Number(teks) === this.q.jawab;
    // Anti-curang: penonton baru melihat soal setelah jeda siaran (latensiMs). Jawaban yang tiba sebelum
    // latensi + bacaMs "dini": tidak mungkin dari orang yang melihat soal lewat siaran (tebakan / bot / jalur lain).
    // Dini tidak ditolak (penonton berlatensi rendah tidak dirugikan berat): tanpa bonus kecepatan/combo/Super,
    // tidak masuk daftar tercepat, rekor, "answered", dan feed; dari kali ke-(diniToleransi+1) nol poin.
    const dini = ms < this.cfg.latensiMs + this.cfg.bacaMs;
    const efek = Math.max(0, ms - this.cfg.latensiMs); // waktu sejak soal terlihat; dasar bonus & daftar tercepat
    let strike = 0;
    if (dini) {
      const c = this.curiga.get(jawab.userId) || { nama: jawab.username, dini: 0 };
      c.nama = jawab.username; strike = ++c.dini;
      this.curiga.set(jawab.userId, c);
      this.nDini++; this.stat.dini++;
    }
    // Combo: jawaban benar beruntun (per penonton) menaikkan pengali; salah memutus. Tidak menjawab tidak memutus.
    // Jawaban benar yang dini tidak menaikkan combo (dan tidak memutusnya).
    const s = this.skor.get(jawab.userId) || { id: jawab.userId, nama: jawab.username, skor: 0, benar: 0, streak: 0 };
    if (!benar) s.streak = 0; else if (!dini) s.streak++;
    const combo = benar && !dini ? Math.min(this.cfg.comboMaks, s.streak) : 0;
    const dasar = this.cfg.poinDasar[this.q.level];
    const super_ = (this.superUntil && t < this.superUntil ? this.cfg.superMult : 1) * (this._superRonde() ? this.cfg.superRondeMult : 1);
    const pengali = Number(jawab.pengali) > 0 && Number(jawab.pengali) <= 1 ? Number(jawab.pengali) : 1; // percobaan ke-2 dst: poin berkurang
    let poin = 0;
    if (benar && dini) poin = strike <= this.cfg.diniToleransi ? dasar : 0;
    else if (benar) {
      const rentang = Math.max(1000, durasi - this.cfg.latensiMs); // jeda siaran dikeluarkan dari hitungan bonus
      const bonus = this.cfg.tanpaWaktu ? 0 : Math.max(0, 1 - efek / rentang); // tanpa timer: tidak ada bonus kecepatan
      poin = Math.round(dasar * (1 + bonus)) * combo * super_;
      const tier = this._tier(jawab.userId); // donatur: pengali poin (hanya jawaban benar yang tidak dini)
      if (tier && tier.mult !== 1) poin = Math.round(poin * tier.mult);
      poin = Math.round(poin * pengali);
    }

    const av = { ...(jawab.avatar ? { avatar: jawab.avatar } : {}), ...this._lencana(jawab.userId) };
    this.answers.set(jawab.userId, { nama: jawab.username, ok: benar, poin, ms, efek, combo, dini, ...av });
    this.counters.answersAccepted++;
    if (!dini) { // penjawab dini tidak tampil: pelaku tidak mendapat umpan balik bahwa jawabannya tercatat
      this.feed.unshift({ nama: jawab.username, ok: benar, poin, combo, ...av });
      if (this.feed.length > this.cfg.maksFeed) this.feed.pop();
    }

    s.nama = jawab.username;
    if (jawab.avatar) s.avatar = jawab.avatar;
    s.skor += poin;
    if (benar) {
      s.benar++;
      this.stat.benar++;
      if (!dini) {
        const st = this.stat;
        if (!st.tercepat || efek < st.tercepat.ms) st.tercepat = { nama: jawab.username, ms: efek, level: this.q.level };
        if (!st.comboTertinggi || combo > st.comboTertinggi.nilai) st.comboTertinggi = { nama: jawab.username, nilai: combo };
        if (!st.poinTertinggi || poin > st.poinTertinggi.nilai) st.poinTertinggi = { nama: jawab.username, nilai: poin };
      }
    } else {
      this.stat.salah++;
    }
    this.skor.set(jawab.userId, s);
    this._topC = null;
    if (poin > 0) { // skor babak berjalan (untuk pengumuman juara di ujung babak)
      const b = this.babakSkor.get(jawab.userId) || { id: jawab.userId, nama: jawab.username, skor: 0, benar: 0 };
      b.nama = jawab.username;
      if (jawab.avatar) b.avatar = jawab.avatar;
      b.skor += poin;
      if (benar && !dini) b.benar++;
      this.babakSkor.set(jawab.userId, b);
    }
    return { ok: true, benar, poin, combo, dini };
  }

  /** Host menyetel jeda siaran (0-15000 ms). */
  setLatensi(ms) {
    const v = typeof ms === 'number' || (typeof ms === 'string' && ms.trim() !== '') ? Math.round(Number(ms)) : NaN; // null/kosong bukan 0
    if (!Number.isFinite(v) || v < 0 || v > 15000) return { ok: false, reason: 'latensi_tidak_sah' };
    this.cfg.latensiMs = v;
    return { ok: true, latensiMs: v };
  }

  /** Laporan untuk host (dimuat saat menu dibuka, tidak ikut siaran): pengaturan + penonton yang paling sering dini. */
  laporanCuriga(n = 5) {
    const daftar = [...this.curiga.values()].sort((a, b) => b.dini - a.dini).slice(0, n).map((c) => ({ nama: c.nama, dini: c.dini }));
    return { latensiMs: this.cfg.latensiMs, bacaMs: this.cfg.bacaMs, lantaiMs: this.cfg.latensiMs + this.cfg.bacaMs, dini: this.stat.dini, ditandai: this.curiga.size, daftar };
  }

  _susunTop(n) {
    return [...this.skor.values()]
      .filter((s) => s.skor > 0)
      .sort((a, b) => b.skor - a.skor || b.benar - a.benar)
      .slice(0, n)
      .map((s) => ({ nama: s.nama, skor: s.skor, ...this._lencana(s.id), ...(s.avatar ? { avatar: s.avatar } : {}) }));
  }

  _susunSkor(peta, n) {
    return [...peta.values()]
      .filter((s) => s.skor > 0)
      .sort((a, b) => b.skor - a.skor || b.benar - a.benar)
      .slice(0, n)
      .map((s) => ({ nama: s.nama, skor: s.skor, ...this._lencana(s.id), ...(s.avatar ? { avatar: s.avatar } : {}) }));
  }

  top(n = this.cfg.maksTop) {
    if (this._topC && this._topC.n === n) return this._topC.v;
    const v = this._susunTop(n);
    this._topC = { n, v };
    return v;
  }

  _posisiBabak() {
    const per = this.cfg.rondePerLevel;
    const idx = Math.floor((this.round - 1) / per);
    const span = this.lv.maks - this.lv.min + 1;
    const rel = idx - this.lv.mulai;
    return {
      no: idx + 1, pos: ((this.round - 1) % per) + 1, dari: per,
      putaran: { no: Math.floor(rel / span) + 1, babak: (rel % span) + 1, dari: span }, // putaran ke-N; babak ke-M dari span babak
    };
  }

  /** Snapshot aman untuk layar: jawaban soal baru ikut terkirim saat fase reveal. */
  snapshot() {
    const snap = {
      game: 'mathbattle',
      status: this.status,
      round: this.round,
      level: this.q ? this.q.level : 0,
      levelTetap: this.levelTetap,
      levelMin: this.lv.min,
      levelMaks: this.lv.maks,
      rentangTunda: this.lvTunda ? { ...this.lvTunda } : null,
      kategori: this.q && this.status !== 'idle' ? this.q.kategori : '',
      endsAt: this.status === 'idle' ? 0 : this.akhirAt,
      counters: { ...this.counters },
      top: this.status === 'question' ? this.topBeku : this.top(),
      likes: this.likes,
      likeTarget: this.cfg.likeTarget,
      likeBonusMs: this.cfg.likeBonusMs,
      sesiAt: this.status === 'idle' ? 0 : this.sesiAt,
      sesiMs: this.status === 'idle' ? 0 : this.sesiMs,
      sesiAkhirAt: this.status === 'idle' ? 0 : this.sesiAkhirAt, // 0 = tanpa batas
      sesiHabis: this.status !== 'idle' && this._sesiHabis(), // waktu habis, ronde terakhir masih diselesaikan
      sesiUsai: this.status === 'idle' && this.sesiUsai,      // sesi berhenti sendiri karena waktu habis
      goal: {
        gift: { n: this.goal.gift, target: this.cfg.giftTarget },
        follow: { n: this.goal.follow, target: this.cfg.followTarget },
        tap: { n: this.goal.tap, target: this.cfg.tapTarget },
      },
      superAktif: this.paused ? this.superSisa > 0 : !!this.superUntil && this.now() < this.superUntil,
      superMult: this.cfg.superMult,
      superMs: this.cfg.superMs,
      superRondeMult: this.cfg.superRondeMult,
      topGift: this.topGift(),
      serverNow: this.now(),
      paused: this.paused,
      pauseAt: this.paused ? this.pauseAt : 0,
      // Posisi ronde di dalam babak (mis. ronde 3 dari 5), supaya penonton tahu sedang di mana.
      babak: this.round > 0 ? this._posisiBabak() : null,
      superRonde: this.status !== 'idle' && this._superRonde(),
      tantangan: this.status !== 'idle' && this._tantanganRonde()
        ? { target: this.cfg.tantanganTarget, bonus: Math.round(this.cfg.tantanganBonusMs / 1000), ...(this.status === 'reveal' && this.misiHasil && this.misiHasil.round === this.round ? { n: this.misiHasil.n, ok: this.misiHasil.ok } : {}) }
        : null,
      perks: this.cfg.tierDonatur.map(({ min, nama, lencana, mult }) => ({ min, nama, lencana, mult })),
    };
    const gt = this.giftTerakhir;
    if (gt && this.now() - gt.at < this.cfg.giftAlertMs) snap.giftBaru = { ...gt };
    const sp = this.sapaLog.filter((x) => this.now() - x.at < this.cfg.sapaMs);
    if (sp.length) snap.sapa = sp;
    if (this.status === 'ready' && this.juara) snap.juara = this.juara;
    if (this.status === 'idle' && this.juaraSesi) snap.juara = this.juaraSesi;
    // Ringkasan sesi hanya dikirim saat berhenti (progressive disclosure: tidak membebani layar saat ronde jalan).
    if (this.status === 'idle' && this.round > 0) snap.statistik = this.statistik();
    if (this.status === 'question' || this.status === 'reveal') {
      snap.soal = this.q.teks;
      snap.digit = this.q.digit;
      snap.startsAt = this.mulaiAt;
      snap.answered = this.answers.size - this.nDini;
      // Selama soal berjalan feed hanya menunjukkan SIAPA yang sudah menjawab (anti-nyontek);
      // benar/salah, poin, dan combo baru terbuka saat reveal.
      snap.feed = this.status === 'question'
        ? this.feed.map((f) => ({ nama: f.nama, ...(f.lencana ? { lencana: f.lencana } : {}), ...(f.avatar ? { avatar: f.avatar } : {}) }))
        : this.feed.map((f) => ({ ...f }));
    }
    if (this.status === 'reveal') {
      snap.jawaban = this.q.jawab;
      snap.pemenang = [...this.answers.values()]
        .filter((a) => a.ok && !a.dini)
        .sort((a, b) => a.ms - b.ms)
        .slice(0, this.cfg.maksPemenang)
        .map((a) => ({ nama: a.nama, poin: a.poin, ms: a.efek, combo: a.combo, ...(a.lencana ? { lencana: a.lencana } : {}), ...(a.avatar ? { avatar: a.avatar } : {}) }));
    }
    return snap;
  }
}
// apps/mathbattle/server/peringkat.js — M5: peringkat mingguan + rekor. Murni: waktu dan penyimpanan disuntik.
//
// Penyimpanan (`store`) = { muat(): object|null, simpan(obj): void }, SINKRON dan boleh melempar galat.
// Di Mesin Live, store = ctx.simpan (data/mathbattle/peringkat-mathbattle.json), di luar folder app sehingga tidak tertimpa codesync.
//
// Bentuk data (v1):
//   { v:1, minggu:'2026-11-09',                       // tanggal Senin minggu ini (zona waktu zonaMenit)
//     mingguan:{ [userId]:{ nama, skor, benar } },    // skor minggu ini
//     lalu:[{ nama, skor }],                          // 3 teratas minggu lalu
//     rekor:{ skorSesi, combo, poin: {nama,nilai,tgl}, tercepat:{ [level]: {nama,ms,tgl} } } }
//
// Rekor pertama kali dicatat diam-diam; hanya rekor yang DIPECAHKAN yang diumumkan.

const VERSI = 1;
const MAKS_PEMAIN = 400; // bila lebih, buang yang skornya paling kecil sampai PANGKAS_KE
const PANGKAS_KE = 200;

/** Tanggal Senin (YYYY-MM-DD) dari minggu yang memuat waktu t, pada zona waktu zonaMenit (WIB = 420). */
function kunciMinggu(t, zonaMenit = 420) {
  const d = new Date(t + zonaMenit * 60000);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function tanggal(t, zonaMenit) {
  return new Date(t + zonaMenit * 60000).toISOString().slice(0, 10);
}

const adaObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const angka = (x) => Number.isFinite(x) && x >= 0;

function rekorSah(r, kunci) {
  return adaObj(r) && typeof r.nama === 'string' && angka(r[kunci]);
}

function kosong(minggu) {
  return { v: VERSI, minggu, mingguan: {}, lalu: [], rekor: { tercepat: {} }, hadir: {} };
}

/** Terima data mentah dari penyimpanan; bagian yang rusak dibuang, bukan dipercaya. */
function bersihkan(raw, minggu) {
  const d = kosong(minggu);
  if (!adaObj(raw)) return d;
  if (typeof raw.minggu === 'string') d.minggu = raw.minggu;
  if (adaObj(raw.mingguan)) {
    for (const [id, p] of Object.entries(raw.mingguan)) {
      if (adaObj(p) && typeof p.nama === 'string' && angka(p.skor) && angka(p.benar)) {
        d.mingguan[id] = { nama: p.nama, skor: p.skor, benar: p.benar };
      }
    }
  }
  if (adaObj(raw.hadir)) {
    for (const [id, x] of Object.entries(raw.hadir)) {
      if (adaObj(x) && typeof x.n === 'string' && typeof x.h === 'string' && angka(x.s) && angka(x.t)) d.hadir[id] = { n: x.n, h: x.h, s: x.s, t: x.t };
    }
  }
  if (Array.isArray(raw.lalu)) {
    d.lalu = raw.lalu.filter((x) => adaObj(x) && typeof x.nama === 'string' && angka(x.skor)).slice(0, 3).map((x) => ({ nama: x.nama, skor: x.skor }));
  }
  if (adaObj(raw.rekor)) {
    for (const k of ['skorSesi', 'combo', 'poin']) {
      if (rekorSah(raw.rekor[k], 'nilai')) d.rekor[k] = { nama: raw.rekor[k].nama, nilai: raw.rekor[k].nilai, tgl: String(raw.rekor[k].tgl || '') };
    }
    if (adaObj(raw.rekor.tercepat)) {
      for (const [lv, r] of Object.entries(raw.rekor.tercepat)) {
        if (rekorSah(r, 'ms')) d.rekor.tercepat[lv] = { nama: r.nama, ms: r.ms, tgl: String(r.tgl || '') };
      }
    }
  }
  return d;
}

class Peringkat {
  /** @param {{store?: {muat: Function, simpan: Function}, now?: () => number, zonaMenit?: number}} [opsi] */
  constructor({ store = null, now = Date.now, zonaMenit = 420 } = {}) {
    this.store = store;
    this.now = now;
    this.zonaMenit = zonaMenit;
    this.galat = ''; // galat penyimpanan terakhir ('' = baik)
    this.data = kosong(kunciMinggu(now(), zonaMenit));
  }

  muat() {
    let raw = null;
    try { raw = this.store ? this.store.muat() : null; this.galat = ''; } catch (e) { this.galat = `muat: ${e.message}`; }
    this.data = bersihkan(raw, kunciMinggu(this.now(), this.zonaMenit));
    this._topC = null;
    this._putar();
    return this;
  }

  /** Ganti minggu bila kalender sudah berpindah: 3 teratas minggu lalu disimpan, skor mingguan dikosongkan. */
  _putar() {
    const sekarang = kunciMinggu(this.now(), this.zonaMenit);
    if (this.data.minggu === sekarang) return false;
    this.data.lalu = this.top(3);
    this.data.mingguan = {};
    this.data.minggu = sekarang;
    this._topC = null;
    return true;
  }

  _simpan() {
    if (!this.store) return false;
    try { this.store.simpan(this.data); this.galat = ''; return true; } catch (e) { this.galat = `simpan: ${e.message}`; return false; }
  }

  /**
   * Catat satu ronde (bentuk dari MathBattle.ambilHasilRonde()).
   * @returns {{rekorBaru: Array<{jenis: string, nama: string, nilai: number, level?: number}>, tersimpan: boolean}}
   */
  catatRonde(hasil) {
    this._putar();
    const baru = new Map(); // jenis(+level) -> entri; rekor yang dipecahkan beberapa kali dalam satu ronde: ambil yang terakhir
    const tgl = tanggal(this.now(), this.zonaMenit);
    const rekor = this.data.rekor;

    const coba = (kunciBaru, lama, nilai, lebihBaik, simpanBaru, entri) => {
      if (!lama) { simpanBaru(); return; } // rekor pertama: diam-diam
      if (lebihBaik(nilai, lama)) { simpanBaru(); baru.set(kunciBaru, entri); }
    };

    for (const p of (hasil && hasil.peserta) || []) {
      const w = this.data.mingguan[p.userId] || { nama: p.nama, skor: 0, benar: 0 };
      w.nama = p.nama;
      w.skor += p.poin;
      if (p.ok) w.benar++;
      this.data.mingguan[p.userId] = w;

      const skorSesi = { jenis: 'skorSesi', nama: p.nama, nilai: p.skorSesi };
      coba('skorSesi', rekor.skorSesi, p.skorSesi, (n, l) => n > l.nilai,
        () => { rekor.skorSesi = { nama: p.nama, nilai: p.skorSesi, tgl }; }, skorSesi);

      if (!p.ok) continue;
      coba('combo', rekor.combo, p.combo, (n, l) => n > l.nilai,
        () => { rekor.combo = { nama: p.nama, nilai: p.combo, tgl }; }, { jenis: 'combo', nama: p.nama, nilai: p.combo });
      coba('poin', rekor.poin, p.poin, (n, l) => n > l.nilai,
        () => { rekor.poin = { nama: p.nama, nilai: p.poin, tgl }; }, { jenis: 'poin', nama: p.nama, nilai: p.poin });
      const lv = String(hasil.level);
      coba(`tercepat${lv}`, rekor.tercepat[lv], p.ms, (n, l) => n < l.ms,
        () => { rekor.tercepat[lv] = { nama: p.nama, ms: p.ms, tgl }; }, { jenis: 'tercepat', nama: p.nama, nilai: p.ms, level: hasil.level });
    }

    this._pangkas();
    this._topC = null;
    return { rekorBaru: [...baru.values()], tersimpan: this._simpan() };
  }

  /**
   * Catat kehadiran penonton (sekali per sesi per penonton dipanggil plugin). Streak = hari berturut-turut (zona WIB).
   * Disimpan bersama peringkat pada catatRonde berikutnya (tidak menulis berkas sendiri: ringan).
   * @returns {{kembali: boolean, streak: number, total: number}} kembali = baru muncul lagi di hari berbeda
   */
  catatHadir(userId, nama) {
    const tgl = tanggal(this.now(), this.zonaMenit);
    const h = this.data.hadir;
    const x = h[userId];
    if (!x) { h[userId] = { n: nama, h: tgl, s: 1, t: 1 }; return { kembali: false, streak: 1, total: 1 }; }
    x.n = nama;
    if (x.h === tgl) return { kembali: false, streak: x.s, total: x.t };
    x.s = x.h === tanggal(this.now() - 86400000, this.zonaMenit) ? x.s + 1 : 1;
    x.t++; x.h = tgl;
    return { kembali: true, streak: x.s, total: x.t };
  }

  _pangkas() {
    const k = Object.keys(this.data.hadir);
    if (k.length > 3000) { // buang yang paling lama tidak hadir
      k.sort((a, b) => (this.data.hadir[a].h < this.data.hadir[b].h ? -1 : 1));
      for (const id of k.slice(0, k.length - 2000)) delete this.data.hadir[id];
    }
    const m = this.data.mingguan;
    const ids = Object.keys(m);
    if (ids.length <= MAKS_PEMAIN) return;
    ids.sort((a, b) => m[b].skor - m[a].skor);
    for (const id of ids.slice(PANGKAS_KE)) delete m[id];
  }

  top(n = 5) {
    if (this._topC && this._topC.n === n) return this._topC.v; // data mingguan hanya berubah di catatRonde/_putar/muat
    const v = Object.values(this.data.mingguan)
      .filter((p) => p.skor > 0)
      .sort((a, b) => b.skor - a.skor || b.benar - a.benar)
      .slice(0, n)
      .map((p) => ({ nama: p.nama, skor: p.skor }));
    this._topC = { n, v };
    return v;
  }

  /** Ringkasan untuk layar/host. */
  ringkas(n = 5) {
    return { minggu: this.data.minggu, top: this.top(n), lalu: this.data.lalu.map((x) => ({ ...x })) };
  }

  rekor() {
    const r = this.data.rekor;
    return { skorSesi: r.skorSesi || null, combo: r.combo || null, poin: r.poin || null, tercepat: { ...r.tercepat } };
  }
}
W.MB = { MathBattle: MathBattle, Peringkat: Peringkat, buatSoal: buatSoal, LEVEL_MAKS: LEVEL_MAKS, KATEGORI: KATEGORI, BAWAAN: BAWAAN, kunciMinggu: kunciMinggu };
})(typeof window !== 'undefined' ? window : globalThis);
