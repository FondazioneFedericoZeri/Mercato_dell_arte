/* ══════════════════════════════════════════════════════════
   EVENTI A DECADI
   Istogramma per decennio, raggruppato nelle sette categorie
   definitive, con drill-down sugli eventi del decennio.

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
  var ENTITA_URL = "https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entit%C3%A0.json";

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
    fetch(ENTITA_URL).then(function (r) { return r.json(); })
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
    function renderChart() {
      var chart = document.getElementById("ed-chart");
      var labels = document.getElementById("ed-labels");
      chart.innerHTML = ""; labels.innerHTML = "";
      var tip = document.getElementById("ed-chart-tip");

      var maxCount = focusCategory
        ? Math.max.apply(null, DECADES.map(function (d) { return d.events.filter(function (e) { return e.category === focusCategory; }).length; }))
        : Math.max.apply(null, DECADES.map(function (d) { return d.events.length; }));

      DECADES.forEach(function (d) {
        var col = document.createElement("div");
        col.className = "ed-col" + (d.decade === selectedDecade ? " is-active-decade" : "");
        col.tabIndex = 0;
        col.setAttribute("role", "button");

        var byCat = {};
        d.events.forEach(function (e) { byCat[e.category] = (byCat[e.category] || 0) + 1; });
        var decadeTotal = focusCategory ? (byCat[focusCategory] || 0) : d.events.length;
        col.setAttribute("aria-label", decennio(d.decade) + ", " + decadeTotal + " eventi" + (focusCategory ? " (" + CAT_LABEL[focusCategory] + ")" : ""));
        var pxPerEvent = maxCount ? (160 / maxCount) : 0;

        var catsToDraw = focusCategory ? [[focusCategory, CAT_LABEL[focusCategory]]] : CATS;
        catsToDraw.forEach(function (c) {
          var key = c[0];
          var n = byCat[key] || 0;
          if (!n) return;
          var seg = document.createElement("div");
          seg.className = "ed-seg";
          seg.style.height = Math.max(n * pxPerEvent - 2, 3) + "px";
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
            selectedDecade = d.decade;
            drilldownCategory = key;
            renderChart();
            renderCards();
            scrollToDetail();
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
        col.addEventListener("click", function () {
          selectedDecade = d.decade;
          drilldownCategory = focusCategory; // click sulla colonna: segue il focus (o nessuno)
          renderChart();
          renderCards();
          scrollToDetail();
        });
        col.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); col.click(); }
        });

        chart.appendChild(col);

        var lab = document.createElement("span");
        lab.textContent = "’" + String(d.decade).slice(2);
        labels.appendChild(lab);
      });

      var centuryRow = document.getElementById("ed-century-row");
      centuryRow.innerHTML = "";
      var groups = [];
      DECADES.forEach(function (d) {
        var century = Math.floor(d.decade / 100) * 100;
        var last = groups[groups.length - 1];
        if (last && last.century === century) last.count++;
        else groups.push({ century: century, count: 1 });
      });
      groups.forEach(function (g) {
        var span = document.createElement("span");
        span.textContent = g.century;
        span.style.flex = g.count + " " + g.count + " 0";
        centuryRow.appendChild(span);
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
      var d = DECADES.filter(function (x) { return x.decade === selectedDecade; })[0];
      var events = (d ? d.events : []).filter(function (e) { return !drilldownCategory || e.category === drilldownCategory; });

      var titleEl = document.getElementById("ed-decade-title");
      titleEl.textContent = selectedDecade + "–" + (selectedDecade + 9);

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
        var totalInDecade = d ? d.events.length : 0;
        var backLink = document.createElement("button");
        backLink.type = "button";
        backLink.className = "ed-count-reset";
        backLink.textContent = "Mostra tutti i " + totalInDecade + " eventi di questo decennio";
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
          ? "Nessun evento di questa categoria in questo decennio."
          : "Nessun evento in questo decennio.";
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
