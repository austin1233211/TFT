export const ITEMS = {
    BF_SWORD: {
        id: 'BF_SWORD',
        name: 'B.F. Sword',
        stats: { AD: 10 },
        description: '+10 Attack Damage'
    },
    NEEDLESSLY_LARGE_ROD: {
        id: 'NEEDLESSLY_LARGE_ROD',
        name: 'Needlessly Large Rod',
        stats: { AP: 10 },
        description: '+10 Ability Power'
    },
    CHAIN_VEST: {
        id: 'CHAIN_VEST',
        name: 'Chain Vest',
        stats: { Armor: 20 },
        description: '+20 Armor'
    },
    
    INFINITY_EDGE: {
        id: 'INFINITY_EDGE',
        name: 'Infinity Edge',
        recipe: ['BF_SWORD', 'BF_SWORD'],
        stats: { AD: 15, Crit: 25 },
        description: '+15 AD, +25% Crit Chance',
        effectKey: 'INFINITY_EDGE'
    },
    RABADONS_DEATHCAP: {
        id: 'RABADONS_DEATHCAP',
        name: "Rabadon's Deathcap",
        recipe: ['NEEDLESSLY_LARGE_ROD', 'NEEDLESSLY_LARGE_ROD'],
        stats: { AP: 20, SpellPower: 30 },
        description: '+20 AP, +30% Spell Power',
        effectKey: 'RABADONS_DEATHCAP'
    }
};
