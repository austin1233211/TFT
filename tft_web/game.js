import { GRID_SIZE, BOARD_ROWS, BOARD_COLS, BENCH_SIZE, MANA_PER_ATTACK, MAX_MANA, XP_THRESHOLDS } from './data/constants.js';
import { SHOP_ODDS } from './data/shopOdds.js';
import { CHAMPION_DATA } from './data/champions.js';
import { ABILITIES } from './data/abilities.js';
import { TRAITS } from './data/traits.js';
import { ITEMS } from './data/items.js';

class GameState {
    constructor() {
        this.gold = 50;
        this.hp = 100;
        this.level = 1;
        this.xp = 0;
        this.board = [];
        this.bench = Array(BENCH_SIZE).fill(null);
        this.shop = [];
        this.combat = null;
        this.selectedChampion = null;
        this.dragOffset = { x: 0, y: 0 };
        
        this.boardStartX = 200;
        this.boardStartY = 100;
        this.benchStartX = 200;
        this.benchStartY = 500;
        this.shopStartX = 10;
        this.shopStartY = 600;
        
        this.rollShop();
    }
    
    rollShop() {
        this.shop = [];
        const odds = SHOP_ODDS[this.level] || SHOP_ODDS[9];
        
        for (let i = 0; i < 5; i++) {
            const roll = Math.random();
            let costTier = 1;
            let cumulative = 0;
            
            for (let tier = 0; tier < odds.length; tier++) {
                cumulative += odds[tier];
                if (roll < cumulative) {
                    costTier = tier + 1;
                    break;
                }
            }
            
            const championsOfCost = Object.entries(CHAMPION_DATA)
                .filter(([name, data]) => data.cost === costTier)
                .map(([name, data]) => name);
            
            if (championsOfCost.length > 0) {
                const name = championsOfCost[Math.floor(Math.random() * championsOfCost.length)];
                this.shop.push(new Champion(name));
            }
        }
    }
    
    buyChampion(index) {
        const champ = this.shop[index];
        if (!champ || this.gold < champ.cost) return false;
        
        const emptySlot = this.bench.findIndex(slot => slot === null);
        if (emptySlot === -1) return false;
        
        this.gold -= champ.cost;
        this.bench[emptySlot] = champ;
        this.shop[index] = null;
        
        this.checkStarUp();
        return true;
    }
    
    buyXP() {
        if (this.gold >= 4 && this.level < 9) {
            this.gold -= 4;
            this.xp += 4;
            
            const xpNeeded = XP_THRESHOLDS[this.level];
            if (this.xp >= xpNeeded) {
                this.xp -= xpNeeded;
                this.level++;
            }
            return true;
        }
        return false;
    }
    
    checkStarUp() {
        const championCounts = {};
        
        [...this.bench, ...this.board].forEach(champ => {
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
                    this.combineChampions(name, stars);
                    this.checkStarUp();
                    return;
                }
            }
        }
    }
    
    combineChampions(name, stars) {
        const toRemove = [];
        let removed = 0;
        
        for (let i = 0; i < this.bench.length && removed < 3; i++) {
            const champ = this.bench[i];
            if (champ && champ.name === name && (champ.stars || 1) === stars) {
                toRemove.push({ type: 'bench', index: i });
                removed++;
            }
        }
        
        for (let i = 0; i < this.board.length && removed < 3; i++) {
            const champ = this.board[i];
            if (champ && champ.name === name && (champ.stars || 1) === stars) {
                toRemove.push({ type: 'board', index: i });
                removed++;
            }
        }
        
        if (removed === 3) {
            toRemove.sort((a, b) => b.index - a.index);
            
            toRemove.forEach(item => {
                if (item.type === 'bench') {
                    this.bench[item.index] = null;
                } else {
                    this.board.splice(item.index, 1);
                }
            });
            
            const newChamp = new Champion(name);
            newChamp.stars = stars + 1;
            const multiplier = stars === 1 ? 1.8 : 2.7;
            newChamp.stats.HP = Math.floor(newChamp.stats.HP * multiplier);
            newChamp.stats.AD = Math.floor(newChamp.stats.AD * multiplier);
            if (newChamp.stats.AP) newChamp.stats.AP = Math.floor(newChamp.stats.AP * multiplier);
            
            const emptySlot = this.bench.findIndex(slot => slot === null);
            if (emptySlot !== -1) {
                this.bench[emptySlot] = newChamp;
            }
        }
    }
}

