# Monster actions inventory statistics

- **Source:** `data/seeds/seed_monsters.json` (local seed data; not a live database).
- **Method:** scan each monster's `features.actions` list in source order.
  Each occurrence retains its original action object and source monster ID,
  monster name, and zero-based action-list index.
- **Equality:** compare the entire parsed action value using compact JSON
  serialization with recursively sorted object keys. Arrays remain ordered;
  nulls, missing fields, names, descriptions, attack data, and numbers remain
  significant. Monster provenance is excluded from identity.
- **Ordering:** occurrences and unique variants follow first appearance in the seed.
  No timestamps or generated identifiers are included.

## Counts

- Monster records scanned: **2,276**
- Action occurrences: **6,338**
- Unique full-action variants: **5,239**
- Repeat occurrences beyond each variant's first: **1,099**
- Exact-name groups with multiple full-action variants: **399**
- Variants in those same-name groups: **4,076**
- Occurrences in those same-name groups: **5,086**

## Same-name review groups

Groups use the exact parsed `name` value; they are review aids, not merges.

| Action name | Full-action variants | Occurrences |
| --- | ---: | ---: |
| `"Talon"` | 10 | 11 |
| `"Javelin"` | 24 | 40 |
| `"Multiattack"` | 1,269 | 1,432 |
| `"Branch"` | 5 | 5 |
| `"Radiant Pellet"` | 3 | 3 |
| `"Shortsword"` | 29 | 65 |
| `"Claws"` | 105 | 147 |
| `"Quarterstaff"` | 21 | 37 |
| `"Arcane Burst"` | 13 | 14 |
| `"Force Blast"` | 2 | 2 |
| `"Tentacle"` | 46 | 51 |
| `"Tail"` | 82 | 116 |
| `"Spear"` | 29 | 48 |
| `"Psychic Lash"` | 2 | 2 |
| `"Claw"` | 181 | 280 |
| `"Chilling Gaze"` | 3 | 3 |
| `"Bite"` | 438 | 637 |
| `"Beak"` | 26 | 31 |
| `"Talons"` | 17 | 19 |
| `"Club"` | 10 | 19 |
| `"Singularity Breath (Recharge 5-6)"` | 4 | 4 |
| `"Frightful Presence"` | 16 | 30 |
| `"Acid Breath (Recharge 5-6)"` | 5 | 6 |
| `"Lightning Breath (Recharge 5-6)"` | 6 | 7 |
| `"Breath Weapons (Recharge 5-6)"` | 21 | 21 |
| `"Change Shape"` | 22 | 34 |
| `"Scintillating Breath (Recharge 5-6)"` | 4 | 4 |
| `"Nightmare Breath (Recharge 5-6)"` | 4 | 4 |
| `"Disorienting Breath (Recharge 5-6)"` | 4 | 4 |
| `"Poison Breath (Recharge 5-6)"` | 6 | 6 |
| `"Stab"` | 3 | 6 |
| `"Spike"` | 3 | 5 |
| `"Cold Breath (Recharge 5-6)"` | 9 | 9 |
| `"Breath Weapon (Recharge 5-6)"` | 19 | 24 |
| `"Fire Breath (Recharge 5-6)"` | 10 | 10 |
| `"Debilitating Breath (Recharge 5-6)"` | 5 | 5 |
| `"Photonic Breath (Recharge 5-6)"` | 4 | 4 |
| `"Rend"` | 17 | 18 |
| `"Time Breath (Recharge 5-6)"` | 4 | 4 |
| `"Desiccating Breath (Recharge 5-6)"` | 4 | 4 |
| `"Bites"` | 13 | 19 |
| `"Proboscis"` | 4 | 4 |
| `"Slam"` | 93 | 116 |
| `"Flail"` | 6 | 7 |
| `"Lightning Strike (Recharge 6)"` | 2 | 2 |
| `"Shield Bash"` | 3 | 5 |
| `"Handaxe"` | 5 | 6 |
| `"Chilling Grasp"` | 2 | 2 |
| `"Mind Blast (Recharge 5-6)"` | 12 | 16 |
| `"Howling Babble (Recharge 6)"` | 2 | 2 |
| `"Horn"` | 6 | 6 |
| `"Radiant Touch"` | 2 | 2 |
| `"Stomp"` | 17 | 18 |
| `"Poison Blade"` | 2 | 2 |
| `"Taskmaster Whip"` | 2 | 2 |
| `"Forgetfulness (Recharge 6)"` | 2 | 2 |
| `"Spiked Club"` | 2 | 2 |
| `"Mandibles"` | 5 | 5 |
| `"Steam Breath (Recharge 5-6)"` | 4 | 4 |
| `"Constrict"` | 21 | 22 |
| `"Rime Breath (Recharge 5-6)"` | 2 | 2 |
| `"Force Strike"` | 4 | 4 |
| `"Hook"` | 5 | 7 |
| `"Slasher"` | 2 | 2 |
| `"Ram"` | 14 | 17 |
| `"Acid Spray (Recharge 6)"` | 2 | 2 |
| `"Fist"` | 25 | 31 |
| `"Rock"` | 30 | 36 |
| `"Fire Bolt (Cantrip)"` | 4 | 4 |
| `"Dagger"` | 36 | 75 |
| `"Teleport"` | 39 | 41 |
| `"Staff"` | 8 | 8 |
| `"Scimitar"` | 23 | 35 |
| `"Change Shape (2/Day)"` | 2 | 2 |
| `"Longbow"` | 26 | 42 |
| `"Hooves"` | 18 | 27 |
| `"Sword"` | 3 | 3 |
| `"Lightning Lance (Recharge 5-6)"` | 2 | 2 |
| `"Light Crossbow"` | 10 | 14 |
| `"Reel"` | 4 | 4 |
| `"Longsword"` | 54 | 76 |
| `"Morningstar"` | 13 | 15 |
| `"Touch"` | 5 | 5 |
| `"Ray of Cold"` | 2 | 2 |
| `"Life Drain"` | 13 | 13 |
| `"Noxious Breath (Recharge 5-6)"` | 2 | 3 |
| `"Gore"` | 27 | 34 |
| `"Shock"` | 3 | 3 |
| `"Longsword (two-handed)"` | 5 | 5 |
| `"Antlers"` | 2 | 2 |
| `"Greataxe"` | 14 | 21 |
| `"Warhammer"` | 3 | 3 |
| `"Hellish Morningstar"` | 2 | 2 |
| `"Infernal Command"` | 3 | 4 |
| `"Pseudopod"` | 21 | 25 |
| `"Whip"` | 4 | 4 |
| `"Tongue"` | 8 | 8 |
| `"Shadow Step"` | 2 | 2 |
| `"Swallow"` | 13 | 13 |
| `"Horrifying Visage"` | 2 | 2 |
| `"Heartcleaver"` | 2 | 2 |
| `"Hurl Flame"` | 4 | 4 |
| `"Shortbow"` | 20 | 35 |
| `"Glaive"` | 9 | 10 |
| `"Foreleg"` | 4 | 5 |
| `"Eye Rays"` | 9 | 9 |
| `"Eye Ray"` | 3 | 3 |
| `"Greatsword"` | 26 | 34 |
| `"Mace"` | 15 | 18 |
| `"Dreadful Aspect (Recharges after a Short or Long Rest)"` | 2 | 2 |
| `"Armblade"` | 2 | 3 |
| `"Bolt Launcher"` | 2 | 3 |
| `"Rapier"` | 6 | 8 |
| `"Unarmed Strike"` | 27 | 30 |
| `"Heavy Crossbow"` | 13 | 22 |
| `"Chain"` | 5 | 5 |
| `"Lightning Strike"` | 2 | 3 |
| `"Tusk"` | 5 | 5 |
| `"Multiattack (Vampire Form Only)"` | 3 | 5 |
| `"Unarmed Strike (Vampire Form Only)"` | 2 | 4 |
| `"Charm"` | 4 | 7 |
| `"Oil Puddle"` | 2 | 2 |
| `"Sting"` | 10 | 12 |
| `"Piercing Claw"` | 2 | 2 |
| `"Maul"` | 8 | 8 |
| `"Tail Stinger"` | 4 | 5 |
| `"Bite (Wolf or Hybrid Form Only)"` | 2 | 2 |
| `"Bite (Rat or Hybrid Form Only)"` | 2 | 3 |
| `"Shortsword (Humanoid or Hybrid Form Only)"` | 2 | 3 |
| `"Hand Crossbow (Humanoid or Hybrid Form Only)"` | 2 | 3 |
| `"Trident"` | 12 | 15 |
| `"Chill Touch (Cantrip)"` | 4 | 4 |
| `"Greatclub"` | 12 | 14 |
| `"Invisibility"` | 6 | 6 |
| `"Hallucination Spores"` | 2 | 2 |
| `"Infestation Spores (1/Day)"` | 2 | 2 |
| `"Lightning Flare (Recharges after a Short or Long Rest)"` | 2 | 2 |
| `"Swallowing Bite"` | 2 | 2 |
| `"Eldritch Blast"` | 2 | 2 |
| `"Barbed Tail"` | 3 | 3 |
| `"Spiked Chain"` | 4 | 5 |
| `"Paralyzing Breath (Recharge 5-6)"` | 2 | 2 |
| `"Fire Ray"` | 3 | 3 |
| `"Head Butt"` | 2 | 2 |
| `"Spores (1/Day)"` | 4 | 4 |
| `"Tentacles"` | 27 | 31 |
| `"Death Ray (Recharge 5-6)"` | 2 | 2 |
| `"Pike"` | 2 | 2 |
| `"Dreadful Glare"` | 4 | 4 |
| `"Lightning Mace"` | 2 | 2 |
| `"Radiant Breath (Recharge 5-6)"` | 2 | 2 |
| `"Horns"` | 2 | 2 |
| `"Web (Recharge 5-6)"` | 4 | 5 |
| `"Pincer"` | 7 | 7 |
| `"Magical Gift (1/Day)"` | 2 | 4 |
| `"Natural Shelter"` | 2 | 4 |
| `"Tentacle Slam"` | 3 | 3 |
| `"Harpoon"` | 5 | 5 |
| `"Explosive Bolt (Recharge 5-6)"` | 2 | 2 |
| `"Etherealness"` | 5 | 7 |
| `"Hoof"` | 5 | 5 |
| `"Harvest the Dead"` | 2 | 2 |
| `"Wind Javelin"` | 3 | 3 |
| `"Spit Rock"` | 4 | 4 |
| `"Grasping Root"` | 2 | 2 |
| `"Bolt"` | 3 | 3 |
| `"Agonizing Burst"` | 2 | 2 |
| `"Draining Kiss"` | 2 | 3 |
| `"Illusory Appearance"` | 3 | 3 |
| `"Invisible Passage"` | 2 | 2 |
| `"War Pick"` | 5 | 9 |
| `"Lance"` | 3 | 3 |
| `"Scythe"` | 4 | 4 |
| `"Blood Drain"` | 3 | 4 |
| `"Bite (Slaad Form Only)"` | 3 | 3 |
| `"Claws (Slaad Form Only)"` | 2 | 2 |
| `"Deathly Claw"` | 3 | 4 |
| `"Grave Bolt"` | 4 | 4 |
| `"Battleaxe"` | 9 | 10 |
| `"Bite (Hybrid Form Only)"` | 2 | 3 |
| `"Gaze"` | 2 | 2 |
| `"Hooked Spear"` | 2 | 3 |
| `"Chromatic Beam"` | 2 | 2 |
| `"Healing Touch (3/Day)"` | 4 | 4 |
| `"Noxious Touch"` | 2 | 2 |
| `"Imprison Soul"` | 2 | 2 |
| `"Soul Rend (Recharge 6)"` | 2 | 2 |
| `"Flailing Claws (Recharge 5-6)"` | 2 | 2 |
| `"Hand Crossbow"` | 10 | 16 |
| `"Entropic Javelin"` | 2 | 2 |
| `"Read Thoughts"` | 2 | 2 |
| `"Sling"` | 4 | 14 |
| `"Serrated Sword"` | 2 | 3 |
| `"Psychic Crush (Recharge 5-6)"` | 2 | 2 |
| `"Radiant Bolt"` | 2 | 2 |
| `"Petrifying Breath (Recharge 5-6)"` | 2 | 2 |
| `"Poisonous Touch (Humanoid Form Only)"` | 2 | 2 |
| `"Death Lance"` | 2 | 2 |
| `"Summon Demon (1/Day)"` | 2 | 2 |
| `"Demon Staff"` | 2 | 2 |
| `"Scourge"` | 2 | 2 |
| `"Shadow Sword"` | 2 | 2 |
| `"Enlarge (Recharges after a Short or Long Rest)"` | 4 | 10 |
| `"Invisibility (Recharges after a Short or Long Rest)"` | 5 | 11 |
| `"Iron Fist"` | 2 | 2 |
| `"Stomping Foot"` | 2 | 2 |
| `"Hammer"` | 2 | 3 |
| `"Shared Invisibility (Recharges after a Short or Long Rest)"` | 2 | 2 |
| `"Mind-Poison Dagger"` | 2 | 2 |
| `"Invisibility (Recharge 4-6)"` | 3 | 4 |
| `"Mind Mastery"` | 2 | 2 |
| `"Soulblade"` | 2 | 2 |
| `"Psychic-Attuned Hammer"` | 2 | 2 |
| `"Call to Attack"` | 2 | 2 |
| `"Fire Lance"` | 3 | 3 |
| `"Possess Corpse (Recharge 6)"` | 2 | 2 |
| `"Tendril"` | 3 | 3 |
| `"Extract Brain"` | 10 | 14 |
| `"Thunderous Strike (Recharge 6)"` | 2 | 2 |
| `"Divine Dread"` | 2 | 2 |
| `"Eat Memories"` | 2 | 2 |
| `"Lightning Storm (Recharge 6)"` | 2 | 2 |
| `"Constrict (Serpent Form Only)"` | 2 | 2 |
| `"Extra Attack"` | 5 | 6 |
| `"Withering Touch"` | 4 | 5 |
| `"Summon Demodand (1/Day)"` | 3 | 3 |
| `"Teleport (1/Day)"` | 2 | 2 |
| `"Sticky Leg"` | 4 | 4 |
| `"Sticky Leg (Recharges when the Steeder Has No Creatures Grappled)"` | 2 | 2 |
| `"Boulder"` | 3 | 3 |
| `"Necrotic Shard"` | 2 | 2 |
| `"Fiery Strikes (Recharge 6)"` | 2 | 2 |
| `"Forge Hammer"` | 2 | 2 |
| `"Fling"` | 5 | 6 |
| `"Spit Fire (Recharges after a Short or Long Rest)"` | 2 | 2 |
| `"Magic Flare"` | 2 | 2 |
| `"Flail Tentacle"` | 2 | 2 |
| `"Shell Defense"` | 5 | 8 |
| `"Flail of Pain"` | 2 | 2 |
| `"Flail of Paralysis"` | 2 | 2 |
| `"Arc Lightning"` | 2 | 2 |
| `"Spit Poison"` | 2 | 2 |
| `"Freezing Stare"` | 2 | 2 |
| `"Rotting Fist"` | 3 | 3 |
| `"Shocking Touch"` | 2 | 2 |
| `"Possession (Recharge 6)"` | 7 | 7 |
| `"Engulf"` | 3 | 3 |
| `"Stinger"` | 7 | 7 |
| `"Wing"` | 2 | 2 |
| `"Ink Cloud (Recharges after a Short or Long Rest)"` | 2 | 2 |
| `"Force Bolt"` | 2 | 2 |
| `"Fire Burst (Recharge 5-6)"` | 2 | 2 |
| `"Tusks"` | 3 | 3 |
| `"Musket"` | 3 | 5 |
| `"Fragmentation Grenade (1/Day)"` | 2 | 2 |
| `"Fork"` | 3 | 3 |
| `"Telekinetic Bolt"` | 3 | 3 |
| `"Silver Greatsword"` | 2 | 3 |
| `"Psychic Bolt"` | 3 | 3 |
| `"Shadow Spear"` | 2 | 2 |
| `"Bite (Bear or Hybrid Form Only)"` | 2 | 2 |
| `"Claw (Bear or Hybrid Form Only)"` | 2 | 2 |
| `"Greataxe (Humanoid or Hybrid Form Only)"` | 3 | 3 |
| `"Wave of Sorrow (Greatsword)"` | 2 | 2 |
| `"Cataclysmic Breath (Recharge 5-6)"` | 2 | 2 |
| `"Lashing Shadows (Recharge 5-6)"` | 2 | 2 |
| `"Lashing Maw"` | 2 | 2 |
| `"Psychic Orb"` | 3 | 4 |
| `"Empathic Link"` | 3 | 3 |
| `"Mesmerizing Chirr (Recharge 6)"` | 2 | 2 |
| `"Luring Song"` | 2 | 2 |
| `"Mind Thrust"` | 2 | 2 |
| `"Hellfire Weapons"` | 2 | 2 |
| `"Snake Hair"` | 3 | 3 |
| `"Fae Blade"` | 2 | 2 |
| `"Elemental Strike"` | 3 | 3 |
| `"Leadership (Recharges after a Short or Long Rest)"` | 2 | 3 |
| `"Dart"` | 6 | 10 |
| `"Shadow Jaunt"` | 2 | 2 |
| `"Rending Bite"` | 2 | 2 |
| `"Spit Acid"` | 2 | 2 |
| `"Steal Memory (1/Day)"` | 2 | 2 |
| `"Silver Longsword"` | 2 | 3 |
| `"Augment Physicality (1/Day)"` | 2 | 2 |
| `"Acid Lash"` | 2 | 2 |
| `"Eject Slime (Recharge 5-6)"` | 2 | 2 |
| `"Arcane Blast"` | 2 | 2 |
| `"Weapon Invention"` | 2 | 2 |
| `"Chromatic Bolt"` | 2 | 2 |
| `"Lightning Storm"` | 2 | 2 |
| `"Lightning Strike (Recharge 5-6)"` | 3 | 3 |
| `"Voice of the Kraken (Recharges after a Short or Long Rest)"` | 2 | 2 |
| `"Net"` | 2 | 2 |
| `"Radiant Strike"` | 3 | 3 |
| `"Tidal Wave (Recharge 6)"` | 2 | 2 |
| `"Magical Strike"` | 3 | 3 |
| `"Spell Mimicry (Recharge 5-6)"` | 3 | 3 |
| `"Harpoon Arm"` | 2 | 2 |
| `"Sorrowful Embrace"` | 2 | 2 |
| `"Halberd"` | 2 | 3 |
| `"Scroll Bash"` | 2 | 2 |
| `"Arm Spike"` | 2 | 2 |
| `"Multiattack (Humanoid or Hybrid Form Only)"` | 7 | 7 |
| `"Beak (Raven or Hybrid Form Only)"` | 2 | 2 |
| `"Unerring Slam"` | 2 | 2 |
| `"Shocking Grasp (Cantrip)"` | 2 | 2 |
| `"Ray of Sickness (1st-Level Spell; Requires a Spell Slot)"` | 2 | 2 |
| `"Shadow Teleport (Recharge 5-6)"` | 2 | 2 |
| `"Ray of Frost (Cantrip)"` | 2 | 2 |
| `"Hellfire Lash (Recharge 5-6)"` | 2 | 2 |
| `"Oar"` | 2 | 2 |
| `"Fear Gaze"` | 2 | 2 |
| `"Calming Mist (Recharge 5-6)"` | 2 | 2 |
| `"Many-Tailed Whip"` | 2 | 2 |
| `"Breath of Despair (Recharge 5-6)"` | 2 | 2 |
| `"Demonic Weapon"` | 2 | 2 |
| `"Snakebite"` | 2 | 2 |
| `"Wolf Bite"` | 2 | 2 |
| `"Rapport Spores"` | 2 | 2 |
| `"Soul-Stealing Gaze"` | 2 | 2 |
| `"Deathly Ray"` | 2 | 2 |
| `"Psychic Touch"` | 2 | 2 |
| `"Hellfire Lance"` | 2 | 2 |
| `"Terrifying Command"` | 2 | 2 |
| `"Healing (1/Day)"` | 2 | 2 |
| `"Necrotic Bolt"` | 3 | 3 |
| `"Needle Volley"` | 2 | 2 |
| `"Needle"` | 2 | 2 |
| `"Swarm of Bites"` | 3 | 3 |
| `"Eldritch Bolt"` | 2 | 2 |
| `"Enervating Focus"` | 2 | 2 |
| `"Finger of Doom (Recharge 6)"` | 2 | 2 |
| `"Arm"` | 2 | 2 |
| `"Crimson Bolt"` | 2 | 2 |
| `"Chain Smash (Recharge 6)"` | 2 | 2 |
| `"Wand of Orcus"` | 2 | 2 |
| `"Infernal Dagger"` | 2 | 2 |
| `"Brass Crossbow"` | 2 | 2 |
| `"Strength Drain"` | 2 | 2 |
| `"Light Hammer"` | 2 | 2 |
| `"Healing Touch (4/Day)"` | 2 | 2 |
| `"Psychic Crush"` | 3 | 3 |
| `"Exponential Lash"` | 2 | 2 |
| `"Incite Fanaticism"` | 2 | 2 |
| `"Power of the Dragon Queen"` | 2 | 2 |
| `"Smother"` | 3 | 3 |
| `"Arcane Shock"` | 2 | 2 |
| `"Lightning Sword"` | 2 | 3 |
| `"Hailstone"` | 2 | 2 |
| `"Death Glare"` | 2 | 2 |
| `"Piscine Anatomy"` | 2 | 2 |
| `"Wave of Weariness (Recharge 4-6)"` | 2 | 2 |
| `"Squirt Bile"` | 2 | 2 |
| `"Warp Creature"` | 2 | 2 |
| `"Ink Blade"` | 2 | 2 |
| `"Bone Staff"` | 2 | 2 |
| `"Life Leech"` | 4 | 4 |
| `"Tail Spine"` | 2 | 2 |
| `"Burrowing Worm"` | 2 | 2 |
| `"Summon Slaadi (1/Day)"` | 2 | 2 |
| `"Reaping Arms (Recharge 5-6)"` | 2 | 2 |
| `"Plague of Worms (Recharge 6)"` | 2 | 2 |
| `"Comet Staff"` | 2 | 2 |
| `"Collapse Distance (Recharge 6)"` | 2 | 2 |
| `"Stunning Roar (Recharge 5-6)"` | 2 | 2 |
| `"Petrifying Claws"` | 2 | 2 |
| `"Petrifying Touch"` | 2 | 2 |
| `"Upper Plane"` | 2 | 2 |
| `"Neutral Plane"` | 2 | 2 |
| `"Lower Plane"` | 2 | 2 |
| `"Call to Honor (1/Day)"` | 2 | 2 |
| `"Flurry of Bites"` | 3 | 3 |
| `"Maw"` | 2 | 2 |
| `"Acid Saliva (Recharge 5-6)"` | 2 | 2 |
| `"Gythka"` | 3 | 3 |
| `"Chatkcha"` | 2 | 2 |
| `"Silver Sword"` | 2 | 2 |
| `"Frightful Word"` | 2 | 2 |
| `"Twisting Words"` | 2 | 2 |
| `"Animate Trees (1/Day)"` | 2 | 2 |
| `"Energy Drain"` | 3 | 3 |
| `"Abyssal Curse"` | 2 | 2 |
| `"Rotting Touch"` | 2 | 2 |
| `"Longbow (Humanoid or Hybrid Form Only)"` | 2 | 2 |
| `"Briar Vine"` | 2 | 2 |
| `"Multiattack (Hybrid form only)"` | 2 | 2 |
| `"Longsword (Humanoid form only)"` | 2 | 2 |
| `"Bite (Wolf or Hybrid form only)"` | 2 | 2 |
| `"Claws (Hybrid form only)"` | 2 | 2 |
| `"Lethargic Song (Humanoid form only)"` | 2 | 2 |
| `"Shortsword and Dagger"` | 2 | 2 |
| `"Massive Arm"` | 2 | 2 |
| `"Baleful Baying"` | 2 | 2 |
| `"Multiattack (Anathema Form Only)"` | 2 | 2 |
| `"Multiattack (Yuan-ti Form Only)"` | 6 | 8 |
| `"Longbow (Yuan-ti Form Only)"` | 2 | 4 |
| `"Spectral Fangs"` | 3 | 3 |
| `"Invoke Nightmare (Recharges after a Short or Long Rest)"` | 2 | 2 |
| `"Horrid Touch (Recharge 5-6)"` | 3 | 3 |

