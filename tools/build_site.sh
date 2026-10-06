#!/bin/bash
# Build the website (what GitHub Pages serves) into dist/site/:
#   index.html  - the whole game in one file (same file as the emailed zip, fonts embedded)
#   qr.html     - "scan to play" page for the projector
set -euo pipefail
cd "$(dirname "$0")/.."
tools/make_zip.sh
rm -rf dist/site && mkdir -p dist/site
cp dist/One-Table-100-Years.html dist/site/index.html
cp dist/qr.html dist/site/qr.html
touch dist/site/.nojekyll
ls -la dist/site