class Champion {
    constructor(name, pos = null) {
        const data = CHAMPION_DATA[name];
        this.name = name;
        this.cost = data.cost;
        this.trait = data.trait;
        this.stats = { ...data.stats };
        this.color = data.color;
        this.pos = pos;
        this.benchIndex = null;
        this.stars = 1;
    }
}

class CombatUnit {
    constructor(champion, gridR, gridC, team, boardStartX, boardStartY) {
        this.name = champion.name;
        this.trait = champion.trait;
        this.color = champion.color;
        this.stats = { ...champion.stats };
        this.maxHp = this.stats.HP;
        this.hp = this.maxHp;
        this.mana = 0;
        this.attackTimer = 0;
        this.castTimer = 0;
        this.alive = true;
        this.team = team;
        this.animState = "idle";
        this.animFrame = 0;
        this.animTime = 0;
        
        this.gridR = gridR;
        this.gridC = gridC;
        this.range = champion.range || 1;
        this.moveSpeed = champion.moveSpeed || 200;
        this.isRanged = this.range > 1;
        
        this.boardStartX = boardStartX;
        this.boardStartY = boardStartY;
        this.x = boardStartX + gridC * GRID_SIZE + GRID_SIZE / 2;
        this.y = boardStartY + gridR * GRID_SIZE + GRID_SIZE / 2;
        this.targetX = this.x;
        this.targetY = this.y;
        this.moving = false;
        this.deathFade = 0;
    }
    
    getManhattanDistance(otherUnit) {
        return Math.abs(this.gridR - otherUnit.gridR) + Math.abs(this.gridC - otherUnit.gridC);
    }
    
