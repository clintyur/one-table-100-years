/*
 * things.js — food, tableware, cars, and era technology (radios, phones,
 * registers), all as SVG strings centered on (0,0) unless noted.
 */
(function (root) {
  'use strict';
  var ART = (root.ART = root.ART || {});
  function shade(h, a) { return ART.shade(h, a); }
  function P(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function S(d, stroke, w, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '/>';
  }
  function E(cx, cy, rx, ry, fill, extra) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function R(x, y, w, h, fill, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + ' fill="' + fill + '"' + (extra || '') + '/>'; }
  ART.svgHelpers = { P: P, S: S, E: E, R: R };

  // ================================================================ tableware
  /** Porcelain teapot; base at y=0, ~120 wide. */
  ART.teapotSvg = function (body, band) {
    body = body || '#f7f4ec'; band = band || '#2f5d9c';
    return P('M 46 -44 C 74 -54 86 -78 84 -92 C 92 -90 92 -70 74 -48 C 66 -38 56 -34 48 -30 Z', body, ' stroke="#cfc6b4" stroke-width="2"') + // spout
      S('M -46 -62 C -84 -66 -86 -18 -48 -20', body, 12) + S('M -46 -62 C -84 -66 -86 -18 -48 -20', '#cfc6b4', 2, ' opacity=".8"') + // handle
      P('M -52 -40 C -56 -78 -28 -88 0 -88 C 28 -88 56 -78 52 -40 C 50 -12 30 0 0 0 C -30 0 -50 -12 -52 -40 Z', body, ' stroke="#cfc6b4" stroke-width="2"') +
      S('M -50 -52 Q 0 -40 50 -52', band, 5) + S('M -49 -30 Q 0 -18 49 -30', band, 3) +
      E(0, -86, 30, 8, shade(body, -0.05), ' stroke="#cfc6b4" stroke-width="2"') + E(0, -96, 9, 7, band) +
      P('M -36 -76 Q -30 -60 -36 -46', 'none', ' stroke="#fff" stroke-width="5" opacity=".7" stroke-linecap="round"');
  };
  /** Metal teapot (diner style, 1970s–2000s) */
  ART.metalTeapot = function () {
    return P('M 42 -40 C 66 -48 74 -66 72 -76 C 80 -74 80 -58 66 -42 C 58 -34 50 -30 44 -28 Z', '#c8ccd0', ' stroke="#9aa0a6" stroke-width="2"') +
      S('M -40 -58 C -76 -60 -76 -16 -42 -18', '#2b2b2b', 10) +
      P('M -46 -38 C -48 -70 -26 -80 0 -80 C 26 -80 48 -70 46 -38 C 44 -12 28 0 0 0 C -28 0 -44 -12 -46 -38 Z', '#d4d8dc', ' stroke="#9aa0a6" stroke-width="2"') +
      E(0, -80, 26, 7, '#bfc4c9') + E(0, -88, 8, 6, '#2b2b2b') +
      P('M -30 -66 Q -24 -50 -30 -38', 'none', ' stroke="#fff" stroke-width="5" opacity=".8" stroke-linecap="round"');
  };
  /** Small handleless cup with tea; base at y=0. */
  ART.cupSvg = function (tea) {
    return P('M -24 -36 L 24 -36 L 18 -4 Q 0 4 -18 -4 Z', '#fbfaf5', ' stroke="#cfc8b8" stroke-width="2"') +
      E(0, -36, 24, 7, tea || '#b0773a') + E(-6, -38, 8, 2, '#fff', ' opacity=".35"') +
      S('M -21 -26 Q 0 -20 21 -26', '#2f5d9c', 2.5, ' opacity=".8"');
  };
  ART.chopsticks = function () {
    return S('M -130 6 L 130 -10', '#7a4a26', 7) + S('M -130 18 L 132 4', '#8b5a2f', 7) +
      R(-70, -14, 40, 40, '#e9e2d2', ' rx="4" transform="rotate(-3)"');
  };
  /** Retro metal condiment caddy: hot mustard, duck sauce, soy. */
  ART.caddy = function () {
    return R(-46, -16, 92, 16, '#b9bec3', ' rx="3"') +
      R(-38, -64, 22, 50, '#e9c43a', ' rx="6"') + R(-11, -64, 22, 50, '#d9792b', ' rx="6"') + R(16, -70, 22, 56, '#4a2a18', ' rx="6"') +
      R(-36, -70, 18, 8, '#c9c9c9', ' rx="2"') + R(-9, -70, 18, 8, '#c9c9c9', ' rx="2"') + R(18, -78, 18, 8, '#b8312b', ' rx="2"') +
      S('M -46 -16 L -46 -84 L 46 -84 L 46 -16', '#9aa0a6', 4) + S('M 0 -84 L 0 -96', '#9aa0a6', 5);
  };

  // ================================================================ food
  function steamer(contents) {
    var weave = '';
    for (var i = -60; i <= 60; i += 12) weave += S('M ' + i + ' 6 L ' + (i * 1.04) + ' 34', '#a77d42', 2, ' opacity=".55"');
    return P('M -74 0 L -74 32 Q 0 58 74 32 L 74 0 Z', '#c99d5e') + weave +
      S('M -74 18 Q 0 44 74 18', '#a77d42', 3) +
      E(0, 0, 74, 25, '#dcb57a') + E(0, 0, 63, 19, '#f4e7c8') + contents;
  }
  function plate(contents, rim) {
    return E(0, 6, 84, 28, '#fbfaf6', ' stroke="#d8d0c0" stroke-width="2"') + E(0, 4, 64, 19, 'none', ' stroke="' + (rim || '#2f5d9c') + '" stroke-width="2" opacity=".55"') + contents;
  }
  function harGow(x, y, s) {
    s = s || 1;
    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
      P('M -24 6 C -26 -22 24 -22 24 6 Z', '#f6efe6', ' opacity=".96" stroke="#e7dccb" stroke-width="1.5"') +
      P('M -14 2 C -12 -10 12 -10 14 2 Z', '#f2a58e', ' opacity=".55"') +
      S('M -14 -12 L -10 -4 M -6 -15 L -3 -6 M 3 -15 L 4 -6 M 12 -12 L 10 -4', '#e3d4bf', 2) + '</g>';
  }
  function siuMai(x, y, s) {
    s = s || 1;
    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
      P('M -18 -14 L -20 8 Q 0 16 20 8 L 18 -14 Z', '#f0d36b') + E(0, -14, 18, 7, '#e9a07a') +
      E(0, -16, 5, 3.4, '#e8601f') + S('M -16 -6 Q 0 -2 16 -6', '#d6b54c', 2) + '</g>';
  }
  function bao(x, y, s) {
    s = s || 1;
    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
      P('M -26 8 C -30 -26 30 -26 26 8 Q 0 14 -26 8 Z', '#fbf8f0', ' stroke="#e8dfcf" stroke-width="1.5"') +
      P('M -8 -14 Q 0 -22 8 -14 Q 0 -8 -8 -14 Z', '#a1452d') + S('M -10 -14 Q 0 -24 10 -14', '#efe6d5', 2) + '</g>';
  }
  function peaDumpling(x, y, s) {
    s = s || 1;
    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
      P('M -22 6 C -24 -18 22 -18 22 6 Q 0 12 -22 6 Z', '#eef3e6', ' opacity=".95" stroke="#d9e2c9" stroke-width="1.5"') +
      E(-6, -4, 7, 5, '#5f9e45', ' opacity=".7"') + E(7, -2, 6, 4, '#6fae50', ' opacity=".7"') + E(0, -9, 5, 3, '#f2a58e', ' opacity=".6"') + '</g>';
  }

  var FOOD = {
    har_gow: function () { return steamer(harGow(-30, -2) + harGow(28, -4) + harGow(0, 8)); },
    har_gow_stack: function () { return steamer(harGow(-24, -2) + harGow(24, -2)); },
    siu_mai: function () { return steamer(siuMai(-30, 0) + siuMai(28, -2) + siuMai(-2, 8) + siuMai(2, -12)); },
    cha_siu_bao: function () { return steamer(bao(-32, 0) + bao(30, -2) + bao(0, 8)); },
    snow_pea_dumplings: function () { return steamer(peaDumpling(-30, 0) + peaDumpling(28, -2) + peaDumpling(0, 8)); },
    turnip_cake: function () {
      var c = '';
      [[-36, -2, -6], [0, 4, 4], [36, -2, 10]].forEach(function (p) {
        c += '<g transform="translate(' + p[0] + ',' + p[1] + ') rotate(' + p[2] + ')">' + R(-20, -14, 40, 26, '#e9cf9d', ' rx="4"') +
          R(-20, -14, 40, 7, '#c98b3e', ' rx="3"') + E(-6, 2, 4, 2, '#d7b98a') + E(8, -2, 3, 2, '#d7b98a') + '</g>';
      });
      return plate(c);
    },
    cheung_fun: function () {
      var c = '';
      [-30, 0, 30].forEach(function (x, i) { c += R(x - 14, -16 + (i % 2) * 4, 28, 26, '#f7f2e9', ' rx="12" stroke="#e6dccb" stroke-width="1.5"') + E(x, -4 + (i % 2) * 4, 6, 4, '#f2a58e', ' opacity=".6"'); });
      return plate(c + S('M -50 8 Q 0 18 50 4', '#6b3a1f', 5, ' opacity=".7"'));
    },
    egg_roll: function () {
      var dots = '';
      for (var i = 0; i < 14; i++) dots += E(-44 + (i * 7) % 88, -8 + (i * 13) % 14, 2.5, 2, '#f4c66c');
      return plate(
        '<g transform="rotate(-6)">' + R(-58, -20, 80, 30, '#d99a3a', ' rx="14"') + dots +
        '<g transform="translate(38,-4)">' + E(0, 0, 14, 15, '#e7b154') + E(0, 0, 9, 10, '#f0ead2') + E(2, 2, 4, 4, '#7aa35a') + E(-3, -3, 3, 3, '#c9a27a') + '</g></g>');
    },
    noodles: function () {
      var c = '';
      for (var i = 0; i < 12; i++) c += S('M ' + (-50 + i * 8) + ' -4 Q ' + (-20 + i * 5) + ' ' + (-18 + (i % 3) * 6) + ' ' + (10 + i * 4) + ' 2', i % 2 ? '#e3b45c' : '#d29a3e', 4);
      return plate(c + E(-18, -8, 12, 6, '#5f9e45') + E(20, -2, 10, 5, '#6fae50') + S('M -40 6 Q 0 14 40 4', '#7a3f1d', 4, ' opacity=".6"'));
    },
    mooncake: function () {
      var petals = '';
      for (var i = 0; i < 12; i++) {
        var a = i * Math.PI / 6;
        petals += E((Math.cos(a) * 30).toFixed(1), (Math.sin(a) * 11).toFixed(1), 8, 4, '#b06d2c', ' opacity=".55"');
      }
      return plate('<g transform="translate(0,-10)">' + P('M -40 0 L -40 14 Q 0 30 40 14 L 40 0 Z', '#a8652a') + E(0, 0, 40, 15, '#c98a43') + petals + E(0, 0, 18, 7, '#b77735') + '</g>');
    },
    almond_cookie: function () {
      function cookie(x, y) {
        return '<g transform="translate(' + x + ',' + y + ')">' + E(0, 4, 26, 10, '#c9944a') + E(0, 0, 26, 10, '#e2b56a') +
          S('M -14 -2 L -6 2 M 8 -4 L 14 1', '#c9944a', 2) + E(0, -1, 7, 3.5, '#8a5a2b') + '</g>';
      }
      return plate(cookie(-26, 0) + cookie(26, -2) + cookie(0, 8));
    }
  };
  ART.food = function (type) { return (FOOD[type] || FOOD.har_gow)(); };
  ART.FOOD_TYPES = Object.keys(FOOD);

  // ================================================================ cars (side view, facing right, wheels on y=0)
  function wheel(x, r, tire, hub, whitewall) {
    return E(x, -r, r, r, tire || '#1d1d1d') + (whitewall ? E(x, -r, r * 0.7, r * 0.7, '#f1efe8') : '') +
      E(x, -r, r * 0.45, r * 0.45, hub || '#9b9b9b') + E(x, -r, r * 0.15, r * 0.15, '#555');
  }
  function person_small(x, y, hat, coat) {
    return E(x, y - 30, 9, 10, '#d9a77c') + R(x - 11, y - 20, 22, 26, coat || '#3a3a44', ' rx="6"') +
      (hat ? E(x, y - 38, 13, 4, hat) + R(x - 8, y - 48, 16, 10, hat, ' rx="3"') : '');
  }
  var CARS = {
    modelT: function () {
      var spokes = '';
      [-95, 95].forEach(function (x) { for (var i = 0; i < 8; i++) spokes += S('M ' + x + ' -34 l ' + (Math.cos(i * 0.785) * 26).toFixed(1) + ' ' + (Math.sin(i * 0.785) * 26).toFixed(1), '#888', 2); });
      return R(-150, -84, 300, 34, '#1e1e22', ' rx="6"') + R(-40, -164, 120, 84, '#1e1e22', ' rx="6"') +
        R(-28, -152, 46, 46, '#cfd6d9', ' opacity=".7"') + R(26, -152, 44, 46, '#cfd6d9', ' opacity=".7"') +
        R(80, -120, 70, 40, '#26262a', ' rx="4"') + R(140, -118, 12, 34, '#b9a26b') +
        S('M -150 -50 L 150 -50', '#3a3a3a', 6) +
        E(-95, -34, 34, 34, '#111') + E(95, -34, 34, 34, '#111') + E(-95, -34, 26, 26, 'none', ' stroke="#555" stroke-width="3"') + E(95, -34, 26, 26, 'none', ' stroke="#555" stroke-width="3"') + spokes +
        E(150, -100, 7, 9, '#f2e2a0');
    },
    sedan30: function () {
      return P('M -160 -40 C -160 -70 -140 -84 -110 -86 L -70 -88 C -50 -140 40 -140 70 -92 L 130 -86 C 160 -82 168 -60 166 -40 Z', '#24402f') +
        P('M -52 -94 C -40 -128 30 -128 52 -94 Z', '#cfd6d9', ' opacity=".75"') + S('M 0 -126 L 0 -94', '#24402f', 5) +
        P('M -168 -40 C -170 -64 -150 -72 -128 -64 L -118 -40 Z', '#1b2f23') + P('M 168 -40 C 170 -64 150 -72 128 -64 L 118 -40 Z', '#1b2f23') +
        wheel(-110, 30) + wheel(112, 30) + R(150, -78, 14, 22, '#c9c9c9', ' rx="3"') + E(156, -70, 6, 6, '#f6e6a8');
    },
    sedan40: function () {
      return P('M -170 -36 C -172 -74 -140 -86 -100 -88 C -70 -136 50 -142 90 -94 C 140 -92 172 -76 170 -36 Z', '#7d2730') +
        P('M -62 -96 C -46 -128 40 -132 66 -96 Z', '#d8dee0', ' opacity=".75"') + S('M 4 -130 L 4 -96', '#7d2730', 5) +
        S('M -150 -60 L 150 -60', '#c9c9c9', 3, ' opacity=".7"') +
        wheel(-112, 30, '#151515', '#bbb', true) + wheel(114, 30, '#151515', '#bbb', true) + E(160, -66, 7, 7, '#f6e6a8');
    },
    fins50: function () {
      return P('M -190 -40 L -190 -78 L -150 -80 L -130 -96 L -120 -80 L -60 -82 C -40 -124 60 -126 80 -84 L 180 -80 C 194 -76 196 -56 192 -40 Z', '#6fc6c0') +
        P('M -190 -58 L 192 -58 L 192 -40 L -190 -40 Z', '#f2ede0') + S('M -186 -58 L 190 -58', '#d0d4d8', 4) +
        P('M -50 -86 C -34 -116 50 -118 70 -86 Z', '#e2eef2', ' opacity=".8"') +
        wheel(-120, 28, '#151515', '#ccc', true) + wheel(124, 28, '#151515', '#ccc', true) + R(178, -62, 18, 10, '#ddd', ' rx="3"') + E(186, -72, 6, 6, '#f6e6a8');
    },
    checker70: function () {
      var checks = '';
      for (var i = 0; i < 18; i++) checks += R(-150 + i * 17, -76 + (i % 2) * 6, 8.5, 6, '#1d1d1d') + R(-141.5 + i * 17, -76 + ((i + 1) % 2) * 6, 8.5, 6, '#1d1d1d');
      return P('M -170 -36 L -170 -84 L -100 -88 L -80 -140 L 70 -140 L 92 -88 L 170 -84 L 172 -36 Z', '#f2c524') +
        R(-70, -132, 64, 40, '#cfd8dc', ' opacity=".8"') + R(2, -132, 64, 40, '#cfd8dc', ' opacity=".8"') + checks +
        R(-30, -156, 60, 16, '#f6f0d6', ' rx="3"') + '<text x="0" y="-143" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#222">TAXI</text>' +
        wheel(-112, 30) + wheel(116, 30) + R(164, -70, 10, 20, '#ccc');
    },
    crownvic90: function () {
      return P('M -180 -36 L -180 -78 L -110 -84 L -80 -132 L 66 -132 L 100 -84 L 180 -78 L 182 -36 Z', '#f4c21f') +
        R(-74, -124, 70, 36, '#2d3a44', ' opacity=".85"') + R(2, -124, 62, 36, '#2d3a44', ' opacity=".85"') +
        S('M -176 -62 L 178 -62', '#222', 3, ' opacity=".5"') +
        R(-34, -152, 68, 20, '#f9f6ec', ' rx="4"') + '<text x="0" y="-137" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#222">TAXI</text>' +
        wheel(-118, 29, '#151515', '#c0c0c0') + wheel(120, 29, '#151515', '#c0c0c0') + R(172, -76, 10, 14, '#fff');
    },
    hybrid2010: function () {
      return P('M -160 -36 L -162 -96 L -128 -150 L 80 -150 L 130 -102 L 170 -92 L 172 -36 Z', '#f6c925') +
        R(-120, -140, 96, 40, '#2d3a44', ' opacity=".85"') + R(-16, -140, 84, 40, '#2d3a44', ' opacity=".85"') +
        R(-60, -178, 120, 26, '#ffffff', ' rx="4"') + R(-56, -174, 112, 18, '#e94f37', ' rx="2"') +
        '<text x="0" y="-160" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="700" fill="#fff">NYC TAXI</text>' +
        wheel(-104, 32, '#151515', '#bfc4c8') + wheel(110, 32, '#151515', '#bfc4c8');
    },
    ebike: function () {
      return E(-60, -26, 26, 26, 'none', ' stroke="#1d1d1d" stroke-width="6"') + E(60, -26, 26, 26, 'none', ' stroke="#1d1d1d" stroke-width="6"') +
        S('M -60 -26 L -10 -66 L 40 -66 L 60 -26 M -10 -66 L 0 -26 L 40 -66 M 40 -66 L 50 -96', '#2d2f33', 6) +
        R(-96, -136, 70, 62, '#f2c524', ' rx="6"') + R(-90, -128, 58, 20, '#e2b414') +
        E(10, -150, 13, 14, '#c99a72') + P('M 2 -164 C 2 -180 26 -180 26 -162 Z', '#1d6fb8') +
        R(-6, -136, 30, 54, '#1d6fb8', ' rx="10"') + S('M 18 -120 L 48 -98', '#1d6fb8', 10) + S('M 2 -88 L -8 -40', '#33363c', 12);
    },
    citibike: function () {
      return E(-56, -26, 26, 26, 'none', ' stroke="#222" stroke-width="5"') + E(56, -26, 26, 26, 'none', ' stroke="#222" stroke-width="5"') +
        S('M -56 -26 L -8 -66 L 40 -66 L 56 -26 M -8 -66 L 0 -26 L 40 -66 M 40 -66 L 46 -92', '#1f6fd1', 7) +
        E(-6, -150, 12, 13, '#8d5a3b') + R(-20, -136, 30, 54, '#e94f37', ' rx="10"') + S('M 4 -120 L 44 -94', '#e94f37', 9) + S('M -8 -86 L -14 -40', '#2a2d33', 11) +
        P('M -18 -160 C -18 -176 10 -176 10 -158 Z', '#222');
    }
  };
  ART.car = function (type) { return (CARS[type] || CARS.sedan30)(); };

  /** Little walking pedestrians for window/street views. */
  ART.walker = function (x, y, o) {
    o = o || {};
    var s = o.s || 1, skin = o.skin || '#d9a77c', coat = o.coat || '#3a3a44', out = '';
    out += '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">';
    out += S('M -6 -40 L -10 0 M 6 -40 L 10 0', o.legs || '#2a2a30', 8);
    out += R(-16, -96, 32, 60, coat, ' rx="10"');
    if (o.bag) out += R(14, -70, 18, 24, o.bag, ' rx="3"');
    out += E(0, -110, 12, 13, skin);
    if (o.hair) out += P('M -12 -112 C -12 -128 12 -128 12 -112 Z', o.hair);
    if (o.hat === 'fedora') out += E(0, -120, 18, 4, o.hatColor || '#2a2a2a') + R(-10, -132, 20, 12, o.hatColor || '#2a2a2a', ' rx="3"');
    if (o.hat === 'cap') out += P('M -12 -116 C -12 -132 12 -132 12 -116 Z', o.hatColor || '#2a5caa') + R(6, -120, 14, 4, o.hatColor || '#2a5caa');
    if (o.phone) out += R(10, -112, 8, 14, '#111', ' rx="2"');
    out += '</g>';
    return out;
  };

  // ================================================================ era tech (bottom-center at 0,0)
  var DEVICES = {
    gramophone: function () {
      return R(-50, -50, 100, 50, '#6b3f1f', ' rx="4"') + R(-46, -46, 92, 6, '#8a5530') + E(0, -52, 46, 8, '#2a2a2a') +
        S('M 20 -54 L 30 -110', '#b08a3e', 6) +
        P('M 24 -110 C 10 -160 40 -220 110 -200 C 70 -180 60 -140 36 -104 Z', '#c99a3e', ' stroke="#8a6a2a" stroke-width="2"') +
        P('M 34 -116 C 30 -150 60 -190 104 -196', 'none', ' stroke="#f0d68a" stroke-width="4" opacity=".6"') + R(36, -30, 8, 22, '#c9a35a');
    },
    cathedral: function () {
      return P('M -60 0 L -60 -90 C -60 -150 60 -150 60 -90 L 60 0 Z', '#6b3f1f', ' stroke="#4a2a14" stroke-width="3"') +
        P('M -42 -60 L -42 -96 C -42 -128 42 -128 42 -96 L 42 -60 Z', '#c9b38a') +
        S('M -30 -64 L -30 -104 M -15 -64 L -15 -116 M 0 -64 L 0 -120 M 15 -64 L 15 -116 M 30 -64 L 30 -104', '#6b3f1f', 4) +
        R(-24, -46, 48, 16, '#e9d9a8', ' rx="3"') + E(-36, -20, 8, 8, '#3a2412') + E(36, -20, 8, 8, '#3a2412');
    },
    radio40: function () {
      return R(-74, -96, 148, 96, '#7a4a26', ' rx="14"') + R(-64, -86, 80, 76, '#d9c79a', ' rx="6"') +
        S('M -58 -74 L 10 -74 M -58 -60 L 10 -60 M -58 -46 L 10 -46 M -58 -32 L 10 -32', '#a68a5a', 3) +
        E(44, -66, 18, 18, '#e9dcb4', ' stroke="#4a2a14" stroke-width="3"') + S('M 44 -66 L 54 -74', '#b8312b', 3) + E(34, -22, 8, 8, '#3a2412') + E(56, -22, 8, 8, '#3a2412');
    },
    radio50: function () {
      return R(-80, -90, 160, 90, '#7fd0c4', ' rx="22"') + R(-66, -76, 70, 62, '#f3efe2', ' rx="8"') +
        S('M -60 -64 L -2 -64 M -60 -50 L -2 -50 M -60 -36 L -2 -36 M -60 -22 L -2 -22', '#c9c0aa', 3) +
        E(40, -50, 26, 26, '#f3efe2', ' stroke="#d0a23a" stroke-width="4"') + S('M 40 -50 L 52 -64', '#b8312b', 3) + R(-80, -6, 160, 6, '#d0a23a', ' rx="3"');
    },
    boombox: function () {
      return R(-100, -86, 200, 86, '#2b2d31', ' rx="10"') + S('M -70 -86 Q 0 -120 70 -86', '#9aa0a6', 7) +
        E(-56, -40, 30, 30, '#16171a', ' stroke="#9aa0a6" stroke-width="4"') + E(56, -40, 30, 30, '#16171a', ' stroke="#9aa0a6" stroke-width="4"') +
        E(-56, -40, 12, 12, '#3a3c42') + E(56, -40, 12, 12, '#3a3c42') + R(-22, -72, 44, 26, '#c9ccd1', ' rx="3"') + R(-16, -66, 32, 14, '#3a3c42') +
        R(-24, -22, 10, 6, '#e94f37') + R(-8, -22, 10, 6, '#9aa0a6') + R(8, -22, 10, 6, '#9aa0a6');
    },
    crt: function () { // CRT TV + VCR
      return R(-90, -150, 180, 140, '#3a3a3e', ' rx="12"') + R(-74, -136, 120, 98, '#7c9aa0', ' rx="14"') +
P('M -66 -128 Q -30 -134 0 -128', 'none', ' stroke="#fff" stroke-width="4" opacity=".35"') +
        E(66, -116, 8, 8, '#222') + E(66, -92, 8, 8, '#222') + R(-90, -10, 180, 12, '#222', ' rx="3"') + R(-70, 2, 140, 24, '#1d1d20', ' rx="3"') + R(-40, 10, 50, 6, '#3a3a3e');
    },
    laptop: function () {
      return P('M -86 0 L 86 0 L 100 10 L -100 10 Z', '#b9bec4') + R(-80, -110, 160, 108, '#c9ced4', ' rx="6"') + R(-72, -102, 144, 92, '#f4f6f8') +
        R(-72, -102, 144, 18, '#3b5998') + R(-62, -76, 50, 56, '#d9c7a4') + R(-4, -76, 66, 7, '#9aa4ad') + R(-4, -62, 56, 6, '#c3c9cf') + R(-4, -50, 60, 6, '#c3c9cf') + R(-4, -38, 40, 6, '#c3c9cf');
    },
    flatTV: function () {
      return R(-110, -140, 220, 128, '#151619', ' rx="6"') + R(-102, -132, 204, 112, '#3c5a78') +
        R(-102, -50, 204, 30, '#b8312b') + R(-92, -42, 120, 8, '#fff', ' opacity=".9"') + R(-92, -30, 80, 6, '#fff', ' opacity=".6"') +
        R(-102, -132, 204, 82, '#5a7c9c', ' opacity=".6"');
    },
    speaker: function () {
      return R(-26, -86, 52, 86, '#2d2f33', ' rx="20"') + E(0, -86, 26, 7, '#3a3d42') + E(0, -86, 18, 3, '#3fb6e8', ' opacity=".8"') +
        R(40, -60, 90, 60, '#1c1d20', ' rx="6"') + R(46, -54, 78, 48, '#e9eef3') + R(46, -54, 78, 10, '#b8312b');
    }
  };
  ART.device = function (type) { return (DEVICES[type] || function () { return ''; })(); };

  var PHONES = {
    candlestick: function () {
      return E(0, -6, 30, 8, '#1b1b1b') + R(-6, -120, 12, 116, '#1b1b1b') + P('M -16 -132 L 16 -132 L 10 -116 L -10 -116 Z', '#1b1b1b') +
        E(0, -134, 20, 6, '#2a2a2a') + S('M 6 -88 L 30 -96', '#1b1b1b', 5) + R(26, -110, 14, 34, '#1b1b1b', ' rx="6"') + S('M 0 -10 C 40 0 60 -10 70 0', '#1b1b1b', 3);
    },
    rotary: function () {
      return P('M -50 0 L -40 -50 L 40 -50 L 50 0 Z', '#1b1b1b') + E(0, -26, 20, 16, '#e9e5dc') + E(0, -26, 8, 6, '#1b1b1b') +
        P('M -58 -54 C -60 -76 -36 -70 -26 -60 L 26 -60 C 36 -70 60 -76 58 -54 C 50 -48 30 -50 26 -54 L -26 -54 C -30 -50 -50 -48 -58 -54 Z', '#1b1b1b');
    },
    pushbutton: function () {
      var keys = '';
      for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) keys += R(-18 + c * 13, -40 + r * 9, 10, 6, '#f6f1e3', ' rx="1.5"');
      return P('M -54 0 L -44 -50 L 44 -50 L 54 0 Z', '#d9c9a3') + keys +
        P('M -60 -56 C -62 -76 -38 -72 -28 -62 L 28 -62 C 38 -72 62 -76 60 -56 C 52 -50 32 -52 28 -56 L -28 -56 C -32 -52 -52 -50 -60 -56 Z', '#cdbb93');
    },
    cordless: function () {
      return R(-40, -16, 80, 16, '#2b2d31', ' rx="6"') + R(-16, -96, 32, 84, '#2f3236', ' rx="10"') + R(-10, -86, 20, 16, '#9fbf9a', ' rx="2"') +
        S('M 10 -96 L 12 -130', '#2f3236', 5) + R(-10, -64, 20, 40, '#3e4247', ' rx="3"');
    }
  };
  ART.phone = function (type) { return (PHONES[type] || function () { return ''; })(); };

  /** Ornate brass cash register (bottom-center 0,0, ~150 wide). */
  ART.register = function () {
    var keys = '';
    for (var r = 0; r < 3; r++) for (var c = 0; c < 6; c++) keys += E(-50 + c * 20, -36 - r * 14, 6, 5, '#f2ead2', ' stroke="#6b4a1a" stroke-width="1.5"');
    return P('M -76 0 L -76 -70 L -60 -86 L 60 -86 L 76 -70 L 76 0 Z', '#c69a3c', ' stroke="#7a5a1e" stroke-width="3"') + keys +
      P('M -50 -86 L -44 -128 L 44 -128 L 50 -86 Z', '#d8ae4c', ' stroke="#7a5a1e" stroke-width="3"') +
      R(-34, -122, 68, 26, '#2a2416', ' rx="3"') + '<text x="0" y="-103" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#f2d37a">$ .25</text>' +
      S('M 76 -50 L 100 -66', '#7a5a1e', 6) + E(102, -68, 8, 8, '#f2ead2', ' stroke="#7a5a1e" stroke-width="2"') +
      S('M -70 -14 L 70 -14', '#7a5a1e', 2, ' opacity=".6"');
  };
  ART.tabletPOS = function () {
    return S('M 0 0 L 0 -40', '#9aa0a6', 8) + '<g transform="translate(0,-40) rotate(-12)">' + R(-46, -66, 92, 66, '#1d1f24', ' rx="6"') + R(-40, -60, 80, 54, '#f2f5f8') +
      R(-40, -60, 80, 12, '#b8312b') + R(-34, -42, 30, 12, '#d9d9d9') + R(2, -42, 30, 12, '#d9d9d9') + R(-34, -24, 66, 10, '#5aaa6a') + '</g>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
