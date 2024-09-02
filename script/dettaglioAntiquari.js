
//slider galleria img

let currentSlide = 0;

function showSlide(index) {
    const slides = document.querySelectorAll('.slide');
    if (index >= slides.length) {
        currentSlide = 0;
    } else if (index < 0) {
        currentSlide = slides.length - 1;
    } else {
        currentSlide = index;
    }
    const offset = -currentSlide * 100;
    document.querySelector('.slider').style.transform = `translateX(${offset}%)`;
}

function nextSlide() {
    showSlide(currentSlide + 1);
}

function prevSlide() {
    showSlide(currentSlide - 1);
}

// Avvia automaticamente lo slider
setInterval(nextSlide, 3000); // Cambia immagine ogni 3 secondi

//menù tab laterale per sitch pagine

document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tab");
    const contents = document.querySelectorAll(".content");

    tabs.forEach(tab => {
        tab.addEventListener("click", function () {
            // Rimuovi la classe "active" da tutti i tab
            tabs.forEach(t => t.classList.remove("active"));
            // Aggiungi la classe "active" al tab cliccato
            tab.classList.add("active");

            // Nascondi tutti i contenuti
            contents.forEach(content => content.classList.remove("active-content"));
            // Mostra il contenuto associato al tab cliccato
            const activeContent = document.getElementById(tab.getAttribute("data_content"));
            // console.log(tab.getAttribute("data_content"));
            activeContent.classList.add("active-content");
        });
    });
});


//albero genealogico
am5.ready(function() {


  // Create root element
  // https://www.amcharts.com/docs/v5/getting-started/#Root_element
  var root = am5.Root.new("chartdiv");


  // Set themes
  // https://www.amcharts.com/docs/v5/concepts/themes/
  root.setThemes([
    am5themes_Animated.new(root)
  ]);


  var zoomableContainer = root.container.children.push(
    am5.ZoomableContainer.new(root, {
      width: am5.p100,
      height: am5.p100,
      wheelable: true,
      pinchZoom: true
    })
  );

  var zoomTools = zoomableContainer.children.push(am5.ZoomTools.new(root, {
    target: zoomableContainer
  }));

  // Create series
  // https://www.amcharts.com/docs/v5/charts/hierarchy/#Adding
  var series = zoomableContainer.contents.children.push(am5hierarchy.Tree.new(root, {
    singleBranchOnly: false,
    downDepth: 1,
    initialDepth: 10,
    valueField: "value",
    categoryField: "name",
    childDataField: "children"
  }));

  series.labels.template.set("minScale", 0);

  // Generate and set data
  // https://www.amcharts.com/docs/v5/charts/hierarchy/#Setting_data
  var maxLevels = 3;
  var maxNodes = 3;
  var maxValue = 100;

  var data = {
    name: "Root",
    children: []
  }
  generateLevel(data, "", 0);

  series.data.setAll([data]);
  series.set("selectedDataItem", series.dataItems[0]);

  function generateLevel(data, name, level) {
    for (var i = 0; i < Math.ceil(maxNodes * Math.random()) + 1; i++) {
      var nodeName = name + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i];
      var child;
      if (level < maxLevels) {
        child = {
          name: nodeName + level
        }

        if (level > 0 && Math.random() < 0.5) {
          child.value = Math.round(Math.random() * maxValue);
        }
        else {
          child.children = [];
          generateLevel(child, nodeName + i, level + 1)
        }
      }
      else {
        child = {
          name: name + i,
          value: Math.round(Math.random() * maxValue)
        }
      }
      data.children.push(child);
    }

    level++;
    return data;
  }


  // Make stuff animate on load
  series.appear(1000, 100);

  }); // end am5.ready()
