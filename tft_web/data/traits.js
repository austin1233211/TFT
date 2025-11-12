export const TRAITS = {
    ASSASSIN: {
        id: 'ASSASSIN',
        name: 'Assassin',
        description: 'Increased critical strike damage',
        thresholds: {
            2: { critMult: 2.0, description: '2x crit damage' },
            4: { critMult: 3.0, description: '3x crit damage' }
        }
    },
    BRAWLER: {
        id: 'BRAWLER',
        name: 'Brawler',
        description: 'Bonus health',
        thresholds: {
            2: { hp: 300, description: '+300 HP' },
            4: { hp: 700, description: '+700 HP' }
        }
    },
    SORCERER: {
        id: 'SORCERER',
        name: 'Sorcerer',
        description: 'Bonus ability power',
        thresholds: {
            2: { ap: 20, description: '+20 AP' },
            4: { ap: 50, description: '+50 AP' }
        }
    },
    RANGER: {
        id: 'RANGER',
        name: 'Ranger',
        description: 'Bonus attack speed',
        thresholds: {
            2: { asBonus: 0.30, description: '30% AS every 3s' },
            4: { asBonus: 0.80, description: '80% AS every 3s' }
        }
    },
    TANK: {
        id: 'TANK',
        name: 'Tank',
        description: 'Bonus armor',
        thresholds: {
            2: { armor: 50, description: '50 Armor' },
            4: { armor: 100, description: '100 Armor' }
        }
    }
};
