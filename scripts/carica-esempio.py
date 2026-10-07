#!/usr/bin/env python3
"""Create an explicitly synthetic business scenario; never a market tariff."""
import json, os, sys
from urllib.request import Request, urlopen
BASE=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8080/api').rstrip('/')
TOKEN=os.environ.get('BUSINESS_ADMIN_TOKEN','demo-business-local')
def call(path,body=None):
    req=Request(BASE+'/business'+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json','X-Business-Admin':TOKEN})
    with urlopen(req,timeout=20) as r:return json.load(r)
voci=[]
for f in ('F1','F2','F3'):
    for loss in (False,True):voci.append(dict(codice=('PERDITE_' if loss else 'ENERGIA_')+f,descrizione=('Perdite ' if loss else 'Energia ')+f,categoria='ENERGIA',base='PERDITE_FASCIA' if loss else 'KWH_FASCIA',fascia=f,corrispettivo='0.1',indicizzata=False,aliquotaIva='0.22'))
voci.append(dict(codice='PCV',descrizione='Commercializzazione',categoria='ENERGIA',base='QUOTA_ANNO',fascia=None,corrispettivo='120',indicizzata=False,aliquotaIva='0.22'))
p=call('/profili',dict(nome='ESEMPIO BUSINESS - sintetico',fonte='Solo test: non è un’offerta reale',dal='2026-01',al='2026-12',verificato=True,notaVerifica='Verificato esclusivamente come fixture di test',perdite='0.10',arrotondaPerdite=True,voci=voci))
s=call('/simulazioni',dict(ragioneSociale='ESEMPIO - Impresa demo',pod='IT001E00000000',partitaIva='',dataRiferimento='2026-02-28',potenzaKw='17.8',fatturaPrecedente='200',confermaConfrontabilita=True,mesi=[dict(mese='2026-01',profiloId=p['id'],f1='0',f2='0',f3='0',quoteFisse=0,pun=None),dict(mese='2026-02',profiloId=p['id'],f1='200',f2='200',f3='200',quoteFisse=1,pun=None)],altrePartite=[]))
assert s['dati']['risultato']['totale']=='92.72'
print(f"Esempio sintetico creato: simulazione #{s['id']}, totale 92,72 €, risparmio 107,28 €. Nessuna tariffa reale.")