## Concrete source examples

Aarakocra (monster ID 1) is shown directly from the seed. The actions
include attacks and a descriptive non-attack action; all are inventoried.

### Aarakocra action index 0: `"Talon"`

```json
{
  "attack": {
    "attack_bonus": 4,
    "automatic_hit": false,
    "damage": [
      {
        "bonus": 2,
        "damage_types": [
          "slashing"
        ],
        "formula": "1d4"
      }
    ],
    "kind": "melee_weapon",
    "long_range_ft": null,
    "range_ft": 5,
    "targets": 1
  },
  "description": null,
  "name": "Talon"
}
```

### Aarakocra action index 1: `"Javelin"`

```json
{
  "attack": {
    "attack_bonus": 4,
    "automatic_hit": false,
    "damage": [
      {
        "bonus": 2,
        "damage_types": [
          "piercing"
        ],
        "formula": "1d6"
      }
    ],
    "kind": "ranged_weapon",
    "long_range_ft": 120,
    "range_ft": 30,
    "targets": 1
  },
  "description": "piercing damage.",
  "name": "Javelin"
}
```

### Aarakocra action index 2: `"Summon Air Elemental"`

```json
{
  "attack": null,
  "description": "Five aarakocra within 30 feet of each other can magically summon an air elemental. Each of the five must use its action and movement on three consecutive turns to perform an aerial dance and must maintain concentration while doing so (as if concentrating on a spell). When all five have finished their third turn of the dance, the elemental appears in an unoccupied space within 60 feet of them. It is friendly toward them and obeys their spoken commands. It remains for 1 hour, until it or all its summoners die, or until any of its summoners dismisses it as a bonus action. A summoner can't perform the dance again until it finishes a short rest. When the elemental returns to the Elemental Plane of Air, any aarakocra within 5 feet of it can return with it.",
  "name": "Summon Air Elemental"
}
```

