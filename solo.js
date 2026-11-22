/* Math Battle — stand alone (satu pemain, tanpa server dan tanpa LIVE).
 * Memakai mesin aslinya (engine.js = generator + game + peringkat) di dalam browser; waktu dan penyimpanan
 * (localStorage) disuntik di sini. Yang dibuang dari versi LIVE: chat/adapter, like, gift, follow, share,
 * target bersama, tantangan tim, menu host, juara babak. Yang dipertahankan: soal per level, babak dan Super Round,
 * combo, bonus kecepatan, timer sesi, rekor pribadi, tema, suara. */
(function () {
  'use strict';
  var MB = window.MB, ID = 'me';
  var el = function (id) { return document.getElementById(id); };
  var KATEGORI = { add: 'Tambah', subtract: 'Kurang', multiply: 'Kali', divide: 'Bagi', missing: 'Angka hilang', mixed: 'Campuran', paren: 'Kurung', fpb: 'FPB', kpk: 'KPK', faktor: 'Faktor', pecahan: 'Pecahan', desimal: 'Desimal', persen: 'Persen', panjang: 'Panjang', berat: 'Berat', volume: 'Volume', waktu: 'Waktu', luas: 'Luas', keliling: 'Keliling', belanja: 'Belanja', diskon: 'Diskon', cerita: 'Soal cerita' };
  var NAMA_LEVEL = ['', 'Hitung Dasar', 'Hitung Campuran', 'FPB & KPK', 'Pecahan, Desimal & Persen', 'Satuan & Pengukuran', 'Bangun Datar', 'Bangun Ruang', 'Belanja & Diskon', 'Soal Cerita'];
  var COBA_MAKS = 3;       // kesempatan menjawab per soal
  var coba = 0, nSoal = 0, nLangsung = 0;
  var KP = !!window.__kp;   // papan angka di layar (HP/tablet): keyboard sistem tidak dipakai

  // ---------- penyimpanan (localStorage; bila diblokir browser, game tetap jalan tanpa menyimpan) ----------
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var PKEY = 'mb_peringkat';
  var rank = new MB.Peringkat({
    store: {
      muat: function () { var t = lsGet(PKEY); return t ? JSON.parse(t) : null; },
      simpan: function (o) { localStorage.setItem(PKEY, JSON.stringify(o)); }
    }
  }).muat();

  // Satu pemain: tidak ada jeda siaran (latensi) yang perlu dikeluarkan dari waktu menjawab, tidak ada tantangan tim.
  var game = new MB.MathBattle({ config: { tanpaWaktu: true, latensiMs: 0, bacaMs: 0, tantanganBonusMs: 0, juaraMs: 0, jedaMaksMs: 24 * 3600000 } });

  if (KP) el('ans').setAttribute('inputmode', 'none');
  var S = null;            // snapshot terakhir
  var lastKey = '';
  var audio = Suara.buat();
  var rekorBaru = [], bestAwal = 0;
  var hostOpen = false, autoPaused = false, stopArmed = 0, sapaSeq = 0, kartuT = 0, toastT = 0;
  var lastStep = Date.now();
  var wake = null;

  // ---------- util DOM ----------
  var memo = {};
  function T(id, v) { if (memo[id] === v) return; memo[id] = v; el(id).textContent = v; }
  function F(id, v) { if (memo['f' + id] === v) return; memo['f' + id] = v; el(id).style.transform = v; }
  function show(id, on) { var n = el(id); if (n.hidden !== !on) n.hidden = !on; }

  // Daftar hanya dibangun ulang bila isinya berubah.
  function list(ul, rows, make, kosong) {
    var k = (ul.parentNode.firstElementChild.textContent || '') + '|' + JSON.stringify(rows) + '|' + (kosong || '');
    if (ul._k === k) return;
    ul._k = k;
    ul.textContent = '';
    if (!rows.length && kosong) {
      var e = document.createElement('li'); e.className = 'empty'; e.textContent = kosong; ul.appendChild(e);
      return;
    }
    rows.forEach(function (r, i) { ul.appendChild(make(r, i)); });
  }
  function li(left, right) {
    var x = document.createElement('li'), a = document.createElement('span'), b = document.createElement('span');
    a.textContent = left; b.textContent = right;
    x.appendChild(a); x.appendChild(b);
    return x;
  }
  // Soal panjang dikecilkan sampai muat selebar kartu.
  function fitSoal(qe) {
    qe.style.fontSize = '';
    var lebar = qe.parentNode.clientWidth - 36;
    if (lebar > 0 && qe.scrollWidth > lebar) {
      var fs = parseFloat(getComputedStyle(qe).fontSize) * (lebar / qe.scrollWidth);
      qe.style.fontSize = Math.max(22, Math.floor(fs)) + 'px';
    }
  }
  function stageSet(k, v) { var n = el('stage'); if (n.getAttribute(k) !== v) n.setAttribute(k, v); }
  // Maskot: satu emoji sesuai keadaan (hanya teks, tanpa animasi berat).
  function maskot(s, f) {
    var st = s.status, e = st === 'idle' ? (s.statistik ? '\uD83C\uDFC6' : '\uD83E\uDD8A')
      : st === 'ready' ? '\uD83D\uDE80' : st === 'reveal' ? (!f ? '\uD83D\uDE0A' : f.ok ? '\uD83E\uDD73' : '\uD83D\uDE05') : '\uD83E\uDD14';
    var fv = window.Hadiah ? Hadiah.favorit() : '';
    if (fv && (st === 'ready' || (st === 'idle' && !s.statistik))) e = fv;
    T('mascot', e);
  }
  function pop(id) { var n = el(id); n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); }
    function hinfo(t, bad) {
    var n = el('toast'); n.textContent = t; n.className = 'toast' + (bad ? ' gagal' : '');
    n.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { n.hidden = true; }, 2800);
  }
  function nama() {
    var v = (el('hNama').value || '').trim();
    return Array.from(v || 'Pemain').slice(0, 20).join('');
  }

  // ---------- teks ----------
  function textRekor(r) {
    var v = r.jenis === 'combo' ? '\u00D7' + r.nilai : r.nilai;
    var nm = { combo: 'beruntun terbaik', poin: 'jawaban terbaik' }[r.jenis] || 'rekor';
    return 'Rekor pribadi baru, ' + nm + ': ' + v + '!';
  }
  function textStat(t) { return t.ronde + ' soal, ' + nLangsung + ' benar langsung.'; }

  // ---------- jalur data: engine -> snapshot ----------
  // Hasil ronde yang baru ditutup dicatat ke peringkat/rekor pribadi (dipanggil setelah tick/stop).
  function flush() {
    var h = game.ambilHasilRonde();
    if (!h) return;
    var r = rank.catatRonde(h);
    rekorBaru = r.rekorBaru || [];
  }
  function snap() {
    var s = game.snapshot();
    // "Skor sesi" memecahkan rekor setiap ronde setelah terlampaui: diumumkan sekali di akhir sesi, bukan tiap ronde.
    var rb = s.status === 'reveal' ? rekorBaru.filter(function (r) { return r.jenis !== 'skorSesi' && r.jenis !== 'tercepat'; }) : [];
    if (rb.length) s.rekorBaru = rb;
    return s;
  }
  function refresh() { render(snap()); }

  // ---------- render ----------
  function render(s) {
    var prevS = S;
    S = s;
    var st = s.status;
    var idle = st === 'idle', ready = st === 'ready', q = st === 'question', rev = st === 'reveal';
    var key = st + ':' + s.round;
    var fresh = key !== lastKey; lastKey = key;
        el('stage').setAttribute('data-state', st);
    el('stage').setAttribute('data-paused', s.paused ? '1' : '0');
    show('jeda', !!s.paused);

    T('chipRound', s.babak ? 'Ronde ' + s.babak.pos + '/' + s.babak.dari + (s.superRonde ? ' \u26A1' : '') : 'Ronde \u2013');
    var cr = el('chipRound'), sr = !!s.superRonde;
    if (cr.classList.contains('c-sr') !== sr) cr.classList.toggle('c-sr', sr);
    show('tabMisi', sr && !idle); if (sr) T('tabMisi', 'Super \u00D7' + (s.superRondeMult || 2));
    T('chipLevel', s.level > 0 ? 'Level ' + s.level : 'Level \u2013');
    show('tabCat', !!s.kategori && !idle); if (s.kategori) T('tabCat', KATEGORI[s.kategori] || 'Math');

    var mine = game.skor.get(ID), score = mine ? mine.skor : 0;

    // Judul dan keterangan kartu
    show('title', idle || ready);
    T('title', idle ? (s.statistik ? 'Kerja bagus!' : 'Siap?') : 'Bersiap!');
    var rek = rev && s.rekorBaru && s.rekorBaru.length ? s.rekorBaru[0] : null;
    show('sub', idle || ready || !!rek);
    var subCls = rek ? 'rekor' : ''; if (memo.subCls !== subCls) { memo.subCls = subCls; el('sub').className = subCls; }
    T('sub', rek ? textRekor(rek)
      : idle ? (s.statistik ? 'Skor akhir ' + score + ' \u00B7 ' + textStat(s.statistik) + (bestAwal > 0 && score > bestAwal ? ' Rekor pribadi baru!' : '') : 'Ketik jawabannya. Pelan-pelan saja, yang penting seru!')
      : 'Level ' + s.level + ' \u00B7 ' + (NAMA_LEVEL[s.level] || '') + (s.babak ? ' \u00B7 Ronde ' + s.babak.pos + '/' + s.babak.dari : ''));

    // Soal
    show('q', q || rev);
    if (!(q || rev)) show('qcap', false);
    if (q || rev) {
      var qe = el('q');
      var bagi = s.soal.split('|'), cap = bagi.length > 1 ? bagi[0] : '', ex = bagi[bagi.length - 1];
      T('qcap', cap); show('qcap', !!cap);
      stageSet('data-cerita', cap.length > 40 ? '1' : '0'); // soal cerita: kalimat panjang di atas, jawaban kecil di bawah
      var teksSoal = (ex.indexOf('?') >= 0 ? ex : ex + ' = ?').replace(/ - /g, ' \u2212 ');
      if (qe.textContent !== teksSoal) {
        qe.textContent = '';
        var tq = teksSoal.lastIndexOf('?');
        if (tq >= 0 && tq === teksSoal.length - 1) {
          qe.appendChild(document.createTextNode(teksSoal.slice(0, tq)));
          var sp = document.createElement('span'); sp.className = 'tanya'; sp.textContent = '?'; qe.appendChild(sp);
        } else qe.textContent = teksSoal;
        fitSoal(qe);
      }
    }

    // Kotak digit: kosong saat soal berjalan (terisi sambil mengetik), berisi jawaban saat reveal
    var bx = el('boxes');
    show('boxes', q || rev);
    var inp = el('ans');
    if (q || rev) {
      var txt = rev ? String(s.jawaban) : '';
      if (fresh || bx.childNodes.length !== s.digit) {
        bx.textContent = '';
        for (var i = 0; i < s.digit; i++) {
          var b = document.createElement('b'); b.textContent = rev ? txt.charAt(i) : '';
          bx.appendChild(b);
        }
      }
      bx.className = 'boxes' + (rev ? ' reveal' : '');
    }

    // Hasil jawaban (baru terbuka saat reveal)
    show('hasil', rev);
    if (!q) show('petunjuk', false);
    if (!rev) stageSet('data-hasil', '');
    maskot(s, rev ? (s.feed || [])[0] : null);
    if (rev) {
      var f = (s.feed || [])[0];
      T('hasil', !f ? 'Dilewati. Lanjut ya!' : f.ok ? '\uD83C\uDF89 Benar! +' + f.poin + (f.combo > 1 ? '  \u00D7' + f.combo + ' beruntun' : '') : '\uD83D\uDCAA Belum tepat, tidak apa-apa. Semangat!');
      if (fresh && f && f.ok) { var kb = mine ? Math.min(game.cfg.comboMaks, mine.streak) : 0; Hadiah.konfeti(el('card'), 14 + kb * 4); if (kb >= 2) audio.bunyi('kombo', kb); }
      var hcls = 'hasil ' + (f && f.ok ? 'ok' : 'bad');
      stageSet('data-hasil', f && f.ok ? 'ok' : 'bad');
      if (memo.hcls !== hcls) { memo.hcls = hcls; el('hasil').className = hcls; }
    }

    // Kolom jawaban: tetap tampil selama sesi supaya papan ketik tidak menutup/membuka tiap soal
    show('ansForm', !idle);
    show('skipBtn', q && !s.paused);
    show('btnMain', idle);
    T('btnMain', s.statistik ? 'Main lagi' : 'Main');
    if (inp.readOnly !== !q) inp.readOnly = !q;
    var ph = q ? 'Ketik jawaban' : ready ? 'Bersiap\u2026' : 'Soal berikutnya\u2026';
    if (memo.ph !== ph) { memo.ph = ph; inp.placeholder = ph; }
    var ok = el('okBtn'); if (ok.disabled !== !q) ok.disabled = !q;
    if (fresh && q) {
      inp.value = ''; inp.maxLength = s.digit; coba = 0; show('petunjuk', false);
      if (!hostOpen && !s.paused) focusJawab();
    } else if (fresh && !q) inp.value = '';
    mirror();

    // Skor, combo, kemajuan babak
    T('scoreTxt', 'Skor ' + score);
    var cb = mine ? Math.min(game.cfg.comboMaks, mine.streak) : 0;
    T('comboTxt', cb >= 2 ? '\uD83D\uDD25\u00D7' + cb : '');
    var frac = 0;
    if (s.babak && !idle) frac = Math.min(1, (rev ? s.babak.pos : s.babak.pos - 1) / s.babak.dari);
    F('stageFill', 'scaleX(' + frac + ')');

    // Panel: sesi ini dan rekor pribadi
    if (idle) { // daftar skor hanya tampil di layar awal/akhir: saat bermain tidak digambar
    var stt = game.statistik(), jum = game.stat.benar + game.stat.salah;
    var rows = [
      ['Skor', String(score)],
      ['Benar langsung', nSoal ? nLangsung + '/' + nSoal : '\u2013'],
      ['Beruntun terbaik', stt.comboTertinggi ? '\u00D7' + stt.comboTertinggi.nilai : '\u2013']
    ];
    list(el('sesi'), rows, function (r) { return li(r[0], r[1]); });
    var k = rank.rekor(), rr = [];
    if (k.skorSesi) rr.push(['Skor sesi terbaik', String(k.skorSesi.nilai)]);
    if (k.combo) rr.push(['Beruntun terbaik', '\u00D7' + k.combo.nilai]);
    if (k.poin) rr.push(['Jawaban terbaik', String(k.poin.nilai)]);
    list(el('rekor'), rr, function (r) { return li(r[0], r[1]); }, 'Belum ada rekor');
    }

    sapaProses(s);
    if (fresh && (q || ready)) pop('card');
    // 'waktu' disaring: di mode satu pemain endsAt hanya bergeser karena jeda, bukan bonus waktu.
    audio.proses(Suara.deteksi(prevS, s).filter(function (x) { return x !== 'waktu'; }));
    audio.fase(st, 1);
    hostTick();
  }

  // Kotak digit mengikuti ketikan.
  function mirror() {
    if (!S || S.status !== 'question') return;
    var bs = el('boxes').children, v = el('ans').value;
    for (var i = 0; i < bs.length; i++) {
      var c = v.charAt(i); if (bs[i].textContent !== c) bs[i].textContent = c;
      var kls = c ? 'isi' : (i === v.length ? 'on' : '');
      if (bs[i].className !== kls) bs[i].className = kls;
    }
  }
  function focusJawab() { if (KP) return; try { el('ans').focus({ preventScroll: true }); } catch (e) {} }

  // Ucapan selamat datang kembali (hari baru) dari catatan kehadiran.
  function sapaProses(s) {
    (s.sapa || []).forEach(function (x) {
      if (x.seq <= sapaSeq) return;
      sapaSeq = x.seq;
      if (x.jenis !== 'kembali') return;
      var av = el('gaAv'); av.textContent = '';
      var sp = document.createElement('span'); sp.className = 'av c1'; sp.textContent = '\uD83D\uDC4B'; av.appendChild(sp);
      el('gaTx').textContent = 'Selamat datang kembali, ' + x.nama + '!';
      el('gaSub').textContent = x.streak >= 2 ? '\uD83D\uDD25 ' + x.streak + ' hari berturut-turut' : 'Hari ke-' + x.total + ' belajar bersama';
      show('gcard', true);
      clearTimeout(kartuT); kartuT = setTimeout(function () { show('gcard', false); }, 3600);
    });
  }

  // ---------- jalan: satu detak 200 ms (tidak ada timer yang perlu digambar tiap detik) ----------
  function step() {
    lastStep = Date.now();
    var ch = game.tick();
    flush();
    if (ch) refresh();
  }

  // ---------- jawab ----------
  el('ans').addEventListener('input', function () { this.value = this.value.replace(/\D/g, ''); mirror(); });
  el('ansForm').addEventListener('submit', function (e) { e.preventDefault(); kirim(); });
  function kirim() {
    var v = el('ans').value.replace(/\D/g, '');
    if (!v || game.status !== 'question' || game.paused) return;
    var benar = Number(v) === game.q.jawab;
    if (!benar && coba < COBA_MAKS - 1) { // salah: boleh coba lagi, dengan petunjuk (tanpa membuka jawaban)
      coba++;
      var sisa = COBA_MAKS - coba;
      var pt = el('petunjuk');
      pt.textContent = (Number(v) > game.q.jawab ? 'Terlalu besar. ' : 'Terlalu kecil. ') + 'Coba lagi! ' + '\uD83D\uDC9B'.repeat(sisa);
      show('petunjuk', true);
      el('ans').value = ''; mirror();
      var f = KP ? el('boxes') : el('ansForm'); f.classList.remove('goyang'); void f.offsetWidth; f.classList.add('goyang');
      focusJawab();
      return;
    }
    var r = game.handleComment({ userId: ID, username: nama(), text: v, pengali: coba === 0 ? 1 : 0.5 });
    if (r.ok) {
      nSoal++; if (benar && coba === 0) nLangsung++;
      var m2 = game.skor.get(ID);
      Hadiah.jawab({ benar: benar, langsung: benar && coba === 0, streak: m2 ? m2.streak : 0, akhirBabak: !!(S && S.babak && S.babak.pos >= S.babak.dari) });
      game.akhirAt = game.now(); step(); // soal selesai: buka jawaban
    }
  }

  // Papan angka di layar (+ keyboard fisik bila ada). Hanya aktif saat soal berjalan.
  function tekan(k) {
    if (!S || S.status !== 'question' || game.paused) return;
    var a = el('ans');
    if (k === 'ok') { kirim(); return; }
    if (k === 'del') a.value = a.value.slice(0, -1);
    else if (a.value.length < (S.digit || 6)) a.value += k;
    else return;
    audio.bunyi('jawab');
    mirror();
  }
  el('pad').addEventListener('pointerdown', function (e) {
    var b = e.target.closest ? e.target.closest('.k') : null;
    if (!b) return;
    e.preventDefault();
    tekan(b.getAttribute('data-k'));
  });
  el('pad').addEventListener('click', function (e) { e.preventDefault(); }); // cegah klik ganda/zoom
  if (KP) document.addEventListener('keydown', function (e) {
    if (hostOpen || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^\d$/.test(e.key)) tekan(e.key);
    else if (e.key === 'Backspace') tekan('del');
    else if (e.key === 'Enter') tekan('ok');
    else return;
    e.preventDefault();
  });

  // Lewati soal (tanpa timer, anak tidak boleh terjebak di satu soal).
  el('skipBtn').onclick = function () {
    if (game.status !== 'question' || game.paused) return;
    nSoal++;
    Hadiah.jawab({ benar: false, langsung: false, streak: 0, akhirBabak: !!(S && S.babak && S.babak.pos >= S.babak.dari) });
    game.akhirAt = game.now(); step();
  };

  // ---------- mulai / jeda / berhenti ----------
  function pause() { if (game.status !== 'idle' && !game.paused) { game.jeda(); refresh(); } }
  function resume() { if (game.paused) { game.lanjut(); refresh(); } }

  function bukaHost(on) {
    if (hostOpen === on) return;
    hostOpen = on; show('host', on);
    if (on) { pause(); hostTick(); } else if (!document.hidden && !Hadiah.sibuk()) { resume(); if (S && S.status === 'question') focusJawab(); }
  }
  function hostTick() {
    if (!hostOpen) return;
    var st = S ? S.status : 'idle';
    el('hStatus').textContent = st === 'idle' ? 'Siap main' : 'Dijeda \u00B7 soal ke-' + S.round + ' \u00B7 Level ' + S.level;
    el('hMulai').textContent = st === 'idle' ? 'Main' : 'Ulangi';
    el('hStop').disabled = st === 'idle';
  }

  function mulai() {
    var lo = +el('hLevelMin').value, hi = +el('hLevelMaks').value;
    if (lo > hi) { if (!hostOpen) bukaHost(true); hinfo('Level "Dari" tidak boleh lebih tinggi dari "Sampai".', true); return; }
    lsSet('mb_nama', nama()); lsSet('mb_lvmin', String(lo)); lsSet('mb_lvmaks', String(hi));
    var k0 = rank.rekor(); bestAwal = k0.skorSesi ? k0.skorSesi.nilai : 0;
    sapaSeq = 0; rekorBaru = []; stopArmed = 0; autoPaused = false; coba = 0; nSoal = 0; nLangsung = 0;
    Hadiah.mulai();
    game.start({ level: lo, levelMaks: hi, sesiMs: 0 }); // 0 = tanpa batas waktu sesi
    var h = rank.catatHadir(ID, nama());
    game.sambut({ userId: ID, username: nama(), kembali: h.kembali, streak: h.streak, total: h.total });
    lastStep = Date.now();
    hostOpen = false; show('host', false);
    refresh();
    audio.buka();
    jagaNyala();
    focusJawab(); // masih di dalam ketukan pengguna: papan ketik angka langsung terbuka di HP
  }
  el('btnMain').onclick = mulai;
  el('hMulai').onclick = mulai;
  el('gear').onclick = function () { bukaHost(!hostOpen); };
  el('hTutup').onclick = function () { bukaHost(false); };
  el('hStop').onclick = function () {
    // Salah ketuk tidak boleh mengakhiri sesi: perlu ketuk dua kali dalam 3 detik.
    var t = Date.now(), b = el('hStop');
    if (t - stopArmed > 3000) { stopArmed = t; b.textContent = 'Yakin? Ketuk lagi'; hinfo('Ketuk Berhenti sekali lagi dalam 3 detik untuk mengakhiri sesi.'); setTimeout(function () { b.textContent = 'Berhenti'; }, 3000); return; }
    stopArmed = 0; b.textContent = 'Berhenti';
    game.stop(); flush(); hostOpen = false; show('host', false); refresh();
  };

  // Tab disembunyikan = jeda otomatis; kembali = lanjut (kecuali menu sedang terbuka).
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (game.status !== 'idle' && !game.paused) { autoPaused = true; pause(); } }
    else {
      jagaNyala();
      if (autoPaused) { autoPaused = false; if (!hostOpen && !Hadiah.sibuk()) resume(); }
    }
  });

  // Layar tetap menyala selama bermain.
  function jagaNyala() {
    if (wake || !('wakeLock' in navigator)) return;
    try {
      navigator.wakeLock.request('screen').then(function (l) {
        wake = l; l.addEventListener('release', function () { wake = null; });
      }).catch(function () {});
    } catch (e) {}
  }

  // ---------- Tema warna ----------
  var TEMA = [['ceria', 'Cerah'], ['teal', 'Tosca'], ['night', 'Malam'], ['sunset', 'Senja'], ['ocean', 'Laut'], ['paper', 'Kertas']];
  var SWATCH = { ceria: ['#8fd8ff', '#ff8a1f'], teal: ['#0d3b3c', '#ff8a1f'], night: ['#2b1c78', '#ff6fa5'], sunset: ['#4a1626', '#ff7a45'], ocean: ['#0a2a4a', '#ff9a3d'], paper: ['#dff0ea', '#ff8a1f'] };
  function pasangTema(t, simpan) {
    var TT = window.__tema.daftar;
    if (!TT[t]) return;
    window.__tema.aktif = t;
    if (t === 'ceria') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', TT[t]);
    if (simpan) lsSet('mb_tema', t);
    var bs = el('hTema').children, i;
    for (i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].getAttribute('data-t') === t ? 'true' : 'false');
  }
  TEMA.forEach(function (x) {
    var b = document.createElement('button'), sw = document.createElement('i');
    b.setAttribute('data-t', x[0]); b.type = 'button';
    sw.style.background = 'linear-gradient(90deg,' + SWATCH[x[0]][0] + ' 60%,' + SWATCH[x[0]][1] + ' 60%)';
    b.appendChild(sw); b.appendChild(document.createTextNode(x[1]));
    b.onclick = function () { pasangTema(x[0], true); hinfo('Tema: ' + x[1]); };
    el('hTema').appendChild(b);
  });
  pasangTema(window.__tema.aktif, false);

  // ---------- Suara ----------
  var SUARA_KEY = 'mb_suara';
  var setSuara = { efek: true, musik: true, vEfek: 0.8, vMusik: 0.35 };
  try {
    var sv = JSON.parse(lsGet(SUARA_KEY) || 'null');
    if (sv) Object.keys(setSuara).forEach(function (k) { if (typeof sv[k] === typeof setSuara[k]) setSuara[k] = sv[k]; });
  } catch (e) {}
  function tampilSuara() {
    el('sEfek').textContent = 'Efek: ' + (setSuara.efek ? 'NYALA' : 'MATI'); el('sEfek').setAttribute('aria-pressed', setSuara.efek ? 'true' : 'false');
    el('sMusik').textContent = 'Musik: ' + (setSuara.musik ? 'NYALA' : 'MATI'); el('sMusik').setAttribute('aria-pressed', setSuara.musik ? 'true' : 'false');
    el('sVE').value = Math.round(setSuara.vEfek * 100); el('sVM').value = Math.round(setSuara.vMusik * 100);
    el('sInfo').textContent = audio.info();
  }
  function ubahSuara() { lsSet(SUARA_KEY, JSON.stringify(setSuara)); audio.setelan(setSuara); tampilSuara(); }
  audio.setelan(setSuara);
  el('sEfek').onclick = function () { setSuara.efek = !setSuara.efek; ubahSuara(); };
  el('sMusik').onclick = function () { setSuara.musik = !setSuara.musik; ubahSuara(); };
  el('sVE').oninput = function () { setSuara.vEfek = this.value / 100; ubahSuara(); };
  el('sVM').oninput = function () { setSuara.vMusik = this.value / 100; ubahSuara(); };
  el('sVE').onchange = function () { audio.bunyi('reveal'); };
  var COBA = [['sesiMulai', 'Mulai'], ['reveal', 'Buka'], ['juara', 'Benar'], ['kosong', 'Salah'], ['rekor', 'Rekor'], ['naik', 'Naik level'], ['bintang', 'Bintang'], ['stiker', 'Stiker']];
  COBA.forEach(function (x) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = x[1];
    b.onclick = function () { audio.buka().then(function () { audio.bunyi(x[0]); tampilSuara(); }); };
    el('sCoba').appendChild(b);
  });
  // Browser menolak suara sebelum ada gesture: ketukan pertama di mana pun membukanya.
  var GESTUR = ['pointerup', 'click', 'keydown'];
  function bukaSuara() {
    audio.buka().then(function (ok) {
      if (ok) GESTUR.forEach(function (g) { document.removeEventListener(g, bukaSuara, true); });
      tampilSuara();
    });
  }
  GESTUR.forEach(function (g) { document.addEventListener(g, bukaSuara, true); });
  tampilSuara();

  // ---------- Hadiah (hadiah.js): dialog menjeda permainan, toast memakai kartu sapaan ----------
  function hadiahToast(ikon, tx, sub) {
    var av = el('gaAv'); av.textContent = '';
    var sp = document.createElement('span'); sp.className = 'av c1'; sp.textContent = ikon; av.appendChild(sp);
    el('gaTx').textContent = tx; el('gaSub').textContent = sub;
    show('gcard', true);
    clearTimeout(kartuT); kartuT = setTimeout(function () { show('gcard', false); }, 3600);
  }
  Hadiah.init({
    jeda: pause, lanjut: resume, toast: hadiahToast, segarkan: refresh,
    boleh: function () { return !hostOpen; },
    bunyi: function (n, a) { audio.bunyi(n, a); }
  });

  // ---------- Pengaturan tersimpan ----------
  (function () {
    var n = lsGet('mb_nama'); if (n) el('hNama').value = n;
    var a = lsGet('mb_lvmin'), b = lsGet('mb_lvmaks');
    if (/^[1-9]$/.test(a)) el('hLevelMin').value = a;
    if (/^[1-9]$/.test(b)) el('hLevelMaks').value = b;
  })();

  refresh();
  setInterval(step, 200);
})();
