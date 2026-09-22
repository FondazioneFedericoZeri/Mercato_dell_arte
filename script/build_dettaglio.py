import os
import re
import json
import pathlib
import airium as a
import docx

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
    return _file_entita("data/entita.tsv", "data/entità.tsv")


def ENTITA_JSON():
    return _file_entita("json/entita.json", "json/entità.json")


def getText(filename):
    doc = docx.Document(filename)
    fullText = []
    for para in doc.paragraphs:
        if len(para.text.strip()) > 0:
            fullText.append(para.text)
    return fullText

def getTXT(filename):
    fullText = []
    with open(filename, encoding="utf-8") as fin:
        for line in fin:
            line = line.strip()
            if len(line)>0:
                fullText.append(line)
    return fullText


def fonte_archivistica(bibitem):
    """Citta', istituto, fondo, segnatura: quel che abbiamo.

    Una fonte d'archivio non ha autore, anno o titolo, quindi il
    formato bibliografico non la descrive: con getBib usciva come un
    corsivo vuoto seguito da una virgola.
    """
    pezzi = [(bibitem.get(k) or "").strip() for k in
             ("Città, editore o rivista", "Istituto", "Fondo", "Segnatura")]
    return ", ".join(p for p in pezzi if p)


def collegamento(valore):
    """Un indirizzo web si clicca, non si legge: cinque voci lo hanno
    scritto per esteso in una colonna qualsiasi, e uno di 117 caratteri
    non si puo' nemmeno mandare a capo. Qui diventa un collegamento,
    con scritto il sito."""
    v = (valore or "").strip()
    if not v.startswith(("http://", "https://")):
        return v
    dominio = re.sub(r"^https?://(www\.)?", "", v).split("/")[0]
    return (f'<a href="{v}" target="_blank" rel="noopener" '
            f'class="bib-web">{dominio}</a>')


def getBib(bibitem):
    if (bibitem.get("Tipologia") or "").strip() == "fonte archivistica":
        return fonte_archivistica(bibitem)

    s = ""

    anything_before_title = False
    if len(bibitem["Autore"].strip()) > 0:
        s += f"{bibitem['Autore'].strip()}"
        anything_before_title = True  # Change += to =

    if len(bibitem['Anno']) > 0:
        if anything_before_title:
            s += f" ({bibitem['Anno']})"
        else:
            s += f"{bibitem['Anno']}"
        anything_before_title = True  # Change += to =

    if anything_before_title:
        s += ", "

    s += f"<i>{bibitem['Titolo']}</i>"

    """Il completamento del titolo dice dove sta lo scritto: il volume
    che lo contiene ("in Sciolla, G.C., Rovetta, A. (a cura di)..."),
    la mostra di cui e' il catalogo, la data dell'asta. Va subito dopo
    il titolo e fuori dal corsivo: e' l'unico punto in cui ha senso, e
    finora, pur essendo compilato per 87 schede su 499, non compariva
    da nessuna parte."""
    completamento = (bibitem.get('Completamento del titolo') or "").strip()
    if completamento:
        s += f", {completamento}"

    if len(bibitem['Città, editore o rivista']) > 0:
        s += f", {collegamento(bibitem['Città, editore o rivista'])}"

    if len(bibitem["Pagine"]) > 0:
        s += f", {collegamento(bibitem['Pagine'])}"

    return s


def getCollaboratore(coll_item):
    s = ""
    if len(coll_item["Nome"]) > 0:
        s += f"{coll_item['Nome']} "
    s += f"{coll_item['Cognome / Denominazione']} ({coll_item['Tipologia']})"
    return s


def getCliente(cl_item, people):
    s = ""
    if len(cl_item["Nome"]) > 0:
        s += f"{cl_item['Nome']} "
    s += f"{cl_item['Cognome']} "
    return s


def getEvento(ev_item):
    s = f"{ev_item['Anno']} - <i>{ev_item['Descrizione sintetica']}</i>: {ev_item['Descrizione dettagliata']}"

    return s


# ══════════════════════════════════════════════════════════════════
#  Dati della testata: sottotitolo e scheda di sintesi
#
#  Regola generale della pagina: non si mostra mai un'etichetta o un
#  tab che dentro non ha niente. Le funzioni qui sotto restituiscono
#  liste vuote quando il dato manca, e chi le usa salta il blocco.
# ══════════════════════════════════════════════════════════════════

