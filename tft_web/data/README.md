# TFT Game Data

This folder contains all the game data that can be easily modified to add new champions, traits, items, and abilities.

## File Structure

- **constants.js** - Game constants (grid size, mana values, XP thresholds)
- **shopOdds.js** - Shop odds by level (what % chance for each cost tier)
- **champions.js** - All champion definitions
- **abilities.js** - Champion ability definitions
- **traits.js** - Trait definitions with synergy bonuses (not yet implemented in engine)
- **items.js** - Item definitions (not yet implemented in engine)

## How to Add a New Champion

1. Open `data/champions.js`
2. Add a new entry to the `CHAMPION_DATA` object:

```javascript
"YourChampion": {
    cost: 2,                    // Cost tier (1-5)
    trait: "Assassin",          // Must match a trait name (Assassin, Brawler, Sorcerer, Ranger, Tank)
    stats: {                    // Base stats
        HP: 500,                // Health points
        AD: 55,                 // Attack damage
        AS: 0.75,               // Attack speed (attacks per second)
        Armor: 20               // Optional: Armor (reduces physical damage)
        AP: 15                  // Optional: Ability power (for magic damage)
    },
    range: 1,                   // Attack range (1 = melee, 3-4 = ranged)
    moveSpeed: 240,             // Movement speed in pixels/second
    color: "#b414b4"            // Hex color for the champion sprite
}
```

3. Open `data/abilities.js` and add the champion's ability:

```javascript
"YourChampion": {
    name: "Ability Name",
    damage: (unit) => unit.stats.AD * 2.0  // Damage calculation function
}
```

**Important:** The champion name must match exactly between `champions.js` and `abilities.js`!

## How to Add a New Trait

1. Open `data/traits.js`
2. Add a new entry to the `TRAITS` object:

```javascript
YOUR_TRAIT: {
    id: 'YOUR_TRAIT',
    name: 'Your Trait',
    description: 'What this trait does',
    thresholds: {
        2: { bonusStat: 100, description: 'Bonus at 2 units' },
        4: { bonusStat: 250, description: 'Bonus at 4 units' }
    }
}
```

**Note:** Trait synergies are not yet implemented in the game engine, but this structure is ready for future implementation.

## How to Add a New Item

1. Open `data/items.js`
2. Add a new entry to the `ITEMS` object:

```javascript
YOUR_ITEM: {
    id: 'YOUR_ITEM',
    name: 'Your Item',
    stats: { AD: 10, HP: 100 },           // Stats the item provides
    description: 'What this item does',
    recipe: ['BF_SWORD', 'CHAIN_VEST'],   // Optional: component items
    effectKey: 'YOUR_ITEM'                // Optional: for special effects
}
```

**Note:** Items are not yet implemented in the game engine, but this structure is ready for future implementation.

## Champion Stat Guidelines

### Health (HP)
- Tanks: 650-850
- Brawlers: 550-700
- Assassins: 500-550
- Rangers: 450-550
- Sorcerers: 450-650

### Attack Damage (AD)
- Tanks: 40-50
- Brawlers: 50-60
- Assassins: 55-70
- Rangers: 50-60
- Sorcerers: 40-45

### Attack Speed (AS)
- Tanks: 0.5-0.6
- Brawlers: 0.6-0.7
- Assassins: 0.75-0.9
- Rangers: 0.7-0.8
- Sorcerers: 0.65-0.7

### Range
- Melee (Tank, Brawler, Assassin): 1
- Ranged (Ranger, Sorcerer): 3-4

### Move Speed
- Tanks: 180-200 px/s
- Brawlers: 200-220 px/s
- Assassins: 240-250 px/s
- Rangers: 180-200 px/s
- Sorcerers: 180-200 px/s

## Ability Damage Guidelines

Abilities should deal 1.2x to 2.5x the champion's AD, or scale with AP for magic damage:

```javascript
// Physical ability (scales with AD)
damage: (unit) => unit.stats.AD * 2.0

// Magic ability (scales with AP)
damage: (unit) => 150 + (unit.stats.AP || 0) * 0.8

// Tank ability (scales with Armor)
damage: (unit) => 120 + (unit.stats.Armor || 0) * 0.3
```

## Testing Your Changes

After modifying any data files:

1. Save the file
2. Reload the game in your browser (Ctrl+R or Cmd+R)
3. Check the browser console (F12) for any errors
4. Test buying and placing the new champion
5. Test combat to ensure abilities work correctly

## Common Issues

**Champion not appearing in shop:**
- Check that the `cost` field is set correctly (1-5)
- Verify the champion name matches exactly in both `champions.js` and `abilities.js`

**Ability not working:**
- Ensure the champion name in `abilities.js` matches exactly (case-sensitive)
- Check that the damage function doesn't reference undefined stats

**Visual issues:**
- Verify the `color` field is a valid hex color (e.g., "#ff0000")
- Check that `trait` matches one of: "Assassin", "Brawler", "Sorcerer", "Ranger", "Tank"
