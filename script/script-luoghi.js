/* Il file delle entita' sta passando da "entità" (accentato) a "entita":
   si prova prima il nome nuovo e si ricade sul vecchio, cosi' la rinomina
   nel repo e l'aggiornamento di questo file possono avvenire in momenti
   diversi senza lasciare la pagina senza dati. */
// Il nome senza accento viene usato appena e' disponibile nel repo.
function urlEntita() {
    return "https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entita.json";
}
function urlEntitaVecchio() {
    return "https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entit%C3%A0.json";
}
function caricaEntita(cb) {
    return $.getJSON(urlEntita(), cb).fail(function () {
        $.getJSON(urlEntitaVecchio(), cb);
    });
}

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
        maxZoom: 18,                  // Maximum zoom level
        /* Di serie Leaflet salta di uno zoom intero alla volta, e fra
           uno scatto e l'altro la scala raddoppia: dovendo arrotondare
           per difetto, fitBounds lasciava mezzo pianeta intorno alle
           sedi e l'Europa tornava minuscola. Con passi di un quarto la
           mappa si ferma alla distanza giusta, su ogni schermo. */
        zoomSnap: 0.25,
        zoomDelta: 0.5
    });

    /* La vista di partenza era fissa: setView([30, -30], 3), cioe' un
       punto in mezzo all'Atlantico a uno zoom da continente. A quella
       scala tutta l'Europa sta in un pugno di pixel e i segnaposto
       finivano in un unico gruppo, posizionato nella media delle loro
       coordinate: sopra l'Italia. Chi cercava le sedi inglesi vedeva
       il Regno Unito vuoto.

       Ora la mappa si inquadra sui dati veri (vedi inquadra()). */
    var EUROPA = { lonMin: -15, lonMax: 45 };
    var vistaIniziale = false;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Define marker icons with different colors
    const blueIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const orangeIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const greenIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // New neutral gray icon for missing Apertura and Chiusura
    const grayIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    /* Anno di apertura e di chiusura di una sede, come numeri.

       "1880 ca." e "1930-1935 ca." danno l'anno che li apre, che e'
       quello che serve qui. "in attivita'" non e' un anno: vale l'anno
       corrente, perche' una sede ancora aperta e' attiva anche adesso.
       Quando il campo e' vuoto o illeggibile si restituisce null. */
    function anni(luogo) {
        const numero = (valore) => {
            const n = parseInt(valore, 10);
            return Number.isNaN(n) ? null : n;
        };
        const chiusuraTesto = luogo["Chiusura"] || "";
        return {
            apertura: numero(luogo["Apertura"]),
            chiusura: /in attivit/i.test(chiusuraTesto)
                ? new Date().getFullYear()
                : numero(chiusuraTesto)
        };
    }

    /* Il colore del segnaposto: in che periodo la sede era attiva.

       Si ragiona sull'intervallo di attivita' invece che su una catena
       di casi particolari. Quella di prima lasciava scoperte due
       combinazioni, che finivano nel grigio "dati mancanti" pur avendo
       le date:

       - chiusura esattamente nel 1900: "ante 1900" voleva una chiusura
         minore di 1900 e "1900-1950" una maggiore di 1900, quindi il
         1900 tondo non ricadeva in nessuno dei due (Bellini,
         1880 ca. - 1900 ca.);
       - sola apertura, senza chiusura, fra il 1900 e il 1950: tutti i
         rami di quel periodo pretendevano anche una data di chiusura
         (Palazzo Simonetti, 1915).

       Quando manca una delle due date vale l'altra per entrambi gli
       estremi: di una sede aperta nel 1915 e di cui non sappiamo altro
       conosciamo comunque il periodo. */
    function getIconForPeriod(luogo) {
        const { apertura, chiusura } = anni(luogo);

        // Senza nessuna delle due date il periodo non si sa: grigio.
        if (apertura === null && chiusura === null) {
            return grayIcon;
        }

        const inizio = apertura !== null ? apertura : chiusura;
        const fine = chiusura !== null ? chiusura : apertura;

        if (fine <= 1900) {
            return blueIcon;    // conclusa entro il 1900
        }
        if (inizio < 1950) {
            return orangeIcon;  // arrivata al Novecento, aperta prima del 1950
        }
        return greenIcon;       // aperta dal 1950 in poi
    }


    /* Il filtro per periodo: chi era attivo nella fascia scelta.

       Stessa lettura delle date del colore (anni() qui sopra), cosi' le
       due regole non possono piu' divergere. Una sede compare in una
       fascia se il suo periodo di attivita' la attraversa, quindi puo'
       comparire in piu' di una: una bottega aperta nel 1880 e chiusa
       nel 1970 era attiva davvero in tutti e tre i periodi.

       Le condizioni di prima erano scritte a mano fascia per fascia e
       si erano scollate dai colori:

       - "Post 1950" accettava qualunque sede priva di data di chiusura
         (`chiusura === null` da solo bastava), comprese le cinque di
         cui non sappiamo nessuna delle due date: comparivano fra le
         attivita' del dopoguerra pur essendo segnaposto grigi;
       - stessa scorciatoia in "1900-1950", dove una sede con la sola
         apertura nell'Ottocento passava comunque;
       - "in attivita'" non e' un numero, quindi la chiusura risultava
         illeggibile e quelle sedi si salvavano solo grazie alla data
         di apertura.

       Una sede senza nessuna delle due date non ha un periodo: resta
       fuori da tutte e tre le fasce e si vede solo sotto "Tutti". */
    function filterByTimePeriod(luogo, period) {
        if (period === 'all') {
            return true;
        }

        const { apertura, chiusura } = anni(luogo);
        if (apertura === null && chiusura === null) {
            return false;
        }

        const inizio = apertura !== null ? apertura : chiusura;
        const fine = chiusura !== null ? chiusura : apertura;

        if (period === 'period1') {
            return inizio <= 1900;              // gia' attiva nell'Ottocento
        }
        if (period === 'period2') {
            return inizio <= 1950 && fine >= 1900;   // attraversa il 1900-1950
        }
        if (period === 'period3') {
            return fine >= 1950;                // arrivata al dopoguerra
        }
        return false;
    }




    // Create a cluster group with custom cluster styling
    var markers = L.markerClusterGroup({
        /* Il raggio predefinito e' 80px: a zoom basso Londra, Parigi e
           Roma cadono dentro lo stesso cerchio e diventano un numero
           solo. Con 45px i paesi restano distinti gia' dalla vista
           iniziale. */
        maxClusterRadius: function (zoom) {
            /* Piu' si e' lontani, piu' il raggio deve essere stretto:
               altrimenti a zoom basso — ed e' il caso del telefono, dove
               l'Europa deve stare in 350 pixel — Londra, Parigi e Roma
               ricadono nello stesso cerchio e tornano a essere un numero
               solo sopra l'Italia. */
            if (zoom <= 4) return 18;
            if (zoom <= 6) return 32;
            return 45;
        },
        iconCreateFunction: function (cluster) {
            var childCount = cluster.getChildCount();
            var clusterClass = ' marker-cluster-small';  // Default to small clusters

            // Adjust the cluster size classes based on the number of markers
            if (childCount > 100) {
                clusterClass = ' marker-cluster-large';  // Large clusters
            } else if (childCount > 10) {
                clusterClass = ' marker-cluster-medium';  // Medium clusters
            }

            // Set the background color based on the class (small, medium, large)
            let backgroundColor = "#888"; // Default light gray for small clusters
            if (childCount > 100) {
                backgroundColor = "#444";  // Dark gray for large clusters
            } else if (childCount > 10) {
                backgroundColor = "#666";  // Medium gray for medium clusters
            }

            // Return the custom DivIcon with inline styles for background color
            return new L.DivIcon({
                html: `<div style="
                background-color: ${backgroundColor};
                color: white;
                border-radius: 50%; /* Make sure the border is fully circular */
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white; /* Keep the border but make it rounded */
                font-size: 14px;
                box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2); /* Softer, transparent shadow */">
                <span>${childCount}</span></div>`,
                className: 'marker-cluster' + clusterClass,
                iconSize: new L.Point(40, 40) // Set the icon size
            });
        }
    });

    /* Inquadra la mappa sui segnaposto presenti, senza chiedere niente
       a chi guarda: si apre su tutte le sedi, comprese quelle oltre
       oceano, alla distanza scelta da Valentina.

       L'eccezione e' lo schermo stretto: tenere dentro New York e Los
       Angeles su 350 pixel vorrebbe dire ridurre l'Europa a un
       francobollo, e le sedi europee sono il 95% del totale. Sul
       telefono si parte dall'Europa; l'America resta a un gesto di
       distanza. */
    function inquadra() {
        var tutte = [], europa = [];
        markers.eachLayer(function (m) {
            var p = m.getLatLng();
            tutte.push(p);
            if (p.lng >= EUROPA.lonMin && p.lng <= EUROPA.lonMax) {
                europa.push(p);
            }
        });
        var punti = (map.getSize().x < 700 && europa.length) ? europa : tutte;
        if (!punti.length) return;
        map.fitBounds(L.latLngBounds(punti), { padding: [30, 30], maxZoom: 7 });
    }

    /* ── Schermo intero ────────────────────────────────────────────
       Dentro la pagina la mappa e' alta 550 pixel: per guardare una
       via bisogna ingrandire e trascinare dentro una finestrella. A
       schermo intero ci va la cornice, che contiene anche il filtro
       dei periodi: cosi' si continua a scegliere il periodo mentre si
       guarda. Dove il browser non concede lo schermo intero a un
       elemento qualsiasi (Safari su iPhone) si ripiega su una finta a
       tutta finestra, che da' lo stesso risultato. */
    var cornice = document.getElementById("mappa-cornice");
    var bottoneIntero = null;

    /* Passando a schermo intero la mappa cambia forma — da 1040x550 a
       tutto lo schermo — e la vista di partenza, calcolata sull'altra
       forma, lascerebbe le sedi in un angolo con mezzo oceano vuoto
       sotto. Percio' si reinquadra: ma solo finche' nessuno ha mosso
       la mappa, altrimenti si butterebbe via lo zoom di chi stava
       guardando una via. */
    var mossaDaChiGuarda = false;
    ["mousedown", "touchstart", "wheel", "dblclick"].forEach(function (evento) {
        map.getContainer().addEventListener(evento, function () {
            mossaDaChiGuarda = true;
        }, { passive: true });
    });

    function schermoInteroAttivo() {
        var elemento = document.fullscreenElement || document.webkitFullscreenElement;
        return elemento === cornice ||
               (cornice && cornice.classList.contains("a-schermo-intero"));
    }

    function aggiornaBottone() {
        if (!bottoneIntero) return;
        var aperto = schermoInteroAttivo();
        bottoneIntero.innerHTML = aperto ? "&#10005;" : "&#9974;";
        bottoneIntero.title = aperto ? "Esci dallo schermo intero" : "Mappa a schermo intero";
        bottoneIntero.setAttribute("aria-label", bottoneIntero.title);
        bottoneIntero.setAttribute("aria-pressed", aperto ? "true" : "false");
        /* Cambiando forma la mappa deve rimisurarsi, altrimenti resta
           disegnata sulle dimensioni di prima e meta' schermo resta
           grigia. Si aspetta la fine della transizione del browser. */
        setTimeout(function () {
            map.invalidateSize();
            if (!mossaDaChiGuarda) inquadra();
        }, 140);
    }

    function apriFinta() {
        cornice.classList.add("a-schermo-intero");
        document.body.classList.add("mappa-aperta");
        aggiornaBottone();
    }

    function chiudiFinta() {
        cornice.classList.remove("a-schermo-intero");
        document.body.classList.remove("mappa-aperta");
        aggiornaBottone();
    }

    function alternaSchermoIntero() {
        if (!cornice) return;
        if (schermoInteroAttivo()) {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            } else {
                chiudiFinta();
            }
            return;
        }
        var chiedi = cornice.requestFullscreen || cornice.webkitRequestFullscreen;
        if (!chiedi) return apriFinta();
        var esito = chiedi.call(cornice);
        // Il permesso puo' essere negato: in quel caso si ripiega.
        if (esito && esito.catch) esito.catch(apriFinta);
    }

    document.addEventListener("fullscreenchange", aggiornaBottone);
    document.addEventListener("webkitfullscreenchange", aggiornaBottone);
    // Esc chiude anche la finta, come farebbe con quello vero.
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && cornice &&
            cornice.classList.contains("a-schermo-intero")) {
            chiudiFinta();
        }
    });

    if (cornice) {
        var ComandoIntero = L.Control.extend({
            options: { position: "topleft" },
            onAdd: function () {
                var scatola = L.DomUtil.create("div",
                    "leaflet-bar leaflet-control mappa-intero");
                bottoneIntero = L.DomUtil.create("a", "", scatola);
                bottoneIntero.href = "#";
                bottoneIntero.setAttribute("role", "button");
                L.DomEvent.disableClickPropagation(scatola);
                L.DomEvent.on(bottoneIntero, "click", L.DomEvent.stop);
                L.DomEvent.on(bottoneIntero, "click", alternaSchermoIntero);
                return scatola;
            }
        });
        map.addControl(new ComandoIntero());
        aggiornaBottone();
    }

    // Function to update markers based on the selected period
    function updateMarkers(period) {
        markers.clearLayers(); // Clear all clusters before adding new markers
        caricaEntita(
            function (entities_json){
                $.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/luoghi.json", function (luoghi_json) {

                    for (let luogo in luoghi_json) {
                        if (luoghi_json[luogo]["geo"]["lat"] && filterByTimePeriod(luoghi_json[luogo], period)) {

                            // Start with Città
                            let place_name = luoghi_json[luogo]["Città"] || "";
                            let nome_attivita = luoghi_json[luogo]["Nome attività"];
                            let id_entita = luoghi_json[luogo]["ID_entità"];


                            // Format the address
                            if (luoghi_json[luogo]["Via"] && luoghi_json[luogo]["Via"].length > 0) {
                                place_name += `, ${luoghi_json[luogo]["Via"]}`;  // Add Via if present
                                if (luoghi_json[luogo]["Civico"] && luoghi_json[luogo]["Civico"].length > 0) {
                                    place_name += `, ${luoghi_json[luogo]["Civico"]}`;  // Add Civico if present
                                }
                            }

                            // Create the tooltip content
                            let content = `<b>${nome_attivita}</b><br>${place_name}<br>`;

                            // Add the period of activity (Apertura - Chiusura)
                            var apertura = luoghi_json[luogo]["Apertura"] || "";  // Get Apertura or empty string if not present
                            var chiusura = luoghi_json[luogo]["Chiusura"] || "";  // Get Chiusura or empty string if not present

                            // Only show "Periodo attività" if at least one of the fields is not empty
                            if (apertura || chiusura) {
                                content += `Periodo attività: (${apertura}-${chiusura})<br>`;
                            }

                            let ids = id_entita.split(' ');

                            ids.forEach(function (id) {
                                if (id.trim() !== "") {  // Check if id is not an empty string
                                    // content += `<a href="https://fondazionefedericozeri.github.io/Mercato_dell_arte/html/dettagli/dettaglio_${id}.html" target="_blank">Vai a ${id}</a><br>`;
                                    let nome_entita = entities_json[id]["Nome"];
                                    content += `<a href="https://fondazionefedericozeri.github.io/Mercato_dell_arte/html/dettagli/dettaglio_${id}.html" target="_blank">Vai a ${nome_entita}</a><br>`;
                                }
                            });

                            // Create the marker using appropriate color icon based on the period
                            var marker = L.marker([luoghi_json[luogo]["geo"]["lat"], luoghi_json[luogo]["geo"]["lon"]], {
                                icon: getIconForPeriod(luoghi_json[luogo]) // Get icon based on period
                            });

                            // Nuvoletta al passaggio del mouse, riquadro con i link al clic
                            collegaTooltipEPopup(marker, content);

                            // Add marker to the cluster group instead of directly to the map
                            markers.addLayer(marker);
                        }
                    }
                    /* Alla prima apertura ci si inquadra sui dati; ai
                       cambi di filtro no, altrimenti la mappa salta
                       sotto le mani di chi sta guardando. */
                    if (!vistaIniziale) {
                        vistaIniziale = true;
                        inquadra();
                    }
                }).fail(function () {
                    console.error("Failed to load the JSON file.");
                });
            });

        // Add the cluster group to the map after markers are added
        map.addLayer(markers);
    }


    // Initial load with all periods
    updateMarkers('all');

    // Listen for changes in the time period filter
    document.querySelectorAll('input[name="timePeriod"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
            const selectedPeriod = this.value;
            updateMarkers(selectedPeriod); // Call your function to update the map
        });
    });
});

