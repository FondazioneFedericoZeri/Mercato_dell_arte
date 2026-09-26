import os
import re
import json
import unicodedata
import airium as a


# ── Nome del file delle entita' ────────────────────────────────────
# Come in build_dettaglio.py: il file sta passando da "entità" a
# "entita" senza accento, e finche' la migrazione non e' conclusa si
# accetta il nome che c'e'.
def _file_entita(*candidati):
	for c in candidati:
		if os.path.isfile(c):
			return c
	return candidati[0]


def ENTITA_JSON():
	return _file_entita("json/entita.json", "json/entità.json")


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


def collegamento(valore):
	"""Un indirizzo web si clicca, non si legge.

	Cinque voci in linea hanno l'indirizzo scritto per esteso in una
	colonna qualsiasi — quella di Colnaghi nell'Oxford Dictionary e'
	lunga 117 caratteri. Stampato cosi' non si puo' nemmeno mandare a
	capo: sporgeva dalla colonna e portava l'intera pagina a scorrere
	di lato. Qui diventa un collegamento, con scritto il sito.
	"""
	v = (valore or "").strip()
	if not v.startswith(("http://", "https://")):
		return v
	dominio = re.sub(r"^https?://(www\.)?", "", v).split("/")[0]
	return (f'<a href="{v}" target="_blank" rel="noopener" '
		f'class="bib-web">{dominio}</a>')


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
		s+=f", {collegamento(bibitem['Città, editore o rivista'])}"

	# Qui i numeri di pagina non si mostrano. Servono quando una fonte
	# viene citata a proposito di un antiquario — e infatti restano
	# nelle schede di dettaglio — ma questo elenco e' un catalogo di
	# fonti, non un apparato di note: "pp. 108-119" non aiuta a
	# riconoscere lo scritto, allunga la riga e basta.
	#
	# L'eccezione sono due voci che in questa colonna hanno
	# l'indirizzo web al posto delle pagine: un indirizzo non e' un
	# numero di pagina, ed e' l'unico modo per arrivare allo scritto.
	pagine = (bibitem.get("Pagine") or "").strip()
	if pagine.startswith(("http://", "https://")):
		s += f", {collegamento(pagine)}"

	return first_letter.lower(), to_index, s


# ══════════════════════════════════════════════════════════════════
#  Le tre nature delle fonti
#
#  La bibliografia e' cresciuta fino a contenere tre cose che si
#  consultano in modi diversi: uno scritto lo si cerca per autore,
#  un'intervista per l'antiquario che parla, un documento d'archivio
#  per il luogo in cui e' conservato. Un elenco alfabetico solo li
#  teneva insieme senza servire nessuno dei tre.
# ══════════════════════════════════════════════════════════════════

MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
	"luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]

LONTANO = (9999, 99, 99)   # le fonti senza data vanno in fondo

_avvisi = []


def data_intervista(valore):
	"""Da una data scritta in tre modi diversi a una sola.

	Nel foglio convivono tre grafie, tutte legittime nel punto in cui
	sono nate: "2023-06-04 00:00:00" arriva dalle celle-data di Excel,
	"2/15/2023" dall'esportazione americana della stessa tabella,
	"20/05/2026" da chi l'ha scritta a mano all'italiana. Qui si
	riconoscono tutte e tre e si restituisce (chiave, testo leggibile).

	Fra giorno e mese decide il numero: uno dei due supera il 12 e
	scioglie il dubbio. Se non succede si legge all'italiana, com'e'
	scritto oggi il foglio, e si lascia un avviso nel registro della CI.
	"""
	v = (valore or "").strip()
	if not v:
		return LONTANO, ""

	iso = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})", v)
	if iso:
		anno, mese, giorno = (int(x) for x in iso.groups())
	else:
		sbarre = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$", v)
		if sbarre:
			primo, secondo, anno = (int(x) for x in sbarre.groups())
			if primo > 12:                 # 20/05/2026: all'italiana
				giorno, mese = primo, secondo
			elif secondo > 12:             # 2/15/2023: all'americana
				mese, giorno = primo, secondo
			else:
				giorno, mese = primo, secondo
				_avvisi.append(f"data ambigua, letta all'italiana: {v}")
		elif re.match(r"^\d{4}$", v):
			# Solo l'anno: dopo i giorni noti di quell'anno.
			return (int(v), 13, 0), v
		else:
			_avvisi.append(f"data non riconosciuta: {v}")
			return LONTANO, v

	if not (1 <= mese <= 12) or not (1 <= giorno <= 31):
		_avvisi.append(f"data fuori calendario: {v}")
		return LONTANO, v

	return (anno, mese, giorno), f"{giorno} {MESI[mese - 1]} {anno}"


