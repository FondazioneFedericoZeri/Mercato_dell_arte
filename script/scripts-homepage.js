// INIZIO SCRIPTS JAVASCRIPT

// Spegne il cursore lampeggiante del titolo "hero-typewriter" una volta che
// l'animazione di scrittura/cancellazione (definita in styles.css) è terminata.
// Senza questo, la barra "|" continua a lampeggiare all'infinito (animazione
// "blink" con infinite) anche a testo fermo, facendo pensare che si possa
// scrivere lì dentro. La classe "finished" (già presente nel CSS) rimuove il
// bordo che simula il cursore.
document.addEventListener("DOMContentLoaded", function () {
  const typewriter = document.querySelector(".hero-typewriter");
  if (!typewriter) return;

  let typingCompletions = 0;
  typewriter.addEventListener("animationend", function (event) {
    // La sequenza CSS è: typing (scrittura) -> delete (cancellazione) -> typing (riscrittura).
    // Aspettiamo la SECONDA "typing" perché è quella con cui si conclude la sequenza.
    if (event.animationName === "typing") {
      typingCompletions++;
      if (typingCompletions >= 2) {
        typewriter.classList.add("finished");
      }
    }
  });
});


$.ajaxSetup({
  async: true // Assicura che tutte le richieste siano asincrone (impostazione predefinita)
});


// $.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/luoghi.json", function (json) {
//   luoghi_json = json;
// });

//SEZIONE 2
// scripts js sezione 2 'search' che permette di applicare la dissolvenza in entrata al testo allo scroll della pagina
document.addEventListener("DOMContentLoaded", function () {
  const searchSection = document.querySelector('#search');
  // In home la sezione #search non c'e': senza questo controllo la
  // funzione va in errore a ogni scroll e a ogni ridimensionamento.
  if (!searchSection) return;

  function checkVisibility() {
    const rect = searchSection.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom >= 0) {
      searchSection.classList.add('visible');
    }
  }

  window.addEventListener('scroll', checkVisibility);
  window.addEventListener('resize', checkVisibility);

  // Controlla la visibilità al caricamento della pagina
  checkVisibility();
});



// scripts js sezione 3: permette di incrementare i numeri
//
// I valori arrivano da json/statistiche.json (poche centinaia di byte),
// generato da script/build_persone.py a partire dagli stessi TSV con cui si
// costruisce html/persone.html: così il contatore non si scolla mai dai dati
// e non serve scaricare i JSON completi (entità.json pesa da solo ~600 KB).
// Se il file non è raggiungibile restano i numeri scritti in index.html.

document.addEventListener("DOMContentLoaded", function () {
  var STATS_URL = "https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/statistiche.json";

  // Parte subito, in parallelo: quando la sezione entra in vista i numeri
  // aggiornati sono quasi sempre già arrivati.
  var statsPronte = fetch(STATS_URL)
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });

  function applicaStatistiche(stats) {
    if (!stats) return;
    document.querySelectorAll("#statistics .stat h3[data-stat]").forEach(function (h3) {
      var v = stats[h3.getAttribute("data-stat")];
      if (typeof v === "number" && isFinite(v)) h3.innerHTML = String(v);
    });
  }

  function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      obj.innerHTML = Math.floor(progress * (end - start) + start);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        obj.classList.add('bold'); // Aggiungi la classe per il grassetto dopo l'animazione
      }
    };
    window.requestAnimationFrame(step);
  }

  function checkStatisticsVisibility() {
    const statsSection = document.querySelector("#statistics");
    if (!statsSection) return;
    const rect = statsSection.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom >= 0 && !statsSection.classList.contains('animated')) {
      statsSection.classList.add('animated');
      // Aspetta i numeri aggiornati prima di far partire il conteggio, così
      // non si vede il valore cambiare a animazione finita.
      statsPronte.then(function (stats) {
        applicaStatistiche(stats);
        const stats_el = document.querySelectorAll("#statistics .stat h3");
        stats_el.forEach(stat => {
          const endValue = parseInt(stat.innerHTML, 10);
          stat.innerHTML = "0";
          animateValue(stat, 0, endValue, 2000);
        });
      });
    }
  }

  window.addEventListener('scroll', checkStatisticsVisibility);
  window.addEventListener('resize', checkStatisticsVisibility);

  // Controlla la visibilità al caricamento della pagina
  checkStatisticsVisibility();
});


// scripts js sezione 4 map: permette di applicare la dissolvenza in entrata al testo allo scroll della pagina
document.addEventListener("DOMContentLoaded", function () {
  const mapTextContent = document.querySelector('#map .text-content');

  function checkMapVisibility() {
    const rect = mapTextContent.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom >= 0) {
      mapTextContent.classList.add('visible');
    }
  }

  window.addEventListener('scroll', checkMapVisibility);
  window.addEventListener('resize', checkMapVisibility);

  // Controlla la visibilità al caricamento della pagina
  checkMapVisibility();
});


