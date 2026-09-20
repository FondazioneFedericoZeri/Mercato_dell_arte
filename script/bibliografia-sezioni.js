/* Bibliografia: tre nature di fonti, una alla volta.
 *
 * La pagina si apre sulle tre scelte, non su quattrocento voci: si
 * sceglie che tipo di fonte si sta cercando e si apre solo quella.
 * Senza questo copione le tre sezioni restano tutte aperte — e' il
 * comportamento del foglio di stile quando "con-js" non c'e' — cosi'
 * la pagina resta leggibile anche se il copione non arriva.
 */
document.addEventListener("DOMContentLoaded", function () {

    var carte = Array.prototype.slice.call(
        document.querySelectorAll(".bib-carta[data-sezione]"));
    if (!carte.length) return;

    function sezioneDi(chiave) {
        return document.getElementById("sezione-" + chiave);
    }

    function chiudiTutto() {
        carte.forEach(function (c) {
            c.setAttribute("aria-expanded", "false");
            c.classList.remove("aperta");
            var s = sezioneDi(c.getAttribute("data-sezione"));
            if (s) s.classList.remove("aperta");
        });
    }

    function apri(chiave, ricorda) {
        var sezione = sezioneDi(chiave);
        if (!sezione) return false;
        chiudiTutto();
        sezione.classList.add("aperta");
        carte.forEach(function (c) {
            if (c.getAttribute("data-sezione") === chiave) {
                c.setAttribute("aria-expanded", "true");
                c.classList.add("aperta");
            }
        });
        /* L'indirizzo si aggiorna senza aggiungere un passo alla
           cronologia: il tasto "indietro" deve riportare alla pagina
           da cui si e' arrivati, non alla scheda precedente. */
        if (ricorda && window.history && history.replaceState) {
            history.replaceState(null, "", "#" + chiave);
        }
        return true;
    }

    carte.forEach(function (c) {
        c.addEventListener("click", function () {
            var chiave = c.getAttribute("data-sezione");
            if (c.getAttribute("aria-expanded") === "true") {
                chiudiTutto();
                if (window.history && history.replaceState) {
                    history.replaceState(null, "", window.location.pathname);
                }
                return;
            }
            apri(chiave, true);
        });
    });

    /* Si arriva qui anche da un collegamento diretto: "#interviste"
       apre le interviste, "#lettera-c" apre le fonti a stampa e poi
       scende alla lettera. */
    var ancora = (window.location.hash || "").replace("#", "");
    if (/^lettera-/.test(ancora)) {
        apri("stampa", false);
        var bersaglio = document.getElementById(ancora);
        if (bersaglio) bersaglio.scrollIntoView();
    } else if (ancora) {
        apri(ancora, false);
    }

    /* Le lettere dell'alfabeto in cima all'elenco a stampa: la sezione
       e' gia' aperta, basta scendere. */
    var alfabeto = document.querySelector(".bib-alfabeto");
    if (alfabeto) {
        alfabeto.addEventListener("click", function (e) {
            var a = e.target.closest ? e.target.closest("a") : null;
            if (!a) return;
            var id = (a.getAttribute("href") || "").replace("#", "");
            var bersaglio = document.getElementById(id);
            if (!bersaglio) return;
            e.preventDefault();
            bersaglio.scrollIntoView({ behavior: "smooth", block: "start" });
            if (window.history && history.replaceState) {
                history.replaceState(null, "", "#" + id);
            }
        });
    }
});