def ordina_come_parola(testo):
	"""Accenti e maiuscole fuori dall'ordinamento: in un elenco
	alfabetico "Ávila" sta fra Avezzano e Avola, non dopo la zeta."""
	piano = unicodedata.normalize("NFKD", (testo or ""))
	return "".join(c for c in piano if not unicodedata.combining(c)).lower()


def entita_per_fonte():
	"""Per ogni fonte, le entita' che la citano.

	Le interviste e i documenti d'archivio non dicono da soli a chi si
	riferiscono: lo dice la colonna Bibliografia delle entita'. Qui si
	gira quel legame, per poter raggruppare le interviste e per mettere
	accanto a ogni documento l'antiquario di cui parla.
	"""
	legame = {}
	percorso = ENTITA_JSON()
	if not os.path.isfile(percorso):
		return legame
	entita = json.loads(open(percorso, encoding="utf-8").read())
	for eid, ent in entita.items():
		nome = (ent.get("Nome") or "").strip() or eid
		for bid in (ent.get("Bibliografia") or {}):
			legame.setdefault(bid, []).append((nome, eid))
	for bid in legame:
		legame[bid].sort(key=lambda x: ordina_come_parola(x[0]))
	return legame


def riga_intervista(bibitem):
	"""Un'intervista raccolta sul campo si legge "chi, dove, quando";
	una uscita su una rivista e' uno scritto come gli altri."""
	autore = (bibitem.get("Autore") or "").strip()
	titolo = (bibitem.get("Titolo") or "").strip()
	luogo = (bibitem.get("Città, editore o rivista") or "").strip()
	_, quando = data_intervista(bibitem.get("Anno"))

	if autore:
		return getBib(bibitem)[2], ""

	# "Intervista Tullio Calabi, Torino" con accanto la colonna Citta'
	# uguale: la citta' si legge una volta sola.
	if luogo and titolo.lower().endswith(", " + luogo.lower()):
		titolo = titolo[: -(len(luogo) + 2)].rstrip()

	meta = ", ".join(p for p in (luogo, quando) if p)
	return titolo, meta


def righe_archivio(bibitem):
	"""Citta', istituto, e poi quel che identifica il documento."""
	fondo = (bibitem.get("Fondo") or "").strip()
	segnatura = (bibitem.get("Segnatura") or "").strip()
	return ", ".join(p for p in (fondo, segnatura) if p)


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
		# Le tre sezioni si aprono una alla volta, ma solo se il
		# copione gira: senza questa riga resterebbero tutte chiuse
		# per chi ha javascript spento, e la pagina sarebbe vuota.
		page.script(_t="document.documentElement.classList.add('con-js');")


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
					# Una voce per <li>, come nelle altre pagine. Prima
					# stavano tutte e sei nello stesso <li>: le separava
					# solo lo spazio fra i tag, quindi erano piu' vicine
					# che altrove, e sul telefono il menu' a tendina non
					# le metteva in colonna.
					with page.ul(klass="menu"):
						for voce, href in (("Progetto", "progetto.html"),
						                   ("Antiquari", "antiquari.html"),
						                   ("Luoghi", "luoghi.html"),
						                   ("Eventi", "eventi.html"),
						                   ("Persone", "persone.html"),
						                   ("Bibliografia", "bibliografia.html")):
							with page.li():
								page.a(_t=voce, href=href)
				page.span(klass="testata-filo")
				with page.a(klass="testata-ente", href=ZERI, target="_blank",
					            rel="noopener",
					            title="Fondazione Federico Zeri, Università di Bologna"):
					page.img(src="../img/homepage/logo.png", alt="Fondazione Federico Zeri")


