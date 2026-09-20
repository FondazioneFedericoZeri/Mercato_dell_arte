"""Generates html/persone.html from the three source datasets che lo alimentano:
data/persone.tsv (singoli professionisti legati a un'entità antiquaria),
data/collaboratori.tsv (fotografi, restauratori, storici dell'arte, ecc.) e
data/compravendite.tsv (clienti).

La pagina e' un'app di ricerca/filtro lato client: questo script produce solo
i dati (un array JSON con un oggetto per persona, per ruolo: antiquario /
collaboratore / cliente) incorporati in html/persone.html dentro
<script id="persone-data" type="application/json">; tutta la logica di
ricerca, filtro per tipologia ed elenco a tre colonne vive in
script/persone.js e nel CSS in css/persone.css, che NON vengono toccati da
questo script. Ad ogni run la pagina viene rigenerata da zero, cosi' i nuovi
dati compaiono automaticamente senza bisogno di aggiornare l'HTML a mano.
"""

import os
import csv
import html
import json
import pathlib

# ── Nome del file delle entita' ────────────────────────────────────
# Il file sta passando da "entità" (accentato) a "entita" senza accento.
# Un nome accentato attraversa male i trasferimenti fra sistemi diversi:
# e' gia' successo che arrivasse nel repo con "á" al posto di "à",
# facendo sparire il file e fallire la CI con un FileNotFoundError.
# Finche' la migrazione non e' conclusa si accetta il nome che c'e'.
def _file_entita(*candidati):
    for c in candidati:
        if os.path.isfile(c):
            return c
    return candidati[0]   # nessuno dei due: si usa il primo, per l'errore


def ENTITA_TSV():
    return _file_entita("data/entita.tsv", "data/entit\u00e0.tsv")


def ENTITA_JSON():
    return _file_entita("json/entita.json", "json/entit\u00e0.json")




def load_tsv(path):
    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        rows = []
        for row in reader:
            if not any((v or "").strip() for v in row.values()):
                continue
            rows.append({(k or "").strip(): (v or "").strip() for k, v in row.items()})
        return rows


def esc(s):
    return html.escape(s or "", quote=False)


def norm_morte(morte):
    """Ripulisce il campo Morte prima di metterlo nei dati JSON.

    In alcune righe "Morte" contiene il testo letterale "in vita" invece di
    restare vuoto: lo script/persone.js che genera l'etichetta "1836–1922"
    lato client si aspetta un anno o una stringa vuota, quindi "in vita" va
    normalizzato a stringa vuota qui (altrimenti comparirebbe come se fosse
    un anno di morte).
    """
    m = (morte or "").strip()
    if m.lower() == "in vita":
        return ""
    return m


# Particelle che, quando precedono l'ultima parola, fanno parte del
# cognome ("Angelo Di Castro" -> "Di Castro", non solo "Castro").
_SURNAME_PARTICLES = {
    "di", "de", "del", "della", "dei", "degli", "dal", "dalla",
    "van", "von", "la", "lo", "le", "du", "des",
}
# Suffissi generazionali/onorifici da ignorare in coda al nome
# ("Martin Henry Colnaghi II" -> cognome "Colnaghi", non "II").
_GEN_SUFFIXES = {"i", "ii", "iii", "iv", "v", "vi", "jr", "sr"}

# Cognomi doppi non basati su una particella comune (quindi non
# intercettati da _SURNAME_PARTICLES): senza un campo Cognome dedicato in
# persone.tsv non c'e' modo di riconoscerli automaticamente, quindi si
# elencano qui a mano man mano che si notano posizionati male nell'elenco
# generato. Chiave = "Nome Persona" esatto come compare in persone.tsv,
# valore = la chiave di ordinamento corretta.
_SURNAME_OVERRIDES = {
    "Alessandro Contini Bonacossi": "contini bonacossi",
}


