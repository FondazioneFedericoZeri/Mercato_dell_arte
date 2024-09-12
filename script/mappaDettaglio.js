document.addEventListener("DOMContentLoaded", function () {
  // Define bounds object to track the marker positions
  var bounds = L.latLngBounds(); // This will be used to include all markers

  // Initialize the map
  var map = L.map('chartdiv', {
    maxBoundsViscosity: 1.0,
    worldCopyJump: false,
    minZoom: 2,
    maxZoom: 18
  }).setView([30, -30], 3);  // Set the initial view

  // Add OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
  }).addTo(map);

  // Create a marker cluster group
  var markers = L.markerClusterGroup();

  // Extract the person ID from the URL
  var url = window.location.href;
  var personID = url.substring(url.lastIndexOf('_') + 1, url.lastIndexOf('.html'));

  // Path to the JSON file (replace with your actual path)
  var luoghi_json_url = "https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/luoghi.json";

  // Fetch the JSON data
  fetch(luoghi_json_url)
    .then(response => response.json())
    .then(luoghi_json => {
      // Convert the luoghi_json object into an array
      var placesArray = Object.values(luoghi_json);

      // Filter the array based on the ID_entità field
      var filteredPlaces = placesArray.filter(function (luogo) {
        return luogo.ID_entità.includes(personID);
      });

      // Add markers for each filtered place
      filteredPlaces.forEach(function (luogo) {
        if (luogo.geo && luogo.geo.lat && luogo.geo.lon) {
          var place_name = luogo.Città;
          if (luogo.Via.length > 0) {
            place_name += `, ${luogo.Via}`;
            if (luogo.Civico.length > 0) {
              place_name += `, ${luogo.Civico}`;
            }
          }

          // Generate the content for the tooltip and popup
          var content = `<b>${luogo["Nome attività"]}</b><br>${place_name}<br>`;

          // Add the period of activity (Apertura - Chiusura)
          var apertura = luogo.Apertura || "";  // Get Apertura or empty string if not present
          var chiusura = luogo.Chiusura || "";  // Get Chiusura or empty string if not present

          // Only show "Periodo attività" if at least one of the fields is not empty
          if (apertura || chiusura) {
            content += `Periodo attività: (${apertura}-${chiusura})<br>`;
          }

          // Create the marker
          var marker = L.marker([luogo.geo.lat, luogo.geo.lon])
            .bindTooltip(content, { permanent: false, direction: "top" });

          // Add the marker to the cluster group
          markers.addLayer(marker);

          // Extend the bounds to include this marker
          bounds.extend([luogo.geo.lat, luogo.geo.lon]);
        }
      });

      // Add the cluster group to the map
      map.addLayer(markers);

      // Fit the map view to the bounds of all markers
      map.fitBounds(bounds, {
        padding: [50, 50],  // Add padding around the markers (optional)
        maxZoom: 10         // Set the maximum zoom level for the initial view
      });
    })
    .catch(error => console.error("Error loading JSON data:", error));

  // Handle tab switching
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", function () {
      if (tab.getAttribute("data_content") === "Localizzazioni") {
        setTimeout(function () {
          map.invalidateSize();  // Trigger resize when switching to the map tab
        }, 300);  // Small delay to ensure content is visible before resizing
      }
    });
  });
});


