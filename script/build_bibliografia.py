import json
import airium as a


def getBib(bibitem):

	first_letter, to_index = "", ""

	s = ""

	anything_before_title = False
	if len(bibitem["Autore"].strip()) > 0:
		s+=f"{bibitem['Autore'].strip()}"
		anything_before_title += True
		first_letter = bibitem['Autore'][0]
		to_index = bibitem['Autore']
	else:
		first_letter = bibitem['Titolo'][0]

	if len(bibitem['Anno'])>0:
		if anything_before_title:
			s+=f" ({bibitem['Anno']})"
		else:
			s+=f"{bibitem['Anno']}"
		anything_before_title += True

	if anything_before_title:
		s+=", "

	s+=f"<i>{bibitem['Titolo']}</i>"

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
		page.link(rel="stylesheet", href="../css/styles-bibliografia.css")
		page.link(href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap", rel="stylesheet")
		page.link(href="https://fonts.googleapis.com/css2?family=Libre+Bodoni:wght@400;700&display=swap", rel="stylesheet")


def build_header(page):

	with page.header():
		with page.div(klass="header-container"):
			with page.a(href="../index.html"):
				page.img(id="logo.png", src="../img/homepage/logo.png", alt="Fondazione Federico Zeri")
			with page.nav():
				with page.ul():
					with page.li():
						page.a(_t="Progetto", href="progetto.html")
						page.a(_t="Antiquari", href="antiquari.html")
						page.a(_t="Luoghi", href="luoghi.html")
						page.a(_t="Eventi", href="eventi.html")
						page.a(_t="Persone", href="persone.html")
						page.a(_t="Bibliografia", href="bibliografia.html")

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
					with page.div(klass="footer-left"):
						page.p(_t='Licenza dati e immagini:')
						page.img(id="license.png", src="../img/homepage/license.png", alt="License")
					with page.div(klass="footer-right"):
						page.p().a(_t="Crediti", href="#")
						page.p().a(_t="Documentazione", href="#")

	# Get the generated HTML as a string
	html_content = str(page)


	# Optional: Save the HTML to a file
	with open(f"html/bibliografia.html", "w") as f:
		f.write(html_content)

if __name__ == "__main__":
	build_html()