import { NetworkClient } from './network.js';

let networkClient = null;
let currentMode = null;

const elements = {
    modeSelect: document.getElementById('modeSelect'),
    lobby: document.getElementById('lobby'),
    game: document.getElementById('game'),
    singleBtn: document.getElementById('singleBtn'),
    multiBtn: document.getElementById('multiBtn'),
    createRoomBtn: document.getElementById('createRoomBtn'),
    joinRoomBtn: document.getElementById('joinRoomBtn'),
    readyBtn: document.getElementById('readyBtn'),
    playerNameCreate: document.getElementById('playerNameCreate'),
    playerNameJoin: document.getElementById('playerNameJoin'),
    roomCodeJoin: document.getElementById('roomCodeJoin'),
    roomSection: document.getElementById('roomSection'),
    roomCodeDisplay: document.getElementById('roomCodeDisplay'),
    roundDisplay: document.getElementById('roundDisplay'),
    phaseDisplay: document.getElementById('phaseDisplay'),
    playerList: document.getElementById('playerList'),
    playerCount: document.getElementById('playerCount'),
    fightBtn: document.getElementById('fightBtn')
};

function showSection(section) {
    elements.modeSelect.classList.add('hidden');
    elements.lobby.classList.add('hidden');
    elements.game.classList.add('hidden');
    
    if (section === 'mode') {
        elements.modeSelect.classList.remove('hidden');
    } else if (section === 'lobby') {
        elements.lobby.classList.remove('hidden');
    } else if (section === 'game') {
        elements.game.classList.remove('hidden');
    }
}

function renderPlayerList(players) {
    elements.playerList.innerHTML = '';
    elements.playerCount.textContent = players.length;
    
    players.forEach(player => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = player.name;
        
        const statusSpan = document.createElement('span');
        if (player.ready) {
            statusSpan.textContent = '✓ Ready';
            statusSpan.className = 'player-ready';
        } else {
            statusSpan.textContent = '⏳ Not Ready';
            statusSpan.className = 'player-not-ready';
        }
        
        li.appendChild(nameSpan);
        li.appendChild(statusSpan);
        elements.playerList.appendChild(li);
    });
}

elements.singleBtn.addEventListener('click', () => {
    currentMode = 'singleplayer';
    showSection('game');
    window.initGame('singleplayer');
});

elements.multiBtn.addEventListener('click', async () => {
    currentMode = 'multiplayer';
    showSection('lobby');
    
    networkClient = new NetworkClient();
    await networkClient.connect(window.location.origin);
    
    setupMultiplayerHandlers();
});

elements.createRoomBtn.addEventListener('click', () => {
    const playerName = elements.playerNameCreate.value.trim();
    if (!playerName) {
        alert('Please enter your name');
        return;
    }
    
    networkClient.createRoom(playerName);
});

elements.joinRoomBtn.addEventListener('click', () => {
    const roomCode = elements.roomCodeJoin.value.trim().toUpperCase();
    const playerName = elements.playerNameJoin.value.trim();
    
    if (!roomCode || !playerName) {
        alert('Please enter room code and your name');
        return;
    }
    
    networkClient.joinRoom(roomCode, playerName);
});

elements.readyBtn.addEventListener('click', () => {
    networkClient.ready();
    elements.readyBtn.disabled = true;
    elements.readyBtn.textContent = '⏳ Waiting for others...';
});

function setupMultiplayerHandlers() {
    networkClient.on('room_created', (data) => {
        elements.roomCodeDisplay.textContent = data.roomCode;
        elements.roomSection.classList.remove('hidden');
        elements.phaseDisplay.textContent = 'Lobby';
        
        elements.playerNameCreate.value = '';
    });
    
    networkClient.on('room_joined', (data) => {
        elements.roomCodeDisplay.textContent = data.roomCode;
        elements.roomSection.classList.remove('hidden');
        elements.phaseDisplay.textContent = 'Lobby';
        
        elements.roomCodeJoin.value = '';
        elements.playerNameJoin.value = '';
    });
    
    networkClient.on('lobby_update', (data) => {
        renderPlayerList(data.players);
    });
    
    networkClient.on('game_started', () => {
        showSection('game');
        elements.fightBtn.classList.add('hidden');
        window.initGame('multiplayer', networkClient);
    });
    
    networkClient.on('game_state', (data) => {
        if (data.round) {
            elements.roundDisplay.textContent = data.round;
        }
        if (data.phase) {
            elements.phaseDisplay.textContent = data.phase === 'preparation' ? 'Preparation' : 'Combat';
        }
        
        if (data.phase === 'preparation' && elements.readyBtn) {
            elements.readyBtn.disabled = false;
            elements.readyBtn.textContent = '✓ I\'m Ready';
        }
    });
    
    networkClient.on('error', (error) => {
        alert('Error: ' + error.message);
    });
}
