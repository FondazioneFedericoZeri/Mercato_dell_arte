//script per l'entrata in dissolvenza

document.addEventListener("DOMContentLoaded", function() {
    function fadeInElements() {
        var elements = document.querySelectorAll('.fade-in');
        elements.forEach(function(element) {
            var position = element.getBoundingClientRect().top;
            var screenPosition = window.innerHeight / 1.3;

            if (position < screenPosition) {
                element.classList.add('visible');
            }
        });
    }

    // Esegui la funzione al caricamento della pagina
    fadeInElements();

    // Esegui la funzione anche durante lo scroll
    window.addEventListener('scroll', fadeInElements);
});


// script per il bottone
// Mostra il bottone "Torna su" quando si scorre verso il basso
window.addEventListener('scroll', function() {
    var backToTopButton = document.getElementById('back-to-top');
    if (window.pageYOffset > 300) {
        backToTopButton.classList.add('show');
    } else {
        backToTopButton.classList.remove('show');
    }
});


