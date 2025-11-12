# TFT Auto-Battler Game

A web-based Team Fight Tactics (TFT) style auto-battler game with authentic TFT mechanics including XP system, level-based shop odds, star-up system, and real-time combat with separate boards for each team.

**Live Demo:** https://tft-auto-battler-app-mved7a3j.devinapps.com

## Features

✅ **Authentic TFT Mechanics**
- XP system with proper thresholds per level (2, 2, 6, 10, 20, 36, 56, 80, 100)
- Level-based team size limits (your level = max units on board)
- Level-based shop odds matching real TFT percentages
- Star-up system: collect 3 copies to auto-combine into 2-star (1.8x stats) or 3-star (2.7x stats)

✅ **Combat System**
- Separate 8x7 combat grid with opponent on top (rows 0-3) and player on bottom (rows 4-7)
- Melee champions (range 1) move forward to engage enemies
- Ranged champions (range 3-4) attack from distance
- BFS pathfinding allows units to navigate around friendly units
- Dead units are immediately cleared from the field (no blocking)
- Mana system: 0-100, gains 25 per attack, auto-casts abilities at 100%
- Health and mana bars displayed under each unit
- Floating damage numbers and visual effects

✅ **16 Champions Across All Cost Tiers**
- Cost 1: Malphite, Garen, Graves, Twisted Fate, Warwick
- Cost 2: Zed, Ashe, Ahri, Braum
- Cost 3: Vi, Katarina, Varus
- Cost 4: Lux, Sejuani
- Cost 5: Kayle

✅ **5 Traits**
- Assassin (melee, high damage)
- Brawler (melee, high HP)
- Tank (melee, high armor)
- Ranger (ranged, high attack speed)
- Sorcerer (ranged, magic damage)

## Project Structure

```
tft_web/
├── index.html              # Main HTML file
├── game.js                 # Core game engine (imports from data/)
├── data/                   # All game data (easily modifiable!)
│   ├── README.md          # Detailed guide for adding content
│   ├── constants.js       # Game constants (grid size, mana, XP thresholds)
│   ├── shopOdds.js        # Shop odds by level
│   ├── champions.js       # All 16 champion definitions
│   ├── abilities.js       # Champion ability definitions
│   ├── traits.js          # Trait definitions with synergy bonuses
│   └── items.js           # Item definitions (placeholder for future)
└── README.md              # This file
```

## How to Run Locally

1. **Start a local web server:**
   ```bash
   cd tft_web
   python3 -m http.server 8080
   ```

2. **Open in browser:**
   ```
   http://localhost:8080
   ```

## How to Play

1. **Buy Champions:** Click champions in the shop to buy them (costs gold)
2. **Position Units:** Drag champions from the bench (bottom) to the board
3. **Level Up:** Click "Buy XP (4g)" to level up - your level determines max team size
4. **Reroll Shop:** Click "Reroll Shop (2g)" to get new champion options
5. **Start Combat:** Click "START COMBAT" to fight the AI opponent
6. **Star-Up:** Collect 3 copies of the same champion to auto-combine into a stronger 2-star unit!

## Adding New Content

All game data is stored in the `data/` folder for easy modification. See `data/README.md` for detailed instructions.

### Quick Start: Adding a New Champion

1. Open `data/champions.js` and add:
```javascript
"YourChampion": {
    cost: 2,                    // Cost tier (1-5)
    trait: "Assassin",          // Trait name
    stats: {
        HP: 500,                // Health points
        AD: 55,                 // Attack damage
        AS: 0.75,               // Attack speed
        Armor: 20               // Optional: Armor
    },
    range: 1,                   // 1 = melee, 3-4 = ranged
    moveSpeed: 240,             // Movement speed (px/s)
    color: "#b414b4"            // Hex color for sprite
}
```

2. Open `data/abilities.js` and add:
```javascript
"YourChampion": {
    name: "Ability Name",
    damage: (unit) => unit.stats.AD * 2.0
}
```

3. Save and reload the game!

## Technical Details

### ES Modules
The game uses native ES modules (no build step required) for clean separation of data and logic:
- `index.html` loads `game.js` with `type="module"`
- `game.js` imports from `data/*.js` files
- All data files export named constants

### Combat Mechanics
- **Occupancy Grid:** 8x7 grid tracks which tiles are occupied
- **BFS Pathfinding:** Units use breadth-first search to find paths around obstacles
- **Manhattan Distance:** Used for range checks and pathfinding
- **Death Cleanup:** Dead units are immediately removed from occupancy grid
- **Simultaneous Combat:** Both teams attack independently based on attack speed

### Champion Stats
- **HP:** Health points (450-850 depending on role)
- **AD:** Attack damage (40-70)
- **AS:** Attack speed in attacks per second (0.5-0.9)
- **Armor:** Optional, reduces physical damage
- **AP:** Optional, scales magic damage abilities
- **Range:** 1 for melee, 3-4 for ranged
- **Move Speed:** Movement speed in pixels/second (180-250)

## Game Balance

### Shop Odds by Level
```
Level 1-2: 100% cost-1 champions
Level 3:   75% cost-1, 25% cost-2
Level 4:   55% cost-1, 30% cost-2, 15% cost-3
Level 5:   45% cost-1, 33% cost-2, 20% cost-3, 2% cost-4
Level 6:   30% cost-1, 40% cost-2, 25% cost-3, 5% cost-4
Level 7:   19% cost-1, 30% cost-2, 35% cost-3, 15% cost-4, 1% cost-5
Level 8:   16% cost-1, 20% cost-2, 35% cost-3, 25% cost-4, 4% cost-5
Level 9:   9% cost-1, 15% cost-2, 30% cost-3, 30% cost-4, 16% cost-5
```

### XP Thresholds
```
Level 1→2: 2 XP
Level 2→3: 2 XP
Level 3→4: 6 XP
Level 4→5: 10 XP
Level 5→6: 20 XP
Level 6→7: 36 XP
Level 7→8: 56 XP
Level 8→9: 80 XP
```

## Future Enhancements

- [ ] Implement trait synergies (data structure already in place)
- [ ] Add item system (data structure already in place)
- [ ] Add more champions (easy to add via data files!)
- [ ] Implement PvP multiplayer
- [ ] Add sound effects and music
- [ ] Implement carousel rounds
- [ ] Add champion portraits/sprites

## Bug Fixes

### Recent Fixes
- ✅ Fixed dead units blocking the field (immediate occupancy grid cleanup)
- ✅ Fixed melee units getting stuck behind friendly units (BFS pathfinding)
- ✅ Fixed drag-and-drop not working (pointer event handling)
- ✅ Fixed buttons not showing (sticky controls at bottom)
- ✅ Fixed only Malphite appearing in shop (added 16 champions)
- ✅ Fixed combat overlapping (separate 8x7 grid with team halves)

## Development

### File Organization
- **game.js:** Core game engine with classes for GameState, Champion, CombatUnit, CombatInstance, GameRenderer
- **data/*.js:** All game data exported as ES modules
- **index.html:** HTML structure and CSS styling

### Key Classes
- `GameState`: Manages gold, HP, level, XP, board, bench, shop
- `Champion`: Wrapper for champion data
- `CombatUnit`: Combat instance of a champion with position, animation, pathfinding
- `CombatInstance`: Manages combat between two teams with occupancy grid
- `GameRenderer`: Handles canvas rendering, input, and game loop

## Credits

Created by austin .singh (austin.singh13@gmail.com)
GitHub: @austin1233211

## License

This is a personal project. Feel free to use and modify as needed.

## Verification

This PR verifies the workflow for creating pull requests in the TFT repository.
