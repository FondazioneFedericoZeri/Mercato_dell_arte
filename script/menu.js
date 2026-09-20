// Apre e chiude il menù sotto i 768px.
// I due elementi non esistono su ogni pagina: senza questo controllo
// il file andava in errore e fermava gli script che venivano dopo.
const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('nav ul');

if (menuToggle && menu) {
  menuToggle.addEventListener('click', () => {
    const aperto = menu.classList.toggle('show');
    menuToggle.setAttribute('aria-expanded', aperto ? 'true' : 'false');
  });
}
