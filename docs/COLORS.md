# Color Reference - D&D Kids Resources

**Complete, authoritative color palette for all card types.**

> **Note:** Colors and emojis for **abilities** (STR, DEX, WIS, SAD, SAM, etc.) and **damage types** (fire, cold, slashing, etc.) are now stored in the SQLite database tables:
> - `abilities` table: Contains code, name, emoji, and color for each ability
> - `damage_types` table: Contains code, name, emoji, and color for each damage type
> 
> See [ARCHITECTURE.md](ARCHITECTURE.md) for database schema details.

---

Used to identify custom and blank printable cards that DMs can fill in:

| Type | Color | Hex Code | Usage |
|------|-------|----------|-------|
| Custom/Blank | Silver | #c0c0c0 | Blank cards for custom content |

---

## Universal Base Colors

Used across all card types for consistency:

| Purpose | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| Parchment Background | Cream | #fdf3e3 | Main page background |
| Card Background | Off-white | #fffef7 | Card body background |
| Page Background | Tan | #c9a97a | Creates parchment aesthetic |
| Text | Dark Brown | #2c1810 | Primary text color |
| Borders | Brown | #8b5e3c | Card borders and accents |
| Labels | Tan | #b0865a | Detail labels and text |

---

## Spell Level Colors

Applied via CSS classes: `.cantrip`, `.level1` through `.level9`

| Level | Name | Color | Hex Code | Meaning |
|-------|------|-------|----------|---------|
| 0 | Cantrip | Gold | #f39c12 | Basic magical ability |
| 1 | Level 1 | Red | #e74c3c | Entry-level magic |
| 2 | Level 2 | Purple | #9b59b6 | Intermediate magic |
| 3 | Level 3 | Blue | #3498db | Mid-level magic |
| 4 | Level 4 | Teal | #1abc9c | Advanced magic |
| 5 | Level 5 | Green | #2ecc71 | Powerful magic |
| 6 | Level 6 | Yellow | #f1c40f | Very powerful |
| 7 | Level 7 | Orange | #e67e22 | Extraordinary magic |
| 8 | Level 8 | Grey | #95a5a6 | Legendary magic |
| 9 | Level 9 | Dark Blue-Grey | #34495e | Ultimate magic |

---

## NPC Profession Colors

Applied via CSS classes: `.wizard`, `.fighter`, `.rogue`, etc.

| Class/Profession | Color | Hex Code | Theme |
|---|---|---|---|
| Wizard | Purple | #6a4fa3 | Magical prowess |
| Rogue | Dark Grey | #2c3e50 | Shadows and stealth |
| Fighter | Dark Red | #8b3a1a | Strength and combat |
| Cleric | Orange | #e67e22 | Divine protection |
| Barbarian | Red | #c0392b | Primal rage |
| Ranger | Green | #27ae60 | Nature and hunting |
| Druid | Teal | #16a085 | Natural balance |
| Paladin | Gold | #f39c12 | Holy light |
| Bard | Purple | #9b59b6 | Charisma and artistry |

---

## Condition Colors

Applied via CSS classes: `.blinded`, `.charmed`, `.deafened`, etc.

| Condition | Color | Hex Code | Theme |
|-----------|-------|----------|-------|
| Blinded | Dark Blue | #4a4a6a | Darkness |
| Charmed | Purple | #9b59b6 | Magical enchantment |
| Deafened | Grey | #7f8c8d | Muted hearing |
| Frightened | Red | #c0392b | Fear and danger |
| Grappled | Orange | #d35400 | Physical restraint |
| Incapacitated | Dark Grey | #2c3e50 | Complete helplessness |
| Invisible | Teal | #1a6b8a | Hidden from sight |
| Paralyzed | Teal-Green | #16a085 | Frozen in place |
| Poisoned | Green | #27ae60 | Toxic damage |
| Prone | Brown | #8b5e3c | Grounded down |
| Stunned | Gold | #f39c12 | Dazed state |
| Unconscious | Black | #2c2c2c | Out of action |
| Inspiration | Gold | #c9a90a | Bonus advantage |
| Advantage | Green | #1e8449 | Positive bonus |
| Disadvantage | Red | #c0392b | Negative penalty |
| Concentration | Purple | #7d3c98 | Focused magic |
| Restrained | Orange-Brown | #ca6f1e | Physically bound |
| Hidden | Dark Grey | #34495e | Concealed position |
| Turn | Blue | #2471a3 | Current turn marker |

