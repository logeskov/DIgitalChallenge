#!/usr/bin/env bash
# Bygger main til roden af _site og hver anden branch til _site/preview/<navn>/.
# En branch der ikke kan bygges springes over, så resten stadig udgives.
set -uo pipefail

ROOT="$(pwd)"
SITE="$ROOT/_site"
WORK="$(mktemp -d)"
rm -rf "$SITE"; mkdir -p "$SITE/preview"

git fetch --prune origin '+refs/heads/*:refs/remotes/origin/*'

build_ref() { # $1 = ref, $2 = målmappe
  local dir="$WORK/$(echo "$1" | tr '/' '_')"
  git worktree add --detach "$dir" "$1" >/dev/null 2>&1 || return 1
  [ -f "$dir/package.json" ] || return 1
  ( cd "$dir" && npm ci --no-audit --no-fund && npm run build ) || return 1
  mkdir -p "$2" && cp -r "$dir/dist/." "$2/"
}

ROWS=""
for ref in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin); do
  branch="${ref#origin/}"
  case "$branch" in main|HEAD|origin|gh-pages) continue ;; esac
  name="$(echo "$branch" | sed 's#^claude/##; s#[^A-Za-z0-9._-]#-#g')"
  echo "::group::Bygger $branch"
  if build_ref "$ref" "$SITE/preview/$name"; then
    msg="$(git log -1 --format='%s' "$ref" | sed 's/&/\&amp;/g; s/</\&lt;/g')"
    ROWS="$ROWS<li><a href=\"./$name/\">$name</a> <small>$msg</small></li>"
  else
    echo "::warning::Kunne ikke bygge $branch – springes over"
  fi
  echo "::endgroup::"
done

cat > "$SITE/preview/index.html" <<HTML
<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Forhåndsvisninger</title>
<body style="font-family:system-ui;max-width:40rem;margin:2rem auto;padding:0 1rem">
<h1>Forhåndsvisninger</h1>
<p>Hver branch (arbejdsgren) kan prøves her, før den lægges ind i main.</p>
<ul>${ROWS:-<li>Ingen lige nu.</li>}</ul>
<p><a href="../">Til det færdige spil (main)</a></p>
HTML

echo "::group::Bygger main"
if ! build_ref origin/main "$SITE"; then
  echo "::warning::main kan ikke bygges endnu – viser en midlertidig side"
  cat > "$SITE/index.html" <<HTML
<!doctype html><meta charset="utf-8"><title>Digitale Udfordringer</title>
<body style="font-family:system-ui;max-width:40rem;margin:2rem auto;padding:0 1rem">
<h1>Digitale Udfordringer</h1><p>Spillet er ikke lagt ind i main endnu.</p>
<p><a href="./preview/">Se forhåndsvisningerne</a></p>
HTML
fi
echo "::endgroup::"
touch "$SITE/.nojekyll"
