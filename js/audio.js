/*
 * audio.js — NW.audio: every sound in the game, synthesized live with the
 * Web Audio API (no audio files): soft text blips, restaurant sound effects,
 * and a looping period-style music track for every era (1920s gramophone
 * ragtime → 1930s/40s radio swing → 50s doo-wop → 70s disco → 90s boom-bap →
 * 2010s indie pop → 2020 lo-fi → today).
 *
 * Public API (the contract used by ui.js / main.js / the engine):
 *
 *   NW.audio.unlock()            Call from the first user gesture. Creates/resumes the
 *                                AudioContext (browser autoplay policy). Safe to call often.
 *   NW.audio.blip(voice)         Tiny text blip. voices: 'low','mid','high','old','kid',
 *                                'typewriter' (anything else -> 'mid'). Cheap, rate-limited,
 *                                slight random pitch variance. Call every ~2 characters.
 *   NW.audio.sfx(name)           One-shot effect: 'objection','holdit','takethat','damage',
 *                                'evidence','select','click','cursor','reveal','success',
 *                                'gameover','shake','flash','door_bell','gong','sizzle',
 *                                'page','whoosh','typewriter_card','fanfare'.
 *                                Unknown names play a soft click.
 *   NW.audio.music(name[, opts]) Crossfade to a looping track (see TRACKS below).
 *                                null / '' stops. Same name as current = no-op.
 *                                Requested before unlock() -> starts on unlock.
 *                                opts (optional): { fade: seconds, fadeIn: seconds }
 *   NW.audio.setVolume({ master, music, sfx, blips })   each 0..1 (partial objects OK)
 *   NW.audio.getSettings()       -> { master, music, sfx, blips, muted } (a copy)
 *   NW.audio.setMuted(bool) / NW.audio.isMuted()
 *
 *   Extras (handy for tools/UI, not required by the engine):
 *   NW.audio.available           true if Web Audio exists in this environment
 *   NW.audio.list()              -> { tracks:[...], sfx:[...], voices:[...] }
 *   NW.audio.currentMusic()      -> name of the requested track or null
 *
 * Design notes
 *   - Nothing touches AudioContext at load time. The context is created lazily
 *     inside unlock(), so this file loads in Node (tools/*.js) and in browsers
 *     without Web Audio; there every method is a silent no-op.
 *   - Settings persist to localStorage['nomwah-audio-v1'] (guarded).
 *   - Mixer: music -> duck -> tone filter ┐
 *                         sfx ───────────┼-> master -> compressor -> speakers
 *                         blips ─────────┘
 *     Shouts briefly "duck" the music like Ace Attorney does.
 *   - Music uses a lookahead scheduler: a 25ms setInterval schedules notes ~150ms
 *     ahead against audioContext.currentTime, so tempo never drifts and loops are
 *     sample-accurate. When the tab is hidden the context is suspended.
 *   - A track is pure data: tempo, a chord progression, and "parts". A part is
 *     either a melody string, a generator driven by the progression (arpeggio,
 *     chord comping, bass figure), or drum lanes. Every part loops on its own
 *     length, so an 8-bar progression can sit under a 16-bar melody.
 *   - Raw square waves are harsh, so all "square/pulse" voices use band-limited
 *     custom PeriodicWaves with tapered harmonics, plus per-voice low-pass filters
 *     and a gentle master low-pass on the music bus.
 */
