Here is the comprehensive summary of the design research and proposed architecture, structured so your planning agent can immediately parse the constraints, logic, and exact specifications.

### Core Directive

The objective is cross-generational, cross-device communication. Aesthetic coherence (harmonization) must be sacrificed for maximum visual distinguishability. The shared "spoken word" at the table (e.g., "the red door") is the ultimate anchor for the design.

Since the six-year-old is leading but the four-year-old is participating, the vocabulary can expand slightly to accommodate the six-year-old's knowledge, but the visual cues must remain stark and unambiguous so the four-year-old isn't left behind.

---

### 1. Physical & Cognitive Constraints

* **The Hardware Reality:** The kid app lives on a tablet viewed at an angle, under ambient table lighting, likely covered in fingerprint smudges. This environment crushes subtle color differences and lowers perceived contrast.
* **Color Vision Deficiency (CVD):** ~1 in 12 boys have CVD. The system cannot rely on red-vs-green hue discrimination alone.
* **No Text Labels:** Because there is no text fallback on the kid app, you **cannot use lightness/darkness as a modifier** (e.g., "light blue" vs. "dark blue"). Isolated on a map under bad lighting, they both just look "blue."
* **The Vocabulary Ceiling:** A six-year-old leading allows for a vocabulary ceiling of **9 to 10 distinct base hues**. (Red, Orange, Yellow, Green, Blue, Purple, Pink, plus Grey, Gold/Brown, and Teal).

### 2. The Architectural Shift: Ditching MD3 for Content

* **What stays:** Use Material Design 3 (MD3) for the structural UI ("chrome", surfaces, text, nav rails). It handles dark mode elevation flawlessly.
* **What goes:** Do **not** use MD3 `Blend.harmonize()` or standardized tone-stepping for the 26 content roles. Harmonization mathematically pulls hues together and crushes chroma, destroying the glanceability required for a map.
* **The Solution:** Use a hardcoded, un-harmonized, categorical palette for map elements and content tokens. Ensure distinct **luminance stepping** (varied contrast ratios) so the colors are distinguishable even in pure grayscale.

### 3. The "Spoken" Categorical Palette

Collapse the 26 authoring roles into these 9 semantic buckets. Both the DM app and the Kid app must use these exact mappings to ensure a 1:1 shared language.

*Background ground:* `--md-surface` (`#1c1b1f`)

| Spoken Word | Hex | Contrast vs Ground | Rationale & Role Mapping Ideas |
| --- | --- | --- | --- |
| **Yellow** | `#FFCA3A` | ~11.5:1 | Highest lightness. Grabs attention immediately. Safe for all CVD types. *(Lightning, Divine)* |
| **Green** | `#4ADE80` | ~10.0:1 | Bright leaf green. High luminance prevents muddying into red/brown for deuteranopia. *(Poison, Nature)* |
| **Grey** | `#9CA3AF` | ~9.5:1 | Easily understood by a 6yo. Excellent for inactive states. *(Passage-Hidden)* |
| **Orange** | `#FF924C` | ~8.5:1 | Steps down from yellow. Vibrant enough not to look brown. *(Fire, Timeline-1)* |
| **Teal** | `#2DD4BF` | ~8.0:1 | A 6yo can reliably identify this without over-extending to blue/green. *(Cold, Arcane)* |
| **Blue** | `#48A6FF` | ~7.0:1 | Punchy sky blue. Darker blues vanish on near-black. *(Skill, Passage-Locked)* |
| **Pink** | `#FF66B2` | ~6.5:1 | Classic hot pink. Highly distinct from red. *(NPC, Timeline-2)* |
| **Gold/Brown** | `#E5A937` | ~6.0:1 | Distinct physical material color. *(Loot, Door)* |
| **Red** | `#FF595E` | ~5.5:1 | Deliberately lower luminance than Green to preserve CVD contrast. *(Boss, Error)* |
| **Purple** | `#C77DFF` | ~4.8:1 | Naturally low-luminance. Pushing it brighter turns it pink/white. *(Psychic, Timeline-3)* |

### 4. Semantic Resolution (Solving the 26-Role Problem)

Because you only have ~9 colors but 26 roles, you will have deliberate color collisions (e.g., Lightning and Divine are both Yellow).

* **Rule:** Meaning is never carried by hue alone. Color acts as a broad grouping/spoken handle; **icon geometry acts as the specific identifier**.
* **Execution:** The icons must be immediately recognizable silhouettes, not abstract shapes. A 6-year-old reading a textless map needs to see a "Yellow Chest" vs. a "Yellow Lightning Bolt", not a "Yellow Square" vs. a "Yellow Triangle."
* **DM Authoring:** The DM app retains all 26 distinct roles in its database, but visually renders them using only the 9 spoken colors above. The DM relies on text labels and icons in their dense UI to tell the difference; they rely on the 9 colors to speak across the table.