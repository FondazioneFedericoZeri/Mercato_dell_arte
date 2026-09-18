/* ══════════════════════════════════════════════════════════
   Preview "Eventi" in home: mini istogramma per decadi, con gli
   stessi 7 colori e la stessa fonte dati (json/eventi.json) della
   cronologia completa in html/eventi.html (vedi
   script/scripts-eventi.js, da cui questa versione ridotta riprende
   la classificazione delle categorie).

   Qui non c'è drill-down: solo un tooltip al passaggio del mouse
   con decennio e conteggio. Tutta la preview è un link a
   html/eventi.html (vedi index.html).
   ══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  var root = document.getElementById("eventi-preview");
  if (!root) return; // sezione non presente in questa pagina

  var EVENTI_URL = "https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/eventi.json";

  // Stesso ordine fisso di script/scripts-eventi.js: non riordinare.
  var CATS = [
    ["vendite",       "--ep-cat-vendite"],
    ["pubblicazioni", "--ep-cat-pubblicazioni"],
    ["altro",         "--ep-cat-altro"],
    ["donazioni",     "--ep-cat-donazioni"],
    ["esposizioni",   "--ep-cat-esposizioni"],
    ["aperture",      "--ep-cat-aperture"],
    ["acquisizioni",  "--ep-cat-acquisizioni"]
  ];

  // Stessa mappatura Tipologia Evento (TSV) -> categoria di scripts-eventi.js.
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
    var found = CATS.filter(function (c) { return c[0] === key; })[0];
    return found ? getComputedStyle(root).getPropertyValue(found[1]).trim() : "#999";
  }

  fetch(EVENTI_URL)
    .then(function (r) { return r.json(); })
    .then(init)
    .catch(function (err) {
      console.error("Preview eventi: impossibile caricare i dati", err);
    });

  function init(eventiRaw) {
    var byDecade = {};
    Object.keys(eventiRaw).forEach(function (id) {
      var row = eventiRaw[id];
      var annoRaw = (row["Anno"] || "").trim();
      var m = /^(\d{4})/.exec(annoRaw);
      if (!m) return;
      var year = parseInt(m[1], 10);
      var decade = Math.floor(year / 10) * 10;
      var tipologia = (row["Tipologia Evento"] || "").trim();
      var category = CAT_MAP[tipologia] || "altro";
      byDecade[decade] = byDecade[decade] || {};
      byDecade[decade][category] = (byDecade[decade][category] || 0) + 1;
    });

    var decadeKeys = Object.keys(byDecade).map(Number);
    if (!decadeKeys.length) return;
    var min = Math.min.apply(null, decadeKeys);
    var max = Math.max.apply(null, decadeKeys);

    var DECADES = [];
    for (var d = min; d <= max; d += 10) DECADES.push({ decade: d, byCat: byDecade[d] || {} });

    function totalOf(byCat) {
      return Object.keys(byCat).reduce(function (sum, k) { return sum + byCat[k]; }, 0);
    }

    var maxTotal = Math.max.apply(null, DECADES.map(function (dd) { return totalOf(dd.byCat); }));

    var chart = document.getElementById("home-ed-chart");
    var labels = document.getElementById("home-ed-labels");
    var tip = document.getElementById("home-ed-tip");
    if (!chart || !labels || !tip) return;
    var chartH = 140;

    DECADES.forEach(function (dd) {
      var total = totalOf(dd.byCat);

      var col = document.createElement("div");
      col.className = "ep-col";

      CATS.forEach(function (c) {
        var key = c[0];
        var n = dd.byCat[key] || 0;
        if (!n) return;
        var seg = document.createElement("div");
        seg.className = "ep-seg";
        seg.style.height = Math.max((n / (maxTotal || 1)) * chartH - 1, 2) + "px";
        seg.style.background = catColor(key);
        col.appendChild(seg);
      });

      col.addEventListener("mousemove", function (e) {
        tip.innerHTML = "";
        var strong = document.createElement("div");
        strong.textContent = dd.decade + "s";
        var sub = document.createElement("div");
        sub.className = "ep-tip-sub";
        sub.textContent = total + (total === 1 ? " evento" : " eventi");
        tip.appendChild(strong);
        tip.appendChild(sub);
        tip.style.left = e.clientX + "px";
        tip.style.top = e.clientY + "px";
        tip.classList.add("is-shown");
      });
      col.addEventListener("mouseleave", function () { tip.classList.remove("is-shown"); });

      chart.appendChild(col);

      // Un'etichetta ogni due decadi (a partire dalla prima), per non
      // affollare uno spazio più stretto rispetto al grafico a pagina intera.
      var lab = document.createElement("span");
      if (((dd.decade - min) / 10) % 2 === 0) {
        lab.textContent = "’" + String(dd.decade).slice(-2);
      } else {
        lab.setAttribute("aria-hidden", "true");
      }
      labels.appendChild(lab);
    });
  }
});
