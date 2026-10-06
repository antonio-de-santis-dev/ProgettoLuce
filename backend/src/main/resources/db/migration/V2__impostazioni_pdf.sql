CREATE TABLE impostazioni_pdf (
    id BIGINT PRIMARY KEY CHECK (id=1),
    versione BIGINT NOT NULL,
    configurazione TEXT NOT NULL
);
INSERT INTO impostazioni_pdf (id, versione, configurazione) VALUES (1, 0,
'{"stile":"CLASSICO","colore":"#194D3D","logo":null,"consulente":{"nome":"Andrea Bianchi · Studio Energia","ruolo":"Consulente energetico","email":"consulente@example.com","telefono":"+39 000 000 0000","indirizzo":"Via Esempio 12 · Lecce","dimostrativo":true}}');
