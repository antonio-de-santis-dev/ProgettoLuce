#!/usr/bin/env python3
"""Verify the business stack and immutable data after a restart."""
import json, os, re, sys
from decimal import Decimal
from pathlib import Path
from urllib.request import Request, urlopen
BASE=os.environ.get('BUSINESS_TEST_URL','http://127.0.0.1:8088').rstrip('/')
def fetch(path):
    with urlopen(Request(BASE+path),timeout=20) as r:return r.read(),r.headers

def api(path):return json.loads(fetch('/api/business'+path)[0])
if len(sys.argv)!=3 or sys.argv[1] not in ('crea','verifica'):raise SystemExit('Uso: verifica-compose.py crea|verifica snapshot.json')
html,headers=fetch('/')
assert b'<div id="root"></div>' in html
asset=re.search(rb'src="(/assets/[^\"]+\.js)"',html)
assert asset
for path in ('/','/tariffe','/storico',asset.group(1).decode(),'/api/business/profili'):
    content,h=fetch(path)
    assert h.get('X-Content-Type-Options')=='nosniff',path
    assert "frame-ancestors 'none'" in h.get('Content-Security-Policy',''),path
    if path in ('/tariffe','/storico'):assert content==html
state=Path(sys.argv[2])
if sys.argv[1]=='crea':
    listing=api('/simulazioni')
    summary=next(s for s in listing['contenuto'] if s['ragioneSociale']=='ESEMPIO - Impresa demo')
    snapshot=api('/simulazioni/'+str(summary['id']))
    profiles=api('/profili')
    state.write_text(json.dumps({'simulazione':snapshot,'profili':profiles}),encoding='utf-8')
else:
    expected=json.loads(state.read_text(encoding='utf-8'))
    snapshot=api('/simulazioni/'+str(expected['simulazione']['id']))
    assert snapshot==expected['simulazione']
    assert api('/profili')==expected['profili']
result=snapshot['dati']['risultato']
assert Decimal(result['totale'])==Decimal('92.72')
assert Decimal(result['risparmioPeriodo'])==Decimal('107.28')
pdf,h=fetch('/api/business/simulazioni/'+str(snapshot['id'])+'/pdf')
assert pdf.startswith(b'%PDF-') and h.get_content_type()=='application/pdf'
assert h.get('Cache-Control')=='no-store'
print(f"Business {sys.argv[1]}: SPA, header, API, PDF e persistenza verificati (92,72 / 107,28 €).")
