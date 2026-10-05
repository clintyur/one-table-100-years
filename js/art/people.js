/*
 * people.js — a tiny "character creator" that draws every person in the game
 * as flat vector art (SVG strings, no image files).
 *
 *   ART.person(look, { expr })  ->  '<g>…</g>'
 *
 * Local coordinates: (0,0) is the bottom-center of the figure (the waist line —
 * the figure is always cut off by a table, counter or booth). Up is negative y.
 * An adult is ~580 units tall from waist to the top of the head.
 *
 * The SVG contains mouth groups .m-closed / .m-open (the game flaps them while
 * someone talks) and eye groups .e-open / .e-closed (blinking).
 */
(function (root) {
  'use strict';
  var ART = (root.ART = root.ART || {});

  // ---------------------------------------------------------------- helpers
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hex2rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgb2hex(r) {
    return '#' + r.map(function (v) { return ('0' + clamp(Math.round(v), 0, 255).toString(16)).slice(-2); }).join('');
  }
  /** Darken (amt < 0) or lighten (amt > 0) a hex color. amt in -1..1 */
  function shade(hex, amt) {
    var c = hex2rgb(hex);
    return rgb2hex(c.map(function (v) { return amt < 0 ? v * (1 + amt) : v + (255 - v) * amt; }));
  }
  ART.shade = shade;

  var INK = '#2a1c18';

  // Body builds: W = half shoulder width, H = head-center y, S = shoulder-top y, hs = head scale
  var BUILD = {
    m:    { W: 150, H: -505, S: -402, hs: 1 },
    f:    { W: 134, H: -505, S: -404, hs: 0.97 },
    big:  { W: 166, H: -505, S: -400, hs: 1.02 },
    teen: { W: 128, H: -490, S: -392, hs: 0.96 },
    kid:  { W: 104, H: -392, S: -298, hs: 0.93 }
  };

  // ---------------------------------------------------------------- hair (head-local: head center 0,0; rx 64, ry 74)
  // Each style returns { back, front } path markup given the hair color.
  function P(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function SK(d, stroke, w, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '/>';
  }

  var HAIR = {
    none: function () { return { back: '', front: '' }; },

    // short men's cut with a side part (1920s–60s)
    slick: function (c) {
      return {
        back: '',
        front:
          P('M -67 8 C -72 -56 -40 -89 4 -89 C 48 -89 74 -60 68 8 C 63 -26 52 -42 30 -48 C 6 -54 -14 -52 -31 -44 C -47 -36 -59 -22 -62 8 Z', c) +
          SK('M -22 -86 Q -29 -66 -33 -45', shade(c, -0.35), 3) +
          SK('M 6 -80 Q 34 -78 52 -60', '#fff', 4, ' opacity=".18"')
      };
    },

    // tousled teen hair (young Wally)
    tousled: function (c) {
      return {
        back: '',
        front:
          P('M -67 6 C -73 -46 -62 -78 -38 -88 L -34 -104 L -18 -91 L -6 -108 L 8 -93 L 25 -106 L 31 -89 C 59 -79 74 -50 68 6 C 63 -26 49 -44 22 -49 C 0 -52 -20 -48 -37 -40 C -51 -32 -60 -18 -62 6 Z', c) +
          SK('M -10 -84 Q 6 -76 24 -80', '#fff', 4, ' opacity=".16"')
      };
    },

    // balding with short sides (older Wally)
    balding: function (c) {
      return {
        back: '',
        front:
          P('M -67 16 C -73 -18 -66 -44 -50 -54 C -56 -32 -58 -10 -58 16 Z', c) +
          P('M 67 16 C 73 -18 66 -44 50 -54 C 56 -32 58 -10 58 16 Z', c) +
          SK('M -34 -70 Q 0 -82 34 -70', c, 4, ' opacity=".75"') +
          SK('M -24 -62 Q 2 -72 26 -62', c, 3, ' opacity=".55"')
      };
    },

    // 1980s kid bowl cut (young Wilson)
    bowl: function (c) {
      return {
        back: '',
        front:
          P('M -71 2 C -75 -64 -40 -96 0 -96 C 40 -96 75 -64 71 2 L 66 2 C 66 -14 63 -22 58 -26 L -58 -26 C -63 -22 -66 -14 -66 2 Z', c) +
          SK('M -40 -27 L -40 -40 M -14 -27 L -14 -42 M 14 -27 L 14 -42 M 40 -27 L 40 -40', shade(c, -0.4), 2, ' opacity=".5"') +
          SK('M -20 -84 Q 6 -90 30 -80', '#fff', 5, ' opacity=".18"')
      };
    },

    // modern short textured cut (adult Wilson, modern men)
    modern: function (c) {
      return {
        back: '',
        front:
          P('M -63 -14 C -67 -62 -38 -96 6 -96 C 50 -96 71 -66 65 -14 C 57 -36 42 -52 16 -56 C -12 -60 -40 -52 -56 -32 Z', c) +
          P('M -66 6 C -68 -16 -65 -30 -58 -36 L -56 6 Z', c, ' opacity=".55"') +
          P('M 66 6 C 68 -16 65 -30 58 -36 L 56 6 Z', c, ' opacity=".55"') +
          SK('M -30 -84 Q -6 -92 22 -88 M -18 -74 Q 8 -80 34 -72', shade(c, 0.25), 3, ' opacity=".5"')
      };
    },

    // close buzz cut
    buzz: function (c) {
      return {
        back: '',
        front: P('M -65 0 C -67 -56 -36 -84 0 -84 C 36 -84 67 -56 65 0 C 60 -30 40 -47 0 -49 C -40 -47 -60 -30 -65 0 Z', c, ' opacity=".9"')
      };
    },

    // 1930s finger-wave bob (May Choy)
    waves: function (c) {
      return {
        back: P('M -80 36 C -90 -36 -62 -96 0 -96 C 62 -96 90 -36 80 36 C 72 50 58 52 52 34 L -52 34 C -58 52 -72 50 -80 36 Z', c),
        front:
          P('M -67 6 C -72 -56 -37 -90 6 -90 C 49 -90 73 -58 68 6 C 61 -16 55 -30 41 -36 C 31 -45 20 -36 8 -42 C -6 -48 -20 -40 -32 -44 C -47 -48 -59 -26 -62 6 Z', c) +
          SK('M -54 -46 Q -40 -62 -24 -54 Q -10 -46 6 -62 Q 22 -76 40 -64', shade(c, 0.3), 3, ' opacity=".35"') +
          SK('M -60 -12 Q -70 4 -64 20 M 60 -12 Q 70 4 64 20', shade(c, 0.3), 3, ' opacity=".3"')
      };
    },

    // pulled-back hair with a bun (dim sum ladies)
    bun: function (c) {
      return {
        back: '<circle cx="34" cy="-80" r="30" fill="' + c + '"/>' +
              SK('M 12 -92 Q 34 -110 58 -86', shade(c, 0.3), 3, ' opacity=".35"'),
        front:
          P('M -67 2 C -71 -62 -36 -92 4 -92 C 46 -92 72 -62 68 2 C 64 -28 56 -46 36 -54 C 14 -62 -14 -62 -36 -54 C -56 -46 -64 -28 -67 2 Z', c) +
          SK('M 0 -91 L 0 -60', shade(c, -0.35), 2.5, ' opacity=".6"') +
          SK('M -40 -60 Q -18 -66 0 -62 M 0 -62 Q 18 -66 40 -60', shade(c, 0.3), 3, ' opacity=".28"')
      };
    },

    // 1980s perm
    perm: function (c) {
      var back = '';
      for (var i = 0; i < 14; i++) {
        var a = Math.PI * (0.92 + i * (1.16 / 13));
        back += '<circle cx="' + (Math.cos(a) * 80).toFixed(1) + '" cy="' + (Math.sin(a) * 84 + 6).toFixed(1) + '" r="' + (30 + (i % 3) * 4) + '" fill="' + c + '"/>';
      }
      back += '<circle cx="-74" cy="30" r="28" fill="' + c + '"/><circle cx="74" cy="30" r="28" fill="' + c + '"/>';
      var front = '';
      for (var k = 0; k < 6; k++) front += '<circle cx="' + (-50 + k * 20) + '" cy="' + (-56 - (k % 2) * 8) + '" r="17" fill="' + c + '"/>';
      front += P('M -66 -20 C -66 -60 -36 -88 0 -88 C 36 -88 66 -60 66 -20 C 50 -50 -50 -50 -66 -20 Z', c);
      return { back: back, front: front };
    },

    // long straight hair with side-swept bangs (modern women)
    long: function (c) {
      return {
        back: P('M -78 0 C -86 -70 -46 -104 0 -104 C 46 -104 86 -70 78 0 L 88 130 C 74 150 52 146 46 130 L 46 30 L -46 30 L -46 130 C -52 146 -74 150 -88 130 Z', c),
        front:
          P('M -67 10 C -72 -58 -36 -94 6 -94 C 50 -94 74 -60 68 10 C 62 -20 56 -36 46 -44 C 18 -40 -20 -52 -44 -28 C -54 -18 -62 -6 -67 10 Z', c) +
          SK('M 10 -86 Q 38 -84 56 -62', '#fff', 4, ' opacity=".18"')
      };
    },

    // 1970s feathered mid-length
    feathered: function (c) {
      return {
        back: P('M -80 46 C -92 -36 -62 -102 0 -102 C 62 -102 92 -36 80 46 C 72 58 58 56 54 38 L -54 38 C -58 56 -72 58 -80 46 Z', c),
        front:
          P('M -68 6 C -74 -60 -38 -96 0 -96 C 38 -96 74 -60 68 6 C 64 -28 50 -50 24 -56 C 10 -58 4 -52 0 -48 C -4 -52 -10 -58 -24 -56 C -50 -50 -64 -28 -68 6 Z', c) +
          SK('M -60 -20 Q -48 -50 -12 -56 M 60 -20 Q 48 -50 12 -56', shade(c, 0.3), 3, ' opacity=".3"')
      };
    },

    // big afro (1970s)
    afro: function (c) {
      return {
        back: '<ellipse cx="0" cy="-24" rx="108" ry="104" fill="' + c + '"/>',
        front: P('M -64 -8 C -60 -54 -30 -74 0 -74 C 30 -74 60 -54 64 -8 C 50 -40 -50 -40 -64 -8 Z', c)
      };
    },

    // short gray bob (older women)
    bob: function (c) {
      return {
        back: P('M -78 30 C -88 -40 -60 -96 0 -96 C 60 -96 88 -40 78 30 C 70 42 58 42 54 26 L -54 26 C -58 42 -70 42 -78 30 Z', c),
        front: P('M -67 4 C -72 -58 -36 -92 4 -92 C 46 -92 72 -60 68 4 C 62 -24 52 -42 30 -50 C 4 -58 -26 -52 -44 -38 C -56 -28 -63 -14 -67 4 Z', c)
      };
    },

    // ponytail (seen from the front: smooth top, tail peeking out at the side)
    ponytail: function (c) {
      return {
        back: P('M 52 -40 C 96 -30 104 40 84 96 C 76 70 74 30 60 6 Z', c),
        front: P('M -67 4 C -71 -60 -36 -92 4 -92 C 46 -92 72 -60 68 4 C 64 -28 54 -46 34 -54 C 12 -60 -16 -60 -38 -52 C -56 -44 -64 -26 -67 4 Z', c) +
          SK('M 10 -84 Q 38 -82 54 -62', '#fff', 4, ' opacity=".18"')
      };
    }
  };

  // ---------------------------------------------------------------- hats (head-local)
  var HATS = {
    fedora: function (c) {
      return '<ellipse cx="0" cy="-58" rx="102" ry="20" fill="' + shade(c, -0.15) + '"/>' +
        P('M -62 -60 C -64 -108 -40 -134 0 -132 C 40 -134 64 -108 62 -60 Z', c) +
        P('M -20 -128 Q 0 -114 20 -128 Q 0 -122 -20 -128 Z', shade(c, -0.3)) +
        '<rect x="-62" y="-80" width="124" height="16" fill="' + shade(c, -0.45) + '"/>';
    },
    newsboy: function (c) {
      return P('M -72 -40 C -80 -96 -30 -120 10 -116 C 60 -112 86 -84 76 -46 Z', c) +
        P('M -70 -44 C -40 -26 40 -24 78 -40 C 70 -30 40 -20 0 -20 C -40 -20 -64 -30 -70 -44 Z', shade(c, -0.25)) +
        '<circle cx="4" cy="-112" r="6" fill="' + shade(c, -0.3) + '"/>';
    },
    paper: function () { // white paper soda-jerk cap
      return P('M -58 -54 L -44 -92 L 46 -92 L 60 -54 Z', '#f7f4ee') +
        P('M -58 -54 L 60 -54 L 56 -46 L -54 -46 Z', '#e1dbd0');
    },
    cap: function (c) { // baseball cap, bill forward
      return P('M -66 -36 C -70 -98 -34 -112 0 -112 C 34 -112 70 -98 66 -36 Z', c) +
        P('M -60 -38 C -30 -18 50 -18 92 -30 C 80 -44 40 -48 -60 -38 Z', shade(c, -0.25)) +
        '<circle cx="0" cy="-110" r="5" fill="' + shade(c, -0.3) + '"/>';
    },
    beanie: function (c) {
      var ribs = '';
      for (var i = -56; i <= 56; i += 10) ribs += SK('M ' + i + ' -40 L ' + i + ' -60', shade(c, -0.25), 2, ' opacity=".6"');
      return P('M -68 -40 C -72 -110 -36 -124 0 -124 C 36 -124 72 -110 68 -40 Z', c) +
        '<rect x="-70" y="-62" width="140" height="24" rx="8" fill="' + shade(c, -0.12) + '"/>' + ribs;
    },
    cloche: function (c) {
      return P('M -76 -20 C -82 -100 -40 -120 0 -120 C 40 -120 82 -100 76 -20 C 60 -34 -60 -34 -76 -20 Z', c) +
        '<rect x="-72" y="-52" width="144" height="12" fill="' + shade(c, -0.35) + '"/>';
    },
    hairnet: function () {
      return SK('M -60 -46 Q 0 -70 60 -46', '#3a2e2a', 1.5, ' opacity=".35"');
    }
  };

  // ---------------------------------------------------------------- faces (head-local)
  function face(L, expr) {
    var skin = L.skin, brow = L.brow || shade(L.hair && L.hair.color || '#222', 0), lip = L.lip || '#7b2c25';
    var out = '';
    var old = L.age === 'old';

    // eyebrows
    var by = -22, bl, br;
    if (expr === 'surprised') { bl = 'M -36 -32 Q -24 -40 -12 -34'; br = 'M 12 -34 Q 24 -40 36 -32'; }
    else if (expr === 'worried') { bl = 'M -36 -22 Q -26 -24 -14 -32'; br = 'M 14 -32 Q 26 -24 36 -22'; }
    else if (expr === 'serious') { bl = 'M -36 -26 Q -24 -26 -12 -21'; br = 'M 12 -21 Q 24 -26 36 -26'; }
    else { bl = 'M -36 -' + (-by) + ' Q -24 -29 -12 -23'; br = 'M 12 -23 Q 24 -29 36 -' + (-by); }
    out += SK(bl, brow, old ? 4 : 5) + SK(br, brow, old ? 4 : 5);

    // eyes
    var openEyes, closedEyes;
    var ey = 0, erx = old ? 6 : 7, ery = old ? 8 : 9.5;
    if (expr === 'happy') {
      openEyes = SK('M -33 3 Q -24 -8 -15 3', INK, 4) + SK('M 15 3 Q 24 -8 33 3', INK, 4);
      closedEyes = openEyes;
    } else {
      openEyes =
        '<ellipse cx="-24" cy="' + ey + '" rx="' + erx + '" ry="' + (expr === 'surprised' ? ery + 2 : ery) + '" fill="' + INK + '"/>' +
        '<ellipse cx="24" cy="' + ey + '" rx="' + erx + '" ry="' + (expr === 'surprised' ? ery + 2 : ery) + '" fill="' + INK + '"/>' +
        '<circle cx="-21.5" cy="-3.5" r="2.6" fill="#fff"/><circle cx="26.5" cy="-3.5" r="2.6" fill="#fff"/>';
      closedEyes = SK('M -32 1 Q -24 6 -16 1', INK, 3.5) + SK('M 16 1 Q 24 6 32 1', INK, 3.5);
    }
    out += '<g class="e-open">' + openEyes + '</g><g class="e-closed">' + closedEyes + '</g>';

    // age lines
    if (old) {
      out += SK('M -44 -2 l -8 -3 M -44 5 l -8 2 M 44 -2 l 8 -3 M 44 5 l 8 2', shade(skin, -0.35), 2, ' opacity=".7"');
      out += SK('M -24 24 q -8 12 -2 22 M 24 24 q 8 12 2 22', shade(skin, -0.3), 2.2, ' opacity=".6"');
      out += SK('M -22 -44 Q 0 -48 22 -44', shade(skin, -0.3), 2, ' opacity=".45"');
    }

    // glasses
    if (L.glasses === 'round') {
      out += '<circle cx="-24" cy="0" r="16" fill="#fff" fill-opacity=".12" stroke="#3a2f2a" stroke-width="3.5"/>' +
             '<circle cx="24" cy="0" r="16" fill="#fff" fill-opacity=".12" stroke="#3a2f2a" stroke-width="3.5"/>' +
             SK('M -8 -2 Q 0 -7 8 -2', '#3a2f2a', 3) + SK('M -40 -2 L -62 -6 M 40 -2 L 62 -6', '#3a2f2a', 3);
    } else if (L.glasses === 'square') {
      out += '<rect x="-42" y="-13" width="36" height="25" rx="6" fill="#fff" fill-opacity=".12" stroke="#2f2a28" stroke-width="3.5"/>' +
             '<rect x="6" y="-13" width="36" height="25" rx="6" fill="#fff" fill-opacity=".12" stroke="#2f2a28" stroke-width="3.5"/>' +
             SK('M -6 -3 L 6 -3', '#2f2a28', 3) + SK('M -42 -4 L -62 -7 M 42 -4 L 62 -7', '#2f2a28', 3);
    } else if (L.glasses === 'aviator') {
      out += P('M -44 -12 L -6 -12 Q -4 14 -24 16 Q -46 14 -44 -12 Z', '#8a6d3b', ' fill-opacity=".25" stroke="#b08a3e" stroke-width="3"') +
             P('M 44 -12 L 6 -12 Q 4 14 24 16 Q 46 14 44 -12 Z', '#8a6d3b', ' fill-opacity=".25" stroke="#b08a3e" stroke-width="3"') +
             SK('M -6 -10 L 6 -10', '#b08a3e', 3);
    }

    // nose
    out += SK('M -2 14 Q 5 22 -3 27', shade(skin, -0.32), 3, ' opacity=".8"');

    // cheeks
    out += '<ellipse cx="-38" cy="27" rx="11" ry="6.5" fill="#ff7b6b" opacity="' + (L.blush || 0.26) + '"/>' +
           '<ellipse cx="38" cy="27" rx="11" ry="6.5" fill="#ff7b6b" opacity="' + (L.blush || 0.26) + '"/>';

    // mouth: closed shape depends on expression, open is the talking shape
    var closed;
    if (expr === 'happy' || expr === 'proud') closed = P('M -16 41 Q 0 60 16 41 Q 0 47 -16 41 Z', lip) ;
    else if (expr === 'surprised') closed = '<ellipse cx="0" cy="48" rx="7" ry="9" fill="' + lip + '"/>';
    else if (expr === 'worried' || expr === 'serious') closed = SK('M -11 49 Q 0 45 11 49', lip, 3.5);
    else closed = SK('M -14 44 Q 0 55 14 44', lip, 3.6);
    var open = P('M -14 42 Q 0 64 14 42 Q 0 46 -14 42 Z', '#6b2320') + P('M -7 53 Q 0 50 7 53 Q 0 60 -7 53 Z', '#e07a6a');
    if (expr === 'surprised') open = '<ellipse cx="0" cy="49" rx="9" ry="12" fill="#6b2320"/>';
    out += '<g class="m-closed">' + closed + '</g><g class="m-open">' + open + '</g>';

    // facial hair
    if (L.mustache) out += P('M -24 36 Q -12 28 0 34 Q 12 28 24 36 Q 12 40 0 37 Q -12 40 -24 36 Z', L.mustache);
    if (L.stubble) out += P('M -50 30 Q -40 70 0 76 Q 40 70 50 30 Q 30 56 0 58 Q -30 56 -50 30 Z', L.stubble, ' opacity=".18"');
    return out;
  }

  // ---------------------------------------------------------------- outfit pieces (body-local)
  function torsoPath(W, S) {
    return 'M ' + (-W) + ' ' + (S + 102) +
      ' C ' + (-W) + ' ' + (S + 40) + ' ' + (-W + 30) + ' ' + (S + 7) + ' -52 ' + S +
      ' L 52 ' + S +
      ' C ' + (W - 30) + ' ' + (S + 7) + ' ' + W + ' ' + (S + 40) + ' ' + W + ' ' + (S + 102) +
      ' L ' + (W - 12) + ' 0 L ' + (-W + 12) + ' 0 Z';
  }

  function collar(type, o, W, S, skin) {
    var out = '', c = o.collarColor || '#fbfaf6', t = o.trim || shade(o.color, -0.35);
    switch (type) {
      case 'shirt':
        out += P('M -30 ' + (S - 2) + ' L 0 ' + (S + 24) + ' L -24 ' + (S + 42) + ' L -48 ' + (S + 6) + ' Z', c, ' stroke="' + shade(c, -0.18) + '" stroke-width="2"') +
               P('M 30 ' + (S - 2) + ' L 0 ' + (S + 24) + ' L 24 ' + (S + 42) + ' L 48 ' + (S + 6) + ' Z', c, ' stroke="' + shade(c, -0.18) + '" stroke-width="2"');
        break;
      case 'open': // open shirt collar showing skin (casual)
        out += P('M -30 ' + (S - 2) + ' L 0 ' + (S + 46) + ' L 30 ' + (S - 2) + ' Z', skin) +
               P('M -30 ' + (S - 2) + ' L -4 ' + (S + 44) + ' L -30 ' + (S + 40) + ' L -54 ' + (S + 8) + ' Z', c) +
               P('M 30 ' + (S - 2) + ' L 4 ' + (S + 44) + ' L 30 ' + (S + 40) + ' L 54 ' + (S + 8) + ' Z', c);
        break;
      case 'mandarin':
        out += P('M -31 ' + (S - 40) + ' Q 0 ' + (S - 30) + ' 31 ' + (S - 40) + ' L 32 ' + (S + 4) + ' Q 0 ' + (S + 14) + ' -32 ' + (S + 4) + ' Z', o.color, ' stroke="' + t + '" stroke-width="3"');
        break;
      case 'round':
        out += P('M -36 ' + S + ' Q 0 ' + (S + 34) + ' 36 ' + S + ' Z', skin) + SK('M -36 ' + S + ' Q 0 ' + (S + 34) + ' 36 ' + S, shade(o.color, -0.25), 6);
        break;
      case 'vneck':
        out += P('M -34 ' + S + ' L 0 ' + (S + 56) + ' L 34 ' + S + ' Z', skin) + SK('M -34 ' + S + ' L 0 ' + (S + 56) + ' L 34 ' + S, shade(o.color, -0.25), 6);
        break;
      case 'turtle':
        out += P('M -32 ' + (S - 36) + ' Q 0 ' + (S - 26) + ' 32 ' + (S - 36) + ' L 36 ' + (S + 8) + ' Q 0 ' + (S + 20) + ' -36 ' + (S + 8) + ' Z', shade(o.color, -0.08));
        break;
      case 'polo':
        out += P('M -30 ' + (S - 2) + ' L 0 ' + (S + 18) + ' L -20 ' + (S + 32) + ' L -46 ' + (S + 6) + ' Z', o.color, ' stroke="' + shade(o.color, -0.25) + '" stroke-width="2"') +
               P('M 30 ' + (S - 2) + ' L 0 ' + (S + 18) + ' L 20 ' + (S + 32) + ' L 46 ' + (S + 6) + ' Z', o.color, ' stroke="' + shade(o.color, -0.25) + '" stroke-width="2"') +
               SK('M 0 ' + (S + 18) + ' L 0 ' + (S + 70), shade(o.color, -0.25), 3) +
               '<circle cx="0" cy="' + (S + 38) + '" r="3.5" fill="#f4f1ea"/><circle cx="0" cy="' + (S + 58) + '" r="3.5" fill="#f4f1ea"/>';
        break;
      case 'hood':
        out += P('M -34 ' + S + ' Q 0 ' + (S + 30) + ' 34 ' + S + ' Z', skin) +
               SK('M -16 ' + (S + 16) + ' L -20 ' + (S + 90) + ' M 16 ' + (S + 16) + ' L 20 ' + (S + 90), '#f2efe8', 4);
        break;
    }
    return out;
  }

  function hoodBack(o, W, S) {
    return P('M ' + (-W + 50) + ' ' + (S + 30) + ' C ' + (-W + 40) + ' ' + (S - 40) + ' -70 ' + (S - 70) + ' -40 ' + (S - 60) +
      ' L 40 ' + (S - 60) + ' C 70 ' + (S - 70) + ' ' + (W - 40) + ' ' + (S - 40) + ' ' + (W - 50) + ' ' + (S + 30) + ' Z', shade(o.color, -0.12));
  }

  function tie(o, S) {
    var c = o.tie;
    return P('M -10 ' + (S + 6) + ' L 10 ' + (S + 6) + ' L 13 ' + (S + 26) + ' L 0 ' + (S + 36) + ' L -13 ' + (S + 26) + ' Z', c) +
           P('M -11 ' + (S + 34) + ' L 11 ' + (S + 34) + ' L 19 ' + (S + 170) + ' L 0 ' + (S + 196) + ' L -19 ' + (S + 170) + ' Z', c) +
           (o.tiePattern ? SK('M -12 ' + (S + 70) + ' L 14 ' + (S + 56) + ' M -14 ' + (S + 110) + ' L 16 ' + (S + 96) + ' M -16 ' + (S + 150) + ' L 18 ' + (S + 136), shade(c, 0.35), 4, ' opacity=".6"') : '');
  }

  function layer(o, W, S) {
    var t = o.layer, c = o.layerColor || '#ffffff', out = '';
    if (t === 'apron') {
      out += S_('M -78 ' + (S + 74) + ' L -40 ' + (S + 2), c, 12) + S_('M 78 ' + (S + 74) + ' L 40 ' + (S + 2), c, 12);
      out += P('M -82 ' + (S + 74) + ' L 82 ' + (S + 74) + ' L 96 0 L -96 0 Z', c, ' stroke="' + shade(c, -0.12) + '" stroke-width="2"');
      out += P('M -40 ' + (S + 220) + ' L 40 ' + (S + 220) + ' L 40 ' + (S + 268) + ' L -40 ' + (S + 268) + ' Z', shade(c, -0.06), ' stroke="' + shade(c, -0.15) + '" stroke-width="2"');
    } else if (t === 'halfapron') {
      out += P('M -110 ' + (S + 300) + ' L 110 ' + (S + 300) + ' L 116 0 L -116 0 Z', c, ' stroke="' + shade(c, -0.15) + '" stroke-width="2"');
    } else if (t === 'vest') {
      out += P('M ' + (-W + 12) + ' ' + (S + 90) + ' C ' + (-W + 16) + ' ' + (S + 40) + ' -70 ' + (S + 6) + ' -36 ' + (S + 2) + ' L 0 ' + (S + 120) + ' L 0 0 L ' + (-W + 16) + ' 0 Z', c) +
             P('M ' + (W - 12) + ' ' + (S + 90) + ' C ' + (W - 16) + ' ' + (S + 40) + ' 70 ' + (S + 6) + ' 36 ' + (S + 2) + ' L 0 ' + (S + 120) + ' L 0 0 L ' + (W - 16) + ' 0 Z', c) +
             S_('M 0 ' + (S + 120) + ' L 0 0', shade(c, -0.35), 2.5);
      for (var i = 0; i < 4; i++) out += '<circle cx="6" cy="' + (S + 150 + i * 56) + '" r="4.5" fill="' + shade(c, 0.35) + '"/>';
    } else if (t === 'cardigan' || t === 'jacket' || t === 'blazer') {
      var gap = t === 'cardigan' ? 26 : 30;
      out += P('M ' + (-W) + ' ' + (S + 102) + ' C ' + (-W) + ' ' + (S + 40) + ' ' + (-W + 30) + ' ' + (S + 7) + ' -52 ' + S + ' L ' + (-gap) + ' ' + (S + 4) + ' L ' + (-gap) + ' 0 L ' + (-W + 12) + ' 0 Z', c) +
             P('M ' + W + ' ' + (S + 102) + ' C ' + W + ' ' + (S + 40) + ' ' + (W - 30) + ' ' + (S + 7) + ' 52 ' + S + ' L ' + gap + ' ' + (S + 4) + ' L ' + gap + ' 0 L ' + (W - 12) + ' 0 Z', c);
      if (t !== 'cardigan') { // lapels
        out += P('M -52 ' + S + ' L ' + (-gap) + ' ' + (S + 4) + ' L ' + (-gap + 4) + ' ' + (S + 150) + ' L -64 ' + (S + 60) + ' Z', shade(c, -0.14)) +
               P('M 52 ' + S + ' L ' + gap + ' ' + (S + 4) + ' L ' + (gap - 4) + ' ' + (S + 150) + ' L 64 ' + (S + 60) + ' Z', shade(c, -0.14));
      } else {
        for (var j = 0; j < 5; j++) out += '<circle cx="' + (-gap + 9) + '" cy="' + (S + 70 + j * 60) + '" r="5" fill="' + shade(c, -0.35) + '"/>';
      }
    } else if (t === 'puffer') {
      out += P(torsoPath(W + 6, S - 6), c);
      for (var k = 0; k < 6; k++) out += S_('M ' + (-W + 2) + ' ' + (S + 60 + k * 58) + ' Q 0 ' + (S + 74 + k * 58) + ' ' + (W - 2) + ' ' + (S + 60 + k * 58), shade(c, -0.22), 3);
      out += S_('M 0 ' + (S + 10) + ' L 0 0', shade(c, -0.3), 3);
      out += P('M -34 ' + (S - 30) + ' Q 0 ' + (S - 18) + ' 34 ' + (S - 30) + ' L 38 ' + (S + 14) + ' Q 0 ' + (S + 26) + ' -38 ' + (S + 14) + ' Z', shade(c, -0.08));
    }
    return out;
  }
  function S_(d, stroke, w, extra) { return SK(d, stroke, w, extra); }

  function extras(o, W, S, skin) {
    var out = '';
    if (o.frogs) { // diagonal qipao closure with knotted "frog" buttons
      var t = o.trim || shade(o.color, -0.35);
      out += SK('M 4 ' + (S + 6) + ' Q 52 ' + (S + 24) + ' ' + (W - 40) + ' ' + (S + 80), t, 4);
      out += '<circle cx="30" cy="' + (S + 14) + '" r="5" fill="' + t + '"/><circle cx="62" cy="' + (S + 30) + '" r="5" fill="' + t + '"/><circle cx="' + (W - 48) + '" cy="' + (S + 70) + '" r="5" fill="' + t + '"/>';
    }
    if (o.buttons) for (var i = 0; i < 5; i++) out += '<circle cx="0" cy="' + (S + 60 + i * 62) + '" r="4.5" fill="' + shade(o.color, -0.25) + '"/>';
    if (o.placket) out += SK('M 0 ' + (S + 24) + ' L 0 0', shade(o.color, -0.18), 2.5);
    if (o.stripes) for (var s = 0; s < 7; s++) out += SK('M ' + (-W + 8) + ' ' + (S + 40 + s * 52) + ' L ' + (W - 8) + ' ' + (S + 40 + s * 52), o.stripes, 10, ' opacity=".7"');
    if (o.pocket) {
      out += P('M 40 ' + (S + 80) + ' L 92 ' + (S + 80) + ' L 92 ' + (S + 128) + ' L 40 ' + (S + 128) + ' Z', shade(o.color, -0.08), ' stroke="' + shade(o.color, -0.22) + '" stroke-width="2"');
      if (o.pen) out += SK('M 56 ' + (S + 66) + ' L 56 ' + (S + 92), '#1d3d7a', 5) + SK('M 72 ' + (S + 70) + ' L 72 ' + (S + 92), '#b8312b', 5);
    }
    if (o.nametag) out += '<rect x="44" y="' + (S + 100) + '" width="58" height="22" rx="3" fill="#fbf7ee" stroke="#b8312b" stroke-width="2"/><rect x="44" y="' + (S + 100) + '" width="58" height="7" rx="2" fill="#b8312b"/>';
    if (o.lanyard) out += SK('M -26 ' + (S + 4) + ' L 0 ' + (S + 130) + ' L 26 ' + (S + 4), o.lanyard, 5) + '<rect x="-20" y="' + (S + 128) + '" width="40" height="52" rx="5" fill="#f5f2ea" stroke="#999" stroke-width="2"/>';
    if (o.pearls) for (var p = -5; p <= 5; p++) out += '<circle cx="' + (p * 7) + '" cy="' + (S + 8 + Math.abs(p) * -1 + 10 - p * p * 0.15) + '" r="4.2" fill="#fbf6ea" stroke="#d9cdb4" stroke-width="1"/>';
    if (o.towel) out += P('M ' + (-W + 28) + ' ' + (S + 4) + ' L -66 ' + (S - 2) + ' L -56 ' + (S + 150) + ' L ' + (-W + 34) + ' ' + (S + 160) + ' Z', '#fbfbf7', ' stroke="#d6d2c8" stroke-width="2"') +
                       SK('M ' + (-W + 30) + ' ' + (S + 120) + ' L -58 ' + (S + 112), '#4f7fb8', 6);
    if (o.scarf) out += P('M -44 ' + (S - 8) + ' Q 0 ' + (S + 22) + ' 44 ' + (S - 8) + ' L 48 ' + (S + 22) + ' Q 0 ' + (S + 52) + ' -48 ' + (S + 22) + ' Z', o.scarf) + P('M 20 ' + (S + 30) + ' L 44 ' + (S + 140) + ' L 16 ' + (S + 146) + ' Z', o.scarf);
    if (o.logo) out += '<text x="0" y="' + (S + 120) + '" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="30" fill="' + o.logo + '">' + o.logoText + '</text>';
    return out;
  }

  // ---------------------------------------------------------------- props held in front of the body
  function hand(x, y, skin) {
    return '<ellipse cx="' + x + '" cy="' + y + '" rx="18" ry="15" fill="' + skin + '" stroke="' + shade(skin, -0.25) + '" stroke-width="2"/>';
  }
  function forearm(x1, y1, x2, y2, c) {
    return SK('M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2, c, 42) + SK('M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2, shade(c, -0.15), 42, ' opacity=".25"');
  }

  var PROPS = {
    teapot: function (L, W, S, sleeve) {
      return forearm(W - 26, S + 190, 70, S + 250, sleeve) + forearm(-W + 26, S + 190, -20, S + 262, sleeve) +
        '<g transform="translate(30,' + (S + 250) + ') scale(0.9)">' + ART.teapotSvg('#f7f4ec', '#2f5d9c') + '</g>' +
        hand(70, S + 238, L.skin) + hand(-24, S + 262, L.skin);
    },
    menu: function (L, W, S, sleeve) {
      return forearm(-W + 26, S + 190, -40, S + 236, sleeve) +
        '<g transform="translate(-58,' + (S + 160) + ') rotate(-8)"><rect x="-44" y="0" width="88" height="120" rx="4" fill="#b8312b"/><rect x="-36" y="10" width="72" height="100" fill="none" stroke="#e8c36a" stroke-width="3"/><text x="0" y="66" text-anchor="middle" font-family="PingFang TC, Noto Serif TC, serif" font-size="30" fill="#e8c36a">茶</text></g>' +
        hand(-40, S + 238, L.skin);
    },
    tray: function (L, W, S, sleeve) {
      var y = S + 236;
      return forearm(-W + 26, S + 200, -118, y + 10, sleeve) + forearm(W - 26, S + 200, 118, y + 10, sleeve) +
        '<rect x="-150" y="' + (y) + '" width="300" height="16" rx="6" fill="#8a5a2b"/>' +
        '<g transform="translate(-72,' + (y - 6) + ') scale(.62)">' + ART.food('cha_siu_bao') + '</g>' +
        '<g transform="translate(72,' + (y - 6) + ') scale(.62)">' + ART.food('har_gow') + '</g>' +
        '<g transform="translate(0,' + (y - 46) + ') scale(.6)">' + ART.food('har_gow_stack') + '</g>' +
        hand(-128, y + 12, L.skin) + hand(128, y + 12, L.skin);
    },
    tub: function (L, W, S, sleeve) {
      var y = S + 236;
      return forearm(-W + 26, S + 200, -110, y + 30, sleeve) + forearm(W - 26, S + 200, 110, y + 30, sleeve) +
        '<path d="M -130 ' + y + ' L 130 ' + y + ' L 116 ' + (y + 90) + ' L -116 ' + (y + 90) + ' Z" fill="#8c9497"/>' +
        '<ellipse cx="-50" cy="' + (y - 4) + '" rx="46" ry="12" fill="#f4f1ea" stroke="#c9c2b4" stroke-width="2"/>' +
        '<ellipse cx="34" cy="' + (y - 10) + '" rx="40" ry="11" fill="#f4f1ea" stroke="#c9c2b4" stroke-width="2"/>' +
        '<rect x="70" y="' + (y - 36) + '" width="22" height="34" rx="4" fill="#f4f1ea" stroke="#c9c2b4" stroke-width="2"/>' +
        SK('M -10 ' + (y - 40) + ' L 30 ' + (y - 2) + ' M -2 ' + (y - 44) + ' L 38 ' + (y - 6), '#7a4a26', 4) +
        '<rect x="-130" y="' + y + '" width="260" height="10" fill="#a3abae"/>' +
        hand(-118, y + 30, L.skin) + hand(118, y + 30, L.skin);
    },
    cards: function (L, W, S, sleeve) {
      var cards = '';
      for (var i = 0; i < 5; i++) {
        cards += '<g transform="rotate(' + (-30 + i * 14) + ')"><rect x="-17" y="-70" width="34" height="50" rx="4" fill="#fbfaf5" stroke="#bbb" stroke-width="1.5"/>' +
          '<text x="-9" y="-50" font-family="Georgia,serif" font-size="14" fill="' + (i % 2 ? '#b8312b' : '#222') + '">' + ['A', 'K', '7', 'Q', '3'][i] + '</text></g>';
      }
      return forearm(W - 26, S + 190, 70, S + 238, sleeve) + '<g transform="translate(76,' + (S + 238) + ')">' + cards + '</g>' + hand(74, S + 238, L.skin);
    },
    phone: function (L, W, S, sleeve) {
      return forearm(W - 26, S + 180, 74, S + 110, sleeve) +
        '<rect x="50" y="' + (S + 36) + '" width="48" height="86" rx="8" fill="#1d1f24"/><rect x="55" y="' + (S + 44) + '" width="38" height="68" rx="3" fill="#7fb4e6"/>' +
        hand(76, S + 116, L.skin);
    },
    tablet: function (L, W, S, sleeve) {
      var y = S + 196;
      return forearm(-W + 26, S + 200, -60, y + 56, sleeve) + forearm(W - 26, S + 200, 60, y + 56, sleeve) +
        '<g transform="translate(0,' + y + ') rotate(-4)"><rect x="-80" y="-4" width="160" height="112" rx="10" fill="#2a2c31"/><rect x="-70" y="6" width="140" height="92" rx="3" fill="#eaf1f8"/>' +
        '<rect x="-70" y="6" width="140" height="18" fill="#3b5998"/><rect x="-60" y="34" width="60" height="44" fill="#d9c7a4"/><rect x="8" y="36" width="54" height="6" fill="#9aa"/><rect x="8" y="50" width="44" height="6" fill="#bbb"/><rect x="8" y="64" width="50" height="6" fill="#bbb"/></g>' +
        hand(-64, y + 60, L.skin) + hand(64, y + 60, L.skin);
    },
    notepad: function (L, W, S, sleeve) {
      return forearm(-W + 26, S + 190, -60, S + 240, sleeve) +
        '<g transform="translate(-74,' + (S + 196) + ') rotate(-6)"><rect x="-34" y="0" width="68" height="86" rx="3" fill="#fbf8ef" stroke="#c9c0ac" stroke-width="2"/>' +
        SK('M -24 22 L 24 22 M -24 38 L 20 38 M -24 54 L 24 54 M -24 70 L 12 70', '#9b8f7a', 2) + '</g>' +
        hand(-58, S + 244, L.skin);
    },
    flag: function (L, W, S, sleeve) {
      return SK('M 96 ' + (S + 220) + ' L 104 ' + (S - 330), '#6d5a3c', 6) +
        P('M 104 ' + (S - 330) + ' L 190 ' + (S - 312) + ' L 104 ' + (S - 290) + ' Z', '#e8432e') +
        forearm(W - 26, S + 190, 98, S + 214, sleeve) + hand(98, S + 214, L.skin);
    },
    cup: function (L, W, S, sleeve) {
      return forearm(W - 26, S + 190, 64, S + 238, sleeve) +
        '<g transform="translate(64,' + (S + 222) + ')"><path d="M -20 -18 L 20 -18 L 15 14 Q 0 20 -15 14 Z" fill="#fbfaf5" stroke="#cfc8b8" stroke-width="2"/><ellipse cx="0" cy="-18" rx="20" ry="5" fill="#a8743a"/></g>' +
        hand(66, S + 238, L.skin);
    }
  };

  // ---------------------------------------------------------------- the person
  ART.person = function (L, opts) {
    opts = opts || {};
    var expr = opts.expr || L.expr || 'smile';
    var B = BUILD[L.build || 'm'];
    var W = B.W, S = B.S, H = B.H, hs = B.hs;
    var o = L.outfit || { color: '#777' };
    var sleeve = o.sleeve || (o.layer && /cardigan|jacket|blazer|puffer/.test(o.layer) ? o.layerColor : o.color);
    var skin = L.skin;
    var hairC = (L.hair && L.hair.color) || '#1f1a1a';
    var hairFn = HAIR[(L.hair && L.hair.style) || 'none'] || HAIR.none;
    var hair = hairFn(hairC);
    var out = '';

    // hood / long hair behind everything
    if (o.collar === 'hood') out += hoodBack(o, W, S);
    out += '<g transform="translate(0,' + H + ') scale(' + hs + ')">' + hair.back + '</g>';

    // neck
    out += P('M -25 ' + (H + 52) + ' L -25 ' + (S + 6) + ' Q 0 ' + (S + 16) + ' 25 ' + (S + 6) + ' L 25 ' + (H + 52) + ' Z', skin);
    out += P('M -25 ' + (H + 60) + ' Q 0 ' + (H + 80) + ' 25 ' + (H + 60) + ' L 25 ' + (H + 74) + ' Q 0 ' + (H + 92) + ' -25 ' + (H + 74) + ' Z', '#000', ' opacity=".13"');

    // torso + arms
    out += P(torsoPath(W, S), o.color);
    out += P('M ' + (-W) + ' ' + (S + 102) + ' C ' + (-W - 6) + ' ' + (S + 190) + ' ' + (-W + 2) + ' ' + (S + 300) + ' ' + (-W + 10) + ' 0 L ' + (-W + 52) + ' 0 C ' + (-W + 50) + ' ' + (S + 300) + ' ' + (-W + 48) + ' ' + (S + 200) + ' ' + (-W + 40) + ' ' + (S + 112) + ' Z', sleeve);
    out += P('M ' + W + ' ' + (S + 102) + ' C ' + (W + 6) + ' ' + (S + 190) + ' ' + (W - 2) + ' ' + (S + 300) + ' ' + (W - 10) + ' 0 L ' + (W - 52) + ' 0 C ' + (W - 50) + ' ' + (S + 300) + ' ' + (W - 48) + ' ' + (S + 200) + ' ' + (W - 40) + ' ' + (S + 112) + ' Z', sleeve);
    out += SK('M ' + (-W + 42) + ' ' + (S + 112) + ' C ' + (-W + 46) + ' ' + (S + 200) + ' ' + (-W + 50) + ' ' + (S + 300) + ' ' + (-W + 52) + ' 0', '#000', 2.5, ' opacity=".14"');
    out += SK('M ' + (W - 42) + ' ' + (S + 112) + ' C ' + (W - 46) + ' ' + (S + 200) + ' ' + (W - 50) + ' ' + (S + 300) + ' ' + (W - 52) + ' 0', '#000', 2.5, ' opacity=".14"');
    // soft side shading
    out += P('M ' + (W - 70) + ' ' + (S + 10) + ' C ' + (W - 20) + ' ' + (S + 30) + ' ' + W + ' ' + (S + 70) + ' ' + W + ' ' + (S + 102) + ' L ' + (W - 12) + ' 0 L ' + (W - 60) + ' 0 Z', '#000', ' opacity=".07"');

    if (o.stripes || o.placket || o.buttons) out += extras({ color: o.color, stripes: o.stripes, placket: o.placket, buttons: o.buttons }, W, S, skin);
    if (o.collar && o.collar !== 'hood' && o.collar !== 'mandarin' && o.collar !== 'turtle') out += collar(o.collar, o, W, S, skin);
    if (o.tie) out += tie(o, S);
    if (o.layer) out += layer(o, W, S);
    if (o.collar === 'mandarin' || o.collar === 'turtle' || o.collar === 'hood') out += collar(o.collar, o, W, S, skin);
    out += extras({ color: o.color, trim: o.trim, frogs: o.frogs, pocket: o.pocket, pen: o.pen, nametag: o.nametag, lanyard: o.lanyard, pearls: o.pearls, towel: o.towel, scarf: o.scarf, logo: o.logo, logoText: o.logoText }, W, S, skin);

    // head
    var head = '';
    head += '<ellipse cx="-62" cy="6" rx="13" ry="18" fill="' + skin + '"/><ellipse cx="62" cy="6" rx="13" ry="18" fill="' + skin + '"/>';
    head += '<ellipse cx="-62" cy="7" rx="6" ry="9" fill="' + shade(skin, -0.2) + '" opacity=".5"/><ellipse cx="62" cy="7" rx="6" ry="9" fill="' + shade(skin, -0.2) + '" opacity=".5"/>';
    if (L.earrings) head += '<circle cx="-62" cy="28" r="5" fill="' + L.earrings + '"/><circle cx="62" cy="28" r="5" fill="' + L.earrings + '"/>';
    head += '<ellipse cx="0" cy="0" rx="64" ry="74" fill="' + skin + '"/>';
    head += P('M 30 -64 C 66 -40 70 20 40 60 C 58 20 56 -30 30 -64 Z', '#000', ' opacity=".05"');
    head += face(L, expr);
    head += hair.front;
    if (L.hat && HATS[L.hat]) head += HATS[L.hat](L.hatColor || '#3a3a3a');
    out += '<g transform="translate(0,' + H + ') scale(' + hs + ')">' + head + '</g>';

    // held prop in front
    if (L.prop && PROPS[L.prop]) out += PROPS[L.prop](L, W, S, sleeve);

    return '<g class="person">' + out + '</g>';
  };

  /** y (relative to the figure's waist line, unscaled) of the top of the head / hair / hat. */
  ART.personTop = function (L) {
    var B = BUILD[L.build || 'm'], extra = 0, st = L.hair && L.hair.style;
    if (st === 'afro') extra = 46; else if (st === 'perm') extra = 34; else if (st === 'tousled' || st === 'modern' || st === 'bowl') extra = 22;
    if (L.hat) extra = Math.max(extra, L.hat === 'fedora' ? 60 : 44);
    return B.H - 74 * B.hs - extra;
  };
})(typeof window !== 'undefined' ? window : globalThis);
