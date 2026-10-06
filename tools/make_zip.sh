#!/bin/bash
# Build the single-file game and package it with the instructions for emailing.
# Output: dist/One-Table-100-Years.zip
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/build_single.py
python3 tools/build_qr.py
rm -rf dist/pkg
mkdir -p "dist/pkg/One-Table-100-Years"
cp dist/One-Table-100-Years.html "dist/pkg/One-Table-100-Years/"
cp dist/qr.html "dist/pkg/One-Table-100-Years/qr.html"
# Windows-friendly line endings for the instructions file
perl -pe 's/\r?\n/\r\n/' "tools/HOW TO PLAY.txt" > "dist/pkg/One-Table-100-Years/HOW TO PLAY.txt"
rm -f dist/One-Table-100-Years.zip
(cd dist/pkg && zip -r -X -q ../One-Table-100-Years.zip One-Table-100-Years)
unzip -t dist/One-Table-100-Years.zip >/dev/null
echo "built dist/One-Table-100-Years.zip ($(du -k dist/One-Table-100-Years.zip | cut -f1) KB)"
