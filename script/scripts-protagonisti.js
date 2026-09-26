// Rete dei protagonisti in home: antiquari e loro collaboratori
document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  var root = document.getElementById("protagonisti-rete");
  if (!root) return; // sezione non presente in questa pagina

  var svg = document.getElementById("pr-net");
  var tip = document.getElementById("pr-tip");
  if (!svg || !tip) return;

  var COLLAB_URL = "https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/collaboratori.json";

  // Quante entità antiquariali mostrare (le più documentate).
  var N_ENTITA = 9;

  // Etichette personalizzate: ID entità -> nome nel grafo
  var ETICHETTE = {
    "PA_III": "Palma"
  };

  // Dimensioni del viewBox
  var W = 620, H = 420;

  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) { e.setAttribute(k, attrs[k]); }
    return e;
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Nascondi rete e legenda, resta solo il testo
  function vuoto() {
    var box = root.closest ? root.closest(".key-people-visual") : null;
    (box || root).classList.add("pr-vuoto");
  }

  fetch(COLLAB_URL)
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (collab) { costruisci(collab); })
    .catch(function (err) {
      // Dati non caricati, resta solo il testo
      console.error("Protagonisti: impossibile caricare collaboratori.json", err);
      vuoto();
    });

  function costruisci(collab) {
    // ---- 1. conta i collaboratori per ogni entità antiquariale ----
    var conteggio = {};
    var nomeDa = {}; // ID entità -> nome ricavato dai dati
    Object.keys(collab).forEach(function (k) {
      var v = collab[k];
      var ids = (v["ID Antiquari"] || "").split(" ").filter(Boolean);
      ids.forEach(function (id) { conteggio[id] = (conteggio[id] || 0) + 1; });
      // Prendi il nome solo se la voce cita un unico antiquario
      if (ids.length === 1) {
        var nome = (v["Nome Antiquari"] || "").trim();
        if (nome && !nomeDa[ids[0]]) nomeDa[ids[0]] = nome;
      }
    });

    var principali = Object.keys(conteggio)
      .sort(function (a, b) { return conteggio[b] - conteggio[a]; })
      .slice(0, N_ENTITA);
    if (!principali.length) { vuoto(); return; }
    var inMappa = {};
    principali.forEach(function (id) { inMappa[id] = true; });

    // ---- 2. costruisci nodi e archi ----
    var nodi = {}, archi = [];
    principali.forEach(function (id) {
      nodi[id] = {
        id: id,
        label: ETICHETTE[id] || nomeDa[id] || id,
        tipo: "ent",
        peso: conteggio[id]
      };
    });

    Object.keys(collab).forEach(function (k) {
      var v = collab[k];
      var ids = (v["ID Antiquari"] || "").split(" ").filter(Boolean)
                  .filter(function (id) { return inMappa[id]; });
      if (!ids.length) return;
      var nome = ((v["Nome"] || "") + " " + (v["Cognome / Denominazione"] || "")).trim();
      if (!nome) return;
      nodi[k] = { id: k, label: nome, tipo: "col", ruolo: (v["Tipologia"] || "").trim() };
      ids.forEach(function (id) { archi.push([k, id]); });
    });

    var lista = Object.keys(nodi).map(function (k) { return nodi[k]; });
    lista.forEach(function (n) { n.x = 0; n.y = 0; n.vx = 0; n.vy = 0; });

    var legami = archi
      .map(function (a) { return { s: nodi[a[0]], t: nodi[a[1]] }; })
      .filter(function (l) { return l.s && l.t; });

    // ---- 3. posizioni iniziali deterministiche ----
    // Seed fisso, il grafo si dispone sempre uguale
    var seed = 7;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    lista.forEach(function (n, i) {
      var a = (i / lista.length) * Math.PI * 2;
      var r = n.tipo === "ent" ? 70 + rnd() * 40 : 130 + rnd() * 70;
      n.x = W / 2 + Math.cos(a) * r;
      n.y = H / 2 + Math.sin(a) * r * 0.72;
    });

    // ---- 4. raggio dei nodi ----
    var grado = {};
    legami.forEach(function (l) {
      grado[l.s.id] = (grado[l.s.id] || 0) + 1;
      grado[l.t.id] = (grado[l.t.id] || 0) + 1;
    });
    lista.forEach(function (n) {
      n.r = n.tipo === "ent"
        ? Math.max(7, Math.min(19, 5 + Math.sqrt(n.peso) * 2.6))
        : ((grado[n.id] || 1) > 1 ? 4.6 : 3.2);
      // "ponte" = collaboratore attivo per più di un antiquario
      n.ponte = n.tipo === "col" && (grado[n.id] || 1) > 1;
    });

    // ---- 5. elementi SVG ----
    var gArchi = el("g", {}), gNodi = el("g", {});
    svg.appendChild(gArchi);
    svg.appendChild(gNodi);

    legami.forEach(function (l) {
      l.el = el("line", { "class": "pr-arco" });
      gArchi.appendChild(l.el);
    });
    lista.forEach(function (n) {
      n.el = el("circle", {
        "class": "pr-nodo " + (n.tipo === "ent" ? "pr-ent" : (n.ponte ? "pr-ponte" : "pr-col")),
        "r": n.r,
        "data-ent": n.id,
        "tabindex": n.tipo === "ent" ? "0" : null
      });
      if (n.tipo !== "ent") n.el.removeAttribute("tabindex");
      gNodi.appendChild(n.el);
    });
    lista.filter(function (n) { return n.tipo === "ent"; }).forEach(function (n) {
      n.txt = el("text", { "class": "pr-etichetta", "text-anchor": "middle", "data-ent": n.id });
      n.txt.textContent = n.label;
      gNodi.appendChild(n.txt);
    });

    // ---- 6. simulazione a forze ----
    var alpha = 1;
    var hub = lista.filter(function (n) { return n.tipo === "ent"; });
    // Distanza minima fra due hub
    var DIST_MIN_HUB = 118;

    function passo() {
      var i, j;
      for (i = 0; i < lista.length; i++) {
        var a = lista[i];
        for (j = i + 1; j < lista.length; j++) {
          var b = lista[j];
          var dx = b.x - a.x, dy = b.y - a.y;
          var d2 = dx * dx + dy * dy || 0.01;
          var fraHub = a.tipo === "ent" && b.tipo === "ent";
          // Salta i nodi lontani, ma non le coppie di hub
          if (!fraHub && d2 > 26000) continue;
          var d = Math.sqrt(d2);
          var forza = fraHub ? 5200 : (a.tipo === "ent" || b.tipo === "ent" ? 560 : 210);
          var f = forza / d2;
          var fx = dx / d * f, fy = dy / d * f;
          a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
        }
      }
      legami.forEach(function (l) {
        var dx = l.t.x - l.s.x, dy = l.t.y - l.s.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        var f = (d - 54) * 0.035;
        var fx = dx / d * f, fy = dy / d * f;
        l.s.vx += fx; l.s.vy += fy; l.t.vx -= fx; l.t.vy -= fy;
      });
      lista.forEach(function (n) {
        n.vx += (W / 2 - n.x) * 0.004;
        n.vy += (H / 2 - n.y) * 0.007;
        n.x += n.vx * alpha; n.y += n.vy * alpha;
        n.vx *= 0.82; n.vy *= 0.82;
      });

      // Allontana gli hub troppo vicini
      for (i = 0; i < hub.length; i++) {
        for (j = i + 1; j < hub.length; j++) {
          var A = hub[i], B = hub[j];
          var hx = B.x - A.x, hy = B.y - A.y;
          var hd = Math.sqrt(hx * hx + hy * hy) || 0.01;
          if (hd < DIST_MIN_HUB) {
            var spinta = (DIST_MIN_HUB - hd) / 2;
            var ux = hx / hd, uy = hy / hd;
            A.x -= ux * spinta; A.y -= uy * spinta;
            B.x += ux * spinta; B.y += uy * spinta;
          }
        }
      }
    }

    // Adatta il grafo al riquadro
    function proietta() {
      var minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
      lista.forEach(function (n) {
        if (n.x < minx) minx = n.x;
        if (n.x > maxx) maxx = n.x;
        if (n.y < miny) miny = n.y;
        if (n.y > maxy) maxy = n.y;
      });
      var padX = 34, padT = 26, padB = 20;
      var s = Math.min((W - padX * 2) / Math.max(1, maxx - minx),
                       (H - padT - padB) / Math.max(1, maxy - miny));
      var ox = (W - (maxx - minx) * s) / 2 - minx * s;
      var oy = (H - padT - padB - (maxy - miny) * s) / 2 + padT - miny * s;
      lista.forEach(function (n) { n.px = n.x * s + ox; n.py = n.y * s + oy; });
    }

    // Etichette degli hub, sopra il nodo o sotto se sopra è occupato
    function etichette() {
      var poste = [];
      function libera(x, y) {
        return poste.every(function (p) {
          return Math.abs(p.x - x) >= 78 || Math.abs(p.y - y) >= 14;
        });
      }
      lista.filter(function (n) { return n.txt; })
        .sort(function (a, b) { return a.py - b.py; })
        .forEach(function (n) {
          var sopra = n.py - n.r - 7;
          var sotto = n.py + n.r + 14;
          var y = libera(n.px, sopra) ? sopra : (libera(n.px, sotto) ? sotto : sopra);
          y = Math.max(11, Math.min(H - 4, y));
          poste.push({ x: n.px, y: y });
          n.txt.setAttribute("x", n.px.toFixed(1));
          n.txt.setAttribute("y", y.toFixed(1));
        });
    }

    function disegna() {
      proietta();
      legami.forEach(function (l) {
        l.el.setAttribute("x1", l.s.px.toFixed(1));
        l.el.setAttribute("y1", l.s.py.toFixed(1));
        l.el.setAttribute("x2", l.t.px.toFixed(1));
        l.el.setAttribute("y2", l.t.py.toFixed(1));
      });
      lista.forEach(function (n) {
        n.el.setAttribute("cx", n.px.toFixed(1));
        n.el.setAttribute("cy", n.py.toFixed(1));
      });
      etichette();
    }

    // ---- 7. avvio: solo quando la sezione è visibile ----
    var avviato = false;
    function avvia() {
      if (avviato) return;
      avviato = true;
      root.classList.add("pr-pronto");

      if (reduce) {
        for (var k = 0; k < 400; k++) passo();
        disegna();
        return;
      }
      for (var k0 = 0; k0 < 90; k0++) passo(); // parte già semi-ordinata
      var frame = 0;
      (function ciclo() {
        passo();
        disegna();
        frame++;
        alpha = Math.max(0.15, 1 - frame / 260);
        if (frame < 320) requestAnimationFrame(ciclo);
      })();
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { avvia(); io.disconnect(); }
        });
      }, { threshold: 0.15 });
      io.observe(root);
    } else {
      avvia();
    }

    // ---- 8. interazione ----
    var vicini = {};
    legami.forEach(function (l) {
      (vicini[l.s.id] = vicini[l.s.id] || {})[l.t.id] = 1;
      (vicini[l.t.id] = vicini[l.t.id] || {})[l.s.id] = 1;
    });

    function evidenzia(n) {
      svg.classList.add("pr-dim");
      lista.forEach(function (m) {
        m.el.classList.toggle("pr-on", m.id === n.id || (vicini[n.id] && vicini[n.id][m.id]));
      });
      legami.forEach(function (l) {
        l.el.classList.toggle("pr-on", l.s.id === n.id || l.t.id === n.id);
      });
      var rect = svg.getBoundingClientRect();
      var sx = n.px / W * rect.width, sy = n.py / H * rect.height;
      tip.innerHTML = "<b></b><span></span>";
      tip.firstChild.textContent = n.label;
      tip.lastChild.textContent = n.tipo === "ent"
        ? n.peso + " collaboratori documentati"
        : (n.ruolo || "collaboratore");
      tip.style.left = Math.min(Math.max(sx - 60, 0), Math.max(0, rect.width - 170)) + "px";
      tip.style.top = Math.max(sy - 72, 0) + "px";
      tip.classList.add("pr-on");
    }

    function spegni() {
      svg.classList.remove("pr-dim");
      tip.classList.remove("pr-on");
      lista.forEach(function (m) { m.el.classList.remove("pr-on"); });
      legami.forEach(function (l) { l.el.classList.remove("pr-on"); });
    }

    lista.forEach(function (n) {
      n.el.addEventListener("mouseenter", function () { evidenzia(n); });
      n.el.addEventListener("mouseleave", spegni);
      if (n.tipo === "ent") {
        // Focus da tastiera sulle entità principali
        n.el.addEventListener("focus", function () { evidenzia(n); });
        n.el.addEventListener("blur", spegni);
      }
    });
    svg.addEventListener("mouseleave", spegni);
  }
});