def luoghi_entita(entity):
    """Tutti i luoghi dell'entita', in ordine di apertura.

    Legge il campo "Luoghi", che tsv_to_json costruisce dalla colonna
    ID_entita' di luoghi.tsv: la stessa fonte da cui la mappa della
    scheda pesca i marker, cosi' il contatore del tab e i puntini sulla
    mappa dicono sempre la stessa cosa.

    Prima si passava per le persone (persona -> ID_luoghi). Oltre a
    descrivere un'altra relazione — dove una persona ha lavorato, anche
    nella bottega di un collega — quella strada contava lo stesso luogo
    una volta per persona: le cinque persone di Antonacci-Efrati
    lavoravano tutte in via del Babuino e il tab annunciava "5 luoghi"
    per una sede sola.
    """
    luoghi = list((entity.get("Luoghi") or {}).values())

    def chiave(l):
        ap = (l.get("Apertura") or "").strip()
        return int(ap[:4]) if ap[:4].isdigit() else 9999

    return sorted(luoghi, key=chiave)


def _anno(valore):
    valore = (valore or "").strip()
    return int(valore[:4]) if valore[:4].isdigit() else None


def elenco(voci, congiunzione="e"):
    """'a', 'a e b', 'a, b e c' — senza virgola prima della congiunzione."""
    voci = [v for v in voci if v]
    if not voci:
        return ""
    if len(voci) == 1:
        return voci[0]
    return ", ".join(voci[:-1]) + f" {congiunzione} " + voci[-1]


def sottotitolo(entity):
    """Es. "Torino, entita' attiva dal 1912 al 1975".

    Le schede raccolgono entita' antiquariali, non singole persone:
    dentro una scheda ci possono essere piu' antiquari. Per questo si
    dice sempre "entita' attiva", mai "attivo" o "attiva" riferito a
    una persona.
    """
    luoghi = luoghi_entita(entity)
    if not luoghi:
        return ""

    citta = []
    for l in luoghi:
        c = (l.get("Città") or "").strip()
        if c and c not in citta:
            citta.append(c)
    if len(citta) > 3:
        testo_citta = elenco(citta[:2]) + f" e altre {len(citta) - 2} città"
    else:
        testo_citta = elenco(citta)

    aperture = [a for a in (_anno(l.get("Apertura")) for l in luoghi) if a]
    chiusure = [c for c in (_anno(l.get("Chiusura")) for l in luoghi) if c]
    tuttora = any((l.get("Chiusura") or "").strip().lower() == "in attività"
                  for l in luoghi)

    if aperture and tuttora:
        attivita = f"entità attiva dal {min(aperture)}, tuttora in attività"
    elif aperture and chiusure and max(chiusure) > min(aperture):
        attivita = f"entità attiva dal {min(aperture)} al {max(chiusure)}"
    elif aperture:
        attivita = f"entità attiva dal {min(aperture)}"
    elif tuttora:
        attivita = "entità tuttora in attività"
    else:
        attivita = ""

    return ", ".join([p for p in (testo_citta, attivita) if p])


def insegne(entity):
    """Le insegne fra virgolette dentro "Nome attivita'".

    Il campo e' testo libero del tipo: Pietro Accorsi, "Galleria
    Accorsi". Il nome della persona e' gia' nella riga PERSONE, quindi
    qui si tiene solo cio' che sta fra virgolette, che e' l'insegna
    vera e propria. Se non ce ne sono, la riga non compare.
    """
    trovate = []
    for l in luoghi_entita(entity):
        campo = (l.get("Nome attività") or "").strip()
        for pezzo in re.findall(r'"([^"]+)"|“([^”]+)”', campo):
            nome = (pezzo[0] or pezzo[1]).strip()
            if nome and nome not in trovate:
                trovate.append(nome)
    return trovate


def righe_persone(entity):
    """Nome, date e professione di ogni persona della scheda."""
    righe = []
    for persona in (entity.get("Persone") or {}).values():
        nome = (persona.get("Nome Persona") or "").strip()
        if not nome:
            continue           # le persone senza nome non si mostrano
        pezzi = [nome]
        nascita = (persona.get("Nascita") or "").strip()
        morte = (persona.get("Morte") or "").strip()
        if nascita or morte:
            if morte.lower() == "in vita":
                pezzi.append(f"{nascita}–" if nascita else "")
            else:
                pezzi.append(f"{nascita or '?'}–{morte or '?'}")
        professione = (persona.get("Professione") or "").strip()
        if professione:
            pezzi.append(professione)
        righe.append(", ".join([p for p in pezzi if p]))
    return righe


