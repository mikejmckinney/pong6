# AI Repository Guide for Neon Pong

**Last Updated**: January 2026

This is the living map of the repository. It provides essential context for AI coding agents to understand the codebase structure, conventions, and workflows.

## Overview

**Neon Pong** is a browser-based HTML5 Canvas game implementing classic Pong with synthwave aesthetics, power-ups, and multiplayer support. Built with pure vanilla JavaScript (no frameworks), it uses HTML5 Canvas for rendering, Web Audio API for sound generation, and optional Socket.io for multiplayer. The game is deployed as static files on GitHub Pages.

**Key characteristics:**
- Zero-build vanilla JavaScript - no compilation, bundling, or transpilation
- No test framework - validation is manual via browser testing
- No linting tools - style is consistent but not enforced
- Client-side code has no dependencies (multiplayer server uses Node.js)

## Quickstart

### Run locally (client-side only)
```bash
cd /home/runner/work/pong6/pong6
python3 -m http.server 8080
# Open http://localhost:8080 in browser
```
Use this for testing ANY HTML, CSS, or JavaScript changes.

### Run with multiplayer server
```bash
cd /home/runner/work/pong6/pong6/server
npm install  # First time only (~5 seconds)
npm start    # Starts on port 3000
# Open http://localhost:3000 in browser
```
Use this ONLY when testing online multiplayer features.

### Test changes
- No automated tests exist - test manually by playing the game
- Check browser console (F12) for JavaScript errors
- Hard refresh (Ctrl+F5) to bypass service worker cache

## Folder Map + Key Entry Points

```
/home/runner/work/pong6/pong6/
├── index.html              # Entry point - loads all JS modules in order
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline support (caches assets)
├── .gitignore             # Excludes node_modules, logs, IDE files
├── README.md              # User-facing documentation
├── AI_REPO_GUIDE.md       # This file - developer reference
├── .github/
│   └── copilot-instructions.md  # Copilot agent instructions
├── css/
│   ├── main.css           # Core styles with CSS custom properties (879 lines)
│   ├── animations.css     # CSS animations (414 lines)
│   └── responsive.css     # Mobile/tablet breakpoints (412 lines)
├── js/                    # Client-side JavaScript modules (5,240 lines total)
│   ├── utils.js           # Helper functions - loaded first (310 lines)
│   ├── audio.js           # Web Audio API sound generation (464 lines)
│   ├── renderer.js        # Canvas 2D rendering + effects (620 lines)
│   ├── controls.js        # Keyboard/touch/mouse input (347 lines)
│   ├── ai.js              # AI opponent with 4 difficulties (241 lines)
│   ├── powerups.js        # 8 power-up types (364 lines)
│   ├── leaderboard.js     # localStorage stats tracking (371 lines)
│   ├── multiplayer.js     # Socket.io multiplayer client (434 lines)
│   └── game.js            # Main controller - loaded last (1,089 lines)
├── assets/
│   └── images/icons/
│       └── icon-192x192.svg  # PWA icon
└── server/                # Optional multiplayer server (Node.js)
    ├── index.js           # Express + Socket.io server (373 lines)
    ├── gameRoom.js        # Game room management (174 lines)
    ├── package.json       # Dependencies: express, socket.io
    └── package-lock.json  # Dependency lock file
```

**Entry points:**
- **Browser game**: `index.html` → loads JS modules → `Game.init()` in `js/game.js`
- **Multiplayer server**: `server/index.js` (Express server with Socket.io)

**Configuration:**
- `manifest.json` - PWA settings (name, icons, theme color)
- `server/package.json` - Node.js dependencies
- No build tools (webpack, babel, etc.) - no config files for them

## Key Data Flows

### Game Initialization Flow
```
index.html loads scripts → Game.init() called after DOM ready →
Renderer.init('game-canvas') → Controls.init() → AudioManager.init() →
Leaderboard.init() → loadSettings() → setupEventListeners()
```

### Game Loop (requestAnimationFrame)
```
Game.update(deltaTime) →
  Controls.update() → AI.update() → Physics.update() →
  PowerUps.update() → Collision detection →
Renderer.render() → Draw paddles/ball/effects
```

### Module Communication
All modules are global objects (no ES6 imports):
```javascript
// Each JS file defines a global object
const Game = { /* methods */ };
const Renderer = { /* methods */ };

// Modules reference each other directly
Game.ball → Renderer.drawBall(Game.ball)
Controls.getPaddleY() → Game.paddle1.y
```

