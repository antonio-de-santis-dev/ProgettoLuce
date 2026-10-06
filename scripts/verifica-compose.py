#!/usr/bin/env python3
"""Integration check for the isolated Compose stack created by CI."""
import json
import re
import sys
from decimal import Decimal
from pathlib import Path
from urllib.request import Request, urlopen

BASE = "http://127.0.0.1:8088"


def fetch(path, payload=None, method=None):
    body = json.dumps(payload).encode() if payload is not None else None
    request = Request(BASE + path, data=body, headers={"Content-Type": "application/json"}, method=method)
    with urlopen(request, timeout=20) as response:
        return response.read().decode(), response.headers


def api(path, payload=None, method=None):
    return json.loads(fetch("/api" + path, payload, method)[0])


def check_frontend():
    html, headers = fetch("/")
    if '<div id="root"></div>' not in html:
        raise AssertionError("Frontend di produzione non disponibile")
    asset = re.search(r'src="(/assets/[^\"]+\.js)"', html)
    if asset is None:
        raise AssertionError("Bundle JavaScript non presente")
    for path in ("/", "/storico", "/impostazioni-pdf", asset.group(1), "/api/offerte"):
        content, headers = fetch(path)
        if headers.get("X-Content-Type-Options") != "nosniff":
            raise AssertionError(f"Header nosniff assente: {path}")
        if "frame-ancestors 'none'" not in headers.get("Content-Security-Policy", ""):
            raise AssertionError(f"CSP assente: {path}")
        if path in ("/storico", "/impostazioni-pdf") and content != html:
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
        config = api("/impostazioni-pdf")
        config["opzioni"].update({"stile": "SINTESI", "colore": "#1E3A8A", "logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAABQCAYAAAAnSfh8AAABCklEQVR4nO3TQQ3AIADAwDEhCEEippmHfUiTOwX9dMy1zwMkvbcDgP8MDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCPsAaBECgTfwPnMAAAAASUVORK5CYII="})
        config["opzioni"]["consulente"]["nome"] = "Studio Compose Persistente"
        config = api("/impostazioni-pdf", config, "PUT")
        snapshot_file.write_text(json.dumps({"confronto": snapshot, "impostazioni": config}), encoding="utf-8")
    else:
        saved = json.loads(snapshot_file.read_text(encoding="utf-8"))
        expected = saved["confronto"]
        if api("/impostazioni-pdf") != saved["impostazioni"]:
            raise AssertionError("Impostazioni PDF o logo non conservati dopo la ricreazione")
        snapshot = api(f"/confronti/{expected['id']}")
        if snapshot != expected:
            raise AssertionError("Lo snapshot è cambiato dopo la ricreazione dei container")
        if not any(o["id"] == snapshot["dati"]["offerta"]["id"] for o in api("/offerte")):
            raise AssertionError("Offerta non conservata nel volume")
        if not any(b["id"] == snapshot["dati"]["bollettaId"] for b in api("/bollette")):
            raise AssertionError("Bolletta non conservata nel volume")
    result = snapshot["dati"]["risultato"]
    with urlopen(BASE + f"/api/confronti/{snapshot['id']}/pdf", timeout=20) as response:
        if response.headers.get_content_type() != "application/pdf" or not response.read().startswith(b"%PDF-"):
            raise AssertionError("Download PDF non funzionante nello stack Docker")
        if response.headers.get("Cache-Control") != "no-store":
            raise AssertionError("Il PDF deve impedire la cache dei dati cliente")
    custom = {"stile": "SINTESI", "colore": "#1E3A8A", "consulente": {"nome": "Studio Compose", "dimostrativo": True}}
    request = Request(BASE + f"/api/confronti/{snapshot['id']}/pdf", data=json.dumps(custom).encode(), headers={"Content-Type": "application/json"})
    with urlopen(request, timeout=20) as response:
        if response.headers.get_content_type() != "application/pdf" or not response.read().startswith(b"%PDF-"):
            raise AssertionError("Download PDF personalizzato non funzionante tramite Nginx")
    preview = api(f"/confronti/{snapshot['id']}/pdf/anteprima", custom)
    import base64
    if not base64.b64decode(preview["pdfBase64"]).startswith(b"%PDF-") or not preview["pagine"]:
        raise AssertionError("Anteprima PDF non funzionante tramite Nginx")
    demo = api("/impostazioni-pdf/anteprima", api("/impostazioni-pdf")["opzioni"])
    if not base64.b64decode(demo["pdfBase64"]).startswith(b"%PDF-") or not demo["pagine"]:
        raise AssertionError("Anteprima delle impostazioni PDF non funzionante")
    if Decimal(result["totale"]) != Decimal("77") or Decimal(result["risparmioPeriodo"]) != Decimal("123"):
        raise AssertionError("Risultato economico inatteso")
    print(f"Compose {sys.argv[1]}: SPA, bundle, header, API, PDF, impostazioni/logo persistenti e confronto #{snapshot['id']} verificati (77 / 123 euro).")


if __name__ == "__main__":
    main()
