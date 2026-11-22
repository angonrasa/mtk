/* Math Battle — suara. Web Audio prosedural: tanpa berkas audio, tanpa unduhan, tanpa dependensi.
 *
 *   Suara.deteksi(snapshotLama, snapshotBaru) -> ['mulai', 'jawab', ...]   (murni; dites di Node)
 *   var a = Suara.buat();  a.buka();  a.proses(daftarEvent);  a.fase(status, intensitas);  a.bunyi(nama, arg);
 *
 * Aturan ringan (blueprint §14–15): satu AudioContext; tiap bunyi = beberapa osilator pendek yang berhenti sendiri;
 * jumlah suara serentak dibatasi; musik dijadwalkan sedikit demi sedikit (±4 kali/dtk, tanpa derau) dan MATI total saat sesi berhenti.
 */
(function (root) {
  'use strict';

  // ---------- 1. Event dari dua snapshot ----------
  var jml = function (x) { return x && x.n ? x.n : 0; };

  /** Bandingkan snapshot lama & baru, hasilkan nama bunyi yang perlu dimainkan (urut). Snapshot pertama (lama = null) senyap. */
  function deteksi(p, c) {
    var ev = [];
    if (!p || !c) return ev;
    var ps = p.status, cs = c.status;
    var ulang = c.round < p.round; // host menekan "Ulang sesi" saat sesi berjalan

    if (ps === 'idle' && cs !== 'idle') ev.push('sesiMulai');
    else if (ps !== 'idle' && cs === 'idle') ev.push('sesiSelesai');
    else if (ulang) ev.push('sesiMulai');
    else if (cs !== ps || c.round !== p.round) {
      if (cs === 'ready') ev.push(p.level > 0 && c.level > p.level ? 'naik' : 'siap');
      else if (cs === 'question') ev.push('mulai');
      else if (cs === 'reveal') {
        ev.push('reveal');
        ev.push(c.pemenang && c.pemenang.length ? 'juara' : 'kosong');
        if (c.rekorBaru && c.rekorBaru.length) ev.push('rekor');
      }
    } else if (cs === 'question') {
      if ((c.answered || 0) > (p.answered || 0)) ev.push('jawab');
      if (c.endsAt - p.endsAt > 500) ev.push('waktu'); // endsAt hanya maju bila ada bonus waktu (like/follow)
    } else if (cs === 'reveal' && c.rekorBaru && c.rekorBaru.length && !(p.rekorBaru && p.rekorBaru.length)) {
      ev.push('rekor');
    }

    if (ps !== 'idle' && cs !== 'idle' && !ulang) {
      var g = c.goal || {}, pg = p.goal || {}, gift = jml(g.gift) !== jml(pg.gift);
      if (!p.superAktif && c.superAktif) { ev.push('super'); gift = false; } // gift selalu memicu Super: cukup satu bunyi
      else if (p.superAktif && !c.superAktif) ev.push('superSelesai');
      if (gift) ev.push('gift');
      if (jml(g.follow) !== jml(pg.follow)) ev.push('follow');
    }
    return ev;
  }

  // ---------- 2. Mesin audio ----------
  var MAKS_SUARA = 16;                       // batas osilator serentak
  var JEDA = { jawab: 0.09, gift: 0.2, follow: 0.2, waktu: 0.4, detik: 0.2 }; // jeda minimum per bunyi (detik)
  var DUCK = { juara: 0.9, rekor: 1.6, super: 0.9, sesiMulai: 1.0, sesiSelesai: 1.2, gift: 0.5 }; // musik merunduk selama bunyi penting (detik)
  var NOTA = function (arr, t, jarak, fn) { arr.forEach(function (f, i) { fn(f, t + i * jarak, i); }); };

  function buat(opsi) {
    opsi = opsi || {};
    var AC = opsi.ctx ? null : (root.AudioContext || root.webkitAudioContext);
    var ac = opsi.ctx || null;
    var langsung = !!opsi.langsung;          // konteks offline (uji): tanpa aturan gesture, tanpa timer
    var set = { efek: true, musik: true, vEfek: 0.8, vMusik: 0.35 };
    var bE = null, bM = null, noise = null;
    var aktif = 0, terakhir = {};
    var fT = 'idle', iT = 0;                 // fase & intensitas terakhir (dipakai ulang setelah suara terbuka)
    var jam = null, matiJam = null, nextT = 0, idx = 0, intens = 0;

    function siap() {
      if (bE) return true;
      if (!ac) { if (!AC) return false; ac = new AC(); }
      var kp = ac.createDynamicsCompressor();  // pembatas: jumlah banyak bunyi tidak memecah
      kp.threshold.value = -14; kp.knee.value = 12; kp.ratio.value = 6; kp.attack.value = 0.003; kp.release.value = 0.2;
      var m = ac.createGain();
      bE = ac.createGain(); bM = ac.createGain();
      bE.connect(m); bM.connect(m); m.connect(kp); kp.connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      var d = noise.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      terapkan(true);
      return true;
    }
    var jalan = function () { return !!bE && (langsung || ac.state === 'running'); };
    var gE = function () { return set.efek ? set.vEfek * set.vEfek * 1.8 : 0; };
    var gM = function () { return set.musik ? set.vMusik * 0.7 : 0; };
    function terapkan(cepat) {
      if (!bE) return;
      var t = ac.currentTime, k = cepat ? 0 : 0.05;
      bE.gain.cancelScheduledValues(t); bE.gain.setTargetAtTime(gE(), t, k || 0.001);
      bM.gain.cancelScheduledValues(t); bM.gain.setTargetAtTime(gM(), t, k || 0.001);
    }

    // --- primitif ---
    function nada(f, t, dur, o) {
      if (!langsung && aktif >= MAKS_SUARA) return; // offline: semua bunyi dijadwalkan sekaligus, pembatas tidak berlaku
      o = o || {};
      var osc = ac.createOscillator(), g = ac.createGain(), v = o.vol == null ? 0.2 : o.vol, atk = o.atk || 0.005;
      osc.type = o.tipe || 'sine';
      osc.frequency.setValueAtTime(f, t);
      if (o.ke) osc.frequency.exponentialRampToValueAtTime(o.ke, t + (o.luncur || dur));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + atk);
      if (o.tahan) { g.gain.setValueAtTime(v, t + Math.max(atk, dur - (o.rel || 0.3))); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
      else g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(o.bus || bE);
      osc.start(t); osc.stop(t + dur + 0.03);
      aktif++;
      osc.onended = function () { aktif--; g.disconnect(); };
    }
    function derau(t, dur, o) {
      if (!langsung && aktif >= MAKS_SUARA) return;
      o = o || {};
      var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), v = o.vol == null ? 0.1 : o.vol;
      s.buffer = noise; f.type = 'highpass'; f.frequency.value = o.f || 6000;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(o.bus || bE);
      s.start(t); s.stop(t + dur + 0.02);
      aktif++;
      s.onended = function () { aktif--; g.disconnect(); };
    }
    function kick(t, v) { nada(140, t, 0.14, { ke: 45, vol: v, bus: bM }); }

    // --- efek per event ---
    var SFX = {
      siap: function (t) { nada(659.25, t, 0.14, { vol: 0.14 }); nada(783.99, t + 0.09, 0.2, { vol: 0.14 }); },
      mulai: function (t) { nada(330, t, 0.28, { tipe: 'triangle', ke: 880, vol: 0.2 }); nada(880, t + 0.2, 0.22, { vol: 0.16 }); },
      detik: function (t, sisa) { var u = sisa <= 3; nada(u ? 1500 : 1000, t, 0.05, { vol: u ? 0.2 : 0.13 }); },
      jawab: function (t) { var f = 520 + Math.random() * 380; nada(f, t, 0.09, { ke: f * 1.6, vol: 0.07 }); },
      reveal: function (t) { NOTA([523.25, 659.25, 783.99, 1046.5], t, 0.07, function (f, tt) { nada(f, tt, 0.35, { tipe: 'triangle', vol: 0.17 }); }); },
      juara: function (t) { NOTA([783.99, 987.77, 1174.66], t + 0.35, 0.13, function (f, tt) { nada(f, tt, 0.4, { vol: 0.17 }); nada(f * 2, tt, 0.25, { vol: 0.05 }); }); },
      kosong: function (t) { nada(220, t + 0.3, 0.35, { tipe: 'triangle', ke: 150, vol: 0.16 }); },
      waktu: function (t) { nada(988, t, 0.08, { tipe: 'square', vol: 0.07 }); nada(1319, t + 0.08, 0.18, { tipe: 'square', vol: 0.07 }); },
      gift: function (t) { NOTA([1046.5, 1318.5, 1568, 2093, 2637], t, 0.055, function (f, tt) { nada(f, tt, 0.3, { vol: 0.12 }); }); derau(t, 0.3, { f: 7000, vol: 0.05 }); },
      follow: function (t) { nada(880, t, 0.1, { tipe: 'triangle', vol: 0.15 }); nada(1318.5, t + 0.09, 0.22, { tipe: 'triangle', vol: 0.15 }); },
      super: function (t) {
        nada(220, t, 0.55, { tipe: 'sawtooth', ke: 1320, luncur: 0.5, vol: 0.1 });
        [523.25, 659.25, 783.99].forEach(function (f) { nada(f, t + 0.5, 0.5, { tipe: 'square', vol: 0.06 }); });
      },
      superSelesai: function (t) { nada(660, t, 0.3, { tipe: 'triangle', ke: 330, vol: 0.1 }); },
      rekor: function (t) {
        NOTA([523.25, 659.25, 783.99, 1046.5, 1318.5], t, 0.1, function (f, tt, i) { nada(f, tt, i === 4 ? 0.9 : 0.3, { tipe: 'triangle', vol: 0.17 }); nada(f / 2, tt, 0.3, { vol: 0.06 }); });
      },
      kombo: function (t, n) { var k = Math.min(Math.max(n || 2, 2), 6), f = 523.25 * Math.pow(1.0595, (k - 2) * 2); NOTA([f, f * 1.25, f * 1.5], t + 0.95, 0.07, function (fr, tt) { nada(fr, tt, 0.18, { tipe: 'triangle', vol: 0.12 }); }); },
      bintang: function (t) { NOTA([1046.5, 1318.5, 1568], t, 0.08, function (f, tt) { nada(f, tt, 0.25, { vol: 0.13 }); }); },
      stiker: function (t) { NOTA([523.25, 659.25, 783.99, 1046.5, 1318.5], t, 0.1, function (f, tt) { nada(f, tt, 0.4, { tipe: 'triangle', vol: 0.16 }); nada(f * 2, tt, 0.25, { vol: 0.04 }); }); },
      naik: function (t) { NOTA([523.25, 587.33, 659.25, 783.99, 880, 1046.5], t, 0.06, function (f, tt) { nada(f, tt, 0.18, { tipe: 'triangle', vol: 0.14 }); }); },
      sesiMulai: function (t) { NOTA([392, 523.25, 659.25, 783.99], t, 0.12, function (f, tt, i) { nada(f, tt, i === 3 ? 0.5 : 0.18, { tipe: 'triangle', vol: 0.17 }); }); },
      sesiSelesai: function (t) { NOTA([783.99, 659.25, 523.25, 392], t, 0.16, function (f, tt) { nada(f, tt, 0.4, { tipe: 'triangle', vol: 0.15 }); }); },
    };

    function duck(dur) {
      var t = ac.currentTime;
      bM.gain.cancelScheduledValues(t);
      bM.gain.setTargetAtTime(gM() * 0.35, t, 0.03);
      bM.gain.setTargetAtTime(gM(), t + dur, 0.25);
    }
    function bunyi(nama, arg) {
      if (!set.efek || !jalan() || !SFX[nama]) return;
      var now = ac.currentTime;
      if (now - (terakhir[nama] === undefined ? -9 : terakhir[nama]) < (JEDA[nama] || 0)) return;
      terakhir[nama] = now;
      SFX[nama](now + 0.01, arg);
      if (DUCK[nama] && set.musik) duck(DUCK[nama]);
    }
    function proses(daftar) { for (var i = 0; i < daftar.length; i++) bunyi(daftar[i]); }

    // --- musik: 4 bar Am–F–C–G, 100 bpm, tiga tingkat intensitas ---
    var S16 = 60 / 100 / 4;
    var AKOR = [
      { b: 110.00, n: [220.00, 261.63, 329.63, 440.00] },
      { b: 87.31, n: [174.61, 220.00, 261.63, 349.23] },
      { b: 130.81, n: [261.63, 329.63, 392.00, 523.25] },
      { b: 98.00, n: [196.00, 246.94, 293.66, 392.00] },
    ];
    var URUT = [0, 1, 2, 3, 2, 1, 2, 1];
    function langkah(i, t) {
      var s = i % 16, a = AKOR[Math.floor(i / 16) % 4], B = { bus: bM };
      if (s === 0) {
        nada(a.n[0], t, S16 * 16, { vol: 0.045, atk: 0.4, tahan: true, rel: 0.6, bus: bM });
        nada(a.n[2], t, S16 * 16, { vol: 0.045, atk: 0.4, tahan: true, rel: 0.6, bus: bM });
      }
      if (s === 0 || s === 8) nada(a.b, t, S16 * 6, { tipe: 'triangle', vol: 0.2, bus: bM });
      if (s === 11) nada(a.b * 1.5, t, S16 * 3, { tipe: 'triangle', vol: 0.14, bus: bM });
      if (intens >= 1) {
        if (s % 2 === 0) nada(a.n[URUT[(s / 2) | 0]], t, S16 * 1.8, { tipe: 'triangle', vol: 0.1, bus: B.bus });
        if (s === 0 || s === 8) kick(t, 0.2);
      }
      if (intens >= 2) {
        if (s === 4 || s === 12) kick(t, 0.2);
      }
    }
    function isiMusik(sampai) {
      while (nextT < sampai) { langkah(idx++, nextT); nextT += S16; }
    }
    function tik() {
      if (!jalan()) return;
      var now = ac.currentTime;
      if (nextT < now - 1) nextT = now + 0.05; // tertinggal (tab dibekukan): lompat, jangan memutar ulang yang lewat
      isiMusik(now + 0.7);
    }
    function hidupkanMusik() {
      if (matiJam) { clearTimeout(matiJam); matiJam = null; }
      if (jam || !jalan()) return;
      nextT = ac.currentTime + 0.08; idx = 0;
      var t = ac.currentTime;
      bM.gain.cancelScheduledValues(t); bM.gain.setValueAtTime(0.0001, t); bM.gain.setTargetAtTime(gM(), t, 0.4);
      if (!langsung) jam = setInterval(tik, 250);
    }
    function matikanMusik() {
      if (!jam || matiJam) return;
      var t = ac.currentTime;
      bM.gain.cancelScheduledValues(t); bM.gain.setTargetAtTime(0.0001, t, 0.25);
      matiJam = setTimeout(function () { clearInterval(jam); jam = null; matiJam = null; }, 1200); // jadwal berhenti total setelah memudar
    }
    /** status: idle|ready|question|reveal; inten: 1 biasa, 2 menegangkan (detik terakhir). Murah dipanggil berulang. */
    function fase(status, inten) {
      fT = status; iT = inten || 1;
      intens = status === 'question' ? iT : 0;
      if (!bE) return;
      if (status !== 'idle' && set.musik) hidupkanMusik(); else matikanMusik();
    }

    function buka() {
      if (!siap()) return Promise.resolve(false);
      var p = ac.state === 'suspended' && ac.resume ? ac.resume() : null;
      return Promise.resolve(p).then(function () { fase(fT, iT); return ac.state === 'running'; }, function () { return false; });
    }
    function setelan(o) {
      for (var k in o) if (k in set) set[k] = o[k];
      terapkan(false);
      fase(fT, iT);
    }
    function info() {
      if (!AC && !opsi.ctx) return 'Browser ini tidak mendukung suara.';
      if (!bE || (ac && ac.state !== 'running' && !langsung)) return 'Suara menunggu satu ketukan di layar (aturan browser).';
      return 'Suara aktif.';
    }

    return {
      buka: buka, bunyi: bunyi, proses: proses, fase: fase, setelan: setelan, info: info,
      daftar: function () { return Object.keys(SFX); },
      _uji: { isiMusik: function (dari, sampai, inten) { nextT = dari; idx = 0; intens = inten; isiMusik(sampai); } },
    };
  }

  var api = { deteksi: deteksi, buat: buat };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Suara = api;
})(typeof window !== 'undefined' ? window : globalThis);
