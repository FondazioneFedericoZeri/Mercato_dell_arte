document.addEventListener('DOMContentLoaded', function() {
    var collaborators = document.querySelectorAll('.collaborator');
    var clients = document.querySelectorAll('.client'); // Aggiungi la selezione per i clienti
    var currentTooltip = null;

    // Funzione per gestire i tooltip
    function handleTooltip(element, className) {
        element.addEventListener('click', function() {
            // Trova l'ID del contenuto del tooltip
            var contentId = this.getAttribute('data-tooltip-content');
            var content = document.querySelector(contentId);

            // Se non c'è un contenuto associato, non fare nulla
            if (!content) {
                return;
            }

            // Se esiste già un tooltip aperto, chiudilo (collaboratori o clienti)
            if (currentTooltip && currentTooltip !== this) {
                var tooltipToRemove = currentTooltip.querySelector('.collaborator-tooltip, .client-tooltip');
                if (tooltipToRemove) {
                    tooltipToRemove.remove();
                    currentTooltip.classList.remove('show-tooltip');
                }
            }

            // Se esiste già il tooltip per questo elemento, rimuovilo
            var existingTooltip = this.querySelector('.' + className);
            if (existingTooltip) {
                existingTooltip.remove();
                currentTooltip = null;
            } else {
                // Crea un nuovo tooltip con contenuto HTML
                var tooltip = document.createElement('div');
                tooltip.classList.add(className);

                // Inserisci il contenuto HTML nel tooltip
                tooltip.innerHTML = content.innerHTML;

                this.appendChild(tooltip);
                this.classList.add('show-tooltip');
                currentTooltip = this;
            }
        });
    }

    // Attacca i gestori per collaboratori e clienti
    collaborators.forEach(function(collaborator) {
        handleTooltip(collaborator, 'collaborator-tooltip');
    });

    clients.forEach(function(client) {
        handleTooltip(client, 'client-tooltip');
    });
});


