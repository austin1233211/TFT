
class SeededRandom {
    constructor(seed = Date.now()) {
        this.seed = seed;
    }
    
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
}

class GameEngine {
    constructor(constants, shopOdds, championData, abilities) {
        this.CONSTANTS = constants;
        this.SHOP_ODDS = shopOdds;
        this.CHAMPION_DATA = championData;
        this.ABILITIES = abilities;
        this.rng = new SeededRandom();
    }
    
    setSeed(seed) {
        this.rng = new SeededRandom(seed);
    }
    
    generateShop(level) {
        const shop = [];
        const odds = this.SHOP_ODDS[level] || this.SHOP_ODDS[9];
        
        for (let i = 0; i < 5; i++) {
            const roll = this.rng.next();
            let costTier = 1;
            let cumulative = 0;
            
            for (let tier = 0; tier < odds.length; tier++) {
                cumulative += odds[tier];
                if (roll < cumulative) {
                    costTier = tier + 1;
                    break;
                }
            }
            
            const championsOfCost = Object.entries(this.CHAMPION_DATA)
                .filter(([name, data]) => data.cost === costTier)
                .map(([name, data]) => name);
            
            if (championsOfCost.length > 0) {
                const name = championsOfCost[Math.floor(this.rng.next() * championsOfCost.length)];
                shop.push(this.createChampion(name));
            }
        }
        
        return shop;
    }
    
    createChampion(name) {
        const data = this.CHAMPION_DATA[name];
        return {
            name: name,
            cost: data.cost,
            trait: data.trait,
            stats: { ...data.stats },
            color: data.color,
            range: data.range || 1,
            moveSpeed: data.moveSpeed || 200,
            stars: 1
        };
    }
    
    checkStarUp(bench, board) {
        const championCounts = {};
        
        [...bench, ...board].forEach(champ => {
            if (champ) {
                const key = `${champ.name}_${champ.stars || 1}`;
                championCounts[key] = (championCounts[key] || 0) + 1;
            }
        });
        
        for (const [key, count] of Object.entries(championCounts)) {
            if (count >= 3) {
                const [name, starsStr] = key.split('_');
                const stars = parseInt(starsStr);
                
                if (stars < 3) {
                    return { name, stars };
                }
            }
        }
        
        return null;
    }
    
    combineChampions(bench, board, name, stars) {
        const toRemove = [];
        let removed = 0;
        
        for (let i = 0; i < bench.length && removed < 3; i++) {
            const champ = bench[i];
            if (champ && champ.name === name && (champ.stars || 1) === stars) {
                toRemove.push({ type: 'bench', index: i });
                removed++;
            }
        }
        
        for (let i = 0; i < board.length && removed < 3; i++) {
            const champ = board[i];
            if (champ && champ.name === name && (champ.stars || 1) === stars) {
                toRemove.push({ type: 'board', index: i });
                removed++;
            }
        }
        
        if (removed === 3) {
            toRemove.sort((a, b) => b.index - a.index);
            
            toRemove.forEach(item => {
                if (item.type === 'bench') {
                    bench[item.index] = null;
                } else {
                    board.splice(item.index, 1);
                }
            });
            
            const newChamp = this.createChampion(name);
            newChamp.stars = stars + 1;
            const multiplier = stars === 1 ? 1.8 : 2.7;
            newChamp.stats.HP = Math.floor(newChamp.stats.HP * multiplier);
            newChamp.stats.AD = Math.floor(newChamp.stats.AD * multiplier);
            if (newChamp.stats.AP) newChamp.stats.AP = Math.floor(newChamp.stats.AP * multiplier);
            
            const emptySlot = bench.findIndex(slot => slot === null);
            if (emptySlot !== -1) {
                bench[emptySlot] = newChamp;
            }
            
            return true;
        }
        
        return false;
    }
    
    simulateCombat(playerBoard, opponentBoard, seed) {
        this.setSeed(seed);
        
        const playerUnits = this.createCombatUnits(playerBoard, 0);
        const opponentUnits = this.createCombatUnits(opponentBoard, 1);
        
        const occupancy = Array(8).fill(null).map(() => Array(7).fill(false));
        
        playerUnits.forEach(unit => {
            occupancy[unit.gridR][unit.gridC] = true;
        });
        opponentUnits.forEach(unit => {
            occupancy[unit.gridR][unit.gridC] = true;
        });
        
        const maxTicks = 3000; // 30 seconds at 100 ticks/sec
        let tick = 0;
        const events = [];
        
        while (tick < maxTicks) {
            const dt = 0.01; // 10ms per tick
            
            const allUnits = [...playerUnits, ...opponentUnits];
            for (const unit of allUnits) {
                if (!unit.alive) continue;
                
                this.updateCombatUnit(unit, playerUnits, opponentUnits, occupancy, dt, events);
            }
            
            const playerAlive = playerUnits.some(u => u.alive);
            const opponentAlive = opponentUnits.some(u => u.alive);
            
            if (!playerAlive || !opponentAlive) {
                const winner = playerAlive ? 0 : 1;
                const survivingUnits = winner === 0 ? 
                    playerUnits.filter(u => u.alive).length : 
                    opponentUnits.filter(u => u.alive).length;
                
                return {
                    winner,
                    survivingUnits,
                    ticks: tick,
                    events
                };
            }
            
            tick++;
        }
        
        const playerAlive = playerUnits.filter(u => u.alive).length;
        const opponentAlive = opponentUnits.filter(u => u.alive).length;
        
        return {
            winner: playerAlive > opponentAlive ? 0 : 1,
            survivingUnits: Math.max(playerAlive, opponentAlive),
            ticks: tick,
            events
        };
    }
    
