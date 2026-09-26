// Bottone "Torna su", compare dopo un po' di scorrimento
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
    // Togli il vecchio link se c'è ancora
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
    // In fase di cattura, per prendere anche lo scorrimento di <body>
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
