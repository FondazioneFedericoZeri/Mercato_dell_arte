import json
import pandas as pd


def build_kinships(input_csv, entity_json, person_csv, output_json):
    # Load the entity data from entità.json
    with open(entity_json, 'r', encoding='utf-8') as f:
        entities = json.load(f)
    # Load the person data from persone.json
    persons = pd.read_csv(person_csv)
    persons = persons.loc[:, ~persons.columns.str.startswith('Unnamed')]
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
        entity_id = row['ID_entit�'].upper()
        person1 = row['ID_persona_1'].upper()
        person2 = row['ID_persona_2'].upper()
        relation_type = row['tipologia']

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
                if person in persons['ID'].str.upper().values:
                    return {
                        "Nome": str(persons.loc[persons['ID'].str.upper() == person, 'Nome Persona'].values[0]),
                        "Nascita": str(persons.loc[persons['ID'].str.upper() == person, 'Nascita'].values[0]),
                        "Morte": str(persons.loc[persons['ID'].str.upper() == person, 'Morte'].values[0])
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
        build_kinships('../data/parentela.csv',
                       '../json/entità.json', '../data/persone.csv', '../json/parentela.json')