## Concrete same-name variation examples

For up to the first five review groups in first-appearance order, the
first two full-action variants are shown. The JSON inventory contains
every variant and every occurrence, including any additional variants.

### Action name `"Talon"`

Variant 1: **2** occurrence(s); first seen on Aarakocra (ID 1, action index 0).

```json
{
  "attack": {
    "attack_bonus": 4,
    "automatic_hit": false,
    "damage": [
      {
        "bonus": 2,
        "damage_types": [
          "slashing"
        ],
        "formula": "1d4"
      }
    ],
    "kind": "melee_weapon",
    "long_range_ft": null,
    "range_ft": 5,
    "targets": 1
  },
  "description": null,
  "name": "Talon"
}
```

Variant 2: **1** occurrence(s); first seen on Avoral Guardinal (ID 233, action index 1).

```json
{
  "attack": {
    "attack_bonus": 8,
    "automatic_hit": false,
    "damage": [
      {
        "bonus": 4,
        "damage_types": [
          "piercing"
        ],
        "formula": "2d6"
      },
      {
        "bonus": 0,
        "damage_types": [
          "radiant"
        ],
        "formula": "2d12"
      }
    ],
    "kind": "melee_weapon",
    "long_range_ft": null,
    "range_ft": 5,
    "targets": 1
  },
  "description": null,
  "name": "Talon"
}
```

