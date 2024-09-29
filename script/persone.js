document.addEventListener('DOMContentLoaded', function() {
    var collaborators = document.querySelectorAll('.collaborator');
    var currentTooltip = null;

    collaborators.forEach(function(collaborator) {
        collaborator.addEventListener('click', function() {
            // Trova l'ID del contenuto del tooltip
            var contentId = this.getAttribute('data-tooltip-content');
            var content = document.querySelector(contentId);
            
            // Se non c'è un contenuto associato, non fare nulla
            if (!content) {
                return;
            }

            // Se esiste già un tooltip aperto, chiudilo
            if (currentTooltip && currentTooltip !== this) {
                currentTooltip.querySelector('.collaborator-tooltip').remove();
                currentTooltip.classList.remove('show-tooltip');
            }

            // Se esiste già il tooltip per questo collaboratore, rimuovilo
            var existingTooltip = this.querySelector('.collaborator-tooltip');
            if (existingTooltip) {
                existingTooltip.remove();
                currentTooltip = null;
            } else {
                // Crea un nuovo tooltip con contenuto HTML
                var tooltip = document.createElement('div');
                tooltip.classList.add('collaborator-tooltip');

                // Inserisci il contenuto HTML nel tooltip
                tooltip.innerHTML = content.innerHTML;

                this.appendChild(tooltip);
                this.classList.add('show-tooltip');
                currentTooltip = this;
            }
        });
    });
});
