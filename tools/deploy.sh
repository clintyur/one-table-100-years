#!/bin/bash
# Build the website and publish it to GitHub Pages (the gh-pages branch).
# Live about a minute later at https://clintyur.github.io/one-table-100-years/
set -euo pipefail
cd "$(dirname "$0")/.."
tools/build_site.sh >/dev/null
REMOTE=$(git remote get-url origin)
TMP=$(mktemp -d)
cp -R dist/site/. "$TMP/"
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy website"
git push -q -f "$REMOTE" gh-pages
echo "Deployed. Live in about a minute at https://clintyur.github.io/one-table-100-years/"
