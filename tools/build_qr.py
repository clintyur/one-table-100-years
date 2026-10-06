#!/usr/bin/env python3
"""Build dist/qr.html: a projector-friendly "scan to play" page with the QR code inlined.

Usage:   python3 tools/build_qr.py
Inputs:  tools/qr-page.html (template), tools/qr-code.svg (QR for the site URL),
         tools/fonts-embedded.css, and the favicon from index.html.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://clintyur.github.io/one-table-100-years/"


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()


page = read("tools/qr-page.html")
svg = read("tools/qr-code.svg")
svg = re.sub(r"<\?xml[^>]*>\s*", "", svg).strip()
favicon = re.search(r'<link rel="icon" href="([^"]+)">', read("index.html")).group(1)

for key, value in {
    "{{FONTS}}": read("tools/fonts-embedded.css"),
    "{{QR_SVG}}": svg,
    "{{URL}}": URL,
    "{{URL_SHORT}}": URL.replace("https://", "").rstrip("/"),
    "{{FAVICON}}": favicon,
}.items():
    if key not in page:
        raise SystemExit("build_qr failed: template is missing " + key)
    page = page.replace(key, value)

os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
out = os.path.join(ROOT, "dist", "qr.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(page)
print("wrote %s (%d KB)" % (out, os.path.getsize(out) // 1024))
