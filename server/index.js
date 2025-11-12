import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GameEngine } from '../shared/gameEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONSTANTS = {
    GRID_SIZE: 60,
    BOARD_ROWS: 4,
    BOARD_COLS: 7,
    BENCH_SIZE: 9,
    MANA_PER_ATTACK: 25,
    MAX_MANA: 100,
    XP_THRESHOLDS: [0, 2, 2, 6, 10, 20, 36, 56, 80, 100]
};

import { SHOP_ODDS } from '../tft_web/data/shopOdds.js';
import { CHAMPION_DATA } from '../tft_web/data/champions.js';
import { ABILITIES } from '../tft_web/data/abilities.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static(join(__dirname, '../tft_web')));

const PORT = process.env.PORT || 3000;

const rooms = new Map();
const playerRooms = new Map();

class GameRoom {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.players = new Map();
        this.maxPlayers = 8;
        this.round = 0;
        this.phase = 'lobby'; // lobby, preparation, combat
        this.engine = new GameEngine(CONSTANTS, SHOP_ODDS, CHAMPION_DATA, ABILITIES);
        this.matchPairings = [];
        this.combatResults = new Map();
    }
    
    addPlayer(playerId, playerName) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }
        
        this.players.set(playerId, {
            id: playerId,
            name: playerName,
            hp: 100,
            gold: 50,
            level: 1,
            xp: 0,
            board: [],
            bench: Array(CONSTANTS.BENCH_SIZE).fill(null),
            shop: [],
            ready: false,
            alive: true
        });
        
        return true;
    }
    
    removePlayer(playerId) {
        this.players.delete(playerId);
    }
    
    getPlayer(playerId) {
        return this.players.get(playerId);
    }
    
    getAllPlayers() {
        return Array.from(this.players.values());
    }
    
    startGame() {
        if (this.players.size < 2) return false;
        
        this.phase = 'preparation';
        this.round = 1;
        
        this.players.forEach(player => {
            player.shop = this.engine.generateShop(player.level);
        });
        
        return true;
    }
    
    generateRoundPairings() {
        const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
        
        if (alivePlayers.length <= 1) {
            return [];
        }
        
        const pairings = [];
        const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                pairings.push({
                    player1: shuffled[i].id,
                    player2: shuffled[i + 1].id
                });
            } else {
                const ghostOpponent = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
                pairings.push({
                    player1: shuffled[i].id,
                    player2: ghostOpponent.id,
                    isGhost: true
                });
            }
        }
        
        return pairings;
    }
    
    startCombatPhase() {
        this.phase = 'combat';
        this.matchPairings = this.generateRoundPairings();
        this.combatResults.clear();
        
        this.matchPairings.forEach(pairing => {
            const player1 = this.players.get(pairing.player1);
            const player2 = this.players.get(pairing.player2);
            
            const seed = Date.now() + Math.random() * 1000;
            const result = this.engine.simulateCombat(player1.board, player2.board, seed);
            
            this.combatResults.set(pairing.player1, {
                opponent: player2.name,
                won: result.winner === 0,
                damage: result.winner === 0 ? 0 : this.calculateDamage(result.survivingUnits, player2.level),
                isGhost: pairing.isGhost || false
            });
            
            if (!pairing.isGhost) {
                this.combatResults.set(pairing.player2, {
                    opponent: player1.name,
                    won: result.winner === 1,
                    damage: result.winner === 1 ? 0 : this.calculateDamage(result.survivingUnits, player1.level),
                    isGhost: false
                });
            }
        });
        
        this.combatResults.forEach((result, playerId) => {
            if (!result.won) {
                const player = this.players.get(playerId);
                player.hp -= result.damage;
                if (player.hp <= 0) {
                    player.hp = 0;
                    player.alive = false;
                }
            }
        });
        
        return this.combatResults;
    }
    
    calculateDamage(survivingUnits, opponentLevel) {
        return Math.max(1, 2 + opponentLevel + survivingUnits);
    }
    
    endCombatPhase() {
        this.phase = 'preparation';
        this.round++;
        
        this.players.forEach(player => {
            if (player.alive) {
                const baseGold = 5;
                const interest = Math.min(Math.floor(player.gold / 10), 5);
                player.gold += baseGold + interest;
                
                player.ready = false;
                
                player.shop = this.engine.generateShop(player.level);
            }
        });
        
        const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
        if (alivePlayers.length === 1) {
            this.phase = 'gameover';
            return alivePlayers[0];
        }
        
        return null;
    }
    
    checkAllReady() {
        const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
        return alivePlayers.length > 0 && alivePlayers.every(p => p.ready);
    }
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    socket.on('create_room', (data) => {
        const roomCode = generateRoomCode();
        const room = new GameRoom(roomCode);
        
        if (room.addPlayer(socket.id, data.playerName || 'Player')) {
            rooms.set(roomCode, room);
            playerRooms.set(socket.id, roomCode);
            socket.join(roomCode);
            
            socket.emit('room_created', {
                roomCode,
                playerId: socket.id
            });
            
            io.to(roomCode).emit('lobby_update', {
                players: room.getAllPlayers(),
                phase: room.phase
            });
        }
    });
    
    socket.on('join_room', (data) => {
        const room = rooms.get(data.roomCode);
        
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        if (room.phase !== 'lobby') {
            socket.emit('error', { message: 'Game already in progress' });
            return;
        }
        
        if (room.addPlayer(socket.id, data.playerName || 'Player')) {
            playerRooms.set(socket.id, data.roomCode);
            socket.join(data.roomCode);
            
            socket.emit('room_joined', {
                roomCode: data.roomCode,
                playerId: socket.id
            });
            
            io.to(data.roomCode).emit('lobby_update', {
                players: room.getAllPlayers(),
                phase: room.phase
            });
        } else {
            socket.emit('error', { message: 'Room is full' });
        }
    });
    
    socket.on('start_game', () => {
        const roomCode = playerRooms.get(socket.id);
        const room = rooms.get(roomCode);
        
        if (!room) return;
        
        if (room.startGame()) {
            io.to(roomCode).emit('game_started', {
                round: room.round,
                phase: room.phase
            });
            
            room.players.forEach((player, playerId) => {
                io.to(playerId).emit('game_state', {
                    player: player,
                    round: room.round,
                    phase: room.phase
                });
            });
        }
    });
    
    socket.on('player_action', (data) => {
        const roomCode = playerRooms.get(socket.id);
        const room = rooms.get(roomCode);
        
        if (!room) return;
        
        const player = room.getPlayer(socket.id);
        if (!player || !player.alive) return;
        
        switch (data.action) {
            case 'buy_champion':
                if (data.index >= 0 && data.index < player.shop.length) {
                    const champ = player.shop[data.index];
                    if (champ && player.gold >= champ.cost) {
                        const emptySlot = player.bench.findIndex(slot => slot === null);
                        if (emptySlot !== -1) {
                            player.gold -= champ.cost;
                            player.bench[emptySlot] = champ;
                            player.shop[data.index] = null;
                            
                            let starUp = room.engine.checkStarUp(player.bench, player.board);
                            while (starUp) {
                                room.engine.combineChampions(player.bench, player.board, starUp.name, starUp.stars);
                                starUp = room.engine.checkStarUp(player.bench, player.board);
                            }
                        }
                    }
                }
                break;
                
            case 'sell_champion':
                if (data.benchIndex >= 0 && data.benchIndex < player.bench.length) {
                    const champ = player.bench[data.benchIndex];
                    if (champ) {
                        player.gold += champ.cost;
                        player.bench[data.benchIndex] = null;
                    }
                }
                break;
                
            case 'move_champion':
                if (data.from === 'bench' && data.to === 'board') {
                    const champ = player.bench[data.fromIndex];
                    if (champ && player.board.length < player.level) {
                        champ.pos = data.position;
                        player.bench[data.fromIndex] = null;
                        player.board.push(champ);
                    }
                } else if (data.from === 'board' && data.to === 'bench') {
                    const champIndex = player.board.findIndex(c => 
                        c.pos && c.pos[0] === data.position[0] && c.pos[1] === data.position[1]
                    );
                    if (champIndex !== -1) {
                        const champ = player.board[champIndex];
                        const emptySlot = player.bench.findIndex(slot => slot === null);
                        if (emptySlot !== -1) {
                            champ.pos = null;
                            player.board.splice(champIndex, 1);
                            player.bench[emptySlot] = champ;
                        }
                    }
                } else if (data.from === 'board' && data.to === 'board') {
                    const champIndex = player.board.findIndex(c => 
                        c.pos && c.pos[0] === data.fromPosition[0] && c.pos[1] === data.fromPosition[1]
                    );
                    if (champIndex !== -1) {
                        player.board[champIndex].pos = data.position;
                    }
                }
                break;
                
            case 'reroll_shop':
                if (player.gold >= 2) {
                    player.gold -= 2;
                    player.shop = room.engine.generateShop(player.level);
                }
                break;
                
            case 'buy_xp':
                if (player.gold >= 4 && player.level < 9) {
                    player.gold -= 4;
                    player.xp += 4;
                    
                    const xpNeeded = CONSTANTS.XP_THRESHOLDS[player.level];
                    if (player.xp >= xpNeeded) {
                        player.xp -= xpNeeded;
                        player.level++;
                    }
                }
                break;
                
            case 'ready':
                player.ready = true;
                
                io.to(roomCode).emit('player_ready', {
                    playerId: socket.id,
                    playerName: player.name
                });
                
                if (room.checkAllReady()) {
                    const results = room.startCombatPhase();
                    
                    io.to(roomCode).emit('combat_started', {
                        round: room.round,
                        pairings: room.matchPairings
                    });
                    
                    results.forEach((result, playerId) => {
                        io.to(playerId).emit('combat_result', result);
                    });
                    
                    setTimeout(() => {
                        const winner = room.endCombatPhase();
                        
                        if (winner) {
                            io.to(roomCode).emit('game_over', {
                                winner: winner.name,
                                winnerId: winner.id
                            });
                        } else {
                            io.to(roomCode).emit('round_ended', {
                                round: room.round,
                                phase: room.phase
                            });
                            
                            room.players.forEach((player, playerId) => {
                                io.to(playerId).emit('game_state', {
                                    player: player,
                                    round: room.round,
                                    phase: room.phase
                                });
                            });
                        }
                    }, 5000);
                }
                break;
        }
        
        socket.emit('game_state', {
            player: player,
            round: room.round,
            phase: room.phase
        });
    });
    
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        const roomCode = playerRooms.get(socket.id);
        if (roomCode) {
            const room = rooms.get(roomCode);
            if (room) {
                room.removePlayer(socket.id);
                
                if (room.players.size === 0) {
                    rooms.delete(roomCode);
                } else {
                    io.to(roomCode).emit('lobby_update', {
                        players: room.getAllPlayers(),
                        phase: room.phase
                    });
                }
            }
            playerRooms.delete(socket.id);
        }
    });
});

server.listen(PORT, () => {
    console.log(`TFT Multiplayer Server running on port ${PORT}`);
});