def scheda_sintesi(entity):
    """Le righe della scheda di sintesi: solo quelle che hanno un dato."""
    righe = []

    persone = righe_persone(entity)
    if persone:
        righe.append(("PERSONE" if len(persone) > 1 else "PERSONA",
                      "<br>".join(persone)))

    nomi = insegne(entity)
    if nomi:
        righe.append(("INSEGNA" if len(nomi) == 1 else "INSEGNE",
                      "<br>".join(nomi)))

    link = (entity.get("Link Zeri") or "").strip()
    if link:
        righe.append(("IN CATALOGO",
                      f'<a href="{link}" class="linkBio" target="_blank">'
                      f'Opere transitate, catalogo della Fondazione Zeri '
                      f'&#8594;</a>'))

    return righe


def persone_albero(entity_id, parentela):
    """Quante persone finiscono davvero nell'albero familiare.

    Stessa regola di script/albero-familiare.js: si tengono solo le
    persone con un nome, e solo i legami fra due persone rimaste. Se
    non resta nessun legame non c'e' albero da disegnare, quindi il
    tab non viene nemmeno scritto.
    """
    dati = parentela.get(entity_id)
    if not dati:
        return 0
    persone = {pid for pid, p in (dati.get("Persone") or {}).items()
               if (p.get("Nome") or "").strip()}
    collegate = set()
    for r in dati.get("Relazioni", []):
        if r.get("Persona_1") in persone and r.get("Persona_2") in persone:
            collegate.add(r["Persona_1"])
            collegate.add(r["Persona_2"])
    return len(collegate)


