$.ajaxSetup({
    async: false
});


/* Il file delle entita' sta passando da "entità" (accentato) a "entita":
   si prova prima il nome nuovo e si ricade sul vecchio, cosi' la rinomina
   nel repo e l'aggiornamento di questo file possono avvenire in momenti
   diversi senza lasciare la pagina senza dati. */
function caricaEntita(cb) {
    $.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entita.json", cb).fail(function () {
        $.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entit%C3%A0.json", cb);
    });
}

caricaEntita(function (json) {
    entities_json = json;
});

/* Ordine dei gruppi per luogo: prima le aree piu' documentate.
   Il comparatore precedente finiva con "return k1 > k2", che restituisce
   vero/falso invece di un numero: Array.sort ha bisogno di un valore
   negativo per spostare un elemento in su e non lo riceveva mai, quindi
   l'ordine risultava di fatto casuale e la lista di regioni scritta a mano
   qui sopra non veniva mai applicata. */
var cmp_per_numero = function (gruppi) {
    return function (k1, k2) {
        var n1 = Object.keys(gruppi[k1]).length;
        var n2 = Object.keys(gruppi[k2]).length;
        if (n1 !== n2) return n2 - n1;                 // piu' numerose prima
        return k1.localeCompare(k2, "it");             // a parita', alfabetico
    };
};




/* Riga sopra l'elenco: dice quante schede si stanno vedendo e con che
   criterio sono ordinate. Serve perche' i due ordinamenti non sono
   confrontabili: per nome c'e' una scheda per antiquario, per luogo un
   antiquario con sedi in piu' aree compare in ciascuna, quindi il totale
   mostrato supera il numero di antiquari. */
var ricerca_attiva = null;   // insieme filtrato dalla ricerca, o null

function aggiorna_riepilogo(modo, n_gruppi, n_schede, n_antiquari) {
    var el = document.getElementById('riepilogo-elenco');
    if (!el) return;
    var testo;
    if (modo === 'nome') {
        testo = n_antiquari + (n_antiquari === 1 ? ' antiquario' : ' antiquari')
              + ', in ordine alfabetico.';
    } else {
        testo = n_schede + ' schede in ' + n_gruppi
              + (n_gruppi === 1 ? ' area' : ' aree')
              + ', dalla pi\u00f9 documentata alla meno. Chi ha avuto sedi in '
              + 'pi\u00f9 aree compare in ciascuna, perci\u00f2 il totale supera i '
              + n_antiquari + ' antiquari.';
    }
    if (ricerca_attiva) testo = 'Risultati della ricerca: ' + testo;
    el.textContent = testo;
}