// scripts js sezione 4: mappa interattiva con locatoot

document.addEventListener("DOMContentLoaded", function () {
  // Define map bounds to restrict panning and zooming to specific areas
  var bounds = L.latLngBounds(
    L.latLng(-60, -180), // South-West corner (limit Antarctica)
    L.latLng(85, 180)    // North-East corner
  );

  // Initialize the map with bounds, zoom limits, and prevent world repetition
  var map = L.map('chartdiv', {
    maxBounds: bounds,            // Restrict panning outside bounds
    maxBoundsViscosity: 1.0,      // Stick to the bounds when panning
    worldCopyJump: false,         // Disable world repetition
    minZoom: 2,                   // Minimum zoom level to prevent world repeat
    maxZoom: 18                   // Maximum zoom level
  }).setView([30, -30], 3);           // Initial view

  // Add OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Create a MarkerClusterGroup to manage the clusters
  var markers = L.markerClusterGroup();


  // Fetch JSON data
  $.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/luoghi.json", function (luoghi_json) {
    // Loop through JSON data and add city markers to the cluster group
    for (let luogo in luoghi_json) {
      if (luoghi_json[luogo]["geo"]["lat"]) {
        let place_name = luoghi_json[luogo]["Città"];
        let nome_attivita = luoghi_json[luogo]["Nome attività"];
        let id_entita = luoghi_json[luogo]["ID_entità"];

        // Format the address
        if (luoghi_json[luogo]["Via"].length > 0) {
          place_name += `, ${luoghi_json[luogo]["Via"]}`;
          if (luoghi_json[luogo]["Civico"].length > 0) {
            place_name += `, ${luoghi_json[luogo]["Civico"]}`;
          }
        }

        // Generate the content for the tooltip and popup
        let content = `<b>${nome_attivita}</b><br>${place_name}<br>`;

        // Split ID_entità if there are multiple IDs
        let ids = id_entita.split(' '); // Splitting based on space

        // Loop through each ID and create a link
        ids.forEach(function (id) {
          content += `<a href="https://fondazionefedericozeri.github.io/Mercato_dell_arte/html/dettagli/dettaglio_${id}.html" target="_blank">Vai a ${id}</a><br>`;
        });

        // Create the marker
        var marker = L.marker([luoghi_json[luogo]["geo"]["lat"], luoghi_json[luogo]["geo"]["lon"]]);

        // Bind the tooltip (for hover)
        marker.bindTooltip(content, { permanent: false, direction: "top" });

        // Bind the popup (which stays open on click)
        marker.bindPopup(content);

        // Open popup on click
        marker.on('click', function (e) {
          marker.openPopup();
        });

        markers.addLayer(marker); // Add marker to the cluster group
      }
    }

    // Add the MarkerClusterGroup to the map
    map.addLayer(markers);
  }).fail(function () {
    console.error("Failed to load the JSON file.");
  });
});


// La comparsa in dissolvenza delle sezioni della home.
//
// La regola di prima chiedeva che la sezione stesse TUTTA dentro la
// finestra: bordo superiore sotto il bordo alto dello schermo e bordo
// inferiore sopra quello basso. Una sezione la si vede arrivare molto
// prima che finisca dentro, e fino a quel momento restava trasparente:
// di qui l'impressione che l'effetto fosse lentissimo. Peggio ancora
// per le sezioni piu' alte della finestra, che quella condizione non
// la soddisfano mai: su uno schermo di telefono alto 700 pixel i
// protagonisti (741 pixel) restavano invisibili per sempre.
//
// Adesso basta che la sezione entri nello schermo: si comincia a
// vederla mentre sale, che e' come funzionano queste dissolvenze.
document.addEventListener("DOMContentLoaded", function () {
  var sezioni = document.querySelectorAll('.fade-in');
  if (!sezioni.length) return;

  function mostra(elemento) {
    elemento.classList.add('visible');
  }

  // Senza IntersectionObserver (browser molto vecchi) si rinuncia
  // all'effetto, non al contenuto.
  if (!('IntersectionObserver' in window)) {
    sezioni.forEach(mostra);
    return;
  }

  var osservatore = new IntersectionObserver(function (voci) {
    voci.forEach(function (voce) {
      if (!voce.isIntersecting) return;
      mostra(voce.target);
      osservatore.unobserve(voce.target);   // una volta apparsa, resta
    });
  }, {
    // Il bordo basso alzato di 80 pixel: la sezione comincia ad
    // apparire quando e' entrata per davvero, non al primo pixel.
    rootMargin: '0px 0px -80px 0px',
    threshold: 0
  });

  sezioni.forEach(function (s) { osservatore.observe(s); });
});

//bubble
