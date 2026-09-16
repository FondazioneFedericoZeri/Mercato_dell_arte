"""Generates html/persone.html from the three source datasets that feed it:
data/persone.tsv (singoli professionisti legati a un'entità antiquaria),
data/collaboratori.tsv (fotografi, restauratori, storici dell'arte, ecc.) e
data/compravendite.tsv (clienti).

Prima di questo script la pagina era scritta e aggiornata a mano: restava
sistematicamente indietro rispetto ai dati man mano che venivano aggiunte
nuove persone, collaboratori o compravendite. Ora viene rigenerata da zero
a ogni run, con lo stesso markup/CSS/JS (script/persone.js) della versione
precedente, cosi' i tooltip continuano a funzionare senza modifiche.
"""

import csv
import html
import pathlib


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


def entity_link(ent_id, ent_name):
    return f'<a href="../html/dettagli/dettaglio_{esc(ent_id)}.html">{esc(ent_name)}</a>'


def join_it(items):
    """Italian list join: 'a, b e c.' (single item: 'a.')."""
    items = [i for i in items if i]
    if not items:
        return ""
    if len(items) == 1:
        return items[0] + "."
    return ", ".join(items[:-1]) + " e " + items[-1] + "."


def format_dates(nascita, morte):
    n = (nascita or "").strip()
    m = (morte or "").strip()
    # In alcune righe "Morte" contiene il testo letterale "in vita" invece di
    # restare vuoto: va reso come "(1957-)", non come il fuorviante "(1957-in
    # vita)" (che sembrerebbe un anno di morte).
    if m.lower() == "in vita":
        m = ""
    if not n and not m:
        return ""
    if n and m:
        return f" ({n}-{m})"
    if n:
        return f" ({n}-)"
    return f" (-{m})"


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


def build_persone_section(entita_by_id):
    persone = load_tsv("data/persone.tsv")
    items = []
    for p in persone:
        ent_id = p.get("ID_entità", "")
        if ent_id not in entita_by_id:
            continue
        name = p.get("Nome Persona", "")
        if not name:
            # Riga senza nome persona (es. compilata solo con il nome
            # dell'attività): non c'è nulla da mostrare come link.
            continue
        dates = format_dates(p.get("Nascita", ""), p.get("Morte", ""))
        items.append({
            "sort_key": surname_key(name),
            "html": f'<a href="../html/dettagli/dettaglio_{esc(ent_id)}.html" class="link">{esc(name)}{dates}</a>',
        })
    items.sort(key=lambda x: x["sort_key"])

    lines = ['            <div class="column">', "                <h2>Antiquari</h2>"]
    for it in items:
        lines.append("                " + it["html"])
    lines.append("")
    lines.append("            </div>")
    return "\n".join(lines), len(items)


def build_collaboratori_section(entita_by_id):
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
        tipologia = " / ".join(entry["tipologie"])
        label = f"{esc(display)}" + (f" ({esc(tipologia)})" if tipologia else "")
        items.append({
            "sort_key": (cognome or display).lower(),
            "label": label,
            "entities": entry["entities"],
        })
    items.sort(key=lambda x: x["sort_key"])

    p_lines = []
    div_lines = []
    for i, it in enumerate(items, start=1):
        tid = f"tooltip-content-c{i}"
        p_lines.append(f'                <p class="collaborator" data-tooltip-content="#{tid}">{it["label"]}</p>')
        if it["entities"]:
            links = [entity_link(e, entita_by_id[e]) for e in it["entities"]]
            tooltip_text = "Ha collaborato con " + join_it(links)
        else:
            tooltip_text = "Nessuna entità collegata in archivio."
        div_lines.append(f'                <div id="{tid}" class="tooltip-content" style="display:none;">')
        div_lines.append(f"                    {tooltip_text}")
        div_lines.append("                </div>")

    lines = ['            <div class="column">', "                <h2>Collaboratori</h2>"]
    lines.extend(p_lines)
    lines.append("")
    lines.extend(div_lines)
    lines.append("")
    lines.append("            </div>")
    return "\n".join(lines), len(items)


def build_clienti_section(entita_by_id):
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
            "sort_key": (entry["cognome"] or display).lower(),
            "label": esc(display),
            "entities": entry["entities"],
        })
    items.sort(key=lambda x: x["sort_key"])

    p_lines = []
    div_lines = []
    for i, it in enumerate(items, start=1):
        tid = f"tooltip-content-cl{i}"
        p_lines.append(f'                <p class="client" data-tooltip-content="#{tid}">{it["label"]}</p>')
        if it["entities"]:
            links = [entity_link(e, entita_by_id[e]) for e in it["entities"]]
            tooltip_text = "È stato cliente di " + join_it(links)
        else:
            tooltip_text = "Nessuna entità collegata in archivio."
        div_lines.append(f'                <div id="{tid}" class="tooltip-content" style="display:none;">')
        div_lines.append(f"                    {tooltip_text}")
        div_lines.append("                </div>")

    lines = ['            <div class="column">', "                <h2>Clienti</h2>"]
    lines.extend(p_lines)
    lines.append("")
    lines.extend(div_lines)
    lines.append("")
    lines.append("            </div>")
    return "\n".join(lines), len(items)


PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="it">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Persone</title>
    <link rel="stylesheet" href="../css/styles-persone.css">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Libre+Bodoni:wght@400;700&display=swap" rel="stylesheet">
    <script type="text/javascript" src="../script/scripts-antiquari.js"></script>
    <script type="text/javascript" src="../script/antiquari_search.js"></script>
    <script type="text/javascript" src="../script/persone.js"></script>
    <script src="../script/menu.js" defer></script>
</head>

<body>

    <header>
        <div class="header-container">
            <a href="../index.html">
                <img id="logo.png" src="../img/homepage/logo.png" alt="Fondazione Federico Zeri">
            </a>
            <button class="menu-toggle" aria-label="Apri menu">
                ☰
            </button>
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
        </div>
    </header>


    <!-- Contenuto principale: generato automaticamente da script/build_persone.py -->
    <!-- NON MODIFICARE A MANO: le modifiche vengono sovrascritte al prossimo run. -->
    <!-- Per cambiare i dati, modifica data/persone.tsv, data/collaboratori.tsv o data/compravendite.tsv -->
    <main>
        <a href="#" id="back-to-top" class="btn-back-to-top"> ˄ </a>

        <section id="Persone">
{antiquari}

{collaboratori}

{clienti}
        </section>
    </main>

    <!-- Footer copiato dalla pagina esistente -->
    <footer>
        <div class="footer-container">
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


def build_persone_html(entita_tsv="data/entità.tsv", output="html/persone.html"):
    entita = load_tsv(entita_tsv)
    entita_by_id = {e["ID"]: e["Nome"] for e in entita}

    antiquari_html, n_ant = build_persone_section(entita_by_id)
    collaboratori_html, n_collab = build_collaboratori_section(entita_by_id)
    clienti_html, n_client = build_clienti_section(entita_by_id)

    page = PAGE_TEMPLATE.format(
        antiquari=antiquari_html,
        collaboratori=collaboratori_html,
        clienti=clienti_html,
    )

    pathlib.Path(output).write_text(page, encoding="utf-8")
    print(f"html/persone.html generato: {n_ant} antiquari, {n_collab} collaboratori, {n_client} clienti.")


if __name__ == "__main__":
    build_persone_html()