var sort_alphabetically = function (refined_entities) {

    // Gli handler dei link passavano qui l'oggetto Event del clic, che essendo
    // "truthy" veniva scambiato per la lista di entita' e mandava la funzione in
    // errore: si accetta solo un oggetto che sia davvero una lista di entita'.
    if (refined_entities instanceof Event || !(refined_entities instanceof Object)) {
        refined_entities = null;
    }
    // Senza argomento si riusa il filtro di ricerca in corso, se c'e': cambiare
    // ordinamento non deve far ricomparire gli antiquari esclusi dalla ricerca.
    const working_json = refined_entities || ricerca_attiva || entities_json;
    let entities_list = {}

    for (const entita of Object.keys(working_json)) {

        var entitaId = entita;
        var ent_dict = working_json[entita];

        var firstletter = ent_dict["Nome"][0];

        if (!(firstletter in entities_list)) {
            entities_list[firstletter] = {};
        }

        entities_list[firstletter][ent_dict["ID"]] = entitaId;
    }

    document.getElementById('cards-section').innerHTML = '';
    const cardSection = document.getElementById('cards-section');

    for (letter in entities_list) {
        const h2 = document.createElement('h2');
        h2.classList = "letter"
        h2.appendChild(document.createTextNode(letter));
        const conta = document.createElement('span');
        conta.className = 'conteggio-gruppo';
        conta.textContent = Object.keys(entities_list[letter]).length;
        h2.appendChild(conta);
        cardSection.appendChild(h2)


        const card_container = document.createElement('div');
        card_container.classList = "card-container";

        for (entitaId in entities_list[letter]) {
            var ent_dict = working_json[entitaId];

            const a_link = document.createElement('a');
            a_link.href = "dettagli/dettaglio_" + entitaId + ".html";

            const card = document.createElement('div');
            card.classList = "card";

            const img = document.createElement("img")
            img.src = "../img/antiquari-preview/" + ent_dict["Foto preview"] + ".jpg"
            img.alt = ent_dict["Nome"]

            const div_interno = document.createElement("div")
            div_interno.classList = "card-text"

            const h3 = document.createElement("h3")
            h3.appendChild(document.createTextNode(ent_dict["Nome"]))

            /*
            var regioni = new Set();
            for (person_id in ent_dict["Persone"]){
                var luoghi = ent_dict["Persone"][person_id]["ID_luoghi"]
                for (luogo_id in luoghi){
                    var luogo = luoghi[luogo_id]
                    regioni.add(luogo["Regione"])
                }
            }
            const sorted_regioni = Array.from(regioni).sort(cmp_geography);

            const regioni_string = sorted_regioni.join(",");

            const p = document.createElement("p")
            p.appendChild(document.createTextNode(regioni_string))
            */

            //faccio comparire le città al posto delle regioni
            var cities = new Set();
            for (person_id in ent_dict["Persone"]) {
                var luoghi = ent_dict["Persone"][person_id]["ID_luoghi"]
                for (luogo_id in luoghi) {
                    var luogo = luoghi[luogo_id]
                    cities.add(luogo["Città"])
                }
            }
            const sorted_cities = Array.from(cities).sort();

            const cities_string = sorted_cities.join(",  ");

            const p = document.createElement("p")
            p.appendChild(document.createTextNode(cities_string))
            //fine funzione

            div_interno.appendChild(h3)
            div_interno.appendChild(p)

            card.appendChild(img)
            card.appendChild(div_interno)
            a_link.appendChild(card)
            card_container.appendChild(a_link)

        }

        cardSection.appendChild(card_container)

    }

    aggiorna_riepilogo('nome', Object.keys(entities_list).length,
                       Object.keys(working_json).length,
                       Object.keys(working_json).length);
}

