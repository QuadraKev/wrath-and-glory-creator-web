# Wrath & Glory Character Creator

Web-based character creation tool for the Wrath & Glory tabletop RPG.

## Architecture

Vanilla JavaScript with global object pattern (no modules/bundling). Each file defines a global `const` object (e.g., `const InjuriesTab = {...}`). No build step -- served directly as static files.

- `js/state.js` - Character state management, listener pattern, auto-save
- `js/data-loader.js` - Async JSON loading with caching
- `js/derived-stats.js` - Calculated stats (defence, resilience, wounds, etc.)
- `js/xp-calculator.js` - XP cost calculations
- `js/app.js` - Main controller, tab/section navigation
- `tabs/*.js` - UI modules following `init()` / `refresh()` / `render()` pattern
- `css/styles.css` - Unified dark theme with CSS variables
- `index.html` - Main HTML structure with sidebar + content layout

## Data Files

All game data lives in `data/` as JSON:

| File | Contents |
|------|----------|
| `archetypes.json` | Character archetypes with abilities, prerequisites |
| `armor.json` | Armor with AR, traits, keywords |
| `ascension-packages.json` | Ascension advancement packages |
| `backgrounds.json` | Origins, accomplishments, goals |
| `equipment.json` | Non-weapon, non-armor gear with effects |
| `glossary.json` | Game terms, traits, keywords for tooltip system |
| `injuries-corruption.json` | Memorable/traumatic injuries, corruption table, mutations |
| `psychic-powers.json` | Psychic powers, prayers, litanies |
| `species.json` | Species with abilities, sub-options |
| `talents.json` | Talents with prerequisites, effects |
| `weapon-upgrades.json` | Weapon modifications |
| `weapons.json` | Weapons with damage, range, traits |

### Source Values

Each data entry has a `source` field using these lowercase identifiers:
- `core` - Core Rulebook
- `fspg` - Forsaken System Player Guide
- `church` - Church of Steel
- `aeldari` - Aeldari: Inheritance of Embers
- `redacted1` / `redacted2` - Redacted Records I & II
- `voa` - Vow of Absolution
- `shotguns` - Departmento Munitorum Shotguns
- `dh` - Threat Assessment: Daemons & Heretics
- `apocrypha` - An Abundance of Apocrypha (homebrew)

### Key Data Format Patterns

- **Weapons**: `damage: { base, attribute, bonus }`, `range: { short, medium, long }`
- **IDs**: snake_case (e.g., `angel_of_death`). Apocrypha IDs use `_aaa` suffix to avoid conflicts.
- **Traits/keywords**: Arrays of strings

## Workflow Rules

- **Cache busting**: When modifying CSS or JS files, bump the `?v=N` query string on ALL affected `<script>` and `<link>` tags in `index.html`. Always bump all version numbers together.
- **GitHub Issues**: Do NOT resolve/close issues until the user confirms they are resolved.
- **Commits**: Push using the QuadraKev-bot PAT (stored in Claude Code auto-memory, not in this file).

## Books Available (PDF)

Source material PDFs are available locally for reference:
- Official sourcebooks: Core Rulebook, Forsaken System, Church of Steel, Aeldari Inheritance of Embers, Redacted Records I & II, Vow of Absolution, Departmento Munitorum Shotguns
- Official bestiary: Threat Assessment Daemons & Heretics, Threat Assessment Xenos
- Homebrew: An Abundance of Apocrypha v9

Note: `pdftotext` is installed for text extraction. 2-column PDFs may produce garbled text.

## Work Completed

1. **Core Rulebook**: All weapons (46), equipment (30), armor (1), injuries & corruption system
2. **Forsaken System**: 16 weapons, 3 armor, 7 equipment, 6 Librarius psychic powers
3. **Church of Steel**: Content integrated
4. **Aeldari Inheritance of Embers**: 61 weapons, 3 armor
5. **Redacted Records I & II**: Content integrated
6. **Vow of Absolution**: Content integrated
7. **Departmento Munitorum Shotguns**: 10 weapons, 11 ammo types, "Blessed" trait
8. **Threat Assessment D&H**: 24 psychic powers, 6 prayers, 6 litanies
9. **An Abundance of Apocrypha**: Content integrated
10. **Injuries & Corruption** (Section 9): Memorable/traumatic injuries, corruption tracking, mutations with mechanical bonuses integrated into derived stats
11. **Non-Core sourcebook review for injuries/corruption**: Checked all books -- no expanded tables or rules beyond Core Rulebook. Only individual talents/abilities that interact with existing systems.