    findPathBFS(targetGridR, targetGridC, occupancy, maxRange) {
        const queue = [[this.gridR, this.gridC, []]];
        const visited = Array(8).fill(null).map(() => Array(7).fill(false));
        visited[this.gridR][this.gridC] = true;
        
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
                    if (!occupancy[newR][newC] || (newR === this.gridR && newC === this.gridC)) {
                        visited[newR][newC] = true;
                        const newPath = [...path, [newR, newC]];
                        queue.push([newR, newC, newPath]);
                    }
                }
            }
        }
        
        return null;
    }
    
    moveTowards(targetGridR, targetGridC, occupancy) {
        if (this.gridR === targetGridR && this.gridC === targetGridC) {
            return false;
        }
        
        const path = this.findPathBFS(targetGridR, targetGridC, occupancy, this.range);
        
        if (path && path.length > 0) {
            const [newR, newC] = path[0];
            occupancy[this.gridR][this.gridC] = false;
            this.gridR = newR;
            this.gridC = newC;
            occupancy[newR][newC] = true;
            
            this.targetX = this.boardStartX + newC * GRID_SIZE + GRID_SIZE / 2;
            this.targetY = this.boardStartY + newR * GRID_SIZE + GRID_SIZE / 2;
            this.moving = true;
            return true;
        }
        
        return false;
    }
    
    update(dt) {
        if (!this.alive) {
            if (this.deathFade > 0) {
                this.deathFade -= dt;
            }
            return;
        }
        
        this.animTime += dt;
        
        if (this.moving) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 5) {
                this.x = this.targetX;
                this.y = this.targetY;
                this.moving = false;
            } else {
                const moveAmount = this.moveSpeed * dt;
                this.x += (dx / dist) * moveAmount;
                this.y += (dy / dist) * moveAmount;
            }
        }
        
        if (this.castTimer > 0) {
            this.castTimer -= dt;
            if (this.castTimer <= 0) {
                this.animState = "idle";
            }
            return;
        }
        
        const attackPeriod = 1.0 / Math.max(0.1, this.stats.AS);
        this.attackTimer += dt;
        
        if (this.animState === "idle") {
            if (this.animTime > 0.5) {
                this.animTime = 0;
                this.animFrame = (this.animFrame + 1) % 4;
            }
        } else if (this.animState === "attack") {
            if (this.animTime > 0.1) {
                this.animTime = 0;
                this.animFrame++;
                if (this.animFrame >= 4) {
                    this.animState = "idle";
                    this.animFrame = 0;
                }
            }
        } else if (this.animState === "ability") {
            if (this.animTime > 0.15) {
                this.animTime = 0;
                this.animFrame++;
                if (this.animFrame >= 5) {
                    this.animState = "idle";
                    this.animFrame = 0;
                }
            }
        }
    }
    
    canAttack() {
        const attackPeriod = 1.0 / Math.max(0.1, this.stats.AS);
        return this.alive && this.castTimer <= 0 && this.attackTimer >= attackPeriod;
    }
    
    performAttack() {
        this.attackTimer = 0;
        this.animState = "attack";
        this.animFrame = 0;
        this.animTime = 0;
    }
    
    gainMana(amount) {
        if (!this.alive) return;
        this.mana = Math.min(MAX_MANA, this.mana + amount);
    }
    
    canCastAbility() {
        return this.alive && this.mana >= MAX_MANA && this.castTimer <= 0;
    }
    
    castAbility() {
        this.mana = 0;
        this.castTimer = 0.3;
        this.animState = "ability";
        this.animFrame = 0;
        this.animTime = 0;
    }
    
    takeDamage(damage) {
        const armor = this.stats.Armor || 0;
        const mitigatedDamage = damage * 100 / (100 + armor);
        this.hp -= mitigatedDamage;
        
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            this.deathFade = 0.5;
        }
        
        return Math.floor(mitigatedDamage);
    }
    
    draw(ctx) {
        if (!this.alive && this.deathFade <= 0) return;
        
        const size = 50;
        
        ctx.save();
        
        if (!this.alive && this.deathFade > 0) {
            ctx.globalAlpha = this.deathFade / 0.5;
        }
        
        let offsetY = 0;
        let scale = 1.0;
        let glow = 0;
        
        if (this.animState === "idle") {
            offsetY = Math.sin(this.animFrame * Math.PI / 2) * 3;
        } else if (this.animState === "attack") {
            const lunge = this.animFrame < 2 ? this.animFrame * 5 : (4 - this.animFrame) * 5;
            ctx.translate(lunge, 0);
            glow = 50;
        } else if (this.animState === "ability") {
            scale = 1.0 + (this.animFrame * 0.1);
            glow = 80;
        }
        
        ctx.translate(this.x, this.y + offsetY);
        ctx.scale(scale, scale);
        
        const color = this.color;
        const glowColor = `rgb(${Math.min(255, parseInt(color.slice(1,3), 16) + glow)}, ${Math.min(255, parseInt(color.slice(3,5), 16) + glow)}, ${Math.min(255, parseInt(color.slice(5,7), 16) + glow)})`;
        
        ctx.fillStyle = glow > 0 ? glowColor : color;
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        
        if (this.trait === "Assassin") {
            ctx.beginPath();
            ctx.moveTo(0, -size/2);
            ctx.lineTo(size/2, 0);
            ctx.lineTo(0, size/2);
            ctx.lineTo(-size/2, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.trait === "Tank") {
            ctx.fillRect(-size/2, -size/2, size, size);
            ctx.strokeRect(-size/2, -size/2, size, size);
        } else if (this.trait === "Sorcerer") {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = i * 2 * Math.PI / 5 - Math.PI / 2;
                const x = Math.cos(angle) * size / 2;
                const y = Math.sin(angle) * size / 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, size/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.restore();
        
        const barWidth = 50;
        const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - 35;
        
        ctx.fillStyle = "#323232";
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        const healthWidth = barWidth * (this.hp / this.maxHp);
        ctx.fillStyle = "#32c832";
        ctx.fillRect(barX, barY, healthWidth, barHeight);
        
        const manaY = barY + barHeight + 2;
        ctx.fillStyle = "#1e1e32";
        ctx.fillRect(barX, manaY, barWidth, barHeight);
        
        const manaWidth = barWidth * (this.mana / MAX_MANA);
        ctx.fillStyle = "#3296ff";
        ctx.fillRect(barX, manaY, manaWidth, barHeight);
    }
}

class CombatInstance {
    constructor(playerChampions, opponentChampions, boardStartX, boardStartY) {
        this.playerUnits = [];
        this.opponentUnits = [];
        this.floatingTexts = [];
        this.active = true;
        this.winner = null;
        this.boardStartX = boardStartX;
        this.boardStartY = boardStartY;
        
        this.occupancy = Array(8).fill(null).map(() => Array(7).fill(false));
        
        playerChampions.forEach(champ => {
            if (champ.pos) {
                const [r, c] = champ.pos;
                const combatR = 4 + r;
                const combatC = c;
                this.occupancy[combatR][combatC] = true;
                this.playerUnits.push(new CombatUnit(champ, combatR, combatC, 0, boardStartX, boardStartY));
            }
        });
        
        opponentChampions.forEach(champ => {
            if (champ.pos) {
                const [r, c] = champ.pos;
                const combatR = 3 - r;
                const combatC = c;
                this.occupancy[combatR][combatC] = true;
                this.opponentUnits.push(new CombatUnit(champ, combatR, combatC, 1, boardStartX, boardStartY));
            }
        });
    }
    
    getNearestEnemy(unit) {
        const enemies = unit.team === 0 ? this.opponentUnits : this.playerUnits;
        const livingEnemies = enemies.filter(e => e.alive);
        
        if (livingEnemies.length === 0) return null;
        
        let nearest = null;
        let minDist = Infinity;
        
        livingEnemies.forEach(enemy => {
            const dist = Math.sqrt((unit.x - enemy.x) ** 2 + (unit.y - enemy.y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        });
        
        return nearest;
    }
    
    dealDamage(attacker, target, damage, isAbility = false) {
        const actualDamage = target.takeDamage(damage);
        
        if (!target.alive) {
            this.occupancy[target.gridR][target.gridC] = false;
        }
        
        const color = isAbility ? "#ffc864" : "#ff6464";
        this.floatingTexts.push({
            text: `-${actualDamage}`,
            x: target.x,
            y: target.y,
            color: color,
            life: 0.6,
            time: 0
        });
        
        return actualDamage;
    }
    
    update(dt) {
        if (!this.active) return;
        
        const allUnits = [...this.playerUnits, ...this.opponentUnits];
        allUnits.forEach(unit => {
            unit.update(dt);
            
            if (!unit.alive || unit.moving || unit.castTimer > 0) return;
            
            const target = this.getNearestEnemy(unit);
            if (!target) return;
            
            const distance = unit.getManhattanDistance(target);
            
            if (unit.canCastAbility()) {
                if (distance <= unit.range) {
                    unit.castAbility();
                    const ability = ABILITIES[unit.name];
                    const damage = ability.damage(unit);
                    this.dealDamage(unit, target, damage, true);
                    
                    this.floatingTexts.push({
                        text: "ABILITY!",
                        x: unit.x,
                        y: unit.y - 20,
                        color: "#ffff64",
                        life: 0.6,
                        time: 0
                    });
                } else {
                    unit.moveTowards(target.gridR, target.gridC, this.occupancy);
                }
            }
            else if (unit.canAttack()) {
                if (distance <= unit.range) {
                    unit.performAttack();
                    const damage = unit.stats.AD;
                    this.dealDamage(unit, target, damage);
                    unit.gainMana(MANA_PER_ATTACK);
                    
                    this.floatingTexts.push({
                        text: `+${MANA_PER_ATTACK}`,
                        x: unit.x,
                        y: unit.y - 10,
                        color: "#3296ff",
                        life: 0.6,
                        time: 0
                    });
                } else {
                    unit.moveTowards(target.gridR, target.gridC, this.occupancy);
                }
            }
        });
        
        this.floatingTexts = this.floatingTexts.filter(ft => {
            ft.time += dt;
            ft.y -= 30 * dt;
            return ft.time < ft.life;
        });
        
        const playerAlive = this.playerUnits.some(u => u.alive);
        const opponentAlive = this.opponentUnits.some(u => u.alive);
        
        if (!playerAlive || !opponentAlive) {
            this.active = false;
            if (playerAlive) {
                this.winner = "player";
            } else if (opponentAlive) {
                this.winner = "opponent";
            } else {
                this.winner = "draw";
            }
        }
    }
    
    draw(ctx) {
        [...this.playerUnits, ...this.opponentUnits].forEach(unit => unit.draw(ctx));
        
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        this.floatingTexts.forEach(ft => {
            const alpha = 1 - (ft.time / ft.life);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
        });
        ctx.globalAlpha = 1.0;
    }
}

class GameRenderer {
    constructor(canvas, gameState) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameState = gameState;
        this.lastTime = performance.now();
        this.pointer = { x: 0, y: 0, down: false };
        
        this.canvas.style.touchAction = 'none';
        
        this.setupEventListeners();
        this.animate();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        this.canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
        this.canvas.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
        
        this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handlePointerMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handlePointerUp(e));
        
        document.getElementById('rerollBtn').addEventListener('click', () => {
            if (this.gameState.mode === 'multiplayer' && this.gameState.networkClient) {
                this.gameState.networkClient.rerollShop();
            } else if (this.gameState.gold >= 2 && !this.gameState.combat) {
                this.gameState.gold -= 2;
                this.gameState.rollShop();
                this.updateUI();
            }
        });
        
        document.getElementById('xpBtn').addEventListener('click', () => {
            if (this.gameState.mode === 'multiplayer' && this.gameState.networkClient) {
                this.gameState.networkClient.buyXP();
            } else if (!this.gameState.combat) {
                this.gameState.buyXP();
                this.updateUI();
            }
        });
        
        document.getElementById('fightBtn').addEventListener('click', () => {
            if (!this.gameState.combat) {
                this.startCombat();
            } else if (!this.gameState.combat.active) {
                this.endCombat();
            }
        });
        
        const readyBtn = document.getElementById('readyBtn');
        if (readyBtn) {
            readyBtn.addEventListener('click', () => {
                if (this.gameState.mode === 'multiplayer' && this.gameState.networkClient) {
                    this.gameState.networkClient.ready();
                    readyBtn.disabled = true;
                    readyBtn.textContent = '⏳ Waiting for others...';
                }
            });
        }
    }
    
    startCombat() {
        if (this.gameState.board.length === 0) {
            alert("Place champions on the board first!");
            return;
        }
        
        const botChampions = [
            new Champion("Malphite", [1, 1]),
            new Champion("Ashe", [1, 3]),
            new Champion("Zed", [1, 5])
        ];
        
        this.gameState.combat = new CombatInstance(
            this.gameState.board,
            botChampions,
            this.gameState.boardStartX,
            this.gameState.boardStartY
        );
        
        document.getElementById('fightBtn').textContent = "⚔️ FIGHTING...";
        document.getElementById('fightBtn').style.background = "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";
    }
    
    endCombat() {
        if (this.gameState.combat.winner === "opponent") {
            const survivors = this.gameState.combat.opponentUnits.filter(u => u.alive).length;
            const damage = Math.max(3, survivors * 2);
            this.gameState.hp -= damage;
            alert(`You lost! Took ${damage} damage. HP: ${this.gameState.hp}`);
        } else if (this.gameState.combat.winner === "player") {
            alert("You won!");
        }
        
        this.gameState.combat = null;
        document.getElementById('fightBtn').textContent = "⚔️ START COMBAT";
        document.getElementById('fightBtn').style.background = "linear-gradient(135deg, #fa709a 0%, #fee140 100%)";
        this.updateUI();
    }
    
    handlePointerDown(e) {
        if (this.gameState.combat) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.pointer.x = x;
        this.pointer.y = y;
        this.pointer.down = true;
        
        for (let i = 0; i < this.gameState.shop.length; i++) {
            const champ = this.gameState.shop[i];
            if (!champ) continue;
            
            const shopX = this.gameState.shopStartX + i * (GRID_SIZE + 5);
            const shopY = this.gameState.shopStartY;
            
            if (x >= shopX && x < shopX + GRID_SIZE && y >= shopY && y < shopY + GRID_SIZE) {
                if (this.gameState.mode === 'multiplayer' && this.gameState.networkClient) {
                    this.gameState.networkClient.buyChampion(i);
                } else {
                    this.gameState.buyChampion(i);
                    this.updateUI();
                }
                return;
            }
        }
        
        for (let i = 0; i < this.gameState.bench.length; i++) {
            const champ = this.gameState.bench[i];
            if (!champ) continue;
            
            const benchX = this.gameState.benchStartX + i * GRID_SIZE;
            const benchY = this.gameState.benchStartY;
            
            if (x >= benchX && x < benchX + GRID_SIZE && y >= benchY && y < benchY + GRID_SIZE) {
                this.gameState.selectedChampion = champ;
                this.gameState.dragOffset = { x: x - benchX, y: y - benchY };
                return;
            }
        }
        
        for (let i = 0; i < this.gameState.board.length; i++) {
            const champ = this.gameState.board[i];
            if (!champ || !champ.pos) continue;
            
            const [r, c] = champ.pos;
            const boardX = this.gameState.boardStartX + c * GRID_SIZE;
            const boardY = this.gameState.boardStartY + r * GRID_SIZE;
            
            if (x >= boardX && x < boardX + GRID_SIZE && y >= boardY && y < boardY + GRID_SIZE) {
                this.gameState.selectedChampion = champ;
                this.gameState.dragOffset = { x: x - boardX, y: y - boardY };
                return;
            }
        }
    }
    
    handlePointerMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = e.clientX - rect.left;
        this.pointer.y = e.clientY - rect.top;
    }
    
    handlePointerUp(e) {
        this.pointer.down = false;
        
        if (!this.gameState.selectedChampion || this.gameState.combat) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const boardX = this.gameState.boardStartX;
        const boardY = this.gameState.boardStartY;
        const benchX = this.gameState.benchStartX;
        const benchY = this.gameState.benchStartY;
        
        const benchIndex = this.gameState.bench.indexOf(this.gameState.selectedChampion);
        const boardIndex = this.gameState.board.indexOf(this.gameState.selectedChampion);
        const fromPosition = boardIndex !== -1 ? this.gameState.selectedChampion.pos : null;
        
        if (x >= boardX && x < boardX + BOARD_COLS * GRID_SIZE &&
            y >= boardY && y < boardY + BOARD_ROWS * GRID_SIZE) {
            
            const col = Math.floor((x - boardX) / GRID_SIZE);
            const row = Math.floor((y - boardY) / GRID_SIZE);
            
            if (this.gameState.board.length >= this.gameState.level) {
                const isReplacingExisting = this.gameState.board.some(c => 
                    c.pos && c.pos[0] === row && c.pos[1] === col
                );
                
                if (!isReplacingExisting) {
                    alert(`Team size limit reached! Level ${this.gameState.level} = max ${this.gameState.level} units on board.`);
                    this.gameState.selectedChampion = null;
                    return;
                }
            }
            
            if (this.gameState.mode === 'multiplayer' && this.gameState.networkClient) {
                if (benchIndex !== -1) {
                    this.gameState.networkClient.moveChampion({
                        from: 'bench',
                        to: 'board',
                        fromIndex: benchIndex,
                        position: [row, col]
                    });
                } else if (boardIndex !== -1) {
                    this.gameState.networkClient.moveChampion({
                        from: 'board',
                        to: 'board',
                        fromPosition: fromPosition,
                        position: [row, col]
                    });
                }
            } else {
                if (benchIndex !== -1) {
                    this.gameState.bench[benchIndex] = null;
                } else {
                    this.gameState.board = this.gameState.board.filter(c => c !== this.gameState.selectedChampion);
                }
                
                this.gameState.board = this.gameState.board.filter(c => 
                    !(c.pos && c.pos[0] === row && c.pos[1] === col)
                );
                
                this.gameState.selectedChampion.pos = [row, col];
                this.gameState.board.push(this.gameState.selectedChampion);
            }
        } else if (x >= benchX && x < benchX + BENCH_SIZE * GRID_SIZE &&
                   y >= benchY && y < benchY + GRID_SIZE) {
            
            if (this.gameState.mode === 'multiplayer' && this.gameState.networkClient && boardIndex !== -1) {
                this.gameState.networkClient.moveChampion({
                    from: 'board',
                    to: 'bench',
                    position: fromPosition
                });
            } else if (boardIndex !== -1) {
                const emptySlot = this.gameState.bench.findIndex(slot => slot === null);
                if (emptySlot !== -1) {
                    this.gameState.selectedChampion.pos = null;
                    this.gameState.board = this.gameState.board.filter(c => c !== this.gameState.selectedChampion);
                    this.gameState.bench[emptySlot] = this.gameState.selectedChampion;
                }
            }
        }
        
        this.gameState.selectedChampion = null;
    }
    
    updateUI() {
        document.getElementById('goldDisplay').textContent = this.gameState.gold;
        document.getElementById('hpDisplay').textContent = this.gameState.hp;
        document.getElementById('levelDisplay').textContent = this.gameState.level;
        
        const xpNeeded = XP_THRESHOLDS[this.gameState.level] || 100;
        const xpProgress = `${this.gameState.xp}/${xpNeeded}`;
        document.getElementById('xpDisplay').textContent = xpProgress;
    }
    
    drawBoard() {
        const ctx = this.ctx;
        
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const x = this.gameState.boardStartX + c * GRID_SIZE;
                const y = this.gameState.boardStartY + r * GRID_SIZE;
                ctx.fillStyle = "#1e1e28";
                ctx.fillRect(x, y, GRID_SIZE - 2, GRID_SIZE - 2);
            }
        }
        
        for (let i = 0; i < BENCH_SIZE; i++) {
            const x = this.gameState.benchStartX + i * GRID_SIZE;
            const y = this.gameState.benchStartY;
            ctx.fillStyle = "#14141e";
            ctx.fillRect(x, y, GRID_SIZE - 2, GRID_SIZE - 2);
        }
        
        this.gameState.board.forEach(champ => {
            if (champ.pos) {
                const [r, c] = champ.pos;
                const x = this.gameState.boardStartX + c * GRID_SIZE;
                const y = this.gameState.boardStartY + r * GRID_SIZE;
                this.drawChampion(champ, x, y);
            }
        });
        
        this.gameState.bench.forEach((champ, i) => {
            if (champ) {
                const x = this.gameState.benchStartX + i * GRID_SIZE;
                const y = this.gameState.benchStartY;
                this.drawChampion(champ, x, y);
            }
        });
        
        ctx.fillStyle = "white";
        ctx.font = "18px Arial";
        ctx.fillText("Shop (2g to reroll)", this.gameState.shopStartX, this.gameState.shopStartY - 10);
        
        this.gameState.shop.forEach((champ, i) => {
            if (champ) {
                const x = this.gameState.shopStartX + i * (GRID_SIZE + 5);
                const y = this.gameState.shopStartY;
                this.drawChampion(champ, x, y, true);
            }
        });
    }
    
    drawChampion(champ, x, y, showCost = false) {
        const ctx = this.ctx;
        
        ctx.fillStyle = champ.color;
        ctx.fillRect(x, y, GRID_SIZE - 2, GRID_SIZE - 2);
        
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(champ.name.substring(0, 4), x + 5, y + 15);
        
        if (showCost) {
            ctx.fillStyle = "#ffd700";
            ctx.fillText(`${champ.cost}g`, x + 5, y + GRID_SIZE - 10);
        }
        
        if (champ.stars && champ.stars > 1) {
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 14px Arial";
            const stars = '★'.repeat(champ.stars);
            ctx.fillText(stars, x + 5, y + 30);
        }
    }
    
    animate() {
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        
        this.ctx.fillStyle = "#0f0f1e";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState.combat) {
            this.gameState.combat.update(dt);
            
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < BOARD_COLS; c++) {
                    const x = this.gameState.boardStartX + c * GRID_SIZE;
                    const y = this.gameState.boardStartY + r * GRID_SIZE;
                    
                    if (r < 4) {
                        this.ctx.fillStyle = "#1e1428";
                    } else {
                        this.ctx.fillStyle = "#14281e";
                    }
                    this.ctx.fillRect(x, y, GRID_SIZE - 2, GRID_SIZE - 2);
                }
            }
            
            const dividerY = this.gameState.boardStartY + 4 * GRID_SIZE;
            this.ctx.strokeStyle = "#ffd700";
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(this.gameState.boardStartX, dividerY);
            this.ctx.lineTo(this.gameState.boardStartX + BOARD_COLS * GRID_SIZE, dividerY);
            this.ctx.stroke();
            
            this.ctx.fillStyle = "rgba(255, 215, 0, 0.1)";
            this.ctx.fillRect(
                this.gameState.boardStartX, 
                dividerY - 1, 
                BOARD_COLS * GRID_SIZE, 
                2
            );
            
            this.gameState.combat.draw(this.ctx);
            
            this.ctx.font = "bold 24px Arial";
            this.ctx.textAlign = "center";
            if (this.gameState.combat.active) {
                this.ctx.fillStyle = "#ff6464";
                this.ctx.fillText("COMBAT IN PROGRESS", this.canvas.width / 2, 40);
            } else {
                this.ctx.fillStyle = "#64ff64";
                this.ctx.fillText(`${this.gameState.combat.winner.toUpperCase()} WINS!`, this.canvas.width / 2, 40);
                this.ctx.font = "16px Arial";
                this.ctx.fillStyle = "white";
                this.ctx.fillText("Click 'START COMBAT' button to continue", this.canvas.width / 2, 70);
                
                document.getElementById('fightBtn').textContent = "✓ Continue";
            }
        }else {
            this.drawBoard();
            
            if (this.gameState.selectedChampion) {
                const mouseX = this.pointer.x - this.gameState.dragOffset.x;
                const mouseY = this.pointer.y - this.gameState.dragOffset.y;
                this.drawChampion(this.gameState.selectedChampion, mouseX, mouseY);
            }
        }
        
        requestAnimationFrame(() => this.animate());
    }
}

