#!/usr/bin/env python3
"""Bundle the whole game into ONE self-contained HTML file.

All CSS, JavaScript and fonts are inlined, so the result:
  * can be emailed (Gmail blocks .zip files that contain .js files),
  * works offline (fonts are embedded),
  * opens with a double-click, even straight out of a zip.

Usage:   python3 tools/build_single.py
Output:  dist/One-Table-100-Years.html
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()


def must_sub(pattern, repl, text, count_expected, flags=0):
    new, n = re.subn(pattern, repl, text, flags=flags)
    if n != count_expected:
        raise SystemExit("build failed: expected %d match(es) for %r, got %d" % (count_expected, pattern, n))
    return new


html = read("index.html")

# 1) Fonts: drop the Google Fonts links, embed the fonts instead.
fonts = read("tools/fonts-embedded.css")
html = must_sub(r'\s*<link rel="preconnect"[^>]*>', "", html, 2)
html = must_sub(r'<link href="https://fonts\.googleapis\.com[^>]*>', lambda m: "<style>\n" + fonts + "</style>", html, 1)

# 2) Stylesheet.
css = read("css/style.css")
if "</style" in css.lower():
    raise SystemExit("build failed: css contains </style")
html = must_sub(r'<link rel="stylesheet" href="css/style\.css">', lambda m: "<style>\n" + css + "</style>", html, 1)


# 3) Scripts, in the same order as index.html.
def inline_script(m):
    src = m.group(1)
    js = read(src)
    js = re.sub(r"</(script)", r"<\\/\1", js, flags=re.I)  # never close the tag early
    if "<!--" in js:
        raise SystemExit("build failed: %s contains '<!--'" % src)
    return "<script>/* " + src + " */\n" + js + "\n</script>"


html = must_sub(r'<script src="([^"]+)"></script>', inline_script, html, 7)

# 4) Nothing external may remain.
for leftover in ('src="js/', 'href="css/', "fonts.googleapis", "fonts.gstatic"):
    if leftover in html:
        raise SystemExit("build failed: leftover reference " + leftover)

os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
out = os.path.join(ROOT, "dist", "One-Table-100-Years.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print("wrote %s (%d KB)" % (out, os.path.getsize(out) // 1024))