### Multiplayer Data Flow
```
Client (multiplayer.js) ←→ Socket.io ←→ Server (server/index.js)
  paddleUpdate events           gameRoom.js manages state
  gameState sync                room creation/joining
  scoreUpdate                   matchmaking queue
```

### Local Storage
- `neonPongStats` - Player stats (wins, losses, play time, longest rally)
- `neonPongSettings` - Settings (volume, effects toggles, sensitivity, points to win)

## Conventions

### Code Style
- **Naming**: camelCase for variables/functions, PascalCase for module objects
- **Syntax**: ES6 (const/let, arrow functions, template literals)
- **Semicolons**: Inconsistent usage - ASI (Automatic Semicolon Insertion) handles this
- **Comments**: Sparse - used for section headers and complex algorithms only
- **Indentation**: 4 spaces
- **Quotes**: Single quotes preferred

### File Structure
- Each module is self-contained in one file
- Module pattern: `const ModuleName = { methods, state }`
- No class-based OOP (uses object literals with methods)

### Git Workflow
- **Deployment**: GitHub Pages auto-deploys from main branch (pages-build-deployment workflow)
- **No force push**: History rewriting not available
- **node_modules**: Gitignored - run `npm install` in server/ directory

### No Enforced Linting/Formatting
- No ESLint, Prettier, or similar tools configured
- Maintain consistency with existing code style manually

## Where to Add Things

### Adding New Game Features

**New power-up** → Edit `js/powerups.js`:
```javascript
PowerUps.types = {
    newPowerup: {
        id: 'newPowerup',
        name: 'Display Name',
        icon: '⭐',
        color: '#ffff00',
        duration: 10,  // seconds (0 for instant)
        effect: 'Description',
        apply: (target) => { /* apply to player1/player2 */ },
        remove: (target) => { /* cleanup */ }
    }
};
```

**New game mode** → Edit `js/game.js`:
- Add to `gameType` property
- Update logic in `startGame()` method
- Add UI option in `index.html` game-mode-select screen

**New AI difficulty** → Edit `js/ai.js` lines 8-40:
- Add entry to `difficulties` object with reaction/speed/accuracy params

**Adjust game physics** → Edit `js/game.js` lines 47-56:
- Modify `settings` object (paddleSpeed, ballSpeed, etc.)

### Adding New UI Screens

1. Add HTML in `index.html` with class `screen`
2. Register in `Game.screens` object in `game.js` init method
3. Use `Game.showScreen('screenName')` to navigate
4. Add event listeners in `Game.setupEventListeners()`

### Adding New Visual Effects

**CSS effects** → Edit `css/main.css`:
- Use CSS custom properties (`:root` variables like `--neon-pink`)
- Neon glow uses `text-shadow` and `box-shadow`

**Canvas effects** → Edit `js/renderer.js`:
- Add to particle system or create new render method
- Call from `Renderer.render()` loop

### Adding New Sounds

Edit `js/audio.js`:
- Add method to `AudioManager` object
- Generate sound with Web Audio API (no external files)
- Call from game events (collision, score, power-up)

### Adding Server Features

**New multiplayer event** → Edit `server/index.js`:
- Add Socket.io event handler in `io.on('connection')` block
- Update `server/gameRoom.js` if state management needed

**New room functionality** → Edit `server/gameRoom.js`:
- Add method to `GameRoom` class
- Update room state in `getStatus()` if exposing to clients

### Adding Scripts/Dependencies

**Client-side JS** → Must be loaded via `<script>` tag in `index.html`:
- Add in dependency order (after modules it depends on, before modules that depend on it)
- No npm/bundler for client code

**Server dependencies** → Edit `server/package.json`:
- Add to `dependencies` or `devDependencies`
- Run `npm install` to update

## Troubleshooting / Common Gotchas

### Service Worker Caching
**Problem**: Changes not appearing after code updates  
**Solution**: Hard refresh (Ctrl+F5 / Cmd+Shift+R) or disable service worker in browser dev tools (Application tab)

**Why**: `service-worker.js` aggressively caches all game assets for offline play

### Script Loading Order
**Problem**: `ReferenceError: ModuleName is not defined`  
**Solution**: Check `index.html` script order - modules must be loaded after their dependencies

**Critical order**:
1. `utils.js` first (used by everyone)
2. Other modules in dependency order
3. `game.js` last (orchestrates all modules)

### Audio Not Playing
**Problem**: Sounds don't play on first load  
**Solution**: Expected behavior - browsers block audio until user interaction

