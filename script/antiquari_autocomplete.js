/* ══════════════════════════════════════════════════════════
   Barra di ricerca della pagina Antiquari: tasto Invio e
   suggerimenti mentre si digita.

   Due cose che prima mancavano:

   1. Invio non faceva niente. Il bottone "Cerca" e' avvolto in un
      <a href="#Titolo">, quindi oltre a filtrare porta l'utente
      all'elenco; premendo Invio invece si restava in cima alla
      pagina, con le schede gia' filtrate ma fuori dallo schermo.
      Ora Invio fa esattamente quello che fa il bottone.

   2. Non c'era modo di sapere cosa si puo' cercare. performSearch
      (in antiquari_search.js) cerca sia nel nome dell'entita' sia
      nelle citta' dei suoi luoghi, ma da fuori non si vedeva: qui
      i suggerimenti mostrano entrambi, etichettati.

   I suggerimenti si ricavano da entities_json, che antiquari_search.js
   ha gia' caricato: nessuna richiesta di rete in piu'.
   ══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  var input = document.getElementById("search-input");
  if (!input) return; // non siamo nella pagina Antiquari

  // Ancora a cui il bottone "Cerca" porta: Invio e i suggerimenti
  // devono comportarsi allo stesso modo.
  var ANCORA = "Titolo";
  var MAX_SUGGERIMENTI = 8;

  // ---- 1. indice dei suggerimenti -------------------------------
  // entities_json e' una globale di antiquari_search.js, caricata in
  // modo sincrono: a questo punto c'e' gia'. Se per qualunque motivo
  // mancasse, la pagina resta funzionante senza suggerimenti.
  function costruisciIndice() {
    if (typeof entities_json === "undefined" || !entities_json) return [];
    var voci = [];
    var citta = {};

    Object.keys(entities_json).forEach(function (k) {
      var ent = entities_json[k];
      if (ent && ent["Nome"]) {
        voci.push({ testo: String(ent["Nome"]), tipo: "antiquario" });
      }
      var persone = (ent && ent.Persone) || {};
      Object.keys(persone).forEach(function (pid) {
        var luoghi = persone[pid]["ID_luoghi"] || {};
        Object.keys(luoghi).forEach(function (lid) {
          var c = luoghi[lid]["Città"];
          if (c) citta[c] = (citta[c] || 0) + 1;
        });
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

  // ---- 2. contenitore dei suggerimenti --------------------------
  var lista = document.getElementById("search-suggestions");
  if (!lista) return;

  var selezionato = -1;   // indice evidenziato nella lista
  var correnti = [];      // suggerimenti attualmente mostrati

  function normalizza(s) {
    // Ricerca indifferente a maiuscole e accenti: cercando "citta"
    // si deve trovare anche "Città".
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
    // Prima chi comincia con quello che si e' scritto: e' quasi sempre
    // quello che si sta cercando.
    return iniziano.concat(contengono).slice(0, MAX_SUGGERIMENTI);
  }

  function evidenzia(testo, q) {
    // Mette in grassetto la parte che corrisponde a quanto digitato,
    // lavorando sugli indici della stringa originale per non perdere
    // accenti e maiuscole.
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
      // mousedown e non click: il click arriverebbe dopo il blur
      // dell'input, che nel frattempo ha gia' chiuso la lista.
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

  // ---- 3. eseguire la ricerca -----------------------------------
  function esegui(valore) {
    if (typeof performSearch === "function") performSearch(valore);
    // Stesso salto del bottone "Cerca": senza, le schede filtrate
    // restano sotto la piega e sembra che non sia successo nulla.
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

  // ---- 4. eventi ------------------------------------------------
  input.addEventListener("input", function () {
    performSearch(input.value);   // filtro dal vivo, come prima
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
      else { chiudi(); esegui(input.value); }   // <- Invio ora fa qualcosa
    } else if (e.key === "Escape") {
      chiudi();
    }
  });

  input.addEventListener("focus", function () {
    if (input.value) mostra(input.value);
  });

  input.addEventListener("blur", function () {
    // Ritardo minimo: lascia completare un eventuale clic su una voce.
    setTimeout(chiudi, 120);
  });

  document.addEventListener("click", function (e) {
    if (e.target !== input && !lista.contains(e.target)) chiudi();
  });
});
