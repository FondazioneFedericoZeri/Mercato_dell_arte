import csv
import json
import os
import sys
import time
import tqdm
from geopy.exc import GeocoderServiceError, GeocoderTimedOut, GeocoderUnavailable
from geopy.geocoders import Nominatim

# Nome del file delle entità, con o senza accento
def _file_entita(*candidati):
    for c in candidati:
        if os.path.isfile(c):
            return c
    return candidati[0]   # nessuno dei due: si usa il primo


def ENTITA_TSV():
    return _file_entita("data/entita.tsv", "data/entit\u00e0.tsv")


def ENTITA_JSON():
    return _file_entita("json/entita.json", "json/entit\u00e0.json")




def _coppia_incollata(testo):
    """Riconosce una coppia lat, lon incollata in un campo solo"""
    parti = [x.strip() for x in testo.split(",") if x.strip()]
    # "43.466, 11.882" -> due pezzi, ciascuno già un numero
    if len(parti) == 2 and all("." in x or x.lstrip("-").isdigit() for x in parti):
        return parti[0], parti[1]
    # "43,466, 11,882" -> quattro pezzi con la virgola decimale
    if len(parti) == 4 and not any("." in x for x in parti):
        return f"{parti[0]}.{parti[1]}", f"{parti[2]}.{parti[3]}"
    return None


def _coordinate_manuali(place):
    """Coordinate inserite a mano nelle colonne Latitudine e Longitudine"""
    lat = (place.get("Latitudine") or "").strip()
    lon = (place.get("Longitudine") or "").strip()
    if not lat and not lon:
        return None

    # Coppia lat, lon incollata tutta nella colonna Latitudine
    if lat and not lon:
        coppia = _coppia_incollata(lat)
        if coppia is not None:
            lat, lon = coppia

    lat = lat.replace(",", ".")
    lon = lon.replace(",", ".")
    if not lat or not lon:
        mancante = "la longitudine" if lat else "la latitudine"
        valore = lat or lon
        print(f"  [coordinate] {place.get('ID')}: manca {mancante} ({valore!r}). "
              f"Servono entrambe le colonne, oppure la coppia \"lat, lon\" "
              f"in Latitudine. Le ignoro.", file=sys.stderr)
        return None
    try:
        lat_f, lon_f = float(lat), float(lon)
    except ValueError:
        print(f"  [coordinate] {place.get('ID')}: valori non numerici "
              f"({lat!r}, {lon!r}), li ignoro", file=sys.stderr)
        return None
    if not (-90 <= lat_f <= 90 and -180 <= lon_f <= 180):
        print(f"  [coordinate] {place.get('ID')}: fuori intervallo "
              f"({lat_f}, {lon_f}), le ignoro", file=sys.stderr)
        return None
    return {"lat": lat_f, "lon": lon_f}


def _address_key(place):
    # Campi dell'indirizzo usati per la geocodifica
    return f"{place['Via']}|{place['Civico']}|{place['Città']}|{place['Nazione']}"


def _geocode_with_retries(geolocator, query, retries=3, base_delay=2):
    """Geocodifica con tentativi ripetuti, restituisce None se fallisce"""
    for attempt in range(retries):
        try:
            return geolocator.geocode(query, timeout=10)
        except (GeocoderTimedOut, GeocoderUnavailable, GeocoderServiceError) as e:
            print(f"  [geocoding] tentativo {attempt + 1}/{retries} fallito per "
                  f"'{query}': {e}", file=sys.stderr)
            time.sleep(base_delay * (attempt + 1))
        except Exception as e:
            # Qualsiasi altro errore: salta la riga
            print(f"  [geocoding] errore imprevisto per '{query}': {e}", file=sys.stderr)
            return None
    print(f"  [geocoding] rinuncio dopo {retries} tentativi per '{query}'", file=sys.stderr)
    return None


