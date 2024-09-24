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
    }).setView([30, -30], 3);

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

    // Function to determine the marker icon based on the time period
    function getIconForPeriod(luogo) {
        const apertura = luogo["Apertura"] ? parseInt(luogo["Apertura"]) : null;
        const chiusura = luogo["Chiusura"] ? parseInt(luogo["Chiusura"]) : null;

        // Case 1: If both Apertura and Chiusura are missing, use the gray icon
        if (!apertura && !chiusura) {
            return grayIcon; // Neutral color for missing data
        }

        // Case 2: If the activity ended before 1900 (even if it started earlier)
        if (chiusura && chiusura < 1900) {
            return blueIcon; // Blue for before 1900
        }

        // Case 3: If the activity was ongoing between 1900-1950
        if (
            (apertura && apertura < 1950 && chiusura && chiusura > 1900) ||  // Overlaps with 1900-1950
            (apertura && apertura >= 1900 && chiusura && chiusura <= 1950)   // Fully within 1900-1950
        ) {
            return orangeIcon; // Orange for 1900-1950
        }

        // Case 4: If the activity was ongoing after 1950 (including if it started earlier)
        if (apertura && apertura <= 1950 && chiusura && chiusura > 1950) {
            return greenIcon; // Green for post 1950 but started before
        }

        // Case 5: If the activity started after 1950
        if (apertura && apertura > 1950) {
            return greenIcon; // Green for after 1950
        }

        // Default case: use gray as fallback if no match
        return grayIcon;
    }


    // Function to filter data based on the selected time period
    function filterByTimePeriod(luogo, period) {
        const apertura = luogo["Apertura"] ? parseInt(luogo["Apertura"]) : null;
        const chiusura = luogo["Chiusura"] && luogo["Chiusura"].trim() !== '' ? parseInt(luogo["Chiusura"]) : null;  // Handle empty string

        // 1. Show all points if "all" is selected, regardless of Apertura/Chiusura values
        if (period === 'all') {
            return true;
        }

        // 2. Show points where the activity is active before 1900
        if (period === 'period1') {
            if ((apertura && apertura < 1900) || (chiusura && chiusura < 1900)) {
                return true;
            }
            return false;
        }

        // 3. Show points where the activity overlaps with the 1900-1950 period
        if (period === 'period2') {
            if (
                (apertura && apertura < 1950 && (chiusura === null || chiusura > 1900)) ||  // Overlap or no Chiusura
                (apertura && apertura >= 1900 && apertura <= 1950)
            ) {
                return true;
            }
            return false;
        }

        // 4. Show points where activity continues after 1950 (including points that started earlier)
        if (period === 'period3') {
            if ((apertura && apertura > 1950) || (chiusura === null || chiusura > 1950)) {
                return true;
            }
            return false;
        }

        // Default: don't show the point if no valid match
        return false;
    }




    // Create a cluster group with custom cluster styling
    var markers = L.markerClusterGroup({
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

    // Function to update markers based on the selected period
    function updateMarkers(period) {
        markers.clearLayers(); // Clear all clusters before adding new markers

        $.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/luoghi.json", function (luoghi_json) {
            for (let luogo in luoghi_json) {
                if (luoghi_json[luogo]["geo"]["lat"] && filterByTimePeriod(luoghi_json[luogo], period)) {
                    let place_name = luoghi_json[luogo]["Città"];
                    let nome_attivita = luoghi_json[luogo]["Nome attività"];
                    let id_entita = luoghi_json[luogo]["ID_entità"];

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
                            content += `<a href="https://fondazionefedericozeri.github.io/Mercato_dell_arte/html/dettagli/dettaglio_${id}.html" target="_blank">Vai a ${id}</a><br>`;
                        }
                    });

                    // Create the marker using appropriate color icon based on the period
                    var marker = L.marker([luoghi_json[luogo]["geo"]["lat"], luoghi_json[luogo]["geo"]["lon"]], {
                        icon: getIconForPeriod(luoghi_json[luogo]) // Get icon based on period
                    });

                    marker.bindTooltip(content, { permanent: false, direction: "top" });
                    marker.bindPopup(content);
                    marker.on('click', function () {
                        marker.openPopup();
                    });

                    // Add marker to the cluster group instead of directly to the map
                    markers.addLayer(marker);
                }
            }
        }).fail(function () {
            console.error("Failed to load the JSON file.");
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