// Albero familiare nella pagina di dettaglio antiquario
(function (globale) {
  "use strict";

  var URL_PARENTELA = "https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/parentela.json";

  // Grado di parentela -> livelli di distanza fra le due persone
  var SCARTO = {
    "padre": 1, "madre": 1, "nonno": 2, "nonna": 2, "bisnonno": 3, "zio": 1,
    "nuora": -1, "genero": -1, "nipote": -1,
    "fratello/sorella": 0, "cugino": 0, "coniuge": 0, "marito": 0
  };
  var DISCENDENZA = { "padre": 1, "madre": 1 };

  function anno(s) { var m = (s || "").match(/\d{4}/); return m ? +m[0] : null; }

  // Riconduci le varie grafie dello stesso grado a una sola
  var SINONIMI = {
    "fratello": "fratello/sorella",
    "sorella": "fratello/sorella",
    "fratelli": "fratello/sorella",
    "fratello/ sorella": "fratello/sorella",
    "sorella/fratello": "fratello/sorella"
  };
  function grado(tipo) {
    var t = (tipo || "").trim().toLowerCase();
    return SINONIMI[t] || t;
  }

  function etichettaDate(p) {
    var nascita = (p.Nascita || "").trim();
    var morte = (p.Morte || "").trim();
    if (morte.toLowerCase() === "in vita") return nascita ? nascita + "–" : "";
    if (!nascita && !morte) return "";
    return (nascita || "?") + "–" + (morte || "?");
  }

  // Togli le persone senza nome e le relazioni non valide
  function ripulisci(entita) {
    var persone = {};
    Object.keys(entita.Persone || {}).forEach(function (pid) {
      var p = entita.Persone[pid];
      if (p && (p.Nome || "").trim()) persone[pid] = p;
    });
    var relazioni = (entita.Relazioni || [])
      .filter(function (r) {
        return persone[r.Persona_1] && persone[r.Persona_2]
          // Scarta le relazioni di una persona con se stessa
          && r.Persona_1 !== r.Persona_2;
      })
      .map(function (r) {
        return {
          Persona_1: r.Persona_1,
          Persona_2: r.Persona_2,
          Tipo_di_relazione: grado(r.Tipo_di_relazione)
        };
      });
    return { persone: persone, relazioni: relazioni };
  }

  function genitoriDi(dati) {
    var g = {};
    dati.relazioni.forEach(function (r) {
      if (DISCENDENZA[r.Tipo_di_relazione]) {
        (g[r.Persona_2] = g[r.Persona_2] || []).push(r.Persona_1);
      }
    });
    return g;
  }

  // Controlla se il legame si legge già dalla discendenza disegnata
  function implicito(r, gen) {
    var su = function (x) { return gen[x] || []; };
    var nonni = function (x) {
      var o = []; su(x).forEach(function (p) { o = o.concat(su(p)); }); return o;
    };
    var bisnonni = function (x) {
      var o = []; nonni(x).forEach(function (p) { o = o.concat(su(p)); }); return o;
    };
    var fratelli = function (x) {
      var o = [];
      su(x).forEach(function (p) {
        Object.keys(gen).forEach(function (f) {
          if (f !== x && su(f).indexOf(p) > -1) o.push(f);
        });
      });
      return o;
    };
    var a = r.Persona_1, b = r.Persona_2;
    switch (r.Tipo_di_relazione) {
      case "nonno": case "nonna": return nonni(b).indexOf(a) > -1;
      case "bisnonno": return bisnonni(b).indexOf(a) > -1;
      case "fratello/sorella": return fratelli(b).indexOf(a) > -1;
      case "zio": return su(b).some(function (p) { return fratelli(p).indexOf(a) > -1; });
      case "cugino": return su(a).some(function (pa) {
        return su(b).some(function (pb) { return fratelli(pa).indexOf(pb) > -1; });
      });
      default: return false;
    }
  }

  /* Livello di ogni persona, ricavato da tutti i gradi insieme. */
  function generazioni(dati) {
    var ids = Object.keys(dati.persone), liv = {};
    ids.forEach(function (i) { liv[i] = null; });
    var archi = dati.relazioni.filter(function (r) {
      return SCARTO[r.Tipo_di_relazione] !== undefined;
    });
    ids.forEach(function (seme) {
      if (liv[seme] !== null) return;
      liv[seme] = 0;
      for (var giro = 0; giro < ids.length + 2; giro++) {
        var mosso = false;
        archi.forEach(function (r) {
          var s = SCARTO[r.Tipo_di_relazione];
          if (liv[r.Persona_1] !== null && liv[r.Persona_2] === null) {
            liv[r.Persona_2] = liv[r.Persona_1] + s; mosso = true;
          } else if (liv[r.Persona_2] !== null && liv[r.Persona_1] === null) {
            liv[r.Persona_1] = liv[r.Persona_2] - s; mosso = true;
          }
        });
        if (!mosso) break;
      }
    });
    var minimo = Math.min.apply(null, ids.map(function (i) { return liv[i]; }));
    var righe = {};
    ids.forEach(function (i) {
      var L = liv[i] - minimo;
      (righe[L] = righe[L] || []).push(i);
    });
    ordinaRighe(righe, dati);
    return righe;
  }

  // Ordina ogni riga in base alla posizione dei genitori nella riga sopra,
  // a parità per anno di nascita
  function ordinaRighe(righe, dati) {
    var perNascita = function (a, b) {
      var na = anno(dati.persone[a].Nascita), nb = anno(dati.persone[b].Nascita);
      if (na && nb) return na - nb;
      if (na) return -1;
      if (nb) return 1;
      return (dati.persone[a].Nome || "").localeCompare(dati.persone[b].Nome || "", "it");
    };

    var genitori = genitoriDi(dati);
    var aggiungi = function (m, k, v) { (m[k] = m[k] || []).push(v); };

    // Parenti sulla stessa riga: fratelli prima, poi cugini e coniugi.
    var fratelli = {}, affini = {};
    // Zii: stanno nella riga di sopra ma non sono genitori.
    var zii = {};
    dati.relazioni.forEach(function (r) {
      var t = r.Tipo_di_relazione, a = r.Persona_1, b = r.Persona_2;
      if (t === "fratello/sorella") { aggiungi(fratelli, a, b); aggiungi(fratelli, b, a); }
      else if (t === "cugino" || t === "coniuge" || t === "marito") { aggiungi(affini, a, b); aggiungi(affini, b, a); }
      else if (t === "zio") aggiungi(zii, b, a);        // a è lo zio di b
      else if (t === "nipote") aggiungi(zii, a, b);     // a è il nipote di b
    });

    var livelli = Object.keys(righe).map(Number).sort(function (a, b) { return a - b; });
    livelli.forEach(function (L, indiceLivello) {
      if (indiceLivello === 0) { righe[L].sort(perNascita); return; }

      var sopra = {};
      righe[livelli[indiceLivello - 1]].forEach(function (pid, i) { sopra[pid] = i; });

      var bar = {};
      righe[L].forEach(function (pid) {
        var pos = (genitori[pid] || [])
          .map(function (g) { return sopra[g]; })
          .filter(function (v) { return v !== undefined; });
        if (pos.length) {
          bar[pid] = pos.reduce(function (s, v) { return s + v; }, 0) / pos.length;
        }
      });

      var media = function (valori) {
        valori = valori.filter(function (v) { return v !== undefined; });
        return valori.length
          ? valori.reduce(function (s, v) { return s + v; }, 0) / valori.length
          : undefined;
      };

      // Senza genitori sopra, mettilo sotto gli zii
      righe[L].forEach(function (pid) {
        if (bar[pid] !== undefined) return;
        var v = media((zii[pid] || []).map(function (z) { return sopra[z]; }));
        if (v !== undefined) bar[pid] = v;
      });

      // Poi usa fratelli, cugini e coniugi sulla stessa riga
      for (var giro = 0; giro < 2; giro++) {
        [fratelli, affini].forEach(function (legami) {
          righe[L].forEach(function (pid) {
            if (bar[pid] !== undefined) return;
            var v = media((legami[pid] || []).map(function (f) { return bar[f]; }));
            if (v !== undefined) bar[pid] = v;
          });
        });
      }

      // Chi resta senza riferimenti tiene il posto che aveva.
      var iniziale = {};
      righe[L].slice().sort(perNascita).forEach(function (pid, i) { iniziale[pid] = i; });

      righe[L].sort(function (a, b) {
        var ba = bar[a], bb = bar[b];
        if (ba !== undefined && bb !== undefined && ba !== bb) return ba - bb;
        if (ba !== undefined && bb === undefined) return -1;
        if (ba === undefined && bb !== undefined) return 1;
        // Stessa posizione, ordina per anno di nascita
        var perAnno = perNascita(a, b);
        return perAnno !== 0 ? perAnno : iniziale[a] - iniziale[b];
      });
    });
  }

  var NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attr) {
    var e = document.createElementNS(NS, tag);
    for (var k in attr) e.setAttribute(k, attr[k]);
    return e;
  }

  function costruisci(contenitore, entita) {
    var dati = ripulisci(entita);
    if (!Object.keys(dati.persone).length) return false;

    contenitore.innerHTML = "";
    var telaio = document.createElement("div");
    telaio.className = "af-telaio";

    // Legenda accanto al titolo, o in cima al telaio se manca il posto
    var chiavi =
      '<span class="af-legenda-titolo">Legenda</span>' +
      '<span class="af-chiave"><i></i>discendenza diretta</span>' +
      '<span class="af-chiave"><i class="fr"></i>fratelli</span>' +
      '<span class="af-chiave"><i class="lat"></i>altri gradi</span>';
    var fuori = document.getElementById("af-legenda");
    if (fuori) {
      fuori.innerHTML = chiavi;
    } else {
      var legenda = document.createElement("div");
      legenda.className = "af-legenda";
      legenda.innerHTML = chiavi;
      telaio.appendChild(legenda);
    }

    var albero = document.createElement("div");
    albero.className = "af-albero";
    var righe = generazioni(dati), caselle = {};
    Object.keys(righe).map(Number).sort(function (a, b) { return a - b; })
      .forEach(function (L) {
        var riga = document.createElement("div");
        riga.className = "af-riga";
        righe[L].forEach(function (pid) {
          var p = dati.persone[pid];
          var c = document.createElement("div");
          c.className = "af-scheda";
          var n = document.createElement("div");
          n.className = "af-nome";
          n.textContent = p.Nome;
          c.appendChild(n);
          var d = etichettaDate(p);
          if (d) {
            var dd = document.createElement("div");
            dd.className = "af-date";
            dd.textContent = d;
            c.appendChild(dd);
          }
          riga.appendChild(c);
          caselle[pid] = c;
        });
        albero.appendChild(riga);
      });
    telaio.appendChild(albero);
    contenitore.appendChild(telaio);

    // Raggruppa i fratelli, le altre relazioni vanno disegnate
    var gen = genitoriDi(dati), daDisegnare = [], gruppiFratelli = [];
    dati.relazioni.forEach(function (r) {
      if (implicito(r, gen)) return;
      if (r.Tipo_di_relazione === "fratello/sorella") {
        var tocca = gruppiFratelli.filter(function (g) {
          return g.indexOf(r.Persona_1) > -1 || g.indexOf(r.Persona_2) > -1;
        });
        if (!tocca.length) {
          gruppiFratelli.push([r.Persona_1, r.Persona_2]);
        } else {
          var unito = tocca.reduce(function (acc, g) { return acc.concat(g); },
                                   [r.Persona_1, r.Persona_2]);
          gruppiFratelli = gruppiFratelli.filter(function (g) { return tocca.indexOf(g) < 0; });
          gruppiFratelli.push(unito.filter(function (v, i, a) { return a.indexOf(v) === i; }));
        }
        return;
      }
      daDisegnare.push(r);
    });
    if (gruppiFratelli.length) albero.classList.add("af-con-graffa");

    // Disegna le linee a layout concluso
    requestAnimationFrame(function () {
      var base = albero.getBoundingClientRect();
      var svg = svgEl("svg", { "class": "af-linee", viewBox: "0 0 " + base.width + " " + base.height });
      albero.insertBefore(svg, albero.firstChild);
      var perPersona = {};

      daDisegnare.forEach(function (r) {
        var A = caselle[r.Persona_1], B = caselle[r.Persona_2];
        if (!A || !B) return;
        var a = A.getBoundingClientRect(), b = B.getBoundingClientRect();
        var verticale = DISCENDENZA[r.Tipo_di_relazione];
        var stessaRiga = Math.abs(a.top - b.top) < 2;
        var x1 = a.left - base.left + a.width / 2, x2 = b.left - base.left + b.width / 2;
        var y1, y2, d;

        if (verticale) {
          y1 = a.top - base.top + a.height;
          y2 = b.top - base.top;
          var m = (y1 + y2) / 2;
          d = "M" + x1 + "," + y1 + " C" + x1 + "," + m + " " + x2 + "," + m + " " + x2 + "," + y2;
        } else if (stessaRiga) {
          // Stessa riga: linea dritta, o sotto se c'è una scheda in mezzo
          var sinistra = a.left < b.left ? a : b, destra = a.left < b.left ? b : a;
          var inMezzo = Object.keys(caselle).some(function (id) {
            var c = caselle[id].getBoundingClientRect();
            if (Math.abs(c.top - a.top) >= 2) return false;
            var cx = c.left + c.width / 2;
            return cx > sinistra.left + sinistra.width && cx < destra.left;
          });
          y1 = a.top - base.top + a.height / 2;
          if (!inMezzo) {
            d = "M" + (sinistra.left + sinistra.width - base.left) + "," + y1 +
                " H" + (destra.left - base.left);
          } else {
            var giu = a.top - base.top + a.height + 16;
            d = "M" + x1 + "," + (a.top - base.top + a.height) + " V" + giu +
                " H" + x2 + " V" + (b.top - base.top + b.height);
          }
        } else {
          y1 = a.top - base.top + a.height;
          y2 = b.top - base.top;
          d = "M" + x1 + "," + y1 + " C" + (x1 - 40) + "," + ((y1 + y2) / 2) +
              " " + (x2 - 40) + "," + ((y1 + y2) / 2) + " " + x2 + "," + y2;
        }

        var p = svgEl("path", { "class": "af-linea" + (verticale ? "" : " af-laterale"), d: d });
        svg.appendChild(p);
        var t = svgEl("text", { "class": "af-etichetta" + (verticale ? "" : " lat") });
        var pt = p.getPointAtLength(p.getTotalLength() * 0.5);
        t.setAttribute("x", pt.x);
        t.setAttribute("y", pt.y + (stessaRiga && !verticale ? -6 : 3));
        t.textContent = r.Tipo_di_relazione;
        svg.appendChild(t);

        [r.Persona_1, r.Persona_2].forEach(function (id) {
          (perPersona[id] = perPersona[id] || []).push({
            linea: p, testo: t, altro: id === r.Persona_1 ? r.Persona_2 : r.Persona_1
          });
        });
      });

      // Graffa orizzontale sopra ogni gruppo di fratelli
      gruppiFratelli.forEach(function (gruppo) {
        var box = gruppo.map(function (id) { return caselle[id]; }).filter(Boolean);
        if (box.length < 2) return;
        var rect = box.map(function (c) { return c.getBoundingClientRect(); });
        var cx = rect.map(function (b) { return b.left - base.left + b.width / 2; })
                     .sort(function (a, b) { return a - b; });
        var cima = Math.min.apply(null, rect.map(function (b) { return b.top - base.top; }));
        var y = cima - 17;
        var d = "M" + cx[0] + "," + y + " H" + cx[cx.length - 1];
        cx.forEach(function (x) { d += " M" + x + "," + y + " V" + cima; });
        var p = svgEl("path", { "class": "af-linea af-graffa", d: d });
        svg.appendChild(p);
        var t = svgEl("text", {
          "class": "af-etichetta fr",
          x: (cx[0] + cx[cx.length - 1]) / 2, y: y - 5
        });
        t.textContent = "fratelli";
        svg.appendChild(t);
        gruppo.forEach(function (id) {
          (perPersona[id] = perPersona[id] || []).push({ linea: p, testo: t, gruppo: gruppo });
        });
      });

      Object.keys(caselle).forEach(function (pid) {
        caselle[pid].addEventListener("mouseenter", function () {
          albero.classList.add("af-evidenzia");
          caselle[pid].classList.add("af-attiva");
          (perPersona[pid] || []).forEach(function (v) {
            v.linea.classList.add("on");
            v.testo.classList.add("on");
            if (v.altro && caselle[v.altro]) caselle[v.altro].classList.add("af-parente");
            if (v.gruppo) v.gruppo.forEach(function (id) {
              if (id !== pid && caselle[id]) caselle[id].classList.add("af-parente");
            });
          });
        });
        caselle[pid].addEventListener("mouseleave", function () {
          albero.classList.remove("af-evidenzia");
          Object.keys(caselle).forEach(function (k) {
            caselle[k].classList.remove("af-attiva", "af-parente");
          });
          Array.prototype.forEach.call(svg.querySelectorAll(".on"), function (e) {
            e.classList.remove("on");
          });
        });
      });
    });

    return true;
  }

  // Nascondi la scheda se non ci sono dati
  function nascondiScheda() {
    var tab = document.querySelector('.tab[data_content="Persone"]');
    var contenuto = document.getElementById("Persone");
    if (tab) tab.style.display = "none";
    if (contenuto) contenuto.style.display = "none";
  }

  var gia = false;
  function avvia() {
    if (gia) return;
    var contenitore = document.getElementById("albero-genealogico");
    if (!contenitore) return;
    gia = true;

    var id = (window.location.href.split("dettaglio_")[1] || "").split(".html")[0];
    if (!id) { nascondiScheda(); return; }

    fetch(URL_PARENTELA)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (dati) {
        var entita = dati && dati[id];
        if (!entita || !costruisci(contenitore, entita)) nascondiScheda();
      })
      .catch(function (err) {
        console.error("Albero familiare: dati non disponibili", err);
        nascondiScheda();
      });
  }

  globale.AlberoFamiliare = { avvia: avvia };
})(window);