def build_places(input_csv, output_json):
    # Riusa le coordinate già calcolate se l'indirizzo non è cambiato
    existing = {}
    if os.path.isfile(output_json):
        try:
            with open(output_json, encoding="utf-8") as f:
                existing = json.load(f)
        except (json.JSONDecodeError, OSError):
            existing = {}

    geolocator = Nominatim(user_agent="mercato-dell-arte")

    places_dicts = {}
    failed = []

    with open(input_csv, encoding="utf-8") as csv_fin:
        reader = csv.reader(csv_fin, delimiter='\t')
        header = reader.__next__()
        # print(header)
        # input()
        for row in tqdm.tqdm(reader):
            # Salta le righe vuote
            if not any(cell.strip() for cell in row):
                continue

            place = {x: "" for x in header}
            place_tmp = dict(zip(header, row))
            for x in place_tmp:
                place[x] = place_tmp[x]

            if not place.get('ID', '').strip():
                continue

            manuali = _coordinate_manuali(place)
            if manuali is not None:
                place["geo"] = manuali
                places_dicts[place['ID']] = place
                continue

            cached = existing.get(place['ID'])
            can_reuse = (
                cached is not None
                and cached.get("geo", {}).get("lat") is not None
                and _address_key(cached) == _address_key(place)
            )

            if can_reuse:
                place["geo"] = cached["geo"]
            else:
                location = _geocode_with_retries(
                    geolocator,
                    f"{place['Via']} {place['Civico']} {place['Città']} {place['Nazione']}")
                if location is not None:
                    place["geo"] = {"lat": location.latitude,
                                    "lon": location.longitude}
                else:
                    place["geo"] = {"lat": None,
                                    "lon": None}
                    failed.append(place['ID'])
                time.sleep(1.3)

            places_dicts[place['ID']] = place

    # Scrive comunque il file, i luoghi falliti si ritentano al prossimo run
    with open(output_json, "w", encoding="utf-8") as fout:
        print(json.dumps(places_dicts,
                         ensure_ascii=False,
                         indent=4), file=fout)

    if failed:
        print(f"Luoghi non geocodificati ({len(failed)}), saranno ritentati "
              f"al prossimo run: {', '.join(failed)}", file=sys.stderr)


def build_generic(input_csv, output_json):

    fout = open(output_json, "w", encoding="utf-8")

    imgs_dicts = {}

    with open(input_csv, encoding="utf-8") as csv_fin:
        reader = csv.reader(csv_fin, delimiter='\t')
        header = reader.__next__()
        for row in tqdm.tqdm(reader):
            img = dict(zip(header, row))
            # place = {x:y for x, y in place.items() if x in places_fields}

            imgs_dicts[img['ID']] = img

    print(json.dumps(imgs_dicts,
                     ensure_ascii=False,
                     indent=4), file=fout)


def build_people(input_csv, output_json):

    luoghi = json.loads(open("json/luoghi.json").read())

    fout = open(output_json, "w", encoding="utf-8")

    people_dict = {}
    with open(input_csv, encoding="utf-8") as csv_fin:
        reader = csv.reader(csv_fin, delimiter='\t')
        header = reader.__next__()
        for row in tqdm.tqdm(reader):
            person = dict(zip(header, row))
            person_places = person["ID_luoghi"].split(" ")
            person["ID_luoghi"] = {}
            for place in person_places:
                if place in luoghi:
                    person["ID_luoghi"][place] = luoghi[place]

            people_dict[person["ID"]] = person

    print(json.dumps(people_dict,
                     ensure_ascii=False,
                     indent=4), file=fout)


