import os
import json
import pandas as pd

# ── Nome del file delle entita' ────────────────────────────────────
# Il file sta passando da "entità" (accentato) a "entita" senza accento.
# Un nome accentato attraversa male i trasferimenti fra sistemi diversi:
# e' gia' successo che arrivasse nel repo con "á" al posto di "à",
# facendo sparire il file e fallire la CI con un FileNotFoundError.
# Finche' la migrazione non e' conclusa si accetta il nome che c'e'.
def _file_entita(*candidati):
    for c in candidati:
        if os.path.isfile(c):
            return c
    return candidati[0]   # nessuno dei due: si usa il primo, per l'errore


def ENTITA_TSV():
    return _file_entita("data/entita.tsv", "data/entit\u00e0.tsv")


def ENTITA_JSON():
    return _file_entita("json/entita.json", "json/entit\u00e0.json")




def build_kinships(input_csv, entity_json, person_tsv, output_json):
    # Load the entity data from entità.json
    with open(entity_json, 'r', encoding='utf-8') as f:
        entities = json.load(f)
    # Load the person data from persone.json
    persons = pd.read_csv(person_tsv, sep="\t")
    persons = persons.loc[:, ~persons.columns.str.startswith('Unnamed')]
    persons = persons.astype(object)
    persons.fillna("", inplace=True)
    persons['Nascita'] = persons['Nascita'].apply(
        lambda x: str(int(x)) if pd.notna(x) and x != "" else "")

    # Load the kinship data from the cleaned parentela CSV
    kinship_data = pd.read_csv(input_csv)
    kinship_data = kinship_data.loc[:, ~
                                    kinship_data.columns.str.startswith('Unnamed')]

    # Initialize the kinship dictionary to store the results
    kinships_dict = {}

    # List to track missing persons or mismatches
    missing_persons = []

    # Iterate over each row in the kinship CSV
    for _, row in kinship_data.iterrows():
        # Normalize the entity_id and person IDs by converting them to uppercase for comparison
        # .strip() guards against stray leading/trailing spaces in the source CSV
        # (e.g. "BA_V " or " BA_V_2"), which would otherwise silently fail to match.
        entity_id = row['ID_entità'].strip().upper()
        person1 = row['ID_persona_1'].strip().upper()
        person2 = row['ID_persona_2'].strip().upper()
        relation_type = row['tipologia'].strip()

        # Initialize the dictionary for the entity if not already done
        if entity_id not in kinships_dict:
            kinships_dict[entity_id] = {
                "Nome": entities.get(entity_id, {}).get("Nome", ""),
                "Relazioni": [],
                "Persone": {}
            }

        # Add the relationship information to the entity
        kinships_dict[entity_id]["Relazioni"].append({
            "Persona_1": person1,
            "Persona_2": person2,
            "Tipo_di_relazione": relation_type
        })

        # Function to safely fetch a person's info, and log if it's missing
        def get_person_info(entity_id, person):
            try:
                ids_upper = persons['ID'].str.strip().str.upper()
                if person in ids_upper.values:
                    return {
                        "Nome": str(persons.loc[ids_upper == person, 'Nome Persona'].values[0]),
                        "Nascita": str(persons.loc[ids_upper == person, 'Nascita'].values[0]),
                        "Morte": str(persons.loc[ids_upper == person, 'Morte'].values[0])
                    }
                else:
                    missing_persons.append((entity_id, person))
                    return {}
            except KeyError:
                missing_persons.append((entity_id, person))
                return {}

        # Gather additional information (name, birth, death) from entità.json for person1 and person2
        kinships_dict[entity_id]["Persone"][person1] = get_person_info(
            entity_id, person1)
        kinships_dict[entity_id]["Persone"][person2] = get_person_info(
            entity_id, person2)

    # Write the kinships data to the output JSON file
    with open(output_json, 'w', encoding='utf-8') as fout:
        json.dump(kinships_dict, fout, ensure_ascii=False, indent=4)

    # Optionally, print or log the missing persons for review
    if missing_persons:
        print("The following persons were missing or mismatched in the entità.json file:")
        for entity_id, person in missing_persons:
            print(f"Entity ID: {entity_id}, Person ID: {person}")


if __name__ == "__main__":

    import sys

    if sys.argv[1] == "parentela":
        build_kinships('data/parentela.csv',
                       ENTITA_JSON(), 'data/persone.tsv', 'json/parentela.json')
