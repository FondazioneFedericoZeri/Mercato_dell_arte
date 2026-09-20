/* ══════════════════════════════════════════════════════════
   Galleria fotografica della scheda antiquario.

   Tre cose, rispetto a prima:

   1. L'autoplay fa un giro solo e poi si ferma. Prima girava
      all'infinito: dopo qualche secondo la fotografia cambiava
      sotto gli occhi di chi stava leggendo la biografia.
   2. Si puo' ingrandire la fotografia: si apre sopra la pagina,
      a schermo intero, con la didascalia per intero sotto.
   3. Le frecce fermano l'autoplay: se la persona ha preso in
      mano la navigazione, il timer non le passa piu' davanti.

   Nessuna libreria esterna.
   ══════════════════════════════════════════════════════════ */
(function (globale) {
  "use strict";

  var PAUSA = 3000;          /* millisecondi fra una foto e l'altra */
  var immagini = [];         /* {src, testo} nell'ordine della galleria */
  var corrente = 0;
  var timer = null;
  var contenitore = null;    /* .slider-container o #single-image-container */
  var nastro = null;         /* .slider, solo quando le foto sono piu' d'una */

  /* ── raccolta dei dati dalla pagina ───────────────────── */

  function raccogli() {
    contenitore = document.querySelector(".slider-container") ||
                  document.getElementById("single-image-container");
    if (!contenitore) return false;

    nastro = contenitore.querySelector(".slider");
    var caselle = contenitore.querySelectorAll(".slide");

    if (caselle.length) {
      Array.prototype.forEach.call(caselle, function (casella) {
        var img = casella.querySelector("img");
        var didascalia = casella.querySelector(".caption");
        if (img) {
          immagini.push({
            src: img.getAttribute("src"),
            testo: didascalia ? didascalia.textContent.trim() : (img.alt || "")
          });
        }
      });
    } else {
      var unica = contenitore.querySelector("img");
      var testo = contenitore.querySelector(".caption");
      if (unica) {
        immagini.push({
          src: unica.getAttribute("src"),
          testo: testo ? testo.textContent.trim() : (unica.alt || "")
        });
      }
    }
    return immagini.length > 0;
  }

  /* ── scorrimento ──────────────────────────────────────── */

  function mostra(indice) {
    if (!immagini.length) return;
    if (indice < 0) indice = immagini.length - 1;
    if (indice >= immagini.length) indice = 0;
    corrente = indice;
    if (nastro) nastro.style.transform = "translateX(" + (-corrente * 100) + "%)";
  }

  function ferma() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  /* Un giro solo: dalla prima all'ultima, poi si spegne.
     Chi vuole rivederle usa le frecce. */
  function avviaUnGiro() {
    if (immagini.length < 2) return;
    var restanti = immagini.length - 1;
    timer = setInterval(function () {
      mostra(corrente + 1);
      restanti -= 1;
      if (restanti <= 0) ferma();
    }, PAUSA);
  }

  /* ── ingrandimento ────────────────────────────────────── */

  var strato = null;         /* il riquadro scuro sopra la pagina */
  var tornaA = null;         /* dove rimettere il fuoco alla chiusura */

  function costruisciStrato() {
    strato = document.createElement("div");
    strato.className = "gal-strato";
    strato.setAttribute("role", "dialog");
    strato.setAttribute("aria-modal", "true");
    strato.setAttribute("aria-label", "Fotografia ingrandita");
    strato.innerHTML =
      '<button class="gal-chiudi" type="button" aria-label="Chiudi">&#10005;</button>' +
      '<button class="gal-prec" type="button" aria-label="Fotografia precedente">&#10094;</button>' +
      '<figure class="gal-figura">' +
        '<img class="gal-img" alt="">' +
        '<figcaption class="gal-didascalia"></figcaption>' +
      '</figure>' +
      '<button class="gal-succ" type="button" aria-label="Fotografia successiva">&#10095;</button>';
    document.body.appendChild(strato);

    strato.querySelector(".gal-chiudi").addEventListener("click", chiudi);
    strato.querySelector(".gal-prec").addEventListener("click", function () {
      aggiornaStrato(corrente - 1);
    });
    strato.querySelector(".gal-succ").addEventListener("click", function () {
      aggiornaStrato(corrente + 1);
    });
    /* clic sullo sfondo, non sulla fotografia */
    strato.addEventListener("click", function (e) {
      if (e.target === strato) chiudi();
    });
  }

  function aggiornaStrato(indice) {
    mostra(indice);
    var foto = immagini[corrente];
    strato.querySelector(".gal-img").src = foto.src;
    strato.querySelector(".gal-img").alt = foto.testo;
    strato.querySelector(".gal-didascalia").textContent = foto.testo;
    var sole = immagini.length < 2 ? "none" : "";
    strato.querySelector(".gal-prec").style.display = sole;
    strato.querySelector(".gal-succ").style.display = sole;
  }

  function daTastiera(e) {
    if (e.key === "Escape") chiudi();
    else if (e.key === "ArrowRight") aggiornaStrato(corrente + 1);
    else if (e.key === "ArrowLeft") aggiornaStrato(corrente - 1);
  }

  function apri() {
    if (!immagini.length) return;
    ferma();                                   /* niente scorrimento sotto */
    if (!strato) costruisciStrato();
    aggiornaStrato(corrente);
    tornaA = document.activeElement;
    strato.classList.add("aperto");
    document.body.classList.add("gal-bloccato");
    document.addEventListener("keydown", daTastiera);
    strato.querySelector(".gal-chiudi").focus();
  }

  function chiudi() {
    if (!strato) return;
    strato.classList.remove("aperto");
    document.body.classList.remove("gal-bloccato");
    document.removeEventListener("keydown", daTastiera);
    if (tornaA && tornaA.focus) tornaA.focus();
  }

  /* ── avvio ────────────────────────────────────────────── */

  function avvia() {
    if (!raccogli()) return;

    var prec = contenitore.querySelector(".prev");
    var succ = contenitore.querySelector(".next");
    if (prec) prec.addEventListener("click", function () {
      ferma();                 /* la persona ha preso in mano la galleria */
      mostra(corrente - 1);
    });
    if (succ) succ.addEventListener("click", function () {
      ferma();
      mostra(corrente + 1);
    });

    var lente = contenitore.querySelector(".gal-zoom");
    if (lente) lente.addEventListener("click", apri);

    /* anche la fotografia stessa apre l'ingrandimento, per chi usa il
       mouse; il bottone resta per tastiera e lettori di schermo */
    Array.prototype.forEach.call(contenitore.querySelectorAll("img"),
      function (img) { img.addEventListener("click", apri); });

    avviaUnGiro();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avvia);
  } else {
    avvia();
  }

  globale.Galleria = { apri: apri, chiudi: chiudi, ferma: ferma };

}(window));
