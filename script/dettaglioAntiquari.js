
//slider galleria img

let currentSlide = 0;
let sliderInterval;

// Check if the slider or single image is present
function initializeGallery() {
  const slider = document.querySelector('.slider');
  const singleImage = document.querySelector('.single-image-container');

  if (slider) {
    // Start the slider if the slider is present
    console.log("Slider found. Initializing slider.");
    startSlider();
  } else if (singleImage) {
    // If only a single image is present, no need for slider functionality
    console.log("Single image found. No slider needed.");
  } else {
    console.error("No image gallery found.");
  }
}

function startSlider(retries = 0) {
  const slider = document.querySelector('.slider');

  if (!slider) {
    console.error("Slider element not found! Retrying...");
    setTimeout(() => startSlider(retries + 1), 500);  // Retry every 500ms
    return;
  }

  // Start the interval for automatic slides
  sliderInterval = setInterval(nextSlide, 3000); // Change image every 3 seconds
  console.log("Slider initialized and running.");
}

function showSlide(index) {
  const slides = document.querySelectorAll('.slide');
  const slider = document.querySelector('.slider');

  if (!slider) {
    console.error("Slider element not found!");
    return;
  }

  if (index >= slides.length) {
    currentSlide = 0;
  } else if (index < 0) {
    currentSlide = slides.length - 1;
  } else {
    currentSlide = index;
  }

  const offset = -currentSlide * 100;
  slider.style.transform = `translateX(${offset}%)`;
}

function nextSlide() {
  showSlide(currentSlide + 1);
}

function prevSlide() {
  showSlide(currentSlide - 1);
}

// Initialize the gallery on DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  initializeGallery(); // Start the gallery functionality
});


//menù tab laterale per sitch pagine

// Menù tab laterale per switch pagine
document.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".content");

  tabs.forEach(tab => {
    tab.addEventListener("click", function () {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      contents.forEach(content => content.classList.remove("active-content"));

      const activeContent = document.getElementById(tab.getAttribute("data_content"));
      activeContent.classList.add("active-content");

      if (tab.getAttribute("data_content") === "Persone") {
        setTimeout(() => {
          createGenealogyTree();
        }, 100);
      }
    });
  });
});

// Genealogy Tree (Chart initialization is only done once)

// L'albero familiare e' gestito da script/albero-familiare.js: qui si
// chiede solo di costruirlo quando l'utente apre la scheda. Il grafico
// gerarchico di amCharts che stava qui e' stato rimosso — perdeva la
// maggior parte dei legami e caricava tre bundle esterni per disegnare
// poche caselle.
function createGenealogyTree() {
  if (window.AlberoFamiliare) window.AlberoFamiliare.avvia();
}