window.initGame = function(mode, networkClient = null) {
    const canvas = document.getElementById('gameCanvas');
    const gameState = new GameState();
    gameState.mode = mode;
    gameState.networkClient = networkClient;
    
    const renderer = new GameRenderer(canvas, gameState);
    
    if (mode === 'multiplayer' && networkClient) {
        setupMultiplayerHandlers(gameState, renderer, networkClient);
    }
};

function setupMultiplayerHandlers(gameState, renderer, networkClient) {
    networkClient.on('game_state', (data) => {
        gameState.gold = data.player.gold;
        gameState.hp = data.player.hp;
        gameState.level = data.player.level;
        gameState.xp = data.player.xp;
        gameState.board = data.player.board || [];
        gameState.bench = data.player.bench || Array(9).fill(null);
        gameState.shop = data.player.shop || [];
        
        renderer.updateUI();
        
        document.getElementById('roundDisplay').textContent = data.round;
        document.getElementById('phaseDisplay').textContent = data.phase === 'preparation' ? 'Preparation' : 'Combat';
    });
    
    networkClient.on('combat_result', (result) => {
        const message = result.won ? 
            `You won against ${result.opponent}!` : 
            `You lost to ${result.opponent}. Took ${result.damage} damage.`;
        
        setTimeout(() => {
            alert(message);
        }, 100);
    });
    
    networkClient.on('game_over', (data) => {
        setTimeout(() => {
            alert(`Game Over! Winner: ${data.winner}`);
        }, 100);
    });
}
