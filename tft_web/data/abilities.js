export const ABILITIES = {
    "Malphite": { 
        name: "Unstoppable Force", 
        damage: (unit) => 120 + (unit.stats.Armor || 0) * 0.3 
    },
    "Garen": { 
        name: "Decisive Strike", 
        damage: (unit) => unit.stats.AD * 1.5 
    },
    "Graves": { 
        name: "Buckshot", 
        damage: (unit) => unit.stats.AD * 1.8 
    },
    "Twisted Fate": { 
        name: "Pick a Card", 
        damage: (unit) => 100 + (unit.stats.AP || 0) * 0.6 
    },
    "Warwick": { 
        name: "Infinite Duress", 
        damage: (unit) => unit.stats.AD * 2.0 
    },
    
    "Zed": { 
        name: "Shadow Strike", 
        damage: (unit) => unit.stats.AD * 2.0 
    },
    "Ashe": { 
        name: "Crystal Arrow", 
        damage: (unit) => unit.stats.AD * 1.2 
    },
    "Ahri": { 
        name: "Orb of Deception", 
        damage: (unit) => 150 + (unit.stats.AP || 0) * 0.7 
    },
    "Braum": { 
        name: "Unbreakable", 
        damage: (unit) => 100 + (unit.stats.Armor || 0) * 0.4 
    },
    
    "Vi": { 
        name: "Vault Breaker", 
        damage: (unit) => unit.stats.AD * 1.5 
    },
    "Katarina": { 
        name: "Death Lotus", 
        damage: (unit) => unit.stats.AD * 2.5 
    },
    "Varus": { 
        name: "Piercing Arrow", 
        damage: (unit) => unit.stats.AD * 1.6 
    },
    
    "Lux": { 
        name: "Final Spark", 
        damage: (unit) => 180 + (unit.stats.AP || 0) * 0.8 
    },
    "Sejuani": { 
        name: "Glacial Prison", 
        damage: (unit) => 150 + (unit.stats.Armor || 0) * 0.5 
    },
    
    "Kayle": { 
        name: "Divine Judgment", 
        damage: (unit) => 250 + (unit.stats.AP || 0) * 1.0 
    }
};
