#!/usr/bin/env python3
"""Load explicit synthetic data; never overwrite the user's existing parameter profile."""
import json
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/api"


def request(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    with urlopen(Request(base + path, data=data, headers={"Content-Type": "application/json"}, method=method), timeout=20) as response:
        return json.load(response)


try:
    try:
        request("GET", "/parametri")
        print("Profilo parametri esistente conservato: il risultato dipenderà dai tuoi valori.")
    except HTTPError as error:
        if error.code != 404:
            raise
        request("PUT", "/parametri", {
            "nomeProfilo": "ESEMPIO SINTETICO - componenti azzerate",
            "fonte": "Caso di test; non utilizzare come tariffa di mercato",
            "coefficientePerdite": "0", "arrotondaPerdite": False,
            "dispacciamentoKwh": "0", "trasportoFissoMese": "0", "trasportoPotenzaAnno": "0",
            "trasportoKwh": "0", "oneriFissiMese": "0", "oneriKwh": "0", "accisaKwh": "0",
        })

    offerte = request("GET", "/offerte")
    offerta = next((o for o in offerte if o["nomeOfferta"] == "ESEMPIO - Fissa 0,10"), None)
    if offerta is None:
        offerta = request("POST", "/offerte", {
            "nomeFornitore": "Gestore sintetico", "nomeOfferta": "ESEMPIO - Fissa 0,10",
            "tipoOfferta": "PREZZO_FISSO", "tipoTariffa": "MONORARIA",
            "prezzi": {"f0": "0.10"}, "spread": None, "pcvAnnuo": "120", "attiva": True,
            "note": "Offerta di test; non è un'offerta commerciale",
        })
    bollette = request("GET", "/bollette")
    bolletta = next((b for b in bollette if b["dati"]["cliente"] == "ESEMPIO - Cliente demo"), None)
    if bolletta is None:
        bolletta = request("POST", "/bollette", {
            "cliente": "ESEMPIO - Cliente demo", "pod": "POD-DEMO", "fornitore": "Fornitore sintetico",
            "potenzaKw": "3", "totaleFatturato": "200", "aliquotaIva": "0.10",
            "altrePartiteImponibili": "0", "altrePartiteEsenti": "0",
            "mesi": [{"mese": "2026-01", "f1": "100", "f2": "200", "f3": "300", "pun": None}],
        })
    print(f"Dati pronti: bolletta #{bolletta['id']}, offerta #{offerta['id']}. Apri la pagina Confronto.")
except (HTTPError, URLError) as error:
    print(f"Caricamento non riuscito: {error}", file=sys.stderr)
    sys.exit(1)
