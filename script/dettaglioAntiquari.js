// Dettaglio antiquario: tab e albero familiare (galleria in galleria.js)

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

// Costruisci l'albero familiare (script/albero-familiare.js)
function createGenealogyTree() {
  if (window.AlberoFamiliare) window.AlberoFamiliare.avvia();
}
