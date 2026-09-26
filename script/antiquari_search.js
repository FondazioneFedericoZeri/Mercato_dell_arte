$.ajaxSetup({
    async: false
});


/* Carica entita.json, se manca usa il vecchio entità.json */
function caricaEntita(cb) {
    $.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entita.json", cb).fail(function () {
        $.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entit%C3%A0.json", cb);
    });
}

caricaEntita(function (json) {
    entities_json = json;
});

/* Ordine dei gruppi per luogo: prima i più numerosi, poi alfabetico */
var cmp_per_numero = function (gruppi) {
    return function (k1, k2) {
        var n1 = Object.keys(gruppi[k1]).length;
        var n2 = Object.keys(gruppi[k2]).length;
        if (n1 !== n2) return n2 - n1;                 // più numerose prima
        return k1.localeCompare(k2, "it");             // a parità, alfabetico
    };
};




/* Riga sopra l'elenco con il numero di schede e l'ordinamento */
var ricerca_attiva = null;   // insieme filtrato dalla ricerca, o null

/* Etichetta del conteggio accanto al titolo di un gruppo */
function etichetta_conteggio(n) {
    return '(' + n + (n === 1 ? ' entit\u00e0 antiquariale)'
                              : ' entit\u00e0 antiquariali)');
}

/* Ordina gli ID delle entità per nome */
function ordina_per_nome(ids, entita_di) {
    return ids.slice().sort(function (a, b) {
        var na = (entita_di(a) || {})["Nome"] || "";
        var nb = (entita_di(b) || {})["Nome"] || "";
        return na.localeCompare(nb, "it", { sensitivity: "base" });
    });
}

/* Le città di un'entità, senza i vuoti */
function citta_entita(ent_dict) {
    var citta = new Set();
    /* sedi prese dal campo Luoghi dell'entità */
    var luoghi = ent_dict["Luoghi"] || {};
    Object.keys(luoghi).forEach(function (lid) {
        var nome = (luoghi[lid]["Citt\u00e0"] || "").trim();
        if (nome) citta.add(nome);
    });
    return Array.from(citta).sort().join(", ");
}

function aggiorna_riepilogo(modo, n_gruppi, n_schede, n_antiquari) {
    var el = document.getElementById('riepilogo-elenco');
    if (!el) return;
    var testo;
    if (modo === 'nome') {
        testo = n_antiquari
              + (n_antiquari === 1 ? ' entit\u00e0 antiquariale'
                                   : ' entit\u00e0 antiquariali')
              + ', in ordine alfabetico.';
    } else {
        testo = n_schede + ' schede in ' + n_gruppi
              + (n_gruppi === 1 ? ' area' : ' aree')
              + '. Entit\u00e0 attive in pi\u00f9 aree compaiono in ciascuna.';
    }
    if (ricerca_attiva) testo = 'Risultati della ricerca: ' + testo;
    el.textContent = testo;
}

var sort_alphabetically = function (refined_entities) {

    // accetta solo una vera lista di entità, non l'evento del clic
    if (refined_entities instanceof Event || !(refined_entities instanceof Object)) {
        refined_entities = null;
    }
    // senza argomento riusa il filtro di ricerca in corso
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

    // ordina le lettere
    const lettere = Object.keys(entities_list)
                          .sort(function (a, b) { return a.localeCompare(b, "it"); });

    for (const letter of lettere) {
        const h2 = document.createElement('h2');
        h2.classList = "letter"
        h2.appendChild(document.createTextNode(letter));
        const conta = document.createElement('span');
        conta.className = 'conteggio-gruppo';
        conta.textContent = etichetta_conteggio(Object.keys(entities_list[letter]).length);
        h2.appendChild(conta);
        cardSection.appendChild(h2)


        const card_container = document.createElement('div');
        card_container.classList = "card-container";

        for (const entitaId of ordina_per_nome(Object.keys(entities_list[letter]),
                                               function (id) { return working_json[id]; })) {
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
            const cities_string = citta_entita(ent_dict);

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
    // parte dal filtro di ricerca in corso, se c'è
    var sorgente = ricerca_attiva || entities_json;
    var entities_list = {}
    for (ent in sorgente) {
        var ent_id = ent;
        var ent_dict = sorgente[ent];
        var regioni = new Set();

        // sedi prese dal campo Luoghi, come nella card
        var luoghi = ent_dict["Luoghi"] || {};
        for (luogo_id in luoghi){
            var regione = (luoghi[luogo_id]["Regione"] || "").trim();
            if (regione) regioni.add(regione);
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
        conta.textContent = etichetta_conteggio(Object.keys(entities_list[regione]).length);
        h2.appendChild(conta);
        div.appendChild(h2)


        const card_container = document.createElement('div');
        card_container.classList = "card-container";

        // schede in ordine di nome dentro ogni area
        for (const ent_id of ordina_per_nome(Object.keys(entities_list[regione]),
                                             function (id) { return entities_json[id]; })){
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

            const cities_string = citta_entita(ent_dict);

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

    // funzione anonima per non passare l'evento a sort_alphabetically
    $("#cognome").click(function () { sort_alphabetically(); });
    $("#luogo").click(function () { sort_geographically(); });
    $("#btn-luogo").click(function () { sort_geographically(); });
    $("#btn-cognome").click(function () { sort_alphabetically(); });

});

/* Cerca il valore nel nome e nelle città delle entità e ordina i risultati */
var performSearch = function (searchValue = "") {

    if (searchValue) {
        const searchValue_lw = searchValue.toLowerCase(); // lowercase per rendere la ricerca case insensitive

        const filteredEntities = {}; // variabile per contenere le entità corrispondenti alla ricerca utente

        for (const [key, entita] of Object.entries(entities_json)) {

            let searchValues = []; // prepara contenitore con i valori su cui cercare

            // --- nome
            searchValues.push(entita['Nome']);

            // --- città
            // Sedi dell'entità, dalla stessa fonte di card e mappe.
            const luoghi = entita.Luoghi || {};       // se Luoghi non esiste crea object vuoto (così il sistema non crasha e va avanti)

            for (const luogo of Object.values(luoghi)) {
                const citta = (luogo['Città'] || '').trim();
                if (citta) searchValues.push(citta);
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