(function (root) {
  'use strict';

  var NW = (root.NW = root.NW || {});

  // ===========================================================================
  // Small helpers
  // ===========================================================================

  function noop() {}
  function clamp01(v) { v = +v; return isFinite(v) ? Math.max(0, Math.min(1, v)) : 0; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function rep(s, n) { var o = ''; for (var i = 0; i < n; i++) o += s; return o; }
  function extend(dst) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (src) for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) dst[k] = src[k];
    }
    return dst;
  }
  function gcd(a, b) { while (b) { var t = b; b = a % b; a = t; } return a; }
  function quiet(promise) { if (promise && typeof promise.then === 'function') promise.then(noop, noop); }

  var warned = {};
  function warnOnce(msg) {
    if (warned[msg]) return;
    warned[msg] = true;
    try { if (root.console && root.console.warn) root.console.warn('[NW.audio] ' + msg); } catch (e) { /* ignore */ }
  }

  // ===========================================================================
  // Settings (persisted)
  // ===========================================================================

  var STORAGE_KEY = 'nomwah-audio-v1';
  var VOL_KEYS = ['master', 'music', 'sfx', 'blips'];
  var DEFAULTS = { master: 0.8, music: 0.35, sfx: 0.8, blips: 0.5, muted: false };

  function storage() {
    try { return root.localStorage || null; } catch (e) { return null; } // SecurityError in sandboxed frames
  }

  function loadSettings() {
    var s = extend({}, DEFAULTS);
    try {
      var ls = storage();
      var raw = ls && ls.getItem(STORAGE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o === 'object') {
          VOL_KEYS.forEach(function (k) { if (typeof o[k] === 'number' && isFinite(o[k])) s[k] = clamp01(o[k]); });
          if (typeof o.muted === 'boolean') s.muted = o.muted;
        }
      }
    } catch (e) { /* corrupt / unavailable storage: keep defaults */ }
    return s;
  }

  function saveSettings() {
    try {
      var ls = storage();
      if (ls) ls.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) { /* quota / private mode: ignore */ }
  }

  var settings = loadSettings();

  // ===========================================================================
  // Context + mixer graph (created lazily in unlock())
  // ===========================================================================

  var AC = root.AudioContext || root.webkitAudioContext || null;
  var ctx = null;          // the AudioContext
  var bus = null;          // { master, comp, music, duck, tone, sfx, blips }
  var waves = {};          // custom PeriodicWaves by name
  var noiseBuf = null;     // shared white-noise buffer
  var unlocked = false;    // unlock() has been called at least once
  var hiddenPause = false; // context suspended because the tab is hidden

  function docHidden() {
    try { return typeof document !== 'undefined' && !!document.hidden; } catch (e) { return false; }
  }

  // Self-healing: if the audio device fails (e.g. a laptop is plugged into a projector and the
  // output switches), mark the context broken; the next click rebuilds it and restarts the music.
  var broken = false, ctxGen = 0;
  function watchHealth(c) {
    try {
      c.addEventListener('statechange', function () { if (c === ctx && c.state === 'closed') broken = true; });
      c.addEventListener('error', function () { if (c === ctx) broken = true; });
    } catch (e) { /* older browsers: nothing to watch */ }
  }
  function rebuildCtx() {
    var old = ctx;
    broken = false;
    if (timer) { clearInterval(timer); timer = null; }
    current = null; fading = [];
    ctx = null; bus = null; waves = {}; noiseBuf = null;
    unlocked = false; // unlock() redoes the first-gesture setup and restarts the wanted track
    try { if (old && old.state !== 'closed') quiet(old.close()); } catch (e) { /* ignore */ }
  }

  function ensureCtx() {
    if (ctx) return ctx;
    if (!AC) return null;
    try {
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e1) { ctx = new AC(); }
      ctxGen++;
      watchHealth(ctx);
      buildGraph();
    } catch (e) {
      warnOnce('Web Audio unavailable: ' + (e && e.message));
      ctx = null; bus = null; AC = null;
      return null;
    }
    return ctx;
  }

  /** Build buses, shared waves and noise on the current `ctx`. */
  function buildGraph() {
    var c = ctx;
    var comp = c.createDynamicsCompressor();       // safety limiter on the final mix
    comp.threshold.value = -12;
    comp.knee.value = 10;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;

    var master = c.createGain();
    var music = c.createGain();
    var duck = c.createGain();
    var tone = c.createBiquadFilter();             // softens the whole music bus a touch
    tone.type = 'lowpass';
    tone.frequency.value = 6500;
    tone.Q.value = 0.5;
    var sfx = c.createGain();
    var blips = c.createGain();

    music.connect(duck); duck.connect(tone); tone.connect(master);
    sfx.connect(master);
    blips.connect(master);
    master.connect(comp); comp.connect(c.destination);

    bus = { master: master, comp: comp, music: music, duck: duck, tone: tone, sfx: sfx, blips: blips };

    waves = {
      pulse12: makePulse(c, 0.125),
      pulse25: makePulse(c, 0.25),
      square: makePulse(c, 0.5)
    };
    noiseBuf = makeNoise(c, 1.5);
    applyVolumes(true);
  }

  /**
   * Band-limited pulse wave with duty cycle `duty` as a PeriodicWave.
   * Fourier series of a pulse: a_k = 2/(k*pi) * sin(k*pi*duty) (cosine terms).
   * Harmonics are tapered so the chip voices are bright but never piercing.
   */
  function makePulse(c, duty) {
    var n = 28, real = new Float32Array(n), imag = new Float32Array(n);
    for (var k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.pow(0.95, k);
    return c.createPeriodicWave(real, imag);
  }

  function makeNoise(c, seconds) {
    var len = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function setWave(osc, name) {
    if (waves[name]) osc.setPeriodicWave(waves[name]);
    else osc.type = name || 'sine'; // 'sine' | 'triangle' | 'sawtooth'
  }

  /** Freeze an AudioParam at its current value at time t so new ramps start from there. */
  function holdParam(p, t) {
    if (typeof p.cancelAndHoldAtTime === 'function') {
      p.cancelAndHoldAtTime(t);
    } else {
      var v = p.value;
      p.cancelScheduledValues(t);
      p.setValueAtTime(v, t);
    }
  }

  function smoothSet(p, v, immediate) {
    var t = ctx.currentTime;
    if (immediate) { p.cancelScheduledValues(t); p.setValueAtTime(v, t); return; }
    holdParam(p, t);
    p.setTargetAtTime(v, t, 0.03);
  }

  function applyVolumes(immediate) {
    if (!ctx || !bus) return;
    smoothSet(bus.master.gain, settings.muted ? 0 : settings.master, immediate);
    smoothSet(bus.music.gain, settings.music, immediate);
    smoothSet(bus.sfx.gain, settings.sfx, immediate);
    smoothSet(bus.blips.gain, settings.blips, immediate);
  }

  /** True when a sound on bus `kind` would be heard right now. */
  function audible(kind) {
    if (!ctx || !bus || !unlocked || hiddenPause || ctx.state === 'closed') return false;
    if (settings.muted || settings.master <= 0) return false;
    return !kind || settings[kind] > 0;
  }

  /** Temporarily lower the music (shouts, game over). */
  function duck(depth, hold, t) {
    var p = bus.duck.gain;
    holdParam(p, t);
    p.linearRampToValueAtTime(depth, t + 0.03);
    p.setValueAtTime(depth, t + 0.03 + hold);
    p.linearRampToValueAtTime(1, t + 0.6 + hold);
  }

  // ===========================================================================
  // Voice primitives (shared by blips, SFX, drums)
  // ===========================================================================

  /** Exponential AD(H) envelope on a gain AudioParam. */
  function env(p, t, a, hold, dur, peak) {
    peak = Math.max(0.0002, peak);
    a = Math.max(0.001, a);
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(peak, t + a);
    if (hold > 0) p.setValueAtTime(peak, t + a + hold);
    p.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + (hold || 0) + 0.01));
  }

  /**
   * One oscillator note with an envelope.
   * o: { wave, f, f2, glide, t, dur, a, hold, peak, cut, cut2, q, ftype, detune }
   */
  function tone(dest, o) {
    var c = ctx, t = o.t, end = t + o.dur;
    var osc = c.createOscillator();
    setWave(osc, o.wave || 'sine');
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || o.dur));
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);
    var g = c.createGain();
    env(g.gain, t, o.a || 0.003, o.hold || 0, o.dur, o.peak);
    if (o.cut) {
      var f = c.createBiquadFilter();
      f.type = o.ftype || 'lowpass';
      f.Q.value = o.q || 0.7;
      f.frequency.setValueAtTime(o.cut, t);
      if (o.cut2) f.frequency.exponentialRampToValueAtTime(o.cut2, end);
      osc.connect(f); f.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(dest);
    osc.start(t);
    osc.stop(end + 0.05);
  }

  /**
   * Filtered white-noise burst.
   * o: { t, dur, a, hold, peak, ftype, f, f2, glide, q }
   */
  function noise(dest, o) {
    var c = ctx, t = o.t, end = t + o.dur;
    var src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var flt = c.createBiquadFilter();
    flt.type = o.ftype || 'bandpass';
    flt.Q.value = o.q == null ? 1 : o.q;
    flt.frequency.setValueAtTime(o.f || 2000, t);
    if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || o.dur));
    var g = c.createGain();
    env(g.gain, t, o.a || 0.002, o.hold || 0, o.dur, o.peak);
    src.connect(flt); flt.connect(g); g.connect(dest);
    src.start(t, Math.random() * 1.2);
    src.stop(end + 0.05);
  }

  /**
   * Brassy chord stab: detuned saw + pulse per note through one swept low-pass.
   * o: { dur, a, hold, peak, cut, cut2, q, spread, detune, bend, wave, wave2 }
   */
  function stab(dest, t, notes, o) {
    var c = ctx, dur = o.dur, end = t + dur;
    var fl = c.createBiquadFilter();
    fl.type = 'lowpass';
    fl.Q.value = o.q || 1.4;
    fl.frequency.setValueAtTime(o.cut || 4500, t);
    fl.frequency.exponentialRampToValueAtTime(o.cut2 || 700, end);
    var g = c.createGain();
    env(g.gain, t, o.a || 0.004, o.hold || 0, dur, o.peak / Math.sqrt(notes.length * 2));
    fl.connect(g); g.connect(dest);
    var det = o.detune == null ? 8 : o.detune;
    for (var i = 0; i < notes.length; i++) {
      var st = t + (o.spread || 0) * i, f = mtof(notes[i]);
      for (var k = 0; k < 2; k++) {
        var osc = c.createOscillator();
        setWave(osc, k ? (o.wave2 || 'pulse25') : (o.wave || 'sawtooth'));
        osc.frequency.setValueAtTime(f, st);
        if (o.bend) {
          osc.frequency.setValueAtTime(f, t + dur * 0.55);
          osc.frequency.exponentialRampToValueAtTime(f * Math.pow(2, o.bend / 12), end);
        }
        osc.detune.setValueAtTime(k ? det : -det, st);
        osc.connect(fl);
        osc.start(st);
        osc.stop(end + 0.05);
      }
    }
  }

  /** Metallic bell: a few inharmonic sine partials. */
  function bell(dest, t, f, peak, dur) {
    tone(dest, { wave: 'sine', f: f, t: t, dur: dur, a: 0.002, peak: peak });
    tone(dest, { wave: 'sine', f: f * 2.76, t: t, dur: dur * 0.6, a: 0.002, peak: peak * 0.4 });
    tone(dest, { wave: 'sine', f: f * 5.4, t: t, dur: dur * 0.35, a: 0.002, peak: peak * 0.18 });
  }

  // ===========================================================================
  // Text blips
  // ===========================================================================

  var BLIP_MIN_GAP = 0.045; // seconds; blip() calls closer than this are dropped
  var VOICES = {
    low:        { wave: 'sine',     f: 175, f2: 155, dur: 0.06,  cut: 1400, peak: 0.30 },
    mid:        { wave: 'triangle', f: 255, f2: 235, dur: 0.05,  cut: 2000, peak: 0.24 },
    high:       { wave: 'triangle', f: 395, f2: 370, dur: 0.045, cut: 2600, peak: 0.20 },
    old:        { wave: 'sine',     f: 205, f2: 175, dur: 0.07,  cut: 1500, peak: 0.30 },
    kid:        { wave: 'triangle', f: 560, f2: 520, dur: 0.04,  cut: 3200, peak: 0.17 },
    narr:       { wave: 'sine',     f: 520, f2: 500, dur: 0.03,  cut: 2400, peak: 0.07 },
    typewriter: { noise: true }
  };
  var lastBlip = -1;

  function blip(voice) {
    if (!audible('blips')) return;
    var t = ctx.currentTime;
    if (lastBlip >= 0 && t >= lastBlip && t - lastBlip < BLIP_MIN_GAP) return;
    lastBlip = t;
    var V = VOICES[voice] || VOICES.mid;
    var j = 1 + (Math.random() * 2 - 1) * 0.05; // ±5% pitch variance
    t += 0.002;
    try {
      if (V.noise) {
        noise(bus.blips, { t: t, dur: 0.028, a: 0.001, peak: 0.45, ftype: 'bandpass', f: 2600 * j, q: 2.5 });
        tone(bus.blips, { wave: 'sine', f: 1100 * j, f2: 700, t: t, dur: 0.03, peak: 0.14 });
      } else {
        tone(bus.blips, {
          wave: V.wave, f: V.f * j, f2: V.f2 ? V.f2 * j : 0, t: t, dur: V.dur,
          a: 0.002, hold: V.dur * 0.4, peak: V.peak, cut: V.cut
        });
      }
    } catch (e) { warnOnce('blip failed: ' + (e && e.message)); }
  }

  // ===========================================================================
  // Sound effects. Each entry: function (t, dest) scheduling nodes at time t.
  // ===========================================================================

  var SFX = {
    // --- Shouts: punchy noise crack + low thump + big chord stab, and the music ducks.
    objection: function (t, d) {
      duck(0.25, 0.5, t);
      noise(d, { t: t, dur: 0.22, a: 0.001, peak: 0.55, ftype: 'bandpass', f: 3500, f2: 700, q: 0.8 });
      tone(d, { wave: 'sine', f: 170, f2: 40, t: t, dur: 0.35, a: 0.002, peak: 0.8 });
      stab(d, t, [50, 57, 62], { dur: 0.09, peak: 0.45, cut: 3000, cut2: 1500 });                // grace hit
      stab(d, t + 0.075, [50, 57, 62, 66, 69, 74], {                                              // D major blast, sagging a semitone
        dur: 0.75, a: 0.004, hold: 0.12, peak: 0.6, cut: 6000, cut2: 600, spread: 0.008, bend: -1
      });
      tone(d, { wave: 'sine', f: 2349, t: t + 0.08, dur: 0.4, peak: 0.05 });                      // shine
    },
    holdit: function (t, d) {
      // "HOLD — IT!": two descending stabs
      duck(0.3, 0.45, t);
      noise(d, { t: t, dur: 0.16, a: 0.001, peak: 0.4, ftype: 'bandpass', f: 2500, f2: 800, q: 0.9 });
      tone(d, { wave: 'sine', f: 150, f2: 45, t: t, dur: 0.25, peak: 0.6 });
      stab(d, t, [57, 64, 69, 73], { dur: 0.13, peak: 0.5, cut: 4500, cut2: 1800 });
      tone(d, { wave: 'sine', f: 130, f2: 40, t: t + 0.14, dur: 0.3, peak: 0.7 });
      stab(d, t + 0.14, [53, 60, 65, 69, 72], { dur: 0.6, hold: 0.1, peak: 0.6, cut: 5000, cut2: 600, spread: 0.006 });
    },
    takethat: function (t, d) {
      // rising zip, then a bright E major stab with sparkles
      duck(0.3, 0.45, t);
      tone(d, { wave: 'pulse25', f: 220, f2: 1760, glide: 0.13, t: t, dur: 0.16, peak: 0.22, cut: 3500 });
      noise(d, { t: t, dur: 0.15, peak: 0.18, ftype: 'highpass', f: 1500, f2: 5000 });
      noise(d, { t: t + 0.13, dur: 0.2, a: 0.001, peak: 0.45, ftype: 'bandpass', f: 3000, f2: 900, q: 0.8 });
      tone(d, { wave: 'sine', f: 160, f2: 45, t: t + 0.13, dur: 0.3, peak: 0.7 });
      stab(d, t + 0.13, [52, 59, 64, 68, 71, 76], { dur: 0.65, hold: 0.1, peak: 0.6, cut: 6500, cut2: 900, spread: 0.01 });
      tone(d, { wave: 'sine', f: 2637, t: t + 0.2, dur: 0.35, peak: 0.06 });
      tone(d, { wave: 'sine', f: 3520, t: t + 0.27, dur: 0.3, peak: 0.04 });
    },

    // --- Feedback
    damage: function (t, d) {
      noise(d, { t: t, dur: 0.32, a: 0.001, peak: 0.6, ftype: 'lowpass', f: 1800, f2: 200, q: 0.7 });
      tone(d, { wave: 'pulse25', f: 200, f2: 50, t: t, dur: 0.34, peak: 0.35, cut: 1100 });
      tone(d, { wave: 'sine', f: 95, f2: 38, t: t, dur: 0.3, peak: 0.7 });
    },
    evidence: function (t, d) {
      // "Evidence added to the Order Book" jingle
      var arp = [72, 76, 79, 84, 88];
      for (var i = 0; i < arp.length; i++) tone(d, { wave: 'pulse25', f: mtof(arp[i]), t: t + i * 0.055, dur: 0.22, hold: 0.03, peak: 0.15, cut: 4200 });
      tone(d, { wave: 'triangle', f: mtof(84), t: t + 0.28, dur: 0.6, peak: 0.18 });
      bell(d, t + 0.28, 2093, 0.07, 0.8);
    },
    select: function (t, d) {
      tone(d, { wave: 'pulse25', f: 659, t: t, dur: 0.06, hold: 0.02, peak: 0.13, cut: 3200 });
      tone(d, { wave: 'pulse25', f: 988, t: t + 0.05, dur: 0.1, hold: 0.02, peak: 0.13, cut: 3600 });
    },
    click: function (t, d) {
      tone(d, { wave: 'sine', f: 1500, f2: 700, t: t, dur: 0.035, peak: 0.2 });
      noise(d, { t: t, dur: 0.015, a: 0.001, peak: 0.06, ftype: 'highpass', f: 4500 });
    },
    cursor: function (t, d) {
      tone(d, { wave: 'pulse12', f: 1047, t: t, dur: 0.028, hold: 0.01, peak: 0.08, cut: 3500 });
    },
    reveal: function (t, d) {
      tone(d, { wave: 'triangle', f: 330, f2: 1320, t: t, dur: 0.36, a: 0.02, peak: 0.2 });
      noise(d, { t: t, dur: 0.36, a: 0.15, peak: 0.12, ftype: 'bandpass', f: 600, f2: 4000, q: 1.2 });
      bell(d, t + 0.32, 1568, 0.09, 0.7);
      bell(d, t + 0.32, 2349, 0.05, 0.6);
    },
    success: function (t, d) {
      var arp = [72, 76, 79, 84];
      for (var i = 0; i < arp.length; i++) tone(d, { wave: 'pulse25', f: mtof(arp[i]), t: t + i * 0.07, dur: 0.18, hold: 0.04, peak: 0.14, cut: 3800 });
      for (var k = 0; k < arp.length; k++) {
        tone(d, { wave: 'triangle', f: mtof(arp[k]), t: t + 0.3, dur: 0.7, hold: 0.1, peak: 0.1 });
        tone(d, { wave: 'pulse12', f: mtof(arp[k]), t: t + 0.3, dur: 0.5, peak: 0.03, cut: 2500 });
      }
    },
    gameover: function (t, d) {
      // slow, sad descent; music dips for the duration
      duck(0.15, 1.6, t);
      var notes = [67, 63, 60, 55];
      for (var i = 0; i < notes.length; i++) {
        var last = i === notes.length - 1, st = t + i * 0.34, f = mtof(notes[i]);
        tone(d, { wave: 'triangle', f: f, f2: last ? f * 0.97 : 0, t: st, dur: last ? 1.6 : 0.32, hold: last ? 0.4 : 0.1, peak: 0.3 });
        tone(d, { wave: 'pulse25', f: f, f2: last ? f * 0.97 : 0, t: st, dur: last ? 1.3 : 0.3, hold: last ? 0.3 : 0.08, peak: 0.08, cut: 1400 });
      }
    },

    // --- Stage effects
    shake: function (t, d) {
      noise(d, { t: t, dur: 0.5, a: 0.005, peak: 0.7, ftype: 'lowpass', f: 300, q: 0.7 });
      tone(d, { wave: 'sine', f: 55, f2: 35, t: t, dur: 0.5, peak: 0.45 });
    },
    flash: function (t, d) {
      noise(d, { t: t, dur: 0.32, a: 0.02, peak: 0.2, ftype: 'highpass', f: 4000, q: 0.7 });
      bell(d, t + 0.01, 2637, 0.05, 0.6);
    },
    whoosh: function (t, d) {
      var c = ctx, src = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noiseBuf; src.loop = true;
      flt.type = 'bandpass'; flt.Q.value = 1.4;
      flt.frequency.setValueAtTime(250, t);
      flt.frequency.exponentialRampToValueAtTime(2200, t + 0.22);
      flt.frequency.exponentialRampToValueAtTime(450, t + 0.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      src.connect(flt); flt.connect(g); g.connect(d);
      src.start(t, Math.random()); src.stop(t + 0.55);
    },
    page: function (t, d) {
      noise(d, { t: t, dur: 0.16, a: 0.02, peak: 0.22, ftype: 'bandpass', f: 1200, f2: 4500, q: 1.2 });
      noise(d, { t: t + 0.09, dur: 0.12, a: 0.01, peak: 0.1, ftype: 'bandpass', f: 2500, f2: 6000, q: 1.2 });
    },
    typewriter_card: function (t, d) {
      // single clack (the time/place card calls this per character)
      noise(d, { t: t, dur: 0.03, a: 0.001, peak: 0.28, ftype: 'highpass', f: 2500 });
      tone(d, { wave: 'sine', f: 220 * (0.95 + Math.random() * 0.1), f2: 110, t: t, dur: 0.05, peak: 0.16 });
    },

    // --- Places & things
    door_bell: function (t, d) {
      // shop bell on a spring: "ting-a-ling"
      var hits = [[0, 1], [0.085, 0.7], [0.16, 0.55], [0.27, 0.35]];
      for (var i = 0; i < hits.length; i++) bell(d, t + hits[i][0], 2150 * (1 + (i % 2) * 0.012), 0.1 * hits[i][1], 0.9);
    },
    gong: function (t, d) {
      var base = 98;
      var partials = [[1, 0.5, 4.0], [1.52, 0.3, 3.2], [2.03, 0.28, 2.8], [2.61, 0.2, 2.2], [3.28, 0.14, 1.6], [4.12, 0.09, 1.2], [5.5, 0.05, 0.8]];
      for (var i = 0; i < partials.length; i++) {
        var p = partials[i];
        tone(d, { wave: 'sine', f: base * p[0] * 1.03, f2: base * p[0], glide: 0.5, t: t, a: 0.012, dur: p[2], peak: p[1] * 0.42 });
      }
      noise(d, { t: t, a: 0.02, dur: 1.4, peak: 0.1, ftype: 'lowpass', f: 1800, f2: 300, q: 0.5 });
      tone(d, { wave: 'sine', f: 70, f2: 55, t: t, dur: 0.6, peak: 0.35 }); // mallet thump
    },
    sizzle: function (t, d) {
      // wok sizzle: a hiss bed plus random fat-crackles
      noise(d, { t: t, dur: 1.4, a: 0.06, hold: 0.7, peak: 0.1, ftype: 'highpass', f: 3000, q: 0.5 });
      for (var i = 0; i < 28; i++) {
        noise(d, {
          t: t + Math.random() * 1.2, dur: 0.015 + Math.random() * 0.03, a: 0.001,
          peak: 0.08 + Math.random() * 0.17, ftype: 'bandpass', f: 2500 + Math.random() * 4500, q: 4
        });
      }
    },

    // --- Celebration
    fanfare: function (t, d) {
      var lead = [[67, 0], [72, 0.12], [76, 0.24]];
      for (var i = 0; i < lead.length; i++) stab(d, t + lead[i][1], [lead[i][0], lead[i][0] - 12], { dur: 0.12, a: 0.01, peak: 0.32, cut: 1800, cut2: 2600, detune: 6 });
      stab(d, t + 0.36, [79, 67], { dur: 0.34, a: 0.012, hold: 0.12, peak: 0.34, cut: 1500, cut2: 2800, detune: 6 });
      for (var k = 0; k < 6; k++) noise(d, { t: t + 0.48 + k * 0.04, dur: 0.06, peak: 0.1 + k * 0.03, ftype: 'bandpass', f: 2000, q: 0.7 }); // snare roll
      tone(d, { wave: 'sine', f: 140, f2: 45, t: t + 0.72, dur: 0.3, peak: 0.6 });
      noise(d, { t: t + 0.72, dur: 1.3, a: 0.003, peak: 0.12, ftype: 'highpass', f: 5000, q: 0.5 });        // cymbal
      stab(d, t + 0.72, [60, 64, 67, 72, 76, 79], { dur: 1.25, a: 0.03, hold: 0.35, peak: 0.5, cut: 3200, cut2: 900, detune: 7 });
    },

    // Fallback for unknown names
    // --- Restaurant sounds -------------------------------------------------
    // Tea pouring from a pot: a bright gurgling stream that rises as the cup fills.
    pour: function (t, d) {
      noise(d, { t: t, dur: 1.25, a: 0.08, hold: 0.8, peak: 0.16, ftype: 'bandpass', f: 900, f2: 2600, glide: 1.2, q: 2.2 });
      for (var i = 0; i < 9; i++) {
        tone(d, { wave: 'sine', f: 520 + i * 55 + Math.random() * 80, f2: 900 + i * 60, t: t + 0.1 + i * 0.12, dur: 0.07, a: 0.005, peak: 0.035 });
      }
    },
    // Two fingers tapping the tabletop ("thank you" for the tea).
    tap: function (t, d) {
      tone(d, { wave: 'sine', f: 240, f2: 110, t: t, dur: 0.09, a: 0.001, peak: 0.45 });
      noise(d, { t: t, dur: 0.04, a: 0.001, peak: 0.18, ftype: 'bandpass', f: 1500, q: 1.5 });
    },
    // Little two-note bell, for new dishes on your table.
    chime: function (t, d) {
      bell(d, t, 1318.5, 0.12, 0.9);
      bell(d, t + 0.11, 1760, 0.1, 1.1);
    },
    // Phone camera shutter.
    shutter: function (t, d) {
      noise(d, { t: t, dur: 0.05, a: 0.001, peak: 0.3, ftype: 'highpass', f: 2500 });
      noise(d, { t: t + 0.07, dur: 0.06, a: 0.001, peak: 0.22, ftype: 'bandpass', f: 1800, q: 1.2 });
    },
    // A dim sum cart's squeaky wheel.
    squeak: function (t, d) {
      tone(d, { wave: 'sine', f: 1900, f2: 2300, t: t, dur: 0.12, a: 0.01, peak: 0.05 });
      tone(d, { wave: 'sine', f: 2100, f2: 1750, t: t + 0.18, dur: 0.14, a: 0.01, peak: 0.04 });
      noise(d, { t: t, dur: 0.5, a: 0.05, peak: 0.03, ftype: 'lowpass', f: 400 });
    },
    // Footstep on pavement.
    step: function (t, d) {
      noise(d, { t: t, dur: 0.09, a: 0.002, peak: 0.25, ftype: 'lowpass', f: 900, f2: 300 });
      tone(d, { wave: 'sine', f: 90, f2: 60, t: t, dur: 0.08, peak: 0.2 });
    },
    // Time shift: rising steam whoosh, ticking clock, a shimmer at the top.
    timeshift: function (t, d) {
      duck(0.35, 1.2, t);
      noise(d, { t: t, dur: 1.6, a: 0.5, peak: 0.16, ftype: 'bandpass', f: 300, f2: 3800, glide: 1.4, q: 0.9 });
      for (var i = 0; i < 6; i++) tone(d, { wave: 'sine', f: 2400, t: t + 0.1 + i * 0.16, dur: 0.03, a: 0.001, peak: 0.05 });
      [72, 76, 79, 84].forEach(function (m, k) { bell(d, t + 1.05 + k * 0.06, mtof(m), 0.05, 1.2); });
    },
    _default: function (t, d) {
      tone(d, { wave: 'sine', f: 1200, f2: 800, t: t, dur: 0.03, peak: 0.12 });
    }
  };

  var SFX_MIN_GAP = 0.025; // same effect re-triggered faster than this is dropped
  var lastSfx = {};

  function sfx(name) {
    if (!audible('sfx')) return;
    var key = (typeof name === 'string' && name.charAt(0) !== '_' && Object.prototype.hasOwnProperty.call(SFX, name)) ? name : '_default';
    var t = ctx.currentTime;
    if (lastSfx[key] != null && t >= lastSfx[key] && t - lastSfx[key] < SFX_MIN_GAP) return;
    lastSfx[key] = t;
    try { SFX[key](t + 0.005, bus.sfx); } catch (e) { warnOnce('sfx "' + key + '" failed: ' + (e && e.message)); }
  }

  // ===========================================================================
  // Music: instruments
  // ===========================================================================
  //
  // wave/wave2: 'pulse12' | 'pulse25' | 'square' | 'triangle' | 'sine' | 'sawtooth'
  // gain: voice level  a/d/s/r: envelope (s = sustain fraction; 0 = pluck)
  // cut/q: static low-pass  fenv: [startHz, endHz, seconds] per-note filter sweep
  // vib: [rateHz, depthCents, delaySec]  bend: semitones to slide in from, bendT: slide time
  // wave2/mix2/ratio2/detune2: optional second oscillator  echo: send to the track delay
  // pan: -1..1  gate: fraction of the written length that the note is held

  var INSTR = {
    lead:     { wave: 'pulse25', gain: 0.13, a: 0.006, d: 0.18, s: 0.6, r: 0.09, cut: 3000, q: 0.7, vib: [5.5, 14, 0.16], echo: 0.16, gate: 0.92 },
    pipa:     { wave: 'pulse25', gain: 0.17, a: 0.002, d: 0.35, s: 0, r: 0.1, cut: 4500, fenv: [4200, 900, 0.25], bend: 0.35, bendT: 0.04, echo: 0.12, gate: 1 },
    erhu:     { wave: 'sawtooth', gain: 0.11, a: 0.07, d: 0.3, s: 0.8, r: 0.18, cut: 1700, q: 1.5, vib: [6, 22, 0.1], bend: -0.7, bendT: 0.09, echo: 0.25, gate: 0.95 },
    flute:    { wave: 'triangle', wave2: 'sine', ratio2: 2, mix2: 0.25, gain: 0.22, a: 0.05, d: 0.2, s: 0.85, r: 0.2, cut: 2500, vib: [5, 12, 0.2], echo: 0.3, gate: 0.95 },
    synth:    { wave: 'sawtooth', wave2: 'square', mix2: 0.4, detune2: -8, gain: 0.08, a: 0.008, d: 0.2, s: 0.65, r: 0.1, cut: 2300, q: 3, fenv: [3200, 1400, 0.2], vib: [5, 10, 0.25], echo: 0.15, gate: 0.9 },
    harm:     { wave: 'pulse12', gain: 0.06, a: 0.006, d: 0.15, s: 0.5, r: 0.08, cut: 2200, echo: 0.1, pan: -0.25, gate: 0.9 },
    arp:      { wave: 'square', gain: 0.05, a: 0.002, d: 0.09, s: 0.15, r: 0.05, cut: 1900, echo: 0.12, pan: 0.3, gate: 0.8 },
    bell:     { wave: 'sine', wave2: 'sine', ratio2: 3.01, mix2: 0.3, gain: 0.12, a: 0.002, d: 0.8, s: 0, r: 0.3, cut: 6000, echo: 0.35, pan: 0.2, gate: 1 },
    bass:     { wave: 'triangle', wave2: 'pulse25', mix2: 0.28, gain: 0.3, a: 0.004, d: 0.12, s: 0.75, r: 0.05, cut: 1100, gate: 0.8 },
    funkbass: { wave: 'pulse25', wave2: 'triangle', mix2: 0.9, gain: 0.2, a: 0.003, d: 0.12, s: 0.5, r: 0.04, cut: 3000, fenv: [2400, 350, 0.12], fq: 4, gate: 0.6 },
    stab:     { wave: 'pulse25', gain: 0.07, a: 0.003, d: 0.14, s: 0.25, r: 0.06, cut: 2200, gate: 0.7 },
    clav:     { wave: 'pulse12', gain: 0.06, a: 0.002, d: 0.07, s: 0.1, r: 0.03, cut: 3000, fenv: [3500, 700, 0.06], fq: 3, pan: -0.3, gate: 0.5 },
    brass:    { wave: 'sawtooth', wave2: 'pulse25', mix2: 0.5, detune2: 7, gain: 0.07, a: 0.025, d: 0.25, s: 0.7, r: 0.12, cut: 2600, fenv: [700, 2600, 0.08], echo: 0.1, gate: 0.9 },
    pad:      { wave: 'triangle', wave2: 'square', mix2: 0.25, detune2: 9, gain: 0.09, a: 0.35, d: 0.6, s: 0.8, r: 0.6, cut: 900, echo: 0.2, gate: 1 },
    // --- period instruments ---
    piano:    { wave: 'triangle', wave2: 'sine', ratio2: 2, mix2: 0.3, gain: 0.17, a: 0.002, d: 0.6, s: 0, r: 0.2, cut: 3500, fenv: [5000, 1500, 0.4], gate: 1 },
    upright:  { wave: 'sine', wave2: 'triangle', mix2: 0.4, gain: 0.34, a: 0.004, d: 0.35, s: 0.25, r: 0.08, cut: 900, gate: 0.85 },
    gtr:      { wave: 'triangle', wave2: 'sawtooth', mix2: 0.15, gain: 0.06, a: 0.002, d: 0.12, s: 0, r: 0.05, cut: 2200, gate: 0.6 },
    reed:     { wave: 'square', gain: 0.075, a: 0.03, d: 0.2, s: 0.8, r: 0.1, cut: 1800, q: 0.8, vib: [5, 12, 0.15], echo: 0.12, gate: 0.92 },
    sax:      { wave: 'sawtooth', wave2: 'square', mix2: 0.3, gain: 0.07, a: 0.04, d: 0.25, s: 0.75, r: 0.15, cut: 1600, q: 1.2, fenv: [900, 1800, 0.1], vib: [5.5, 18, 0.2], echo: 0.18, gate: 0.95 },
    choir:    { wave: 'triangle', wave2: 'sine', ratio2: 2, mix2: 0.3, gain: 0.08, a: 0.25, d: 0.4, s: 0.85, r: 0.4, cut: 1500, vib: [5, 10, 0.3], echo: 0.2, gate: 1 },
    strings:  { wave: 'sawtooth', wave2: 'sawtooth', detune2: 12, mix2: 0.8, gain: 0.045, a: 0.12, d: 0.3, s: 0.85, r: 0.3, cut: 2600, echo: 0.15, gate: 1 },
    rhodes:   { wave: 'sine', wave2: 'sine', ratio2: 2, mix2: 0.18, gain: 0.14, a: 0.004, d: 0.9, s: 0.35, r: 0.3, cut: 2400, vib: [4.5, 8, 0.05], echo: 0.12, gate: 0.95 },
    pluck:    { wave: 'triangle', wave2: 'sine', ratio2: 3, mix2: 0.15, gain: 0.12, a: 0.002, d: 0.25, s: 0, r: 0.08, cut: 3800, echo: 0.2, gate: 1 },
    zheng:    { wave: 'triangle', wave2: 'sine', ratio2: 2, mix2: 0.3, gain: 0.17, a: 0.002, d: 0.7, s: 0, r: 0.2, cut: 4200, fenv: [5000, 1600, 0.3], bend: 0.3, bendT: 0.05, echo: 0.25, gate: 1 },
    popsynth: { wave: 'pulse25', wave2: 'triangle', mix2: 0.6, gain: 0.08, a: 0.01, d: 0.2, s: 0.6, r: 0.12, cut: 2600, vib: [5, 8, 0.2], echo: 0.2, gate: 0.9 }
  };

  // ===========================================================================
  // Music: drum kit (drum lanes: 'x' hit, 'X' accent, 'o' ghost/soft, '.' rest)
  // ===========================================================================

  var HIT = { x: 0.8, X: 1, o: 0.45 };

  var DRUMS = {
    kick:  function (t, v, d) { tone(d, { wave: 'sine', f: 150, f2: 42, glide: 0.09, t: t, dur: 0.24, peak: 0.5 * v }); },
    snare: function (t, v, d) {
      noise(d, { t: t, dur: 0.14, peak: 0.25 * v, ftype: 'bandpass', f: 1900, q: 0.8 });
      tone(d, { wave: 'triangle', f: 190, f2: 150, t: t, dur: 0.08, peak: 0.18 * v });
    },
    clap:  function (t, v, d) {
      for (var i = 0; i < 3; i++) noise(d, { t: t + i * 0.011, dur: i === 2 ? 0.12 : 0.02, peak: 0.18 * v, ftype: 'bandpass', f: 1300, q: 1.2 });
    },
    hat:   function (t, v, d) { noise(d, { t: t, dur: 0.035, a: 0.001, peak: 0.08 * v, ftype: 'highpass', f: 7500, q: 0.7 }); },
    ohat:  function (t, v, d) { noise(d, { t: t, dur: 0.2, a: 0.001, peak: 0.07 * v, ftype: 'highpass', f: 6500, q: 0.7 }); },
    tom:   function (t, v, d) { tone(d, { wave: 'sine', f: 210, f2: 110, t: t, dur: 0.22, peak: 0.35 * v }); },
    cym:   function (t, v, d) { noise(d, { t: t, dur: 1.0, a: 0.002, peak: 0.08 * v, ftype: 'highpass', f: 5500, q: 0.5 }); },
    ride:   function (t, v, d) { noise(d, { t: t, dur: 0.35, a: 0.001, peak: 0.05 * v, ftype: 'highpass', f: 5200, q: 0.6 }); },
    brush:  function (t, v, d) { noise(d, { t: t, dur: 0.18, a: 0.02, peak: 0.1 * v, ftype: 'bandpass', f: 3000, q: 0.6 }); },
    shaker: function (t, v, d) { noise(d, { t: t, dur: 0.06, a: 0.012, peak: 0.05 * v, ftype: 'highpass', f: 6000, q: 0.7 }); },
    rim:    function (t, v, d) {
      tone(d, { wave: 'sine', f: 1700, t: t, dur: 0.035, a: 0.001, peak: 0.12 * v });
      noise(d, { t: t, dur: 0.025, a: 0.001, peak: 0.08 * v, ftype: 'bandpass', f: 3200, q: 3 });
    },
    // bangzi: the hard wooden clapper of Cantonese / Chinese opera percussion
    wood:  function (t, v, d) {
      tone(d, { wave: 'sine', f: 1750, t: t, dur: 0.05, a: 0.001, peak: 0.18 * v });
      noise(d, { t: t, dur: 0.03, a: 0.001, peak: 0.08 * v, ftype: 'bandpass', f: 2600, q: 6 });
    },
    // xiaoluo: small opera gong whose pitch bends upward ("bong-wow")
    luo:   function (t, v, d) {
      tone(d, { wave: 'sine', f: 520, f2: 700, glide: 0.14, t: t, dur: 0.7, a: 0.002, peak: 0.16 * v });
      tone(d, { wave: 'sine', f: 1250, f2: 1680, glide: 0.14, t: t, dur: 0.35, a: 0.002, peak: 0.05 * v });
    }
  };

  // ===========================================================================
  // Music: pattern language
  // ===========================================================================
  //
  // Grid: 16 steps per 4/4 bar (sixteenth notes).
  //
  // Melody string: space-separated tokens "NOTE:LEN", e.g. "C5:4 E5:2 G5:2 r:8".
  //   NOTE = C D E F G A B + optional # or b + octave (C4 = middle C), or "r" (rest).
  //   Chords: "C4+E4+G4:4". LEN (steps) may be omitted to reuse the previous length.
  //   Suffix "!" = accent, "?" = soft. "|" tokens are ignored (bar lines for reading).
  // Progression string: "F:16 Am:16 Bb:8 C:8" — chord symbol + length in steps.
  //   Qualities: '' m 7 m7 maj7 dim dim7 aug sus2 sus4 6 m6 add9 9
  // Generators (follow the progression):
  //   arp:  { low, order:[...], rate }   chord tones (close voicing above `low` MIDI) cycled by `order`
  //   comp: { mask:'..x...x.', len, low } chord hits where the 16-step mask has x/X/o
  //   bass: { figure:'R:4 5:2 8:2', low } degrees R 3 5 7 8 6 4 2 L5 L7 relative to the chord root
  //   (each generator restarts its figure/mask on every chord change)
  // Drums: { kick:'x...x...', snare:'....x...', ... } one char per step, any length.
  //   Lane keys may carry a numeric suffix (snare2) to stack two lanes of one drum.

  var NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var CHORD_Q = {
    '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
    dim: [0, 3, 6], dim7: [0, 3, 6, 9], aug: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7],
    '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], add9: [0, 4, 7, 14], '9': [0, 4, 7, 10, 14]
  };

  function acc(ch) { return ch === '#' ? 1 : ch === 'b' ? -1 : 0; }

  function parseNote(s) {
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
    if (!m) throw new Error('bad note "' + s + '"');
    return NOTE_PC[m[1]] + acc(m[2]) + (parseInt(m[3], 10) + 1) * 12;
  }

  function parseChord(s) {
    var m = /^([A-G])([#b]?)(.*)$/.exec(s);
    if (!m || !Object.prototype.hasOwnProperty.call(CHORD_Q, m[3])) throw new Error('bad chord "' + s + '"');
    return { name: s, root: mod(NOTE_PC[m[1]] + acc(m[2]), 12), iv: CHORD_Q[m[3]] };
  }

  function tokens(str) {
    return String(str).split(/[\s|]+/).filter(function (t) { return !!t; }); // '|' = bar line, ignored
  }

  function clean(lane) { return String(lane).replace(/[\s|]/g, ''); }

  function parseProg(str) {
    var chords = [], step = 0;
    tokens(str).forEach(function (tok) {
      var p = tok.split(':'), len = parseInt(p[1], 10);
      if (!(len > 0)) throw new Error('bad progression token "' + tok + '"');
      chords.push({ ch: parseChord(p[0]), start: step, len: len });
      step += len;
    });
    return { chords: chords, len: step };
  }

  function parseMelody(str) {
    var evs = [], step = 0, len = 4;
    tokens(str).forEach(function (tok) {
      var v = 0.8, last = tok.charAt(tok.length - 1);
      if (last === '!') { v = 1; tok = tok.slice(0, -1); } else if (last === '?') { v = 0.5; tok = tok.slice(0, -1); }
      var p = tok.split(':');
      if (p.length > 1) len = parseInt(p[1], 10);
      if (!(len > 0)) throw new Error('bad melody token "' + tok + '"');
      if (p[0] !== 'r') evs.push({ s: step, n: p[0].split('+').map(parseNote), l: len, v: v });
      step += len;
    });
    return { events: evs, len: step };
  }

  /** Map pitch class into [low, low+12). */
  function wrapPc(pc, low) { return low + mod(pc - low, 12); }

  /** Close-voiced chord tones inside [low, low+12): smooth voice leading for free. */
  function chordTones(ch, low) {
    var out = ch.iv.map(function (iv) { return wrapPc(ch.root + iv, low); }).sort(function (a, b) { return a - b; });
    return out.filter(function (v, i) { return i === 0 || v !== out[i - 1]; });
  }

  function genArp(prog, o) {
    var evs = [], order = o.order || [0, 1, 2, 1], rate = o.rate || 2;
    prog.chords.forEach(function (c) {
      var tones = chordTones(c.ch, o.low || 60);
      var ext = tones.concat(tones.map(function (m) { return m + 12; }));
      for (var k = 0; k * rate < c.len; k++) {
        evs.push({ s: c.start + k * rate, n: [ext[order[k % order.length] % ext.length]], l: Math.min(rate, c.len - k * rate), v: 0.8 });
      }
    });
    return { events: evs, len: prog.len };
  }

  function genComp(prog, o) {
    var mask = clean(o.mask), evs = [];
    prog.chords.forEach(function (c) {
      var tones = chordTones(c.ch, o.low || 57);
      for (var i = 0; i < c.len; i++) {
        var v = HIT[mask.charAt(i % mask.length)];
        if (v) evs.push({ s: c.start + i, n: tones, l: Math.min(o.len || 2, c.len - i), v: v });
      }
    });
    return { events: evs, len: prog.len };
  }

  function degree(d, root, iv) {
    var seventh = (iv[3] != null && iv[3] < 12) ? iv[3] : 10;
    switch (d) {
      case 'R': case '1': return root;
      case '2': return root + 2;
      case '3': return root + iv[1];
      case '4': return root + 5;
      case '5': return root + iv[2];
      case '6': return root + 9;
      case '7': return root + seventh;
      case '8': return root + 12;
      case 'L5': return root + iv[2] - 12;
      case 'L7': return root + seventh - 12;
      default: throw new Error('bad bass degree "' + d + '"');
    }
  }

  function genBass(prog, o) {
    var evs = [], figure = tokens(o.figure);
    prog.chords.forEach(function (c) {
      var root = wrapPc(c.ch.root, o.low || 40), step = 0, len = 4, guard = 0;
      while (step < c.len && guard++ < 256) {
        for (var i = 0; i < figure.length && step < c.len; i++) {
          var p = figure[i].split(':');
          if (p.length > 1) len = parseInt(p[1], 10);
          if (!(len > 0)) throw new Error('bad bass token "' + figure[i] + '"');
          if (p[0] !== 'r') evs.push({ s: c.start + step, n: [degree(p[0], root, c.ch.iv)], l: Math.min(len, c.len - step), v: 0.8 });
          step += len;
        }
      }
    });
    return { events: evs, len: prog.len };
  }

  function compilePart(p, prog, trackName) {
    if (p.drums) {
      var lanes = [], maxLen = 1;
      Object.keys(p.drums).forEach(function (key) {
        var kind = key.replace(/\d+$/, '');
        if (!DRUMS[kind]) throw new Error('unknown drum "' + key + '"');
        var s = clean(p.drums[key]), hits = [];
        for (var i = 0; i < s.length; i++) hits.push(HIT[s.charAt(i)] || 0);
        if (!hits.length) return;
        lanes.push({ kind: kind, len: hits.length, hits: hits });
        maxLen = Math.max(maxLen, hits.length);
      });
      return { drums: true, lanes: lanes, len: maxLen, lens: lanes.map(function (l) { return l.len; }), gain: p.gain == null ? 1 : p.gain };
    }
    var base = INSTR[p.inst];
    if (!base) throw new Error('unknown instrument "' + p.inst + '" in track ' + trackName);
    var inst = extend({}, base, p.set);
    var seq = p.notes ? parseMelody(p.notes)
      : p.arp ? genArp(prog, p.arp)
      : p.comp ? genComp(prog, p.comp)
      : p.bass ? genBass(prog, p.bass)
      : null;
    if (!seq || !seq.len) throw new Error('empty part in track ' + trackName);
    var byStep = new Array(seq.len);
    seq.events.forEach(function (e) { (byStep[e.s] = byStep[e.s] || []).push(e); });
    return {
      inst: inst,
      len: seq.len,
      lens: [seq.len],
      byStep: byStep,
      gain: p.gain == null ? 1 : p.gain,
      transpose: p.transpose || 0,
      pan: p.pan != null ? p.pan : (inst.pan || 0),
      echo: p.echo != null ? p.echo : (inst.echo || 0),
      gate: p.gate || inst.gate || 0.9
    };
  }

  var compiled = {};

  function compileTrack(name) {
    if (compiled[name]) return compiled[name];
    var T = TRACKS[name];
    var prog = T.prog ? parseProg(T.prog) : { chords: [], len: 16 };
    var parts = T.parts.map(function (p) { return compilePart(p, prog, name); });
    var loop = 1;
    parts.forEach(function (p) { p.lens.forEach(function (l) { loop = loop / gcd(loop, l) * l; }); });
    var def = {
      name: name,
      bpm: T.bpm,
      stepDur: 60 / T.bpm / 4,
      swing: T.swing || 0,
      fadeIn: T.fadeIn == null ? 0.5 : T.fadeIn,
      cut: !!T.cut,
      level: T.level == null ? 1 : T.level,
      radio: T.radio || null,
      echoSteps: T.echoSteps || 3,
      echoFb: T.echoFb == null ? 0.3 : T.echoFb,
      parts: parts,
      loopSteps: loop
    };
    compiled[name] = def;
    return def;
  }

  // ===========================================================================
  // Music: the tracks
  // ===========================================================================

  var TRACKS = {

    // ---------------------------------------------------------------------------
    // Title & "Today": warm, modern, hopeful. A guzheng-like pluck plays an
    // F-major-pentatonic tune (F G A C D) over IV–V–iii–vi–IV–V–I.
    // ---------------------------------------------------------------------------
    title: {
      bpm: 84, swing: 0.05, fadeIn: 1.2, level: 0.9,
      prog: 'Bb:16 C:16 Am:16 Dm:16 Bb:16 C:16 F:16 F:16',
      parts: [
        { inst: 'zheng', notes:
          'D5:2 F5:2 G5:4 F5:2 D5:2 C5:4 | D5:2 F5:2 G5:2 A5:2 G5:8 | A5:2 C6:2 A5:2 G5:2 F5:4 D5:4 | F5:2 G5:2 A5:4 D5:8 |' +
          'D5:2 F5:2 G5:4 A5:2 C6:2 D6:4 | C6:2 A5:2 G5:2 F5:2 G5:8 | A5:3 G5:1 F5:2 D5:2 F5:4 C5:4 | F5:12 r:4' },
        { inst: 'pad', comp: { mask: 'x...............', len: 16, low: 53 }, gain: 0.7 },
        { inst: 'upright', bass: { figure: 'R:8 5:8', low: 41 }, gain: 0.7 }
      ]
    },
    today: {
      bpm: 96, swing: 0.06, fadeIn: 0.8,
      prog: 'Bb:16 C:16 Am:16 Dm:16 Bb:16 C:16 F:16 F:16',
      parts: [
        { inst: 'zheng', notes:
          'D5:2 F5:2 G5:4 F5:2 D5:2 C5:4 | D5:2 F5:2 G5:2 A5:2 G5:8 | A5:2 C6:2 A5:2 G5:2 F5:4 D5:4 | F5:2 G5:2 A5:4 D5:8 |' +
          'D5:2 F5:2 G5:4 A5:2 C6:2 D6:4 | C6:2 A5:2 G5:2 F5:2 G5:8 | A5:3 G5:1 F5:2 D5:2 F5:4 C5:4 | F5:12 r:4' },
        { inst: 'rhodes', comp: { mask: 'x.......x.......', len: 7, low: 55 }, gain: 0.7 },
        { inst: 'pad', comp: { mask: 'x...............', len: 16, low: 53 }, gain: 0.5 },
        { inst: 'bass', bass: { figure: 'R:6 R:2 5:4 8:4', low: 41 } },
        { drums: {
          kick:   'x.......x.......',
          snare:  '....o.......o...',
          shaker: '..o...o...o...o.'
        } }
      ]
    },

    // ---------------------------------------------------------------------------
    // 1920: ragtime piano on a wind-up gramophone. Stride left hand (bass on 1 & 3,
    // chords on 2 & 4) under a syncopated right hand.
    // ---------------------------------------------------------------------------
    e1920: {
      bpm: 100, swing: 0.08, fadeIn: 0.6, radio: 'gramophone', level: 1.1,
      prog: 'C:16 C:16 G7:16 G7:16 C:16 C7:16 F:8 Fm:8 C:8 G7:8',
      parts: [
        { inst: 'piano', notes:
          'E5:1 F5:1 G5:2 E5:1 C6:2 G5:1 r:2 A5:1 G5:1 E5:2 C5:2 | D5:2 E5:1 G5:2 E5:1 C5:2 E5:4 r:4 |' +
          'D5:1 E5:1 F5:2 D5:1 B5:2 F5:1 r:2 G5:1 F5:1 D5:2 B4:2 | C5:2 D5:1 F5:2 D5:1 B4:2 G4:4 r:4 |' +
          'E5:1 F5:1 G5:2 E5:1 C6:2 G5:1 r:2 A5:1 G5:1 E5:2 C5:2 | Bb5:2 G5:1 E5:2 C5:1 E5:2 G5:2 Bb5:2 A5:2 G5:2 |' +
          'A5:2 F5:1 C5:2 F5:1 A5:2 Ab5:2 F5:1 C5:1 Ab4:2 C5:2 | G5:2 E5:1 C5:2 E5:1 G5:2 F5:2 D5:2 B4:2 G4:2' },
        { inst: 'piano', bass: { figure: 'R:4 r:4 L5:4 r:4', low: 40 }, gain: 0.9 },
        { inst: 'piano', comp: { mask: '....x.......x...', len: 3, low: 55 }, gain: 0.6 }
      ]
    },

    // ---------------------------------------------------------------------------
    // 1930s: small-combo swing on a tube radio. 8th-note grid (bpm is halved so one
    // step = one 8th) with triplet swing; walking bass, clarinet, brushes.
    // ---------------------------------------------------------------------------
    e1930: {
      bpm: 66, swing: 0.33, fadeIn: 0.6, radio: 'radio', level: 1.1, echoSteps: 2,
      prog: 'F6:8 Dm7:8 Gm7:8 C7:8 F6:8 D7:8 Gm7:4 C7:4 F6:8',
      parts: [
        { inst: 'reed', notes:
          'C5:1 D5:1 F5:2 A5:3 G5:1 | F5:2 D5:1 F5:1 A5:2 C6:2 | Bb5:3 A5:1 G5:2 F5:2 | E5:2 G5:1 Bb5:1 A5:2 G5:2 |' +
          'A5:1 C6:1 D6:2 C6:3 A5:1 | F#5:2 A5:1 C6:1 D6:2 C6:2 | Bb5:2 G5:2 E5:2 G5:2 | F5:4 r:2 C5:1 D5:1' },
        { inst: 'upright', bass: { figure: 'R:2 3:2 5:2 6:2', low: 36 } },
        { inst: 'gtr', comp: { mask: 'x.x.x.x.', len: 1, low: 55 } },
        { drums: {
          ride:  'x.xox.xo',
          brush: '..x...x.',
          kick:  'o...o...'
        } }
      ]
    },

    // ---------------------------------------------------------------------------
    // 1940s: big-band swing riff over a 12-bar blues in C, on the radio.
    // ---------------------------------------------------------------------------
    e1940: {
      bpm: 82, swing: 0.3, fadeIn: 0.5, radio: 'radio', level: 1.05, echoSteps: 2,
      prog: 'C7:8 C7:8 C7:8 C7:8 F7:8 F7:8 C7:8 C7:8 G7:8 F7:8 C7:8 G7:8',
      parts: [
        { inst: 'reed', notes:
          'C5:1 E5:1 G5:2 E5:1 G5:1 A5:2 | G5:2 E5:1 C5:3 r:2 | C5:1 E5:1 G5:2 E5:1 G5:1 A5:2 | G5:2 E5:1 C5:3 r:2 |' +
          'F5:1 A5:1 C6:2 A5:1 C6:1 D6:2 | C6:2 A5:1 F5:3 r:2 | C5:1 E5:1 G5:2 E5:1 G5:1 A5:2 | G5:2 E5:1 C5:3 r:2 |' +
          'G5:1 B5:1 D6:2 B5:1 D6:1 E6:2 | Eb6:2 C6:1 A5:3 r:2 | C5:1 E5:1 G5:2 E5:1 G5:1 A5:2 | G5:2 F5:1 D5:2 B4:1 G4:2' },
        { inst: 'reed', notes: '', ref: 'reed', transpose: -5, gain: 0.55 },
        { inst: 'brass', comp: { mask: '...x...x', len: 1, low: 60 }, gain: 0.8 },
        { inst: 'upright', bass: { figure: 'R:2 3:2 5:2 6:2', low: 36 } },
        { drums: {
          ride:  'x.xox.xo',
          kick:  'o.o.o.o.',
          brush: '..x...x.',
          snare: rep('.', 88) + '..o.x.X.'
        } }
      ]
    },

    // ---------------------------------------------------------------------------
    // 1950s–60s: doo-wop ballad on the jukebox. 12/8 feel: one step = one triplet
    // 8th (12 steps per bar), I–vi–IV–V, piano triplets, walking "doo" bass, sax.
    // ---------------------------------------------------------------------------
    e1950: {
      bpm: 48, swing: 0, fadeIn: 0.6, radio: 'jukebox', level: 1.0, echoSteps: 3,
      prog: 'C:12 Am:12 F:12 G:12',
      parts: [
        { inst: 'sax', notes:
          'E5:6 G5:3 E5:3 | C5:6 r:3 A4:3 | C5:3 D5:3 F5:3 A5:3 | G5:9 r:3 |' +
          'E5:3 G5:3 C6:6 | B5:3 A5:3 E5:6 | F5:3 A5:3 G5:3 F5:3 | D5:6 G4:3 r:3' },
        { inst: 'piano', comp: { mask: 'xoo', len: 1, low: 60 }, gain: 0.55 },
        { inst: 'choir', comp: { mask: 'x...........', len: 12, low: 55 }, gain: 0.6 },
        { inst: 'upright', bass: { figure: 'R:3 3:3 5:3 6:3', low: 36 } },
        { drums: {
          kick:  'x.....x.....',
          snare: '...x.....x..',
          hat:   'ooo'
        } }
      ]
    },

    // ---------------------------------------------------------------------------
    // 1970s–80s: disco. Four on the floor, octave bass, strings, funky clav.
    // ---------------------------------------------------------------------------
    e1970: {
      bpm: 116, swing: 0.04, fadeIn: 0.5, level: 0.95,
      prog: 'Am7:16 D9:16 Am7:16 D9:16 Fmaj7:16 G:16 E7:16 E7:16',
      parts: [
        { inst: 'brass', notes:
          'A5:2 r:2 C6:2 A5:2 G5:2 E5:2 G5:4 | F#5:2 r:2 A5:2 F#5:2 E5:2 D5:2 E5:4 |' +
          'A5:2 r:2 C6:2 A5:2 G5:2 E5:2 D6:4 | C6:4 A5:4 r:8 |' +
          'A5:2 C6:2 E6:4 C6:2 A5:2 F5:4 | G5:2 B5:2 D6:4 B5:2 G5:2 D5:4 |' +
          'E5:2 G#5:2 B5:2 D6:2 E6:4 r:4 | D6:2 B5:2 G#5:2 E5:2 r:8', gain: 0.8 },
        { inst: 'funkbass', bass: { figure: 'R:2 8:2', low: 33 } },
        { inst: 'strings', comp: { mask: 'x...............', len: 14, low: 57 }, gain: 0.8 },
        { inst: 'clav', comp: { mask: 'x.ox..x.o.x..x.o', len: 1, low: 60 } },
        { drums: {
          kick:  'x...x...x...x...',
          snare: '....x.......x...',
          clap:  '....o.......o...',
          hat:   'x...x...x...x...',
          ohat:  '..x...x...x...x.'
        } }
      ]
    },

    // ---------------------------------------------------------------------------
    // 1990s–2000s: New York boom-bap. Dusty kick/snare, jazzy Rhodes, vinyl crackle.
    // ---------------------------------------------------------------------------
    e1990: {
      bpm: 90, swing: 0.12, fadeIn: 0.5, radio: 'vinyl', level: 1.0,
      prog: 'Dm7:16 G7:16 Cmaj7:16 A7:16',
      parts: [
        { inst: 'rhodes', comp: { mask: 'x.....x...x.....', len: 6, low: 57 } },
        { inst: 'bell', notes: 'A5:2 C6:2 D6:4 r:4 F6:2 E6:2 | D6:4 C6:2 A5:2 r:8 | G5:2 B5:2 C6:4 r:4 E6:2 D6:2 | C#6:4 A5:4 r:8', gain: 0.6 },
        { inst: 'bass', bass: { figure: 'R:6 r:2 R:2 5:2 r:4', low: 38 } },
        { drums: {
          kick:  'x.......x.x.....',
          snare: '....X.......X...',
          hat:   'x.o.x.o.x.o.x.oo'
        } }
      ]
    },

    // ---------------------------------------------------------------------------
    // 2010: bright indie / electro pop (laptop speakers, new menus, new energy).
    // ---------------------------------------------------------------------------
    e2010: {
      bpm: 122, swing: 0, fadeIn: 0.5, level: 0.9,
      prog: 'C:16 G:16 Am:16 F:16',
      parts: [
        { inst: 'popsynth', notes:
          'E5:2 G5:2 C6:3 B5:1 C6:2 G5:2 E5:4 | D5:2 G5:2 B5:3 A5:1 B5:2 G5:2 D5:4 | C5:2 E5:2 A5:3 G5:1 A5:2 E5:2 C5:4 | A4:2 C5:2 F5:4 E5:4 r:4 |' +
          'E5:2 G5:2 C6:3 D6:1 E6:2 D6:2 C6:4 | B5:2 D6:2 G5:4 r:8 | A5:2 C6:2 E6:3 D6:1 C6:2 A5:2 E5:4 | F5:2 A5:2 G5:4 r:8' },
        { inst: 'pluck', arp: { low: 60, order: [0, 1, 2, 1], rate: 2 }, gain: 0.8 },
        { inst: 'pad', comp: { mask: 'x...............', len: 16, low: 53 }, gain: 0.5 },
        { inst: 'bass', bass: { figure: 'R:2', low: 36 }, gain: 0.8 },
        { drums: {
          kick:   'x...x...x...x...',
          clap:   '....x.......x...',
          hat:    '..x...x...x...x.',
          shaker: '.o.o.o.o.o.o.o.o'
        } }
      ]
    },

    // ---------------------------------------------------------------------------
    // 2020: quiet lo-fi. Soft, a little melancholy, but warm.
    // ---------------------------------------------------------------------------
    e2020: {
      bpm: 74, swing: 0.15, fadeIn: 1.0, radio: 'vinyl', level: 0.85,
      prog: 'Fmaj7:16 Em7:16 Dm7:16 Cmaj7:16',
      parts: [
        { inst: 'rhodes', comp: { mask: 'x.........x.....', len: 10, low: 57 } },
        { inst: 'flute', notes: 'A5:4 G5:2 E5:2 r:8 | G5:4 E5:2 D5:2 r:8 | F5:4 E5:2 C5:2 r:8 | E5:8 r:8', gain: 0.55 },
        { inst: 'upright', bass: { figure: 'R:8 r:4 5:4', low: 38 } },
        { drums: {
          kick:  'x......x..x.....',
          snare: '....o.......o...',
          hat:   'o.o.o.o.o.o.o.o.'
        } }
      ]
    }
  };

  // Parts with `ref` double another part's melody (e.g. an octave down).
  Object.keys(TRACKS).forEach(function (name) {
    var parts = TRACKS[name].parts;
    parts.forEach(function (p) {
      if (!p.ref) return;
      for (var i = 0; i < parts.length; i++) if (parts[i] !== p && parts[i].inst === p.ref && parts[i].notes) { p.notes = parts[i].notes; return; }
      throw new Error('[NW.audio] track ' + name + ': ref "' + p.ref + '" not found');
    });
  });

  // ===========================================================================
  // Music: playback (lookahead scheduler)
  // ===========================================================================

  var LOOKAHEAD = 0.15; // seconds of audio scheduled ahead
  var TICK_MS = 25;     // scheduler wake-up interval
  var current = null;   // playing track instance
  var fading = [];      // instances fading out
  var wantTrack = null; // last requested track name (survives until unlock)
  var timer = null;

  function startTrack(name, opts) {
    var def = compileTrack(name);
    var c = ctx, now = c.currentTime, t0 = now + 0.05;
    var fadeIn = (opts && typeof opts.fadeIn === 'number') ? opts.fadeIn : def.fadeIn;
    var inst = { name: name, def: def, step: 0, next: t0, stopAt: null, nodes: [] };

    var out = c.createGain();
    out.gain.setValueAtTime(0, now);
    out.gain.setValueAtTime(0, t0);
    out.gain.linearRampToValueAtTime(def.level, t0 + Math.max(0.01, fadeIn));
    out.connect(bus.music);
    var fadeNode = out;
    if (def.radio) out = addRadio(inst, def.radio, fadeNode); // period "speaker" coloring + crackle

    // Per-track tempo-synced echo (feedback delay with damping)
    var dly = c.createDelay(2);
    dly.delayTime.value = Math.min(1.9, def.stepDur * def.echoSteps);
    var damp = c.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2200;
    var fb = c.createGain();
    fb.gain.value = def.echoFb;
    var wet = c.createGain();
    wet.gain.value = 0.55;
    dly.connect(damp); damp.connect(fb); fb.connect(dly);
    damp.connect(wet); wet.connect(out);

    inst.out = fadeNode;
    inst.nodes.push(fadeNode, out, dly, damp, fb, wet);

    // One small chain per part: [filter] -> gain -> [pan] -> out (+ echo send)
    inst.pn = def.parts.map(function (p) {
      var g = c.createGain();
      inst.nodes.push(g);
      if (p.drums) {
        g.gain.value = p.gain;
        g.connect(out);
        return { input: g };
      }
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = p.inst.cut || 4000;
      f.Q.value = p.inst.q || 0.7;
      g.gain.value = p.inst.gain * p.gain;
      f.connect(g);
      var tail = g;
      if (p.pan && typeof c.createStereoPanner === 'function') {
        var pan = c.createStereoPanner();
        pan.pan.value = p.pan;
        g.connect(pan);
        tail = pan;
        inst.nodes.push(pan);
      }
      tail.connect(out);
      if (p.echo > 0) {
        var send = c.createGain();
        send.gain.value = p.echo;
        tail.connect(send);
        send.connect(dly);
        inst.nodes.push(send);
      }
      inst.nodes.push(f);
      return { input: f };
    });
    return inst;
  }

  function fadeOut(inst, dur) {
    var t = ctx.currentTime;
    var p = inst.out.gain;
    holdParam(p, t);
    p.linearRampToValueAtTime(0, t + Math.max(0.02, dur));
    inst.stopAt = t + Math.max(0.02, dur);
    fading.push(inst);
  }

  // Period playback coloring. Each era's music comes out of an era-appropriate
  // "speaker": a 1920s gramophone horn, a 1930s-40s tube radio, a 1950s jukebox,
  // or a 90s/2020 vinyl-sampled beat. Band-limiting + a looped crackle buffer.
  var RADIO = {
    gramophone: { hp: 480, lp: 2700, peakF: 1500, peakG: 5, clicks: 34, hiss: 0.014, crackle: 0.055 },
    radio:      { hp: 300, lp: 3400, peakF: 1800, peakG: 3, clicks: 10, hiss: 0.007, crackle: 0.04 },
    jukebox:    { hp: 70,  lp: 5200, peakF: 0,    peakG: 0, clicks: 3,  hiss: 0.003, crackle: 0.03 },
    vinyl:      { hp: 0,   lp: 0,    peakF: 0,    peakG: 0, clicks: 9,  hiss: 0.004, crackle: 0.045 }
  };

  function addRadio(inst, kind, dest) {
    var R = RADIO[kind] || RADIO.radio, c = ctx;
    var input = c.createGain(), node = input;
    inst.nodes.push(input);
    if (R.hp) { var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = R.hp; node.connect(hp); node = hp; inst.nodes.push(hp); }
    if (R.lp) { var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = R.lp; lp.Q.value = 0.9; node.connect(lp); node = lp; inst.nodes.push(lp); }
    if (R.peakF) { var pk = c.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = R.peakF; pk.gain.value = R.peakG; pk.Q.value = 0.8; node.connect(pk); node = pk; inst.nodes.push(pk); }
    node.connect(dest);
    // Crackle + hiss: 2 s buffer of sparse decaying clicks over faint noise, looped.
    try {
      var sr = c.sampleRate, len = Math.floor(sr * 2), buf = c.createBuffer(1, len, sr), dd = buf.getChannelData(0);
      for (var i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * R.hiss;
      for (var k = 0; k < R.clicks * 2; k++) {
        var at = Math.floor(Math.random() * (len - 200)), amp = (0.25 + Math.random() * 0.75) * (Math.random() < 0.5 ? -1 : 1);
        var decay = 4 + Math.random() * 24;
        for (var j = 0; j < 160; j++) dd[at + j] += amp * Math.exp(-j / decay);
      }
      var src = c.createBufferSource(), cg = c.createGain();
      src.buffer = buf; src.loop = true; cg.gain.value = R.crackle;
      src.connect(cg); cg.connect(dest);
      src.start(c.currentTime + 0.02);
      inst.srcs = [src];
      inst.nodes.push(cg);
    } catch (e) { /* crackle is optional */ }
    return input;
  }

  function teardown(inst) {
    if (inst.srcs) inst.srcs.forEach(function (s) { try { s.stop(); } catch (e) { /* ignore */ } });
    for (var i = 0; i < inst.nodes.length; i++) {
      try { inst.nodes[i].disconnect(); } catch (e) { /* ignore */ }
    }
    inst.nodes.length = 0;
  }

  /** Schedule one note of a melodic part. */
  function playNote(p, ev, t, stepDur, dest) {
    var c = ctx, I = p.inst;
    var dur = Math.max(0.04, ev.l * stepDur * p.gate);
    var peak = ev.v / Math.sqrt(ev.n.length);
    var a = I.a || 0.005, d = I.d || 0.1, s = I.s == null ? 0.7 : I.s, r = I.r || 0.06;
    var relAt = t + Math.max(dur, a + 0.005);
    var end = relAt + r * 2.5 + 0.03;
    if (s === 0) end = Math.min(end, t + a + d * 2.2 + 0.03); // plucks die on their own

    var g = c.createGain(), gp = g.gain;
    gp.setValueAtTime(0, t);
    gp.linearRampToValueAtTime(peak, t + a);
    if (s < 1) gp.setTargetAtTime(peak * s, t + a, Math.max(0.005, d / 3));
    if (relAt < end) gp.setTargetAtTime(0, relAt, Math.max(0.005, r / 3));
    g.connect(dest);

    var head = g;
    if (I.fenv) {
      var fl = c.createBiquadFilter();
      fl.type = 'lowpass';
      fl.Q.value = I.fq || 1;
      fl.frequency.setValueAtTime(I.fenv[0], t);
      fl.frequency.exponentialRampToValueAtTime(I.fenv[1], t + I.fenv[2]);
      fl.connect(g);
      head = fl;
    }

    for (var i = 0; i < ev.n.length; i++) {
      var f = mtof(ev.n[i] + p.transpose);
      var o = c.createOscillator();
      setWave(o, I.wave);
      o.frequency.setValueAtTime(f, t);
      if (I.bend) {
        o.detune.setValueAtTime(I.bend * 100, t);
        o.detune.linearRampToValueAtTime(0, t + (I.bendT || 0.06));
      }
      o.connect(head);
      o.start(t);
      o.stop(end);

      var o2 = null;
      if (I.wave2) {
        o2 = c.createOscillator();
        setWave(o2, I.wave2);
        o2.frequency.setValueAtTime(f * (I.ratio2 || 1), t);
        var det2 = I.detune2 || 0;
        if (I.bend) {
          o2.detune.setValueAtTime(det2 + I.bend * 100, t);
          o2.detune.linearRampToValueAtTime(det2, t + (I.bendT || 0.06));
        } else if (det2) {
          o2.detune.setValueAtTime(det2, t);
        }
        var g2 = c.createGain();
        g2.gain.value = I.mix2 == null ? 0.5 : I.mix2;
        o2.connect(g2);
        g2.connect(head);
        o2.start(t);
        o2.stop(end);
      }

      if (I.vib && dur > I.vib[2] + 0.08) {
        var lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = I.vib[0];
        lg.gain.setValueAtTime(0, t);
        lg.gain.setValueAtTime(0, t + I.vib[2]);
        lg.gain.linearRampToValueAtTime(I.vib[1], t + I.vib[2] + 0.2);
        lfo.connect(lg);
        lg.connect(o.detune);
        if (o2) lg.connect(o2.detune);
        lfo.start(t);
        lfo.stop(end);
      }
    }
  }

  /** Schedule everything that starts on `step` of a track at time t. */
  function scheduleStep(inst, step, t) {
    var def = inst.def;
    if (step % 2 === 1) t += def.swing * def.stepDur;
    for (var i = 0; i < def.parts.length; i++) {
      var p = def.parts[i], dest = inst.pn[i].input;
      if (p.drums) {
        for (var j = 0; j < p.lanes.length; j++) {
          var L = p.lanes[j], v = L.hits[step % L.len];
          if (v) DRUMS[L.kind](t, v, dest);
        }
      } else {
        var evs = p.byStep[step % p.len];
        if (evs) for (var k = 0; k < evs.length; k++) playNote(p, evs[k], t, def.stepDur, dest);
      }
    }
  }

  function service(inst, now) {
    if (inst.next < now - 0.25) inst.next = now + 0.03; // timers were throttled: skip ahead, don't burst
    var horizon = now + LOOKAHEAD;
    if (inst.stopAt != null) horizon = Math.min(horizon, inst.stopAt);
    var silent = settings.muted || settings.master <= 0 || settings.music <= 0;
    var guard = 0;
    while (inst.next < horizon && guard++ < 64) {
      if (!silent) {
        try { scheduleStep(inst, inst.step, inst.next); } catch (e) { warnOnce('music "' + inst.name + '" error: ' + (e && e.message)); }
      }
      inst.step++;
      inst.next += inst.def.stepDur;
    }
  }

  function tick() {
    if (!ctx) return;
    var now = ctx.currentTime;
    if (current) service(current, now);
    for (var i = fading.length - 1; i >= 0; i--) {
      var f = fading[i];
      service(f, now);
      if (now > f.stopAt + 2.5) { teardown(f); fading.splice(i, 1); } // leave time for echo tails
    }
    if (!current && !fading.length && timer) { clearInterval(timer); timer = null; }
  }

  function ensureTimer() {
    if (timer || !ctx || typeof setInterval !== 'function') return;
    timer = setInterval(tick, TICK_MS);
  }

  /** Actually switch tracks (context exists and is unlocked). */
  function switchTo(name, opts) {
    var curName = current ? current.name : null;
    if (curName === name) return;
    var fade;
    if (opts && typeof opts.fade === 'number') fade = opts.fade;
    else if (name && TRACKS[name].cut) fade = 0.15; // pursuit/victory slam in
    else fade = name ? 0.7 : 0.9;
    if (current) { fadeOut(current, fade); current = null; }
    if (name) {
      try { current = startTrack(name, opts); } catch (e) { current = null; warnOnce('could not start "' + name + '": ' + (e && e.message)); }
    }
    ensureTimer();
    tick();
  }

  function music(name, opts) {
    name = name || null;
    if (name && !Object.prototype.hasOwnProperty.call(TRACKS, name)) {
      warnOnce('unknown music track "' + name + '"');
      return;
    }
    wantTrack = name;
    if (!ctx || !unlocked) return; // will start in unlock()
    switchTo(name, opts);
  }

  // ===========================================================================
  // Unlock, visibility, settings API
  // ===========================================================================

  function unlock() {
    if (broken) rebuildCtx();
    var c = ensureCtx();
    if (!c) return;
    if (c.state !== 'running' && c.state !== 'closed' && !docHidden()) {
      try { quiet(c.resume()); } catch (e) { /* ignore */ }
    }
    if (!unlocked) {
      unlocked = true;
      hiddenPause = false;
      try { // iOS Safari: play one silent sample inside the gesture
        var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
        s.buffer = b; s.connect(c.destination); s.start(0);
      } catch (e) { /* ignore */ }
      if (wantTrack && !current) switchTo(wantTrack);
    }
  }

  if (AC && typeof document !== 'undefined' && document && typeof document.addEventListener === 'function') {
    // Safety net: unlock on the first gesture anywhere even if the UI forgets to.
    var onGesture = function () { if (broken || !ctx || ctx.state !== 'running') unlock(); };
    ['pointerdown', 'mousedown', 'touchend', 'keydown'].forEach(function (ev) {
      document.addEventListener(ev, onGesture, true);
    });
    // Pause all audio while the tab is hidden (timers get throttled anyway).
    document.addEventListener('visibilitychange', function () {
      if (!ctx || !unlocked) return;
      try {
        if (document.hidden) { hiddenPause = true; quiet(ctx.suspend()); }
        else { hiddenPause = false; quiet(ctx.resume()); }
      } catch (e) { /* ignore */ }
    });
  }

  function setVolume(v) {
    if (v && typeof v === 'object') {
      VOL_KEYS.forEach(function (k) { if (typeof v[k] === 'number' && isFinite(v[k])) settings[k] = clamp01(v[k]); });
      if (typeof v.muted === 'boolean') settings.muted = v.muted;
      saveSettings();
      applyVolumes(false);
    }
    return getSettings();
  }

  function getSettings() { return extend({}, settings); }

  function setMuted(b) {
    settings.muted = !!b;
    saveSettings();
    applyVolumes(false);
    return settings.muted;
  }

  function isMuted() { return !!settings.muted; }

  // ===========================================================================
  // Dev helper: render a track / sfx / blip offline and measure levels.
  //   NW.audio._renderOffline('music', 'title', 20).then(console.log)
  // Uses current volume settings, so the numbers reflect what players hear.
  // ===========================================================================

  function renderOffline(kind, name, seconds) {
    var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('OfflineAudioContext unavailable'));
    seconds = seconds || 10;
    var sr = 44100, off = new OAC(2, Math.ceil(sr * seconds), sr);
    var saved = { ctx: ctx, bus: bus, waves: waves, noiseBuf: noiseBuf };
    try {
      ctx = off;
      buildGraph();
      if (kind === 'music') {
        var inst = startTrack(name, { fadeIn: 0.01 });
        while (inst.next < seconds) { scheduleStep(inst, inst.step, inst.next); inst.step++; inst.next += inst.def.stepDur; }
      } else if (kind === 'sfx') {
        (SFX[name] || SFX._default)(0.01, bus.sfx);
      } else if (kind === 'blip') {
        for (var i = 0; i < 20; i++) blipAt(name, 0.01 + i * 0.07);
      }
    } finally {
      ctx = saved.ctx; bus = saved.bus; waves = saved.waves; noiseBuf = saved.noiseBuf;
    }
    return off.startRendering().then(function (buf) {
      var peak = 0, sum = 0, n = 0;
      for (var ch = 0; ch < buf.numberOfChannels; ch++) {
        var d = buf.getChannelData(ch);
        for (var k = 0; k < d.length; k++) { var x = Math.abs(d[k]); if (x > peak) peak = x; sum += x * x; n++; }
      }
      return { kind: kind, name: name, seconds: seconds, peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4) };
    });
  }

  /** Blip at an explicit time (used by the offline renderer). */
  function blipAt(voice, t) {
    var V = VOICES[voice] || VOICES.mid;
    if (V.noise) {
      noise(bus.blips, { t: t, dur: 0.028, a: 0.001, peak: 0.45, ftype: 'bandpass', f: 2600, q: 2.5 });
      tone(bus.blips, { wave: 'sine', f: 1100, f2: 700, t: t, dur: 0.03, peak: 0.14 });
    } else {
      tone(bus.blips, { wave: V.wave, f: V.f, f2: V.f2 || 0, t: t, dur: V.dur, a: 0.002, hold: V.dur * 0.4, peak: V.peak, cut: V.cut });
    }
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  NW.audio = {
    available: !!AC,
    unlock: unlock,
    blip: blip,
    sfx: sfx,
    music: music,
    setVolume: setVolume,
    getSettings: getSettings,
    setMuted: setMuted,
    isMuted: isMuted,
    currentMusic: function () { return wantTrack; },
    list: function () {
      return {
        tracks: Object.keys(TRACKS),
        sfx: Object.keys(SFX).filter(function (k) { return k.charAt(0) !== '_'; }),
        voices: Object.keys(VOICES)
      };
    },
    _health: function () { return { broken: broken, state: ctx ? ctx.state : 'none', generation: ctxGen }; }, // dev/test
    _breakForTest: function () { broken = true; },                                                         // dev/test
    _compileTrack: compileTrack,   // dev/test: parse a track and return its compiled form
    _renderOffline: renderOffline  // dev/test: see above
  };
})(typeof window !== 'undefined' ? window : globalThis);
