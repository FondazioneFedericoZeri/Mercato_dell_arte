/* Il file delle entita' sta passando da "entità" (accentato) a "entita":
   si prova prima il nome nuovo e si ricade sul vecchio, cosi' la rinomina
   nel repo e l'aggiornamento di questo file possono avvenire in momenti
   diversi senza lasciare la pagina senza dati. */
function caricaEntitaBiblio(cb) {
    $.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entita.json", cb).fail(function () {
        $.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entit%C3%A0.json", cb);
    });
}

caricaEntitaBiblio(function (json) {
    entities_json = json;
});

// Fetch the JSON data
fetch('bibliografia.json')
    .then(response => response.json())
    .then(data => {
        // Sort the data alphabetically by "Autore"
        const sortedData = Object.values(data).sort((a, b) => a.Autore.localeCompare(b.Autore));

        const bibliografiaSection = document.getElementById('bibliografia');

        let currentLetter = '';
        let column = document.createElement('div');
        column.className = 'column';

        sortedData.forEach(entry => {
            // Check if we need to start a new column
            const firstLetter = entry.Autore[0].toLowerCase();
            if (firstLetter !== currentLetter) {
                if (currentLetter) {
                    // Append the current column to the section
                    bibliografiaSection.appendChild(column);
                    column = document.createElement('div');
                    column.className = 'column';
                }

                // Create a new letter header
                const h2 = document.createElement('h2');
                h2.textContent = firstLetter.toUpperCase();
                column.appendChild(h2);
                currentLetter = firstLetter;
            }

            // Create the <p> element
            const p = document.createElement('p');
            p.textContent = `${entry.Autore}, ${entry.Titolo} (${entry.Anno})`;
            column.appendChild(p);
        });

        // Append the last column
        if (column.children.length > 0) {
            bibliografiaSection.appendChild(column);
        }
    });