def surname_key(full_name):
    # Nessun campo cognome separato in persone.tsv (a differenza di
    # collaboratori.tsv e compravendite.tsv, che ce l'hanno): si usa
    # l'ultima parola del nome come cognome presunto, che per la
    # stragrande maggioranza dei nomi occidentali e' corretto anche in
    # presenza di secondi nomi ("Umberto Angelo Volterra" -> "Volterra"),
    # con un piccolo aggiustamento per le particelle piu' comuni e per i
    # suffissi generazionali. Casi come i doppi cognomi non basati su
    # particella ("Contini Bonacossi") restano un'approssimazione: senza
    # un campo Cognome dedicato non e' possibile risolverli in automatico
    # con certezza, quindi si passa da _SURNAME_OVERRIDES.
    if full_name in _SURNAME_OVERRIDES:
        return _SURNAME_OVERRIDES[full_name]
    words = full_name.split()
    if not words:
        return ""
    if len(words) > 1 and words[-1].strip(".").lower() in _GEN_SUFFIXES:
        words = words[:-1]
    if not words:
        return full_name.lower()
    key_words = [words[-1]]
    if len(words) > 1 and words[-2].strip("'’").lower() in _SURNAME_PARTICLES:
        key_words.insert(0, words[-2])
    return " ".join(key_words).lower()


def build_persone_data(entita_by_id):
    """Antiquari: una entità sola a testa (persone.tsv non ha righe multi-entità)."""
    persone = load_tsv("data/persone.tsv")
    items = []
    for p in persone:
        ent_id = p.get("ID_entità", "")
        if ent_id not in entita_by_id:
            continue
        name = p.get("Nome Persona", "")
        if not name:
            # Riga senza nome persona (es. compilata solo con il nome
            # dell'attività): non c'è nulla da mostrare come voce.
            continue
        items.append({
            "role": "antiquario",
            "name": name,
            "sort": surname_key(name),
            "nascita": (p.get("Nascita", "") or "").strip(),
            "morte": norm_morte(p.get("Morte", "")),
            "entity_id": ent_id,
            "entity_name": entita_by_id[ent_id],
        })
    return items


def build_collaboratori_data(entita_by_id):
    rows = load_tsv("data/collaboratori.tsv")

    # Stessa persona puo' comparire su piu' righe (aggiunte in momenti
    # diversi): si accorpano per (Nome, Cognome), unendo le entita' con cui
    # ha collaborato e le eventuali tipologie diverse.
    merged = {}
    order = []
    for r in rows:
        key = (r.get("Nome", ""), r.get("Cognome / Denominazione", ""))
        if key not in merged:
            merged[key] = {"tipologie": [], "entities": [], "seen_ent": set()}
            order.append(key)
        entry = merged[key]
        tipo = r.get("Tipologia", "")
        if tipo and tipo not in entry["tipologie"]:
            entry["tipologie"].append(tipo)
        for ent_id in r.get("ID Antiquari", "").split():
            if ent_id in entita_by_id and ent_id not in entry["seen_ent"]:
                entry["seen_ent"].add(ent_id)
                entry["entities"].append(ent_id)

    items = []
    for key in order:
        nome, cognome = key
        entry = merged[key]
        display = (nome + " " + cognome).strip() if nome else cognome
        items.append({
            "role": "collaboratore",
            "name": display,
            "sort": (cognome or display).lower(),
            "tipologia": entry["tipologie"],
            "entities": [{"id": e, "name": entita_by_id[e]} for e in entry["entities"]],
        })
    return items


def build_clienti_data(entita_by_id):
    rows = load_tsv("data/compravendite.tsv")

    by_client = {}
    order = []
    for r in rows:
        cid = r.get("ID_cliente", "")
        if not cid:
            continue
        if cid not in by_client:
            by_client[cid] = {
                "nome": r.get("Nome", ""),
                "cognome": r.get("Cognome", ""),
                "entities": [],
                "seen_ent": set(),
            }
            order.append(cid)
        entry = by_client[cid]
        ent_id = r.get("ID_entità", "")
        if ent_id in entita_by_id and ent_id not in entry["seen_ent"]:
            entry["seen_ent"].add(ent_id)
            entry["entities"].append(ent_id)

    items = []
    for cid in order:
        entry = by_client[cid]
        display = (entry["nome"] + " " + entry["cognome"]).strip()
        items.append({
            "role": "cliente",
            "name": display,
            "sort": (entry["cognome"] or display).lower(),
            "entities": [{"id": e, "name": entita_by_id[e]} for e in entry["entities"]],
        })
    return items


PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="it">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Persone</title>
    <link rel="stylesheet" href="../css/tokens.css">
    <link rel="stylesheet" href="../css/torna-su.css">
    <link rel="stylesheet" href="../css/persone.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap" rel="stylesheet">
    <!-- Questa pagina è guidata solo da persone.js. Qui venivano
         caricati anche scripts-antiquari.js e antiquari_search.js,
         rimasugli del modello della pagina antiquari: il secondo
         comincia con $.ajaxSetup e la pagina non carica jQuery,
         quindi andava in errore a ogni apertura senza che nessuno
         dei due servisse a qualcosa. -->
    <script type="text/javascript" src="../script/persone.js"></script>
    <script src="../script/menu.js" defer></script>
    <script src="../script/torna-su.js" defer></script>
</head>

<body>

    <header>
        <div class="header-container">
            <a class="marchio" href="../index.html">Mercato dell'arte</a>
            <button class="menu-toggle" aria-label="Apri menu">
                ☰
            </button>
            <div class="testata-destra">
              <nav>
                  <ul class="menu">
                      <li><a href="../html/progetto.html">Progetto</a></li>
                      <li><a href="../html/antiquari.html">Antiquari</a></li>
                      <li><a href="../html/luoghi.html">Luoghi</a></li>
                      <li><a href="../html/eventi.html">Eventi</a></li>
                      <li><a href="../html/persone.html">Persone</a></li>
                      <li><a href="../html/bibliografia.html">Bibliografia</a></li>
                  </ul>
              </nav>
              <span class="testata-filo"></span>
              <a class="testata-ente" href="https://fondazionezeri.unibo.it/it/homepage" target="_blank" rel="noopener"
                 title="Fondazione Federico Zeri, Università di Bologna">
                <img src="../img/homepage/logo.png" alt="Fondazione Federico Zeri">
              </a>
            </div>
        </div>
    </header>


    <!-- Contenuto principale: generato automaticamente da script/build_persone.py -->
    <!-- NON MODIFICARE A MANO: le modifiche vengono sovrascritte al prossimo run. -->
    <!-- Per cambiare i dati, modifica data/persone.tsv, data/collaboratori.tsv, -->
    <!-- data/compravendite.tsv o data/entità.tsv. Markup/CSS/JS della pagina -->
    <!-- (ricerca, filtro per tipologia, colonne) vivono in css/persone.css e -->
    <!-- script/persone.js e non vengono toccati da questo script. -->
    <main>
        <div class="wrap">
            <!-- La pagina non diceva dove si fosse arrivati: si apriva
                 direttamente sulla ricerca. -->
            <h1 class="titolo-pagina">I protagonisti del mercato dell'arte</h1>
            <div class="controls">
                <div class="search-row">
                    <div class="search-box">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                        <input id="search" type="text" placeholder="Cerca un nome in tutte e tre le colonne…" autocomplete="off">
                    </div>
                    <button class="tipo-toggle" id="tipoToggle" type="button" aria-expanded="false">
                        Filtra i collaboratori per tipologia
                        <svg class="car" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                </div>
                <div class="tipologia-row" id="tipologiaRow"></div>
                <div class="mobile-tabs" id="mobileTabs" role="tablist" aria-label="Scegli colonna">
                    <button class="mobile-tab" type="button" data-role="antiquario" aria-selected="true">antiquari <span class="n" id="mcnt-antiquario"></span></button>
                    <button class="mobile-tab" type="button" data-role="collaboratore" aria-selected="false">collaboratori <span class="n" id="mcnt-collaboratore"></span></button>
                    <button class="mobile-tab" type="button" data-role="cliente" aria-selected="false">clienti <span class="n" id="mcnt-cliente"></span></button>
                </div>
                <div class="result-line" id="resultLine"></div>
            </div>

            <div class="columns" id="columns" data-mobile="antiquario">
                <section class="col" data-role="antiquario">
                    <div class="col-head">
                        <h2>antiquari</h2>
                        <span class="col-count" id="cnt-antiquario"></span>
                    </div>
                    <div class="col-list" id="list-antiquario"></div>
                </section>
                <section class="col" data-role="collaboratore">
                    <div class="col-head">
                        <h2>collaboratori</h2>
                        <span class="col-count" id="cnt-collaboratore"></span>
                    </div>
                    <div class="col-list" id="list-collaboratore"></div>
                </section>
                <section class="col" data-role="cliente">
                    <div class="col-head">
                        <h2>clienti</h2>
                        <span class="col-count" id="cnt-cliente"></span>
                    </div>
                    <div class="col-list" id="list-cliente"></div>
                </section>
            </div>
        </div>

        <script id="persone-data" type="application/json">__PERSONE_DATA__</script>
    </main>

    <!-- Footer copiato dalla pagina esistente -->
    <footer>
        <div class="footer-container">
          <div class="footer-ente">
            <a href="https://fondazionezeri.unibo.it/it/homepage" target="_blank" rel="noopener">
              <img src="../img/homepage/logo-negativo.png" alt="Fondazione Federico Zeri">
            </a>
            <p>Progetto della <a href="https://fondazionezeri.unibo.it/it/homepage" target="_blank" rel="noopener">Fondazione
               Federico Zeri</a>, Università di Bologna.</p>
          </div>
            <div class="footer-left">
                <p>Licenza dati e immagini: <img id="license.png" src="../img/homepage/license.png" alt="License"></p>
            </div>
            <div class="footer-right">
                <p>
                    <a href="../html/crediti.html">Crediti</a> | <a href="https://github.com/FondazioneFedericoZeri/Mercato_dell_arte">Documentazione</a>
                </p>
            </div>
        </div>
    </footer>