var sort_geographically = function () {
    // Come sopra: si parte dal filtro di ricerca in corso, se c'e'. Prima
    // questa funzione leggeva sempre l'elenco completo, quindi passando a
    // "luogo" la ricerca dell'utente veniva silenziosamente annullata.
    var sorgente = ricerca_attiva || entities_json;
    var entities_list = {}
    for (ent in sorgente) {
        var ent_id = ent;
        var ent_dict = sorgente[ent];
        var regioni = new Set();

        var persone = ent_dict["Persone"];
        for (persona in persone){
            var luoghi = persone[persona]["ID_luoghi"];
            for (luogo_id in luoghi){
                var luogo = luoghi[luogo_id]
                regioni.add(luogo["Regione"])
            }
        }

        for (let regione of regioni){
            if (!(regione in entities_list)){
                entities_list[regione] = {}
            }
            entities_list[regione][ent_id] = ent_id;
        }
    }
    var keys = Object.keys(entities_list);
    var sorted_keys = Array.from(keys).sort(cmp_per_numero(entities_list));

    document.getElementById('cards-section').innerHTML = '';
    const div = document.getElementById('cards-section');
    // div.empty();
    for (let regione of sorted_keys){
        const h2 = document.createElement('h2');
        h2.classList = "letter"
        h2.appendChild(document.createTextNode(regione));
        const conta = document.createElement('span');
        conta.className = 'conteggio-gruppo';
        conta.textContent = Object.keys(entities_list[regione]).length;
        h2.appendChild(conta);
        div.appendChild(h2)


        const card_container = document.createElement('div');
        card_container.classList = "card-container";

        for (ent_id in entities_list[regione]){
            var ent_dict = entities_json[ent_id];

            const a_link = document.createElement('a');
            a_link.href = "dettagli/dettaglio_"+ent_id+".html";

            const card = document.createElement('div');
            card.classList = "card";

            const img = document.createElement("img")
            img.src = "../img/antiquari-preview/"+ent_dict["Foto preview"]+".jpg"
            img.alt = ent_dict["Nome"]

            const div_interno = document.createElement("div")
            div_interno.classList = "card-text"

            const h3 = document.createElement("h3")
            h3.appendChild(document.createTextNode(ent_dict["Nome"]))

            var cities = new Set();
            for (person_id in ent_dict["Persone"]){
                var luoghi = ent_dict["Persone"][person_id]["ID_luoghi"]
                for (luogo_id in luoghi){
                    var luogo = luoghi[luogo_id]
                    cities.add(luogo["Città"])
                }
            }
            const sorted_cities = Array.from(cities).sort();

            const cities_string = sorted_cities.join(",  ");

            const p = document.createElement("p")
            p.appendChild(document.createTextNode(cities_string))

            div_interno.appendChild(h3)
            div_interno.appendChild(p)

            card.appendChild(img)
            card.appendChild(div_interno)
            a_link.appendChild(card)
            card_container.appendChild(a_link)

        }

        div.appendChild(card_container)

    }
    var n_schede = sorted_keys.reduce(function (t, r) {
        return t + Object.keys(entities_list[r]).length;
    }, 0);
    aggiorna_riepilogo('luogo', sorted_keys.length, n_schede, Object.keys(sorgente).length);

}



$(document).ready(function(){
    sort_alphabetically();

    // Senza la funzione anonima jQuery passerebbe l'oggetto Event come primo
    // argomento, che sort_alphabetically scambierebbe per la lista di entita'.
    $("#cognome").click(function () { sort_alphabetically(); });
    $("#luogo").click(function () { sort_geographically(); });
    $("#btn-luogo").click(function () { sort_geographically(); });
    $("#btn-cognome").click(function () { sort_alphabetically(); });

});

/**
 * performSearch accetta un valore che utilizzerà per la ricerca nel json delle entità.
 *
 * Per compatibilità, cerca nei valori del json quelli corrispondenti, poi li invia alla sort. se non c'è valore alla ricerca: chiama la sort normalmente.
 * questo mantiene la compatibilità con la maggior parte del codice precedente della funzione sort.
 */
var performSearch = function (searchValue = "") {

    if (searchValue) {
        const searchValue_lw = searchValue.toLowerCase(); // lowercase per rendere la ricerca case insensitive

        const filteredEntities = {}; // variabile per contenere le entità corrispondenti alla ricerca utente

        for (const [key, entita] of Object.entries(entities_json)) {

            let searchValues = []; // prepara contenitore con i valori su cui cercare

            // --- nome
            searchValues.push(entita['Nome']);

            // --- città
            const persone = entita.Persone || {};     // estrae persone. se persone non esiste crea object vuoto (così il sistema non crasha e va avanti)

            for (const persona of Object.values(persone)) {
                const luoghi = persona.ID_luoghi || {};

                for (const luogo of Object.values(luoghi)) {
                    const citta = luogo['Città'];
                    searchValues.push(citta);
                }
            }

            if (searchValues.some((str) => str.toLowerCase().includes(searchValue_lw))) {
                // se quindi c'è almeno una volta una sottostringa identica alla ricerca utente:

                filteredEntities[key] = entita;        // salvo l'entità intera
            }
        }

        ricerca_attiva = filteredEntities;     // resta valido cambiando ordinamento
        sort_alphabetically(filteredEntities);

    } else {
        ricerca_attiva = null;                 // ricerca svuotata: si torna a tutti
        sort_alphabetically();
    }
};