### Action name `"Javelin"`

Variant 1: **6** occurrence(s); first seen on Aarakocra (ID 1, action index 1).

```json
{
  "attack": {
    "attack_bonus": 4,
    "automatic_hit": false,
    "damage": [
      {
        "bonus": 2,
        "damage_types": [
          "piercing"
        ],
        "formula": "1d6"
      }
    ],
    "kind": "ranged_weapon",
    "long_range_ft": 120,
    "range_ft": 30,
    "targets": 1
  },
  "description": "piercing damage.",
  "name": "Javelin"
}
```

Variant 2: **1** occurrence(s); first seen on Bugbear (ID 402, action index 1).

```json
{
  "attack": {
    "attack_bonus": 4,
    "automatic_hit": false,
    "damage": [
      {
        "bonus": 2,
        "damage_types": [
          "piercing"
        ],
        "formula": "2d6"
      }
    ],
    "kind": "ranged_weapon",
    "long_range_ft": 120,
    "range_ft": 30,
    "targets": 1
  },
  "description": "piercing damage in melee or 1d6 + 2 piercing damage at range.",
  "name": "Javelin"
}
```

### Action name `"Multiattack"`

Variant 1: **3** occurrence(s); first seen on Aartuk Elder (ID 4, action index 0).

```json
{
  "attack": null,
  "description": "The aartuk makes two Branch attacks, two Radiant Pellet attacks, or one of each.",
  "name": "Multiattack"
}
```

