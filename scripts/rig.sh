#!/usr/bin/env bash
# The throwaway backend the panel-next POC is developed against: this checkout's own API, served
# with a registry, board, journal and metrics store of its own under $PANEL_NEXT_RIG. No worker and
# no engine are started, and TEMPORAL_ADDRESS points at a closed port, so nothing registered here can
# be picked up by a real agent or spend a harness token. The factory simulator (../sim) plays the
# engine's part instead.
#
#   rig.sh install   make the venv and install this checkout into it (once)
#   rig.sh serve     serve the API in the foreground on $PANEL_NEXT_RIG_PORT (8788)
#   rig.sh repos     make the dummy git repositories and print the directory they are in
#   rig.sh requirements   commit sim/requirements/<project>/ into each product's context repository
#   rig.sh stop      stop the API the rig serves
#   rig.sh reset     stop it and delete everything the rig wrote
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
rig=${PANEL_NEXT_RIG:-$HOME/.panel-next-rig}
venv=${PANEL_NEXT_VENV:-$HOME/.venvs/bf-panel-next}
port=${PANEL_NEXT_RIG_PORT:-8788}

rig_env() {
  # A HOME of the rig's own: the operator directory (~/.beeverforge, or a 0.7 ~/.openfactory) is
  # resolved from it, and project_init seeds each product's context repository there. Without this
  # the rig wrote into the machine's real operator directory.
  mkdir -p "$rig/home"
  export HOME="$rig/home"
  export GIT_AUTHOR_NAME="panel-next rig" GIT_COMMITTER_NAME="panel-next rig"
  export GIT_AUTHOR_EMAIL="rig@panel-next.invalid" GIT_COMMITTER_EMAIL="rig@panel-next.invalid"
  export BEEVERFORGE_REGISTRY="$rig/registry.yaml"
  export BEEVERFORGE_BOARD_DB="$rig/board.db"
  export BEEVERFORGE_METRICS_SINK=sqlite
  export BEEVERFORGE_METRICS_DB="$rig/metrics.db"
  export BEEVERFORGE_LOG_DIR="$rig/logs"
  export BEEVERFORGE_REPOS_DIR="$rig/repos"
  export BEEVERFORGE_PANEL_URL="http://127.0.0.1:$port"
  export TEMPORAL_ADDRESS=127.0.0.1:1
  export BEEVERFORGE_ENGINE_DEADLINE=1
  export BEEVERFORGE_PREVIEW_DOMAIN=
  unset BEEVERFORGE_PANEL_TOKEN BEEVERFORGE_PANEL_TOKENS BEEVERFORGE_PRODUCT_TOKEN BEEVERFORGE_PRODUCT_TOKENS
  # The former release's names are still read as these; none of the machine's may reach the rig.
  while IFS='=' read -r name _; do
    case $name in OPENFACTORY_*) unset "$name" ;; esac
  done < <(env)
}

make_repo() {
  local dir=$1 name=$2
  [ -d "$dir/.git" ] && return 0
  mkdir -p "$dir"
  git -C "$dir" init -q -b main
  git -C "$dir" config user.name "panel-next rig"
  git -C "$dir" config user.email "rig@panel-next.invalid"
  printf '# %s\n\nA synthetic project for the panel-next POC.\n' "$name" > "$dir/README.md"
  git -C "$dir" add README.md
  git -C "$dir" commit -q -m "Start $name"
}

case ${1:-serve} in
  install)
    python3 -m venv "$venv"
    "$venv/bin/pip" install -q --upgrade pip
    "$venv/bin/pip" install -q -c "$root/constraints.txt" -e "$root"
    ;;
  serve)
    mkdir -p "$rig/repos" "$rig/logs"
    rig_env
    cd "$rig"
    exec "$venv/bin/python" -m beeverforge.cli serve --host 127.0.0.1 --port "$port"
    ;;
  repos)
    for name in harbour-ledger tidepool-mobile quarry-api atlas-docs; do
      make_repo "$rig/repos/$name" "$name"
    done
    printf '%s\n' "$rig/repos"
    ;;
  requirements)
    # The synthetic requirements of sim/requirements/<project>/, committed into each product's
    # context repository the way a person's accepted pull request lands them there.
    here=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
    rig_env
    for dir in "$here"/sim/requirements/*/; do
      project=$(basename "$dir")
      bare="$rig/home/.beeverforge/context/$project-context.git"
      [ -d "$bare" ] || { printf '%s: no context repository yet — run the seed first\n' "$project" >&2; continue; }
      work=$(mktemp -d)
      git clone -q "$bare" "$work"
      mkdir -p "$work/requirements"
      cp "$dir"*.md "$work/requirements/"
      git -C "$work" add requirements
      if git -C "$work" diff --cached --quiet; then
        printf '%s: requirements already there\n' "$project"
      else
        git -C "$work" commit -q -m "$project: requirements for the panel-next POC"
        git -C "$work" push -q origin HEAD
        printf '%s: requirements committed\n' "$project"
      fi
      rm -rf "$work"
    done
    ;;
  stop)
    # The bracket keeps pkill from matching this script's own command line.
    pkill -f "[b]eeverforge.cli serve --host 127.0.0.1 --port $port" || true
    ;;
  reset)
    pkill -f "[b]eeverforge.cli serve --host 127.0.0.1 --port $port" || true
    rm -rf "$rig"
    ;;
  *)
    printf 'usage: rig.sh install|serve|repos|requirements|stop|reset\n' >&2
    exit 2
    ;;
esac
