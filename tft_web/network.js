
class NetworkClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.playerId = null;
        this.roomCode = null;
        this.callbacks = {};
    }
    
    connect(serverUrl = 'http://localhost:3000') {
        return new Promise((resolve, reject) => {
            this.socket = io(serverUrl);
            
            this.socket.on('connect', () => {
                console.log('Connected to server');
                this.connected = true;
                this.playerId = this.socket.id;
                resolve();
            });
            
            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
                this.connected = false;
            });
            
            this.socket.on('error', (error) => {
                console.error('Socket error:', error);
                this.trigger('error', error);
            });
            
            this.socket.on('room_created', (data) => {
                this.roomCode = data.roomCode;
                this.playerId = data.playerId;
                this.trigger('room_created', data);
            });
            
            this.socket.on('room_joined', (data) => {
                this.roomCode = data.roomCode;
                this.playerId = data.playerId;
                this.trigger('room_joined', data);
            });
            
            this.socket.on('lobby_update', (data) => {
                this.trigger('lobby_update', data);
            });
            
            this.socket.on('game_started', (data) => {
                this.trigger('game_started', data);
            });
            
            this.socket.on('game_state', (data) => {
                this.trigger('game_state', data);
            });
            
            this.socket.on('player_ready', (data) => {
                this.trigger('player_ready', data);
            });
            
            this.socket.on('combat_started', (data) => {
                this.trigger('combat_started', data);
            });
            
            this.socket.on('combat_result', (data) => {
                this.trigger('combat_result', data);
            });
            
            this.socket.on('round_ended', (data) => {
                this.trigger('round_ended', data);
            });
            
            this.socket.on('game_over', (data) => {
                this.trigger('game_over', data);
            });
            
            setTimeout(() => {
                if (!this.connected) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }
    
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }
    
    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }
    
    createRoom(playerName) {
        if (!this.connected) return;
        this.socket.emit('create_room', { playerName });
    }
    
    joinRoom(roomCode, playerName) {
        if (!this.connected) return;
        this.socket.emit('join_room', { roomCode, playerName });
    }
    
    startGame() {
        if (!this.connected) return;
        this.socket.emit('start_game');
    }
    
    sendAction(action, data = {}) {
        if (!this.connected) return;
        this.socket.emit('player_action', { action, ...data });
    }
    
    buyChampion(index) {
        this.sendAction('buy_champion', { index });
    }
    
    sellChampion(benchIndex) {
        this.sendAction('sell_champion', { benchIndex });
    }
    
    moveChampion(from, to, fromIndex, position, fromPosition = null) {
        this.sendAction('move_champion', { from, to, fromIndex, position, fromPosition });
    }
    
    rerollShop() {
        this.sendAction('reroll_shop');
    }
    
    buyXP() {
        this.sendAction('buy_xp');
    }
    
    ready() {
        this.sendAction('ready');
    }
}

export { NetworkClient };

if (typeof window !== 'undefined') {
    window.NetworkClient = NetworkClient;
}
