/*
 * street.js — Doyers Street, looking down the block toward the sharp bend
 * (the "Bloody Angle"), with Nom Wah's storefront tucked into the crook.
 *
 *   ART.street('1920' | 'today') -> svg markup (1600×900)
 *
 * Today: the faded pink (once red) awning, the 南華茶室 sign, the painted
 * "Rice Terraces" street mural (2021), strings of lanterns, and the street is
 * pedestrian-only by day (since a 2017 pilot) — so no cars, just a line.
 */
(function (root) {
  'use strict';
  var ART = (root.ART = root.ART || {});
  var H = ART.svgHelpers, P = H.P, S = H.S, E = H.E, R = H.R;
  function shade(h, a) { return ART.shade(h, a); }
  var uid = 0;

  // perspective helpers for the two receding side walls
  function lerp(a, b, t) { return a + (b - a) * t; }
  /** Quad on the left wall. u: 0 (near, x=0) → 1 (far, x=470). v: 0 (top) → 1 (ground). */
  function leftPt(u, v) {
    var x = lerp(0, 470, u), top = lerp(-60, 40, u), bot = lerp(900, 560, u);
    return [x, lerp(top, bot, v)];
  }
  function rightPt(u, v) {
    var x = lerp(1600, 1180, u), top = lerp(-60, 40, u), bot = lerp(900, 560, u);
    return [x, lerp(top, bot, v)];
  }
  function quad(fn, u0, u1, v0, v1, fill, extra) {
    var a = fn(u0, v0), b = fn(u1, v0), c = fn(u1, v1), d = fn(u0, v1);
    return '<path d="M ' + a.join(' ') + ' L ' + b.join(' ') + ' L ' + c.join(' ') + ' L ' + d.join(' ') + ' Z" fill="' + fill + '"' + (extra || '') + '/>';
  }

  function sideWall(fn, wall, era, side) {
    var out = quad(fn, 0, 1, 0, 1, wall);
    // windows: 4 floors × 5 bays
    for (var f = 0; f < 4; f++) {
      for (var b = 0; b < 5; b++) {
        var u0 = 0.06 + b * 0.19, u1 = u0 + 0.1, v0 = 0.08 + f * 0.13, v1 = v0 + 0.08;
        out += quad(fn, u0, u1, v0, v1, '#2b3036') + quad(fn, u0 + 0.01, u1 - 0.01, v0 + 0.01, v1 - 0.005, era === 'today' ? '#5a6f80' : '#4a5560', ' opacity=".9"');
        out += quad(fn, u0 - 0.008, u1 + 0.008, v1 - 0.004, v1 + 0.006, '#d9cfbf');
      }
      // fire escape balcony line across bays
      out += quad(fn, 0.04, 0.98, 0.17 + f * 0.13, 0.175 + f * 0.13, '#1b1b1b');
    }
    // storefront band
    out += quad(fn, 0, 1, 0.64, 0.66, shade(wall, -0.3));
    for (var s = 0; s < 3; s++) {
      var su0 = 0.04 + s * 0.32, su1 = su0 + 0.24;
      out += quad(fn, su0, su1, 0.7, 0.97, '#33281f') + quad(fn, su0 + 0.015, su1 - 0.015, 0.72, 0.9, era === 'today' ? '#f2d58a' : '#e2c27a', ' opacity=".55"');
      var awn = era === 'today' ? ['#2a7a6a', '#7a2a5a', '#3a5aa0'][s] : ['#6b4b2b', '#5b6e3a', '#7a2f2a'][s];
      out += quad(fn, su0 - 0.01, su1 + 0.01, 0.665, 0.705, awn);
    }
    // vertical signs with real words
    var words = era === 'today'
      ? (side === 'L' ? [['理', '髮'], ['美', '容']] : [['郵', '局'], ['餐', '館']])
      : (side === 'L' ? [['洗', '衣'], ['雜', '貨']] : [['茶', '樓'], ['餅', '家']]);
    words.forEach(function (w, i) {
      var u = 0.2 + i * 0.42, a = fn(u, 0.42), b2 = fn(u + 0.05, 0.62);
      var x = a[0], y = a[1], wdt = Math.abs(b2[0] - a[0]) + 10, hgt = b2[1] - a[1];
      out += R(Math.min(x, b2[0]) - 4, y, wdt, hgt, '#b8312b', ' stroke="#e2b85a" stroke-width="3"');
      var fs = Math.max(14, wdt * 0.62);
      out += '<text x="' + (Math.min(x, b2[0]) - 4 + wdt / 2) + '" y="' + (y + hgt * 0.42) + '" text-anchor="middle" font-family="PingFang TC, Noto Serif TC, serif" font-size="' + fs + '" fill="#f2d37a">' + w[0] + '</text>' +
        '<text x="' + (Math.min(x, b2[0]) - 4 + wdt / 2) + '" y="' + (y + hgt * 0.86) + '" text-anchor="middle" font-family="PingFang TC, Noto Serif TC, serif" font-size="' + fs + '" fill="#f2d37a">' + w[1] + '</text>';
    });
    return out;
  }

  function farBuilding(u, era) {
    var out = '';
    // facade (faces us, at the bend)
    out += R(470, 40, 710, 520, 'url(#' + u + '-brick)');
    out += R(462, 30, 726, 24, '#6b5a4a') + R(470, 54, 710, 8, '#4a3e34');
    for (var f = 0; f < 4; f++) {
      for (var b = 0; b < 6; b++) {
        var x = 500 + b * 112, y = 80 + f * 74;
        out += R(x, y, 60, 52, '#2b3036') + R(x + 4, y + 4, 52, 44, era === 'today' ? '#6a8094' : '#55606a') + S('M ' + (x + 30) + ' ' + (y + 4) + ' L ' + (x + 30) + ' ' + (y + 48), '#d9cfbf', 3) + R(x - 4, y + 52, 68, 6, '#d9cfbf');
      }
      // fire escapes on two bays
      out += R(600, 136 + f * 74, 150, 5, '#1b1b1b') + R(936, 136 + f * 74, 150, 5, '#1b1b1b');
      out += S('M 610 ' + (141 + f * 74) + ' L 740 ' + (205 + f * 74), '#1b1b1b', 3) + S('M 946 ' + (141 + f * 74) + ' L 1076 ' + (205 + f * 74), '#1b1b1b', 3);
    }
    out += R(470, 372, 710, 12, '#5a4a3c');
    // neighbor storefronts
    out += R(474, 392, 150, 168, '#2f2a26') + R(486, 410, 126, 96, '#e6c47a', ' opacity=".5"');
    out += R(966, 392, 210, 168, '#2f2a26') + R(980, 410, 182, 96, '#e6c47a', ' opacity=".5"');
    if (era === 'today') {
      // barber pole + salon neon on the neighbors
      out += R(632, 408, 14, 90, '#fff') + S('M 632 418 L 646 408 M 632 438 L 646 428 M 632 458 L 646 448 M 632 478 L 646 468', '#d0342c', 5) + S('M 632 428 L 646 418 M 632 448 L 646 438 M 632 468 L 646 458', '#2f5f9a', 5);
      out += '<text x="1071" y="398" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="22" fill="#ff7ac8" opacity=".9">NAILS · SALON</text>';
      out += P('M 960 384 L 1180 384 L 1170 410 L 970 410 Z', '#2a7a6a');
    } else {
      out += P('M 960 384 L 1180 384 L 1170 410 L 970 410 Z', '#5b6e3a');
      out += '<text x="549" y="400" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#e9d9a8">BARBER</text>';
    }
    // ---- Nom Wah storefront
    if (era === 'today') {
      out += R(650, 286, 300, 78, '#a8261f', ' stroke="#e2b85a" stroke-width="4"') +
        '<text x="800" y="344" text-anchor="middle" font-family="PingFang TC, Noto Serif TC, Songti TC, serif" font-weight="700" font-size="50" letter-spacing="10" fill="#f2cc5a">南華茶室</text>';
      out += R(656, 392, 288, 168, '#3a1f18') + R(672, 432, 110, 100, '#f2d58a', ' opacity=".7"') + R(800, 420, 56, 140, '#5a2f22') + R(870, 432, 64, 100, '#f2d58a', ' opacity=".7"');
      out += R(672, 432, 110, 100, '#fff', ' opacity=".25"'); // fogged glass
      out += P('M 636 372 L 964 372 L 948 432 L 652 432 Z', '#d98b8f') + // dusty pink awning (faded from red)
        P('M 652 432 Q 670 444 688 432 Q 706 444 724 432 Q 742 444 760 432 Q 778 444 796 432 Q 814 444 832 432 Q 850 444 868 432 Q 886 444 904 432 Q 922 444 940 432 L 948 432 Z', '#c97b80') +
        '<text x="800" y="414" text-anchor="middle" font-family="Brush Script MT, Snell Roundhand, Georgia, serif" font-style="italic" font-weight="700" font-size="34" fill="#f6dd7a">Nom Wah Tea Parlor</text>';
    } else {
      // 1920: a modest bakery & tea parlor with a painted signboard
      out += R(656, 330, 288, 46, '#3a2416', ' stroke="#c9a35a" stroke-width="3"') +
        '<text x="740" y="364" text-anchor="middle" font-family="PingFang TC, Noto Serif TC, serif" font-weight="700" font-size="30" fill="#e9c35a">南華</text>' +
        '<text x="860" y="363" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="24" letter-spacing="3" fill="#e9c35a">NOM WAH</text>';
      out += R(656, 392, 288, 168, '#3a2416') + R(670, 412, 120, 112, '#f2d58a', ' opacity=".65"') + R(806, 412, 56, 148, '#5a3a22') + R(876, 412, 56, 112, '#f2d58a', ' opacity=".65"');
      for (var i = 0; i < 4; i++) out += '<g transform="translate(' + (690 + i * 26) + ',500) scale(.3)">' + E(0, 0, 40, 15, '#c98a43') + E(0, -2, 18, 7, '#b77735') + '</g>';
      out += P('M 640 380 L 960 380 L 944 404 L 656 404 Z', '#7a2f2a');
      out += '<text x="800" y="398" text-anchor="middle" font-family="Georgia, serif" font-size="15" letter-spacing="4" fill="#f2e3b8">BAKERY · TEA</text>';
    }
    out += R(822, 470, 6, 14, '#d9b45a'); // door handle
    return out;
  }

  function ground(u, era) {
    var out = '';
    out += P('M 0 900 L 470 560 L 1180 560 L 1600 900 Z', era === 'today' ? '#77746f' : '#6f6658');
    if (era !== 'today') { // cobblestones
      for (var r = 0; r < 9; r++) {
        var y = 580 + r * r * 4.2 + r * 10, w = 18 + r * 9;
        for (var x = -40; x < 1640; x += w * 1.4) out += E(x + (r % 2) * w * 0.7, y, w * 0.5, 4 + r * 1.2, '#5f574a', ' opacity=".5"');
      }
    } else { // "Rice Terraces" mural bands painted on the roadway (2021)
      var cols = ['#4fa35a', '#8cc152', '#f2c23b', '#3aa6c9', '#e8742c', '#4fa35a', '#c7d94a', '#2f8a7a'];
      for (var k = 0; k < 8; k++) {
        var yy = 600 + k * 38 + k * k * 1.6;
        out += '<path d="M 0 ' + (yy + 70) + ' Q 400 ' + (yy - 10) + ' 800 ' + (yy + 20) + ' T 1600 ' + (yy + 60) + '" fill="none" stroke="' + cols[k] + '" stroke-width="' + (16 + k * 4) + '" opacity=".85" clip-path="url(#' + u + '-road)"/>';
      }
    }
    // sidewalks along the walls
    out += P('M 0 900 L 470 560 L 500 560 L 110 900 Z', '#a8a196') + P('M 1600 900 L 1180 560 L 1150 560 L 1490 900 Z', '#a8a196');
    return out;
  }

  function lanterns() {
    var out = '';
    [[150, 300], [250, 360]].forEach(function (row, ri) {
      out += S('M 0 ' + row[0] + ' Q 800 ' + (row[1] + 60) + ' 1600 ' + row[0], '#2a2a2a', 2);
      for (var i = 1; i < 12; i++) {
        var t = i / 12, x = 1600 * t, y = (1 - t) * (1 - t) * row[0] + 2 * (1 - t) * t * (row[1] + 60) + t * t * row[0];
        var c = (i + ri) % 2 ? '#f2c23b' : '#4fa35a';
        out += S('M ' + x + ' ' + y + ' L ' + x + ' ' + (y + 10), '#2a2a2a', 2) + E(x, y + 26, 16, 18, c) + R(x - 9, y + 8, 18, 5, '#2a2a2a') + R(x - 9, y + 42, 18, 5, '#2a2a2a');
      }
    });
    return out;
  }

  ART.street = function (era) {
    var u = 'st' + (++uid);
    var out = '<defs>' +
      '<pattern id="' + u + '-brick" width="40" height="20" patternUnits="userSpaceOnUse">' + R(0, 0, 40, 20, era === 'today' ? '#a65a42' : '#94503a') +
      S('M 0 10 L 40 10 M 0 0 L 40 0 M 20 0 L 20 10 M 0 10 L 0 20 M 40 10 L 40 20', era === 'today' ? '#84442f' : '#74402c', 2) + '</pattern>' +
      '<linearGradient id="' + u + '-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (era === 'today' ? '#8ec3ea' : '#cfd3cf') + '"/><stop offset="1" stop-color="' + (era === 'today' ? '#e8f3f8' : '#efece2') + '"/></linearGradient>' +
      '<clipPath id="' + u + '-road"><path d="M 0 900 L 470 560 L 1180 560 L 1600 900 Z"/></clipPath>' +
      '</defs>';
    out += R(0, 0, 1600, 900, 'url(#' + u + '-sky)');
    out += farBuilding(u, era);
    out += P('M 1180 560 L 1300 520 L 1300 600 L 1180 600 Z', '#6a6458'); // road bending away to the right
    out += ground(u, era);
    out += sideWall(leftPt, era === 'today' ? '#b0644a' : '#9a5a42', era, 'L');
    out += sideWall(rightPt, era === 'today' ? '#8a5a48' : '#7d4e3c', era, 'R');
    if (era === 'today') out += lanterns();
    // street lamp (1920) / modern pole
    if (era !== 'today') {
      out += S('M 1380 900 L 1380 380', '#262626', 10) + S('M 1380 400 Q 1340 380 1320 400', '#262626', 6) + P('M 1300 400 L 1340 400 L 1330 440 L 1310 440 Z', '#f2e2a0', ' stroke="#262626" stroke-width="4"');
      // a Model T parked at the curb + a few passersby in suits & fedoras
      out += '<g transform="translate(330,760) scale(.9)">' + ART.car('modelT') + '</g>';
      out += ART.walker(980, 640, { coat: '#2e2e36', hat: 'fedora', hatColor: '#1e1e1e', s: 1.1 });
      out += ART.walker(1060, 620, { coat: '#4a3a2a', hat: 'fedora', hatColor: '#3a2a1a', s: 0.95 });
      out += ART.walker(560, 610, { coat: '#3a3a3a', hat: 'fedora', hatColor: '#222', s: 0.9 });
      out += ART.walker(1250, 760, { coat: '#5a4a3a', hat: 'cap', hatColor: '#4a4a4a', s: 1.4 }); // newsboy
    } else {
      // a line out the door + tourists
      var line = [[700, 620, '#d9534f', '#1d1d1d'], [740, 630, '#2e5a8a', '#5a3a2a'], [780, 640, '#e8b43a', '#1d1d1d'], [640, 650, '#5aa06a', '#3a2a1a'], [600, 662, '#7a4a8a', '#d9b46a'], [560, 676, '#2a2a2a', '#1d1d1d']];
      line.forEach(function (p, i) { out += ART.walker(p[0], p[1], { coat: p[2], hair: p[3], phone: i % 2 === 0, s: 0.95 + i * 0.06, bag: i === 2 ? '#e8dcc0' : null, skin: ['#f1c9a5', '#8d5a3b', '#e9bf98', '#c68a63', '#f3d3b5', '#5e3b26'][i] }); });
      out += ART.walker(1120, 720, { coat: '#3a6ea5', hair: '#2a1a12', phone: true, s: 1.3, skin: '#e9bf98' });
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