def build_footer(page):
	with page.footer():
		with page.div(klass="footer-container"):
			with page.div(klass="footer-ente"):
				with page.a(href=ZERI, target="_blank", rel="noopener"):
					page.img(src="../img/homepage/logo-negativo.png",
						 alt="Fondazione Federico Zeri")
				page.p(_t='Progetto della <a href="' + ZERI + '" target="_blank" rel="noopener">Fondazione Federico Zeri</a>, Università di Bologna.')
			# Stesso markup delle pagine scritte a mano. Prima il bollino
			# della licenza stava fuori dal <p> e i due link stavano in
			# due <p> distinti: nel footer a tre colonne finivano su piu'
			# righe e la barra si scompaginava, alta 109px invece di 72.
			with page.div(klass="footer-left"):
				page.p(_t='Licenza dati e immagini: <img id="license.png" '
					  'src="../img/homepage/license.png" alt="License">')
			with page.div(klass="footer-right"):
				page.p(_t='<a href="crediti.html">Crediti</a> | '
					  '<a href="documentazione.html">Documentazione</a>')


def carta(page, chiave, quante, titolo, descrizione):
	# Nome e numero sulla stessa riga, la descrizione sotto: il numero
	# e' un dato della raccolta, non un'insegna, e messo in cima da
	# solo pesava piu' del nome.
	with page.button(klass="bib-carta", type="button",
			 **{"data-sezione": chiave, "aria-expanded": "false",
			    "aria-controls": "sezione-" + chiave}):
		with page.span(klass="bib-carta-riga"):
			page.span(klass="bib-carta-t", _t=titolo)
			page.span(klass="bib-carta-n", _t=str(quante))
		page.span(klass="bib-carta-d", _t=descrizione)


def senza_link(testo):
	"""Il testo della voce senza i collegamenti che contiene.

	Nell'anteprima non si deve poter cliccare niente: i collegamenti
	spariscono qui, dal markup, non con una regola di stile che li
	lascerebbe comunque raggiungibili col tabulatore."""
	return re.sub(r"</?a\b[^>]*>", "", testo or "")


def voci_anteprima(stampa, interviste, archivio, legame, quante=4):
	"""Le prime voci di ciascuna delle tre raccolte.

	Una colonna per raccolta, nello stesso ordine delle carte qui
	sopra. Prima l'anteprima pescava solo fra le fonti a stampa: stava
	sotto tre carte e faceva vedere il contenuto di una sola, per
	giunta le prime in ordine alfabetico, che sono quasi tutte
	cataloghi della stessa casa d'aste.

	Le tre forme si riconoscono anche sbiadite, perche' sono scritte
	in modo diverso: una citazione bibliografica, un nome con luogo e
	data, una segnatura d'archivio.
	"""
	# fonti a stampa: in ordine alfabetico, come nella sezione
	a_stampa = []
	for lettera in sorted(stampa):
		for _, riga in sorted(stampa[lettera],
				      key=lambda v: ordina_come_parola(v[0])):
			a_stampa.append(senza_link(riga))
			if len(a_stampa) >= quante:
				break
		if len(a_stampa) >= quante:
			break

	# interviste: nome dell'entita' e poi luogo e data, come si leggono
	viste = []
	for bid, item in interviste.items():
		nome = (legame.get(bid) or [(None, None)])[0][0]
		testo, meta = riga_intervista(item)
		riga = ", ".join(p for p in (testo, meta) if p)
		if nome:
			riga = f"{nome} — {riga}" if riga else nome
		if riga:
			viste.append(senza_link(riga))
		if len(viste) >= quante:
			break

	# archivio: citta', istituto e poi fondo e segnatura. Le tre parti
	# stanno in colonne diverse del foglio dati e nella sezione vera
	# fanno da titoletti; qui vanno messe in fila, se no la voce si
	# riduce a un fondo senza dire dove si trova.
	#
	# Si saltano le voci che restano troppo scarne — c'e' chi ha solo
	# la citta' — e si prende una citta' diversa per riga: le prime
	# quattro del file sono tutte veneziane e la colonna sembrava
	# ripetere quattro volte la stessa cosa.
	carte = []
	citta_prese = set()
	for _, item in archivio.items():
		pezzi = [(item.get(k) or "").strip() for k in
			 ("Città, editore o rivista", "Istituto", "Fondo", "Segnatura")]
		riga = senza_link(", ".join(p for p in pezzi if p))
		luogo = pezzi[0]
		if len(riga) < 24 or luogo in citta_prese:
			continue
		citta_prese.add(luogo)
		carte.append(riga)
		if len(carte) >= quante:
			break

	return [a_stampa, viste, carte]