def build_entities(input_csv_entità, output_json):
    bibliografia = json.loads(open("json/bibliografia.json").read())
    collaboratori = json.loads(open("json/collaboratori.json").read())
    persone = json.loads(open("json/persone.json").read())
    compravendite = json.loads(open("json/compravendite.json").read())
    eventi = json.loads(open("json/eventi.json").read())
    relazioni = json.loads(open("json/relazioni.json").read())
    luoghi = json.loads(open("json/luoghi.json").read())

    fout = open(output_json, "w", encoding="utf-8")

    entities_dicts = {}

    with open(input_csv_entità, encoding="utf-8") as csv_fin:
        reader = csv.reader(csv_fin, delimiter='\t')
        header = reader.__next__()
        for row in tqdm.tqdm(reader):
            entity = dict(zip(header, row))

            entity_bib = entity["Bibliografia"].split(" ")
            entity["Bibliografia"] = {}
            for x in entity_bib:
                if x in bibliografia:
                    entity["Bibliografia"][x] = bibliografia[x]

            entity_collaboratori = entity["Collaboratori"].split(" ")
            entity["Collaboratori"] = {}
            for x in entity_collaboratori:
                if x in collaboratori:
                    entity["Collaboratori"][x] = collaboratori[x]

            if "Foto gallery" in entity and entity["Foto gallery"].strip():
                entity["Foto gallery"] = entity["Foto gallery"].split(" ")
            else:
                entity["Foto gallery"] = []

            entity["Persone"] = {}
            entity["Clienti"] = {}
            entity["Eventi"] = {}
            entity["Relazioni"] = {}
            entity["Luoghi"] = {}

            entities_dicts[entity["ID"]] = entity

    # Sedi dell'entità dalla colonna ID_entità di luoghi.tsv
    # Un luogo può avere più entità separate da spazio
    for luogo_id, luogo in luoghi.items():
        for ent in str(luogo.get("ID_entità") or "").split():
            if ent in entities_dicts:
                entities_dicts[ent]["Luoghi"][luogo_id] = luogo

    for person in persone:
        ent = persone[person]["ID_entità"]
        if ent in entities_dicts:
            entities_dicts[ent]["Persone"][person] = persone[person]

    for vendita in compravendite:
        ent = compravendite[vendita]["ID_entità"]
        if ent in entities_dicts:
            if not compravendite[vendita]["ID_cliente"] in entities_dicts[ent]["Clienti"]:
                entities_dicts[ent]["Clienti"][compravendite[vendita]["ID_cliente"]] = {"Nome": compravendite[vendita]["Nome"],
                                                                                        "Cognome": compravendite[vendita]["Cognome"],
                                                                                        "vendite": []}
            if "ID_persone" in compravendite[vendita]:
                entities_dicts[ent]["Clienti"][compravendite[vendita]["ID_cliente"]]["vendite"].append(
                    compravendite[vendita]["ID_persone"])
            else:
                entities_dicts[ent]["Clienti"][compravendite[vendita]
                                               ["ID_cliente"]]["vendite"].append("Generic")

    for evento in eventi:
        ent = eventi[evento]["ID_entità"]
        if ent in entities_dicts:
            entities_dicts[ent]["Eventi"][evento] = eventi[evento]

    # Tiene la relazione solo se entrambi i codici sono entità, se no avvisa
    for relazione in relazioni:
        ent1 = (relazioni[relazione].get("ID_entità_1") or "").strip()
        ent2 = (relazioni[relazione].get("ID_entità_2") or "").strip()

        ignoti = [e for e in (ent1, ent2) if e and e not in entities_dicts]
        if ignoti:
            print(f"  [relazioni.tsv] {relazione}: "
                  f"{', '.join(ignoti)} non è un'entità antiquariale, "
                  f"relazione ignorata", file=sys.stderr)
            continue
        if not ent1 or not ent2:
            print(f"  [relazioni.tsv] {relazione}: manca una delle due "
                  f"entità, relazione ignorata", file=sys.stderr)
            continue
        if ent1 == ent2:
            print(f"  [relazioni.tsv] {relazione}: {ent1} collegata a se "
                  f"stessa, relazione ignorata", file=sys.stderr)
            continue

        entities_dicts[ent1]["Relazioni"][ent2] = True
        entities_dicts[ent2]["Relazioni"][ent1] = True

    print(json.dumps(entities_dicts,
                     ensure_ascii=False,
                     indent=4), file=fout)


# Rigenera anche i JSON che dipendono da quello aggiornato

if __name__ == "__main__":

    import sys

    if sys.argv[1] == "luoghi":
        build_places("data/luoghi.tsv", "json/luoghi.json")
        # persone.json incorpora i luoghi, entità.json incorpora le persone
        build_people("data/persone.tsv", "json/persone.json")
        build_entities(ENTITA_TSV(), ENTITA_JSON())

    if sys.argv[1] == "didascalie":
        build_generic("data/didascalie.tsv", "json/didascalie.json")

    if sys.argv[1] == "bibliografia":
        build_generic("data/bibliografiaGenerale.tsv",
                      "json/bibliografia.json")
        build_entities(ENTITA_TSV(), ENTITA_JSON())

    if sys.argv[1] == "collaboratori":
        build_generic("data/collaboratori.tsv",
                      "json/collaboratori.json")
        build_entities(ENTITA_TSV(), ENTITA_JSON())

    if sys.argv[1] == "eventi":
        build_generic("data/eventi.tsv", "json/eventi.json")
        # TODO: modify build people and account for data from eventi
        build_entities(ENTITA_TSV(), ENTITA_JSON())

    if sys.argv[1] == "compravendite":
        build_generic("data/compravendite.tsv",
                      "json/compravendite.json")
        # TODO: modify build people and account for data from compravendite
        build_entities(ENTITA_TSV(), ENTITA_JSON())

    if sys.argv[1] == "relazioni":
        build_generic("data/relazioni.tsv", "json/relazioni.json")
        # TODO: modify build people and account for data from relazioni
        build_entities(ENTITA_TSV(), ENTITA_JSON())

    if sys.argv[1] == "persone":
        build_people("data/persone.tsv", "json/persone.json")
        build_entities(ENTITA_TSV(), ENTITA_JSON())

    # Accetta sia "entita" sia "entità"
    if sys.argv[1] in ("entita", "entità"):
        build_entities(ENTITA_TSV(), ENTITA_JSON())