def build_html_head(page, entity):
    with page.head():
        page.meta(charset="UTF-8")
        page.meta(name="viewport",
                  content="width=device-width, initial-scale=1.0")
        # Un titolo per scheda: segnalibri, cronologia e risultati di
        # ricerca erano tutti "Dettaglio Antiquari", indistinguibili.
        page.title(_t=f"{entity['Nome']} | Mercato dell'arte")
        page.meta(name="description",
                  content=f"{entity['Nome']}: scheda dell'entità "
                          f"antiquariale nel progetto Mercato dell'arte "
                          f"della Fondazione Federico Zeri.")

        # Tipografia condivisa con il sito dei cataloghi d'asta:
        # Playfair Display per i titoli, DM Sans per il testo.
        page.link(rel="preconnect", href="https://fonts.googleapis.com")
        page.link(rel="preconnect",
                  href="https://fonts.gstatic.com", crossorigin="")
        page.link(
            href="https://fonts.googleapis.com/css2?"
                 "family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&"
                 "family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&"
                 "display=swap", rel="stylesheet")
        page.link(rel="stylesheet",
                  href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css")
        page.link(rel="stylesheet",
                  href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css")
        page.link(rel="stylesheet",
                  href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css")
        # tokens.css va prima del foglio di pagina: definisce le variabili
        # (--ff-head, --ff-body, --link...) che il foglio di pagina usa.
        page.link(rel="stylesheet", href="../../css/tokens.css")
        page.link(rel="stylesheet",
                  href="../../css/styles-dettaglioAntiquario.css")
        page.script(type="text/javascript",
                    src="https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.min.js")
        page.script(type="text/javascript",
                    src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js")
        page.script(type="text/javascript",
                    src="https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js")
        page.script(src="../../script/menu.js", defer="")
        page.script(type="text/javascript",
                    src="../../script/galleria.js")
        page.script(type="text/javascript",
                    src="../../script/albero-familiare.js")
        page.script(type="text/javascript",
                    src="../../script/dettaglioAntiquari.js")
        page.script(type="text/javascript",
                    src="../../script/mappaDettaglio.js")


ZERI = "https://fondazionezeri.unibo.it/it/homepage"


def build_header(page):
    """Il nome del progetto a sinistra, il logo dell'istituto a destra.

    Il logo della Fondazione non e' piu' il link alla home: nei test
    con gli utenti nessuno lo cliccava per tornare all'inizio del sito,
    perche' tutti si aspettavano di finire sul sito della Fondazione.
    Ora ci porta davvero, e alla home ci si torna dal nome del progetto.
    """
    with page.header():
        with page.div(klass="header-container"):
            page.a(klass="marchio", href="../../index.html",
                   _t="Mercato dell'arte")
            # Il panino mancava del tutto in queste pagine: il menu era
            # nascosto sotto i 768px senza nessun modo per aprirlo.
            page.button(klass="menu-toggle", type="button",
                        **{"aria-label": "Apri menu"}, _t="&#9776;")
            with page.div(klass="testata-destra"):
                with page.nav():
                    with page.ul(klass="menu"):
                        page.li().a(_t="Progetto", href="../progetto.html")
                        page.li().a(_t="Antiquari", href="../antiquari.html")
                        page.li().a(_t="Luoghi", href="../luoghi.html")
                        page.li().a(_t="Eventi", href="../eventi.html")
                        page.li().a(_t="Persone", href="../persone.html")
                        page.li().a(_t="Bibliografia", href="../bibliografia.html")
                page.span(klass="testata-filo")
                with page.a(klass="testata-ente", href=ZERI, target="_blank",
                            rel="noopener",
                            title="Fondazione Federico Zeri, Universit\u00e0 di Bologna"):
                    page.img(src="../../img/homepage/logo.png",
                             alt="Fondazione Federico Zeri")


def bottone_zoom(page):
    """La lente che apre la fotografia ingrandita.

    E' un <button> vero: si raggiunge col tabulatore e un lettore di
    schermo lo annuncia. Anche la fotografia e' cliccabile, ma quello
    da solo non basterebbe a chi non usa il mouse.
    """
    with page.button(klass="gal-zoom", type="button",
                     **{"aria-label": "Ingrandisci la fotografia"}):
        page('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
             'stroke-width="2" stroke-linecap="round" aria-hidden="true">'
             '<circle cx="11" cy="11" r="7"></circle>'
             '<path d="M20 20l-4.3-4.3M11 8v6M8 11h6"></path></svg>')


def build_fascia(page, entity, imgs, images_description):
    """La fascia blu: nome, sottotitolo e fotografia."""
    klass = "scheda-fascia" if imgs else "scheda-fascia senza-foto"
    with page.section(klass=klass):
        with page.div(klass="scheda-fascia-testo"):
            page.h1(klass="scheda-nome", _t=entity["Nome"])
            testo = sottotitolo(entity)
            if testo:
                page.p(klass="scheda-sottotitolo", _t=testo)

        if len(imgs) == 1:
            img = f"{imgs[0]}.jpg"
            desc = images_description.get(img, {}).get("Didascalia", entity["Nome"])
            with page.figure(id="single-image-container"):
                page.img(src=f"../../img/slider-antiquari/{img}", alt=f"{desc}")
                page.figcaption(_t=f"{desc}", klass="caption")
                bottone_zoom(page)

        elif len(imgs) > 1:
            with page.div(klass="slider-container"):
                with page.div(klass="slider"):
                    for nome in imgs:
                        img = f"{nome}.jpg"
                        desc = images_description.get(img, {}).get(
                            "Didascalia", entity["Nome"])
                        with page.div(klass="slide"):
                            page.img(src=f"../../img/slider-antiquari/{img}",
                                     alt=f"{desc}")
                            page.div(_t=f"{desc}", klass="caption")
                # I gestori stanno in script/galleria.js: le frecce
                # fermano anche l'autoplay, cosa che un onclick inline
                # non sapeva fare.
                page.button(klass="prev", type="button",
                            **{"aria-label": "Fotografia precedente"},
                            _t="&#10094;")
                page.button(klass="next", type="button",
                            **{"aria-label": "Fotografia successiva"},
                            _t="&#10095;")
                bottone_zoom(page)


def build_sfoglia(page, entity, ordinate):
    """Scheda precedente e successiva, in ordine alfabetico."""
    ids = [e["ID"] for e in ordinate]
    i = ids.index(entity["ID"])
    prec = ordinate[i - 1] if i > 0 else None
    succ = ordinate[i + 1] if i < len(ordinate) - 1 else None

    with page.nav(klass="scheda-sfoglia", **{"aria-label": "Altre schede"}):
        if prec:
            page.a(href=f"dettaglio_{prec['ID']}.html",
                   _t=f"&#8592; {prec['Nome']}")
        else:
            page.span(klass="vuoto", _t="&#8592; prima scheda")
        if succ:
            page.a(href=f"dettaglio_{succ['ID']}.html",
                   _t=f"{succ['Nome']} &#8594;")
        else:
            page.span(klass="vuoto", _t="ultima scheda &#8594;")


def build_html(entity, entities, parentela, ordinate):

    images_description = json.loads(
        open("json/didascalie.json", encoding="utf-8").read())
    people = json.loads(open("json/persone.json", encoding="utf-8").read())

    imgs = [img for img in entity["Foto gallery"] if img and img.strip()]

    # ── Cosa c'e' davvero in questa scheda ────────────────────────
    bio_file = pathlib.Path(f"bio-txt/{entity['Bio']}.txt")
    bio = getTXT(str(bio_file)) if bio_file.is_file() else []

    n_albero = persone_albero(entity["ID"], parentela)
    luoghi = luoghi_entita(entity)
    altri = entity.get("Relazioni") or {}
    clienti = entity.get("Clienti") or {}
    collaboratori = entity.get("Collaboratori") or {}
    n_relazioni = len(altri) + len(clienti) + len(collaboratori)
    eventi = entity.get("Eventi") or {}
    biblio = entity.get("Bibliografia") or {}

    # (etichetta, id del contenuto, numero da mostrare) — solo i pieni
    tab = []
    if bio:
        tab.append(("Dati biografici", "Bio", 0))
    if n_albero:
        tab.append(("Albero familiare", "Persone", n_albero))
    if luoghi:
        tab.append(("Luoghi", "Localizzazioni", len(luoghi)))
    if n_relazioni:
        tab.append(("Relazioni", "Relazioni", n_relazioni))
    if eventi:
        tab.append(("Eventi", "Eventi", len(eventi)))
    if biblio:
        tab.append(("Bibliografia", "Bibliografia", len(biblio)))

    primo = tab[0][1] if tab else ""

    def klass_contenuto(nome):
        return "content active-content" if nome == primo else "content"

    page = a.Airium()
    page('<!DOCTYPE html>')

    with page.html(lang="it"):

        build_html_head(page, entity)

        with page.body():
            build_header(page)

            with page.main(klass="scheda"):
                print(entity["ID"], len(imgs))

                with page.div(klass="scheda-torna"):
                    page.a(href="../antiquari.html",
                           _t="&#8592; Tutti gli antiquari")

                build_fascia(page, entity, imgs, images_description)

                righe = scheda_sintesi(entity)
                if righe:
                    with page.section(klass="scheda-dati"):
                        with page.dl(klass="scheda-record"):
                            for etichetta, valore in righe:
                                page.dt(_t=etichetta)
                                page.dd(_t=valore)

                if tab:
                    with page.nav(klass="scheda-tab",
                                  **{"aria-label": "Sezioni della scheda"}):
                        for etichetta, contenuto, numero in tab:
                            attivo = " active" if contenuto == primo else ""
                            with page.button(klass=f"tab{attivo}",
                                             type="button",
                                             data_content=contenuto):
                                page(etichetta)
                                if numero:
                                    page.span(klass="tab-num", _t=str(numero))

                with page.div(klass="scheda-contenuto"):

                    if bio:
                        with page.div(id="Bio", klass=klass_contenuto("Bio")):
                            for paragrafo in bio:
                                page.p(_t=paragrafo)

                    if n_albero:
                        with page.div(id="Persone",
                                      klass=klass_contenuto("Persone")):
                            # La legenda sta qui, accanto al titolo:
                            # dentro il telaio galleggiava nel vuoto
                            # a destra dell'albero.
                            with page.div(klass="af-intestazione"):
                                page.h2(_t="Relazioni familiari")
                                page.div(id="af-legenda", klass="af-legenda")
                            page.div(id="albero-genealogico")

                    if luoghi:
                        with page.div(id="Localizzazioni",
                                      klass=klass_contenuto("Localizzazioni")):
                            with page.section(id="map"):
                                page.div(id="chartdiv")

                    if n_relazioni:
                        with page.div(id="Relazioni",
                                      klass=klass_contenuto("Relazioni")):
                            # Ogni categoria compare solo se ha dei dati:
                            # un'etichetta con sotto il vuoto non dice nulla.
                            if altri:
                                page.h2(_t="Altri antiquari")
                                with page.ul():
                                    for relent_id in altri:
                                        with page.li():
                                            page.a(href=f"dettaglio_{relent_id}.html",
                                                   _t=f"{entities[relent_id]['Nome']}")
                            if clienti:
                                page.h2(_t="Clienti")
                                with page.ul():
                                    for _, cl_data in sorted(
                                            clienti.items(),
                                            key=lambda x: (x[1]["Nome"], x[1]["Cognome"])):
                                        page.li(_t=getCliente(cl_data, people))
                            if collaboratori:
                                page.h2(_t="Collaboratori")
                                with page.ul():
                                    for _, coll_data in sorted(
                                            collaboratori.items(),
                                            key=lambda x: (x[1]["Nome"], x[1]["Cognome / Denominazione"])):
                                        page.li(_t=getCollaboratore(coll_data))

                    if eventi:
                        with page.div(id="Eventi",
                                      klass=klass_contenuto("Eventi")):
                            page.h2(_t="Eventi significativi nell'attività antiquariale")
                            with page.ul():
                                for _, ev_data in sorted(eventi.items(),
                                                         key=lambda x: x[1]["Anno"]):
                                    page.li(_t=getEvento(ev_data))

                    if biblio:
                        with page.div(id="Bibliografia",
                                      klass=klass_contenuto("Bibliografia")):
                            # Tre gruppi: le fonti d'archivio non sono
                            # bibliografia e non stanno sotto quel titolo.
                            def _tip(v):
                                return (v.get("Tipologia") or "").strip()

                            interviste = {k: v for k, v in biblio.items()
                                          if _tip(v) == "intervista"}
                            archivio = {k: v for k, v in biblio.items()
                                        if _tip(v) == "fonte archivistica"}
                            altra = {k: v for k, v in biblio.items()
                                     if _tip(v) not in ("intervista", "fonte archivistica")}

                            def _elenco(titolo, voci, chiave):
                                if not voci:
                                    return
                                page.h2(_t=titolo)
                                with page.ul():
                                    for _, bib in sorted(voci.items(), key=chiave):
                                        page.li(_t=getBib(bib))

                            _elenco("Bibliografia essenziale", altra,
                                    lambda x: (x[1]["Autore"], x[1]["Anno"]))
                            _elenco("Fonti archivistiche", archivio,
                                    lambda x: ((x[1].get("Istituto") or ""),
                                               (x[1].get("Fondo") or "")))
                            _elenco("Interviste", interviste,
                                    lambda x: (x[1]["Autore"], x[1]["Anno"]))

                build_sfoglia(page, entity, ordinate)

            with page.footer():
                with page.div(klass="footer-container"):
                    with page.div(klass="footer-ente"):
                        with page.a(href=ZERI, target="_blank", rel="noopener"):
                            page.img(src="../../img/homepage/logo-negativo.png",
                                     alt="Fondazione Federico Zeri")
                        # Frase in un pezzo solo: spezzandola in più
                        # chiamate, airium ci infila un a capo e in pagina
                        # compare uno spazio prima della virgola.
                        page.p(_t='Progetto della <a href="' + ZERI + '" target="_blank" rel="noopener">Fondazione Federico Zeri</a>, Universit\u00e0 di Bologna.')
                    with page.div(klass="footer-left"):
                        page.p(_t='Licenza dati e immagini:')
                        page.img(
                            id="license.png", src="../../img/homepage/license.png", alt="License")
                    with page.div(klass="footer-right"):
                        with page.p():
                            with page.a(href="../../html/crediti.html"):
                                page("Crediti")
                            page("|")
                            with page.a(href="../../html/documentazione.html"):
                                page("Documentazione")

    html_content = str(page)

    with open(f"html/dettagli/dettaglio_{entity['ID']}.html", "w", encoding="utf-8") as f:
        f.write(html_content)


if __name__ == "__main__":
    entities = json.loads(open(ENTITA_JSON(), encoding="utf-8").read())

    parentela = {}
    if os.path.isfile("json/parentela.json"):
        parentela = json.loads(
            open("json/parentela.json", encoding="utf-8").read())

    # ordine alfabetico, per i rimandi "scheda precedente / successiva"
    ordinate = sorted(entities.values(),
                      key=lambda e: (e["Nome"] or "").strip().lower())

    for entity in entities:
        build_html(entities[entity], entities, parentela, ordinate)
