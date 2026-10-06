/*
 * game.js — runs the visit: draws each era, handles clicking on people and
 * things, types out dialogue, food ordering, the tea "tap", time shifts,
 * and the ending. All words/people/places come from js/story.js.
 */
(function () {
  'use strict';

  var ST = window.STORY, ART = window.ART;
  var NOOP = function () {};
  var AU = (window.NW && window.NW.audio) || { unlock: NOOP, blip: NOOP, sfx: NOOP, music: NOOP, setMuted: NOOP, isMuted: function () { return true; } };
  var CAST = ST.CAST, STOPS = ST.STOPS;

  // ------------------------------------------------------------------ dom
  function $(s, el) { return (el || document).querySelector(s); }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var E = {
    app: $('#app'), stageWrap: $('#stage-wrap'), stage: $('#stage'), zoom: $('#zoom'), host: $('#scene-host'), spots: $('#spots'),
    grade: $('#grade'), eraTag: $('#era-tag'), timeline: $('#timeline'), sound: $('#sound-btn'),
    dialog: $('#dialog'), nametag: $('#nametag'), text: $('#dialog-text'), live: $('#dialog-live'), nextInd: $('#next-ind'),
    prompt: $('#prompt'), nextBtn: $('#next-action'), panel: $('#panel'),
    overlay: $('#overlay'), shift: $('#shift'), caption: $('#caption'), flash: $('#flash'), cover: $('#cover')
  };

  // ------------------------------------------------------------------ state
  var state = {
    name: 'Friend', named: false, stop: -1, scene: null, done: {}, sceneDoneRan: {}, busy: true,
    items: [], tea: null, actors: {}, zoom: 1, ended: false
  };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, reduceMotion ? Math.min(ms, 250) : ms); }); }
  function fmt(t) { return String(t).replace(/\{name\}/g, state.name); }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stopDef() { return STOPS[state.stop]; }

  // ------------------------------------------------------------------ scene rendering
  function actorTop(a) {
    var c = CAST[a.id];
    return a.y + a.s * ART.personTop(c.look);
  }

  function actorSvg(a, expr) {
    var c = CAST[a.id];
    var delay = ((a.x * 7) % 37) / 10; // de-sync blinking
    return '<g id="actor-' + a.id + '" class="actor' + (a.isNew ? ' actor-enter' : '') + '" data-id="' + a.id + '" transform="translate(' + a.x + ',' + a.y + ') scale(' + a.s + ')" style="--blink-delay:-' + delay + 's">' +
      ART.person(c.look, { expr: expr || a.expr }) + '</g>';
  }

  function renderScene(key) {
    var stop = stopDef(), sc = stop.scenes[key];
    state.scene = key;
    state.actors = {};
    var near = '', far = '', carts = '';
    (sc.actors || []).forEach(function (a0) {
      var a = Object.assign({}, a0);
      state.actors[a.id] = a;
      if (a.y < 800) far += actorSvg(a); else near += actorSvg(a);
      if (a.cart) carts += ART.cart(a.x);
    });
    var svg = '<svg class="scene-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><filter id="fx-dim"><feComponentTransfer><feFuncR type="linear" slope=".68"/><feFuncG type="linear" slope=".68"/><feFuncB type="linear" slope=".72"/></feComponentTransfer></filter>' +
      '<filter id="fx-glow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="#fff3b0" flood-opacity=".95"/></filter></defs>';
    var hits = '<g class="hit-layer">' + spotsHere().filter(function (sp) { return sp.area; }).map(function (sp) {
      return '<rect class="hit" data-spot="' + sp.id + '" x="' + sp.area[0] + '" y="' + sp.area[1] + '" width="' + sp.area[2] + '" height="' + sp.area[3] +
        '" rx="10" fill="transparent" pointer-events="all"><title>' + sp.label + '</title></rect>';
    }).join('') + '</g>';
    if (sc.kind === 'room') {
      var r = ART.room(sc.room);
      svg += '<g class="room-back">' + r.back + '</g>' + hits + '<g class="layer-far">' + far + '</g><g class="room-front">' + r.front + '</g>' +
        '<g class="layer-near">' + near + '</g><g class="layer-carts">' + carts + '</g><g id="table-layer">' + tableSvg() + '</g>';
    } else {
      svg += ART.street(sc.era) + hits + '<g class="layer-far">' + far + '</g><g class="layer-near">' + near + '</g>';
    }
    svg += '</svg>';
    E.host.innerHTML = svg;
    var z = sc.startZoom || [1, 800, 470];
    setZoom(z[0], z[1], z[2], true);
    renderSpots();
  }

  function tableSvg() {
    var sc = stopDef().scenes[state.scene];
    if (!sc || sc.kind !== 'room') return '';
    return ART.table(sc.room, state.items, state.tea && ST.TEAS[state.tea].color);
  }
  function refreshTable() {
    var t = $('#table-layer');
    if (t) t.innerHTML = tableSvg();
  }

  function setActorExpr(id, expr) {
    var a = state.actors[id], g = $('#actor-' + id);
    if (!a || !g) return;
    if ((a.expr || 'smile') === (expr || 'smile')) return;
    a.expr = expr;
    g.innerHTML = ART.person(CAST[id].look, { expr: expr });
  }

  function setSpeaker(id) {
    var gs = E.host.querySelectorAll('.actor');
    for (var i = 0; i < gs.length; i++) {
      var me = gs[i].getAttribute('data-id');
      gs[i].classList.toggle('speaking', !!id && me === id);
      gs[i].classList.toggle('dim', !!id && me !== id);
    }
  }
  function setTalking(id, on) {
    var g = id && $('#actor-' + id);
    if (g) g.classList.toggle('talking', on);
  }
  function clearSpeaker() {
    var gs = E.host.querySelectorAll('.actor');
    for (var i = 0; i < gs.length; i++) gs[i].classList.remove('speaking', 'dim', 'talking');
  }

  function setZoom(s, x, y, instant) {
    state.zoom = s;
    E.zoom.style.transition = instant || reduceMotion ? 'none' : '';
    E.zoom.style.transformOrigin = (x / 16) + '% ' + (y / 9) + '%';
    E.zoom.style.transform = s === 1 ? '' : 'scale(' + s + ')';
  }

  // ------------------------------------------------------------------ hotspots
  function spotsHere() {
    var stop = stopDef();
    return stop.spots.filter(function (sp) { return (sp.scene || stop.start) === state.scene; });
  }

  function spotPos(sp) {
    if (sp.at) return sp.at;
    var a = state.actors[sp.actor];
    if (!a) return null;
    return [a.x, actorTop(a) - 10];
  }

  function renderSpots() {
    E.spots.innerHTML = '';
    var gs = E.host.querySelectorAll('.actor');
    for (var i = 0; i < gs.length; i++) gs[i].classList.remove('clickable');
    if (!stopDef()) return;
    spotsHere().forEach(function (sp) {
      [sp.actor, sp.alsoActor].forEach(function (id) { var g = id && $('#actor-' + id); if (g) g.classList.add('clickable'); });
      var actorPresent = !sp.actor || state.actors[sp.actor];
      if (!actorPresent) return;
      var done = !!state.done[sp.id];
      var p = spotPos(sp);
      if (!p) return;
      var m = h('button', 'spot' + (sp.actor ? ' spot-person' : ' spot-thing') + (sp.required ? ' spot-required' : ' spot-optional') + (done ? ' spot-done' : ''));
      m.innerHTML = '<span class="spot-icon" aria-hidden="true">' + (done ? '✓' : (sp.actor ? '…' : '✦')) + '</span><span class="spot-label">' + sp.label + '</span>';
      m.setAttribute('aria-label', (sp.actor ? 'Talk to ' : 'Look at ') + sp.label + (done ? ' (done)' : ''));
      m.style.left = (p[0] / 16) + '%'; m.style.top = (p[1] / 9) + '%';
      m.addEventListener('click', function (ev) { ev.stopPropagation(); activate(sp); });
      E.spots.appendChild(m);
    });
  }

  // clicking a person in the drawing
  E.host.addEventListener('click', function (ev) {
    if (state.busy || !ev.target.closest) return;
    var g = ev.target.closest('.actor'), sp = null;
    if (g) {
      var id = g.getAttribute('data-id');
      sp = spotsHere().filter(function (s) { return s.actor === id || s.alsoActor === id; })[0];
    } else {
      var hit = ev.target.closest('.hit');
      if (hit) sp = spotsHere().filter(function (s) { return s.id === hit.getAttribute('data-spot'); })[0];
    }
    if (sp) { ev.stopPropagation(); activate(sp); }
  });

  function setInteractive(on) {
    state.busy = !on;
    E.app.classList.toggle('is-busy', !on);
    if (on) {
      hideDialog();
      clearSpeaker();
      Object.keys(state.actors).forEach(function (id) { setActorExpr(id, null); }); // back to a friendly default face
      renderSpots();
      updatePrompt();
    } else {
      E.prompt.classList.remove('show');
    }
  }

  function requiredLeft(sceneOnly) {
    var stop = stopDef();
    return stop.spots.filter(function (sp) {
      if (!sp.required || state.done[sp.id]) return false;
      return !sceneOnly || (sp.scene || stop.start) === state.scene;
    });
  }

  function updatePrompt() {
    var stop = stopDef();
    var req = stop.spots.filter(function (sp) { return sp.required && (sp.scene || stop.start) === state.scene; });
    var doneN = req.filter(function (sp) { return state.done[sp.id]; }).length;
    if (requiredLeft().length === 0) {
      E.prompt.classList.remove('show');
      showNextButton(stop.next, function () { nextStop(); });
      return;
    }
    E.prompt.innerHTML = '<span>' + ((stop.prompts && stop.prompts[state.scene]) || stop.prompt) + '</span>' + (req.length ? '<b>' + doneN + ' / ' + req.length + '</b>' : '');
    E.prompt.classList.add('show');
  }

  async function activate(sp) {
    if (state.busy) return;
    AU.sfx('click');
    setInteractive(false);
    try {
      await run(sp.script);
    } catch (e) { console.error(e); }
    state.done[sp.id] = true;
    // a scene's required spots all done? run its follow-up once
    var stop = stopDef(), key = state.scene;
    if (stop.sceneDone && stop.sceneDone[key] && !state.sceneDoneRan[key] && requiredLeft(true).length === 0) {
      state.sceneDoneRan[key] = true;
      try { await run(stop.sceneDone[key]); } catch (e2) { console.error(e2); }
    }
    setInteractive(true);
  }

  // ------------------------------------------------------------------ dialogue
  var advanceResolver = null, typing = null;

  function hideDialog() { E.dialog.classList.remove('show'); E.nextInd.classList.remove('show'); }

  function waitAdvance() {
    return new Promise(function (res) { advanceResolver = res; });
  }
  function advance() {
    if (typing) { typing.finish(); return; }
    if (advanceResolver) { var r = advanceResolver; advanceResolver = null; AU.sfx('cursor'); r(); }
  }

  E.dialog.addEventListener('click', function (ev) { ev.stopPropagation(); advance(); });
  E.stage.addEventListener('click', function () { if (advanceResolver || typing) advance(); });
  document.addEventListener('keydown', function (ev) {
    if (ev.target && /input|textarea/i.test(ev.target.tagName)) return;
    if (ev.key === ' ' || ev.key === 'Enter') {
      if (advanceResolver || typing) { ev.preventDefault(); advance(); }
    }
  });

  function typeText(el, text, voice) {
    return new Promise(function (resolve) {
      var i = 0, timer = null, n = 0;
      el.textContent = '';
      var span = document.createElement('span');
      el.appendChild(span);
      function finish() {
        clearTimeout(timer);
        span.textContent = text;
        typing = null;
        resolve();
      }
      typing = { finish: finish };
      function tick() {
        if (i >= text.length) { finish(); return; }
        var ch = text.charAt(i++);
        span.textContent = text.slice(0, i);
        if (ch !== ' ' && (n++ % 2 === 0)) AU.blip(voice);
        var d = 22;
        if (/[.!?]/.test(ch) && text.charAt(i) === ' ') d = 260;
        else if (/[,;:]/.test(ch)) d = 120;
        else if (ch === '—' || ch === '…') d = 160;
        timer = setTimeout(tick, d);
      }
      tick();
    });
  }

  async function say(who, text, expr) {
    text = fmt(text);
    var isNarr = who === 'narr', isYou = who === 'you';
    var c = CAST[who];
    E.dialog.classList.add('show');
    E.dialog.classList.toggle('narr', isNarr);
    E.dialog.classList.toggle('you', isYou);
    E.nextInd.classList.remove('show');
    if (isNarr) { E.nametag.textContent = ''; E.nametag.classList.remove('show'); }
    else { E.nametag.textContent = isYou ? (state.named ? state.name : 'You') : (c ? c.name : who); E.nametag.classList.add('show'); }
    var speaking = null;
    if (c && state.actors[who]) {
      if (expr) setActorExpr(who, expr);
      setSpeaker(who);
      speaking = who;
    } else if (isNarr) {
      setSpeaker(null);
    }
    E.live.textContent = (isNarr ? '' : E.nametag.textContent + ': ') + text;
    setTalking(speaking, true);
    await typeText(E.text, text, isNarr ? 'narr' : isYou ? 'mid' : (c ? c.voice : 'mid'));
    setTalking(speaking, false);
    E.nextInd.classList.add('show');
    await waitAdvance();
    E.nextInd.classList.remove('show');
  }

  // ------------------------------------------------------------------ special steps
  function showModal(node, cls) {
    E.overlay.innerHTML = '';
    E.overlay.className = 'overlay show ' + (cls || '');
    E.overlay.appendChild(node);
  }
  function closeModal() { E.overlay.className = 'overlay'; E.overlay.innerHTML = ''; }

  function askName() {
    return new Promise(function (resolve) {
      var box = h('form', 'ticket');
      box.innerHTML =
        '<div class="ticket-head"><span>南華茶室</span><b>NOM WAH TEA PARLOR</b><span>15 Doyers St.</span></div>' +
        '<label for="name-in">Name for the table</label>' +
        '<input id="name-in" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Your name">' +
        '<button type="submit" class="btn btn-red">That\'s me!</button>';
      showModal(box, 'modal-ticket');
      var input = $('#name-in', box);
      setTimeout(function () { input.focus(); }, 60);
      box.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var v = input.value.replace(/\s+/g, ' ').trim().slice(0, 16);
        state.name = v || 'Friend';
        state.named = true;
        AU.sfx('select');
        closeModal();
        resolve();
      });
    });
  }

  function cardsModal(title, cards, onPick) {
    var wrap = h('div', 'menu-card');
    wrap.innerHTML = '<div class="menu-title">' + title + '</div>';
    var row = h('div', 'menu-row');
    cards.forEach(function (c) {
      var b = h('button', 'food-card');
      b.innerHTML = '<svg viewBox="-110 -80 220 140" aria-hidden="true">' + c.svg + '</svg>' +
        '<span class="food-en">' + c.en + '</span>' + (c.zh ? '<span class="food-zh">' + c.zh + '</span>' : '') +
        (c.desc ? '<span class="food-desc">' + c.desc + '</span>' : '');
      b.addEventListener('click', function () { onPick(c.id); });
      row.appendChild(b);
    });
    wrap.appendChild(row);
    showModal(wrap, 'modal-menu');
  }

  async function order(o) {
    hideDialog();
    var id = await new Promise(function (resolve) {
      cardsModal(o.prompt || (o.who === 'narr' ? 'What would you like?' : 'Pick something from the ' + (o.who === 'auntie50' ? 'tray' : 'cart') + ':'),
        o.options.map(function (d) { var D = ST.DISHES[d]; return { id: d, en: D.en, zh: D.zh, desc: D.desc, svg: ART.food(d) }; }),
        function (d) { closeModal(); resolve(d); });
    });
    addDish(id);
    var D = ST.DISHES[id];
    var lines = ['Good choice!', 'Ho sik — delicious!', 'Coming right up!'];
    state.orders = (state.orders || 0) + 1;
    if (o.who && o.who !== 'narr') await say(o.who, lines[(state.orders - 1) % lines.length] + ' One ' + D.en.toLowerCase().replace(/^the /, '') + '.', 'happy');
  }

  async function chooseTea(o) {
    hideDialog();
    var id = await new Promise(function (resolve) {
      cardsModal('Which tea?', Object.keys(ST.TEAS).map(function (k) {
        var T = ST.TEAS[k];
        return { id: k, en: T.en, zh: T.zh, svg: '<g transform="translate(-40,30) scale(1.2)">' + ART.teapotSvg() + '</g><g transform="translate(62,34) scale(1.3)">' + ART.cupSvg(T.color) + '</g>' };
      }), function (k) { closeModal(); resolve(k); });
    });
    state.tea = id;
    AU.sfx('pour');
    refreshTable();
    await say(o.who, ST.TEAS[id].line);
  }

  function tapTable() {
    hideDialog();
    return new Promise(function (resolve) {
      var n = 0;
      var pad = h('button', 'tap-pad');
      pad.innerHTML = '<span class="tap-fingers" aria-hidden="true">☝☝</span><span class="tap-text">Tap the table with two fingers to say thanks</span><span class="tap-count">0 / 2</span>';
      E.stage.appendChild(pad);
      pad.focus({ preventScroll: true });
      pad.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (n >= 2) return;
        n++;
        AU.sfx('tap');
        pad.classList.remove('tapped'); void pad.offsetWidth; pad.classList.add('tapped');
        $('.tap-count', pad).textContent = n + ' / 2';
        if (n >= 2) { setTimeout(function () { pad.remove(); resolve(); }, 380); }
      });
    });
  }

  function addDish(id) {
    state.items.forEach(function (it) { it.fresh = false; });
    if (state.items.some(function (it) { return it.type === id; })) return;
    state.items.push({ type: id, fresh: true });
    AU.sfx('chime');
    refreshTable();
  }

  async function caption(text) {
    E.caption.textContent = fmt(text);
    E.caption.classList.add('show');
    AU.sfx('whoosh');
    await sleep(1700);
    E.caption.classList.remove('show');
    await sleep(300);
  }

  async function flash() {
    E.flash.classList.remove('go'); void E.flash.offsetWidth; E.flash.classList.add('go');
    AU.sfx('reveal');
    await sleep(380);
  }

  async function swapActor(from, to) {
    var a = state.actors[from];
    if (!a) return;
    await flash();
    var b = Object.assign({}, a, { id: to, expr: null, isNew: false });
    delete state.actors[from];
    state.actors[to] = b;
    var g = $('#actor-' + from);
    if (g) g.outerHTML = actorSvg(b);
    // spots attached to the old id now point at the new one
    stopDef().spots.forEach(function (sp) { if (sp.actor === from) sp._actorWas = from; });
  }

  async function enterActor(id) {
    var ex = stopDef().extras && stopDef().extras[id];
    if (!ex) return;
    var a = Object.assign({ id: id, isNew: true }, ex);
    state.actors[id] = a;
    var layer = $('.layer-near'), carts = $('.layer-carts');
    if (layer) layer.insertAdjacentHTML('beforeend', actorSvg(a));
    if (a.cart && carts) carts.insertAdjacentHTML('beforeend', '<g class="cart-enter">' + ART.cart(a.x) + '</g>');
    await sleep(750);
  }

  async function switchScene(key) {
    E.cover.classList.add('show');
    await sleep(380);
    renderScene(key);
    await sleep(120);
    E.cover.classList.remove('show');
    await sleep(380);
  }

  function waitButton(label) {
    return new Promise(function (resolve) {
      hideDialog();
      showNextButton(label, resolve);
    });
  }

  function showNextButton(label, fn) {
    E.nextBtn.innerHTML = '<span>' + label + '</span><i aria-hidden="true">→</i>';
    E.nextBtn.classList.add('show');
    E.nextBtn.onclick = function (ev) {
      ev.stopPropagation();
      E.nextBtn.classList.remove('show');
      E.nextBtn.onclick = null;
      AU.sfx('select');
      fn();
    };
    setTimeout(function () { try { E.nextBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 50);
  }

  async function run(steps) {
    for (var i = 0; i < (steps || []).length; i++) await step(steps[i]);
  }

  async function step(st) {
    if (Array.isArray(st)) return say(st[0], st[1], st[2]);
    if (st.name) return askName();
    if (st.order) return order(st.order);
    if (st.tea) return chooseTea(st.tea);
    if (st.tap) return tapTable();
    if (st.dish) return addDish(st.dish);
    if (st.swap) return swapActor(st.swap[0], st.swap[1]);
    if (st.enter) return enterActor(st.enter);
    if (st.caption) return caption(st.caption);
    if (st.scene) return switchScene(st.scene);
    if (st.zoom) { setZoom(st.zoom[0], st.zoom[1], st.zoom[2]); return sleep(1150); }
    if (st.button) return waitButton(st.button);
    if (st.sfx) { AU.sfx(st.sfx); return sleep(120); }
    if ('music' in st) { AU.music(st.music); return; }
    if (st.wait) return sleep(st.wait);
  }

  // ------------------------------------------------------------------ era flow
  function buildTimeline() {
    E.timeline.innerHTML = '';
    STOPS.forEach(function (s, i) {
      var li = h('li', '', '<span class="dot"></span><span class="yr">' + s.label + '</span>');
      li.setAttribute('data-i', i);
      E.timeline.appendChild(li);
    });
  }
  function updateTimeline() {
    var lis = E.timeline.querySelectorAll('li');
    for (var i = 0; i < lis.length; i++) {
      lis[i].classList.toggle('past', i < state.stop);
      lis[i].classList.toggle('now', i === state.stop);
      if (i === state.stop) lis[i].setAttribute('aria-current', 'step'); else lis[i].removeAttribute('aria-current');
    }
  }

  async function timeShift(stop, first) {
    var sh = E.shift;
    $('.shift-year', sh).textContent = stop.label;
    $('.shift-title', sh).textContent = stop.title;
    sh.classList.remove('out');
    sh.classList.add('show');
    if (!first) AU.sfx('timeshift');
    await sleep(first ? 200 : 750);
    E.stage.className = 'g-' + stop.grade;
    renderScene(stop.start);
    E.eraTag.innerHTML = '<b>' + stop.label + '</b><span>' + stop.title + '</span>';
    AU.music(stop.music);
    await sleep(first ? 1300 : 1500);
    sh.classList.add('out');
    await sleep(520);
    sh.classList.remove('show', 'out');
  }

  async function playStop(i, first) {
    state.stop = i;
    state.done = {};
    state.sceneDoneRan = {};
    var stop = STOPS[i];
    setInteractive(false);
    E.nextBtn.classList.remove('show');
    updateTimeline();
    await timeShift(stop, first);
    await run(stop.intro);
    setInteractive(true);
  }

  function nextStop() {
    if (state.stop + 1 < STOPS.length) playStop(state.stop + 1);
    else showEnding();
  }

  // ------------------------------------------------------------------ title, ending, about
  function showTitle() {
    var t = $('#title');
    $('#title-art').innerHTML = '<svg viewBox="260 150 1080 608" preserveAspectRatio="xMidYMid slice">' + ART.street('today') + '</svg>';
    t.classList.add('show');
    $('#start-btn').onclick = function () {
      AU.unlock();
      AU.sfx('select');
      t.classList.remove('show');
      $('#title-art').innerHTML = '';
      playStop(0, true);
    };
    $('#title-about').onclick = function () { showAbout(); };
    var jump = $('#era-jump');
    if (jump && !jump.querySelector('button')) {
      STOPS.forEach(function (s, i) {
        var b = h('button', 'era-chip', s.label);
        b.type = 'button';
        b.setAttribute('aria-label', 'Start at ' + s.label);
        b.onclick = function () {
          AU.unlock();
          AU.sfx('select');
          t.classList.remove('show');
          $('#title-art').innerHTML = '';
          playStop(i, true);
        };
        jump.appendChild(b);
      });
    }
  }

  function sourcesHtml() {
    return '<ul class="notes">' + ST.NOTES.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul>' +
      '<h3>Sources</h3><ol class="sources">' + ST.SOURCES.map(function (s) {
        return '<li><a href="' + s.u + '" target="_blank" rel="noopener noreferrer">' + s.t + '</a></li>';
      }).join('') + '</ol>';
  }

  function showAbout() {
    var box = h('div', 'about');
    box.innerHTML = '<button class="close" aria-label="Close">×</button><h2>About this game</h2>' + sourcesHtml();
    var prev = { html: E.overlay.innerHTML, cls: E.overlay.className };
    showModal(box, 'modal-about');
    $('.close', box).onclick = function () { closeModal(); if (prev.cls.indexOf('show') >= 0 && prev.html) { E.overlay.className = prev.cls; E.overlay.innerHTML = prev.html; rebindEnding(); } };
  }

  var endingBox = null;
  function showEnding() {
    state.ended = true;
    setInteractive(false);
    AU.music('title');
    var en = ST.ENDING;
    var box = h('div', 'ending');
    var ing = en.ingredients.map(function (it, i) {
      var art = it.icon === 'tea' ? '<g transform="translate(-30,30) scale(1.1)">' + ART.teapotSvg() + '</g><g transform="translate(64,34) scale(1.2)">' + ART.cupSvg(state.tea ? ST.TEAS[state.tea].color : null) + '</g>' : ART.food(it.icon);
      return '<li style="--i:' + i + '"><svg viewBox="-110 -80 220 140" aria-hidden="true">' + art + '</svg><div><b>' + it.name + '</b><span>' + it.text + '</span></div></li>';
    }).join('');
    var table = state.items.map(function (it) {
      return '<span class="mini"><svg viewBox="-100 -70 200 120" aria-hidden="true">' + ART.food(it.type) + '</svg>' + ST.DISHES[it.type].en + '</span>';
    }).join('');
    box.innerHTML =
      '<div class="ending-head"><span class="ending-zh">南華茶室</span><h2>' + en.title + '</h2><p class="q">' + en.question + '</p></div>' +
      '<ol class="ingredients">' + ing + '</ol>' +
      '<div class="your-table"><h3>' + (state.named ? esc(fmt('{name}\'s table')) : 'Your table') + '</h3><div class="minis">' + (table || '<em>Just tea!</em>') + '</div></div>' +
      '<div class="ending-btns"><button class="btn btn-red" id="again-btn">Play again</button><button class="btn" id="about-btn">Notes &amp; sources</button></div>';
    endingBox = box;
    showModal(box, 'modal-ending');
    rebindEnding();
  }
  function rebindEnding() {
    var again = $('#again-btn'), about = $('#about-btn');
    if (again) again.onclick = function () { location.reload(); };
    if (about) about.onclick = function () { showAbout(); };
  }

  // ------------------------------------------------------------------ sound toggle
  function syncSound() {
    var m = AU.isMuted();
    E.sound.textContent = m ? '🔇' : '🔊';
    E.sound.setAttribute('aria-label', m ? 'Turn sound on' : 'Turn sound off');
    E.sound.setAttribute('aria-pressed', String(!m));
  }
  E.sound.addEventListener('click', function (ev) {
    ev.stopPropagation();
    AU.unlock();
    AU.setMuted(!AU.isMuted());
    syncSound();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && E.overlay.classList.contains('modal-about')) { var c = $('.about .close'); if (c) c.click(); }
  });

  // ------------------------------------------------------------------ restart & full screen
  $('#restart-btn').addEventListener('click', function (ev) {
    ev.stopPropagation();
    if ($('#title').classList.contains('show')) return;
    if (window.confirm('Restart from the title screen?')) location.href = location.href.split('#')[0].split('?')[0];
  });
  var root = document.documentElement;
  var fsReq = root.requestFullscreen || root.webkitRequestFullscreen;
  var fsExit = document.exitFullscreen || document.webkitExitFullscreen;
  if (!fsReq) $('#fs-btn').style.display = 'none';
  $('#fs-btn').addEventListener('click', function (ev) {
    ev.stopPropagation();
    var on = document.fullscreenElement || document.webkitFullscreenElement;
    try {
      var r = on ? fsExit.call(document) : fsReq.call(root);
      if (r && r.catch) r.catch(function () {});
    } catch (e) { /* not allowed here */ }
  });

  // ------------------------------------------------------------------ boot
  buildTimeline();
  syncSound();
  showTitle();
  // debug hook for testing: ?stop=N jumps straight to an era
  var m = /[?&]stop=(\d+)/.exec(location.search);
  if (m) { $('#title').classList.remove('show'); playStop(Math.min(+m[1], STOPS.length - 1), true); }
  window.__game = { state: state, playStop: playStop, showEnding: showEnding };
})();
