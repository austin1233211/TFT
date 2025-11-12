# TFT Multiplayer Auto-Battler

A web-based Team Fight Tactics (TFT) style auto-battler game with **8-player multiplayer** support.

## Features

- 🎮 **8-Player Multiplayer Lobbies** - Create or join rooms with up to 8 players
- ⚔️ **Round-Robin Matchmaking** - Fight different opponents each round
- 🎯 **Authentic TFT Mechanics** - XP system, level-based shop odds, star-up system
- 🤖 **Single Player Mode** - Practice against AI opponents
- 🌐 **Real-time Multiplayer** - Server-authoritative combat simulation with WebSockets
- 🐳 **Docker Support** - Easy deployment to Railway or any container platform

## Quick Start

### Local Development

1. **Install Dependencies**
```bash
cd server
npm install
```

2. **Start the Server**
```bash
cd server
npm start
```

3. **Open the Game**
Navigate to `http://localhost:3000` in your browser

### Docker Deployment

1. **Build the Docker Image**
```bash
docker build -t tft-multiplayer .
```

2. **Run the Container**
```bash
docker run -p 3000:3000 tft-multiplayer
```

### Railway Deployment

1. **Connect your GitHub repository to Railway**
2. **Railway will automatically detect the Dockerfile**
3. **Deploy and get your public URL**

## How to Play

### Single Player Mode
1. Click "Single Player" on the main menu
2. Buy champions from the shop
3. Position them on your board
4. Click "START COMBAT" to fight AI opponents

### Multiplayer Mode
1. Click "Multiplayer" on the main menu
2. **Create Room**: Enter your name and create a new room, share the room code with friends
3. **Join Room**: Enter your name and the room code to join an existing game
4. Wait for all players to join (2-8 players)
5. Host clicks "Start Game"
6. Each round:
   - Buy and position champions
   - Click "READY" when done
   - Watch automated combat
   - Receive gold and continue to next round
7. Last player standing wins!

## Game Mechanics

- **Gold System**: Start with 50 gold, earn 5+ base gold per round plus interest
- **Leveling**: Buy XP (4g) to level up, your level = max units on board
- **Shop Odds**: Higher levels unlock rarer champions
- **Star-Up**: Collect 3 copies of a champion to auto-combine into 2-star (1.8x stats) or 3-star (2.7x stats)
- **Combat**: Automatic battles with pathfinding, attacking, and ability casting
- **Health**: Lose HP when you lose a round, eliminated at 0 HP

## Architecture

### Backend (`server/`)
- Node.js + Express + Socket.io
- Room management and lobby system
- Server-authoritative game state
- Round-robin matchmaking
- Combat simulation

### Frontend (`tft_web/`)
- Vanilla JavaScript with ES6 modules
- Canvas-based rendering
- WebSocket client for multiplayer
- Lobby UI and game UI

### Shared (`shared/`)
- Game engine that runs on both client and server
- Deterministic combat simulation
- Champion, shop, and leveling logic

## Project Structure

```
TFT/
├── server/              # Node.js backend
│   ├── index.js        # Main server file with Socket.io
│   └── package.json    # Server dependencies
├── tft_web/            # Frontend files
│   ├── index.html      # Main HTML with lobby UI
│   ├── game.js         # Game rendering and logic
│   ├── network.js      # WebSocket client
│   └── data/           # Game data (champions, abilities, etc.)
├── shared/             # Shared game engine
│   └── gameEngine.js   # Core simulation logic
└── Dockerfile          # Container configuration
```

## Environment Variables

- `PORT` - Server port (default: 3000)

## Technologies

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **Deployment**: Docker, Railway

## Development

The game uses ES6 modules throughout. The shared game engine can run in both Node.js and the browser, enabling server-authoritative multiplayer while maintaining client-side rendering.

## Credits

Created by austin .singh (austin.singh13@gmail.com)
GitHub: @austin1233211

## License

This is a personal project. Feel free to use and modify as needed.
