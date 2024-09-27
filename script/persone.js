document.addEventListener('DOMContentLoaded', function() {
    var collaborators = document.querySelectorAll('.collaborator');
    var currentTooltip = null;

    collaborators.forEach(function(collaborator) {
        collaborator.addEventListener('click', function() {
            // Se esiste già un tooltip aperto, chiudilo
            if (currentTooltip && currentTooltip !== this) {
                currentTooltip.querySelector('.collaborator-tooltip').remove();
                currentTooltip.classList.remove('show-tooltip');
            }

            // Se l'etichetta esiste già per questo elemento, rimuovila
            var existingTooltip = this.querySelector('.collaborator-tooltip');
            if (existingTooltip) {
                existingTooltip.remove();
                currentTooltip = null; // Rimuove il tooltip corrente
            } else {
                // Mostra il nuovo tooltip per l'elemento corrente
                var tooltip = document.createElement('span');
                tooltip.classList.add('collaborator-tooltip');
                tooltip.innerText = this.dataset.tooltip;
                this.appendChild(tooltip);
                this.classList.add('show-tooltip');
                currentTooltip = this; // Aggiorna l'attuale tooltip
            }
        });
    });
});
