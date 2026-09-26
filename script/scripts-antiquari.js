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


// Bottone "Torna su" in script/torna-su.js