def anteprima(page, stampa, interviste, archivio, legame):
	"""Uno scorcio sfumato di quel che c'e' dietro le tre carte.

	Con le tre sezioni chiuse — come la pagina si apre — sotto le carte
	restavano ottocento pixel di bianco fino al footer, e non si capiva
	se sotto ci fosse qualcosa o se la pagina finisse li'.

	Tre colonne, una per carta, ciascuna con le prime voci vere della
	sua raccolta, sbiadite verso il basso. Non e' roba su cui si possa
	fare niente — niente clic, niente tabulatore, e i lettori di
	schermo la saltano, se no troverebbero due volte le stesse voci.
	"""
	colonne = voci_anteprima(stampa, interviste, archivio, legame)

	with page.div(klass="bib-anteprima", **{"aria-hidden": "true"}):
		with page.div(klass="bib-anteprima-colonne"):
			for voci in colonne:
				with page.div(klass="bib-anteprima-colonna"):
					for riga in voci:
						page.p(_t=riga)
		page.p(klass="bib-anteprima-invito",
		       _t="Scegli una delle tre raccolte qui sopra "
			  "per aprire l\u2019elenco.")


def sezione_stampa(page, stampa):
	"""L'elenco alfabetico di sempre, su tre colonne.

	Con 400 voci la lettera va anche raggiunta: in cima c'e' l'alfabeto,
	e le lettere ora sono in ordine. Prima si seguiva l'ordine in cui
	comparivano nel file, e dopo la zeta ne arrivavano altre sei.
	"""
	lettere = sorted(stampa)

	with page.section(id="sezione-stampa", klass="bib-sezione"):
		with page.nav(klass="bib-alfabeto", **{"aria-label": "Vai alla lettera"}):
			for lettera in lettere:
				page.a(href=f"#lettera-{lettera}", _t=lettera.upper())

		with page.div(id="bibliografia"):
			for lettera in lettere:
				with page.div(klass="column"):
					page.h2(id=f"lettera-{lettera}", _t=lettera)
					for _, riga in sorted(stampa[lettera],
							      key=lambda v: ordina_come_parola(v[0])):
						page.p(_t=riga)


def sezione_interviste(page, interviste, legame):
	"""Raggruppate per entita', dentro in ordine di data.

	Chi cerca un'intervista cerca una persona, non una data: il gruppo
	porta il nome dell'entita' e rimanda alla sua scheda. Le poche che
	non sono ancora collegate a nessuna entita' restano in fondo, dove
	si vedono.
	"""
	gruppi = {}
	for bid, item in interviste.items():
		for nome, eid in legame.get(bid, [(None, None)]):
			gruppi.setdefault((nome, eid), []).append((bid, item))

	senza = gruppi.pop((None, None), None)
	ordinati = sorted(gruppi.items(), key=lambda g: ordina_come_parola(g[0][0]))

	with page.section(id="sezione-interviste", klass="bib-sezione"):
		for (nome, eid), voci in ordinati:
			with page.div(klass="bib-gruppo"):
				with page.h2(klass="bib-gruppo-titolo"):
					page.a(href=f"dettagli/dettaglio_{eid}.html", _t=nome)
				scrivi_interviste(page, voci)

		if senza:
			with page.div(klass="bib-gruppo"):
				page.h2(klass="bib-gruppo-titolo bib-gruppo-orfano",
					_t="Non ancora collegate a un'entità")
				scrivi_interviste(page, senza)


def scrivi_interviste(page, voci):
	voci = sorted(voci, key=lambda v: data_intervista(v[1].get("Anno"))[0])
	with page.ul(klass="bib-elenco"):
		for _, item in voci:
			testo, meta = riga_intervista(item)
			with page.li():
				page(testo)
				if meta:
					page.span(klass="bib-meta", _t=meta)


