import requests
import json
import os

BASE_URL = "https://www.dnd5eapi.co/api"
OUTPUT_DIR = os.path.join("data", "5eAPI")


def fetch_all_monsters():
    monsters = fetch_endpoint("monsters")
    all_monsters = []
    for monster in monsters["results"]:
        detail = requests.get(f"{BASE_URL}/monsters/{monster['index']}").json()
        all_monsters.append(detail)
    return all_monsters

def fetch_endpoint(endpoint):
    url = f"{BASE_URL}/{endpoint}"
    resp = requests.get(url)
    resp.raise_for_status()
    return resp.json()

def fetch_all_spells():
    spells = fetch_endpoint("spells")
    all_spells = []
    for spell in spells["results"]:
        detail = requests.get(f"{BASE_URL}/spells/{spell['index']}").json()
        all_spells.append(detail)
    return all_spells


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("Fetching all monsters...")
    all_monsters = fetch_all_monsters()
    with open(os.path.join(OUTPUT_DIR, "monsters.json"), "w", encoding="utf-8") as f:
        json.dump(all_monsters, f, indent=2)
    print("Done. All monsters saved in data/5eAPI/monsters.json")

if __name__ == "__main__":
    main()