</body>
</html>
"""


def build_statistiche(data, n_entita, output="json/statistiche.json"):
    """Numeri del contatore in home (sezione #statistics di index.html).

    Vengono ricavati dagli stessi dati con cui si costruisce html/persone.html,
    così il numero mostrato in home coincide sempre con quello che l'utente
    trova nella pagina in cui il contatore lo manda. Il file generato è di
    poche centinaia di byte: la home lo scarica senza dover leggere i JSON
    completi (entità.json da solo pesa ~600 KB).
    """
    luoghi = load_tsv("data/luoghi.tsv")
    stats = {
        "entita": n_entita,
        "professionisti": sum(1 for d in data if d["role"] == "antiquario"),
        "clienti_collaboratori": sum(1 for d in data if d["role"] in ("collaboratore", "cliente")),
        "luoghi": len(luoghi),
    }
    pathlib.Path(output).write_text(
        json.dumps(stats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{output} generato: {stats}")
    return stats


def build_persone_html(entita_tsv=None, output="html/persone.html"):
    entita_tsv = entita_tsv or ENTITA_TSV()
    entita = load_tsv(entita_tsv)
    entita_by_id = {e["ID"]: e["Nome"] for e in entita}

    data = (
        build_persone_data(entita_by_id)
        + build_collaboratori_data(entita_by_id)
        + build_clienti_data(entita_by_id)
    )

    data_json = json.dumps(data, ensure_ascii=False)
    # Evita che una tipologia o un nome contenente "</script" chiuda in
    # anticipo il tag <script> in cui il JSON viene incorporato.
    data_json = data_json.replace("</", "<\\/")

    page = PAGE_TEMPLATE.replace("__PERSONE_DATA__", data_json)

    pathlib.Path(output).write_text(page, encoding="utf-8")
    n_ant = sum(1 for d in data if d["role"] == "antiquario")
    n_collab = sum(1 for d in data if d["role"] == "collaboratore")
    n_client = sum(1 for d in data if d["role"] == "cliente")
    print(f"html/persone.html generato: {n_ant} antiquari, {n_collab} collaboratori, {n_client} clienti.")

    build_statistiche(data, len(entita))


if __name__ == "__main__":
    build_persone_html()
