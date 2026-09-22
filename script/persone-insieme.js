/* ══════════════════════════════════════════════════════════════
   Pagina Persone — due letture d'insieme.

   La pagina elenca 522 nomi in tre colonne e si cerca benissimo,
   ma solo se si sa gia' chi cercare. Due cose i dati le dicono
   gia' e non si vedevano da nessuna parte:

   1. Chi ricorre in piu' schede. 28 clienti e 20 collaboratori
      compaiono presso piu' di un antiquario: sono le persone che
      passano da una bottega all'altra e tengono insieme il
      mercato. Prima si potevano scoprire solo aprendo le schede
      una per una e tenendo il conto a mente.

   2. Famiglie e antiquari soli. 47 entita' su 95 hanno una
      persona sola, le altre fino a nove.

   I dati sono gli stessi della ricerca: il blocco JSON
   #persone-data che build_persone.py scrive nella pagina. Qui non
   si legge nessun file in piu' e non si tocca script/persone.js.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var VISIBILI = 12;   /* righe mostrate prima di "mostra tutti" */

  /* Fra un nome e l'altro ci vuole uno spazio vero, non solo il
     margine del punto: senza uno spazio nel testo il browser legge
     tutta la fila come una parola sola e non va mai a capo. */
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

  /* --- 1. chi ricorre in piu' schede ------------------------- */

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

    var testa = el("div", "pi-testa");
    testa.appendChild(el("span", "pi-nome", p.name));
    testa.appendChild(el("span", "pi-ruolo pi-ruolo-" + p.role, p.role));
    testa.appendChild(el("span", "pi-conto", p.entities.length + " schede"));
    riga.appendChild(testa);

    /* La barra e' lunga quanto il numero di schede: l'occhio vede
       la differenza fra 14 e 2 senza rileggere le cifre. */
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
    didascalia.appendChild(el("span", "pi-chiave pi-chiave-persona"));
    didascalia.appendChild(document.createTextNode(" persone "));
    didascalia.appendChild(el("span", "pi-chiave pi-chiave-casa"));
    didascalia.appendChild(document.createTextNode(
      " case antiquariali — il pallino cresce col numero di legami. " +
      "Trascina per spostare, rotella per ingrandire; un clic su una casa " +
      "apre la sua scheda."));
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

    /* Prima nel documento, poi disegnata: la libreria cerca il
       riquadro per id e su un nodo non ancora appeso non lo trova. */
    radice.appendChild(sez);
    disegna();
  }

  /* --- la rete ----------------------------------------------- */

  /* amCharts 5 sta gia' nel sito (lo usa la pagina Progetto). Se la
     libreria non arriva — rete lenta, CDN irraggiungibile, blocco
     degli script di terze parti — il riquadro sparisce e sotto resta
     l'elenco, che dice le stesse cose per esteso. */
  function libreriaPronta() {
    return typeof window.am5 !== "undefined" &&
           typeof window.am5hierarchy !== "undefined";
  }

  var radiceAm5 = null;
  var ID_RADICE = "radice";

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
      /* Se il grafico non si disegna la pagina non deve fermarsi:
         l'elenco sotto dice le stesse cose per esteso. */
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

    /* Ridisegnare da capo a ogni filtro: la libreria non ha un modo
       semplice di scambiare i dati di una rete a forza senza che i
       nodi restino appiccicati alle posizioni vecchie. */
    if (radiceAm5) { radiceAm5.dispose(); radiceAm5 = null; }

    var root = window.am5.Root.new(contenitore.id);
    radiceAm5 = root;
    root.setThemes([window.am5themes_Animated.new(root)]);
    /* Il logo della versione gratuita finirebbe sopra i pallini in
       basso a sinistra: lo si lascia, ma senza animazione d'entrata. */
    if (root._logo) root._logo.set("scale", 0.85);

    /* Su uno schermo stretto il disegno va rimpicciolito tutto
       insieme — pallini e forze — se no la matassa nasce piu' larga
       del riquadro e meta' dei nodi resta fuori dal bordo. */
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

    /* Due colori soli: le persone che fanno da ponte e le case
       antiquariali. Il terzo colore non aggiungerebbe niente e la
       pagina ne ha gia' due. */
    serie.circles.template.setAll({ fillOpacity: 0.95, strokeOpacity: 0 });
    serie.circles.template.adapters.add("fill", function (fill, target) {
      var d = target.dataItem && target.dataItem.dataContext;
      return d && d.tipo === "persona"
        ? window.am5.color(0x5593C9)
        : window.am5.color(0xC8683C);
    });

    /* La radice non esiste davvero: e' il perno che tiene insieme il
       disegno. Va nascosta, lei e i raggi che la legano a tutti, se no
       al centro compare un pallino con 104 fili che non significa
       niente. */
    serie.circles.template.adapters.add("radius", function (r, target) {
      return eRadice(target) ? 0 : r;
    });
    serie.labels.template.adapters.add("text", function (t, target) {
      return eRadice(target) ? "" : t;
    });

    /* Un grigio solo per tutte le linee: a colori — uno per nodo, come
       fa la libreria da sola — il disegno sembrava una matassa di lana
       e la forma dei gruppi spariva sotto l'arcobaleno. */
    serie.links.template.setAll({
      strength: 0.28,
      strokeOpacity: 0.32,
      strokeWidth: 1,
      stroke: window.am5.color(0x8a99a8)
    });
    /* Il colore va imposto con un adattatore e non con una semplice
       impostazione: la libreria tinge ogni legame del colore del nodo
       da cui parte, e quella scelta arriva dopo. */
    serie.links.template.adapters.add("stroke", function () {
      return window.am5.color(0x8a99a8);
    });
    serie.links.template.adapters.add("strokeOpacity", function (o, target) {
      /* Il legame porta sorgente e destinazione come proprie
         impostazioni, non sul dataItem: la prima strada che avevo
         provato restituiva sempre undefined e i raggi restavano. */
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
    /* La mano solo dove c'e' davvero qualcosa da aprire: le schede
       sono delle case antiquariali, le persone non ne hanno una. */
    serie.nodes.template.adapters.add("cursorOverStyle", function (c, target) {
      var d = target.dataItem && target.dataItem.dataContext;
      return d && d.url ? "pointer" : "default";
    });
    serie.nodes.template.events.on("click", function (ev) {
      var d = ev.target.dataItem && ev.target.dataItem.dataContext;
      if (d && d.url) window.location.href = d.url;
    });

    serie.data.setAll([datiRete(righe)]);
    serie.set("selectedDataItem", serie.dataItems[0]);
  }

  /* La rete e' bipartita — persone da una parte, case dall'altra — ma
     la serie vuole un albero. Si costruisce una radice invisibile con
     tutti i nodi appesi, e i legami veri si passano con "legami": e'
     il modo in cui amCharts disegna una rete che albero non e'. */
  function datiRete(righe) {
    var nodi = [];
    var indice = {};

    righe.forEach(function (p) {
      var id = "p:" + p.role + ":" + p.name;
      indice[id] = {
        id: id,
        nome: p.name,
        tipo: "persona",
        valore: p.entities.length,
        legami: []
      };
      nodi.push(indice[id]);
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
        }
        indice[id].valore++;
        indice["p:" + p.role + ":" + p.name].legami.push(id);
      });
    });

    return { id: ID_RADICE, nome: "", valore: 0, figli: nodi };
  }

  /* --- 2. famiglie e antiquari soli -------------------------- */

  function perEntita(dati) {
    var conta = {};
    dati.forEach(function (p) {
      if (p.role !== "antiquario" || !p.entity_id) return;
      if (!conta[p.entity_id]) {
        conta[p.entity_id] = { id: p.entity_id, nome: p.entity_name, n: 0 };
      }
      conta[p.entity_id].n++;
    });
    return Object.keys(conta).map(function (k) { return conta[k]; });
  }

  function costruisciFamiglie(radice, dati) {
    var entita = perEntita(dati);
    if (!entita.length) return;

    /* Sopra le cinque persone i casi sono uno o due per volta: messi
       insieme la barra si legge, separati sarebbero cinque righe da
       una tacca. */
    var scaglioni = [
      { chiave: 1, etichetta: "1 persona" },
      { chiave: 2, etichetta: "2 persone" },
      { chiave: 3, etichetta: "3 persone" },
      { chiave: 4, etichetta: "4 persone" },
      { chiave: 5, etichetta: "5 persone" },
      { chiave: 6, etichetta: "6 o più" }
    ];
    scaglioni.forEach(function (s) {
      s.entita = entita.filter(function (e) {
        return s.chiave === 6 ? e.n >= 6 : e.n === s.chiave;
      }).sort(function (a, b) {
        return b.n - a.n || a.nome.localeCompare(b.nome, "it");
      });
    });

    var massimo = Math.max.apply(null, scaglioni.map(function (s) {
      return s.entita.length;
    }));
    var sole = scaglioni[0].entita.length;

    var sez = el("section", "pi-blocco");
    sez.id = "famiglie";
    sez.appendChild(el("h2", "pi-titolo", "Famiglie e antiquari soli"));
    sez.appendChild(el("p", "pi-occhiello",
      sole + " entità su " + entita.length + " hanno un antiquario solo; " +
      "le altre " + (entita.length - sole) + " ne hanno da due a nove. " +
      "Scegli una barra per vedere quali."));

    var lista = el("ul", "pi-scaglioni");
    var aperto = null;

    scaglioni.forEach(function (s) {
      var riga = el("li", "pi-scaglione");

      var b = el("button", "pi-scaglione-bottone");
      b.type = "button";
      b.setAttribute("aria-expanded", "false");
      b.appendChild(el("span", "pi-scaglione-voce", s.etichetta));

      var barra = el("span", "pi-scaglione-barra");
      var dentro = el("span", "pi-barra-dentro");
      dentro.style.width = (s.entita.length / massimo * 100) + "%";
      barra.appendChild(dentro);
      b.appendChild(barra);

      b.appendChild(el("span", "pi-scaglione-conto", String(s.entita.length)));
      riga.appendChild(b);

      var nomi = el("div", "pi-scaglione-nomi");
      nomi.hidden = true;
      s.entita.forEach(function (e, i) {
        if (i) {
          spazio(nomi);
          nomi.appendChild(el("span", "pi-punto", "·"));
          spazio(nomi);
        }
        var a = el("a", "pi-scheda", s.chiave === 6 ? e.nome + " (" + e.n + ")" : e.nome);
        a.href = "dettagli/dettaglio_" + e.id + ".html";
        nomi.appendChild(a);
      });
      riga.appendChild(nomi);

      b.addEventListener("click", function () {
        var apriva = nomi.hidden;
        if (aperto && aperto !== nomi) {
          aperto.hidden = true;
          aperto.parentNode.querySelector(".pi-scaglione-bottone")
            .setAttribute("aria-expanded", "false");
        }
        nomi.hidden = !apriva;
        b.setAttribute("aria-expanded", String(apriva));
        aperto = apriva ? nomi : null;
      });

      lista.appendChild(riga);
    });

    sez.appendChild(lista);
    radice.appendChild(sez);
  }

  /* --- avvio -------------------------------------------------- */

  function avvia() {
    var radice = document.getElementById("persone-insieme");
    var dati = leggiDati();
    if (!radice || !dati) return;
    costruisciPonti(radice, dati);
    costruisciFamiglie(radice, dati);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avvia);
  } else {
    avvia();
  }
}());