---

## Weapon Type Colors

Applied via CSS classes: `.simple-melee`, `.martial-ranged`, etc.

| Type | Color | Hex Code | Meaning |
|------|-------|----------|---------|
| Simple Melee | Brown-Grey | #7e5e4f | Basic close-range weapons |
| Simple Ranged | Teal | #5a7a7a | Basic distance weapons |
| Martial Melee | Dark Red | #8b3a1a | Advanced close-range |
| Martial Ranged | Dark Blue | #3a5a8b | Advanced distance weapons |

---

## Magic Item Colors

Applied via CSS classes: `.magic-utility`, `.magic-combat`

| Category | Color | Hex Code | Usage |
|----------|-------|----------|-------|
| Utility Items | Purple | #6a5a9a | Non-combat items |
| Combat Items | Red | #b53a2a | Combat-focused items |

---

## Location Card Colors

Applied via CSS classes: `.location-building`, `.location-city`, `.location-region`, `.location-world`, `.location-npc`

| Type | Color | Hex Code | Theme |
|------|-------|----------|-------|
| Building | Warm Brown | #8b6f47 | Structures and establishments |
| City/Town/Village | Bronze-Gold | #d4a574 | Bustling settlements |
| Region | Forest Green | #2d8659 | Natural landscapes |
| World | Deep Blue | #2c5aa0 | Cosmic scope and significance |
| NPC Owner | Mystical Purple | #6a4fa3 | Important figures |

---


## Friend/Enemy Indicator

The Friend/Enemy checkbox uses a neutral styling to allow kids to color it themselves:

- **Border Color**: Brown | #b0865a
- **Background Color**: Cream | #f5e6d3
- **Width**: 35px
- **Height**: 18px
- **Font Size**: 6.5pt

---

## CSS Implementation Notes

### Layout
All colors are applied as CSS classes on the `.card` element:
- The class name is stored in `data.level` field
- CSS styling automatically applies the correct header color
- Same color is used for both header band and footer

### Color Application
1. **Header band** — Large colored area with card title
2. **Footer** — Small colored bar with type/category info
3. **Text** — White on colored background

### Print Colors
All colors are optimized for screen display and print output. When printing:
- Enable "Background graphics" in print dialog
- Colors are preserved accurately on standard paper
- Recommended printer: Color or Inkjet

---

## Creating Custom Colors

To add new card types or colors:

1. **Choose a color** using [Color Picker](https://htmlcolorcodes.com/)
2. **Create CSS class** in `styles.css`:
   ```css
   .new-class {
     --cc: #hexcode;
   }
   ```
3. **Add card data** with matching `level` field:
   ```json
   { "title": "Card", "level": "new-class", ... }
   ```

---

## Color Testing

### Verify Colors Locally
1. Open any card page in browser
2. Right-click → Inspect Element
3. Check `.card` element has correct class
4. Verify `--cc` CSS variable matches expected hex code

### Print Testing
1. Open card page
2. Press `Ctrl+P` for print preview
3. Enable "Background graphics"
4. Check colors match screen display

### Accessibility
All color combinations meet WCAG AA contrast standards for readability. Colors are also combined with text labels for colorblind-friendly reference.

---

## History

- **NPCs Added**: 9 profession colors added for character reference cards
- **Cards Per Type**: Spell (10 levels), Conditions (19), Weapons (4), Magic Items (2), NPCs (9)
- **Total Unique Colors**: 45+ distinct CSS classes
