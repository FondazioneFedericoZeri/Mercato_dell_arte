import json
import airium as a
import docx


def getText(filename):
    doc = docx.Document(filename)
    fullText = []
    for para in doc.paragraphs:
        fullText.append(para.text)
    return fullText


def getBib(bibitem):
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

    if len(bibitem['Città, editore o rivista']) > 0:
        s += f", {bibitem['Città, editore o rivista']}"

    if len(bibitem["Pagine"]) > 0:
        s += f", {bibitem['Pagine']}"

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

    # if len(cl_item['vendite']) == 1:
    # 	if cl_item['vendite'][0] == "Generic":
    # 		s+=f"(1 compravendita)"
    # 	else:
    # 		person_id = cl_item['vendite'][0]
    # 		s+=f"(1 compravendita con {people[person_id]['Nome Persona']})"
    # else:
    # 	s+=f"({len(cl_item['vendite'])} compravendite)"
    return s


def getEvento(ev_item):
    s = f"{ev_item['Anno']} - <i>{ev_item['Descrizione sintetica']}</i>: {ev_item['Descrizione dettagliata']}"

    return s


def build_html_head(page):
    with page.head():
        page.meta(charset="UTF-8")
        page.meta(name="viewport",
                  content="width=device-width, initial-scale=1.0")
        page.title(_t="Dettaglio Antiquari")

        page.link(
            href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap", rel="stylesheet")
        page.link(
            href="https://fonts.googleapis.com/css2?family=Libre+Bodoni:wght@400;700&display=swap", rel="stylesheet")
        page.link(rel="stylesheet",
                  href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css")
        page.link(rel="stylesheet",
                  href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css")
        page.link(rel="stylesheet",
                  href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css")
        page.link(rel="stylesheet",
                  href="../../css/styles-dettaglioAntiquario.css")
        page.script(type="text/javascript",
                    src="https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.min.js")
        page.script(type="text/javascript",
                    src="https://cdn.amcharts.com/lib/5/index.js")
        page.script(type="text/javascript",
                    src="https://cdn.amcharts.com/lib/5/hierarchy.js")
        page.script(type="text/javascript",
                    src="https://cdn.amcharts.com/lib/5/themes/Animated.js")
        page.script(type="text/javascript",
                    src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js")
        page.script(type="text/javascript",
                    src="https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js")
        page.script(type="text/javascript",
                    src="../../script/dettaglioAntiquari.js")
        page.script(type="text/javascript",
                    src="../../script/mappaDettaglio.js")

        # TODO aggiungi mappa
        # page.script()


def build_header(page):

    with page.header():
        with page.div(klass="header-container"):
            with page.a(href="../../index.html"):
                page.img(id="logo.png", src="../../img/homepage/logo.png",
                         alt="Fondazione Federico Zeri")
            with page.nav():
                with page.ul():
                    with page.li():
                        page.a(_t="Progetto", href="../progetto.html")
                        page.a(_t="Antiquari", href="../antiquari.html")
                        page.a(_t="Luoghi", href="../luoghi.html")
                        page.a(_t="Eventi", href="../eventi.html")
                        page.a(_t="Persone", href="../persone.html")
                        page.a(_t="Bibliografia", href="../bibliografia.html")


def build_html(entity, entities):

    images_description = json.loads(
        open("../json/didascalie.json", encoding="utf-8").read())
    people = json.loads(open("../json/persone.json", encoding="utf-8").read())

    imgs = entity["Foto gallery"]

    page = a.Airium()
    page('<!DOCTYPE html>')

    with page.html(lang="it"):

        build_html_head(page)

        with page.body():
            build_header(page)

            with page.main():
                print(entity["ID"], len(imgs))

                if len(imgs) == 0:
                    with page.section(id="single-image-section"):
                        page.h2(_t=f"{entity['Nome']}",
                                klass="single-image-title")
                        with page.div(klass="single-image-container"):
                            desc = entity['Nome']
                            page.img(
                                src=f"../../img/antiquari-preview/{entity['Foto preview']}.jpg", alt=f"{desc}")
                            page.div(_t=f"{desc}",
                                     klass="caption overlay-caption")

                elif len(imgs) == 1:
                    with page.section(id="single-image-section"):
                        page.h2(_t=f"{entity['Nome']}",
                                klass="single-image-title")
                        with page.div(klass="single-image-container"):
                            desc = entity['Nome']
                            img = f"{imgs[0]}.jpg"

                            if img in images_description:
                                desc = images_description[img]["Didascalia"]

                            page.img(
                                src=f"../../img/slider-antiquari/{img}", alt=f"{desc}")
                            page.div(_t=f"{desc}",
                                     klass="caption overlay-caption")

                else:
                    with page.section(id="image-gallery"):
                        page.h2(_t=f"{entity['Nome']}", klass="gallery-title")
                        with page.div(klass="slider-container"):
                            with page.div(klass="slider"):

                                for img in imgs:
                                    img = f"{img}.jpg"
                                    desc = {entity['Nome']}
                                    if img in images_description:
                                        desc = images_description[img]["Didascalia"]

                                    with page.div(klass="slide"):
                                        page.img(
                                            src=f"../../img/slider-antiquari/{img}", alt=f"{desc}")
                                        page.div(_t=f"{desc}", klass="caption")
                            page.button("&#10094;", klass="prev",
                                        onclick="prevSlide()")
                            page.button("&#10095;", klass="next",
                                        onclick="nextSlide()")

           # with page.section(id="FZ", klass="fade-in"):
                #with page.h2():
                    #page.span(_t="CATALOGO", klass="highlight")
                    #page.span(_t="ZERI", klass="regular-text")
                #with page.div(klass="content-wrapper"):
                    #page.p(_t="Consulta le banche dati della Fondazione<br>Federico Zeri e ricerca fotografie, documenti, <br>cataloghi d'asta, fondi e notizie <br>sull'antiquario corrente.")
                    #page.a(href=f"{entity['Link Zeri']}",
                           #klass="btn", _t="Clicca qui")

            with page.section(id="interactive-section"):
                with page.h2(klass="section-title"):
                    page.span(_t="CARTA", klass="highlight")
                    page.span(_t="D'IDENTITÀ", klass="regular-text")
                with page.div(klass="dual-content-wrapper"):
                    with page.div(klass="tab-container"):
                        with page.ul(klass="tab-list"):
                            page.li(_t="Dati biografici", klass="tab active",
                                    data_content="Bio")
                            page.li(_t="Albero familiare", klass="tab",
                                    data_content="Persone")
                            page.li(_t="Luoghi", klass="tab",
                                    data_content="Localizzazioni")
                            if len(entity["Collaboratori"]) > 0:
                                page.li(_t="Collaboratori", klass="tab",
                                        data_content="Collaboratori")
                            if len(entity["Clienti"]) > 0:
                                page.li(_t="Clienti", klass="tab",
                                        data_content="Clienti")
                            if len(entity["Eventi"]) > 0:
                                page.li(_t="Eventi", klass="tab",
                                        data_content="Eventi")
                            if len(entity["Relazioni"]) > 0:
                                page.li(_t="Altri antiquari",
                                        klass="tab", data_content="Relazioni")
                            if len(entity["Bibliografia"]) > 0:
                                page.li(_t="Bibliografia", klass="tab",
                                        data_content="Bibliografia")

                    with page.div(klass="content-card"):
                        with page.div(id="Bio", klass="content active-content"):
                            content = getText(f"../bio/{entity['Bio']}.docx")
                            page.h3(_t=f"{content[0]}")
                            for paragraph in content[1:]:
                                page.p(_t=paragraph)

                        with page.div(id="Persone", klass="content"):
                            page.h3(
                                _t=f"Relazioni familiari:")
                            page.div(id="albero-genealogico")

                        with page.div(id="Localizzazioni", klass="content"):
                            with page.section(id="map"):
                                page.div(id="chartdiv")

                        if len(entity["Collaboratori"]) > 0:
                            with page.div(id="Collaboratori", klass="content"):
                                page.h3(
                                    _t=f"Hanno collaborato con l'entità {entity['Nome']}:")
                                with page.ul():
                                    for coll_item, coll_data in sorted(entity["Collaboratori"].items(), key=lambda x: (x[1]["Nome"], x[1]["Cognome / Denominazione"])):
                                        coll_string = getCollaboratore(
                                            coll_data)
                                        page.li(_t=coll_string)

                        if len(entity["Clienti"]) > 0:
                            with page.div(id="Clienti", klass="content"):
                                page.h3(
                                    _t=f"I principali clienti dell'entità {entity['Nome']} sono stati:")
                                with page.ul():
                                    for cl_item, cl_data in sorted(entity["Clienti"].items(), key=lambda x: (x[1]["Nome"], x[1]["Cognome"])):
                                        cl_string = getCliente(cl_data, people)
                                        page.li(_t=cl_string)

                        if len(entity["Eventi"]) > 0:
                            with page.div(id="Eventi", klass="content"):
                                page.h3(
                                    _t="Gli eventi signficativi dell'attività antiquariale:")
                                with page.ul():
                                    for ev_item, ev_data in sorted(entity["Eventi"].items(), key=lambda x: x[1]["Anno"]):
                                        ev_string = getEvento(ev_data)
                                        page.li(_t=ev_string)

                        if len(entity["Relazioni"]) > 0:
                            with page.div(id="Relazioni", klass="content"):
                                page.h3(
                                    _t=f"L'entità {entity['Nome']}, durante la sua attività, ha avuto relazioni con:")
                                with page.ul():
                                    for relent_id in entity['Relazioni']:
                                        with page.li():
                                            page.a(
                                                href=f"dettaglio_{relent_id}.html", _t=f"{entities[relent_id]['Nome']}")

                        if len(entity["Bibliografia"]) > 0:
                            with page.div(id="Bibliografia", klass="content"):
                                page.h3(_t="Bibliografia essenziale:")
                                with page.ul():
                                    # print(entity["Bibliografia"].items())
                                    # input()
                                    for bib_item, bib_entry in sorted(entity["Bibliografia"].items(), key=lambda x: (x[1]["Autore"], x[1]["Anno"])):
                                        bib_string = getBib(bib_entry)
                                        page.li(_t=bib_string)

            with page.footer():
                with page.div(klass="footer-container"):
                    with page.div(klass="footer-left"):
                        page.p(_t='Licenza dati e immagini:')
                        page.img(
                            id="license.png", src="../../img/homepage/license.png", alt="License")
                    with page.div(klass="footer-right"):
                        page.p().a(_t="Crediti", href="#")
                        page.p().a(_t="Documentazione", href="#")

    # Get the generated HTML as a string
    html_content = str(page)

    # Optional: Save the HTML to a file
    with open(f"../html/dettagli/dettaglio_{entity['ID']}.html", "w", encoding="utf-8") as f:
        f.write(html_content)


if __name__ == "__main__":
    entities = json.loads(open("../json/entità.json", encoding="utf-8").read())

    for entity in entities:
        build_html(entities[entity], entities)
