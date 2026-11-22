/* Hadiah, koleksi stiker, misi harian, peti kejutan, konfeti — modul terpisah untuk Latihan Matematika.
 * Tidak menyentuh mesin soal: solo.js hanya memanggil Hadiah.init / mulai / jawab / konfeti / favorit.
 * Data di localStorage ('mb_hadiah'); bila diblokir, semuanya tetap jalan tanpa menyimpan.
 * Gaya ada di style.css (kelas .lapis, .dlg, .koleksi, .misi, .konfeti). */
(function () {
  'use strict';
  var STIKER = [
    ['\uD83E\uDD8A', 'Rubah'],
    ['\uD83D\uDC31', 'Kucing'],
    ['\uD83D\uDC36', 'Anjing'],
    ['\uD83D\uDC3C', 'Panda'],
    ['\uD83D\uDC28', 'Koala'],
    ['\uD83E\uDD81', 'Singa'],
    ['\uD83D\uDC2F', 'Harimau'],
    ['\uD83D\uDC38', 'Katak'],
    ['\uD83D\uDC35', 'Monyet'],
    ['\uD83D\uDC30', 'Kelinci'],
    ['\uD83D\uDC3B', 'Beruang'],
    ['\uD83D\uDC37', 'Babi'],
    ['\uD83D\uDC2E', 'Sapi'],
    ['\uD83D\uDC14', 'Ayam'],
    ['\uD83D\uDC27', 'Penguin'],
    ['\uD83E\uDD89', 'Burung Hantu'],
    ['\uD83E\uDD84', 'Unicorn'],
    ['\uD83D\uDC32', 'Naga'],
    ['\uD83D\uDC22', 'Kura-kura'],
    ['\uD83D\uDC19', 'Gurita'],
    ['\uD83D\uDC2C', 'Lumba-lumba'],
    ['\uD83D\uDC33', 'Paus'],
    ['\uD83E\uDD8B', 'Kupu-kupu'],
    ['\uD83D\uDC1E', 'Kepik']
  ];
  var MISI = [
    { id: 'benar', teks: 'Jawab benar 10 soal', target: 10, bintang: 3 },
    { id: 'langsung', teks: 'Benar langsung 6 soal', target: 6, bintang: 3 },
    { id: 'beruntun', teks: 'Benar beruntun 4 soal', target: 4, bintang: 3 }
  ];
  var KEY = 'mb_hadiah';
  var ops = null;                         // diisi init(): { jeda, lanjut, bunyi, toast, boleh, segarkan }
  var el = function (id) { return document.getElementById(id); };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function buat(tag, cls, teks) { var n = document.createElement(tag); if (cls) n.className = cls; if (teks != null) n.textContent = teks; return n; }

  // ---------- data ----------
  var D = (function () {
    var d = null;
    try { d = JSON.parse(lsGet(KEY) || 'null'); } catch (e) {}
    d = d && typeof d === 'object' ? d : {};
    return { b: +d.b || 0, fav: typeof d.fav === 'string' ? d.fav : '', tgl: d.tgl || '', misi: d.misi || null,
             str: d.str && d.str.t ? d.str : { t: '', n: 0 }, peti: +d.peti || 0, since: +d.since || 0, ambang: +d.ambang || 0 };
  })();
  function simpan() { lsSet(KEY, JSON.stringify(D)); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function tglStr(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function hariIni() { return tglStr(new Date()); }
  function kemarin() { var d = new Date(); d.setDate(d.getDate() - 1); return tglStr(d); }
  function nomorHari() { var d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }

  // ---------- bintang -> stiker (stiker pertama 2 bintang, lalu 3, makin lama makin mahal) ----------
  function biaya(i) { return i === 0 ? 2 : 3 + Math.floor((i - 1) / 6); }
  var AMBANG = [];
  (function () { var c = 0; for (var i = 0; i < STIKER.length; i++) { c += biaya(i); AMBANG.push(c); } })();
  function terbuka(b) { var n = 0; while (n < AMBANG.length && AMBANG[n] <= b) n++; return n; }
  function progres() {
    var i = terbuka(D.b);
    if (i >= STIKER.length) return null;
    var dari = i ? AMBANG[i - 1] : 0;
    return { idx: i, sekarang: D.b - dari, perlu: AMBANG[i] - dari, sisa: AMBANG[i] - D.b };
  }
  /** Tambah bintang; hasilnya indeks stiker yang baru terbuka. */
  function tambah(n) {
    var a = terbuka(D.b), baru = [];
    D.b += n;
    for (var i = a; i < terbuka(D.b); i++) baru.push(i);
    simpan(); tampilBintang();
    return baru;
  }
  function tampilBintang() { var n = el('bintangN'); if (n) n.textContent = String(D.b); }

  // ---------- hari, misi, streak ----------
  function pastikanHari() {
    var t = hariIni();
    if (D.tgl !== t || !D.misi) { D.tgl = t; D.misi = { id: MISI[nomorHari() % MISI.length].id, p: 0, ok: false }; simpan(); }
  }
  function misiDef() { pastikanHari(); for (var i = 0; i < MISI.length; i++) if (MISI[i].id === D.misi.id) return MISI[i]; return MISI[0]; }
  function streakHari() { return D.str.t === hariIni() || D.str.t === kemarin() ? D.str.n : 0; }

  function tampilMisi() {
    var box = el('misi'); if (!box) return;
    var def = misiDef(), m = D.misi, s = streakHari();
    box.textContent = '';
    var a = buat('div', 'm1');
    a.appendChild(buat('span', '', m.ok ? '\u2705 Misi hari ini selesai!' : '\uD83C\uDFAF Misi hari ini'));
    a.appendChild(buat('b', '', m.p + '/' + def.target));
    box.appendChild(a);
    box.appendChild(buat('div', 'm2', def.teks + ' \u00B7 \u2B50+' + def.bintang));
    var bar = buat('div', 'bar'), i = document.createElement('i');
    i.style.transform = 'scaleX(' + Math.min(1, m.p / def.target) + ')';
    bar.appendChild(i); box.appendChild(bar);
    if (s >= 1) box.appendChild(buat('div', 'm3', '\uD83D\uDD25 ' + s + ' hari berturut-turut'));
  }

  // ---------- peti ----------
  function tampilPeti() {
    var b = el('petiBtn'); if (!b) return;
    b.hidden = D.peti <= 0;
    el('petiN').textContent = D.peti > 1 ? String(D.peti) : '';
  }
  function acakAmbang() { return 5 + Math.floor(Math.random() * 4); }

  // ---------- dialog (antre; permainan dijeda selama dialog terbuka) ----------
  var antre = [], dialogAda = false, koleksiAda = false, tT = 0;
  function barisBintang(n, dari) {
    var r = buat('div', 'bintang');
    for (var i = 0; i < dari; i++) r.appendChild(buat('span', i < n ? '' : 'off', '\u2B50'));
    return r;
  }
  function barProgres() {
    var p = progres(), w = buat('div', 'sprog');
    if (!p) { w.appendChild(buat('p', '', 'Koleksi lengkap! \uD83C\uDFC6')); return w; }
    var bar = buat('div', 'bar'), i = document.createElement('i');
    i.style.transform = 'scaleX(' + Math.min(1, p.sekarang / p.perlu) + ')';
    bar.appendChild(i); w.appendChild(bar);
    w.appendChild(buat('p', '', 'Tinggal ' + p.sisa + ' \u2B50 lagi untuk stiker berikutnya'));
    return w;
  }
  function bangunDialog(sp) {
    var d = el('dlg'); d.textContent = ''; d.className = 'dlg ' + sp.tipe;
    var ada = sp.baru && sp.baru.length;
    d.appendChild(buat('div', 'dikon', sp.tipe === 'peti' ? '\uD83C\uDF81' : sp.tipe === 'misi' ? '\uD83C\uDFAF' : '\uD83C\uDF89'));
    d.appendChild(buat('h2', '', sp.judul));
    if (sp.teks) d.appendChild(buat('p', '', sp.teks));
    if (sp.bintang) d.appendChild(barisBintang(sp.bintang, sp.slot || sp.bintang));
    if (ada) {
      var row = buat('div', 'sbaru');
      sp.baru.forEach(function (i) { row.appendChild(buat('span', '', STIKER[i][0])); });
      d.appendChild(row);
      d.appendChild(buat('p', 'snama', 'Stiker baru: ' + sp.baru.map(function (i) { return STIKER[i][1]; }).join(', ') + '!'));
    } else d.appendChild(barProgres());
    var b = buat('button', 'dbtn', 'Lanjut \u279C'); b.type = 'button'; b.onclick = tutupDialog;
    d.appendChild(b);
    if (ada) {
      var k = buat('button', 'dalt', 'Lihat koleksi'); k.type = 'button';
      k.onclick = function () { tutupDialog(true); bukaKoleksi(); };
      d.appendChild(k);
    }
    ops.bunyi(ada ? 'stiker' : 'bintang');
  }
  function tampilNext() {
    if (dialogAda || !antre.length || !ops) return;
    var sp = antre.shift();
    dialogAda = true;
    ops.jeda();
    bangunDialog(sp);
    el('lapis').hidden = false;
    try { el('dlg').querySelector('.dbtn').focus({ preventScroll: true }); } catch (e) {}
  }
  function tutupDialog(tahan) {
    if (!dialogAda) return;
    dialogAda = false; el('lapis').hidden = true;
    if (tahan === true) return;           // lanjut ke koleksi: permainan tetap dijeda
    if (antre.length) tampilNext(); else ops.lanjut();
  }
  function jadwal(n) {
    clearTimeout(tT);
    tT = setTimeout(function () {
      if (dialogAda || koleksiAda || !antre.length) return;
      if (!ops.boleh()) { if ((n || 0) < 40) jadwal((n || 0) + 1); return; }
      tampilNext();
    }, n ? 700 : 1300);                   // beri waktu melihat jawaban/konfeti dulu
  }

  function bukaPeti() {
    if (D.peti <= 0 || dialogAda || koleksiAda || !ops.boleh()) return;
    D.peti--;
    var r = Math.random(), n = r < 0.5 ? 1 : r < 0.85 ? 2 : 3;
    var baru = tambah(n);
    tampilPeti();
    antre.unshift({ tipe: 'peti', judul: 'Peti terbuka! +' + n + ' \u2B50', bintang: n, baru: baru });
    tampilNext();
  }

  // ---------- koleksi ----------
  function bangunKoleksi() {
    var n = terbuka(D.b), g = el('kGrid'); g.textContent = '';
    el('kJum').textContent = n + '/' + STIKER.length;
    el('kBintang').textContent = '\u2B50 ' + D.b;
    var p = progres();
    el('kBar').style.transform = 'scaleX(' + (p ? Math.min(1, p.sekarang / p.perlu) : 1) + ')';
    el('kNext').textContent = p ? 'Tinggal ' + p.sisa + ' \u2B50' : 'Lengkap! \uD83C\uDFC6';
    STIKER.forEach(function (s, i) {
      var b = buat('button', 's ' + (i < n ? 'buka' : 'kunci') + (i === n ? ' next' : '') + (D.fav === String(i) ? ' fav' : '')); b.type = 'button';
      b.appendChild(buat('span', 'e', s[0]));
      b.appendChild(buat('span', 'n', i < n ? (D.fav === String(i) ? 'Temanku' : s[1]) : '\u2B50 ' + AMBANG[i]));
      if (i < n) b.onclick = function () { D.fav = D.fav === String(i) ? '' : String(i); simpan(); bangunKoleksi(); ops.segarkan(); };
      else b.disabled = true;
      g.appendChild(b);
    });
  }
  function bukaKoleksi() {
    if (koleksiAda || !ops) return;
    if (!dialogAda && !ops.boleh()) return;
    koleksiAda = true; ops.jeda(); bangunKoleksi(); el('koleksi').hidden = false;
  }
  function tutupKoleksi() {
    if (!koleksiAda) return;
    koleksiAda = false; el('koleksi').hidden = true;
    if (antre.length) tampilNext(); else if (!dialogAda) ops.lanjut();
  }

  // ---------- konfeti (elemen kecil, hanya transform/opacity, dibuang setelah selesai) ----------
  var kTimer = 0;
  function konfeti(induk, n) {
    var w = induk.querySelector('.konfeti');
    if (!w) { w = buat('div', 'konfeti'); w.setAttribute('aria-hidden', 'true'); induk.appendChild(w); }
    w.textContent = '';
    n = Math.max(10, Math.min(n || 16, 40));
    for (var i = 0; i < n; i++) {
      var p = buat('i', 'c' + (i % 4), i % 5 === 0 ? '\u2B50' : '');
      var a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 120;
      p.style.setProperty('--x', Math.round(Math.cos(a) * r) + 'px');
      p.style.setProperty('--y', Math.round(Math.sin(a) * r - 60) + 'px');
      p.style.setProperty('--r', Math.round(Math.random() * 720 - 360) + 'deg');
      w.appendChild(p);
    }
    clearTimeout(kTimer);
    kTimer = setTimeout(function () { w.textContent = ''; }, 1100);
  }

  // ---------- jalur dari permainan ----------
  var B = { n: 0, l: 0 }, nBabak = 0;
  function mulai() {
    var t = hariIni();
    if (D.str.t !== t) D.str = { t: t, n: D.str.t === kemarin() ? D.str.n + 1 : 1 };
    pastikanHari();
    B = { n: 0, l: 0 }; nBabak = 0;
    simpan(); tampilMisi();
  }
  /** x: { benar, langsung, streak, akhirBabak } — dipanggil sekali per soal selesai (benar, salah habis kesempatan, atau dilewati). */
  function jawab(x) {
    pastikanHari();
    B.n++; if (x.langsung) B.l++;
    var m = D.misi, def = misiDef();
    if (!m.ok) {
      if (def.id === 'benar' && x.benar) m.p++;
      else if (def.id === 'langsung' && x.langsung) m.p++;
      else if (def.id === 'beruntun') m.p = Math.max(m.p, x.streak || 0);
      if (m.p >= def.target) {
        m.p = def.target; m.ok = true;
        antre.push({ tipe: 'misi', judul: 'Misi selesai!', teks: def.teks, bintang: def.bintang, baru: tambah(def.bintang) });
      }
    }
    if (x.langsung) {
      D.since++;
      if (!D.ambang) D.ambang = acakAmbang();
      if (D.since >= D.ambang) {
        D.since = 0; D.ambang = acakAmbang(); D.peti++;
        ops.toast('\uD83C\uDF81', 'Peti kejutan!', 'Ketuk \uD83C\uDF81 di atas untuk membukanya');
        tampilPeti();
      }
    }
    if (x.akhirBabak) {
      nBabak++;
      var bt = B.l >= 5 ? 3 : B.l >= 3 ? 2 : 1;
      antre.push({ tipe: 'babak', judul: 'Babak ' + nBabak + ' selesai!', teks: 'Benar langsung ' + B.l + ' dari ' + B.n + ' soal', bintang: bt, slot: 3, baru: tambah(bt) });
      B = { n: 0, l: 0 };
    }
    simpan(); tampilMisi();
    if (antre.length) jadwal();
  }

  function favorit() { var i = parseInt(D.fav, 10); return D.fav !== '' && STIKER[i] ? STIKER[i][0] : ''; }

  function init(o) {
    ops = o;
    el('koleksiBtn').onclick = bukaKoleksi;
    el('kTutup').onclick = tutupKoleksi;
    el('petiBtn').onclick = bukaPeti;
    el('lapis').addEventListener('click', function (e) { if (e.target === el('lapis')) tutupDialog(); });
    tampilBintang(); tampilPeti(); tampilMisi();
  }

  window.Hadiah = { init: init, mulai: mulai, jawab: jawab, konfeti: konfeti, favorit: favorit, tampilMisi: tampilMisi,
                    sibuk: function () { return dialogAda || koleksiAda; } };
})();
