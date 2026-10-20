#!/bin/sh
# Rebuilds apps/<app>/package-lock.json from that app's package.json.
#
# The production images install with `npm ci` from the lockfile inside each app folder, so it has to
# match package.json: `npm ci` refuses to run otherwise. Day to day, dependencies are installed
# through the workspace at the repository root, which only updates the root lockfile, so run this
# after adding or changing a dependency of an app.
#
#   sh scripts/refresh-lock.sh api
#   sh scripts/refresh-lock.sh web
#
# It resolves in a clean temporary folder, starting from the app's current lockfile, so versions
# that are already locked stay as they are and only what changed is resolved again.
set -e

app="$1"
case "$app" in
  api | web) ;;
  *)
    echo "usage: sh scripts/refresh-lock.sh api|web" >&2
    exit 1
    ;;
esac

root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

cp "$root/apps/$app/package.json" "$tmp/"
[ -f "$root/apps/$app/package-lock.json" ] && cp "$root/apps/$app/package-lock.json" "$tmp/"

(cd "$tmp" && npm install --package-lock-only --no-audit --no-fund)
cp "$tmp/package-lock.json" "$root/apps/$app/package-lock.json"
echo "Updated apps/$app/package-lock.json"
