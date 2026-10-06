#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
for tool in java mvn npm; do
  command -v "$tool" >/dev/null || { echo "Manca $tool. Installa Java 17, Maven e Node.js 24 prima di avviare." >&2; exit 1; }
done
backend_pid=''
frontend_pid=''
cleanup() {
  [[ -z "$backend_pid" ]] || kill "$backend_pid" 2>/dev/null || true
  [[ -z "$frontend_pid" ]] || kill "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
cd "$project_dir/frontend"
if [[ ! -d node_modules ]]; then npm ci; fi
cd "$project_dir/backend"
mvn -B -q package
java -jar target/progetto-luce-0.1.0.jar --spring.profiles.active=demo &
backend_pid=$!
cd "$project_dir/frontend"
# Start Node directly so the PID belongs to the server, rather than npm's wrapper process.
node node_modules/vite/bin/vite.js --host 127.0.0.1 &
frontend_pid=$!
echo 'ProgettoLuce: http://localhost:5173 · Attendi il messaggio di avvio del backend.'
wait -n "$backend_pid" "$frontend_pid"
