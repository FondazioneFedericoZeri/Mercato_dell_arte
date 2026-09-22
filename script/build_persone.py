"""Genera html/persone.html da persone.tsv, collaboratori.tsv e compravendite.tsv"""

import os
import csv
import html
import json
import pathlib
import sys

# Nome del file delle entità, con o senza accento
def _file_entita(*candidati):
    for c in candidati:
        if os.path.isfile(c):
            return c
    return candidati[0]   # nessuno dei due: si usa il primo


def ENTITA_TSV():
    return _file_entita("data/entita.tsv", "data/entit\u00e0.tsv")


def ENTITA_JSON():
    return _file_entita("json/entita.json", "json/entit\u00e0.json")




def load_tsv(path):
    """Legge un TSV come lista di dizionari, scarta le colonne in più e avvisa"""
    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        rows = []
        for n, row in enumerate(reader, start=2):
            extra = row.pop(None, None)
            if extra:
                testo = [e for e in extra if (e or "").strip()]
                if testo:
                    print(f"  [{path}] riga {n}: {len(extra)} colonne oltre "
                          f"l'intestazione, ignorate: {testo}", file=sys.stderr)
            if not any((v or "").strip() for v in row.values()):
                continue
            rows.append({(k or "").strip(): (v or "").strip() for k, v in row.items()})
        return rows


def esc(s):
    return html.escape(s or "", quote=False)


def norm_morte(morte):
    """Campo Morte ripulito, "in vita" diventa stringa vuota"""
    m = (morte or "").strip()
    if m.lower() == "in vita":
        return ""
    return m


def e_vivente(morte):
    """Vero quando la colonna Morte è "in vita", cioè la persona è viva"""
    return (morte or "").strip().lower() == "in vita"


# Particelle che fanno parte del cognome
_SURNAME_PARTICLES = {
    "di", "de", "del", "della", "dei", "degli", "dal", "dalla",
    "van", "von", "la", "lo", "le", "du", "des",
}
# Suffissi da ignorare in coda al nome
_GEN_SUFFIXES = {"i", "ii", "iii", "iv", "v", "vi", "jr", "sr"}

# Cognomi doppi da ordinare a mano, chiave = "Nome Persona" di persone.tsv
_SURNAME_OVERRIDES = {
    "Alessandro Contini Bonacossi": "contini bonacossi",
}


def surname_key(full_name):
    # Chiave di ordinamento: ultima parola del nome, con particelle e suffissi
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
    """Antiquari, una entità sola a testa"""
    persone = load_tsv("data/persone.tsv")
    items = []
    for p in persone:
        ent_id = p.get("ID_entità", "")
        if ent_id not in entita_by_id:
            continue
        name = p.get("Nome Persona", "")
        if not name:
            # Salta le righe senza nome persona
            continue
        items.append({
            "role": "antiquario",
            "name": name,
            "sort": surname_key(name),
            "nascita": (p.get("Nascita", "") or "").strip(),
            "morte": norm_morte(p.get("Morte", "")),
            "vivente": e_vivente(p.get("Morte", "")),
            "entity_id": ent_id,
            "entity_name": entita_by_id[ent_id],
        })
    return items


def build_collaboratori_data(entita_by_id):
    rows = load_tsv("data/collaboratori.tsv")

    # Accorpa le righe della stessa persona per (Nome, Cognome)
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
            <!-- Titolo pagina -->
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
                <div class="result-row">
                    <div class="result-line" id="resultLine"></div>
                    <!-- Reset filtri -->
                    <button class="reset-filtri" id="resetFiltri" type="button" hidden>Azzera i filtri</button>
                </div>
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
                    <a href="../html/crediti.html">Crediti</a> | <a href="../html/documentazione.html">Documentazione</a>
                </p>
            </div>
        </div>
    </footer>

</body>
</html>
"""


# Pagina non elencata dei protagonisti, stessi dati di persone.html

PAGINA_PROTAGONISTI = """<!DOCTYPE html>
<html lang="it">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Protagonisti: letture d'insieme | Mercato dell'arte</title>
    <!-- Pagina fuori dal menu -->
    <meta name="robots" content="noindex, nofollow">
    <link rel="stylesheet" href="../css/tokens.css">
    <link rel="stylesheet" href="../css/torna-su.css">
    <link rel="stylesheet" href="../css/persone.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap" rel="stylesheet">
    <!-- amCharts 5 -->
    <script src="https://cdn.amcharts.com/lib/5/index.js"></script>
    <script src="https://cdn.amcharts.com/lib/5/hierarchy.js"></script>
    <script src="https://cdn.amcharts.com/lib/5/themes/Animated.js"></script>
    <script src="../script/persone-insieme.js" defer></script>
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


    <!-- Contenuto: generato da script/build_persone.py, NON modificare a mano. -->
    <main>
        <div class="wrap">
            <h1 class="titolo-pagina">Le reti del mercato</h1>

            <div id="persone-insieme" class="persone-insieme"></div>
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
                    <a href="../html/crediti.html">Crediti</a> | <a href="../html/documentazione.html">Documentazione</a>
                </p>
            </div>
        </div>
    </footer>

</body>
</html>
"""


def build_statistiche(data, n_entita, output="json/statistiche.json"):
    """Numeri del contatore in home, dagli stessi dati di persone.html"""
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


def build_nomi_entita(entita_by_id, output="json/nomi_entita.json"):
    """Nome di ogni entità per ID, per i popup della mappa in home"""
    pathlib.Path(output).write_text(
        json.dumps(entita_by_id, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    print(f"{output} generato: {len(entita_by_id)} entita'.")


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
    # Evita che "</script" nei dati chiuda il tag <script>
    data_json = data_json.replace("</", "<\\/")

    page = PAGE_TEMPLATE.replace("__PERSONE_DATA__", data_json)

    pathlib.Path(output).write_text(page, encoding="utf-8")

    # Pagina non elencata dei protagonisti, con gli stessi dati
    pagina = PAGINA_PROTAGONISTI.replace("__PERSONE_DATA__", data_json)
    pathlib.Path("html/protagonisti.html").write_text(pagina, encoding="utf-8")
    print("html/protagonisti.html generato (pagina non elencata).")
    n_ant = sum(1 for d in data if d["role"] == "antiquario")
    n_collab = sum(1 for d in data if d["role"] == "collaboratore")
    n_client = sum(1 for d in data if d["role"] == "cliente")
    print(f"html/persone.html generato: {n_ant} antiquari, {n_collab} collaboratori, {n_client} clienti.")

    build_statistiche(data, len(entita))
    build_nomi_entita(entita_by_id)


if __name__ == "__main__":
    build_persone_html()
