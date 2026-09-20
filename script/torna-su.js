/* ══════════════════════════════════════════════════════════
   Bottone "Torna su".

   Compare dopo qualche schermata di scorrimento e riporta in
   cima alla pagina. Serve sulle pagine lunghe: l'elenco degli
   antiquari e' alto oltre 21.000 pixel, la bibliografia 19.000.

   Un bottone c'era gia' nella pagina antiquari, ma non si e'
   mai visto: il suo codice guardava window.pageYOffset, mentre
   quella pagina ha html,body{height:100%} e quindi a scorrere
   e' <body>, non la finestra. pageYOffset restava a zero e la
   classe "show" non veniva mai aggiunta.

   Qui la posizione si legge da tutti e tre i posti possibili e
   l'ascolto e' in fase di cattura, cosi' arrivano anche gli
   eventi di scorrimento di <body>, che non risalgono da soli.
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var SOGLIA = 400;          /* pixel di scorrimento prima di comparire */
  var bottone = null;

  function posizione() {
    return Math.max(
      window.pageYOffset || 0,
      document.documentElement ? document.documentElement.scrollTop || 0 : 0,
      document.body ? document.body.scrollTop || 0 : 0
    );
  }

  function senzaAnimazioni() {
    return window.matchMedia &&
           window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function vaiSu() {
    var opzioni = senzaAnimazioni() ? { top: 0 }
                                    : { top: 0, behavior: "smooth" };
    /* si prova su tutti: solo quello che scorre davvero reagisce */
    try { window.scrollTo(opzioni); } catch (e) { window.scrollTo(0, 0); }
    [document.documentElement, document.body].forEach(function (el) {
      if (!el || !el.scrollTop) return;
      if (el.scrollTo) el.scrollTo(opzioni);
      else el.scrollTop = 0;
    });
  }

  function aggiorna() {
    if (!bottone) return;
    if (posizione() > SOGLIA) bottone.classList.add("visibile");
    else bottone.classList.remove("visibile");
  }

  function crea() {
    /* Se la pagina ha ancora il vecchio link, lo si toglie: due
       bottoni "torna su" uno sopra l'altro non servono a nessuno. */
    var vecchio = document.getElementById("back-to-top");
    if (vecchio && vecchio.parentNode) vecchio.parentNode.removeChild(vecchio);

    bottone = document.createElement("button");
    bottone.type = "button";
    bottone.className = "torna-su";
    bottone.setAttribute("aria-label", "Torna all'inizio della pagina");
    bottone.title = "Torna su";
    bottone.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"></path></svg>';
    bottone.addEventListener("click", vaiSu);
    document.body.appendChild(bottone);
  }

  function avvia() {
    crea();
    /* true = fase di cattura: intercetta anche lo scorrimento di
       <body>, che non risale ai suoi antenati. */
    document.addEventListener("scroll", aggiorna, true);
    window.addEventListener("resize", aggiorna);
    aggiorna();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avvia);
  } else {
    avvia();
  }
}());
