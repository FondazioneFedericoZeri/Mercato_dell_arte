// Seleziona gli elementi
const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');

// Aggiungi evento al clic
menuToggle.addEventListener('click', () => {
  menu.classList.toggle('show'); // Aggiungi/rimuovi classe "show"
});