    createCombatUnits(board, team) {
        const units = [];
        
        board.forEach(champ => {
            if (champ && champ.pos) {
                const [r, c] = champ.pos;
                const combatR = team === 0 ? 4 + r : 3 - r;
                const combatC = c;
                
                units.push({
                    name: champ.name,
                    trait: champ.trait,
                    stats: { ...champ.stats },
                    maxHp: champ.stats.HP,
                    hp: champ.stats.HP,
                    mana: 0,
                    attackTimer: 0,
                    castTimer: 0,
                    alive: true,
                    team: team,
                    gridR: combatR,
                    gridC: combatC,
                    range: champ.range || 1,
                    moveSpeed: champ.moveSpeed || 200,
                    stars: champ.stars || 1
                });
            }
        });
        
        return units;
    }
    
    updateCombatUnit(unit, playerUnits, opponentUnits, occupancy, dt, events) {
        unit.attackTimer += dt;
        if (unit.castTimer > 0) {
            unit.castTimer -= dt;
            return; // Can't act while casting
        }
        
        const enemies = unit.team === 0 ? opponentUnits : playerUnits;
        const target = this.getNearestEnemy(unit, enemies);
        
        if (!target) return;
        
        const distance = this.getManhattanDistance(unit, target);
        
        if (unit.mana >= this.CONSTANTS.MAX_MANA && distance <= unit.range) {
            unit.mana = 0;
            unit.castTimer = 0.3;
            
            const ability = this.ABILITIES[unit.name];
            const damage = ability.damage(unit);
            this.dealDamage(unit, target, damage, occupancy, true, events);
            
            events.push({
                type: 'ability',
                tick: events.length,
                attacker: unit.name,
                target: target.name,
                damage: damage
            });
            
            return;
        }
        
        if (distance <= unit.range) {
            const attackPeriod = 1 / unit.stats.AS;
            if (unit.attackTimer >= attackPeriod) {
                unit.attackTimer = 0;
                
                const damage = unit.stats.AD;
                this.dealDamage(unit, target, damage, occupancy, false, events);
                
                unit.mana = Math.min(unit.mana + this.CONSTANTS.MANA_PER_ATTACK, this.CONSTANTS.MAX_MANA);
                
                events.push({
                    type: 'attack',
                    tick: events.length,
                    attacker: unit.name,
                    target: target.name,
                    damage: damage
                });
            }
        } else {
            const path = this.findPathBFS(unit, target.gridR, target.gridC, occupancy, unit.range);
            if (path && path.length > 0) {
                const [newR, newC] = path[0];
                occupancy[unit.gridR][unit.gridC] = false;
                unit.gridR = newR;
                unit.gridC = newC;
                occupancy[newR][newC] = true;
            }
        }
    }
    
    getNearestEnemy(unit, enemies) {
        const livingEnemies = enemies.filter(e => e.alive);
        if (livingEnemies.length === 0) return null;
        
        let nearest = null;
        let minDist = Infinity;
        
        for (const enemy of livingEnemies) {
            const dist = this.getManhattanDistance(unit, enemy);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }
        
        return nearest;
    }
    
    getManhattanDistance(unit1, unit2) {
        return Math.abs(unit1.gridR - unit2.gridR) + Math.abs(unit1.gridC - unit2.gridC);
    }
    
    dealDamage(attacker, target, damage, occupancy, isAbility, events) {
        const armor = target.stats.Armor || 0;
        const actualDamage = Math.floor(damage * 100 / (100 + armor));
        
        target.hp -= actualDamage;
        
        if (target.hp <= 0) {
            target.hp = 0;
            target.alive = false;
            occupancy[target.gridR][target.gridC] = false;
            
            events.push({
                type: 'death',
                tick: events.length,
                unit: target.name
            });
        }
        
        return actualDamage;
    }
    
    findPathBFS(unit, targetGridR, targetGridC, occupancy, maxRange) {
        const queue = [[unit.gridR, unit.gridC, []]];
        const visited = Array(8).fill(null).map(() => Array(7).fill(false));
        visited[unit.gridR][unit.gridC] = true;
        
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        while (queue.length > 0) {
            const [r, c, path] = queue.shift();
            
            const dist = Math.abs(r - targetGridR) + Math.abs(c - targetGridC);
            if (dist <= maxRange) {
                return path;
            }
            
            if (path.length >= 10) continue;
            
            for (const [dr, dc] of directions) {
                const newR = r + dr;
                const newC = c + dc;
                
                if (newR >= 0 && newR < 8 && newC >= 0 && newC < 7 && !visited[newR][newC]) {
                    if (!occupancy[newR][newC] || (newR === unit.gridR && newC === unit.gridC)) {
                        visited[newR][newC] = true;
                        const newPath = [...path, [newR, newC]];
                        queue.push([newR, newC, newPath]);
                    }
                }
            }
        }
        
        return null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameEngine, SeededRandom };
}

if (typeof window !== 'undefined') {
    window.GameEngine = GameEngine;
    window.SeededRandom = SeededRandom;
}
