$.ajaxSetup({
    async: false
});


$.getJSON("https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/entit%C3%A0.json", function (json) {
    entities_json = json;
});

var cmp_geography = function(k1, k2){
    if (k1 == "Francia"){
        return -1;
    }
    if (k2 == "Francia") {
        return 1
    }

    if (k1 == "Gran Bretagna"){
        return -1;
    }
    if (k2 == "Gran Bretagna") {
        return 1
    }

    if (k1 == "Stati Uniti d'America"){
        return -1
    }
    if (k2 == "Stati Uniti d'America"){
        return 1
    }

    return k1 > k2
}

var sort_alphabetically = function () {
    var entities_list = {}
    for (ent in entities_json) {

        var ent_id = ent;
        var ent_dict = entities_json[ent];

        var firstletter = ent_dict["Nome"][0];

        if (!(firstletter in entities_list)){
            entities_list[firstletter] = {};
        }

        entities_list[firstletter][ent_dict["ID"]] = ent_id;
    }

    document.getElementById('cards-section').innerHTML = '';
    const div = document.getElementById('cards-section');

    for (letter in entities_list){
        const h2 = document.createElement('h2');
        h2.classList = "letter"
        h2.appendChild(document.createTextNode(letter));
        div.appendChild(h2)


        const card_container = document.createElement('div');
        card_container.classList = "card-container";

        for (ent_id in entities_list[letter]){
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
            //fine funzione

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




