// Bibliografia: apre una sezione di fonti alla volta
document.addEventListener("DOMContentLoaded", function () {

    var carte = Array.prototype.slice.call(
        document.querySelectorAll(".bib-carta[data-sezione]"));
    if (!carte.length) return;

    function sezioneDi(chiave) {
        return document.getElementById("sezione-" + chiave);
    }

    // Chiudi tutte le sezioni
    function chiudiTutto() {
        document.documentElement.classList.remove("bib-aperta");
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
        document.documentElement.classList.add("bib-aperta");
        sezione.classList.add("aperta");
        carte.forEach(function (c) {
            if (c.getAttribute("data-sezione") === chiave) {
                c.setAttribute("aria-expanded", "true");
                c.classList.add("aperta");
            }
        });
        // Aggiorna l'indirizzo senza aggiungere alla cronologia
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

    // Apri la sezione indicata nell'indirizzo
    var ancora = (window.location.hash || "").replace("#", "");
    if (/^lettera-/.test(ancora)) {
        apri("stampa", false);
        var bersaglio = document.getElementById(ancora);
        if (bersaglio) bersaglio.scrollIntoView();
    } else if (ancora) {
        apri(ancora, false);
    }

    // Lettere dell'alfabeto in cima all'elenco a stampa
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
