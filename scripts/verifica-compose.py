#!/usr/bin/env python3
"""Integration check for the isolated Compose stack created by CI."""
import json
import re
import sys
from decimal import Decimal
from pathlib import Path
from urllib.request import Request, urlopen

BASE = "http://127.0.0.1:8088"


def fetch(path, payload=None):
    body = json.dumps(payload).encode() if payload is not None else None
    request = Request(BASE + path, data=body, headers={"Content-Type": "application/json"})
    with urlopen(request, timeout=20) as response:
        return response.read().decode(), response.headers


def api(path, payload=None):
    return json.loads(fetch("/api" + path, payload)[0])


def check_frontend():
    html, headers = fetch("/")
    if '<div id="root"></div>' not in html:
        raise AssertionError("Frontend di produzione non disponibile")
    asset = re.search(r'src="(/assets/[^\"]+\.js)"', html)
    if asset is None:
        raise AssertionError("Bundle JavaScript non presente")
    for path in ("/", "/storico", asset.group(1), "/api/offerte"):
        content, headers = fetch(path)
        if headers.get("X-Content-Type-Options") != "nosniff":
            raise AssertionError(f"Header nosniff assente: {path}")
        if "frame-ancestors 'none'" not in headers.get("Content-Security-Policy", ""):
            raise AssertionError(f"CSP assente: {path}")
        if path == "/storico" and content != html:
            raise AssertionError("Fallback SPA non funzionante")
        if path == "/" and "no-cache" not in headers.get("Cache-Control", ""):
            raise AssertionError("HTML senza politica di rivalidazione")
        if path.startswith("/assets/") and "max-age=31536000" not in headers.get("Cache-Control", ""):
            raise AssertionError("Cache del bundle non configurata")


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in ("crea", "verifica"):
        raise SystemExit("Uso: verifica-compose.py crea|verifica file-snapshot.json")
    check_frontend()
    snapshot_file = Path(sys.argv[2])
    if sys.argv[1] == "crea":
        offerta = next(o for o in api("/offerte") if o["nomeOfferta"] == "ESEMPIO - Fissa 0,10")
        bolletta = next(b for b in api("/bollette") if b["dati"]["cliente"] == "ESEMPIO - Cliente demo")
        snapshot = api("/confronti", {"bollettaId": bolletta["id"], "offertaId": offerta["id"]})
        snapshot = api(f"/confronti/{snapshot['id']}")
        snapshot_file.write_text(json.dumps(snapshot), encoding="utf-8")
    else:
        expected = json.loads(snapshot_file.read_text(encoding="utf-8"))
        snapshot = api(f"/confronti/{expected['id']}")
        if snapshot != expected:
            raise AssertionError("Lo snapshot è cambiato dopo la ricreazione dei container")
        if not any(o["id"] == snapshot["dati"]["offerta"]["id"] for o in api("/offerte")):
            raise AssertionError("Offerta non conservata nel volume")
        if not any(b["id"] == snapshot["dati"]["bollettaId"] for b in api("/bollette")):
            raise AssertionError("Bolletta non conservata nel volume")
    result = snapshot["dati"]["risultato"]
    if Decimal(result["totale"]) != Decimal("77") or Decimal(result["risparmioPeriodo"]) != Decimal("123"):
        raise AssertionError("Risultato economico inatteso")
    print(f"Compose {sys.argv[1]}: SPA, bundle, header, API e confronto #{snapshot['id']} verificati (77 / 123 euro).")


if __name__ == "__main__":
    main()
