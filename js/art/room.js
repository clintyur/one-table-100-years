/*
 * room.js — Nom Wah's dining room, drawn for each era (1600×900 scene units).
 *
 *   ART.room(eraKey)   -> { back, front }   (front = booth table drawn over seated patrons)
 *   ART.table(eraKey, items) -> your table in the foreground with everything you've ordered
 *   ART.cart(eraKey)   -> a dim sum cart (or nothing) placed by the scene builder
 *
 * Era facts used here (see docs/SOURCES.md):
 *  - 1920–1968 the bakery & tea parlor were at 15 (bakery) / 13 (tea) Doyers; 1968 → 11–13 Doyers.
 *  - Pressed-tin ceiling, black-and-white (yellowed) tile floor, a 1930s art deco glass counter,
 *    red vinyl booths with coat racks, yellow walls, shelves of tea tins, an old brass register.
 *  - Tea cabinet painted green for decades; Wilson repainted it blue in 2010.
 *  - Pre-2010: dusty tins, rice sacks on the floor. 2010: fresh paint, four new light fixtures,
 *    tablecloths (red-and-white check), clippings & photos on the walls.
 */
(function (root) {
  'use strict';
  var ART = (root.ART = root.ART || {});
  var H = ART.svgHelpers, P = H.P, S = H.S, E = H.E, R = H.R;
  function shade(h, a) { return ART.shade(h, a); }
  var uid = 0;

  // ------------------------------------------------------------------ era presets
  var base15 = {
    site: 15, wall: '#efe2c2', wainscot: '#5e3a22', ceiling: '#e6d9bb', floorA: '#ece4cf', floorB: '#3b3430',
    lights: 'globe', booth: '#5a3520', boothStyle: 'wood', cabinet: '#3f6f52', tins: 'clean', cloth: 'marble',
    stools: false, caddy: false, bakery: true, fog: 0.22, dim: 0, decor: [], street: '1920'
  };
  var base13 = {
    site: 13, wall: '#ecd06a', wainscot: null, ceiling: '#ece4cf', floorA: '#ede4ca', floorB: '#2f2b28',
    lights: 'fluoro', booth: '#b8312b', boothStyle: 'vinyl', cabinet: '#3f6f52', tins: 'clean', cloth: 'formica',
    stools: true, caddy: true, bakery: true, fog: 0.3, dim: 0, decor: [], street: '1970'
  };
  function ext(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }

  var ERAS = {
    e1920: ext(base15, { device: 'gramophone', phone: 'candlestick', calendar: '1920', car: 'modelT', decor: ['scroll'], street: '1920' }),
    e1930: ext(base15, { device: 'cathedral', phone: 'candlestick', calendar: '1935', car: 'sedan30', decor: ['scroll', 'mirror'], street: '1930' }),
    e1940: ext(base15, { device: 'radio40', phone: 'rotary', calendar: '1943', car: 'sedan40', decor: ['scroll', 'mirror', 'photosFew'], street: '1940' }),
    e1950: ext(base15, { device: 'radio50', phone: 'rotary', calendar: '1950', car: 'fins50', decor: ['scroll', 'mirror', 'photosFew'], street: '1950', wall: '#f0e0bc' }),
    e1970: ext(base13, { device: 'boombox', deviceAt: [620, 252], deviceScale: 0.56, phone: 'pushbutton', calendar: '1985', car: 'checker70', decor: ['mooncakePoster', 'fan', 'photosFew'], metalPot: true }),
    e1990: ext(base13, { wall: '#d6bc5a', device: null, phone: 'cordless', calendar: '1996', car: 'crownvic90', tins: 'dusty', dim: 0.16, fog: 0.38,
      decor: ['crt', 'fan', 'riceSacks', 'plantDroopy', 'photosFew', 'filmLight', 'mooncakePoster'], metalPot: true, street: '1990' }),
    e2010: ext(base13, { wall: '#f2d460', lights: 'pendant4', cabinet: '#3d6fa8', tins: 'shiny', cloth: 'check', device: 'laptop', phone: null, pos: true,
      car: 'hybrid2010', decor: ['clippings', 'plant', 'fan'], street: '2010', fog: 0.2 }),
    e2020: ext(base13, { wall: '#f0d25e', lights: 'pendant4', cabinet: '#3d6fa8', tins: 'shiny', cloth: 'check', device: 'flatTV', phone: null, pos: false,
      car: 'ebike', decor: ['clippings', 'plant', 'banner100', 'takeout', 'fan'], street: '2020', fog: 0.15 }),
    e2026: ext(base13, { wall: '#f2d460', lights: 'pendant4', cabinet: '#3d6fa8', tins: 'shiny', cloth: 'check', device: 'speaker', phone: null, pos: true,
      car: 'citibike', decor: ['clippings', 'plant', 'fan', 'photosMany'], street: '2026', fog: 0.2 })
  };
  ART.ROOM_ERAS = ERAS;

  // ------------------------------------------------------------------ pieces
  function defs(u, c) {
    var tin =
      '<pattern id="' + u + '-tin" width="64" height="64" patternUnits="userSpaceOnUse">' +
      R(0, 0, 64, 64, c.ceiling) + R(4, 4, 56, 56, 'none', ' stroke="' + shade(c.ceiling, -0.12) + '" stroke-width="3"') +
      E(32, 32, 14, 14, 'none', ' stroke="' + shade(c.ceiling, -0.14) + '" stroke-width="3"') + E(32, 32, 5, 5, shade(c.ceiling, -0.1)) +
      S('M 4 4 L 18 18 M 60 4 L 46 18 M 4 60 L 18 46 M 60 60 L 46 46', shade(c.ceiling, 0.25), 2) + '</pattern>';
    var tile =
      '<pattern id="' + u + '-tile" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="scale(1,.5)">' +
      R(0, 0, 36, 36, c.floorA) + R(0, 0, 18, 18, shade(c.floorB, 0.38)) + R(18, 18, 18, 18, shade(c.floorB, 0.38)) +
      R(0, 0, 36, 36, 'none', ' stroke="' + shade(c.floorA, -0.18) + '" stroke-width="1"') + '</pattern>';
    var check =
      '<pattern id="' + u + '-check" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="scale(1,.45)">' +
      R(0, 0, 60, 60, '#fbf7ef') + R(0, 0, 30, 30, '#c9302b') + R(30, 30, 30, 30, '#c9302b') + '</pattern>';
    var brick =
      '<pattern id="' + u + '-brick" width="40" height="20" patternUnits="userSpaceOnUse">' +
      R(0, 0, 40, 20, '#9c4b35') + S('M 0 10 L 40 10 M 0 0 L 40 0 M 20 0 L 20 10 M 0 10 L 0 20 M 40 10 L 40 20', '#7a3826', 2) + '</pattern>';
    var glow =
      '<radialGradient id="' + u + '-glow"><stop offset="0" stop-color="#fff6d8" stop-opacity=".75"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + u + '-cool"><stop offset="0" stop-color="#f2fbff" stop-opacity=".55"/><stop offset="1" stop-color="#f2fbff" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + u + '-fog" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>' +
      '<linearGradient id="' + u + '-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd6e6"/><stop offset="1" stop-color="#eef3f2"/></linearGradient>' +
      '<linearGradient id="' + u + '-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dff1f4" stop-opacity=".55"/><stop offset="1" stop-color="#bfe0e6" stop-opacity=".35"/></linearGradient>' +
      '<clipPath id="' + u + '-win"><rect x="58" y="168" width="324" height="389"/></clipPath>';
    return '<defs>' + tin + tile + check + brick + glow + '</defs>';
  }

  /** The view through the front window: building across the street + passing traffic. */
  function windowView(u, c) {
    var out = '<g clip-path="url(#' + u + '-win)">';
    out += R(58, 168, 324, 389, 'url(#' + u + '-sky)');
    // building across the narrow street
    out += R(40, 176, 360, 330, 'url(#' + u + '-brick)');
    for (var col = 0; col < 3; col++) {
      out += R(80 + col * 104, 196, 56, 70, '#2c3138') + R(84 + col * 104, 200, 48, 62, '#4a5866', ' opacity=".85"') + S('M ' + (108 + col * 104) + ' 200 L ' + (108 + col * 104) + ' 262', '#e8e2d4', 3);
    }
    // fire escape
    out += S('M 70 286 L 380 286 M 70 296 L 380 296', '#1e1e1e', 4) + S('M 120 296 L 180 360 M 260 296 L 320 360', '#1e1e1e', 3);
    // storefront across the street (era-colored awning + vertical sign)
    var aw = { '1920': '#6b4b2b', '1930': '#5b6e3a', '1940': '#7a2f2a', '1950': '#2f6f8f', '1970': '#c75a1e', '1990': '#2f5f3f', '2010': '#1f4f7a', '2020': '#555', '2026': '#2a7a6a' }[c.street] || '#7a2f2a';
    out += R(60, 380, 320, 130, '#3a2c22') + R(80, 400, 150, 96, '#f3d58a', ' opacity=".55"') + P('M 60 372 L 380 372 L 368 404 L 72 404 Z', aw);
    out += R(300, 300, 34, 110, '#b8312b') + '<text x="317" y="336" text-anchor="middle" font-family="PingFang TC, Noto Serif TC, serif" font-size="26" fill="#f2d37a">' + (c.street === '1920' || c.street === '1930' ? '茶' : '餅') + '</text>' +
      '<text x="317" y="372" text-anchor="middle" font-family="PingFang TC, Noto Serif TC, serif" font-size="26" fill="#f2d37a">' + (c.street === '1920' || c.street === '1930' ? '樓' : '家') + '</text>';
    if (c.street === '2020') out += R(100, 420, 120, 70, '#7b7b7b') + S('M 100 432 L 220 432 M 100 446 L 220 446 M 100 460 L 220 460 M 100 474 L 220 474', '#666', 3); // shuttered
    // sidewalk + street
    out += R(40, 506, 360, 14, '#a9a39a') + R(40, 520, 360, 40, c.street === '1920' || c.street === '1930' ? '#7d7466' : '#5d5c5a');
    if (c.street === '2026' || c.street === '2020') { // painted "Rice Terraces" street mural (2021) peeking in
      out += S('M 40 536 Q 200 526 400 540', '#5fb26a', 8) + S('M 40 548 Q 200 540 400 552', '#f2c23b', 8);
    }
    // traffic: one era vehicle + pedestrians, driving across (CSS animation .drive)
    var car = c.car ? ART.car(c.car) : '';
    var walkers = '';
    if (c.street === '1920' || c.street === '1930' || c.street === '1940') {
      walkers = ART.walker(0, 0, { coat: '#2e2e36', hat: 'fedora', hatColor: '#1e1e1e', s: 0.62 }) + ART.walker(40, 0, { coat: '#4a3a2a', hat: 'fedora', hatColor: '#3a2a1a', s: 0.6 });
    } else if (c.street === '1950') {
      walkers = ART.walker(0, 0, { coat: '#5a6f8a', hat: 'fedora', hatColor: '#3a3a3a', s: 0.62 }) + ART.walker(40, 0, { coat: '#b8473a', hair: '#1d1d1d', s: 0.58 });
    } else if (c.street === '1970' || c.street === '1990') {
      walkers = ART.walker(0, 0, { coat: '#8a5a2b', hair: '#1d1d1d', s: 0.62 }) + ART.walker(40, 0, { coat: '#2e5a8a', hat: 'cap', s: 0.6 });
    } else {
      walkers = ART.walker(0, 0, { coat: '#d9534f', hair: '#1d1d1d', phone: true, s: 0.62, bag: '#e8dcc0' }) + ART.walker(40, 0, { coat: '#2e3a4a', hair: '#5a3a2a', phone: true, s: 0.6 });
    }
    out += '<g class="drive drive-car" transform="translate(220,556) scale(.62)"><g class="drive-inner">' + car + '</g></g>';
    out += '<g class="drive drive-walk" transform="translate(150,514)"><g class="drive-inner">' + walkers + '</g></g>';
    out += '</g>';
    // fog on the glass
    out += R(58, 168, 324, 389, 'url(#' + u + '-fog)', ' opacity="' + c.fog + '"');
    out += R(58, 168, 324, 389, 'url(#' + u + '-glass)');
    // reversed gold lettering on the glass (we're reading it from inside)
    var word = c.site === 15 ? 'NOM WAH' : 'NOM WAH', sub = c.site === 15 ? 'BAKERY · TEA' : 'TEA PARLOR';
    out += '<g transform="translate(220,236) scale(-1,1)"><text x="0" y="0" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="44" letter-spacing="4" fill="#e9c35a" stroke="#8a6420" stroke-width="1.5">' + word + '</text>' +
      '<text x="0" y="30" text-anchor="middle" font-family="Georgia, serif" font-size="20" letter-spacing="6" fill="#e9c35a">' + sub + '</text></g>';
    // frame
    var fr = c.site === 15 ? '#4f2f1a' : '#7a2420';
    out += R(40, 150, 360, 18, fr) + R(40, 557, 360, 22, fr) + R(40, 150, 18, 429, fr) + R(382, 150, 18, 429, fr) + R(58, 276, 324, 10, fr) + R(214, 286, 10, 271, fr);
    out += R(30, 572, 380, 14, shade(fr, -0.2));
    return out;
  }

  function lights(u, c) {
    var out = '';
    if (c.lights === 'globe') {
      [300, 810, 1320].forEach(function (x) {
        out += E(x, 260, 260, 190, 'url(#' + u + '-glow)', ' opacity=".55"') + S('M ' + x + ' 112 L ' + x + ' 168', '#3a2f28', 3) +
          R(x - 10, 166, 20, 12, '#b08a3e') + E(x, 200, 28, 28, '#fbf3dc') + E(x - 8, 192, 9, 9, '#fff', ' opacity=".7"');
      });
    } else if (c.lights === 'fluoro') {
      [[250, 560], [1000, 1330]].forEach(function (p) {
        out += E((p[0] + p[1]) / 2, 200, 300, 140, 'url(#' + u + '-cool)', ' opacity=".7"') + R(p[0], 112, p[1] - p[0], 16, '#d9dcd6') + R(p[0] + 10, 126, p[1] - p[0] - 20, 8, '#f8fffc');
      });
    } else if (c.lights === 'pendant4') {
      [250, 640, 980, 1360].forEach(function (x, i) {
        var tint = ['#e2a53e', '#c9452f', '#3f8a5a', '#e2a53e'][i];
        out += E(x, 270, 240, 170, 'url(#' + u + '-glow)', ' opacity=".7"') + S('M ' + x + ' 112 L ' + x + ' 156', '#2a2522', 3) +
          P('M ' + (x - 42) + ' 196 C ' + (x - 40) + ' 160 ' + (x + 40) + ' 160 ' + (x + 42) + ' 196 Z', tint, ' stroke="#2a2522" stroke-width="3"') +
          S('M ' + (x - 20) + ' 196 L ' + (x - 12) + ' 166 M ' + x + ' 196 L ' + x + ' 162 M ' + (x + 20) + ' 196 L ' + (x + 12) + ' 166', '#2a2522', 2.5) +
          E(x, 198, 16, 6, '#fff3cf');
      });
    }
    return out;
  }

  function cabinet(c) {
    var out = '', x0 = 560, x1 = 1060, col = c.cabinet;
    out += R(x0, 186, x1 - x0, 206, col, ' stroke="' + shade(col, -0.35) + '" stroke-width="4"');
    out += R(x0 + 10, 196, x1 - x0 - 20, 186, shade(col, -0.25));
    var tinCols = ['#b8312b', '#d9a63a', '#2f6f4f', '#8a3a5a', '#2f5f9a', '#c9702b', '#5a5a5a'];
    [258, 320, 382].forEach(function (y, row) {
      out += R(x0 + 6, y - 6, x1 - x0 - 12, 8, shade(col, 0.15));
      for (var i = 0; i < 12; i++) {
        var w = 26 + ((i * 7 + row * 3) % 3) * 4, hgt = 34 + ((i * 5 + row) % 3) * 8, x = x0 + 22 + i * 39, tc = tinCols[(i + row * 2) % tinCols.length];
        if (c.tins === 'dusty') tc = shade(tc, -0.25);
        out += R(x, y - 6 - hgt, w, hgt, tc, ' rx="3"') + R(x, y - 6 - hgt, w, 6, shade(tc, -0.25), ' rx="2"') + R(x + 4, y - hgt + 6, w - 8, hgt * 0.35, '#f4e9cf', ' opacity=".8"');
        if (c.tins === 'shiny') out += R(x + 2, y - 4 - hgt, 4, hgt - 6, '#fff', ' opacity=".45"');
      }
    });
    if (c.tins === 'dusty') out += R(x0, 186, x1 - x0, 206, '#8a7a5a', ' opacity=".18"');
    // plaque with the restaurant's Chinese name 南華茶室
    out += R(680, 136, 260, 46, '#9e231d', ' rx="4" stroke="#e2b85a" stroke-width="3"') +
      '<text x="810" y="171" text-anchor="middle" font-family="PingFang TC, Noto Serif TC, Songti TC, serif" font-size="34" font-weight="700" letter-spacing="10" fill="#f0cc6a">南華茶室</text>';
    return out;
  }

  function counter(c) {
    var out = '';
    // swivel stools in front of the counter (13 Doyers)
    // counter body
    out += P('M 520 486 L 1100 486 L 1100 600 L 548 600 C 530 600 520 590 520 576 Z', c.site === 15 ? '#6b4428' : '#c9c2b2');
    if (c.site === 13) {
      out += S('M 524 512 L 1100 512 M 524 532 L 1100 532 M 524 552 L 1100 552', '#8e8a82', 4) + S('M 524 512 L 1100 512', '#f4f2ee', 1.5, ' opacity=".8"');
      out += R(520, 486, 580, 12, '#b9b3a4');
    } else {
      for (var i = 0; i < 6; i++) out += R(540 + i * 94, 504, 78, 80, 'none', ' stroke="' + shade('#6b4428', -0.3) + '" stroke-width="3"');
    }
    // glass display case with pastries
    out += R(520, 404, 580, 82, '#e9f4f4', ' opacity=".55" stroke="#9aa6a6" stroke-width="3"');
    out += S('M 530 446 L 1090 446', '#c9d2d2', 3);
    if (c.bakery) {
      for (var k = 0; k < 9; k++) {
        var x = 556 + k * 60;
        out += '<g transform="translate(' + x + ',438) scale(.32)">' + E(0, 0, 40, 15, '#c98a43') + E(0, -2, 18, 7, '#b77735') + '</g>';
        out += '<g transform="translate(' + (x + 20) + ',478) scale(.32)">' + E(0, 0, 26, 10, '#e2b56a') + E(0, -1, 7, 3.5, '#8a5a2b') + '</g>';
      }
    }
    out += R(512, 392, 596, 14, c.site === 15 ? '#e9e2d6' : '#ddd6c6', ' rx="3"');
    out += S('M 512 392 L 1108 392', '#fff', 2, ' opacity=".7"');
    return out;
  }

  function stools() {
    var out = '';
    [600, 760, 920, 1060].forEach(function (x) {
      out += S('M ' + x + ' 560 L ' + x + ' 640', '#b9bec3', 9) + E(x, 642, 30, 8, '#8e9398') +
        E(x, 556, 38, 12, '#a3271f') + R(x - 38, 548, 76, 10, '#b8312b') + E(x, 548, 38, 12, '#c63a31') + R(x - 38, 560, 76, 6, '#c9cdd1');
    });
    return out;
  }

  function countertop(c) {
    var out = '';
    out += '<g transform="translate(620,392)">' + ART.register() + '</g>';
    if (c.phone) out += '<g transform="translate(770,392)">' + ART.phone(c.phone) + '</g>';
    if (c.pos) out += '<g transform="translate(760,392)">' + ART.tabletPOS() + '</g>';
    var dp = c.deviceAt || [980, 392], ds = c.deviceScale || 1;
    if (c.device && c.device !== 'flatTV') out += '<g transform="translate(' + dp[0] + ',' + dp[1] + ') scale(' + ds + ')">' + ART.device(c.device) + '</g>';
    if (c.decor.indexOf('takeout') >= 0) {
      out += R(712, 330, 56, 62, '#e7dcc2', ' rx="3"') + R(762, 342, 50, 50, '#efe6d0', ' rx="3"') + S('M 724 330 Q 740 312 756 330', '#cbb991', 3) +
        R(818, 352, 74, 40, '#f4f1ea', ' stroke="#b8312b" stroke-width="3"') + '<text x="855" y="378" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#b8312b">DUMPLINGS</text>';
    }
    return out;
  }

  function booths(u, c) {
    var out = '';
    // wall decor above booths
    if (c.decor.indexOf('mirror') >= 0) out += R(1250, 180, 220, 150, '#cfdcdc', ' stroke="#8a6a3a" stroke-width="10" opacity=".9"') + S('M 1280 200 L 1330 300 M 1320 196 L 1370 296', '#fff', 6, ' opacity=".35"');
    if (c.decor.indexOf('photosFew') >= 0) {
      [[1150, 196, 70, 90], [1500, 210, 64, 80], [1160, 316, 60, 44]].forEach(function (f) {
        out += R(f[0], f[1], f[2], f[3], '#d9d2c2', ' stroke="#3a2a1a" stroke-width="5"') + E(f[0] + f[2] / 2, f[1] + f[3] * 0.45, f[2] * 0.2, f[3] * 0.22, '#8a8072') + R(f[0] + f[2] * 0.25, f[1] + f[3] * 0.62, f[2] * 0.5, f[3] * 0.3, '#8a8072');
      });
    }
    if (c.decor.indexOf('clippings') >= 0 || c.decor.indexOf('photosMany') >= 0) {
      var frames = [[1136, 170, 86, 110], [1236, 176, 120, 80], [1370, 166, 90, 116], [1474, 180, 96, 74], [1240, 268, 70, 86], [1324, 270, 112, 70], [1450, 268, 110, 84], [1140, 296, 84, 64]];
      if (c.decor.indexOf('photosMany') >= 0) frames.push([1050, 210, 60, 0]);
      frames.forEach(function (f, i) {
        if (!f[3]) return;
        var paper = i % 3 === 1 ? '#f4efe2' : '#e3dccb';
        out += R(f[0], f[1], f[2], f[3], paper, ' stroke="#2a2522" stroke-width="5"');
        if (i % 3 === 1) { for (var l = 0; l < 5; l++) out += R(f[0] + 8, f[1] + 12 + l * 12, f[2] - 16 - (l % 2) * 14, 5, '#9a958a'); }
        else out += E(f[0] + f[2] / 2, f[1] + f[3] * 0.42, f[2] * 0.2, f[3] * 0.2, '#6f675a') + R(f[0] + f[2] * 0.22, f[1] + f[3] * 0.6, f[2] * 0.56, f[3] * 0.3, '#6f675a');
      });
    }
    if (c.decor.indexOf('banner100') >= 0) {
      out += P('M 1124 140 L 1584 140 L 1572 168 L 1584 196 L 1124 196 L 1136 168 Z', '#b8312b', ' stroke="#e9c35a" stroke-width="3"') +
        '<text x="1354" y="178" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="30" letter-spacing="2" fill="#f2d37a">100 YEARS · 1920–2020</text>';
    }
    if (c.decor.indexOf('crt') >= 0) out += S('M 1300 120 L 1300 150', '#333', 6) + R(1260, 150, 80, 10, '#333') + '<g transform="translate(1300,296) scale(.9)">' + ART.device('crt') + '</g>';
    if (c.device === 'flatTV') out += '<g transform="translate(1492,330) scale(.6)">' + ART.device('flatTV') + '</g>';

    // booth back
    var bc = c.booth;
    out += P('M 1120 600 L 1120 400 Q 1120 372 1148 372 L 1600 372 L 1600 600 Z', bc, ' stroke="' + shade(bc, -0.3) + '" stroke-width="4"');
    if (c.boothStyle === 'vinyl') {
      for (var x = 1160; x < 1600; x += 44) out += S('M ' + x + ' 384 L ' + x + ' 520', shade(bc, -0.22), 4);
      out += S('M 1124 382 L 1600 382', shade(bc, 0.25), 3, ' opacity=".6"');
    } else {
      for (var x2 = 1150; x2 < 1600; x2 += 70) out += R(x2, 392, 54, 120, 'none', ' stroke="' + shade(bc, -0.3) + '" stroke-width="3"');
    }
    // coat rack
    if (c.site === 13) out += S('M 1590 230 L 1590 372', '#3a3a3a', 6) + S('M 1590 250 L 1570 262 M 1590 280 L 1570 292', '#3a3a3a', 4);
    return out;
  }

  function boothFront(u, c) {
    var top = c.cloth === 'check' ? 'url(#' + u + '-check)' : (c.site === 15 ? '#e9e2d6' : '#c9cbc8');
    return R(1150, 520, 420, 14, top, ' rx="3"') + R(1160, 534, 400, 70, c.site === 15 ? '#5a3520' : '#a9aaa6') + S('M 1150 534 L 1570 534', '#8e9094', 3) +
      (c.metalPot ? '<g transform="translate(1250,522) scale(.5)">' + ART.metalTeapot() + '</g>' : '<g transform="translate(1250,522) scale(.5)">' + ART.teapotSvg() + '</g>') +
      '<g transform="translate(1340,522) scale(.6)">' + ART.cupSvg() + '</g><g transform="translate(1460,522) scale(.6)">' + ART.cupSvg() + '</g>';
  }

  function wallDecor(c) {
    var out = '';
    // calendar between window and counter
    if (c.calendar) {
      out += R(430, 300, 96, 120, '#fbf8ef', ' stroke="#9a8f7a" stroke-width="2"') + R(430, 300, 96, 40, '#b8312b') +
        '<text x="478" y="330" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="26" fill="#fff">' + c.calendar + '</text>';
      for (var r = 0; r < 4; r++) for (var k = 0; k < 5; k++) out += R(440 + k * 17, 350 + r * 16, 11, 9, '#cfc6b2');
    }
    if (c.decor.indexOf('scroll') >= 0) {
      out += R(450, 140, 54, 140, '#f2e7cc', ' stroke="#8a6a3a" stroke-width="3"') + R(446, 134, 62, 8, '#6b4428', ' rx="3"') + R(446, 278, 62, 8, '#6b4428', ' rx="3"') +
        '<text x="477" y="186" text-anchor="middle" font-family="PingFang TC, Noto Serif TC, serif" font-size="30" fill="#2a1c18">福</text>' +
        '<text x="477" y="236" text-anchor="middle" font-family="PingFang TC, Noto Serif TC, serif" font-size="30" fill="#2a1c18">壽</text>';
    }
    if (c.decor.indexOf('mooncakePoster') >= 0) {
      out += R(436, 128, 104, 150, '#f2b33b', ' stroke="#7a3f1d" stroke-width="3"') + E(488, 196, 34, 34, '#c98a43') + E(488, 196, 16, 16, '#b77735') +
        '<text x="488" y="152" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-weight="700" font-size="20" fill="#b8312b">Moon</text>' +
        '<text x="488" y="258" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-weight="700" font-size="20" fill="#b8312b">Cakes!</text>';
    }
    if (c.decor.indexOf('fan') >= 0) {
      out += E(1080, 230, 34, 34, '#a9a49a', ' stroke="#6b665c" stroke-width="3"') + S('M 1080 196 L 1080 264 M 1046 230 L 1114 230 M 1056 206 L 1104 254 M 1104 206 L 1056 254', '#6b665c', 2) +
        E(1080, 230, 8, 8, '#6b665c') + R(1074, 262, 12, 20, '#6b665c');
    }
    return out;
  }

  function floorProps(c) {
    var out = '';
    if (c.decor.indexOf('riceSacks') >= 0) {
      [[620, 648], [700, 656]].forEach(function (p) {
        out += P('M ' + (p[0] - 46) + ' ' + p[1] + ' C ' + (p[0] - 52) + ' ' + (p[1] - 70) + ' ' + (p[0] - 30) + ' ' + (p[1] - 96) + ' ' + p[0] + ' ' + (p[1] - 92) + ' C ' + (p[0] + 30) + ' ' + (p[1] - 96) + ' ' + (p[0] + 52) + ' ' + (p[1] - 70) + ' ' + (p[0] + 46) + ' ' + p[1] + ' Z', '#d8c9a2', ' stroke="#a8966a" stroke-width="2"') +
          '<text x="' + p[0] + '" y="' + (p[1] - 40) + '" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="14" fill="#b8312b">RICE</text>' +
          '<text x="' + p[0] + '" y="' + (p[1] - 22) + '" text-anchor="middle" font-family="PingFang TC, Noto Serif TC, serif" font-size="16" fill="#b8312b">米</text>';
      });
    }
    if (c.decor.indexOf('plantDroopy') >= 0) {
      out += R(456, 560, 54, 50, '#9a5a3a', ' rx="4"') + S('M 483 560 C 470 520 440 520 432 556 M 483 560 C 500 520 530 524 536 560 M 483 560 C 484 530 470 510 462 520', '#7a8a4a', 6);
    }
    if (c.decor.indexOf('plant') >= 0) {
      out += R(456, 560, 54, 50, '#b8312b', ' rx="4"') + E(483, 520, 40, 34, '#3f8a4a') + E(458, 500, 22, 20, '#4fa05a') + E(508, 504, 24, 20, '#4fa05a') + E(483, 488, 18, 16, '#5ab066');
    }
    if (c.decor.indexOf('filmLight') >= 0) {
      out += '<g transform="translate(-200,0)">' + S('M 470 640 L 500 470 M 530 640 L 500 470 M 500 640 L 500 470', '#2a2a2a', 4) +
        R(468, 414, 64, 56, '#2a2a2a', ' rx="6"') + E(500, 442, 22, 22, '#fff6c8') + P('M 468 414 L 450 400 L 450 486 L 468 470 Z', '#1d1d1d') + P('M 532 414 L 550 400 L 550 486 L 532 470 Z', '#1d1d1d') + '</g>';
    }
    return out;
  }

  // ------------------------------------------------------------------ public
  ART.room = function (key) {
    var c = ERAS[key] || ERAS.e2026, u = 'rm' + (++uid);
    var back = defs(u, c);
    back += R(0, 0, 1600, 122, 'url(#' + u + '-tin)');                 // pressed-tin ceiling
    back += R(0, 104, 1600, 20, shade(c.ceiling, -0.25));             // crown molding
    back += R(0, 122, 1600, 480, c.wall);                              // walls
    if (c.wainscot) {
      back += R(0, 430, 1600, 172, c.wainscot);
      for (var x = 0; x < 1600; x += 80) back += R(x + 8, 444, 64, 144, 'none', ' stroke="' + shade(c.wainscot, -0.3) + '" stroke-width="3"');
      back += R(0, 424, 1600, 10, shade(c.wainscot, 0.2));
    } else {
      back += R(0, 470, 1600, 132, shade(c.wall, -0.1)) + R(0, 466, 1600, 8, shade(c.wall, -0.3));
    }
    back += R(0, 600, 1600, 300, 'url(#' + u + '-tile)');             // tile floor
    back += R(0, 600, 1600, 40, '#000', ' opacity=".12"');
    back += lights(u, c);
    back += windowView(u, c);
    back += wallDecor(c);
    back += cabinet(c);
    back += booths(u, c);
    back += counter(c);
    back += countertop(c);
    if (c.stools) back += stools();
    back += floorProps(c);
    if (c.dim) back += R(0, 0, 1600, 900, '#4a3a1a', ' opacity="' + c.dim + '"');
    return { back: back, front: boothFront(u, c), era: c, uid: u };
  };

  /** Your table (foreground), with the dishes you've collected. items: [{type, tea?}] */
  ART.table = function (key, items, tea, uidHint) {
    var c = ERAS[key] || ERAS.e2026, u = uidHint || ('tb' + (++uid));
    var out = '<defs><pattern id="' + u + '-tcheck" width="70" height="70" patternUnits="userSpaceOnUse" patternTransform="scale(1,.42)">' +
      R(0, 0, 70, 70, '#fbf7ef') + R(0, 0, 35, 35, '#c9302b') + R(35, 35, 35, 35, '#c9302b') + '</pattern>' +
      '<pattern id="' + u + '-speck" width="30" height="30" patternUnits="userSpaceOnUse">' + R(0, 0, 30, 30, '#c9cbc8') + E(6, 8, 1.6, 1.6, '#9a9c9a') + E(20, 18, 1.4, 1.4, '#a9aba9') + E(12, 26, 1.2, 1.2, '#8e908e') + '</pattern></defs>';
    var top = c.cloth === 'check' ? 'url(#' + u + '-tcheck)' : c.cloth === 'marble' ? '#efe9de' : 'url(#' + u + '-speck)';
    out += P('M 330 772 L 1270 772 L 1430 900 L 170 900 Z', top);
    if (c.cloth === 'marble') out += S('M 420 800 Q 520 820 600 860 M 900 790 Q 980 830 1100 850 M 700 880 Q 760 860 840 890', '#cfc6b6', 3, ' opacity=".7"');
    out += S('M 330 772 L 1270 772', c.cloth === 'formica' ? '#e8eaec' : '#fff', 4, ' opacity=".8"');
    // tableware: teapot, cup, chopsticks, condiments
    var pot = c.metalPot ? ART.metalTeapot() : ART.teapotSvg();
    out += '<g transform="translate(470,842) scale(.95)">' + pot + '</g>';
    out += '<g transform="translate(598,866) scale(1.15)">' + ART.cupSvg(tea || '#a8743a') + '</g>';
    if (c.caddy) out += '<g transform="translate(1180,812) scale(.8)">' + ART.caddy() + '</g>';
    out += '<g transform="translate(820,892) scale(.9)">' + ART.chopsticks() + '</g>';
    var slots = [[800, 828], [960, 826], [1104, 846], [880, 876], [1040, 882]]; // clear of the prompt (bottom-left) and button (bottom-right)
    (items || []).forEach(function (it, i) {
      var s = slots[i % slots.length];
      out += '<g class="dish' + (it.fresh ? ' dish-new' : '') + '" transform="translate(' + s[0] + ',' + s[1] + ') scale(.72)">' + ART.food(it.type) + '</g>';
    });
    return out;
  };

  /** A metal dim sum cart with stacked steamers (scene coords, centered on x). */
  ART.cart = function (x, kind) {
    var y = 600;
    var out = '<g transform="translate(' + x + ',0)">';
    if (kind === 'tray') return '';
    out += R(-170, y + 40, 340, 18, '#b9bec3', ' rx="4"') + R(-176, y + 30, 352, 12, '#d6dade', ' rx="4"') +
      R(-166, y + 58, 332, 220, '#c9cdd1') + S('M -166 ' + (y + 120) + ' L 166 ' + (y + 120) + ' M -166 ' + (y + 180) + ' L 166 ' + (y + 180), '#9aa0a6', 4) +
      S('M 176 ' + (y + 40) + ' L 210 ' + (y - 20) + ' L 240 ' + (y - 20), '#9aa0a6', 8);
    out += '<g transform="translate(-92,' + (y + 22) + ') scale(.7)">' + ART.food('siu_mai') + '</g>';
    out += '<g transform="translate(0,' + (y + 22) + ') scale(.7)">' + ART.food('har_gow') + '</g>';
    out += '<g transform="translate(92,' + (y + 22) + ') scale(.7)">' + ART.food('cha_siu_bao') + '</g>';
    out += '<g transform="translate(-46,' + (y - 14) + ') scale(.66)">' + ART.food('har_gow_stack') + '</g>';
    out += '<g transform="translate(46,' + (y - 14) + ') scale(.66)">' + ART.food('siu_mai') + '</g>';
    out += '</g>';
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
