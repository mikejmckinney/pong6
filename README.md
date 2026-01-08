# 🎮 NEON PONG

A modern, synthwave-styled Pong game with touch controls, power-ups, and multiplayer support. Built with HTML5 Canvas and vanilla JavaScript.

## 🕹️ [Play Now on GitHub Pages](https://mikejmckinney.github.io/pong6/)

![Neon Pong](assets/images/icons/icon-192x192.svg)

## ✨ Features

### 🕹️ Game Modes
- **Single Player** - Play against AI with 4 difficulty levels (Easy, Medium, Hard, Impossible)
- **Local Multiplayer** - Two players on the same device
- **Online Multiplayer** - Play with friends or random opponents (requires server)

### 🎯 Game Types
- **Classic** - Pure Pong experience, no power-ups
- **Chaos Mode** - Frequent power-ups and multi-ball mayhem
- **Speed Run** - Fast-paced, first to 5 wins
- **Survival** - Endless mode against AI

### ⚡ Power-ups
| Power-up | Effect | Duration |
|----------|--------|----------|
| Big Paddle | Increases paddle size by 50% | 10 seconds |
| Small Enemy | Shrinks opponent's paddle | 10 seconds |
| Speed Ball | Ball moves 50% faster | Until score |
| Slow Ball | Ball moves 50% slower | 8 seconds |
| Multi-Ball | Spawns 2 additional balls | Until cleared |
| Fireball | Ball passes through paddle once | Single use |
| Shield | Blocks one goal | Single use |
| Reverse | Inverts opponent controls | 8 seconds |

### 🎨 Visual Design
- Synthwave/retrowave aesthetic
- Neon glow effects
- Animated grid background
- Particle effects
- Optional CRT scanlines
- Smooth 60fps gameplay

### 🔊 Audio
- 8-bit/chiptune sound effects generated with Web Audio API
- No external audio files required
- Adjustable volume controls for master, music, and SFX

### 📱 Mobile Optimized
- Touch-friendly drag controls
- Responsive design for all screen sizes
- PWA support (installable on mobile)
- Offline play support

## 🚀 Quick Start

### Option 1: Static Hosting (Single Player & Local Multiplayer)

To run the game with all features enabled (including offline support via service worker), you should serve the files with a local web server. Here are some simple ways to start one:

```bash
# Using Python
python -m http.server 8080

# Using Node.js (npx)
npx serve .

# Using PHP
php -S localhost:8080
```

Then open `http://localhost:8080` in your browser.

### Option 2: With Multiplayer Server

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start server
npm start
```

The server will start on port 3000 and also serve the game files.

## 🎮 Controls

### Mobile/Touch
- **Single Player**: Drag anywhere to control your paddle
- **Local Multiplayer**: Left half controls left paddle, right half controls right paddle

### Desktop/Keyboard
- **Player 1**: W/S keys or Arrow Up/Down
- **Player 2**: Arrow Up/Down (local multiplayer only)
- **Pause**: ESC or P
- **Resume**: Space

## 📁 Project Structure

```
├── index.html           # Main HTML file
├── manifest.json        # PWA manifest
├── service-worker.js    # Service worker for offline support
├── README.md
├── css/
│   ├── main.css         # Main styles
│   ├── animations.css   # CSS animations
│   └── responsive.css   # Responsive breakpoints
├── js/
│   ├── utils.js         # Helper functions
│   ├── audio.js         # Web Audio API sound system
│   ├── renderer.js      # Canvas rendering
│   ├── controls.js      # Input handling
│   ├── ai.js            # AI opponent logic
│   ├── powerups.js      # Power-up system
│   ├── leaderboard.js   # Score tracking
│   ├── multiplayer.js   # Online multiplayer client
│   └── game.js          # Main game controller
├── assets/
│   └── images/icons/    # PWA icons
└── server/              # Multiplayer server
    ├── index.js         # Express + Socket.io server
    ├── gameRoom.js      # Game room management
    └── package.json     # Server dependencies
```

## ⚙️ Configuration

### Game Settings (in-game)
- Master/Music/SFX Volume
- Visual Effects toggle
- Scanlines toggle
- Screen Shake toggle
- Control Sensitivity (1-10)
- Points to Win (5-21)

### Server Configuration
Set these environment variables:
- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - Allowed origins (default: *)

## 🎯 AI Difficulty Levels

| Level | Reaction Time | Max Speed | Accuracy | Mistakes |
|-------|---------------|-----------|----------|----------|
| Easy | 300ms | 200 | 50% | 10% |
| Medium | 150ms | 350 | 75% | 5% |
| Hard | 80ms | 500 | 90% | 2% |
| Impossible | 20ms | 800 | 98% | 0% |

## 📊 Leaderboards

The game tracks:
- Total games played
- Win/loss ratio
- Longest rally
- Best win streak
- Total points scored
- Play time

All stats are saved locally in the browser's localStorage.

## 🌐 Browser Support

- Chrome (Android) 80+
- Safari (iOS) 13+
- Firefox Mobile 75+
- Samsung Internet 12+
- Desktop browsers (Chrome, Firefox, Safari, Edge)

## 📱 PWA Installation

### iOS
1. Open the game in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

### Android
1. Open the game in Chrome
2. Tap the menu (⋮)
3. Select "Add to Home Screen"

## 🔧 Development

### Modify Game Settings
Edit the `settings` object in `js/game.js`:

```javascript
settings: {
    paddleWidth: 15,
    paddleHeight: 100,
    paddleSpeed: 500,
    paddleMargin: 20,
    ballRadius: 10,
    ballSpeed: 400,
    ballSpeedIncrease: 1.05,
    maxBallSpeed: 800
}
```

### Add New Power-ups
Edit `js/powerups.js` and add to the `types` object:

```javascript
newPowerup: {
    id: 'newPowerup',
    name: 'New Power-up',
    icon: '⭐',
    color: '#ffff00',
    duration: 10,
    effect: 'Description here',
    apply: (target) => { /* effect logic */ },
    remove: (target) => { /* cleanup logic */ }
}
```

### Customize Colors
Edit CSS variables in `css/main.css`:

```css
:root {
    --bg-primary: #0a0a0a;
    --neon-pink: #ff00ff;
    --neon-cyan: #00ffff;
    --neon-purple: #bf00ff;
    /* ... */
}
```

## 📄 License

MIT License - feel free to use this project for learning, personal projects, or commercial use.

## 🙏 Credits

- Font: [Orbitron](https://fonts.google.com/specimen/Orbitron) by Matt McInerney
- Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38
- Inspired by the original Pong (1972) by Atari

---

**Enjoy the game! 🎮✨**
