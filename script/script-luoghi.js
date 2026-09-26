// Carica entita.json, se manca usa il vecchio entità.json
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
        /* zoom a passi di un quarto */
        zoomSnap: 0.25,
        zoomDelta: 0.5
    });

    /* vista iniziale calcolata sui dati, vedi inquadra() */
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

    /* Anni di apertura e chiusura come numeri */
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

    /* Colore del segnaposto in base al periodo di attività */
    function getIconForPeriod(luogo) {
        const { apertura, chiusura } = anni(luogo);

        // senza date, grigio
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


    /* Filtro per periodo: la sede compare in ogni fascia che attraversa */
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
            return inizio <= 1900;              // già attiva nell'Ottocento
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
        /* raggio dei gruppi più stretto a zoom basso */
        maxClusterRadius: function (zoom) {
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

    /* Inquadra la mappa sui segnaposto, sul telefono solo sull'Europa */
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

    /* Schermo intero, con ripiego a tutta finestra dove non è supportato */
    var cornice = document.getElementById("mappa-cornice");
    var bottoneIntero = null;

    /* Reinquadra a schermo intero solo se la mappa non è stata mossa */
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
        /* rimisura la mappa dopo il cambio di dimensioni */
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
        // se il permesso è negato si ripiega sulla finta
        if (esito && esito.catch) esito.catch(apriFinta);
    }

    document.addEventListener("fullscreenchange", aggiornaBottone);
    document.addEventListener("webkitfullscreenchange", aggiornaBottone);
    // Esc chiude anche la finta
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
                    /* inquadra solo alla prima apertura */
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

// Nuvoletta al passaggio del mouse, popup coi link al clic
// il popup chiude la nuvoletta, che senza mouse non c'è
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