Variant 2: **1** occurrence(s); first seen on Aberrant Zealot (ID 8, action index 0).

```json
{
  "attack": null,
  "description": "The zealot makes one Psychic Rend attack and two Shortsword attacks.",
  "name": "Multiattack"
}
```

### Action name `"Branch"`

Variant 1: **1** occurrence(s); first seen on Aartuk Elder (ID 4, action index 1).

```json
{
  "attack": {
    "attack_bonus": 6,
    "automatic_hit": false,
    "damage": [
      {
        "bonus": 4,
        "damage_types": [
          "bludgeoning"
        ],
        "formula": "2d6"
      }
    ],
    "kind": "melee_weapon",
    "long_range_ft": null,
    "range_ft": 10,
    "targets": 1
  },
  "description": null,
  "name": "Branch"
}
```

Variant 2: **1** occurrence(s); first seen on Aartuk Starhorror (ID 5, action index 1).

```json
{
  "attack": {
    "attack_bonus": 3,
    "automatic_hit": false,
    "damage": [
      {
        "bonus": 1,
        "damage_types": [
          "bludgeoning"
        ],
        "formula": "2d6"
      }
    ],
    "kind": "melee_weapon",
    "long_range_ft": null,
    "range_ft": 10,
    "targets": 1
  },
  "description": null,
  "name": "Branch"
}
```

