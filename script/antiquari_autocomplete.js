/* Barra di ricerca Antiquari: tasto Invio e suggerimenti mentre si digita */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  var input = document.getElementById("search-input");
  if (!input) return; // non siamo nella pagina Antiquari

  // ancora del bottone "Cerca"
  var ANCORA = "Titolo";
  var MAX_SUGGERIMENTI = 8;

  // indice dei suggerimenti da entities_json
  function costruisciIndice() {
    if (typeof entities_json === "undefined" || !entities_json) return [];
    var voci = [];
    var citta = {};

    Object.keys(entities_json).forEach(function (k) {
      var ent = entities_json[k];
      if (ent && ent["Nome"]) {
        voci.push({ testo: String(ent["Nome"]), tipo: "antiquario" });
      }
      // sedi dell'entità dal campo Luoghi
      var luoghi = (ent && ent.Luoghi) || {};
      Object.keys(luoghi).forEach(function (lid) {
        var c = (luoghi[lid]["Città"] || "").trim();
        if (c) citta[c] = (citta[c] || 0) + 1;
      });
    });

    Object.keys(citta).forEach(function (c) {
      voci.push({ testo: c, tipo: "luogo", quanti: citta[c] });
    });

    voci.sort(function (a, b) {
      return a.testo.localeCompare(b.testo, "it", { sensitivity: "base" });
    });
    return voci;
  }

  var INDICE = costruisciIndice();

  // contenitore dei suggerimenti
  var lista = document.getElementById("search-suggestions");
  if (!lista) return;

  var selezionato = -1;   // indice evidenziato nella lista
  var correnti = [];      // suggerimenti attualmente mostrati

  function normalizza(s) {
    // ignora maiuscole e accenti
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function cerca(q) {
    var qn = normalizza(q);
    if (!qn) return [];
    var iniziano = [], contengono = [];
    INDICE.forEach(function (v) {
      var tn = normalizza(v.testo);
      if (tn.indexOf(qn) === 0) iniziano.push(v);
      else if (tn.indexOf(qn) > -1) contengono.push(v);
    });
    // prima le voci che iniziano con il testo cercato
    return iniziano.concat(contengono).slice(0, MAX_SUGGERIMENTI);
  }

  function evidenzia(testo, q) {
    // grassetto sulla parte che corrisponde a quanto digitato
    var i = normalizza(testo).indexOf(normalizza(q));
    var frag = document.createDocumentFragment();
    if (i < 0 || !q) {
      frag.appendChild(document.createTextNode(testo));
      return frag;
    }
    frag.appendChild(document.createTextNode(testo.slice(0, i)));
    var b = document.createElement("strong");
    b.textContent = testo.slice(i, i + q.length);
    frag.appendChild(b);
    frag.appendChild(document.createTextNode(testo.slice(i + q.length)));
    return frag;
  }

  function mostra(q) {
    correnti = cerca(q);
    selezionato = -1;
    lista.innerHTML = "";

    if (!correnti.length) { chiudi(); return; }

    correnti.forEach(function (v, i) {
      var li = document.createElement("li");
      li.className = "sugg-voce";
      li.id = "sugg-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");

      var testo = document.createElement("span");
      testo.className = "sugg-testo";
      testo.appendChild(evidenzia(v.testo, q));

      var tipo = document.createElement("span");
      tipo.className = "sugg-tipo";
      tipo.textContent = v.tipo === "luogo"
        ? "luogo · " + v.quanti + (v.quanti === 1 ? " sede" : " sedi")
        : "antiquario";

      li.appendChild(testo);
      li.appendChild(tipo);
      // mousedown perché il click arriva dopo il blur
      li.addEventListener("mousedown", function (e) {
        e.preventDefault();
        scegli(i);
      });
      lista.appendChild(li);
    });

    lista.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function chiudi() {
    lista.hidden = true;
    lista.innerHTML = "";
    correnti = [];
    selezionato = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function aggiornaSelezione() {
    Array.prototype.forEach.call(lista.children, function (li, i) {
      var attivo = i === selezionato;
      li.classList.toggle("is-attivo", attivo);
      li.setAttribute("aria-selected", attivo ? "true" : "false");
      if (attivo) {
        input.setAttribute("aria-activedescendant", li.id);
        if (li.scrollIntoView) li.scrollIntoView({ block: "nearest" });
      }
    });
    if (selezionato < 0) input.removeAttribute("aria-activedescendant");
  }

  // esegue la ricerca
  function esegui(valore) {
    if (typeof performSearch === "function") performSearch(valore);
    // scorre fino all'elenco come il bottone "Cerca"
    var meta = document.getElementById(ANCORA);
    if (meta && meta.scrollIntoView) meta.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.location.hash = ANCORA;
  }

  function scegli(i) {
    if (i < 0 || i >= correnti.length) return;
    input.value = correnti[i].testo;
    chiudi();
    esegui(input.value);
  }

  // eventi
  input.addEventListener("input", function () {
    performSearch(input.value);   // filtro dal vivo
    mostra(input.value);
  });

  input.addEventListener("keydown", function (e) {
    var aperta = !lista.hidden && correnti.length > 0;

    if (e.key === "ArrowDown" && aperta) {
      e.preventDefault();
      selezionato = (selezionato + 1) % correnti.length;
      aggiornaSelezione();
    } else if (e.key === "ArrowUp" && aperta) {
      e.preventDefault();
      selezionato = (selezionato <= 0 ? correnti.length : selezionato) - 1;
      aggiornaSelezione();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (aperta && selezionato >= 0) scegli(selezionato);
      else { chiudi(); esegui(input.value); }   // Invio avvia la ricerca
    } else if (e.key === "Escape") {
      chiudi();
    }
  });

  input.addEventListener("focus", function () {
    if (input.value) mostra(input.value);
  });

  input.addEventListener("blur", function () {
    // ritardo per lasciar completare il clic su una voce
    setTimeout(chiudi, 120);
  });

  document.addEventListener("click", function (e) {
    if (e.target !== input && !lista.contains(e.target)) chiudi();
  });
});
