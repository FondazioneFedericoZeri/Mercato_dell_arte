import json
import pandas as pd


def build_kinships(input_csv, input_json, output_json):
    # Load the entity data from entità.json
    with open(input_json, 'r', encoding='utf-8') as f:
        entities = json.load(f)

    # Load the kinship data (relationships) from the cleaned parentela CSV
    kinship_data = pd.read_csv(input_csv)

    # Initialize the kinship dictionary to store the results
    kinships_dict = {}

    # Iterate over each row in the kinship CSV
    for _, row in kinship_data.iterrows():
        entity_id = row['ID_entit�']
        person1 = row['ID_persona_1']
        person2 = row['ID_persona_2']
        relation_type = row['tipologia']

        # Initialize the dictionary for the entity if not already done
        if entity_id not in kinships_dict:
            kinships_dict[entity_id] = {
                "Nome": entities[entity_id].get("Nome", ""),
                "Relazioni": [],
                "Persone": {}
            }

        # Add the relationship information to the entity
        kinships_dict[entity_id]["Relazioni"].append({
            "Persona_1": person1,
            "Persona_2": person2,
            "Tipo_di_relazione": relation_type
        })

        # Gather additional information (name, birth, death) from entità.json for person1 and person2
        for person in [person1, person2]:
            if person in entities[entity_id].get("Persone", {}):
                person_info = entities[entity_id]["Persone"][person]
                kinships_dict[entity_id]["Persone"][person] = {
                    "Nome": person_info.get("Nome Persona", ""),
                    "Nascita": person_info.get("Nascita", ""),
                    "Morte": person_info.get("Morte", "")
                }

    # Write the kinships data to the output JSON file
    with open(output_json, 'w', encoding='utf-8') as fout:
        json.dump(kinships_dict, fout, ensure_ascii=False, indent=4)


if __name__ == "__main__":

    import sys

    if sys.argv[1] == "parentela":
        build_kinships('../data/parentela.csv',
                       '../json/entità.json', '../json/parentela.json')