def sezione_archivio(page, archivio, legame):
	"""Ordinamento topografico: prima il luogo, poi l'istituto.

	E' il modo in cui si cercano i documenti: si va in un archivio, non
	si cerca un autore. Accanto a ogni pezzo sta l'entita' per cui e'
	stato consultato, che e' l'altra strada per arrivarci.
	"""
	citta = {}
	for bid, item in archivio.items():
		luogo = (item.get("Città, editore o rivista") or "").strip() or "Senza luogo"
		istituto = (item.get("Istituto") or "").strip() or "Istituto non indicato"
		citta.setdefault(luogo, {}).setdefault(istituto, []).append((bid, item))

	with page.section(id="sezione-archivio", klass="bib-sezione"):
		for luogo in sorted(citta, key=ordina_come_parola):
			with page.div(klass="bib-luogo"):
				page.h2(klass="bib-luogo-titolo", _t=luogo)
				for istituto in sorted(citta[luogo], key=ordina_come_parola):
					page.h3(klass="bib-istituto", _t=istituto)
					with page.ul(klass="bib-elenco"):
						for bid, item in sorted(citta[luogo][istituto],
									key=lambda v: ordina_come_parola(righe_archivio(v[1]))):
							with page.li():
								page(righe_archivio(item) or "—")
								rimandi = legame.get(bid, [])
								if rimandi:
									with page.span(klass="bib-meta bib-rimando"):
										page("→ ")
										for n, (nome, eid) in enumerate(rimandi):
											if n:
												page(", ")
											page.a(href=f"dettagli/dettaglio_{eid}.html", _t=nome)


def build_html():

	bibliografia = json.loads(open("json/bibliografia.json", encoding="utf-8").read())
	legame = entita_per_fonte()

	stampa, interviste, archivio = {}, {}, {}

	for bid, item in bibliografia.items():
		tipologia = (item.get("Tipologia") or "").strip()
		if tipologia == "fonte archivistica":
			archivio[bid] = item
		elif tipologia == "intervista":
			interviste[bid] = item
		else:
			lettera, indice, riga = getBib(item)
			stampa.setdefault(lettera, []).append((indice, riga))

	page = a.Airium()
	page('<!DOCTYPE html>')

	with page.html(lang="it"):

		build_html_head(page)

		with page.body():
			build_header(page)

			with page.main():

				# Solo il titolo: il capoverso che spiegava le tre
				# nature delle fonti diceva a parole quel che le tre
				# carte qui sotto mostrano da sole, con il loro
				# sottotitolo e il loro numero.
				with page.section(klass="bib-intro"):
					page.h1(klass="titolo-pagina", _t="Bibliografia")

				# I testi dei tre pulsanti stanno QUI e non in
				# html/bibliografia.html: la pagina e' rigenerata da questo
				# script (workflow update-html.yml) a ogni modifica di un
				# TSV o di un JSON, e una correzione fatta solo nell'HTML
				# viene sovrascritta.
				with page.nav(klass="bib-scelta", **{"aria-label": "Tipo di fonte"}):
					carta(page, "stampa", sum(len(v) for v in stampa.values()),
					      "Fonti a stampa",
					      "Monografie, articoli, cataloghi d’asta, tesi. "
					      "In ordine alfabetico per autore.")
					carta(page, "interviste", len(interviste),
					      "Interviste",
					      "Le voci degli antiquari e dei loro eredi, raccolte sul "
					      "campo. Raggruppate per entità antiquariali.")
					carta(page, "archivio", len(archivio),
					      "Fonti archivistiche",
					      "Fondi, cartelle o documenti consultati. "
					      "In ordine per luogo di conservazione.")

				anteprima(page, stampa, interviste, archivio, legame)

				sezione_stampa(page, stampa)
				sezione_interviste(page, interviste, legame)
				sezione_archivio(page, archivio, legame)

			build_footer(page)

			page.script(src="../script/menu.js", defer="")
			page.script(src="../script/bibliografia-sezioni.js", defer="")
			# Le sezioni sono lunghe: serve un modo per risalire
			# senza trascinare.
			page.script(src="../script/torna-su.js", defer="")

	with open("html/bibliografia.html", "w", encoding="utf-8") as f:
		f.write(str(page))

	print(f"bibliografia: {sum(len(v) for v in stampa.values())} a stampa, "
	      f"{len(interviste)} interviste, {len(archivio)} archivistiche")
	for avviso in sorted(set(_avvisi)):
		print("  avviso:", avviso)


if __name__ == "__main__":
	build_html()
