// Pagina Persone: chi ricorre in più schede, elenco e rete
// Dati presi dal blocco JSON #persone-data della pagina
(function () {
  "use strict";

  var VISIBILI = 12;   /* righe mostrate prima di "mostra tutti" */

  // Spazio di testo fra un nome e l'altro, per andare a capo
  function spazio(nodo) {
    nodo.appendChild(document.createTextNode(" "));
  }

  function el(tag, klass, testo) {
    var n = document.createElement(tag);
    if (klass) n.className = klass;
    if (testo != null) n.textContent = testo;
    return n;
  }

  function leggiDati() {
    var d = document.getElementById("persone-data");
    if (!d) return null;
    try { return JSON.parse(d.textContent); } catch (e) { return null; }
  }

  // chi ricorre in più schede

  function ponti(dati) {
    return dati
      .filter(function (p) { return p.entities && p.entities.length > 1; })
      .sort(function (a, b) {
        if (b.entities.length !== a.entities.length) {
          return b.entities.length - a.entities.length;
        }
        return (a.sort || a.name).localeCompare(b.sort || b.name, "it");
      });
  }

  function rigaPonte(p) {
    var riga = el("li", "pi-riga");
    riga.setAttribute("data-nodo", idPersona(p));

    // Testa della riga: al click evidenzia il nome nel grafico
    var testa = el("button", "pi-testa");
    testa.type = "button";
    testa.setAttribute("aria-pressed", "false");
    testa.addEventListener("click", function () {
      var id = idPersona(p);
      if (FERMO && ACCESO === id) spegni();
      else accendi(id, true);
    });
    testa.appendChild(el("span", "pi-nome", p.name));
    testa.appendChild(el("span", "pi-ruolo pi-ruolo-" + p.role, p.role));
    testa.appendChild(el("span", "pi-conto", p.entities.length + " schede"));
    riga.appendChild(testa);

    // Barra lunga quanto il numero di schede
    var barra = el("div", "pi-barra");
    var dentro = el("span", "pi-barra-dentro");
    dentro.style.width = (p.entities.length / 14 * 100) + "%";
    barra.appendChild(dentro);
    riga.appendChild(barra);

    var elenco = el("div", "pi-schede");
    p.entities.forEach(function (e, i) {
      if (i) {
        spazio(elenco);
        elenco.appendChild(el("span", "pi-punto", "·"));
        spazio(elenco);
      }
      var a = el("a", "pi-scheda", e.name);
      a.href = "dettagli/dettaglio_" + e.id + ".html";
      elenco.appendChild(a);
    });
    riga.appendChild(elenco);

    return riga;
  }

  function costruisciPonti(radice, dati) {
    var tutti = ponti(dati);
    if (!tutti.length) return;

    var stato = { ruolo: "tutti", aperto: false };

    var sez = el("section", "pi-blocco");
    sez.id = "chi-ricorre";
    sez.appendChild(el("h2", "pi-titolo", "Chi ricorre in più schede"));
    var occhiello = el("p", "pi-occhiello");
    sez.appendChild(occhiello);

    var filtri = el("div", "pi-filtri");
    var bottoni = [
      { chiave: "tutti", testo: "tutti" },
      { chiave: "cliente", testo: "clienti" },
      { chiave: "collaboratore", testo: "collaboratori" }
    ].map(function (f) {
      var b = el("button", "pi-filtro", f.testo);
      b.type = "button";
      b.setAttribute("aria-pressed", String(f.chiave === "tutti"));
      b.addEventListener("click", function () {
        stato.ruolo = f.chiave;
        stato.aperto = false;
        disegna();
      });
      filtri.appendChild(b);
      return { chiave: f.chiave, nodo: b };
    });
    sez.appendChild(filtri);

    var rete = el("div", "pi-rete");
    rete.id = "pi-rete";
    sez.appendChild(rete);
    var didascalia = el("p", "pi-rete-didascalia");
    [["pi-chiave-cliente", "clienti"],
     ["pi-chiave-collaboratore", "collaboratori"],
     ["pi-chiave-casa", "case antiquariali"]].forEach(function (v, i) {
      if (i) didascalia.appendChild(document.createTextNode("\u2003"));
      didascalia.appendChild(el("span", "pi-chiave " + v[0]));
      didascalia.appendChild(document.createTextNode(" " + v[1]));
    });
    didascalia.appendChild(document.createTextNode(
      " — il pallino cresce col numero di legami. Passa sopra un nome " +
      "per vedere solo i suoi legami, cliccalo per fermarli; un clic su " +
      "una casa apre la sua scheda."));
    sez.appendChild(didascalia);

    var lista = el("ul", "pi-lista");
    sez.appendChild(lista);

    var ancora = el("button", "pi-ancora");
    ancora.type = "button";
    ancora.addEventListener("click", function () {
      stato.aperto = !stato.aperto;
      disegna();
    });
    sez.appendChild(ancora);

    function disegna() {
      var righe = stato.ruolo === "tutti"
        ? tutti
        : tutti.filter(function (p) { return p.role === stato.ruolo; });

      bottoni.forEach(function (b) {
        b.nodo.setAttribute("aria-pressed", String(b.chiave === stato.ruolo));
      });

      var nClienti = tutti.filter(function (p) { return p.role === "cliente"; }).length;
      var nColl = tutti.length - nClienti;
      occhiello.textContent =
        nClienti + " clienti e " + nColl + " collaboratori compaiono presso " +
        "più di un antiquario: sono i nomi che passano da una bottega " +
        "all’altra.";

      lista.textContent = "";
      var mostrate = stato.aperto ? righe : righe.slice(0, VISIBILI);
      mostrate.forEach(function (p) { lista.appendChild(rigaPonte(p)); });

      if (righe.length > VISIBILI) {
        ancora.hidden = false;
        ancora.textContent = stato.aperto
          ? "Mostra solo i primi " + VISIBILI
          : "Mostra tutti e " + righe.length;
      } else {
        ancora.hidden = true;
      }

      disegnaRete(rete, righe);
    }

    // Inserisci la sezione nella pagina prima di disegnare
    radice.appendChild(sez);
    disegna();
  }

  // la rete

  // Controlla che amCharts sia caricato
  function libreriaPronta() {
    return typeof window.am5 !== "undefined" &&
           typeof window.am5hierarchy !== "undefined";
  }

  var radiceAm5 = null;
  var ID_RADICE = "radice";

  // Messa a fuoco: nodo acceso, suoi vicini, e se è fissato col click
  var VICINI = {};
  var ACCESO = null;
  var FERMO = false;
  var serieRete = null;

  // Sotto questa soglia di legami il nome si vede solo a fuoco
  var SOGLIA_NOME = 3;

  var PIENO = 0.95;
  var SPENTO = 0.1;
  var LINEA = 0.32;
  var LINEA_SPENTA = 0.05;
  var LINEA_ACCESA = 0.8;

  function aFuoco(id) {
    if (!ACCESO) return true;
    return id === ACCESO || !!(VICINI[ACCESO] && VICINI[ACCESO][id]);
  }

  function idDi(oggetto) {
    var d = oggetto && oggetto.dataItem && oggetto.dataItem.dataContext;
    return d ? d.id : null;
  }

  function idDiDataItem(dataItem) {
    var d = dataItem && dataItem.dataContext;
    return d ? d.id : null;
  }

  function aggiornaFuoco() {
    if (!serieRete) return;

    serieRete.circles.each(function (cerchio) {
      var id = idDi(cerchio);
      if (!id || id === ID_RADICE) return;
      cerchio.set("fillOpacity", aFuoco(id) ? PIENO : SPENTO);
      cerchio.set("strokeOpacity", aFuoco(id) ? 1 : SPENTO);
    });

    serieRete.labels.each(function (etichetta) {
      var d = etichetta.dataItem && etichetta.dataItem.dataContext;
      if (!d || d.id === ID_RADICE) return;
      var forte = d.valore >= SOGLIA_NOME;
      var mostra = ACCESO ? aFuoco(d.id) : forte;
      etichetta.set("forceHidden", !mostra);
      etichetta.set("opacity", mostra ? 1 : 0);
    });

    serieRete.links.each(function (legame) {
      var da = idDiDataItem(legame.get ? legame.get("source") : null);
      var a = idDiDataItem(legame.get ? legame.get("target") : null);
      if (da === ID_RADICE || a === ID_RADICE) {
        legame.set("strokeOpacity", 0);
        return;
      }
      if (!ACCESO) {
        legame.set("strokeOpacity", LINEA);
      } else if (da === ACCESO || a === ACCESO) {
        legame.set("strokeOpacity", LINEA_ACCESA);
      } else {
        legame.set("strokeOpacity", LINEA_SPENTA);
      }
    });

    // Evidenzia la riga corrispondente nell'elenco
    var righe = document.querySelectorAll(".pi-riga");
    Array.prototype.forEach.call(righe, function (riga) {
      var suo = riga.getAttribute("data-nodo");
      var accesa = !!ACCESO && suo === ACCESO;
      riga.classList.toggle("pi-riga-accesa", accesa);
      var b = riga.querySelector(".pi-testa");
      if (b) b.setAttribute("aria-pressed", String(accesa));
    });
  }

  function accendi(id, fermo) {
    ACCESO = id;
    FERMO = !!fermo;
    aggiornaFuoco();
  }

  function spegni() {
    ACCESO = null;
    FERMO = false;
    aggiornaFuoco();
  }

  function eRadice(target) {
    var d = target && target.dataItem && target.dataItem.dataContext;
    return !!d && d.id === ID_RADICE;
  }

  function estRadice(dataItem) {
    var d = dataItem && dataItem.dataContext;
    return !!d && d.id === ID_RADICE;
  }

  function disegnaRete(contenitore, righe) {
    try {
      disegnaReteDavvero(contenitore, righe);
    } catch (e) {
      // Se il grafico non si disegna, nascondi il riquadro
      contenitore.hidden = true;
      if (window.console) window.console.warn("rete non disegnata:", e);
    }
  }

  function disegnaReteDavvero(contenitore, righe) {
    if (!libreriaPronta() || !righe.length) {
      contenitore.hidden = true;
      var d = contenitore.parentNode &&
              contenitore.parentNode.querySelector(".pi-rete-didascalia");
      if (d) d.hidden = true;
      return;
    }
    contenitore.hidden = false;

    // Elimina il grafico precedente e ridisegna da capo
    if (radiceAm5) { radiceAm5.dispose(); radiceAm5 = null; }

    var root = window.am5.Root.new(contenitore.id);
    radiceAm5 = root;
    root.setThemes([window.am5themes_Animated.new(root)]);
    // Rimpicciolisci il logo
    if (root._logo) root._logo.set("scale", 0.85);

    // Su schermo stretto rimpicciolisci pallini e forze
    var stretto = window.innerWidth < 760;

    var serie = root.container.children.push(
      window.am5hierarchy.ForceDirected.new(root, {
        downDepth: 1,
        initialDepth: 1,
        topDepth: 0,
        valueField: "valore",
        categoryField: "nome",
        childDataField: "figli",
        idField: "id",
        linkWithField: "legami",
        centerStrength: stretto ? 0.85 : 0.42,
        manyBodyStrength: stretto ? -5 : -14,
        minRadius: stretto ? 3 : 7,
        maxRadius: stretto ? 12 : 26,
        linkWithStrength: 0.22
      })
    );

    // Case in terracotta, persone in azzurro, collaboratori ad anello vuoto
    var BLU = window.am5.color(0x5593C9);
    var TERRA = window.am5.color(0xC8683C);

    serie.circles.template.setAll({
      fillOpacity: PIENO,
      strokeWidth: 2.2,
      strokeOpacity: 1
    });
    serie.circles.template.adapters.add("fill", function (fill, target) {
      var d = target.dataItem && target.dataItem.dataContext;
      if (!d) return fill;
      if (d.tipo !== "persona") return TERRA;
      // Collaboratore con riempimento bianco
      return d.ruolo === "collaboratore" ? window.am5.color(0xffffff) : BLU;
    });
    serie.circles.template.adapters.add("stroke", function (s2, target) {
      var d = target.dataItem && target.dataItem.dataContext;
      if (!d) return s2;
      return d.tipo === "persona" ? BLU : TERRA;
    });

    // Nascondi la radice invisibile e i suoi legami
    serie.circles.template.adapters.add("radius", function (r, target) {
      return eRadice(target) ? 0 : r;
    });
    serie.labels.template.adapters.add("text", function (t, target) {
      return eRadice(target) ? "" : t;
    });

    // Linee tutte grigie
    serie.links.template.setAll({
      strength: 0.28,
      strokeOpacity: 0.32,
      strokeWidth: 1,
      stroke: window.am5.color(0x8a99a8)
    });
    // Forza il grigio con un adattatore
    serie.links.template.adapters.add("stroke", function () {
      return window.am5.color(0x8a99a8);
    });
    serie.links.template.adapters.add("strokeOpacity", function (o, target) {
      // Nascondi i legami con la radice
      var da = target.get ? target.get("source") : null;
      var a = target.get ? target.get("target") : null;
      return (estRadice(da) || estRadice(a)) ? 0 : o;
    });
    serie.labels.template.setAll({
      fontSize: stretto ? 9 : 11,
      fontFamily: "DM Sans, sans-serif",
      fill: window.am5.color(0x333333),
      text: "{nome}"
    });
    serie.nodes.template.set("tooltipText", "{nome}: {valore} legami");
    serie.nodes.template.adapters.add("tooltipText", function (t, target) {
      return eRadice(target) ? "" : t;
    });
    // Cursore a mano su tutti i nodi
    serie.nodes.template.set("cursorOverStyle", "pointer");

    serie.nodes.template.events.on("pointerover", function (ev) {
      if (FERMO) return;
      var id = idDi(ev.target);
      if (id && id !== ID_RADICE) accendi(id, false);
    });

    serie.nodes.template.events.on("pointerout", function () {
      if (!FERMO) spegni();
    });

    serie.nodes.template.events.on("click", function (ev) {
      var d = ev.target.dataItem && ev.target.dataItem.dataContext;
      if (!d || d.id === ID_RADICE) return;
      if (d.url) { window.location.href = d.url; return; }
      // Click su una persona: fissa o scioglie la messa a fuoco
      if (FERMO && ACCESO === d.id) spegni();
      else accendi(d.id, true);
    });

    serie.data.setAll([datiRete(righe)]);
    serie.set("selectedDataItem", serie.dataItems[0]);

    serieRete = serie;
    // Prima messa a fuoco a disegno pronto
    root.events.once("frameended", function () {
      ACCESO = null;
      FERMO = false;
      aggiornaFuoco();
    });
  }

  // Dati della rete sotto una radice invisibile, più la mappa dei vicini
  function datiRete(righe) {
    var nodi = [];
    var indice = {};
    var vicini = {};

    function collega(a, b) {
      (vicini[a] = vicini[a] || {})[b] = true;
      (vicini[b] = vicini[b] || {})[a] = true;
    }

    righe.forEach(function (p) {
      var id = idPersona(p);
      indice[id] = {
        id: id,
        nome: p.name,
        tipo: "persona",
        ruolo: p.role,
        valore: p.entities.length,
        legami: []
      };
      nodi.push(indice[id]);
      vicini[id] = vicini[id] || {};
    });

    righe.forEach(function (p) {
      p.entities.forEach(function (e) {
        var id = "e:" + e.id;
        if (!indice[id]) {
          indice[id] = {
            id: id,
            nome: e.name,
            tipo: "casa",
            valore: 0,
            legami: [],
            url: "dettagli/dettaglio_" + e.id + ".html"
          };
          nodi.push(indice[id]);
          vicini[id] = vicini[id] || {};
        }
        indice[id].valore++;
        indice[idPersona(p)].legami.push(id);
        collega(idPersona(p), id);
      });
    });

    VICINI = vicini;
    return { id: ID_RADICE, nome: "", valore: 0, figli: nodi };
  }

  function idPersona(p) {
    return "p:" + p.role + ":" + p.name;
  }

  // avvio

  function avvia() {
    var radice = document.getElementById("persone-insieme");
    var dati = leggiDati();
    if (!radice || !dati) return;
    costruisciPonti(radice, dati);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avvia);
  } else {
    avvia();
  }
}());