/* Qui c'era un secondo blocco che su telefono faceva map.setView(...):
   "map" vive dentro l'altro ascoltatore, quindi da fuori non esisteva e
   la riga andava in errore a ogni caricamento senza spostare niente.
   L'inquadratura ora la fa inquadra(), che si adatta da sola alla
   larghezza dello schermo perche' parte dai dati. */

// Un luogo sulla mappa: al passaggio del mouse una nuvoletta (tooltip), al
// clic il riquadro con i link (popup). Prima tooltip e popup avevano lo
// stesso contenuto ed erano tutti e due aperti dopo il clic, uno sopra
// l'altro: sembrava una finestra dentro un'altra. Ora il popup chiude la
// nuvoletta e la tiene chiusa finche' resta aperto; sugli schermi senza
// mouse (telefono, tablet) la nuvoletta non c'e' proprio, perche' il tocco
// la faceva lampeggiare prima del popup.
function collegaTooltipEPopup(marker, contenuto) {
  marker.bindPopup(contenuto);
  var conMouse = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!conMouse) return marker;
  marker.bindTooltip(contenuto, { permanent: false, direction: "top" });
  marker.on("popupopen", function () { marker.closeTooltip(); });
  marker.on("tooltipopen", function () {
    if (marker.isPopupOpen()) marker.closeTooltip();
  });
  return marker;
}
