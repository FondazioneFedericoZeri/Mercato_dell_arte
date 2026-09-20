/* Pagina di dettaglio antiquario: i tab e l'albero familiare.

   La galleria fotografica sta in script/galleria.js: autoplay di un
   giro solo, frecce e ingrandimento. */

// Menù tab per lo switch delle sezioni
document.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".content");

  tabs.forEach(tab => {
    tab.addEventListener("click", function () {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      contents.forEach(content => content.classList.remove("active-content"));

      const activeContent = document.getElementById(tab.getAttribute("data_content"));
      if (activeContent) activeContent.classList.add("active-content");

      if (tab.getAttribute("data_content") === "Persone") {
        setTimeout(() => {
          createGenealogyTree();
        }, 100);
      }
    });
  });
});

// L'albero familiare e' gestito da script/albero-familiare.js: qui si
// chiede solo di costruirlo quando l'utente apre la scheda. Il grafico
// gerarchico di amCharts che stava qui e' stato rimosso — perdeva la
// maggior parte dei legami e caricava tre bundle esterni per disegnare
// poche caselle.
function createGenealogyTree() {
  if (window.AlberoFamiliare) window.AlberoFamiliare.avvia();
}
