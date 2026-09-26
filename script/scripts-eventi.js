/* ══════════════════════════════════════════════════════════
   EVENTI A DECADI
   Istogramma per decennio, raggruppato nelle sette categorie
   definitive e diviso in blocchi per secolo, con drill-down sugli
   eventi del decennio o dell'intero secolo.

   Dati: json/eventi.json e json/entità.json, generati dalla CI
   a partire da data/eventi.tsv e data/entità.tsv (vedi i workflow
   update-json-eventi.yml e update-json-entit.yml). Recuperati da
   raw.githubusercontent.com, come già fanno antiquari_search.js
   e dettaglioAntiquari.js altrove sul sito.
   ══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  // Etichetta di un decennio come intervallo esplicito: 1890 -> "1890-1899".
  // Prima si usava la forma inglese "1890s", che in italiano non si scrive.
  function decennio(d) {
    return d + "-" + (d + 9);
  }

  var EVENTI_URL = "https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/eventi.json";
  var ENTITA_URL = "https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entita.json";
  // Nome precedente, accentato: usato se il primo non c'e' ancora.
  var ENTITA_URL_VECCHIO = "https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entit%C3%A0.json";

  var root = document.querySelector(".eventi-decadi");
  if (!root) return; // sezione non presente in questa pagina

  // Fisso e mai riordinato: è la sequenza validata per la leggibilità
  // (contrasto e distinguibilità anche per chi ha il daltonismo) dei
  // sette colori nella famiglia terracotta/azzurro del sito.
  var CATS = [
    ["vendite",       "Vendite",             "--ed-cat-vendite"],
    ["pubblicazioni", "Pubblicazioni",       "--ed-cat-pubblicazioni"],
    ["altro",         "Altri eventi",        "--ed-cat-altro"],
    ["donazioni",     "Donazioni",           "--ed-cat-donazioni"],
    ["esposizioni",   "Esposizioni e fiere", "--ed-cat-esposizioni"],
    ["aperture",      "Aperture e chiusure", "--ed-cat-aperture"],
    ["acquisizioni",  "Acquisizioni",        "--ed-cat-acquisizioni"]
  ];
  var CAT_LABEL = {};
  CATS.forEach(function (c) { CAT_LABEL[c[0]] = c[1]; });

  // Tipologia Evento (TSV) -> categoria definitiva
  var CAT_MAP = {
    "vendita all'asta": "vendite",
    "vendita": "vendite",
    "acquisto": "acquisizioni",
    "acquisizione": "acquisizioni",
    "inaugurazione / fondazione": "aperture",
    "avvio attività": "aperture",
    "chiusura": "aperture",
    "chiusura dell'attività": "aperture",
    "chiusura dell’attività": "aperture",
    "pubblicazione": "pubblicazioni",
    "donazione": "donazioni",
    "mostra": "esposizioni",
    "partecipazione a fiera": "esposizioni",
    "prestito": "esposizioni",
    "restauro": "altro",
    "onoreficenza": "altro",
    "scoperta": "altro",
    "curatela": "altro",
    "causa giudiziaria": "altro"
  };

  function catColor(key) {
    var idx = CATS.filter(function (c) { return c[0] === key; })[0];
    return idx ? getComputedStyle(root).getPropertyValue(idx[2]).trim() : "#999";
  }

  Promise.all([
    fetch(EVENTI_URL).then(function (r) { return r.json(); }),
    fetch(ENTITA_URL)
      .then(function (r) { return r.ok ? r : fetch(ENTITA_URL_VECCHIO); })
      .then(function (r) { return r.json(); })
  ]).then(function (results) {
    init(results[0], results[1]);
  }).catch(function (err) {
    console.error("Eventi a decadi: impossibile caricare i dati", err);
    var chart = document.getElementById("ed-chart");
    if (chart) chart.textContent = "Impossibile caricare gli eventi al momento.";
  });

  function init(eventiRaw, entitaRaw) {
    // ---------- normalizzazione eventi ----------
    var DATA = Object.keys(eventiRaw).map(function (id) {
      var row = eventiRaw[id];
      var annoRaw = (row["Anno"] || "").trim();
      var m = /^(\d{4})/.exec(annoRaw);
      var year = m ? parseInt(m[1], 10) : null;
      var tipologia = (row["Tipologia Evento"] || "").trim();
      var category = CAT_MAP[tipologia] || "altro";
      var entityIds = (row["ID_entità"] || "").trim().split(/\s+/).filter(Boolean);
      var entityNames = entityIds.map(function (eid) {
        var ent = entitaRaw[eid];
        return ent ? ent["Nome"] : eid;
      });
      return {
        id: row["ID"],
        year: year,
        yearLabel: annoRaw,
        category: category,
        title: row["Descrizione sintetica"] || "",
        desc: row["Descrizione dettagliata"] || "",
        entityIds: entityIds,
        entityNames: entityNames
      };
    }).filter(function (e) { return e.year !== null; });

    // ---------- decadi ----------
    var DECADES = [];
    (function () {
      var byDecade = {};
      DATA.forEach(function (ev) {
        var d = Math.floor(ev.year / 10) * 10;
        byDecade[d] = byDecade[d] || [];
        byDecade[d].push(ev);
      });
      var keys = Object.keys(byDecade).map(Number);
      var min = Math.min.apply(null, keys), max = Math.max.apply(null, keys);
      for (var d = min; d <= max; d += 10) DECADES.push({ decade: d, events: byDecade[d] || [] });
    })();

    var selectedDecade = (function () {
      var best = DECADES[0];
      DECADES.forEach(function (d) { if (d.events.length > best.events.length) best = d; });
      return best.decade;
    })();
    // Cosa mostrano le schede sotto il grafico: un decennio (click su una
    // colonna o sulla sua etichetta, '70) o un secolo intero (click sul
    // nome del secolo, 1900). selectedDecade resta il decennio evidenziato.
    var selectedKind = "decade";

    function secoloDi(anno) { return Math.floor(anno / 100) * 100; }

    function scegliDecennio(decade, categoria) {
      selectedKind = "decade";
      selectedDecade = decade;
      drilldownCategory = categoria;
      renderChart();
      renderCards();
      scrollToDetail();
    }

    function scegliSecolo(secolo) {
      selectedKind = "century";
      selectedDecade = secolo;
      drilldownCategory = focusCategory;
      renderChart();
      renderCards();
      scrollToDetail();
    }

    // Legend click = porta il grafico a mostrare solo l'andamento di una
    // categoria nel tempo (non nasconde le altre come opzioni).
    // Click sulla colonna = apre gli eventi del decennio (tutte le categorie,
    // o solo quella attiva se una categoria è isolata in legenda).
    // Click su un singolo segmento colorato = apre solo gli eventi di quella
    // categoria in quel decennio, indipendentemente dall'isolamento in legenda.
    var focusCategory = null;
    var drilldownCategory = null;

    function entLinks(ev) {
      var frag = document.createDocumentFragment();
      ev.entityIds.forEach(function (eid, i) {
        if (i > 0) frag.appendChild(document.createTextNode(", "));
        var a = document.createElement("a");
        a.href = "../html/dettagli/dettaglio_" + eid + ".html";
        a.target = "_blank";
        a.textContent = ev.entityNames[i] || eid;
        frag.appendChild(a);
      });
      return frag;
    }

    // ---------- legenda ----------
    function renderLegend() {
      var el = document.getElementById("ed-legend");
      el.innerHTML = "";
      CATS.forEach(function (c) {
        var key = c[0], label = c[1];
        var total = DATA.filter(function (e) { return e.category === key; }).length;
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "ed-chip" + (focusCategory === key ? " is-isolated" : "");
        chip.setAttribute("aria-pressed", focusCategory === key ? "true" : "false");
        var dot = document.createElement("span");
        dot.className = "ed-dot";
        dot.style.background = catColor(key);
        chip.appendChild(dot);
        chip.appendChild(document.createTextNode(label + " "));
        var n = document.createElement("span");
        n.className = "ed-n";
        n.textContent = "(" + total + ")";
        chip.appendChild(n);
        chip.addEventListener("click", function () { toggleFocus(key); });
        el.appendChild(chip);
      });
      var reset = document.createElement("button");
      reset.type = "button";
      reset.className = "ed-reset-link";
      reset.textContent = "Torna a tutte le categorie";
      reset.hidden = focusCategory === null;
      reset.addEventListener("click", function () { setFocus(null); });
      el.appendChild(reset);
    }

    function toggleFocus(key) { setFocus(focusCategory === key ? null : key); }
    // Scorre fino al box di dettaglio sotto il grafico, tenendo conto
    // dell'header sticky del sito (altrimenti il box finirebbe nascosto
    // sotto l'header). Richiamata quando si clicca una barra/segmento.
    function scrollToDetail() {
      var detail = document.querySelector(".ed-detail");
      if (!detail) return;
      var header = document.querySelector("header");
      var headerH = header ? header.getBoundingClientRect().height : 0;
      var top = detail.getBoundingClientRect().top + window.pageYOffset - headerH - 16;
      window.scrollTo({ top: top, behavior: "smooth" });
    }

    function setFocus(key) {
      focusCategory = key;
      drilldownCategory = key; // il drill-down aperto segue il nuovo focus
      renderLegend();
      renderChart();
      renderCards();
    }

    // ---------- istogramma ----------
    // Il grafico e' diviso in un blocco per secolo: ogni blocco contiene
    // le sue colonne, le etichette dei decenni e il nome del secolo, e
    // fra un secolo e l'altro c'e' una barra verticale. Prima le tre righe (colonne, decenni, secoli) erano
    // indipendenti e per capire dove cominciava il Novecento bisognava
    // contare le colonne a partire da sinistra.
    function renderChart() {
      var chart = document.getElementById("ed-chart");
      chart.innerHTML = "";
      var tip = document.getElementById("ed-chart-tip");

      var maxCount = focusCategory
        ? Math.max.apply(null, DECADES.map(function (d) { return d.events.filter(function (e) { return e.category === focusCategory; }).length; }))
        : Math.max.apply(null, DECADES.map(function (d) { return d.events.length; }));
      // In percentuale, non in pixel: il riquadro passa da 190 a
      // 150px sul telefono e le barre lo seguono.
      var quotaPerEvento = maxCount ? (94 / maxCount) : 0;

      var gruppi = [];
      DECADES.forEach(function (d) {
        var secolo = secoloDi(d.decade);
        var last = gruppi[gruppi.length - 1];
        if (last && last.secolo === secolo) last.decadi.push(d);
        else gruppi.push({ secolo: secolo, decadi: [d] });
      });

      gruppi.forEach(function (g) {
        var secoloAttivo = selectedKind === "century" && selectedDecade === g.secolo;
        var blocco = document.createElement("div");
        blocco.className = "ed-secolo" + (secoloAttivo ? " is-active-century" : "");
        blocco.style.flex = g.decadi.length + " " + g.decadi.length + " 0";

        var barre = document.createElement("div");
        barre.className = "ed-barre";
        var etichette = document.createElement("div");
        etichette.className = "ed-labels";

        g.decadi.forEach(function (d) {
          var decennioAttivo = selectedKind === "decade" && d.decade === selectedDecade;
          var col = document.createElement("div");
          col.className = "ed-col" + (decennioAttivo ? " is-active-decade" : "");
          col.tabIndex = 0;
          col.setAttribute("role", "button");

          var byCat = {};
          d.events.forEach(function (e) { byCat[e.category] = (byCat[e.category] || 0) + 1; });
          var decadeTotal = focusCategory ? (byCat[focusCategory] || 0) : d.events.length;
          col.setAttribute("aria-label", decennio(d.decade) + ", " + decadeTotal + " eventi" + (focusCategory ? " (" + CAT_LABEL[focusCategory] + ")" : ""));

          var catsToDraw = focusCategory ? [[focusCategory, CAT_LABEL[focusCategory]]] : CATS;
          catsToDraw.forEach(function (c) {
            var key = c[0];
            var n = byCat[key] || 0;
            if (!n) return;
            var seg = document.createElement("div");
            seg.className = "ed-seg";
            seg.style.height = (n * quotaPerEvento) + "%";
            seg.style.background = catColor(key);
            seg.addEventListener("mousemove", function (e) {
              tip.innerHTML = "";
              var strong = document.createElement("div");
              strong.textContent = CAT_LABEL[key] + " — " + n;
              var sub = document.createElement("div");
              sub.className = "ed-tip-sub";
              sub.textContent = decennio(d.decade);
              tip.appendChild(strong); tip.appendChild(sub);
              tip.style.left = e.clientX + "px";
              tip.style.top = e.clientY + "px";
              tip.classList.add("is-shown");
            });
            seg.addEventListener("mouseleave", function () { tip.classList.remove("is-shown"); });
            seg.addEventListener("click", function (e) {
              e.stopPropagation();
              scegliDecennio(d.decade, key);
            });
            col.appendChild(seg);
          });

          col.addEventListener("mousemove", function (e) {
            if (e.target !== col) return;
            tip.innerHTML = "";
            var strong = document.createElement("div");
            strong.textContent = decennio(d.decade);
            var sub = document.createElement("div");
            sub.className = "ed-tip-sub";
            sub.textContent = decadeTotal + " eventi";
            tip.appendChild(strong); tip.appendChild(sub);
            tip.style.left = e.clientX + "px";
            tip.style.top = e.clientY + "px";
            tip.classList.add("is-shown");
          });
          col.addEventListener("mouseleave", function () { tip.classList.remove("is-shown"); });
          // click sulla colonna: segue il focus di legenda (o nessuno)
          col.addEventListener("click", function () { scegliDecennio(d.decade, focusCategory); });
          col.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); col.click(); }
          });
          barre.appendChild(col);

          // L'etichetta del decennio ('70) e' un bottone: apre gli
          // eventi di quel decennio, come la colonna sopra.
          var lab = document.createElement("button");
          lab.type = "button";
          lab.className = "ed-label" + (decennioAttivo ? " is-active" : "");
          // L'apostrofo sta in uno <span> a parte: sul telefono le colonne
          // sono larghe 15px e senza apostrofo le cifre non si toccano.
          var apo = document.createElement("span");
          apo.className = "ed-apo";
          apo.textContent = "’";
          lab.appendChild(apo);
          lab.appendChild(document.createTextNode(String(d.decade).slice(2)));
          lab.setAttribute("aria-label", "Eventi " + decennio(d.decade));
          lab.addEventListener("click", function () { scegliDecennio(d.decade, focusCategory); });
          etichette.appendChild(lab);
        });

        // Il nome del secolo apre tutti gli eventi del secolo.
        var nome = document.createElement("button");
        nome.type = "button";
        nome.className = "ed-secolo-nome" + (secoloAttivo ? " is-active" : "");
        nome.textContent = g.secolo;
        nome.setAttribute("aria-label", "Tutti gli eventi " + g.secolo + "–" + (g.secolo + 99));
        nome.addEventListener("click", function () { scegliSecolo(g.secolo); });

        blocco.appendChild(barre);
        blocco.appendChild(etichette);
        blocco.appendChild(nome);
        chart.appendChild(blocco);
      });
    }

    // ---------- schede del drill-down ----------
    function makeEvCard(ev) {
      var card = document.createElement("div");
      card.className = "ed-card";
      card.style.setProperty("--ed-card-accent", catColor(ev.category));

      var top = document.createElement("div");
      top.className = "ed-card-top";
      var dot = document.createElement("span");
      dot.className = "ed-dot";
      dot.style.background = catColor(ev.category);
      var yr = document.createElement("span");
      yr.className = "ed-yr";
      yr.textContent = ev.yearLabel;
      var catLbl = document.createElement("span");
      catLbl.textContent = CAT_LABEL[ev.category];
      top.appendChild(dot); top.appendChild(yr); top.appendChild(catLbl);

      var title = document.createElement("p");
      title.className = "ed-card-title";
      title.textContent = ev.title;

      var desc = document.createElement("p");
      desc.className = "ed-card-desc";
      desc.textContent = ev.desc;

      card.appendChild(top); card.appendChild(title); card.appendChild(desc);

      if (ev.entityIds.length) {
        var ents = document.createElement("p");
        ents.className = "ed-card-ents";
        ents.appendChild(entLinks(ev));
        card.appendChild(ents);
      }
      return card;
    }

    function renderCards() {
      var perSecolo = selectedKind === "century";
      var tuttiNelPeriodo = [];
      DECADES.forEach(function (x) {
        var dentro = perSecolo ? secoloDi(x.decade) === selectedDecade : x.decade === selectedDecade;
        if (dentro) tuttiNelPeriodo = tuttiNelPeriodo.concat(x.events);
      });
      var events = tuttiNelPeriodo.filter(function (e) { return !drilldownCategory || e.category === drilldownCategory; });
      var periodo = perSecolo ? "secolo" : "decennio";

      var titleEl = document.getElementById("ed-decade-title");
      titleEl.textContent = selectedDecade + "–" + (selectedDecade + (perSecolo ? 99 : 9));

      var countEl = document.getElementById("ed-decade-count");
      countEl.innerHTML = "";
      var countText = document.createElement("span");
      countText.textContent = events.length + (events.length === 1 ? " evento mostrato" : " eventi mostrati") +
        (drilldownCategory ? " · " + CAT_LABEL[drilldownCategory].toLowerCase() : "");
      countEl.appendChild(countText);

      // Un click su un segmento può restringere il drill-down a una categoria
      // oltre a quanto mostrerebbe da solo il focus di legenda: offriamo un
      // modo esplicito per tornare a tutte le categorie di quel decennio,
      // dato che la barra è interamente coperta dai segmenti e non lascia
      // un'area "vuota" da cliccare per farlo.
      if (drilldownCategory !== focusCategory) {
        var backLink = document.createElement("button");
        backLink.type = "button";
        backLink.className = "ed-count-reset";
        backLink.textContent = "Mostra tutti i " + tuttiNelPeriodo.length + " eventi di questo " + periodo;
        backLink.addEventListener("click", function () {
          drilldownCategory = focusCategory;
          renderCards();
        });
        countEl.appendChild(backLink);
      }

      var grid = document.getElementById("ed-decade-cards");
      grid.innerHTML = "";
      if (!events.length) {
        var empty = document.createElement("div");
        empty.className = "ed-empty-state";
        empty.textContent = drilldownCategory
          ? "Nessun evento di questa categoria in questo " + periodo + "."
          : "Nessun evento in questo " + periodo + ".";
        grid.appendChild(empty);
        return;
      }
      events.sort(function (a, b) { return a.year - b.year; }).forEach(function (ev) {
        grid.appendChild(makeEvCard(ev));
      });
    }

    renderLegend();
    renderChart();
    renderCards();
  }
});
