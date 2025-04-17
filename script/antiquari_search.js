$.ajaxSetup({
    async: false
});


$.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entit%C3%A0.json", function (json) {
    entities_json = json;
});

var cmp_geography = function(k1, k2){

    regioni = ["Toscana", "Liguria", "Piemonte", "Lombardia", "Veneto",
        "Friuli-Venezia Giulia", "Trentino-Alto Adige", "Emilia-Romagna", "Lazio", "Marche",
        "Valle d'Aosta", "Umbria", "Abruzzo", "Molise", "Puglia",
        "Campania", "Calabria", "Basilicata", "Sicilia", "Sardegna"]

    if (!regioni.includes(k1)) {
        if (!regioni.includes(k2)) {
            return k1 > k2 ? 1 : -1;
        }
        return 1;
    }
    if (!regioni.includes(k2)) {
        return -1;
    }


    // if (k1 == "Francia"){
    //     return -1;
    // }
    // if (k2 == "Francia") {
    //     return 1
    // }

    // if (k1 == "Gran Bretagna"){
    //     return -1;
    // }
    // if (k2 == "Gran Bretagna") {
    //     return 1
    // }

    // if (k1 == "Stati Uniti d'America"){
    //     return -1
    // }
    // if (k2 == "Stati Uniti d'America"){
    //     return 1
    // }

    return k1 > k2
}

var sort_alphabetically = function (refined_entities) {

    // fix: aggiunto argomento e check su di esso
    const working_json = refined_entities || entities_json;    // se fornita lista alternativa, usa la lista
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
}

var sort_geographically = function () {
    var entities_list = {}
    for (ent in entities_json) {
        var ent_id = ent;
        var ent_dict = entities_json[ent];
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
    var sorted_keys = Array.from(keys).sort(cmp_geography);

    document.getElementById('cards-section').innerHTML = '';
    const div = document.getElementById('cards-section');
    // div.empty();
    for (let regione of sorted_keys){
        const h2 = document.createElement('h2');
        h2.classList = "letter"
        h2.appendChild(document.createTextNode(regione));
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
}



$(document).ready(function(){
    sort_alphabetically();

    $("#cognome").click(sort_alphabetically);
    $("#luogo").click(sort_geographically);
    $("#btn-luogo").click(sort_geographically);
    $("#btn-cognome").click(sort_alphabetically);

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

        sort_alphabetically(filteredEntities);  // invia la lista modificata di entità alla funzione

    } else {
        sort_alphabetically();  // la funzione non riceve la lista modificata e dovrebbe utilizzare la lista originale
    }
};





