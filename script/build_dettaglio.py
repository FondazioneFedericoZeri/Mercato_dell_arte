import json
import airium as a
import docx


def getText(filename):
    doc = docx.Document(filename)
    fullText = []
    for para in doc.paragraphs:
        if len(para.text.strip()) > 0:
            fullText.append(para.text)
    return fullText

def getTXT(filename):
    fullText = []
    with open(filename) as fin:
        for line in fin:
            line = line.strip()
            if len(line)>0:
                fullText.append(line)
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
        open("json/didascalie.json", encoding="utf-8").read())
    people = json.loads(open("json/persone.json", encoding="utf-8").read())

    imgs = entity["Foto gallery"]

    page = a.Airium()
    page('<!DOCTYPE html>')

    with page.html(lang="it"):

        build_html_head(page)

        with page.body():
            build_header(page)

            with page.main():
                print(entity["ID"], len(imgs))

                with page.section(id="image-gallery"):
                    next_div_class = "gallery-wrapper"
                    if len(imgs) == 0:
                        next_div_class = "gallery-wrapper no-imgs"
                    with page.div(klass=next_div_class):
                        page.h2(klass="gallery-title", _t=entity["Nome"])

                        if len(imgs) == 1:
                            with page.div(id="single-image-container"):
                                desc = entity['Nome']
                                img = f"{imgs[0]}.jpg"

                                if img in images_description:
                                    desc = images_description[img]["Didascalia"]

                                page.img(src=f"../../img/slider-antiquari/{img}", alt=f"{desc}")
                                page.div(_t=f"{desc}", klass="caption overlay-caption")

                        elif len(imgs) > 1:
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
                                            onclick="prevSlide()", _t = "<")
                                page.button("&#10095;", klass="next",
                                            onclick="nextSlide()", _t = ">")


                with page.div(klass="dual-content-wrapper"):
                    with page.div(klass="tab-container"):
                        with page.ul(klass="tab-list"):
                            page.li(_t="Dati biografici", klass="tab active",
                                    data_content="Bio")
                            page.li(_t="Albero familiare", klass="tab",
                                    data_content="Persone")
                            page.li(_t="Luoghi", klass="tab",
                                    data_content="Localizzazioni")

                            tot_relations = len(entity["Relazioni"]) + len(entity["Collaboratori"]) + len(entity["Clienti"])
                            if tot_relations > 0:
                                page.li(_t="Relazioni", klass="tab",
                                        data_content="Relazioni")

                            if len(entity["Eventi"]) > 0:
                                page.li(_t="Eventi", klass="tab",
                                        data_content="Eventi")

                            if len(entity["Bibliografia"]) > 0:
                                page.li(_t="Bibliografia", klass="tab",
                                        data_content="Bibliografia")

                            page.li(_t="Opere trattate",
                                    klass="tab", data_content="Opere trattate")

                    with page.div(klass="content-card"):
                        with page.div(id="Bio", klass="content active-content"):
                            # content = getText(f"../bio/{entity['Bio']}.docx")
                            content = getTXT(f"bio-txt/{entity['Bio']}.txt")
                            # page.h3(_t=f"{content[0]}")
                            for paragraph in content:
                                page.p(_t=paragraph)

                        with page.div(id="Persone", klass="content"):
                            page.h3(
                                _t=f"Relazioni familiari:")
                            page.div(id="albero-genealogico")

                        with page.div(id="Localizzazioni", klass="content"):
                            with page.section(id="map"):
                                page.div(id="chartdiv")

                        # if len(entity["Collaboratori"]) > 0:
                        #     with page.div(id="Collaboratori", klass="content"):
                        #         page.h3(
                        #             _t=f"Hanno collaborato con l'entità {entity['Nome']}:")
                        #         with page.ul():
                        #             for coll_item, coll_data in sorted(entity["Collaboratori"].items(), key=lambda x: (x[1]["Nome"], x[1]["Cognome / Denominazione"])):
                        #                 coll_string = getCollaboratore(
                        #                     coll_data)
                        #                 page.li(_t=coll_string)

                        # if len(entity["Clienti"]) > 0:
                        #     with page.div(id="Clienti", klass="content"):
                        #         page.h3(
                        #             _t=f"I principali clienti dell'entità {entity['Nome']} sono stati:")
                        #         with page.ul():
                        #             for cl_item, cl_data in sorted(entity["Clienti"].items(), key=lambda x: (x[1]["Nome"], x[1]["Cognome"])):
                        #                 cl_string = getCliente(cl_data, people)
                        #                 page.li(_t=cl_string)

                        if len(entity["Eventi"]) > 0:
                            with page.div(id="Eventi", klass="content"):
                                page.h3(
                                    _t="Eventi signficativi nell'attività antiquariale:")
                                with page.ul():
                                    for ev_item, ev_data in sorted(entity["Eventi"].items(), key=lambda x: x[1]["Anno"]):
                                        ev_string = getEvento(ev_data)
                                        page.li(_t=ev_string)

                        if tot_relations > 0:
                            with page.div(id="Relazioni", klass="content"):

                                page.h3(_t=f"Altri antiquari:")
                                with page.ul():
                                    for relent_id in entity['Relazioni']:
                                        with page.li():
                                            page.a(
                                            href=f"dettaglio_{relent_id}.html", _t=f"{entities[relent_id]['Nome']}")
                                page.h3(_t=f"Clienti:")
                                with page.ul():
                                    for cl_item, cl_data in sorted(entity["Clienti"].items(), key=lambda x: (x[1]["Nome"], x[1]["Cognome"])):
                                        cl_string = getCliente(cl_data, people)
                                        page.li(_t=cl_string)
                                page.h3(_t=f"Collaboratori:")
                                with page.ul():
                                    for coll_item, coll_data in sorted(entity["Collaboratori"].items(), key=lambda x: (x[1]["Nome"], x[1]["Cognome / Denominazione"])):
                                        coll_string = getCollaboratore(
                                            coll_data)
                                        page.li(_t=coll_string)

                        if len(entity["Bibliografia"]) > 0:
                            with page.div(id="Bibliografia", klass="content"):
                                interviste = {bib_item:bib_entry for bib_item, bib_entry in entity["Bibliografia"].items() if bib_entry["Tipologia"] == "intervista"}
                                altra_bibliografia = {bib_item:bib_entry for bib_item, bib_entry in entity["Bibliografia"].items() if not bib_entry["Tipologia"] == "intervista"}
                                if len(altra_bibliografia)>0:
                                    page.h3(_t="Bibliografia essenziale:")
                                    with page.ul():
                                        # print(entity["Bibliografia"].items())
                                        # input()

                                        for bib_item, bib_entry in sorted(altra_bibliografia.items(), key=lambda x: (x[1]["Autore"], x[1]["Anno"])):
                                            bib_string = getBib(bib_entry)
                                            page.li(_t=bib_string)
                                if len(interviste)>0:
                                    page.h3(_t="Interviste:")
                                    with page.ul():
                                        for bib_item, bib_entry in sorted(interviste.items(), key=lambda x: (x[1]["Autore"], x[1]["Anno"])):
                                            bib_string = getBib(bib_entry)
                                            page.li(_t=bib_string)

                        with page.div(id="Opere trattate", klass="content"):
                            with page.p():
                                page("Vedi le opere transitate presso l'antiquario presenti nel ")
                                with page.a(href=entity["Link Zeri"], klass="linkBio"):
                                    page("catalogo della Fondazione Zeri")


            with page.footer():
                with page.div(klass="footer-container"):
                    with page.div(klass="footer-left"):
                        page.p(_t='Licenza dati e immagini:')
                        page.img(
                            id="license.png", src="../../img/homepage/license.png", alt="License")
                    with page.div(klass="footer-right"):
                        with page.p():
                            with page.a(href="../../html/crediti.html"):
                                page("Crediti")
                            page("|")
                            with page.a(href="https://github.com/FondazioneFedericoZeri/Mercato_dell_arte",
                                        target="_blank"):
                                page("Documentazione")


    # Get the generated HTML as a string
    html_content = str(page)

    # Optional: Save the HTML to a file
    with open(f"html/dettagli/dettaglio_{entity['ID']}.html", "w", encoding="utf-8") as f:
        f.write(html_content)


if __name__ == "__main__":
    entities = json.loads(open("json/entità.json", encoding="utf-8").read())

    for entity in entities:
        build_html(entities[entity], entities)
