import json
import airium as a


def fonte_archivistica(bibitem):
	"""Citta', istituto, fondo, segnatura: quel che abbiamo.

	Una fonte d'archivio non ha autore, anno o titolo. Nell'indice per
	lettera prende quella dell'istituto che la conserva, che e' il nome
	sotto cui la si cerca.
	"""
	pezzi = [(bibitem.get(k) or "").strip() for k in
		 ("Città, editore o rivista", "Istituto", "Fondo", "Segnatura")]
	testo = ", ".join(p for p in pezzi if p)
	istituto = (bibitem.get("Istituto") or "").strip()
	chiave = istituto or testo
	return (chiave[:1] or "?").lower(), istituto, testo


def getBib(bibitem):

	if (bibitem.get("Tipologia") or "").strip() == "fonte archivistica":
		return fonte_archivistica(bibitem)

	first_letter, to_index = "", ""

	s = ""

	anything_before_title = False
	if len(bibitem["Autore"].strip()) > 0:
		s+=f"{bibitem['Autore'].strip()}"
		anything_before_title += True
		first_letter = bibitem['Autore'][0]
		to_index = bibitem['Autore']
	else:
		# Senza autore ci si indicizza sul titolo; se manca anche quello
		# non si va in errore, si finisce sotto "?".
		first_letter = (bibitem['Titolo'] or "?")[0]

	if len(bibitem['Anno'])>0:
		if anything_before_title:
			s+=f" ({bibitem['Anno']})"
		else:
			s+=f"{bibitem['Anno']}"
		anything_before_title += True

	if anything_before_title:
		s+=", "

	s+=f"<i>{bibitem['Titolo']}</i>"

	# Il completamento del titolo dice dove sta lo scritto: il volume che
	# lo contiene, la mostra di cui e' il catalogo, la data dell'asta.
	# Sta subito dopo il titolo e fuori dal corsivo.
	completamento = (bibitem.get('Completamento del titolo') or "").strip()
	if completamento:
		s += f", {completamento}"

	if len(bibitem['Città, editore o rivista'])>0:
		s+=f", {bibitem['Città, editore o rivista']}"

	if len(bibitem["Pagine"])>0:
		s+=f", {bibitem['Pagine']}"

	return first_letter.lower(), to_index, s



def build_html_head(page):
	with page.head():
		page.meta(charset="UTF-8")
		page.meta(name="viewport", content="width=device-width, initial-scale=1.0")
		page.title(_t="Bibliografia")
		page.link(rel="stylesheet", href="../css/tokens.css")
		page.link(rel="stylesheet", href="../css/torna-su.css")
		page.link(rel="stylesheet", href="../css/styles-bibliografia.css")
		# Tipografia condivisa con il sito dei cataloghi d'asta.
		page.link(rel="preconnect", href="https://fonts.googleapis.com")
		page.link(rel="preconnect", href="https://fonts.gstatic.com", crossorigin="")
		page.link(href="https://fonts.googleapis.com/css2?"
		               "family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&"
		               "family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&"
		               "display=swap", rel="stylesheet")


ZERI = "https://fondazionezeri.unibo.it/it/homepage"


def build_header(page):
	# Il nome del progetto e' il link alla home; il logo della
	# Fondazione sta a destra e porta al sito dell'istituto.
	with page.header():
		with page.div(klass="header-container"):
			page.a(klass="marchio", href="../index.html", _t="Mercato dell'arte")
			page.button(klass="menu-toggle", type="button",
				            **{"aria-label": "Apri menu"}, _t="&#9776;")
			with page.div(klass="testata-destra"):
				with page.nav():
					with page.ul():
						with page.li():
							page.a(_t="Progetto", href="progetto.html")
							page.a(_t="Antiquari", href="antiquari.html")
							page.a(_t="Luoghi", href="luoghi.html")
							page.a(_t="Eventi", href="eventi.html")
							page.a(_t="Persone", href="persone.html")
							page.a(_t="Bibliografia", href="bibliografia.html")
				page.span(klass="testata-filo")
				with page.a(klass="testata-ente", href=ZERI, target="_blank",
					            rel="noopener",
					            title="Fondazione Federico Zeri, Universit\u00e0 di Bologna"):
					page.img(src="../img/homepage/logo.png", alt="Fondazione Federico Zeri")

def build_html():

	bibliografia = json.loads(open("json/bibliografia.json").read())

	bib_elements = {}

	for item in bibliografia:
		first_letter, to_index, bib_string = getBib(bibliografia[item])
		if not first_letter in bib_elements:
			bib_elements[first_letter] = []
		bib_elements[first_letter].append((to_index, bib_string))

	page = a.Airium()
	page('<!DOCTYPE html>')

	with page.html(lang="it"):

		build_html_head(page)

		with page.body():
			build_header(page)

			with page.main():

				with page.section(id="bibliografia"):

					for letter in bib_elements:
						with page.div(klass="column"):
							page.h2(_t=f"{letter}")
							sorted_elements = sorted(bib_elements[letter])
							for bib_element in sorted_elements:
								page.p(_t=f"{bib_element[1]}")

			with page.footer():
				with page.div(klass="footer-container"):
					with page.div(klass="footer-ente"):
						with page.a(href=ZERI, target="_blank", rel="noopener"):
							page.img(src="../img/homepage/logo-negativo.png",
								 alt="Fondazione Federico Zeri")
						page.p(_t='Progetto della <a href="' + ZERI + '" target="_blank" rel="noopener">Fondazione Federico Zeri</a>, Universit\u00e0 di Bologna.')
					with page.div(klass="footer-left"):
						page.p(_t='Licenza dati e immagini:')
						page.img(id="license.png", src="../img/homepage/license.png", alt="License")
					with page.div(klass="footer-right"):
						page.p().a(_t="Crediti", href="#")
						page.p().a(_t="Documentazione", href="#")

			# La pagina è alta più di 19.000 pixel: serve un modo per
			# risalire senza trascinare.
			page.script(src="../script/menu.js", defer="")
			page.script(src="../script/torna-su.js", defer="")

	# Get the generated HTML as a string
	html_content = str(page)


	# Optional: Save the HTML to a file
	with open(f"html/bibliografia.html", "w") as f:
		f.write(html_content)

if __name__ == "__main__":
	build_html()