### Action name `"Radiant Pellet"`

Variant 1: **1** occurrence(s); first seen on Aartuk Elder (ID 4, action index 2).

```json
{
  "attack": {
    "attack_bonus": 4,
    "automatic_hit": false,
    "damage": [
      {
        "bonus": 0,
        "damage_types": [
          "radiant"
        ],
        "formula": "4d4"
      }
    ],
    "kind": "ranged_weapon",
    "long_range_ft": null,
    "range_ft": 60,
    "targets": 1
  },
  "description": "radiant damage.",
  "name": "Radiant Pellet"
}
```

Variant 2: **1** occurrence(s); first seen on Aartuk Starhorror (ID 5, action index 2).

```json
{
  "attack": {
    "attack_bonus": 2,
    "automatic_hit": false,
    "damage": [
      {
        "bonus": 0,
        "damage_types": [
          "radiant"
        ],
        "formula": "3d4"
      }
    ],
    "kind": "ranged_weapon",
    "long_range_ft": null,
    "range_ft": 60,
    "targets": 1
  },
  "description": "radiant damage.",
  "name": "Radiant Pellet"
}
```

## Limitations and non-goals

- This report describes only the local monster seed file. It does not inspect
  or claim to represent a live database.
- Exact JSON-value equality measures differences; it does not decide whether
  two actions are semantically equivalent or should be merged.
- This is not a weapon lookup, equipment-link decision, schema proposal,
  database migration, seed rewrite, or validation against external rules.
- Action-name groupings are for human review only. Names do not define variant
  identity, and no action category is excluded based on its attack fields.

## Next review questions

- Which observed differences matter for a future model, and which (if any) are
  safe to consolidate after human review?
- Should confirmed equipment-related actions eventually reference shared weapon
  records while retaining monster-specific use details?
- What separate boundaries should apply to traits, reactions, and other feature
  categories?
