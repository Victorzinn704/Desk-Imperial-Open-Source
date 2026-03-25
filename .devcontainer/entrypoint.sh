#!/usr/bin/env bash
set -euo pipefail

mkdir -p "${HOME}" "${XDG_CACHE_HOME}" "${TMPDIR}" "${HOME}/.ssh"
chmod 700 "${HOME}" "${HOME}/.ssh"

if [[ -f /workspace/.env.container ]]; then
  set -a
  # shellcheck disable=SC1091
  source /workspace/.env.container
  set +a
fi

cd /workspace
exec "$@"
