// INIZIO SCRIPTS JAVASCRIPT

$.ajaxSetup({
  async: false
});

$.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/luoghi.json", function (json) {
  luoghi_json = json;
});

// scripts js sezione 2 'search' che permette di applicare la dissolvenza in entrata al testo allo scroll della pagina
document.addEventListener("DOMContentLoaded", function () {
  const searchSection = document.querySelector('#search');

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

document.addEventListener("DOMContentLoaded", function () {
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
    const rect = statsSection.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom >= 0 && !statsSection.classList.contains('animated')) {
      statsSection.classList.add('animated');
      const stats = document.querySelectorAll("#statistics .stat h3");
      stats.forEach(stat => {
        const endValue = parseInt(stat.innerHTML, 10);
        stat.innerHTML = "0";
        animateValue(stat, 0, endValue, 2000);
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
am5.ready(function () {

  // Create root element
  // https://www.amcharts.com/docs/v5/getting-started/#Root_element
  var root = am5.Root.new("chartdiv");

  // Set themes
  // https://www.amcharts.com/docs/v5/concepts/themes/
  root.setThemes([
    am5themes_Animated.new(root)
  ]);

  // Create the map chart
  // https://www.amcharts.com/docs/v5/charts/map-chart/
  var chart = root.container.children.push(
    am5map.MapChart.new(root, {
      panX: "rotateX",
      panY: "translateY",
      projection: am5map.geoMercator(),
    })
  );

  var zoomControl = chart.set("zoomControl", am5map.ZoomControl.new(root, {}));
  zoomControl.homeButton.set("visible", true);


  // Create main polygon series for countries
  // https://www.amcharts.com/docs/v5/charts/map-chart/map-polygon-series/
  var polygonSeries = chart.series.push(
    am5map.MapPolygonSeries.new(root, {
      geoJSON: am5geodata_worldLow,
      exclude: ["AQ"]
    })
  );

  polygonSeries.mapPolygons.template.setAll({
    fill: am5.color(0xdadada)
  });


  // Create point series for markers
  // https://www.amcharts.com/docs/v5/charts/map-chart/map-point-series/
  var pointSeries = chart.series.push(am5map.ClusteredPointSeries.new(root, {}));


  // Set clustered bullet
  // https://www.amcharts.com/docs/v5/charts/map-chart/clustered-point-series/#Group_bullet
  pointSeries.set("clusteredBullet", function (root) {
    var container = am5.Container.new(root, {
      cursorOverStyle: "pointer"
    });

    var circle1 = container.children.push(am5.Circle.new(root, {
      radius: 8,
      tooltipY: 0,
      fill: am5.color(0xff8c00)
    }));

    var circle2 = container.children.push(am5.Circle.new(root, {
      radius: 12,
      fillOpacity: 0.3,
      tooltipY: 0,
      fill: am5.color(0xff8c00)
    }));

    var circle3 = container.children.push(am5.Circle.new(root, {
      radius: 16,
      fillOpacity: 0.3,
      tooltipY: 0,
      fill: am5.color(0xff8c00)
    }));

    var label = container.children.push(am5.Label.new(root, {
      centerX: am5.p50,
      centerY: am5.p50,
      fill: am5.color(0xffffff),
      populateText: true,
      fontSize: "8",
      text: "{value}"
    }));

    container.events.on("click", function (e) {
      pointSeries.zoomToCluster(e.target.dataItem);
    });

    return am5.Bullet.new(root, {
      sprite: container
    });
  });

  // Create regular bullets
  pointSeries.bullets.push(function () {
    var circle = am5.Circle.new(root, {
      radius: 6,
      tooltipY: 0,
      fill: am5.color(0xff8c00),
      tooltipText: "{title}"
    });

    return am5.Bullet.new(root, {
      sprite: circle
    });
  });


  // Set data
  var cities = [];

  console.log(luoghi_json);

  for (let luogo in luoghi_json) {
    if (luoghi_json[luogo]["geo"]["lat"]) {
      place_name = luoghi_json[luogo]["Città"]
      if (luoghi_json[luogo]["Via"].length > 0) {
        place_name = place_name.concat(', ', luoghi_json[luogo]["Via"])
        if (luoghi_json[luogo]["Civico"].length > 0) {
          place_name = place_name.concat(', ', luoghi_json[luogo]["Civico"])
        }
      }
      city = {
        title: place_name,
        latitude: luoghi_json[luogo]["geo"]["lat"],
        longitude: luoghi_json[luogo]["geo"]["lon"],
      };
    }

    cities.push(city);
  }

  for (var i = 0; i < cities.length; i++) {
    var city = cities[i];
    addCity(city.longitude, city.latitude, city.title);
  }

  function addCity(longitude, latitude, title) {
    pointSeries.data.push({
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      title: title
    });
  }

  // Make stuff animate on load
  chart.appear(1000, 100);

}); // end am5.ready()


// scripts js sezione 5 timeline: permette di applicare la dissolvenza in entrata al testo allo scroll della pagina
document.addEventListener("DOMContentLoaded", function () {
  // Funzione per controllare se un elemento è visibile nello schermo
  function isElementInViewport(el) {
    var rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  // Funzione per applicare l'effetto di dissolvenza
  function checkFadeIn() {
    var elements = document.querySelectorAll('.fade-in');
    elements.forEach(function (element) {
      if (isElementInViewport(element)) {
        element.classList.add('visible');
      }
    });
  }

  // Controlla lo scroll e carica
  window.addEventListener('scroll', checkFadeIn);
  window.addEventListener('load', checkFadeIn);
});

