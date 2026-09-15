import csv
import json
import os
import sys
import time
import tqdm
from geopy.exc import GeocoderServiceError, GeocoderTimedOut, GeocoderUnavailable
from geopy.geocoders import Nominatim


def _address_key(place):
    # The fields that feed the geocoding query: if any of these changed
    # since the last build, the cached coordinates are no longer valid
    # and the place must be re-geocoded.
    return f"{place['Via']}|{place['Civico']}|{place['Città']}|{place['Nazione']}"


def _geocode_with_retries(geolocator, query, retries=3, base_delay=2):
    """Geocode a query, retrying on transient failures instead of letting
    one bad/blocked request take down the whole build. Returns a Location
    or None (never raises)."""
    for attempt in range(retries):
        try:
            return geolocator.geocode(query, timeout=10)
        except (GeocoderTimedOut, GeocoderUnavailable, GeocoderServiceError) as e:
            print(f"  [geocoding] tentativo {attempt + 1}/{retries} fallito per "
                  f"'{query}': {e}", file=sys.stderr)
            time.sleep(base_delay * (attempt + 1))
        except Exception as e:
            # Catch-all: a single malformed row must never abort the whole run.
            print(f"  [geocoding] errore imprevisto per '{query}': {e}", file=sys.stderr)
            return None
    print(f"  [geocoding] rinuncio dopo {retries} tentativi per '{query}'", file=sys.stderr)
    return None


def build_places(input_csv, output_json):
    # Reuse coordinates already geocoded in a previous run: Nominatim's usage
    # policy caps requests at ~1/second, so re-geocoding hundreds of unchanged
    # addresses on every run (e.g. after adding a single new place) is both
    # slow and disrespectful of that limit. Only new places, or places whose
    # address changed, or places that failed to geocode last time, hit the API.
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
            # Skip fully blank lines (e.g. a stray trailing newline at end of file).
            if not any(cell.strip() for cell in row):
                continue

            place = {x: "" for x in header}
            place_tmp = dict(zip(header, row))
            for x in place_tmp:
                place[x] = place_tmp[x]

            if not place.get('ID', '').strip():
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

    # Always write out whatever was successfully built, even if some
    # addresses failed to geocode — a partial update beats none at all,
    # and failed entries (geo.lat == None) are retried on the next run.
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

            entities_dicts[entity["ID"]] = entity

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

    for relazione in relazioni:
        ent1 = relazioni[relazione]["ID_entità_1"]
        ent2 = relazioni[relazione]["ID_entità_2"]

        if ent1 in entities_dicts:
            entities_dicts[ent1]["Relazioni"][ent2] = True

        if ent2 in entities_dicts:
            entities_dicts[ent2]["Relazioni"][ent1] = True

    print(json.dumps(entities_dicts,
                     ensure_ascii=False,
                     indent=4), file=fout)


if __name__ == "__main__":

    import sys

    if sys.argv[1] == "luoghi":
        build_places("data/luoghi.tsv", "json/luoghi.json")

    if sys.argv[1] == "didascalie":
        build_generic("data/didascalie.tsv", "json/didascalie.json")

    if sys.argv[1] == "bibliografia":
        build_generic("data/bibliografiaGenerale.tsv",
                      "json/bibliografia.json")

    if sys.argv[1] == "collaboratori":
        build_generic("data/collaboratori.tsv",
                      "json/collaboratori.json")

    if sys.argv[1] == "eventi":
        build_generic("data/eventi.tsv", "json/eventi.json")
        # TODO: modify build people and account for data from eventi
        build_entities("data/entità.tsv", "json/entità.json")

    if sys.argv[1] == "compravendite":
        build_generic("data/compravendite.tsv",
                      "json/compravendite.json")
        # TODO: modify build people and account for data from compravendite
        build_entities("data/entità.tsv", "json/entità.json")

    if sys.argv[1] == "relazioni":
        build_generic("data/relazioni.tsv", "json/relazioni.json")
        # TODO: modify build people and account for data from relazioni
        build_entities("data/entità.tsv", "json/entità.json")

    if sys.argv[1] == "persone":
        build_people("data/persone.tsv", "json/persone.json")
        build_entities("data/entità.tsv", "json/entità.json")

    if sys.argv[1] == "entità":
        build_entities("data/entità.tsv", "json/entità.json")