**Why**: Browser autoplay policy requires `AudioManager.init()` after first click/tap

### Quick Match Not Implemented
**Problem**: Quick match button shows "Coming soon" alert  
**Location**: `js/game.js` line 321 has `// TODO: Implement quick match`

**Status**: UI exists but functionality incomplete (server matching logic needed)

### No Error Handling
**Problem**: JavaScript errors break the entire game  
**Solution**: Always check browser console (F12) after making changes

**Why**: Minimal error boundaries - uncaught errors stop game loop

### localStorage Dependency
**Problem**: Settings/stats don't persist  
**Solution**: Game works without localStorage but won't save data

**Why**: Uses `localStorage` for persistence - falls back gracefully if unavailable

### Port Already in Use
**Problem**: Server won't start - "EADDRINUSE: address already in use"  
**Solution**: Kill process on port 3000 or use different port:
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

### node_modules Accidentally Committed
**Problem**: Repo size bloated with dependencies  
**Solution**: Already in `.gitignore` - if committed, remove with:
```bash
git rm -r --cached server/node_modules
git commit -m "Remove node_modules from tracking"
```

### Module Undefined in Browser
**Problem**: Console shows `Game is not defined` or similar  
**Checklist**:
1. Did you save the file?
2. Is script tag in `index.html`?
3. Is script loaded in correct order?
4. Did you hard refresh to bypass cache?
5. Check Network tab - did file load (200 status)?

## Manual Testing Checklist

**No automated tests exist** - validate changes by playing the game in browser.

### For Gameplay Changes
1. Start Python server: `python3 -m http.server 8080`
2. Open `http://localhost:8080` in browser
3. Play single player game (any difficulty)
4. Score points, test pause/resume (ESC/Space)
5. Complete full game to win/lose screen

### For UI/Visual Changes
1. Navigate through all menu screens
2. Test responsive layout (browser dev tools mobile mode)
3. Verify neon glow effects render
4. Check on light and dark browser themes

### For Controls
1. Test keyboard (W/S, Arrow keys)
2. Test mouse dragging
3. Test touch (browser mobile emulation)
4. Test local multiplayer (split-screen controls)

### For Multiplayer
1. Start Node server: `cd server && npm start`
2. Open two browser tabs to `http://localhost:3000`
3. Create room in tab 1, join in tab 2
4. Play complete game, check server console for errors

### For Audio
1. Click/tap to initialize audio
2. Test volume controls in settings
3. Verify mute functionality works

## Known Risks / Footguns

1. **Quick match incomplete** - `js/game.js:321` TODO comment
2. **Service worker caching** - Requires hard refresh during development
3. **No error boundaries** - Errors break game, check console
4. **No TypeScript** - No compile-time type safety
5. **No tests** - All validation is manual
6. **No linting** - Code style not enforced by tools
7. **Global scope** - All modules are global objects (no module system)
8. **Browser autoplay** - Audio requires user interaction first
9. **Canvas performance** - Targets 60 FPS, check Performance tab if issues
10. **Port conflicts** - Server defaults to port 3000 (may conflict with other services)

## Quick Reference

### Key File Locations
- **Game constants**: `js/game.js` lines 47-56
- **AI difficulties**: `js/ai.js` lines 8-40
- **Power-up types**: `js/powerups.js` `PowerUps.types` object
- **CSS variables**: `css/main.css` lines 7-30
- **TODO note**: `js/game.js` line 321
- **Server config**: `server/package.json`

### Environment Versions
- **Node.js**: v20.19.6 (required >=16.0.0)
- **npm**: 10.8.2
- **Python**: 3.12.3
- **Dependencies**: express@^4.18.2, socket.io@^4.7.2

### Most Common Commands
```bash
# Fastest test (90% of use cases)
python3 -m http.server 8080

# With multiplayer (first time)
cd server && npm install && npm start

# With multiplayer (subsequent times)
cd server && npm start

# Check versions
node --version
npm --version
```

### Browser Console Quick Tests
```javascript
// Check game state
console.log(Game.state, Game.score);

// Trigger power-up
PowerUps.spawn();

// Check renderer
console.log(Renderer.canvas.width, Renderer.canvas.height);

// Check AI
console.log(AI.difficulty);
```

---

**Bottom line**: This is a zero-build vanilla JavaScript game. No webpack, no babel, no tests, no complexity. Serve the files with any HTTP server, open in browser, test manually. The workflow is intentionally simple - complexity is in the game logic, not the tooling.
