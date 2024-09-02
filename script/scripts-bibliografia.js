$.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entit%C3%A0.json", function (json) {
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
